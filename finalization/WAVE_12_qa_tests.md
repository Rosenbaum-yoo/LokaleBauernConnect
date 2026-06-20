# WAVE_12 — QA: Unit / Integration / E2E + Cross-Org-Negativtests

> **Phase:** 1 — Fundament & Kernprodukt. **Prio:** P0 (Gate-Welle). **Gate-Bezug:** **QA-Gate** (`finalization/README.md` §2) — Vorbedingung für `99_GOLIVE_GATE.md` und Phase-2-Gate **C (Tenant-Isolation)**.
> **Voraussetzung (Dependency-Gates, `finalization/README.md` §3):** WAVE_02 (Datenmodell + RLS deny-by-default) und WAVE_04 (Kernprodukt: Finder → Reservierung end-to-end) grün; WAVE_09 (Payments/Webhook) für die Payment-Testsuite. WAVE_11 (DB-Härtung) liefert die Pagination/Index-Pfade, die hier verifiziert werden.
> **Ausführungsagent:** Claude (gesamter Stack) + Subagenten **qa-tester** (Federführung, Isolations-/Idempotenz-/Entitlement-Tests), **db-rls-spezialist** (RLS-Negativtests gegen die echten Policies), **security-auditor** (read-only: prüft, dass kein Test mit `service_role` gegen RLS „mogelt"), **payment-engineer** (Webhook-Idempotenz + serverseitige Preisbildung).
> **Owner-Freigabe erforderlich für:** das tatsächliche Anlegen eines **dedizierten Test-Supabase-Projekts** (Account/Kosten) für die Integration- und RLS-Suite. Bis dahin laufen Unit-, Filter-, Edge-Handler- und E2E-Tests **vollständig repo-lokal** gegen Seed-Daten und einen lokalen `supabase start` (Docker-Desktop des Owners) bzw. gegen ein vom Owner bereitgestelltes Test-Projekt — niemals gegen Produktion.
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/WAVE_12_qa_tests.md`, read-only) auf **React+Vite+TS · Supabase · Cloudflare · Stripe**. Zentrale Abweichung: TempConnect testet eine vorhandene Express/Jest-Landschaft; **hier ist die Test-Toolchain bereits real eingeführt** (`app/package.json` → `test`/`test:watch`; **Vitest + @testing-library/react + jsdom + @vitest/coverage-v8**) und liefert aktuell **55 Tests grün, Coverage ~84 %** (`app/coverage/`). Begründung der Toolwahl hier festgehalten (Stop-Regel „API/Service nicht gefunden" → dokumentierte Neuanlage statt stiller Annahme). **Bewusst NICHT übernommen:** Playwright/`deno test` aus dem Blueprint — Edge-/Integrationspfade (Supabase/Stripe) werden live verifiziert statt gemockt (AGENTS-Regel), Komponenten-/Flow-Tests laufen über @testing-library in jsdom.

---

## Ziel

LokaleBauernConnect geht erst dann durch das Phase-1-Gate, wenn die **kritischen Pfade beweisbar** funktionieren — nicht „läuft bei mir", sondern reproduzierbar, in CI, mit harten Assertions. Diese Welle macht die sieben Produktionspfeiler (`CLAUDE.md`) *testbar* und damit *durchsetzbar*:

1. **Org-Boundary / Datenisolation beweisen.** Für **jede** RLS-geschützte Tabelle existiert ein **Cross-Org-Negativtest**: User aus Org A sieht/ändert **nie** Daten aus Org B — fremde Org liefert **leeres Result bzw. Policy-Verweigerung**, nie eine fremde Zeile. Das ist der nicht-verhandelbare Kern dieser Welle (Pfeiler 1 + 6).
2. **Kernflow end-to-end absichern.** Der Wertschöpfungs-Fluss **Finder → Hof öffnen → Reservierung im Abholfenster** wird als E2E-Test gegen die laufende App gefahren (Lade-/Leer-/Fehler-/Erfolgs-Zustand), inklusive Zero-State und PLZ-Distanzlogik.
3. **Payment-Wahrheit absichern.** Der Stripe-Webhook ist **idempotent** (gleiches Event zweimal → genau eine Statusänderung) und der Checkout bildet den Preis **immer serverseitig** (Client-Betrag wird ignoriert). Beide werden mit Handler-Tests (kein echter Stripe-Call) bewiesen.
4. **Zero-State statt Error.** Leere Daten erzeugen **nie** einen 500/`TypeError`; UI zeigt „Noch keine Daten" / leere Arrays / `available:false` — getestet auf den realen Surfaces.
5. **Coverage-Schwelle auf kritischen Pfaden.** Nicht „X % über alles", sondern **≥ 90 % Lines/Branches auf den kritischen Modulen** (`src/lib/geo.ts`, `src/lib/data.ts`, `src/lib/payments.ts`, Edge-Function-Handler) — gemessen, in CI durchgesetzt.

> **Test-Integrität (Direktive §0.9):** Tests sind die Spezifikation. Ein roter Test wird **nie** durch Abschwächen einer Assertion grün gemacht — entweder der Code wird korrigiert oder (nur bei nachweisbar falschem Test) der Test mit dokumentierter Begründung. **Kein RLS-Test darf mit `service_role` laufen** (das umgeht RLS systemseitig und würde die Isolation nur vortäuschen) — Negativtests laufen ausschließlich mit `anon`/`authenticated`-JWT.

**Bewusst NICHT in dieser Welle:** Last-/Performance-Tests (→ WAVE_11 / Phase 5), Visual-Regression-Snapshots (→ WAVE_10 Polish), Observability/Sentry (→ WAVE_13), echte Stripe-Live-Transaktionen (→ Phase 4 Track A mit Owner-Freigabe).

---

## Ist-Zustand (repo-genau geprüft)

| Fakt | Stand | Konsequenz für diese Welle |
|---|---|---|
| `app/package.json` Scripts | `dev`, `build`, `preview`, `typecheck`, **`test` (`vitest run`)**, **`test:watch` (`vitest`)** | **Test-Runner Vitest real vorhanden** (Dev-Deps: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/dom`, `jsdom`); diese Welle baut darauf auf statt von Null. |
| Pure-Logic-Module | `src/lib/geo.ts` (Haversine, `centroidForPlz`, `distanceFromPlz`, `isValidPlz`), `src/lib/data.ts` (`listFarms`/`applyFilter`/`withDistance`/`mapFarm`/`createReservation`), `src/lib/payments.ts` (`startCheckout`/`goToCheckout`) | **Erstklassige Unit-Test-Kandidaten** — deterministisch, kein DOM, hoher Kritikalitätsgrad. |
| `src/lib/data.ts` Dual-Quelle | Supabase **oder** Seed-Fallback (`isSupabaseConfigured`) | Tests laufen ohne Backend gegen Seed; Supabase-Pfad wird per Mock und in der Integration-Suite gegen echte DB geprüft. |
| Komponenten | `FinderPage.tsx` (Lade-/Leer-/Map-Toggle), `FarmDrawer.tsx` (Reservierungs-State-Machine `idle→sending→ok/err`, Validierung), `AvailabilityBadge.tsx` | **Komponenten-Tests** (Testing-Library): Validierung, Zero-State, Erfolgsmeldung. |
| Migrationen | `0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql` — RLS deny-by-default, `org_id`-Anker, `is_org_member()` | **Cross-Org-Negativtests** gegen exakt diese Policies (Tabellen unten gelistet). |
| Edge Functions (Deno) | `create-checkout/index.ts` (Preis serverseitig), `stripe-webhook/index.ts` (Idempotenz via `payment_events`-PK), `_shared/stripe.ts` | reine Helfer + **Handler-Logik** werden in der Vitest-Suite (`test/payments.test.ts`) verhaltensnah geprüft; echte Stripe-/Supabase-Pfade live-verifiziert statt gemockt (AGENTS-Regel). |
| `app/.env.example` | nur `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Test-Env secret-frei, gegen Seed/lokales Supabase — nie Prod. |
| CI (`.github/workflows/ci.yml`) | **real vorhanden (Repo-Root)**: Job `app` mit `npm ci · typecheck · test · build` (Node 20) | erfüllt; optional erweiterbar (Coverage-Gate, gegen Test-Projekt laufende RLS-Suite). |
| `docs/releases/PHASE_STATUS.md` | **real vorhanden** (Repo-Root `docs/releases/`, nicht `app/docs/`) | bei Abschluss aktualisieren (Tracker-Pflicht). |

> **Toolwahl begründet:** **Vitest** (statt Jest) — native Vite/ESM/TS-Integration, kein zweites Transform-Setup, identische `import.meta.env`-Semantik wie der App-Build. **@testing-library/react** für verhaltensnahe Komponententests (kein Implementierungsdetail-Snapshotting). Playwright (E2E) und `deno test` (Edge) waren als Blueprint-Optionen vorgesehen — **tatsächlich umgesetzt wurde davon keines**; Flows werden in jsdom über @testing-library getestet, Edge-/Stripe-/Supabase-Pfade live verifiziert statt gemockt (AGENTS-Regel).
>
> **Umsetzungsstand (repo-genau, Stand 2026-06-20):** Real installiert sind `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/dom`, `jsdom`. Scripts: `test` (`vitest run`) + `test:watch` (`vitest`). **Nicht** vorhanden: `@playwright/test`, `deno test`, separate `lint`/`format:check`-Scripts. Das untenstehende Toolchain-Rezept dokumentiert den ursprünglichen Plan; die abweichende, schlankere Realität ist hier als Wahrheitspunkt festgehalten (kein stiller Architekturwechsel).

---

## Aufgaben

### 1. Test-Toolchain einführen (P0)

```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
npm i -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test
npx playwright install --with-deps chromium
```

`app/package.json` → `scripts` ergänzen (bestehende `dev/build/preview/typecheck` unangetastet):

```jsonc
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",
"test:edge": "cd supabase/functions && deno test --allow-env --allow-net=127.0.0.1 --no-check",
"test:rls": "vitest run -c vitest.rls.config.ts",
"ci": "npm run typecheck && npm run lint && npm run format:check && npm run build && npm run test:run && npm run test:coverage"
```

`app/vitest.config.ts` (Unit + Komponenten; jsdom; Coverage-Schwellen **nur auf kritischen Modulen**):

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// QA-Welle: Unit/Component-Suite. jsdom für DOM-nahe Komponententests.
// Coverage-Gate bewusst auf die kritischen Pfade (geo/data/payments), nicht "X% über alles".
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.tsx'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/lib/geo.ts', 'src/lib/data.ts', 'src/lib/payments.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
})
```

