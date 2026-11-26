/// <reference types="node" />
/**
 * Build-time discovery of standalone experiments under public/experiments/.
 *
 * Node-only (uses node:fs) — import it from Astro frontmatter/endpoints or Node scripts,
 * never from client scripts. It has no project imports so Node can load it directly
 * (scripts/test-experiments.mjs) via type stripping.
 *
 * Rules
 *  - A directory with `experiment.json` or `index.html` is an EXPERIMENT. Its contents
 *    (assets, nested folders) belong to it and are not scanned further.
 *  - Any other directory that contains experiments somewhere below it is a GROUP
 *    (optional `group.json`). Groups can nest.
 *  - Hidden directories (".x"), "_x" directories and resource directories
 *    (assets, images, textures, fonts, shaders, scripts, wasm, …) are never experiments
 *    or groups. Loose files and empty directories are ignored.
 *  - Order: `order` (default 1000), then directory name (code point order).
 *  - IDs are the slash-separated path relative to public/experiments (unique by design).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, resolve, sep } from 'node:path';

export type ExperimentStatus = 'available' | 'in-development' | 'planned';
export const STATUSES: ExperimentStatus[] = ['available', 'in-development', 'planned'];
export const GROUP_ICONS = ['folder', 'shield', 'atom', 'cube', 'flask', 'cpu', 'globe', 'terminal', 'gamepad'] as const;
export type GroupIcon = (typeof GROUP_ICONS)[number];

/** Directory names that hold resources, never experiments or groups (case-insensitive). */
export const RESOURCE_DIRS = new Set([
  'assets', 'asset', 'images', 'image', 'img', 'textures', 'texture', 'fonts', 'font', 'shaders', 'shader',
  'scripts', 'script', 'js', 'css', 'styles', 'wasm', 'media', 'audio', 'sounds', 'video', 'models', 'data',
  'lib', 'libs', 'vendor', 'static', 'public', 'node_modules', 'dist', 'build', 'src',
]);

const DEFAULT_ORDER = 1000;
const ENTRY_EXT = /\.html?$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

export interface DiscoveredExperiment {
  kind: 'experiment';
  path: string;
  dirName: string;
  title: string;
  description?: string;
  version?: string;
  tags: string[];
  status: ExperimentStatus;
  entry: string;
  entryExists: boolean;
  /** Site URL of the entry point (only when the entry file exists). */
  href?: string;
  thumbnail?: string;
  order: number;
  requiresCrossOriginIsolation: boolean;
  hasMetadata: boolean;
}

export interface DiscoveredGroup {
  kind: 'group';
  path: string;
  dirName: string;
  title: string;
  description?: string;
  icon: GroupIcon;
  order: number;
  hasMetadata: boolean;
  children: DiscoveredNode[];
}

export type DiscoveredNode = DiscoveredExperiment | DiscoveredGroup;

export interface DiscoveryResult {
  nodes: DiscoveredNode[];
  errors: string[];
}

/** "rigid-body" → "Rigid Body", "mini_world" → "Mini World"; non-Latin text is kept. */
export function titleFromDirName(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * A metadata path must be a plain relative file path inside the experiment directory:
 * no scheme/URL, no absolute path, no backslashes, no "." / ".." segments.
 */
export function safeRelativePath(value: string, dir: string): string | null {
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (value.includes('?') || value.includes('#') || value.includes('\0')) return null;
  const parts = value.split('/');
  if (parts.some((p) => p === '' || p === '.' || p === '..')) return null;
  const abs = resolve(dir, ...parts);
  if (!abs.startsWith(resolve(dir) + sep)) return null;
  return parts.join('/');
}

function readJson(file: string, errors: string[], label: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(readFileSync(file, 'utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      errors.push(`${label}: must contain a JSON object`);
      return null;
    }
    return v as Record<string, unknown>;
  } catch (e) {
    errors.push(`${label}: invalid JSON (${(e as Error).message})`);
    return null;
  }
}

const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const isFile = (p: string) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};
const byOrder = (a: { order: number; dirName: string }, b: { order: number; dirName: string }) =>
  a.order - b.order || (a.dirName < b.dirName ? -1 : a.dirName > b.dirName ? 1 : 0);

