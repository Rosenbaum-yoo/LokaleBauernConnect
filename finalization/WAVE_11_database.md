# WAVE_11 — DB-Härtung: Indizes, Pagination, Query-Performance, N+1-Vermeidung

> **Phase:** 1 — Fundament & Kernprodukt. **Prio:** P1 (Skalierungs-Türsteher vor 10→300 Höfen). **Voraussetzung:** WAVE_02 (Kern-Datenmodell + RLS, Isolationstest grün), WAVE_09/Marketplace-Migrationen (`0002_payments.sql`, `0003_marketplace.sql`) eingespielt.
> **Ausführungsagent:** Claude (gesamter Stack) + Subagenten **db-rls-spezialist** (Indizes/Migration/RLS-Performance), **performance-cost-optimizer** (Query-Pläne, Caching, Supabase-Kosten), **qa-tester** (Pagination-/Boundary-/Isolations-Regression), **security-auditor** read-only (RLS-Subquery-Lecks).
> **Owner-Freigabe erforderlich für:** Ausführen von Migrationen gegen die produktive Supabase-Instanz (`supabase db push`/Dashboard), Aktivieren teurer Extensions (`pg_trgm`, `pg_stat_statements`), jeden `git commit`/`push`. Bis dahin ist diese Welle **repo-lokal, reversibel** (neue, additive Migration + Frontend-Query-Refactor + Doku) und wird nur vorbereitet, lokal gegen `supabase start` verifiziert, nicht live geschaltet.
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/WAVE_11_database.md`, read-only) auf **React+Vite+TS · Supabase (Postgres + RLS) · Cloudflare**. Kein Hetzner, kein Self-Host-Postgres-Tuning — gehärtet wird **innerhalb** der Supabase/Postgres-Plattform (Indizes, RLS-Subquery-Stabilität, Keyset-Pagination, Edge-/Client-seitige Query-Disziplin).

---

## Ziel

LokaleBauernConnect muss bei **300+ Höfen, vielen tausend Produkten und Reservierungen** mit konstant niedriger Latenz antworten — und zwar **ohne** dass eine einzelne Käufer-Suche oder ein Erzeuger-Dashboard die Datenbank in einen Sequential-Scan oder eine N+1-Schleife treibt. Konkret:

1. **Jede heiße Query trifft einen Index, nicht den Heap.** Alle wiederkehrenden Zugriffsmuster (Finder nach PLZ/Kategorie, Reservierungen je Hof/Status, SB-Zahlungen je Org/Zeitraum, Bewertungen je Hof, RLS-`org_id`-Subqueries) sind durch passende B-Tree-/GIN-/Partial-Indizes gedeckt und per `EXPLAIN (ANALYZE, BUFFERS)` als Index-Scan belegt.
2. **Keine unbegrenzte Liste.** Jede listende Query hat ein hartes `limit` und eine **stabile, deterministische Sortierung** — Pagination als **Keyset/Cursor** (skaliert), nicht `offset` (degeneriert bei tiefen Seiten). Kein `select('*')` mehr, wo die UI nur ein Teil-Set rendert.
3. **N+1 eliminiert.** Hof→Produkte, Hof→Bewertungen, Org→SB-Zahlungen werden in **einer** Query (eingebettetes Supabase-`select` bzw. ein Aggregat-View) geladen, nie pro Element nachgeholt. Der Detail-Pfad lädt **einen** Hof gezielt, nicht „alle Höfe, dann im Client filtern".
4. **RLS bleibt schnell.** Die `org_id in (select org_id from profiles …)`- und `is_org_member(...)`-Prädikate sind durch Indizes auf `profiles(user_id, org_id)` bzw. `org_members(user_id, org_id)` gestützt, sodass die Policy-Subquery pro Zeile nicht zum Performance-Loch wird.
5. **Messbar & wiederholbar.** Es gibt ein reproduzierbares Benchmark-/EXPLAIN-Skript und Schwellwerte (Gate), damit „schnell" eine geprüfte Zahl ist, kein Gefühl.

Diese Welle ist der **Skalierungs-Türsteher** vor Phase 5 (Customer-Gates 10/50/100/300) und vor Phase 4 Track E (Datenmodell-Skalierung): Erst wenn das Performance-Gate grün ist, ist die Datenbank für die Wachstumswellen freigegeben.

---

## Ist-Zustand (repo-genau geprüft)

Geprüfte Quellen: `app/supabase/migrations/0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`, `app/src/lib/data.ts`.

### Bereits vorhandene Indizes (Bestand — nicht duplizieren)

| Tabelle | Index | Deckt |
|---|---|---|
| `farms` | `farms_plz_idx (plz)`, `farms_org_idx (org_id)`, `farms_active_idx (deleted_at) WHERE deleted_at IS NULL` | PLZ-Filter, Org-Scope, Aktiv-Filter |
| `products` | `products_farm_idx (farm_id)`, `products_cat_idx (category)` | Embed je Hof, Kategorie-Filter |
| `reservations` | `reservations_farm_idx (farm_id)`, `reservations_status_idx (status)` | Hof-Reservierungen, Status |
| `subscriptions` | `subscriptions_org_idx (org_id)` | Org-Abo |
| `sb_payments` | `sb_payments_org_idx (org_id)`, `sb_payments_farm_idx (farm_id)`, `sb_payments_status_idx (status)` | SB-Zahlungen je Org/Hof/Status |
| `org_members` | `org_members_user_idx (user_id)` (PK `(org_id,user_id)`) | RLS-Mitgliedschaft |
| `org_locations` | `org_locations_org_idx (org_id)`, `org_locations_plz_idx (plz)` | Standort-Katalog |
| `reviews` | `reviews_farm_idx (farm_id)` | Bewertungen je Hof |
| `bounties` | `bounties_status_idx (status)`, `bounties_plz_idx (plz)` | Gesuche offen/PLZ |
| `credits_ledger` | `credits_org_idx (org_id)` | Guthaben je Org |

### Identifizierte Lücken & Anti-Patterns (was diese Welle behebt)

| Befund | Fundstelle | Problem | Konsequenz |
|---|---|---|---|
| **`getFarm()` lädt ALLE Höfe, filtert im Client** | `data.ts:86–89` (`listFarms()` ohne Filter → `.find(id)`) | Detail-Seite zieht den gesamten Katalog inkl. aller Produkte je Aufruf | Über-Fetch O(n), wächst linear mit Hofzahl → bei 300 Höfen sinnlose Last + Latenz |
| **`select('*, products(*)')` ohne `limit`** | `data.ts:40–44` | Gesamter Katalog + alle Produkte, keine Obergrenze, kein Keyset | Unbegrenzte Payload, keine Pagination → Finder skaliert nicht |
| **Fehlender Composite-Index für RLS-Subquery** | `profiles` hat nur PK `(user_id)` | `org_id in (select org_id from profiles where user_id = auth.uid())` muss `org_id` aus dem Heap holen | RLS-Prädikat nicht index-only → langsamer pro Zeile |
| **Reservierungen: kein `(org_id, created_at)`-Index** | `0001_core.sql:106–107` | Owner-Dashboard listet „neueste Reservierungen je Org" → Filter über RLS-`org_id` + Sortierung `created_at desc` ohne stützenden Index | Sort+Scan statt Index-Range → langsam bei vielen Reservierungen |
| **SB-Zahlungen: keine Zeit-/Bezahlt-Indizes** | `0002_payments.sql:47–49` | Einnahmen-Reports (`paid_at` Zeitraum, `status='paid'`) ohne Index | Erzeuger-Einnahmen-Dashboard = Seq-Scan |
| **`reviews` ohne `org_id`-Index** | `0003_marketplace.sql:60` | RLS-Owner-Moderation + Org-Aggregat über `org_id`, nur `farm_id`-Index vorhanden | RLS-Update-Pfad ungedeckt |
| **Kategorie-Filter clientseitig auf Array** | `data.ts:22–24` | `categories product_category[]` wird im Client gefiltert, nicht in der DB | Volle Liste übertragen, dann verworfen — Bandbreite + Filter nicht index-gestützt (GIN fehlt) |
| **Kein `EXPLAIN`/Benchmark-Artefakt** | — | „schnell" ist nicht gemessen | Kein objektives Gate |

> **Architektur-Notiz (Stop-Regel-bewusst):** `farms.id`/`products.id` sind `text`-Slugs (kein `uuid`/`bigint`). Keyset-Pagination nutzt daher den **fachlich stabilen Sortierschlüssel** (`name` bzw. `(distance, name)` clientseitig / `(plz, name)` serverseitig) plus `id` als Tiebreaker — nicht eine fortlaufende Zahl. Das ist bewusst und wird in der Migration so umgesetzt.

---

## Aufgaben

### 1. Performance-Migration anlegen (additiv, P1)

Neue Migration `app/supabase/migrations/0006_db_hardening.sql` — **rein additiv**, ausschließlich `create index … if not exists` / `create … view`. Keine Tabellen-/Spalten-Drops, kein RLS-Wechsel (RLS-Policies bleiben unverändert; wir machen sie nur schneller). Rollback = `drop index`/`drop view` (in der Migration als Kommentar dokumentiert).

```sql
-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE_11: DB-Härtung (Indizes, RLS-Speed, Views)
-- Additiv. Nur Indizes + lesende Views. Keine Schema-/RLS-Semantikänderung.
-- Rollback siehe Block am Ende (auskommentiert, nur mit Owner-Freigabe).
-- ════════════════════════════════════════════════════════════════

