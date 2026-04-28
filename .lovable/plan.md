## Ziel

Der Button **"Anfrage senden"** soll **überall** funktionieren – in der Lovable-Vorschau, auf novamotis-configurator.lovable.app **und** auf deiner Vercel-Domain – mit deinem eigenen SMTP-Server (kein Resend, kein Microsoft Graph, kein zusätzlicher Dienst).

## Warum die aktuelle Lösung nicht geht

Die Datei `api/send-inquiry.ts` ist eine **Vercel-Serverless-Function**. Sie läuft NUR auf Vercel, nicht in der Lovable-Vorschau → daher der 404. Lovable-Cloud-Edge-Functions hingegen laufen überall.

## Lösung: Edge Function mit SMTP

### 1. Lovable Cloud (✅ bereits aktiviert)

### 2. SMTP-Zugangsdaten als Secrets hinterlegen

Du brauchst die SMTP-Daten deines Mailservers. Ich frage sie dich nach Plan-Freigabe ab:

- `SMTP_HOST` (z.B. `smtp.office365.com`, `smtp.your-hoster.com`)
- `SMTP_PORT` (üblich: `465` für SSL, `587` für STARTTLS)
- `SMTP_USER` (Benutzername / Login-E-Mail)
- `SMTP_PASSWORD` (Passwort oder App-Passwort)
- `SMTP_FROM` (Absender-Adresse, z.B. `noreply@novamotis.com`)
- `INQUIRY_TO` (Empfänger, z.B. `office@novamotis.com`)

### 3. Datenbank-Tabellen

```text
belt_inquiries        — bestehende Gurtförderer-Anfragen
profile_inquiries     — neue Profil-Anfragen
```

Felder pro Tabelle: `id`, `created_at`, `lang`, `name`, `company`, `email`, `phone`, `message`, `configuration` (JSONB), `pdf_filename`.
RLS aktiviert, nur Insert über die Edge Function (Service-Role).

### 4. Edge Function `send-inquiry`

Eine generische Function für beide Konfiguratoren:
- Validiert Eingaben (Name, E-Mail, Nachricht, Konfigurations-JSON, PDF-Anhang)
- Speichert die Anfrage in der passenden Tabelle (`belt_inquiries` oder `profile_inquiries`)
- Verschickt per **`npm:nodemailer`** via SMTP:
  1. Mail an dich (`INQUIRY_TO`) mit PDF-Anhang + Konfigurations-Übersicht
  2. Bestätigungsmail an den Kunden
- CORS-Header gesetzt, Rate-Limit (5 Requests / 10 Min pro IP)

### 5. Frontend-Anpassungen

- **Belt-Konfigurator** (`StepSummary.tsx`): `fetch('/api/send-inquiry')` → `supabase.functions.invoke('send-inquiry', { body: { type: 'belt', ... } })`
- **Profil-Konfigurator** (`ProfileConfigurator`): bisheriger `mailto:`-Trigger wird durch denselben Aufruf mit `type: 'profile'` ersetzt; PDF wird clientseitig mit `jsPDF` generiert (analog Belt) und base64-codiert mitgeschickt
- Toast-Feedback bei Erfolg / Fehler

### 6. Vercel-Code

`api/send-inquiry.ts` bleibt bestehen (für Vercel-Deploy als Fallback), wird aber vom Frontend nicht mehr aufgerufen. Optional kann er später entfernt werden.

## Was du tun musst

Nach Plan-Freigabe brauche ich von dir nur die **SMTP-Zugangsdaten** (Host, Port, User, Passwort, From, Empfänger-Adresse). Den Rest erledige ich.

## Ergebnis

- Anfrage senden funktioniert in **Vorschau + Live-URL + Vercel**
- Du erhältst E-Mail + PDF an `office@novamotis.com`
- Kunde erhält Bestätigung
- Alle Anfragen werden in der Datenbank gespeichert und sind abrufbar

Soll ich loslegen?
