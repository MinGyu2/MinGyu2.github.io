/**
 * Machine-readable Experiment Lab catalog (generated from the same build-time catalog as
 * /lab/). Used by scripts/verify-site.mjs to cross-check counts, links and search entries.
 */
import type { APIRoute } from 'astro';
import { getExperimentCatalog, type CatalogNode } from '../../lib/experiments';

const strip = (n: CatalogNode): unknown =>
  n.kind === 'group'
    ? { kind: n.kind, id: n.id, code: n.code, title: n.title, count: n.count, available: n.available, children: n.children.map(strip) }
    : { kind: n.kind, id: n.id, code: n.code, title: n.title, status: n.status, launchable: n.launchable, href: n.href ?? null, source: n.source };

export const GET: APIRoute = () => {
  const c = getExperimentCatalog();
  return new Response(JSON.stringify({ counts: c.counts, roots: c.roots.map(strip) }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
