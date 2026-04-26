// ---------------------------------------------------------------------------
// Multi-page PDF generator for profile cut configurations.
// Layout reuses the corporate look of the Gurtförderer summary PDF
// (header + footer background images, brand blue accents, panel cards).
// ---------------------------------------------------------------------------

import jsPDF from 'jspdf';
import {
  PROFILE_SECTIONS,
  SLOT_SIDE_DE,
  CONNECTOR_TYPES,
  HOLE_TYPES,
  getModulePitch,
  getSlotCenters,
  getSlotNumber,
  getAllSlots,
  calculateProfilePrice,
  type ProfileConfig,
  type ProfileSection,
  type ProfileHole,
  type ProfileConnector,
  type SlotId,
} from './profile-configurator-types';
import headerBackground from '@/assets/Hintergrund_Kopfzeile.png';
import footerBackground from '@/assets/Hintergrund_Fusszeile.png';

export interface CartItemLike {
  id: string;
  config: ProfileConfig;
  price: ReturnType<typeof calculateProfilePrice>;
}

export interface CustomerInfo {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  message?: string;
  desiredDelivery?: string; // ISO date or human-readable text from the form
}

const PAGE_W = 210;   // A4 mm
const PAGE_H = 297;
const MARGIN = 16;    // matches Fördertechnik layout
const BRAND       = { r: 0,   g: 51,  b: 102 };  // #003366 corporate blue
const BRAND_GRAY  = { r: 98,  g: 108, b: 122 };
const SLATE_900   = { r: 48,  g: 63,  b: 79  };
const SLATE_500   = { r: 100, g: 116, b: 139 };
const SLATE_200   = { r: 226, g: 232, b: 240 };
const BORDER_GRAY = { r: 210, g: 214, b: 220 };
const SLATE_50    = { r: 248, g: 250, b: 252 };
const ACCENT_BG   = { r: 235, g: 244, b: 255 };
const PANEL_FILL  = { r: 255, g: 255, b: 255 };

const FOOTER_TEXT_COLUMNS = [
  ['Erste Bank und Sparkasse', 'BIC/SWIFT: DOSPAT2DXXX', 'IBAN: AT10 2060 2000 0068 0215'],
  ['Gerichtsstand: Landesgericht Feldkirch', 'Firmenbuchnummer: FN 669496 d', 'UID-Nummer: ATU82899035'],
  ['Geschaeftsfuehrung:', 'Simon Martin, Slovyana Votchyna', 'M: office@novamotis.com', 'W: www.novamotis.com'],
] as const;

const fmtEur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// ---------------------------------------------------------------------------
// Image helpers (cached per call so we only decode each background once)
// ---------------------------------------------------------------------------

type CachedImage = { dataUrl: string; width: number; height: number };

async function loadImage(src: string): Promise<CachedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1200;
      const h = img.naturalHeight || 260;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h });
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function buildProfileInquiryPdf(
  cart: CartItemLike[],
  customer: CustomerInfo | null,
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const totalNet = cart.reduce((sum, i) => sum + i.price.total, 0);

  let headerImg: CachedImage | null = null;
  let footerImg: CachedImage | null = null;
  try { headerImg = await loadImage(headerBackground); } catch { /* fallback to flat header */ }
  try { footerImg = await loadImage(footerBackground); } catch { /* fallback */ }

  const totalPages = cart.length + 1;

  // ---- Cover / TOC ----
  drawCoverPage(doc, cart, totalNet, customer, headerImg, footerImg, totalPages);

  // ---- One detail page per cart item ----
  cart.forEach((item, idx) => {
    doc.addPage();
    drawProfilePage(doc, item, idx + 1, cart.length, headerImg, footerImg, totalPages);
  });

  return doc.output('blob');
}

export function getInquiryPdfFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `Novamotis-Profilzuschnitte-${yyyy}-${mm}-${dd}.pdf`;
}

