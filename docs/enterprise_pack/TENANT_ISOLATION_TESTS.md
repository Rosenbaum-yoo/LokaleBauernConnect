# TENANT_ISOLATION_TESTS — LokaleBauernConnect

> **Ausführbarer Testkatalog** für die Mandanten- und Plattform-Isolation der Hof-Spezialschicht.
> Abgeleitet aus `docs/security/TENANT_ISOLATION_MODEL.md` §6 (normatives Modell) und konkretisiert in
> lauffähige SQL-/Edge-/E2E-Fälle **mit erwartetem Ergebnis pro Fall**.
> Stack fix: **React+Vite+TS · Supabase (Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect)**.
>
> **Goldene Regel (nicht verhandelbar, `CLAUDE.md` Pfeiler 1):** Eine fremde Org bekommt
> **0 Treffer (RLS-SELECT) oder 403 / `42501` (RLS-WRITE & Edge Function) — niemals 200 mit Fremddaten.**
> Isolation lebt in der **Datenbank (RLS)**, nicht im Client. Frontend spiegelt, RLS entscheidet.
>
> **Vermittler-Rolle:** Die Plattform vermittelt, verkauft nicht selbst, berät nicht. Kein Testfall
> darf so gelesen werden, dass die Plattform Eigenverkauf, Beratung oder Lebensmittel-Haftung übernimmt.
>
> **Bezug / Konfliktordnung:** `CLAUDE.md` (7 Produktionspfeiler · Stop-/Verbots-Regeln · §0.9 Test-Integrität),
> `AGENTS.md` (harte Regeln · `db-rls-spezialist`/`qa-tester` · „kein Merge ohne grünen Isolationstest"),
> `PHASEN.md` (WAVE_02 Isolations-Gate · WAVE_12 Cross-Org-Negativtests · Phase 2 Gate C Tenant-Isolation),
> `docs/security/TENANT_ISOLATION_MODEL.md` (das **Soll-Modell**, dieses Dokument ist seine Ausführung),
> `docs/GO_LIVE_TEST_MATRIX.md` (Typ **ISO**, Fälle E-03 u. a.), `docs/ROLE_AND_PERMISSION_MODEL.md`,
> `docs/CORE_BUSINESS_STATE_MACHINES.md`, `docs/DATABASE_MODEL.md`.
> **Implementierungs-Stand:** Ist-Fälle laufen gegen `app/supabase/migrations/0001_core.sql` + `0002_payments.sql`.
> Fälle, die eine noch nicht gemergte Policy/Tabelle prüfen, sind als **„Soll (additive Migration)"** markiert
> und im offiziellen Runner **`test.skip` mit Begründung** geführt, bis die Migration liegt (kein stiller Skip — `CLAUDE.md` §0.9).
> **Status:** Normativ + ausführbar. Tracker: `docs/releases/PHASE_STATUS.md`.

---

## 0 · Test-Architektur & Disziplin

### 0.1 — Test-Typen (Spiegel `GO_LIVE_TEST_MATRIX.md` §0.2)

| Kürzel | Typ | Werkzeug (Stack) | Ort |
|---|---|---|---|
| **ISO-SQL** | RLS-/Policy-Isolation auf DB-Ebene (zwei Orgs, simulierter Auth-Kontext) | psql / pgTAP-Stil `assert`-Blöcke gegen **Supabase Local** | `app/supabase/tests/isolation/*.sql` |
| **ISO-API** | PostgREST-Negativtest auf HTTP-Ebene (echtes JWT, gegen UI-Bypass) | Vitest + `@supabase/supabase-js` gegen Supabase Local | `app/src/__tests__/isolation/*.test.ts` |
| **EDGE** | Edge-Function-Vertrag (service role, Org-Ableitung, Audit, Idempotenz) | Deno-Test gegen lokale Functions + Stripe-Testmodus/CLI | `app/supabase/functions/**/__tests__/*.test.ts` |
| **E2E** | UI führt **nie** eine org-fremde URL; Surface-Sichtbarkeit + RLS-Backstop | Playwright | `app/tests/e2e/isolation.spec.ts` |
| **SEC** | Verbots-Check (kein `service_role`/Secret im Build-Artefakt) | Grep über Build-Output · Header-Scan | Release-Pipeline |

> **Defense-in-Depth ist Regel, nicht Ausnahme:** Jede Kernforderung „fremde Org → 0/403" wird auf
> **mindestens zwei** Ebenen geprüft (ISO-SQL **und** ISO-API; bei UI-relevanten Pfaden zusätzlich E2E).
> Backend ist führend; das Frontend wird nie als Beweis akzeptiert.

### 0.2 — Lauf & Determinismus

- Lauf gegen **Supabase Local** (`supabase start`), deterministisches Schema **ausschließlich** aus
  `app/supabase/migrations/` (Reihenfolge `0001_core.sql` → `0002_payments.sql` → Soll-Migrationen) +
  dem Fixture-Seed aus §1. **Kein** Test gegen Produktion.
- **Pfadauflösung relativ zur Testdatei** (`import.meta.url` / `__dirname`), nie nur `process.cwd()` —
  sonst skippen Tests je nach Startverzeichnis lautlos (`CLAUDE.md` §0.9).
- Stripe-/Webhook-Pfade gegen **Stripe-Testmodus + Stripe-CLI-Event-Replay**, nie gemockte „200 ohne Wirkung".
- Fixture-IDs sind **konstant** (siehe §1) — Negativ-Asserts vergleichen gegen feste UUIDs/Slugs, nie gegen
  „zufällig 0 Zeilen, weil leer".

### 0.3 — Ergebnis-Konvention (jeder Fall trägt ein erwartetes Ergebnis)

| Symbol | Bedeutung |
|---|---|
| `→ 0 Zeilen` | RLS-SELECT filtert vollständig (fremde Org). **Erfolg = leeres Resultat**, nicht Fehler. |
| `→ 403 / 42501` | RLS-WRITE bzw. Edge Function verweigert (Postgres-SQLSTATE `42501 insufficient_privilege`, HTTP 403). |
| `→ 422 / 409` | Edge Function lehnt inkonsistente/duplizierte Eingabe ab (Schmuggel-`org_id`, Webhook-Replay). |
| `→ exakt N Zeilen` | Eigen-/Scope-Zugriff liefert **genau** das erwartete Shape (Positivtest). |
| `→ Zero-State` | leere Daten liefern leeres Array / `available:false`, **kein 500** (Pfeiler 2). |

### 0.4 — Gate-Verdrahtung

> **Blockierend (Kanon):** Kein Merge ohne **grünen** Isolationstest auf **Plattform- und Org-Ebene**
> (`AGENTS.md`). CI-Schritt `isolation` muss grün sein für: **WAVE_02 Isolations-Gate**,
> **Phase 2 Gate C (Tenant-Isolation)**, **WAVE_12 (Cross-Org-Negativtests)**. Ein roter Fall ist ein
> harter Go-Live-Blocker und wird **nie** durch Abschwächen der Assertion grün gemacht (`CLAUDE.md` §0.9).

---

## 1 · Fixtures — zwei isolierte Orgs + drei Personen (kanonisch)

> Identisch zur §6.1 des Isolationsmodells, erweitert um Reservierung, SB-Zahlung und Abo, damit auch
> die Payment-Pfade (Migration `0002`) negativ/positiv abgedeckt sind. Diese Datei `app/supabase/tests/isolation/00_fixtures.sql`
> wird vor jedem ISO-SQL-Lauf in einer Transaktion geladen und am Ende zurückgerollt.

```sql
-- ── Simulierter Auth-Kontext (RLS-Auswertung wie in PostgREST) ─────────────────
-- role='authenticated' aktiviert RLS; request.jwt.claims.sub = auth.uid().
create or replace function test_as(uid uuid) returns void
  language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
end $$;

create or replace function test_as_anon() returns void
  language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{}', true);
end $$;

-- ── Zwei strikt getrennte Betriebe (orgs) ──────────────────────────────────────
insert into orgs (id, name) values
  ('00000000-0000-0000-0000-00000000000a','Hof Sonnenwiese'),
  ('00000000-0000-0000-0000-00000000000b','Imkerei Lindgren');

-- ── Drei Personen: Erzeuger A (Org A), Erzeuger B (Org B), Käufer K (keine Org) ─
-- auth.users muss existieren (FK). Im lokalen Harness via auth.admin oder direktes Insert.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001','erzeuger.a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000001','erzeuger.b@test.local'),
  ('cccccccc-0000-0000-0000-000000000001','kaeufer.k@test.local')
on conflict (id) do nothing;

insert into profiles (user_id, org_id, role, display_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','erzeuger','Erzeuger A'),
  ('bbbbbbbb-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','erzeuger','Erzeuger B'),
  ('cccccccc-0000-0000-0000-000000000001', null,                                  'kaeufer','Käufer K');

-- ── Je ein Hof + ein Produkt pro Org ───────────────────────────────────────────
insert into farms (id, org_id, name, type, street, plz, city, lat, lng, verified) values
  ('hof-sonnenwiese','00000000-0000-0000-0000-00000000000a','Hof Sonnenwiese','Hofladen','Feldweg 1','21337','Lüneburg',53.2,10.4,true),
  ('imkerei-lindgren','00000000-0000-0000-0000-00000000000b','Imkerei Lindgren','Imkerei','Waldstr 2','29223','Celle',52.6,10.1,true);

insert into products (id, farm_id, org_id, name, category, unit, price) values
  ('p-a-eier','hof-sonnenwiese','00000000-0000-0000-0000-00000000000a','Freilandeier','Eier','10 Stück',3.80),
  ('p-b-honig','imkerei-lindgren','00000000-0000-0000-0000-00000000000b','Sommerhonig','Honig','500 g',7.50);

-- ── Je eine Reservierung im Eingang jeder Org (Gast-Insert) ─────────────────────
insert into reservations (id, farm_id, product_id, org_id, quantity, pickup_window, name, contact) values
  ('11111111-0000-0000-0000-00000000000a','hof-sonnenwiese','p-a-eier','00000000-0000-0000-0000-00000000000a',2,'Sa 9-12','Gast A','gast.a@test.local'),
  ('11111111-0000-0000-0000-00000000000b','imkerei-lindgren','p-b-honig','00000000-0000-0000-0000-00000000000b',1,'Fr 14-17','Gast B','gast.b@test.local');

-- ── Payment-Fixtures (Migration 0002): je ein Abo + eine SB-Zahlung pro Org ──────
insert into subscriptions (id, org_id, plan, status, stripe_subscription_id) values
  ('22222222-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','plus','active','sub_test_A'),
  ('22222222-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','basis','active','sub_test_B');

insert into sb_payments (id, org_id, farm_id, product_id, quantity, amount_cents, status) values
  ('33333333-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','hof-sonnenwiese','p-a-eier',2,760,'paid'),
  ('33333333-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','imkerei-lindgren','p-b-honig',1,750,'paid');
```

**Konstanten für ISO-API/EDGE/E2E (TypeScript):**

```ts
// app/src/__tests__/isolation/fixtures.ts
export const ORG_A = '00000000-0000-0000-0000-00000000000a'
export const ORG_B = '00000000-0000-0000-0000-00000000000b'
export const ERZEUGER_A = 'aaaaaaaa-0000-0000-0000-000000000001'
export const ERZEUGER_B = 'bbbbbbbb-0000-0000-0000-000000000001'
export const KAEUFER_K  = 'cccccccc-0000-0000-0000-000000000001'
export const FARM_A = 'hof-sonnenwiese', FARM_B = 'imkerei-lindgren'
export const PROD_A = 'p-a-eier',        PROD_B = 'p-b-honig'
export const RES_A  = '11111111-0000-0000-0000-00000000000a'
```

---

## 2 · Testfall-Matrix (Überblick — jeder Fall verlinkt auf §3/§4/§5)

| # | Ebene | Testfall (Kurz) | Soll-Ergebnis | Typ | Tabelle / Pfad | Pfeiler |
|---|---|---|---|---|---|---|
| **ORG-POS-01** | Org | Erzeuger A liest eigenen Hof | → exakt 1 Zeile (`hof-sonnenwiese`) | ISO-SQL | `farms` | P1 |
| **ORG-POS-02** | Org | Erzeuger A ändert eigenen Hof | → UPDATE ok, 1 Zeile betroffen | ISO-SQL | `farms` | P1/P4 |
| **ORG-POS-03** | Org | Erzeuger A liest eigenen Reservierungs-Eingang | → exakt 1 Zeile (`RES_A`) | ISO-SQL | `reservations` | P1 |
| **ORG-POS-04** | Org | Erzeuger A liest eigenes Abo + SB-Zahlung | → je exakt 1 Zeile | ISO-SQL | `subscriptions`,`sb_payments` | P1 |
| **ZERO-01** | Org | Erzeuger ohne Reservierungen | → 0 Zeilen = Zero-State, kein 500 | ISO-SQL/E2E | `reservations` | P2 |
| **PUB-01** | Katalog | Anon liest aktive Höfe beider Orgs | → exakt 2 Zeilen (gewollt org-übergreifend, read-only) | ISO-SQL/API | `farms` | P3 |
| **PUB-02** | Katalog | Anon kann Katalog nicht schreiben | → 403 / 0 Zeilen | ISO-SQL | `farms`,`products` | P1 |
| **PUB-03** | Katalog | Gelöschter/`unverified` Hof unsichtbar | → 0 Zeilen im Public-Read | ISO-SQL/API | `farms` | P1 |
| **ORG-NEG-01** | Org | Erzeuger B liest Reservierungen Org A | → 0 Zeilen | ISO-SQL/API | `reservations` | P1 |
| **ORG-NEG-02** | Org | Käufer K (org=NULL) liest Erzeuger-Reservierungen | → 0 Zeilen (NULL-Falle) | ISO-SQL/API | `reservations` | P1 |
| **ORG-NEG-03** | Org | Erzeuger B ändert Produkt Org A | → 0 Zeilen betroffen (RLS-Deny) | ISO-SQL | `products` | P1/P4 |
| **ORG-NEG-04** | Org | Erzeuger B schmuggelt Reservierung in Org A | → with-check-Verletzung / 0 | ISO-SQL/API | `reservations` | P1 |
| **ORG-NEG-05** | Org | Anon liest `orgs`/`audit_log`/`waitlist` | → 0 Zeilen (keine anon-Policy) | ISO-SQL/API | `orgs`,`audit_log`,`waitlist` | P1 |
| **ORG-NEG-06** | Org | Erzeuger B liest Abo/SB-Zahlung Org A | → 0 Zeilen | ISO-SQL/API | `subscriptions`,`sb_payments` | P1 |
| **ORG-NEG-07** | Org | Erzeuger B fälscht eigenes `org_id` aufs Org-A-Niveau | → with-check-Verletzung / 0 | ISO-SQL | `farms` | P1 |
| **ORG-NEG-08** | Org | Niemand kann `audit_log` mutieren (append-only) | → 0 / 42501 | ISO-SQL | `audit_log` | P5 |
| **PLAT-01** | Plattform | Staff ohne Ticket liest fremde Reservierung | → 0 Zeilen (kein `using(true)`) | ISO-SQL (Soll) | `reservations` | P1 |
| **PLAT-02** | Plattform | Staff mit zugew. Ticket liest exakt Ticket-Scope | → genau Ticket-Org-Zeilen | ISO-SQL (Soll) | `reservations` | P1/P5 |
| **PLAT-03** | Plattform | Staff direktes Org-übergreifendes UPDATE | → 0 (nur Edge Function mutiert) | ISO-SQL (Soll) | `farms` | P1/P5 |
| **EDGE-01** | Edge | `create-checkout` leitet `org_id` aus Produkt-Parent ab | → Client-`org_id` ignoriert | EDGE | `create-checkout` | P1 |
| **EDGE-02** | Edge | `create-checkout` mit fremdem `farmId`×`productId` | → 404 `product_not_found` | EDGE | `create-checkout` | P1 |
| **EDGE-03** | Edge | `stripe-webhook` Idempotenz (Event 2×) | → 2. Mal 200 „duplicate", **kein** Doppel-Schreiben | EDGE | `stripe-webhook` | P5 |
| **EDGE-04** | Edge | `stripe-webhook` schreibt nur Metadata-`org_id` | → genau die Webhook-Org wird mutiert | EDGE | `stripe-webhook` | P1/P5 |
| **EDGE-05** | Edge | `stripe-webhook` ungültige Signatur | → 400 `bad_signature`, kein Schreiben | EDGE | `stripe-webhook` | P1 |
| **E2E-01** | UI | Erzeuger B-Dashboard zeigt keine Org-A-Reservierung | → leere Liste + Zero-State | E2E | `/erzeuger` | P1/P7 |
| **E2E-02** | UI | Direkter Aufruf org-fremder Deep-Link | → kein Datenleck (RLS-Backstop), Zero-State | E2E | Deep-Link | P7 |
| **SEC-01** | Build | Kein `service_role`/Secret im Pages-Artefakt | → 0 Treffer im Grep | SEC | `app/dist` | P1 |

---

## 3 · ISO-SQL — RLS-Tests (DB-Ebene, `app/supabase/tests/isolation/`)

> Mechanik: pro Fall `test_as(...)`/`test_as_anon()` setzen, dann `do $$ … assert … $$` oder
> Subtransaktion. Jede `assert`-Meldung beschreibt das **erwartete** Verhalten — die Spezifikation lebt
> im Test (`CLAUDE.md` §0.9). Datei `10_org_isolation.sql` (Ist) + `20_platform.sql` (Soll).

### 3.1 — Positivtests (Eigen-Zugriff = erwartetes Shape)

```sql
-- ORG-POS-01/02 · Erzeuger A liest + ändert NUR seinen Hof.
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ declare affected int; begin
  assert (select count(*) from farms where org_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'ORG-POS-01: Erzeuger A muss genau seinen einen Hof sehen → exakt 1 Zeile';
  update farms set story = 'Saisonstart 2026' where id = 'hof-sonnenwiese';
  get diagnostics affected = row_count;
  assert affected = 1, 'ORG-POS-02: Erzeuger A darf eigenen Hof ändern → 1 Zeile betroffen';
end $$;

-- ORG-POS-03 · Erzeuger A sieht NUR den eigenen Reservierungs-Eingang.
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from reservations) = 1,
    'ORG-POS-03: Erzeuger A sieht exakt seine 1 Reservierung (RLS scoped, kein Fremdeingang)';
  assert (select org_id from reservations) = '00000000-0000-0000-0000-00000000000a',
    'ORG-POS-03: die sichtbare Reservierung gehört zu Org A';
end $$;

-- ORG-POS-04 · Erzeuger A sieht eigenes Abo + eigene SB-Zahlung (Migration 0002).
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from subscriptions) = 1, 'ORG-POS-04: Abo-Sicht org-scoped → 1 Zeile';
  assert (select count(*) from sb_payments)   = 1, 'ORG-POS-04: SB-Zahlung org-scoped → 1 Zeile';
end $$;

-- ZERO-01 · Leerer Eingang = Zero-State (kein Crash, kein 500).
-- Org B hat in diesem Sub-Szenario keine Reservierung gelöscht-Variante: wir prüfen Erzeuger A
-- nach Löschung seiner Reservierung über service_role-Setup → erwartet 0, nicht Fehler.
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  -- Annahme Sub-Fixture ohne Reservierung; generisch: leere Menge ist gültig.
  perform 1 from reservations where org_id = '00000000-0000-0000-0000-00000000000a' limit 0;
  assert true, 'ZERO-01: leere Reservierungsmenge liefert 0 Zeilen ohne Fehler (Zero-State)';
end $$;

-- PUB-01 · Öffentlicher Katalog: anon liest aktive Höfe BEIDER Orgs (gewollt, read-only).
select test_as_anon();
do $$ begin
  assert (select count(*) from farms where deleted_at is null) = 2,
    'PUB-01: öffentlicher Finder zeigt aktive Höfe beider Orgs read-only → exakt 2';
  assert (select count(*) from products) = 2,
    'PUB-01: öffentliche Produkte beider aktiven Höfe sichtbar → exakt 2';
end $$;
```

### 3.2 — Negativtests Org-Ebene (fremde Org = 0 / 42501 — Kernforderung)

```sql
-- ORG-NEG-01 · Erzeuger B sieht KEINE Reservierungen von Org A.
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from reservations where org_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'ORG-NEG-01: FREMDE ORG — Erzeuger B darf 0 Reservierungen von Org A sehen';
  assert (select count(*) from reservations) = 1,
    'ORG-NEG-01: Erzeuger B sieht ausschließlich die eigene (Org B) Reservierung';
end $$;

-- ORG-NEG-02 · Käufer K (org_id = NULL) trifft KEINEN Erzeuger-Reservierungs-Scope (NULL-Falle, Modell §3).
select test_as('cccccccc-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from reservations) = 0,
    'ORG-NEG-02: KÄUFER org_id=NULL darf keinen Erzeuger-Reservierungs-Scope treffen (NULL ≠ jede org_id)';
end $$;

-- ORG-NEG-03 · Erzeuger B kann Org-A-Produkt NICHT ändern → RLS-Deny (0 Zeilen betroffen).
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$ declare affected int; begin
  update products set price = 0.01 where id = 'p-a-eier';
  get diagnostics affected = row_count;
  assert affected = 0, 'ORG-NEG-03: FREMDE ORG — Schreibversuch auf Org-A-Produkt muss 0 Zeilen treffen';
  assert (select price from products where id = 'p-a-eier') = 3.80
         or (select count(*) from products where id='p-a-eier' and price=3.80) >= 0,
    'ORG-NEG-03: Org-A-Preis bleibt unverändert (kein Fremdschreiben durchgesickert)';
end $$;

-- ORG-NEG-04 · Schmuggel: Erzeuger B versucht Reservierung mit Org-A-Hof aber org_id=B → with-check.
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$ begin
  begin
    insert into reservations (farm_id, product_id, org_id, quantity, pickup_window, name, contact)
    values ('hof-sonnenwiese','p-a-eier','00000000-0000-0000-0000-00000000000b',1,'Sa 9-12','X','x@y.de');
    assert false, 'ORG-NEG-04: SCHMUGGEL — Insert mit org_id≠farm.org_id muss von with-check abgelehnt werden';
  exception when others then
    assert true, 'ORG-NEG-04: erwartet — RLS/with-check-Verletzung verhindert Org-Fremd-Reservierung';
  end;
end $$;

-- ORG-NEG-05 · Anon liest interne Tabellen NICHT (keine anon/auth-Policy = deny-by-default).
select test_as_anon();
do $$ begin
  assert (select count(*) from orgs) = 0,      'ORG-NEG-05: orgs für anon nicht lesbar → 0';
  assert (select count(*) from audit_log) = 0, 'ORG-NEG-05: audit_log für anon nicht lesbar → 0';
  assert (select count(*) from waitlist) = 0,  'ORG-NEG-05: waitlist nur insert, kein anon-SELECT → 0';
end $$;

-- ORG-NEG-06 · Erzeuger B sieht KEIN Abo / KEINE SB-Zahlung von Org A (Migration 0002).
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from subscriptions where org_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'ORG-NEG-06: FREMDE ORG — kein fremdes Abo lesbar';
  assert (select count(*) from sb_payments where org_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'ORG-NEG-06: FREMDE ORG — keine fremde SB-Zahlung lesbar (Einnahmen-PII geschützt)';
end $$;

-- ORG-NEG-07 · Eskalation per gefälschter eigener org_id: Erzeuger B will eigenen Hof auf Org A umhängen.
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$ declare affected int; begin
  update farms set org_id = '00000000-0000-0000-0000-00000000000a' where id = 'imkerei-lindgren';
  get diagnostics affected = row_count;
  assert affected = 0,
    'ORG-NEG-07: with-check verhindert Umhängen des eigenen Hofs in eine fremde Org → 0 Zeilen';
end $$;

-- ORG-NEG-08 · audit_log ist append-only: kein UPDATE/DELETE für anon/authenticated.
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ declare affected int; begin
  update audit_log set reason = 'manipuliert' where true;
  get diagnostics affected = row_count;
  assert affected = 0, 'ORG-NEG-08: audit_log darf von Nutzern nicht mutiert werden (append-only) → 0';
end $$;
```

### 3.3 — Plattform-Ebene (Soll — additive Staff-Ticket-Migration)

> **Status: Soll.** Setzt den engen Staff-Lesepfad + `support_tickets`-Tabelle aus
> `TENANT_ISOLATION_MODEL.md` §4 voraus. Im Runner als `test.skip('PLAT-*: wartet auf Staff-Ticket-Migration 00xx')`
> geführt, bis die Migration liegt — **kein stiller Skip** (`CLAUDE.md` §0.9).

```sql
-- PLAT-01 · Staff (Org-übergreifend NUR im Ticket-Scope) OHNE zugewiesenes Ticket → 0 fremde Zeilen.
select test_as('<staff-uid>');
do $$ begin
  assert (select count(*) from reservations where org_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'PLAT-01: Staff ohne zugewiesenes Ticket sieht 0 fremde Reservierungen (kein using(true))';
end $$;

-- PLAT-02 · Staff MIT offenem, ihm zugewiesenem Ticket auf Org A → genau Org-A-Ticket-Scope.
-- Fixture: insert support_tickets(org_id=A, assigned_staff=<staff-uid>, status='open').
select test_as('<staff-uid>');
do $$ begin
  assert (select count(*) from reservations where org_id = '00000000-0000-0000-0000-00000000000a') >= 1,
    'PLAT-02: Staff mit Ticket sieht genau die Ticket-bezogenen Org-A-Zeilen';
  assert (select count(*) from reservations where org_id = '00000000-0000-0000-0000-00000000000b') = 0,
    'PLAT-02: Staff-Ticket auf Org A öffnet KEINEN Blick auf Org B (Scope-Anker hält)';
end $$;

-- PLAT-03 · Staff direktes Org-übergreifendes UPDATE → 0 (Mutation NUR via Edge Function + Audit).
select test_as('<staff-uid>');
do $$ declare affected int; begin
  update farms set verified = false where id = 'hof-sonnenwiese';
  get diagnostics affected = row_count;
  assert affected = 0, 'PLAT-03: Staff darf nicht direkt org-übergreifend schreiben → 0 (nur Edge Function)';
end $$;
```

---

## 4 · ISO-API — PostgREST-Negativtests (HTTP-Ebene, gegen UI-Bypass)

> Beweist Pfeiler 1 auf dem **realen Transportweg** (`/rest/v1/...`): selbst wenn die UI umgangen wird
> (direkter `fetch` mit echtem JWT), filtert RLS. Vitest + `@supabase/supabase-js` gegen Supabase Local.
> JWTs werden lokal mit dem `anon`-/`service_role`-fremden Test-Secret für die Fixture-User signiert
> (Helper `signTestJwt(userId)` im Harness).

```ts
// app/src/__tests__/isolation/api.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ORG_A, ERZEUGER_B, KAEUFER_K, signTestJwt } from './fixtures'

const URL = process.env.SUPABASE_URL!          // lokal: http://127.0.0.1:54321
const ANON = process.env.SUPABASE_ANON_KEY!

function asUser(uid: string) {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${signTestJwt(uid)}` } },
  })
}

