## Ziel

Den bestehenden Profil-Konfigurator zu einem visuell und ergonomisch erstklassigen "Profilzuschnitte"-Tool ausbauen — angelehnt an das item24 Machining Tool, aber schlanker, im NOVAMOTIS-Branding und mit dem bereits bestehenden 3D-Viewer.

---

## Analyse: Was item24 gut macht

Das item24 Machining Tool setzt auf folgende Kernprinzipien, die wir gezielt übernehmen sollten:

1. **2D-Arbeitsfläche im Vordergrund.** Die Hauptbühne ist eine maßstabsgetreue 2D-Seitenansicht des Profils mit einer **Lineal-Leiste** (mm-Skala). Die 3D-Ansicht ist sekundär.
2. **Klick-zum-Setzen + Drag-zum-Verschieben.** Bohrungen werden direkt auf der Profil-Seitenansicht per Klick erzeugt und per Maus entlang der Profilachse verschoben. Während des Drags zeigt eine **Live-Bemaßungslinie** den Abstand zum Profilstart und/oder zur nächsten Bohrung.
3. **Snap-Raster.** Standardmäßig snappen Bohrungen auf 1 mm / 5 mm / 10 mm sowie auf logische Punkte (Profilmitte, Endabstand 10/15/20 mm, andere Bohrungen). Snap toggelbar mit `Shift`.
4. **Face-Wahl per Tab.** Oben/Unten/Links/Rechts werden als Tabs über der 2D-Ansicht gewählt — das gewählte Face wird sichtbar (alle vier Faces als 4 separate Strips übereinander).
5. **Inline-Properties.** Klick auf eine Bohrung öffnet ein kleines Popover direkt am Element: Typ, Position, Durchmesser, Löschen. Kein Wechseln in eine separate Liste nötig.
6. **Symmetrie-/Pattern-Tools.** Einzelne Bohrungen, Reihen (n-fach mit Abstand) und Spiegelung über Profilmitte mit einem Klick.
7. **Klar getrennte Schritte oben:** Profil wählen → Länge → Bearbeitung → Verbinder → Zusammenfassung. Aber alles auf einer Seite, nicht als Wizard.

---

## Was wir umsetzen

### 1. Rebranding "Aluminium-Profile" → "Profilzuschnitte"

- `i18n.ts`: alle drei Sprachen anpassen
  - DE: `Profilzuschnitte`
  - EN: `Profile Cuts`
  - IT: `Tagli di profilo`
- Kachel auf `Index.tsx` und Header-Untertitel in `ProfileConfigurator.tsx` aktualisieren.
- Beschreibung leicht schärfen ("Maßgeschneiderte Profilzuschnitte mit Bohrungen, Gewinden und Verbindern …").

### 2. Neue 2D Drag-&-Drop Arbeitsfläche (`ProfileWorkbench2D.tsx`)

Ersetzt die aktuellen Bohrungs-/Verbinder-Formulare in der Sidebar durch eine interaktive Bühne im Hauptbereich.

**Layout-Umbau** (`ProfileConfigurator.tsx`):