export function buildProfileInquirySummary(cart: CartItemLike[]): string {
  const lines: string[] = ['NOVAMOTIS – Profilzuschnitte – Anfrage', ''];
  cart.forEach((item, idx) => {
    const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
    lines.push(`Position ${idx + 1}: ${s.label}${s.orderCode ? ` (Art.-Nr. ${s.orderCode})` : ''}`);
    lines.push(`  Länge: ${item.config.length} mm   Menge: ${item.config.quantity} Stk.`);
    if (item.config.angleStart !== 0) lines.push(`  Schrägschnitt Anfang: ${item.config.angleStart}°`);
    if (item.config.angleEnd !== 0)   lines.push(`  Schrägschnitt Ende:   ${item.config.angleEnd}°`);
    if (item.config.endStart.thread)  lines.push(`  Gewinde Anfang: M8 (${item.config.endStart.scope ?? 'all'})`);
    if (item.config.endEnd.thread)    lines.push(`  Gewinde Ende:   M8 (${item.config.endEnd.scope ?? 'all'})`);
    if (item.config.holes.length) {
      lines.push(`  Bohrungen (${item.config.holes.length}):`);
      item.config.holes.forEach((h) => {
        const n = getSlotNumber(s, h.slot, h.moduleIndex ?? 0);
        lines.push(`    – ${h.label} · Nut ${n} (${SLOT_SIDE_DE[h.slot]}) @ ${h.zPosition} mm`);
      });
    }
    if (item.config.connectors.length) {
      lines.push(`  Verbinder (${item.config.connectors.length}):`);
      item.config.connectors.forEach((c) => {
        const n = getSlotNumber(s, c.slot, c.moduleIndex ?? 0);
        lines.push(`    – ${c.label} · Nut ${n} (${SLOT_SIDE_DE[c.slot]}) · ${c.end === 'start' ? 'Anfang' : 'Ende'}`);
      });
    }
    lines.push(`  Positionspreis: ${fmtEur.format(item.price.total)}`);
    lines.push('');
  });
  const total = cart.reduce((sum, i) => sum + i.price.total, 0);
  lines.push(`Gesamt (netto): ${fmtEur.format(total)}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Cover page with logo, customer info, TOC and total
// ---------------------------------------------------------------------------

function drawCoverPage(
  doc: jsPDF,
  cart: CartItemLike[],
  totalNet: number,
  customer: CustomerInfo | null,
  headerImg: CachedImage | null,
  footerImg: CachedImage | null,
  totalPages: number,
) {
  const bodyStart = drawHeader(doc, headerImg, 'NOVAMOTIS – Profilzuschnitte', 'Anfrage mit Inhaltsverzeichnis und Positionsdetails');
  let y = bodyStart;

  // Date / inquiry meta
  setText(doc, SLATE_500, 9, 'normal');
  doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, MARGIN, y);
  doc.text(`Positionen: ${cart.length}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 8;

  // Customer info card
  if (customer) {
    const hasMessage = !!customer.message;
    const hasDelivery = !!customer.desiredDelivery;
    const cardH = 22 + (hasMessage ? 6 : 0) + (hasDelivery ? 6 : 0);
    setFill(doc, PANEL_FILL);
    setStroke(doc, BORDER_GRAY);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, cardH, 3, 3, 'FD');
    setText(doc, BRAND, 11, 'bold');
    doc.text('Kundendaten', MARGIN + 4, y + 7);
    setText(doc, SLATE_900, 10, 'normal');
    const contactLine1 = [customer.name, customer.company].filter(Boolean).join(' · ');
    const contactLine2 = [customer.email, customer.phone].filter(Boolean).join(' · ');
    if (contactLine1) doc.text(contactLine1, MARGIN + 4, y + 13);
    if (contactLine2) doc.text(contactLine2, MARGIN + 4, y + 18);
    let extraY = y + 24;
    if (hasDelivery) {
      setText(doc, BRAND, 9, 'bold');
      doc.text('Wunschliefertermin:', MARGIN + 4, extraY);
      setText(doc, SLATE_900, 9, 'normal');
      doc.text(String(customer.desiredDelivery), MARGIN + 42, extraY);
      extraY += 6;
    }
    if (hasMessage) {
      setText(doc, SLATE_500, 8.5, 'italic');
      const wrap = doc.splitTextToSize(String(customer.message), PAGE_W - MARGIN * 2 - 8);
      doc.text(wrap.slice(0, 1), MARGIN + 4, extraY);
    }
    y += cardH + 6;
  }

  // TOC heading
  setText(doc, BRAND, 12, 'bold');
  doc.text('Inhaltsverzeichnis', MARGIN, y);
  y += 5;
  setFill(doc, BRAND);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 0.5, 'F');
  y += 5;

  // TOC table header
  setText(doc, BRAND_GRAY, 7.5, 'bold');
  doc.text('SEITE', MARGIN, y);
  doc.text('POS.', MARGIN + 14, y);
  doc.text('PROFIL', MARGIN + 26, y);
  doc.text('ART.-NR.', MARGIN + 86, y);
  doc.text('LÄNGE', MARGIN + 114, y);
  doc.text('MENGE', MARGIN + 134, y);
  doc.text('PREIS', PAGE_W - MARGIN, y, { align: 'right' });
  y += 2;
  setFill(doc, SLATE_200);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 0.2, 'F');
  y += 4;

  // TOC entries
  cart.forEach((item, idx) => {
    if (y > PAGE_H - 70) return; // overflow guard
    const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
    const pageNum = idx + 2;
    const isAlt = idx % 2 === 1;
    if (isAlt) {
      setFill(doc, SLATE_50);
      doc.rect(MARGIN - 1, y - 3.2, PAGE_W - MARGIN * 2 + 2, 5.5, 'F');
    }
    setText(doc, SLATE_900, 9, 'normal');
    doc.text(String(pageNum), MARGIN, y);
    doc.text(`#${idx + 1}`, MARGIN + 14, y);
    doc.text(truncate(s.label, 30), MARGIN + 26, y);
    setText(doc, BRAND_GRAY, 8.5, 'normal');
    doc.text(s.orderCode ?? '—', MARGIN + 86, y);
    setText(doc, SLATE_900, 9, 'normal');
    doc.text(`${item.config.length} mm`, MARGIN + 114, y);
    doc.text(`${item.config.quantity} ×`, MARGIN + 134, y);
    setText(doc, SLATE_900, 9, 'bold');
    doc.text(fmtEur.format(item.price.total), PAGE_W - MARGIN, y, { align: 'right' });
    y += 6;
  });

  // Totals card – matches Fördertechnik price card style
  y = Math.max(y + 6, PAGE_H - 78);
  setFill(doc, ACCENT_BG);
  setStroke(doc, BRAND);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 26, 3, 3, 'FD');
  setText(doc, BRAND, 9.5, 'bold');
  doc.text('GESAMTPREIS (RICHTPREIS, NETTO)', MARGIN + 5, y + 8);
  setText(doc, BRAND, 19, 'bold');
  doc.text(fmtEur.format(totalNet), PAGE_W - MARGIN - 5, y + 13, { align: 'right' });
  setText(doc, BRAND_GRAY, 7.5, 'normal');
  doc.text(
    'Unverbindlicher Richtpreis. Finaler Preis nach technischer Prüfung durch NOVAMOTIS. Preise verstehen sich netto, zzgl. MwSt. und Versand.',
    MARGIN + 5, y + 21,
    { maxWidth: PAGE_W - MARGIN * 2 - 10 },
  );

  drawFooter(doc, footerImg, 1, totalPages);
}

