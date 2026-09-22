import * as THREE from 'three';
import { findShopProfile, getShopProfiles } from '@/lib/shop-prices';
import type { ProfileSection } from '@/lib/profile-configurator-types';

// ---------------------------------------------------------------------------
// Baut die 3D-Querschnittsfläche eines Profils aus der echten DXF-Zeichnung
// des Webshops statt aus einer angenäherten, von Hand nachgebauten Kontur.
// ---------------------------------------------------------------------------
//
// Der Shop führt für jeden Artikel eine DXF-Datei mit der realen Kontur (LINE-
// und ARC-Elemente auf einer einzigen Ebene, in mm, zentriert auf 0/0 — siehe
// Stichprobe unter novamotis-webshop/public/downloads/dxf/*.dxf). Einzelne
// LINE/ARC-Segmente sind nicht zu geschlossenen Pfaden verbunden; das
// übernimmt chainLoops() hier, indem an den Endpunkten zusammenpassende
// Segmente aneinandergereiht werden. Ergebnis sind mehrere geschlossene
// Schleifen: die größte ist die Außenkontur, alle anderen (Nutkammern,
// Kernzug-Bohrungen als CIRCLE) sind Aussparungen.

const SHOP_BASE_URL: string =
  import.meta.env.VITE_SHOP_BASE_URL ?? 'https://shop.novamotis.com';

interface DxfEdge {
  arc?: true;
  p0?: [number, number];
  p1?: [number, number];
  c?: [number, number];
  r?: number;
  a0?: number;
  a1?: number;
}

function parseDxfEntities(text: string): { edges: DxfEdge[]; circles: { c: [number, number]; r: number }[] } {
  const lines = text.split(/\r?\n/);
  const pairs: Array<[number, string]> = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1].trim()]);
  }

  let start = -1;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][0] === 2 && pairs[i][1] === 'ENTITIES') {
      start = i;
      break;
    }
  }
  if (start < 0) throw new Error('DXF ohne ENTITIES-Abschnitt');

  const edges: DxfEdge[] = [];
  const circles: { c: [number, number]; r: number }[] = [];

  let i = start + 1;
  while (i < pairs.length) {
    const [code, val] = pairs[i];
    if (code === 0 && val === 'ENDSEC') break;
    if (code === 0 && (val === 'LINE' || val === 'ARC' || val === 'CIRCLE')) {
      const type = val;
      const rec: Record<number, string> = {};
      i++;
      while (i < pairs.length && pairs[i][0] !== 0) {
        rec[pairs[i][0]] = pairs[i][1];
        i++;
      }
      if (type === 'LINE') {
        edges.push({
          p0: [parseFloat(rec[10]), parseFloat(rec[20])],
          p1: [parseFloat(rec[11]), parseFloat(rec[21])],
        });
      } else if (type === 'ARC') {
        const cx = parseFloat(rec[10]);
        const cy = parseFloat(rec[20]);
        const r = parseFloat(rec[40]);
        const a0 = (parseFloat(rec[50]) * Math.PI) / 180;
        const a1 = (parseFloat(rec[51]) * Math.PI) / 180;
        edges.push({ arc: true, c: [cx, cy], r, a0, a1 });
      } else {
        circles.push({ c: [parseFloat(rec[10]), parseFloat(rec[20])], r: parseFloat(rec[40]) });
      }
      continue;
    }
    i++;
  }
  return { edges, circles };
}

function arcEndpoints(e: DxfEdge): [[number, number], [number, number]] {
  const [cx, cy] = e.c!;
  const r = e.r!;
  return [
    [cx + r * Math.cos(e.a0!), cy + r * Math.sin(e.a0!)],
    [cx + r * Math.cos(e.a1!), cy + r * Math.sin(e.a1!)],
  ];
}

function edgeEndpoints(e: DxfEdge): [[number, number], [number, number]] {
  return e.arc ? arcEndpoints(e) : [e.p0!, e.p1!];
}

