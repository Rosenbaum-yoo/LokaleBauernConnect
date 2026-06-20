-- 0006_harvest.sql — Erntedatum je Produkt (Frische-Signal im Finder). Additiv + idempotent.
alter table public.products
  add column if not exists harvested_at date;

comment on column public.products.harvested_at is
  'Optionales Erntedatum (Frische). Pflegt der Erzeuger; treibt Card-Label + Sortierung "Frische".';
