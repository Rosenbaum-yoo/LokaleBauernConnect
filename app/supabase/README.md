# Supabase — LokaleBauernConnect (WAVE_02)

Datenmodell + RLS + Seed für die Plattform. **EU-Region.** Bis konfiguriert läuft die App auf Seed-Daten (`src/lib/seed.ts`) — identische Struktur.

## Dateien
- `migrations/0001_core.sql` — Schema (orgs, profiles, farms, products, reservations, waitlist, audit_log) + Indizes + **RLS deny-by-default** + Policies (öffentlicher Katalog lesbar; Schreiben org-gebunden; Reservierung/Waitlist insert-only).
- `seed.sql` — 9 echte Höfe + 25 Produkte (deckungsgleich mit `src/lib/seed.ts`), je Hof eine eigene `org` (Isolationsbasis).

## Go-Live (Owner-Schritte — kosten-/accountrelevant, vorab abstimmen)
1. Supabase-Projekt (EU) anlegen.
2. Schema + Seed einspielen — per Supabase CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push            # wendet migrations/ an
   psql "$DATABASE_URL" -f supabase/seed.sql   # oder: supabase db reset (lokal)
   ```
   oder Inhalt von `0001_core.sql` + `seed.sql` im Supabase-SQL-Editor ausführen.
3. `app/.env` aus `.env.example` füllen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. App neu starten → Header zeigt „Live-Daten"; Finder/Reservierung laufen gegen Postgres (RLS aktiv).

## RLS-Kurzfassung
- `farms`/`products`: **public read** (Katalog), Schreiben nur Owner-Org (`profiles.org_id`).
- `reservations`: Insert für alle (auch anonym), aber nur mit gültiger `farm_id`+`org_id`-Kombi; Lesen nur Hof-Owner.
- `waitlist`: insert-only; Lesen nur `service_role`.
- `orgs`/`audit_log`: nur `service_role`.

## Isolationstest (Pflicht vor Merge, WAVE_02-Acceptance)
Negativtest: Anon/fremde Org liest keine fremden Reservierungen; Owner A sieht keine Daten von Org B. (Testfälle: `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`.)
