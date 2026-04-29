## Stellfüße fehlen im Belt-Konfigurator

### Befund

Die Konfigurations-Logik ist eigentlich intakt:
- Default ist `withStand: true`, `floorElement: 'feet'` → Stellfüße sollten standardmäßig sichtbar sein.
- Datei `public/models/floor-elements/foot.glb` existiert (95 KB).
- Render-Pfad: `StepStand` → `ConveyorPreview` → `ConveyorViewer3D` → `ExternalAssetInstances` mit `ParametricFeet` als Fallback.

**Was vermutlich passiert ist:** Bei der letzten Iteration am `floor-bolt`-Feature wurde in `ExternalAssetInstances` (Zeilen 420–468) ein neuer `useMemo`-Block mit Debug-Logs eingebaut. Dabei dürfte eine subtile Regression entstanden sein, die dazu führt, dass `clonedScenes` bei `feet` leer bleibt **und** der Fallback `<ParametricFeet>` ebenfalls nicht greift — vermutlich weil der `useMemo` synchron beim ersten Render leer zurückkehrt und die Komponente in genau dem Moment `null` rendert, ohne erneut zu re-rendern, sobald die GLB-Suspense fertig ist.

Ein zweiter Verdachtspunkt: `useExternalScene` wirft beim Laden Suspense — wenn die feet-GLB durch eine Variante ohne passende `rules` rausgefiltert wird, könnte `selectVariant` undefined liefern und das gesamte Asset verschwindet stillschweigend.

### Vorgehen

Ich werde im Default-Modus folgendermaßen vorgehen:

1. **Live reproduzieren**: Browser-Konsole öffnen auf `/belt-conveyor`, Schritt 4 ansteuern, prüfen, ob:
   - das `foot.glb`-Netzwerk-Request 200 zurückgibt
   - die `ExternalAssetInstances`-Logs für `feet` etwas ausgeben (aktuell nur `floor-bolt` geloggt)
   - der Fallback `ParametricFeet` (graue Boxen) sichtbar ist oder gar nichts angezeigt wird

2. **Debug-Logs erweitern** (temporär) auch für `feet`, damit klar wird, ob das GLB lädt oder der Fallback greift.

3. **Ursache fixen** — je nach Befund eine der folgenden Korrekturen:
   - **Wenn GLB nicht lädt**: Cache-Buster bei `foot.glb?v=4` auf `v=5` erhöhen oder URL-Pfad korrigieren.
   - **Wenn `clonedScenes` leer bleibt trotz geladener Scene**: `ExternalAssetInstances` so umstellen, dass beim ersten Render mit asynchron noch nicht geladener Scene **immer** der Fallback gerendert wird (statt `null`).
   - **Wenn `selectVariant` undefined liefert**: Sicherstellen, dass die `feet`-Variante mit leerem `rules: {}` immer matched (defensive Default-Auswahl der ersten Variante).

4. **Debug-Logs wieder entfernen** und QA: alle 4 Kombinationen testen — Stellfüße ohne Bolts, Stellfüße mit Bolts, Castors, ohne Stand.

### Technische Details

Betroffene Dateien:
- `src/components/configurator/ConveyorViewer3D.tsx` — `ExternalAssetInstances`, ggf. Render-Logik bei `floorElement === 'feet'`
- `src/lib/conveyor-3d-library.ts` — falls `selectVariant` defensiver werden muss
- ggf. `public/models/library.json` — Cache-Buster

Keine Änderungen an: Default-Config, `StepStand`-UI, Fördertechnik-Stepper.

Soll ich loslegen?