# Architecture — LokaleBauernConnect

> Stand: 2026-06-20. Grounded im Code; bei Abweichung gilt der Code.

## Überblick

LokaleBauernConnect verbindet Käufer mit regionalen Höfen: Höfe finden, Produkte sehen, reservieren, abholen. Plus Marktplatz/Bounties, Onboarding für Erzeuger und kostenpflichtige Pläne (Stripe).

## Schichten

```
Browser (React 18 + Vite PWA)
   └─ src/lib/data.ts  ──┬─ Supabase (Postgres, RLS)        [Live-Modus]
                         └─ src/lib/seed.ts (Seed-Daten)    [Demo-Modus]
Supabase Edge Functions (Deno):  create-checkout · stripe-webhook
Stripe (Checkout + Webhook)
Cloudflare Pages (statisches Hosting von dist/)
```

- **Frontend:** React 18, React Router v6, Vite, PWA (`vite-plugin-pwa`). Karten über Leaflet/react-leaflet.
- **Datenschicht:** `src/lib/data.ts` ist die einzige API; sie nutzt Supabase, sobald `VITE_SUPABASE_*` gesetzt ist, und fällt sonst (oder bei Query-Fehler) auf Seed-Daten zurück. So bleibt die UI identisch; der Umstieg ist reine Konfiguration (`isSupabaseConfigured` in `src/lib/supabase.ts`).
- **Serverlogik:** ausschließlich als Supabase Edge Functions (Deno). Kein eigener Node-Server.
- **Validierung:** `zod` an Eingabegrenzen.

## Datenmodell (Supabase)

Definiert in `supabase/migrations/0001_core.sql` … `0004_onboarding.sql`, zusammengefasst in `supabase/setup_all.sql`. Mandantenfähig (`org_id`), RLS deny-by-default ab Migration #1.

### Tabellen
`orgs`, `profiles`, `org_members`, `org_locations`, `farms`, `products`, `reservations`, `waitlist`, `reviews`, `audit_log`, `bounties`, `credits_ledger`, `farm_applications`, `payment_events`, `sb_payments`, `subscriptions`.

### Enums
`farm_type`, `product_category`, `availability_state` (`available` \| `low` \| `soon` \| `out`), `reservation_status` (`requested` \| `confirmed` \| `picked_up` \| `cancelled` \| `expired`), `user_role` (`kaeufer` \| `erzeuger` \| `staff` \| `owner`), `payment_status`, `subscription_status`, `application_status`.

### DB-Funktionen
`set_updated_at` (Trigger), `is_org_member`, `recompute_farm_reputation`.

> `farms.id` ist ein stabiler Slug (text, z. B. `hof-sonnenwiese`), kein UUID.

## Payments

Stripe-Pläne (Edge-Function-Secrets `STRIPE_PRICE_BASIS` / `_PLUS` / `_PRO`). `create-checkout` erzeugt die Checkout-Session, `stripe-webhook` verarbeitet Events und schreibt in die Payment-/Subscription-Tabellen. Geteilte Helfer in `supabase/functions/_shared/` (`stripe.ts`, `supabaseAdmin.ts`, `cors.ts`, `email.ts`).

## Querschnitt

- **Observability:** `src/lib/observability.ts` (siehe `../OBSERVABILITY.md`).
- **Health:** `/status` → `checkHealth()` (siehe `../MONITORING.md`).
- **Security-Header & SPA-Fallback:** `public/_headers`, `public/_redirects`.
