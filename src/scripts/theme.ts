/** Theme state shared by the header toggle and theme-aware widgets (e.g. comments). */
export type Theme = 'dark' | 'light';
export const THEME_STORAGE_KEY = 'arc_lab_theme';
export const THEME_EVENT = 'arc:themechange';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable (private mode): keep the in-page choice only */
    }
  }
  document.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

/** Follow OS theme changes only while the visitor has not chosen a theme. */
export function watchSystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (saved !== 'dark' && saved !== 'light') applyTheme(e.matches ? 'light' : 'dark', false);
  });
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
