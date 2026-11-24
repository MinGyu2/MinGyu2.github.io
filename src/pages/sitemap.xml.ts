/** Sitemap at the legacy location referenced by robots.txt (/sitemap.xml). */
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { SITE, absoluteUrl } from '../lib/site';

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const pages = ['/', '/posts/', '/categories/', '/tags/', '/projects/', '/lab/', '/lab/payload-inspector/', '/about/'];
  const legacyPages = Array.from({ length: Math.ceil(posts.length / SITE.legacyPageSize) - 1 }, (_, i) => `/page${i + 2}/`);
  const lastmod = (p: (typeof posts)[number]) => {
    const m = p.data.last_modified_at ? new Date(p.data.last_modified_at) : undefined;
    return (m && !Number.isNaN(m.getTime()) ? m : p.data.date).toISOString();
  };
  const urls = [
    ...posts.map((p) => `<url><loc>${absoluteUrl(p.data.legacyPath)}</loc><lastmod>${lastmod(p)}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`),
    ...pages.map((p) => `<url><loc>${absoluteUrl(p)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`),
    ...legacyPages.map((p) => `<url><loc>${absoluteUrl(p)}</loc><changefreq>weekly</changefreq><priority>0.3</priority></url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