-- ── 1) RLS-Subqueries index-stützen ────────────────────────────
-- Policies nutzen: org_id in (select org_id from profiles where user_id = auth.uid())
-- → Composite-Index macht die Subquery index-only (user_id Lookup liefert org_id mit).
create index if not exists profiles_user_org_idx on profiles (user_id, org_id);
-- org_members deckt is_org_member(): PK (org_id,user_id) + user_idx vorhanden;
-- zusätzlich (user_id, org_id) für die Membership-Prüfung Richtung user → orgs.
create index if not exists org_members_user_org_idx on org_members (user_id, org_id);

-- ── 2) Owner-Dashboard: neueste Reservierungen je Org ──────────
-- Query: where org_id = $1 order by created_at desc limit N (Keyset über created_at,id)
create index if not exists reservations_org_created_idx
  on reservations (org_id, created_at desc);
-- Aktiv-/Status-kombiniert für „offene Reservierungen je Hof"
create index if not exists reservations_farm_status_idx
  on reservations (farm_id, status, created_at desc);

-- ── 3) SB-Einnahmen-Reports (Erzeuger-Dashboard, USP) ──────────
-- Query: where org_id=$1 and status='paid' and paid_at between … order by paid_at desc
create index if not exists sb_payments_org_paid_idx
  on sb_payments (org_id, paid_at desc) where status = 'paid';