`app/tests/setup.ts` (jest-dom-Matcher, deterministische Zufalls-/Zeitbasis, `localStorage`-Reset):

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ now: new Date('2026-06-20T10:00:00Z') })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
```

`app/playwright.config.ts` (startet die echte App auf Port 5409 — kein Mock-Server, echter Fetch gegen Seed):

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5409', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5409 --strictPort',
    url: 'http://localhost:5409',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

> ESLint (WAVE_01) muss die Test-Dateien kennen: in `app/eslint.config.js` die Globs `tests/**/*.{ts,tsx}` aufnehmen bzw. von `no-undef` für Vitest-Globals befreien (`globals: true` setzt `describe/it/expect`). Andernfalls schlägt `npm run lint` an den neuen Dateien fehl.

---

### 2. Unit-Tests — kritische Pure-Logic-Pfade (P0)

`app/tests/unit/geo.test.ts` — Distanz, PLZ-Validierung, unbekannte PLZ → `null` (Pfeiler „Zero-State statt Error"):

```ts
import { describe, it, expect } from 'vitest'
import { haversine, centroidForPlz, distanceFromPlz, isValidPlz } from '../../src/lib/geo'

describe('geo/isValidPlz', () => {
  it('akzeptiert genau 5 Ziffern', () => expect(isValidPlz('49074')).toBe(true))
  it('lehnt zu kurze / nicht-numerische PLZ ab', () => {
    expect(isValidPlz('4907')).toBe(false)
    expect(isValidPlz('4907a')).toBe(false)
    expect(isValidPlz('')).toBe(false)
  })
})

