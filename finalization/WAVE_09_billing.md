# WAVE_09 — Billing: Erzeuger-Abo + Vorbereitung SB-Bezahl-USP

> **Phase:** 1 — Fundament & Kernprodukt. **Prio:** P0 (Geldfluss = Marktstart-Pflicht-Set). **Voraussetzung:** WAVE_02 (Datenmodell + RLS, Isolationstest grün), WAVE_03 (Rollen/Sichtbarkeit), WAVE_06 (Supabase Auth, Turnstile). **Empfohlen vorab:** WAVE_01 (Hygiene-Gate grün — sonst kein sauberer Edge-Function-Deploy).
> **Ausführungsagent:** Claude (gesamter Stack) + Subagenten **payment-engineer** (Stripe/Connect + SB-USP, EIN idempotenter Webhook), **edge-functions-spezialist** (Deno: Zod, Rechteprüfung, service role, Audit), **db-rls-spezialist** (Entitlement-Tabelle/-View + RLS), **security-auditor** (read-only: Signatur, Secret-Trennung, kein Client-Betrag), **qa-tester** (Webhook-Idempotenz, Entitlement-Gates, Cross-Org-Negativtests), **frontend-design-guardian** (Billing-UI im Editorial-Token-System).
> **Owner-Freigabe erforderlich für:** Stripe-Account/-Produkte/-Preise (Geld), Setzen produktiver Stripe-Secrets, Anlegen/Registrieren des Webhook-Endpunkts, jedes `supabase functions deploy`, jeder `git commit`/`push`. Bis dahin ist diese Welle **repo-lokal, reversibel** (Migration-Datei, Edge-Function-Code, Frontend, Doku) und wird vorbereitet, nicht live geschaltet.
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/WAVE_09_billing.md`, read-only) auf **React+Vite+TS · Supabase · Cloudflare · Stripe**. Zentraler Unterschied zum Blueprint: TempConnect *härtet* eine bestehende Node/Express-Billing-Schicht; **hier liegt die Mechanik bereits real im Repo** (`supabase/migrations/0002_payments.sql`, `supabase/functions/{create-checkout,stripe-webhook}`, `supabase/functions/_shared/stripe.ts`, `src/lib/payments.ts`). Diese Welle **schließt die echten Lücken** dieser Mechanik (Entitlements werden geschrieben, aber nirgends gelesen/erzwungen; Idempotenz-Cleanup; Billing-UI-Verdrahtung; Gate-10-Anbindung) statt von Null zu bauen.

---

## Ziel

LokaleBauernConnect hat **genau eine serverseitige Geld-Wahrheit** und macht aus „Stripe ist verkabelt" ein **durchsetzbares Geschäftsmodell**:

1. **Erzeuger-Abo (sofort monetarisierbar).** Ein Erzeuger schließt über Stripe Checkout ein Abo ab (`demo` → `basis` → `plus` → `pro` → `individuell`). Status + Periodenende landen serverseitig in `subscriptions`; der Webhook ist die einzige Wahrheit.
2. **Entitlements werden nicht nur geschrieben, sondern gelesen & erzwungen.** Heute schreibt der Webhook `subscriptions.status='active'`, **aber kein einziger Pfad liest das je aus.** Diese Welle schließt die Kette: Plan → konkrete Limits (z. B. Anzahl Höfe/Produkte/Standorte, SB-Stände, Bilder) → serverseitige Durchsetzung in den mutierenden Edge Functions + sichtbarer Plan-Lock + Upgrade-Pfad in der UI. Ohne diesen Schritt ist das Abo Deko.
3. **SB-Bezahl-USP vorbereitet, nicht halb-live.** Die SB-Zahlung (QR am unbemannten Stand → Stripe → Quittung) ist in `create-checkout` (`mode:'sb_payment'`) + Webhook bereits angelegt. Diese Welle **härtet** sie (Preis nur serverseitig, Org-Bindung, Audit, Quittung, Zero-State) und **schaltet sie hinter ein Feature-Flag/Plan-Entitlement** — die volle Strecke (QR-Generierung, Stand-Onboarding, Erzeuger-Einnahmen-Dashboard) ist **Phase 4 Track A** und bleibt dort. Hier: kein toter Pfad, aber auch kein verfrühter Go-Live.
4. **Webhook idempotent & robust.** Jedes Stripe-Event wird **genau einmal** verarbeitet — auch bei Retries, Doppelzustellung, Teilfehler. Signaturpflicht, Idempotenz-Schlüssel, Aufräumen alter Event-IDs, korrektes Verhalten bei Handler-Fehlern (Stripe muss erneut zustellen dürfen).
5. **Vermittler-Compliance durchgängig.** Plattform = Zahlungsanbindung, kein Eigenverkauf/keine Beratung. Disclaimer auf jeder Zahlfläche; Quittung weist Hof als Verkäufer aus, Plattform als Vermittler.

Diese Welle ist der **Geldfluss-Türsteher**: erst wenn ihr Gate grün ist (idempotenter Webhook, durchgesetzte Entitlements, verdrahtete Billing-UI, Audit lückenlos), ist **Phase 5 Gate 10 (erste zahlende Erzeuger)** technisch freigegeben.

---

## Ist-Zustand (repo-genau geprüft)

| Datei / Fakt | Stand | Konsequenz für diese Welle |
|---|---|---|
| `supabase/migrations/0002_payments.sql` | ✅ real: Enums `payment_status`/`subscription_status`; Tabellen `subscriptions`, `sb_payments`, `payment_events` (Idempotenz); `reservations` um `payment_method`/`payment_status` erweitert; RLS deny-by-default, Owner liest org-gebunden, `payment_events` ohne Policy (nur service_role) | **Solide Basis.** Fehlt: **Entitlement-Quelle** (Plan→Limits), `payment_events.received_at`-Cleanup-Index, `subscriptions`-Eindeutigkeit pro Org. → additive Migration `0005_entitlements.sql`. |
| `supabase/functions/create-checkout/index.ts` | ✅ real: erzeugt Checkout-Session für `sb_payment` **und** `subscription`; **Preis serverseitig** aus `products.price` bzw. `priceIdForPlan`; `automatic_payment_methods` | Fehlt: **Zod-Validierung** an der Grenze, **Rechteprüfung** (wer darf für *welche* org ein Abo kaufen?), **Turnstile** für die öffentliche SB-Zahlung, **Entitlement-Vorabcheck**. → härten. |
| `supabase/functions/stripe-webhook/index.ts` | ✅ real: Signaturprüfung (`constructEventAsync`), Idempotenz via `payment_events`-PK-Insert, behandelt `checkout.session.completed` (sb_payment + subscription), `customer.subscription.updated/deleted`; Audit + Quittungs-Mail | Lücken: (a) `dup.error` → `200 'duplicate'` verschluckt **echte** Insert-Fehler (DB down) als „Duplikat"; (b) `invoice.payment_failed`/`paid` (Renewal → `past_due`/Periode) **nicht** behandelt; (c) `current_period_end` bei Erst-Checkout nicht gesetzt; (d) kein Cleanup alter Events. → härten. |
| `supabase/functions/_shared/stripe.ts` | ✅ real: `getStripe()` (env-gated, ohne Key → null), `priceIdForPlan` (`basis/plus/pro` aus Secrets), `mapSubStatus` | Fehlt: `individuell` ist im DB-Check erlaubt, aber **nicht** in `priceIdForPlan` (Verkauf über Sales/Contact, kein Self-Checkout — bewusst, aber dokumentieren). → Entitlement-Mapping ergänzen. |
| `supabase/functions/_shared/supabaseAdmin.ts` | ✅ real: `admin()` service-role-Client, RLS-Bypass, nur Edge | Korrekt. Entitlement-Reads im Frontend laufen **nicht** hierüber, sondern über RLS-Select auf `subscriptions`. |
| `src/lib/payments.ts` | ✅ real: `startCheckout`/`goToCheckout`, ohne Supabase-Konfig → `{error:'not_configured'}` (kein toter Button) | Fehlt: **Entitlement-Read-Helper** (`getEntitlements(orgId)`), **kein Billing-UI** das diese Helfer nutzt. → ergänzen. |
| `src/pages/` | nur `FinderPage.tsx` | **Keine Billing-/Plan-/Konto-Seite** → Abo ist nicht abschließbar in der UI. → `BillingPage` + `usePlanGate` ergänzen. |
| `src/lib/{supabase,types}.ts` | ✅ vorhanden | Typen für `subscriptions`/`entitlements` ergänzen (strict). |
| Stripe-Account / Produkte / Preise / Webhook-Endpunkt | ⬜ Owner | **STOP-Punkt** — Geld/Account. Hier nur dokumentiert + Code vorbereitet. |

> **Abweichung zum Blueprint dokumentiert (Stop-Regel: „API/Service nicht gefunden / Entitlement greift nicht"):** Es gibt keine bestehende Billing-Service-Schicht zu härten — die Mechanik liegt in **Edge Functions + Postgres**. Vor allem aber: **die Entitlement-Durchsetzung fehlt vollständig** (Triage-Kategorie 5 „Commercial — Plan/Entitlement greift nicht"). Das ist der eigentliche Wert dieser Welle, nicht „noch eine Checkout-Route".

---

## Aufgaben

### 1. Entitlement-Quelle: Plan → Limits (P0, DB)

Heute existiert **kein** maschinenlesbares Mapping „Plan → was ist erlaubt". Ohne das kann nichts durchgesetzt werden. Neue **additive** Migration `app/supabase/migrations/0005_entitlements.sql` — kanonische Plan-Limits als Tabelle (nicht hardcodiert, vom Owner ohne Deploy pflegbar) + eine `current_entitlements`-View, die Org → aktiver Plan → Limits auflöst.

```sql
-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE_09: Entitlements (Plan → Limits)
-- Additiv. Quelle der Wahrheit für Plan-Locks. RLS deny-by-default.
-- Limits owner-pflegbar (kein Deploy nötig). Durchsetzung serverseitig.
-- ════════════════════════════════════════════════════════════════