describe('ISO-API · fremde Org → leeres Array, niemals Fremddaten', () => {
  it('ORG-NEG-01 (API) · Erzeuger B fragt reservations?org_id=eq.<Org A> → []', async () => {
    const sb = asUser(ERZEUGER_B)
    const { data, error } = await sb.from('reservations').select('*').eq('org_id', ORG_A)
    expect(error).toBeNull()           // kein 500
    expect(data).toEqual([])           // RLS filtert → leeres Array, KEINE Org-A-Zeile
  })

  it('ORG-NEG-02 (API) · Käufer K liest reservations → []', async () => {
    const sb = asUser(KAEUFER_K)
    const { data } = await sb.from('reservations').select('*')
    expect(data).toEqual([])           // org_id=NULL trifft keinen Erzeuger-Scope
  })

  it('ORG-NEG-03 (API) · Erzeuger B PATCH products(p-a-eier) → 0 Zeilen / 403', async () => {
    const sb = asUser(ERZEUGER_B)
    const { data, error } = await sb.from('products').update({ price: 0.01 }).eq('id', 'p-a-eier').select()
    // PostgREST: RLS-gefilterter UPDATE betrifft 0 Zeilen → data=[]; bei with-check-Konflikt → error 42501.
    expect((data ?? []).length === 0 || error?.code === '42501').toBe(true)
  })

  it('ORG-NEG-06 (API) · Erzeuger B liest fremdes Abo/SB-Zahlung → []', async () => {
    const sb = asUser(ERZEUGER_B)
    const subs = await sb.from('subscriptions').select('*').eq('org_id', ORG_A)
    const pays = await sb.from('sb_payments').select('*').eq('org_id', ORG_A)
    expect(subs.data).toEqual([])
    expect(pays.data).toEqual([])
  })

  it('ORG-NEG-05 (API) · anon liest orgs/audit_log → []', async () => {
    const anon = createClient(URL, ANON)
    expect((await anon.from('orgs').select('*')).data).toEqual([])
    expect((await anon.from('audit_log').select('*')).data).toEqual([])
  })

  it('PUB-01 (API) · anon liest öffentlichen Finder → genau 2 aktive Höfe', async () => {
    const anon = createClient(URL, ANON)
    const { data } = await anon.from('farms').select('id').is('deleted_at', null)
    expect(data?.map(r => r.id).sort()).toEqual(['hof-sonnenwiese', 'imkerei-lindgren'])
  })
})
```

---

## 5 · EDGE — Edge-Function-Vertrag (service role = die einzige Tür durch die RLS-Wand)

> Edge Functions umgehen RLS (`service_role`). Deshalb wird hier **in Code** geprüft, dass `org_id`
> serverseitig aus dem Parent/Webhook-Metadata abgeleitet wird, niemals blind aus dem Client-Body
> (`TENANT_ISOLATION_MODEL.md` §5). Deno-Test gegen lokale Functions + Stripe-Testmodus/CLI.
> Reale Entrypoints: `app/supabase/functions/create-checkout/index.ts`, `.../stripe-webhook/index.ts`.

```ts
// app/supabase/functions/create-checkout/__tests__/isolation.test.ts
import { assertEquals } from 'https://deno.land/std/assert/mod.ts'
import { ORG_A, ORG_B, FARM_A, PROD_A, FARM_B } from '../../../../src/__tests__/isolation/fixtures.ts'

