// ---------------------------------------------------------------------------
// Cookie-Einwilligung (DSGVO) mit Google Consent Mode v2.
// Entscheidung liegt im Cookie "nm_consent" (domain=.novamotis.com), damit sie
// für alle novamotis.com-Subdomains gilt. gtag.js wird in index.html immer
// geladen; hier wird nur der Consent-Status aktualisiert.
// ---------------------------------------------------------------------------

export type ConsentChoice = 'necessary' | 'all';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const COOKIE = 'nm_consent';
let marketing = false;

function readStored(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)nm_consent=([^;]*)/);
  if (!m) return null;
  try {
    const v = JSON.parse(decodeURIComponent(m[1]));
    marketing = !!(v && v.m);
    return v && v.a ? 'all' : 'necessary';
  } catch {
    return null;
  }
}

function writeCookie(value: string, maxAge: number) {
  const base = `${COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
  if (location.hostname.endsWith('novamotis.com')) {
    document.cookie = `${base}; domain=.novamotis.com${location.protocol === 'https:' ? '; Secure' : ''}`;
  } else {
    document.cookie = base; // Vorschau / localhost
  }
}

let current: ConsentChoice | null = readStored();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getConsent(): ConsentChoice | null {
  return current;
}

function applyConsent(a: boolean, m: boolean) {
  window.gtag?.('consent', 'update', {
    analytics_storage: a ? 'granted' : 'denied',
    ad_storage: m ? 'granted' : 'denied',
    ad_user_data: m ? 'granted' : 'denied',
    ad_personalization: m ? 'granted' : 'denied',
  });
}

/** 'all' = Statistik + Marketing, 'necessary' = nichts. Optional feingranular. */
export function setConsent(choice: ConsentChoice, opts?: { analytics: boolean; marketing: boolean }): void {
  const a = opts ? opts.analytics : choice === 'all';
  const m = opts ? opts.marketing : choice === 'all';
  current = a ? 'all' : 'necessary';
  marketing = m;
  writeCookie(encodeURIComponent(JSON.stringify({ a, m })), 31536000);
  applyConsent(a, m);
  notify();
}

/** Öffnet den Banner erneut, z. B. über den "Cookie-Einstellungen"-Link im Footer. */
export function resetConsent(): void {
  current = null;
  writeCookie('', 0);
  marketing = false;
  applyConsent(false, false);
  notify();
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
