# ARC LAB — 기록하는 개발자

Personal engineering blog of Jung MinGyu (MinQ), published at <https://mingyu2.github.io/>.
A static [Astro](https://astro.build) site with the ARC LAB workstation design (dark "Deep Space" / light "Mist Paper").

The site was migrated from Jekyll + Minimal Mistakes; see [MIGRATION.md](MIGRATION.md) for the
audit, URL-compatibility rules, deployment and rollback procedure.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install exact dependency versions from `package-lock.json` (Node ≥ 22.23, see `.nvmrc`) |
| `npm run dev` | Dev server at <http://localhost:4321> (full-text search needs a production build) |
| `npm run build` | Static build to `dist/` and Pagefind search index (`dist/pagefind/`) |
| `npm run preview` | Serve the production build locally |
| `npm run check` | `astro check` (TypeScript + template diagnostics) |
| `npm run verify` | Post-build migration checks: content integrity, legacy URLs, feed/sitemap, counts |
| `npm run migrate` | Re-run the Jekyll → Astro content migration (`--check` to verify only) |

## Writing a post

Create `src/content/posts/<any-folder>/YYYY-MM-DD-<slug>.md`:

```markdown
---
title: "제목"
excerpt: "목록에 보일 요약 (선택)"
categories:
  - ubuntu
tags:
  - docker
---

본문 (CommonMark + GFM). 코드 블록은 빌드 시 Shiki로 하이라이트됩니다.
```

- The URL follows the legacy rule `/:categories/:slug/` (categories lowercased), e.g. `/ubuntu/<slug>/`.
  Set `legacyPath: "/custom/path/"` to choose a URL explicitly. Migrated posts already record theirs.
- `date` defaults to the file-name date. `last_modified_at` is shown as the update date when later.
- Raw HTML is passed through as authored (trusted content), e.g. GitHub Gist `<script>` embeds.

## Project structure

```
src/
  content/posts/        Markdown posts (migrated 1:1 from _posts/, same folder and file names)
  content.config.ts     Content collection schema
  pages/                Routes: index, posts/, page[num] (legacy pagination), categories/, tags/,
                        projects/, lab/, about/, [...slug] (articles at legacy URLs),
                        feed.xml, sitemap.xml, search-index.json, 404
  layouts/              BaseLayout (head, header, footer, search), ArticleLayout (reader)
  components/           hud/ navigation/ blog/ projects/ lab/
  scripts/              Small client modules (theme, search palette, archive filters, reader, lab)
  styles/               tokens.css (theme tokens), global/hud/typography/animations.css
  data/                 projects.ts, experiments.ts, taxonomy.ts
  lib/                  posts.ts (collection, ordering, taxonomy), site.ts, Shiki/Markdown plugins
public/                 Static files (robots.txt, favicon, Google verification, experiments/)
scripts/                migrate-jekyll.mjs, lib/markdown-compat.mjs, verify-site.mjs
migration/              inventory.json (legacy ↔ migrated mapping), legacy-urls.txt (live sitemap snapshot)
```

## Experiment Lab

Experiments are listed in `src/data/experiments.ts`.

- **Astro modules** (e.g. Payload Inspector) are components with page-scoped scripts.
- **Standalone apps** (HTML, Canvas, WebGL, WebAssembly, games) go in
  `public/experiments/<id>/index.html` with their assets beside them, so relative paths keep working.
  Register them with `kind: 'standalone'`, `status: 'available'`, `href: '/experiments/<id>/'`.
  Heavy runtimes load only on that page, never on blog pages.
- Plain WebAssembly works on GitHub Pages. Features that need cross-origin isolation
  (`SharedArrayBuffer`, WASM threads) require COOP/COEP headers that GitHub Pages cannot send. Mark such
  entries `requiresCrossOriginIsolation: true` and do not list them as available.
- Use `status: 'planned'` for ideas. These render as non-interactive cards and never as launchers.

## License

`LICENSE` is the MIT license carried over from the Minimal Mistakes theme repository this site was
originally based on. Blog post content is the author's own.