// ---------------------------------------------------------------------------
// Profile detail page
// ---------------------------------------------------------------------------

function drawProfilePage(
  doc: jsPDF,
  item: CartItemLike,
  posIndex: number,
  totalPositions: number,
  headerImg: CachedImage | null,
  footerImg: CachedImage | null,
  totalPages: number,
) {
  const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
  const bodyStart = drawHeader(doc, headerImg, `Position ${posIndex} · ${s.label}`, `Profilzuschnitt ${posIndex} von ${totalPositions}`);
  let y = bodyStart;

  // Meta row
  setFill(doc, SLATE_50);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 14, 'F');
  setText(doc, SLATE_500, 7.5, 'bold');
  doc.text('ART.-NR.', MARGIN + 3, y + 4);
  doc.text('LÄNGE', MARGIN + 38, y + 4);
  doc.text('MENGE', MARGIN + 70, y + 4);
  doc.text('GEWICHT', MARGIN + 100, y + 4);
  doc.text('POSITIONSPREIS', PAGE_W - MARGIN - 3, y + 4, { align: 'right' });
  setText(doc, SLATE_900, 10, 'bold');
  doc.text(s.orderCode ?? '—', MARGIN + 3, y + 10);
  doc.text(`${item.config.length} mm`, MARGIN + 38, y + 10);
  doc.text(`${item.config.quantity} ×`, MARGIN + 70, y + 10);
  const massTotal = (s.massPerMeter ?? 0) * (item.config.length / 1000) * item.config.quantity;
  doc.text(s.massPerMeter ? `${massTotal.toFixed(2)} kg` : '—', MARGIN + 100, y + 10);
  setText(doc, BRAND, 11, 'bold');
  doc.text(fmtEur.format(item.price.total), PAGE_W - MARGIN - 3, y + 10, { align: 'right' });
  y += 20;

  // Drawings: cross-section (left) + side view (right)
  const drawAreaW = PAGE_W - MARGIN * 2;
  const xsW = 56;
  const xsH = 56;
  const xsX = MARGIN;
  const sideX = MARGIN + xsW + 4;
  const sideW = drawAreaW - xsW - 4;
  const sideH = 56;

  drawCrossSection(doc, s, xsX, y, xsW, xsH, item.config.holes, item.config.connectors);
  drawSideView(doc, item.config, s, sideX, y, sideW, sideH);
  y += xsH + 6;

  // Cuts / end treatments
  drawCutsBlock(doc, item.config, s, MARGIN, y, drawAreaW);
  y += 18;

  // Holes table
  if (item.config.holes.length > 0) {
    y = drawHolesTable(doc, item.config.holes, s, MARGIN, y, drawAreaW);
  }

  // Connectors table
  if (item.config.connectors.length > 0) {
    y = drawConnectorsTable(doc, item.config.connectors, MARGIN, y, drawAreaW);
  }

  // Price breakdown
  drawPriceBreakdown(doc, item.price, MARGIN, PAGE_H - 38, drawAreaW);

  drawFooter(doc, footerImg, posIndex + 1, totalPages);
}