create index if not exists sb_payments_farm_paid_idx
  on sb_payments (farm_id, paid_at desc) where status = 'paid';

-- ── 4) Bewertungen: RLS-Owner-Moderation + Org-Aggregat ────────
create index if not exists reviews_org_idx on reviews (org_id);
-- Nur veröffentlichte Bewertungen je Hof (Reputation-Recompute & Public-Read)
create index if not exists reviews_farm_published_idx
  on reviews (farm_id) where status = 'published';

-- ── 5) Finder: Kategorie-Array index-gestützt (GIN) ────────────
-- farms.categories ist product_category[]; GIN erlaubt „enthält Kategorie X" (@>)
-- serverseitig statt clientseitig zu filtern.
create index if not exists farms_categories_gin on farms using gin (categories);

-- ── 6) Produkte: häufige Kombi (Hof + Verfügbarkeit) ───────────
create index if not exists products_farm_avail_idx
  on products (farm_id, availability);

-- ── 7) Subscriptions: schneller Entitlement-Lookup ─────────────
create index if not exists subscriptions_org_status_idx
  on subscriptions (org_id, status);

-- ── 8) Aggregat-View: Hof + Produktzahl (N+1-frei für Listen) ──
-- Liefert Listen-Kennzahlen ohne alle Produkt-Zeilen zu übertragen.
create or replace view farm_list_v as
  select
    f.id, f.org_id, f.name, f.type, f.plz, f.city, f.lat, f.lng,
    f.categories, f.verified, f.rating_avg, f.rating_count, f.reputation_grade,
    f.opening_hours, f.pickup_windows, f.updated_at,
    count(p.id) filter (where p.availability <> 'out') as products_available,
    count(p.id) as products_total
  from farms f
  left join products p on p.farm_id = f.id
  where f.deleted_at is null
  group by f.id;
-- View erbt KEINE RLS automatisch → security_invoker, damit RLS der Basistabellen greift.
alter view farm_list_v set (security_invoker = true);

