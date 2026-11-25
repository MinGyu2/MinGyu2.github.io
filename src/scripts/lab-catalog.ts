/**
 * Experiment Lab catalog behaviour (no experiment code is loaded here).
 *
 * - Groups are native <details>; the user's open/closed choices persist in localStorage
 *   (stale IDs are dropped, storage failures are ignored). First visit: all collapsed.
 * - Search filters experiments by data-search, hides empty groups, temporarily opens the
 *   ancestor groups of matches and restores the user's own state when cleared. Search-driven
 *   expansion is never written to storage.
 * - ?q= pre-fills the search (used by command-palette links).
 */
const STORAGE_KEY = 'arc_lab_expanded_groups';

function loadSaved(valid: Set<string>): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && valid.has(x)) : []);
  } catch {
    return new Set();
  }
}

function save(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].sort()));
  } catch {
    /* storage unavailable (private mode, quota): keep the in-page state only */
  }
}

export function initLabCatalog() {
  const groups = Array.from(document.querySelectorAll<HTMLDetailsElement>('details[data-group]'));
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-exp-item]'));
  const input = document.getElementById('lab-search') as HTMLInputElement | null;
  const clearBtn = document.getElementById('lab-search-clear');
  const count = document.getElementById('lab-result-count');
  const noResults = document.getElementById('lab-no-results');
  const rootSection = document.querySelector<HTMLElement>('[data-lab-root-section]');
  const groupsSection = document.querySelector<HTMLElement>('[data-lab-tree]')?.closest('section') ?? null;

  const valid = new Set(groups.map((g) => g.dataset.group!));
  const expanded = loadSaved(valid);
  let searching = false;
  // State we last set programmatically. A (possibly coalesced, async) toggle event that leaves
  // the element in that state is ours; anything else is a user action.
  const expected = new WeakMap<HTMLDetailsElement, boolean>();

  const setOpen = (g: HTMLDetailsElement, open: boolean) => {
    if (g.open !== open) {
      expected.set(g, open);
      g.open = open;
    }
  };
  const restore = () => groups.forEach((g) => setOpen(g, expanded.has(g.dataset.group!)));

  groups.forEach((g) => {
    g.addEventListener('toggle', () => {
      const mine = expected.has(g) && expected.get(g) === g.open;
      expected.delete(g);
      if (mine) return;
      if (searching) return; // temporary exploration during search is not persisted
      if (g.open) expanded.add(g.dataset.group!);
      else expanded.delete(g.dataset.group!);
      save(expanded);
    });
  });
  restore();

  const total = items.length;
  function filter() {
    const q = (input?.value ?? '').trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    searching = terms.length > 0;
    if (clearBtn) clearBtn.hidden = !searching;

    let shown = 0;
    for (const li of items) {
      const hay = li.querySelector<HTMLElement>('[data-search]')?.dataset.search ?? '';
      const match = terms.every((t) => hay.includes(t));
      li.hidden = searching && !match;
      if (!li.hidden) shown++;
    }
    // Groups: visible if any descendant experiment is visible (or the group title matches).
    for (const g of [...groups].reverse()) {
      const li = g.closest<HTMLElement>('[data-group-item]')!;
      const titleMatch = searching && terms.every((t) => (g.dataset.groupTitle ?? '').includes(t) || (g.dataset.group ?? '').toLowerCase().includes(t));
      if (titleMatch) {
        // A matching group name reveals all of its experiments.
        g.querySelectorAll<HTMLElement>('[data-exp-item], [data-group-item]').forEach((x) => (x.hidden = false));
      }
      const hasVisible = !!g.querySelector('[data-exp-item]:not([hidden])');
      li.hidden = searching && !hasVisible && !titleMatch;
    }
    shown = items.filter((li) => !li.hidden && !li.closest('[data-group-item][hidden]')).length;

    if (searching) groups.forEach((g) => setOpen(g, !g.closest<HTMLElement>('[data-group-item]')!.hidden));
    else restore();

    if (rootSection) rootSection.hidden = searching && !rootSection.querySelector('[data-exp-item]:not([hidden])');
    if (groupsSection) groupsSection.hidden = searching && !groupsSection.querySelector('[data-group-item]:not([hidden])');
    if (noResults) noResults.hidden = !searching || shown > 0;
    if (count) count.textContent = searching ? `실험 ${total}개 중 ${shown}개 표시` : `실험 ${total}개`;
  }

  const clear = () => {
    if (!input) return;
    input.value = '';
    filter();
    input.focus();
  };
  input?.addEventListener('input', filter);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value && !e.isComposing) {
      e.preventDefault();
      clear();
    }
  });
  clearBtn?.addEventListener('click', clear);
  document.querySelectorAll('[data-lab-clear]').forEach((b) => b.addEventListener('click', clear));

  const initial = new URLSearchParams(location.search).get('q');
  if (input && initial) {
    input.value = initial;
    filter();
  }
}