function key(p: [number, number]): string {
  // 3 Nachkommastellen (µm) reichen, um Rundungsrauschen zwischen unabhängig
  // exportierten Segment-Endpunkten zu verschmelzen, ohne echte Lücken zu übersehen.
  return `${Math.round(p[0] * 1000)}:${Math.round(p[1] * 1000)}`;
}

interface Loop {
  edges: Array<{ e: DxfEdge; dir: 1 | -1 }>;
  closed: boolean;
}

function chainLoops(edges: DxfEdge[]): Loop[] {
  const endpoints = edges.map(edgeEndpoints);
  const used = new Array(edges.length).fill(false);
  const byPoint = new Map<string, number[]>();
  endpoints.forEach(([p0, p1], idx) => {
    for (const p of [p0, p1]) {
      const k = key(p);
      if (!byPoint.has(k)) byPoint.set(k, []);
      byPoint.get(k)!.push(idx);
    }
  });

  const loops: Loop[] = [];
  for (let startIdx = 0; startIdx < edges.length; startIdx++) {
    if (used[startIdx]) continue;
    used[startIdx] = true;
    const loopEdges: Loop['edges'] = [{ e: edges[startIdx], dir: 1 }];
    const [loopStart] = endpoints[startIdx];
    let [, curEnd] = endpoints[startIdx];
    let guard = 0;
    while (key(curEnd) !== key(loopStart) && guard++ < 5000) {
      const candidates = (byPoint.get(key(curEnd)) ?? []).filter((idx) => !used[idx]);
      if (candidates.length === 0) break;
      const nextIdx = candidates[0];
      used[nextIdx] = true;
      const [np0, np1] = endpoints[nextIdx];
      const dir: 1 | -1 = key(np0) === key(curEnd) ? 1 : -1;
      loopEdges.push({ e: edges[nextIdx], dir });
      curEnd = dir === 1 ? np1 : np0;
    }
    loops.push({ edges: loopEdges, closed: key(curEnd) === key(loopStart) });
  }
  return loops;
}

function loopToPoints(loop: Loop, segmentsPerFullCircle = 32): [number, number][] {
  const pts: [number, number][] = [];
  for (const { e, dir } of loop.edges) {
    if (e.arc) {
      let a0 = e.a0!;
      let a1 = e.a1!;
      if (dir === -1) [a0, a1] = [a1, a0];
      let span = a1 - a0;
      if (dir === 1 && span < 0) span += Math.PI * 2;
      if (dir === -1 && span > 0) span -= Math.PI * 2;
      const n = Math.max(2, Math.ceil((Math.abs(span) / (Math.PI * 2)) * segmentsPerFullCircle));
      for (let s = 0; s <= n; s++) {
        const a = a0 + (span * s) / n;
        pts.push([e.c![0] + e.r! * Math.cos(a), e.c![1] + e.r! * Math.sin(a)]);
      }
    } else {
      const [p0, p1] = dir === 1 ? [e.p0!, e.p1!] : [e.p1!, e.p0!];
      if (pts.length === 0) pts.push(p0);
      pts.push(p1);
    }
  }
  return pts;
}

