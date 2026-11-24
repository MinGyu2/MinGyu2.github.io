/**
 * Dev Logs archive filters. All posts are static HTML; this only hides items.
 *
 * URL state (shareable): ?module=&submodule=&tag=&q=  plus  ?series=  and the legacy ?category=.
 * - Changing the primary module clears an incompatible submodule.
 * - ?submodule= alone implies its module (submodule IDs are globally unique).
 * - Links from other pages carry only their own filter, so an old keyword never leaks
 *   into a new view, while combinations chosen here are kept.
 */
const PAGE_SIZE = 20;

export function initArchive() {
  const list = document.getElementById('log-list');
  const q = document.getElementById('log-filter-q') as HTMLInputElement | null;
  const tagSelect = document.getElementById('log-filter-tag') as HTMLSelectElement | null;
  const count = document.getElementById('log-filter-count');
  const empty = document.getElementById('log-empty');
  const more = document.getElementById('log-more') as HTMLButtonElement | null;
  const fulltext = document.getElementById('log-fulltext');
  const subGroup = document.getElementById('log-sub-group');
  const extra = document.getElementById('log-extra-chips');
  const moduleChips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter-module]'));
  const subChips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter-submodule]'));
  const items = Array.from(document.querySelectorAll<HTMLLIElement>('[data-log-item]'));
  if (!list || !q || !tagSelect) return;

  const labels = JSON.parse(document.getElementById('log-filter-labels')?.textContent || '{}') as {
    category?: Record<string, string>;
    series?: Record<string, string>;
  };
  const validModules = new Set(moduleChips.map((c) => c.dataset.filterModule ?? ''));
  const subToModule = new Map(subChips.map((c) => [c.dataset.filterSubmodule ?? '', c.dataset.module ?? '']));
  const validTags = new Set(Array.from(tagSelect.options).map((o) => o.value));

  const params = new URLSearchParams(location.search);
  const pick = (v: string | null, ok: (x: string) => boolean) => (v && ok(v) ? v : '');
  const state = {
    module: pick(params.get('module'), (v) => validModules.has(v)),
    submodule: pick(params.get('submodule'), (v) => subToModule.has(v)),
    tag: pick(params.get('tag'), (v) => validTags.has(v)),
    category: pick(params.get('category'), (v) => !!labels.category?.[v]),
    series: pick(params.get('series'), (v) => !!labels.series?.[v]),
    q: params.get('q') ?? '',
    limit: PAGE_SIZE,
  };
  if (state.submodule) {
    const owner = subToModule.get(state.submodule)!;
    if (!state.module) state.module = owner;
    else if (state.module !== owner) state.submodule = '';
  }
  q.value = state.q;
  tagSelect.value = state.tag;

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.module) p.set('module', state.module);
    if (state.submodule) p.set('submodule', state.submodule);
    if (state.tag) p.set('tag', state.tag);
    if (state.series) p.set('series', state.series);
    if (state.category) p.set('category', state.category);
    if (state.q.trim()) p.set('q', state.q.trim());
    const qs = p.toString();
    history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
  }

  function renderExtraChips() {
    if (!extra) return;
    extra.replaceChildren();
    const add = (prefix: string, text: string, clear: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-chip legacy';
      b.textContent = `${prefix}: ${text} ×`;
      b.setAttribute('aria-label', `${prefix} 필터 해제: ${text}`);
      b.addEventListener('click', () => {
        clear();
        state.limit = PAGE_SIZE;
        apply();
      });
      extra.append(b);
    };
    if (state.series) add('SERIES', labels.series?.[state.series] ?? state.series, () => (state.series = ''));
    if (state.category) add('LEGACY CATEGORY', labels.category?.[state.category] ?? state.category, () => (state.category = ''));
  }

  function apply() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let matched = 0;
    let shown = 0;
    for (const li of items) {
      const d = li.dataset;
      const ok =
        (!state.module || d.module === state.module) &&
        (!state.submodule || d.submodule === state.submodule) &&
        (!state.series || d.series === state.series) &&
        (!state.category || (d.categories ?? '').split(' ').includes(state.category)) &&
        (!state.tag || (d.tags ?? '').split(' ').includes(state.tag)) &&
        terms.every((t) => (d.search ?? '').includes(t));
      if (ok) matched++;
      const visible = ok && shown < state.limit;
      if (visible) shown++;
      li.hidden = !visible;
      // A series reads best in series order (1 → N); otherwise newest first.
      li.style.order = state.series && d.seriesOrder ? d.seriesOrder : '';
    }
    moduleChips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.filterModule ?? '') === state.module)));
    let anySub = false;
    subChips.forEach((c) => {
      const inModule = !!state.module && c.dataset.module === state.module;
      c.hidden = !inModule;
      anySub ||= inModule;
      c.setAttribute('aria-pressed', String(c.dataset.filterSubmodule === state.submodule));
    });
    if (subGroup) subGroup.hidden = !anySub;
    renderExtraChips();
    if (count) count.textContent = `${matched} / ${items.length} LOGS`;
    if (empty) empty.hidden = matched > 0;
    list!.hidden = matched === 0;
    if (more) {
      const rest = matched - shown;
      more.hidden = rest <= 0;
      more.textContent = `더 보기 (${rest}개 남음)`;
    }
    syncUrl();
  }

  moduleChips.forEach((c) =>
    c.addEventListener('click', () => {
      const next = c.dataset.filterModule ?? '';
      if (next !== state.module) state.submodule = ''; // clear incompatible submodule
      state.module = next;
      state.limit = PAGE_SIZE;
      apply();
    }),
  );
  subChips.forEach((c) =>
    c.addEventListener('click', () => {
      const id = c.dataset.filterSubmodule ?? '';
      state.submodule = state.submodule === id ? '' : id; // toggle
      state.limit = PAGE_SIZE;
      apply();
    }),
  );
  tagSelect.addEventListener('change', () => {
    state.tag = tagSelect.value;
    state.limit = PAGE_SIZE;
    apply();
  });
  q.addEventListener('input', () => {
    state.q = q.value;
    state.limit = PAGE_SIZE;
    apply();
  });
  document.querySelectorAll('[data-filter-reset]').forEach((b) =>
    b.addEventListener('click', () => {
      Object.assign(state, { module: '', submodule: '', tag: '', category: '', series: '', q: '', limit: PAGE_SIZE });
      q.value = '';
      tagSelect.value = '';
      apply();
      q.focus();
    }),
  );
  more?.addEventListener('click', () => {
    const before = items.filter((li) => !li.hidden).length;
    state.limit += PAGE_SIZE;
    apply();
    // Move focus to the first newly revealed post for keyboard users.
    items.filter((li) => !li.hidden)[before]?.querySelector<HTMLAnchorElement>('a')?.focus();
  });
  fulltext?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('arc:search-open', { detail: state.q }));
  });

  apply();
}