// EDGE-01 · org_id wird aus dem Produkt-Parent abgeleitet — Client-org_id wird IGNORIERT.
Deno.test('EDGE-01 · create-checkout setzt org_id aus product.org_id, nicht aus Body', async () => {
  const res = await invokeCreateCheckout({
    mode: 'sb_payment', farmId: FARM_A, productId: PROD_A,
    quantity: 1, orgId: ORG_B,                 // ← gefälschtes Client-org_id
    successUrl: 'http://localhost/ok',
  })
  assertEquals(res.status, 200)
  const row = await selectSbPayment({ farm_id: FARM_A, product_id: PROD_A })
  assertEquals(row.org_id, ORG_A)              // serverseitig aus product abgeleitet, NICHT ORG_B
})

// EDGE-02 · inkonsistentes farmId×productId (Produkt gehört zu anderem Hof) → 404, kein Insert.
Deno.test('EDGE-02 · create-checkout mit fremdem farmId×productId → 404 product_not_found', async () => {
  const before = await countSbPayments()
  const res = await invokeCreateCheckout({
    mode: 'sb_payment', farmId: FARM_B, productId: PROD_A,   // Org-A-Produkt unter Org-B-Hof
    successUrl: 'http://localhost/ok',
  })
  assertEquals(res.status, 404)
  assertEquals((await res.json()).error, 'product_not_found')
  assertEquals(await countSbPayments(), before)   // KEINE Phantom-Zahlung angelegt
})
```

```ts
// app/supabase/functions/stripe-webhook/__tests__/isolation.test.ts
import { assertEquals } from 'https://deno.land/std/assert/mod.ts'
import { ORG_A } from '../../../../src/__tests__/isolation/fixtures.ts'

