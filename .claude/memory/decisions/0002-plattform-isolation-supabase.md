# ADR 0002 — Plattform-Isolation: eigenes Supabase-Projekt + RLS

- **Status:** Akzeptiert · **Datum:** 2026-06-19

**Kontext:** Mandantenfähigkeit + Plattform-Isolation sind Imperium-Pflicht (RLS ab Migration #1).

**Entscheidung:** LokaleBauernConnect erhält ein **eigenes Supabase-Projekt (EU)**. Jede Tabelle: `org_id`/Tenant, Zeitstempel, `deleted_at`, **RLS deny-by-default**. Pflicht-Test: Plattform-Isolation **und** Org-Isolation grün vor jedem Merge.

**Konsequenz:** Datenlecks ausgeschlossen by-default; Skalierung 10→300 ohne Re-Architektur. service role nur in Edge Functions.
