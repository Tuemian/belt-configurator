// ---------------------------------------------------------------------------
// Cookie-Einwilligung (DSGVO) — Zustand liegt in localStorage, damit sowohl
// der Cookie-Banner als auch der Google-Analytics-Loader (siehe
// google-analytics.ts) unabhängig voneinander reagieren können, ohne dass
// die App neu geladen werden muss.
// ---------------------------------------------------------------------------

export type ConsentChoice = 'necessary' | 'all';

const STORAGE_KEY = 'novamotis-cookie-consent';

function readStored(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'necessary' || v === 'all' ? v : null;
  } catch {
    return null;
  }
}

let current: ConsentChoice | null = readStored();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getConsent(): ConsentChoice | null {
  return current;
}

export function setConsent(choice: ConsentChoice): void {
  current = choice;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // localStorage nicht verfügbar (z. B. privater Modus) — Wahl gilt nur für diese Sitzung.
  }
  notify();
}

/** Öffnet den Banner erneut, z. B. über den "Cookie-Einstellungen"-Link im Footer. */
export function resetConsent(): void {
  current = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // s. o.
  }
  notify();
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
