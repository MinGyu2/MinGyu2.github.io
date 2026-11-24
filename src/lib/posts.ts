import { getCollection, type CollectionEntry } from 'astro:content';
import { RESERVED_PREFIXES, SITE } from './site';
import {
  MODULES,
  getModule,
  getSeries,
  getSubmodule,
  submoduleCode,
  type KnowledgeModule,
  type Series,
  type Submodule,
} from '../data/taxonomy';

type Entry = CollectionEntry<'posts'>;
/** A post with its URL, date and source resolved (always present after getPosts()). */
export type Post = Entry & { data: Entry['data'] & { date: Date; legacyPath: string; legacySource: string } };

const FILE_DATE = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/;

/**
 * New posts without explicit metadata get the same URL rule as the legacy site
 * (`permalink: /:categories/:title/`, categories lowercased, slug = file name
 * without the date) and their date from the file name.
 */
function resolve(entry: Entry): Post {
  const base = entry.id.split('/').pop() ?? entry.id;
  const m = FILE_DATE.exec(base);
  const date = entry.data.date ?? (m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`) : undefined);
  if (!date) throw new Error(`Post ${entry.id}: add a "date" or a YYYY-MM-DD- file name prefix`);
  const slug = m ? m[4] : base;
  const cats = [...new Set(entry.data.categories.map((c) => c.toLowerCase()))];
  const legacyPath = entry.data.legacyPath ?? '/' + [...cats, slug].join('/') + '/';
  const legacySource = entry.data.legacySource ?? `src/content/posts/${entry.id}.md`;
  return { ...entry, data: { ...entry.data, date, legacyPath, legacySource } } as Post;
}

let cache: Post[] | undefined;

/**
 * All published posts, newest first. Ties are broken like Jekyll 3.10
 * (Document#<=> compares date, then path), so archive order matches the legacy site.
 */
export async function getPosts(): Promise<Post[]> {
  if (cache) return cache;
  const all = (await getCollection('posts', ({ data }) => data.published !== false)).map(resolve);
  all.sort((a, b) => {
    const d = b.data.date.getTime() - a.data.date.getTime();
    if (d !== 0) return d;
    return a.data.legacySource < b.data.legacySource ? 1 : a.data.legacySource > b.data.legacySource ? -1 : 0;
  });
  assertRoutes(all);
  assertSeries(all);
  cache = all;
  return all;
}

function assertRoutes(posts: Post[]) {
  const seen = new Map<string, string>();
  for (const p of posts) {
    const path = p.data.legacyPath;
    if (seen.has(path)) throw new Error(`Duplicate legacyPath ${path}: ${seen.get(path)} / ${p.id}`);
    seen.set(path, p.id);
    if (path === '/' || RESERVED_PREFIXES.some((r) => path.startsWith(r)) || /^\/page\d+\/$/.test(path)) {
      throw new Error(`legacyPath ${path} (${p.id}) collides with a reserved route`);
    }
  }
}

/** Jekyll `slugify` (default mode) — also the legacy archive anchor format. */
export function taxonomyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function displayTitle(p: Post): string {
  return p.data.title.trim();
}

/** Strip Markdown/HTML to plain text (used for excerpts and word counts). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/^```[\s\S]*?^\s*```/gm, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|~]/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Front matter `excerpt`, else the first paragraph (Jekyll excerpt_separator "\n\n"). */
export function excerptOf(p: Post, max = 160): string {
  const explicit = p.data.excerpt?.trim();
  if (explicit) return explicit;
  const body = p.body ?? '';
  const blocks = body.split(/\n\s*\n/).map((b) => plainText(b)).filter(Boolean);
  const first = blocks[0] ?? '';
  return first.length > max ? first.slice(0, max - 1) + '…' : first;
}

/** Minimal Mistakes read time: words / words_per_minute, at least one minute. */
export function readingMinutes(p: Post): number {
  const words = plainText((p.body ?? '').replace(/```/g, ' ')).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / SITE.wordsPerMinute));
}

export interface Term {
  key: string;
  label: string;
  variants: string[];
  posts: Post[];
  count: number;
}

/**
 * Group category or tag values by `taxonomyKey`, merging capitalization variants
 * (e.g. "Ubuntu" / "ubuntu"). The label is the most frequent spelling.
 * This normalization never affects post URLs (those come from legacyPath).
 */
export function buildTaxonomy(posts: Post[], field: 'categories' | 'tags'): Term[] {
  const map = new Map<string, { variants: Map<string, number>; posts: Post[] }>();
  for (const p of posts) {
    const keysInPost = new Set<string>();
    for (const raw of p.data[field]) {
      const key = taxonomyKey(raw);
      if (!key) continue;
      let t = map.get(key);
      if (!t) map.set(key, (t = { variants: new Map(), posts: [] }));
      t.variants.set(raw.trim(), (t.variants.get(raw.trim()) ?? 0) + 1);
      if (!keysInPost.has(key)) {
        keysInPost.add(key);
        t.posts.push(p);
      }
    }
  }
  return [...map.entries()]
    .map(([key, t]) => {
      const variants = [...t.variants.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      return { key, label: variants[0][0], variants: variants.map((v) => v[0]), posts: t.posts, count: t.posts.length };
    })
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1));
}

