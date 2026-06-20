-- LokaleBauernConnect — Komplett-Setup (Supabase SQL Editor: einfügen & Run)
-- 0001 Kern · 0002 Payments · 0003 Marktplatz · 0004 Onboarding · Seed. Idempotent.

-- ===== 0001_core =====
-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE_02: Kern-Datenmodell + RLS
-- Additiv, mandantenfähig (org_id), RLS deny-by-default ab Migration #1.
-- Stack: Supabase (Postgres). Public-Katalog (farms/products) lesbar;
-- Schreibrechte über Owner/Service-Role; Reservierungen/Waitlist insert-only.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────
do $$ begin
  create type farm_type as enum ('Hofladen','Bauernhof','Imkerei','Hofmetzgerei','Manufaktur','Gärtnerei');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_category as enum
    ('Obst','Gemüse','Eier','Käse','Honig','Fleisch & Wurst','Kartoffeln','Säfte','Marmelade','Blumen','Getreide & Mehl');
exception when duplicate_object then null; end $$;

do $$ begin
  create type availability_state as enum ('available','low','soon','out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_status as enum ('requested','confirmed','picked_up','cancelled','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('kaeufer','erzeuger','staff','owner');
exception when duplicate_object then null; end $$;

-- ── updated_at-Trigger ─────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ── Mandanten / Identität ──────────────────────────────────────
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references orgs(id) on delete set null,
  role        user_role not null default 'kaeufer',
  display_name text,
  created_at  timestamptz not null default now()
);

