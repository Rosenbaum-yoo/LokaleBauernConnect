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
