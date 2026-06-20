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
