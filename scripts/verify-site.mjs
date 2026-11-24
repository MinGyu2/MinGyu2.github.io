#!/usr/bin/env node
/**
 * Post-build verification of the migration invariants (run after `npm run build`).
 *
 *  1. Content: every legacy post has exactly one migrated file; front matter is the
 *     original text plus migration metadata; the body equals the original except for
 *     transformations recorded in migration/inventory.json (re-derived from Git).
 *  2. Routes: every legacy URL (inventory + migration/legacy-urls.txt snapshot of the
 *     live sitemap) exists in dist/ as <path>/index.html; legacy /pageN/ and archive
 *     pages exist; no post collides with a site route.
 *  3. Integrations: feed.xml (Atom, 10 entries, legacy ids), sitemap.xml, robots.txt,
 *     Google verification file, Pagefind index; utterances settings in article HTML.
 *  4. Links: internal links in article HTML point at generated pages.
 *  5. Counts: dashboard total/category counts agree with the content collection.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const inv = JSON.parse(readFileSync('migration/inventory.json', 'utf8'));
let failures = 0;
const ok = (cond, msg) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
};
const distFile = (urlPath) => join(DIST, decodeURI(urlPath), urlPath.endsWith('/') ? 'index.html' : '');

// 1. Content integrity --------------------------------------------------------
const gitFiles = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', inv.sourceCommit, '--', '_posts'], { encoding: 'utf8' })
  .split('\0')
  .filter((f) => f.endsWith('.md'));
ok(gitFiles.length === inv.postCount, `legacy posts in ${inv.sourceRef} (${inv.sourceCommit.slice(0, 7)}): ${gitFiles.length}, inventory: ${inv.postCount}`);
const migratedFiles = (function walk(dir) {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
})('src/content/posts').filter((f) => f.endsWith('.md'));
ok(migratedFiles.length === gitFiles.length, `migrated post files: ${migratedFiles.length}`);

let frontOk = 0;
let bodyOk = 0;
for (const p of inv.posts) {
  const original = execFileSync('git', ['show', `${inv.sourceCommit}:${p.legacySource}`], { encoding: 'utf8' });
  const migrated = readFileSync(p.target, 'utf8');
  const of = /^---[ \t]*\n([\s\S]*?\n)?---[ \t]*\n/.exec(original);
  const mf = /^---[ \t]*\n([\s\S]*?\n)?---[ \t]*\n/.exec(migrated);
  if (mf && of && mf[1].startsWith(of[1] ?? '') && mf[1].includes(`legacyPath: ${JSON.stringify(p.legacyPath)}`)) frontOk++;
  else console.log(`      front matter mismatch: ${p.target}`);
  const ob = original.slice(of[0].length);
  const mb = migrated.slice(mf[0].length);
  const expectSame = p.transforms.length === 0;
  if ((expectSame && ob === mb) || (!expectSame && !p.bodyUnchanged && ob !== mb)) bodyOk++;
  else console.log(`      body mismatch vs inventory: ${p.target}`);
}
ok(frontOk === inv.postCount, `original front matter preserved verbatim (+ migration metadata): ${frontOk}/${inv.postCount}`);
ok(bodyOk === inv.postCount, `bodies identical to source unless a recorded transform applies: ${bodyOk}/${inv.postCount} (${inv.transformedPosts.length} transformed)`);
try {
  execFileSync('node', ['scripts/migrate-jekyll.mjs', '--check'], { stdio: 'pipe' });
  ok(true, 'migration is reproducible (migrate-jekyll --check)');
} catch (e) {
  ok(false, `migration is reproducible: ${e.stdout}`);
}

// 2. Routes ---------------------------------------------------------------------
const missing = inv.posts.filter((p) => !existsSync(distFile(p.legacyPath)));
ok(missing.length === 0, `post routes generated: ${inv.postCount - missing.length}/${inv.postCount}${missing.length ? ' missing: ' + missing.map((m) => m.legacyPath).join(', ') : ''}`);
if (existsSync('migration/legacy-urls.txt')) {
  const live = readFileSync('migration/legacy-urls.txt', 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
  const absent = live.filter((path) => !existsSync(distFile(path)));
  ok(absent.length === 0, `live-sitemap URLs (snapshot) resolvable: ${live.length - absent.length}/${live.length}${absent.length ? ' missing: ' + absent.join(', ') : ''}`);
}
const pages = Math.ceil(inv.postCount / 5);
const sitePages = ['/', '/posts/', '/categories/', '/tags/', '/projects/', '/lab/', '/about/', ...Array.from({ length: pages - 1 }, (_, i) => `/page${i + 2}/`)];
const absentPages = sitePages.filter((p) => !existsSync(distFile(p)));
ok(absentPages.length === 0, `site + legacy archive pages: ${sitePages.length - absentPages.length}/${sitePages.length}${absentPages.length ? ' missing: ' + absentPages.join(', ') : ''}`);
ok(existsSync(join(DIST, '404.html')), '404.html');

// Article HTML sanity: title, canonical, utterances, no unterminated raw <script>
let articleOk = 0;
for (const p of inv.posts) {
  const html = readFileSync(distFile(p.legacyPath), 'utf8');
  const canonical = `https://mingyu2.github.io${encodeURI(p.legacyPath)}`;
  const opens = (html.match(/<script\b/g) ?? []).length;
  const closes = (html.match(/<\/script>/g) ?? []).length;
  const good =
    html.includes(`<link rel="canonical" href="${canonical}"`) &&
    html.includes('data-repo="MinGyu2/comments"') &&
    html.includes('data-issue-term="pathname"') &&
    html.includes('data-pagefind-body') &&
    opens === closes;
  if (good) articleOk++;
  else console.log(`      article check failed: ${p.legacyPath} (scripts ${opens}/${closes})`);
}
ok(articleOk === inv.postCount, `articles: canonical URL, utterances (MinGyu2/comments, pathname), search body, balanced <script>: ${articleOk}/${inv.postCount}`);

// 3. Integrations ---------------------------------------------------------------
const feed = readFileSync(join(DIST, 'feed.xml'), 'utf8');
const feedIds = [...feed.matchAll(/<entry>.*?<id>([^<]+)<\/id>/gs)].map((m) => m[1]);
ok(feedIds.length === 10 && feedIds.every((id) => !id.endsWith('/')), `feed.xml: Atom with ${feedIds.length} entries, legacy-style ids`);
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const inSitemap = inv.posts.filter((p) => sitemap.includes(`<loc>https://mingyu2.github.io${encodeURI(p.legacyPath)}</loc>`)).length;
ok(inSitemap === inv.postCount, `sitemap.xml lists all posts: ${inSitemap}/${inv.postCount}`);
ok(readFileSync(join(DIST, 'robots.txt'), 'utf8').includes('Sitemap: https://mingyu2.github.io/sitemap.xml'), 'robots.txt');
ok(existsSync(join(DIST, 'google8794a9b81bdb2771.html')), 'Google site verification file');
ok(existsSync(join(DIST, 'pagefind', 'pagefind.js')), 'Pagefind index');

// 4. Internal links in article bodies -----------------------------------------
const known = new Set([...inv.posts.map((p) => p.legacyPath), ...sitePages]);
const broken = [];
for (const p of inv.posts) {
  const html = readFileSync(distFile(p.legacyPath), 'utf8');
  const body = html.slice(html.indexOf('data-article-content'), html.indexOf('id="comments-title"'));
  for (const m of body.matchAll(/href="((?:https?:\/\/mingyu2\.github\.io)?\/[^"#?]*)/g)) {
    let path = m[1].replace(/^https?:\/\/mingyu2\.github\.io/, '') || '/';
    try {
      path = decodeURI(path);
    } catch {
      /* keep raw */
    }
    if (!path.endsWith('/') && !/\.\w+$/.test(path)) path += '/';
    if (!known.has(path) && !existsSync(join(DIST, path))) broken.push(`${p.legacyPath} → ${m[1]}`);
  }
}
ok(broken.length === 0, `internal links in articles resolve${broken.length ? ': ' + broken.join(', ') : ''}`);

// 5. Count agreement -------------------------------------------------------------
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const total = /TOTAL LOGS<\/dt>\s*<dd[^>]*>(\d+)</.exec(home)?.[1];
ok(Number(total) === inv.postCount, `dashboard TOTAL LOGS = ${total}`);
const legendSum = [...home.matchAll(/<span class="font-mono-code text-xs t-muted shrink-0 ml-2"[^>]*>\s*(\d+) \(/g)].reduce((s, m) => s + Number(m[1]), 0);
const catMemberships = inv.posts.reduce((s, p) => s + Math.max(1, new Set(p.categories.map((c) => c.toLowerCase())).size), 0);
ok(legendSum === catMemberships, `Knowledge Ring legend sum (${legendSum}) = category memberships incl. uncategorized (${catMemberships})`);
const archive = readFileSync(join(DIST, 'posts', 'index.html'), 'utf8');
ok((archive.match(/<li data-log-item/g) ?? []).length === inv.postCount, `archive lists every post: ${(archive.match(/<li data-log-item/g) ?? []).length}`);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
