#!/usr/bin/env node
/**
 * Ongoing verification of the CURRENT content and the generated site (run after
 * `npm run build`). Works with any number of posts; adding or editing posts never
 * requires touching migration/inventory.json. Historical migration checks live in
 * scripts/verify-migration.mjs.
 *
 *  1. Content: every published post has a valid module/submodule (and series, if any);
 *     series orders are unique.
 *  2. Historical routes: migrated posts keep their recorded legacyPath, and every URL of
 *     the pre-migration live sitemap (migration/legacy-urls.txt) is still generated.
 *     Deliberately retired URLs can be listed in migration/retired-urls.txt.
 *  3. Pages: one generated article per published post, canonical URL, utterances mapping
 *     (MinGyu2/comments, pathname), search body, classification attributes, balanced <script>.
 *  4. Integrations: feed.xml, sitemap.xml, robots.txt, verification file, Pagefind, palette index.
 *  5. Links: internal links and asset references in articles point at generated files.
 *  6. Statistics: Knowledge Ring legend counts each post once, sums to the post count,
 *     percentages sum to 100, empty modules are not shown; archive lists every post.
 *  7. Experiment Lab: /lab/ is a catalog only (no experiment code or iframes), counts match
 *     /lab/catalog.json, every launch link resolves to a generated file, Payload Inspector
 *     has its own route (+ legacy #payload-inspector forward), dashboard and palette agree.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { MODULES, validateClassification } from '../src/data/taxonomy.ts';

const DIST = 'dist';
const POSTS_DIR = 'src/content/posts';
let failures = 0;
const ok = (cond, msg, details = []) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) for (const d of details.slice(0, 15)) console.log(`        ${d}`);
};
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const lines = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [];
const distFile = (urlPath) => join(DIST, decodeURI(urlPath), urlPath.endsWith('/') ? 'index.html' : '');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// 1. Current content ----------------------------------------------------------------------
const posts = walk(POSTS_DIR)
  .filter((f) => /\.(md|markdown)$/.test(f))
  .map((file) => {
    const text = readFileSync(file, 'utf8');
    const fm = /^---[ \t]*\n([\s\S]*?\n)?---[ \t]*\n/.exec(text);
    return { file: relative('.', file).split(sep).join('/'), data: fm ? (parseYaml(fm[1] ?? '') ?? {}) : {} };
  })
  .filter((p) => p.data.published !== false);
const invalid = posts.flatMap((p) => validateClassification(p.data).map((e) => `${p.file}: ${e}`));
ok(invalid.length === 0, `classification valid for all ${posts.length} published posts`, invalid);
const seriesSeen = new Map();
const seriesDup = [];
for (const p of posts) {
  if (!p.data.series) continue;
  const key = `${p.data.series.id}#${p.data.series.order}`;
  if (seriesSeen.has(key)) seriesDup.push(`${key}: ${seriesSeen.get(key)} and ${p.file}`);
  seriesSeen.set(key, p.file);
}
ok(seriesDup.length === 0, `series orders unique (${seriesSeen.size} series entries)`, seriesDup);

// 2. Historical routes ----------------------------------------------------------------------
const inv = JSON.parse(readFileSync('migration/inventory.json', 'utf8'));
const retired = new Set(lines('migration/retired-urls.txt'));
const bySource = new Map(posts.filter((p) => p.data.legacySource).map((p) => [p.data.legacySource, p]));
const routeDrift = [];
for (const h of inv.posts) {
  if (retired.has(h.legacyPath)) continue;
  const cur = bySource.get(h.legacySource);
  if (!cur) routeDrift.push(`${h.legacySource}: migrated post missing (list ${h.legacyPath} in migration/retired-urls.txt if intentional)`);
  else if (cur.data.legacyPath !== h.legacyPath) routeDrift.push(`${cur.file}: legacyPath "${cur.data.legacyPath}" ≠ historical "${h.legacyPath}"`);
}
ok(routeDrift.length === 0, `migrated posts keep their historical URLs: ${inv.posts.length - routeDrift.length}/${inv.posts.length}`, routeDrift);
const live = lines('migration/legacy-urls.txt').filter((u) => !retired.has(u));
const absent = live.filter((u) => !existsSync(distFile(u)));
ok(absent.length === 0, `pre-migration live URLs still generated: ${live.length - absent.length}/${live.length}`, absent);
const sitePages = ['/', '/posts/', '/categories/', '/tags/', '/projects/', '/lab/', '/about/', '/page2/'];
const missingPages = sitePages.filter((p) => !existsSync(distFile(p)));
ok(missingPages.length === 0 && existsSync(join(DIST, '404.html')), 'site pages, legacy /pageN/ archive and 404 generated', missingPages);

// 3. Generated article pages -------------------------------------------------------------------
const articles = walk(DIST)
  .filter((f) => f.endsWith('index.html'))
  .map((f) => ({ f, html: readFileSync(f, 'utf8') }))
  .filter((a) => a.html.includes('data-article-content'));
ok(articles.length === posts.length, `one article page per published post: ${articles.length} pages / ${posts.length} posts`);
const paths = new Set();
const articleErrors = [];
for (const { f, html } of articles) {
  const path = '/' + relative(DIST, f).split(sep).slice(0, -1).join('/') + '/';
  paths.add(path);
  const canonical = `https://mingyu2.github.io${encodeURI(path)}`;
  const mod = /data-module="([^"]+)"/.exec(html)?.[1];
  const sub = /data-submodule="([^"]+)"/.exec(html)?.[1];
  const opens = (html.match(/<script\b/g) ?? []).length;
  const closes = (html.match(/<\/script>/g) ?? []).length;
  const problems = [
    !html.includes(`<link rel="canonical" href="${canonical}"`) && 'canonical',
    !html.includes('data-repo="MinGyu2/comments"') && 'utterances repo',
    !html.includes('data-issue-term="pathname"') && 'utterances issue-term',
    !html.includes('data-pagefind-body') && 'search body',
    validateClassification({ module: mod, submodule: sub }).length > 0 && `classification ${mod}/${sub}`,
    opens !== closes && `scripts ${opens}/${closes}`,
  ].filter(Boolean);
  if (problems.length) articleErrors.push(`${path}: ${problems.join(', ')}`);
}
ok(articleErrors.length === 0, 'articles: canonical, utterances (MinGyu2/comments · pathname), search body, classification, balanced <script>', articleErrors);

// 4. Integrations ------------------------------------------------------------------------------
const feed = readFileSync(join(DIST, 'feed.xml'), 'utf8');
const feedIds = [...feed.matchAll(/<entry>.*?<id>([^<]+)<\/id>/gs)].map((m) => m[1]);
ok(feedIds.length === Math.min(10, posts.length) && feedIds.every((id) => !id.endsWith('/')), `feed.xml: Atom with ${feedIds.length} entries, jekyll-feed style ids`);
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const notInSitemap = [...paths].filter((p) => !sitemap.includes(`<loc>https://mingyu2.github.io${encodeURI(p)}</loc>`));
ok(notInSitemap.length === 0, `sitemap.xml lists every article: ${paths.size - notInSitemap.length}/${paths.size}`, notInSitemap);
ok(readFileSync(join(DIST, 'robots.txt'), 'utf8').includes('Sitemap: https://mingyu2.github.io/sitemap.xml'), 'robots.txt');
ok(existsSync(join(DIST, 'google8794a9b81bdb2771.html')), 'Google site verification file');
ok(existsSync(join(DIST, 'pagefind', 'pagefind.js')), 'Pagefind index generated');
const searchIndex = JSON.parse(readFileSync(join(DIST, 'search-index.json'), 'utf8'));
ok(['MODULE', 'SUBMODULE', 'SERIES'].every((t) => searchIndex.some((i) => i.type === t)), 'command palette index lists modules, submodules and series');

// 5. Internal links --------------------------------------------------------------------------------
const broken = [];
for (const { f, html } of articles) {
  const body = html.slice(html.indexOf('data-article-content'), html.indexOf('id="comments-title"'));
  for (const m of body.matchAll(/(?:href|src)="((?:https?:\/\/mingyu2\.github\.io)?\/[^"#?]*)/g)) {
    let path = m[1].replace(/^https?:\/\/mingyu2\.github\.io/, '') || '/';
    try {
      path = decodeURI(path);
    } catch {
      /* keep raw */
    }
    if (!existsSync(join(DIST, path)) && !existsSync(join(DIST, path, 'index.html'))) broken.push(`${relative(DIST, f)} → ${m[1]}`);
  }
}
ok(broken.length === 0, 'internal links and asset references in articles resolve', broken);

