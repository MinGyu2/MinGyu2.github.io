/**
 * Global search palette controller.
 * - Untrusted strings (the query, indexed text) are only ever written with
 *   textContent / createTextNode; Pagefind excerpts are parsed in an inert
 *   document and only their text and <mark> elements are copied.
 * - Keyboard handling ignores keys while an IME composition is active, so
 *   Korean input is never committed or navigated away from mid-syllable.
 */
interface StaticItem {
  type: string;
  title: string;
  sub: string;
  url: string;
  keywords: string;
  recent?: boolean;
}
interface ResultItem {
  type: string;
  title: string;
  sub: string;
  url: string;
  excerpt?: string;
}
interface PagefindResult {
  data: () => Promise<{ url: string; excerpt: string; meta: Record<string, string> }>;
}
interface Pagefind {
  options: (o: Record<string, unknown>) => Promise<void>;
  init: () => Promise<void>;
  debouncedSearch: (q: string, o?: unknown, ms?: number) => Promise<{ results: PagefindResult[] } | null>;
}

const TYPE_TONE: Record<string, string> = {
  LOG: 't-cyan',
  PAGE: 't-muted',
  MODULE: 't-blue',
  SUBMODULE: 't-blue',
  SERIES: 't-mint',
  TAG: 't-amber',
  PROJECT: 't-amber',
  LAB: 't-mint',
};