// ---------------------------------------------------------------------------
// Drawings
// ---------------------------------------------------------------------------

function drawCrossSection(
  doc: jsPDF,
  s: ProfileSection,
  x: number, y: number, w: number, h: number,
  holes: ProfileHole[], connectors: ProfileConnector[],
) {
  // Frame
  setStroke(doc, SLATE_200);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  setText(doc, SLATE_500, 7, 'bold');
  doc.text('QUERSCHNITT', x + 2, y + 4);
  setText(doc, SLATE_500, 6.5, 'normal');
  doc.text(`${s.w} × ${s.h} mm · Nut 8`, x + 2, y + 8);

  // Compute scale to fit profile in the box (with padding)
  const PAD = 8;
  const innerW = w - PAD * 2;
  const innerH = h - PAD * 2 - 4;
  const scale = Math.min(innerW / s.w, innerH / s.h);
  const profileW = s.w * scale;
  const profileH = s.h * scale;
  const ox = x + (w - profileW) / 2;
  const oy = y + 4 + (h - 4 - profileH) / 2;

  // Profile body (rounded rect)
  setFill(doc, SLATE_50);
  setStroke(doc, SLATE_500);
  doc.setLineWidth(0.3);
  const r = Math.min(2, s.cornerR * scale);
  doc.roundedRect(ox, oy, profileW, profileH, r, r, 'FD');

  // Center bores per module
  const MODULE = getModulePitch(s);
  const numW = Math.max(1, Math.round(s.w / MODULE));
  const numH = Math.max(1, Math.round(s.h / MODULE));
  setFill(doc, { r: 255, g: 255, b: 255 });
  for (let i = 0; i < numW; i++) {
    for (let j = 0; j < numH; j++) {
      const cx = ox + (MODULE * (i + 0.5)) * scale;
      const cy = oy + (MODULE * (j + 0.5)) * scale;
      doc.circle(cx, cy, s.boreRadius * scale, 'F');
    }
  }

  // T-slot openings (tiny rects at the visible edges)
  setFill(doc, BRAND);
  const slotW = s.slotWidth * scale;
  const slotD = Math.min(3, s.slotDepth * scale);
  for (let i = 0; i < numW; i++) {
    const cx = ox + (MODULE * (i + 0.5)) * scale;
    doc.rect(cx - slotW / 2, oy, slotW, slotD, 'F');                   // A
    doc.rect(cx - slotW / 2, oy + profileH - slotD, slotW, slotD, 'F'); // C
  }
  for (let j = 0; j < numH; j++) {
    const cy = oy + (MODULE * (j + 0.5)) * scale;
    doc.rect(ox, cy - slotW / 2, slotD, slotW, 'F');                    // D
    doc.rect(ox + profileW - slotD, cy - slotW / 2, slotD, slotW, 'F'); // B
  }

  // Slot labels A / B / C / D
  setText(doc, SLATE_900, 6, 'bold');
  doc.text('A', ox + profileW / 2, oy - 1, { align: 'center' });
  doc.text('C', ox + profileW / 2, oy + profileH + 4, { align: 'center' });
  doc.text('B', ox + profileW + 3, oy + profileH / 2 + 1.5);
  doc.text('D', ox - 3, oy + profileH / 2 + 1.5, { align: 'right' });

  // Annotate which slots have features
  const usedSlots = new Set<SlotId>();
  holes.forEach((hh) => usedSlots.add(hh.slot));
  connectors.forEach((cc) => usedSlots.add(cc.slot));
  if (usedSlots.size) {
    setText(doc, BRAND, 6, 'bold');
    doc.text(`Bearbeitet: ${[...usedSlots].sort().join(', ')}`, x + 2, y + h - 2);
  }
}

