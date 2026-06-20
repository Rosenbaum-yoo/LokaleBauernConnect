-- 0005_support.sql — Freiwilliger Unterstuetzungsbeitrag (Plattform-Einnahme) am SB-Stand.
-- Additiv + idempotent. Trennt den Plattform-Support sauber vom Warenwert (geht an den Hof),
-- damit Plattform-Umsatz aus Support separat auditierbar/auswertbar ist.
alter table public.sb_payments
  add column if not exists support_cents integer not null default 0;

comment on column public.sb_payments.support_cents is
  'Freiwilliger Unterstuetzungsbeitrag des Kaeufers an die Plattform (in Cent). Getrennt von amount_cents (Warenwert -> Hof).';
