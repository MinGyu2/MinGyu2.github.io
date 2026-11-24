let toastTimer: number | undefined;

export function showToast(message: string, tone: 'ok' | 'error' = 'ok') {
  const toast = document.getElementById('toast');
  const msg = toast?.querySelector('[data-toast-msg]');
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 2200);
}

/** Copy text; resolves to true only when the browser confirms the copy. */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the legacy path (e.g. permission denied) */
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  const active = document.activeElement as HTMLElement | null;
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  active?.focus();
  return ok;
}
