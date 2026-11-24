/**
 * Small static index for the command palette's quick links (pages, categories,
 * tags, projects, experiments, recent posts). Full-text article search is Pagefind.
 */
import type { APIRoute } from 'astro';
import { buildTaxonomy, displayTitle, formatDate, getCategoryStats, getPosts, logCode, UNCATEGORIZED } from '../lib/posts';
import { NAV_ITEMS } from '../lib/site';
import { PROJECTS } from '../data/projects';
import { EXPERIMENTS } from '../data/experiments';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const stats = await getCategoryStats();
  const tags = buildTaxonomy(posts, 'tags');
  const items = [
    ...NAV_ITEMS.map((n) => ({ type: 'PAGE', title: `${n.label} · ${n.ko}`, sub: n.href, url: n.href, keywords: `${n.id} ${n.label} ${n.ko}` })),
    ...PROJECTS.map((p) => ({ type: 'PROJECT', title: p.title, sub: `${p.code} · ${p.stack.slice(0, 4).join(' · ')}`, url: '/projects/', keywords: `${p.summary} ${p.stack.join(' ')} project 프로젝트` })),
    ...EXPERIMENTS.filter((e) => e.status === 'available').map((e) => ({ type: 'LAB', title: e.title, sub: `${e.code} · ${e.summary}`, url: e.href!, keywords: `${e.tech.join(' ')} lab 실험실 base64 url hex` })),
    ...stats.modules.map((m) => ({ type: 'CATEGORY', title: m.label, sub: `${m.code} · ${m.count}개 문서`, url: `/posts/?category=${encodeURIComponent(m.key)}`, keywords: `${m.variants.join(' ')} category 카테고리` })),
    { type: 'CATEGORY', title: UNCATEGORIZED.label, sub: `MOD-00 · ${stats.uncategorized.length}개 문서`, url: `/posts/?category=${UNCATEGORIZED.key}`, keywords: `${UNCATEGORIZED.en} 미분류` },
    ...tags.map((t) => ({ type: 'TAG', title: `#${t.label}`, sub: `${t.count}개 문서`, url: `/posts/?tag=${encodeURIComponent(t.key)}`, keywords: `${t.variants.join(' ')} tag 태그` })),
    ...posts.slice(0, 5).map((p) => ({ type: 'LOG', title: displayTitle(p), sub: `${logCode(p, posts)} · ${formatDate(p.data.date)}`, url: p.data.legacyPath, keywords: '', recent: true })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
