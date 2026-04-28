## Problem

Der Button **"Anfrage per E-Mail senden"** im Profil-Konfigurator verwendet aktuell `window.location.href = 'mailto:...'`. Das ist der Grund, warum es nicht funktioniert:

- Auf Geräten ohne konfigurierten Mail-Client passiert nichts.
- Es kann **kein PDF-Anhang** mitgegeben werden (mailto unterstützt keine Attachments).
- Es gibt **keine Speicherung** in Supabase.
- Auf dem Smartphone landet man im falschen Mail-Account.

Im Gurtförderer-Konfigurator funktioniert es bereits sauber über `/api/send-inquiry` (Microsoft Graph) + `/api/create-configuration` (Supabase). Das übertragen wir 1:1 auf den Profil-Konfigurator.

## Lösung im Überblick

1. Statt `mailto:` öffnet der Button einen **Anfrage-Dialog** (Name, Firma, E-Mail, Telefon, Nachricht, Datenschutz-Checkbox) – analog zum Gurtförderer-Step "Summary".
2. Beim Absenden:
   - PDF des aktuellen Warenkorbs wird im Browser generiert.
   - PDF + Formulardaten + Konfigurationsübersicht werden an `/api/send-inquiry` geschickt → es geht eine E-Mail an `office@novamotis.com` (mit PDF-Anhang) **und** eine Bestätigung an den Kunden.
   - Die Konfiguration wird in einer neuen Supabase-Tabelle `profile_configurations` gespeichert.
3. Erfolg/Fehler werden per Toast angezeigt.

## Was wird gebaut

### 1. Profil-PDF-Generator (neu)
Neue Datei `src/lib/profile-pdf.ts` mit `buildProfilePdfBlob(cart, total)`:
- Nutzt `jsPDF` (bereits Dependency).
- NOVAMOTIS-Header mit Logo, Datum, Anfragen-Nr.
- Tabelle aller Warenkorb-Positionen (Profil, Länge, Menge, Bohrungen, Gewinde, Verbinder, Schrägschnitt, Positionspreis).
- Gesamtpreis als Richtwert + Hinweis "unverbindliches Angebot".
- Liefert `Blob` zurück, dazu Helper `getProfilePdfFilename()`.

### 2. Anfrage-Dialog (neu)
Neue Komponente `src/components/configurator/ProfileInquiryDialog.tsx`:
- Shadcn `Dialog` mit Formular: Name*, Firma, E-Mail*, Telefon, Nachricht, Datenschutz-Checkbox*.
- Validierung clientseitig.
- Beim Submit: PDF generieren → base64 → `POST /api/send-inquiry` aufrufen.
- Parallel: `POST /api/create-profile-configuration` für DB-Speicherung.
- Loading-State, Toast-Feedback, Reset nach Erfolg.

### 3. Profil-Konfigurator-Seite anpassen
In `src/pages/ProfileConfigurator.tsx`:
- `sendInquiry` (mailto) entfernen.
- State `inquiryOpen` einführen, Button öffnet den Dialog statt mailto.
- `<ProfileInquiryDialog>` einbinden, bekommt `cart` und `cartTotal` als Props.

### 4. Vercel-API-Route (neu)
Neue Datei `api/create-profile-configuration.ts` (analog zu `create-configuration.ts`):
- Nimmt `{ cart, total, lang }` entgegen.
- Schreibt einen Datensatz pro Anfrage in Supabase-Tabelle `profile_configurations` über die REST-API mit `SUPABASE_SERVICE_ROLE_KEY`.
- Gibt `{ configId }` zurück.

`api/send-inquiry.ts` muss **nicht** geändert werden – die bestehende Route akzeptiert bereits PDF-Attachment + beliebigen `summary`-Text.

### 5. Supabase-Tabelle (Migration)
Neue Tabelle `profile_configurations`:
- `id` (uuid, PK)
- `created_at` (timestamptz, default now)
- `customer_name`, `customer_company`, `customer_email`, `customer_phone` (text)
- `customer_message` (text)
- `lang` (text, 'de'/'en')
- `total_eur` (numeric)
- `items` (jsonb) — komplette Warenkorb-Positionen (Profil-ID, Länge, Menge, Bohrungen, Gewinde, Verbinder, Schnittwinkel, Preis-Breakdown)
- `pdf_filename` (text)

RLS aktiviert. Insert-Policy nur für service_role (über die API-Route). Eine Read-Policy lassen wir vorerst weg – Abruf läuft über Supabase-Dashboard oder eine spätere Admin-Seite.

## Voraussetzungen auf Vercel

Diese Env-Vars müssen auf Vercel bereits gesetzt sein (für Gurtförderer benutzt du sie ja schon):
- `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`
- `INQUIRY_TO_EMAIL` (z.B. `office@novamotis.com`)
- `INQUIRY_FROM_EMAIL`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

→ Da der Gurtförderer-Versand laut deiner Aussage bereits läuft, sollten alle vorhanden sein. Falls die neue Tabelle nicht zugreifbar ist, liegt es nur an den Supabase-RLS-Policies (die Migration richtet das mit ein).

## Geänderte / neue Dateien

**Neu:**
- `src/lib/profile-pdf.ts`
- `src/components/configurator/ProfileInquiryDialog.tsx`
- `api/create-profile-configuration.ts`
- Supabase-Migration für `profile_configurations`

**Geändert:**
- `src/pages/ProfileConfigurator.tsx` (Dialog statt mailto)

## Test-Ablauf nach Umsetzung

1. Profil konfigurieren → Position(en) in den Warenkorb legen.
2. Auf "Anfrage senden" klicken → Dialog öffnet sich.
3. Formular ausfüllen, absenden.
4. Erwartung: 
   - Toast "Anfrage gesendet"
   - Mail mit PDF-Anhang trifft bei `office@novamotis.com` ein
   - Bestätigungsmail beim Kunden
   - Neuer Eintrag in Supabase-Tabelle `profile_configurations`

Soll ich so vorgehen?