-- Kanonische Plan-Limits (Imperium-Pläne: demo/basis/plus/pro/individuell).
create table if not exists plan_entitlements (
  plan             text primary key
                   check (plan in ('demo','basis','plus','pro','individuell')),
  max_farms        integer not null default 1,   -- Höfe je Org
  max_products     integer not null default 10,  -- Produkte je Org
  max_locations    integer not null default 1,   -- Standorte (Hofladen/Marktstand/SB-Stand)
  sb_payments      boolean not null default false,-- SB-Bezahl-USP freigeschaltet?
  max_images       integer not null default 3,   -- Bilder je Hof
  notifications    boolean not null default false,-- Saison-/Verfügbarkeits-Alerts
  updated_at       timestamptz not null default now()
);

insert into plan_entitlements (plan, max_farms, max_products, max_locations, sb_payments, max_images, notifications) values
  ('demo',        1,   5,  1, false, 1,  false),
  ('basis',       1,  25,  1, false, 5,  false),
  ('plus',        3,  150, 5, true,  15, true),
  ('pro',         10, 1000,25, true, 50, true),
  ('individuell', 100,100000,1000, true, 1000, true)
on conflict (plan) do nothing;  -- additiv: vorhandene Owner-Werte nicht überschreiben

drop trigger if exists plan_entitlements_set_updated on plan_entitlements;
create trigger plan_entitlements_set_updated before update on plan_entitlements
  for each row execute function set_updated_at();