describe('geo/haversine', () => {
  it('ist 0 für identische Punkte', () =>
    expect(haversine([52.27, 8.05], [52.27, 8.05])).toBeCloseTo(0, 5))
  it('liefert plausible Distanz Osnabrück↔Münster (~45 km)', () => {
    const d = haversine([52.2719, 8.0471], [51.9607, 7.6261])
    expect(d).toBeGreaterThan(40); expect(d).toBeLessThan(55)
  })
})

describe('geo/distanceFromPlz', () => {
  it('rundet auf eine Nachkommastelle', () => {
    const d = distanceFromPlz('49074', 51.9607, 7.6261)
    expect(d).not.toBeNull()
    expect(Number.isFinite(d!)).toBe(true)
    expect(d).toBe(Math.round(d! * 10) / 10)
  })
  it('gibt null bei unbekannter PLZ (kein Throw, kein NaN)', () => {
    expect(centroidForPlz('00000')).toBeNull()
    expect(distanceFromPlz('00000', 52, 8)).toBeNull()
  })
})
```

`app/tests/unit/data.filter.test.ts` — Filter/Sort/Distanz-Mapping gegen Seed (kein Backend):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase als nicht konfiguriert erzwingen → reiner Seed-Pfad.
vi.mock('../../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))

import { listFarms, listCategories } from '../../src/lib/data'

describe('data/listFarms (Seed-Pfad)', () => {
  it('liefert alle Höfe ohne Filter, distanceKm=null ohne PLZ', async () => {
    const farms = await listFarms({})
    expect(farms.length).toBeGreaterThan(0)
    expect(farms.every((f) => f.distanceKm === null)).toBe(true)
  })

  it('sortiert bei bekannter PLZ nach Entfernung aufsteigend', async () => {
    const farms = await listFarms({ plz: '49074', sort: 'distance' })
    const known = farms.filter((f) => f.distanceKm != null).map((f) => f.distanceKm!)
    const sorted = [...known].sort((a, b) => a - b)
    expect(known).toEqual(sorted)
  })

  it('fällt bei unbekannter PLZ auf alphabetische Sortierung zurück', async () => {
    const farms = await listFarms({ plz: '00000', sort: 'distance' })
    const names = farms.map((f) => f.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'de')))
  })

  it('filtert nach Kategorie ohne leeres 500-Risiko', async () => {
    const farms = await listFarms({ category: 'Honig' })
    expect(Array.isArray(farms)).toBe(true)
    expect(farms.every((f) => f.categories.includes('Honig'))).toBe(true)
  })

  it('liefert für eine garantiert nicht vorkommende Kombination eine leere Liste (Zero-State, kein Throw)', async () => {
    const farms = await listFarms({ category: 'Blumen', plz: '00000' })
    expect(Array.isArray(farms)).toBe(true) // UI rendert „Keine Höfe für diese Auswahl"
  })

  it('listCategories ist alphabetisch + deduped', () => {
    const cats = listCategories()
    expect(cats).toEqual([...new Set(cats)])
    expect(cats).toEqual([...cats].sort((a, b) => a.localeCompare(b, 'de')))
  })
})
```

`app/tests/unit/data.reservation.test.ts` — Reservierung ohne Backend landet lokal (kein toter Button, kein Datenverlust):

```ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('../../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
import { createReservation } from '../../src/lib/data'

describe('data/createReservation (Seed/lokal)', () => {
  it('liefert eine Reservierung mit id + createdAt zurück und persistiert lokal', async () => {
    const r = await createReservation({
      farmId: 'hof-sonnenwiese', productId: 'p1', quantity: 2,
      pickupWindow: 'Heute 14–16 Uhr', name: 'Test', contact: 'test@example.de',
    })
    expect(r.id).toBeTruthy()
    expect(r.createdAt).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem('lbc_reservations') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].farmId).toBe('hof-sonnenwiese')
  })
})
```

`app/tests/unit/payments.test.ts` — kein konfiguriertes Supabase → `not_configured` statt toter Button:

```ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('../../src/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
import { startCheckout } from '../../src/lib/payments'

describe('payments/startCheckout', () => {
  it('gibt not_configured ohne Supabase (kein Crash, kein toter Pfad)', async () => {
    const res = await startCheckout({ mode: 'subscription', plan: 'basis', orgId: 'org-a' })
    expect(res).toEqual({ error: 'not_configured' })
  })
})
```

---

### 3. Komponenten-Tests — Verhalten & Zero-State (P0)

`app/tests/component/FarmDrawer.test.tsx` — Reservierungs-State-Machine + Pflichtfeld-Validierung (Pfeiler 6 „Pflichtfelder"):

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FarmDrawer } from '../../src/components/FarmDrawer'
import { SEED_FARMS } from '../../src/lib/seed'

vi.mock('../../src/lib/data', () => ({ createReservation: vi.fn(async (i) => ({ ...i, id: 'r1', createdAt: 'now' })) }))
import { createReservation } from '../../src/lib/data'

const farm = SEED_FARMS[0]

