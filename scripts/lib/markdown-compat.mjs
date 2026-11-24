/**
 * kramdown → CommonMark compatibility transforms.
 *
 * The legacy site was rendered by kramdown (GFM input). Astro renders Markdown
 * with a CommonMark parser, which differs in a few places that change what
 * readers see. Each rule below reproduces the kramdown result with the smallest
 * possible source edit. Edits are located with the same parser Astro uses
 * (Sätteri), applied until a fixpoint, and returned as an audit log.
 *
 *  R1 html-inline-line     A line holding only `<br>` or `<img …>` opens a CommonMark HTML block that
 *                          swallows the following lines as raw HTML. kramdown treats these
 *                          tags as inline. → join with the next text line, or insert a blank
 *                          line when the next line starts a block construct.
 *  R2 script-trailing      `<script …></script>` at line start opens an HTML block that ends
 *                          on that line, so trailing Markdown stays raw. → move the trailing
 *                          content to its own line.
 *  R3 unclosed-script      kramdown re-serializes `<script src=…>` without `</script>` as a
 *                          closed element; raw passthrough would swallow the rest of the page.
 *                          → add the missing `</script>`.
 *  R4 ordered-list-break   kramdown starts an ordered list on a line like `2. text` directly
 *                          after a paragraph; CommonMark only allows `1.` to interrupt one.
 *                          → insert a blank line before it.
 *  R5 blockquote-lazy      kramdown continues a blockquote over following non-blank lines
 *                          (lists, fences, HTML) until a blank line; CommonMark only for
 *                          paragraph text. → prefix those lines with `> `.
 *  R6 autolink-scheme      `<jsp:include>` in prose is an HTML tag for kramdown (hidden) but a
 *                          URI autolink for CommonMark (a broken `jsp:` link). The author meant
 *                          the literal tag name → escape it so it is shown as text.
 */
import { markdownToMdast } from 'satteri';

const FENCE = /^(\s*)(`{3,}|~{3,})/;
const BLOCK_START = /^\s{0,3}([-*+]\s|\d+[.)]\s|#{1,6}(\s|$)|>|`{3,}|~{3,}|\||<|(\*\s*){3,}$|(-\s*){3,}$|(_\s*){3,}$)|^\s*$|^ {4,}|^\t/;

function walk(node, fn, parent = null, index = 0) {
  fn(node, parent, index);
  (node.children ?? []).forEach((c, i) => walk(c, fn, node, i));
}

/** Lines that are inside fenced code blocks (1-based line numbers). */
function fencedLines(lines) {
  const inside = new Set();
  let open = null;
  lines.forEach((line, i) => {
    const m = FENCE.exec(line.replace(/^(\s*>\s?)+/, ''));
    if (open) {
      inside.add(i + 1);
      if (m && m[2][0] === open[0] && m[2].length >= open.length && line.trim().replace(/^(>\s?)+/, '').trim() === m[2]) open = null;
    } else if (m) {
      open = m[2];
      inside.add(i + 1);
    }
  });
  return inside;
}

