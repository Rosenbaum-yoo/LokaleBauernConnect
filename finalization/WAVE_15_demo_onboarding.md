# WAVE_15 — Demo & Onboarding (Erzeuger-Onboarding-Wizard · datengetrieben/Zod · gekennzeichnete Demo-Daten)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> **Phase 1, WAVE_15** (`PHASEN.md` → „WAVE_15 Demo/Onboarding: Erzeuger-Onboarding-Wizard (datengetrieben/Zod), Demo-Daten gekennzeichnet"). **Eine Welle pro Session. Letzte Welle der Phase 1.**
> **Prio:** P1 (Marktstart-stützend) mit **P0-Kern**: ohne self-service-fähigen Erzeuger-Onboarding-Wizard kein skalierbarer Erzeuger-Zugang (jeder Hof manuell = 10→300 unmöglich); ohne **eindeutig gekennzeichnete, sauber löschbare Demo-Daten** kein verantwortbarer Verkaufs-/Sales-Demo-Pfad und kein sauberer Go-Live (Demo darf **nie** als Echtdaten im Finder erscheinen).
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.** Formulare **datengetrieben** (ein Schritt-Schema + Zod-Validierung an Client- **und** Edge-Grenze) — nicht handgeschnitzte, divergierende Form-Komponenten.
> **Rolle = VERMITTLER** — kein Eigenverkauf, keine Beratung. Onboarding fragt den Erzeuger nach **seinen** Daten und führt ihn durch die Selbstpflege; die Plattform pflegt **nichts inhaltlich** für ihn. Disclaimer + Lebensmittel-Kennzeichnungs-Hinweis (WAVE_14) bleiben durchgängig sichtbar.
> **Voraussetzung:** WAVE_00 (Baseline/Token-Kanon), WAVE_01 (Release-Hygiene/CI + Secret-Grenze + Hygiene-Gate), WAVE_02 (Datenmodell + RLS: `orgs`, `profiles`, `farms`, `products`, `reservations`, `audit_log`), WAVE_03 (Rollen/Sichtbarkeit: `kaeufer`/`erzeuger`/`staff`/`owner`), WAVE_04 (Kernprodukt Finder/Verfügbarkeit/Reservierung), WAVE_06 (Security: Edge-Guards, `_shared/cors.ts`, Rate-Limit, Turnstile, `audit_log`), WAVE_07 (Staff/Support: **Hof-Verifizierung** — Onboarding mündet in den Verifizierungs-Workflow), WAVE_14 (Legal/DSGVO: Einwilligung, Vermittler-Disclaimer, Lebensmittel-Hinweis). WAVE_15 **macht den Erzeuger-Zugang self-service** und liefert die **kontrollierte Demo-Schicht** — es ändert keine bestehende Geschäftslogik des Kernprodukts.
> **Ausführungsagenten:** Claude (gesamter Stack) + Subagenten **platform-onboarder** (führt die neue Strecke durchs Playbook; wacht: nur Spezial-Schicht, kein Kern-Rebuild), **frontend-design-guardian** (Wizard exakt im Editorial-Token-/Komponenten-System, keine neuen Farben/Fonts, keine Deko-Emojis), **edge-functions-spezialist** (`farm-onboard`-Function: Zod, Rechteprüfung, service_role nur hier, Turnstile, Audit), **db-rls-spezialist** (additive Migration `0009_onboarding_demo.sql`: `farm_onboarding_drafts`, `is_demo`-Flag, Demo-Org, RLS-Isolation), **qa-tester** (Isolationstest, Zod-Boundary, Demo-Sichtbarkeit, Wizard-State-Machine, Resume), **compliance-officer** (Einwilligung, Disclaimer, Demo-Kennzeichnung als DSGVO-/Irreführungs-Schutz), **i18n-content-spezialist** (deutsche Mikrocopy im Editorial/regional-Ton, Hilfe-/Trust-Texte, Kategorien-Seed), **security-auditor** (read-only: kein service_role im Client, kein ungeprüfter Insert, Turnstile am öffentlichen Schritt).
> **Owner-Freigabe erforderlich für:** `supabase db push` / `functions deploy` / produktive Secrets / das **Anlegen der Demo-Org gegen die Produktions-DB** / das **Aktivieren des Demo-Sichtbarkeits-Schalters in Prod** / jeden `git commit`/`push`. Bis dahin ist die Welle **repo-lokal, reversibel** (Migration, Edge-Function, Wizard-UI, Demo-Seed mit `is_demo=true`, Doku) und wird **vorbereitet, nicht live geschaltet**.

---

## 0. Ziel

Ein Erzeuger soll **ohne Telefonat, ohne Staff-Handarbeit** in unter **zehn Minuten** von „nie gehört" zu „mein Hof ist im System angelegt und wartet auf Verifizierung" kommen — geführt durch einen **datengetriebenen, mehrstufigen Onboarding-Wizard**, dessen Schritte, Felder, Validierung und Hilfetexte aus **einer** Schema-Quelle (Zod) generiert werden, nicht aus dupliziertem Form-Code. Parallel erhält die Plattform eine **kontrollierte Demo-Schicht**: realistische, aber **hart als Demo gekennzeichnete** Höfe/Produkte für Sales-Demos und das Owner/Staff-Dashboard, die **garantiert nie** als Echtdaten im öffentlichen Finder auftauchen und mit **einem** Befehl/Knopf restlos entfernbar sind. Konkret und prüfbar:

1. **Datengetriebener Wizard aus einem Zod-Schema (Single Source of Truth).** Schritte, Felder, Pflicht/Optional, Reihenfolge, Hilfetext und Validierung kommen aus `app/src/lib/onboarding/schema.ts`. Dieselbe Zod-Definition validiert im Browser (sofortiges Feedback) **und** in der Edge Function (`farm-onboard`) — keine zweite, divergierende Validierung. Neue Felder = Schema-Änderung an **einer** Stelle.
2. **Mehrstufiger State-Machine-Wizard mit Resume.** Schritte: (1) Hof-Basis (Name, Typ, Adresse/PLZ → Geocoding-Hinweis), (2) Standort & Abholfenster (inkl. Markierung **unbemannter SB-Stand** als USP-Pfad), (3) Sortiment/Kategorien + erste Produkte, (4) Geschichte & Öffnungszeiten + Foto-Upload (Supabase Storage), (5) Einwilligung/Disclaimer + Vorschau → Absenden. Fortschritt wird als **Draft** (`farm_onboarding_drafts`) serverseitig gespeichert; ein angemeldeter Erzeuger kann den Wizard verlassen und exakt dort fortsetzen (kein Datenverlust).
3. **Kein Direkt-Insert aus dem Client.** Der finale Submit geht **nur** über die Edge Function `farm-onboard` (service_role dort), die Zod-validiert, Turnstile prüft (öffentlicher Pfad), Rechte prüft (eingeloggter Erzeuger ↔ eigene `org_id`), den Hof als `verified=false` anlegt und in den **WAVE_07-Verifizierungs-Workflow** überführt (`audit_log`: `farm.onboarded`). Frontend nutzt **nie** service_role; RLS bleibt führend.
4. **Demo-Daten hart gekennzeichnet & isoliert.** Eine dedizierte **Demo-Org** plus `is_demo boolean not null default false` auf `farms`/`products` (additiv). Demo-Inhalte sind: (a) im öffentlichen Finder **standardmäßig unsichtbar** (RLS/Query schließt `is_demo=true` aus, außer im expliziten Demo-Modus), (b) in jeder UI-Oberfläche, in der sie *doch* erscheinen (Owner/Staff/Sales-Demo), mit einem sichtbaren **„Demo"-Badge** versehen, (c) mit **einem** Befehl restlos löschbar (`npm run demo:reset`).
5. **Sales-Demo-Pfad (explizit, abgegrenzt).** Ein gekapselter Demo-Modus (`?demo=1` / Feature-Flag) zeigt die Demo-Höfe **bewusst** an — für Vertriebsgespräche, Screenshots, das Owner-Dashboard — ohne dass jemals Demo in den echten Käufer-Finder leckt. Der Modus ist visuell unmissverständlich („Demo-Ansicht — keine echten Höfe") und an `docs/SALES_DEMO_PATH.md` angebunden.
6. **Zero-State & Leitplanken end-to-end.** Leeres Sortiment, fehlende Pflichtfelder, abgebrochener Upload, Geocoding ohne Treffer, Rate-Limit, Turnstile-Fail → **klare Editorial-Zustände** (Lade/Leer/Fehler), nie ein 500 oder toter Button. Ein Erzeuger ohne Hof sieht eine einladende **Onboarding-Aufforderung** statt einer leeren Seite.
7. **Audit, Disclaimer & Vermittler-Disziplin durchgängig.** Jeder Onboarding-Submit und jede Demo-Mutation ist in `audit_log` (wer/was/warum; bei Demo-Reset `reason` Pflicht). Der Wizard trägt durchgehend den Vermittler-Hinweis und den Lebensmittel-Kennzeichnungs-Hinweis (WAVE_14): die Plattform vermittelt/strukturiert, der Erzeuger verantwortet Inhalt/Angaben.

**Nicht-Ziel dieser Welle:** Käufer-Onboarding/Account-Tour (eigener kleiner Slice, Phase 1 WAVE_10 Premium-UX / Phase 4) — diese Welle ist **Erzeuger**-Onboarding. Kein Stripe-Connect-Onboarding-Flow für Auszahlungen (das ist WAVE_09 Billing / Phase 4 Track A SB-Payment — hier nur der **Verweis/Übergabepunkt** „Zahlungen einrichten" nach erfolgreicher Verifizierung). Keine automatische KI-Befüllung von Hof-Texten (Vermittler-Rolle: wir schreiben nicht für den Erzeuger). Kein Massen-Import/CSV-Bulk-Onboarding (Phase 5 Skalierung). Echte Produktions-Demo-Org wird **nicht** ohne Owner-Freigabe angelegt.

---

## 1. Ist-Zustand (repo-genau geprüft)

| Fakt (real im Repo) | Stand | Konsequenz für WAVE_15 |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` | ✅ `orgs`, `profiles` (`role user_role`: `kaeufer/erzeuger/staff/owner`), `farms` (`verified boolean default false`, `pickup_windows text[]`, `categories product_category[]`), `products` (`availability availability_state`), `reservations`, `audit_log`; RLS deny-by-default; `farms_owner_write`/`products_owner_write` org-gebunden | **Basis des Submits.** Wizard schreibt genau in diese Tabellen über Edge-Function; `verified=false` ist der Onboarding-Eingangszustand → WAVE_07. Keine Schema-Brüche. |
| `app/supabase/migrations/0003_marketplace.sql` | ✅ `org_members` + `is_org_member(org_id)` (Multi-Org, security definer, prüft `auth.uid()`); `org_locations` mit `type in ('hofladen','marktstand','sb_stand','ab_hof')` + `is_unmanned boolean` (USP); Owner-Policies auf `is_org_member` gehoben | **Wizard-Schritt 2** nutzt `org_locations` + `is_unmanned` für den SB-Stand-Pfad. Rechteprüfung im Submit über `is_org_member` (nicht neu erfinden). |
| `app/supabase/migrations/{0002_payments,0003_marketplace}.sql` | ✅ `subscriptions`, `sb_payments`, `credits_ledger` | Onboarding endet mit **Übergabepunkt** „Zahlungen/Abo einrichten" (Verweis auf WAVE_09 / Phase 4 Track A) — kein Stripe-Flow in dieser Welle. |
| `app/src/lib/types.ts` | ✅ `Farm`, `Product`, `ProductCategory`, `FarmType`, `Availability`, `ReservationInput` | Zod-Onboarding-Schema **muss** zu diesen Typen passen (Single Source: Zod → `z.infer` deckt sich mit `Farm`/`Product`). Kein zweites, divergierendes Typsystem. |
| `app/src/lib/seed.ts` | ✅ `SEED_FARMS: Farm[]` — realistische Höfe (Osnabrück/Münsterland), aber **ohne** Demo-Kennzeichnung | **Demo-Schicht-Quelle:** aus diesem Seed wird die **gekennzeichnete** Demo-Org befüllt (`is_demo=true`). Der reine Frontend-Seed-Modus (kein Supabase) bleibt; in DB-Modus wird Seed = **Demo**, nie Echtdaten. |
| `app/src/pages/FinderPage.tsx`, `components/{FarmCard,FarmDrawer,FarmMap,AvailabilityBadge}.tsx` | ✅ Finder + Detail + Reservierung end-to-end (Seed/Supabase-ready) | Finder-Query muss `is_demo=true` **ausschließen** (außer Demo-Modus). `FarmCard` erhält einen **„Demo"-Badge**, der nur im Demo-Modus erscheint. |
| `app/src/lib/data.ts` | ✅ Datenzugriff (Seed ↔ Supabase-Brücke) | Zentrale Stelle für den Demo-Filter (`is_demo`) + Demo-Modus-Schalter — **nicht** in jede Komponente streuen. |
| `app/supabase/functions/_shared/` | ✅ `cors.ts`, `stripe.ts`, `supabaseAdmin.ts` (`admin()`), `email.ts` (+ `rateLimit.ts`/Turnstile aus WAVE_06) | **Wiederverwenden** für `farm-onboard`: CORS, `admin()`, Rate-Limit, Turnstile-Verify. Keine Helfer duplizieren. |
| `app/supabase/functions/{create-checkout,stripe-webhook}/index.ts` | ✅ Edge-Function-Muster (Zod/Guard/Audit, Deno.serve) | **Vorlage** für `farm-onboard/index.ts` — gleiches Muster (OPTIONS→CORS, Zod, Rechte, service_role-Insert, Audit, JSON-Antwort). |
| `app/.env.example`, `app/src/vite-env.d.ts` | ✅ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (+ ggf. `VITE_TURNSTILE_SITE_KEY` WAVE_06) | **Ergänzen:** `VITE_DEMO_MODE?` (default aus; aktiviert Demo-Ansicht), Storage-Bucket-Name (Foto-Upload). |
| Erzeuger-Onboarding / Wizard | **existiert nicht** | **Neu:** `lib/onboarding/{schema.ts,steps.ts,state.ts}`, `pages/OnboardingPage.tsx`, `components/onboarding/*`, Edge `farm-onboard`, Migration `0009_onboarding_demo.sql`. |
| Demo-Kennzeichnung (`is_demo`) | **existiert nicht** | **Neu (additiv):** `is_demo` auf `farms`/`products` + Demo-Org + RLS/Query-Ausschluss + Reset-Skript. |
| `docs/ONBOARDING_SYSTEM.md`, `docs/SALES_DEMO_PATH.md` | ⬜ geplant (MASTER_INDEX 3 + 8) | **Diese Welle füllt sie** (Spezifikation ↔ Implementierung verdrahtet). |

> **Abweichung zum TempConnect-Blueprint dokumentiert (Stop-Regel):** Der Referenz-Blueprint kennt VMS-Onboarding (Vendor-Pool-Aufnahme, Requisition-Setup, Einsatzportal-Demo-Mandanten, Stundenzettel-Demodaten). Hier konsequent auf die **Hof-Domäne** adaptiert: „Vendor-Onboarding" → **Erzeuger-/Hof-Onboarding**, „Demo-Mandant/Sandbox-Tenant" → **gekennzeichnete Demo-Org (`is_demo`)**, „Pool-Aufnahme-Approval" → **Hof-Verifizierung (WAVE_07)**. Keine VMS-/Hetzner-/Container-Begriffe übernommen. Der datengetriebene Form-Ansatz (Schema + Zod) ist Imperium-Grundgesetz und wird hier erstmals als **mehrstufiger Wizard** ausgeprägt → Pattern-Kandidat fürs Memory.

---

## 2. Aufgaben

> Reihenfolge = Abhängigkeit: erst Schema (Single Source) + Migration/Demo-Flag (Fundament), dann State-Machine + Edge-Function (Submit-Pfad), dann Wizard-UI + Storage-Upload, dann Demo-Schicht/Filter/Badge + Reset, zuletzt Zero-States + Tests + Doku-Anbindung.

### 2.1 Datengetriebenes Onboarding-Schema (Single Source of Truth)

- **`app/src/lib/onboarding/schema.ts` (neu):** ein Zod-Schema pro Schritt, gebündelt zu `OnboardingSchema`. Jedes Feld trägt Metadaten (Label, Hilfetext, Typ, Pflicht, Constraints) — der Wizard **rendert daraus**, statt Felder fest zu verdrahten. Die Constraints spiegeln exakt die DB-Constraints (z. B. `farm_type`-Enum, `product_category`-Enum, `quantity 1..50` analog, `comment ≤ 2000`).
  ```ts
  // schema.ts — eine Quelle für Wizard-Rendering + Client- + Edge-Validierung.
  import { z } from 'zod'
  export const FARM_TYPES = ['Hofladen','Bauernhof','Imkerei','Hofmetzgerei','Manufaktur','Gärtnerei'] as const
  export const CATEGORIES = ['Obst','Gemüse','Eier','Käse','Honig','Fleisch & Wurst','Kartoffeln','Säfte','Marmelade','Blumen','Getreide & Mehl'] as const

  export const stepBasis = z.object({
    name: z.string().min(2, 'Bitte den Hofnamen angeben').max(120),
    type: z.enum(FARM_TYPES),
    street: z.string().min(2).max(160),
    plz: z.string().regex(/^\d{5}$/, 'Bitte eine 5-stellige Postleitzahl'),
    city: z.string().min(2).max(120),
  })
  export const stepStandort = z.object({
    pickupWindows: z.array(z.string().min(1).max(80)).min(1, 'Mindestens ein Abholfenster'),
    isUnmanned: z.boolean().default(false),          // unbemannter SB-Stand (USP-Pfad)
    locationType: z.enum(['hofladen','marktstand','sb_stand','ab_hof']).default('hofladen'),
  })
  export const stepSortiment = z.object({
    categories: z.array(z.enum(CATEGORIES)).min(1, 'Mindestens eine Kategorie'),
    products: z.array(z.object({
      name: z.string().min(2).max(120),
      category: z.enum(CATEGORIES),
      unit: z.string().min(1).max(40),               // z. B. "Glas 250g"
      price: z.number().min(0).max(9999),
      seasonal: z.boolean().default(false),
    })).max(50),
  })
  export const stepProfil = z.object({
    story: z.string().max(1500).default(''),
    openingHours: z.string().max(200).default(''),
    photoPath: z.string().max(300).optional(),       // Storage-Pfad, kein roher Upload-Body
  })
  export const stepEinwilligung = z.object({
    consentVermittler: z.literal(true, { errorMap: () => ({ message: 'Bitte den Vermittler-Hinweis bestätigen' }) }),
    consentLebensmittel: z.literal(true, { errorMap: () => ({ message: 'Bitte den Kennzeichnungs-Hinweis bestätigen' }) }),
    turnstileToken: z.string().min(10),              // öffentlicher Pfad: Bot-Schutz (WAVE_06)
  })
  export const OnboardingSchema = stepBasis.merge(stepStandort).merge(stepSortiment).merge(stepProfil).merge(stepEinwilligung)
  export type OnboardingInput = z.infer<typeof OnboardingSchema>
  ```
- **Regel (verbindlich):** `z.infer<typeof OnboardingSchema>` muss mit `Farm`/`Product` aus `app/src/lib/types.ts` kompatibel sein (Mapping-Funktion `toFarmDraft()` typgeprüft). **Kein** zweites Validierungsregime, **keine** Constraint, die nicht auch in der DB steht.

### 2.2 Wizard-State-Machine + Draft-Resume (`app/src/lib/onboarding/state.ts`, neu)

- Endliche Schritt-Maschine: `basis → standort → sortiment → profil → einwilligung → submit`. Übergänge nur, wenn der aktuelle Schritt **Zod-grün** ist (Vorwärts blockiert bei Fehler; Rückwärts immer erlaubt, Eingaben bleiben erhalten).
- **Resume:** Für eingeloggte Erzeuger wird der Teilstand nach jedem gültigen Schritt als **Draft** an die Edge-Function (`farm-onboard?stage=draft`) gesendet und in `farm_onboarding_drafts` (org-gebunden, RLS) gespeichert; beim erneuten Aufruf lädt der Wizard den letzten Draft. Für anonyme Nutzung (vor Login) Fallback auf `sessionStorage` (kein PII in `localStorage` dauerhaft). **Kein Datenverlust** bei Reload/Abbruch.
- Status-Felder maschinenlesbar: `currentStep`, `completedSteps`, `errorsByStep`, `dirty`. UI bindet daran (Fortschrittsbalken, „Schritt 3 von 5", Deep-Link `?step=sortiment`).

### 2.3 Edge Function `farm-onboard/index.ts` (neu, Submit-Wahrheit)

Gleiches Muster wie `create-checkout` (OPTIONS→CORS, Zod, Rechte, service_role nur hier, Audit). Zwei Stages: `draft` (Teilstand speichern) und `submit` (Hof anlegen, in Verifizierung überführen).
```ts
// farm-onboard/index.ts — einziger Schreibpfad fürs Onboarding. service_role NUR hier.
import { corsFor } from '../_shared/cors.ts'
import { allow } from '../_shared/rateLimit.ts'
import { admin } from '../_shared/supabaseAdmin.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { OnboardingSchema } from './schema.ts'   // Schema-Spiegel der Client-Quelle (siehe §2.1 Build-Note)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  if (!(await allow('farm-onboard', req, 20, 60))) return Response.json({ error: 'rate_limited' }, { status: 429, headers: corsFor(req) })
  // ... Auth: eingeloggter Erzeuger; org_id aus profiles/org_members (is_org_member), NIE aus dem Body vertrauen.
  const body = await req.json()
  const parsed = OnboardingSchema.safeParse(body.payload)
  if (!parsed.success) return Response.json({ error: 'validation', issues: parsed.error.issues }, { status: 422, headers: corsFor(req) })
  if (!(await verifyTurnstile(parsed.data.turnstileToken, req))) return Response.json({ error: 'turnstile_failed' }, { status: 403, headers: corsFor(req) })
  // ... admin(): farm (verified=false, is_demo=false, org_id=ownOrg) + products + org_location (is_unmanned) anlegen
  // ... audit_log: action='farm.onboarded', entity_type='farm', reason='self_service_onboarding'
  // ... in WAVE_07-Verifizierungs-Queue überführen (status: pending_verification)
  return Response.json({ ok: true, farmId, status: 'pending_verification' }, { headers: corsFor(req) })
})
```
- **Verbindlich:** `org_id` **niemals** aus dem Client-Body übernehmen — immer serverseitig aus der Session (`is_org_member`) ableiten (Org-Boundary, Produktionspfeiler 1). Submit setzt **immer** `is_demo=false` und `verified=false`. Demo-Inhalte entstehen **nie** über diesen Pfad (nur über das Demo-Seed-Skript, §2.5).
- **Schema-Spiegelung Client↔Edge:** Da Browser (Vite/TS) und Edge (Deno) getrennt bündeln, liegt `OnboardingSchema` in `app/src/lib/onboarding/schema.ts` **und** wird per Build-Step/Symlink in `supabase/functions/farm-onboard/schema.ts` gespiegelt; ein Hygiene-Gate-Check (WAVE_01) erzwingt Byte-Gleichheit (kein Drift). Eine Quelle, zwei Laufzeiten.

### 2.4 Wizard-UI (`pages/OnboardingPage.tsx` + `components/onboarding/*`, neu)

- **Datengetriebenes Rendering:** `components/onboarding/WizardField.tsx` rendert ein Feld aus seinen Schema-Metadaten (Text/Select/Multi-Select/Number/Boolean/Array-of-Object für Produkte). Schritte aus `steps.ts`. **Keine** handkopierten Form-Blöcke je Schritt.
- **Komponenten:** `WizardShell` (Fortschritt „Schritt n von 5", Zurück/Weiter, Speichern-Hinweis), `StepBasis`, `StepStandort` (SB-Stand-Toggle prominent — USP), `StepSortiment` (Produkt-Repeater mit Hinzufügen/Entfernen, Live-Preisformat €), `StepProfil` (Foto-Upload → Supabase Storage, Fortschritt/Fehler/Entfernen), `StepEinwilligung` (Vermittler-Disclaimer + Lebensmittel-Hinweis als Pflicht-Checkboxen, Turnstile-Widget), `OnboardingPreview` (Vorschau = exakt das künftige `FarmCard`/`FarmDrawer`-Rendering, damit der Erzeuger sieht, wie sein Hof im Finder erscheint).
- **Editorial-Disziplin:** ausschließlich Tokens aus `app/src/styles/theme.css`, keine hardcodierten Farben, **keine Deko-Emojis**, deutsche Mikrocopy im regional-warmen, präzisen Ton (i18n-content-spezialist). Vermittler-Disclaimer durchgängig im Footer des Wizards.
- **Foto-Upload:** direkter Upload in einen Storage-Bucket (`farm-photos`, RLS/Policy org-gebunden), Client erhält nur den **Pfad** zurück (`photoPath`), kein roher Binär-Body durch die Edge-Function. Lade-/Fehler-/Entfernen-Zustände echt.
- **Einstieg/Deep-Link:** `/onboarding` (Top-Nav-Eintrag „Hof eintragen" für Rolle `erzeuger`/anonym); Erzeuger-Dashboard zeigt bei **keinem Hof** statt Leerseite die Onboarding-Aufforderung (Zero-State als Einladung, Produktionspfeiler 2). `?step=…` deep-linkbar.

### 2.5 Demo-Schicht: Migration, Seed, Filter, Badge, Reset

- **Migration `app/supabase/migrations/0009_onboarding_demo.sql` (additiv, Rollback als Kommentar):**
  - `farm_onboarding_drafts` (org-gebunden: `org_id`, `user_id`, `payload jsonb`, `current_step text`, `updated_at`, `deleted_at`; RLS: nur eigener Draft les-/schreibbar via `is_org_member`/`auth.uid()`).
  - `alter table farms add column if not exists is_demo boolean not null default false;`
  - `alter table products add column if not exists is_demo boolean not null default false;`
  - Index `farms_real_idx on farms (plz) where deleted_at is null and is_demo = false` (Finder-Pfad bleibt schnell).
  - **RLS-Härtung Finder:** `farms_public_read`/`products_public_read` so anpassen, dass der **öffentliche** Lesepfad `is_demo=true` ausschließt (Demo erscheint nie im echten Finder) — Demo nur über den expliziten Demo-Modus (anon-Query mit gesetztem Flag/separater Policy für Demo-Org).
  - Verifizierungs-Status-Spalte/Übergabe an WAVE_07 (sofern dort noch nicht vorhanden, additiv ergänzen, sonst andocken).
  - **Isolationstest-Pflicht:** Demo-Org-Daten dürfen nie unter Echt-Org-Scope auftauchen; fremde Org = 403 (db-rls-spezialist + qa-tester, Gate).
- **Demo-Seed `app/scripts/seed-demo.ts` (neu):** legt die **Demo-Org** an (Name z. B. „Demo — LokaleBauernConnect") und befüllt sie aus `app/src/lib/seed.ts`, jeden Datensatz mit `is_demo=true`. Idempotent (Re-Run überschreibt sauber). **Niemals** automatisch gegen Prod — nur lokal oder mit expliziter Owner-Freigabe.
- **Demo-Reset `npm run demo:reset`:** entfernt **alle** `is_demo=true`-Daten + die Demo-Org restlos; schreibt `audit_log` (`action='demo.reset'`, `reason` Pflicht). Ein Befehl, kein Handaufräumen.
- **„Demo"-Badge:** `FarmCard`/`FarmDrawer` zeigen einen unmissverständlichen **„Demo"-Badge** (Token-basiert) **nur** für `is_demo=true` und **nur** im Demo-Modus — niemals im echten Käufer-Finder (wo Demo ohnehin herausgefiltert ist).
- **Sales-Demo-Modus:** `VITE_DEMO_MODE`/`?demo=1` schaltet die Demo-Ansicht frei, mit fixiertem Banner „Demo-Ansicht — keine echten Höfe". Default **aus**. Dokumentiert in `docs/SALES_DEMO_PATH.md`.

### 2.6 Zero-States, Fehlerpfade, Hygiene

- **Editorial-Zustände:** leeres Sortiment (Hinweis statt Sperre, aber Submit verlangt ≥1 Produkt), Geocoding ohne PLZ-Treffer (manuelle Lat/Lng-Eingabe als Fallback, kein Dead-End), Upload-Fehler (erneut/entfernen), Rate-Limit (429 → freundliche Wartemeldung), Turnstile-Fail (403 → erneut versuchen), Submit-Fehler (422 → feldgenaue Fehler aus `issues`). **Kein** 500, **kein** toter Button.
- **`app/.env.example` + `vite-env.d.ts`** ergänzen: `VITE_DEMO_MODE?` (default leer/aus). Storage-Bucket-Name dokumentiert.
- **WAVE_01-Hygiene-Gate** erweitern: (a) Byte-Gleichheit `app/src/lib/onboarding/schema.ts` ↔ `supabase/functions/farm-onboard/schema.ts`; (b) Grep-Assertion „kein `is_demo` fehlt im öffentlichen Finder-Query"; (c) „kein service_role/Direkt-Insert im Wizard-Frontend"; (d) „kein Deko-Emoji im Wizard".
- **Doku-Anbindung:** `docs/ONBOARDING_SYSTEM.md` (Wizard-Schritte, Schema, Resume, Verifizierungs-Übergang, Audit), `docs/SALES_DEMO_PATH.md` (Demo-Modus, Reset, Badge, Garantie „nie im echten Finder"); `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` (Abschnitt 3 `ONBOARDING_SYSTEM.md` ✅, Abschnitt 8 `SALES_DEMO_PATH.md` ✅) aktualisieren.

---

## 3. Konkrete Befehle (Reihenfolge · Working-Dir `app/`, Windows-PowerShell-tauglich)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Zod installieren (datengetriebene Validierung, Single Source)
npm install zod
npm ci                       # reproduzierbar; lockfile-konsistent (WAVE_01)

# 2) Typen/Lint/Build grün (Wizard + Schema dürfen nichts brechen)
npm run typecheck            # strict — schema.ts (z.infer) muss zu types.ts (Farm/Product) passen
npm run lint                 # ESLint flat config (WAVE_01): kein service_role/Direkt-Insert im Frontend
npm run build                # tsc --noEmit && vite build -> dist/

# 3) Edge Function (Deno) prüfen — neue farm-onboard + Schema-Spiegel
cd supabase/functions
deno lint
deno check farm-onboard/index.ts farm-onboard/schema.ts
cd ../..

# 4) Migration lokal anwenden (lokaler Supabase-Stack; NICHT gegen Prod ohne Owner-Freigabe)
supabase start                              # lokaler Stack (Docker NUR lokal für CLI; kein Self-Host-Deploy)
supabase db reset                           # wendet migrations/0001..0009 + seed an (frisches Schema)
#  alternativ rein additiv gegen laufende lokale DB:
#  supabase migration up

# 5) Demo-Org lokal befüllen (gekennzeichnet, is_demo=true) und prüfen
npm run demo:seed                           # legt Demo-Org an + befüllt aus seed.ts mit is_demo=true (idempotent)
#  Verifikation: Demo erscheint NICHT im öffentlichen Finder, NUR im Demo-Modus:
npm run dev                                 # Finder ohne ?demo=1 -> keine Demo-Höfe
#  http://localhost:5409/?demo=1            -> Demo-Höfe sichtbar, JEDER mit "Demo"-Badge + Banner

# 6) Edge-Function lokal smoke-testen (Draft + Submit, Zod/Turnstile/Audit)
supabase functions serve farm-onboard --env-file supabase/functions/.env
#  a) Validierungsfehler erzwingen (PLZ ungültig) -> 422 mit feldgenauen issues:
curl -s -X POST http://localhost:54321/functions/v1/farm-onboard \
  -H 'content-type: application/json' \
  -d '{"stage":"submit","payload":{"name":"X","type":"Hofladen","plz":"12","city":"Osnabrück","street":"Weg 1","pickupWindows":["Sa 9-12"],"categories":["Honig"],"products":[],"consentVermittler":true,"consentLebensmittel":true,"turnstileToken":"local-test-token"}}'
#  erwartet: {"error":"validation","issues":[... plz ... products(min 1) ...]} (HTTP 422)
#  b) gültiger Submit -> Hof verified=false, is_demo=false, pending_verification + audit_log:
#  (gültigen Body mit 5-stelliger PLZ + >=1 Produkt + eingeloggtem Erzeuger-JWT senden)

# 7) Isolations-/Demo-Sichtbarkeits-Test (blockierendes Gate)
npm run test -- onboarding demo isolation   # Zod-Boundary, Demo-Filter, Org-403, Resume, State-Machine
#  erwartet: Demo nie unter Echt-Org-Scope; fremde Org=403; öffentlicher Finder ohne is_demo

# 8) Demo restlos entfernen (ein Befehl, Audit mit reason)
npm run demo:reset                          # löscht alle is_demo=true + Demo-Org; audit_log action='demo.reset'
#  Verifikation: SELECT count(*) FROM farms WHERE is_demo = true; -> 0

# 9) Hygiene-Gate (WAVE_01) erneut — jetzt mit Onboarding/Demo-Assertions
bash scripts/release-hygiene-check.sh       # erwartet: HYGIENE-GATE: PASS
#  (schema.ts == farm-onboard/schema.ts byte-gleich; Finder-Query schliesst is_demo aus;
#   kein service_role im Frontend; kein Deko-Emoji im Wizard)

# 10) Secrets/Buckets server-seitig — NUR mit Owner-Freigabe (Platzhalter, nie echte Werte ins Repo/Log)
# supabase storage create-bucket farm-photos   # privat, RLS-Policy org-gebunden
# supabase secrets set TURNSTILE_SECRET_KEY=<...>   # (bereits WAVE_06, hier nur referenziert)

# 11) Deploy Migration/Function + Demo-Org in Prod — NUR mit Owner-Freigabe (Account/Kosten/Datenwahrheit)
# supabase db push
# supabase functions deploy farm-onboard
# (Demo-Org in Prod NUR auf ausdrückliche Owner-Anweisung; Default = keine Demo in Prod)
```

> **Stop-Regel:** `supabase db push` / `functions deploy` / Storage-Bucket in Prod / `npm run demo:seed` **gegen Prod** / Aktivieren von `VITE_DEMO_MODE` in Prod / produktive Secrets → **anhalten, Owner-Freigabe** (Account-/Kosten-/Datenwahrheits-relevant). Lokal (`supabase start`, `db reset`, `functions serve`, `npm run dev/build/test`, `demo:seed/reset` gegen lokale DB) ist kostenlos und reversibel.

---

## 4. Acceptance (Akzeptanzkriterien — alle müssen grün sein)

**Datengetriebener Wizard & Schema (Single Source)**
1. Schritte, Felder, Pflicht/Optional, Hilfetexte und Validierung werden aus `app/src/lib/onboarding/schema.ts` **generiert** — keine je Schritt handkopierten Form-Blöcke. Ein neues Feld erfordert nur eine Schema-Änderung.
2. Dieselbe Zod-Definition validiert Browser **und** Edge (`farm-onboard`); `schema.ts` ist mit dem Edge-Spiegel byte-gleich (Hygiene-Gate erzwingt es). `z.infer<typeof OnboardingSchema>` ist mit `Farm`/`Product` (`types.ts`) typkompatibel.
3. Mehrstufige State-Machine: Vorwärts nur bei Zod-grünem Schritt; Rückwärts erhält Eingaben; Fortschritt „Schritt n von 5" + `?step=…` deep-linkbar.

**Submit-Pfad & Sicherheit**
4. Finaler Submit läuft **ausschließlich** über `farm-onboard`; das Frontend nutzt **nie** service_role und macht **keinen** Direkt-Insert in `farms`/`products`.
5. `org_id` wird serverseitig aus der Session (`is_org_member`) abgeleitet, **nie** aus dem Body übernommen; Submit setzt immer `verified=false` und `is_demo=false`.
6. Öffentlicher Pfad ist Turnstile-geschützt + rate-limitiert; Validierungsfehler → `422` mit feldgenauen `issues`; jeder Submit erzeugt `audit_log` (`farm.onboarded`) und überführt in den WAVE_07-Verifizierungs-Workflow (`pending_verification`).

**Resume & Zero-State**
7. Eingeloggte Erzeuger können den Wizard verlassen und exakt fortsetzen (Draft in `farm_onboarding_drafts`, org-gebunden, RLS); anonym Fallback `sessionStorage`. Kein Datenverlust bei Reload/Abbruch.
8. Erzeuger ohne Hof sieht eine einladende Onboarding-Aufforderung (kein leerer Screen, kein 500). Geocoding-Misserfolg/Upload-Fehler/Rate-Limit/Turnstile-Fail haben echte Editorial-Zustände, keinen toten Button.

**Demo-Schicht (hart gekennzeichnet & isoliert)**
9. `is_demo` (additiv) auf `farms`/`products`; `0009_onboarding_demo.sql` läuft additiv sauber (`supabase db reset` grün), Rollback dokumentiert.
10. **Demo erscheint nie im öffentlichen Käufer-Finder** — RLS/Query schließt `is_demo=true` aus; Demo-Höfe sind nur im expliziten Demo-Modus (`?demo=1`/`VITE_DEMO_MODE`) sichtbar, dann **jeder** mit „Demo"-Badge + fixiertem Banner.
11. `npm run demo:seed` ist idempotent (legt Demo-Org an, `is_demo=true` aus `seed.ts`); `npm run demo:reset` entfernt **alle** Demo-Daten + Demo-Org restlos und schreibt `audit_log` (`demo.reset`, `reason` Pflicht). `SELECT count(*) FROM farms WHERE is_demo = true` danach = 0.

**Isolation, Build, Doku**
12. Isolationstest grün: Demo-Org-Daten nie unter Echt-Org-Scope; fremde Org = 403; öffentlicher Finder ohne `is_demo` (blockierendes Gate, db-rls-spezialist + qa-tester).
13. `npm run typecheck && npm run lint && npm run build` grün; `deno check` für `farm-onboard` grün; Hygiene-Gate PASS (Schema-Byte-Gleichheit, Finder-`is_demo`-Ausschluss, kein service_role im Frontend, kein Deko-Emoji).
14. `docs/ONBOARDING_SYSTEM.md` + `docs/SALES_DEMO_PATH.md` befüllt und verdrahtet; `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` (Abschnitt 3 + 8) auf WAVE_15-Stand.

---

## 5. Gate (blockierend)

> **WAVE_15-Demo/Onboarding-Gate** muss grün sein, bevor die **Phase 1 abgeschlossen** und das **Go-Live-Gate Phase 1** (WAVE 02–15 grün + Isolationstest + Kernflow end-to-end) freigegeben wird. WAVE_15 ist die **letzte Welle der Phase 1** — ihr Gate ist Teil des Phase-1-Abschlusses.

```
GATE WAVE_15:
  ✅ Datengetriebener Wizard     (Felder/Schritte/Validierung aus EINEM Zod-Schema; kein handkopierter Form-Code)
  ✅ Single-Source-Validierung   (Browser==Edge, schema.ts byte-gleich zum Edge-Spiegel; z.infer == Farm/Product)
  ✅ State-Machine + Resume       (Vorwärts nur Zod-grün; Draft org-gebunden; kein Datenverlust)
  ✅ Submit nur über Edge         (kein service_role im Frontend; org_id serverseitig; verified=false, is_demo=false)
  ✅ Öffentlicher Pfad geschützt  (Turnstile + Rate-Limit; 422 feldgenau; audit_log farm.onboarded -> Verifizierung)
  ✅ Demo hart gekennzeichnet     (is_demo additiv; "Demo"-Badge nur im Demo-Modus)
  ✅ Demo nie im echten Finder    (RLS/Query schliesst is_demo aus; nur ?demo=1/VITE_DEMO_MODE zeigt Demo)
  ✅ Demo restlos löschbar         (demo:reset entfernt alles + Audit mit reason; count(is_demo)=0)
  ✅ Isolationstest grün           (Demo nie unter Echt-Org-Scope; fremde Org=403)
  ✅ Zero-States/Build/Doku grün   (keine toten Buttons/500; typecheck+lint+build+deno check; ONBOARDING/SALES-Doku)
```

**Blockierend (kein Merge / kein Deploy ohne):** Demo nie im echten Finder, kein service_role im Frontend, `org_id` serverseitig, Isolationstest grün.
**Stop-Regeln dieser Welle:**
- `supabase db push` / `functions deploy` / Demo-Org gegen Prod / `VITE_DEMO_MODE` in Prod aktivieren / produktive Secrets / Storage-Bucket in Prod → **STOP**, Owner-Freigabe (Account/Kosten/Datenwahrheit).
- Demo-Datensatz erscheint (auch nur testweise) im echten Käufer-Finder → **STOP**: RLS/Query-Filter korrigieren, nie die Assertion abschwächen (CLAUDE.md §0.9 Test-Integrität, Produktionspfeiler 1).
- Wizard schreibt direkt in `farms`/`products` (service_role/Anon-Insert umgeht `farm-onboard`) → **STOP**: über Edge-Function leiten, RLS bleibt führend.
- `org_id` aus dem Client-Body übernommen → **STOP**: serverseitig aus Session (`is_org_member`) ableiten (Org-Boundary).
- Schema-Drift Client↔Edge (nicht byte-gleich) → **STOP**: Spiegelung/Build-Step reparieren, eine Quelle.
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 6. Abschlussbericht (Vorlage — nach Ausführung füllen, Format gem. `finalization/99_GOLIVE_GATE.md` Teil 3)

```text
## Abschlussbericht — WAVE_15 Demo/Onboarding

### 1. Geprüfte Repo-Bereiche
- Dateien:        app/src/lib/onboarding/{schema,steps,state}.ts · app/src/pages/OnboardingPage.tsx
                  · app/src/components/onboarding/{WizardShell,WizardField,StepBasis,StepStandort,
                    StepSortiment,StepProfil,StepEinwilligung,OnboardingPreview}.tsx
                  · app/supabase/functions/farm-onboard/{index.ts,schema.ts}
                  · app/supabase/migrations/0009_onboarding_demo.sql
                  · app/scripts/{seed-demo.ts,demo-reset.ts} (npm: demo:seed / demo:reset)
                  · app/src/lib/data.ts (Demo-Filter is_demo) · components/{FarmCard,FarmDrawer} ("Demo"-Badge)
                  · app/.env.example · app/src/vite-env.d.ts · scripts/release-hygiene-check.sh
- Routen/Seiten:  /onboarding (?step=…) · Finder (is_demo-Ausschluss, ?demo=1 Demo-Modus) · Erzeuger-Dashboard (Zero-State-Einladung)
- Edge Functions: farm-onboard (neu: draft + submit; Zod, Turnstile, Rate-Limit, service_role, Audit)
- Tabellen:       farm_onboarding_drafts (neu) ; farms/products.is_demo (additiv) ; Demo-Org ; audit_log
- Tests:          Zod-Boundary · State-Machine/Resume · Demo-Filter · Isolation (Org-403) · demo:reset

### 2. Getroffene Produktentscheidungen
- Ein Zod-Schema als Single Source (Wizard-Rendering + Client- + Edge-Validierung). (Begründung/Risiko)
- Demo-Schicht via is_demo + Demo-Org statt separater DB; nie im echten Finder; ein-Befehl-Reset. (Begründung/Risiko)
- Submit ausschliesslich über farm-onboard; org_id serverseitig; Mündung in WAVE_07-Verifizierung. (Begründung/Risiko)

### 3. Umgesetzte Änderungen
- Code:      datengetriebener Wizard, State-Machine + Draft-Resume, Foto-Upload (Storage), Preview=FarmCard
- DB/Migration: 0009_onboarding_demo.sql (farm_onboarding_drafts, is_demo, Finder-RLS-Ausschluss, Index)
- Edge:      farm-onboard (draft/submit, Zod, Turnstile, Audit, Verifizierungs-Übergang)
- Demo:      seed-demo/demo-reset (idempotent, audit), "Demo"-Badge, Demo-Modus-Banner
- Doku:      docs/ONBOARDING_SYSTEM.md, docs/SALES_DEMO_PATH.md

### 4. Aktualisierte Dokumente
- docs/ONBOARDING_SYSTEM.md, docs/SALES_DEMO_PATH.md,
  docs/releases/PHASE_STATUS.md (WAVE_15 / Phase 1 Abschluss), MASTER_INDEX.md (Abschnitt 3 + 8 ✅)

### 5. Tests und Checks
- Befehl: npm run typecheck/lint/build · deno check farm-onboard · npm run test -- onboarding demo isolation
          · curl farm-onboard (422/Submit) · demo:seed/demo:reset · Hygiene-Gate
- Ergebnis:           <…>
- Offene Fehler:      <…>
- Manuelle Prüfschritte (mit Owner + Datum): Storage-Bucket farm-photos (Prod) · Demo-Org-Politik in Prod · Deploy

### 6. P0/P1-Status
- Gelöst:             datengetriebener Erzeuger-Wizard, Single-Source-Zod, Demo-Kennzeichnung+Isolation+Reset, Resume
- Offen:              Live-Aktivierung (Owner-Freigabe: db push, functions deploy, Storage-Bucket, Demo-Politik Prod)
- Bewusst verschoben: Käufer-Onboarding-Tour (WAVE_10/Phase 4), Stripe-Connect-Onboarding (WAVE_09/Phase 4 Track A),
                      CSV-Bulk-Onboarding (Phase 5), KI-Textbefüllung (entfällt — Vermittler-Rolle)

### 7. Risiken vor Pilot / Enterprise
- (Konkret, mit Schweregrad + Mitigation — z. B. Demo-Leck in den echten Finder: hoch, Mitigation = RLS-Ausschluss
  + Isolationstest als blockierendes Gate + Hygiene-Grep; Schema-Drift Client/Edge: mittel, Mitigation = Byte-Gleichheits-Gate.)

### 8. Welle-übergreifende Erkenntnisse
- Wiederverwendbares Imperium-Muster: datengetriebener Zod-Wizard (ein Schema -> Rendering + Client- + Edge-Validierung
  + State-Machine + Draft-Resume) UND "is_demo + Demo-Org + ein-Befehl-Reset"-Demo-Schicht
  -> .claude/memory/patterns/ (Owner fragen) — direkt in 20 weiteren Plattformen nutzbar (jede braucht Vendor-Onboarding + Demo).

### 9. Nächster sinnvoller Slice
- Phase 1 ABGESCHLOSSEN (WAVE 02–15) -> Go-Live-Gate Phase 1 prüfen; dann Phase 2 (Cloudflare-Deploy, Gates A–F)
  bzw. Phase 4 Track A (SB-Bezahl-USP) für den ersten Geldfluss.
```

---

## 7. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive; 7 Produktionspfeiler — bes. 1 Org-Boundary, 2 Zero-State, 4 RBAC, 5 Audit, 7 Drilldown-Integrität; §0.9 Test-Integrität; Verbote: kein Fake-Data in Prod-UI, kein stiller Fehler, kein service_role im Frontend; Vermittler-Rolle/Disclaimer), `AGENTS.md` (Zod an allen Eingangsgrenzen, service_role nur Edge, SQL nur als additive Migration + Isolationstest, deutsche Kommentare, keine Deko-Emojis), `PHASEN.md` (Phase 1 → WAVE_15 als letzte Welle; Go-Live-Gate Phase 1), `MASTER_INDEX.md` (Abschnitt 3 `ONBOARDING_SYSTEM.md`, Abschnitt 8 `SALES_DEMO_PATH.md`).
- **Reale Artefakte (Bestand, geprüft):** `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql` (`orgs`/`profiles`/`farms`/`products`/`reservations`/`org_members`/`is_org_member`/`org_locations`+`is_unmanned`/`audit_log`/RLS), `app/src/lib/{types,seed,data}.ts`, `app/src/pages/FinderPage.tsx`, `app/src/components/{FarmCard,FarmDrawer,FarmMap,AvailabilityBadge}.tsx`, `app/supabase/functions/{_shared/cors.ts,_shared/supabaseAdmin.ts,create-checkout/index.ts,stripe-webhook/index.ts}` (+ `_shared/rateLimit.ts`/Turnstile aus WAVE_06), `app/.env.example`, `app/src/vite-env.d.ts`, `app/src/styles/theme.css`.
- **Vorgänger/Anker:** `finalization/WAVE_02` (Datenmodell+RLS — additiv erweitert um `is_demo`/`farm_onboarding_drafts`), `WAVE_03` (Rollen — Erzeuger als Onboarding-Subjekt), `WAVE_04` (Kernprodukt — Finder/Verfügbarkeit, in den der Hof nach Verifizierung erscheint), `WAVE_06` (Security — Turnstile/Rate-Limit/Audit, hier wiederverwendet), `WAVE_07` (Staff/Support: **Hof-Verifizierung** — Mündung des Onboardings), `WAVE_14` (Legal/DSGVO — Einwilligung/Disclaimer/Lebensmittel-Hinweis im Wizard), `app/finalization/WAVE_01_release_hygiene.md` (Hygiene-Gate — hier um Schema-Byte-Gleichheit + Demo-Filter-Asserts erweitert), `finalization/WAVE_12_qa_tests.md` (Test-Suite, in die Onboarding-/Demo-/Isolationstests einhängen).
- **Diese Welle erfüllt/erstellt:** `docs/ONBOARDING_SYSTEM.md` (Spezifikation ↔ Implementierung), `docs/SALES_DEMO_PATH.md` (Demo-Modus, Reset, „nie im echten Finder"-Garantie).
- **Gate-Bezug:** `finalization/99_GOLIVE_GATE.md` (Phase-1-Abschluss: WAVE 02–15 grün + Isolationstest + Kernflow; Confirm+Reason+Audit bei Demo-Reset).
- **Plattform-Pfeiler dieser Welle:** Org-Boundary (Demo-Org & `is_demo` isoliert, Pfeiler 1) · Zero-State als Einladung statt Leere/500 (Pfeiler 2) · RBAC (nur Erzeuger onboardet eigene Org; Pfeiler 4) · Audit & Verantwortlichkeit (Onboarding + Demo-Reset mit reason; Pfeiler 5) · Testpflicht (Isolation/Zod/Demo-Sichtbarkeit; Pfeiler 6) · Drilldown-Integrität (Deep-Links `?step`/`?demo` tragen Kontext, bauen nie org-fremde URLs; Pfeiler 7). **Vermittler-Disclaimer + Lebensmittel-Hinweis + DSGVO** bleiben durchgängig sichtbar.

> Diese Welle ist **additiv** und reversibel bis zum Deploy. Jeder kosten-/außenwirksame oder datenwahrheits-relevante Schritt (Supabase-Push/Deploy, Demo-Org gegen Prod, `VITE_DEMO_MODE` in Prod, Storage-Bucket, produktive Secrets, `git commit`/`push`) wird **vorab in Klartext angekündigt und erst auf Owner-OK ausgeführt.**