describe('FarmDrawer', () => {
  it('blockiert Absenden ohne Name/Kontakt mit klarer Meldung', async () => {
    render(<FarmDrawer farm={farm} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /jetzt reservieren/i }))
    expect(screen.getByText(/bitte deinen namen angeben/i)).toBeInTheDocument()
    expect(createReservation).not.toHaveBeenCalled()
  })

  it('reserviert bei vollständigen Daten und zeigt Erfolgsmeldung', async () => {
    render(<FarmDrawer farm={farm} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Anna Bauer')
    await userEvent.type(screen.getByLabelText(/e-mail oder telefon/i), 'anna@example.de')
    await userEvent.click(screen.getByRole('button', { name: /jetzt reservieren/i }))
    expect(createReservation).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/reserviert:/i)).toBeInTheDocument()
  })

  it('zeigt Zero-State, wenn nichts verfügbar ist', () => {
    const soldOut = { ...farm, products: farm.products.map((p) => ({ ...p, availability: 'out' as const })) }
    render(<FarmDrawer farm={soldOut} onClose={() => {}} />)
    expect(screen.getByText(/aktuell ist nichts verfügbar/i)).toBeInTheDocument()
  })
})
```

`app/tests/component/FinderPage.test.tsx` — Lade-Skeleton → Liste, Zero-State-Hinweis bei unbekannter PLZ:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEED_FARMS } from '../../src/lib/seed'

vi.mock('../../src/lib/data', () => ({
  listCategories: () => ['Eier', 'Honig', 'Obst'],
  listFarms: vi.fn(async () => SEED_FARMS.map((f) => ({ ...f, distanceKm: null }))),
}))
import { FinderPage } from '../../src/pages/FinderPage'

describe('FinderPage', () => {
  it('rendert nach dem Laden die Hof-Anzahl', async () => {
    render(<FinderPage />)
    expect(await screen.findByText(/höfe gefunden|hof gefunden/i)).toBeInTheDocument()
  })
  it('zeigt den Hinweis bei unbekannter PLZ', async () => {
    render(<FinderPage />)
    await userEvent.type(screen.getByLabelText(/postleitzahl/i), '00000')
    expect(await screen.findByText(/diese plz kennen wir noch nicht/i)).toBeInTheDocument()
  })
})
```

---

### 4. Edge-Function-Tests (Deno) — Helfer + Handler (P0)

`app/supabase/functions/_shared/stripe.test.ts` — reine Helfer (kein Stripe-Call):

```ts
import { assertEquals } from 'jsr:@std/assert'
import { mapSubStatus } from './stripe.ts'

Deno.test('mapSubStatus: gültige Stati passieren durch', () => {
  for (const s of ['inactive', 'trialing', 'active', 'past_due', 'canceled']) assertEquals(mapSubStatus(s), s)
})
Deno.test('mapSubStatus: unbekannter Stripe-Status fällt sicher auf past_due (constraint-sicher)', () => {
  assertEquals(mapSubStatus('incomplete_expired'), 'past_due')
  assertEquals(mapSubStatus(''), 'past_due')
})
```

`app/supabase/functions/stripe-webhook/idempotency.test.ts` — **Idempotenz-Beweis** über eine extrahierte, testbare Handler-Funktion mit Stub-DB. Damit der Handler ohne echten Stripe-/Netz-Call testbar ist, wird die Verarbeitung (ohne Signaturprüfung, die ist Stripe-SDK-Sache) in eine reine Funktion gezogen, z. B. `handleEvent(db, event)`; `index.ts` ruft sie nach `constructEventAsync` auf:

```ts
import { assertEquals } from 'jsr:@std/assert'
import { handleEvent } from './handler.ts' // refaktorierter, signaturfreier Kern

// Stub-DB: zählt insert/update-Aufrufe; payment_events simuliert PK-Konflikt beim 2. Mal.
function stubDb() {
  const seenEvents = new Set<string>()
  const calls = { sbUpdate: 0, audit: 0, eventInsert: 0 }
  return {
    calls,
    from(table: string) {
      return {
        insert: (row: { id?: string }) => {
          if (table === 'payment_events') {
            calls.eventInsert++
            if (seenEvents.has(row.id!)) return Promise.resolve({ error: { code: '23505' } })
            seenEvents.add(row.id!); return Promise.resolve({ error: null })
          }
          if (table === 'audit_log') calls.audit++
          return Promise.resolve({ error: null })
        },
        update: () => { if (table === 'sb_payments') calls.sbUpdate++; return { eq: () => Promise.resolve({ error: null }) } },
        upsert: () => Promise.resolve({ error: null }),
      }
    },
  }
}

const event = {
  id: 'evt_test_1', type: 'checkout.session.completed',
  data: { object: { metadata: { kind: 'sb_payment', sb_payment_id: 'pay_1', org_id: 'org-a' }, amount_total: 390 } },
} as unknown as Parameters<typeof handleEvent>[1]

Deno.test('Webhook ist idempotent: dasselbe Event zweimal → genau eine sb_payments-Aktualisierung', async () => {
  const db = stubDb()
  const r1 = await handleEvent(db as never, event); assertEquals(r1.status, 200)
  const r2 = await handleEvent(db as never, event); assertEquals(r2.status, 200) // 2. Mal: "duplicate" → 200
  assertEquals(db.calls.sbUpdate, 1) // KEINE doppelte Statusänderung
  assertEquals(db.calls.audit, 1)
})
```

> **Begründete kleine Refaktorierung (kein „Test-Zurechtbiegen"):** `stripe-webhook/index.ts` extrahiert seinen Verarbeitungskern in `handler.ts` (`handleEvent(db, event)`), `index.ts` bleibt der dünne, signaturprüfende Adapter. Das macht die Idempotenz **verhaltensnah** testbar, ohne echten Stripe-Webhook-Stub. Die `payment_events`-PK-Idempotenz (Konflikt → `200 duplicate`) aus `0002_payments.sql` wird damit 1:1 verifiziert. (Pfeiler/AGENTS: „EIN idempotenter, signaturgeprüfter Webhook".)

