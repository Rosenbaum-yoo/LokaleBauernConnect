# Edge Functions — Payments & Mail (LokaleBauernConnect)

Serverseitige Logik mit Secrets (Stripe, service_role, Mail). Env-gated: ohne Keys laufen sie
sicher im „disabled/console"-Modus (kein Versand, kein Charge). BBQ-Original unberührt.

## Funktionen
- **create-checkout** — erzeugt Stripe Checkout Session:
  - `mode: 'sb_payment'` → Zahlung am unbemannten Hofladen-Stand (USP). Preis serverseitig ermittelt.
  - `mode: 'subscription'` → Erzeuger-Abo (Plan→Stripe-Price).
  - Zahlarten via `automatic_payment_methods` → Stripe zeigt alle im Dashboard aktivierten (Karte, **SEPA, PayPal, Giropay, Klarna, Apple/Google Pay** …).
- **stripe-webhook** — EINE signaturgeprüfte, **idempotente** Wahrheit; aktualisiert `sb_payments`/`subscriptions`, schreibt Audit, sendet Quittungs-Mail.

## Owner-Setup (einmalig)
1. **Stripe-Keys** in `supabase/functions/.env` (aus `.env.example`):
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIS|PLUS|PRO`, `PUBLIC_APP_URL`.
2. **Mail** wählen: `EMAIL_PROVIDER=resend` (+ `RESEND_API_KEY`) **oder** `sendgrid` (+ `SENDGRID_API_KEY`) + `EMAIL_FROM` (verifizierte Absenderdomain mit SPF/DKIM/DMARC).
3. Secrets setzen + deployen:
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   supabase functions deploy create-checkout stripe-webhook
   ```
4. **Stripe-Webhook** anlegen: Stripe Dashboard → Developers → Webhooks → Endpoint
   `https://<project-ref>.functions.supabase.co/stripe-webhook` → Events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` → Signing secret in `STRIPE_WEBHOOK_SECRET`.
5. **Zahlarten** in Stripe aktivieren (Settings → Payment methods): Karte, SEPA-Lastschrift, PayPal, Giropay, Klarna, Apple/Google Pay.
6. **Produkte/Preise** in Stripe anlegen (Abo BASIS/PLUS/PRO) → Price-IDs in die Secrets.

## Client-Aufruf
`app/src/lib/payments.ts` → `goToCheckout({ mode:'sb_payment', farmId, productId, quantity, contact })`
bzw. `{ mode:'subscription', plan, orgId }`. Ohne Konfiguration: sauberer Fehler, kein toter Button.

## Sicherheit
service_role nur hier · Betrag/Plan serverseitig · Webhook signatur- + idempotenzgesichert · Audit bei jeder Zahlung · keine Secrets im Client/Log.