// 6. Statistics --------------------------------------------------------------------------------------
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const legend = [...home.matchAll(/data-ring-module="([^"]+)" data-count="(\d+)" data-pct="(\d+)"/g)].map((m) => ({ id: m[1], count: +m[2], pct: +m[3] }));
const expected = MODULES.map((m) => ({ id: m.id, count: posts.filter((p) => p.data.module === m.id).length })).filter((m) => m.count > 0);
const legendSum = legend.reduce((s, x) => s + x.count, 0);
ok(legendSum === posts.length, `Knowledge Ring counts every post once: legend sum ${legendSum} = ${posts.length} posts`);
ok(legend.reduce((s, x) => s + x.pct, 0) === 100, `legend percentages sum to 100 (${legend.map((x) => `${x.id} ${x.pct}%`).join(', ')})`);
ok(
  JSON.stringify(legend.map(({ id, count }) => ({ id, count }))) === JSON.stringify(expected) && legend.every((x) => x.count > 0),
  `legend shows exactly the populated modules in taxonomy order (${expected.map((m) => `${m.id} ${m.count}`).join(', ')})`,
);
const total = /TOTAL LOGS<\/dt>\s*<dd[^>]*>(\d+)</.exec(home)?.[1];
ok(Number(total) === posts.length, `dashboard TOTAL LOGS = ${total}`);
const archiveCount = (readFileSync(join(DIST, 'posts', 'index.html'), 'utf8').match(/<li\s+data-log-item/g) ?? []).length;
ok(archiveCount === posts.length, `archive lists every post: ${archiveCount}`);
const cats = readFileSync(join(DIST, 'categories', 'index.html'), 'utf8');
const shownModules = [...cats.matchAll(/id="module-([a-z-]+)"/g)].map((m) => m[1]).filter((id) => !id.endsWith("-title"));
ok(JSON.stringify(shownModules) === JSON.stringify(expected.map((m) => m.id)), `/categories/ shows only populated modules (${shownModules.join(', ')})`);

