# COMMERCIAL_SOURCE_OF_TRUTH — LokaleBauernConnect

> **Die eine kommerzielle Wahrheit der Plattform.** Plan-Katalog, Preise, Limits, Feature-Gates und SB-Gebühren leben an **genau einer** maschinenlesbaren Stelle — von dort werden Frontend, Edge Functions, DB-Seed und Doku **abgeleitet**, nie parallel gepflegt. Dieses Dokument definiert **die Quelle, ihre Form, den normalize-Helper und das Anti-Drift-Gate**. Es beschreibt nicht „welcher Preis schön ist", sondern „wo der Preis steht, wie er gelesen/normalisiert wird und warum er nirgends doppelt existiert".
>
> **Verhältnis zu `docs/product/PLANS_AND_LIMITS.md`:** Jenes Dokument ist die **menschenlesbare commercial-Spezifikation** (Begründung, Zielgruppen, Mikrocopy, Lifecycle). **Dieses** Dokument ist die **technische Single-Source-Definition** (Katalog-Modul, Schema, Helper, Drift-Test). Bei Widerspruch zwischen Doku und Code gilt **der serverseitig durchgesetzte Katalog**. Bei Widerspruch zwischen zwei Doku-Dateien gilt die hier definierte Origin-Hierarchie (§1.3). PLANS_AND_LIMITS liefert die **Zahlen-Erklärung**, dieses Dokument den **Zahlen-Ursprung**.
>
> Stack-fix: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. Kein Hetzner, kein Self-Host-Docker.
>
> **Vermittler-Grundsatz (nicht verhandelbar):** LokaleBauernConnect **vermittelt**, verkauft nicht selbst, berät nicht. **Plan-Locks gelten ausschließlich für Erzeuger.** **Käufer zahlen nichts** und unterliegen **keinem** Funktions-Lock. Der gesellschaftliche Nutzen (regionale Lebensmittel zugänglich machen) steht über Maximalmonetarisierung (`CLAUDE.md` §0.3 vs. Konfliktregel).
>
> **Status:** Normativ · **Single Source of Commercial Truth** · **Stand:** 2026-06-19 · Phase 1 · WAVE_09 (Vorzieh-Spezifikation, payment-vorbereitend). Zuständig: Claude (Commercial + payment-engineer). Freigabe: Owner (Preise/Geld = Owner-Entscheidung, Confirm + Reason + Audit).
>
> **Bezug:** `docs/product/PLANS_AND_LIMITS.md` (menschenlesbare Spezifikation) · `docs/product/ROLE_FEATURE_MATRIX.md` · `docs/ROLE_AND_PERMISSION_MODEL.md` §5 · `docs/DATABASE_MODEL.md` §2/§4.1/§4.7 · `docs/COMPLIANCE_MODEL.md` §2/§4/§9/§10 · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` · `PHASEN.md` (WAVE_09, Phase 4 Track A) · geplant: `docs/PRICING.md`, `docs/SUBSCRIPTION_LIFECYCLE.md`, `docs/STRIPE-SETUP.md`.

---

## 0 · Das Problem, das diese Datei löst — Hardcode-Drift

In jedem mehrschichtigen Produkt entsteht **kommerzielle Drift**: dieselbe Zahl (Preis, Limit, Gebühr, Plan-Reihenfolge) wird an mehreren Stellen wiederholt — in einer React-Pricing-Karte, in einem Edge-Guard, in einer Migration, in einer Doku-Tabelle, in einem Stripe-Dashboard. Sobald eine Stelle geändert wird und die anderen nicht, **lügt das Produkt** an genau einer Schicht: Die UI zeigt „150 Produkte", der Guard sperrt bei 100, die Quittung rechnet eine alte Gebühr. Das ist ein Klasse-C-Killer (Geldfluss falsch, Vertrauen weg).

**Die Lösung ist strukturell, nicht disziplinarisch:** Es gibt **eine** kanonische Quelle. Jede andere Schicht **liest** sie oder wird **aus** ihr generiert/verifiziert. Keine Zahl, die kommerziell wirkt, darf zum zweiten Mal von Hand getippt werden.

| Anti-Pattern (verboten) | Kanon (verpflichtend) |
|---|---|
| `if (count >= 150) lock()` in einer Komponente | `requireLimit(plan, 'max_products_per_farm', count)` gegen den Katalog |
| `<PriceCard price="49 €" />` hartkodiert | `CATALOG.plans.plus.price` (zentral, einmalig) gerendert |
| Gebühr `amount * 0.019 + 25` in zwei Edge Functions | **eine** `computeSbFee(plan, amountCents)` aus dem Katalog |
| Plan-Reihenfolge `['demo','basis',…]` in 3 Dateien getippt | **eine** `PLAN_ORDER`-Konstante, alle leiten ab |
| String `"Pro"` / `"PRO"` / `"pro "` ungeprüft als Plan benutzt | `normalizePlan(input)` → `OrgPlan` (validiert, Fallback, Audit) |

> **Konsequenz für jeden Edit:** Eine kommerzielle Zahl ändert sich **nur** im Katalog (§2) bzw. im Stripe-Dashboard für den **wirksamen** Geldbetrag (§5). Schlägt danach ein anderer Ort fehl, ist das **gewollt** — der Drift-Test (§7) fängt ihn, bevor er live geht.

---

## 1 · Single Source — was, wo, in welcher Reihenfolge gewinnt

### 1.1 Die kanonische Quelle (eine Datei, ein Begriff)

Die maschinenlesbare kommerzielle Wahrheit ist das **Katalog-Modul**:

```
app/supabase/functions/_shared/commercial-catalog.ts      ← KANON (TypeScript, Deno + Browser-kompatibel)
```

Es exportiert **einen** eingefrorenen Katalog (`COMMERCIAL_CATALOG`), aus dem **alles** abgeleitet wird: Pläne, Preise, Limits, Feature-Flags, SB-Gebühren, Plan-Reihenfolge. Das Modul ist absichtlich **dependency-frei** (keine Supabase-/Stripe-Imports), damit es identisch in **Edge Functions (Deno)** und im **Frontend (Vite/Browser)** laufen kann — eine Quelle, beide Welten.

> **Namens-Disziplin:** Im gesamten Repo heißt diese Quelle „**der Katalog**" (`COMMERCIAL_CATALOG` / `commercial-catalog.ts`). `_shared/entitlements.ts` (in `PLANS_AND_LIMITS.md` §3 genannt) ist **kein zweiter Katalog**, sondern die **Guard-/Helper-Schicht** auf demselben Katalog (re-exportiert `requireEntitlement`/`requireLimit` und liest `COMMERCIAL_CATALOG`). Es gibt keine zweite Datei mit eigenen Zahlen.

### 1.2 Die abgeleiteten Spiegel (read-only zur Quelle)

| Spiegel | Pfad | Wie er zur Quelle steht |
|---|---|---|
| **DB-Entitlements** | Tabelle `plan_entitlements` (+ `plan_pricing`), gefüllt per Seed-Migration | Wird **aus** dem Katalog erzeugt (§4). RLS nutzt sie für DB-nahe Checks. Drift-Test erzwingt Wertgleichheit (§7). |
| **Frontend-Plan-/Pricing-UI** | `app/src/lib/commercial.ts` (re-export) → Pricing-Karten, Lock-Karten | Importiert denselben Katalog **oder** liest `bootstrap.entitlements`. Tippt **nie** eine Zahl ab. |
| **Bootstrap-Response** | Edge `bootstrap` liefert `{ plan, entitlements, limits, usage }` | Serverseitig aus Katalog + aktuellem `orgs.plan` + Verbrauch berechnet (§6). |
| **Menschen-Doku** | `docs/product/PLANS_AND_LIMITS.md`, `ROLE_FEATURE_MATRIX.md`, `docs/PRICING.md` | Erklären die Werte; bei Zahlen-Konflikt gilt der Katalog. Doku-Tabellen werden bei Änderung mitgezogen (Review-Checklist §7.3). |
| **Stripe** | Products/Prices/Connect (`docs/STRIPE-SETUP.md`) | Hält den **wirksamen Abo-Geldbetrag** (§5). Katalog-`price` ist **Anzeige-/Vorgabewert**; verbindlich ist die Stripe-`price`-ID. |

### 1.3 Origin-Hierarchie (welche Wahrheit gewinnt bei Konflikt)

```
1. Stripe price-ID (wirksamer Abo-Geldbetrag, der real abgebucht wird)        ── Geld
2. COMMERCIAL_CATALOG (commercial-catalog.ts)                                  ── Limits, Flags, SB-Gebühr, Plan-Ordnung, Anzeige-Preis
3. plan_entitlements / plan_pricing (DB-Seed, aus Katalog generiert)          ── DB-naher Spiegel (muss == Katalog sein)
4. bootstrap-Response (zur Laufzeit aus 2+orgs.plan+usage berechnet)          ── UI-Wahrheit
5. Frontend-Konstanten / Doku-Tabellen                                        ── nur Anzeige, nie Entscheidung
```

- **Preis (Geld):** Stripe ist Wahrheit für den real abgebuchten Betrag; der Katalog hält den **Anzeige-/Vorgabepreis** und die **price-ID-Zuordnung**. Differenz Anzeige↔Stripe ist ein **Fehler**, kein erlaubter Zustand (Setup-Check §5.2).
- **Alles andere (Limit/Flag/SB-Gebühr/Reihenfolge):** **Der Katalog** ist Wahrheit. DB-Seed und Frontend sind Spiegel.
- **`orgs.plan` (welcher Plan einer Org gilt):** ist **kein Katalog-Inhalt**, sondern Zustand pro Org — geschrieben **ausschließlich** vom signaturgeprüften, idempotenten Stripe-Webhook (`PLANS_AND_LIMITS.md` §0/§6.4). Der Katalog definiert die **Bedeutung** von `'pro'`; der Webhook definiert, **dass** eine Org `'pro'` ist.

---

## 2 · Der Katalog — Form & Vertrag (`commercial-catalog.ts`)

> Vollständiges, ablauffähiges Modul (kein Platzhalter, keine TODOs). Werte = die in `PLANS_AND_LIMITS.md` spezifizierte, owner-freigegebene Staffel. Dies ist die **einzige** Stelle, an der diese Zahlen im Code stehen.

```ts
// app/supabase/functions/_shared/commercial-catalog.ts
//
// DIE EINE KOMMERZIELLE WAHRHEIT der Plattform.
// Dependency-frei (kein Supabase/Stripe-Import) -> läuft identisch in Deno (Edge) und Browser (Vite).
// Jede kommerzielle Zahl steht GENAU HIER. Wer sie woanders tippt, baut Drift -> Drift-Test (§7) bricht.