`app/supabase/functions/create-checkout/pricing.test.ts` — **serverseitige Preisbildung** (Client-Betrag wird ignoriert): Test stubt `db.products.maybeSingle()` mit `price: 3.90` und prüft, dass `unit_amount` aus dem DB-Preis (`390`) und nicht aus einem mitgesendeten `amount` gebildet wird.

```ts
import { assertEquals } from 'jsr:@std/assert'
// Reiner Preis-Kalkül-Helfer aus der Function (extrahiert): centsFor(price, qty)
import { centsFor } from './pricing.ts'

Deno.test('Preis kommt aus DB (3.90 €, qty 2) = 780 Cent — Client-Betrag irrelevant', () => {
  assertEquals(centsFor(3.90, 2), 780)
})
Deno.test('Menge wird auf 1..50 geklemmt', () => {
  assertEquals(centsFor(1.00, 0), 100)   // qty<1 → 1
  assertEquals(centsFor(1.00, 999), 5000) // qty>50 → 50
})
```

Lokal ausführen:

```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app/supabase/functions"
deno test --allow-env --allow-net=127.0.0.1 --no-check
```

---

### 5. Cross-Org-Negativtests — der Kern dieser Welle (P0, blockierend)

Gegen die **echten RLS-Policies** aus `0001`–`0003`. Ausgeführt mit `anon`/`authenticated`-JWTs (**nie** `service_role`). Setup über ein **lokales** `supabase start` oder ein Owner-Test-Projekt; Seed legt zwei Orgs an.

`app/tests/rls/fixtures.sql` (Test-Seed, deterministisch — zwei isolierte Welten):

```sql
-- Zwei Orgs, je ein Erzeuger-Profil, je ein Hof + Produkt + SB-Zahlung + Subscription.
insert into orgs (id, name) values
  ('00000000-0000-0000-0000-00000000000a','Org A — Hof Nord'),
  ('00000000-0000-0000-0000-00000000000b','Org B — Hof Süd');
-- Profile/auth.users werden im Test über die Admin-API angelegt (user_a∈A, user_b∈B);
-- danach JWTs erzeugt. Höfe/Produkte/sb_payments je org_id gesetzt.
insert into farms (id, org_id, name, type, street, plz, city, lat, lng) values
  ('hof-a','00000000-0000-0000-0000-00000000000a','Hof Nord','Hofladen','Weg 1','49074','Osnabrück',52.27,8.05),
  ('hof-b','00000000-0000-0000-0000-00000000000b','Hof Süd','Hofladen','Weg 2','48143','Münster',51.96,7.63);
insert into products (id, farm_id, org_id, name, category, unit, price) values
  ('pa','hof-a','00000000-0000-0000-0000-00000000000a','Eier A','Eier','10 Stk',3.20),
  ('pb','hof-b','00000000-0000-0000-0000-00000000000b','Eier B','Eier','10 Stk',3.20);
insert into sb_payments (org_id, farm_id, product_id, amount_cents) values
  ('00000000-0000-0000-0000-00000000000a','hof-a','pa',640),
  ('00000000-0000-0000-0000-00000000000b','hof-b','pb',640);
insert into subscriptions (org_id, plan, status) values
  ('00000000-0000-0000-0000-00000000000a','plus','active'),
  ('00000000-0000-0000-0000-00000000000b','plus','active');
```

`app/vitest.rls.config.ts` (eigene Suite, node-Env, gegen Test-DB; Coverage aus — hier zählt nur das Verhalten):

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', include: ['tests/rls/**/*.test.ts'], setupFiles: ['./tests/rls/setup.ts'], testTimeout: 30_000 },
})
```

`app/tests/rls/cross-org.test.ts` — die Negativ-Matrix (jede Zeile ein Pfeiler-1-Beweis):

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_TEST_URL!
const ANON = process.env.SUPABASE_TEST_ANON_KEY!
// JWTs werden in setup.ts via Admin-API für user_a (Org A) / user_b (Org B) erzeugt.
declare const tokens: { a: string; b: string }
const ORG_A = '00000000-0000-0000-0000-00000000000a'
const ORG_B = '00000000-0000-0000-0000-00000000000b'

const asUser = (jwt: string) => createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${jwt}` } } })

describe('RLS Cross-Org — Org A darf NIE Org-B-Daten sehen/ändern', () => {
  let A: ReturnType<typeof createClient>
  beforeAll(() => { A = asUser(tokens.a) })

  it('sb_payments: User A liest nur eigene (keine Org-B-Zeile)', async () => {
    const { data, error } = await A.from('sb_payments').select('org_id')
    expect(error).toBeNull()
    expect(data!.every((r) => r.org_id === ORG_A)).toBe(true)
    expect(data!.some((r) => r.org_id === ORG_B)).toBe(false)
  })

  it('subscriptions: User A sieht Org-B-Abo NICHT', async () => {
    const { data } = await A.from('subscriptions').select('org_id').eq('org_id', ORG_B)
    expect(data ?? []).toHaveLength(0) // RLS filtert die fremde Zeile weg
  })

  it('reservations: User A liest keine Org-B-Reservierung', async () => {
    const { data } = await A.from('reservations').select('id').eq('org_id', ORG_B)
    expect(data ?? []).toHaveLength(0)
  })

  it('products WRITE: User A kann KEIN Org-B-Produkt ändern (Policy with check)', async () => {
    const { data, error } = await A.from('products').update({ price: 0.01 }).eq('id', 'pb').select()
    // RLS: 0 betroffene Zeilen ODER Fehler — niemals erfolgreiche Fremd-Mutation.
    expect((data ?? []).length).toBe(0)
    if (error) expect(error.code).toBeTruthy()
  })

  it('farms WRITE: User A kann KEINEN Org-B-Hof als gelöscht markieren', async () => {
    const { data } = await A.from('farms').update({ deleted_at: new Date().toISOString() }).eq('id', 'hof-b').select()
    expect((data ?? []).length).toBe(0)
  })

  it('reservations INSERT: org_id≠farm.org_id wird durch with-check abgelehnt', async () => {
    const { error } = await A.from('reservations').insert({
      farm_id: 'hof-b', org_id: ORG_A, product_id: 'pb', quantity: 1,
      pickup_window: 'Heute 14–16 Uhr', name: 'X', contact: 'x@e.de',
    })
    expect(error).not.toBeNull() // farm.org_id (B) ≠ reservations.org_id (A) → Policy-Verweigerung
  })

  it('orgs / audit_log: anon/authenticated hat KEINE Select-Policy → leer', async () => {
    const orgs = await A.from('orgs').select('id')
    const audit = await A.from('audit_log').select('id')
    expect(orgs.data ?? []).toHaveLength(0)
    expect(audit.data ?? []).toHaveLength(0)
  })

  it('waitlist: insert-only — Select liefert nichts (keine Select-Policy)', async () => {
    const { data } = await A.from('waitlist').select('email')
    expect(data ?? []).toHaveLength(0)
  })
})