-- View: aktueller, durchsetzbarer Anspruch je Org.
-- Inaktives/abgelaufenes Abo fällt auf 'demo' zurück (deny-by-default-Geist).
create or replace view current_entitlements as
select
  o.id as org_id,
  coalesce(
    case
      when s.status = 'active' and (s.current_period_end is null or s.current_period_end > now())
        then s.plan
      when s.status in ('trialing','past_due') and s.current_period_end > now()
        then s.plan                              -- Kulanz bis Periodenende
      else 'demo'
    end, 'demo') as effective_plan
from orgs o
left join subscriptions s on s.org_id = o.id
where o.deleted_at is null;

-- Eindeutigkeit: max. ein Abo-Datensatz je Org (Upsert-Sicherheit).
create unique index if not exists subscriptions_one_per_org on subscriptions (org_id);

-- Idempotenz-Cleanup: alte Event-IDs effizient löschbar (Aufgabe 4).
create index if not exists payment_events_received_idx on payment_events (received_at);

-- ── RLS ────────────────────────────────────────────────────────
alter table plan_entitlements enable row level security;

-- Plan-Limits sind öffentlich lesbar (Pricing-Seite zeigt sie ehrlich an).
drop policy if exists plan_entitlements_public_read on plan_entitlements;
create policy plan_entitlements_public_read on plan_entitlements
  for select to anon, authenticated using (true);
-- Schreiben: keine Policy → nur service_role (Owner-Konsole/Migration).

-- current_entitlements ist eine View; sie erbt RLS der Basistabellen
-- (subscriptions: Owner liest nur eigene Org). security_invoker erzwingen,
-- damit die View NICHT mit den Rechten des Erstellers fremde Orgs offenlegt.
alter view current_entitlements set (security_invoker = on);
```

> **Warum Tabelle statt Konstante:** Limits ändern sich kommerziell häufiger als Code deployt wird; eine Tabelle macht sie owner-pflegbar (Triage-Kategorie 5) und in der Pricing-UI **ehrlich** anzeigbar — keine Schattenwahrheit. **Warum Fallback `demo`:** abgelaufenes/inaktives Abo darf nie „pro"-Limits behalten — deny-by-default auch kommerziell. **`security_invoker = on`** ist hier sicherheitskritisch: ohne sie würde die View Org-Grenzen umgehen (Pfeiler 1 verletzt).

### 2. Entitlement-Read-Helper (Frontend) — kein Plan-Lock ohne Datenquelle (P0, FE)

`app/src/lib/payments.ts` ergänzen (bestehende Exporte unangetastet) — liest den **durchgesetzten** Anspruch über RLS (nicht raten):

```ts
// Entitlements der eigenen Org (RLS schützt: man sieht nur die eigene).
export interface Entitlements {
  plan: string
  maxFarms: number
  maxProducts: number
  maxLocations: number
  sbPayments: boolean
  maxImages: number
  notifications: boolean
}