function drawSideView(
  doc: jsPDF,
  config: ProfileConfig,
  s: ProfileSection,
  x: number, y: number, w: number, h: number,
) {
  setStroke(doc, SLATE_200);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  setText(doc, SLATE_500, 7, 'bold');
  doc.text('SEITENANSICHT (Maße in mm)', x + 2, y + 4);

  // Drawing area
  const PAD_L = 6;
  const PAD_R = 6;
  const PAD_TOP = 14;
  const PAD_BOT = 14;
  const drawW = w - PAD_L - PAD_R;
  const profileH = Math.max(s.w, s.h);
  const scaleX = drawW / config.length;
  const scaleY = Math.min((h - PAD_TOP - PAD_BOT) / profileH, scaleX * 1.2);
  const profilePxH = profileH * scaleY;
  const ox = x + PAD_L;
  const oy = y + PAD_TOP + (h - PAD_TOP - PAD_BOT - profilePxH) / 2;

  // Profile rectangle with miter cuts visualised
  const cutS = profileH * Math.tan((config.angleStart * Math.PI) / 180) * scaleY / scaleX; // px
  const cutE = profileH * Math.tan((config.angleEnd * Math.PI) / 180) * scaleY / scaleX;
  const wPx = config.length * scaleX;

  setFill(doc, SLATE_50);
  setStroke(doc, SLATE_500);
  doc.setLineWidth(0.3);
  // Polygon: (cutS, 0) – (wPx-cutE, 0) – (wPx, profilePxH) – (-cutS+0, profilePxH) approximate
  // Using triangles via lines for a four-sided polygon
  const p1x = ox + Math.max(0, cutS);
  const p2x = ox + wPx - Math.max(0, cutE);
  const p3x = ox + wPx + Math.min(0, -cutE);
  const p4x = ox + Math.min(0, -cutS);
  // jsPDF has no polygon; draw via lines + fill background as rect with overlay slate fills for cuts
  doc.rect(ox, oy, wPx, profilePxH, 'FD');
  if (config.angleStart !== 0) {
    setFill(doc, { r: 255, g: 255, b: 255 });
    doc.setLineWidth(0.3);
    if (config.angleStart > 0) {
      // triangle at top-left
      doc.triangle(ox, oy, ox + Math.abs(cutS), oy, ox, oy + profilePxH, 'F');
    } else {
      doc.triangle(ox, oy, ox + Math.abs(cutS), oy + profilePxH, ox, oy + profilePxH, 'F');
    }
    setStroke(doc, SLATE_500);
    doc.line(
      ox + (config.angleStart > 0 ? Math.abs(cutS) : 0), oy,
      ox + (config.angleStart > 0 ? 0 : Math.abs(cutS)), oy + profilePxH,
    );
  }
  if (config.angleEnd !== 0) {
    setFill(doc, { r: 255, g: 255, b: 255 });
    if (config.angleEnd > 0) {
      doc.triangle(ox + wPx, oy, ox + wPx - Math.abs(cutE), oy, ox + wPx, oy + profilePxH, 'F');
    } else {
      doc.triangle(ox + wPx, oy, ox + wPx - Math.abs(cutE), oy + profilePxH, ox + wPx, oy + profilePxH, 'F');
    }
    setStroke(doc, SLATE_500);
    doc.line(
      ox + wPx - (config.angleEnd > 0 ? Math.abs(cutE) : 0), oy,
      ox + wPx - (config.angleEnd > 0 ? 0 : Math.abs(cutE)), oy + profilePxH,
    );
  }

  // Slot tracks (dashed centerlines per module)
  const centers = getSlotCenters(s, 'A');
  setStroke(doc, BRAND);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1, 1], 0);
  centers.forEach((c) => {
    const lineY = oy + (c / profileH) * profilePxH;
    doc.line(ox, lineY, ox + wPx, lineY);
  });
  doc.setLineDashPattern([], 0);

  // Holes — render as small filled circles on the visible top face track
  config.holes.forEach((h) => {
    const hx = ox + h.zPosition * scaleX;
    const trackIdx = Math.min(centers.length - 1, h.moduleIndex ?? 0);
    const hy = oy + (centers[trackIdx] / profileH) * profilePxH;
    setFill(doc, holePdfColor(h.type));
    doc.circle(hx, hy, Math.max(0.8, Math.min(2, h.diameter * 0.18)), 'F');
  });

  // Connectors – squares at the appropriate end
  config.connectors.forEach((c) => {
    const trackIdx = Math.min(centers.length - 1, c.moduleIndex ?? 0);
    const hy = oy + (centers[trackIdx] / profileH) * profilePxH;
    const cw = 4;
    const cx = c.end === 'start' ? ox + 0.5 : ox + wPx - cw - 0.5;
    setFill(doc, SLATE_500);
    doc.rect(cx, hy - 1.6, cw, 3.2, 'F');
  });

  // Length dimension line
  const dimY = oy + profilePxH + 6;
  setStroke(doc, SLATE_900);
  doc.setLineWidth(0.2);
  doc.line(ox, dimY, ox + wPx, dimY);
  doc.line(ox, dimY - 1.5, ox, dimY + 1.5);
  doc.line(ox + wPx, dimY - 1.5, ox + wPx, dimY + 1.5);
  setText(doc, SLATE_900, 7, 'bold');
  doc.text(`L = ${config.length} mm`, ox + wPx / 2, dimY + 4, { align: 'center' });

  // Anfang / Ende ticks
  setText(doc, SLATE_500, 6, 'normal');
  doc.text('Anfang', ox, oy - 2);
  doc.text('Ende', ox + wPx, oy - 2, { align: 'right' });
}

