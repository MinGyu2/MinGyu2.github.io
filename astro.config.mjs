// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { createCssVariablesTheme } from 'shiki';
import { lazyImages } from './src/lib/markdown-plugins.mjs';
import { codeBlockTransformer } from './src/lib/shiki-code-block.mjs';

// Shiki emits CSS variables; colors are defined per theme in src/styles/typography.css
// so code blocks follow the ARC LAB dark/light tokens without duplicating markup.
const arcTheme = createCssVariablesTheme({
  name: 'arc-lab',
  variablePrefix: '--shiki-',
  variableDefaults: {},
  fontStyle: true,
});

export default defineConfig({
  site: 'https://mingyu2.github.io',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    assets: '_astro',
  },
  markdown: {
    // Sätteri (Astro's native CommonMark + GFM pipeline). Raw HTML in posts is
    // trusted author content and is passed through; see MIGRATION.md.
    processor: satteri({ hastPlugins: [lazyImages] }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: arcTheme,
      // Languages used by legacy posts that Shiki does not bundle.
      langAlias: {
        jsp: 'html',
        Verify_Signature: 'text',
      },
      wrap: false,
      transformers: [codeBlockTransformer()],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: { enabled: false },
});