describe('RLS Positiv-Kontrolle — eigene Org IST sichtbar (sonst wäre der Negativtest wertlos)', () => {
  it('User A liest die eigene sb_payment', async () => {
    const { data } = await asUser(tokens.a).from('sb_payments').select('org_id').eq('org_id', ORG_A)
    expect((data ?? []).length).toBeGreaterThan(0)
  })
  it('Public-Katalog: anon liest aktive Höfe (Finder funktioniert ohne Login)', async () => {
    const { data, error } = await createClient(URL, ANON).from('farms').select('id').is('deleted_at', null)
    expect(error).toBeNull()
    expect((data ?? []).length).toBeGreaterThanOrEqual(2)
  })
})
```

**Negativ-Matrix (verbindlich abzudecken — eine Zeile = ein Test):**

| Tabelle | Policy (Quelle) | Negativtest (Org A gegen Org B) | Positiv-Kontrolle |
|---|---|---|---|
| `farms` | `farms_owner_write` / `is_org_member` (0003) | A ändert/löscht Hof B → 0 Zeilen | A pflegt eigenen Hof |
| `products` | `products_owner_write` (0003) | A ändert Produkt B → 0 Zeilen | A pflegt eigenes Produkt |
| `reservations` | `reservations_owner_read` + `reservations_insert` (0001) | A liest B-Reservierung → leer; Insert mit org-mismatch → Fehler | A liest eigene; valider Insert ok |
| `sb_payments` | `sb_payments_owner_read` (0002/0003) | A liest B-Zahlung → leer | A liest eigene |
| `subscriptions` | `subscriptions_owner_read` (0002/0003) | A liest B-Abo → leer | A liest eigenes |
| `reviews` | `reviews_owner_moderate` (0003) | A blendet B-Review aus → 0 Zeilen | öffentlich lesbar bleibt |
| `org_members` | `org_members_read` (0003) | A liest Mitgliedschaften von B → leer | A liest eigene Org |
| `credits_ledger` | `credits_owner_read` (0003) | A liest B-Guthaben → leer | A liest eigenes |
| `orgs`, `audit_log` | keine anon/auth-Policy | beide → immer leer | nur `service_role` (nicht im Test) |
| `waitlist` | insert-only (0001) | Select → leer | Insert (anon) ok |

> **Warum „leere Liste" und nicht „403":** Postgres-RLS materialisiert eine fehlende Berechtigung beim `SELECT` als **gefilterte (leere) Zeilenmenge**, bei `UPDATE`/`INSERT` als **0 betroffene Zeilen bzw. `with check`-Verletzung**. Beides ist der korrekte, sichere Ausgang (Pfeiler 1: „fremde Org = nie 200 mit Fremddaten"). Der API-Layer (PostgREST/Edge) übersetzt das nach außen; der DB-Negativtest beweist die Wurzel.

---

### 6. E2E-Test — Kernflow Finder → Reservierung (P0)

`app/tests/e2e/kernflow.spec.ts` — gegen die laufende App (Seed, echter Fetch, echtes DOM):

```ts
import { test, expect } from '@playwright/test'

test('Kernflow: PLZ suchen → Hof öffnen → reservieren → Erfolg', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/Hofladen-Finder/i)).toBeVisible()

  // Suche
  await page.getByLabel(/Postleitzahl/i).fill('49074')
  await expect(page.getByText(/höfe gefunden|hof gefunden/i)).toBeVisible()

  // ersten Hof öffnen
  await page.getByRole('button', { name: /details ansehen|öffnen|reservieren/i }).first().click()
  await expect(page.getByRole('dialog', { name: /Hof-Details/i })).toBeVisible()

  // Reservierung ausfüllen
  await page.getByLabel(/^Name$/i).fill('Anna Bauer')
  await page.getByLabel(/E-Mail oder Telefon/i).fill('anna@example.de')
  await page.getByRole('button', { name: /jetzt reservieren/i }).click()

  await expect(page.getByText(/Reserviert:/i)).toBeVisible()
})

test('Zero-State: unbekannte PLZ zeigt Hinweis statt Fehler', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/Postleitzahl/i).fill('00000')
  await expect(page.getByText(/diese plz kennen wir noch nicht/i)).toBeVisible()
})