-- ── ROLLBACK (nur mit Owner-Freigabe ausführen) ────────────────
-- drop view if exists farm_list_v;
-- drop index if exists profiles_user_org_idx, org_members_user_org_idx,
--   reservations_org_created_idx, reservations_farm_status_idx,
--   sb_payments_org_paid_idx, sb_payments_farm_paid_idx,
--   reviews_org_idx, reviews_farm_published_idx, farms_categories_gin,
--   products_farm_avail_idx, subscriptions_org_status_idx;
```

> **Warum `security_invoker = true` (Postgres 15+, von Supabase unterstützt):** Eine View läuft per Default mit den Rechten ihres Erstellers und würde RLS der Basistabellen **umgehen** — ein Tenant-Isolations-Loch. `security_invoker` zwingt die View, mit den Rechten des Aufrufers zu lesen, sodass `farms_public_read`/`products_public_read` greifen. **Pflicht**, sonst verletzt der View Produktionspfeiler #1 (Org-Boundary).
> **Warum Partial-Indizes (`WHERE status='paid'` / `WHERE deleted_at IS NULL`):** Kleiner Index, nur die relevante Teilmenge, exakt auf das Query-Prädikat zugeschnitten — günstiger im Speicher (Cloudflare/Supabase-Kosten, §0.3) und schneller.

### 2. Frontend-Query-Refactor — N+1 + Über-Fetch beseitigen (P1)

`app/src/lib/data.ts` so umbauen, dass es die DB statt den Client filtern lässt und nie den ganzen Katalog für einen Hof zieht. **Seed-Fallback bleibt erhalten** (App ohne Backend lauffähig — Kanon „spielbar sofort").

**2a. `getFarm(id)` lädt genau einen Hof** statt `listFarms()` → `.find`:

```ts
/** Einzelnen Hof gezielt laden — eine Query, kein Katalog-Over-Fetch. */
export async function getFarm(id: string): Promise<Farm | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*, products(*)')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw error
      if (data) return mapFarm(data as Record<string, unknown>)
      return null
    } catch (e) {
      console.warn('[data] getFarm Supabase fehlgeschlagen, nutze Seed:', e)
    }
  }
  return SEED_FARMS.find((f) => f.id === id) ?? null
}
```

**2b. `listFarms()` paginiert + filtert serverseitig** (Kategorie via GIN, Aktiv-Filter, hartes Limit, stabile Sortierung):

```ts
const PAGE_SIZE = 24

export async function listFarms(
  filter: FarmFilter = {},
  cursor?: { name: string; id: string },
): Promise<{ farms: Farm[]; nextCursor: { name: string; id: string } | null }> {
  if (isSupabaseConfigured && supabase) {
    try {
      let q = supabase
        .from('farms')
        .select('*, products(*)')
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .limit(PAGE_SIZE)
      if (filter.category && filter.category !== 'all') {
        q = q.contains('categories', [filter.category]) // nutzt farms_categories_gin
      }
      if (cursor) q = q.or(`name.gt.${cursor.name},and(name.eq.${cursor.name},id.gt.${cursor.id})`)
      const { data, error } = await q
      if (error) throw error
      if (data) {
        const farms = applyDistance(data.map(mapFarm), filter) // Distanz/Sort clientseitig (PLZ-Geo)
        const last = data[data.length - 1] as Record<string, unknown> | undefined
        const nextCursor =
          data.length === PAGE_SIZE && last ? { name: String(last.name), id: String(last.id) } : null
        return { farms, nextCursor }
      }
    } catch (e) {
      console.warn('[data] listFarms Supabase fehlgeschlagen, nutze Seed:', e)
    }
  }
  // Seed-Fallback (clientseitige Filter/Sort wie bisher, ohne Pagination — Seed ist klein)
  return { farms: applyFilterSeed(SEED_FARMS, filter), nextCursor: null }
}
```

> **Keyset statt offset (bewusst):** `offset N` zwingt Postgres, N Zeilen zu lesen und wegzuwerfen — bei Seite 50 also alles davor. Keyset (`name > cursor.name OR (name = cursor.name AND id > cursor.id)`) springt per `(name, id)`-Index direkt an die richtige Stelle: konstante Latenz unabhängig von der Tiefe. Tiebreaker `id` verhindert übersprungene/doppelte Zeilen bei Namensgleichheit.
> **Distanz-Sortierung bleibt clientseitig**, weil PLZ→Geo-Distanz (`geo.ts`) ohne PostGIS gerechnet wird; das ist für eine Seite à 24 Höfe günstig und vermeidet eine teure DB-Extension (§0.3). Bei Track B (Karte/PostGIS) kann das später serverseitig per `earth_distance`/`ll_to_earth` wandern — **dann**, nicht jetzt (kein toter Pfad).

**2c. `FinderPage.tsx` an die paginierte Signatur anpassen** — „Mehr laden"-Button bzw. Infinite-Scroll mit `nextCursor`, Lade-/Leer-/Fehler-Zustand erhalten (End-to-End-Pflicht: kein toter Button). Kategorie-Filter ruft `listFarms` neu auf (Cursor zurücksetzen), nicht clientseitig filtern.

> **Retrofit-Hinweis:** `listFarms` ändert die Rückgabe von `Farm[]` zu `{ farms, nextCursor }`. Alle Aufrufer (`getFarm` alt, `FinderPage`) im selben Commit mitziehen — `npm run typecheck` erzwingt Vollständigkeit (strict). Kein „fast fertig".

### 3. Reservierungs-/SB-Reports gegen die neuen Indizes verdrahten (P2)

Owner-/Erzeuger-Datenpfade so schreiben, dass sie die in 1) angelegten Indizes treffen (Reihenfolge der Prädikate egal — der Planner wählt; aber **Limit + Sortierung Pflicht**):

```ts
// Neueste Reservierungen je Org (RLS scoped automatisch auf eigene Org)
supabase.from('reservations')
  .select('id, farm_id, product_id, quantity, status, created_at')
  .order('created_at', { ascending: false })
  .limit(50)            // trifft reservations_org_created_idx

