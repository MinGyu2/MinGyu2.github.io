/// <reference types="node" />
/**
 * Unified Experiment Lab catalog (build time only — uses the filesystem via discovery).
 *
 * The single source for the /lab/ listing, group hierarchy, counts, the dashboard and the
 * command palette index. Merges:
 *   - experiments discovered under public/experiments/ (src/lib/experiment-discovery.ts)
 *   - registered Astro tools and planned items (src/data/experiments.ts)
 */
import { join } from 'node:path';
import { discoverExperiments, type DiscoveredExperiment, type DiscoveredGroup, type DiscoveredNode, type ExperimentStatus, type GroupIcon } from './experiment-discovery.ts';
import { REGISTERED_EXPERIMENTS, type RegisteredExperiment } from '../data/experiments.ts';

export interface CatalogExperiment {
  kind: 'experiment';
  /** Stable path-based ID (unique across groups). */
  id: string;
  /** Display code: registered code (LAB-01) or derived from the path. */
  code: string;
  title: string;
  description?: string;
  version?: string;
  tags: string[];
  status: ExperimentStatus;
  source: 'astro' | 'standalone' | 'planned';
  href?: string;
  thumbnail?: string;
  requiresCrossOriginIsolation: boolean;
  /** True only when the experiment can actually run on GitHub Pages. */
  launchable: boolean;
  /** Reason shown instead of a launch control. */
  unavailableReason?: string;
  order: number;
  /** Titles of ancestor groups, outermost first. */
  groupTrail: string[];
}

export interface CatalogGroup {
  kind: 'group';
  id: string;
  code: string;
  title: string;
  description?: string;
  icon: GroupIcon;
  order: number;
  children: CatalogNode[];
  /** Descendant experiment counts (groups are never counted as experiments). */
  count: number;
  available: number;
}

export type CatalogNode = CatalogExperiment | CatalogGroup;

export interface ExperimentCatalog {
  roots: CatalogNode[];
  groups: CatalogGroup[];
  experiments: CatalogExperiment[];
  counts: { total: number; available: number; inDevelopment: number; planned: number; launchable: number; groups: number };
}

const REASONS: Record<ExperimentStatus, string> = {
  available: '',
  'in-development': '개발 중 — 아직 실행할 수 없습니다',
  planned: '계획 단계 — 아직 구현되지 않았습니다',
};

function finalize(e: Omit<CatalogExperiment, 'launchable' | 'unavailableReason'>): CatalogExperiment {
  let unavailableReason: string | undefined;
  if (e.status !== 'available') unavailableReason = REASONS[e.status];
  else if (!e.href) unavailableReason = '실행 파일이 없습니다';
  else if (e.requiresCrossOriginIsolation)
    unavailableReason = 'COOP/COEP(교차 출처 격리)가 필요해 GitHub Pages에서는 실행할 수 없습니다';
  return { ...e, launchable: !unavailableReason, unavailableReason };
}

function fromDiscovered(d: DiscoveredExperiment, trail: string[], reg?: RegisteredExperiment): CatalogExperiment {
  return finalize({
    kind: 'experiment',
    id: d.path,
    code: reg?.code ?? `EXP // ${d.path}`,
    title: d.hasMetadata || !reg ? d.title : reg.title,
    description: d.description ?? reg?.description,
    version: d.version ?? reg?.version,
    tags: d.tags.length ? d.tags : (reg?.tags ?? []),
    status: d.status,
    source: 'standalone',
    href: d.href,
    thumbnail: d.thumbnail,
    requiresCrossOriginIsolation: d.requiresCrossOriginIsolation,
    order: reg?.order ?? d.order,
    groupTrail: trail,
  });
}

function fromRegistered(r: RegisteredExperiment, trail: string[]): CatalogExperiment {
  return finalize({
    kind: 'experiment',
    id: r.path,
    code: r.code,
    title: r.title,
    description: r.description,
    version: r.version,
    tags: r.tags,
    status: r.status,
    source: r.kind === 'astro' ? 'astro' : 'planned',
    href: r.kind === 'astro' ? r.href : undefined,
    requiresCrossOriginIsolation: r.requiresCrossOriginIsolation ?? false,
    order: r.order ?? 1000,
    groupTrail: trail,
  });
}