export async function getEntitlements(orgId: string): Promise<Entitlements | null> {
  if (!isSupabaseConfigured || !supabase) return null
  // Effektiver Plan via View, Limits via plan_entitlements (beide RLS-geschützt).
  const { data: ent } = await supabase
    .from('current_entitlements').select('effective_plan').eq('org_id', orgId).maybeSingle()
  const plan = (ent as { effective_plan?: string } | null)?.effective_plan ?? 'demo'
  const { data: lim } = await supabase
    .from('plan_entitlements')
    .select('max_farms, max_products, max_locations, sb_payments, max_images, notifications')
    .eq('plan', plan).maybeSingle()
  if (!lim) return null
  return {
    plan,
    maxFarms: lim.max_farms, maxProducts: lim.max_products, maxLocations: lim.max_locations,
    sbPayments: lim.sb_payments, maxImages: lim.max_images, notifications: lim.notifications,
  }
}
```

> Anker Pfeiler 4 (RBAC/Plan-Locks zeigen konkreten Upgrade-Pfad): Das Frontend **liest** Entitlements, sperrt UI sichtbar und verlinkt auf Checkout — die **echte** Durchsetzung liegt aber serverseitig (Aufgabe 3). Frontend spiegelt nur (AGENTS.md: „Backend/RLS führt").

### 3. Serverseitige Entitlement-Durchsetzung (P0, Edge — das Herzstück)

Entitlements müssen **vor jeder mutierenden Aktion** serverseitig geprüft werden — nicht nur im Client. Neuer Shared-Helper `app/supabase/functions/_shared/entitlements.ts`:

```ts
// Serverseitige Entitlement-Prüfung. Nutzt service_role (RLS-Bypass) bewusst,
// prüft aber IMMER die org-Bindung explizit. Quelle: current_entitlements + plan_entitlements.
import { admin } from './supabaseAdmin.ts'

export interface Limits {
  plan: string; max_farms: number; max_products: number; max_locations: number
  sb_payments: boolean; max_images: number; notifications: boolean
}

export async function limitsForOrg(orgId: string): Promise<Limits> {
  const db = admin()
  const { data: ent } = await db.from('current_entitlements')
    .select('effective_plan').eq('org_id', orgId).maybeSingle()
  const plan = ent?.effective_plan ?? 'demo'
  const { data: lim } = await db.from('plan_entitlements').select('*').eq('plan', plan).maybeSingle()
  if (!lim) return { plan: 'demo', max_farms: 1, max_products: 5, max_locations: 1, sb_payments: false, max_images: 1, notifications: false }
  return lim as Limits
}

// Wirft 'limit_reached', wenn das Anlegen die Plan-Grenze überschreiten würde.
export async function assertCanCreate(orgId: string, kind: 'farm' | 'product' | 'location'): Promise<void> {
  const db = admin()
  const lim = await limitsForOrg(orgId)
  const table = kind === 'farm' ? 'farms' : kind === 'product' ? 'products' : 'org_locations'
  const cap = kind === 'farm' ? lim.max_farms : kind === 'product' ? lim.max_products : lim.max_locations
  const { count } = await db.from(table).select('id', { count: 'exact', head: true })
    .eq('org_id', orgId).is('deleted_at', null)
  if ((count ?? 0) >= cap) throw new Error('limit_reached')
}

