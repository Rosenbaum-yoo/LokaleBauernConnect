# Go-Live Anleitung — LokaleBauernConnect

> Stand: 2026-06-20. Schritt-für-Schritt für den Live-Gang. Quelle der Wahrheit ist der Code.
> Go-Live ist nach außen sichtbar und teils irreversibel — vor dem auslösenden Build die Owner-Freigabe einholen (AGENTS.md).

## Voraussetzungen

- Repo lokal, Node installiert, `cd app && npm install`.
- Konten: Supabase-Projekt, Cloudflare Pages, Stripe (Live-Mode bereit).
- Alle Secrets griffbereit (siehe `../DEPLOYMENT.md`) — niemals ins Git.

## Vor-Flug-Check (lokal)

```bash
cd app
npm run typecheck   # tsc --noEmit
npm test            # 55 Tests grün
npm run build       # dist/ erzeugt
```

Stoppt einer dieser Schritte mit Fehler → nicht live gehen.

## Schritt 1 — Datenbank (Supabase)

1. Supabase-Projekt anlegen/auswählen.
2. SQL Editor: `app/supabase/setup_all.sql` einfügen und ausführen (idempotent; legt Enums, Tabellen, RLS, Funktionen + Seed an).
   - Alternativ Migrationen einzeln: `0001_core` → `0002_payments` → `0003_marketplace` → `0004_onboarding`.

## Schritt 2 — Edge Functions (Supabase, Deno)

1. Secrets setzen (Supabase-Dashboard oder `supabase secrets set`):
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIS`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `CORS_ORIGIN`, `PUBLIC_APP_URL`,
   `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` **oder** `SENDGRID_API_KEY`.
2. Functions deployen: `create-checkout`, `stripe-webhook`.

## Schritt 3 — Stripe

1. Produkte/Preise anlegen; deren IDs in `STRIPE_PRICE_*` eintragen.
2. Webhook-Endpoint auf die `stripe-webhook`-Function zeigen lassen; `STRIPE_WEBHOOK_SECRET` übernehmen.

## Schritt 4 — Frontend (Cloudflare Pages)

1. Pages-Projekt mit dem Repo verbinden.
   - Root directory: `app`
   - Build command: `npm run build`
   - Build output directory: `dist`
2. Umgebungsvariablen setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_ERROR_BEACON_URL`.
3. Build auslösen (← hier wird es live; Owner-Freigabe).
4. Prüfen, dass `public/_headers` und `public/_redirects` im Output landen (Security-Header + SPA-Fallback).

## Schritt 5 — Verifikation

Nach `../GO_LIVE_TEST_MATRIX.md` durchgehen, mindestens:
1. `/status` → „Betriebsbereit", `mode: live`, `supabase: ok`.
2. Routen-Smoke: `/`, `/stand/:farmId`, `/hof/:farmId`, `/mitmachen`, `/login`, `/staff`, `/status`.
3. Reservierung + ein Stripe-Checkout (zunächst Test-Mode), Webhook im Stripe-Dashboard als zugestellt.
4. Security-Header in der Response von `/` vorhanden.

## Rollback

- Cloudflare Pages: vorherigen Build redeployen.
- DB: siehe `../BACKUP_DISASTER_RECOVERY.md`.

> [[OWNER: produktive Domain/DNS, Stripe Live-Aktivierung und finale Mail-Domain (SPF/DKIM) sind nicht im Code hinterlegt — vor Go-Live festlegen.]]