function urlFor(base: string, relPath: string, entry: string): string {
  const segs = relPath.split('/').map(encodeURIComponent).join('/');
  const file = entry === 'index.html' ? '' : entry.split('/').map(encodeURIComponent).join('/');
  return `${base}${segs}/${file}`;
}

function readExperiment(dir: string, relPath: string, dirName: string, base: string, errors: string[]): DiscoveredExperiment {
  const metaFile = join(dir, 'experiment.json');
  const label = `public/experiments/${relPath}/experiment.json`;
  const hasMetadata = isFile(metaFile);
  const meta = hasMetadata ? (readJson(metaFile, errors, label) ?? {}) : {};
  const allowed = new Set(['title', 'description', 'version', 'tags', 'status', 'entry', 'order', 'thumbnail', 'requiresCrossOriginIsolation']);
  for (const k of Object.keys(meta)) if (!allowed.has(k)) errors.push(`${label}: unknown field "${k}" (allowed: ${[...allowed].join(', ')})`);

  const str = (k: string): string | undefined => {
    const v = meta[k];
    if (v === undefined) return undefined;
    if (typeof v !== 'string' || !v.trim()) {
      errors.push(`${label}: "${k}" must be a non-empty string`);
      return undefined;
    }
    return v.trim();
  };
  const title = str('title') ?? titleFromDirName(dirName);
  const description = str('description');
  const version = str('version');

  let tags: string[] = [];
  if (meta.tags !== undefined) {
    if (Array.isArray(meta.tags) && meta.tags.every((t) => typeof t === 'string' && t.trim())) tags = (meta.tags as string[]).map((t) => t.trim());
    else errors.push(`${label}: "tags" must be an array of non-empty strings`);
  }

  let order = DEFAULT_ORDER;
  if (meta.order !== undefined) {
    if (typeof meta.order === 'number' && Number.isFinite(meta.order)) order = meta.order;
    else errors.push(`${label}: "order" must be a number`);
  }

  let requiresCrossOriginIsolation = false;
  if (meta.requiresCrossOriginIsolation !== undefined) {
    if (typeof meta.requiresCrossOriginIsolation === 'boolean') requiresCrossOriginIsolation = meta.requiresCrossOriginIsolation;
    else errors.push(`${label}: "requiresCrossOriginIsolation" must be true or false`);
  }

  let entry = 'index.html';
  const rawEntry = str('entry');
  if (rawEntry !== undefined) {
    const safe = safeRelativePath(rawEntry, dir);
    if (!safe || !ENTRY_EXT.test(safe)) errors.push(`${label}: "entry" must be a relative .html path inside the experiment folder (got "${rawEntry}")`);
    else entry = safe;
  }
  const entryExists = isFile(join(dir, ...entry.split('/')));

  let thumbnail: string | undefined;
  const rawThumb = str('thumbnail');
  if (rawThumb !== undefined) {
    const safe = safeRelativePath(rawThumb, dir);
    if (!safe || !IMAGE_EXT.test(safe)) errors.push(`${label}: "thumbnail" must be a relative image path inside the experiment folder (got "${rawThumb}")`);
    else if (!isFile(join(dir, ...safe.split('/')))) errors.push(`${label}: thumbnail "${safe}" not found`);
    else thumbnail = urlFor(base, relPath, safe);
  }

  let status: ExperimentStatus = entryExists ? 'available' : 'planned';
  const rawStatus = meta.status;
  if (rawStatus !== undefined) {
    if (typeof rawStatus === 'string' && (STATUSES as string[]).includes(rawStatus)) status = rawStatus as ExperimentStatus;
    else errors.push(`${label}: "status" must be one of ${STATUSES.join(', ')} (got ${JSON.stringify(rawStatus)})`);
  }
  if (status === 'available' && !entryExists) {
    errors.push(`public/experiments/${relPath}: entry point "${entry}" not found (status "available" requires it)`);
  }

  return {
    kind: 'experiment',
    path: relPath,
    dirName,
    title,
    description,
    version,
    tags,
    status,
    entry,
    entryExists,
    href: entryExists ? urlFor(base, relPath, entry) : undefined,
    thumbnail,
    order,
    requiresCrossOriginIsolation,
    hasMetadata,
  };
}

