## Konfigurator-Analyse (kurz)

**Stark:**
- Klarer 5-Schritt-Wizard mit gutem Progress-Indikator und Mobile-Tab-Navigation.
- Saubere Trennung von Daten (`ConveyorConfig`), 3D-Library (`conveyor-3d-library.ts`) und Render-Schicht (`ConveyorViewer3D.tsx`).
- Mehrsprachig (DE/EN/IT), STEP-/PDF-Export, Anfrage-Versand und Fallback-Geometrie wenn GLBs fehlen – sehr robust.
- MOTIS40/MOTIS80-Logik bereits über `frameWidth > 500` integriert und in der Library als Variant-Rules sauber abgebildet.

**Schwächen / Empfehlungen (umgesetzt im Plan unten):**
1. Direktantrieb rechts ist um 180° verdreht (Motor zeigt nach oben statt unten) – Bug.
2. Das Band wird aktuell als ein durchgehender Block gerendert. Realistischer wäre, es aus den eigentlichen Aluminium-Seitenprofilen + Querstreben zu bauen, sodass MOTIS40 ↔ MOTIS80 sichtbar wechselt.
3. Es fehlt eine vierte, in der Praxis sehr nachgefragte Antriebsvariante: **Trommelmotor**.
4. Es gibt keinen indikativen Preis – Kunden wollen früh eine Hausnummer.
5. Komponenten-Workflow für eigene STEP-Dateien (Umlenkeinheit, Antriebe usw.) ist unklar dokumentiert.

---

## Geplante Änderungen

### 1. Motorstellung Direktantrieb rechts (180°-Bug)
In `src/lib/conveyor-3d-library.ts` (Block `if (config.driveType === 'direct')`, ca. Zeile 539-566) wird der zusätzliche `rotateAroundLocalXAxis(finalRot, Math.PI)` für die rechte Seite umgekehrt bzw. entfernt, sodass `motorAngle = 0°` den Motor nach unten zeigt – konsistent mit der linken Seite. Verifizierung mit allen vier Stellungen (0/90/180/270).

### 2. 3D-Vorschau: Band aus Aluminium-Profilen
In `ConveyorViewer3D.tsx` wird das einzelne Frame-Box-Paar (Zeile ~961-963) durch eine modulare Konstruktion ersetzt:
- **Zwei Seitenprofile** (links/rechts) – nutzen die bereits in `library.json` hinterlegten `profiles.sideRails` GLBs (40×40 für `frameWidth ≤ 500`, 80×40 für > 500). Skalierung wird über echte Bounding-Box statt fixem Faktor korrigiert, damit die Länge sauber zur Bandlänge passt.
- **Querstreben** alle ~500 mm aus dünneren Profilen (parametrisch als `Box`).
- **Sichtbarer Höhenunterschied** zwischen MOTIS40 (40 mm) und MOTIS80 (80 mm) über die bestehende `usesWideProfile`-Logik, plus Material-Farbe gebürstetes Alu (`#c5cdd6`, metalness 0.7).
- Fallback (Box) bleibt erhalten, falls GLB nicht lädt.

### 3. Trommelmotor als 4. Antriebsart
- `ConveyorConfig.driveType` erweitern: `'direct' | 'indirect' | 'center' | 'drum'`.
- `StepDrive.tsx`: vierte Karte „Trommelmotor / Motore a tamburo / Drum motor" mit Beschreibung „Antrieb integriert in Umlenktrommel".
- Bei `driveType === 'drum'`:
  - Motorstellung-Block ausblenden (gibt es nicht).
  - Stattdessen neuer Block **„Kabelausgang"** mit zwei Optionen: Links / Rechts (mappt auf `motorPosition`).
- 3D-Render: `ParametricDrumMotor` zeigt eine größere, dunklere Umlenktrommel am Bandende mit kleinem Kabelstummel auf der gewählten Seite. Sobald GLB vorhanden, lädt die Library `motors.drum.<left|right>` analog zu Direktantrieb.
- `library.json` und `defaultLibrary` bekommen `motors.drum: { left: [...], right: [...] }` mit Pfad `/models/motors/drum-motor.glb`.
- STEP-Wireframe (`api/_lib/step-wireframe.ts`) und `step-solid-service` ergänzen `'drum'` so, dass kein Außen-Motor exportiert wird.
- i18n: neue Keys `driveDrum`, `driveDrumDesc`, `cableExit`, `cableLeft`, `cableRight` in DE/EN/IT.

### 4. Einzelne STEP-Komponenten reinladen (Drop-Ordner)
Wir legen folgende Struktur an:

```text
public/models/
├── components/
│   ├── deflection-unit/      (Umlenkeinheit)
│   ├── direct-drive/
│   ├── indirect-drive/
│   ├── center-drive/
│   ├── drum-motor/
│   └── README.md             (Anleitung + Naming-Konvention)
└── library.json              (verweist auf neue Pfade)
```

