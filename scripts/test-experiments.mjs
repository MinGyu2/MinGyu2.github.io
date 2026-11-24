#!/usr/bin/env node
/**
 * Regression tests for Experiment Lab discovery and catalog building.
 * Builds temporary fixture trees, runs the real discovery/catalog code, removes the fixtures.
 *   node scripts/test-experiments.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { discoverExperiments, safeRelativePath, titleFromDirName } from '../src/lib/experiment-discovery.ts';
import { buildCatalog } from '../src/lib/experiments.ts';

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL  ${name}\n      ${e.message.split('\n').join('\n      ')}`);
  }
}

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'arc-lab-exp-'));
  for (const [path, content] of Object.entries(files)) {
    const abs = join(root, path);
    mkdirSync(path.endsWith('/') ? abs : dirname(abs), { recursive: true });
    if (!path.endsWith('/')) writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}
const roots = [];
const discover = (files) => {
  const root = fixture(files);
  roots.push(root);
  return discoverExperiments(root);
};
const html = '<!doctype html><title>x</title>';

// --- Valid tree covering the discovery rules ---------------------------------------------
const valid = discover({
  'standalone-demo/index.html': html,
  'web-security/group.json': { title: 'Web Security', description: '웹 보안 시뮬레이션', icon: 'shield', order: 10 },
  'web-security/sql-injection/experiment.json': {
    title: 'SQL Injection Simulator',
    description: '교육용 웹 보안 시뮬레이션',
    version: '1.0.0',
    tags: ['Security', 'JavaScript'],
    status: 'available',
    entry: 'app/main.html',
    order: 10,
    thumbnail: 'assets/thumb.png',
  },
  'web-security/sql-injection/app/main.html': html,
  'web-security/sql-injection/assets/thumb.png': 'png',
  'web-security/xss/index.html': html,
  'web-security/csrf/index.html': html,
  'physics/fluid/index.html': html,
  'physics/mechanics/rigid-body/index.html': html,
  'physics/mechanics/pendulum/index.html': html,
  'graphics/portal/index.html': html,
  'graphics/portal/assets/textures/wall.png': 'png',
  'graphics/portal/shaders/main.glsl': 'void main(){}',
  'graphics/portal/levels/index.html': html, // inside an experiment → part of it, not a card
  'graphics/coming-soon/experiment.json': { title: 'Coming Soon', status: 'planned' },
  'graphics/isolated/experiment.json': { requiresCrossOriginIsolation: true },
  'graphics/isolated/index.html': html,
  'assets/index.html': html, // resource dir at root
  'scripts/tool/index.html': html, // resource dir at root
  '.hidden/demo/index.html': html,
  '_drafts/demo/index.html': html,
  'empty-dir/': '',
  'resources-only/images/a.png': 'png',
  'README.md': '# not an experiment',
});

test('valid tree has no errors', () => assert.deepEqual(valid.errors, []));
const top = valid.nodes.map((n) => `${n.kind}:${n.path}`);
test('root level: groups and standalone experiment; resource/hidden/empty dirs ignored', () =>
  assert.deepEqual(top, ['group:web-security', 'group:graphics', 'group:physics', 'experiment:standalone-demo']));
const web = valid.nodes.find((n) => n.path === 'web-security');
test('multiple experiments in one parent form one group, ordered by order then name', () =>
  assert.deepEqual(web.children.map((c) => c.path), ['web-security/sql-injection', 'web-security/csrf', 'web-security/xss']));
test('group.json metadata applied', () => assert.deepEqual([web.title, web.description, web.icon, web.order], ['Web Security', '웹 보안 시뮬레이션', 'shield', 10]));
const sqli = web.children[0];
test('experiment.json metadata applied (custom entry, thumbnail, tags, version)', () => {
  assert.equal(sqli.title, 'SQL Injection Simulator');
  assert.equal(sqli.version, '1.0.0');
  assert.deepEqual(sqli.tags, ['Security', 'JavaScript']);
  assert.equal(sqli.href, '/experiments/web-security/sql-injection/app/main.html');
  assert.equal(sqli.thumbnail, '/experiments/web-security/sql-injection/assets/thumb.png');
});
const xss = web.children.find((c) => c.path === 'web-security/xss');
test('no metadata: derived title, index.html entry, available, nothing invented', () => {
  assert.equal(xss.title, 'Xss');
  assert.equal(xss.status, 'available');
  assert.equal(xss.href, '/experiments/web-security/xss/');
  assert.equal(xss.description, undefined);
  assert.equal(xss.version, undefined);
  assert.equal(xss.thumbnail, undefined);
  assert.deepEqual(xss.tags, []);
});
const physics = valid.nodes.find((n) => n.path === 'physics');
test('nested group preserves hierarchy', () => {
  assert.deepEqual(physics.children.map((c) => `${c.kind}:${c.path}`), ['experiment:physics/fluid', 'group:physics/mechanics']);
  assert.deepEqual(physics.children[1].children.map((c) => c.path), ['physics/mechanics/pendulum', 'physics/mechanics/rigid-body']);
});
const graphics = valid.nodes.find((n) => n.path === 'graphics');
test('experiment asset subdirectories and nested html are not separate experiments', () =>
  assert.deepEqual(graphics.children.map((c) => c.path), ['graphics/coming-soon', 'graphics/isolated', 'graphics/portal']));
test('metadata-only planned experiment without entry is planned and has no href', () => {
  const p = graphics.children.find((c) => c.path === 'graphics/coming-soon');
  assert.equal(p.status, 'planned');
  assert.equal(p.href, undefined);
});
test('title derivation', () => assert.deepEqual([titleFromDirName('rigid-body'), titleFromDirName('mini_world'), titleFromDirName('유체-시뮬')], ['Rigid Body', 'Mini World', '유체 시뮬']));

// --- Catalog: merge with registered entries, counts, launchability -------------------------
const registered = [
  { path: 'payload-inspector', code: 'LAB-01', title: 'Payload Inspector', description: 'd', kind: 'astro', tags: [], status: 'available', href: '/lab/payload-inspector/', order: 10 },
  { path: 'standalone-demo', code: 'LAB-09', title: 'Old planned title', description: 'planned before', kind: 'standalone', tags: ['Canvas'], status: 'planned' },
  { path: 'physics/mechanics/orbit', code: 'LAB-10', title: 'Orbit', description: 'planned', kind: 'standalone', tags: [], status: 'planned' },
];
const cat = buildCatalog(valid.nodes, registered);
test('registered entry discovered in filesystem is merged, not duplicated (code kept, implementation wins)', () => {
  const demos = cat.experiments.filter((e) => e.id === 'standalone-demo');
  assert.equal(demos.length, 1);
  assert.equal(demos[0].code, 'LAB-09');
  assert.equal(demos[0].status, 'available');
  assert.equal(demos[0].source, 'standalone');
});
test('registered planned item placed inside its parent group', () => {
  const mech = cat.groups.find((g) => g.id === 'physics/mechanics');
  assert.ok(mech.children.some((c) => c.id === 'physics/mechanics/orbit' && c.status === 'planned' && !c.launchable));
});
test('counts: groups never counted as experiments; descendants included', () => {
  assert.equal(cat.counts.total, 12); // 10 discovered + payload-inspector + orbit (standalone-demo merged, not added)
  assert.equal(cat.counts.groups, 4);
  assert.equal(cat.groups.find((g) => g.id === 'physics').count, 4);
  assert.equal(cat.groups.find((g) => g.id === 'physics').available, 3);
  assert.equal(cat.counts.planned, 2);
});
test('cross-origin-isolated experiment is not advertised as launchable', () => {
  const iso = cat.experiments.find((e) => e.id === 'graphics/isolated');
  assert.equal(iso.launchable, false);
  assert.match(iso.unavailableReason, /COOP\/COEP/);
});
test('group codes are deterministic pre-order', () => assert.deepEqual(cat.groups.map((g) => `${g.code}:${g.id}`), ['GRP-01:web-security', 'GRP-02:graphics', 'GRP-03:physics', 'GRP-04:physics/mechanics']));
test('ids unique across groups with same directory name', () => {
  const r = buildCatalog(discover({ 'a/demo/index.html': html, 'b/demo/index.html': html }).nodes, []);
  assert.deepEqual(r.experiments.map((e) => e.id).sort(), ['a/demo', 'b/demo']);
});

// --- Invalid metadata and unsafe paths ---------------------------------------------------
const bad = discover({
  'broken-json/experiment.json': '{ title: nope',
  'broken-json/index.html': html,
  'bad-status/experiment.json': { status: 'done' },
  'bad-status/index.html': html,
  'traversal/experiment.json': { entry: '../../etc/passwd.html' },
  'external/experiment.json': { entry: 'https://evil.example/x.html' },
  'absolute/experiment.json': { entry: '/index.html' },
  'not-html/experiment.json': { entry: 'run.js' },
  'bad-types/experiment.json': { title: 3, tags: 'x', order: 'first', requiresCrossOriginIsolation: 'yes' },
  'bad-types/index.html': html,
  'unknown-field/experiment.json': { titel: 'typo' },
  'unknown-field/index.html': html,
  'missing-entry/experiment.json': { title: 'Missing', status: 'available' },
  'bad-thumb/experiment.json': { thumbnail: '../secret.png' },
  'bad-thumb/index.html': html,
  'grp/group.json': { icon: 'rocket-from-cdn' },
  'grp/x/index.html': html,
});
const has = (re) => bad.errors.some((e) => re.test(e));
test('malformed JSON reported', () => assert.ok(has(/broken-json\/experiment\.json: invalid JSON/)));
test('unsupported status reported', () => assert.ok(has(/bad-status.*"status" must be one of/)));
test('path traversal entry rejected', () => assert.ok(has(/traversal.*"entry" must be a relative \.html path/)));
test('external URL entry rejected', () => assert.ok(has(/external.*"entry"/)));
test('absolute entry rejected', () => assert.ok(has(/absolute.*"entry"/)));
test('non-html entry rejected', () => assert.ok(has(/not-html.*"entry"/)));
test('wrong field types reported', () => assert.ok(['"title"', '"tags"', '"order"', '"requiresCrossOriginIsolation"'].every((f) => bad.errors.some((e) => e.includes('bad-types') && e.includes(f)))));
test('unknown field reported', () => assert.ok(has(/unknown-field.*unknown field "titel"/)));
test('available experiment with missing entry reported', () => assert.ok(has(/missing-entry: entry point "index\.html" not found/)));
test('unsafe thumbnail rejected', () => assert.ok(has(/bad-thumb.*"thumbnail"/)));
test('invalid group icon reported', () => assert.ok(has(/grp\/group\.json: "icon" must be one of/)));
test('safeRelativePath', () => {
  const d = tmpdir();
  assert.equal(safeRelativePath('a/b.html', d), 'a/b.html');
  for (const v of ['../x.html', 'a/../../x.html', '/x.html', '//cdn/x.html', 'javascript:alert(1)', 'a\\b.html', 'a//b.html', './x.html', 'x.html?q=1'])
    assert.equal(safeRelativePath(v, d), null, v);
});
test('missing root → empty catalog without errors', () => assert.deepEqual(discoverExperiments(join(tmpdir(), 'arc-lab-does-not-exist-' + Date.now())), { nodes: [], errors: [] }));

for (const r of roots) rmSync(r, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failures.length} experiment discovery tests passed${failures.length ? ` — FAILED: ${failures.join(', ')}` : ''}`);
process.exit(failures.length ? 1 : 0);
