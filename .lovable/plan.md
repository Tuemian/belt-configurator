## Ziel
Konfigurations-IDs (Format `FT-YYYYMMDD-NNN`) sollen:
1. **Erst beim PDF-Download oder Anfragen-Versand** vergeben werden — vorher keine ID, kein API-Call.
2. **PDF und Anfrage derselben Konfiguration** dieselbe fortlaufende ID erhalten.
3. **Race-sicher** sein (auch bei gleichzeitigen Klicks eindeutig fortlaufend).
4. In Supabase **nachvollziehbar** sein (eigene Tabelle mit Status PDF / Anfrage).

## 1. Datenbank (Migration)

**Neue Tabelle `public.configurator_references`:**
- `id uuid pk default gen_random_uuid()`
- `reference text unique not null` (z. B. `FT-20260506-007`)
- `tool text not null check (tool in ('belt','profile'))`
- `configuration jsonb not null default '{}'`
- `lang text not null default 'de'`
- `pdf_downloaded_at timestamptz`
- `inquiry_sent_at timestamptz`
- `created_at timestamptz not null default now()`
- RLS aktiviert, **keine** öffentlichen Policies (nur Service-Role darf schreiben/lesen — wie bei den Inquiry-Tabellen).

**Atomare Reservierungsfunktion `public.reserve_configurator_reference(_tool text, _config jsonb, _lang text)`:**
- `SECURITY DEFINER`, `search_path = public`
- Holt `pg_advisory_xact_lock(hashtext('configurator_ref:' || to_char(now() AT TIME ZONE 'Europe/Zurich','YYYYMMDD')))` → serialisiert Zugriffe pro Tag, kein Doppelvergabe-Risiko.
- Berechnet `next_idx = COALESCE(MAX(...), 0) + 1` über `belt_inquiries`, `profile_inquiries` **und** `configurator_references` (damit alle Quellen lückenlos im selben Zähler).
- Insert in `configurator_references` mit fertiger `reference`, gibt diese zurück.

**`generate_inquiry_reference()` anpassen:** zusätzlich `configurator_references` in den UNION einbeziehen, damit die Inquiry-Trigger keine Kollision erzeugen, falls dort doch noch eine Referenz separat erzeugt wird.

## 2. Edge Function `reserve-configurator-reference`

Neue Function (`supabase/functions/reserve-configurator-reference/index.ts`):
- Input: `{ tool: 'belt'|'profile', config: object, lang: 'de'|'en'|'it' }` (Zod-validiert).
- Ruft `supabase.rpc('reserve_configurator_reference', ...)` mit Service-Role auf.
- Gibt `{ reference: 'FT-20260506-007' }` zurück.
- CORS aktiviert, `verify_jwt = false` (öffentlich nutzbar wie der Konfigurator).

## 3. Frontend — `src/lib/configurator-share.ts`

- `getOrReserveCurrentConfiguratorId`, `reserveNewCurrentConfiguratorId`, `getOrCreateCurrentConfiguratorId`, `createNewCurrentConfiguratorId` und der `sessionStorage`-Key entfernen.
- Neue Funktion `requestConfiguratorReference(tool, config, lang)`: ruft `supabase.functions.invoke('reserve-configurator-reference', ...)` auf, gibt frische Referenz zurück. Lokaler Fallback nur, wenn der Call fehlschlägt (deterministisch ohne Persistenz, klar als Fallback markiert mit Suffix `-LOCAL`).
- `clearSharedConfiguratorStateFromUrl` ohne `sessionStorage`-Zugriff.

## 4. Frontend — `src/pages/BeltConfigurator.tsx`

- Beide `void reserveNewCurrentConfiguratorId(defaultConfig)`-Aufrufe (Mount & `handleReset`) ersatzlos entfernen.
- In `handleReset` zusätzlich den Cache der „aktuellen Referenz" (siehe StepSummary) zurücksetzen, damit nach Reset die nächste Aktion eine neue ID zieht.

## 5. Frontend — `src/components/configurator/StepSummary.tsx`

- State `configIdentity` und sein Effect entfernen.
- Neuen Ref/State `currentReferenceRef` einführen, der pro Konfigurations-Snapshot (Hash) die einmal vergebene Referenz cached:
  - `useEffect([config])` setzt den Cache zurück, wenn sich `config` ändert → bei geänderter Konfiguration neue ID bei nächster Aktion.
- Helper `ensureReference()`:
  - Wenn Cache vorhanden → zurückgeben.
  - Sonst `requestConfiguratorReference('belt', config, lang)` aufrufen, im Cache speichern, plus SHA-256 des Configs als `fullHash` berechnen.
- `handleDownloadPdf`:
  - Ruft `ensureReference()` → identische ID für späteren Anfragen-Versand.
  - Setzt nach erfolgreichem Download `pdf_downloaded_at` per kleinem Backend-Call (Edge Function `mark-configurator-reference` ODER direkt zweiter RPC `mark_configurator_pdf(reference)` mit Service-Role über die bestehende reserve-Function aufgerufen — Variante: einfacher Endpoint `mark-configurator-reference` mit `{ reference, action: 'pdf'|'inquiry' }`).
  - Toast: „PDF heruntergeladen — ID FT-20260506-007".
- `handleSubmit`:
  - Ruft `ensureReference()` → falls vorher PDF gezogen wurde, dieselbe ID; sonst neue.
  - Übergibt die Referenz im `send-inquiry`-Body als `reference`-Feld → `send-inquiry` schreibt sie in `belt_inquiries.reference` (statt vom Trigger generieren zu lassen) und ruft `mark-configurator-reference` mit `action: 'inquiry'` auf.
- Anzeige in der Summary-Spalte:
  - Solange noch keine ID vergeben ist: Platzhalter „wird beim PDF-Download oder bei der Anfrage vergeben" (DE/EN/IT).
  - Sobald eine ID im Cache liegt: ID anzeigen.

## 6. Edge Function `send-inquiry` anpassen

- Akzeptiert optional `reference` im Request-Body.
- Wenn vorhanden, wird sie beim Insert in `belt_inquiries` / `profile_inquiries` gesetzt (Trigger lässt vorhandene Referenz unverändert — das ist heute schon so).
- Nach erfolgreichem Insert ruft die Function `update configurator_references set inquiry_sent_at = now() where reference = $1`.

## 7. Aufräumen

- `api/create-configuration.ts` und der zugehörige Frontend-Aufruf werden nicht mehr benutzt → können entfernt werden (oder bleiben unbenutzt, wenn anderswo referenziert; prüfen).

## Verhalten danach

- Konfigurator öffnen → keine ID, kein DB-Eintrag.
- Schritte durchklicken → keine ID.
- „PDF herunterladen" → frische, atomar reservierte ID (z. B. `FT-20260506-007`), Eintrag in `configurator_references` mit `pdf_downloaded_at`. Toast zeigt ID.
- Direkt danach „Anfrage senden" → **dieselbe** ID `FT-20260506-007`, in `belt_inquiries.reference`, Update `inquiry_sent_at` in `configurator_references`.
- Konfiguration ändern → nächste Aktion bekommt neue ID.
- Zwei Personen klicken gleichzeitig → durch Advisory-Lock garantiert unterschiedliche, fortlaufende IDs (z. B. 007 / 008).
- In Supabase Tabelle `configurator_references`: jede ID + Status (PDF? Anfrage? beides?) + Konfiguration einsehbar.