function holePdfColor(type: ProfileHole['type']) {
  if (type === 'm6-thread' || type === 'm8-thread') return { r: 183, g: 134, b: 40 };
  if (type === 'step-m6' || type === 'step-m8') return { r: 59, g: 103, b: 168 };
  return { r: 30, g: 41, b: 59 };
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function drawCutsBlock(doc: jsPDF, config: ProfileConfig, x: number, y: number, w: number) {
  setText(doc, SLATE_500, 7.5, 'bold');
  doc.text('SCHRÄGSCHNITTE & STIRNSEITEN', x, y);
  setFill(doc, SLATE_200);
  doc.rect(x, y + 1.4, w, 0.2, 'F');
  setText(doc, SLATE_900, 9, 'normal');
  const partsLeft: string[] = [];
  const partsRight: string[] = [];
  partsLeft.push(`Anfang: ${config.angleStart === 0 ? '90° (gerade)' : `${config.angleStart}°`}`);
  partsRight.push(`Ende: ${config.angleEnd === 0 ? '90° (gerade)' : `${config.angleEnd}°`}`);
  if (config.endStart.thread) partsLeft.push(`Gewinde M8 · ${scopeLabel(config.endStart.scope)}`);
  if (config.endEnd.thread)   partsRight.push(`Gewinde M8 · ${scopeLabel(config.endEnd.scope)}`);
  doc.text(partsLeft.join('   ·   '),  x, y + 7);
  doc.text(partsRight.join('   ·   '), x + w / 2, y + 7);
}

function scopeLabel(scope: string | undefined): string {
  switch (scope) {
    case 'all':    return 'alle Kernzüge';
    case 'center': return 'Zentrum';
    case 'A':      return 'Nut A';
    case 'B':      return 'Nut B';
    case 'C':      return 'Nut C';
    case 'D':      return 'Nut D';
    default:       return 'alle Kernzüge';
  }
}

function drawHolesTable(doc: jsPDF, holes: ProfileHole[], x: number, y: number, w: number): number {
  setText(doc, SLATE_500, 7.5, 'bold');
  doc.text(`BOHRUNGEN (${holes.length})`, x, y);
  y += 2;
  setFill(doc, SLATE_200);
  doc.rect(x, y, w, 0.2, 'F');
  y += 3;

  // Header
  setText(doc, SLATE_500, 7, 'bold');
  doc.text('NR.', x, y);
  doc.text('TYP', x + 12, y);
  doc.text('Ø', x + 70, y);
  doc.text('NUT', x + 84, y);
  doc.text('SPUR', x + 110, y);
  doc.text('POSITION', x + 130, y);
  doc.text('VOM ENDE', x + 162, y);
  y += 3;

  holes.forEach((h, idx) => {
    if (y > PAGE_H - 50) return; // keep room for price
    if (idx % 2 === 1) {
      setFill(doc, SLATE_50);
      doc.rect(x - 1, y - 3.2, w + 2, 5, 'F');
    }
    setText(doc, SLATE_900, 8.5, 'normal');
    doc.text(String(idx + 1), x, y);
    doc.text(truncate(HOLE_TYPES.find((t) => t.id === h.type)?.label ?? h.label, 36), x + 12, y);
    doc.text(`${h.diameter} mm`, x + 70, y);
    doc.text(SLOT_LABEL_DE[h.slot].split(' ')[1] ?? h.slot, x + 84, y);
    doc.text(String((h.moduleIndex ?? 0) + 1), x + 110, y);
    doc.text(`${h.zPosition} mm`, x + 130, y);
    y += 5;
  });
  return y + 4;
}

function drawConnectorsTable(doc: jsPDF, connectors: ProfileConnector[], x: number, y: number, w: number): number {
  setText(doc, SLATE_500, 7.5, 'bold');
  doc.text(`VERBINDER (${connectors.length})`, x, y);
  y += 2;
  setFill(doc, SLATE_200);
  doc.rect(x, y, w, 0.2, 'F');
  y += 3;

  setText(doc, SLATE_500, 7, 'bold');
  doc.text('NR.', x, y);
  doc.text('TYP', x + 12, y);
  doc.text('NUT', x + 90, y);
  doc.text('SPUR', x + 116, y);
  doc.text('POSITION', x + 140, y);
  y += 3;

  connectors.forEach((c, idx) => {
    if (y > PAGE_H - 50) return;
    if (idx % 2 === 1) {
      setFill(doc, SLATE_50);
      doc.rect(x - 1, y - 3.2, w + 2, 5, 'F');
    }
    const def = CONNECTOR_TYPES.find((t) => t.id === c.type);
    setText(doc, SLATE_900, 8.5, 'normal');
    doc.text(String(idx + 1), x, y);
    doc.text(truncate(def?.label ?? c.label, 40), x + 12, y);
    doc.text(SLOT_LABEL_DE[c.slot].split(' ')[1] ?? c.slot, x + 90, y);
    doc.text(String((c.moduleIndex ?? 0) + 1), x + 116, y);
    doc.text(c.end === 'start' ? 'Anfang' : 'Ende', x + 140, y);
    y += 5;
  });
  return y + 4;
}

function drawPriceBreakdown(
  doc: jsPDF,
  price: ReturnType<typeof calculateProfilePrice>,
  x: number, y: number, w: number,
) {
  setFill(doc, ACCENT_BG);
  doc.rect(x, y, w, 22, 'F');
  setText(doc, SLATE_500, 7, 'bold');
  doc.text('MATERIAL', x + 3, y + 5);
  doc.text('SCHRÄGSCHNITTE', x + 38, y + 5);
  doc.text('BOHR./GEW.', x + 80, y + 5);
  doc.text('VERBINDER', x + 112, y + 5);
  doc.text('GESAMT', x + w - 3, y + 5, { align: 'right' });

  setText(doc, SLATE_900, 9, 'normal');
  doc.text(fmtEur.format(price.material),    x + 3, y + 12);
  doc.text(fmtEur.format(price.miterCuts),   x + 38, y + 12);
  doc.text(fmtEur.format(price.holes),       x + 80, y + 12);
  doc.text(fmtEur.format(price.connectors),  x + 112, y + 12);
  setText(doc, BRAND, 12, 'bold');
  doc.text(fmtEur.format(price.total), x + w - 3, y + 13, { align: 'right' });
  setText(doc, SLATE_500, 6.5, 'italic');
  doc.text('Richtpreis · zzgl. MwSt. und Versand · finale Bestätigung durch NOVAMOTIS.', x + 3, y + 19);
}

// ---------------------------------------------------------------------------
// Header / Footer / Helpers
// ---------------------------------------------------------------------------

function drawHeader(doc: jsPDF, headerImg: CachedImage | null, title: string, subtitle?: string): number {
  let headerHeight: number;
  if (headerImg) {
    headerHeight = PAGE_W * (headerImg.height / headerImg.width);
    try {
      doc.addImage(headerImg.dataUrl, 'PNG', 0, 0, PAGE_W, headerHeight, undefined, 'FAST');
    } catch {
      headerHeight = 22;
      setFill(doc, BRAND);
      doc.rect(0, 0, PAGE_W, headerHeight, 'F');
    }
  } else {
    headerHeight = 22;
    setFill(doc, BRAND);
    doc.rect(0, 0, PAGE_W, headerHeight, 'F');
    setText(doc, { r: 255, g: 255, b: 255 }, 14, 'bold');
    doc.text('NOVAMOTIS', MARGIN, 12);
  }

  // Divider line
  setStroke(doc, BORDER_GRAY);
  doc.setLineWidth(0.4);
  doc.line(0, headerHeight, PAGE_W, headerHeight);

  // Title block (below the header image)
  const titleY = headerHeight + 10;
  setText(doc, BRAND, 18, 'bold');
  doc.text(title, MARGIN, titleY);

  setText(doc, BRAND_GRAY, 9, 'normal');
  doc.text(new Date().toLocaleDateString('de-DE'), PAGE_W - MARGIN, titleY - 4, { align: 'right' });

  let bodyY = titleY + 5;
  if (subtitle) {
    setText(doc, BRAND_GRAY, 9.5, 'normal');
    doc.text(subtitle, MARGIN, bodyY);
    bodyY += 5;
  }
  setStroke(doc, BORDER_GRAY);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, bodyY + 2, PAGE_W - MARGIN, bodyY + 2);
  return bodyY + 8;
}