- README erklärt: Datei als `.step/.stp` ablegen → `npm run convert:step <ordner>` ausführen → erzeugt `.glb` mit gleichem Basisnamen → Eintrag in `library.json` ergänzen (Beispiel-Snippet im README).
- Konvertierungs-Script `scripts/convert-step-components.cjs` als generalisierter Wrapper um das vorhandene `scripts/convert-step-floor-elements.cjs`.
- Library erhält ein neues optionales Feld `components.deflectionUnit` und Variants pro Antriebsart, sodass deine STEP-Dateien sofort platziert werden können. Bis dahin greift der Fallback auf die parametrische Trommel/den Box-Motor.
- Workflow für dich: STEP-Datei in den passenden Ordner kopieren, einmal Konvertierung laufen lassen, Pfad in `library.json` eintragen – fertig.

### 5. Indikativer Preis aus Excel – mit „Preis auf Anfrage"-Fallback

**Excel-Datei** `public/pricing/price-list.xlsx`, Tabellenblatt „Components". Spalten: `key`, `label_de`, `label_en`, `label_it`, `price_eur`, `unit` (z.B. `per_meter`, `per_unit`, `per_m2`, `per_mm_width`).

Beispiel-Keys, die wir erwarten:
- `frame_motis40`, `frame_motis80`
- `belt_standard`, `belt_grip`, `belt_heavy_grip`, `belt_food_safe`
- `drive_direct`, `drive_indirect`, `drive_center`, `drive_drum`
- `stand_basic`, `feet_set`, `castor_set`, `floor_bolt_set`, `height_adjust`
- `side_guide`

**Lade-Layer** `src/lib/pricing.ts`:
- Liest die Excel beim ersten Aufruf via `xlsx`-Lib (Browser, kein Backend), cached im Memory.
- Bietet `calculatePrice(config): { status: 'complete' | 'partial' | 'unavailable', total?: number, breakdown: PriceItem[], missingKeys: string[] }`.
- Logik:
  - Für jede aktive Komponente in der Konfiguration wird geprüft, ob in der Excel ein gültiger Preis (> 0, nicht leer) hinterlegt ist.
  - **Alle Preise vorhanden** → `status: 'complete'`, voller Betrag wird angezeigt.
  - **Mindestens ein Preis fehlt** → `status: 'partial'`, **kein Gesamtpreis** wird gezeigt; stattdessen Hinweisbox „Für diese Konfiguration liegt noch kein vollständiger Richtpreis vor – bitte Anfrage senden."
  - **Excel nicht ladbar / leer** → `status: 'unavailable'`, gleicher „Preis auf Anfrage"-Hinweis ohne Liste.
- Komponenten ohne Preis erscheinen im Breakdown mit Badge „auf Anfrage" statt einer Zahl, damit du auf einen Blick siehst, welche Position fehlt.

**UI in `StepSummary.tsx`** – neue Card „Indikativer Preis":
- `complete`: große Summe + ausklappbare Aufstellung + Disclaimer „unverbindlich, finaler Preis nach Anfrageprüfung".
- `partial`: keine Summe, gut sichtbarer Hinweis (Icon + Text) „Preis auf Anfrage – einzelne Komponenten noch nicht hinterlegt", optional Aufstellung mit den bekannten Positionen + „auf Anfrage"-Markierung für die fehlenden.
- `unavailable`: schlichter Hinweis „Preis auf Anfrage" mit CTA-Verweis auf den Anfrage-Button.
- Der Anfrage-Button bleibt in allen Fällen prominent.

**Aktualisierung der Preise:** Du tauschst einfach `public/pricing/price-list.xlsx` aus (kein Code-Deploy nötig). Sobald du eine Zelle füllst, schaltet die UI automatisch von „auf Anfrage" auf den konkreten Preis um. README in `public/pricing/` erklärt Schema und verfügbare Keys.

**i18n-Keys:** `priceIndicative`, `priceTotal`, `priceBreakdown`, `priceDisclaimer`, `priceOnRequest`, `priceOnRequestHint`, `priceItemOnRequest`.

---

## Technische Hinweise

- Neue Dependency: `xlsx` (SheetJS) für das Lesen der Preisliste im Browser.
- Keine Cloud/Backend-Änderung nötig – alles bleibt clientseitig bzw. nutzt die bestehenden Vercel-Funktionen.
- Bestehende Tests laufen weiter; Unit-Tests für Preisberechnung in `src/test/pricing.test.ts` (insbesondere `complete` / `partial` / `unavailable`-Pfade).
- Migration `driveType: 'drum'` ist additiv und bricht keine alten Anfragen.

## Zu klären nach Approval

- Excel-Preisliste befüllst du selbst (Vorlage wird mit allen Keys bereitgestellt, leere Zellen → automatisch „auf Anfrage").
- STEP-Dateien für Trommelmotor / Komponenten kannst du nach Approval direkt in die neuen Ordner legen.
