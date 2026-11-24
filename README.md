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
| `npm run verify` | Runs `verify:site` then `verify:migration` (used by CI after the build) |
| `npm run verify:site` | Current content + built site: taxonomy, historical URLs, pages, comments mapping, feed/sitemap, links, module statistics |
| `npm run verify:migration` | Frozen Jekyll → Astro baseline (Git commits in `migration/baseline.json`); never blocks later edits |
| `npm run migrate -- --check` | Re-run the migration in memory and compare with the baseline migration commit |

## Writing a post

Create `src/content/posts/<any-folder>/YYYY-MM-DD-<slug>.md`:

```markdown
---
title: "제목"
excerpt: "목록에 보일 요약 (선택)"
module: infrastructure        # required — primary knowledge module
submodule: containers         # required — must belong to the module
tags:
  - docker
# series:                     # optional — only for posts in a defined series
#   id: web-server-lab
#   order: 20
---

본문 (CommonMark + GFM). 코드 블록은 빌드 시 Shiki로 하이라이트됩니다.
```

- **Classification** (`module`, `submodule`, `series`) is defined in `src/data/taxonomy.ts`. The build fails
  with a message listing the valid IDs if a value is missing or does not belong to its module.

  | module | submodules |
  | --- | --- |
  | `security` | `web-security`, `wargame`, `security-lab`, `system-security`, `network-security` |
  | `infrastructure` | `linux`, `windows-wsl`, `containers`, `virtualization`, `networking`, `system-administration` |
  | `development` | `web-backend`, `desktop-apps`, `developer-tools`, `programming-languages` |
  | `ai` | `llm-agents`, `local-ai`, `gpu-npu`, `machine-learning` |
  | `computer-science` | `algorithms`, `computer-architecture`, `operating-systems`, `math-theory` |
  | `notes` | `blog`, `learning-notes`, `retrospectives`, `technical-documentation` |

  Choose by the article's main purpose, not by keywords it mentions. Empty modules stay hidden until
  they have a post. To add a submodule or a series, edit only `taxonomy.ts` (series also need a title
  and description there; `series.order` must be unique within the series).
- **Tags** are free-form technical keywords, independent of the module.
- **`categories`** is historical metadata from the Jekyll site. It is not needed for new posts, but if
  present it still feeds the URL rule below.
- **URL**: `/:categories/:slug/` (categories lowercased; no categories → `/:slug/`), e.g. `/<slug>/`.
  Set `legacyPath: "/custom/path/"` to choose a URL explicitly. The module never affects URLs.
  Migrated posts already record their historical `legacyPath` — do not change it (`verify:site` fails).
- `date` defaults to the file-name date. `last_modified_at` is shown as the update date when later.
- Raw HTML is passed through as authored (trusted content), e.g. GitHub Gist `<script>` embeds.

## Project structure

```
src/
  content/posts/        Markdown posts (migrated 1:1 from _posts/, same folder and file names)
  content.config.ts     Content collection schema
  pages/                Routes: index, posts/, page[num] (legacy pagination), categories/ (Knowledge Modules), tags/,
                        projects/, lab/, about/, [...slug] (articles at legacy URLs),
                        feed.xml, sitemap.xml, search-index.json, 404
  layouts/              BaseLayout (head, header, footer, search), ArticleLayout (reader)
  components/           hud/ navigation/ blog/ projects/ lab/
  scripts/              Small client modules (theme, search palette, archive filters, reader, lab)
  styles/               tokens.css (theme tokens), global/hud/typography/animations.css
  data/                 taxonomy.ts (modules, submodules, series), projects.ts, experiments.ts
  lib/                  posts.ts (collection, ordering, taxonomy), site.ts, Shiki/Markdown plugins
public/                 Static files (robots.txt, favicon, Google verification, experiments/)
scripts/                migrate-jekyll.mjs, lib/markdown-compat.mjs, verify-site.mjs, verify-migration.mjs
migration/              baseline.json (frozen migration commits), inventory.json (legacy ↔ migrated mapping),
                        legacy-urls.txt (pre-migration live sitemap), optional retired-urls.txt
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