export function initSearchPalette() {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const list = document.getElementById('search-results') as HTMLUListElement | null;
  const status = document.getElementById('search-status');
  const count = document.getElementById('search-count');
  if (!dialog || !input || !list || !status || !count) return;

  let staticItems: StaticItem[] | null = null;
  let pagefind: Pagefind | null = null;
  let pagefindFailed = false;
  let items: ResultItem[] = [];
  let selected = -1;
  let composing = false;
  let opener: HTMLElement | null = null;
  let seq = 0;

  async function loadStatic() {
    if (staticItems) return staticItems;
    try {
      const res = await fetch('/search-index.json');
      staticItems = res.ok ? ((await res.json()) as StaticItem[]) : [];
    } catch {
      staticItems = [];
    }
    return staticItems;
  }

  async function loadPagefind() {
    if (pagefind || pagefindFailed) return pagefind;
    try {
      const path = '/pagefind/pagefind.js';
      const mod = (await import(/* @vite-ignore */ path)) as Pagefind;
      await mod.options({ excerptLength: 22 });
      await mod.init();
      pagefind = mod;
    } catch {
      pagefindFailed = true;
    }
    return pagefind;
  }

  function open(query = '') {
    if (dialog!.open) return;
    opener = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = 'hidden';
    dialog!.showModal();
    input!.value = query;
    input!.focus();
    void update();
    void loadPagefind();
  }

  function close() {
    if (dialog!.open) dialog!.close();
  }

  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    seq++;
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  });
  dialog.addEventListener('cancel', (e) => {
    if (composing) e.preventDefault();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.querySelector('[data-search-close]')?.addEventListener('click', close);

  document.querySelectorAll<HTMLElement>('[data-search-open]').forEach((btn) =>
    btn.addEventListener('click', () => open(btn.dataset.searchQuery ?? '')),
  );
  document.addEventListener('arc:search-open', (e) => open((e as CustomEvent<string>).detail ?? ''));
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) close();
      else open();
    }
  });

  input.addEventListener('compositionstart', () => (composing = true));
  input.addEventListener('compositionend', () => {
    composing = false;
    void update();
  });
  input.addEventListener('input', () => void update());
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || composing || e.keyCode === 229) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      select((selected + delta + items.length) % items.length);
    } else if (e.key === 'Enter') {
      const target = items[selected] ?? items[0];
      if (target) {
        e.preventDefault();
        window.location.href = target.url;
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  function select(index: number) {
    selected = index;
    const options = list!.querySelectorAll<HTMLLIElement>('[role="option"]');
    options.forEach((el, i) => el.setAttribute('aria-selected', String(i === index)));
    const active = options[index];
    if (active) {
      input!.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else {
      input!.removeAttribute('aria-activedescendant');
    }
  }

  function matchStatic(all: StaticItem[], q: string): StaticItem[] {
    if (!q) {
      return [...all.filter((i) => ['PAGE', 'PROJECT', 'LAB'].includes(i.type) && !i.recent), ...all.filter((i) => i.recent)];
    }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all
      .filter((i) => i.type !== 'LOG')
      .filter((i) => {
        const hay = `${i.title} ${i.sub} ${i.keywords}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 8);
  }

  async function update() {
    const mine = ++seq;
    const q = input!.value.trim();
    const all = await loadStatic();
    if (mine !== seq) return;

    const quick = matchStatic(all, q).map((i) => ({ type: i.type, title: i.title, sub: i.sub, url: i.url }));
    let articles: ResultItem[] = [];
    let note = '';

    if (q) {
      const pf = await loadPagefind();
      if (mine !== seq) return;
      if (!pf) {
        note = '본문 검색 색인을 불러오지 못했습니다. (production build 후 사용 가능)';
      } else {
        const search = await pf.debouncedSearch(q, {}, 180);
        if (search === null || mine !== seq) return; // superseded by a newer query
        const data = await Promise.all(search.results.slice(0, 10).map((r) => r.data()));
        if (mine !== seq) return;
        articles = data.map((d) => ({
          type: d.meta.type || 'PAGE',
          title: d.meta.title || d.url,
          sub: d.meta.sub || '',
          url: d.url,
          excerpt: d.excerpt,
        }));
      }
    }
    render(quick, articles, q, note);
  }

  function appendExcerpt(target: HTMLElement, html: string) {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    doc.body.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) target.append(node.textContent ?? '');
      else if (node.nodeName === 'MARK') {
        const m = document.createElement('mark');
        m.textContent = node.textContent ?? '';
        target.append(m);
      } else target.append(node.textContent ?? '');
    });
  }

  function option(item: ResultItem, index: number) {
    const li = document.createElement('li');
    li.className = 'search-option';
    li.id = `search-opt-${index}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    const a = document.createElement('a');
    a.href = item.url;
    a.tabIndex = -1;
    const text = document.createElement('div');
    text.className = 'min-w-0';
    const title = document.createElement('div');
    title.className = 'text-sm font-medium t-heading truncate';
    title.textContent = item.title;
    text.append(title);
    if (item.sub) {
      const sub = document.createElement('div');
      sub.className = 'font-mono-code text-xs t-muted truncate mt-0.5';
      sub.textContent = item.sub;
      text.append(sub);
    }
    if (item.excerpt) {
      const ex = document.createElement('div');
      ex.className = 'text-[13px] t-body mt-1 line-clamp-2';
      appendExcerpt(ex, item.excerpt);
      text.append(ex);
    }
    const badge = document.createElement('span');
    badge.className = `shrink-0 font-mono-code text-[11px] px-2 py-0.5 rounded-sm border b-circuit ${TYPE_TONE[item.type] ?? 't-muted'}`;
    badge.textContent = item.type;
    a.append(text, badge);
    li.append(a);
    li.addEventListener('mousemove', () => {
      if (selected !== index) select(index);
    });
    return li;
  }

  function group(label: string) {
    const li = document.createElement('li');
    li.className = 'search-group';
    li.setAttribute('role', 'presentation');
    li.textContent = label;
    return li;
  }

  function render(quick: ResultItem[], articles: ResultItem[], q: string, note: string) {
    items = [...quick, ...articles];
    list!.replaceChildren();
    let i = 0;
    if (quick.length) {
      list!.append(group(q ? 'QUICK LINKS // 페이지 · 분류' : 'NAVIGATION // 바로가기 · 최근 글'));
      quick.forEach((it) => list!.append(option(it, i++)));
    }
    if (articles.length) {
      list!.append(group('FULL TEXT // 게시글 본문'));
      articles.forEach((it) => list!.append(option(it, i++)));
    }
    count!.textContent = `${items.length} RESULTS`;
    if (note) status!.textContent = note;
    else if (q && !items.length) status!.textContent = `"${q}"에 대한 검색 결과가 없습니다.`;
    else status!.textContent = '';
    select(items.length ? 0 : -1);
  }
}