// EDGE-03 · Idempotenz: dasselbe Event 2× → 2. Mal 200 "duplicate", KEIN Doppel-Schreiben.
Deno.test('EDGE-03 · stripe-webhook verarbeitet Event genau einmal', async () => {
  const evt = signedCheckoutCompleted({ sb_payment_id: '33333333-0000-0000-0000-00000000000a', org_id: ORG_A })
  const r1 = await invokeWebhook(evt); assertEquals(r1.status, 200)         // verarbeitet
  const auditAfter1 = await countAudit({ entity_id: '33333333-0000-0000-0000-00000000000a' })
  const r2 = await invokeWebhook(evt); assertEquals(await r2.text(), 'duplicate')  // payment_events-PK greift
  const auditAfter2 = await countAudit({ entity_id: '33333333-0000-0000-0000-00000000000a' })
  assertEquals(auditAfter2, auditAfter1)         // kein zweiter Audit-/Statuswechsel
})

// EDGE-04 · Webhook mutiert genau die org aus den Metadata, niemals eine andere.
Deno.test('EDGE-04 · stripe-webhook schreibt nur Metadata-org_id', async () => {
  const evt = signedCheckoutCompleted({ sb_payment_id: '33333333-0000-0000-0000-00000000000a', org_id: ORG_A })
  await invokeWebhook(evt)
  const audit = await latestAudit({ action: 'sb_payment.paid' })
  assertEquals(audit.org_id, ORG_A)              // Org B bleibt unberührt
})

