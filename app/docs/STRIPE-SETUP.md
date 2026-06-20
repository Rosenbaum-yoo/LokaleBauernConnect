# Stripe Setup & Go-Live

> Kanon: `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`. Bei Konflikt gewinnt der echte Code.
> Stack: Supabase Edge Functions (Deno) · Stripe SDK `npm:stripe@17` · API-Version `2024-06-20`.
> Quellen: `supabase/functions/_shared/stripe.ts`, `supabase/functions/create-checkout/index.ts`,
> `supabase/functions/stripe-webhook/index.ts`.

## Komponenten
| Edge Function | Aufgabe | HTTP |
|---|---|---|
| `create-checkout` | Checkout-Session (sb_payment / sb_basket / subscription) | `POST` |
| `stripe-webhook` | Signaturgeprüfter, idempotenter Event-Handler | `POST` |

Ohne `STRIPE_SECRET_KEY` ist Payments deaktiviert (`getStripe()` → `null`): `create-checkout` liefert `payments_disabled` (503).

## 1. Stripe-Account & Produkte (Owner)
1. Stripe-Account anlegen (EU/DE), Firmen-/Bankdaten hinterlegen [[OWNER: rechtlich/finanziell]].
2. Im Stripe-Dashboard die gewünschten Zahlarten aktivieren (Karte, SEPA-Lastschrift, PayPal, Giropay, Klarna, Apple/Google Pay) — `automatic_payment_methods` zeigt automatisch alle aktivierten.
3. Pro Abo-Plan ein **Product + recurring Price** anlegen → Price-IDs notieren (für `basis`, `plus`, `pro`).

## 2. Function-Secrets setzen
In Supabase (Project → Edge Functions → Secrets) bzw. `.env` der Functions:

| Secret | Zweck |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Secret API Key (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing-Secret des Webhook-Endpoints (`whsec_...`) |
| `STRIPE_PRICE_BASIS` | Price-ID Plan `basis` |
| `STRIPE_PRICE_PLUS` | Price-ID Plan `plus` |
| `STRIPE_PRICE_PRO` | Price-ID Plan `pro` |
| `PUBLIC_APP_URL` | Fallback-`successUrl` |
| `EMAIL_PROVIDER` / `EMAIL_FROM` (+ Provider-Key) | Quittungs-Mail (optional; Default `console` = nur Log) |

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_BASIS=price_... STRIPE_PRICE_PLUS=price_... STRIPE_PRICE_PRO=price_... \
  PUBLIC_APP_URL=https://...
```

> `demo` und `individuell` haben keine Price-ID und sind nicht per Self-Service-Checkout buchbar.

## 3. Functions deployen
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

## 4. Webhook-Endpoint in Stripe einrichten
- Endpoint-URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- Zu abonnierende Events (vom Handler real verarbeitet):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Signing-Secret als `STRIPE_WEBHOOK_SECRET` setzen.

## 5. DB-Migration
`supabase/migrations/0002_payments.sql` muss eingespielt sein (`subscriptions`, `sb_payments`, `payment_events`, Enums, RLS). Siehe `supabase/README.md` für `supabase db push`.

## 6. Test (Stripe Test-Mode)
1. Test-Keys/Test-Price-IDs verwenden.
2. `stripe listen --forward-to <webhook-url>` oder Dashboard-Test-Events.
3. Checkout durchlaufen → prüfen:
   - `sb_payments.status` → `paid`, `paid_at` gesetzt, `stripe_payment_intent` befüllt.
   - `subscriptions` Upsert mit `status: 'active'`.
   - `audit_log`: `sb_payment.paid` bzw. `subscription.activated`.
   - Idempotenz: gleiches Event erneut senden → `duplicate` (200), kein Doppeleffekt.

## Sicherheits-Checkliste
- Secrets nie im Code/Git (nur Supabase-Secrets / `.env`).
- Beträge serverseitig aus `products.price` (Client-Betrag wird nie vertraut).
- Webhook nur mit gültiger Signatur; ungültig → 400 `bad_signature`.
- Schreiben nur `service_role`; Owner-Lesezugriff org-gebunden (RLS).
