// ---------------------------------------------------------------------------
// Google Analytics (GA4) — wird ausschließlich nach Einwilligung geladen (s.
// cookie-consent.ts). Die Measurement-ID kommt aus VITE_GA_MEASUREMENT_ID oder
// (Standard) aus dem Backend-Secret GOOGLE_ANALYTICS_MEASUREMENT_ID.
// ---------------------------------------------------------------------------
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

async function resolveId(): Promise<string | null> {
  const envId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (envId) return envId;
  try {
    const { data } = await supabase.functions.invoke('ga-config', { method: 'GET' });
    return (data as { measurementId?: string | null })?.measurementId ?? null;
  } catch {
    return null;
  }
}

export async function loadGoogleAnalytics(): Promise<void> {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  const id = await resolveId();
  if (!id) { loaded = false; return; }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
}

export function trackPageView(path: string): void {
  window.gtag?.('event', 'page_view', { page_path: path });
}
