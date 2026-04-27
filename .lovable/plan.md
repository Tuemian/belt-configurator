## Anpassungen Profilkonfigurator – Plan

### 1. Querschnitt-Ansicht reparieren (nicht mehr abgeschnitten)
**Problem**: Der Mini-Querschnitt oben rechts wird bei breiten Profilen (80×40 etc.) noch abgeschnitten, weil das Container-Padding zu klein ist und der gedrehte SVG die viewBox überschreitet.

**Lösung**:
- In `ProfileWorkbench2D.tsx`: Querschnitt-Box vergrößern (`size` dynamisch nach Profilformat: `Math.max(140, Math.min(180, …))`), Container-Padding erhöhen.
- In `ProfileCrossSection2D.tsx`: PAD von 10 auf 14 erhöhen, damit Beschriftungen (Nutnummern) komplett innerhalb der viewBox liegen.
- 90°-Drehlogik: nur bei wirklich hohen Profilen (h > w * 1.3).

### 2. Alle Ansichten 2D + Bearbeitung direkt darin
**Aktuell**: Es gibt nur die Seitenansicht (ein Slot zur Zeit) + den kleinen Querschnitt + ein Stirnseiten-Overlay.

**Neu**: Im Hauptbereich werden alle 4 Seitenansichten gleichzeitig in einem Tab-/Stack-Layout dargestellt:
- **Layout** (vertikal gestapelt, jede Reihe ist eine Slot-Ansicht):
  - „Nut Oben (A)" – komplette Profilbreite, Bohrungen klickbar
  - „Nut Rechts (B)"
  - „Nut Unten (C)"
  - „Nut Links (D)"
- Jede Reihe ist klickbar → Bohrungen/Verbinder werden direkt in der angeklickten Nut angelegt (vorgewähltes Tool oben).
- Auf der linken Spalte jeder Reihe: kleine Beschriftung „Nut X" + Side-Indikator.
- Bei Multi-Modul-Profilen (80×40 → 2 Spuren auf A und C) jede Spur als eigene Sub-Reihe.
- Die separate Tab-/Knopfleiste „Nut 1, Nut 2, ..." entfällt; die Nut wird durch Klick in der Ansicht ausgewählt.
- **Stirnseiten** (Anfang & Ende) werden als zwei kleine Querschnitt-Ansichten am rechten Rand permanent dargestellt (statt Overlay). Klick auf einen blauen Kernzug = M8-Gewinde toggeln, mit X-Markierung.

### 3. Schrägschnitt-Eingabe wie vorher
**Problem**: Die Checkbox-Aktivierung mit Default 15° ist umständlich.

**Lösung**: Numeric-Input direkt sichtbar (wieder ohne Checkbox), Wert 0 = kein Schnitt, Wertebereich 0–45°. Slider unter dem Input. Beim Slider/Input ist der Standardwert 0; Aktivierung entsteht implizit durch Eingabe > 0.

### 4. Kernzug-Gewinde mit X markieren
**Aktuell**: Aktive Kernzüge werden gelb hinterlegt.

**Neu**: Aktive Kernzüge bekommen ein deutliches **rotes „×"** im Kreis (statt nur Farbumschlag). Funktion bleibt: Klick toggelt das M8-Gewinde an diesem Kernzug. Die Stirnseiten-Querschnitte sind permanent rechts sichtbar (siehe Punkt 2), nicht mehr im Modal.

### 5. 3D-Ansicht entfernen
- `ProfileViewer3D` Block in `ProfileConfigurator.tsx` (Zeilen 440-471) entfernen samt `show3D` State, lazy import und Toggle-Button.
- Frei gewordener Platz wird vom 2D-Bereich genutzt.

### 6. NOVAMOTIS-Artikelnummern statt item24-Codes
- In `profile-configurator-types.ts`: Feld `orderCode` (z. B. „0.0.026.03") wird durch NOVAMOTIS-Artikelnummern ersetzt. Schema: `NM-PRO-{Größe}-{Variante}` (z. B. `NM-PRO-40x40-L`, `NM-PRO-80x80-S`). Falls eine echte Artikelnummern-Liste vorliegt, kann diese später eingespielt werden – ich frage hier vor dem Coden noch nach.
- PDF-Spaltenkopf bleibt „Art.-Nr." (zeigt nun NOVAMOTIS-Code).

### 7. Alle „Alvaris"-Bezeichnungen entfernen
**UI**:
- `ProfileWorkbench2D.tsx`: Tooltip „Alvaris-Nummer" → „Nut-Nummer".
- Kommentare können bleiben, aber sichtbare Strings nicht.

**PDF (`profile-pdf.ts`)**:
- Tabellenkopf „NUT (ALVARIS)" → „NUT".
- Kommentar-Strings im Cross-Section-Block.
- Helper-Beschriftungen.

### 8. PDF-Fußzeile überarbeiten (keine Überschneidungen)
**Problem**: Drei Spalten mit langem Text in 21 mm Höhe – Text läuft in Hintergrundbild und Seitenzahl.

**Lösung**:
- Footer-Höhe von 21 → 28 mm.
- Kleinere Schriftgröße (6.2 → 5.8) und reduzierter `lineHeightFactor` (1.12 → 1.0).
- Spalten neu strukturieren: 4 Spalten statt 3 für bessere Verteilung (Bank | Recht | Geschäftsführung | Kontakt).
- Seitenzahl in eigene Zeile **unter** den Spalten platzieren (statt rechts oben über dem Footer), zentriert.
- Padding links/rechts erhöhen (MARGIN → 12 mm im Footer).

### Technische Details

**Geänderte Dateien**:
- `src/components/configurator/ProfileWorkbench2D.tsx` – komplette Restrukturierung des SVG-Bereichs auf Multi-Slot-Stack, Entfernung Tab-Leiste, Stirnseiten-Querschnitte am rechten Rand (statt Modal).
- `src/components/configurator/ProfileCrossSection2D.tsx` – PAD erhöhen, X-Markierung für aktive Kernzüge.
- `src/pages/ProfileConfigurator.tsx` – 3D weg, Schrägschnitt-Eingabe ohne Checkbox.
- `src/lib/profile-configurator-types.ts` – `orderCode` auf NOVAMOTIS-Schema umstellen.
- `src/lib/profile-pdf.ts` – „Alvaris" raus, Footer-Layout überarbeiten.

**Datenmigration**: Bestehende `EndTreatment.bores` und Bohrungen bleiben kompatibel (keine Schema-Änderung).

### Klärungsfrage vorab
Bevor ich umsetze, eine Frage zu Punkt 6 (Artikelnummern):
- Gibt es eine konkrete NOVAMOTIS-Artikelnummern-Liste (z. B. CSV/Excel) oder soll ich vorerst ein generisches Schema `NM-PRO-{Größe}-{Variante}` verwenden, das später ersetzt werden kann?