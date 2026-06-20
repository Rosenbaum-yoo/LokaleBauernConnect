-- 0007_producer.sql — Erzeuger-Typ (gewerblich/privat/verein) + Selbsterklaerungen. Additiv + idempotent.
-- Privat/Hobby = nur eigene UNVERARBEITETE Urproduktion (Obst/Gemuese/Eier/Honig);
-- Verein = gemeinnuetzig. Kleingaerten (BKleingG) duerfen NICHT verkaufen -> kein eigener Typ.
alter table public.farm_applications
  add column if not exists producer_kind       text,
  add column if not exists decl_self_produced  boolean not null default false,
  add column if not exists decl_responsibility boolean not null default false,
  add column if not exists decl_food_law       boolean not null default false;

alter table public.farms
  add column if not exists producer_kind text;
