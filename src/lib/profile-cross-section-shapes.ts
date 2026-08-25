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

/** T-Nut-Kontur (schmale Öffnung + breiter Fangraum) für eine Nut auf der Oberseite (A), abwärts geöffnet. */
export function tSlotPathDown(cx: number, yTop: number, slotWidth: number, grooveWidth: number, depth: number): string {
  const lip = Math.min(1.8, depth * 0.25);
  const wHalf = slotWidth / 2;
  const gHalf = grooveWidth / 2;
  return `M ${cx - wHalf} ${yTop} L ${cx - wHalf} ${yTop + lip} L ${cx - gHalf} ${yTop + lip} L ${cx - gHalf} ${yTop + depth} L ${cx + gHalf} ${yTop + depth} L ${cx + gHalf} ${yTop + lip} L ${cx + wHalf} ${yTop + lip} L ${cx + wHalf} ${yTop} Z`;
}

/** T-Nut-Kontur für die Unterseite (C), aufwärts geöffnet — Spiegelung von tSlotPathDown. */
export function tSlotPathUp(cx: number, yBottom: number, slotWidth: number, grooveWidth: number, depth: number): string {
  return tSlotPathDown(cx, yBottom, slotWidth, grooveWidth, -depth);
}

/** T-Nut-Kontur für linke/rechte Seite (D/B), horizontal geöffnet. */
export function tSlotPathHorizontal(cy: number, xEdge: number, slotWidth: number, grooveWidth: number, depth: number, fromRight: boolean): string {
  const lip = Math.min(1.8, depth * 0.25);
  const wHalf = slotWidth / 2;
  const gHalf = grooveWidth / 2;
  const dir = fromRight ? -1 : 1;
  return `M ${xEdge} ${cy - wHalf} L ${xEdge + dir * lip} ${cy - wHalf} L ${xEdge + dir * lip} ${cy - gHalf} L ${xEdge + dir * depth} ${cy - gHalf} L ${xEdge + dir * depth} ${cy + gHalf} L ${xEdge + dir * lip} ${cy + gHalf} L ${xEdge + dir * lip} ${cy + wHalf} L ${xEdge} ${cy + wHalf} Z`;
}
