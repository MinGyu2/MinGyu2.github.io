# Pretendard (vendored)

Korean text face for ARC LAB. Latin text stays on Inter; Pretendard is listed after
Inter in the font stacks (`src/styles/tokens.css`), so it only renders Hangul and other
characters Inter does not cover.

- Source: npm `pretendard@1.3.9` (official build by orioncactus),
  `dist/web/variable/pretendardvariable-dynamic-subset.css` and `woff2-dynamic-subset/`.
  Files are copied unchanged.
- License: SIL Open Font License 1.1 (`LICENSE.txt`).
- Loading: one variable font (weights 45–920) split into 92 `unicode-range` subsets with
  `font-display: swap`. Browsers download only the subsets that contain characters on the
  page (about 12–14 subsets, 0.3–0.45 MB, per page for the current posts; about 24 subsets
  across the whole site), and the hashed files are cached between pages.
- Why vendored: the npm package is a 72 MB tarball; vendoring the 3 MB web subset keeps
  `npm ci` small and adds no runtime dependency.
