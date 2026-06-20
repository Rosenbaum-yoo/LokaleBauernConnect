# Observability — LokaleBauernConnect

> Stand: 2026-06-20. Grounded in `src/lib/observability.ts`; bei Abweichung gilt der Code.

## Überblick

Leichte, abhängigkeitsfreie Client-Observability in `src/lib/observability.ts`. Kein externes SDK; Sentry o. ä. ist später als Drop-in über dieselbe `reportError`-Schnittstelle möglich.

## Mechanik

- **Init:** `initObservability()` registriert globale Listener `window.error` und `unhandledrejection` (einmalig, no-op außerhalb des Browsers).
- **Manuell:** `reportError(detail)` meldet ein Ereignis explizit (z. B. Button auf `/status`).
- **Lokales Logging:** jedes Ereignis geht via `console.error('[obs:<kind>]', detail)` in die Browser-Konsole.
- **Beacon (optional):** ist `VITE_ERROR_BEACON_URL` gesetzt, wird ein JSON-Payload an diesen Endpunkt gesendet.

### Beacon-Payload
```json
{ "kind": "...", "detail": "...", "url": "...", "ts": "ISO-8601", "ua": "navigator.userAgent" }
```
Versand bevorzugt `navigator.sendBeacon`, sonst `fetch(..., { keepalive: true })`. Fehler im Observability-Pfad werden bewusst verschluckt — Observability darf die App nie brechen.

### Ereignis-Arten (`kind`)
| kind | Auslöser |
|---|---|
| `error` | manueller `reportError(...)` |
| `window.error` | globaler `window.error`-Listener |
| `unhandledrejection` | nicht behandelte Promise-Rejection |

## Konfiguration

| Variable | Wirkung |
|---|---|
| `VITE_ERROR_BEACON_URL` | Zielendpunkt für Beacons. Nicht gesetzt → nur Konsolen-Logging. |

> [[OWNER: Betreiber/Backend des Beacon-Endpunkts und Aufbewahrung sind nicht im Code festgelegt — offen.]]

## Tests

`test/observability.test.ts` und `test/errorboundary.test.tsx` decken Reporting bzw. den React-`ErrorBoundary`-Fallback ab (Teil der 55-Test-Suite).
