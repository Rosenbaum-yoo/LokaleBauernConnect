# Go-Live Test-Matrix — LokaleBauernConnect

> Stand: 2026-06-20. Routen grounded in `src/App.tsx`; automatisierte Tests in `app/test/`.

## 1. Automatisiert (Pflicht vor Go-Live)

| Check | Befehl | Erwartet |
|---|---|---|
| Typecheck | `npm run typecheck` | keine Fehler |
| Unit/Component | `npm test` | 55 Tests grün (19 Dateien) |
| Build | `npm run build` | `dist/` erzeugt, kein Fehler |

## 2. Routen-Smoke-Test (manuell, gegen Live-Build)

Routen aus `src/App.tsx`:

| Route | Seite | Erwartet |
|---|---|---|
| `/` | FinderPage | Hof-Liste/Karte lädt (Live oder Seed) |
| `/stand/:farmId` | StandPayPage | Hof-Stand + Reservierung/Bezahlung |
| `/hof/:farmId` | ProducerPage | Erzeuger-/Hofdetailseite |
| `/mitmachen` | OnboardingPage | Erzeuger-Onboarding-Wizard |
| `/login` | LoginPage | Login-Formular |
| `/staff` | StaffPage (geschützt via `RequireStaff`) | Zugriff nur mit Staff-Rolle |
| `/status` | StatusPage | „Betriebsbereit", `mode`/`supabase`/`farms` plausibel |
| beliebige unbekannte | Fallback → FinderPage | kein harter 404 |

## 3. Funktionale Pfade

| Bereich | Schritt | Erwartet |
|---|---|---|
| Finder | PLZ eingeben, filtern, sortieren | Distanz-Sortierung bei gültiger PLZ |
| Verfügbarkeit | Badge je Produkt | `available`/`low`/`soon`/`out` korrekt |
| Reservierung | Hof → reservieren | Reservierung angelegt |
| Onboarding | `/mitmachen` ausfüllen | Antrag in `farm_applications` |
| Payments | Checkout (Stripe Test-Mode) | `create-checkout` öffnet Session; `stripe-webhook` verbucht Event |
| Mail | Reservierungs-/Bestätigungs-Mail | Versand laut Edge-Function-Logs |

## 4. Infrastruktur / Sicherheit

| Check | Wie | Erwartet |
|---|---|---|
| Security-Header | Response-Header von `/` | Werte aus `public/_headers` (HSTS, CSP, X-Frame-Options DENY …) |
| SPA-Fallback | Direktaufruf `/status` (Reload) | lädt, kein 404 (`public/_redirects`) |
| CSP-Quellen | Karten/Bilder laden | OpenStreetMap-Tiles + Supabase erlaubt |
| Supabase Live | `/status` | `mode: live`, `supabase: ok` |
| Stripe-Webhook | Test-Event senden | im Stripe-Dashboard als zugestellt |

## 5. PWA

| Check | Erwartet |
|---|---|
| Manifest | Name „LokaleBauernConnect", `display: standalone` (`vite.config.ts`) |
| Service Worker | `registerType: autoUpdate`, Navigations-Fallback `/index.html` |

> [[OWNER: produktive Domain, Test-Konten und Stripe-Live-Schwellen sind nicht im Code hinterlegt — vor Go-Live festlegen.]]