/** Kanonischer org_plan-Enum — wertgleich zu DATABASE_MODEL.md §2 (create type org_plan ...). */
export const PLAN_IDS = ["demo", "basis", "plus", "pro", "individuell"] as const;
export type OrgPlan = (typeof PLAN_IDS)[number];

/** Aufsteigende Rang-Ordnung. EINZIGE Quelle für "höher/niedriger" und "niedrigster Plan, der X kann". */
export const PLAN_ORDER: readonly OrgPlan[] = PLAN_IDS;
export const PLAN_RANK: Readonly<Record<OrgPlan, number>> = Object.freeze(
  Object.fromEntries(PLAN_ORDER.map((p, i) => [p, i])) as Record<OrgPlan, number>,
);
export const DEFAULT_PLAN: OrgPlan = "demo"; // == orgs.plan DEFAULT (DATABASE_MODEL.md §4.1)

/** Feature-Flags (Funktions-Entitlements). Vollständige, geschlossene Liste — keine versteckten Flags. */
export const FEATURE_FLAGS = [
  "farm_create_preview", "farm_public_listing", "product_self_service", "pickup_windows",
  "premium_listing", "multi_farm", "reservation_inbox", "season_push", "waitlist_campaigns",
  "team_management", "sb_payment", "stripe_connect_payout", "sb_analytics", "sb_fee_preferred",
  "commercial_export", "api_access", "whitelabel", "sla", "org_federation",
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

/** Mengen-Limits. -1 = unbegrenzt. Schlüssel == plan_entitlements-Spalten == PLANS_AND_LIMITS.md §2. */
export const LIMIT_KEYS = [
  "max_farms", "max_products_per_farm", "max_team_members",
  "max_active_reservations_per_farm", "max_season_push_per_month",
  "max_self_service_stands", "max_export_jobs_per_month",
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export const UNLIMITED = -1 as const;

export interface PlanDef {
  readonly id: OrgPlan;
  /** Anzeige-/Vorgabepreis in Cent (netto). Wirksamer Geldbetrag = Stripe price-ID (§5). null = kostenlos/individuell. */
  readonly displayPriceCents: number | null;
  readonly billingInterval: "month" | "custom" | "free";
  /** Zuordnung zur Stripe price-ID via Env (nie hartkodierte ID im Code). null = kein Self-Service-Checkout. */
  readonly stripePriceEnv: string | null;
  readonly selfServiceCheckout: boolean; // individuell = false (Vertrieb/Owner)
  readonly labelDe: string;
  readonly limits: Readonly<Record<LimitKey, number>>;
  readonly features: Readonly<Record<FeatureFlag, boolean>>;
}

// --- Der Katalog. Jede Zahl genau einmal. ------------------------------------------------
const RAW_PLANS: Record<OrgPlan, PlanDef> = {
  demo: {
    id: "demo", displayPriceCents: 0, billingInterval: "free", stripePriceEnv: null,
    selfServiceCheckout: false, labelDe: "Demo",
    limits: { max_farms: 1, max_products_per_farm: 5, max_team_members: 1, max_active_reservations_per_farm: 0, max_season_push_per_month: 0, max_self_service_stands: 0, max_export_jobs_per_month: 0 },
    features: f({ farm_create_preview: true, product_self_service: true, pickup_windows: true }),
  },
  basis: {
    id: "basis", displayPriceCents: 1900, billingInterval: "month", stripePriceEnv: "STRIPE_PRICE_BASIS",
    selfServiceCheckout: true, labelDe: "Basis",
    limits: { max_farms: 1, max_products_per_farm: 30, max_team_members: 1, max_active_reservations_per_farm: 50, max_season_push_per_month: 0, max_self_service_stands: 0, max_export_jobs_per_month: 0 },
    features: f({ farm_create_preview: true, farm_public_listing: true, product_self_service: true, pickup_windows: true, reservation_inbox: true }),
  },
  plus: {
    id: "plus", displayPriceCents: 4900, billingInterval: "month", stripePriceEnv: "STRIPE_PRICE_PLUS",
    selfServiceCheckout: true, labelDe: "Plus",
    limits: { max_farms: 3, max_products_per_farm: 150, max_team_members: 3, max_active_reservations_per_farm: 200, max_season_push_per_month: 4, max_self_service_stands: 0, max_export_jobs_per_month: 0 },
    features: f({ farm_create_preview: true, farm_public_listing: true, product_self_service: true, pickup_windows: true, premium_listing: true, multi_farm: true, reservation_inbox: true, season_push: true, waitlist_campaigns: true, team_management: true }),
  },
  pro: {
    id: "pro", displayPriceCents: 9900, billingInterval: "month", stripePriceEnv: "STRIPE_PRICE_PRO",
    selfServiceCheckout: true, labelDe: "Pro",
    limits: { max_farms: 10, max_products_per_farm: UNLIMITED, max_team_members: 10, max_active_reservations_per_farm: UNLIMITED, max_season_push_per_month: 20, max_self_service_stands: UNLIMITED, max_export_jobs_per_month: 5 },
    features: f({ farm_create_preview: true, farm_public_listing: true, product_self_service: true, pickup_windows: true, premium_listing: true, multi_farm: true, reservation_inbox: true, season_push: true, waitlist_campaigns: true, team_management: true, sb_payment: true, stripe_connect_payout: true, sb_analytics: true, commercial_export: true, api_access: true }),
  },
  individuell: {
    id: "individuell", displayPriceCents: null, billingInterval: "custom", stripePriceEnv: null,
    selfServiceCheckout: false, labelDe: "Individuell",
    limits: { max_farms: UNLIMITED, max_products_per_farm: UNLIMITED, max_team_members: UNLIMITED, max_active_reservations_per_farm: UNLIMITED, max_season_push_per_month: UNLIMITED, max_self_service_stands: UNLIMITED, max_export_jobs_per_month: UNLIMITED },
    features: f(Object.fromEntries(FEATURE_FLAGS.map((k) => [k, true])) as Record<FeatureFlag, boolean>),
  },
};

/** Füllt fehlende Flags deterministisch mit false -> jede PlanDef hat ALLE Flags explizit (keine undefined-Löcher). */
function f(partial: Partial<Record<FeatureFlag, boolean>>): Readonly<Record<FeatureFlag, boolean>> {
  const out = {} as Record<FeatureFlag, boolean>;
  for (const flag of FEATURE_FLAGS) out[flag] = partial[flag] ?? false;
  return Object.freeze(out);
}

/** SB-Transaktionsgebühr (Haupt-Monetarisierung). Nur pro/individuell; sonst null = SB nicht freigeschaltet. */
export interface SbFeeDef { readonly percent: number; readonly fixedCents: number; }
export const SB_FEES: Readonly<Record<OrgPlan, SbFeeDef | null>> = Object.freeze({
  demo: null, basis: null, plus: null,
  pro: { percent: 0.019, fixedCents: 25 },          // 1,9 % + 0,25 €
  individuell: { percent: 0.014, fixedCents: 25 },  // 1,4 % + 0,25 € (bevorzugt, verhandelbar)
});

/** DER eingefrorene Katalog. Einzige exportierte commercial-Wahrheit. */
export const COMMERCIAL_CATALOG = Object.freeze({
  version: "2026-06-19",                 // wird bei jeder kommerziellen Änderung erhöht (Audit/Drift-Diagnose)
  defaultPlan: DEFAULT_PLAN,
  planOrder: PLAN_ORDER,
  plans: Object.freeze(RAW_PLANS) as Readonly<Record<OrgPlan, PlanDef>>,
  sbFees: SB_FEES,
} as const);
export type CommercialCatalog = typeof COMMERCIAL_CATALOG;
```

> **Vertrag des Moduls:** `Object.freeze` macht den Katalog zur Laufzeit unveränderlich (kein versehentliches Mutieren in einer Function). `f()` erzwingt, dass **jede** PlanDef **jeden** Flag explizit trägt (`false` statt `undefined`) — kein „Flag fehlt, also unklar". `individuell` setzt **alle** Flags `true` + alle Limits `UNLIMITED` programmatisch — keine handgepflegte Enterprise-Liste, die driften kann.

---

## 3 · Der normalize-Helper — untrusted String → `OrgPlan` (nie raten)

Pläne kommen aus untypisierten Quellen: Stripe-Metadaten, Webhook-Payloads, URL-Query (`?upgrade=pro`), Legacy-Rows, manuelle DB-Edits. **Jeder** dieser Eingänge muss durch **einen** Normalisierer — nie wird ein roher String als `OrgPlan` behandelt.

```ts
// app/supabase/functions/_shared/commercial-catalog.ts  (Helper-Teil, gleiche Datei)

/** Type-Guard: Ist v ein gültiger Plan-Bezeichner? */
export function isOrgPlan(v: unknown): v is OrgPlan {
  return typeof v === "string" && (PLAN_IDS as readonly string[]).includes(v);
}

/**
 * Normalisiert eine untrusted Eingabe zu einem gültigen OrgPlan.
 * - trimmt, lowercased, mappt bekannte Aliase
 * - unbekannt/leer/null  ->  fallback (default: DEFAULT_PLAN = 'demo'), NIE ein erratener Premium-Plan
 * - Fail-closed: im Zweifel der SCHWÄCHSTE Plan, nie der stärkere (Sicherheits-/Geld-Default)
 */
const PLAN_ALIASES: Readonly<Record<string, OrgPlan>> = Object.freeze({
  free: "demo", trial: "demo", testing: "demo",
  starter: "basis", standard: "basis", einstieg: "basis",
  growth: "plus", premium: "plus",
  professional: "pro", profi: "pro", business: "pro",
  enterprise: "individuell", custom: "individuell", individual: "individuell", individuel: "individuell",
});

export function normalizePlan(input: unknown, fallback: OrgPlan = DEFAULT_PLAN): OrgPlan {
  if (typeof input !== "string") return fallback;
  const key = input.trim().toLowerCase();
  if (key === "") return fallback;
  if (isOrgPlan(key)) return key;            // exakter kanonischer Wert
  return PLAN_ALIASES[key] ?? fallback;       // bekannter Alias ODER fail-closed auf fallback
}

/**
 * Strenge Variante für Geld-/Sicherheits-Pfade: wirft statt zu raten.
 * Einsatz: Stripe-Webhook (Plan MUSS eindeutig sein, sonst Verbuchung verweigern + Alert).
 */
export function parseOrgPlanStrict(input: unknown): OrgPlan {
  if (isOrgPlan(typeof input === "string" ? input.trim().toLowerCase() : input)) {
    return (input as string).trim().toLowerCase() as OrgPlan;
  }
  throw new Error(`UNKNOWN_PLAN: ${JSON.stringify(input)}`);
}
```

### 3.1 Regeln für den normalize-Helper (verbindlich)

| Regel | Begründung |
|---|---|
| **Fail-closed auf `demo`** (schwächster Plan), nie auf einen erratenen Premium-Plan | Ein unklarer Plan darf **nie** versehentlich SB-Bezahlung/Premium freischalten. Im Zweifel weniger Rechte (`CLAUDE.md`: kein stiller Fehler, Pfeiler 4). |
| **Geld-/Webhook-Pfade nutzen `parseOrgPlanStrict`** (wirft) | Eine fehlerhafte Stripe-Metadate darf keine falsche Verbuchung auslösen — lieber 4xx + Alert als stille Falsch-Aktivierung (`COMPLIANCE_MODEL.md` §6.2 Integrität). |
| **Aliase nur additiv & dokumentiert** | Neuer Alias nur, wenn eine reale Quelle ihn liefert (z. B. Stripe-Produkt-Slug). Kein Raten auf Verdacht. |
| **Nur Strings normalisieren** — keine Zahlen/Objekte zu Plänen casten | Verhindert „truthy = Premium"-Bugs. |
| **Genau ein Normalisierer** | Es gibt keine zweite, leicht andere Plan-Parsing-Funktion irgendwo. Jeder Plan-Eingang ruft `normalizePlan`/`parseOrgPlanStrict`. |

---

## 4 · DB-Spiegel — `plan_entitlements` & `plan_pricing` (aus Katalog generiert)

Die DB braucht die Werte für RLS-nahe Checks und für Reporting. Sie sind **kein zweiter Katalog**, sondern ein **generierter Spiegel**. Die Seed-Migration trägt exakt die Katalog-Werte ein; der Drift-Test (§7) bricht, wenn DB ≠ Katalog.

```sql
-- app/supabase/migrations/00XX_commercial_catalog.sql  (additiv, RLS deny-by-default)
-- Spiegel von COMMERCIAL_CATALOG. NICHT von Hand pflegen — bei Katalog-Änderung neu seeden.

create table if not exists public.plan_entitlements (
  plan                                org_plan primary key,
  -- Limits (-1 = unbegrenzt) — Schlüssel == LimitKey im Katalog
  max_farms                           integer not null,
  max_products_per_farm               integer not null,
  max_team_members                    integer not null,
  max_active_reservations_per_farm    integer not null,
  max_season_push_per_month           integer not null,
  max_self_service_stands             integer not null,
  max_export_jobs_per_month           integer not null,
  -- Feature-Flags als jsonb (Schlüssel == FeatureFlag) — vollständig, kein undefined
  features                            jsonb   not null,
  -- SB-Gebühr (null = SB nicht freigeschaltet)
  sb_fee_percent                      numeric(6,5),
  sb_fee_fixed_cents                  integer,
  catalog_version                     text    not null,
  updated_at                          timestamptz not null default now()
);

create table if not exists public.plan_pricing (
  plan                  org_plan primary key references public.plan_entitlements(plan),
  display_price_cents   integer,            -- Anzeige-/Vorgabepreis (null = kostenlos/individuell)
  billing_interval      text not null,      -- 'month' | 'custom' | 'free'
  self_service_checkout boolean not null,
  stripe_price_env      text                -- Name der Env-Var mit der wirksamen Stripe-price-ID (§5)
);

-- RLS: lesbar für jede authentifizierte Rolle (Pläne sind öffentliche Produktinfo),
-- schreibbar NUR service role (Seed/Webhook). deny-by-default.
alter table public.plan_entitlements enable row level security;
alter table public.plan_pricing      enable row level security;

create policy "plan_entitlements_read" on public.plan_entitlements
  for select using (true);          -- Produktinfo, keine Org-Daten -> kein org_id-Scope nötig
create policy "plan_pricing_read"    on public.plan_pricing
  for select using (true);
-- KEINE insert/update/delete-Policy -> Schreiben ausschließlich service role (Seed/Migration).
```

> **Warum diese DB-Tabelle, wenn der Katalog im Code lebt?** RLS-Policies und SQL-Reports können nicht den TS-Katalog importieren. Für DB-nahe Prüfungen (z. B. „öffentliche Listung nur, wenn Plan ≥ basis") und für analytische Auswertungen braucht es die Werte **in der DB**. Sie bleibt **abgeleitet**: Seed kommt aus dem Katalog, der Test erzwingt Gleichheit. Kein doppeltes Pflegen.

> **`plan_entitlements` vs. `orgs.plan`:** `plan_entitlements` ist die **Bedeutung** der Pläne (statisch, 5 Zeilen). `orgs.plan` ist der **Zustand** einer konkreten Org (dynamisch, vom Webhook). Nie verwechseln — getrennte Tabellen, getrennte Schreibrechte.

---

## 5 · Preis-Wahrheit — Katalog (Anzeige) vs. Stripe (Geld)

Der einzige bewusst **doppelte** Wert ist der Preis — weil zwei Systeme ihn brauchen: der Katalog für die Anzeige, Stripe für die echte Abbuchung. Das ist **kontrolliert**, nicht Drift.

### 5.1 Trennung

| Wert | Wahrheit | Verwendung |
|---|---|---|
| **Anzeige-/Vorgabepreis** (`displayPriceCents`) | Katalog | Pricing-Karten, Lock-Karten, Doku, Angebote |
| **Wirksamer Abo-Geldbetrag** | **Stripe price-ID** (via Env `STRIPE_PRICE_*`) | Was real abgebucht wird (Checkout/Subscription) |
| **price-ID** | Stripe + Env-Var (nie hartkodiert im Code) | `stripePriceEnv` im Katalog zeigt auf die Env-Var, nicht auf die ID selbst |

- Preise stehen **nicht** als Magic Number in einer Komponente — die UI rendert `COMMERCIAL_CATALOG.plans[plan].displayPriceCents`.
- Die **wirksame** price-ID kommt aus einer Env-Var, deren **Name** im Katalog steht (`stripePriceEnv`). So ist im Code keine Stripe-ID hartkodiert (rotierbar, env-getrennt dev/prod).
- `individuell` hat `displayPriceCents: null` + `stripePriceEnv: null` → UI rendert „auf Anfrage", kein Self-Service-Checkout.

### 5.2 Konsistenz-Check (Setup-Gate, `docs/STRIPE-SETUP.md`)

Ein Skript/Test vergleicht beim Deploy: Für jeden Plan mit `selfServiceCheckout=true` muss die Stripe-`price` (aus `stripePriceEnv`) existieren, aktiv, in **EUR**, Intervall == `billingInterval`. Differenz zwischen `displayPriceCents` und Stripe-Betrag → **lautes** Warning (kein silent Mismatch; Anzeige darf nie eine andere Zahl behaupten als die Abbuchung). Preisänderung = Owner-Aktion: neue Stripe-`price` + Katalog-`displayPriceCents` + `version` erhöhen, im selben Change, auditiert.

---

## 6 · SB-Gebühr & Verbrauch — abgeleitete Helfer (eine Berechnung)

### 6.1 SB-Gebühr — genau eine Funktion

```ts
// app/supabase/functions/_shared/commercial-catalog.ts (Helper-Teil)

/** Plattform-SB-Gebühr in Cent. EINZIGE Stelle, an der die SB-Gebühr berechnet wird. */
export function computeSbFeeCents(plan: OrgPlan, amountCents: number): number {
  const fee = COMMERCIAL_CATALOG.sbFees[plan];
  if (!fee) throw new Error(`SB_NOT_ENABLED: plan ${plan} hat kein sb_payment`); // Gate vor Intent
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error("INVALID_AMOUNT");
  return Math.round(amountCents * fee.percent) + fee.fixedCents;
}
```

> Diese Funktion ist die **einzige** Quelle der SB-Gebühr — `sb-payment-create` ruft sie, errechnet `application_fee_amount` für Stripe Connect daraus, nie aus dem Client-Betrag (`PLANS_AND_LIMITS.md` §4.2 Anti-Tampering). Eine zweite Gebührenformel irgendwo ist verboten.

### 6.2 Entitlement-/Limit-Helfer (auf dem Katalog)

```ts
// _shared/entitlements.ts  — Guard-Schicht AUF dem Katalog (kein zweiter Katalog!)
import { COMMERCIAL_CATALOG, PLAN_ORDER, PLAN_RANK, UNLIMITED,
         type OrgPlan, type FeatureFlag, type LimitKey } from "./commercial-catalog.ts";

export function hasFeature(plan: OrgPlan, flag: FeatureFlag): boolean {
  return COMMERCIAL_CATALOG.plans[plan].features[flag];
}
export function getLimit(plan: OrgPlan, key: LimitKey): number {
  return COMMERCIAL_CATALOG.plans[plan].limits[key];
}
export function isUnlimited(plan: OrgPlan, key: LimitKey): boolean {
  return getLimit(plan, key) === UNLIMITED;
}
/** Niedrigster Plan, der einen Flag freischaltet — für requiredPlan/upgradeUrl (Pfeiler 4). */
export function lowestPlanWith(flag: FeatureFlag): OrgPlan {
  const p = PLAN_ORDER.find((pl) => COMMERCIAL_CATALOG.plans[pl].features[flag]);
  if (!p) throw new Error(`NO_PLAN_GRANTS: ${flag}`);
  return p;
}
/** Niedrigster Plan, dessen Limit > current (oder unbegrenzt) ist. */
export function lowestPlanWithLimitAbove(key: LimitKey, current: number): OrgPlan {
  const p = PLAN_ORDER.find((pl) => { const l = getLimit(pl, key); return l === UNLIMITED || l > current; });
  if (!p) throw new Error(`NO_PLAN_EXCEEDS_LIMIT: ${key}`);
  return p;
}
export function planAtLeast(plan: OrgPlan, min: OrgPlan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[min];
}

// requireEntitlement / requireLimit (werfen PlanLimitError) — Vertrag siehe PLANS_AND_LIMITS.md §5.2/§5.3.
```

### 6.3 Bootstrap-Projektion (UI-Wahrheit, serverseitig)

`bootstrap` liefert die UI-Wahrheit fertig berechnet — die UI rät nie:

```jsonc
{
  "role": "erzeuger",
  "orgId": "…",
  "plan": "plus",
  "catalogVersion": "2026-06-19",
  "entitlements": { "premium_listing": true, "sb_payment": false, "season_push": true, "…": "…" },
  "limits": { "max_products_per_farm": 150, "max_farms": 3, "…": -1 },
  "usage":  { "products_in_active_farm": 142, "farms": 2, "season_push_this_month": 1 }
}
```

Daraus rendert die UI Lock-Karten + Upgrade-Pfade (`upgradeUrl` aus `lowestPlanWith`). Käufer/Gäste bekommen `plan: null, entitlements: {}` (planfrei — kein Lock je sichtbar).

---

## 7 · Anti-Drift-Gate — der Vertrag, der „eine Wahrheit" erzwingt

Drift wird **getestet**, nicht gehofft. Die folgenden Tests sind Teil der Commercial-Gate-Suite (WAVE_09) und blockieren den Merge.

### 7.1 Maschinelle Tests (müssen grün sein)

| Test | Prüft | Bricht bei |
|---|---|---|
| **catalog↔enum** | `PLAN_IDS` == `org_plan`-Enum-Werte der Migration (Reihenfolge egal, Menge gleich) | Plan im Code, der nicht in der DB existiert (oder umgekehrt) |
| **catalog↔db-seed** | `plan_entitlements`/`plan_pricing`-Zeilen == Katalog (Limit für Limit, Flag für Flag, Gebühr, Preis) | DB driftet vom Katalog ab |
| **catalog↔doc** | Zahlen in `PLANS_AND_LIMITS.md` §1/§2/§3/§4 == Katalog (geparste Tabellen) | Doku behauptet andere Zahl als Code |
| **flag-vollständigkeit** | Jede PlanDef trägt **alle** `FEATURE_FLAGS` explizit; `individuell` == alle `true` | Flag fehlt / Enterprise-Lücke |
| **limit-monotonie** | Pro Limit gilt: höherer Plan ≥ niedrigerer (außer bewusste 0-Sonderfälle, z. B. `demo` Reservierungen) | versehentliche Limit-Inversion |
| **normalize** | `normalizePlan` mappt alle Aliase korrekt; unbekannt → `demo`; nie Premium aus Müll | Fail-open-Regression |
| **sb-fee** | `computeSbFeeCents('pro', x)` == Spezifikation; `basis/plus/demo` werfen `SB_NOT_ENABLED` | falsche/aktive Gebühr im falschen Plan |
| **stripe-price** (Setup) | Für jeden `selfServiceCheckout`-Plan: Env-`price` existiert, EUR, Intervall passt | Anzeige ≠ Abbuchung |
| **no-hardcode** (Grep-Gate) | Kein Roh-Preis/-Limit/-Gebühr-Literal außerhalb `commercial-catalog.ts` (Allowlist: Katalog-Datei + Tests) | jemand tippt eine Zahl zweimal |

### 7.2 Wertgleichheit catalog↔db (illustrativer Test)

```ts
// app/supabase/functions/tests/commercial-drift.test.ts
import { COMMERCIAL_CATALOG, PLAN_IDS } from "../_shared/commercial-catalog.ts";

Deno.test("plan_entitlements == COMMERCIAL_CATALOG (kein Drift)", async () => {
  const rows = await loadPlanEntitlementsFromDb();          // service-role read
  for (const plan of PLAN_IDS) {
    const cat = COMMERCIAL_CATALOG.plans[plan];
    const row = rows[plan];
    assertExists(row, `plan_entitlements fehlt Zeile: ${plan}`);
    for (const k of Object.keys(cat.limits)) assertEquals(row[k], cat.limits[k], `${plan}.${k} driftet`);
    for (const fl of Object.keys(cat.features)) assertEquals(row.features[fl] ?? false, cat.features[fl], `${plan}.${fl} driftet`);
  }
});
```

### 7.3 Menschliche Review-Checkliste (bei jeder kommerziellen Änderung)

- [ ] Wert **nur** im Katalog (`commercial-catalog.ts`) geändert — keine zweite Stelle von Hand getippt.
- [ ] `COMMERCIAL_CATALOG.version` erhöht (Datum/Inkrement) → Drift-Diagnose + Bootstrap-Cache-Bust.
- [ ] DB-Seed-Migration **neu** generiert/angelegt (additiv), nicht alte Migration editiert.
- [ ] `PLANS_AND_LIMITS.md` / `ROLE_FEATURE_MATRIX.md` / `docs/PRICING.md` Tabellen mitgezogen (catalog↔doc-Test grün).
- [ ] Bei Preis: Stripe-`price` neu angelegt + Env aktualisiert; Setup-Check grün; **Owner-Freigabe** (Confirm + Reason + Audit).
- [ ] Alle §7.1-Tests grün; Grep-no-hardcode grün.
- [ ] Käufer-Welt unverändert planfrei; DSGVO-Pflichten planfrei (`COMPLIANCE_MODEL.md` §2).

---

## 8 · Verbrauchsregeln pro Schicht (woher jede Schicht ihre Wahrheit nimmt)

| Schicht | Liest aus | Tippt NIE |
|---|---|---|
| **React Pricing-/Lock-UI** | `bootstrap` (`entitlements`/`limits`/`usage`) **oder** importierter Katalog (`app/src/lib/commercial.ts` re-export) | keinen Preis, kein Limit, keine Plan-Reihenfolge, keinen Flag-Default |
| **Edge Function Guards** | `_shared/entitlements.ts` (Helfer auf Katalog) | keine Schwelle inline (`requireLimit`/`requireEntitlement` statt `if (n >= 150)`) |
| **`sb-payment-create`** | `computeSbFeeCents` | keine Gebührenformel inline; keinen Client-Betrag als Wahrheit |
| **Stripe-Webhook** | `parseOrgPlanStrict` für Plan; Katalog für Bedeutung | keinen rohen Metadaten-String als Plan |
| **RLS / SQL** | `plan_entitlements` (DB-Spiegel) | keine Konstante in der Policy |
| **Reporting/Analytics** | `plan_pricing`/`plan_entitlements` | keine eigene Preis-Tabelle |
| **Doku** | erklärt; bei Konflikt gilt Katalog | keine abweichende Zahl |

> **Frontend-Re-Export:** `app/src/lib/commercial.ts` re-exportiert den Katalog + reine Helfer (`hasFeature`, `getLimit`, `lowestPlanWith`, `normalizePlan`, Preis-Formatierung `de-DE`/EUR). Das Frontend importiert **diese** Datei, nie `_shared/*` direkt (saubere Layer-Grenze Browser↔Deno), aber die Werte sind identisch (gemeinsames Katalog-Modul, kein Copy).

---

## 9 · Abgrenzung zum VMS-Erbe (nicht übernehmen)

| VMS-Begriff (Blueprint) | Status | Hof-Äquivalent / Behandlung hier |
|---|---|---|
| Rate-Card-/Spend-/Margin-Katalog, Mark-up-Tabellen | ➖ entfällt | SB-Transaktionsgebühr (§6.1) + Abo-Preis (§5) — keine Marge auf Fremdumsatz |
| Plan-Tiering nach **Mitarbeiterzahl** (S/M/L/Enterprise) | ➖ entfällt | `individuell` einstufig (Vertriebsvereinbarung), kein Auto-Tiering |
| „Pilot-Override" als öffentliches Plan-Versprechen | ⚠ optional | Owner-Kulanz-/Beta-Override möglich (auditiert), **nicht** im Katalog als Plan |
| Vendor-/Requisition-/Einsatz-Limits | ➖ entfällt | `max_farms` / `max_products_per_farm` / `max_active_reservations_per_farm` |
| Hetzner-/SCC-gekoppelte Pläne | ➖ entfällt | rein Supabase/Stripe/Cloudflare; kein Self-Host-Bezug im Katalog |

> **Kanon-Verbot eingehalten:** kein Zeitarbeits-/Vendor-Pool-/Requisition-/Timesheet-/Hetzner-Vokabular; durchgängig Hof-Domäne (`CLAUDE.md`: „NIEMALS TempConnect/VMS-Begriffe").

---

## 10 · Implementierungs-Reihenfolge (WAVE_09, payment-vorbereitend)

1. `_shared/commercial-catalog.ts` anlegen (Katalog + `normalizePlan` + `computeSbFeeCents` + Helfer) — **die Quelle zuerst**.
2. `_shared/entitlements.ts` als Guard-Schicht **auf** dem Katalog (re-export, kein zweiter Katalog).
3. Migration `00XX_commercial_catalog.sql` (Tabellen + RLS + Seed aus Katalog) — additiv.
4. `app/src/lib/commercial.ts` Frontend-Re-Export (Browser-Layer).
5. Drift-Test-Suite (§7) verdrahten — **blockierendes** Commercial-Gate.
6. `bootstrap` um `{ plan, catalogVersion, entitlements, limits, usage }` erweitern (§6.3).
7. Doku-Tabellen (PLANS_AND_LIMITS / ROLE_FEATURE_MATRIX / PRICING) gegen catalog↔doc-Test ausrichten.
8. Stripe-`price`-IDs + Env + Setup-Check (§5.2) — **Owner-Freigabe** (Geld).

---

*Letzte Aktualisierung: Phase 1 · WAVE_09 (Vorzieh-Spezifikation) · 2026-06-19*
*Zuständig: Claude (Commercial + payment-engineer) · Freigabe: Owner (Preise/Geld = Owner-Entscheidung, Confirm + Reason + Audit)*
*Origin-Hierarchie: Stripe price-ID (Geld) > COMMERCIAL_CATALOG (Limits/Flags/SB-Gebühr/Anzeige-Preis) > DB-Seed > bootstrap > UI/Doku.*
*Querverweise: `docs/product/PLANS_AND_LIMITS.md` (menschenlesbar) · `docs/product/ROLE_FEATURE_MATRIX.md` · `docs/ROLE_AND_PERMISSION_MODEL.md` §5 · `docs/DATABASE_MODEL.md` §2/§4.1/§4.7 · `docs/COMPLIANCE_MODEL.md` §2/§4/§9/§10 · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` · `docs/PRICING.md` (geplant) · `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant) · `docs/STRIPE-SETUP.md` (geplant)*
*Hinweis: Wirksame Abo-Beträge = Stripe-`price`-IDs (unter Owner-Freigabe), nicht der Anzeige-Preis im Katalog.*