// SB-Einnahmen im Zeitraum (Erzeuger-Dashboard)
supabase.from('sb_payments')
  .select('id, farm_id, amount_cents, currency, paid_at')
  .eq('status', 'paid')
  .gte('paid_at', from).lte('paid_at', to)
  .order('paid_at', { ascending: false })
  .limit(100)           // trifft sb_payments_org_paid_idx (partial)
```

> Kein `select('*')` in Reports — nur die Spalten, die die UI rendert (schmalerer Payload, kleinere Buffers, weniger Bandbreite/Kosten). Aggregat-Listen nutzen `farm_list_v` statt Höfe + alle Produkte einzeln.

### 4. EXPLAIN-/Benchmark-Skript (P1, das Mess-Herzstück)

`app/supabase/perf/explain.sql` — reproduzierbare Plan-Prüfung gegen lokal geseedete Daten. Wird vom Gate (Aufgabe 6) gefahren. Erwartung je Block als Kommentar dokumentiert.

```sql
-- WAVE_11 Perf-Check. Lokal gegen `supabase start` + seed ausführen.
-- Erwartung: KEIN "Seq Scan" auf großen Tabellen; Index Scan / Bitmap Index Scan.
set search_path = public;

-- A) Finder, eine Seite (Keyset, Kategorie-Filter via GIN)
explain (analyze, buffers, format text)
  select id, name, plz, categories from farms
  where deleted_at is null and categories @> array['Gemüse']::product_category[]
  order by name, id limit 24;

-- B) Detail: genau ein Hof + Produkte (kein Katalog-Scan)
explain (analyze, buffers)
  select f.*, p.* from farms f
  left join products p on p.farm_id = f.id
  where f.id = 'hof-sonnenwiese' and f.deleted_at is null;

-- C) Owner-Dashboard: neueste Reservierungen je Org
explain (analyze, buffers)
  select id, status, created_at from reservations
  where org_id = (select id from orgs limit 1)
  order by created_at desc limit 50;

-- D) SB-Einnahmen im Zeitraum (partial-Index erwartet)
explain (analyze, buffers)
  select id, amount_cents, paid_at from sb_payments
  where org_id = (select id from orgs limit 1) and status = 'paid'
  order by paid_at desc limit 100;

-- E) RLS-Subquery-Stütze: profiles(user_id) → org_id (index-only erwartet)
explain (analyze, buffers)
  select org_id from profiles where user_id = (select user_id from profiles limit 1);
```

`app/supabase/perf/seed_bulk.sql` — synthetische Last (300 Höfe, ~6 000 Produkte, ~10 000 Reservierungen) NUR für lokale Messung (nie produktiv):

```sql
-- Lokaler Last-Seed (idempotent-genug für Messläufe; nur lokal!)
insert into orgs (name) select 'Org '||g from generate_series(1,50) g;
insert into farms (id, org_id, name, type, street, plz, city, lat, lng, categories)
  select 'lf-'||g, (select id from orgs order by random() limit 1),
         'Lasthof '||g, 'Hofladen', 'Weg '||g, lpad((10000+g)::text,5,'0'),
         'Stadt '||g, 50+random(), 7+random(),
         (array['Gemüse','Obst','Eier']::product_category[])
  from generate_series(1,300) g
  on conflict (id) do nothing;
