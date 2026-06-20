# Deployment — LokaleBauernConnect

> Stand: 2026-06-20. Quelle der Wahrheit ist der Code. Bei Abweichung gilt der Code.

## Stack

| Schicht | Technologie | Ort im Repo |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript, PWA (`vite-plugin-pwa`) | `app/src/`, `app/vite.config.ts` |
| Hosting (Frontend) | Cloudflare Pages (Static, Build-Output `dist/`) | `app/public/_headers`, `app/public/_redirects` |
| Datenbank / Auth | Supabase (Postgres) | `app/supabase/` |
| Serverlogik | Supabase Edge Functions (Deno) | `app/supabase/functions/` |
| Zahlungen | Stripe (Checkout + Webhook) | `app/supabase/functions/create-checkout`, `.../stripe-webhook` |

> Kein Hetzner, kein eigener Node-Server, kein nginx. Frontend ist rein statisch (Cloudflare Pages); jede Serverlogik läuft als Supabase Edge Function.

## Build

```bash
cd app
npm install
npm run build      # tsc --noEmit && vite build  → dist/
npm run preview    # lokale Vorschau des Builds
npm run dev        # Dev-Server auf Port 5409
```

- Build-Output: `app/dist/` (Cloudflare Pages Publish-Directory).
- `npm run build` führt zuerst `tsc --noEmit` (Typecheck) aus und bricht bei Typfehlern ab.
- Dev-Port: **5409** (`server.port` in `vite.config.ts`, Schema 5400 + Projektnummer 09).

## Cloudflare Pages — Konfiguration

| Einstellung | Wert |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `app` |
| SPA-Fallback | `app/public/_redirects`: `/*  /index.html  200` |
| Security-Header | `app/public/_headers` (siehe unten) |

Beide Dateien (`_headers`, `_redirects`) liegen in `public/` und werden von Vite nach `dist/` kopiert; Cloudflare Pages liest sie aus dem Output-Verzeichnis.

### Security-Header (`public/_headers`)
Auf `/*` gesetzt: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Strict-Transport-Security: max-age=31536000; includeSubDomains`,
`Permissions-Policy: geolocation=(self), camera=(), microphone=()`,
sowie eine restriktive `Content-Security-Policy`
(`connect-src 'self' https://*.supabase.co`, `img-src` u. a. OpenStreetMap-Tiles + Supabase, `frame-ancestors 'none'`).

## Frontend-Umgebungsvariablen (Vite, `VITE_*`)

| Variable | Pflicht | Wirkung |
|---|---|---|
| `VITE_SUPABASE_URL` | nein* | Supabase-Projekt-URL |
| `VITE_SUPABASE_ANON_KEY` | nein* | Supabase Anon-Key |
| `VITE_ERROR_BEACON_URL` | nein | Endpunkt für clientseitiges Error-Reporting (siehe `OBSERVABILITY.md`) |

\* Ohne gesetzte Supabase-Variablen läuft die App im **Demo-Modus** (Seed-Daten aus `src/lib/seed.ts`); die UI ist sofort lauffähig. Sind sie gesetzt, schaltet die Datenschicht (`src/lib/data.ts`) automatisch auf Live-Supabase um. Quelle: `src/lib/supabase.ts` (`isSupabaseConfigured`).

## Datenbank-Deployment (Supabase)

- Migrationen: `app/supabase/migrations/0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`, `0004_onboarding.sql`.
- Komplett-Setup in einer Datei (idempotent, für Supabase SQL Editor): `app/supabase/setup_all.sql` (Kern + Payments + Marktplatz + Onboarding + Seed).
- Seed: `app/supabase/seed.sql`.
- Datenmodell ist mandantenfähig (`org_id`) mit RLS deny-by-default ab Migration #1.

## Edge Functions (Supabase, Deno)

| Function | Zweck |
|---|---|
| `create-checkout` | Stripe-Checkout-Session erzeugen |
| `stripe-webhook` | Stripe-Webhook-Events verarbeiten |
| `_shared/` | Gemeinsame Module: `cors.ts`, `email.ts`, `stripe.ts`, `supabaseAdmin.ts` |

### Edge-Function-Secrets (Supabase, `Deno.env`)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIS`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`CORS_ORIGIN`, `PUBLIC_APP_URL`,
`EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `SENDGRID_API_KEY`.

> Secrets niemals im Repo/Git. Setzen via Supabase-Dashboard bzw. `supabase secrets set`.

## Deploy-Reihenfolge (Go-Live)

1. Supabase: `setup_all.sql` (bzw. Migrationen) ausführen.
2. Edge-Function-Secrets setzen, Functions deployen.
3. Stripe: Produkte/Preise + Webhook-Endpoint auf `stripe-webhook` zeigen lassen.
4. Cloudflare Pages: `VITE_*`-Variablen setzen, Build auslösen.
5. Smoke-Test über `/status` (siehe `MONITORING.md`).

> Go-Live ist nach außen sichtbar — vor Auslösen des Live-Builds Owner-Freigabe einholen (AGENTS.md).
