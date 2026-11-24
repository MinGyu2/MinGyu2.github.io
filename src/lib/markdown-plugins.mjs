/**
 * Sätteri hast plugins for post rendering.
 * Raw HTML images inside posts (e.g. pre-rendered mermaid.ink diagrams) are left
 * untouched by design: trusted Markdown HTML is passed through as authored.
 */
export const lazyImages = {
  name: 'arc-lab-lazy-images',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      if (node.properties?.loading == null) ctx.setProperty(node, 'loading', 'lazy');
      if (node.properties?.decoding == null) ctx.setProperty(node, 'decoding', 'async');
    },
  },
};
