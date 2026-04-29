## Ziel
Projekt für den **Go-Live** vorbereiten:
1. Saubere, sprechende Anfrage-Referenz (`FT-YYYYMMDD-INDEX`) statt UUID — sowohl in Mails als auch DB.
2. Kryptische SHA-256-Anzeige in der Zusammenfassung ausblenden.
3. Datenbank leeren (Test-Einträge entfernen).
4. Code aufräumen / Konsistenz herstellen.

---

## 1. Neue Anfrage-Referenz `FT-YYYYMMDD-INDEX`

**Format:** `FT-20260429-001`, `FT-20260429-002`, … (Index täglich neu beginnend bei 001, dreistellig mit führenden Nullen).

### Datenbank-Migration
Beide Tabellen (`belt_inquiries`, `profile_inquiries`) bekommen eine neue Spalte:
- `reference text unique` — die FT-ID, generiert per Trigger.

Funktion + Trigger:
- `public.generate_inquiry_reference(prefix text)` — `SECURITY DEFINER`, `SET search_path = public`.
- Liest Tagesdatum, zählt vorhandene Referenzen mit gleichem Tagesstempel in **beiden** Tabellen (damit der Index global pro Tag fortlaufend ist und sich nicht überschneidet), gibt `FT-YYYYMMDD-NNN` zurück.
- `BEFORE INSERT`-Trigger auf beiden Tabellen setzt `reference`, falls nicht gesetzt.

### Edge Function `send-inquiry`
- Nach dem Insert die `reference` aus dem Insert-Result zurücklesen (`.select("id, reference")`).
- Variable `inquiryId` durch `inquiryRef` ersetzen.
- In allen Mail-Texten (Admin DE, Kunde DE/EN, HTML + Plain) die UUID durch die FT-Referenz ersetzen — Bezeichnung „Anfrage-Nr." / „Reference no.".
- Response: `{ ok: true, id, reference }` zurückgeben.

### Frontend
- Bisher wird die ID nicht im UI weiterverwendet — keine UI-Änderung nötig (außer ggf. eine Erfolgs-Toast-Meldung mit Referenz; optional, kann weggelassen werden).

---

## 2. SHA-256 ausblenden

In `src/components/configurator/StepSummary.tsx` (Zeilen 760–762):
- Die Zeile `SHA-256: …` aus der Card „Identifizierbarkeit" entfernen.
- Die Konfigurations-ID (`shortId`) bleibt sichtbar — die ist kurz und lesbar.

---

## 3. Datenbank für Go-Live leeren

Migration:
```sql
TRUNCATE TABLE public.belt_inquiries, public.profile_inquiries RESTART IDENTITY;
```
Damit sind die 12 Test-Einträge weg und die FT-Nummerierung startet sauber bei `FT-YYYYMMDD-001`.

---

## 4. Code-Aufräumarbeiten

Kleine, risikolose Bereinigungen:
- `.lovable/plan.md` löschen (alter Arbeitsplan, gehört nicht ins Repo).
- In `send-inquiry/index.ts`: Logging vereinheitlichen (deutsch/englisch gemischt) → englisch, kompakt. Keine sensiblen Daten loggen (nur Referenz + Empfängerdomain).
- Konsistente Variablennamen (`inquiryRef` durchgängig).

**Bewusst NICHT angefasst** (würde Risiko zum Go-Live einführen):
- 3D-Viewer, Pricing, PDF-Generierung, Konfigurator-Logik.
- Auth/RLS — bleibt wie es ist (Public-Insert via Edge Function mit Service-Key, kein Public-Read).

---

## Technische Zusammenfassung der Änderungen

| Datei | Änderung |
|---|---|
| **DB-Migration** | Spalte `reference` + Unique-Index auf beiden Tabellen, Generator-Funktion + BEFORE-INSERT-Trigger, `TRUNCATE` der Tabellen |
| `supabase/functions/send-inquiry/index.ts` | `reference` aus Insert lesen, in allen Mails statt UUID verwenden, Response erweitern, Logging aufräumen |
| `src/components/configurator/StepSummary.tsx` | SHA-256-Zeile entfernen (Z. 760–762) |
| `.lovable/plan.md` | löschen |

## Hinweise
- Edge Function wird automatisch redeployed.
- Keine RLS-Änderungen, keine Auth-Änderungen.
- Migration wird vor Apply zur Bestätigung angezeigt.
- Nach Apply ist die DB leer und das System live-bereit.
