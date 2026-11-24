#!/usr/bin/env node
/**
 * Historical verification of the Jekyll → Astro migration (frozen baseline).
 *
 * This proves the ORIGINAL migration was faithful. It reads everything from Git
 * (migration/baseline.json → sourceCommit / migrationCommit) and never requires the
 * current, editable posts to stay byte-identical. Later edits are only reported.
 *
 *  1. Every post in the Jekyll source commit is in the inventory with the recorded hash.
 *  2. The migration script still reproduces the migration commit's output exactly.
 *  3. The migration commit's files have the original front matter verbatim + metadata,
 *     and bodies matching the recorded hashes.
 *  4. (info) How current posts differ from the baseline (front matter vs body edits).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const baseline = JSON.parse(readFileSync('migration/baseline.json', 'utf8'));
const inv = JSON.parse(readFileSync('migration/inventory.json', 'utf8'));
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const show = (commit, path) => execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const FM = /^---[ \t]*\n([\s\S]*?\n)?---[ \t]*\n/;
let failures = 0;
const ok = (cond, msg) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
};

for (const c of [baseline.sourceCommit, baseline.migrationCommit]) {
  try {
    execFileSync('git', ['cat-file', '-e', `${c}^{commit}`]);
  } catch {
    console.error(`Baseline commit ${c} is not available. In CI use actions/checkout with fetch-depth: 0.`);
    process.exit(1);
  }
}
ok(inv.sourceCommit === baseline.sourceCommit, `inventory source commit matches baseline (${baseline.sourceCommit.slice(0, 7)})`);

// 1. Source integrity
const sourceFiles = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', baseline.sourceCommit, '--', '_posts'], { encoding: 'utf8' })
  .split('\0')
  .filter((f) => f.endsWith('.md'));
const hashOk = inv.posts.filter((p) => sha256(show(baseline.sourceCommit, p.legacySource)) === p.sourceSha256).length;
ok(sourceFiles.length === baseline.postCount && inv.posts.length === baseline.postCount, `legacy posts: source ${sourceFiles.length}, inventory ${inv.posts.length}, baseline ${baseline.postCount}`);
ok(hashOk === inv.posts.length, `legacy source files match recorded SHA-256: ${hashOk}/${inv.posts.length}`);

// 2. Reproducibility against the frozen migration output
try {
  const out = execFileSync('node', ['scripts/migrate-jekyll.mjs', '--check', '--against', baseline.migrationCommit], { encoding: 'utf8', stdio: 'pipe' });
  ok(true, `migration reproduces commit ${baseline.migrationCommit.slice(0, 7)} exactly (${out.trim()})`);
} catch (e) {
  ok(false, `migration reproducibility: ${(e.stdout || '') + (e.stderr || '')}`);
}

// 3. Baseline output integrity
let frontOk = 0;
let bodyOk = 0;
for (const p of inv.posts) {
  const original = show(baseline.sourceCommit, p.legacySource);
  const migrated = show(baseline.migrationCommit, p.target);
  const of = FM.exec(original);
  const mf = FM.exec(migrated);
  if (mf && of && mf[1].startsWith(of[1] ?? '') && mf[1].includes(`legacyPath: ${JSON.stringify(p.legacyPath)}`)) frontOk++;
  if (mf && sha256(migrated.slice(mf[0].length)) === p.migratedBodySha256) bodyOk++;
}
ok(frontOk === inv.posts.length, `baseline: original front matter verbatim + migration metadata: ${frontOk}/${inv.posts.length}`);
ok(bodyOk === inv.posts.length, `baseline: migrated bodies match recorded hashes (${inv.transformedPosts.length} with recorded transforms): ${bodyOk}/${inv.posts.length}`);

// 4. Informational: drift of current posts from the baseline (allowed; not a failure)
let present = 0;
let bodyChanged = [];
let frontChanged = 0;
for (const p of inv.posts) {
  if (!existsSync(p.target)) continue;
  present++;
  const cur = readFileSync(p.target, 'utf8');
  const base = show(baseline.migrationCommit, p.target);
  const cf = FM.exec(cur);
  const bf = FM.exec(base);
  if (cur.slice(cf?.[0].length ?? 0) !== base.slice(bf?.[0].length ?? 0)) bodyChanged.push(p.target);
  else if (cf?.[1] !== bf?.[1]) frontChanged++;
}
console.log(`INFO  current tree: ${present}/${inv.posts.length} migrated posts present; ${frontChanged} with front-matter-only edits; ${bodyChanged.length} with body edits since migration`);
for (const t of bodyChanged.slice(0, 10)) console.log(`        body edited: ${t}`);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nhistorical migration verified');
process.exit(failures ? 1 : 0);