-- … Produkte/Reservierungen analog per generate_series (siehe Skript-Volltext).
```

### 5. RLS-Performance ohne Isolations-Bruch verifizieren (P1)

Indizes dürfen die **Sicherheit nie aufweichen**. Nach 1) erneut den Tenant-Isolationstest aus WAVE_02/WAVE_12 fahren — gleiche Policies, nur schneller. Zusätzlich prüfen:

- `farm_list_v` respektiert RLS (anon sieht nur `deleted_at is null`; org-fremde Schreibspalten unsichtbar) → `security_invoker`-Beleg.
- Kein Index „leakt" über RLS hinweg (Indizes ändern Sichtbarkeit nicht — Doku-Anker, kein Code).
- `EXPLAIN` als der **gleiche Rolle** (`anon`/`authenticated`) wie die App, nicht als Superuser, sonst wird die RLS-Subquery im Plan nicht sichtbar.

### 6. Performance-Gate-Skript (P1)

`app/scripts/db-perf-gate.sh` — fährt EXPLAIN gegen die lokale Supabase-DB, **failt hart** bei `Seq Scan` auf den heißen Tabellen oder bei fehlenden Indizes. Quelle der Wahrheit: der echte Query-Plan, nicht Annahmen.

```bash
#!/usr/bin/env bash
# WAVE_11 — DB-Performance-Gate. Failt bei Seq Scan auf heißen Pfaden / fehlenden Indizes.
set -euo pipefail
fail=0
note() { echo "::error::$1"; fail=1; }

DBURL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "== 1) Pflicht-Indizes vorhanden? =="
need=(profiles_user_org_idx reservations_org_created_idx sb_payments_org_paid_idx
      farms_categories_gin reviews_org_idx subscriptions_org_status_idx)
have=$(psql "$DBURL" -tAc "select indexname from pg_indexes where schemaname='public';")
for ix in "${need[@]}"; do
  echo "$have" | grep -qx "$ix" || note "Index fehlt: $ix"
done

echo "== 2) farm_list_v ist security_invoker (kein RLS-Bypass)? =="
si=$(psql "$DBURL" -tAc "select reloptions::text from pg_class where relname='farm_list_v';")
echo "$si" | grep -q 'security_invoker=true' || note "farm_list_v ohne security_invoker → RLS-Bypass-Risiko!"

echo "== 3) Keine Seq Scans auf heißen Pfaden =="
plan=$(psql "$DBURL" -f app/supabase/perf/explain.sql 2>&1)
if echo "$plan" | grep -qiE 'Seq Scan on (farms|products|reservations|sb_payments|reviews)\b'; then
  echo "$plan" | grep -iE 'Seq Scan'
  note "Sequential Scan auf großer Tabelle gefunden (Index fehlt oder wird nicht genutzt)."
fi

[ "$fail" -ne 0 ] && { echo "DB-PERF-GATE: FAIL"; exit 1; }
echo "DB-PERF-GATE: PASS"
```

> `chmod +x app/scripts/db-perf-gate.sh`. Lokal vor jedem PR ausführbar (Shift-Left). In CI als **separater, nach Migration laufender** Job (braucht `supabase start` + Seed-Bulk).

### 7. Doku & Tracker (P2)

- `docs/DATABASE_MODEL.md` (MASTER_INDEX 1·Architektur, Status ⬜→🔨) um Abschnitt **„Index-Strategie & Pagination"** ergänzen: Index-Inventar (Bestand + neu), Keyset-Begründung, `farm_list_v`/`security_invoker`-Hinweis, N+1-Regel.
- `.claude/memory/patterns/` Muster „Keyset-Pagination + Partial-/GIN-Index + security_invoker-View" als **Imperium-Beschleuniger** (gilt für alle 14 Tochterplattformen).
- `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` (Abschnitt 7) nach Abschluss aktualisieren.

---

## Konkrete Befehle (Reihenfolge)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Lokale Supabase + Migrationen + Seed (für Messung)
supabase start
supabase db reset                       # spielt 0001..0006 frisch ein
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/seed_bulk.sql

# 2) Frontend: Typecheck/Lint/Build nach Query-Refactor (data.ts, FinderPage.tsx)
npm run typecheck
npm run lint
npm run build

# 3) EXPLAIN-Pläne ansehen (manuell verifizieren: Index Scan, kein Seq Scan)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/explain.sql

# 4) Performance-Gate (blockierend)
chmod +x scripts/db-perf-gate.sh
bash scripts/db-perf-gate.sh            # erwartet: DB-PERF-GATE: PASS

# 5) Negativtest: Gate MUSS rot werden, wenn ein Pflicht-Index fehlt
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "drop index farms_categories_gin;"
bash scripts/db-perf-gate.sh ; echo "ExitCode=$?"      # erwartet: FAIL, ExitCode=1
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/migrations/0006_db_hardening.sql  # wiederherstellen

# 6) Isolations-Regression (keine Sicherheits-Regression durch Indizes/View)
#    (Isolationstest aus WAVE_02/WAVE_12 — fremde Org = 403/0 Zeilen, nicht 200 mit Fremddaten)
node supabase/tests/run-isolation.mjs   # bzw. der etablierte Runner der QA-Welle

# 7) Produktiv ausrollen — NUR mit Owner-Freigabe (Account/Kosten/irreversibel)
# supabase db push                       # spielt 0006_db_hardening.sql gegen Prod-Projekt
# supabase migration list                # Verifikation: 0006 als applied gelistet
```

