/**
 * Atom feed at the legacy jekyll-feed location (/feed.xml): latest 10 posts with
 * full HTML content. Entry ids keep the jekyll-feed format (absolute post URL
 * without the trailing slash) so feed readers do not see duplicates.
 */
import type { APIRoute } from 'astro';
import { displayTitle, excerptOf, getPosts } from '../lib/posts';
import { SITE, absoluteUrl } from '../lib/site';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

function modified(p: Awaited<ReturnType<typeof getPosts>>[number]): Date {
  const m = p.data.last_modified_at ? new Date(p.data.last_modified_at) : undefined;
  return m && !Number.isNaN(m.getTime()) ? m : p.data.date;
}

export const GET: APIRoute = async () => {
  const posts = (await getPosts()).slice(0, SITE.feedEntries);
  const updated = posts.reduce((d, p) => (modified(p) > d ? modified(p) : d), posts[0]?.data.date ?? new Date(0));
  const entries = posts
    .map((p) => {
      const url = absoluteUrl(p.data.legacyPath);
      const cats = [...p.data.categories, ...p.data.tags].map((c) => `<category term="${esc(c)}" />`).join('');
      return `<entry><title type="html">${esc(displayTitle(p))}</title><link href="${esc(url)}" rel="alternate" type="text/html" title="${esc(displayTitle(p))}" /><published>${p.data.date.toISOString()}</published><updated>${modified(p).toISOString()}</updated><id>${esc(url.replace(/\/$/, ''))}</id><content type="html" xml:base="${esc(url)}">${cdata(p.rendered?.html ?? '')}</content><author><name>${esc(SITE.author.name)}</name></author>${cats}<summary type="html">${cdata(excerptOf(p, 300))}</summary></entry>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><generator uri="https://astro.build/">Astro</generator><link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/atom+xml" /><link href="${absoluteUrl('/')}" rel="alternate" type="text/html" /><updated>${updated.toISOString()}</updated><id>${absoluteUrl('/feed.xml')}</id><title type="html">${esc(SITE.title)}</title><subtitle>${esc(SITE.description)}</subtitle><author><name>${esc(SITE.author.name)}</name></author>${entries}</feed>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
};