/** One pass: find the first applicable rule and return the edited lines, or null. */
function pass(lines, log) {
  const body = lines.join('\n');
  const tree = markdownToMdast(body);
  const fenced = fencedLines(lines);

  // R3: unclosed raw <script> (outside code fences and inline code)
  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i + 1)) continue;
    const visible = lines[i].replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));
    const re = /<script\b[^>]*>/gi;
    let m;
    while ((m = re.exec(visible))) {
      const after = visible.slice(m.index + m[0].length);
      if (!/^\s*<\/script>/i.test(after) && !/<\/script>/i.test(after)) {
        const at = m.index + m[0].length;
        lines[i] = lines[i].slice(0, at) + '</script>' + lines[i].slice(at);
        log.push({ kind: 'unclosed-script', line: i + 1, detail: m[0] });
        return lines;
      }
    }
  }

  // R6: autolinks with a non-web scheme that were HTML tags for kramdown (e.g. <jsp:include>)
  let autolink = null;
  walk(tree, (n) => {
    if (autolink || n.type !== 'link' || !n.position) return;
    const src = lines[n.position.start.line - 1];
    const m = /<([a-z][a-z0-9+.-]{1,31}):([^\s<>]*)>/i.exec(src);
    if (m && !/^(https?|mailto|ftp|tel)$/i.test(m[1]) && n.url === `${m[1]}:${m[2]}`) autolink = { line: n.position.start.line, text: m[0] };
  });
  if (autolink) {
    const i = autolink.line - 1;
    lines[i] = lines[i].replace(autolink.text, autolink.text.replace('<', '&lt;').replace('>', '&gt;'));
    log.push({ kind: 'autolink-scheme', line: autolink.line, detail: autolink.text });
    return lines;
  }

  let edit = null;
  walk(tree, (n, parent, idx) => {
    if (edit) return;
    const start = n.position?.start.line;

    // R1 / R2: block-level HTML nodes
    if (n.type === 'html' && parent && parent.type !== 'paragraph') {
      const firstLine = lines[start - 1];
      const tag = /^\s{0,3}<(br|img)\b[^<>]*>\s*$/i.exec(firstLine)?.[1]?.toLowerCase();
      if (tag && n.value.includes('\n')) {
        const next = lines[start];
        if (next !== undefined && !BLOCK_START.test(next)) {
          edit = () => {
            lines.splice(start - 1, 2, firstLine.trimEnd() + next.replace(/^\s+/, ''));
            log.push({ kind: 'html-inline-line', line: start, detail: `<${tag}> joined with following text line` });
          };
        } else {
          edit = () => {
            lines.splice(start, 0, '');
            log.push({ kind: 'html-inline-line', line: start, detail: `blank line inserted after <${tag}>` });
          };
        }
        return;
      }
      const sm = /^(\s{0,3}<script\b[^>]*>\s*<\/script>)(.*\S.*)$/i.exec(firstLine);
      if (sm) {
        edit = () => {
          lines.splice(start - 1, 1, sm[1], sm[2].replace(/^\s+/, ''));
          log.push({ kind: 'script-trailing', line: start, detail: 'trailing content moved to next line' });
        };
        return;
      }
    }

    // R4: paragraph hiding an ordered list line
    if (n.type === 'paragraph') {
      for (let l = start + 1; l <= n.position.end.line; l++) {
        if (/^\s{0,3}\d+[.)]\s+\S/.test(lines[l - 1]) && !fenced.has(l)) {
          edit = () => {
            lines.splice(l - 1, 0, '');
            log.push({ kind: 'ordered-list-break', line: l, detail: lines[l].trim().slice(0, 40) });
          };
          return;
        }
      }
    }

    // R5: blockquote lazily continued by the next block (no blank line in between)
    if (n.type === 'blockquote' && parent) {
      const next = parent.children[idx + 1];
      const end = n.position.end.line;
      if (next && next.position.start.line === end + 1 && lines[end] !== undefined && lines[end].trim() !== '') {
        const indent = /^(\s*)>/.exec(lines[start - 1])?.[1] ?? '';
        edit = () => {
          let l = end; // 0-based index of first lazy line
          let openFence = null;
          let count = 0;
          while (l < lines.length && (lines[l].trim() !== '' || openFence)) {
            const raw = lines[l];
            const content = raw.startsWith(indent) ? raw.slice(indent.length) : raw.replace(/^\s+/, '');
            const fm = FENCE.exec(content);
            if (fm) openFence = openFence ? (content.trim() === openFence ? null : openFence) : fm[2];
            lines[l] = content.trim() === '' ? `${indent}>` : `${indent}> ${content}`;
            l++;
            count++;
          }
          log.push({ kind: 'blockquote-lazy', line: end + 1, detail: `${count} line(s) prefixed with "> "` });
        };
      }
    }
  });
  if (edit) {
    edit();
    return lines;
  }
  return null;
}

export function kramdownCompat(body) {
  const log = [];
  let lines = body.split('\n');
  for (let i = 0; i < 500; i++) {
    const next = pass(lines, log);
    if (!next) return { body: lines.join('\n'), transforms: log };
    lines = next;
  }
  throw new Error('kramdownCompat did not reach a fixpoint');
}