> **`pg_stat_statements` / Slow-Query-Beobachtung** (optional, P3): in Supabase per Dashboard aktivierbar; danach `select query, mean_exec_time, calls from pg_stat_statements order by mean_exec_time desc limit 20;` als laufende Beobachtung (WAVE_13 Observability dockt an). Aktivierung = Owner-Freigabe (Plattform-Setting).

---

## Acceptance (Akzeptanzkriterien)

- [ ] `app/supabase/migrations/0006_db_hardening.sql` existiert, ist **rein additiv** (`create index/view if not exists`), enthält dokumentierten Rollback-Block; `supabase db reset` läuft fehlerfrei durch.
- [ ] Alle Pflicht-Indizes angelegt: `profiles_user_org_idx`, `org_members_user_org_idx`, `reservations_org_created_idx`, `reservations_farm_status_idx`, `sb_payments_org_paid_idx`, `sb_payments_farm_paid_idx`, `reviews_org_idx`, `reviews_farm_published_idx`, `farms_categories_gin`, `products_farm_avail_idx`, `subscriptions_org_status_idx`.
- [ ] **N+1 weg:** `getFarm(id)` führt **eine** gezielte Query aus (`eq('id', …)`), lädt **nicht** den ganzen Katalog. Belegt durch EXPLAIN-Block B (Index Scan auf `farms_pkey`, kein Seq Scan).
- [ ] **Pagination steht:** `listFarms` hat hartes `limit` (24) + stabile `(name, id)`-Sortierung + Keyset-Cursor; `FinderPage` rendert „Mehr laden" mit echtem `nextCursor` (kein toter Button, Lade-/Leer-/Fehlerzustand vorhanden).
- [ ] **Kategorie-Filter serverseitig** (`contains`/`@>` über `farms_categories_gin`) statt clientseitig auf voller Liste; EXPLAIN-Block A zeigt Bitmap/Index Scan auf dem GIN-Index.
- [ ] EXPLAIN A–E zeigen **keinen** `Seq Scan` auf `farms`/`products`/`reservations`/`sb_payments`/`reviews` unter Last-Seed (300 Höfe).
- [ ] `farm_list_v` ist `security_invoker = true` (Gate-Check 2 grün) → **kein RLS-Bypass**; anon sieht nur aktive Höfe.
- [ ] **Performance-Gate:** `bash scripts/db-perf-gate.sh` → `PASS`; Negativtest (Pflicht-Index gedroppt) → `FAIL`, Exit 1, reproduzierbar.
- [ ] **Keine Sicherheits-Regression:** Tenant-Isolationstest (WAVE_02/WAVE_12) bleibt grün — fremde Org = 403/0 Zeilen, nie 200 mit Fremddaten.
- [ ] `npm run ci` (typecheck + lint + build) grün nach dem Query-Refactor (alle Aufrufer der geänderten `listFarms`-Signatur mitgezogen).
- [ ] Reports nutzen **Spaltenlisten statt `select('*')`** und treffen die neuen Indizes (visuell + EXPLAIN belegt).
- [ ] `docs/DATABASE_MODEL.md` Abschnitt „Index-Strategie & Pagination" ergänzt; Muster in `.claude/memory/patterns/`.

---

## Gate (blockierend)

> **WAVE_11-Performance-Gate** muss grün sein, bevor Phase 4 Track E (Datenmodell-Skalierung) und Phase 5 (Customer-Gates 50/100/300) freigegeben werden. Es ist Vorgate zu Phase-2-Gate **E (Performance)**.

