/**
 * Payload Inspector — pure string → encoding transforms. Output is written with
 * textContent only. Malformed UTF-16 (lone surrogates) is reported and replaced
 * with U+FFFD, matching what TextEncoder does, so every output describes the
 * same byte sequence.
 */
import { copyText, showToast } from './copy';

const PRESETS: Record<string, string> = {
  sqli: "' UNION SELECT 1, username, role FROM users -- ",
  jwt: '{"alg":"HS256","typ":"JWT"}',
  utf8: 'ARC LAB 한글 인코딩 테스트 🚀',
  combining: 'é · 한 · 👩‍💻 · 🇰🇷',
};

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function toWellFormed(s: string): { text: string; replaced: number } {
  let replaced = 0;
  const text = s.replace(LONE_SURROGATE, () => {
    replaced++;
    return '�';
  });
  return { text, replaced };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function bytesToHex(bytes: Uint8Array): string {
  const out = new Array<string>(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i].toString(16).padStart(2, '0');
  return out.join(' ');
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function analyze(input: string) {
  const { text, replaced } = toWellFormed(input);
  const bytes = new TextEncoder().encode(text);
  let codePoints = 0;
  for (const _ of text) codePoints++;
  let graphemes: number | null = null;
  if (segmenter) {
    graphemes = 0;
    for (const _ of segmenter.segment(text)) graphemes++;
  }
  return {
    replaced,
    bytes,
    codePoints,
    graphemes,
    base64: bytes.length ? bytesToBase64(bytes) : '',
    url: text ? encodeURIComponent(text) : '',
    hex: bytesToHex(bytes),
  };
}

export function initPayloadInspector() {
  const root = document.querySelector<HTMLElement>('[data-payload-inspector]');
  if (!root) return;
  const input = root.querySelector<HTMLTextAreaElement>('#pi-input')!;
  const max = Number(root.dataset.max) || 16384;
  const el = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const outs: Record<string, HTMLElement> = { b64: el('pi-b64'), url: el('pi-url'), hex: el('pi-hex') };
  const copyBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pi-copy]'));
  let frame = 0;

  function render() {
    frame = 0;
    const r = analyze(input.value);
    el('pi-bytes').textContent = `${r.bytes.length} B`;
    el('pi-codepoints').textContent = String(r.codePoints);
    el('pi-graphemes').textContent = r.graphemes === null ? 'N/A' : String(r.graphemes);
    el('pi-limit').textContent = `${input.value.length} / ${max} UTF-16 units`;
    el('pi-warning').textContent = r.replaced
      ? `잘못된 유니코드(짝 없는 서로게이트) ${r.replaced}개를 U+FFFD로 대체해 인코딩했습니다`
      : input.value.length >= max
        ? '최대 입력 길이에 도달했습니다'
        : '';
    const values: Record<string, string> = { b64: r.base64, url: r.url, hex: r.hex };
    for (const [k, node] of Object.entries(outs)) {
      node.textContent = values[k];
      node.dataset.empty = String(values[k] === '');
    }
    copyBtns.forEach((b) => (b.disabled = values[b.dataset.piCopy ?? ''] === ''));
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  input.addEventListener('input', schedule);
  root.querySelectorAll<HTMLButtonElement>('[data-pi-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = PRESETS[b.dataset.piPreset ?? ''] ?? '';
      render();
      input.focus();
    }),
  );
  root.querySelector('[data-pi-clear]')?.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
    showToast('입력값이 초기화되었습니다');
  });
  copyBtns.forEach((b) =>
    b.addEventListener('click', async () => {
      const node = outs[b.dataset.piCopy ?? ''];
      const value = node?.dataset.empty === 'true' ? '' : (node?.textContent ?? '');
      if (!value) {
        showToast('복사할 결과가 없습니다', 'error');
        return;
      }
      const ok = await copyText(value);
      showToast(ok ? '변환 결과가 복사되었습니다' : '복사에 실패했습니다', ok ? 'ok' : 'error');
    }),
  );
  render();
}
