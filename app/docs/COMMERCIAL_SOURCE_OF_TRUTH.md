# Commercial — Source of Truth

> Kanon für alles Kommerzielle (Pläne, Zahlung, Abo, Stripe) von LokaleBauernConnect.
> Bei Konflikt gewinnt **der echte Code** über jede Doku. Diese Datei spiegelt den Code-Stand wider.
> Stack: React + Vite + TypeScript (Frontend) · Supabase (Postgres + Edge Functions, Deno) · Stripe · Cloudflare.
> Kein VMS, kein Hetzner, kein eigenes Node/Express-Backend — Zahlungslogik läuft in Supabase Edge Functions.

## Maßgebliche Code-Dateien
| Bereich | Datei |
|---|---|
| Checkout-Session erzeugen | `supabase/functions/create-checkout/index.ts` |
| Stripe-Webhook (eine Wahrheit, idempotent) | `supabase/functions/stripe-webhook/index.ts` |
| Stripe-Client + Plan→Price + Status-Mapping | `supabase/functions/_shared/stripe.ts` |
| Quittungs-Mail | `supabase/functions/_shared/email.ts` |
| DB-Schema (Tabellen, Enums, RLS) | `supabase/migrations/0002_payments.sql` |

## Pläne (Erzeuger-Abo)
DB-Constraint (`subscriptions.plan`, Migration 0002): `demo`, `basis`, `plus`, `pro`, `individuell`.

Checkout-fähig (haben Stripe Price-ID via `priceIdForPlan`): **`basis`, `plus`, `pro`**.

> `demo` und `individuell` sind im DB-Constraint erlaubt, haben aber **keine** Stripe-Price-ID.
> Ein `subscription`-Checkout für diese Pläne liefert `plan_not_configured` (HTTP 400).
> Default-Plan im Code: `basis` (sowohl `create-checkout` als auch DB-Default `subscriptions.plan`).

Preise/Features je Plan: [[OWNER: Plan-Preise und Feature-Matrix verbindlich festlegen — nicht im Code hinterlegt, nur Stripe-Price-IDs als Secrets]].

## Zahlungs-Wege (create-checkout `mode`)
| `mode` | Zweck | Stripe `mode` |
|---|---|---|
| `sb_payment` | Einzelprodukt-Zahlung am unbemannten Hofladen-Stand (SB) | `payment` |
| `sb_basket` | Mehrere Produkte (Warenkorb) am SB-Stand | `payment` |
| `subscription` | Erzeuger-Abo | `subscription` |

Preis wird **immer serverseitig** aus `products.price` ermittelt (Client-Betrag wird nie vertraut).
Menge je Position auf **1–50** begrenzt. Währung: `eur`.
Zahlarten: `automatic_payment_methods` → alle im Stripe-Dashboard aktivierten (Karte, SEPA, PayPal, Giropay, Klarna, Apple/Google Pay).

## Datenmodell (Migration 0002_payments.sql)
- **Enum `payment_status`**: `initiated`, `paid`, `failed`, `refunded`, `canceled`
- **Enum `subscription_status`**: `inactive`, `trialing`, `active`, `past_due`, `canceled`
- **Tabelle `subscriptions`**: `id, org_id, plan, status, stripe_customer_id, stripe_subscription_id (unique), current_period_end, created_at, updated_at`
- **Tabelle `sb_payments`**: `id, org_id, farm_id, product_id, quantity (1–50), amount_cents, currency, method, status, stripe_checkout_session, stripe_payment_intent, payer_contact, created_at, paid_at`
- **Tabelle `payment_events`**: `id` (Stripe Event-ID, PK = Idempotenz), `type`, `received_at`
- **`reservations`** (Erweiterung): `payment_method` (`pickup_cash` | `online`, Default `pickup_cash`), `payment_status` (Enum, Default `initiated`)

## Sicherheit / RLS
- RLS **deny-by-default**. Schreiben nur durch `service_role` (Edge Functions).
- Owner liest nur eigene Org-Daten: `subscriptions_owner_read`, `sb_payments_owner_read` (`org_id in (select org_id from profiles where user_id = auth.uid())`).
- `payment_events`: keine Policy → ausschließlich `service_role`.
- Webhook nur über geprüfte Stripe-Signatur (`constructEventAsync`); ohne `STRIPE_WEBHOOK_SECRET` → 503.

## Secrets (Supabase Function-Secrets / `.env`)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIS`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`, `PUBLIC_APP_URL`.
Ohne `STRIPE_SECRET_KEY` sind Payments deaktiviert (`getStripe()` → `null`, Checkout liefert `payments_disabled` 503).

## Verwandte Docs
- `docs/PRICING.md` — Pläne & Preise
- `docs/SUBSCRIPTION_LIFECYCLE.md` — Abo-Lebenszyklus
- `docs/STRIPE-SETUP.md` — Stripe-Einrichtung & Go-Live