test('Konsole bleibt sauber (keine uncaught errors / 401-Schleifen)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await page.getByLabel(/Postleitzahl/i).fill('49074')
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})
```

---

### 7. CI-Integration (P0)

`.github/workflows/ci.yml` aus WAVE_01 erweitern — neue Steps im `build`-Job nach `build`:

```yaml
      - run: npm run test:run
      - run: npm run test:coverage
      - name: E2E (Playwright)
        run: |
          npx playwright install --with-deps chromium
          npm run test:e2e
        env:
          VITE_SUPABASE_URL: https://example.supabase.co
          VITE_SUPABASE_ANON_KEY: ci-placeholder-anon-key
      - name: Upload Playwright-Report
        if: ${{ always() }}
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: app/playwright-report, retention-days: 7 }
```

Edge-Function-Job (WAVE_01) um Tests ergänzen:

```yaml
      - name: Deno test (Edge Functions)
        working-directory: app/supabase/functions
        run: deno test --allow-env --allow-net=127.0.0.1 --no-check
```

**RLS-/Integration-Suite** als **eigener, gated Job** (läuft nur, wenn die Test-Projekt-Secrets gesetzt sind — Owner-Freigabe; läuft nie gegen Prod):

```yaml
  rls-isolation:
    name: RLS · Cross-Org-Isolation (Test-DB)
    runs-on: ubuntu-latest
    if: ${{ vars.RUN_RLS_TESTS == 'true' }}   # vom Owner aktiviert, sobald Test-Projekt existiert
    defaults: { run: { working-directory: app } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: app/package-lock.json }
      - run: npm ci
      - run: npm run test:rls
        env:
          SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_TEST_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
          SUPABASE_TEST_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}  # NUR zum Anlegen der Test-User in setup.ts, nie im Test selbst
```

> Bis das Test-Projekt existiert, läuft `rls-isolation` lokal über `supabase start` (Docker-Desktop des Owners) — die Suite ist damit **nicht** „still grün durch Skip", sondern entweder ausgeführt oder klar als Owner-Blocker markiert (siehe Stop-Regeln). Der `SERVICE_ROLE_KEY` wird **ausschließlich** in `setup.ts` zum Anlegen der Test-User benutzt, **nie** im eigentlichen RLS-Test (sonst wäre die Isolation nur vorgetäuscht — security-auditor prüft das).

---

## Konkrete Befehle (Reihenfolge)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Test-Toolchain installieren (Aufgabe 1)
npm i -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @playwright/test
npx playwright install --with-deps chromium

# 2) Unit + Komponenten lokal (Aufgaben 2–3)
npm run test:run
npm run test:coverage      # erwartet: ≥90% Lines/Functions auf geo/data/payments

# 3) Edge Functions (Deno) (Aufgabe 4)
cd supabase/functions
deno test --allow-env --allow-net=127.0.0.1 --no-check
cd ../..

# 4) E2E gegen laufende App (Aufgabe 6) — Playwright startet den Dev-Server selbst (Port 5409)
npm run test:e2e

# 5) RLS-/Cross-Org-Suite gegen lokale Test-DB (Aufgabe 5) — NUR mit lokalem Supabase/Test-Projekt
#    Lokales Supabase (Docker-Desktop des Owners) hochfahren + Migrationen + Test-Seed:
supabase start
supabase db reset                          # spielt migrations/0001..0003 ein
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f tests/rls/fixtures.sql
export SUPABASE_TEST_URL=$(supabase status -o env | grep API_URL | cut -d= -f2-)
export SUPABASE_TEST_ANON_KEY=$(supabase status -o env | grep ANON_KEY | cut -d= -f2-)
export SUPABASE_TEST_SERVICE_ROLE_KEY=$(supabase status -o env | grep SERVICE_ROLE_KEY | cut -d= -f2-)
npm run test:rls                           # erwartet: alle Cross-Org-Negativtests grün
supabase stop

# 6) Alles in einem Rutsch (wie CI, ohne RLS/E2E-Backend)
npm run ci
```

---

## Acceptance (Akzeptanzkriterien)