// 7. Experiment Lab -----------------------------------------------------------------------------------
const labHtml = readFileSync(join(DIST, 'lab', 'index.html'), 'utf8');
const lab = JSON.parse(readFileSync(join(DIST, 'lab', 'catalog.json'), 'utf8'));
const flat = [];
const walkCat = (nodes) => nodes.forEach((n) => (n.kind === 'group' ? walkCat(n.children) : flat.push(n)));
walkCat(lab.roots);
ok(
  !labHtml.includes('data-payload-inspector') && !/<iframe\b/i.test(labHtml) && !/<script[^>]+src="\/experiments\//i.test(labHtml),
  '/lab/ is a catalog only: no experiment component, iframe or experiment script loaded',
);
const shownCounts = Object.fromEntries([...labHtml.matchAll(/data-lab-count="([a-z-]+)"[^>]*>(\d+)</g)].map((m) => [m[1], +m[2]]));
ok(
  shownCounts.total === lab.counts.total &&
    shownCounts.available === lab.counts.available &&
    shownCounts['in-development'] === lab.counts.inDevelopment &&
    shownCounts.planned === lab.counts.planned &&
    shownCounts.groups === lab.counts.groups &&
    flat.length === lab.counts.total,
  `/lab/ counts match the catalog (${JSON.stringify(lab.counts)})`,
);
const launchHrefs = [...new Set([...labHtml.matchAll(/<a href="([^"]+)"[^>]*aria-label="[^"]*실행"/g)].map((m) => m[1]))];
const launchable = flat.filter((e) => e.launchable);
ok(
  JSON.stringify([...launchHrefs].sort()) === JSON.stringify(launchable.map((e) => e.href).sort()),
  `launch controls only for launchable experiments (${launchable.length}); planned/unavailable entries have none`,
);
const unresolved = launchable.filter((e) => {
  const path = decodeURIComponent(e.href);
  return !existsSync(path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path));
});
ok(unresolved.length === 0, 'every launch link resolves to a generated file', unresolved.map((e) => `${e.id} → ${e.href}`));
const pi = existsSync(join(DIST, 'lab', 'payload-inspector', 'index.html')) ? readFileSync(join(DIST, 'lab', 'payload-inspector', 'index.html'), 'utf8') : '';
ok(pi.includes('data-payload-inspector') && pi.includes('LAB-01') && pi.includes('href="/lab/"'), 'Payload Inspector at /lab/payload-inspector/ (LAB-01, link back to the lab)');
ok(labHtml.includes("location.hash === '#payload-inspector'") && labHtml.includes("location.replace('/lab/payload-inspector/')"), 'legacy /lab/#payload-inspector forwards to the dedicated route');
const dashCount = /data-dashboard-lab-count="(\d+)"/.exec(home)?.[1];
ok(Number(dashCount) === lab.counts.total, `dashboard experiment count = catalog total (${dashCount})`);
const paletteLab = searchIndex.filter((i) => i.type === 'LAB' && !i.url.startsWith('/lab/?q=')).map((i) => i.url).sort();
ok(JSON.stringify(paletteLab) === JSON.stringify(launchable.map((e) => e.href).sort()), `command palette lists exactly the launchable experiments (${paletteLab.length})`);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nsite verified');
process.exit(failures ? 1 : 0);