const sortNodes = (a: CatalogNode, b: CatalogNode) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Build the catalog from a discovery result (exported for tests). */
export function buildCatalog(discovered: DiscoveredNode[], registered: RegisteredExperiment[] = REGISTERED_EXPERIMENTS): ExperimentCatalog {
  const regByPath = new Map(registered.map((r) => [r.path, r]));
  const used = new Set<string>();
  const groups: CatalogGroup[] = [];

  const convert = (nodes: DiscoveredNode[], trail: string[]): CatalogNode[] =>
    nodes.map((n): CatalogNode => {
      if (n.kind === 'experiment') {
        const reg = regByPath.get(n.path);
        if (reg) used.add(n.path);
        return fromDiscovered(n, trail, reg);
      }
      const g = n as DiscoveredGroup;
      const group: CatalogGroup = {
        kind: 'group',
        id: g.path,
        code: '',
        title: g.title,
        description: g.description,
        icon: g.icon,
        order: g.order,
        children: convert(g.children, [...trail, g.title]),
        count: 0,
        available: 0,
      };
      return group;
    });

  const roots = convert(discovered, []);

  // Registered entries not implemented in the filesystem: place them under their parent group.
  for (const r of registered) {
    if (used.has(r.path)) continue;
    const parentPath = r.path.includes('/') ? r.path.slice(0, r.path.lastIndexOf('/')) : '';
    let siblings = roots;
    let trail: string[] = [];
    if (parentPath) {
      const find = (nodes: CatalogNode[]): CatalogGroup | undefined => {
        for (const n of nodes) {
          if (n.kind !== 'group') continue;
          if (n.id === parentPath) return n;
          const hit = find(n.children);
          if (hit) return hit;
        }
      };
      const parent = find(roots);
      if (!parent) throw new Error(`Registered experiment "${r.path}": parent group "${parentPath}" does not exist in public/experiments/`);
      siblings = parent.children;
      trail = parent.children.find((c) => c.kind === 'experiment')?.groupTrail ?? [];
      if (!trail.length) trail = [parent.title];
    }
    siblings.push(fromRegistered(r, trail));
  }

  // Counts, ordering and display codes (deterministic pre-order numbering).
  const experiments: CatalogExperiment[] = [];
  let groupNo = 0;
  const finish = (nodes: CatalogNode[]) => {
    nodes.sort(sortNodes);
    for (const n of nodes) {
      if (n.kind === 'experiment') {
        experiments.push(n);
        continue;
      }
      n.code = `GRP-${String(++groupNo).padStart(2, '0')}`;
      groups.push(n);
      finish(n.children);
    }
  };
  finish(roots);
  const tally = (g: CatalogGroup): [number, number] => {
    let count = 0;
    let available = 0;
    for (const c of g.children) {
      if (c.kind === 'experiment') {
        count++;
        if (c.launchable) available++;
      } else {
        const [n, a] = tally(c);
        count += n;
        available += a;
      }
    }
    g.count = count;
    g.available = available;
    return [count, available];
  };
  for (const n of roots) if (n.kind === 'group') tally(n);

  const ids = new Set<string>();
  for (const e of experiments) {
    if (ids.has(e.id)) throw new Error(`Duplicate experiment id "${e.id}"`);
    ids.add(e.id);
  }

  return {
    roots,
    groups,
    experiments,
    counts: {
      total: experiments.length,
      available: experiments.filter((e) => e.status === 'available').length,
      inDevelopment: experiments.filter((e) => e.status === 'in-development').length,
      planned: experiments.filter((e) => e.status === 'planned').length,
      launchable: experiments.filter((e) => e.launchable).length,
      groups: groups.length,
    },
  };
}

let cache: ExperimentCatalog | undefined;

/** The site's catalog. Fails the build with every metadata problem listed. */
export function getExperimentCatalog(): ExperimentCatalog {
  if (cache) return cache;
  const { nodes, errors } = discoverExperiments(join(process.cwd(), 'public', 'experiments'));
  if (errors.length) throw new Error(`Experiment Lab: invalid experiments in public/experiments/\n  - ${errors.join('\n  - ')}`);
  cache = buildCatalog(nodes);
  return cache;
}

/** Collision-free element id for a catalog path (HTML ids may contain ":" and "/"; only whitespace is replaced). */
export const anchorId = (prefix: 'exp' | 'grp', id: string) => `${prefix}:${id.replace(/\s/g, '_')}`;
