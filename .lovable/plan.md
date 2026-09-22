# Profilzuschnitte live schalten

Der Zuschnittskonfigurator wird öffentlich: kein Passwort mehr, kein Beta-Hinweis.

## Änderungen

1. **Passwortabfrage entfernen** — Die Seite ist künftig direkt über den Link erreichbar, ohne Eingabefeld. Die Passwortseite wird aus dem Projekt entfernt.
2. **Status auf „Jetzt verfügbar"** — Auf der Startseite bekommt die Karte „Profilzuschnitte" den grünen Punkt mit „Jetzt verfügbar" statt des violetten Beta-Schlosses.
3. **Button angleichen** — Statt „Mit Passwort öffnen" steht dort wie bei den anderen Tools „Tool öffnen", im normalen Blau.
4. Die anderen Tools, insbesondere der Fördertechnik-Konfigurator, bleiben unverändert.

## Technische Details

- `src/App.tsx`: Route `/profile-configurator` ohne `ProfilePasswordGate` rendern, Import entfernen.
- `src/components/ProfilePasswordGate.tsx`: löschen (keine weiteren Verwendungen).
- `src/pages/Index.tsx`: bei `profile-configurator` `requiresAuth` entfernen und `statusKey` auf `hubAvailableNow` setzen; dadurch greift automatisch der normale Badge- und Button-Zweig.
- Der Admin-Bereich (`/admin/*`) und `/auth` bleiben unverändert über Supabase Auth geschützt.
