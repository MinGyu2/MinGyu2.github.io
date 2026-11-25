# ARC LAB — 기록하는 개발자

Personal engineering blog of MQ, published at <https://mingyu2.github.io/>.
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
| `npm run verify` | Runs `verify:site`, `verify:migration` and `test:experiments` (used by CI after the build) |
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
public/                 Static files (robots.txt, favicon, Google verification); experiments/ for standalone lab apps
scripts/                migrate-jekyll.mjs, lib/markdown-compat.mjs, verify-site.mjs, verify-migration.mjs, test-experiments.mjs
migration/              baseline.json (frozen migration commits), inventory.json (legacy ↔ migrated mapping),
                        legacy-urls.txt (pre-migration live sitemap), optional retired-urls.txt
```

## Experiment Lab

`/lab/` is a catalog and launcher: it never runs an experiment itself. Experiments open on their own
pages, so heavy runtimes (Three.js, WebGL, WASM, physics engines, large textures) load only when one is
launched. The catalog is built once at build time (`src/lib/experiments.ts`) and also feeds the
dashboard and the Ctrl/Cmd+K palette.

### Add a standalone experiment (no code changes)

```
public/experiments/physics/new-simulation/index.html
```

Rebuild (`npm run build`). The experiment appears in the **Physics** group, launches at
`/experiments/physics/new-simulation/`, and shows up in the command palette.

### Discovery rules

- A folder containing `index.html` **or** `experiment.json` is an **experiment**. Everything inside it
  (assets, nested folders, extra HTML pages) belongs to that experiment and is not scanned further.
- A folder that contains experiments below it is a **group**. Groups nest
  (`physics/mechanics/pendulum/` → Physics › Mechanics). Experiments with the same parent share one card.
- A folder directly under `public/experiments/` with an entry point is a **standalone** root card.
- Ignored: hidden (`.x`) and `_x` folders, empty folders, loose files, and resource folders
  (`assets`, `images`, `img`, `textures`, `fonts`, `shaders`, `scripts`, `js`, `css`, `wasm`, `media`,
  `audio`, `models`, `data`, `lib`, `vendor`, …; see `RESOURCE_DIRS` in `src/lib/experiment-discovery.ts`).
- IDs are folder paths (`web-security/xss`), so equal folder names in different groups never collide.
  Ordering: `order` (default 1000), then folder name.
- Use relative asset paths inside the experiment (`./assets/engine.js`). Files are served as-is from
  `public/experiments/` and not copied anywhere else.

### Optional metadata

`experiment.json` (all fields optional):

```json
{
  "title": "SQL Injection Simulator",
  "description": "교육용 웹 보안 시뮬레이션",
  "version": "1.0.0",
  "tags": ["Security", "JavaScript"],
  "status": "available",
  "entry": "index.html",
  "order": 10,
  "thumbnail": "assets/thumb.png",
  "requiresCrossOriginIsolation": false
}
```

Without it, the title comes from the folder name (`rigid-body` → "Rigid Body"), the entry is
`index.html`, and nothing else is invented. `entry` and `thumbnail` must be relative paths inside the
experiment folder (no URLs, absolute paths or `..`). Unknown fields, wrong types, unsafe paths and a
missing entry for an `available` experiment fail the build with the file name and the reason.

`group.json` in a group folder (optional): `title`, `description`, `order`, `icon`
(`folder`, `shield`, `atom`, `cube`, `flask`, `cpu`, `globe`, `terminal`).

### Status

| status | catalog | launch |
| --- | --- | --- |
| `available` (default when the entry exists) | AVAILABLE | LAUNCH (current tab) + 새 탭 (new tab) |
| `in-development` | IN DEVELOPMENT | none |
| `planned` (default when there is no entry) | PLANNED | none |

### Astro tools and planned ideas

Tools built as Astro pages (e.g. `src/pages/lab/payload-inspector/`) and ideas without files are
registered in `src/data/experiments.ts` with a catalog `path`. If a folder with the same path is added
later under `public/experiments/`, the folder wins and the entry keeps its registered code; there is
no duplicate. The old `/lab/#payload-inspector` link forwards to `/lab/payload-inspector/`.

### GitHub Pages limits

Plain WebAssembly works. Features that need cross-origin isolation (`SharedArrayBuffer`, WASM threads)
need COOP/COEP headers that GitHub Pages cannot send. Mark such experiments
`"requiresCrossOriginIsolation": true`; they are listed but not offered as launchable.

`npm run test:experiments` runs the discovery regression tests (also part of `npm run verify`).

## License

`LICENSE` is the MIT license carried over from the Minimal Mistakes theme repository this site was
originally based on. Blog post content is the author's own.