function readGroupMeta(dir: string, relPath: string, errors: string[]) {
  const file = join(dir, 'group.json');
  const label = `public/experiments/${relPath}/group.json`;
  if (!isFile(file)) return { hasMetadata: false } as const;
  const meta = readJson(file, errors, label) ?? {};
  const allowed = new Set(['title', 'description', 'icon', 'order']);
  for (const k of Object.keys(meta)) if (!allowed.has(k)) errors.push(`${label}: unknown field "${k}" (allowed: ${[...allowed].join(', ')})`);
  const out: { hasMetadata: true; title?: string; description?: string; icon?: GroupIcon; order?: number } = { hasMetadata: true };
  for (const k of ['title', 'description'] as const) {
    const v = meta[k];
    if (v === undefined) continue;
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    else errors.push(`${label}: "${k}" must be a non-empty string`);
  }
  if (meta.icon !== undefined) {
    if (typeof meta.icon === 'string' && (GROUP_ICONS as readonly string[]).includes(meta.icon)) out.icon = meta.icon as GroupIcon;
    else errors.push(`${label}: "icon" must be one of ${GROUP_ICONS.join(', ')}`);
  }
  if (meta.order !== undefined) {
    if (typeof meta.order === 'number' && Number.isFinite(meta.order)) out.order = meta.order;
    else errors.push(`${label}: "order" must be a number`);
  }
  return out;
}

function scan(dir: string, relPath: string, base: string, errors: string[]): DiscoveredNode[] {
  let names: string[];
  try {
    names = readdirSync(dir).sort();
  } catch {
    return [];
  }
  const nodes: DiscoveredNode[] = [];
  for (const name of names) {
    if (name.startsWith('.') || name.startsWith('_') || RESOURCE_DIRS.has(name.toLowerCase())) continue;
    const abs = join(dir, name);
    if (!isDir(abs)) continue;
    const childPath = relPath ? posix.join(relPath, name) : name;
    if (isFile(join(abs, 'experiment.json')) || isFile(join(abs, 'index.html'))) {
      nodes.push(readExperiment(abs, childPath, name, base, errors));
      continue;
    }
    const children = scan(abs, childPath, base, errors);
    if (children.length === 0) continue; // empty or resource-only directory
    const meta = readGroupMeta(abs, childPath, errors);
    nodes.push({
      kind: 'group',
      path: childPath,
      dirName: name,
      title: ('title' in meta && meta.title) || titleFromDirName(name),
      description: 'description' in meta ? meta.description : undefined,
      icon: ('icon' in meta && meta.icon) || 'folder',
      order: 'order' in meta && typeof meta.order === 'number' ? meta.order : DEFAULT_ORDER,
      hasMetadata: meta.hasMetadata,
      children,
    });
  }
  return nodes.sort(byOrder);
}

/**
 * Discover experiments below `root` (normally <project>/public/experiments).
 * Missing root → empty result. Errors are collected, never thrown.
 */
export function discoverExperiments(root: string, urlBase = '/experiments/'): DiscoveryResult {
  const errors: string[] = [];
  if (!existsSync(root)) return { nodes: [], errors };
  return { nodes: scan(root, '', urlBase, errors), errors };
}