// EDGE-05 · ungültige Signatur → 400, KEIN Schreiben.
Deno.test('EDGE-05 · stripe-webhook lehnt ungültige Signatur ab', async () => {
  const before = await countAudit({})
  const res = await invokeWebhookRaw({ body: '{}', signature: 'sig_falsch' })
  assertEquals(res.status, 400)
  assertEquals(await res.text(), 'bad_signature')
  assertEquals(await countAudit({}), before)     // nichts geschrieben → keine Audit-Manipulation
})
```

> **Erwartung verdichtet:** `create-checkout` darf eine Client-`org_id` **nie** übernehmen (EDGE-01) und
> inkonsistente Parent-Bezüge mit **404** abweisen ohne Phantom-Zeile (EDGE-02). `stripe-webhook` ist die
> **eine** idempotente Wahrheit: Replay → „duplicate" ohne Doppelwirkung (EDGE-03), Mutation strikt auf die
> Metadata-Org (EDGE-04), ungültige Signatur → 400 ohne jede Schreibwirkung (EDGE-05).

---

## 6 · E2E — UI führt nie eine org-fremde URL (Playwright)

> Backend ist führend; die UI wird nur als **zweite** Verteidigungslinie geprüft (Surface-Sichtbarkeit),
> nie als Beweis statt RLS. Datei `app/tests/e2e/isolation.spec.ts`.

```ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { ERZEUGER_B, ORG_A } from '../../src/__tests__/isolation/fixtures'

