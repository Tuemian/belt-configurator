## Ziel

Den **Profilzuschnitt-Konfigurator** vollständig auf den Stand von Commit `c1413f5` zurücksetzen (alte 2D-Workbench-Visualisierung mit Querschnitts-Editor, Onboarding und eigenem PDF-/Anfrage-Dialog). Der **Fördertechnik-Konfigurator** und die gemeinsame Backend-Infrastruktur bleiben **unverändert**.

## Was sich seit c1413f5 verändert hat

Ein Vergleich der Profil-Dateien im Commit `c1413f5` mit dem aktuellen Stand zeigt: Der Profilzuschnitt-Konfigurator wurde nach `c1413f5` stark vereinfacht. Mehrere Komponenten wurden gelöscht, andere komplett neu geschrieben.

| Datei | c1413f5 | aktuell |
|---|---|---|
| `src/pages/ProfileConfigurator.tsx` | 24,5 KB / reichhaltig | 698 Zeilen / vereinfacht |
| `src/components/configurator/ProfileViewer3D.tsx` | 12,5 KB | 283 Zeilen / vereinfacht |
| `src/components/configurator/ProfileCrossSection2D.tsx` | 10,6 KB | **fehlt** |
| `src/components/configurator/ProfileWorkbench2D.tsx` | 55,6 KB | **fehlt** |
| `src/components/configurator/ProfileInquiryDialog.tsx` | 12,3 KB | **fehlt** |
| `src/components/configurator/ProfileOnboarding.tsx` | 3,5 KB | **fehlt** |
| `src/lib/profile-pdf.ts` | 30,5 KB | **fehlt** |
| `src/lib/profile-configurator-types.ts` | 16,4 KB | 193 Zeilen / vereinfacht |

Außerdem in `c1413f5` vorhanden, im aktuellen Repo nicht: zwei GLB-Modelle unter `public/models/profiles/` und zwei STEP-Dateien unter `step-solid-service/profile/`.

## Plan

### 1. Dateien aus `c1413f5` direkt von GitHub holen und ins Projekt übernehmen

Per `curl https://raw.githubusercontent.com/Tuemian/belt-configurator/c1413f5320e9caeb0d8572e5e5ef6402a357cbf8/<pfad>`:

**Überschreiben:**
- `src/pages/ProfileConfigurator.tsx`
- `src/components/configurator/ProfileViewer3D.tsx`
- `src/lib/profile-configurator-types.ts`

**Neu anlegen (aktuell gelöscht):**
- `src/components/configurator/ProfileCrossSection2D.tsx`
- `src/components/configurator/ProfileWorkbench2D.tsx`
- `src/components/configurator/ProfileInquiryDialog.tsx`
- `src/components/configurator/ProfileOnboarding.tsx`
- `src/lib/profile-pdf.ts`

**Binär-Assets neu anlegen:**
- `public/models/profiles/1108038_profil_a8_40x40_leicht.glb`
- `public/models/profiles/1108055_profil_a8_80x40_leicht.glb`
- `step-solid-service/profile/1108038_profil_a8_40x40_leicht.step`
- `step-solid-service/profile/1108055_profil_a8_80x40_leicht.step`
- `step-solid-service/profile/README.md`

### 2. Kompatibilitäts-Check nach dem Zurückschreiben

Nur falls die alten Dateien neue Imports/Calls erwarten, die heute nicht mehr existieren, kleinste Anpassungen vornehmen:

- **shadcn/ui-Komponenten**, **`@/integrations/supabase/client`**, **`use-toast`**, **`use-language`**, **`i18n`**, **`pricing`** prüfen — alle sollten weiterhin verfügbar sein.
- **`profile-pdf.ts`** nutzt vermutlich `jspdf` / `jspdf-autotable`. Falls nicht installiert: `bun add jspdf jspdf-autotable` (das sind Frontend-Libraries, keine Backend-Änderung).
- **`ProfileInquiryDialog`**: Ruft mit hoher Wahrscheinlichkeit die existierende `send-inquiry` Edge Function auf — diese existiert weiterhin und wird **nicht** verändert.
- **`reserve-configurator-reference`** (nach c1413f5 hinzugekommen): wird im alten `ProfileConfigurator.tsx` nicht referenziert. Heißt: nach dem Revert hat der Profil-Konfigurator **keine fortlaufende Referenz-ID mehr**. Das ist die logische Konsequenz aus „Stand c1413f5". Der Fördertechnik-Konfigurator behält die Referenz-ID weiterhin.

### 3. Routing prüfen

`src/App.tsx` lädt `ProfileConfigurator` per `React.lazy`. Pfad und Default-Export bleiben gleich → kein Eingriff nötig.

### 4. Was explizit NICHT angefasst wird

- `src/pages/BeltConfigurator.tsx`
- alle `Step*.tsx` (Dimensions, BeltSpeed, Drive, Stand, Summary)
- `ConveyorViewer3D.tsx`, `ConveyorPreview.tsx`, `conveyor-3d-library.ts`
- `src/lib/configurator-share.ts`, `src/lib/configurator-types.ts`, `src/lib/pricing.ts`, `src/lib/step-export.ts`
- `supabase/functions/send-inquiry`, `supabase/functions/reserve-configurator-reference`
- alle Migrations, `supabase/config.toml`
- `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/Auth.tsx`, Auth-Flow
- Hero-Bild- und Code-Splitting-Optimierungen

### 5. Verifikation

- Build ausführen lassen, Konsole auf fehlende Imports prüfen.
- Vorschau: `/profile-konfigurator` (oder die jeweilige Route) öffnet die alte Workbench-Ansicht mit 2D-Querschnitt + 3D-Viewer + Onboarding-Dialog.
- `/belt-konfigurator` öffnet unverändert den 5-Step-Wizard mit Reservierungs-ID, Anfrage-Versand und PDF-Download.

## Hinweise zu Risiken

- **PDF-Generator** (`profile-pdf.ts`) ist groß (30 KB). Falls darin Imports auf seitdem entfernte Helpers verweisen, muss ich das beim Reintegrieren nachziehen — wird beim Build sofort sichtbar.
- **GLB/STEP-Dateien** werden aus dem Repo via raw-URL geholt; sie sind binär und müssen mit `curl -o` als Binärdaten gespeichert werden.
- Die alte `profile-configurator-types.ts` definiert deutlich mehr Typen als die heutige. Das überschreibt das aktuelle `PROFILE_SECTIONS`-Schema vollständig — gewünschtes Verhalten gemäß Anweisung „kompletter Stand c1413f5".
