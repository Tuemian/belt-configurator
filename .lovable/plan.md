## Problem & Diagnose

In der Lovable-Vorschau-URL gibt der Aufruf `POST /api/send-inquiry` einen **404** zurück. Grund: Die Datei `api/send-inquiry.ts` ist eine **Vercel Serverless Function** und läuft nur, wenn die App auf Vercel gehostet ist. Die Lovable-Preview-URL (`*.lovableproject.com`) hat keinen Node-Server, deshalb existiert die Route dort nicht.

Damit der Versand **überall** funktioniert (Lovable-Vorschau, Lovable-Published-URL, ggf. auch Vercel), bauen wir auf **Lovable Cloud + Resend** um.

## Was sich ändert

| Vorher (Vercel) | Nachher (Lovable Cloud) |
|---|---|
| `api/send-inquiry.ts` (Microsoft Graph) | Edge Function `send-inquiry` (Resend) |
| `api/create-configuration.ts` | Edge Function `create-configuration` (direkt Supabase) |
| Aufruf via `fetch('/api/send-inquiry')` | Aufruf via `supabase.functions.invoke('send-inquiry')` |
| Env-Vars in Vercel | Secrets in Lovable Cloud |

## Umsetzungsschritte

### 1. Lovable Cloud aktivieren
Per Tool aktivieren – legt automatisch Supabase-Backend an, generiert Client (`src/integrations/supabase/client.ts`) und stellt `VITE_SUPABASE_*` env-Vars bereit. Damit wird auch eine echte Datenbank für die Konfigurations-Speicherung verfügbar.

### 2. Resend-Connector verbinden
Über den Resend-Connector. Du wirst einen Resend-Account brauchen (kostenlos bis 3.000 Mails/Monat) und eine **verifizierte Absender-Domain** (z.B. `novamotis.com`). Solange die Domain noch nicht verifiziert ist, kannst du `onboarding@resend.dev` als Absender benutzen, dann gehen Mails aber nicht an beliebige Empfänger – nur an deine Resend-Account-Adresse. Das reicht zum Testen, für Produktion brauchen wir die Domain.

### 3. Datenbank-Tabellen anlegen (Migration)
Zwei Tabellen mit RLS:

**`belt_inquiries`** (für Gurtförderer)
- `id uuid pk`, `created_at timestamptz`, `lang text`
- `customer_name`, `customer_company`, `customer_email`, `customer_phone`, `customer_message` (text)
- `config jsonb`, `summary text`, `pdf_filename text`
- `email_status text` ('sent' / 'failed'), `email_error text`

**`profile_inquiries`** (für Profil-Konfigurator)
- gleiches Schema, statt `config` → `items jsonb`, `total_eur numeric`

RLS-Policies: Insert nur durch Service-Role (also nur über Edge Function), kein Select für public. Abruf über das Supabase-Dashboard (Cloud → Database → Tables).

### 4. Edge Function `send-inquiry` (neu)
Eine generische Edge Function für **beide** Konfiguratoren:

- Akzeptiert `{ kind: 'belt' | 'profile', lang, form, summary, configOrItems, total?, attachment }`
- Validiert Input mit Zod (Name, gültige Email, Pflichtfelder, Größe des PDF-Anhangs ≤ 8 MB).
- Rate-Limiting in-memory pro Edge-Instance (5 Requests / 10 min pro IP+Email).
- Sendet 2 Mails über **Resend** via Lovable Connector Gateway:
  1. an `office@novamotis.com` mit allen Daten + PDF-Anhang
  2. Bestätigung an den Kunden (DE/EN je nach `lang`)
- Speichert die Anfrage in der passenden Tabelle (`belt_inquiries` oder `profile_inquiries`) mit `email_status`.
- CORS-Header korrekt gesetzt.

### 5. Frontend umbauen

**`src/components/configurator/StepSummary.tsx`** (Gurtförderer):
- Ersetze `fetch('/api/send-inquiry', ...)` durch `supabase.functions.invoke('send-inquiry', { body: { kind: 'belt', ... } })`.

**`src/pages/ProfileConfigurator.tsx`** (Profil):
- Aktuelle `mailto:`-Lösung wird durch einen echten Anfrage-Dialog ersetzt (Name, Firma, Email, Telefon, Nachricht, Datenschutz-Checkbox).
- PDF wird mit `jsPDF` direkt im Browser generiert (neue Datei `src/lib/profile-pdf.ts`).
- Submit ruft dieselbe Edge Function auf mit `kind: 'profile'`.

### 6. Alte Vercel-Routen
Die Dateien `api/send-inquiry.ts` und `api/create-configuration.ts` lassen wir **drin**, damit dein bestehendes Vercel-Deployment nicht bricht. Die App ruft sie aber nicht mehr auf. Du kannst sie später löschen, wenn du komplett auf Lovable umgestellt bist.

## Was du vorbereiten musst

1. **Resend-Account** erstellen auf [resend.com](https://resend.com) (kostenlos).
2. Wenn du Mails an Kunden schicken willst: Domain `novamotis.com` in Resend hinzufügen und die DNS-Records (3 TXT-Einträge) bei deinem Domain-Provider hinterlegen. Dauert ~5 min Setup + ~30 min DNS-Propagierung.
3. Beim Connector-Schritt wirst du nach dem Resend-API-Key gefragt – findest du in Resend unter "API Keys".

## Neue / geänderte Dateien

**Neu:**
- `supabase/functions/send-inquiry/index.ts` (Edge Function)
- `src/lib/profile-pdf.ts` (PDF-Generator für Profil)
- `src/components/configurator/ProfileInquiryDialog.tsx`
- Migration: `belt_inquiries` und `profile_inquiries` Tabellen mit RLS

**Geändert:**
- `src/components/configurator/StepSummary.tsx` (Aufruf der Edge Function)
- `src/pages/ProfileConfigurator.tsx` (Dialog statt mailto)

**Bleibt unverändert:**
- `api/send-inquiry.ts`, `api/create-configuration.ts` (Vercel-Fallback, nicht mehr aufgerufen)

## Test nach Umsetzung

1. Gurtförderer konfigurieren → Anfrage abschicken → Mail muss bei `office@novamotis.com` ankommen, Eintrag in `belt_inquiries`.
2. Profil konfigurieren → Position(en) in den Warenkorb → "Anfrage senden" → Dialog → abschicken → Mail kommt an, Eintrag in `profile_inquiries`.
3. Beides funktioniert jetzt sowohl in der Lovable-Vorschau als auch auf der veröffentlichten URL.

Soll ich loslegen?