/**
 * Dev Logs archive filters. All posts are static HTML; this only hides items.
 * Filter state lives in the URL (?category=&tag=&q=) so filtered views can be
 * shared. Links from other pages carry only their own filter, so an old keyword
 * never leaks into a new category/tag view, while combinations chosen here are kept.
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
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter-category]'));
  const items = Array.from(document.querySelectorAll<HTMLLIElement>('[data-log-item]'));
  if (!list || !q || !tagSelect) return;

  const validCategories = new Set(chips.map((c) => c.dataset.filterCategory ?? ''));
  const validTags = new Set(Array.from(tagSelect.options).map((o) => o.value));
  const params = new URLSearchParams(location.search);
  const state = {
    category: validCategories.has(params.get('category') ?? '') ? (params.get('category') ?? '') : '',
    tag: validTags.has(params.get('tag') ?? '') ? (params.get('tag') ?? '') : '',
    q: params.get('q') ?? '',
    limit: PAGE_SIZE,
  };
  q.value = state.q;
  tagSelect.value = state.tag;

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.category) p.set('category', state.category);
    if (state.tag) p.set('tag', state.tag);
    if (state.q.trim()) p.set('q', state.q.trim());
    const qs = p.toString();
    history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
  }

  function apply() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let matched = 0;
    let shown = 0;
    for (const li of items) {
      const cats = (li.dataset.categories ?? '').split(' ');
      const tags = (li.dataset.tags ?? '').split(' ');
      const hay = li.dataset.search ?? '';
      const ok =
        (!state.category || cats.includes(state.category)) &&
        (!state.tag || tags.includes(state.tag)) &&
        terms.every((t) => hay.includes(t));
      if (ok) matched++;
      const visible = ok && shown < state.limit;
      if (visible) shown++;
      li.hidden = !visible;
    }
    chips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.filterCategory ?? '') === state.category)));
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

  chips.forEach((c) =>
    c.addEventListener('click', () => {
      state.category = c.dataset.filterCategory ?? '';
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
      state.category = '';
      state.tag = '';
      state.q = '';
      state.limit = PAGE_SIZE;
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