export function postCategoryKeys(p: Post): string[] {
  return [...new Set(p.data.categories.map(taxonomyKey).filter(Boolean))];
}

export function postTagKeys(p: Post): string[] {
  return [...new Set(p.data.tags.map(taxonomyKey).filter(Boolean))];
}

/** Legacy "no category" group (historical categories only; never used for modules). */
export const UNCATEGORIZED = { key: 'uncategorized', label: '미분류', en: 'Uncategorized' } as const;

/* ------------------------------------------------------------------------------
 * Knowledge modules (authoritative classification, src/data/taxonomy.ts)
 * ---------------------------------------------------------------------------- */

export interface SubmoduleStat extends Submodule {
  code: string;
  posts: Post[];
  count: number;
}

export interface ModuleStat extends Omit<KnowledgeModule, 'submodules'> {
  posts: Post[];
  count: number;
  /** Percentage of all posts; rounded with the largest-remainder method so the shown values sum to 100. */
  pct: number;
  /** All submodules in taxonomy order (including empty ones). */
  submodules: SubmoduleStat[];
  /** Only submodules with posts. */
  populated: SubmoduleStat[];
}

export interface ModuleStats {
  totalPosts: number;
  /** All modules in taxonomy order. */
  all: ModuleStat[];
  /** Only modules with posts (for public listings and the Knowledge Ring). */
  populated: ModuleStat[];
}

/** Largest-remainder rounding: integer percentages that sum to exactly 100. */
export function roundedPercentages(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const floor = raw.map(Math.floor);
  let rest = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    if (counts[i] > 0) {
      floor[i]++;
      rest--;
    }
  }
  return floor;
}

export async function getModuleStats(): Promise<ModuleStats> {
  const posts = await getPosts();
  const all = MODULES.map((m) => {
    const modPosts = posts.filter((p) => p.data.module === m.id);
    const submodules = m.submodules.map((s, i) => {
      const subPosts = modPosts.filter((p) => p.data.submodule === s.id);
      return { ...s, code: `SUB-${String(i + 1).padStart(2, '0')}`, posts: subPosts, count: subPosts.length };
    });
    return { ...m, posts: modPosts, count: modPosts.length, pct: 0, submodules, populated: submodules.filter((s) => s.count > 0) };
  });
  const sum = all.reduce((s, m) => s + m.count, 0);
  if (sum !== posts.length) throw new Error(`Module counts (${sum}) do not add up to the post count (${posts.length})`);
  const pcts = roundedPercentages(all.map((m) => m.count));
  all.forEach((m, i) => (m.pct = pcts[i]));
  return { totalPosts: posts.length, all, populated: all.filter((m) => m.count > 0) };
}

export interface PostClassification {
  module: KnowledgeModule;
  submodule: Submodule;
  subCode: string;
}

export function classificationOf(post: Post): PostClassification {
  const module = getModule(post.data.module)!;
  const submodule = getSubmodule(post.data.module, post.data.submodule)!;
  return { module, submodule, subCode: submoduleCode(module.id, submodule.id) };
}

/* ------------------------------------------------------------------------------
 * Series
 * ---------------------------------------------------------------------------- */

export interface SeriesInfo {
  series: Series;
  posts: Post[];
}

/** Posts of a series ordered by `series.order`. */
export async function getSeriesPosts(id: string): Promise<SeriesInfo | undefined> {
  const series = getSeries(id);
  if (!series) return undefined;
  const posts = (await getPosts()).filter((p) => p.data.series?.id === id).sort((a, b) => a.data.series!.order - b.data.series!.order);
  return { series, posts };
}

function assertSeries(posts: Post[]) {
  const seen = new Map<string, string>();
  for (const p of posts) {
    const s = p.data.series;
    if (!s) continue;
    const key = `${s.id}#${s.order}`;
    if (seen.has(key)) throw new Error(`Series "${s.id}" order ${s.order} is used twice: ${seen.get(key)} and ${p.id}`);
    seen.set(key, p.id);
  }
}

/** Related posts: same series/submodule/module and shared tags, then nearest in time. */
export function relatedPosts(post: Post, posts: Post[], limit = 3): Post[] {
  const tags = new Set(postTagKeys(post));
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const sameSeries = !!post.data.series && p.data.series?.id === post.data.series.id;
      const score =
        postTagKeys(p).filter((t) => tags.has(t)).length * 2 +
        (p.data.submodule === post.data.submodule ? 3 : p.data.module === post.data.module ? 1 : 0) -
        (sameSeries ? 2 : 0); // series neighbours are already linked in the series panel
      return { p, score, dist: Math.abs(p.data.date.getTime() - post.data.date.getTime()) };
    })
    .filter((x) => x.score > 1)
    .sort((a, b) => b.score - a.score || a.dist - b.dist)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Stable display code per post: LOG-001 is the oldest post. */
export function logCode(post: Post, posts: Post[]): string {
  const n = posts.length - posts.indexOf(post);
  return `LOG-${String(n).padStart(3, '0')}`;
}