export async function assertSbPaymentsEnabled(orgId: string): Promise<void> {
  const lim = await limitsForOrg(orgId)
  if (!lim.sb_payments) throw new Error('sb_payments_not_in_plan')
}
```

Dieser Helper wird in `create-checkout` (vor `sb_payment`-Session: `assertSbPaymentsEnabled`) sowie in den Erzeuger-Mutations-Functions (Hof/Produkt/Standort anlegen — soweit in WAVE_04/Phase 4 vorhanden) eingebunden. Fehlt eine dieser Functions noch, wird der **Aufruf vorbereitet + dokumentiert**, kein toter Pfad erzeugt.

> Anker Pfeiler 1+5: service_role umgeht RLS — deshalb prüft der Helper **explizit** `eq('org_id', orgId)`; ein „Limit reached" ist ein kommerzieller 4xx (kein 500), und jede abgelehnte Mutation wird im aufrufenden Handler auditiert.

### 4. Webhook härten — EINE idempotente Wahrheit (P0, Edge)

`app/supabase/functions/stripe-webhook/index.ts` gezielt nachschärfen (vorhandene Struktur bleibt):

**4a. Insert-Fehler ≠ Duplikat.** Heute: `if (dup.error) return 200 'duplicate'` — das verschluckt einen DB-Ausfall als „schon verarbeitet" und verliert das Event still. Korrekt nach Fehlercode unterscheiden (Postgres `23505` = unique_violation = echtes Duplikat → 200; alles andere → 500, damit Stripe **erneut** zustellt):

```ts
const dup = await db.from('payment_events').insert({ id: event.id, type: event.type })
if (dup.error) {
  // 23505 = unique_violation → echtes Duplikat, bereits verarbeitet → ack.
  if (dup.error.code === '23505') return new Response('duplicate', { status: 200 })
  console.error('[webhook] payment_events insert failed:', dup.error)
  return new Response('store_error', { status: 500 })   // Stripe retried
}
```

**4b. Renewal-/Fehlzahlungs-Events behandeln** (Abo lebt nach dem ersten Checkout weiter):

```ts
} else if (event.type === 'invoice.paid') {
  const inv = event.data.object as Stripe.Invoice
  if (typeof inv.subscription === 'string') {
    const periodEnd = inv.lines?.data?.[0]?.period?.end
    await db.from('subscriptions').update({
      status: 'active',
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }).eq('stripe_subscription_id', inv.subscription)
  }
} else if (event.type === 'invoice.payment_failed') {
  const inv = event.data.object as Stripe.Invoice
  if (typeof inv.subscription === 'string') {
    await db.from('subscriptions').update({ status: 'past_due' })
      .eq('stripe_subscription_id', inv.subscription)
  }
}
```

**4c. `current_period_end` schon beim Erst-Checkout setzen** (Subscription expandieren oder nachladen), damit `current_entitlements` sofort korrekt rechnet — sonst gilt das frische Abo bis zum ersten `invoice.paid` als unbegrenzt:

```ts
// im checkout.session.completed / subscription-Zweig, nach upsert:
if (typeof s.subscription === 'string') {
  const sub = await stripe.subscriptions.retrieve(s.subscription)
  await db.from('subscriptions').update({
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  }).eq('stripe_subscription_id', s.subscription)
}
```

**4d. Idempotenz-Cleanup** (verhindert unbegrenztes Wachsen von `payment_events`). Als geplanter Supabase-Cron/Edge-Function-Job, dokumentiert (nicht jetzt deployt):

```sql
-- Aufbewahrung 90 Tage (Stripe-Retry-Fenster ist klein; 90d ist großzügig sicher).
delete from payment_events where received_at < now() - interval '90 days';
```

> **Idempotenz-Invariante (Pfeiler/AGENTS):** Event-ID ist PK; **erst Event speichern, dann verarbeiten** — wäre die Reihenfolge umgekehrt, könnte ein Crash nach der Mutation zu Doppelverarbeitung führen. Der `200` bei `23505` ist korrekt, weil Stripe nur „ack/retry" unterscheidet; Handler-Fehler → `500` → Stripe wiederholt → Event-ID schon da → 200 → exactly-once. **Diese Reihenfolge nicht umdrehen.**

### 5. `create-checkout` härten — Zod, Rechte, Turnstile, kein Client-Betrag (P0, Edge)

`app/supabase/functions/create-checkout/index.ts`:

- **Zod an der Grenze** (Body-Schema für beide Modi; ungültig → 400). Anker AGENTS „Zod an allen Eingangsgrenzen".
- **SB-Zahlung ist öffentlich** (Käufer am Stand, ggf. nicht eingeloggt) → **Turnstile-Token** pflicht (anti-Abuse) **+ `assertSbPaymentsEnabled(org_id)`** des Hofs (Plan-Gate). Betrag bleibt **ausschließlich** aus `products.price` (vorhanden — beibehalten, nie aus dem Body).
- **Abo-Checkout** ist authentifiziert → Aufrufer muss **Mitglied der `orgId`** sein (`is_org_member`/`profiles`), sonst 403. Heute nimmt die Function `body.orgId` ungeprüft — das erlaubt, ein Abo einer **fremden** Org zuzuweisen. Schließen:

```ts
// Abo: nur für die eigene Org. JWT des Aufrufers verifizieren.
const authed = await userClientFromReq(req)          // anon-Client mit Bearer-Token
const { data: { user } } = await authed.auth.getUser()
if (!user) return json({ error: 'auth_required' }, 401)
const { data: member } = await admin()
  .from('profiles').select('org_id').eq('user_id', user.id).eq('org_id', body.orgId).maybeSingle()