```
GATE WAVE_11:
  ✅ Migration 0006 additiv eingespielt (supabase db reset grün, Rollback dokumentiert)
  ✅ Alle 11 Pflicht-Indizes vorhanden (Gate-Check 1)
  ✅ farm_list_v = security_invoker (Gate-Check 2 — kein RLS-Bypass)
  ✅ EXPLAIN A–E: kein Seq Scan auf heißen Tabellen unter 300-Hof-Last (Gate-Check 3)
  ✅ db-perf-gate.sh → PASS ; Negativtest (Index drop) reproduzierbar FAIL (Exit 1)
  ✅ N+1 weg: getFarm = 1 Query ; listFarms paginiert (Keyset + limit + stabile Sortierung)
  ✅ Tenant-Isolationstest weiterhin grün (keine Security-Regression)
  ✅ npm run ci grün (Query-Refactor end-to-end, alle Aufrufer angepasst)
```

**Stop-Regeln in dieser Welle:**
- EXPLAIN gegen **Prod** statt lokal nötig, oder `supabase db push` / Extension-Aktivierung (`pg_trgm`, `pg_stat_statements`) → **STOP**, Owner-Freigabe (Account/Kosten/irreversibel).
- Ein vermeintlich nötiger Index erzwingt eine **Schema-/RLS-Änderung** (nicht rein additiv) → **STOP**, minimalen additiven Alternativweg vorschlagen, Owner entscheiden lassen (Kanon: „keine Migration ohne Rollback", „keine verdeckten Architekturwechsel").
- Performance verlangt PostGIS/Geo-Distanz **in der DB** → **STOP**, das gehört zu Phase 4 Track B (Karte) mit eigenem ADR, nicht in diese Welle (kein toter/teurer Pfad ohne aktiven Nutzen).
- View ohne `security_invoker` oder Index, der RLS-Sichtbarkeit verändert → **STOP**, Isolations-Bruch (Produktionspfeiler #1).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_11 — DB-Härtung (Indizes, Pagination, Query-Performance, N+1)
- Geändert:
  - app/supabase/migrations/0006_db_hardening.sql (NEU: 11 Indizes + farm_list_v security_invoker)
  - app/src/lib/data.ts (getFarm = 1 Query; listFarms = Keyset-Pagination + serverseitiger Kategoriefilter)
  - app/src/pages/FinderPage.tsx ("Mehr laden"/nextCursor, Lade-/Leer-/Fehlerzustand)
  - app/supabase/perf/explain.sql + seed_bulk.sql (NEU, Messung)
  - app/scripts/db-perf-gate.sh (NEU, blockierendes Gate)
  - docs/DATABASE_MODEL.md (Abschnitt Index-Strategie & Pagination)
- Tests:
  - supabase db reset → grün (0001..0006)
  - EXPLAIN A–E unter 300-Hof-Last → Index Scan, kein Seq Scan (Plan-Auszug anhängen, ohne Daten)
  - bash scripts/db-perf-gate.sh → PASS ; Negativtest (Index drop) → FAIL (Exit 1)
  - Tenant-Isolationstest → grün (keine Security-Regression)
  - npm run ci → grün
- Messwerte (vorher/nachher, ms — Plan-mean_exec_time):
  - Finder-Seite: <…> → <…>   · Hof-Detail: <…> → <…>   · Reservierungs-Dashboard: <…> → <…>
- Risiken: rein additive Indizes/View (Rollback dokumentiert); Prod-Rollout (supabase db push) wartet auf Owner-Freigabe.
- Nächste Welle: WAVE_12 (QA Tests: Unit/Integration/E2E + Cross-Org-Negativtests).
```

---

## Übergang

→ Erst wenn das **WAVE_11-Performance-Gate grün** ist: WAVE_12 (QA-Tests) fortführen und Phase-2-Gate E (Performance) sowie Phase-4-Track-E / Phase-5-Customer-Gates (50/100/300) freischalten.

> **Tracker-Pflicht nach Abschluss:** `docs/releases/PHASE_STATUS.md` Zeile „WAVE_11 DB-Härtung" auf den realen Stand setzen; `MASTER_INDEX.md` (Abschnitt 7 · `finalization/WAVE_00…15`) auf ✅. Wiederverwendbares Muster (Keyset-Pagination + Partial-/GIN-Index + `security_invoker`-View + Perf-Gate) als Imperium-Beschleuniger nach `.claude/memory/patterns/` verdichten — gilt für alle 14 Tochterplattformen.
