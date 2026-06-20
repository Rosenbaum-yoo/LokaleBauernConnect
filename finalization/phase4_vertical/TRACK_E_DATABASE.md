# Phase 4 · Track E — Datenmodell-Skalierung (Erweiterungen, Indizes, Caching für 300 Höfe)

> **Was diese Datei ist.** Der verbindliche Bauplan, der LokaleBauernConnect vom *„läuft mit 10 Höfen"* zum *„trägt 300 Höfe, zehntausende Produkte/Verfügbarkeiten, hunderttausende Reservierungen/SB-Zahlungen und viele tausend gleichzeitige Käufer:innen"* hebt — **ohne** Latenz-Einbruch, **ohne** RLS aufzuweichen, **ohne** Kostenexplosion auf Supabase/Cloudflare. Track E ist die **Datenmodell-Säule** der vertikalen Strecken (Phase 4) und der direkte Skalierungs-Türöffner für **Phase 5 (Customer-Gates 50/100/300)**.
> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C · Rolle = **Vermittler** (kein Eigenverkauf, keine Beratung, kein eigener Kaufvertrag — Disclaimer durchgängig).
> **Stack fix:** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF, **Cache API/Edge-Cache**) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker, kein eigenes Postgres-Tuning auf OS-Ebene** — skaliert wird **innerhalb** der Supabase/Postgres- und Cloudflare-Plattform.
> **Adaptiert** aus dem TempConnect-Blueprint (read-only Referenz, falls vorhanden) auf diese Domäne und diesen Stack. Keine VMS-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne übersetzt.
> **Bezug & Konflikt-Hierarchie:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler) · `AGENTS.md` (harte Regeln, Subagenten) · `PHASEN.md` (Phase 4 Track E) · `MASTER_INDEX.md` · **`finalization/WAVE_11_database.md`** (Vorgate: Indizes, Keyset-Pagination, N+1-Beseitigung) · `finalization/phase2_release/GATES.md` (Gate E Performance) · `finalization/phase4_vertical/TRACK_A_SB_PAYMENT.md` (SB-USP, Geldfluss) · `finalization/phase4_vertical/TRACK_B_KARTE.md` (Geo/Karte). **User-Anweisung > AGENTS.md > Subagent/Skill > CLAUDE.md > diese Datei.**
>
> **Verhältnis zu WAVE_11.** WAVE_11 ist die **Fundament-Härtung** (statische Indizes, Keyset-Pagination im Finder, `getFarm()`-N+1 weg, `farm_list_v`/`security_invoker`, lokales Perf-Gate). Track E ist die **Wachstums-Schicht darüber:** materialisierte Aggregate + Refresh-Strategie, mehrstufiges Caching (Cloudflare-Edge → RPC → Browser), Geo-at-Scale (Bounding-Box/PostGIS-Pfad), Volltextsuche, Verlaufsdaten-Lebenszyklus (Archiv/Partition-Readiness), Verbindungs-/Kosten-Disziplin und ein **Last-Benchmark gegen 300-Hof-Synthetik**. **WAVE_11-Gate muss grün sein, bevor Track E beginnt** (`WAVE_11`, Abschnitt „Übergang").

---

## 0. Geltungsbereich, Eintrittsbedingung & Stop-Regeln

- **Eintrittsbedingung (hart).** Track E startet erst, wenn das **WAVE_11-Performance-Gate** grün ist (alle Pflicht-Indizes vorhanden, `farm_list_v` = `security_invoker`, kein Seq-Scan auf heißen Pfaden unter 300-Hof-Last, `getFarm` = 1 Query, `listFarms` keyset-paginiert, Tenant-Isolationstest grün). Ein roter WAVE_11-Block ist ein P0 und sticht jeden Track-E-Schritt.
- **Reversibel & repo-lokal bis Owner-Freigabe.** Alles in dieser Strecke entsteht zunächst als **neue, rein additive Migration**, Edge-/Frontend-Code, Skripte und Doku — lokal gegen `supabase start` verifiziert. **Kein** `supabase db push` gegen Prod, **keine** kostenpflichtige Extension-/Plattform-Aktivierung, **kein** `git commit`/`push` ohne ausdrückliche **Owner-Freigabe** (Account/Kosten/irreversibel).
- **RLS ist unantastbar.** Skalierung darf die Mandanten-Isolation (Produktionspfeiler #1) **nie** aufweichen. Jede neue View/Materialized-View/RPC/Funktion wird auf RLS-Wirkung geprüft (`security_invoker` bzw. bewusst geprüfte `security definer` mit `auth.uid()`-Bindung wie `is_org_member`). Aggregat ≠ Schattenwahrheit: **Domain owns truth, Aggregat owns Geschwindigkeit.**
- **Vermittler-Wahrheit bleibt.** Keine neue Tabelle/Spalte/Sicht suggeriert Eigenverkauf, Bestand als verbindliches Angebot, garantierte Menge/Lieferung oder eine Beratung. Verfügbarkeit = Erzeuger-Selbstauskunft mit Frische-Signal, kein Kaufvertrag mit der Plattform.

### Stop-Regeln (anhalten, minimalen Fix vorschlagen, auf Owner-OK warten)

1. **Prod statt lokal nötig** (`EXPLAIN`/Benchmark/Refresh gegen Produktiv-Supabase) oder `supabase db push` → **STOP**, Owner-Freigabe (Account/Kosten/irreversibel).
2. **Kostenpflichtige/teure Plattform-Aktivierung** — PostGIS, `pg_trgm`, `pg_cron`, `pg_stat_statements`, Read-Replica, größere Compute-Instanz, Cloudflare-Cache-Reserve → **STOP**, Trade-off + Kosten in Klartext, Owner entscheidet.
3. **Schema-/RLS-Semantikänderung** (nicht rein additiv, Policy-Logik ändert sich, Spalten-Drop, Constraint-Verschärfung mit Datenbruch) → **STOP**, additiven Alternativweg + Rollback vorschlagen.
4. **Aggregat ohne RLS-Beleg** (Materialized View / Cache, der org-fremde Daten sichtbar machen könnte) → **STOP**, Isolations-Bruch-Verdacht, nicht ausliefern.
5. **Geo-Distanz zwingend in der DB** (Bounding-Box reicht nicht, echte PostGIS-Sortierung nötig) → **STOP**, das ist primär **Track B (Karte)** mit eigenem ADR; hier nur der vorbereitende, additive Anschluss.
6. **Caching maskiert einen Stale-Risiko-Pfad** (z. B. SB-Zahlungsstatus, Reservierungsstatus, Entitlement aus dem Cache statt aus der Wahrheit) → **STOP**, kritische Wahrheiten werden **nie** edge-gecacht.

---

## 1. Skalierungs-Annahmen & Zielbudget (10 → 300 Höfe)

Damit „skaliert" eine geprüfte Zahl ist und kein Gefühl (`CLAUDE.md §0`), legen wir die Last-Hypothese und die Budgets fest. Quelle der Größen: `PHASEN.md` (300 Höfe), Schema-Realität (`0001`–`0003`), realistische Marktannahme Klasse C (regionaler Direktvertrieb).

### 1.1 Last-Hypothese „voll skaliert"

| Dimension | Heute (Seed/Start) | Zielzustand Track E | Größenordnung |
|---|---|---|---|
| Orgs (Erzeuger-Mandanten) | ~10 | **300** | klein, aber Multi-Org je Hof möglich |
| `farms` (aktiver Katalog) | ~10 | **300–500** (inkl. Mehr-Standort) | + `org_locations` (Hofladen/Marktstand/SB-Stand/ab Hof) |
| `products` | ~80 | **~15 000** (Ø 30–50 je Hof, saisonal rotierend) | heißer Embed-Pfad im Finder |
| `availability`-Updates | sporadisch | **~10 000/Tag** (Erzeuger-Selbstpflege, mobil) | Schreib-Burst morgens |
| `reservations` (kumuliert/Jahr) | dutzende | **~300 000/Jahr** | Verlaufsdaten → Archiv-Kandidat |
| `sb_payments` (kumuliert/Jahr) | 0 | **~500 000/Jahr** (USP wächst) | Report-Hotpath, Verlaufsdaten |
| `reviews` | dutzende | **~50 000** | Reputation-Trigger-Last |
| `audit_log` | gering | **Millionen/Jahr** | reine Append-Tabelle → Partition/Archiv |
| Gleichzeitige Käufer:innen (Finder) | dutzende | **mehrere Tausend Peaks** (Saisonstart, Marketing) | Lese-Hotpath → Edge-Cache |

### 1.2 Performance-Budget (Gate-tauglich)

| Pfad | Budget (p95) | Wie gemessen |
|---|---|---|
| Finder erste Seite (Region + Kategorie, 24 Treffer) | **≤ 120 ms** DB-`mean_exec_time`; **≤ 50 ms** Edge-Cache-Hit | `EXPLAIN (ANALYZE)` + Cache-Hit-Log |
| Finder „Mehr laden" (Keyset, beliebige Tiefe) | **konstant ≤ 120 ms** (tiefenunabhängig) | EXPLAIN bei Seite 1 vs. Seite 20 |
| Hof-Detail (1 Hof + Produkte + Verfügbarkeit + Reputation) | **≤ 80 ms** | EXPLAIN Block, Index Scan auf `farms_pkey` |
| Erzeuger-Dashboard: SB-Einnahmen Zeitraum | **≤ 150 ms** | partial-Index `sb_payments_org_paid_idx` |
| Owner-Dashboard: neueste Reservierungen je Org | **≤ 100 ms** | `reservations_org_created_idx` (Keyset) |
| Map-Bounding-Box-Query (Track-B-Anschluss) | **≤ 120 ms** für Viewport-Box | Box-Index, kein Vollscan |
| Aggregat-KPIs (Plattform-/Hof-Kennzahlen) | **≤ 20 ms** (aus Materialized View) | MV-Hit statt Live-Aggregat |

> **Regel:** Kein Pfad „skaliert", solange er nicht **unter Last-Seed (300 Höfe / synthetische Verlaufsdaten)** im Budget liegt — gemessen, nicht angenommen. Budgets sind Gate-Schwellen (Abschnitt 9).

---

## 2. Ist-Zustand (repo-genau geprüft)

Geprüfte Quellen: `app/supabase/migrations/0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`, `app/src/lib/data.ts`, `finalization/WAVE_11_database.md`.

### 2.1 Bestehendes Datenmodell (nicht duplizieren — andocken)

- **Kern (`0001`):** `orgs`, `profiles`, `farms` (slug-`id`, `org_id`, Geo `lat/lng`, `categories product_category[]`, `verified`, soft-delete `deleted_at`), `products` (slug-`id`, `farm_id`, `org_id`, `availability availability_state`, `seasonal`), `reservations`, `waitlist`, `audit_log`. RLS deny-by-default ab Migration #1; Public-Read für aktiven Katalog, Owner-Write org-gebunden.
- **Payments (`0002`):** `subscriptions` (Plan/Status, Stripe-IDs), `sb_payments` (USP, `org_id`/`farm_id`/`product_id`, `amount_cents`, `status payment_status`, `paid_at`), `payment_events` (Webhook-Idempotenz). `reservations` um `payment_method`/`payment_status` erweitert.
- **Marktplatz (`0003`):** `org_members` (Multi-Org, `is_org_member()`-Helper, `security definer` mit `auth.uid()`-Bindung), `org_locations` (Multi-Standort inkl. `is_unmanned` SB-Stand), `reviews` + Reputation-Aggregat auf `farms` (`rating_avg`/`rating_count`/`reputation_grade`, Trigger `recompute_farm_reputation`), `bounties`, `credits_ledger`.
- **Frische-Signal:** `availability_updated_at` ist in WAVE_11/Gate E referenziert; ist es noch nicht als Spalte vorhanden, wird es **in dieser Strecke additiv** ergänzt (Abschnitt 3.1) — Pflicht für Erzeuger-Selbstpflege-Frische und Track-D-Anschluss.

### 2.2 WAVE_11 hat bereits geliefert (Vorgate — nicht erneut bauen)

Composite-/Partial-/GIN-Indizes für RLS-Subqueries (`profiles_user_org_idx`, `org_members_user_org_idx`), Reservierungs-/SB-/Review-Hotpaths, `farms_categories_gin`, `farm_list_v` (`security_invoker`), Keyset-Pagination im Finder, `getFarm()` = 1 Query, Perf-Gate-Skript + Last-Seed-Grundgerüst.

### 2.3 Skalierungs-Lücken, die **Track E** schließt (über WAVE_11 hinaus)

| Befund | Warum es bei 300 Höfen kippt | Track-E-Antwort |
|---|---|---|
| **Live-Aggregat-KPIs** (Plattform-/Hof-Kennzahlen, Saison-Radar-Zählungen) per Ad-hoc-`count`/`group by` | bei wachsenden Verlaufsdaten teurer Vollscan pro Dashboard-Aufruf | **Materialized Views** + getakteter Refresh (Abschnitt 4) |
| **Hot-Read-Finder** trifft die DB bei jedem anonymen Besucher | Saison-/Marketing-Peak → tausende identische Region-Queries auf dieselben Daten | **Cloudflare-Edge-Cache** für anonyme, nicht-personalisierte Katalog-Reads (Abschnitt 5) |
| **Geo-Filter clientseitig** (`distanceFromPlz` über die ganze Liste) | bei 300+ Höfen volle Liste übertragen, dann verworfen | **Bounding-Box-Vorfilter in der DB** + optionaler PostGIS-Pfad (Track-B-Anschluss, Abschnitt 6) |
| **Keine Volltextsuche** (Hofname/Story/Produktname) | Käufer-Suche „Erdbeeren in der Nähe" skaliert nicht über `ilike '%…%'` (kein Index) | `to_tsvector`-Spalte + GIN, optional `pg_trgm` (Abschnitt 6.2, Extension = Owner-Freigabe) |
| **Verlaufsdaten wachsen unbegrenzt** (`reservations`, `sb_payments`, `audit_log`) | Hot-Tabellen blähen, Indizes werden groß, Reports langsamer | **Lebenszyklus**: Archiv-/Partition-Readiness + Retention-Sicht (Abschnitt 7) |
| **Reputation-Trigger pro Review-Write** | bei Review-Burst rechnet jeder Write das Hof-Aggregat neu | Trigger bleibt (korrekt), aber **Plattform-Reputation-MV** entlastet Dashboards (Abschnitt 4.2) |
| **Kein Verbindungs-/Kosten-Limit** | viele parallele Edge/Browser-Verbindungen → Pool-Erschöpfung, teure Compute | **Connection-/Cost-Disziplin** (Abschnitt 8) |
| **Kein Last-Benchmark gegen Verlaufsdaten** | WAVE_11-Seed deckt Katalog, nicht 300k Reservierungen / 500k SB-Zahlungen | **Erweiterter Last-Seed + Benchmark** (Abschnitt 9) |

---

## 3. Aufgaben — Teil A: Schema-Erweiterungen (additiv, P1)

Neue Migration **`app/supabase/migrations/0005_scale.sql`** — **rein additiv** (`create … if not exists`, `add column if not exists`, `create index … if not exists`, `create materialized view`, `create or replace function/view`). Keine Drops, keine RLS-Semantikänderung. Rollback-Block am Dateiende dokumentiert (auskommentiert, nur mit Owner-Freigabe ausführbar).

### 3.1 Frische-/Lebenszyklus-Spalten (Erzeuger-Selbstpflege)

```sql
-- Frische-Signal für Verfügbarkeit (Track D + Gate E referenzieren es).
alter table products
  add column if not exists availability_updated_at timestamptz not null default now();

-- Beim Verfügbarkeits-Wechsel automatisch stempeln (additiver Trigger, ändert keine Semantik).
create or replace function stamp_availability_updated() returns trigger language plpgsql as $$
begin
  if (new.availability is distinct from old.availability) then
    new.availability_updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists products_stamp_availability on products;
create trigger products_stamp_availability before update on products
  for each row execute function stamp_availability_updated();

-- Hot-Read-Index: „frisch gepflegte, verfügbare Produkte je Hof“ (Detail + Frische-Sort).
create index if not exists products_farm_fresh_idx
  on products (farm_id, availability_updated_at desc) where availability <> 'out';
```

### 3.2 Geo-Bounding-Box-Stütze (Track-B-Anschluss, ohne PostGIS-Zwang)

```sql
-- Composite-Index für Viewport-/Umkreis-Vorfilter (lat/lng-Box). Kein PostGIS nötig:
-- die Box schneidet den Suchraum drastisch ein, Feindistanz/Sort bleibt clientseitig
-- bis Track B (Karte/PostGIS) den serverseitigen Distanz-Sort mit eigenem ADR einführt.
create index if not exists farms_geo_box_idx on farms (lat, lng) where deleted_at is null;
create index if not exists org_locations_geo_box_idx on org_locations (lat, lng) where deleted_at is null;
```

### 3.3 Volltext-Suchvektor (index-gestützt, ohne Extension)

```sql
-- Generierte tsvector-Spalte (deutsch) über Hofname + Story + Stadt.
-- 'german'-Config ist im Postgres-Core enthalten → keine kostenpflichtige Extension.
alter table farms
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('german',
      coalesce(name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(story,''))
  ) stored;
create index if not exists farms_search_tsv_gin on farms using gin (search_tsv);

-- Produkt-Volltext (Name) — Käufer-Suche „Erdbeeren“ trifft Produkte über Höfe hinweg.
alter table products
  add column if not exists search_tsv tsvector
  generated always as (to_tsvector('german', coalesce(name,''))) stored;
create index if not exists products_search_tsv_gin on products using gin (search_tsv);
```

> **`pg_trgm` (Fuzzy/Tippfehler-Toleranz) bewusst optional:** Eine Extension ⇒ Owner-Freigabe (Stop-Regel 2). Der `tsvector`-Pfad deckt die produktive Suche ab; Trigram-Fuzzy ist ein späteres, kostenbewusstes Upgrade — kein toter Pfad jetzt.

### 3.4 Verlaufsdaten-Archiv-Readiness (ohne Partition-Pflicht heute)

```sql
-- „Heiß vs. kalt“-Sicht: aktive vs. archivierbare Reservierungen (Retention-Anker).
-- Noch keine physische Partition (Stop-Regel 3: kein Schema-Bruch) — nur Lebenszyklus-Marker.
alter table reservations
  add column if not exists archived_at timestamptz;
create index if not exists reservations_active_recent_idx
  on reservations (created_at desc) where archived_at is null;

alter table sb_payments
  add column if not exists archived_at timestamptz;
create index if not exists sb_payments_recent_idx
  on sb_payments (created_at desc) where archived_at is null;
```

> **Warum kein `partition by` jetzt:** Native Range-Partitionierung erfordert das Neu-Anlegen der Tabelle als partitioniert (nicht rein additiv → Stop-Regel 3, Owner-Entscheid). Track E liefert die **Readiness** (Archiv-Marker, Hot-Index nur auf nicht-archivierte Zeilen) und dokumentiert den Migrationspfad zur echten Partition (Abschnitt 7) — ausgelöst erst, wenn Volumen es rechtfertigt (Phase 5 Gate 100/300).

---

## 4. Aufgaben — Teil B: Materialized Views + Refresh-Strategie (P1)

Aggregat-KPIs werden **vorberechnet** statt bei jedem Dashboard-Aufruf live aggregiert. **Regel:** Materialized Views liefern **Geschwindigkeit**, nie **Wahrheit für kritische Statusentscheidungen** (Entitlement, Zahlungs-/Reservierungsstatus kommen immer live aus der Wahrheitstabelle).

### 4.1 Plattform-Kennzahlen (Owner-Dashboard, Phase 1 WAVE_05)

```sql
-- Plattform-weite KPIs für das Owner-Dashboard — eine Zeile, blitzschnell.
create materialized view if not exists platform_kpi_mv as
  select
    (select count(*) from farms where deleted_at is null)                         as farms_active,
    (select count(*) from products)                                              as products_total,
    (select count(*) from products where availability <> 'out')                  as products_available,
    (select count(*) from reservations where created_at >= now() - interval '30 days') as reservations_30d,
    (select count(*) from sb_payments where status = 'paid'
        and paid_at >= now() - interval '30 days')                               as sb_payments_paid_30d,
    (select coalesce(sum(amount_cents),0) from sb_payments where status = 'paid'
        and paid_at >= now() - interval '30 days')                               as sb_volume_cents_30d,
    now() as refreshed_at;
-- Unique-Index ⇒ erlaubt CONCURRENTLY-Refresh (kein Lese-Lock im Dashboard).
create unique index if not exists platform_kpi_mv_uidx on platform_kpi_mv ((true));
```

### 4.2 Hof-Kennzahlen je Org (Erzeuger-Dashboard, RLS-gefiltert über Basistabellen)

```sql
-- Pro-Hof-Kennzahlen (Reservierungen, SB-Einnahmen, Reputation) — eine Zeile je Hof.
create materialized view if not exists farm_metrics_mv as
  select
    f.id          as farm_id,
    f.org_id      as org_id,
    f.rating_avg, f.rating_count, f.reputation_grade,
    count(distinct r.id) filter (where r.status in ('requested','confirmed'))      as reservations_open,
    count(distinct r.id) filter (where r.created_at >= now() - interval '30 days') as reservations_30d,
    coalesce(sum(s.amount_cents) filter (where s.status='paid'
        and s.paid_at >= now() - interval '30 days'),0)                            as sb_volume_cents_30d,
    now() as refreshed_at
  from farms f
  left join reservations r on r.farm_id = f.id
  left join sb_payments   s on s.farm_id = f.id
  where f.deleted_at is null
  group by f.id, f.org_id, f.rating_avg, f.rating_count, f.reputation_grade;
create unique index if not exists farm_metrics_mv_farm_uidx on farm_metrics_mv (farm_id);
create index if not exists farm_metrics_mv_org_idx on farm_metrics_mv (org_id);
```

> **RLS-Hinweis (Pflicht):** Eine Materialized View trägt **keine** RLS und wird mit den Rechten des Erstellers gefüllt. Sie darf daher **nicht** direkt für `anon`/`authenticated` lesbar sein, sonst Tenant-Leck (Produktionspfeiler #1). Zugriff ausschließlich über eine **`security definer`-RPC mit `auth.uid()`-/`is_org_member()`-Bindung** (Abschnitt 4.4) oder über `service_role` in Edge Functions. **Kein** direkter Client-`select` auf `*_mv`.

### 4.3 Refresh-Strategie (getaktet, CONCURRENTLY, kein Lese-Lock)

```sql
-- Eine Refresh-Funktion, idempotent, CONCURRENTLY (Unique-Index Voraussetzung).
create or replace function refresh_scale_mvs() returns void language plpgsql
  security definer set search_path = public as $$
begin
  refresh materialized view concurrently platform_kpi_mv;
  refresh materialized view concurrently farm_metrics_mv;
end $$;
revoke all on function refresh_scale_mvs() from public, anon, authenticated;
-- Aufruf NUR durch service_role (Edge Function / Scheduler), nie durch Client.
```

**Refresh ausgelöst durch (kostenbewusst gestaffelt):**
- **Primär (kostenfrei):** Cloudflare **Cron-Worker** (`scheduled`-Trigger, z. B. alle 5 Min) ruft eine Edge-/RPC-Funktion `refresh-metrics`, die mit `service_role` `select refresh_scale_mvs()` ausführt. Kein zusätzlicher Postgres-Scheduler nötig → keine Extension, keine Owner-Kosten-Freigabe.
- **Optional (Owner-Freigabe):** `pg_cron` in Supabase, falls DB-interner Zeitplan gewünscht (Stop-Regel 2 — Extension = Owner-Entscheid).
- **Event-getrieben (ergänzend):** Nach SB-Zahlungs-Webhook (`stripe-webhook`) ein **gedebouncter** Refresh-Trigger für `farm_metrics_mv` des betroffenen Hofs (nicht pro Event voll-refreshen — Refresh ist teuer; Debounce/Intervall gewinnt).

### 4.4 RLS-sichere Lese-RPCs auf die MVs

```sql
-- Plattform-KPIs: nur Owner/Staff (Rolle aus profiles). Beispielhafte Rollenprüfung.
create or replace function get_platform_kpis()
  returns platform_kpi_mv language sql stable security definer set search_path = public as $$
  select * from platform_kpi_mv
  where exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('owner','staff'));
$$;
revoke all on function get_platform_kpis() from public, anon;
grant execute on function get_platform_kpis() to authenticated;

-- Hof-Metriken: nur Mitglieder der jeweiligen Org (is_org_member bindet auth.uid()).
create or replace function get_farm_metrics(p_farm text)
  returns farm_metrics_mv language sql stable security definer set search_path = public as $$
  select m.* from farm_metrics_mv m
  where m.farm_id = p_farm and is_org_member(m.org_id);
$$;
revoke all on function get_farm_metrics(text) from public, anon;
grant execute on function get_farm_metrics(text) to authenticated;
```

> So bleibt die Geschwindigkeit der MV erhalten **und** die Org-Boundary greift weiter (die RPC filtert über `auth.uid()`/`is_org_member` — fremde Org = 0 Zeilen, nie Fremddaten). Das ist die kanonische „MV + security-definer-RPC mit auth-Bindung“-Pattern und wandert als Imperium-Beschleuniger nach `.claude/memory/patterns/`.

---

## 5. Aufgaben — Teil C: Caching-Schichten (P1)

Drei Stufen, von außen nach innen — jede entlastet die nächste. **Eiserne Regel:** Nur **anonyme, nicht-personalisierte, nicht-kritische** Katalog-Reads werden edge-gecacht. **Niemals** im Cache: Reservierungs-/SB-Zahlungsstatus, Entitlements, org-gebundene Daten, irgendetwas hinter Auth.

### 5.1 Stufe 1 — Cloudflare-Edge-Cache (anonymer Katalog-Hotpath)

- Anonyme Finder-/Detail-Reads laufen über einen **Cloudflare Worker / Pages Function** als dünner Lese-Proxy vor dem Supabase-`anon`-Endpoint (oder direkt auf eine Read-RPC), der Antworten mit `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` in der **Cloudflare Cache API** hält.
- **Cache-Key** = normalisierte Query (Region/PLZ-Box + Kategorie + Cursor) — **ohne** Auth-Header, **ohne** Cookies. Personalisierte/eingeloggte Requests umgehen den Cache (`Authorization`-Header ⇒ `Cache-Control: private, no-store`).
- **Invalidierung:** kurze TTL (`s-maxage=60`) + `stale-while-revalidate` deckt Katalog-Änderungen praktisch ab (Frische-SLA für anonymen Katalog = ≤ 60 s, fachlich unkritisch). Bei Bedarf gezielter Purge nach Hof-/Produkt-Mutation via Cloudflare-API (Edge Function nach erfolgreichem Owner-Write).
- **Ergebnis:** Saison-/Marketing-Peak (tausende identische Region-Queries) wird zu ~1 Origin-Hit je TTL-Fenster → DB-Last bricht, Antwort < 50 ms ab Edge.

### 5.2 Stufe 2 — DB-seitige Read-RPC + Materialized Views

- Aggregat-/KPI-Reads gehen gegen `*_mv` (Abschnitt 4) statt Live-Aggregat → ≤ 20 ms statt Vollscan.
- Katalog-Listen gehen gegen `farm_list_v` (WAVE_11, `security_invoker`) + Keyset-Pagination → konstante Latenz.
- Read-RPCs liefern **schmale Spaltenlisten** (kein `select('*')`), exakt das, was die UI rendert (kleinere Payload, weniger Bandbreite/Kosten, §0.3).

### 5.3 Stufe 3 — Browser-/Client-Cache (TanStack-Query-Disziplin)

- Im Frontend (`app/src/lib/data.ts` + Query-Layer) Lese-Queries mit **`staleTime`** versehen (Katalog: 60 s; Hof-Detail: 120 s; KPIs: 30 s) → keine Doppel-Fetches beim Re-Render/Navigieren.
- **Prefetch** auf Hover/Intersection für Hof-Detail aus der Finder-Liste (Detail ist 1 Query dank WAVE_11) → gefühlt instant, ohne Über-Fetch.
- **Seed-Fallback bleibt** (Kanon „spielbar sofort“): ohne `VITE_SUPABASE_*` rendert die App weiter aus `SEED_FARMS` — Caching-Schichten sind additiv, kein toter Pfad.

> **Stale-Sicherheit (Stop-Regel 6):** Kritische Wahrheiten (Reservierung anlegen/Status, SB-Zahlungsstatus, Abo-Entitlement) werden **nie** über `staleTime`/Edge serviert — sie lesen frisch und werden nach Mutation invalidiert/`refetch`t. Caching beschleunigt das **Stöbern**, nie die **Transaktion**.

---

## 6. Aufgaben — Teil D: Geo-at-Scale & Suche (P1/P2)

### 6.1 Bounding-Box-Vorfilter (P1, ohne PostGIS)

`app/src/lib/data.ts` + `geo.ts`: Aus PLZ + Umkreis (km) eine **lat/lng-Box** rechnen und serverseitig vorfiltern (`farms_geo_box_idx`), dann nur die Box-Treffer clientseitig fein-distanzieren/sortieren. So überträgt die DB nicht 300+ Höfe, sondern nur die geografisch plausiblen — die clientseitige Haversine-Distanz auf ~Dutzend Boxen-Treffer bleibt günstig.

```ts
// Box aus Mittelpunkt (PLZ→Geo) + Radius; serverseitig per .gte/.lte vorfiltern.
const box = bboxFromPlz(filter.plz, filter.radiusKm ?? 25) // { latMin, latMax, lngMin, lngMax }
let q = supabase.from('farms').select('id,name,plz,city,lat,lng,categories,verified,rating_avg')
  .is('deleted_at', null)
  .gte('lat', box.latMin).lte('lat', box.latMax)
  .gte('lng', box.lngMin).lte('lng', box.lngMax)   // trifft farms_geo_box_idx
  .order('name', { ascending: true }).order('id', { ascending: true })
  .limit(PAGE_SIZE)
```

> **PostGIS-Distanz-Sort = Track B.** Echter serverseitiger Umkreis-Sort (`earth_distance`/`ll_to_earth` oder PostGIS `ST_DWithin`) braucht eine Extension (Stop-Regel 2/5) und gehört mit eigenem ADR in **Track B (Karte)**. Track E baut den **additiven Box-Anschluss**, der sofort wirkt und später bruchfrei auf PostGIS gehoben werden kann — kein toter, kein teurer Pfad jetzt.

### 6.2 Volltextsuche verdrahten (P2)

Such-Eingabe im Finder gegen die `search_tsv`-GIN-Indizes (Abschnitt 3.3) führen — Höfe **und** Produkte (Produkt-Treffer mappen auf ihren Hof):

```ts
// websearch_to_tsquery erlaubt natürliche Eingaben ("Erdbeeren Hofladen").
const { data } = await supabase.rpc('search_catalog', { q: term, plz_box: box, lim: PAGE_SIZE })
// search_catalog: SQL/RPC, das farms.search_tsv @@ websearch_to_tsquery('german', q)
//                 UNION produkt-treffer → hof, beides RLS-public (deleted_at is null), keyset-paginiert.
```

> Die RPC bleibt **lesend, public-katalog-konform** (nur aktive Höfe/Produkte) und keyset-paginiert. Kein `ilike '%…%'` mehr (kein Index nutzbar) — GIN-`@@` ist index-gestützt und skaliert.

---

## 7. Aufgaben — Teil E: Verlaufsdaten-Lebenszyklus & Partition-Readiness (P2)

Append-lastige Tabellen (`reservations`, `sb_payments`, `audit_log`) wachsen unbegrenzt. Track E liefert die **Readiness** ohne heutigen Schema-Bruch:

1. **Archiv-Marker** (`archived_at`, Abschnitt 3.4): Ein getakteter Worker (Cloudflare-Cron + `service_role`-RPC) setzt `archived_at` auf abgeschlossene/alte Vorgänge (z. B. `picked_up`/`expired`-Reservierungen > 13 Monate, `refunded`/alte `sb_payments` jenseits steuerlicher Aufbewahrung). Hot-Indizes (`… where archived_at is null`) bleiben klein → Reports schnell.
2. **Retention nach DSGVO/Steuer:** Aufbewahrungsfristen dokumentieren (steuerrelevante Zahlungsdaten vs. löschbare Käufer-PII). Anker zu `WAVE_14` (Legal/DSGVO) — **kein** stilles Löschen, dokumentierter Lebenszyklus.
3. **Partition-Pfad (dokumentiert, nicht ausgeführt):** Wenn `audit_log`/`sb_payments` die Schwelle reißen (Phase 5 Gate 100/300), Migration zu **nativer Range-Partition nach Monat** (`partition by range (created_at)`): neue partitionierte Tabelle anlegen, Daten umkopieren, atomar umbenennen, alte Partitionen detachen/archivieren. Das ist ein **eigener, Owner-freigegebener** Migrationsschritt (Stop-Regel 3), kein Track-E-Default — hier nur als Runbook hinterlegt, damit der Weg bruchfrei offen steht.

> **Audit bleibt unabschaltbar** (Produktionspfeiler #5): Archivierung verschiebt/komprimiert, löscht aber keine Audit-Wahrheit ohne dokumentierte Retention-Regel.

---

## 8. Aufgaben — Teil F: Verbindungs- & Kosten-Disziplin (P1)

Skalierung ist auch ein **Kosten- und Pool-Thema** (§0.3 Wirtschaftlichkeit):

- **Connection Pooling:** Edge Functions und serverseitige Reads nutzen den Supabase **Transaction-Pooler** (PgBouncer, Port 6543) statt direkter Sessions — verhindert Pool-Erschöpfung bei vielen parallelen Workern. Dokumentiert in `docs/DEPLOYMENT.md`/`OPERATIONS_RUNBOOK.md`.
- **Edge-First für Hot-Reads:** Anonyme Katalog-Last endet idealerweise am Cloudflare-Edge (Abschnitt 5.1) und erreicht die DB gar nicht — der günstigste Request ist der, der nicht zur Origin geht.
- **Schmale Payloads überall:** Spaltenlisten statt `select('*')`, MV statt Live-Aggregat, Keyset statt `offset` → weniger Buffers, weniger Egress, weniger Compute.
- **Kein N+1 / kein Vollscan zur Laufzeit** (WAVE_11-Gate bleibt scharf, Track E erweitert die Abdeckung auf Verlaufsdaten).
- **Read-Replica nur bei Bedarf (Owner-Freigabe):** Erst wenn Hot-Reads trotz Edge-Cache + MV die Primär-Compute treiben, ist eine Read-Replica das richtige (kostenpflichtige) Mittel — Stop-Regel 2, mit Zahlen begründet, nicht prophylaktisch.

---

## 9. Aufgaben — Teil G: Last-Seed & Benchmark (P1, das Mess-Herzstück)

WAVE_11 seedet den **Katalog** (300 Höfe). Track E ergänzt **Verlaufsdaten**, weil die Skalierungsrisiken dort sitzen.

`app/supabase/perf/seed_scale.sql` — synthetische Verlaufslast (nur lokal, **nie** produktiv):

```sql
-- Aufbauend auf WAVE_11 seed_bulk.sql (300 Höfe). Hier: Produkte, Verfügbarkeit, Verlauf.
-- ~15.000 Produkte
insert into products (id, farm_id, org_id, name, category, unit, price, availability)
  select 'lp-'||g, f.id, f.org_id, 'Produkt '||g, 'Gemüse', 'Stk', round((random()*5+1)::numeric,2),
         (array['available','low','soon','out']::availability_state[])[1+floor(random()*4)]
  from generate_series(1,15000) g
  cross join lateral (select id, org_id from farms order by random() limit 1) f
  on conflict (id) do nothing;

-- ~300.000 Reservierungen (Verlauf über 18 Monate)
insert into reservations (farm_id, product_id, org_id, quantity, pickup_window, name, contact, status, created_at)
  select p.farm_id, p.id, p.org_id, 1+floor(random()*5), 'Sa 9-12', 'Käufer '||g, 'k'||g||'@example.test',
         (array['requested','confirmed','picked_up','cancelled','expired']::reservation_status[])[1+floor(random()*5)],
         now() - (random()*540 || ' days')::interval
  from generate_series(1,300000) g
  cross join lateral (select id, farm_id, org_id from products order by random() limit 1) p;

-- ~500.000 SB-Zahlungen (USP-Verlauf, Reports-Hotpath)
insert into sb_payments (org_id, farm_id, product_id, quantity, amount_cents, status, paid_at, created_at)
  select p.org_id, p.farm_id, p.id, 1, 100+floor(random()*4000), 'paid',
         now() - (random()*540 || ' days')::interval, now() - (random()*540 || ' days')::interval
  from generate_series(1,500000) g
  cross join lateral (select id, farm_id, org_id from products order by random() limit 1) p;

-- MVs nach dem Seed füllen
select refresh_scale_mvs();
```

`app/supabase/perf/explain_scale.sql` — Plan-Prüfung der Track-E-Pfade (Erwartung je Block als Kommentar, **kein** Seq-Scan auf großen Tabellen):

```sql
set search_path = public;

-- A) Finder mit Bounding-Box + Kategorie (Box-Index + GIN erwartet)
explain (analyze, buffers) select id,name,plz from farms
  where deleted_at is null and lat between 50 and 51 and lng between 7 and 8
    and categories @> array['Gemüse']::product_category[]
  order by name, id limit 24;

-- B) Volltextsuche (GIN auf search_tsv erwartet)
explain (analyze, buffers) select id,name from farms
  where deleted_at is null and search_tsv @@ websearch_to_tsquery('german','Hofladen Gemüse')
  limit 24;

-- C) SB-Einnahmen Zeitraum auf 500k Zeilen (partial-Index erwartet)
explain (analyze, buffers) select id,amount_cents,paid_at from sb_payments
  where org_id = (select org_id from farms limit 1) and status='paid'
    and paid_at >= now() - interval '90 days'
  order by paid_at desc limit 100;

-- D) Owner-KPIs aus MV (eine Zeile, ~0 ms erwartet)
explain (analyze, buffers) select * from platform_kpi_mv;

-- E) Hof-Metriken-RPC-Quelle (Unique-Index auf farm_id erwartet)
explain (analyze, buffers) select * from farm_metrics_mv where farm_id = (select id from farms limit 1);

-- F) Frische-Produkte je Hof (products_farm_fresh_idx erwartet)
explain (analyze, buffers) select id,name,availability_updated_at from products
  where farm_id = (select id from farms limit 1) and availability <> 'out'
  order by availability_updated_at desc limit 20;
```

`app/scripts/scale-gate.sh` — blockierendes Gate, **failt hart** bei Seq-Scan auf heißen Tabellen, fehlenden Track-E-Objekten oder direkt lesbarer MV (RLS-Leck):

```bash
#!/usr/bin/env bash
# Track E — Scale-Gate. Failt bei Seq Scan / fehlenden Objekten / RLS-Leck auf MV.
set -euo pipefail
fail=0; note(){ echo "::error::$1"; fail=1; }
DBURL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "== 1) Track-E-Pflichtobjekte vorhanden? =="
need=(platform_kpi_mv farm_metrics_mv farms_search_tsv_gin products_farm_fresh_idx
      farms_geo_box_idx sb_payments_recent_idx)
have=$(psql "$DBURL" -tAc "select relname from pg_class where relname = any(array['platform_kpi_mv','farm_metrics_mv'])
        union select indexname from pg_indexes where schemaname='public';")
for o in "${need[@]}"; do echo "$have" | grep -qx "$o" || note "Objekt fehlt: $o"; done

echo "== 2) MVs NICHT direkt für anon/authenticated lesbar (kein RLS-Leck)? =="
for mv in platform_kpi_mv farm_metrics_mv; do
  leak=$(psql "$DBURL" -tAc "select count(*) from information_schema.role_table_grants
         where table_name='$mv' and grantee in ('anon','authenticated') and privilege_type='SELECT';")
  [ "$leak" = "0" ] || note "RLS-Leck: $mv ist direkt lesbar (nur über security-definer-RPC erlaubt)!"
done

echo "== 3) Keine Seq Scans auf heißen Pfaden unter Last-Seed =="
plan=$(psql "$DBURL" -f app/supabase/perf/explain_scale.sql 2>&1)
echo "$plan" | grep -qiE 'Seq Scan on (farms|products|reservations|sb_payments|reviews)\b' \
  && { echo "$plan" | grep -iE 'Seq Scan'; note "Sequential Scan auf großer Tabelle."; }

[ "$fail" -ne 0 ] && { echo "SCALE-GATE: FAIL"; exit 1; }
echo "SCALE-GATE: PASS"
```

---

## 10. Konkrete Befehle (Reihenfolge)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Lokale Supabase + alle Migrationen + Katalog-Last (WAVE_11) + Verlaufs-Last (Track E)
supabase start
supabase db reset                       # spielt 0001..0005 frisch ein
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/seed_bulk.sql    # WAVE_11: 300 Höfe
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/seed_scale.sql    # Track E: Verlauf + MV-Refresh

# 2) Frontend: Typecheck/Lint/Build nach Box-Filter/Suche/Cache-Disziplin
npm run typecheck && npm run lint && npm run build

# 3) EXPLAIN-Pläne der Track-E-Pfade (manuell verifizieren: Index/Bitmap-Scan, kein Seq Scan)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/explain_scale.sql

# 4) Scale-Gate (blockierend) + Negativtest (Pflichtobjekt droppen ⇒ MUSS rot werden)
chmod +x scripts/scale-gate.sh
bash scripts/scale-gate.sh                                   # erwartet: SCALE-GATE: PASS
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "drop index farms_search_tsv_gin;"
bash scripts/scale-gate.sh; echo "ExitCode=$?"               # erwartet: FAIL, ExitCode=1
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/migrations/0005_scale.sql  # wiederherstellen

# 5) Isolations-Regression (keine Sicherheits-Regression durch MV/RPC/Index/View)
node supabase/tests/run-isolation.mjs   # bzw. der etablierte QA-Runner — fremde Org = 403/0 Zeilen

# 6) Produktiv ausrollen — NUR mit Owner-Freigabe (Account/Kosten/irreversibel)
# supabase db push                       # spielt 0005_scale.sql gegen Prod
# (Cloudflare-Cron-Worker refresh-metrics + Edge-Cache erst nach Owner-Deploy-Freigabe aktivieren)
```

> **`pg_cron`/`pg_trgm`/PostGIS/Read-Replica** und jeder Prod-Refresh-Scheduler/Edge-Cache = **Plattform-Setting/Kosten ⇒ Owner-Freigabe** (Stop-Regeln 1/2). Bis dahin: Cloudflare-Cron-Worker als kostenfreier Default vorbereitet, nicht scharf geschaltet.

---

## 11. Acceptance (Akzeptanzkriterien)

- [ ] `app/supabase/migrations/0005_scale.sql` existiert, ist **rein additiv** (`add column/index/materialized view/function if not exists`/`create or replace`), enthält dokumentierten Rollback-Block; `supabase db reset` (0001..0005) läuft fehlerfrei durch.
- [ ] **Frische-Signal:** `products.availability_updated_at` + Stempel-Trigger vorhanden; `products_farm_fresh_idx` deckt den Detail-/Frische-Pfad (EXPLAIN F = Index Scan).
- [ ] **Materialized Views:** `platform_kpi_mv` (Unique-Index) + `farm_metrics_mv` (`farm_id` unique, `org_id`-Index) angelegt; `refresh_scale_mvs()` läuft `CONCURRENTLY` ohne Lese-Lock.
- [ ] **RLS-dicht:** Weder `platform_kpi_mv` noch `farm_metrics_mv` sind für `anon`/`authenticated` direkt lesbar (Gate-Check 2 grün); Zugriff nur über `get_platform_kpis()` (Owner/Staff) bzw. `get_farm_metrics()` (`is_org_member`). Fremde Org = 0 Zeilen.
- [ ] **Caching:** Anonyme Katalog-Reads sind über Cloudflare-Edge cachebar (`s-maxage`+`stale-while-revalidate`), auth-/personalisiert = `private,no-store`; kritische Wahrheiten (Reservierung/SB-Status/Entitlement) werden **nie** gecacht; Client-`staleTime` gesetzt; Seed-Fallback intakt.
- [ ] **Geo-at-Scale:** Bounding-Box-Vorfilter serverseitig (`farms_geo_box_idx`), EXPLAIN A = Index/Bitmap-Scan, kein Vollscan; PostGIS-Distanz-Sort bewusst nach Track B verschoben (dokumentiert, kein toter Pfad).
- [ ] **Suche:** `farms.search_tsv`/`products.search_tsv` (generated, `german`) + GIN; Finder-Suche nutzt `websearch_to_tsquery` über RPC, kein `ilike '%…%'`; EXPLAIN B = GIN-Scan.
- [ ] **Verlaufs-Lebenszyklus:** `archived_at` + Hot-Indizes (`… where archived_at is null`) vorhanden; Retention/Partition-Pfad in `docs/DATABASE_MODEL.md` dokumentiert (ausgeführt erst bei Owner-Freigabe/Volumen).
- [ ] **Last-Benchmark:** `seed_scale.sql` erzeugt ~15k Produkte / ~300k Reservierungen / ~500k SB-Zahlungen lokal; EXPLAIN A–F zeigen **keinen** Seq-Scan auf `farms/products/reservations/sb_payments/reviews`; alle Pfade im Budget (Abschnitt 1.2).
- [ ] **Scale-Gate:** `bash scripts/scale-gate.sh` → `PASS`; Negativtest (Pflichtobjekt gedroppt) → `FAIL`, Exit 1, reproduzierbar.
- [ ] **Keine Sicherheits-Regression:** Tenant-Isolationstest (WAVE_02/WAVE_12/Gate C) bleibt grün — fremde Org = 403/0 Zeilen, nie 200 mit Fremddaten.
- [ ] **`npm run ci`** (typecheck + lint + build) grün nach Box-Filter/Suche/Cache-Refactor (alle Aufrufer angepasst, strict).
- [ ] **Doku & Muster:** `docs/DATABASE_MODEL.md` um „Skalierung: MV/Refresh, Caching-Schichten, Geo-Box, Suche, Lebenszyklus“ ergänzt; Muster „MV + security-definer-RPC mit auth-Bindung“ + „Edge-Cache nur für anonymen Katalog“ in `.claude/memory/patterns/`.

---

## 12. Gate (blockierend)

> **Track-E-Scale-Gate** muss grün sein, bevor **Phase 5 Customer-Gates 100/300** freigegeben werden. Es vertieft Phase-2-**Gate E (Performance)** auf Verlaufsdaten-Last und baut auf dem **WAVE_11-Gate** auf.

```
GATE TRACK_E:
  ✅ Migration 0005 additiv eingespielt (supabase db reset 0001..0005 grün, Rollback dokumentiert)
  ✅ Alle Track-E-Pflichtobjekte vorhanden (MVs, Geo-Box-Index, search_tsv-GIN, fresh-/recent-Indizes)
  ✅ MVs NICHT direkt für anon/authenticated lesbar (kein RLS-Leck) — Zugriff nur via security-definer-RPC
  ✅ refresh_scale_mvs() CONCURRENTLY, getakteter Refresh (Cloudflare-Cron-Worker, kostenfrei) vorbereitet
  ✅ Edge-Cache nur für anonymen Katalog; kritische Wahrheiten ungecacht; Client-staleTime gesetzt
  ✅ EXPLAIN A–F: kein Seq Scan auf heißen Tabellen unter Verlaufs-Last (15k/300k/500k); alle im Budget
  ✅ scale-gate.sh → PASS ; Negativtest (Objekt-Drop) reproduzierbar FAIL (Exit 1)
  ✅ Tenant-Isolationstest weiterhin grün (keine Security-Regression durch MV/RPC/Index/Cache)
  ✅ npm run ci grün (Box-Filter/Suche/Cache-Refactor end-to-end, alle Aufrufer angepasst)
```

**Owner-Freigabe-Punkte in dieser Strecke** (vorab in Klartext, erst auf OK): `supabase db push` (Prod-Migration) · jede Extension (`pg_cron`/`pg_trgm`/PostGIS) · Read-Replica/größere Compute · Aktivieren des Prod-Refresh-Schedulers + Cloudflare-Edge-Cache · jeder `git commit`/`push` (Co-Author-Zeile anhängen).

---

## 13. Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Track abgeschlossen: Phase 4 · Track E — Datenmodell-Skalierung
- Geändert:
  - app/supabase/migrations/0005_scale.sql (NEU: availability_updated_at + Trigger, Geo-Box-/search_tsv-/fresh-/recent-Indizes,
    platform_kpi_mv + farm_metrics_mv + refresh_scale_mvs(), security-definer-Lese-RPCs, archived_at-Marker)
  - app/src/lib/data.ts + geo.ts (Bounding-Box-Vorfilter, Volltext-RPC, Cache-/staleTime-Disziplin; Seed-Fallback intakt)
  - app/supabase/perf/seed_scale.sql + explain_scale.sql (NEU, Verlaufs-Last + Plan-Prüfung)
  - app/scripts/scale-gate.sh (NEU, blockierendes Gate)
  - Cloudflare-Cron-Worker refresh-metrics + Edge-Cache-Proxy (vorbereitet; scharf erst nach Owner-Deploy-Freigabe)
  - docs/DATABASE_MODEL.md (Abschnitt Skalierung) ; .claude/memory/patterns/ (MV+RPC, Edge-Cache-Katalog)
- Tests:
  - supabase db reset (0001..0005) → grün ; refresh_scale_mvs() CONCURRENTLY → grün
  - EXPLAIN A–F unter Verlaufs-Last (15k/300k/500k) → Index/GIN/Bitmap-Scan, kein Seq Scan (Plan-Auszug ohne Daten)
  - bash scripts/scale-gate.sh → PASS ; Negativtest (Objekt-Drop) → FAIL (Exit 1)
  - MV-RLS-Check: anon/authenticated kein direkter SELECT ; fremde Org via RPC = 0 Zeilen
  - Tenant-Isolationstest → grün ; npm run ci → grün
- Messwerte (vorher/nachher, ms — mean_exec_time):
  - Finder Box+Kategorie: <…> → <…>  · Volltextsuche: <…>  · SB-Report 90d: <…> → <…>  · Owner-KPI (MV): <…>
- Risiken: rein additiv (Rollback dokumentiert); Prod-Migration/Scheduler/Edge-Cache/Extensions warten auf Owner-Freigabe.
- Nächster Schritt: Phase 5 Customer-Gates 100/300 freischalten (Track-E-Gate grün) ; ggf. Track B (PostGIS-Distanz-Sort).
```

---

## 14. Übergang

→ Erst wenn das **Track-E-Scale-Gate grün** ist: **Phase 5** Customer-Gates **100/300** freigeben und (falls echter Umkreis-Sort verlangt) **Track B (Karte/PostGIS)** mit eigenem ADR starten. Der Partition-Schritt für `audit_log`/`sb_payments` wird **erst bei Volumen-Schwelle** und mit Owner-Freigabe gezogen (Runbook in Abschnitt 7).

> **Tracker-Pflicht nach Abschluss:** `docs/releases/PHASE_STATUS.md` Zeile „Phase 4 · Track E Datenmodell-Skalierung“ auf den realen Stand setzen; `MASTER_INDEX.md` (Abschnitt 7 · `finalization/phase4_vertical`) auf ✅. Wiederverwendbare Muster (Materialized-View + security-definer-RPC mit `auth.uid()`-Bindung · Edge-Cache nur für anonymen, nicht-personalisierten Katalog · Bounding-Box-Vorfilter ohne PostGIS · `tsvector`-Suche ohne Extension · Archiv-/Partition-Readiness) als **Imperium-Beschleuniger** nach `.claude/memory/patterns/` verdichten — gültig für alle 14 Tochterplattformen.
