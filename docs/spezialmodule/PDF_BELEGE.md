# PDF-Belege (global)

> Wiederverwendbare, gebrandete PDF-Erzeugung — client-seitig. Quelle: `app/src/lib/pdf.ts`. Stand: 2026-06-21.

## Architektur-Entscheidung (wirtschaftlich)
- **Client-seitig mit `pdf-lib`**, **lazy via `await import('pdf-lib')`** → eigener Build-Chunk (~139 KB gzip), **nicht im Haupt-Bundle**. Wird nur geladen, wenn jemand wirklich ein PDF erzeugt → schnellere First-Load, weniger Cloudflare-Bandbreite.
- **Kein externer PDF-Dienst** → DSGVO-konform, **offline/PWA-tauglich**, **keine Pro-Dokument-Serverkosten**.

## API
- `buildBrandedPdf(input)` → `Uint8Array` — DOM-freie, **testbare** Kern-Erzeugung (gebrandeter A4-Beleg: Marke, Gold-Linie, Titel, Datenzeilen mit Umbruch, Disclaimer-Fuß, Beleg-Nr./Datum).
- `downloadBytes(filename, bytes)` — Download im Browser.
- `downloadApplicationConfirmation(data)` — Bewerbungs-Bestätigung (Onboarding-Abschluss).
- `downloadReservationConfirmation(data)` — Reservierungs-Bestätigung (FarmDrawer).

## Eingebunden
- **Onboarding** (`OnboardingPage`): „Bestätigung als PDF" im Erfolgs-Screen.
- **Reservierung** (`FarmDrawer`): „Bestätigung als PDF" nach erfolgreicher Reservierung.

## Bewusst server-seitig (Go-Live)
- **SB-Zahlungs-Quittung / Rechnung**: gehört in den **Stripe-Webhook** (Daten nach dem Redirect nicht mehr im Client; §14-UStG-Pflichtangaben, GoBD-Aufbewahrung). Wird mit Stripe-Connect-Anbindung gebaut.

## Tests
- `app/test/pdf.test.ts`: gültige `%PDF`-Bytes + Lang-Text-Umbruch. (Download-Pfad = Browser-Glue, nicht unit-getestet.)