-- ── Höfe / Produkte ────────────────────────────────────────────
create table if not exists farms (
  id            text primary key,                     -- slug, stabil (z. B. 'hof-sonnenwiese')
  org_id        uuid not null references orgs(id) on delete cascade,
  name          text not null,
  type          farm_type not null,
  street        text not null,
  plz           text not null,
  city          text not null,
  lat           double precision not null,
  lng           double precision not null,
  story         text not null default '',
  opening_hours text not null default '',
  pickup_windows text[] not null default '{}',
  categories    product_category[] not null default '{}',
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists farms_plz_idx on farms (plz);
create index if not exists farms_org_idx on farms (org_id);
create index if not exists farms_active_idx on farms (deleted_at) where deleted_at is null;

create table if not exists products (
  id           text primary key,
  farm_id      text not null references farms(id) on delete cascade,
  org_id       uuid not null references orgs(id) on delete cascade,
  name         text not null,
  category     product_category not null,
  unit         text not null,
  price        numeric(10,2) not null check (price >= 0),
  availability availability_state not null default 'available',
  seasonal     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_farm_idx on products (farm_id);
create index if not exists products_cat_idx on products (category);

-- ── Reservierungen ─────────────────────────────────────────────
create table if not exists reservations (
  id            uuid primary key default gen_random_uuid(),
  farm_id       text not null references farms(id) on delete cascade,
  product_id    text not null references products(id) on delete cascade,
  org_id        uuid not null references orgs(id) on delete cascade,
  quantity      integer not null check (quantity between 1 and 50),
  pickup_window text not null,
  name          text not null,
  contact       text not null,
  status        reservation_status not null default 'requested',
  created_at    timestamptz not null default now()
);
create index if not exists reservations_farm_idx on reservations (farm_id);
create index if not exists reservations_status_idx on reservations (status);

-- ── Waitlist (Landing) ─────────────────────────────────────────
create table if not exists waitlist (
  id         uuid primary key default gen_random_uuid(),
  role       text not null default 'kaeufer',
  name       text,
  email      text not null,
  plz        text not null,
  ort        text,
  source     text not null default 'landing',
  created_at timestamptz not null default now()
);

-- ── Audit ──────────────────────────────────────────────────────
create table if not exists audit_log (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid,
  actor_user_id uuid,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  reason        text,
  details       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

drop trigger if exists farms_set_updated on farms;
create trigger farms_set_updated before update on farms for each row execute function set_updated_at();
drop trigger if exists products_set_updated on products;
create trigger products_set_updated before update on products for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS — deny-by-default. Nur explizit erlaubte Zugriffe.
-- (service_role umgeht RLS systemseitig → Server/Edge-Funktionen.)
-- ════════════════════════════════════════════════════════════════
alter table orgs         enable row level security;
alter table profiles     enable row level security;
alter table farms        enable row level security;
alter table products     enable row level security;
alter table reservations enable row level security;
alter table waitlist     enable row level security;
alter table audit_log    enable row level security;

-- Öffentlicher Katalog: aktive Höfe + Produkte sind lesbar (Finder).
drop policy if exists farms_public_read on farms;
create policy farms_public_read on farms
  for select to anon, authenticated
  using (deleted_at is null);

drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select to anon, authenticated
  using (exists (select 1 from farms f where f.id = products.farm_id and f.deleted_at is null));

-- Erzeuger pflegt nur den eigenen Hof (org-gebunden).
drop policy if exists farms_owner_write on farms;
create policy farms_owner_write on farms
  for all to authenticated
  using (org_id in (select org_id from profiles where user_id = auth.uid()))
  with check (org_id in (select org_id from profiles where user_id = auth.uid()));

drop policy if exists products_owner_write on products;
create policy products_owner_write on products
  for all to authenticated
  using (org_id in (select org_id from profiles where user_id = auth.uid()))
  with check (org_id in (select org_id from profiles where user_id = auth.uid()));

-- Profil: jede:r liest nur das EIGENE Profil. Schreiben (insb. role/org_id) NUR via
-- service_role (Edge Functions) — verhindert Self-Promotion zu 'staff'/'owner'.
drop policy if exists profiles_self on profiles;
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select to authenticated
  using (user_id = auth.uid());

-- Reservierung: Käufer dürfen anlegen (auch anonym). Lesen nur Hof-Owner.
drop policy if exists reservations_insert on reservations;
create policy reservations_insert on reservations
  for insert to anon, authenticated
  with check (
    exists (select 1 from farms f where f.id = reservations.farm_id and f.org_id = reservations.org_id and f.deleted_at is null)
  );

drop policy if exists reservations_owner_read on reservations;
create policy reservations_owner_read on reservations
  for select to authenticated
  using (org_id in (select org_id from profiles where user_id = auth.uid()));

-- Waitlist: nur Insert (anonym). Lesen ausschließlich service_role (keine Select-Policy).
drop policy if exists waitlist_insert on waitlist;
create policy waitlist_insert on waitlist
  for insert to anon, authenticated
  with check (char_length(email) <= 320 and char_length(plz) <= 16);

-- orgs / audit_log: keine Policy für anon/authenticated → nur service_role.

-- ===== 0002_payments =====
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

-- ===== 0003_marketplace =====
-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE: Marktplatz-Erweiterung
-- Bewertungen + Reputation · Multi-Org (Mitgliedschaften) · Multi-Standorte
-- · Bounties (Käufer-Gesuche) · Credits-Ledger. RLS deny-by-default.
-- ════════════════════════════════════════════════════════════════

-- ── Multi-Org-Helfer: Mitgliedschaft des aktuellen Users ───────
-- security definer, aber prüft NUR auth.uid() → sicher.
create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from profiles  pr where pr.org_id = p_org and pr.user_id = auth.uid());
$$;

-- ── Multi-Org: Mitgliedschaften (ein User in mehreren Orgs) ────
create table if not exists org_members (
  org_id     uuid not null references orgs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       user_role not null default 'erzeuger',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on org_members (user_id);

-- ── Multi-Standorte (Hofladen, Marktstand, unbemannter SB-Stand) ──
create table if not exists org_locations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  farm_id       text references farms(id) on delete set null,
  name          text not null,
  type          text not null default 'hofladen' check (type in ('hofladen','marktstand','sb_stand','ab_hof')),
  street        text, plz text, city text,
  lat           double precision, lng double precision,
  opening_hours text not null default '',
  pickup_windows text[] not null default '{}',
  is_unmanned   boolean not null default false,   -- unbemannter SB-Stand (USP)
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists org_locations_org_idx on org_locations (org_id);
create index if not exists org_locations_plz_idx on org_locations (plz);

-- SB-Zahlung optional einem Standort/Stand zuordnen (QR je Stand).
alter table sb_payments add column if not exists location_id uuid references org_locations(id) on delete set null;

-- ── Bewertungen ────────────────────────────────────────────────
create table if not exists reviews (
  id             uuid primary key default gen_random_uuid(),
  farm_id        text not null references farms(id) on delete cascade,
  org_id         uuid not null references orgs(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name    text,
  rating         smallint not null check (rating between 1 and 5),
  comment        text check (comment is null or char_length(comment) <= 2000),
  verified       boolean not null default false,   -- gekoppelt an echte Reservierung
  status         text not null default 'published' check (status in ('published','hidden')),
  created_at     timestamptz not null default now()
);
create index if not exists reviews_farm_idx on reviews (farm_id);

-- ── Reputation (aggregiert auf farms, per Trigger) ─────────────
alter table farms add column if not exists rating_avg numeric(3,2) not null default 0;
alter table farms add column if not exists rating_count integer not null default 0;
alter table farms add column if not exists reputation_grade text not null default 'neu'
  check (reputation_grade in ('neu','bronze','silber','gold'));

create or replace function recompute_farm_reputation() returns trigger language plpgsql as $$
declare v_farm text; v_avg numeric; v_cnt int;
begin
  v_farm := coalesce(new.farm_id, old.farm_id);
  select round(coalesce(avg(rating),0)::numeric, 2), count(*) into v_avg, v_cnt
    from reviews where farm_id = v_farm and status = 'published';
  update farms set
    rating_avg = v_avg,
    rating_count = v_cnt,
    reputation_grade = case
      when v_cnt = 0 then 'neu'
      when v_avg >= 4.5 and v_cnt >= 10 then 'gold'
      when v_avg >= 4.0 then 'silber'
      else 'bronze' end
  where id = v_farm;
  return null;
end $$;

drop trigger if exists reviews_reputation on reviews;
create trigger reviews_reputation after insert or update or delete on reviews
  for each row execute function recompute_farm_reputation();

-- ── Bounties (Käufer-Gesuche mit optionaler Belohnung) ─────────
create table if not exists bounties (
  id             uuid primary key default gen_random_uuid(),
  author_user_id uuid references auth.users(id) on delete set null,
  author_contact text,
  title          text not null,
  description    text,
  category       product_category,
  plz            text,
  radius_km      integer not null default 25 check (radius_km between 1 and 200),
  reward_cents   integer check (reward_cents is null or reward_cents >= 0),
  status         text not null default 'open' check (status in ('open','fulfilled','expired','cancelled')),
  created_at     timestamptz not null default now()
);
create index if not exists bounties_status_idx on bounties (status);
create index if not exists bounties_plz_idx on bounties (plz);

-- ── Credits-Ledger (Empfehlungs-/Bonus-Guthaben für Erzeuger) ──
create table if not exists credits_ledger (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  amount_cents integer not null,
  reason      text not null,
  ref         text,
  created_at  timestamptz not null default now()
);
create index if not exists credits_org_idx on credits_ledger (org_id);

-- ════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════
alter table org_members   enable row level security;
alter table org_locations enable row level security;
alter table reviews       enable row level security;
alter table bounties      enable row level security;
alter table credits_ledger enable row level security;

-- Mitgliedschaften: Mitglieder lesen die eigener Orgs. Schreiben: service_role.
drop policy if exists org_members_read on org_members;
create policy org_members_read on org_members for select to authenticated using (is_org_member(org_id));

-- Standorte: öffentlicher Katalog lesbar; Schreiben org-gebunden (Multi-Org).
drop policy if exists org_locations_public_read on org_locations;
create policy org_locations_public_read on org_locations for select to anon, authenticated using (deleted_at is null);
drop policy if exists org_locations_owner_write on org_locations;
create policy org_locations_owner_write on org_locations for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Bewertungen: öffentlich lesbar (veröffentlicht); jede:r darf bewerten; Hof darf ausblenden.
drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select to anon, authenticated using (status = 'published');
-- Bewertung anlegen: rating 1–5; verified/status NICHT durch Client fälschbar
-- (verified nur via service_role nach echter Reservierung; status bleibt Default 'published').
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert to anon, authenticated
  with check (rating between 1 and 5 and verified = false and status = 'published'
    and (author_user_id is null or author_user_id = auth.uid()));
drop policy if exists reviews_owner_moderate on reviews;
create policy reviews_owner_moderate on reviews for update to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Bounties: offene öffentlich lesbar; jede:r darf erstellen; Autor verwaltet eigene.
drop policy if exists bounties_public_read on bounties;
create policy bounties_public_read on bounties for select to anon, authenticated using (status = 'open');
-- Bounty anlegen: Autor nicht fälschbar (authentifiziert: nur eigene uid; anon: null).
drop policy if exists bounties_insert on bounties;
create policy bounties_insert on bounties for insert to anon, authenticated
  with check (char_length(title) between 3 and 200 and (author_user_id is null or author_user_id = auth.uid()));
drop policy if exists bounties_author_manage on bounties;
create policy bounties_author_manage on bounties for update to authenticated using (author_user_id = auth.uid());

-- Credits: Owner liest eigenes Guthaben; Schreiben service_role.
drop policy if exists credits_owner_read on credits_ledger;
create policy credits_owner_read on credits_ledger for select to authenticated using (is_org_member(org_id));

-- ── Bestehende Owner-Policies auf Multi-Org (is_org_member) heben ──
drop policy if exists farms_owner_write on farms;
create policy farms_owner_write on farms for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists products_owner_write on products;
create policy products_owner_write on products for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

drop policy if exists reservations_owner_read on reservations;
create policy reservations_owner_read on reservations for select to authenticated
  using (is_org_member(org_id));

drop policy if exists subscriptions_owner_read on subscriptions;
create policy subscriptions_owner_read on subscriptions for select to authenticated
  using (is_org_member(org_id));

drop policy if exists sb_payments_owner_read on sb_payments;
create policy sb_payments_owner_read on sb_payments for select to authenticated
  using (is_org_member(org_id));

-- ===== 0004_onboarding =====
-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE_15: Erzeuger-Onboarding (Bewerbung)
-- Neuer Hof bewirbt sich (datengetriebener Wizard) → Staff verifiziert → Hof wird angelegt.
-- Insert öffentlich (auch anonym); Lesen nur Staff/service_role. RLS deny-by-default.
-- ════════════════════════════════════════════════════════════════

do $$ begin
  create type application_status as enum ('eingereicht','in_pruefung','angenommen','abgelehnt');
exception when duplicate_object then null; end $$;

create table if not exists farm_applications (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  type           farm_type not null,
  email          text not null,
  phone          text,
  street         text not null,
  plz            text not null,
  city           text not null,
  categories     product_category[] not null default '{}',
  story          text not null default '',
  opening_hours  text not null default '',
  pickup_windows text[] not null default '{}',
  status          application_status not null default 'eingereicht',
  decision_reason text,
  decided_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists farm_applications_status_idx on farm_applications (status);
create index if not exists farm_applications_plz_idx on farm_applications (plz);

alter table farm_applications enable row level security;

-- Jede:r darf eine Bewerbung einreichen (auch anonym), mit Basis-Validierung.
drop policy if exists farm_applications_insert on farm_applications;
create policy farm_applications_insert on farm_applications
  for insert to anon, authenticated
  with check (char_length(name) between 2 and 200 and char_length(email) <= 320 and plz ~ '^[0-9]{5}$');

-- Lesen: nur Staff/Owner.
drop policy if exists farm_applications_staff_read on farm_applications;
create policy farm_applications_staff_read on farm_applications
  for select to authenticated
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('staff','owner')));

-- Moderieren (Status setzen): nur Staff/Owner; Status auf gültige Werte begrenzt.
drop policy if exists farm_applications_staff_update on farm_applications;
create policy farm_applications_staff_update on farm_applications
  for update to authenticated
  using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('staff','owner')))
  with check (status in ('eingereicht','in_pruefung','angenommen','abgelehnt'));

-- ===== SEED =====
-- LokaleBauernConnect — Seed (deckungsgleich mit app/src/lib/seed.ts)
-- Jeder Hof = eigene org (Mandant) → echte Isolationsbasis. Idempotent.

insert into orgs (id, name) values
  ('00000000-0000-0000-0000-000000000001','Hof Sonnenwiese'),
  ('00000000-0000-0000-0000-000000000002','Imkerei Lindenblüte'),
  ('00000000-0000-0000-0000-000000000003','Biohof Eichkamp'),
  ('00000000-0000-0000-0000-000000000004','Hofkäserei Altenberge'),
  ('00000000-0000-0000-0000-000000000005','Gärtnerei Mertens'),
  ('00000000-0000-0000-0000-000000000006','Hofmetzgerei Wiebusch'),
  ('00000000-0000-0000-0000-000000000007','Obsthof Deichkrone'),
  ('00000000-0000-0000-0000-000000000008','Mühlenhof Bramsche'),
  ('00000000-0000-0000-0000-000000000009','Hoflädchen Werretal')
on conflict (id) do nothing;

insert into farms (id, org_id, name, type, street, plz, city, lat, lng, story, opening_hours, pickup_windows, categories, verified) values
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Hof Sonnenwiese','Hofladen','Wiesenweg 12','49074','Osnabrück',52.2731,8.0512,'Familienbetrieb in dritter Generation. Saisongemüse, Eier von Freilandhühnern und hausgemachte Marmeladen direkt vom Feld.','Mo–Fr 9–18, Sa 8–13', array['Heute 14–16 Uhr','Heute 16–18 Uhr','Morgen 9–12 Uhr'], array['Gemüse','Obst','Eier','Marmelade']::product_category[], true),
 ('imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Imkerei Lindenblüte','Imkerei','Am Lindenhof 3','49078','Osnabrück',52.2611,8.0102,'Sortenhonige aus dem Osnabrücker Land. Wir wandern mit unseren Völkern zu Raps, Linde und Wald.','Di & Fr 10–18, Sa 9–14', array['Morgen 10–12 Uhr','Morgen 14–18 Uhr'], array['Honig']::product_category[], true),
 ('biohof-eichkamp','00000000-0000-0000-0000-000000000003','Biohof Eichkamp','Bauernhof','Eichkampstraße 40','49090','Osnabrück',52.3201,8.0588,'Zertifizierter Biohof mit Kartoffeln, Wurzelgemüse und eigener Mosterei. Demeter-Qualität.','Mi–Fr 8–18, Sa 8–16', array['Heute 16–18 Uhr','Morgen 8–12 Uhr','Morgen 14–16 Uhr'], array['Kartoffeln','Gemüse','Säfte']::product_category[], true),
 ('kaeserei-altenberge','00000000-0000-0000-0000-000000000004','Hofkäserei Altenberge','Manufaktur','Molkereiweg 7','48249','Dülmen',51.7921,7.3344,'Handwerkskäse aus Heumilch der eigenen Kühe. Vom milden Schnittkäse bis zum gereiften Bergkäse.','Do–Sa 9–17', array['Morgen 9–12 Uhr','Morgen 13–17 Uhr'], array['Käse']::product_category[], false),
 ('gaertnerei-mertens','00000000-0000-0000-0000-000000000005','Gärtnerei Mertens','Gärtnerei','Blumenstraße 22','48143','Münster',51.9621,7.6288,'Schnittblumen und Beetpflanzen aus eigener Anzucht – mitten in Münster, ohne lange Transportwege.','Mo–Sa 8–18', array['Heute 12–15 Uhr','Heute 15–18 Uhr','Morgen 8–11 Uhr'], array['Blumen','Gemüse']::product_category[], false),
 ('metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Hofmetzgerei Wiebusch','Hofmetzgerei','Dorfstraße 5','48151','Münster',51.9388,7.6121,'Eigene Weidehaltung, kurze Wege, ehrliches Handwerk. Wurst nach Familienrezept ohne Zusatzstoffe.','Di–Fr 8–18, Sa 7–13', array['Morgen 8–11 Uhr','Morgen 14–18 Uhr'], array['Fleisch & Wurst']::product_category[], true),
 ('obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Obsthof Deichkrone','Bauernhof','Deichweg 18','26135','Oldenburg',53.1291,8.2488,'Äpfel, Birnen und Beeren von alten Sorten. Eigene Saftpressung im Herbst.','Mi–Sa 9–18', array['Heute 15–18 Uhr','Morgen 9–12 Uhr','Morgen 15–18 Uhr'], array['Obst','Säfte','Marmelade']::product_category[], false),
 ('muehlenhof-bramsche','00000000-0000-0000-0000-000000000008','Mühlenhof Bramsche','Manufaktur','Mühlenstraße 9','49565','Bramsche',52.4081,7.9772,'Regionales Getreide, frisch vermahlen. Mehle, Flocken und Backmischungen aus der eigenen Mühle.','Mo–Fr 9–17, Sa 9–12', array['Morgen 9–12 Uhr','Morgen 13–17 Uhr'], array['Getreide & Mehl']::product_category[], false),
 ('hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Hoflädchen Werretal','Hofladen','Werrestraße 30','32049','Herford',52.2061,8.5871,'Buntes Hoflädchen mit allem aus der Region: Gemüse, Eier, Honig und wechselnden Spezialitäten.','Di–Fr 10–18, Sa 9–14', array['Heute 14–16 Uhr','Morgen 10–13 Uhr'], array['Gemüse','Eier','Honig','Marmelade']::product_category[], true)
on conflict (id) do nothing;

insert into products (id, farm_id, org_id, name, category, unit, price, availability, seasonal) values
 ('p1','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Erdbeeren','Obst','Schale 500g',3.90,'available',true),
 ('p2','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Freilandeier','Eier','10 Stück',3.20,'available',false),
 ('p3','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Bunte Tomaten','Gemüse','kg',4.50,'low',true),
 ('p4','hof-sonnenwiese','00000000-0000-0000-0000-000000000001','Erdbeer-Marmelade','Marmelade','Glas 250g',4.20,'available',false),
 ('p5','imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Lindenhonig','Honig','Glas 500g',8.50,'available',true),
 ('p6','imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Rapshonig','Honig','Glas 500g',7.50,'low',false),
 ('p7','imkerei-lindenblum','00000000-0000-0000-0000-000000000002','Waldhonig','Honig','Glas 500g',9.50,'soon',false),
 ('p8','biohof-eichkamp','00000000-0000-0000-0000-000000000003','Festkochende Kartoffeln','Kartoffeln','Sack 2,5kg',4.90,'available',false),
 ('p9','biohof-eichkamp','00000000-0000-0000-0000-000000000003','Naturtrüber Apfelsaft','Säfte','Flasche 1L',3.40,'available',false),
 ('p10','biohof-eichkamp','00000000-0000-0000-0000-000000000003','Möhren mit Grün','Gemüse','Bund',2.20,'available',false),
 ('p11','kaeserei-altenberge','00000000-0000-0000-0000-000000000004','Heumilch-Schnittkäse','Käse','Stück ~300g',6.80,'available',false),
 ('p12','kaeserei-altenberge','00000000-0000-0000-0000-000000000004','Gereifter Bergkäse','Käse','Stück ~300g',8.90,'low',false),
 ('p13','gaertnerei-mertens','00000000-0000-0000-0000-000000000005','Sommerstrauß bunt','Blumen','Strauß',12.50,'available',true),
 ('p14','gaertnerei-mertens','00000000-0000-0000-0000-000000000005','Tomaten-Jungpflanzen','Gemüse','3er Topf',5.50,'soon',false),
 ('p15','metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Weiderind-Hackfleisch','Fleisch & Wurst','500g',7.90,'available',false),
 ('p16','metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Grillwurst grob','Fleisch & Wurst','4 Stück',5.50,'low',false),
 ('p17','metzgerei-wiebusch','00000000-0000-0000-0000-000000000006','Kochschinken am Stück','Fleisch & Wurst','~250g',6.20,'out',false),
 ('p18','obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Johannisbeeren rot','Obst','Schale 250g',3.50,'available',true),
 ('p19','obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Apfel-Birnen-Saft','Säfte','Flasche 1L',3.60,'available',false),
 ('p20','obsthof-deichkrone','00000000-0000-0000-0000-000000000007','Johannisbeer-Gelee','Marmelade','Glas 250g',4.50,'low',false),
 ('p21','muehlenhof-bramsche','00000000-0000-0000-0000-000000000008','Dinkelmehl Type 630','Getreide & Mehl','Tüte 1kg',2.80,'available',false),
 ('p22','muehlenhof-bramsche','00000000-0000-0000-0000-000000000008','Roggenvollkornmehl','Getreide & Mehl','Tüte 1kg',2.60,'available',false),
 ('p23','hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Saisongemüse-Kiste','Gemüse','Kiste klein',14.90,'available',true),
 ('p24','hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Wachteleier','Eier','12 Stück',3.80,'low',false),
 ('p25','hoflaedchen-werretal','00000000-0000-0000-0000-000000000009','Blütenhonig','Honig','Glas 500g',7.20,'available',false)
on conflict (id) do nothing;

-- Bewertungen (Demo) → Reputation wird per Trigger auf farms aggregiert.
-- hoflaedchen-werretal bleibt bewusst ohne Bewertung (Zero-State "neu").
insert into reviews (farm_id, org_id, rating, author_name, comment, verified) values
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001',5,'Marie K.','Beste Erdbeeren weit und breit, super freundlich.',true),
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001',5,'Tobias R.','Frische Eier, faire Preise. Komme wieder.',true),
 ('hof-sonnenwiese','00000000-0000-0000-0000-000000000001',4,'Lena S.','Tolles Gemüse, Abholung klappte reibungslos.',true),
 ('imkerei-lindenblum','00000000-0000-0000-0000-000000000002',5,'Hannes B.','Der Lindenhonig ist ein Traum.',true),
 ('imkerei-lindenblum','00000000-0000-0000-0000-000000000002',5,'Petra M.','Echter Sortenhonig, schmeckt man sofort.',true),
 ('biohof-eichkamp','00000000-0000-0000-0000-000000000003',5,'Jens W.','Klasse Bio-Kartoffeln, top Beratung.',true),
 ('biohof-eichkamp','00000000-0000-0000-0000-000000000003',4,'Sara L.','Saft direkt vom Hof, sehr lecker.',true),
 ('kaeserei-altenberge','00000000-0000-0000-0000-000000000004',5,'Markus D.','Bergkäse erste Sahne.',true),
 ('kaeserei-altenberge','00000000-0000-0000-0000-000000000004',4,'Ina K.','Heumilchkäse super, etwas knappe Öffnungszeiten.',true),
 ('gaertnerei-mertens','00000000-0000-0000-0000-000000000005',4,'Olaf P.','Schöner Strauß, hält lange.',false),
 ('metzgerei-wiebusch','00000000-0000-0000-0000-000000000006',5,'Birgit H.','Wurst wie früher, ehrliches Handwerk.',true),
 ('metzgerei-wiebusch','00000000-0000-0000-0000-000000000006',4,'Karl F.','Gutes Weiderind, gerne wieder.',true),
 ('obsthof-deichkrone','00000000-0000-0000-0000-000000000007',4,'Nadine T.','Alte Apfelsorten — selten und gut.',true),
 ('muehlenhof-bramsche','00000000-0000-0000-0000-000000000008',4,'Georg V.','Frisches Mehl, klarer Unterschied beim Backen.',true);