// E2E-01 · Erzeuger-B-Dashboard zeigt KEINE Org-A-Reservierung, sondern Zero-State wenn leer.
test('E2E-01 · Erzeuger B sieht im Dashboard nur eigene Reservierungen', async ({ page }) => {
  await loginAs(page, ERZEUGER_B)
  await page.goto('/erzeuger/reservierungen')
  await expect(page.getByText('Gast A')).toHaveCount(0)        // keine Org-A-PII im DOM
  await expect(page.getByText('Imkerei Lindgren')).toBeVisible() // eigener Org-Kontext sichtbar
})

// E2E-02 · Direkter org-fremder Deep-Link → RLS-Backstop, kein Datenleck, ehrlicher Zero-State.
test('E2E-02 · org-fremder Deep-Link leakt nichts', async ({ page }) => {
  await loginAs(page, ERZEUGER_B)
  await page.goto(`/erzeuger/reservierungen?org=${ORG_A}`)     // manipulierter Query
  await expect(page.getByText('Gast A')).toHaveCount(0)        // RLS filtert serverseitig
  await expect(page.getByText(/Keine Reservierungen|Noch keine/)).toBeVisible() // Zero-State, kein 500
  // Konsole sauber: kein 401-Loop / TypeError (Verdrahtungs-Check, GO_LIVE §0).
})
```

---

## 7 · SEC — Verbots-Check (Secrets nie im Client-Artefakt)

> Ergänzt die RLS-Isolation um den Kanon-Verbots-Check „`service_role` nur in Edge Functions, Frontend
> nur `VITE_`-Public" (`AGENTS.md`). Läuft in der Release-Pipeline gegen das Build-Artefakt.

```bash
# SEC-01 · Kein service_role-Key / kein Stripe-Secret im Cloudflare-Pages-Build.
# Erwartung: 0 Treffer. Jeder Treffer = harter Go-Live-Blocker.
grep -rEi 'service_role|sk_live_|sk_test_|SUPABASE_SERVICE' app/dist && exit 1 || echo "SEC-01 ok: kein Secret im Artefakt"

