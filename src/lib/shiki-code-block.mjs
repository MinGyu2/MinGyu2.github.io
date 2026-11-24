/**
 * Shiki transformer: wraps each highlighted <pre> in an ARC LAB code panel
 * (language badge + copy button) at build time.
 *
 * The copy button is rendered `hidden` and revealed by the article script, so
 * pages without JavaScript never show a non-functional control. The copied text
 * is read from the <code> element, whose text content equals the original code.
 */
export function codeBlockTransformer() {
  return {
    name: 'arc-lab-code-block',
    pre(node) {
      const meta = this.options.meta?.__raw ?? '';
      if (/(^|\s)linenos(\s|$)/.test(meta)) {
        const cls = node.properties.class;
        node.properties.class = [cls, 'has-linenos'].filter(Boolean).join(' ');
      }
      node.properties.tabindex = '0';
    },
    root(root) {
      const lang = String(this.options.lang || 'text');
      const label = lang === 'text' || lang === 'plaintext' ? 'TEXT' : lang.toUpperCase();
      const pre = root.children.find((c) => c.type === 'element' && c.tagName === 'pre');
      if (!pre) return root;
      const figure = {
        type: 'element',
        tagName: 'figure',
        properties: { class: 'code-block', 'data-lang': lang },
        children: [
          {
            type: 'element',
            tagName: 'figcaption',
            properties: { class: 'code-head' },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { class: 'code-lang' },
                children: [
                  { type: 'element', tagName: 'span', properties: { class: 'code-dot', 'aria-hidden': 'true' }, children: [] },
                  { type: 'text', value: label },
                ],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: { type: 'button', class: 'code-copy', hidden: true, 'data-copy-code': '' },
                children: [{ type: 'text', value: '복사' }],
              },
            ],
          },
          pre,
        ],
      };
      root.children = root.children.map((c) => (c === pre ? figure : c));
      return root;
    },
  };
}
