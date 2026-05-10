# Plan: UI/UX-Refactoring Profil-Konfigurator

## Ziel
Aus der aktuellen vier-Reihen-Werkbank (parallele Ansicht aller Profilseiten A/B/C/D) wird ein laienfreundliches Tool mit Fokus-Ansicht, gruppierten Eingaben, Echtzeit-Feedback und responsivem Layout.

---

## 1. Fokus-Ansicht (eine Seite zur Zeit)

**Komponente:** `ProfileWorkbench2D.tsx`

- Statt 4 paralleler Reihen wird nur die aktive Profilseite (A/B/C oder D) groß dargestellt — über die volle Breite der Bühne.
- Über dem Profil prominenter Titel: **„Seite A – OBEN“** (analog für B/RECHTS, C/UNTEN, D/LINKS).
- Neue Komponente **`ProfileSideSwitcher.tsx`**: zeigt einen Querschnitt (basierend auf `ProfileCrossSection2D`) mit klickbaren Hotspots auf den vier Seiten. Aktive Seite wird im Querschnitt blau hervorgehoben.
- Bei Profilen mit mehreren Nuten pro Seite (z. B. 80×80) bleibt eine schmale Lane-Auswahl unter dem Switcher (Tabs „Nut 1 / Nut 2“).
- Multi-Select bleibt über Modifier-Klick im Switcher erhalten (Shift = mehrere Seiten gleichzeitig bearbeiten).

## 2. Modernisierte Sidebar

**Komponente:** `src/pages/ProfileConfigurator.tsx`

- Drei `Accordion`-Sektionen (`@/components/ui/accordion`):
  1. **Basis-Konfiguration** — Profilgröße (visuell), Variante, Länge (Slider + Input), Menge.
  2. **Enden-Bearbeitung** — Schrägschnitte (Anfang/Ende mit Winkel-Slidern), Stirnseiten-Gewinde.
  3. **Übersicht Bearbeitungen** — Liste aller Bohrungen/Verbinder mit Position, Typ, Seite. Klick fokussiert das Element in der Werkbank, Mülleimer-Button entfernt es.
- **Visuelle Profil-Auswahl:** Größen-Buttons werden zu Kacheln mit kleinem SVG-Querschnitt (verkleinerte `ProfileCrossSection2D`) + Label darunter. Neue Komponente **`ProfileSizeTile.tsx`**.
- Standardmäßig ist nur Sektion 1 aufgeklappt.

## 3. Echtzeit-Maße & Validierung

**Komponente:** `ProfileWorkbench2D.tsx`

- Beim Drag einer Bohrung: zwei dynamische Maßlinien (SVG) vom Bohrungsmittelpunkt zu Profilanfang und -ende, mit mm-Label in der Mitte.
- **Validierung:** wenn `zPosition < 15` oder `zPosition > length - 15`, wird die Bohrung rot eingefärbt (`fill` und `stroke`), zusätzlich pulsierender Glow. Tooltip: „Mindestabstand zum Rand unterschritten (15 mm)“.
- Schwellwert als Konstante `MIN_EDGE_DISTANCE = 15` in `profile-configurator-types.ts`.
- Validierungsstatus wird auch in der Sidebar-Liste (Sektion 3) als Warnsymbol angezeigt.

## 4. Design-Finish, Floating Cart & Mobile

- **Branding-Blau #2D89C7** (HSL ≈ 203 65% 48%) als `--primary` in `src/index.css` setzen — alle Primärbuttons/Highlights nutzen das automatisch (es wird kein Hardcode in Komponenten geschrieben).
- Großzügigere Abstände in Sidebar und Werkbank (Padding `p-6`, Gaps `gap-6`).
- **Floating Price Card** (neue Komponente `FloatingPriceCard.tsx`) unten rechts in der Werkbank, schwebend mit Schatten:
  - Aufschlüsselung: Material / Bearbeitung / Steuer (19 % MwSt.)
  - Gesamtpreis fett
  - Buttons „In Warenkorb“ + „Anfrage senden“
- **Mobile/Tablet:**
  - Unter `lg` (1024 px): Sidebar wird zu `Sheet`-Drawer (`@/components/ui/sheet`), Trigger-Button im Header.
  - Floating Card wird auf Mobile zu Bottom-Sheet (volle Breite, ausklappbar).
  - Side-Switcher-Querschnitt rückt unter den Profiltitel.

## 5. Quick-Action-Buttons an Bohrungen

- Bei selektierter Bohrung erscheint ein kleines Popover/Floating-Toolbar direkt am Bohrloch mit Schnellpositionen:
  - **„20 mm Anfang“**, **„50 mm Anfang“**, **„Mitte“**, **„50 mm Ende“**, **„20 mm Ende“**
- Klick setzt `zPosition` exakt. Implementierung über bestehende `updateHole`-Funktion.

---

## Technische Details

- Neue Dateien:
  - `src/components/configurator/ProfileSideSwitcher.tsx`
  - `src/components/configurator/ProfileSizeTile.tsx`
  - `src/components/configurator/FloatingPriceCard.tsx`
  - `src/components/configurator/HoleQuickActions.tsx`
- Bestehende Dateien:
  - `src/components/configurator/ProfileWorkbench2D.tsx` (große Refactorierung — vier Reihen → eine Reihe + Side-Switcher; Drag-Maßlinien; Validierungs-Styling; Quick-Actions integrieren)
  - `src/pages/ProfileConfigurator.tsx` (Sidebar in Accordion umbauen; Mobile-Drawer; Floating Card statt Inline-Preis)
  - `src/index.css` (`--primary` auf #2D89C7 anpassen)
  - `src/lib/profile-configurator-types.ts` (`MIN_EDGE_DISTANCE` exportieren)
- Bestehende Tools (Tool-Palette, Liste-Dialog, Detail-Zoom, Stirnseiten-Panels) bleiben erhalten und werden in die neue Fokus-Ansicht integriert.
- Keine Änderungen an Backend, Pricing-Logik oder Datenmodell.

## Credits-Schätzung

Genaue Credit-Kosten kann ich nicht vorhersagen — der Verbrauch in Build-Mode ist nutzungsabhängig (Komplexität, Iterationen, Datei-Reads/Writes). Für die Größenordnung dieses Refactorings (~4 neue Komponenten, 3 größere Datei-Umbauten, responsive Layout, neues Theme-Token, mehrere Iterationsrunden zu erwarten) ist es ein **mittelgroßes bis großes Feature**. Plan-Modus selbst kostet 1 Credit pro Nachricht. Den aktuellen Stand siehst du im Workspace-Menü oben links bzw. unter Settings → Plans & Credits.