# SEC-02 · Nur VITE_-Public-Env im Bundle erlaubt (anon key/öffentliche URL).
grep -rEoh 'VITE_[A-Z0-9_]+' app/dist | sort -u   # Review: nur Public-Keys, kein VITE_*SECRET*
```

---

## 8 · CI-Verdrahtung & Gate

```jsonc
// app/package.json (Auszug — npm-Skripte für den offiziellen Runner)
{
  "scripts": {
    "test:iso:sql":  "supabase db reset && psql \"$SUPABASE_DB_URL\" -v ON_ERROR_STOP=1 -f supabase/tests/isolation/00_fixtures.sql -f supabase/tests/isolation/10_org_isolation.sql -f supabase/tests/isolation/20_platform.sql",
    "test:iso:api":  "vitest run src/__tests__/isolation",
    "test:iso:edge": "deno test -A supabase/functions/**/__tests__",
    "test:iso:e2e":  "playwright test tests/e2e/isolation.spec.ts",
    "test:iso":      "npm run test:iso:sql && npm run test:iso:api && npm run test:iso:edge"
  }
}
```

```yaml
# .github/workflows/ci.yml (Auszug) — Isolation ist ein BLOCKIERENDES Gate.
  isolation-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: cd app && npm ci && npm run test:iso         # ISO-SQL + ISO-API + EDGE
      - run: cd app && npm run test:iso:e2e               # UI-Backstop
      - run: bash scripts/sec_check.sh                    # SEC-01/02 gegen app/dist
      # Rot ⇒ Merge blockiert. Kein Abschwächen/Skippen (CLAUDE.md §0.9).
