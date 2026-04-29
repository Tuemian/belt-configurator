## Analyse

### 1. E-Mail-Versand dauert zu lange
Aktuell wartet der Frontend-Aufruf, bis **beide** Resend-Calls (Admin + Kunde) komplett durchgelaufen sind. In den Edge-Function-Logs ist erkennbar, dass der Resend-Gateway-Call manchmal in einen Timeout läuft (`upstream connect... connection timeout` nach ~4,5s). Insgesamt sieht der Nutzer 5-10 Sekunden Wartezeit, bevor die Bestätigung erscheint.

### 2. Profil-Konfigurator zeigt 3D statt 2D
In `src/pages/ProfileConfigurator.tsx` wird aktuell `ProfileViewer3D` (Three.js, Canvas-basiert) geladen. Die frühere 2D-SVG-Querschnittsansicht (Schnitt durch das Profil mit T-Nuten, Bohrungen und bemaßter Seitenansicht) ist nicht mehr eingebunden. Dadurch wirkt der Konfigurator visuell anders als zuvor und ist deutlich schwerer/langsamer.

---

## Plan

### A) Versand beschleunigen (Edge Function `send-inquiry`)

**Ziel:** Antwort an den Browser unter ~1 Sekunde, E-Mail-Versand läuft im Hintergrund weiter.

1. DB-Insert wie bisher synchron ausführen (damit wir sofort die Referenznummer `FT-YYYYMMDD-XXX` zurückgeben können).
2. Den eigentlichen Resend-Versand (Admin + Kunde) in einen `EdgeRuntime.waitUntil(...)`-Background-Task verschieben.
3. Sofort `200 OK` mit `{ ok: true, reference: "FT-..." }` zurückgeben — der Nutzer sieht direkt die Erfolgsmeldung.
4. Resend-Fetch-Calls bekommen ein `AbortSignal.timeout(20000)`, damit hängende Verbindungen den Background-Task nicht blockieren.
5. Fehler im Background werden weiterhin geloggt (`console.error`), bleiben für den Nutzer aber transparent (Anfrage ist in der DB persistiert und kann manuell nachverfolgt werden).

**Trade-off (transparent für den Nutzer):** Falls Resend wirklich ausfällt, sieht der Kunde trotzdem "Anfrage erfolgreich". Da die Anfrage aber in der DB liegt und auf dem Admin-Backend einsehbar ist, geht nichts verloren. Bei Bedarf könnte später ein Status-Feld in der DB ergänzt werden.

### B) 2D-Ansicht im Profil-Konfigurator wiederherstellen

1. Neue Komponente `src/components/configurator/ProfileViewer2D.tsx` erstellen — reines SVG (kein Three.js):
   - **Querschnitt** (Front-Ansicht): Profil-Außenkontur mit abgerundeten Ecken, T-Nuten auf allen vier Seiten gemäß `numModulesW × numModulesH`, Zentralbohrung pro Modulzelle, Maßlinien für Breite/Höhe.
   - **Seitenansicht**: Profil als Rechteck `length × h`, Schrägschnitte (`angleStart`, `angleEnd`) als abgeschnittene Ecken, eingezeichnete Bohrungen (`holes` mit Z-Position) und Verbinder (`connectors`), Maßlinie für Länge.
   - Farben passend zur NOVAMOTIS-Identity (Primary HSL 199 100% 40%), dezente Maßlinien.
2. In `src/pages/ProfileConfigurator.tsx`:
   - Lazy-Import von `ProfileViewer3D` auf `ProfileViewer2D` umstellen.
   - 2D-Komponente nutzt keine `Suspense`-Heavy-Loads, lädt sofort.
3. `ProfileViewer3D.tsx` bleibt im Repo erhalten (nicht gelöscht), falls später wieder umgeschaltet werden soll. Außerdem behebt das die `forwardRef`-Konsolenwarnungen (3D wird nicht mehr gemountet).

---

## Technische Details

**Edge Function Snippet (Kern):**
```ts
// nach erfolgreichem DB-Insert:
const sendTask = (async () => {
  try {
    await Promise.allSettled([
      sendResendEmail(..., { signal: AbortSignal.timeout(20000) }),
      sendResendEmail(..., { signal: AbortSignal.timeout(20000) }),
    ]);
  } catch (e) { console.error("background send error", e); }
})();
// @ts-ignore - Deno Edge Runtime
EdgeRuntime.waitUntil(sendTask);

return new Response(JSON.stringify({ ok: true, reference: inquiryRef }), { status: 200, ... });
```

**2D-Viewer Aufbau (vereinfacht):**
```text
┌─────────────────────────┐  ┌──────────────────────────────┐
│   Querschnitt (Front)   │  │     Seitenansicht (Top)      │
│   ┌───┬───┐             │  │  ╲────────────────╱          │
│   │ ⊙ │ ⊙ │  W=80mm    │  │   │   • • •        │  L=500mm│
│   ├───┼───┤             │  │   │                │         │
│   │ ⊙ │ ⊙ │  H=80mm    │  │  ╱────────────────╲          │
│   └───┴───┘             │  │                              │
└─────────────────────────┘  └──────────────────────────────┘
```

**Geänderte/neue Dateien:**
- `supabase/functions/send-inquiry/index.ts` (geändert)
- `src/components/configurator/ProfileViewer2D.tsx` (neu)
- `src/pages/ProfileConfigurator.tsx` (geänderter Import)
- `src/components/configurator/ProfileViewer3D.tsx` (bleibt, nicht mehr eingebunden)