if (!member) return json({ error: 'forbidden_org' }, 403)
```

> Anker Pfeiler 1+4 + Stop-Regel „Org-Scope serverseitig nicht prüfbar": Ohne diese Prüfung wäre der Abo-Kauf eine Cross-Org-Lücke. Der Preis war schon korrekt serverseitig — diese Welle schließt die **Identitäts**-Lücke.

### 6. Billing-UI verdrahten — sonst ist das Abo nicht abschließbar (P0, FE)

Neu: `app/src/pages/BillingPage.tsx` + Hook `app/src/lib/usePlanGate.ts`. Vollständige Kette (Pfeiler-Pflicht End-to-End):

- **Plan-Vergleich** aus `plan_entitlements` (echte Daten, kein Fake) → ehrliche Limits je Plan.
- **Aktueller Plan-Badge** aus `current_entitlements` (Zero-State: „Kein aktives Abo — Plan `demo`").
- **„Plan wählen"-Button** → `goToCheckout({ mode:'subscription', plan, orgId })` → Stripe → Rückkehr auf `successUrl` (`/konto/billing?status=success`) mit Lade-/Fehler-/Erfolgszustand.
- **`individuell`** zeigt **kein** Checkout-Button, sondern „Vertrieb kontaktieren" (Deep-Link), weil `priceIdForPlan` ihn bewusst nicht führt — kein toter Button.
- **Plan-Lock-Muster** (`usePlanGate`): z. B. „Weiterer Hof" deaktiviert wenn `farms_count >= maxFarms`, mit Inline-Hinweis „Im Plan `basis` ist 1 Hof enthalten — upgraden für mehr" + Link auf Billing.
- **Vermittler-Disclaimer** unter jeder Zahlfläche (i18n-content-spezialist): „LokaleBauernConnect vermittelt die Zahlung; Verkäufer ist der jeweilige Hof. Keine Beratung, kein Eigenverkauf."
- **Editorial-Tokens only** (frontend-design-guardian): Farben/Spacing aus `src/styles/theme.css`, keine Deko-Emojis.

> Anker Pfeiler 2 (Zero-State), 3 (Scope-Transparenz: zeigt „Plan + Periodenende"), 7 (Deep-Links tragen `orgId`, bauen nie org-fremde URLs). Ohne diese Seite ist WAVE_09 nicht „end-to-end" und das Abo bleibt unverkäuflich.

### 7. SB-Bezahl-USP — vorbereiten, nicht verfrüht live (P0-Scope-Disziplin)

- SB-Pfad bleibt hinter `plan_entitlements.sb_payments` (Aufgabe 1) + Feature-Flag. `create-checkout`/Webhook sind bereit, aber die **vollständige** Strecke (QR-Generierung pro `org_locations`-SB-Stand, Stand-Onboarding, Erzeuger-Einnahmen-/Schwund-Dashboard, Quittung mit Hof als Verkäufer) ist **Phase 4 Track A** (`finalization/phase4_vertical/TRACK_A_SB_PAYMENT.md`) + eigener ADR.
- Diese Welle liefert: gehärteten Checkout, korrekte Quittung (Hof = Verkäufer, Plattform = Vermittler), Audit `sb_payment.paid`, Zero-State, und das **Entitlement-Gate** — damit Track A ohne Nacharbeit andocken kann.

> Anker Doppel-Ziel + §0.3 Wirtschaftlichkeit: kein verfrühter Voll-Ausbau ohne aktiven Stand-Bestand; aber auch kein toter Pfad. Der monetarisierbare Hebel (kleine SB-Gebühr) wird in Track A scharfgeschaltet, hier sauber vorbereitet.

### 8. Stripe-Secrets & Produkte/Preise dokumentieren (P0-Doku, Ausführung Owner)

Server-seitige Secrets (nur als Edge-Function-Secrets, nie `VITE_`, nie im Repo/Log). In `app/docs/STRIPE-SETUP.md` dokumentieren (Werte = Platzhalter):

| Secret | Zweck |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` — Server-API |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` — Signaturprüfung im `stripe-webhook` |
| `STRIPE_PRICE_BASIS` / `_PLUS` / `_PRO` | Stripe-Price-IDs (`price_…`) je Self-Checkout-Plan |
| `PUBLIC_APP_URL` | Default für success/cancel-URLs |
| `TURNSTILE_SECRET` | Turnstile-Verifikation der öffentlichen SB-Zahlung |

> `individuell` hat **bewusst keine** Price-ID (Vertriebs-/Vertragsplan). `demo` ist der Default-Fallback ohne Stripe.

---

## Konkrete Befehle (Reihenfolge)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Frontend bauen/prüfen — exakt was die CI fährt (nach FE-/Helper-Änderungen)
npm ci
npm run typecheck          # tsc --noEmit (strict)
npm run build              # tsc --noEmit && vite build → dist/

# 2) Edge Functions (Deno) lokal prüfen (Toolchain getrennt von npm)
cd supabase/functions
deno lint
deno check create-checkout/index.ts stripe-webhook/index.ts _shared/entitlements.ts
cd ../..

# 3) Migration lokal anwenden (lokale Supabase) + Entitlements verifizieren
supabase start
supabase db reset                 # spielt 0001..0005 + seed neu ein (lokal!)
# Smoke: View liefert effektiven Plan je Org
supabase db query "select org_id, effective_plan from current_entitlements limit 5;"
supabase db query "select * from plan_entitlements order by max_products;"

# 4) Webhook-Idempotenz lokal testen (Stripe CLI) — NUR Test-Keys
supabase functions serve stripe-webhook --no-verify-jwt
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed   # 1x senden
stripe trigger checkout.session.completed   # erneut → Handler MUSS 2. als duplicate (200) ignorieren
supabase db query "select id, type, count(*) over () from payment_events;"  # genau 1 Zeile/Event-ID

# 5) Renewal-/Fehlzahlungs-Pfade
stripe trigger invoice.paid
stripe trigger invoice.payment_failed       # → subscriptions.status = past_due
supabase db query "select org_id, plan, status, current_period_end from subscriptions;"

# 6) Entitlement-Durchsetzung (Negativtest): Limit überschreiten → limit_reached (kein 500)
#    via Erzeuger-Mutations-Function bzw. assertCanCreate-Unit (qa-tester)

# 7) Deploy — NUR mit Owner-Freigabe (Geld/Account):
# supabase db push                                   # Migration 0005 produktiv
# supabase functions deploy create-checkout stripe-webhook
# supabase secrets set STRIPE_SECRET_KEY=<sk_...> STRIPE_WEBHOOK_SECRET=<whsec_...> \
#   STRIPE_PRICE_BASIS=<price_...> STRIPE_PRICE_PLUS=<price_...> STRIPE_PRICE_PRO=<price_...> \
#   PUBLIC_APP_URL=https://<domain> TURNSTILE_SECRET=<key>
# supabase secrets list                              # nur Namen, keine Werte
# Stripe-Dashboard → Webhook-Endpunkt registrieren (events: checkout.session.completed,
#   customer.subscription.updated/deleted, invoice.paid, invoice.payment_failed)
```

