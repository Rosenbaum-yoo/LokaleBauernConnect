# Incident Runbook — LokaleBauernConnect

> Stand: 2026-06-20. Grounded im Code; bei Abweichung gilt der Code.

## Erste Schritte (jeder Incident)

1. `/status` öffnen (`src/pages/StatusPage.tsx`) → `mode`, `supabase`, `farms` lesen.
2. Browser-Konsole prüfen: Observability loggt `[obs:<kind>]` (siehe `OBSERVABILITY.md`).
3. Supabase-Dashboard: DB-Status + Edge-Function-Logs.
4. Cloudflare Pages: letzter Build/Deploy ok?
5. Stripe-Dashboard: Webhook-Zustellung ok?

## Symptom → Diagnose → Maßnahme

### App lädt nicht / weiße Seite
- Cloudflare-Build fehlgeschlagen? → Logs prüfen, letzten grünen Build redeployen.
- SPA-Routing kaputt (404 auf Unterseite)? → `public/_redirects` muss `/*  /index.html  200` enthalten.

### Status zeigt „Fehler" / `supabase: error`
- Supabase nicht erreichbar oder Query schlägt fehl. Hinweis: Die App fällt in der Datenschicht (`src/lib/data.ts`) automatisch auf Seed-Daten zurück, der Katalog bleibt sichtbar — Schreibpfade/Live-Daten sind aber betroffen.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` korrekt? RLS-Policy versehentlich blockierend?

### Karten/Tiles fehlen
- CSP in `public/_headers` erlaubt `img-src ... https://*.tile.openstreetmap.org`; bei CDN-Wechsel CSP anpassen.

### Checkout/Payments funktionieren nicht
- `create-checkout`-Logs prüfen; Secrets gesetzt (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`)?
- `stripe-webhook`: `STRIPE_WEBHOOK_SECRET` korrekt, Endpoint im Stripe-Dashboard aktiv? Verpasste Events per Replay nachziehen.

### Reservierungs-/Bestätigungs-Mails kommen nicht an
- Edge-Function-Mail-Konfig: `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` / `SENDGRID_API_KEY` (`_shared/email.ts`).

### CORS-Fehler bei Edge Functions
- `CORS_ORIGIN` / `PUBLIC_APP_URL` der Function auf die korrekte Frontend-Domain setzen (`_shared/cors.ts`).

## Eskalation & Kommunikation

> [[OWNER: On-Call-Kontakte, Eskalationsstufen und Status-Kommunikation an Nutzer sind nicht im Code hinterlegt — offen.]]

## Nach dem Incident

- `npm test` (55 Tests) und `npm run typecheck` grün, bevor ein Fix live geht.
- Kurzes Post-Mortem (Ursache · Wirkung · Fix · Vorbeugung) festhalten.
