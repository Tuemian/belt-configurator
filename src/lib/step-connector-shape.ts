import * as THREE from 'three';
import occtimportjs from 'occt-import-js';
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import type { ConnectorType, ProfileSection } from '@/lib/profile-configurator-types';

// ---------------------------------------------------------------------------
// Lädt die echte Verbinder-Geometrie aus dem STEP-Modell des jeweiligen
// Shop-Artikels, statt des bisherigen simplen Platzhalter-Quaders.
// ---------------------------------------------------------------------------
//
// Der Shop führt für die meisten Verbindertypen ein STEP-3D-Modell (dieselbe
// Technik wie der Shop-eigene Produkt-3D-Viewer, occt-import-js/WASM). Die
// Zuordnung Konfigurator-Verbindertyp → Shop-Artikel ist best-effort: der
// Shop unterscheidet seine Verbinder nicht 1:1 nach den vier abstrakten
// Konfigurator-Typen, sondern führt ein eigenes, gewachsenes Sortiment.
// Wo keine überzeugende Zuordnung existiert (v. a. Nut 5/A5 — dafür führt
// der Shop keine STEP-Datei), bleibt es beim bisherigen Platzhalter-Quader.

const SHOP_BASE_URL: string =
  import.meta.env.VITE_SHOP_BASE_URL ?? 'https://shop.novamotis.com';

// Nut A6 ist im Katalog nur die 30er-Rastermaß-Untervariante von Nut 8 (siehe
// shop-prices.ts sectionNut) — dieselbe Nutbreite, dieselbe Verbinder-Hardware.
// Nur echtes Nut 5 (A5) hat eine andere (schmalere) Nut und dafür führt der Shop
// keine Verbinder-STEP-Datei — dort bleibt der Platzhalter-Quader bestehen.
function isNut8Hardware(section: ProfileSection): boolean {
  return section.nut !== 'A5';
}

/** Best-effort SKU-Zuordnung. Siehe Kommentar oben — bitte bei Gelegenheit mit
 *  echten Bestellungen/Alvaris-Auswahlhilfe gegenprüfen, falls die Wahl für einen
 *  bestimmten Profilquerschnitt nicht passt. */
function findConnectorSku(type: ConnectorType, section: ProfileSection): string | undefined {
  if (!isNut8Hardware(section)) return undefined;
  switch (type) {
    case 'screw-in-m8':
      return '2000092'; // Einschraubverbindersatz A8 einfach
    case 'auto-m6':
      return '2000055'; // Automatikverbindersatz A8
    case 'set-single':
      return '2000285'; // Verbindersatz 40 einfach (der Shop führt keine "80 einfach"-Variante)
    case 'set-double':
      // Der Shop führt getrennte Verbindersätze für die 40er- und die 80er-Baugröße.
      return Math.max(section.w, section.h) >= 80 ? '2000293' : '2000283';
    default:
      return undefined;
  }
}

let occtModulePromise: ReturnType<typeof occtimportjs> | null = null;
function getOcctModule() {
  if (!occtModulePromise) {
    occtModulePromise = occtimportjs({ locateFile: () => occtWasmUrl });
  }
  return occtModulePromise;
}

export interface ConnectorGeometryResult {
  /** Eigene Bounding-Box-Mitte zentriert (lokaler Ursprung = Mittelpunkt des Teils). */
  parts: Array<{ geometry: THREE.BufferGeometry; edges: THREE.BufferGeometry }>;
  size: THREE.Vector3;
}

async function fetchAndBuild(sku: string): Promise<ConnectorGeometryResult | null> {
  try {
    const [occt, response] = await Promise.all([
      getOcctModule(),
      fetch(`${SHOP_BASE_URL}/api/step/${sku}`),
    ]);
    if (!response.ok) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    const result = occt.ReadStepFile(buffer, { linearUnit: 'millimeter' });
    if (!result.success || result.meshes.length === 0) return null;

    // Gemeinsame Bounding Box über alle Meshes, um auf den eigenen Mittelpunkt
    // zu zentrieren (Positionierung im Slot erfolgt relativ dazu).
    const box = new THREE.Box3();
    const rawGeometries = result.meshes.map((occtMesh) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(occtMesh.attributes.position.array, 3));
      if (occtMesh.attributes.normal) {
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(occtMesh.attributes.normal.array, 3));
      }
      geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(occtMesh.index.array), 1));
      if (!occtMesh.attributes.normal) geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      box.union(geometry.boundingBox!);
      return geometry;
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const parts = rawGeometries.map((geometry) => {
      geometry.translate(-center.x, -center.y, -center.z);
      const edges = new THREE.EdgesGeometry(geometry, 35);
      return { geometry, edges };
    });

    return { parts, size };
  } catch (err) {
    console.warn(`Verbinder-STEP nicht ladbar — Platzhalter wird verwendet:`, err);
    return null;
  }
}

const cache = new Map<string, Promise<ConnectorGeometryResult | null>>();

/** Lädt (und cached) die reale Verbinder-Geometrie für einen Konfigurator-
 *  Verbindertyp + Profilquerschnitt. `null`, wenn keine passende Shop-SKU
 *  existiert oder das Laden/Parsen fehlschlägt — dann bleibt der Aufrufer
 *  beim bisherigen Platzhalter-Quader. */
export function getConnectorGeometry(
  type: ConnectorType,
  section: ProfileSection,
): Promise<ConnectorGeometryResult | null> {
  const sku = findConnectorSku(type, section);
  if (!sku) return Promise.resolve(null);
  if (!cache.has(sku)) cache.set(sku, fetchAndBuild(sku));
  return cache.get(sku)!;
}