```text
┌──────────────────────────────────────────────────────────────────┐
│  Header (Logo · Profilzuschnitte · Warenkorb)                    │
├─────────────┬────────────────────────────────────────────────────┤
│             │  ┌─ Tabs: Oben | Unten | Links | Rechts ─────┐    │
│  Sidebar    │  │                                            │    │
│  (verschlankt)│ │  2D Workbench — maßstabsgetreu             │    │
│             │  │  ┌──────────────────────────────────┐      │    │
│  Profil     │  │  │ Lineal 0 ───── 250 ───── 500 mm  │      │    │
│  Länge      │  │  │ ┌──────────────────────────────┐ │      │    │
│  Schräg-    │  │  │ │  Profil-Side-View            │ │      │    │
│  schnitte   │  │  │ │  ●----●         ●            │ │      │    │
│  Stirnseiten│  │  │ │  D5,5 D8,5      M8           │ │      │    │
│  Verbinder- │  │  │ └──────────────────────────────┘ │      │    │
│  Palette    │  │  └──────────────────────────────────┘      │    │
│             │  │  Tools: + Bohrung  ⇆ Spiegel  ⇲ Reihe     │    │
│             │  └────────────────────────────────────────────┘    │
│             │  3D-Vorschau (kollabierbar, ½ Höhe)                 │
├─────────────┴────────────────────────────────────────────────────┤
│  Preisleiste · In den Warenkorb                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Interaktionen:**
- **Hovern** über Profil zeigt Cursor-Linie + Live-mm-Wert.
- **Klick** mit aktivem Bohrungstyp setzt eine Bohrung an Hover-Position (auf Snap gerundet).
- **Drag** auf bestehender Bohrung verschiebt entlang der Profilachse, mit Live-Bemaßung zu Start/Ende/Nachbar-Bohrung.
- **Klick** auf Bohrung öffnet Popover (Typ ändern, Position numerisch, Duplizieren, Spiegeln, Löschen).
- **Doppelklick** auf Lineal: Bohrung exakt an Klickposition.
- **Snap-Toggle** (Buttons 1/5/10 mm + "Aus"); Snap-Punkte: Profil-Mitte, 10/15/20 mm Endabstand, andere Bohrungen ±0.
- **Pattern-Tool**: ausgewählte Bohrung n-fach im Abstand X kopieren.
- **Spiegel-Tool**: Bohrung um Profilmitte spiegeln.
- **Verbinder** werden auf gleicher Bühne gesetzt — als andersfarbige Marker (silber statt blau).

### 3. Visuelle Aufwertung

- **Profil-Seitenansicht** als saubere SVG-Darstellung (graue Aluminiumfläche, T-Nut-Schraffur erkennbar, Schrägschnitte als geschnittene Kanten).
- **Bohrungs-Marker** mit Farbcodierung: Standard = dunkelgrau, Gewinde = gold, Stufenbohrung = blau, Kernloch = hellgrau (gleiche Farben wie 3D-Viewer für Konsistenz).
- **Lineal** mit Major/Minor-Ticks, automatisch skaliert je Profil-Länge.
- **Hover-Tooltip** mit Bohrungs-Label & Position.
- **Stirnseiten-Bearbeitung** (Gewinde/Kernloch) als kleine Symbole an den Profil-Enden direkt sichtbar.
- **Schrägschnitt** wird in 2D durch geneigte End-Kanten dargestellt (entspricht dem 3D-Modell).
- 3D-Viewer bleibt erhalten, aber kompakter unter der 2D-Bühne (kollabierbar via Toggle).
- Sidebar wird schlanker: nur noch Profil/Länge/Stirnseiten/Schrägschnitte/Menge — Bohrungen & Verbinder wandern in die Workbench.

### 4. UX-Politur

- Tastenkürzel: `B` = Bohrungs-Tool, `V` = Verbinder, `Esc` = Auswahl aufheben, `Del` = ausgewählte Bohrung löschen, `Ctrl+D` = duplizieren, `Ctrl+Z` = Undo (einfache History).
- Mini-Hilfe-Overlay (Fragezeichen-Button) mit den wichtigsten Aktionen.
- Bohrungstypen als visuelle Palette (Buttons mit Symbol + Label) statt Dropdown.

---

## Technische Umsetzung

**Neue Dateien:**
- `src/components/configurator/ProfileWorkbench2D.tsx` — SVG-basierte 2D-Bühne mit Lineal, Face-Tabs, Drag-&-Drop, Snap, Popover.
- `src/components/configurator/HoleEditPopover.tsx` — Inline-Editor für selektierte Bohrung.
- `src/hooks/use-profile-history.ts` — kleine Undo/Redo-State-Maschine (Stack der `ProfileConfig`).

**Geänderte Dateien:**
- `src/pages/ProfileConfigurator.tsx`
  - Neuer Layout-Aufbau (siehe ASCII oben).
  - Bohrungs- & Verbinder-Formulare in der Sidebar entfernen, stattdessen nur Werkzeug-Palette.
  - Workbench eingebunden, 3D-Viewer kollabierbar.
- `src/lib/profile-configurator-types.ts`
  - `ProfileHole` um optionales `pattern?: { count: number; spacing: number }` erweitern (für Reihen).
  - Snap-Konstanten (`SNAP_OPTIONS = [1, 5, 10]`).
- `src/lib/i18n.ts`
  - Rebrand-Keys: `hubToolProfileTitle`, `hubToolProfileDesc`, neue Workbench-Strings (Snap, Spiegeln, Reihe, Tools, Tabs).
- `src/pages/Index.tsx` — Übersetzungs-Keys werden automatisch aktualisiert (kein Strukturwechsel).
- `src/components/configurator/ProfileViewer3D.tsx` — kleinere Container-Anpassung für die kompaktere Höhe.

**SVG-Workbench Details:**
- ViewBox skaliert automatisch: `viewBox="0 0 ${length+padding} ${profileHeight+padding}"` mit `preserveAspectRatio="xMidYMid meet"`.
- Pointer-Events: `onPointerDown` auf Bohrung → drag-State; `onPointerMove` auf SVG → Position berechnen über `getScreenCTM().inverse()`; `onPointerUp` → fixieren.
- Snap-Logik: `Math.round(rawMm / snap) * snap`, danach Snap-Punkte (Mitte, Endabstände, andere Bohrungen) mit Toleranz < 3 mm überschreiben.
- Performance unkritisch (max. ~50 Bohrungen, einfaches SVG).

**Was unverändert bleibt:**
- Preislogik (`calculateProfilePrice`)
- 3D-Viewer-Engine
- Warenkorb / Anfrage-Mail
- Konfiguratorrouten

---

## Lieferung in zwei Etappen

**Etappe A (dieser Lauf):**
1. Rebrand "Profilzuschnitte" überall.
2. Neue 2D-Workbench mit Face-Tabs, Lineal, Klick-zum-Setzen, Drag-zum-Verschieben, Snap, Inline-Popover.
3. Sidebar verschlankt, 3D-Viewer kollabierbar darunter.
4. Verbinder als Marker auf gleicher Bühne.

**Etappe B (folgender Lauf nach Freigabe von A):**
5. Pattern-Tool (Reihe), Spiegel-Tool, Tastenkürzel, Undo/Redo, Hilfe-Overlay.

So bekommst du nach Etappe A schnell das Kern-Erlebnis und kannst entscheiden, ob Etappe B noch Politur braucht oder anders priorisiert werden soll.