function drawFooter(doc: jsPDF, footerImg: CachedImage | null, page: number, totalPages: number) {
  const footerHeight = 21;
  const footerY = PAGE_H - footerHeight;

  if (footerImg) {
    try {
      doc.addImage(footerImg.dataUrl, 'PNG', 0, footerY, PAGE_W, footerHeight, undefined, 'FAST');
    } catch {
      setFill(doc, { r: 247, g: 249, b: 252 });
      doc.rect(0, footerY, PAGE_W, footerHeight, 'F');
    }
  } else {
    setFill(doc, { r: 247, g: 249, b: 252 });
    doc.rect(0, footerY, PAGE_W, footerHeight, 'F');
  }

  setStroke(doc, { r: 220, g: 225, b: 232 });
  doc.setLineWidth(0.2);
  doc.line(0, footerY, PAGE_W, footerY);

  setText(doc, { r: 57, g: 63, b: 70 }, 6.2, 'normal');
  const contentWidth = PAGE_W - MARGIN * 2;
  const columnGap = 6;
  const columnWidth = (contentWidth - columnGap * 2) / 3;
  const columnsX = [MARGIN, MARGIN + columnWidth + columnGap, MARGIN + columnWidth * 2 + columnGap * 2];
  const columnsY = footerY + 6.8;
  FOOTER_TEXT_COLUMNS.forEach((lines, index) => {
    const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, columnWidth) as string[]);
    doc.text(wrapped, columnsX[index], columnsY, { lineHeightFactor: 1.12 });
  });

  setText(doc, BRAND_GRAY, 7, 'bold');
  doc.text(`Seite ${page} / ${totalPages}`, PAGE_W - MARGIN, footerY - 2, { align: 'right' });
}

function setText(doc: jsPDF, color: { r: number; g: number; b: number }, size: number, style: 'normal' | 'bold' | 'italic') {
  doc.setTextColor(color.r, color.g, color.b);
  doc.setFontSize(size);
  doc.setFont('helvetica', style);
}
function setFill(doc: jsPDF, c: { r: number; g: number; b: number }) {
  doc.setFillColor(c.r, c.g, c.b);
}
function setStroke(doc: jsPDF, c: { r: number; g: number; b: number }) {
  doc.setDrawColor(c.r, c.g, c.b);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
