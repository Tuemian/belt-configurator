## Ziel
1. Versand der Anfrage spürbar beschleunigen.
2. Formulierung in der Kunden-Bestätigungsmail anpassen: statt „in Kürze" → „innerhalb von maximal zwei Arbeitstagen", schön formuliert (DE + EN).

## Änderungen in `supabase/functions/send-inquiry/index.ts`

### 1. Versand beschleunigen
Aktuell laufen zwei Mails **sequenziell** (erst Office, dann Kunde) — bei einem PDF-Anhang dauert das spürbar länger als nötig.

- Beide `sendResendEmail`-Aufrufe **parallel** mit `Promise.allSettled` ausführen, statt nacheinander mit `await`. Spart bei jeder Anfrage ~die Hälfte der Versandzeit.
- Bei `Promise.allSettled` einzeln auswerten: Wenn die Office-Mail fehlschlägt → 502 zurückgeben. Wenn nur die Kundenmail fehlschlägt → trotzdem 200 (wie bisher), nur loggen.
- Antwort an den Browser bleibt gleich (`{ ok: true, id }`), die UI bekommt also schneller eine Rückmeldung.

Optional zusätzlich (kleine Verbesserung):
- DB-Insert (`supabase.from(table).insert(...)`) muss **vor** dem Senden laufen, weil wir die `inquiryId` in der Mail brauchen → das bleibt sequenziell, ist aber schnell.

### 2. Texte anpassen — „maximal zwei Arbeitstage"

**Deutsch** (`customerText`, `customerHtml`):
- Alt: „… melden uns in Kürze bei Ihnen."
- Neu: „… und melden uns innerhalb von maximal zwei Arbeitstagen persönlich bei Ihnen."

**Englisch**:
- Alt: „… will get back to you shortly."
- Neu: „… and will get back to you personally within a maximum of two business days."

Betrifft jeweils Plain-Text-Variante (Zeile 290–291) und HTML-Variante (Zeile 297–301).

## Hinweise
- Edge Function wird nach dem Speichern automatisch neu deployed.
- Keine DB-/Schema-Änderungen.
- Keine Auswirkungen auf PDF-Anhang oder die Office-Mail-Inhalte.