> Stripe-CLI/Trigger laufen **ausschließlich** gegen Test-Keys. Kein `sk_live_` in lokalen Tests, kein Secret im Log.

---

## Acceptance (Akzeptanzkriterien)

- [ ] **Migration additiv & grün:** `supabase db reset` spielt `0005_entitlements.sql` fehlerfrei ein; `plan_entitlements` (5 Pläne) + View `current_entitlements` existieren; `subscriptions_one_per_org`-Unique-Index aktiv.
- [ ] **Entitlement-Wahrheit:** `current_entitlements` liefert je Org den effektiven Plan; **abgelaufenes/inaktives Abo → `demo`** (kein „pro"-Rest). View hat `security_invoker = on` (kein Org-Leak).
- [ ] **Webhook idempotent:** dasselbe Stripe-Event 2× → genau **eine** Mutation, zweiter Aufruf `200 duplicate`; `payment_events` hat **eine** Zeile je Event-ID.
- [ ] **Webhook robust:** DB-Insert-Fehler (kein 23505) → **500** (Stripe retried), nicht still als „duplicate" verschluckt.
- [ ] **Renewal/Fehlzahlung:** `invoice.paid` → `active` + `current_period_end` aktualisiert; `invoice.payment_failed` → `past_due`.
- [ ] **Erst-Checkout:** nach `checkout.session.completed` (subscription) ist `current_period_end` gesetzt (Abo gilt nicht fälschlich als unbegrenzt).
- [ ] **Preis serverseitig:** SB-Betrag stammt ausschließlich aus `products.price`; manipulierter Body-Betrag wird ignoriert (Negativtest).
- [ ] **Org-Scope Abo:** Abo-Checkout für **fremde** `orgId` → **403** (`forbidden_org`), nie 200.
- [ ] **Entitlement-Durchsetzung:** Anlegen über Plan-Limit → kommerzieller Fehler `limit_reached` (4xx), kein 500; SB-Checkout ohne `sb_payments`-Anspruch → abgelehnt.
- [ ] **Zod/Turnstile:** ungültiger Body → 400; öffentliche SB-Zahlung ohne gültiges Turnstile-Token → abgelehnt.
- [ ] **Billing-UI end-to-end:** `BillingPage` zeigt Pläne (echte Limits), aktuellen Plan (Zero-State bei keinem Abo), führt via Checkout zu Stripe und zurück (success/cancel-Zustände); `individuell` → „Vertrieb kontaktieren" (kein toter Button); Plan-Lock zeigt konkreten Upgrade-Pfad; Vermittler-Disclaimer sichtbar.
- [ ] **Audit lückenlos:** `subscription.activated`, `sb_payment.paid` (+ abgelehnte Mutationen) im `audit_log` mit org_id; kein Secret im Log.
- [ ] **Build/Typecheck:** `npm run build` grün (strict); `deno lint` + `deno check` für beide Functions + `_shared/entitlements.ts` grün.
- [ ] **Secret-Trennung:** kein `VITE_STRIPE_*`/`VITE_SERVICE_ROLE`; `supabase secrets list` zeigt nur Namen.

---

## Gate (blockierend)

> **WAVE_09-Billing-Gate** muss grün sein, bevor **Phase 5 Gate 10 (erste zahlende Erzeuger)** freigegeben wird. Es ist der **kommerzielle Vorgate** zum Marktstart-Pflicht-Set (PHASEN.md: „mind. ein Geldfluss").

```
GATE WAVE_09:
  ✅ Migration 0005 additiv grün  ·  current_entitlements korrekt (Fallback demo)
  ✅ Webhook idempotent (Doppel-Event → 1 Mutation)  ·  robust (Insert-Fehler → 500/Retry)
  ✅ Renewal/Fehlzahlung verarbeitet (invoice.paid/payment_failed)
  ✅ Entitlements serverseitig DURCHGESETZT (limit_reached 4xx, SB-Gate)
  ✅ Abo-Org-Scope: fremde orgId → 403  ·  Preis nur serverseitig
  ✅ Billing-UI end-to-end (Pläne, Zero-State, Checkout-Rückkehr, Plan-Lock, Disclaimer)
  ✅ Audit lückenlos  ·  Secret-Trennung sauber  ·  build + deno check grün
```

**Stop-Regeln in dieser Welle:**
- Stripe-Produkte/Preise anlegen, produktive Stripe-Secrets setzen, Webhook-Endpunkt registrieren, `supabase functions deploy`, `db push` → **STOP**, Owner-Freigabe (Geld/Account/Deploy).
- `priceIdForPlan` liefert für einen *self-checkout*-Plan kein Price-ID (Secret fehlt) → kein „leerer" Checkout: Function gibt `plan_not_configured` (400), UI zeigt „bald verfügbar/Vertrieb kontaktieren" — **kein toter Button**.
- Entitlement-Durchsetzung serverseitig nicht möglich (Mutations-Function fehlt noch) → **STOP/dokumentieren**, kein nur-Client-Gate als „fertig" deklarieren (Triage-Kategorie 5).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_09 — Billing (Erzeuger-Abo + SB-USP-Vorbereitung)
- Geändert:
  - supabase/migrations/0005_entitlements.sql (NEU: plan_entitlements, current_entitlements,
    subscriptions_one_per_org, payment_events_received_idx)
  - supabase/functions/_shared/entitlements.ts (NEU: limitsForOrg, assertCanCreate, assertSbPaymentsEnabled)
  - supabase/functions/stripe-webhook/index.ts (gehärtet: 23505-Diskriminierung, invoice.paid/
    payment_failed, current_period_end beim Erst-Checkout, Cleanup-Doku)
  - supabase/functions/create-checkout/index.ts (gehärtet: Zod, Org-Scope-403, Turnstile, SB-Entitlement-Gate)
  - src/lib/payments.ts (+ getEntitlements)  ·  src/lib/usePlanGate.ts (NEU)
  - src/pages/BillingPage.tsx (NEU, end-to-end)  ·  src/lib/types.ts (+ Subscription/Entitlements)
  - docs/STRIPE-SETUP.md (NEU/aktualisiert, secret-frei)
- Tests:
  - supabase db reset → 0005 grün; current_entitlements Fallback demo verifiziert
  - Doppel-Event-Webhook → 1 Mutation, 200 duplicate; Insert-Fehler → 500 (Retry)
  - invoice.paid/payment_failed → active/past_due; Erst-Checkout setzt current_period_end
  - Abo fremde orgId → 403; SB-Betrag aus Body manipuliert → ignoriert
  - assertCanCreate über Limit → limit_reached (4xx); SB ohne Anspruch → abgelehnt
  - npm run build grün; deno lint + deno check grün
- Risiken: keine Laufzeit-Risiken repo-lokal; Stripe-Produkte/Preise/Secrets/Webhook-Endpunkt
  + Deploy warten auf Owner-Freigabe (Geld/Account). SB-Voll-Strecke = Phase 4 Track A.
- Nächste Welle: WAVE_10 (Premium UX / Mobile-PWA) bzw. Phase 4 Track A (SB-Bezahlung scharfschalten).

## Billing-Report
- Pläne/Limits (Quelle plan_entitlements, ohne Preise hier): demo/basis/plus/pro/individuell
- Idempotenz-Test (Doppel-Event): 1 Mutation? (ja/nein, Output): <…>
- Entitlement-Durchsetzung (limit_reached/SB-Gate): <…>
- Org-Scope-Negativtest (fremde orgId → 403): <…>
- Offene Owner-Freigaben (Liste, ohne Werte): Stripe-Produkte/Preise · prod. Secrets ·
  Webhook-Endpunkt · functions deploy · db push
```

---

## Übergang

→ Erst wenn das **WAVE_09-Billing-Gate grün** ist: **Phase 5 Gate 10** (erste zahlende Erzeuger) ist technisch freigegeben; **Phase 4 Track A** (SB-Bezahlung scharfschalten) kann ohne Billing-Nacharbeit andocken.

> **Tracker-Pflicht nach Abschluss:** `docs/releases/PHASE_STATUS.md` Zeile „WAVE_09 Billing" auf realen Stand setzen; `MASTER_INDEX.md` Abschnitt 4 (`SUBSCRIPTION_LIFECYCLE.md`, `STRIPE-SETUP.md`) + Abschnitt 7 (`finalization/WAVE_09_billing`) aktualisieren. Wiederverwendbares Muster (Plan→Entitlement-View + serverseitige Durchsetzung + idempotenter Webhook) als **Imperium-Beschleuniger** nach `.claude/memory/patterns/` verdichten; Entscheidung „Entitlements als Tabelle/View, Fallback demo" als **ADR** nach `.claude/memory/decisions/`.
