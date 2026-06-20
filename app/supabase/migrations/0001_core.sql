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
