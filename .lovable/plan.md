## Ziel

Die im Page Speed Test gefundenen Performance-Probleme beheben (aktuell 55/100 mobil). Die größten Hebel sind das Hero-Bild und das große JS-Bundle.

## Identifizierte Probleme

1. **Unused JavaScript: 427 KiB** (LCP -2,1s) – Alle Routen inkl. 3D-Viewer (three.js, Konfiguratoren) sind im Haupt-Bundle. Die Startseite lädt Code, den sie gar nicht braucht.
2. **Hero-Bild: 262 KiB Einsparpotenzial** – `conveyor-hero.jpg` ist 311 KB, 1011×589 px, wird aber nur 662×385 px angezeigt; kein modernes Format (WebP/AVIF), keine `fetchpriority`.
3. **Render-blockierendes CSS** (~300 ms)
4. **Logo ohne explizite Größe** → CLS-Risiko (Header-Logo wird nicht in HTML gemessen)
5. **Cache-Lifetime** für `/~flock.js` (Lovable-Badge) – nicht selbst beeinflussbar, ignorieren.

## Maßnahmen

### 1. Route-basiertes Code-Splitting (größter Hebel)
In `src/App.tsx` die schweren Routen via `React.lazy` + `Suspense` laden:
- `BeltConfigurator` (enthält three.js / 3D-Viewer)
- `ProfileConfigurator` (3D-Viewer)
- `Auth`, `NotFound`

Nur `Index` bleibt eager geladen. Erwartung: Haupt-Bundle sinkt von ~565 KB auf deutlich unter 200 KB.

### 2. Hero-Bild optimieren
- `conveyor-hero.jpg` als WebP neu erzeugen, auf passende Display-Größe runter (max ~1400 px breit für Retina) und stark komprimieren.
- Im `<img>`-Tag: `fetchpriority="high"`, `loading="eager"`, `decoding="async"`.
- Erwartung: ~250 KiB weniger Transfer, LCP -1 bis -2 s.

### 3. Logo-Dimensionen
`width`/`height` auf das `<img>` für `logo.svg` setzen, um Layout Shifts zu vermeiden.

### 4. Render-blocking CSS
Vite splittet CSS automatisch pro Chunk. Durch Code-Splitting (Punkt 1) wird die Index-CSS automatisch kleiner. Keine separate Maßnahme nötig.

## Nicht im Umfang

- Lovable-Badge (`/~flock.js`) – externes Script, nicht beeinflussbar.
- Backend / Konfigurator-Logik bleibt unverändert.
- Profilzuschnitt-Auth, ID-System, Inquiry-Flow – nicht angefasst.

## Erwartetes Ergebnis

Mobile Performance-Score von 55 → ~80–90, deutliche Verbesserung bei FCP, LCP und TTI.

## Technische Details

**Geänderte Dateien:**
- `src/App.tsx` – `lazy`/`Suspense` für Routen
- `src/pages/Index.tsx` – `<img>`-Attribute (fetchpriority, loading, decoding, logo width/height)
- `src/assets/conveyor-hero.jpg` → ersetzt durch `conveyor-hero.webp` (kleiner, korrekt skaliert)

Nach der Umsetzung: erneuten Page Speed Test ausführen.
