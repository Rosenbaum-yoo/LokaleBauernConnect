-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE_09 / Track A: Payments + Subscriptions
-- Stripe (Karte, SEPA, PayPal, Giropay, Klarna, Apple/Google Pay via Stripe)
-- + SB-Bezahlung (unbemannter Hofladen) + Erzeuger-Abo. RLS deny-by-default.
-- service_role (Edge Functions) schreibt; Owner liest nur Eigenes.
-- ════════════════════════════════════════════════════════════════

do $$ begin
  create type payment_status as enum ('initiated','paid','failed','refunded','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('inactive','trialing','active','past_due','canceled');
exception when duplicate_object then null; end $$;

-- ── Erzeuger-Abo (Stripe-Subscription) ─────────────────────────
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references orgs(id) on delete cascade,
  plan                   text not null default 'basis' check (plan in ('demo','basis','plus','pro','individuell')),
  status                 subscription_status not null default 'inactive',
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_org_idx on subscriptions (org_id);

-- ── SB-Bezahlung am unbemannten Stand (USP) ────────────────────
create table if not exists sb_payments (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null references orgs(id) on delete cascade,
  farm_id                  text not null references farms(id) on delete cascade,
  product_id               text references products(id) on delete set null,
  quantity                 integer not null default 1 check (quantity between 1 and 50),
  amount_cents             integer not null check (amount_cents >= 0),
  currency                 text not null default 'eur',
  method                   text,                       -- card/sepa_debit/paypal/giropay/klarna...
  status                   payment_status not null default 'initiated',
  stripe_checkout_session  text,
  stripe_payment_intent    text,
  payer_contact            text,                       -- optional, fuer Quittung
  created_at               timestamptz not null default now(),
  paid_at                  timestamptz
);
create index if not exists sb_payments_org_idx on sb_payments (org_id);
create index if not exists sb_payments_farm_idx on sb_payments (farm_id);
create index if not exists sb_payments_status_idx on sb_payments (status);

-- ── Webhook-Idempotenz (Stripe Event-IDs) ──────────────────────
create table if not exists payment_events (
  id          text primary key,                        -- Stripe event id (evt_...)
  type        text not null,
  received_at timestamptz not null default now()
);

-- ── Reservierung: Zahlart ergänzen (Barzahlung bei Abholung vs. online) ──
alter table reservations add column if not exists payment_method text not null default 'pickup_cash'
  check (payment_method in ('pickup_cash','online'));
alter table reservations add column if not exists payment_status payment_status not null default 'initiated';

drop trigger if exists subscriptions_set_updated on subscriptions;
create trigger subscriptions_set_updated before update on subscriptions for each row execute function set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────
alter table subscriptions  enable row level security;
alter table sb_payments    enable row level security;
alter table payment_events enable row level security;

-- Owner liest eigenes Abo / eigene SB-Zahlungen (org-gebunden). Schreiben: nur service_role.
drop policy if exists subscriptions_owner_read on subscriptions;
create policy subscriptions_owner_read on subscriptions
  for select to authenticated
  using (org_id in (select org_id from profiles where user_id = auth.uid()));

drop policy if exists sb_payments_owner_read on sb_payments;
create policy sb_payments_owner_read on sb_payments
  for select to authenticated
  using (org_id in (select org_id from profiles where user_id = auth.uid()));

-- payment_events: keine Policy → nur service_role.