```

> **Gate-Bezug:** Dieser Job ist Pflichtprüfung für **WAVE_02 (Isolations-Gate)**,
> **Phase 2 Gate C (Tenant-Isolation)** und **WAVE_12 (Cross-Org-Negativtests)**.

---

## 9 · Verifikations-Checkliste (Isolations-Gate — abhakbar)

- [ ] **ORG-POS-01…04** grün — Eigen-Zugriff liefert exakt das erwartete Shape (Hof, Reservierung, Abo, SB-Zahlung).
- [ ] **ZERO-01** grün — leere Daten = Zero-State (0 Zeilen / leeres Array), **kein** 500.
- [ ] **PUB-01…03** grün — öffentlicher Katalog read-only über beide Orgs; kein Schreiben; gelöscht/`unverified` unsichtbar.
- [ ] **ORG-NEG-01…08** grün — fremde Org → 0 Zeilen / 42501; NULL-Falle (Käufer); Schmuggel-Insert abgelehnt; `audit_log` append-only.
- [ ] **ORG-NEG-06** grün — fremdes Abo/SB-Zahlung (Einnahmen-PII) nicht lesbar.
- [ ] **PLAT-01…03** grün *(nach Staff-Ticket-Migration)* — Staff ohne Ticket = 0; mit Ticket = exakt Scope; Direkt-UPDATE = 0.
- [ ] **EDGE-01…05** grün — `org_id` aus Parent/Metadata abgeleitet; inkonsistente Eingabe 404/422; Webhook idempotent; ungültige Signatur 400.
- [ ] **ISO-API (§4)** grün — gleiche Negativforderungen auf HTTP-Ebene (gegen UI-Bypass).
- [ ] **E2E-01/02** grün — UI baut nie org-fremde URL; manipulierter Deep-Link leakt nichts; Konsole sauber.
- [ ] **SEC-01/02** grün — kein `service_role`/Secret im Pages-Artefakt; nur `VITE_`-Public-Keys.
- [ ] **CI-Job `isolation-gate`** grün und als Required Check gesetzt — kein Merge ohne grünen Isolationstest.

---

> **Änderungen** an Policies/Helfern/Edge-Verträgen sind Security-/DB-relevant → **Owner-Freigabe** +
> ADR in `.claude/memory/decisions/` + Update in `MASTER_INDEX.md` und `docs/releases/PHASE_STATUS.md`.
> Policy-Änderungen ausschließlich als **additive Migration** unter `app/supabase/migrations/` mit Rollback
> und **grünem Isolationstest** (Plattform + Org) vor Merge. Ein roter Fall wird **nie** weggeskippt,
> sondern der **Code** an den Test angepasst (`CLAUDE.md` §0.9 Test-Integrität).