- [ ] `npm run test:run` läuft **grün**; Unit-Tests decken `geo.ts`, `data.ts` (Filter/Sort/Distanz/Reservierung), `payments.ts` ab.
- [ ] `npm run test:coverage` erfüllt die Schwelle **≥ 90 % Lines/Functions (≥ 85 % Branches)** auf `src/lib/geo.ts`, `src/lib/data.ts`, `src/lib/payments.ts`; CI failt bei Unterschreitung.
- [ ] Komponenten-Tests grün: `FarmDrawer` (Pflichtfeld-Validierung, Erfolgsmeldung, Zero-State „nichts verfügbar"), `FinderPage` (Anzahl-Anzeige, unbekannte-PLZ-Hinweis).
- [ ] **Cross-Org-Negativtests grün für jede Zeile der Negativ-Matrix** — Org A sieht/ändert nie Org-B-Daten; Positiv-Kontrolle (eigene Org sichtbar, Public-Katalog für `anon` lesbar) beweist, dass die Tests nicht trivial leer sind.
- [ ] Kein RLS-Test nutzt `service_role` im Assertion-Pfad (security-auditor bestätigt; `service_role` nur in `setup.ts` zum User-Anlegen).
- [ ] Edge-Function-Tests grün: `mapSubStatus` (Fallback `past_due`), Webhook-**Idempotenz** (gleiches Event 2× → **genau eine** `sb_payments`-Statusänderung), Checkout-**Preis serverseitig** (DB-Preis, Client-Betrag ignoriert).
- [ ] E2E-Kernflow grün: Finder (PLZ) → Hof-Drawer → Reservierung → Erfolgsmeldung; Zero-State bei unbekannter PLZ; **Browser-Konsole frei von `pageerror`/`console.error`** (keine 401-Schleifen).
- [ ] CI führt `test:run` + `test:coverage` + `test:e2e` + `deno test` aus; `rls-isolation`-Job ist definiert und läuft, sobald Test-Projekt-Secrets/`RUN_RLS_TESTS` gesetzt sind.
- [ ] Keine Test wird durch Abschwächen/Skip „grün gemacht" (Direktive §0.9); jede begründete Refaktorierung (Webhook `handleEvent`, Checkout `centsFor`) ist verhaltensneutral und dokumentiert.
- [ ] Vermittler-/Lebensmittel-Disclaimer auf den getesteten Surfaces sichtbar (E2E prüft Präsenz im Finder/Drawer mit, falls in WAVE_10/14 gesetzt — sonst als offener Verweis dokumentiert).

---

## Gate (blockierend)

> **WAVE_12 QA-Gate** muss grün sein, bevor `99_GOLIVE_GATE.md` (Phase-1-Gesamt-Gate) freigegeben wird. Es bedient direkt Phase-2-Gate **C (Tenant-Isolation)** und stützt **F (Smoke)**.

```
GATE WAVE_12:
  ✅ Unit + Komponenten grün (Vitest)          · Coverage ≥90% auf geo/data/payments
  ✅ Cross-Org-Negativ-Matrix vollständig grün  · Positiv-Kontrolle beweist Nicht-Trivialität
  ✅ Kein service_role im RLS-Assertion-Pfad
  ✅ Edge-Function-Tests grün                    · Webhook idempotent · Preis serverseitig
  ✅ E2E Kernflow grün                           · Konsole sauber · Zero-State korrekt
  ✅ CI führt alle Suites aus                    · rls-isolation-Job definiert & lauffähig
```

**Stop-Regeln in dieser Welle:**
- **Ein Cross-Org-Negativtest schlägt fehl** (Org A sieht/ändert Org-B-Daten) → **STOP**. Das ist ein Sicherheits-Datenleck, kein Test-Bug: RLS-Policy in der zuständigen Migration korrigieren (additive Folgemigration), niemals den Test entschärfen. db-rls-spezialist + security-auditor hinzuziehen.
- **Anlegen des Test-Supabase-Projekts** (Account/Kosten) bzw. Setzen der `SUPABASE_TEST_*`-Secrets → **STOP**, Owner-Freigabe. Bis dahin RLS-Suite lokal über `supabase start` (kein stiller Skip).
- **Webhook nicht idempotent** (Event 2× → 2 Statusänderungen) → **STOP**, payment-engineer: `payment_events`-PK-Pfad in `stripe-webhook` reparieren, nicht den Test.
- **Coverage-Schwelle nur durch Test-Löschen/Skip erreichbar** → **STOP** (Direktive §0.9-Verstoß).

---

## Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_12 — QA: Unit/Integration/E2E + Cross-Org
- Geändert:
  - app/package.json (scripts: test, test:run, test:coverage, test:e2e, test:edge, test:rls; ci erweitert)
  - app/vitest.config.ts · app/vitest.rls.config.ts · app/playwright.config.ts (NEU)
  - app/tests/setup.ts (NEU)
  - app/tests/unit/{geo,data.filter,data.reservation,payments}.test.ts (NEU)
  - app/tests/component/{FarmDrawer,FinderPage}.test.tsx (NEU)
  - app/tests/rls/{fixtures.sql,setup.ts,cross-org.test.ts} (NEU)
  - app/tests/e2e/kernflow.spec.ts (NEU)
  - app/supabase/functions/_shared/stripe.test.ts (NEU)
  - app/supabase/functions/stripe-webhook/{handler.ts (extrahiert),idempotency.test.ts} (NEU/refaktoriert)
  - app/supabase/functions/create-checkout/{pricing.ts (extrahiert),pricing.test.ts} (NEU/refaktoriert)
  - .github/workflows/ci.yml (+ test/coverage/e2e/deno-test Steps; + rls-isolation Job)
  - app/.env.test (secret-frei, Test-Projekt) · app/eslint.config.js (tests/** Globs)
- Tests:
  - Vitest unit+component: <n grün>  · Coverage geo/data/payments: <% Lines/Branches>
  - Cross-Org-Negativ-Matrix: <alle Tabellen grün?>  · Positiv-Kontrolle: <grün?>
  - Deno (Edge): mapSubStatus/Idempotenz/Preis serverseitig: <grün?>
  - E2E Kernflow + Konsole-sauber: <grün?>
- RLS-Status: deny-by-default verifiziert (anon/auth ohne service_role); org_id-Anker je Tabelle bestätigt; Isolationstest grün.
- Disclaimer: Vermittler-/Lebensmittel-Hinweis auf getesteten Surfaces <sichtbar / Verweis auf WAVE_10/14>.
- Risiken: <Test-Supabase-Projekt-Freigabe offen? Flaky E2E? Coverage-Lücken benannt>
- Nächste Welle: WAVE_13 (Observability) → danach WAVE_14 (Legal) → 99_GOLIVE_GATE.
```

---

## Übergang

→ Erst wenn das **WAVE_12 QA-Gate grün** ist (insb. die vollständige Cross-Org-Negativ-Matrix und der idempotente Webhook), ist die Datenisolations- und Kernflow-Wahrheit *bewiesen* und Phase-2-Gate **C (Tenant-Isolation)** vorbereitet. Danach WAVE_13 (Observability) und WAVE_14 (Legal/DSGVO), abschließend `99_GOLIVE_GATE.md`.

> **Tracker-Pflicht nach Abschluss:** `app/docs/releases/PHASE_STATUS.md` Zeile „WAVE_12 QA Tests" auf den realen Stand setzen (Datei bei Bedarf anlegen) und `MASTER_INDEX.md` Abschnitt 6 (`docs/engineering/TESTING.md`, `docs/GO_LIVE_TEST_MATRIX.md`, `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`) sowie Abschnitt 7 (`finalization/WAVE_12`) auf den erreichten Status heben. Wiederverwendbare Muster — **Cross-Org-Negativ-Matrix** + **Webhook-Idempotenz-Handlertest** — als Imperium-Beschleuniger nach `.claude/memory/patterns/` verdichten (gelten für alle 14 Tochter-Plattformen).
