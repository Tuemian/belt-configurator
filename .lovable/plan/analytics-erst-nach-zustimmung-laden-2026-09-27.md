# Analytics erst nach Zustimmung laden

## Ausgangslage
- Das Skript `~flock.js` (sendet an `/~api/analytics`, setzt `session-id`) steht nicht im Projektcode. Das Hosting fügt es beim Ausliefern der veröffentlichten Seite ein. Deshalb lässt es sich im Code nicht „erst nach Klick“ laden.
- Im Konfigurator gibt es schon einen Cookie-Banner mit „Nur notwendige“ und „Alle akzeptieren“. Er steuert bisher nur Google Analytics.
- shop.novamotis.com ist ein eigenes Projekt. Dort kann ich von hier aus nichts ändern.

## Schritte
1. **Einstellungen prüfen:** In den Veröffentlichungs-Einstellungen nach einem Schalter suchen, mit dem man die eingebaute Analytics abschalten kann. Gibt es ihn, schalte ich ihn für den Konfigurator aus. Das ist der einzige sichere Weg, den Request und das Cookie ohne Zustimmung ganz zu verhindern.
2. **Wenn es keinen Schalter gibt:** Ich melde das ehrlich zurück. Dann bleiben zwei Wege:
   - den Lovable-Support bitten, die eingebaute Analytics abzuschalten, oder
   - sie über die Datenschutzerklärung abdecken, falls sie wirklich cookielos bzw. anonym arbeitet. Das muss juristisch geprüft werden.
   Das Skript selbst kann ich nicht per Einwilligung steuern.
3. **Banner an novamotis.com anpassen:** drei Schaltflächen „Akzeptieren“, „Ablehnen“ und „Einstellungen“. „Einstellungen“ öffnet ein Fenster mit Schaltern: „Notwendig“ (immer an) und „Statistik“ (an/aus). Zweisprachig DE/EN. Google Analytics lädt weiterhin nur nach Zustimmung. Der Link „Cookie-Einstellungen“ im Footer bleibt.
4. **Shop:** Die gleichen Schritte im Shop-Projekt ausführen, sobald es dort geöffnet wird.

## Technische Details
- `CookieConsentBanner.tsx` bekommt die neuen Buttons und ein Dialog-Fenster für die Einstellungen.
- `cookie-consent.ts` speichert die Wahl wie bisher: `necessary` oder `all`.
- Neue Texte kommen in `i18n.ts`.
- Test: Vor der Zustimmung darf es keinen Request an googletagmanager geben.
