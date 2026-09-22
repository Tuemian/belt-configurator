// ---------------------------------------------------------------------------
// Google Analytics (GA4) — wird ausschließlich nach Einwilligung geladen (s.
// cookie-consent.ts). Ohne VITE_GA_MEASUREMENT_ID passiert nichts (kein
// Tracking im Dev-Betrieb / solange keine echte Property hinterlegt ist).
// ---------------------------------------------------------------------------

const GA_MEASUREMENT_ID: string | undefined = import.meta.env.VITE_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

let loaded = false;

export function loadGoogleAnalytics(): void {
  if (loaded || !GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => window.dataLayer!.push(args);
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
