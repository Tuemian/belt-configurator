# Drei Anpassungen umsetzen

## 1. PDF auch an Kunden anhängen
**Datei:** `supabase/functions/send-inquiry/index.ts`
Die `attachments`-Variable ist bereits aufgebaut, wird aber nur an die Office-Mail mitgegeben. Beim zweiten `sendResendEmail`-Aufruf (Kundenbestätigung) das Feld `attachments` ebenfalls übergeben.

## 2. Ausklappbare Preisaufstellung entfernen
**Datei:** `src/components/configurator/StepSummary.tsx` (Zeilen 805–825)
Den `<details>`-Block mit der Preisaufstellung entfernen. Die Preis-Card zeigt dann nur noch den Gesamtpreis (bzw. "Preis auf Anfrage") plus Disclaimer. Der Breakdown bleibt im PDF erhalten.

## 3. Trommelmotor-Kabel sichtbarer (Signalrot)
**Datei:** `src/components/configurator/ConveyorViewer3D.tsx` (Zeilen 1247–1256)
Den dünnen, fast schwarzen Kabel-Zylinder ersetzen durch:
- Einen **roten Anschlussblock** (Box ~24×22×18 mm) direkt am Motor
- Ein **dickeres rotes Kabel** dahinter (Radius 6 statt 4, Länge 48 mm)
- Farbe: Signalrot `#dc2626`
- Position weiterhin abhängig von `motorPosition` (links/rechts)

So ist auf einen Blick erkennbar, auf welcher Seite das Kabel austritt.

## Hinweise
- Edge Function wird nach dem Speichern automatisch deployed.
- Keine DB- oder Schema-Änderungen nötig.
