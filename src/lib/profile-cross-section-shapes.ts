// ---------------------------------------------------------------------------
// Gemeinsame SVG-Pfad-Helfer für die Profil-Querschnittsgrafiken
// (ProfileCrossSection2D im Zuschnittskonfigurator, RealisticProfileCrossSection
// im Durchbiegungsrechner). Reine Geometrie, keine Interaktion/Hitboxen.
// ---------------------------------------------------------------------------

/** Gerundetes Rechteck als SVG-Pfad, im Uhrzeigersinn. */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} L ${x + rr} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rr} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} Z`;
}

/**
 * T-Nut-Kontur (schmale Öffnung + breiter Fangraum) für eine Nut auf der Oberseite (A),
 * abwärts geöffnet. Der Übergang von der schmalen Mündung zum breiten Fangraum ist als
 * kleine Rundung (Q-Kurve) statt scharfer Stufe ausgeführt — entspricht der "Ohren"-Form
 * echter T-Nut-Profile (vgl. Alvaris-Profilbearbeitungscode).
 */
export function tSlotPathDown(cx: number, yTop: number, slotWidth: number, grooveWidth: number, depth: number): string {
  const wHalf = slotWidth / 2;
  const gHalf = grooveWidth / 2;
  const dir = depth < 0 ? -1 : 1;
  const absDepth = Math.abs(depth);
  const lip = Math.min(1.2, absDepth * 0.22) * dir;
  const flare = Math.min(1.8, absDepth * 0.32) * dir;
  const yLip = yTop + lip;
  const yFlare = yLip + flare;
  const yBottom = yTop + depth;
  return `M ${cx - wHalf} ${yTop} L ${cx - wHalf} ${yLip} Q ${cx - wHalf} ${yFlare} ${cx - gHalf} ${yFlare} L ${cx - gHalf} ${yBottom} L ${cx + gHalf} ${yBottom} L ${cx + gHalf} ${yFlare} Q ${cx + wHalf} ${yFlare} ${cx + wHalf} ${yLip} L ${cx + wHalf} ${yTop} Z`;
}

/** T-Nut-Kontur für die Unterseite (C), aufwärts geöffnet — Spiegelung von tSlotPathDown. */
export function tSlotPathUp(cx: number, yBottom: number, slotWidth: number, grooveWidth: number, depth: number): string {
  return tSlotPathDown(cx, yBottom, slotWidth, grooveWidth, -depth);
}

/** T-Nut-Kontur für linke/rechte Seite (D/B), horizontal geöffnet — selbe abgerundete Mündung wie tSlotPathDown. */
export function tSlotPathHorizontal(cy: number, xEdge: number, slotWidth: number, grooveWidth: number, depth: number, fromRight: boolean): string {
  const wHalf = slotWidth / 2;
  const gHalf = grooveWidth / 2;
  const dir = fromRight ? -1 : 1;
  const lip = Math.min(1.2, depth * 0.22);
  const flare = Math.min(1.8, depth * 0.32);
  const xLip = xEdge + dir * lip;
  const xFlare = xLip + dir * flare;
  const xDeep = xEdge + dir * depth;
  return `M ${xEdge} ${cy - wHalf} L ${xLip} ${cy - wHalf} Q ${xFlare} ${cy - wHalf} ${xFlare} ${cy - gHalf} L ${xDeep} ${cy - gHalf} L ${xDeep} ${cy + gHalf} Q ${xFlare} ${cy + gHalf} ${xFlare} ${cy + wHalf} L ${xLip} ${cy + wHalf} L ${xEdge} ${cy + wHalf} Z`;
}

/**
 * Diagonale Verstrebungen von jeder Kernbohrung zu den vier Eckpunkten ihrer Modulzelle —
 * bildet die innere Rippenstruktur echter Strangpressprofile nach (schematisch angenähert,
 * da die Alvaris-Übersichtszeichnung keine Maße für die Stegbreite liefert). Liefert lokale
 * Koordinaten relativ zur Profil-Box (0,0)–(w,h); der Aufrufer verschiebt um sein PAD.
 */
export function getCellStruts(w: number, h: number, boresX: number, boresY: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const cellW = w / boresX;
  const cellH = h / boresY;
  const struts: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let ix = 0; ix < boresX; ix++) {
    for (let iy = 0; iy < boresY; iy++) {
      const cx = cellW * (ix + 0.5);
      const cy = cellH * (iy + 0.5);
      const corners: [number, number][] = [
        [ix * cellW, iy * cellH],
        [(ix + 1) * cellW, iy * cellH],
        [(ix + 1) * cellW, (iy + 1) * cellH],
        [ix * cellW, (iy + 1) * cellH],
      ];
      for (const [x, y] of corners) struts.push({ x1: cx, y1: cy, x2: x, y2: y });
    }
  }
  return struts;
}
