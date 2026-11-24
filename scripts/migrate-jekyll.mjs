#!/usr/bin/env node
/**
 * Reproducible Jekyll → Astro content migration.
 *
 * Reads every post under `_posts/` from a Git ref (default: `legacy-jekyll`),
 * keeps the original front matter text and Markdown body byte-for-byte, and
 * appends explicit migration metadata:
 *
 *   date          publication date taken from the Jekyll file name (UTC, as on GitHub Pages)
 *   legacyPath    the historical public URL produced by `permalink: /:categories/:title/`
 *   legacySource  the original repository path
 *
 * Only Liquid constructs that Astro cannot evaluate are transformed, and every
 * transformation is recorded in `migration/inventory.json`. Any unknown Liquid
 * tag aborts the migration instead of being silently dropped.
 *
 * Usage:
 *   node scripts/migrate-jekyll.mjs --check [--against <commit>|worktree]
 *       Regenerate in memory and compare with the frozen migration output. By default the
 *       comparison target is migration/baseline.json → migrationCommit (read from Git), so
 *       later legitimate edits to posts never affect this historical check.
 *   node scripts/migrate-jekyll.mjs --out <dir>
 *       Write a fresh, isolated migration output (plus <dir>/_inventory.json).
 *   node scripts/migrate-jekyll.mjs [--out src/content/posts] --force
 *       Regenerate into the live content directory. Refused without --force whenever an
 *       existing file would change, because posts are edited after migration.
 *   --ref <ref>  Jekyll source ref (default legacy-jekyll, falls back to the recorded commit)
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { kramdownCompat } from './lib/markdown-compat.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const REF = opt('--ref', 'legacy-jekyll');
const OUT = opt('--out', 'src/content/posts');
const CHECK = args.includes('--check');
const FORCE = args.includes('--force');
const LIVE_OUT = OUT === 'src/content/posts';
const INVENTORY = 'migration/inventory.json';
const OUT_INVENTORY = LIVE_OUT ? INVENTORY : join(OUT, '_inventory.json');
const BASELINE = existsSync('migration/baseline.json') ? JSON.parse(readFileSync('migration/baseline.json', 'utf8')) : {};
const AGAINST = opt('--against', BASELINE.migrationCommit ?? 'worktree');
/** Content of a path in the comparison target (a Git commit, or the working tree). */
function targetContent(path) {
  if (AGAINST === 'worktree') return existsSync(path) ? readFileSync(path, 'utf8') : null;
  try {
    return execFileSync('git', ['show', `${AGAINST}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}
const pendingWrites = [];

const git = (...a) => execFileSync('git', a, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// Prefer the named ref; fall back to the commit recorded in the inventory so the
// migration stays reproducible in clones that do not have the backup branch.
let refCommit;
let sourceLabel = REF;
try {
  refCommit = git('rev-parse', '--verify', '--quiet', `${REF}^{commit}`).toString().trim();
} catch {
  const recorded = existsSync(INVENTORY) ? JSON.parse(readFileSync(INVENTORY, 'utf8')).sourceCommit : null;
  if (!recorded) throw new Error(`Git ref "${REF}" not found and no recorded source commit`);
  refCommit = git('rev-parse', '--verify', `${recorded}^{commit}`).toString().trim();
  sourceLabel = JSON.parse(readFileSync(INVENTORY, 'utf8')).sourceRef;
  console.error(`ref "${REF}" not found; using recorded source commit ${refCommit.slice(0, 7)}`);
}
const files = git('ls-tree', '-r', '-z', '--name-only', refCommit, '--', '_posts')
  .toString('utf8')
  .split('\0')
  .filter((f) => f.endsWith('.md'));

const POST_NAME = /^(\d{4})-(\d{2})-(\d{2})-(.+)\.(md|markdown)$/;

/** Jekyll 3.10 `Time#to_s` style output used by `{{ page.last_modified_at }}`. */
function jekyllTimeString(raw) {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.exec(String(raw).trim());
  if (!m) throw new Error(`Unsupported timestamp for Liquid output: ${raw}`);
  const zone = !m[3] || m[3] === 'Z' ? '+0000' : m[3].replace(':', '');
  return `${m[1]} ${m[2]} ${zone}`;
}

/** Jekyll: `categories` may be a YAML list or a whitespace separated string. */
function jekyllCategories(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : String(value).split(/\s+/);
  return list.map((c) => String(c)).filter((c) => c.length > 0);
}

function legacyUrl(data, slug) {
  if (typeof data.permalink === 'string' && data.permalink.trim()) {
    return data.permalink.trim();
  }
  // Jekyll UrlDrop#categories: downcased, de-duplicated, joined with "/".
  const cats = [...new Set(jekyllCategories(data.categories).map((c) => c.toLowerCase()))];
  const title = typeof data.slug === 'string' && data.slug ? data.slug : slug;
  return '/' + [...cats, title].join('/') + '/';
}

function transformLiquid(body, data, rawFront) {
  const transforms = [];
  let out = body;

  out = out.replace(/\{\{\s*page\.title\s*\}\}/g, () => {
    transforms.push({ kind: 'liquid-variable', from: '{{ page.title }}', to: String(data.title) });
    return String(data.title);
  });

  out = out.replace(/\{\{\s*page\.last_modified_at\s*\}\}/g, () => {
    const raw = rawFront.last_modified_at;
    const value = jekyllTimeString(raw);
    transforms.push({ kind: 'liquid-variable', from: '{{ page.last_modified_at }}', to: value });
    return value;
  });

  // {% highlight lang [linenos] %} ... {% endhighlight %}  →  fenced code block (same indentation)
  out = out.replace(
    /^([ \t]*)\{%-?\s*highlight\s+([\w+#.-]+)((?:\s+\w+)*)\s*-?%\}[ \t]*\n([\s\S]*?)^[ \t]*\{%-?\s*endhighlight\s*-?%\}[ \t]*$/gm,
    (_m, indent, lang, flags, code) => {
      const meta = flags.trim();
      transforms.push({ kind: 'liquid-highlight', lang, meta: meta || null });
      return `${indent}\`\`\`${lang}${meta ? ' ' + meta : ''}\n${code}${indent}\`\`\``;
    },
  );

  const leftover = out.match(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/);
  if (leftover) throw new Error(`Unsupported Liquid construct left in body: ${leftover[0]}`);
  return { body: out, transforms };
}

const quote = (s) => JSON.stringify(s); // JSON strings are valid YAML double-quoted scalars

const entries = [];
let mismatches = 0;

for (const source of files.sort()) {
  const name = posix.basename(source);
  const m = POST_NAME.exec(name);
  if (!m) throw new Error(`Not a Jekyll post file name: ${source}`);
  const [, y, mo, d, slug] = m;

  const text = git('show', `${refCommit}:${source}`).toString('utf8');
  const fm = /^---[ \t]*\n([\s\S]*?\n)?---[ \t]*\n/.exec(text);
  if (!fm) throw new Error(`Missing front matter: ${source}`);
  const frontText = fm[1] ?? '';
  const body = text.slice(fm[0].length);

  // YAML 1.2 core schema keeps timestamps as their original strings.
  const data = parseYaml(frontText) ?? {};
  for (const key of ['date', 'legacyPath', 'legacySource']) {
    if (key in data) throw new Error(`${source}: front matter already defines "${key}"`);
  }
  if (data.published === false) throw new Error(`${source}: unpublished post needs a policy decision`);

  const legacyPath = legacyUrl(data, slug);
  const liquid = transformLiquid(body, data, data);
  const compat = kramdownCompat(liquid.body);
  const newBody = compat.body;
  const transforms = [...liquid.transforms, ...compat.transforms];

  const appended =
    `# --- ARC LAB migration metadata (generated by scripts/migrate-jekyll.mjs from ${sourceLabel}) ---\n` +
    `date: ${y}-${mo}-${d}\n` +
    `legacyPath: ${quote(legacyPath)}\n` +
    `legacySource: ${quote(source)}\n`;
  const output = `---\n${frontText}${appended}---\n${newBody}`;

  const target = join(OUT, source.replace(/^_posts\//, ''));
  if (CHECK) {
    if (targetContent(target) !== output) {
      mismatches++;
      console.error(`MISMATCH ${target}`);
    }
  } else {
    pendingWrites.push([target, output]);
  }

  entries.push({
    legacySource: source,
    target: target.split('\\').join('/'),
    legacyPath,
    title: data.title,
    date: `${y}-${mo}-${d}`,
    lastModifiedAt: data.last_modified_at ?? null,
    categories: jekyllCategories(data.categories),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    excerpt: data.excerpt ?? null,
    sourceSha256: sha256(text),
    sourceBodySha256: sha256(body),
    migratedBodySha256: sha256(newBody),
    bodyUnchanged: body === newBody,
    transforms,
  });
}

// Route collision detection
const seen = new Map();
for (const e of entries) {
  if (seen.has(e.legacyPath)) throw new Error(`Route collision: ${e.legacyPath} (${seen.get(e.legacyPath)} / ${e.legacySource})`);
  seen.set(e.legacyPath, e.legacySource);
}

const inventory = {
  generatedBy: 'scripts/migrate-jekyll.mjs',
  sourceRef: sourceLabel,
  sourceCommit: refCommit,
  permalinkRule: '/:categories/:title/ (Jekyll 3.10, categories downcased)',
  postCount: entries.length,
  transformedPosts: entries.filter((e) => !e.bodyUnchanged).map((e) => e.legacySource),
  posts: entries,
};
const inventoryJson = JSON.stringify(inventory, null, 2) + '\n';

if (CHECK) {
  if (targetContent(INVENTORY) !== inventoryJson) {
    mismatches++;
    console.error(`MISMATCH ${INVENTORY}`);
  }
  console.log(`check against ${AGAINST === 'worktree' ? 'working tree' : AGAINST.slice(0, 7)}: ${entries.length} posts, ${mismatches} mismatches`);
  process.exit(mismatches ? 1 : 0);
}

// Overwrite guard: never silently replace edited posts or the historical inventory.
pendingWrites.push([OUT_INVENTORY, inventoryJson]);
const wouldChange = pendingWrites.filter(([path, content]) => existsSync(path) && readFileSync(path, 'utf8') !== content);
if (wouldChange.length && !FORCE) {
  console.error(`Refusing to overwrite ${wouldChange.length} existing file(s) that differ from the regenerated output:`);
  for (const [path] of wouldChange.slice(0, 20)) console.error(`  ${path}`);
  if (wouldChange.length > 20) console.error(`  … and ${wouldChange.length - 20} more`);
  console.error('Posts are edited after migration (e.g. module/submodule classification). Use --out <dir> for an');
  console.error('isolated output, or pass --force to replace them deliberately.');
  process.exit(2);
}
for (const [path, content] of pendingWrites) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
console.log(`migrated ${entries.length} posts from ${REF} (${refCommit.slice(0, 7)}) → ${OUT}`);
console.log(`transformed bodies: ${inventory.transformedPosts.join(', ') || 'none'}`);
