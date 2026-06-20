# Subscription Lifecycle — Erzeuger-Abo

> Kanon: `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`. Bei Konflikt gewinnt der echte Code.
> Quellen: `supabase/functions/create-checkout/index.ts`, `supabase/functions/stripe-webhook/index.ts`,
> `supabase/functions/_shared/stripe.ts`, `supabase/migrations/0002_payments.sql`.

## Status-Werte (`subscription_status`)
`inactive` · `trialing` · `active` · `past_due` · `canceled`
DB-Default: `inactive`. Plan-Default: `basis`.

## Lebenszyklus

### 1. Checkout starten
`create-checkout` mit `mode: 'subscription'`, `plan` (`basis`/`plus`/`pro`), `orgId`, `successUrl`, optional `contact`/`cancelUrl`.
- Plan → Price-ID über `priceIdForPlan`. Fehlt die Price-ID → `plan_not_configured` (400).
- Stripe Checkout Session (`mode: 'subscription'`, `automatic_payment_methods`), Metadaten `{ kind: 'subscription', org_id, plan }`.
- Antwort: `{ url }` (Stripe-Checkout-URL).

### 2. Aktivierung (Webhook `checkout.session.completed`)
Bei `metadata.kind === 'subscription'` und vorhandener `org_id`:
- **Upsert** in `subscriptions` (onConflict: `stripe_subscription_id`): `plan`, `status: 'active'`, `stripe_customer_id`, `stripe_subscription_id`.
- Audit: `subscription.activated` in `audit_log` (entity_type `subscription`, entity_id = `org_id`).

### 3. Änderung (Webhook `customer.subscription.updated`)
- `status` = `mapSubStatus(sub.status)` → auf DB-Enum gemappt; unbekannter Status fällt auf `past_due`.
- `current_period_end` aus Stripe (Unix-Sekunden → ISO).
- Update per `stripe_subscription_id`.

### 4. Kündigung (Webhook `customer.subscription.deleted`)
- `status: 'canceled'`, `current_period_end` aktualisiert. Update per `stripe_subscription_id`.

## Idempotenz
Jedes Stripe-Event wird über `payment_events` (PK = Event-ID) genau **einmal** verarbeitet.
Duplikat → HTTP 200 `duplicate`, kein erneuter Effekt.

## Sichtbarkeit (RLS)
Owner liest nur das eigene Org-Abo (`subscriptions_owner_read`). Schreiben ausschließlich `service_role` (Edge Functions).

## Hinweise / offene Punkte
- Trials (`trialing`): Status existiert im Enum, wird aber nur passiv aus Stripe übernommen — keine eigene Trial-Logik im Code.
- Plan-Upgrade/Downgrade-Regeln (Proration, Stichtag): [[OWNER: Geschäftsregel festlegen]].
- Kündigungsfristen / Widerruf: [[OWNER: rechtliche Vorgabe festlegen]].
