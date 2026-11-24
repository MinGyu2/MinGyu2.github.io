/**
 * Article reader behaviour: reading progress (article content only), scroll spy,
 * code copy buttons and the mobile table of contents.
 */
import { copyText, showToast } from './copy';

const RING_C = 201.06;

export function initArticle() {
  const content = document.querySelector<HTMLElement>('[data-article-content]');
  const header = document.getElementById('site-header');
  if (!content) return;

  // Keep --header-h equal to the real sticky header height (scroll offsets, sticky TOC).
  const syncHeader = () => {
    if (header) document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  };
  syncHeader();
  if (header && 'ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);

  const bar = document.querySelector<HTMLElement>('[data-progress-bar]');
  const barWrap = bar?.parentElement;
  const ring = document.querySelector<SVGCircleElement>('[data-progress-ring]');
  const ringText = document.querySelector<SVGTextElement>('[data-progress-text]');
  const headings = Array.from(content.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id]'));
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  let lastPct = -1;
  let lastActive: string | null = null;
  let pending = false;

  function compute() {
    pending = false;
    const headerH = header?.offsetHeight ?? 0;
    const rect = content!.getBoundingClientRect();
    const viewH = window.innerHeight - headerH;
    const scrollable = rect.height - viewH;
    let pct: number;
    if (scrollable <= 0) {
      // Short article: complete once its end is on screen.
      pct = rect.bottom <= window.innerHeight ? 100 : 0;
    } else {
      pct = Math.round(Math.min(1, Math.max(0, (headerH - rect.top) / scrollable)) * 100);
    }
    if (pct !== lastPct) {
      lastPct = pct;
      if (bar) bar.style.transform = `scaleX(${pct / 100})`;
      barWrap?.setAttribute('aria-valuenow', String(pct));
      if (ring) ring.style.strokeDashoffset = (RING_C * (1 - pct / 100)).toFixed(2);
      if (ringText) ringText.textContent = `${pct}%`;
    }

    if (!headings.length || !links.length) return;
    const trigger = headerH + 32;
    let active = headings[0].id;
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= trigger) active = h.id;
      else break;
    }
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom && rect.bottom <= window.innerHeight) active = headings[headings.length - 1].id;
    if (active !== lastActive) {
      lastActive = active;
      for (const l of links) {
        if (l.dataset.tocLink === active) l.setAttribute('aria-current', 'location');
        else l.removeAttribute('aria-current');
      }
      const current = document.querySelector<HTMLElement>(`.toc-desktop [data-toc-link="${CSS.escape(active)}"]`);
      const list = current?.closest('ul');
      if (current && list && list.scrollHeight > list.clientHeight) {
        const top = current.offsetTop - list.offsetTop;
        if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 40) list.scrollTop = top - 40;
      }
    }
  }
  const schedule = () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(compute);
    }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // Images, gists and comments change the layout after load.
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(content);
  compute();

  // Mobile TOC closes after choosing a section.
  document.querySelectorAll<HTMLDetailsElement>('.toc-mobile').forEach((d) =>
    d.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) d.open = false;
    }),
  );

  // Code copy buttons (rendered hidden at build time).
  content.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach((btn) => {
    btn.hidden = false;
    btn.setAttribute('aria-label', '코드 복사');
    btn.addEventListener('click', async () => {
      const code = btn.closest('figure')?.querySelector('pre code');
      const ok = await copyText(code?.textContent ?? '');
      btn.dataset.state = ok ? 'done' : 'error';
      btn.textContent = ok ? '복사됨' : '실패';
      showToast(ok ? '코드가 복사되었습니다' : '복사에 실패했습니다', ok ? 'ok' : 'error');
      window.setTimeout(() => {
        btn.textContent = '복사';
        delete btn.dataset.state;
      }, 1800);
    });
  });
}
