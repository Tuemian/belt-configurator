// GA4-Event-Tracking. gtag wird in index.html (Consent Mode v2) eingebunden —
// hier nur Events senden. Keine personenbezogenen Daten (Name, E-Mail, Telefon, Firma)!

type GtagFn = (command: 'event', name: string, params?: Record<string, unknown>) => void;

export type ConfiguratorId = 'belt_conveyor' | 'profile_cut' | 'deflection';

const CONFIGURATOR_NAMES: Record<ConfiguratorId, string> = {
  belt_conveyor: 'Fördertechnik',
  profile_cut: 'Profilzuschnitte',
  deflection: 'Durchbiegungsrechner',
};

export const CURRENCY = 'EUR';

export function track(name: string, params?: Record<string, unknown>): void {
  try {
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (typeof gtag === 'function') gtag('event', name, params);
  } catch {
    /* niemals Fehler werfen */
  }
}

export function configuratorParams(id: ConfiguratorId) {
  return { configurator_id: id, configurator_name: CONFIGURATOR_NAMES[id] };
}

export function trackConfigurator(id: ConfiguratorId, name: string, params?: Record<string, unknown>) {
  track(name, { ...configuratorParams(id), ...params });
}

export const shortSummary = (text: string) => text.slice(0, 100);

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category: 'Konfiguration';
  item_variant: string;
  price: number;
  quantity: number;
}

/** generate_lead nur einmal pro request_id (sessionStorage). */
export function trackLead(id: ConfiguratorId, requestId: string, value: number, items: AnalyticsItem[]) {
  const key = `ga_lead_${requestId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
  trackConfigurator(id, 'generate_lead', {
    currency: CURRENCY,
    value,
    lead_source: 'configurator',
    request_id: requestId,
    items,
  });
}

/** Globaler Listener für tel:/mailto:-Klicks. */
let contactInstalled = false;
export function installContactClickTracking() {
  if (contactInstalled || typeof document === 'undefined') return;
  contactInstalled = true;
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href')?.toLowerCase() ?? '';
      if (href.startsWith('tel:')) track('contact_click', { method: 'phone' });
      else if (href.startsWith('mailto:')) track('contact_click', { method: 'email' });
    },
    true,
  );
}
