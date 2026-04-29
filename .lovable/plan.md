## Ziel

Den **Profil-/Zuschnittskonfigurator** exakt auf den Stand von Commit `a5c127a` (vor 2 Tagen) zurücksetzen. Der **Fördertechnik-Konfigurator** und der asynchrone Mailversand der Edge-Function bleiben unverändert.

## Befund nach Vergleich mit GitHub

Von den 4 relevanten Dateien des alten Commits ist nur **eine** verändert:

| Datei | Status |
|---|---|
| `src/lib/profile-configurator-types.ts` | identisch (MD5 match) — nichts zu tun |
| `src/components/configurator/ProfileViewer3D.tsx` | identisch — nichts zu tun |
| `src/lib/i18n.ts` | identisch — nichts zu tun |
| `src/pages/ProfileConfigurator.tsx` | **verändert** (alt 698 Z., neu 682 Z.) |

Außerdem existieren im jetzigen Code zwei Dateien, die im alten Commit **nicht** vorhanden waren:
- `src/components/configurator/ProfileViewer2D.tsx`
- `src/components/configurator/ProfileInquiryDialog.tsx`

## Was geändert wird

### 1. `src/pages/ProfileConfigurator.tsx` → 1:1 durch alte Version ersetzen
Konkrete Rückbau-Punkte (entsprechen exakt dem Diff):
- Import wieder auf **`lazy` + `Suspense`** umstellen, `ProfileViewer3D` als Lazy-Import
- Imports von `ProfileInquiryDialog` und `ProfileViewer2D` **entfernen**
- State `inquiryOpen` **entfernen**
- `sendInquiry()` wieder auf **`mailto:`-Link** mit vorgefülltem Body umstellen (öffnet E-Mail-Programm an `info@novamotis.com`)
- Im Hauptbereich `<ProfileViewer2D … />` **ersetzen durch** `<Suspense><ProfileViewer3D … /></Suspense>` (3D-Vorschau)
- Button-Text wieder auf **„Anfrage per E-Mail senden"**
- `<ProfileInquiryDialog … />` am Ende der Komponente **entfernen**

### 2. Verwaiste Dateien löschen
Da `ProfileConfigurator.tsx` sie nach dem Rückbau nicht mehr referenziert:
- `src/components/configurator/ProfileViewer2D.tsx` löschen
- `src/components/configurator/ProfileInquiryDialog.tsx` löschen

### 3. Alles andere bleibt unangetastet
**Nicht** angefasst werden:
- `src/pages/BeltConfigurator.tsx` und alle `Step*.tsx` (Dimensions, BeltSpeed, Drive, Stand, Summary)
- `ConveyorPreview.tsx`, `ConveyorViewer3D.tsx`
- `supabase/functions/send-inquiry/index.ts` (asynchroner Mailversand bleibt für die Fördertechnik aktiv)
- Alle DB-Migrations und das ID-Format `FT-YYYYMMDD-INDEX`
- `i18n.ts`, `profile-configurator-types.ts`, `ProfileViewer3D.tsx` (sind ohnehin schon auf altem Stand)

## Auswirkung für dich

- Der Profil-/Zuschnittskonfigurator zeigt wieder die **3D-Vorschau** wie früher
- Der „Anfrage senden"-Button öffnet wieder das **E-Mail-Programm** mit vorbefüllter Nachricht (kein Dialog, keine Edge-Function-Anfrage über die Profilseite)
- Der Fördertechnik-Konfigurator bleibt so, wie er heute ist — inklusive des verbesserten asynchronen Mailversands

## Technischer Anhang

Dateien werden direkt aus `https://raw.githubusercontent.com/Tuemian/belt-configurator/a5c127acd50078fdf903f4dd3010ccb0465561e2/src/pages/ProfileConfigurator.tsx` übernommen (bereits lokal in `/tmp/old/` vorliegend, 698 Zeilen). Die zwei zu löschenden Komponenten werden vor dem Löschen mit `rg` nochmal auf andere Importer geprüft — falls irgendwo sonst referenziert, fasse ich vorher Rücksprache.
