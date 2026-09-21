import { useEffect, useState } from 'react';
import { PROFILE_SECTIONS, PROFILE_SIZES, type ProfileSection } from '@/lib/profile-configurator-types';

// ---------------------------------------------------------------------------
// Preisliste des NOVAMOTIS-Webshops
// ---------------------------------------------------------------------------
//
// Der Zuschnittkonfigurator führt keine eigenen Profilpreise, sondern liest die
// Preisliste des Webshops (shop.novamotis.com/api/preisliste, gespeist aus der
// Excel-Preisliste). Ist dort für ein Profil kein Preis hinterlegt ("Preis auf
// Anfrage") oder ist der Shop nicht erreichbar, zeigt der Konfigurator ebenfalls
// "Preis auf Anfrage" — es werden nie erfundene Preise angezeigt.

const SHOP_PRICE_URL: string =
  import.meta.env.VITE_SHOP_PRICE_URL ?? 'https://shop.novamotis.com/api/preisliste';

const FETCH_TIMEOUT_MS = 8000;

interface ShopProfilePrice {
  sku: string | null;
  title: string;
  nut: 'A5' | 'A6' | 'A8';
  /** Größe wie im Shop-Titel, z. B. "40x40" oder "120x40" */
  size: string;
  /** "eco" | "leicht" | null (= Standardausführung ohne Zusatz im Titel) */
  variant: 'eco' | 'leicht' | null;
  /** EUR netto pro Meter; null = Preis auf Anfrage */
  pricePerMeter: number | null;
}

export type ShopPriceStatus = 'loading' | 'ready' | 'error';

let status: ShopPriceStatus = 'loading';
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

/** Nutgruppe des Konfigurator-Eintrags: A6 hat hier keinen eigenen Tag, sondern ist die
 *  30er-Untervariante (modulePitch 30) — siehe ProfileConfigurator.sectionsForNut. */
function sectionNut(s: ProfileSection): 'A5' | 'A6' | 'A8' {
  return s.nut ?? (s.modulePitch === 30 ? 'A6' : 'A8');
}

/** Größe ohne Ausrichtung: Der Shop nennt "120x40", der Konfigurator führt 40 × 120 (Breite ×
 *  Höhe) — dasselbe Profil. Deshalb wird die kleinere Kantenlänge immer zuerst genannt. */
function normalizeSize(a: number, b: number): string {
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

function normalizeShopSize(size: string): string {
  const [a, b] = size.split('x').map(Number);
  return normalizeSize(a, b);
}

export function findShopProfile(
  section: ProfileSection,
  list: ShopProfilePrice[],
): ShopProfilePrice | undefined {
  const nut = sectionNut(section);
  const size = normalizeSize(section.w, section.h);
  // Im Shop hat die Standardausführung keinen Zusatz im Titel ("Profil A8 40x40"); das ist im
  // Konfigurator "Schwer". "eco" und "leicht" stehen wörtlich im Titel.
  const wanted = section.variant === 'schwer' ? null : section.variant;
  const candidates = list.filter((p) => p.nut === nut && normalizeShopSize(p.size) === size);
  const exact = candidates.find((p) => p.variant === wanted);
  if (exact) return exact;
  // Bietet der Konfigurator für eine Größe nur "Leicht" an (alle Nut-5-Größen, flache Profile
  // wie 160 × 16), führt der Shop dort meist nur die Standardausführung ohne Zusatz im Titel
  // (z. B. "Profil A5 40x40") — diese entspricht dann der einzigen Ausführung.
  const sizeEntry = PROFILE_SIZES.find((sz) => sz.key === section.sizeKey && sz.nut === section.nut);
  if (wanted === 'leicht' && sizeEntry?.variants.length === 1) {
    return candidates.find((p) => p.variant === null);
  }
  return undefined;
}

function applyShopPrices(list: ShopProfilePrice[]) {
  for (const section of PROFILE_SECTIONS) {
    const hit = findShopProfile(section, list);
    if (hit?.pricePerMeter != null && hit.pricePerMeter > 0) {
      section.pricePerMeter = hit.pricePerMeter;
      section.priceOnRequest = false;
    } else {
      section.priceOnRequest = true;
    }
    if (hit?.sku) section.orderCode = hit.sku;
  }
}

function isShopPriceList(data: unknown): data is { profiles: ShopProfilePrice[] } {
  const profiles = (data as { profiles?: unknown } | null)?.profiles;
  return (
    Array.isArray(profiles) &&
    profiles.every(
      (p) =>
        p &&
        typeof p.title === 'string' &&
        typeof p.size === 'string' &&
        (p.pricePerMeter === null || typeof p.pricePerMeter === 'number'),
    )
  );
}

export function loadShopPrices(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(SHOP_PRICE_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!isShopPriceList(data)) throw new Error('unerwartetes Format');
      applyShopPrices(data.profiles);
      status = 'ready';
    } catch (err) {
      console.warn('Webshop-Preisliste nicht verfügbar — Preise auf Anfrage:', err);
      for (const section of PROFILE_SECTIONS) section.priceOnRequest = true;
      status = 'error';
    } finally {
      clearTimeout(timer);
      notify();
    }
  })();
  return inflight;
}

/** Lädt die Shop-Preisliste einmalig und rendert neu, sobald sie da ist. */
export function useShopPrices(): ShopPriceStatus {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    void loadShopPrices();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return status;
}
