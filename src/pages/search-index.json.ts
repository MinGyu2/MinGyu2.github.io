/**
 * Small static index for the command palette's quick links (pages, categories,
 * tags, projects, experiments, recent posts). Full-text article search is Pagefind.
 */
import type { APIRoute } from 'astro';
import { buildTaxonomy, displayTitle, formatDate, getModuleStats, getPosts, logCode } from '../lib/posts';
import { SERIES } from '../data/taxonomy';
import { NAV_ITEMS } from '../lib/site';
import { PROJECTS } from '../data/projects';
import { getExperimentCatalog } from '../lib/experiments';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const stats = await getModuleStats();
  const tags = buildTaxonomy(posts, 'tags');
  const lab = getExperimentCatalog();
  const items = [
    ...NAV_ITEMS.map((n) => ({ type: 'PAGE', title: `${n.label} · ${n.ko}`, sub: n.href, url: n.href, keywords: `${n.id} ${n.label} ${n.ko}` })),
    ...PROJECTS.map((p) => ({ type: 'PROJECT', title: p.title, sub: `${p.code} · ${p.stack.slice(0, 4).join(' · ')}`, url: '/projects/', keywords: `${p.summary} ${p.stack.join(' ')} project 프로젝트` })),
    // Experiment Lab: launchable experiments open directly; groups open the catalog filtered by name.
    ...lab.experiments
      .filter((e) => e.launchable)
      .map((e) => ({
        type: 'LAB',
        title: e.title,
        sub: [e.code, ...e.groupTrail, e.description].filter(Boolean).join(' · '),
        url: e.href!,
        keywords: `${e.id} ${e.tags.join(' ')} ${e.groupTrail.join(' ')} lab experiment 실험실 실험`,
      })),
    ...lab.groups.map((g) => ({
      type: 'LAB',
      title: `${g.title} (실험 그룹)`,
      sub: `${g.code} · ${g.count}개 실험`,
      url: `/lab/?q=${encodeURIComponent(g.title)}`,
      keywords: `${g.id} ${g.description ?? ''} group 그룹 실험실`,
    })),
    ...stats.populated.map((m) => ({
      type: 'MODULE',
      title: `${m.name} · ${m.ko}`,
      sub: `${m.code} · ${m.count}개 문서`,
      url: `/posts/?module=${m.id}`,
      keywords: `${m.id} ${m.short} ${m.description} module 모듈 카테고리`,
    })),
    ...stats.populated.flatMap((m) =>
      m.populated.map((s) => ({
        type: 'SUBMODULE',
        title: `${s.name} · ${s.ko}`,
        sub: `${m.code} ${m.name} / ${s.code} · ${s.count}개 문서`,
        url: `/posts/?module=${m.id}&submodule=${s.id}`,
        keywords: `${s.id} ${s.description} ${m.name} ${m.ko} submodule 세부 모듈`,
      })),
    ),
    ...SERIES.map((s) => ({ s, n: posts.filter((p) => p.data.series?.id === s.id).length }))
      .filter((x) => x.n > 0)
      .map(({ s, n }) => ({
        type: 'SERIES',
        title: `${s.title} · ${s.ko}`,
        sub: `SERIES · ${n}편`,
        url: `/posts/?series=${s.id}`,
        keywords: `${s.id} ${s.description} series 연재 시리즈`,
      })),
    ...tags.map((t) => ({ type: 'TAG', title: `#${t.label}`, sub: `${t.count}개 문서`, url: `/posts/?tag=${encodeURIComponent(t.key)}`, keywords: `${t.variants.join(' ')} tag 태그` })),
    ...posts.slice(0, 5).map((p) => ({ type: 'LOG', title: displayTitle(p), sub: `${logCode(p, posts)} · ${formatDate(p.data.date)}`, url: p.data.legacyPath, keywords: '', recent: true })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
