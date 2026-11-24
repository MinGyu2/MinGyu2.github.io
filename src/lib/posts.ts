import { getCollection, type CollectionEntry } from 'astro:content';
import { RESERVED_PREFIXES, SITE } from './site';

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

export const UNCATEGORIZED = { key: 'uncategorized', label: '미분류', en: 'Uncategorized' } as const;

/** Category accent tokens (CSS custom properties defined in tokens.css). */
export const CATEGORY_COLORS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
  'var(--cat-8)',
];

export interface CategoryModule extends Term {
  code: string;
  color: string;
}

export interface CategoryStats {
  totalPosts: number;
  modules: CategoryModule[];
  uncategorized: Post[];
  /** Number of posts that belong to more than one category. */
  multiCategoryPosts: number;
  /** Sum of all category memberships including the uncategorized group. */
  membershipTotal: number;
}

export async function getCategoryStats(): Promise<CategoryStats> {
  const posts = await getPosts();
  const terms = buildTaxonomy(posts, 'categories');
  const modules = terms.map((t, i) => ({
    ...t,
    code: `MOD-${String(i + 1).padStart(2, '0')}`,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
  const uncategorized = posts.filter((p) => postCategoryKeys(p).length === 0);
  return {
    totalPosts: posts.length,
    modules,
    uncategorized,
    multiCategoryPosts: posts.filter((p) => postCategoryKeys(p).length > 1).length,
    membershipTotal: modules.reduce((s, m) => s + m.count, 0) + uncategorized.length,
  };
}

/** Related posts: shared tags/categories, then nearest in time. */
export function relatedPosts(post: Post, posts: Post[], limit = 3): Post[] {
  const tags = new Set(postTagKeys(post));
  const cats = new Set(postCategoryKeys(post));
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const score =
        postTagKeys(p).filter((t) => tags.has(t)).length * 2 + postCategoryKeys(p).filter((c) => cats.has(c)).length * 3;
      return { p, score, dist: Math.abs(p.data.date.getTime() - post.data.date.getTime()) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.dist - b.dist)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Stable display code per post: LOG-001 is the oldest post. */
export function logCode(post: Post, posts: Post[]): string {
  const n = posts.length - posts.indexOf(post);
  return `LOG-${String(n).padStart(3, '0')}`;
}

/** Category label + color lookup for a post (first category, normalized). */
export function primaryModule(post: Post, modules: CategoryModule[]): { label: string; color: string; key: string } {
  const key = postCategoryKeys(post)[0];
  const m = key ? modules.find((x) => x.key === key) : undefined;
  return m ? { label: m.label, color: m.color, key: m.key } : { label: UNCATEGORIZED.label, color: 'var(--cat-none)', key: UNCATEGORIZED.key };
}
