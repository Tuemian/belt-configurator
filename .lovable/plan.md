# Profilzuschnitte – Etappe B+C: Nut-Logik, Preise, 3D, Mail & PDF

Großes Update mit klaren funktionalen Verbesserungen. Aufgeteilt in saubere Bausteine.

---

## 1. Nut-basierte Auswahl statt Face-Tabs (UX-Kern)

Aktuell: Tabs „Top / Bottom / Left / Right". Neu: pro Profil-Querschnitt werden die echten Nuten als anklickbare Zonen visualisiert.

- Im 2D-Workbench wird zusätzlich oben rechts ein **Mini-Querschnitt** des Profils angezeigt (kleines SVG, ca. 90 × 90 px).
- Die 4 Nuten sind farbig hinterlegt und mit Buchstaben **A / B / C / D** markiert (Konvention: A=oben, im Uhrzeigersinn).
- Klick auf eine Nut im Mini-Querschnitt → 2D-Workbench springt auf diese Nut.
- Der Tab-Header wird dadurch ersetzt – die Tabs zeigen jetzt **„Nut A (oben) / Nut B (rechts) / Nut C (unten) / Nut D (links)"** und sind synchronisiert mit dem Mini-Querschnitt.
- Bohrungen können auf allen 4 Nuten unabhängig gesetzt werden.
- Bohrungen dürfen sich überschneiden (Validierungs-Block wird entfernt; nur noch eine sanfte Warnung „Bohrungen überlappen" als Info-Badge, nicht blockierend).

## 2. Einschraubverbinder – Regelwerk

- Einschraubverbinder können **nur an den beiden Profilenden** gesetzt werden (Position 0 mm oder Profillänge).
- Pro Nut maximal **2 Verbinder** (einer je Ende).
- In der Toolbox „Verbinder" wird beim Hinzufügen automatisch ans nächstgelegene Ende gesnapt; ein Verbinder lässt sich nur zwischen den beiden Enden hin- und herziehen, nicht frei.
- Im 2D-Workbench werden die beiden Enden als „Magnet-Zonen" sichtbar markiert, sobald man einen Verbinder zieht.
- Die Auswahl **„Kernloch"** wird komplett entfernt (aus dem Bohrungs-Type-Selector und allen Forms).

## 3. Snap-Buttons umbenennen

- `Snap 1` → **Genau** (mm-genau)
- `Snap 5` → **Mittel** (5 mm Raster)
- `Snap 10` → **Grob** (10 mm Raster)
- Mit kleinem Tooltip, der das mm-Raster erklärt.

## 4. Erweiterter Profilkatalog (item24-Anlehnung)

Aktuell vorhanden + neue Profile (alles Nut-8-Familie, Standard-Aluminium-Strangpressprofile):

**Bestehend:** 40×40, 40×80, 80×40, 80×80
**Neu:** 30×30 (Nut 8), 30×60, 40×120, 40×160, 60×60, 80×120, 80×160, 80×240, 40×40 leicht, 40×80 leicht

Total ca. 14 Profile. Jedes Profil bekommt:
- Echte Querschnitts-Geometrie (Außenmaße, Wandstärke, Nutbreite/-tiefe, Kammern)
- Massenpro-Meter und Trägheitsmomente (für spätere Statik-Erweiterung)
- Bestell-Code-Konvention analog item24 (z. B. `0.0.026.03` = 40×40 Nut 8)

## 5. Excel-basierte Preispflege

Erweiterung der bestehenden `public/pricing/price-list.xlsx`:

- Neues Sheet **`Profiles`** mit Spalten:
  `key | label_de | label_en | label_it | price_eur_per_meter | min_cut_eur | cut_fee_eur`
- Neues Sheet **`Machining`** mit Spalten:
  `key | label_de | label_en | label_it | price_eur` (für jede Bohrung-Type, Verbindertyp, Sägeschnitt-Pauschale)
- Falls eine Position fehlt → Anzeige **„Preis auf Anfrage"** + Hinweis-Badge (gleicher Mechanismus wie aktuell beim Gurtförderer-Konfigurator).
- Eine **Beispiel-Excel** mit allen Keys wird vorausgefüllt, sodass du nur Preise eintragen musst.
- Im Repo wird eine `PRICING.md` mit der Key-Liste und Erklärung der Spalten ergänzt.

## 6. 3D-Vorschau – realistisches Parametric + STEP-Slot

**Sofort umgesetzt (Parametric v2):**
- Echte T-Nut-Geometrie (Nutbreite 8 mm, Nuttiefe ~9.4 mm, Hinterschnitt) extrudiert über die Profillänge.
- Innen-Kammer und Wandkonturen aus den realen item24-Maßen pro Profil.
- Bohrungen als echte zylindrische Boolean-Subtractions (CSG via three-bvh-csg).
- Einschraubverbinder als Dummy-Geometrie an den Enden sichtbar.
- Material: gebürstetes Aluminium (anisotrope Highlights, leichte Reflexion).

**Vorbereitung STEP-Import (nachreichbar):**
- Neuer Ordner `public/profile-models/` wird angelegt mit README.
- Konvention: Pro Profil ein `.glb`-File (z. B. `motis-40x40-nut8.glb`). STEP wandelst du via Online-Konverter oder FreeCAD selbst um – ich erkläre den Vorgang in der README.
- Loader prüft beim Rendern: existiert ein GLB → wird verwendet, Bohrungen werden parametrisch reingerechnet. Existiert keins → Fallback auf Parametric v2.
- Du kannst also nach Belieben einzelne Profile mit hochwertigen GLB-Modellen austauschen.

## 7. Mail-Versand identisch zum Gurtförderer-Konfigurator

- Bestehender Endpoint `/api/send-inquiry` wird wiederverwendet (Microsoft Graph an `office@novamotis.com` + Bestätigung an Kunde).
- Validierung, Rate-Limit, Anhang-Limits bleiben unverändert.
- Im Profilzuschnitte-Konfigurator wird das gleiche Anfrage-Formular eingebaut (Name, Firma, E-Mail, Telefon, Nachricht, Datenschutz-Checkbox).
- Anhang ist die unter Punkt 8 erzeugte Multi-Page-PDF.

## 8. Saubere Multi-Page-PDF

Aufbau:

```text
Seite 1:  Inhaltsverzeichnis
  - Kunden-Header (Name, Firma, Datum, Anfragenummer)
  - Tabelle aller Positionen mit Pos-Nr, Profilbezeichnung, Länge, Stückzahl, Bearbeitungen, Einzelpreis, Gesamt
  - Gesamtsumme oder „Preis auf Anfrage"

Seite 2..n:  je 1 Seite pro Position
  - Header: Pos-Nr, Profilname, Bestell-Code
  - Oben links:    3D-Render (perspektivisch, ca. 80×60 mm)
  - Oben rechts:   Querschnitt mit Nut-Beschriftung A/B/C/D
  - Mitte:         2D-Bemaßungszeichnung der gewählten Nut(en) mit allen Bohrungen
                   und Verbindern, vermaßt in mm
  - Tabelle unten: Bohrungsliste (Nut, Position, Typ, Ø, Tiefe, Anmerkung)
                   + Verbinderliste
                   + Preis-Zusammenfassung dieser Position
  - Footer: Seitenzahl X/Y, Anfragenummer
```

- Nutzt `jspdf` + `html2canvas` (beide schon im Projekt).
- 3D-Snapshots werden pro Position vor PDF-Erzeugung gerendert (Three.js `gl.domElement.toDataURL`).
- 2D-Zeichnung wird direkt als SVG → Canvas → PNG eingebettet (saubere Vektorqualität, da SVG vorher gerendert).
- Brand-konform: NOVAMOTIS-Logo, Farben aus `mem://design/branding`.

---

## Technische Umsetzung (für Devs)

### Neue/geänderte Dateien

- `src/lib/profile-catalog.ts` — Erweiterte Profilliste mit Querschnitts-Geometrie, item24-Bestellcodes
- `src/lib/profile-pricing.ts` — Liest `Profiles` + `Machining` Sheets aus `price-list.xlsx`, gleiche Mechanik wie `pricing.ts`
- `public/pricing/price-list.xlsx` — Neue Sheets `Profiles` + `Machining` ergänzt (Excel programmatisch erweitert)
- `public/pricing/PRICING.md` — Dokumentation der Sheet-Struktur und Keys
- `public/profile-models/README.md` — Anleitung für STEP→GLB-Workflow
- `src/components/configurator/ProfileCrossSection2D.tsx` — Neuer Mini-Querschnitt mit klickbaren Nuten A/B/C/D
- `src/components/configurator/ProfileWorkbench2D.tsx` — Tab-Beschriftung auf Nut A–D umstellen, Verbinder-Magnet-Zonen, Kernloch-Type entfernen, Snap-Labels umbenennen, Overlap-Block auf Warning downgraden
- `src/components/configurator/ProfileViewer3D.tsx` — Neuer Three.js-Viewer mit T-Nut-Extrusion + CSG-Bohrungen + GLB-Loader-Fallback
- `src/lib/profile-pdf.ts` — Neuer PDF-Builder mit Inhaltsverzeichnis + 1 Seite pro Position
- `src/pages/ProfileConfigurator.tsx` — Anfrage-Formular einbauen analog StepSummary, Mail-POST an `/api/send-inquiry`
- `src/lib/i18n.ts` — Neue Keys für „Nut A–D", „Genau/Mittel/Grob", „Preis auf Anfrage", Anfrage-Formular-Labels (DE/EN/IT)

### Pakete
- Neu: `three-bvh-csg` (für saubere CSG-Bohrungen im 3D)
- Vorhanden, wiederverwendet: `jspdf`, `html2canvas`, `xlsx`, `three`, `@react-three/fiber`, `@react-three/drei`, `@sentry/node`

### Mail-Endpoint
Keine Backend-Änderung nötig — `/api/send-inquiry` akzeptiert bereits beliebige PDF-Anhänge bis 8 MB. Der neue Konfigurator schickt einfach im gleichen Schema.

---

## Was NICHT in dieser Etappe enthalten ist

- Echte STEP-Geometrie pro Profil (du legst GLB-Files später nach – Slot ist vorbereitet)
- Statik-Berechnung (Trägheitsmomente werden nur als Daten hinterlegt)
- Pattern-Tool / Undo-Redo (kann in einer späteren Etappe nachgezogen werden)

---

## Reihenfolge der Umsetzung

1. Nut-Tabs + Mini-Querschnitt + Kernloch raus + Snap-Rename + Overlap-Warnung statt Block
2. Einschraubverbinder-Regel (nur Enden, max 2 pro Nut)
3. Erweiterte Profilliste + neue Excel-Sheets + Pricing-Loader
4. 3D-Viewer v2 mit T-Nut + CSG-Bohrungen + GLB-Slot
5. Anfrage-Formular + Mail-Versand
6. Multi-Page-PDF mit Inhaltsverzeichnis + Detailseiten

Nach Freigabe wechsle ich in den Build-Mode und arbeite das in dieser Reihenfolge ab.