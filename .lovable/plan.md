# Admin-Preisverwaltung + ERP-Sync

Ziel: Preise und Mengenregeln (auch Schrauben, Klebebänder, Kleinteile) komplett im Browser pflegen — ohne Code-Änderung. Excel-Import/-Export für Backups und Massenpflege. Optional Preise per Klick aus dem [Nova Motis ERP](/projects/8f8b02ea-1db6-4e84-84b1-4cbb1ff965fe) ziehen. Vorbereitet für weitere Konfiguratoren.

## 1. Datenmodell (Lovable Cloud)

Drei neue Tabellen, RLS-geschützt — nur User mit Rolle `admin` dürfen lesen/schreiben.

**`pricing_components`** — Bauteil-Stammdaten
- `tool` (`belt` | `profile` | …), `key` (z. B. `screw_m6`)
- `label_de`, `label_en`, `label_it`
- `unit` (`per_unit`, `per_meter`, `per_m2`, `per_mm_width`, `per_kg`)
- `price_eur`, `active`
- **`article_number`** (optional) — Verknüpfung zum ERP
- **`price_source`** (`manual` | `erp`)
- **`erp_synced_at`** (timestamp)

**`pricing_rules`** — Wann & wie viel von jedem Bauteil eingerechnet wird
- `component_id` (FK), `tool`
- `condition` (jsonb) — z. B. `{ "withStand": true }` oder `{}` (immer)
- `quantity_formula` (text) — z. B. `length_m * width_m`, `ceil(length_m) * 8`, `if(drive_type == "drum", 2, 1)`
- `priority` (int)

**`user_roles`** + Enum `app_role` (`admin`, `user`) — Standard-Pattern mit `has_role()` SECURITY-DEFINER-Funktion (keine RLS-Rekursion)

## 2. Sichere Formel-Engine

Eigener Mini-Parser (~150 LOC), kein `eval()`. Erlaubt:
- Variablen: `length_m`, `width_m`, `height_mm`, `belt_type`, `with_stand`, `floor_element`, `drive_type`, …
- Operatoren: `+ - * / ( )`, Vergleiche
- Funktionen: `min`, `max`, `ceil`, `floor`, `round`, `if(cond, a, b)`

Beispiele:
- Schrauben M6: `ceil(length_m) * 8`, Einheit `per_unit`
- Klebeband: `length_m * 2`, Einheit `per_meter`
- Antrieb-Kabel: `if(drive_type == "drum", 2, 1)`, Einheit `per_unit`

## 3. Admin-UI — Route `/admin/pricing`

Login-geschützt + Rollen-geschützt. Nav-Link nur für Admins sichtbar.

- **Tool-Tabs**: „Förderband" | „Profilzuschnitte" | künftige
- **Tabelle**: Key · Bezeichnung (DE/EN/IT) · Einheit · Preis · Mengenformel · Bedingung · Artikelnummer · Quelle · Aktiv
- Inline-Edit, neuer Eintrag, Duplizieren
- **Live-Vorschau**: Test-Konfiguration eingeben → komplette Kostenaufstellung sofort sichtbar
- **Validierung**: Formeln werden beim Speichern gegen Test-Werte geprüft, Fehler vor Live-Schaltung angezeigt
- **Zweite Route `/admin/users`**: Admin-Rollen vergeben/entziehen per E-Mail

## 4. Excel-Import / -Export

Buttons oben rechts im Admin-Bereich.

- **Export**: `.xlsx` mit zwei Sheets pro Tool — `Components` + `Rules`. Roundtrip-fähig.
- **Import**: Diff-Vorschau (neu/geändert/gelöscht/unverändert) → Bestätigung → Transaktion. Bei Formelfehler kompletter Abbruch.

## 5. ERP-Sync (Nova Motis ERP)

**Im ERP-Projekt**: neue Edge Function `get-articles-by-numbers`
- Input: `{ article_numbers: string[], sync_token: string }`
- Output: `[{ article_number, name, price_eur, unit, updated_at }]`
- Liest aus `artikel`-Tabelle, geschützt per Sync-Token (Secret)

**Im Konfigurator-UI**:
- Pro Zeile Button **„Aus ERP holen"** (sofortiger Einzelabruf)
- Oben Button **„Alle ERP-Preise aktualisieren"** (Bulk: alle Zeilen mit Artikelnummer)
- Badge zeigt „ERP" + letztes Sync-Datum
- Manuell überschriebene Preise werden auf `manual` gesetzt und beim Bulk-Sync übersprungen (mit Warnhinweis)

**Resilient gegen ERP-Änderungen**: Nur die Edge Function im ERP kennt das echte Schema. Wenn sich Spalten/Namen im ERP ändern, wird ausschließlich diese Funktion angepasst — der Konfigurator bleibt unberührt.

## 6. Konfigurator anpassen

`src/lib/pricing.ts` wird umgeschrieben:
- Lädt Bauteile + Regeln aus DB statt aus `price-list.xlsx`
- Wertet Formeln pro Konfiguration aus
- Browser-Cache 5 min für Performance
- Verhalten unverändert: alle Preise vorhanden → Total; eines fehlt → „Preis auf Anfrage"
- Aktuelle `public/pricing/price-list.xlsx` wird einmalig automatisch in die DB migriert (Initialdaten)

## Technische Details

- **Migrationen**: Tabellen + Enum + `user_roles` + `has_role()` + RLS + Initialdaten-Migration
- **Secrets**: ein Sync-Token wird in beiden Projekten als Secret hinterlegt
- **Edge Functions**: `get-articles-by-numbers` im ERP, `sync-erp-prices` im Konfigurator (Wrapper, der Token einsetzt)
- **UI**: shadcn-Komponenten in NOVAMOTIS-Blau
- **Tool-Diskriminator**: neuer Konfigurator = neuer Tab, kein Schema-Change

## Was du nach dem Bauen tun musst

1. Mir deine Login-E-Mail nennen → ich vergebe dir die Admin-Rolle
2. App neu publizieren
3. Im Admin-UI Artikelnummern eintragen, einmal „Alle ERP-Preise aktualisieren" — fertig

## Nicht enthalten (kann später kommen)

- Versionierung/History der Preisänderungen
- Mehrwertsteuer/Margen-Aufschläge, Mengenrabatte
- Audit-Log
- Auto-Sync per Cron (Preise jede Nacht ziehen)
- Webhook vom ERP an Konfigurator bei Preisänderung (Push statt Pull)