function bboxOf(pts: [number, number][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function polygonArea(pts: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

export interface DxfProfileShapeResult {
  shape: THREE.Shape;
  /** Kontur-Maße (mm) — zum Abgleich gegen section.w/section.h, bevor die Form verwendet wird. */
  width: number;
  height: number;
}

/** Baut eine zentrierte (0/0 = Mitte), auf section.w × section.h passende THREE.Shape aus dem
 *  DXF-Text. Wirft, wenn keine plausible geschlossene Außenkontur gefunden wird — der Aufrufer
 *  fängt das ab und fällt auf die prozedurale Näherung zurück. */
export function buildShapeFromDxfText(dxfText: string): DxfProfileShapeResult {
  const { edges, circles } = parseDxfEntities(dxfText);
  const loops = chainLoops(edges).filter((l) => l.closed && l.edges.length > 0);
  if (loops.length === 0) throw new Error('keine geschlossene Kontur im DXF gefunden');

  const loopPts = loops.map((l) => loopToPoints(l));
  const loopBboxes = loopPts.map(bboxOf);
  let outerIdx = 0;
  for (let i = 1; i < loopBboxes.length; i++) {
    if (loopBboxes[i].w * loopBboxes[i].h > loopBboxes[outerIdx].w * loopBboxes[outerIdx].h) outerIdx = i;
  }

  const outerBbox = loopBboxes[outerIdx];
  const cx = (outerBbox.minX + outerBbox.maxX) / 2;
  const cy = (outerBbox.minY + outerBbox.maxY) / 2;
  const center = ([x, y]: [number, number]): [number, number] => [x - cx, y - cy];

  const outerPts = loopPts[outerIdx].map(center);
  // DXF-Autorenrichtung ist nicht garantiert — three.js erwartet die Außenkontur CCW
  // (positive Fläche) und Löcher CW (negative Fläche), sonst kippt ExtrudeGeometry
  // Vorder-/Rückseite der Normalen.
  if (polygonArea(outerPts) < 0) outerPts.reverse();

  const shape = new THREE.Shape();
  shape.moveTo(outerPts[0][0], outerPts[0][1]);
  for (let i = 1; i < outerPts.length; i++) shape.lineTo(outerPts[i][0], outerPts[i][1]);
  shape.closePath();

  loopPts.forEach((pts, i) => {
    if (i === outerIdx) return;
    const centered = pts.map(center);
    if (polygonArea(centered) > 0) centered.reverse();
    const hole = new THREE.Path();
    hole.moveTo(centered[0][0], centered[0][1]);
    for (let j = 1; j < centered.length; j++) hole.lineTo(centered[j][0], centered[j][1]);
    hole.closePath();
    shape.holes.push(hole);
  });

  for (const circle of circles) {
    const [ccx, ccy] = center(circle.c);
    const hole = new THREE.Path();
    hole.absarc(ccx, ccy, circle.r, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  return { shape, width: outerBbox.w, height: outerBbox.h };
}

// ---------------------------------------------------------------------------
// Laden + Zwischenspeichern je Artikelnummer — dieselbe Zuordnung Profil↔Shop-SKU
// wie für die Preise (findShopProfile in shop-prices.ts).
// ---------------------------------------------------------------------------

const cache = new Map<string, Promise<DxfProfileShapeResult | null>>();

async function fetchAndBuild(sku: string): Promise<DxfProfileShapeResult | null> {
  try {
    // /api/dxf/<sku> statt des statischen /downloads/dxf/<sku>.dxf: der Shop liefert
    // die statischen Downloads über Cloudflare Workers' Static-Assets-Auslieferung aus,
    // die keine CORS-Header setzen kann (keine Cloudflare-Pages-_headers-Unterstützung).
    // Die API-Route holt intern dieselbe Datei und hängt CORS selbst an.
    const res = await fetch(`${SHOP_BASE_URL}/api/dxf/${sku}`);
    if (!res.ok) return null;
    const text = await res.text();
    return buildShapeFromDxfText(text);
  } catch (err) {
    console.warn(`DXF-Kontur für Artikel ${sku} nicht ladbar — Näherung wird verwendet:`, err);
    return null;
  }
}

/** Lädt (und cached) die reale DXF-Kontur für ein Profil. `null`, wenn keine
 *  passende Shop-Artikelnummer gefunden wurde, die Shop-Preisliste nicht
 *  geladen werden konnte, oder das Laden/Parsen der DXF fehlschlägt — der
 *  Aufrufer fällt in dem Fall auf die prozedurale Näherung zurück. */
export async function getDxfProfileShape(section: ProfileSection): Promise<DxfProfileShapeResult | null> {
  const profiles = await getShopProfiles();
  if (!profiles) return null;
  const hit = findShopProfile(section, profiles);
  if (!hit?.sku) return null;
  const sku = hit.sku;
  if (!cache.has(sku)) cache.set(sku, fetchAndBuild(sku));
  return cache.get(sku)!;
}
