# Test- & QA-Strategie — LokaleBauernConnect

> **Zweck.** Die verbindliche Teststrategie für LokaleBauernConnect: *was* getestet wird, *auf welcher Ebene*, *mit welchem Werkzeug*, und *welche Tests blockierend* sind, bevor etwas live geht. Tests sind die Spezifikation — **Code wird an Tests angepasst, nicht umgekehrt** (Test-Integrität, `CLAUDE.md` §0.9). Ein roter Test wird nie durch Abschwächen einer Assertion grün gemacht.
>
> **Stack (fix, Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker** — die Teststrategie kennt daher keine VM-/Container-Health-Tests, sondern Vitest (Frontend/Unit), `deno test` (Edge), eine SQL-/pgTAP-Isolations-Harness (RLS) und Playwright (E2E). Begründung: `docs/adr/0001-stack-react-supabase-cloudflare.md`.
>
> **Rolle der Plattform:** **Vermittler** — kein Eigenverkauf, keine Beratung, Disclaimer durchgängig. Daraus folgt für Tests: Wir prüfen, dass die Plattform *vermittelt* (Finder, Verfügbarkeit, Reservierung, Zahlungsanbindung) und dass **Domain owns truth** gilt — ein Hof sieht/ändert nur seine eigene `org`, die Plattform aggregiert, ohne fremde Wahrheiten zu erfinden.
>
> **Abgrenzung zu Nachbar-Dokumenten:** Detaillierte Isolations-Testfälle → `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`. Go-Live-Abnahmematrix → `docs/GO_LIVE_TEST_MATRIX.md`. Betrieb/Health → `docs/engineering/OPERATIONS_RUNBOOK.md`. Deploy/CI-Mechanik → `docs/DEPLOYMENT.md`. Webhook-Vertrag im Detail → `docs/STRIPE-SETUP.md`. Architektur-Wahrheit → `docs/ENTERPRISE_ARCHITECTURE.md`. Rollen/Rechte → `docs/ROLE_AND_PERMISSION_MODEL.md`.
>
> **Status (Stand 2026-06-19):** Die App ist **standalone-first** (ADR 0002) und läuft mit Seed-Fallback ohne Backend (Dev-Port **5409**, `app/src/lib/data.ts` → `lib/seed.ts`, sobald `app/src/lib/supabase.ts` kein konfiguriertes Env hat). Datenmodell + RLS liegen als Migrationen vor (`app/supabase/migrations/0001_core.sql`, `0002_payments.sql`); Edge Functions sind vorbereitet (`app/supabase/functions/_shared/*`). Jeder Abschnitt markiert den Reifegrad: ✅ heute lauffähig · 🔨 teil-aktiv (Code da, Live aussteht) · ⬜ ab Go-Live / späterer Welle.

---

## 0 · Test-Grundsätze (gelten immer, stehen über jeder Einzelregel)

1. **Tests sind die Spezifikation.** Verhalten wird gegen Tests gehärtet, nicht Tests gegen Code (`CLAUDE.md` §0.9). Ausnahme nur, wenn ein Test *nachweisbar* einen Bug als Soll kodiert oder ein Implementierungsdetail prüft — dann wird der Test mit dokumentierter Begründung korrigiert.
2. **Die drei Pflicht-Tests pro Feature** (Produktionspfeiler 6, nicht verhandelbar): **(a) fremde Org = 403** (nie 200 mit Fremddaten), **(b) leere Daten = Zero-State** (kein 500, `available:false` + leere Arrays), **(c) valider Aufruf = erwartetes Shape**. Kein Feature gilt als fertig ohne diese drei.
3. **RLS ist die Autorität — auch im Test.** Frontend-Sichtbarkeit ist *kein* Sicherheitsbeweis. Der Org-Boundary-Beweis wird **gegen die Datenbank-Policies** geführt (SQL-/pgTAP-Harness mit `set role`/JWT-Claims), nicht im React-Test.
4. **Kein stiller Skip.** Ein Test, der unter dem offiziellen Runner nicht real *ausführt*, zählt nicht als grün. Pfadauflösung in Tests immer relativ zur Testdatei (`import.meta.url` / `new URL(..., import.meta.url)`), nie nur zu `process.cwd()` — sonst skippt die Suite je nach Startverzeichnis lautlos.
5. **Webhooks werden auf Idempotenz getestet, nicht nur auf „Happy Path".** Derselbe Stripe-Event zweimal → genau **eine** Wirkung. Bewiesen gegen `payment_events` (Event-ID als Primary Key).
6. **Zero-State ist grün, nicht rot.** Ein Test, der „keine Höfe in dieser PLZ" prüft, erwartet ein leeres Array + Zero-State-UI — nicht einen Fehler. Leere Daten sind ein gültiger Zustand (Pfeiler 2).
7. **Determinismus.** Keine Flake-Quellen: feste Seeds, eingefrorene Zeit (`vi.useFakeTimers`), keine echten Netz-/Zeit-/Zufallsabhängigkeiten im Unit-Layer, eindeutige Test-Daten (kollisionsfreie IDs/E-Mails).
8. **Keine Geheimnisse im Test.** Keine echten Live-Keys, keine Prod-Daten. Stripe nur im **Test-Modus** (`sk_test_…`, Test-Webhook-Secret). Fixtures statt echter PII.

---

## 1 · Testpyramide & Verantwortlichkeiten

Wir folgen einer klassischen Pyramide — breit unten (schnell, viele), schmal oben (langsam, wenige) — auf den fixen Stack gemappt:

```
                ╱╲   E2E (Playwright)          wenige, kritische User-Journeys
               ╱──╲                            Finder → Reservierung → Bestätigung
              ╱────╲                           SB-Zahlung (QR → Stripe → Quittung)
             ╱──────╲ Integration              Edge Function ⇄ DB (RLS) ⇄ Stripe-Webhook
            ╱────────╲                         Datenschicht ⇄ Supabase (PostgREST)
           ╱──────────╲ RLS-Isolation          SQL/pgTAP gegen Policies (fremde Org=403)
          ╱────────────╲ Unit (Vitest/Deno)    Geo, Filter, Shaping, Zod, Mapping, Mikrologik
         ╱──────────────╲
```

| Ebene | Werkzeug | Was wird getestet | Wo | DB nötig? | Reife |
|---|---|---|---|---|---|
| **Unit (Frontend)** | Vitest + jsdom | Pure Logik: Geo (`haversine`, `distanceFromPlz`, `isValidPlz`), Filter/Sortierung in `listFarms`, Verfügbarkeits-Mapping (`AvailabilityBadge`), PLZ-Validierung, Reservierungs-Input-Aufbau | `app/src/**/*.test.ts` | nein | ✅ |
| **Komponenten** | Vitest + Testing Library | Render + Verdrahtung: `FarmCard`, `FarmDrawer`, `FinderPage` — Lade-/Leer-/Fehlerzustand, Handler-Bindung, kein toter Button | `app/src/**/*.test.tsx` | nein (Datenschicht gemockt) | ✅ |
| **Edge-Unit (Deno)** | `deno test` | Zod-Validierung, Betrags-/Mengen-Grenzen, Signaturprüfung, Idempotenz-Logik der Webhooks isoliert | `app/supabase/functions/**/*.test.ts` | nein (Admin-Client gemockt) | 🔨 |
| **RLS-Isolation** | pgTAP / SQL-Harness | Mandantentrennung gegen *echte* Policies: Public-Read, Owner-Write, Reservierung-Insert-only, fremde Org sieht nichts | `app/supabase/tests/*.sql` | **ja** (lokaler/Test-Postgres) | 🔨 |
| **Integration** | Vitest (Node) + `@supabase/supabase-js` | Datenschicht gegen echtes Supabase (PostgREST + RLS), Edge Function ⇄ DB, Webhook ⇄ DB | `app/test/integration/*.test.ts` | **ja** (Test-Projekt) | ⬜ |
| **E2E** | Playwright | Reale Browser-Journeys end-to-end gegen `vite preview` (+ optional Live-Stack) | `app/e2e/*.spec.ts` | optional (Seed reicht für Finder) | ⬜ |
| **Statik** | `tsc --noEmit`, ESLint | Typsicherheit (strict), Lint-Sauberkeit, keine `any`-Lecks | repoweit | nein | ✅ (typecheck) |

> **Zuständigkeit:** `qa-tester` (Subagent) verantwortet Unit/Integration/E2E + die drei Pflicht-Tests. `db-rls-spezialist` verantwortet die RLS-Isolations-Harness (kein Merge ohne grünen Isolationstest). `payment-engineer` + `edge-functions-spezialist` verantworten Edge-/Webhook-Tests inkl. Idempotenz. `security-auditor` (read-only) prüft auf fehlende Negativtests, ungeprüfte Eingaben, Webhook ohne Signatur.

---

## 2 · Verzeichnis- & Namens-Konvention

Tests liegen **neben** dem getesteten Code (Co-Location) für Unit/Komponenten und in dedizierten Ordnern für DB/Integration/E2E. Pfade immer relativ zur Testdatei auflösen.

```
app/
├── src/
│   ├── lib/
│   │   ├── geo.ts            geo.test.ts          ← Unit: Haversine, PLZ, Distanz
│   │   ├── data.ts           data.test.ts         ← Unit: Filter/Sort/Shape (Seed + gemockter Client)
│   │   ├── seed.ts
│   │   ├── types.ts
│   │   └── supabase.ts       supabase.test.ts     ← Unit: konfiguriert/nicht-konfiguriert → Fallback
│   ├── components/
│   │   ├── FarmCard.tsx          FarmCard.test.tsx
│   │   ├── FarmDrawer.tsx        FarmDrawer.test.tsx
│   │   └── AvailabilityBadge.tsx AvailabilityBadge.test.tsx
│   └── pages/
│       └── FinderPage.tsx        FinderPage.test.tsx   ← Lade/Leer/Fehler + Reservierungs-Flow (gemockt)
├── test/
│   ├── setup.ts                  ← globales Test-Setup (jsdom, matchMedia-Polyfill, Testing-Library-cleanup)
│   ├── helpers/
│   │   ├── factories.ts          ← Fabriken: makeFarm(), makeProduct(), makeReservationInput()
│   │   ├── supabaseTestClient.ts ← Clients für 2 Test-Orgs (anon, erzeuger-A, erzeuger-B, service)
│   │   └── stripeFixtures.ts     ← signierte Test-Webhook-Events (checkout.session.completed …)
│   └── integration/
│       ├── reservations.flow.test.ts
│       ├── availability.flow.test.ts
│       ├── sbPayment.webhook.test.ts
│       └── orgBoundary.test.ts
├── e2e/
│   ├── finder.spec.ts            ← Finder → Detail → Reservierung
│   ├── sb-payment.spec.ts        ← QR-Stand → Stripe (Test-Mode) → Quittung
│   ├── fixtures.ts
│   └── playwright.config.ts
└── supabase/
    ├── migrations/0001_core.sql · 0002_payments.sql
    ├── seed.sql
    └── tests/
        ├── rls_core.sql          ← pgTAP: Public-Read, Owner-Write, Reservierung-Insert-only
        ├── rls_payments.sql      ← pgTAP: subscriptions/sb_payments Owner-Read, payment_events service-only
        └── isolation.sql         ← Cross-Org-Negativbeweis (Org-A ≠ Org-B)
```

> **Regel:** `*.test.ts(x)` = schnelle Suite (kein DB-/Netzzugriff, default in CI-Pflichtjob). `app/test/integration/*` = DB-abhängig (eigener Job, eigenes Env). `app/e2e/*` = Browser (eigener Job). `app/supabase/tests/*.sql` = RLS-Harness (DB-Job, **blockierendes Isolations-Gate**).

---

## 3 · Unit-Tests (Frontend, Vitest)

**Ziel:** reine, deterministische Logik isoliert beweisen — schnell, ohne DB, ohne Netz. Diese Ebene trägt die meisten Tests.

### 3.1 Pflicht-Abdeckung (konkret, an echten Funktionen)

| Modul | Funktion (real) | Mindest-Testfälle |
|---|---|---|
| `lib/geo.ts` | `haversine(a,b)` | bekannte Strecke (Toleranz ±0,5 km); Distanz zu sich selbst = 0; Symmetrie `d(a,b)==d(b,a)` |
| `lib/geo.ts` | `isValidPlz(plz)` | 5-stellig gültig; 4-/6-stellig & Buchstaben ungültig; leerer String ungültig |
| `lib/geo.ts` | `centroidForPlz(plz)` | bekannte PLZ → Koordinate; unbekannte PLZ → `null` (kein Throw) |
| `lib/geo.ts` | `distanceFromPlz(plz,lat,lng)` | gültige PLZ → Zahl; unbekannte PLZ → `null` (**Zero-State**, kein 500) |
| `lib/data.ts` | `listFarms(filter)` | Filter nach Kategorie/Suchbegriff; Sortierung nach Distanz; **leeres Ergebnis = `[]`** (Pfeiler 2); Distanz-Anreicherung `distanceKm` korrekt/`null` |
| `lib/data.ts` | `getFarm(id)` | existierende ID → `Farm` mit erwartetem **Shape**; unbekannte ID → `null` (nicht Throw) |
| `lib/data.ts` | `listCategories()` | enthält alle `ProductCategory`-Werte, dedupliziert, stabile Reihenfolge |
| `lib/data.ts` | `createReservation(input)` | gültiger Input → `Reservation` (Status `requested`); Pflichtfelder fehlend → Fehler; **kein** Schreiben über fremde `farm_id`/`org_id` (Vertrag) |
| `lib/supabase.ts` | `isSupabaseConfigured` | beide Env gesetzt → `true` (Client); fehlend → `false` → Datenschicht nutzt Seed (**Fallback-Vertrag**) |

### 3.2 Beispiel — Geo-Unit (Vitest, deterministisch)

```ts
// app/src/lib/geo.test.ts
import { describe, it, expect } from 'vitest'
import { haversine, isValidPlz, distanceFromPlz, centroidForPlz } from './geo'

describe('haversine', () => {
  it('liefert 0 km für identische Punkte', () => {
    expect(haversine([52.52, 13.405], [52.52, 13.405])).toBeCloseTo(0, 3)
  })
  it('ist symmetrisch', () => {
    const a: [number, number] = [52.52, 13.405]
    const b: [number, number] = [48.137, 11.575]
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6)
  })
})

describe('isValidPlz', () => {
  it.each(['10115', '80331', '04109'])('akzeptiert gültige PLZ %s', (plz) => {
    expect(isValidPlz(plz)).toBe(true)
  })
  it.each(['', '123', '123456', 'ABCDE', '1234X'])('lehnt %s ab', (plz) => {
    expect(isValidPlz(plz)).toBe(false)
  })
})

describe('distanceFromPlz — Zero-State statt Fehler', () => {
  it('gibt null für unbekannte PLZ zurück (kein Throw)', () => {
    expect(centroidForPlz('00000')).toBeNull()
    expect(distanceFromPlz('00000', 52.52, 13.405)).toBeNull()
  })
})
```

### 3.3 Mocking-Disziplin

- **Datenschicht statt Netz mocken.** Komponententests mocken `lib/data.ts` (`vi.mock('../lib/data')`), nicht `fetch` direkt — so testet man die UI-Verdrahtung, nicht das Transportdetail.
- **Supabase-Client mocken** nur dort, wo `data.ts` selbst getestet wird: ein leichtgewichtiger Fake mit `.from().select().eq()`-Kette, der definierte `{ data, error }`-Antworten liefert. Reine Fixture-Pflege (Antwort-Shape an legitim geänderte Query angleichen) ist erlaubt, solange echte `expect`-Prüfungen unverändert bleiben (`CLAUDE.md` §0.9).
- **Zeit/Zufall einfrieren:** `vi.useFakeTimers()`, fester `Date`-Anker für „heute"/Saison-Logik; keine `Math.random()`-abhängigen Assertions.

---

## 4 · Komponenten-Tests (React, Testing Library)

**Ziel:** **End-to-End-Verdrahtung im Frontend** beweisen (Pfeiler-Pflicht): Endpoint/Datenschicht → realer Fetch → echtes DOM → **Lade-/Leer-/Fehlerzustand** → gebundener Handler → ggf. Refresh. Kein TODO, kein toter Button, kein Platzhalter.

| Komponente | Pflicht-Szenarien |
|---|---|
| `FinderPage.tsx` | **Lade**: Spinner/Skeleton während `listFarms` pending · **Erfolg**: Liste rendert mit korrektem Shape · **Leer (Zero-State)**: „Noch keine Höfe in dieser PLZ" + kein Fehler-Banner · **Fehler**: Daten-Fehler → freundlicher Retry, kein White-Screen · **Filter**: Kategorie/PLZ ändern → erneuter Aufruf mit korrektem Filterargument |
| `FarmCard.tsx` | Rendert Name/Typ/Distanz/Kategorien escaped; Klick → Deep-Link/Drawer-Open-Handler feuert mit korrekter `farm.id` (kein org-fremder Link, Pfeiler 7) |
| `FarmDrawer.tsx` | Zeigt Produkte + Verfügbarkeit; Reservierungs-Formular: Pflichtfelder, Abholfenster-Auswahl, Submit → `createReservation` mit korrektem Input; Erfolg → Bestätigung; Fehler → Inline-Meldung, Formular bleibt befüllt |
| `AvailabilityBadge.tsx` | Mappt jeden `Availability`-Zustand (`available/low/soon/out`) auf korrektes Label + Token-Klasse; **keine hardcodierte Farbe**, nur Design-System-Token |

### 4.1 Beispiel — Zero-State + Verdrahtung

```tsx
// app/src/pages/FinderPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as data from '../lib/data'
import { FinderPage } from './FinderPage'

vi.mock('../lib/data')

describe('FinderPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('zeigt Zero-State statt Fehler bei leerem Ergebnis', async () => {
    vi.mocked(data.listFarms).mockResolvedValue([])           // leeres Array, kein Throw
    render(<FinderPage />)
    expect(await screen.findByText(/noch keine höfe/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument() // Leere ≠ Fehler
  })

  it('rendert geladene Höfe mit erwartetem Shape', async () => {
    vi.mocked(data.listFarms).mockResolvedValue([
      { id: 'hof-sonnenwiese', name: 'Hof Sonnenwiese', type: 'Hofladen',
        street: 'Feldweg 1', plz: '10115', city: 'Berlin', lat: 52.5, lng: 13.4,
        story: '', openingHours: '', pickupWindows: [], categories: ['Gemüse'], products: [] },
    ])
    render(<FinderPage />)
    expect(await screen.findByText('Hof Sonnenwiese')).toBeInTheDocument()
  })
})
```

> **XSS-Disziplin im Test:** Mindestens ein Fall mit `name`/`story` = `"<img src=x onerror=alert(1)>"` und Assertion, dass der Text **escaped** als Text erscheint, nicht als DOM-Knoten ausgeführt wird.

---

## 5 · RLS-Isolations-Tests (die Mandanten-Wahrheit)

**Das wichtigste, blockierende Gate.** Org-Boundary ist Pfeiler 1 — *jede* Query org-gebunden, **fremde Org = 403/leer, nie 200 mit Fremddaten**. Bewiesen gegen die **echten** Policies aus `0001_core.sql` / `0002_payments.sql`, nicht gegen Frontend-Sichtbarkeit.

### 5.1 Was die Policies real garantieren (Soll, aus den Migrationen)

| Tabelle | Policy (real) | Test-Beweis |
|---|---|---|
| `farms`, `products` | `*_public_read` (anon liest nicht-gelöschte Katalogdaten) | anon **liest** Katalog · anon **schreibt nicht** |
| `farms`, `products` | `*_owner_write` (nur Owner der `org_id`) | Erzeuger-A schreibt eigenen Hof · Erzeuger-A schreibt **nicht** Hof von Org-B → 0 rows/`42501` |
| `profiles` | `profiles_self` (nur eigenes Profil) | User sieht/ändert nur eigenes Profil; fremdes Profil unsichtbar |
| `reservations` | `reservations_insert` (insert-only, `farm_id` muss zu `org_id` + lebendem Hof passen) | gültige Reservierung anlegbar · Insert mit gemischter org/farm-Kombination **abgelehnt** |
| `reservations` | `reservations_owner_read` (nur Org-Owner liest) | Erzeuger-A liest eigene Reservierungen · sieht **keine** von Org-B |
| `waitlist` | `waitlist_insert` (anon insert, **keine** Select-Policy) | anon kann eintragen · anon/erzeuger **liest nicht** (nur service_role) |
| `orgs`, `audit_log` | keine anon/auth-Policy → nur `service_role` | authentifizierter Client liest **0 rows** |
| `subscriptions`, `sb_payments` | `*_owner_read` (nur eigene `org`) | Erzeuger-A sieht eigene Zahlungen/Abos · **keine** von Org-B |
| `payment_events` | keine Policy → nur `service_role` | nur Edge Function (service_role) schreibt/liest; Client = 0 rows |

### 5.2 Pflicht-Isolationsfall (Cross-Org-Negativbeweis)

Der Kern-Beweis: **Org-A darf Daten von Org-B niemals sehen oder verändern.** Ausgeführt mit gesetzter Rolle + JWT-Claim (`request.jwt.claims`), damit `auth.uid()`/`auth.role()` in den Policies real greifen.

```sql
-- app/supabase/tests/isolation.sql  (pgTAP)
begin;
select plan(6);

-- Fixtures: zwei Orgs, je ein Erzeuger + ein Hof
-- (org_a, user_a, farm_a) und (org_b, user_b, farm_b) via service_role angelegt

-- 1) Public-Read: anon SIEHT den Katalog (Zero-State korrekt = sichtbar)
set local role anon;
select isnt_empty($$ select 1 from farms where deleted_at is null $$, 'anon liest Katalog');

-- 2) Org-Isolation lesend: Erzeuger-A sieht NUR eigene Reservierungen
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<user_a>","role":"authenticated"}', true);
select is_empty(
  $$ select 1 from reservations r join farms f on f.id=r.farm_id where f.org_id='<org_b>' $$,
  'Erzeuger-A sieht KEINE Reservierungen von Org-B');

-- 3) Org-Isolation schreibend: Erzeuger-A darf Hof von Org-B NICHT ändern
select throws_ok(
  $$ update farms set name='gekapert' where org_id='<org_b>' $$,
  '42501', NULL, 'fremder Hof-Update wird durch RLS verweigert');

-- 4) Reservierung-Insert: gültige Kombination erlaubt
select lives_ok(
  $$ insert into reservations(org_id,farm_id,status) values('<org_a>','<farm_a>','requested') $$,
  'gültige Reservierung anlegbar');

-- 5) Reservierung-Insert: gemischte org/farm-Kombination abgelehnt (Policy-Check)
select throws_ok(
  $$ insert into reservations(org_id,farm_id,status) values('<org_a>','<farm_b>','requested') $$,
  NULL, NULL, 'org/farm-Mismatch wird abgelehnt');

-- 6) Service-only: authentifizierter Client liest audit_log NICHT
select is_empty($$ select 1 from audit_log $$, 'audit_log für Client unsichtbar');

select * from finish();
rollback;
```

> **Gate-Regel (`AGENTS.md`):** *Kein Merge ohne grünen Isolationstest.* Schlägt `isolation.sql` fehl, ist die DB-Änderung **blockiert** — keine Ausnahme, keine Abschwächung. Jede neue Tabelle braucht ihre Isolations-Zeile in dieser Harness **ab Migration #1**.

### 5.3 Ausführung der RLS-Harness

```bash
# Lokaler Supabase-Stack (Test-DB) — psql gegen die laufende DB
psql "$SUPABASE_DB_URL" -f app/supabase/migrations/0001_core.sql
psql "$SUPABASE_DB_URL" -f app/supabase/migrations/0002_payments.sql
psql "$SUPABASE_DB_URL" -f app/supabase/tests/isolation.sql   # erwartet: alle Asserts ok, 0 failures
```

---

## 6 · Edge-Function- & Webhook-Tests (Deno, Stripe-Idempotenz)

**Ziel:** Edge Functions (`app/supabase/functions/_shared/*`) härten: Zod-Validierung an der Grenze, Rechteprüfung, **Signaturprüfung**, **Idempotenz**, Audit. Der Webhook ist die **einzige Wahrheit** für Entitlements/Zahlungsstatus — er muss exakt-einmal-wirken, auch bei Doppel-Zustellung/Retry.

### 6.1 Webhook-Idempotenz — der Pflicht-Beweis

Stripe garantiert **mindestens-einmal**-Zustellung (Retries bei Timeout/5xx). Idempotenz ist daher kein Nice-to-have. Unser Mechanismus: jede Event-ID wird in `payment_events` (Stripe `evt_…` als **Primary Key**) festgeschrieben, *bevor* die fachliche Wirkung gebucht wird. Ein zweiter Versuch mit derselben ID kollidiert auf dem PK → No-Op + `200`.

**Pflicht-Testfälle:**

1. **Erste Zustellung** `checkout.session.completed` → `sb_payments.status` wird auf `paid` gesetzt, `paid_at` gefüllt, **genau ein** `payment_events`-Eintrag, `200`.
2. **Doppel-Zustellung (gleiche `evt_…`)** → **keine** zweite Statusänderung, **keine** Doppelbuchung, weiterhin **ein** `payment_events`-Eintrag, `200` (idempotenter No-Op).
3. **Ungültige Signatur** → `400`, **keine** DB-Wirkung, kein `payment_events`-Eintrag.
4. **Unbekannter/irrelevanter Event-Typ** → `200`, ignoriert, keine Wirkung (kein Crash).
5. **Out-of-order / verspäteter Event** (z. B. `payment_intent.succeeded` nach bereits `paid`) → keine Regression des Endzustands.
6. **Subscription-Lifecycle** (`customer.subscription.updated/deleted`) → `subscriptions.status` serverseitig korrekt; Entitlement folgt der DB, nicht dem Client.

```ts
// app/supabase/functions/stripe-webhook/handler.test.ts  (deno test)
import { assertEquals } from 'https://deno.land/std/assert/mod.ts'
import { handleEvent } from './handler.ts'
import { makeSignedEvent, FakeAdmin } from '../../../test/helpers/stripeFixtures.ts'

Deno.test('Idempotenz: gleicher Event zweimal → genau eine Wirkung', async () => {
  const admin = new FakeAdmin()
  const evt = makeSignedEvent('checkout.session.completed', { id: 'evt_123', sbPaymentId: 'p1' })

  const first = await handleEvent(evt, admin)
  const second = await handleEvent(evt, admin) // identische evt_id

  assertEquals(first.status, 200)
  assertEquals(second.status, 200)
  assertEquals(admin.paymentEvents.filter((e) => e.id === 'evt_123').length, 1) // PK-Kollision → No-Op
  assertEquals(admin.payments['p1'].status, 'paid')
  assertEquals(admin.statusWrites['p1'], 1) // genau einmal geschrieben
})

Deno.test('Ungültige Signatur → 400, keine DB-Wirkung', async () => {
  const admin = new FakeAdmin()
  const bad = makeSignedEvent('checkout.session.completed', { id: 'evt_x' }, { tamper: true })
  const res = await handleEvent(bad, admin)
  assertEquals(res.status, 400)
  assertEquals(admin.paymentEvents.length, 0)
})
```

> **Signatur niemals abschalten** — auch nicht im Test. Tests erzeugen **echt signierte** Test-Events mit dem Test-Webhook-Secret (`stripeFixtures.ts`), statt die Verifikation zu stubben. Wer die Signaturprüfung mockt, testet den falschen Code.

### 6.2 Weitere Edge-Pflichtfälle

- **Zod-Validierung:** fehlende/fehlerhafte Felder im SB-Zahlungs-Request → `400` mit Feldfehlern, **kein** DB-Schreiben.
- **Betrags-/Mengen-Grenzen:** `amount_cents < 0` und `quantity ∉ [1,50]` (DB-Checks aus `0002_payments.sql`) → an der Edge bereits abgewiesen, doppelt durch DB-Constraint abgesichert.
- **service_role-Disziplin:** Test stellt sicher, dass der Admin-Client **nur** in der Edge Function existiert (kein `VITE_`-Leak ins Frontend — statischer Grep-Check, siehe §9).
- **Turnstile** bei öffentlichen Formularen (Waitlist/SB-Start): fehlendes/ungültiges Token → `400`.
- **Audit:** jede mutierende Edge-Aktion schreibt `audit_log` (wer/was/warum) — Test prüft, dass der Eintrag entsteht (Pfeiler 5).

---

## 7 · Integrationstests (Datenschicht ⇄ Supabase)

**Ziel:** die reale Kette `lib/data.ts` → `@supabase/supabase-js` → PostgREST → **RLS** gegen ein echtes Test-Projekt beweisen (nicht gegen Mocks). Bestätigt, dass Frontend-Annahmen und Server-Wahrheit zusammenpassen.

| Flow | Beweis |
|---|---|
| `reservations.flow` | Erzeuger-A legt Reservierung über `data.ts` an → liest sie als Owner; **anon/Org-B liest sie nicht** (403/leer) |
| `availability.flow` | Erzeuger pflegt Verfügbarkeit (`available/low/soon/out`) → Käufer-Read spiegelt sie öffentlich; Erzeuger-B kann sie nicht ändern |
| `orgBoundary` | Der **drei-Pflicht-Test** end-to-end: fremde Org = 403/leer · leere PLZ = Zero-State · valider Aufruf = erwartetes Shape |
| `sbPayment.webhook` | Edge-Handler gegen echte DB: Doppel-Event → ein `paid`, ein `payment_events` |

```ts
// app/test/integration/orgBoundary.test.ts
import { describe, it, expect } from 'vitest'
import { clientFor } from '../helpers/supabaseTestClient'

const hasDb = !!process.env.SUPABASE_TEST_URL && !!process.env.SUPABASE_TEST_SERVICE_KEY

describe.runIf(hasDb)('Org-Boundary (3 Pflicht-Tests)', () => {
  it('fremde Org: liest keine Reservierungen von Org-B (leer/403, nie Fremddaten)', async () => {
    const a = clientFor('erzeuger_a')
    const { data } = await a.from('reservations').select('*').eq('org_id', process.env.TEST_ORG_B!)
    expect(data ?? []).toHaveLength(0)            // nie 200 mit Fremddaten
  })

  it('Zero-State: unbekannte PLZ → leeres Ergebnis, kein Fehler', async () => {
    const anon = clientFor('anon')
    const { data, error } = await anon.from('farms').select('id').eq('plz', '00000')
    expect(error).toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('Shape: valider Katalog-Read liefert erwartete Felder', async () => {
    const anon = clientFor('anon')
    const { data } = await anon.from('farms').select('id,name,type,plz,city').limit(1)
    expect(data?.[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String), type: expect.any(String) }),
    )
  })
})
```

> **`describe.runIf(hasDb)`** statt stillem Skip: ohne Test-Projekt-Env wird die Suite *bewusst und sichtbar* ausgelassen — und ist im CI-Integrationsjob **immer** aktiv (Env gesetzt), damit sie real läuft (kein „grün durch Nichtausführung", §0.4). Test-Daten werden in `afterAll` per `service_role` aufgeräumt (kollisionsfreie IDs).

---

## 8 · E2E-Tests (Playwright)

**Ziel:** wenige, hochwertige, reale Browser-Journeys, die das Versprechen der Plattform end-to-end belegen — gegen `vite preview` (Seed reicht für Finder) und optional gegen den Live-Stack (SB-Zahlung im Stripe-Test-Mode).

| Journey | Schritte (Soll) | Reife |
|---|---|---|
| **Finder → Reservierung** | PLZ eingeben → Höfe nach Distanz → Hof öffnen → Produkt/Abholfenster wählen → reservieren → Bestätigung sichtbar | ⬜ (Seed-fähig) |
| **Zero-State** | PLZ ohne Höfe → „Noch keine Höfe" + Disclaimer, kein Fehler | ⬜ |
| **SB-Zahlung (USP)** | QR-Stand-Seite → Menge → Stripe-Checkout (Test-Karte `4242…`) → Rücksprung → **Quittung** sichtbar; Webhook hat `paid` gebucht | ⬜ (Live-Stack) |
| **Disclaimer-Präsenz** | Vermittler-Hinweis auf Finder, Reservierung und Zahlung durchgängig sichtbar | ⬜ |

```ts
// app/e2e/finder.spec.ts
import { test, expect } from '@playwright/test'

test('Finder → Reservierung → Bestätigung', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/postleitzahl/i).fill('10115')
  await page.getByRole('button', { name: /finden/i }).click()
  await page.getByRole('article').first().click()           // Hof öffnen
  await page.getByLabel(/abholfenster/i).selectOption({ index: 1 })
  await page.getByRole('button', { name: /reservieren/i }).click()
  await expect(page.getByText(/reservierung bestätigt|angefragt/i)).toBeVisible()
  await expect(page.getByText(/vermittl/i)).toBeVisible()     // Disclaimer durchgängig
})
```

> **E2E sparsam halten** (Pyramide): nur die zwei, drei Journeys, die echtes Geld/Vertrauen tragen. Tiefe Permutationen gehören in Unit/Integration. Stripe **nur** im Test-Mode, niemals echte Karten/Live-Keys.

---

## 9 · Statik, Security-Gates & invariante Checks

Schnelle, deterministische Prüfungen, die *vor* den Suiten laufen und ganze Fehlerklassen ausschließen:

| Check | Werkzeug | Hard-Gate? |
|---|---|---|
| **Typecheck (strict)** | `tsc --noEmit` (`npm run typecheck`) | ja |
| **Build grün** | `npm run build` (`tsc --noEmit && vite build`) | ja |
| **Lint sauber** | ESLint `--max-warnings=0` (geplant, WAVE_01) | ja (ab WAVE_01) |
| **Kein service_role im Frontend** | Grep-Invariante: kein `SERVICE_ROLE`/`service_role`-Key unter `app/src/**`; nur `VITE_`-Public-Keys | ja |
| **Keine hardcodierten Farben** | Grep: keine `#hex`/`rgb(` außerhalb `app/src/styles/theme.css` | ja |
| **Keine Deko-Emojis in Prod-UI** | Grep gegen Emoji-Range in `app/src/**/*.tsx` | ja |
| **Audit-Abdeckung** | jede mutierende Edge-Function schreibt `audit_log` (statische Prüfung) | ja (ab WAVE_09) |
| **Migration additiv** | keine `drop table`/`alter … drop column` ohne Rollback-Pfad in `migrations/*` | ja |
| **Dependency-Audit** | `npm audit --omit=dev` (keine bekannten kritischen Lücken) | warn → block bei High/Critical |

```bash
# Security-Invarianten (Auszug, laufen als CI-Step)
! grep -rEn "service_role|SERVICE_ROLE" app/src 2>/dev/null   # service_role nie im Client
! grep -rEn "#[0-9a-fA-F]{3,6}|rgb\(" app/src/ --include='*.tsx'  # Farben nur via Token
```

---

## 10 · Tooling & Konfiguration

**Bewusste Wahl (Stack-passend):** Vitest (nativ Vite/ESM/TS, kein Extra-Bundler) für Unit/Komponenten/Integration · `@testing-library/react` für DOM · `deno test` für Edge (gleiche Laufzeit wie Supabase Functions) · **pgTAP** für RLS (testet Policies in der DB, wo sie gelten) · **Playwright** für E2E. Kein Jest (Vite-Reibung), kein Cypress (Playwright deckt es ab, schneller/paralleler).

### 10.1 Zu ergänzende Dev-Dependencies (`app/package.json`)

```jsonc
"devDependencies": {
  "vitest": "^2.x",
  "@vitest/coverage-v8": "^2.x",
  "jsdom": "^25.x",
  "@testing-library/react": "^16.x",
  "@testing-library/jest-dom": "^6.x",
  "@testing-library/user-event": "^14.x",
  "@playwright/test": "^1.x"
}
```

### 10.2 Vitest-Konfiguration (in `app/vite.config.ts` zusammengeführt)

```ts
// app/vite.config.ts  (Auszug — test-Block ergänzen)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],     // schnelle Suite
    exclude: ['test/integration/**', 'e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      all: true,
      include: ['src/lib/**', 'src/components/**', 'src/pages/**'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
})
```

```ts
// app/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
afterEach(() => cleanup())   // kein DOM-Leak zwischen Tests
```

### 10.3 Coverage-Schwellen (Hard-Gate ab WAVE_12)

- **Datenschicht & Geo** (`src/lib/**`): ≥ 90 % Lines — kritische Geschäftslogik.
- **Komponenten** (`src/components/**`, `src/pages/**`): ≥ 80 % Lines, alle Zustände (Lade/Leer/Fehler) abgedeckt.
- **Edge Functions**: ≥ 85 % der Pfade inkl. Idempotenz-/Signatur-Negativzweig.
- **RLS-Harness**: 100 % der Policies haben einen Positiv- **und** einen Negativfall.

---

## 11 · Befehle (Quick Reference)

Alle aus `app/` (Frontend) bzw. `app/supabase/` (DB/Edge). Skripte sind in `app/package.json` zu ergänzen (Soll); ✅ markiert heute vorhandene.

```bash
# ── schnelle lokale Prüfung (kein DB/Netz) ──────────────────────
npm run typecheck            # ✅ tsc --noEmit (heute vorhanden)
npm run build                # ✅ tsc --noEmit && vite build (heute vorhanden)
npm run test                 # ⬜ vitest run  (schnelle Suite: Unit + Komponenten)
npm run test:watch           # ⬜ vitest      (Entwicklung)
npm run test:ui              # ⬜ vitest --ui
npm run coverage             # ⬜ vitest run --coverage

# ── fokussierte Sub-Suiten ──────────────────────────────────────
npm run test -- src/lib      # nur Datenschicht/Geo
npm run test -- src/pages    # nur Seiten/Verdrahtung

# ── DB-abhängig (Test-Projekt-Env erforderlich) ─────────────────
npm run test:integration     # ⬜ vitest run --dir test/integration
npm run test:rls             # ⬜ psql "$SUPABASE_DB_URL" -f supabase/tests/isolation.sql
npm run test:rls:all         # ⬜ alle supabase/tests/*.sql gegen Test-DB

# ── Edge Functions (Deno) ───────────────────────────────────────
deno test --allow-env --allow-read supabase/functions/    # ⬜

# ── E2E (Browser) ───────────────────────────────────────────────
npm run e2e                  # ⬜ playwright test
npm run e2e:headed           # ⬜ playwright test --headed
npx playwright install --with-deps   # einmalig (CI/Setup)

# ── Aggregat-Pipelines ──────────────────────────────────────────
npm run verify               # ⬜ typecheck + test + build  (schneller Pre-Push)
npm run qa                   # ⬜ verify + test:integration + test:rls + e2e + lint  (volle QA)
```

> **Vorschlag `scripts`-Block** (`app/package.json`, additiv zu den vorhandenen):
> ```jsonc
> "test": "vitest run",
> "test:watch": "vitest",
> "test:integration": "vitest run --dir test/integration",
> "test:rls": "node ./supabase/tests/run-rls.mjs",
> "coverage": "vitest run --coverage",
> "e2e": "playwright test",
> "verify": "npm run typecheck && npm run test && npm run build",
> "qa": "npm run verify && npm run test:integration && npm run test:rls && npm run e2e"
> ```

---

## 12 · CI-Checks (Cloudflare Pages / GitHub Actions — *ersetzt Docker-CI*)

Kein Docker-Build, kein VM-Health-Check (Stack-fix). Die Pipeline besteht aus parallelen schnellen Jobs + sequenziellen DB-/E2E-Jobs. **Alle Jobs sind Hard-Gates** — kein Deploy auf Cloudflare Pages ohne grün.

```
.github/workflows/ci.yml  (Soll)

Jobs 1–3 parallel (schnell, kein DB):
  Job 1  lint-typecheck   → ESLint(0 warn) → tsc --noEmit → vite build
  Job 2  unit-component    → vitest run (Unit + Komponenten) → coverage-threshold-check
  Job 3  security-invariants → service_role-Grep · Farb-/Emoji-Grep · npm audit (High/Critical = fail)

Nach 1–3 grün (DB-Jobs, eigener Test-Postgres / Supabase-Test-Projekt):
  Job 4  rls-isolation     → migrations anwenden → supabase/tests/*.sql (pgTAP)  ◄ BLOCKIERENDES Isolations-Gate
  Job 5  edge-tests        → deno test (Zod, Signatur, Idempotenz)
  Job 6  integration       → vitest run --dir test/integration  (Datenschicht ⇄ RLS, Webhook ⇄ DB)

Nach 4–6 grün:
  Job 7  e2e               → playwright test (Finder→Reservierung; SB-Zahlung Test-Mode)
  Job 8  release-artifact  → Build-Artefakt verifizieren (KEINE Secrets/.env/.claude im Paket)
```

**Go/No-Go-Regeln (Hard-Gates, abgeleitet aus Pfeiler 6 + `AGENTS.md`):**

1. **Isolations-Gate (Job 4) ist unverhandelbar.** Rot = Merge blockiert. Jede neue/geänderte Tabelle muss ihre Isolations-Zeile mitliefern.
2. **Die drei Pflicht-Tests** (fremde Org=403 · Zero-State · Shape) müssen für jedes berührte Feature grün sein (Job 2/6).
3. **Webhook-Idempotenz** (Job 5/6) grün, bevor Payment-Code mergt.
4. **Coverage-Schwellen** (Job 2/6) erzwungen ab WAVE_12.
5. **Release-Artefakt** (Job 8) enthält keine Secrets, kein `.env`, kein `.claude/` (Phase-2-Gate).
6. **Kein stiller Skip im CI:** DB-/E2E-Jobs laufen mit gesetztem Test-Env — eine ausgelassene Suite gilt als **Fail**, nicht als grün.

> **Caching:** `node_modules` (npm), Playwright-Browser und Deno-Cache werden in CI gecacht (Kosten/Geschwindigkeit, §0-Wirtschaftlichkeit). Schnelle Jobs (1–3) sind das Pre-Merge-Gate; DB-/E2E-Jobs laufen vollständig vor dem Deploy.

---

## 13 · Vorgehen beim Schreiben eines neuen Tests (Checkliste)

Vor dem „fertig" eines jeden Features — egal welche Welle:

- [ ] **Triage** geklärt (Bug / Rolle-Sichtbarkeit / UX / Ausbau / Commercial) — bestimmt die Testart (`CLAUDE.md`).
- [ ] **Die drei Pflicht-Tests** geschrieben: fremde Org = 403/leer · leere Daten = Zero-State · valider Aufruf = erwartetes Shape.
- [ ] Bei **DB-Änderung**: Isolations-Zeile in `supabase/tests/` ergänzt (Positiv **und** Negativ); `test:rls` grün.
- [ ] Bei **Payment/Webhook**: Idempotenz-Test (Doppel-Event) + Signatur-Negativtest + Audit-Eintrag-Prüfung.
- [ ] Bei **UI**: Lade-/Leer-/Fehlerzustand getestet, Handler-Bindung geprüft (kein toter Button), User-Input escaped (XSS-Fall).
- [ ] **Determinismus**: Zeit/Zufall eingefroren, eindeutige Test-Daten, Cleanup in `afterAll` (nicht `afterEach` für DB).
- [ ] **Pfad** relativ zur Testdatei (`import.meta.url`) — kein cwd-abhängiger stiller Skip.
- [ ] Lokal grün: `npm run verify` (schnell) bzw. `npm run qa` (voll) — dann erst Owner-Abnahme.

---

## 14 · Anti-Patterns (verboten)

- **Test zurechtbiegen, um Code grün zu kriegen** (Assertion abschwächen/löschen/skippen) — verletzt §0.9. Stattdessen Code fixen oder Test mit Begründung korrigieren, wenn er nachweisbar falsch ist.
- **Org-Boundary nur im Frontend „testen"** — RLS ist die Autorität; der Beweis gehört in die DB-Harness.
- **Signaturprüfung/Idempotenz im Webhook-Test stubben** — dann testet man den falschen Code; echt signierte Test-Events nutzen.
- **Echte Live-Keys / Prod-Daten / echte Karten** im Test — nur Test-Mode + Fixtures.
- **Stiller Skip** (Test läuft je nach cwd nicht) — gilt als rot, nie als grün.
- **Flake durch echte Zeit/Zufall/Netz** im Unit-Layer — einfrieren/mocken.
- **Fake-Data/Mock-KPIs als „Test"** für Prod-UI — verboten (Pfeiler-Verbote).
- **Mock-Call-Count statt Verhalten** prüfen (spröder Test) — Verhalten/Ergebnis assertieren.

---

> **Reifegrad-Roadmap:** Heute ✅ — `typecheck`/`build` grün, Datenmodell+RLS als Migrationen, Edge-_shared vorbereitet. Nächste Wellen: WAVE_12 aktiviert Vitest-Suite + Coverage-Gate; die RLS-Harness wird mit jeder DB-Welle mitgepflegt (ab #1 Pflicht); Edge-/Webhook-Tests mit WAVE_09 / Phase 4 Track A; E2E + CI-Gate mit Phase 2 Deploy. **Eine Welle pro Session** — jede Welle liefert ihre Tests mit (kein nachgelagerter Test-Berg).
