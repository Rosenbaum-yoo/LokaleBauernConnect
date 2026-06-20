# WAVE 03 — Rollen & Sichtbarkeit (Käufer · Erzeuger · Staff · RBAC · Surface-Sichtbarkeit · `hidden_*`-Logik)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · `PHASEN.md` → Phase 1, WAVE_03. **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> **Voraussetzung:** WAVE_00 (Baseline) ✅ · WAVE_02 (Datenmodell + RLS deny-by-default) ✅ Code (`app/supabase/migrations/0001_core.sql`, `0003_marketplace.sql`).
> Status laut `PHASE_STATUS.md`: ⬜ offen — diese Welle macht Rollen/Sichtbarkeit **explizit, serverseitig erzwungen und abnehmbar**.

---

## 0. Ziel

**Falsche Sichtbarkeit wird VOR jedem Bugfix geklärt.** Sehr viele scheinbare „Bugs" sind in Wahrheit Rollen-/Sichtbarkeitsfragen (CLAUDE.md → Triage-Kategorie 2). Diese Welle legt fest, **wer was sieht und tut** — und erzwingt es **serverseitig (RLS + Edge-Guards)**, nicht nur im Client.

Konkret, lückenlos und Enterprise-Niveau:

1. **Drei strikt getrennte Welten** — **Käufer** (öffentlich/regional), **Erzeuger** (org-gebundene Selbstpflege), **Staff/Owner** (intern, käuferfern). Sessions/Berechtigungen trennen (CLAUDE.md → „Käufer-, Erzeuger-, Staff-Welten strikt trennen").
2. **RBAC ohne Lücken** (Produktionspfeiler 4) — jede Seite, Card, Aktion, jeder Endpunkt kennt **eindeutig** seine erlaubte Rolle + ggf. Plan/Add-on. Kein Button ohne erlaubte Aktion, **keine Aktion ohne serverseitigen Guard**.
3. **`hidden_*`-Logik als erste Klasse** — was „verborgen" ist (nicht-veröffentlichte Bewertungen, gelöschte Höfe, nicht-offene Bounties, fremde Org-Daten, Demo-Zustand) ist **in der DB** definiert und **in der UI** widerspruchsfrei gespiegelt. Verbergen heißt nie „nur CSS `display:none`".
4. **Vereinheitlichte Fehlersemantik** — ein kanonischer Satz Fehlercodes über alle Edge Functions; **`NOT_FOUND` statt `PERMISSION_DENIED`**, wenn die Existenz fremder Org-Daten nicht offenbart werden darf (Produktionspfeiler 1 + 7).
5. **Surface-Trennung** — Käufer-App (`/`), Erzeuger-Dashboard (`/erzeuger`), Staff/Betriebszentrale (`/staff`, Phase 3) sind getrennte Oberflächen mit getrennten Guards; **keine internen Links im Käufermenü**, keine Erzeuger-/Staff-Card im Käuferkontext.
6. **Zentrale Guards statt Inline-Checks** — eine Quelle der Wahrheit für „darf X?" im Frontend (`lib/rbac.ts` → `can(role, action)`) **und** an jeder Edge-Grenze (`functions/_shared/guard.ts` → `requireRole`, `requireOrgMember`). Inline-`role === 'staff'`-Streuung ist verboten.
7. **Cross-Org-Negativtests als Gate** — pro sensibler Domäne mindestens ein Boundary-Test: fremde Org lesen → `NOT_FOUND`/leer; fremde Org schreiben → `PERMISSION_DENIED` (Produktionspfeiler 6).

**Nicht-Ziel dieser Welle:** Live-Supabase-Auth-Flow/MFA/Turnstile (das ist **WAVE_06 — Security**, account-/kostenrelevant → Owner-Freigabe). Hier werden **Rollenmodell, RBAC-Matrix, Sichtbarkeitsregeln, Guards und Negativtests** definiert und im Code/SQL/Doku verdrahtet — die App bleibt im Seed-Modus voll bedienbar. **Stop-Regel:** Sobald ein Auth-Provider live geschaltet, eine Domain konfiguriert oder ein echter Key benötigt würde → anhalten, Owner-Freigabe.

---

## 1. Aufgaben

### 1.1 Kanonisches Rollenmodell (verbindlich, deckungsgleich mit der DB)

Die Rollen sind **bereits** als Postgres-Enum `user_role` in `0001_core.sql` definiert und über `profiles.role` / `org_members.role` getragen. Diese Welle macht sie zur **Single Source of Truth** für Frontend + Edge:

| # | Rolle (`user_role`) | Welt | Bindung | Kernrecht |
|---|---|---|---|---|
| 1 | **`kaeufer`** | Käufer (öffentlich) | keine Org nötig (auch anonym) | Höfe/Produkte finden, reservieren, bewerten, Gesuch (Bounty) anlegen, am SB-Stand zahlen |
| 2 | **`erzeuger`** | Erzeuger | **org-gebunden** (`profiles.org_id` / `org_members`) | **nur eigenen Hof**: Stammdaten, Produkte, Verfügbarkeit, Abholfenster, Standorte, Reservierungen lesen, Bewertungen moderieren, Einnahmen/SB-Umsätze sehen |
| 3 | **`staff`** | intern (käuferfern) | global, ohne Org-Eigentum | Hof-**Verifizierung**, Eskalation/Support, Bewertungs-/Bounty-Moderation, Lesezugriff über Orgs hinweg — **nur via Edge mit Audit**, nie Käufer-Eigentum vortäuschen |
| 4 | **`owner`** | intern (operativ) | global | alles von `staff` + Betriebssicht (Phase 3), Feature-Flags, kritische Mutationen mit **Reason-Pflicht** |

> **Adaptionshinweis (Kanon):** Es gibt **keine** VMS-Rollen (Disponent, Worker, Vendor-Admin, Konzernrolle). Die Hof-Domäne kennt genau diese vier. „Multi-Org" bildet **ein Erzeuger-User in mehreren Höfen/Betrieben** ab (`org_members`), nicht „Konzern-Mandanten".
> **Anonymer Käufer = `kaeufer` ohne Session.** Anonyme Schreibrechte sind in der DB bewusst eng: `reservations` (insert), `reviews` (insert), `bounties` (insert), `waitlist` (insert) — jeweils mit `with check`-Constraint. Lesen darf jede:r nur den **öffentlichen Katalog** (aktive Höfe/Produkte/Standorte, veröffentlichte Bewertungen, offene Bounties).

**Datei:** `app/src/lib/rbac.ts` (neu) — exportiert
```ts
export type Role = 'kaeufer' | 'erzeuger' | 'staff' | 'owner' | 'anon'
export type Action =
  | 'farm.read.public' | 'farm.write.own' | 'farm.verify'
  | 'product.write.own' | 'availability.write.own'
  | 'reservation.create' | 'reservation.read.own'
  | 'review.create' | 'review.moderate.own' | 'review.moderate.any'
  | 'bounty.create' | 'bounty.manage.own'
  | 'sbpayment.pay' | 'sbpayment.read.own'
  | 'staff.console' | 'owner.console' | 'feature.flag.write'
export function can(role: Role, action: Action, ctx?: { ownsOrg?: boolean }): boolean
```
`can()` ist **rein deklarativ** (Tabelle role→action) und der einzige Ort, an dem das Frontend „darf X?" entscheidet. Es ist **nie** der Schutz — nur die UI-Spiegelung des serverseitigen Guards.

### 1.2 Surface-Sichtbarkeit (getrennte Oberflächen + Navigation)

| Surface | Route(n) | Zielrolle | Guard (Welle) | Tabu |
|---|---|---|---|---|
| **Käufer-App** | `/` (Finder inkl. Saison-Radar-Banner/-Filter), `/hof/:farmId`, `/stand/:farmId` (SB-Bezahlung) | `anon` + `kaeufer` | öffentlich (RLS read) | keine Erzeuger-/Staff-Links, keine internen IDs/Org-Daten |
| **Erzeuger-Dashboard** | `/erzeuger`, `/erzeuger/produkte`, `/erzeuger/reservierungen`, `/erzeuger/einnahmen` | `erzeuger` (org-gebunden) | Auth + `requireOrgMember` (WAVE_06 live) | keine fremden Orgs, keine Staff-Funktionen |
| **Betriebszentrale (Staff/Owner)** | `/staff/*` (Phase 3) | `staff`, `owner` | Auth + `requireRole(['staff','owner'])` + Audit | nie Käufer-Eigentum vortäuschen; kritische Aktion = Confirm+Reason |

**Navigations-Regel (Frontend):** Das Menü wird **aus `can()` gerendert** — ein Käufer sieht physisch keinen Erzeuger-/Staff-Eintrag (kein toter, kein soft-gelockter Link in der falschen Welt). Cross-Surface-Wechsel nur über expliziten, rollen-geprüften Einstieg (z. B. „Für Erzeuger" → Login). **Deep-Links** tragen Kontext und bauen **nie** org-fremde URLs (Produktionspfeiler 7).

### 1.3 `hidden_*`-Logik (was verborgen ist — in DB definiert, in UI gespiegelt)

„Verborgen" ist in dieser Plattform **kein UI-Trick**, sondern ein **Datenzustand mit RLS-Durchsetzung**. Diese Welle inventarisiert und vereinheitlicht alle Verbergungs-Quellen:

| `hidden_*`-Quelle | DB-Mechanik (real, vorhanden) | Sichtbar für | Verborgen für | UI-Spiegelung |
|---|---|---|---|---|
| `hidden_deleted` (Soft-Delete) | `farms.deleted_at` / `org_locations.deleted_at` → RLS-`using(deleted_at is null)` | niemand öffentlich; Owner via Edge | Käufer, Finder, Karte | Eintrag erscheint nicht in Liste; Deep-Link → Zero-State „Hof nicht (mehr) verfügbar" |
| `hidden_unpublished_review` | `reviews.status in ('published','hidden')` → `reviews_public_read using(status='published')` | öffentlich nur `published`; Org moderiert eigene | Käufer (für `hidden`) | ausgeblendete Bewertung zählt nicht in `rating_avg`/`rating_count` (Trigger filtert `status='published'`) |
| `hidden_nonopen_bounty` | `bounties.status in ('open','fulfilled','expired','cancelled')` → `bounties_public_read using(status='open')` | öffentlich nur `open`; Autor verwaltet eigene | Käufer (für nicht-offene) | nicht-offene Gesuche aus der öffentlichen Liste; Autor sieht eigene über Author-Policy |
| `hidden_cross_org` | jede Owner-Policy: `using(is_org_member(org_id))` | nur eigene Org | jede fremde Org | fremde Org-Daten existieren für die UI **nicht** → `NOT_FOUND`/leer, nie 403-Leak |
| `hidden_unverified` (Vertrauen) | `farms.verified boolean` | alle (Katalog ist offen) | — (nicht verborgen, sondern **gekennzeichnet**) | Badge „Verifiziert"/„Noch nicht verifiziert"; Käufer sieht den Vermittler-Status transparent |
| `hidden_private_tables` | `orgs`, `audit_log`, `waitlist`, `payment_events`, `credits_ledger` → **keine** anon/auth-Policy | nur `service_role` (Edge) | alle Clients | nie im Client gefetcht; Zugriff ausschließlich serverseitig mit Audit |
| `hidden_demo` (Seed) | kein DB-Zustand, sondern **Dual-Source** (`isSupabaseConfigured=false`) | alle (lokal) | — | UI kennzeichnet Demo/Seed-Modus klar (kein Fake-Prod), kein toter Button |

> **Regel:** Jede neue „verborgene" Sicht muss aus genau **einer** dieser Mechaniken folgen. Ein neues `hidden_*`-Verhalten ohne RLS-/Status-Grundlage ist verboten (sonst entsteht ein „nur-UI"-Schutz = Sicherheitslücke). Frontend liest verborgene Zustände **nie** und rendert sie **nie** — es bekommt sie gar nicht erst (deny-by-default).

**Frontend-Helfer:** `app/src/lib/visibility.ts` (neu) — kapselt die *Spiegelung* dieser Zustände als reine Funktionen, z. B. `isFarmVisibleToBuyer(farm)`, `publishedReviews(reviews)`, `openBounties(bounties)`, `verifiedBadge(farm)`. Diese spiegeln nur, was die DB ohnehin filtert (Defense in Depth, **kein** Ersatz für RLS).

### 1.4 Vereinheitlichte serverseitige Fehlercodes (Edge-Grenze)

Ein kanonischer Satz für **alle** Edge Functions (`functions/_shared/errors.ts`, neu) — adaptiert auf die Hof-Domäne:

| Code | Bedeutung | HTTP | Einsatz |
|---|---|---|---|
| `AUTH_REQUIRED` | kein Login | 401 | Erzeuger-/Staff-Aktion ohne Session |
| `ORG_REQUIRED` | kein Org-Kontext | 400 | Erzeuger-Aktion ohne `org_id`/Mitgliedschaft |
| `PLAN_REQUIRED` | Plan reicht nicht | 402 | Feature hinter `plus`/`pro` (WAVE_09) |
| `FEATURE_NOT_ENABLED` | Add-on fehlt | 403 | z. B. SB-Bezahlung nicht freigeschaltet |
| `PERMISSION_DENIED` | Rolle reicht nicht | 403 | **Schreib-**Versuch auf fremde Org / fehlende Rolle |
| `NOT_FOUND` | existiert nicht **oder** außerhalb Scope | 404 | **Lese-**Versuch auf fremde/gelöschte Daten (Existenz nicht offenbaren) |
| `TENANT_SCOPE_REQUIRED` | Cross-Org-Versuch | 403 | expliziter Cross-Org-Zugriffsversuch |
| `RATE_LIMITED` | zu viele Anfragen | 429 | öffentliche Schreib-Endpunkte (WAVE_06) |
| `VALIDATION_FAILED` | Zod-Verstoß | 422 | Eingabe an der Grenze ungültig |

**Kernregel (Produktionspfeiler 1+7):** Für **Lese**-Pfade auf fremde/verborgene Objekte → **`NOT_FOUND`**, nie `PERMISSION_DENIED` (sonst Existenz-Leak). Für **Schreib**-Pfade auf fremde Org → `PERMISSION_DENIED`/`TENANT_SCOPE_REQUIRED`. Kein „permissiver Fallthrough": fehlt der Org-Kontext, ist die Antwort **leer/`NOT_FOUND`**, nie „volle Sicht".

### 1.5 Zentrale Guards (Edge) — Inline-Checks ersetzen

`functions/_shared/guard.ts` (neu), für alle Edge Functions (Deno):
```ts
// Reihenfolge: Auth → Org/Rolle → Audit. Wirft typisierte AppError mit Code aus 1.4.
export async function requireUser(req: Request): Promise<{ userId: string }>
export async function requireRole(req: Request, roles: Role[]): Promise<{ userId: string; role: Role }>
export async function requireOrgMember(req: Request, orgId: string): Promise<{ userId: string }>
// Liest profiles.role / org_members; nutzt service_role NUR hier (nie im Client).
```
Bestehende und künftige mutierende Endpunkte (`create-checkout`, `stripe-webhook`, spätere `farms-upsert`, `reviews-moderate`, `staff-verify-farm`) rufen **diese** Guards auf. **Inline-Rollenchecks im Funktions-Body sind verboten** — eine Quelle der Wahrheit. Webhook bleibt davon ausgenommen: er authentifiziert über **Stripe-Signatur** (idempotent), nicht über User-Rollen.

### 1.6 Rollen-/Sichtbarkeits-Matrix (Doku-Artefakt)

`docs/ROLE_VISIBILITY_MATRIX.md` (neu) mit Spalten: **Surface · Card/Element · Aktion · Endpunkt/Tabelle · Erlaubte Rollen · Plan/Add-on · UI-Zustand (sichtbar / ausgeblendet / soft-locked / „bald") · Server-Guard (RLS-Policy / `requireRole`/`requireOrgMember`) · Zero-State/Upgrade-Copy**. Deckt alle Kernflächen ab: Finder, Hof-Detail, Reservierung, Saison-Radar, SB-Stand, Erzeuger-Dashboard (Produkte/Verfügbarkeit/Reservierungen/Einnahmen/Moderation), Staff (Verifizierung/Eskalation). Begleitend `docs/ROLE_AND_PERMISSION_MODEL.md` (MASTER_INDEX §1) als Prosa-Modell.

### 1.7 Dokumentation & Tracker
- `docs/releases/PHASE_STATUS.md`: WAVE_03 von „offen" → „Code/Doku vorhanden" (Live-Auth-Enforcement = WAVE_06).
- `MASTER_INDEX.md`: `docs/ROLE_AND_PERMISSION_MODEL.md` ⬜→✅, `ROLE_VISIBILITY_MATRIX.md` ergänzen.
- Wiederverwendbare Erkenntnis → 1 Zeile `.claude/learning/insights_inbox.md` (Kategorie TECHNIK).
- ADR `.claude/memory/decisions/` — „RBAC-Modell + `hidden_*` als DB-Zustand + `NOT_FOUND`-statt-`PERMISSION_DENIED`-Konvention" (Imperium-Beschleuniger: gilt für 20 weitere Plattformen).

---

## 2. Konkrete Befehle

> Working-Dir für App-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich. **Alles lokal/kostenlos** — kein Account, kein Deploy in dieser Welle.

### 2.1 Build- & Typ-Gate (nach RBAC-/Visibility-Code)
```bash
cd app
npm ci                 # lockfile-treu (wie CI/Deploy)
npm run typecheck      # tsc --noEmit (strict, noUnused*, noFallthrough) — Guards/can() typsicher
npm run build          # tsc --noEmit && vite build → app/dist (Cloudflare-Pages-tauglich)
npm run dev            # http://localhost:5409 — Käufer-Surface im Seed-Modus voll bedienbar
```

### 2.2 RBAC-/Sichtbarkeits-Unit-Tests (lokal, deny-by-default-Beweis im Frontend)
```bash
cd app
npm run test           # vitest: rbac.can() Wahrheitstabelle + visibility.ts (published/open/visible)
# Erwartet u. a.:
#  · can('kaeufer','farm.write.own')          === false
#  · can('kaeufer','reservation.create')      === true
#  · can('erzeuger','farm.write.own',{ownsOrg:true})  === true
#  · can('erzeuger','farm.write.own',{ownsOrg:false}) === false   // fremde Org
#  · can('staff','farm.verify')               === true
#  · can('anon','review.create')              === true
#  · publishedReviews([{status:'hidden'},...]).length spiegelt nur 'published'
```

### 2.3 RLS-Cross-Org-Negativtests (gegen lokale Supabase-Instanz)
> Erst ausführbar mit **lokalem** Supabase (Docker via CLI, lokal/kostenlos) oder gegen ein freigegebenes EU-Projekt. **Kein** Deploy/`db push` auf Remote in dieser Welle.
```bash
# Lokaler Postgres mit RLS (CLI startet eine lokale Supabase, kein Cloud-Account)
supabase start                         # lokal, kostenlos
supabase db reset                      # spielt migrations/0001..0003 + seed.sql ein

# Negativtests (psql gegen lokale DB, als zwei verschiedene Org-Profile)
#  · Org A liest Org-B-Reservierungen  → 0 Zeilen (RLS using is_org_member)
#  · Org A updatet Org-B-Produkt        → 0 rows affected / Policy-Verstoß (PERMISSION_DENIED-Äquivalent)
#  · anon select auf orgs/audit_log/waitlist/credits_ledger → 0 Zeilen (keine Policy)
#  · anon select farms where deleted_at not null → 0 Zeilen (hidden_deleted)
#  · anon select reviews where status='hidden'   → 0 Zeilen (hidden_unpublished_review)
#  · anon select bounties where status<>'open'   → 0 Zeilen (hidden_nonopen_bounty)
npm run test:rls                       # Skript fährt obige Boundary-Fälle gegen supabase start

supabase stop                          # lokale Instanz beenden
```
> **Stop-Regel beachtet:** `supabase login`, `supabase link`, `supabase db push`, `supabase functions deploy` = **Remote/Account/Kosten → Owner-Freigabe** (WAVE_06/Phase 2). Hier nur **lokal**.

### 2.4 Disziplin-Grep (keine Inline-Rollenchecks, keine UI-only-Verbergung)
```bash
cd app
# 1) Keine gestreuten Inline-Rollenchecks außerhalb der zentralen Quelle:
#    Treffer nur erlaubt in src/lib/rbac.ts und functions/_shared/guard.ts
grep -rnE "role *={2,3} *['\"](kaeufer|erzeuger|staff|owner)['\"]" src functions \
  | grep -vE "lib/rbac\.ts|_shared/guard\.ts" || echo "OK: keine verstreuten Inline-Rollenchecks"

# 2) Kein 'nur-UI'-Verbergen sensibler Daten via CSS:
grep -rnE "display: *none|hidden" src/components src/pages | grep -i "org|staff|owner" \
  || echo "OK: keine CSS-only-Verbergung sensibler Surfaces"

# 3) service_role darf NICHT im Client-Code auftauchen:
grep -rn "service_role" src && echo "FEHLER: service_role im Client!" || echo "OK: service_role nur in Edge"
```

---

## 3. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Rollenmodell & RBAC**
1. `app/src/lib/rbac.ts` existiert; `can(role, action, ctx)` deckt **alle** Aktionen aus §1.1 ab und ist die einzige Frontend-Entscheidungsquelle (Disziplin-Grep §2.4.1 = „OK").
2. Die vier DB-Rollen (`kaeufer`/`erzeuger`/`staff`/`owner`) sind 1:1 im Frontend-`Role`-Typ abgebildet; `anon` ist als käufergleicher, schreib-eng-begrenzter Zustand modelliert.
3. RBAC-Unit-Tests (§2.2) grün: u. a. Käufer ≠ Erzeuger-Schreibrecht, Erzeuger nur eigene Org (`ownsOrg:false` → false), Staff verifiziert, anon darf reservieren/bewerten.

**Surface-Sichtbarkeit & Navigation**
4. Käufer-Menü enthält **null** Erzeuger-/Staff-Links (aus `can()` gerendert); kein toter/soft-gelockter Link in der falschen Welt.
5. Drei Surfaces sind getrennt (`/`, `/erzeuger`, `/staff`); jeder geschützte Surface-Einstieg ist serverseitig geplant (Guard benannt in Matrix), nicht nur UI.
6. Deep-Link auf gelöschten/fremden Hof → **Zero-State** „nicht verfügbar", **kein** 500, **kein** Org-Leak.

**`hidden_*`-Logik**
7. Jede Zeile der `hidden_*`-Tabelle (§1.3) ist auf eine reale DB-Mechanik zurückgeführt (Policy/Status/`deleted_at`/private Tabelle/Dual-Source) — kein „nur-UI"-Verbergen (Grep §2.4.2 = „OK").
8. `app/src/lib/visibility.ts` spiegelt diese Zustände als reine Funktionen; Unit-Tests beweisen: nur `published` Reviews / nur `open` Bounties / `deleted_at`-Höfe unsichtbar.
9. `rating_avg`/`rating_count` berücksichtigen ausschließlich `status='published'` (Trigger-Verhalten in `0003` bestätigt; Test deckt einen `hidden`-Fall ab).

**Serverseitige Durchsetzung**
10. `functions/_shared/errors.ts` definiert den kanonischen Fehlercode-Satz (§1.4); `functions/_shared/guard.ts` stellt `requireUser`/`requireRole`/`requireOrgMember` bereit; bestehende mutierende Functions nutzen sie (keine Inline-Checks).
11. **Lese**-Pfad auf fremde/verborgene Daten → `NOT_FOUND` (nie `PERMISSION_DENIED`); **Schreib**-Pfad auf fremde Org → `PERMISSION_DENIED`/`TENANT_SCOPE_REQUIRED`. Kein permissiver Fallthrough (fehlender Org-Kontext = leer, nie volle Sicht).
12. RLS-Cross-Org-Negativtests (§2.3) grün für: `reservations`, `farms`, `products`, `org_locations`, `reviews`, `bounties`, `subscriptions`, `sb_payments`, `credits_ledger` + private Tabellen (`orgs`/`audit_log`/`waitlist` → anon 0 Zeilen).

**Build, Hygiene & Doku**
13. `npm run typecheck` + `npm run build` grün; Browser-Konsole frei von `TypeError`/401-Schleifen.
14. `service_role` taucht **nirgends** im `src/`-Client auf (Grep §2.4.3 = „OK"); nur `VITE_`-Public-Keys im Frontend.
15. `docs/ROLE_VISIBILITY_MATRIX.md` deckt alle Kernflächen ab; `docs/ROLE_AND_PERMISSION_MODEL.md` + `PHASE_STATUS.md` + `MASTER_INDEX.md` auf realem Stand; dieses File ohne TODOs/Platzhalter.

---

## 4. Gate (Übergang zu WAVE_04 / Foundation-Abschluss)

> **Foundation gilt erst als abgeschlossen, wenn WAVE_00–03 grün sind.** RBAC ist ein **blockierendes** Sicherheits-Gate.

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **RBAC-Gate** (blockierend) | `can()` zentral, vollständig, getestet; keine verstreuten Inline-Checks | §2.2 + Grep §2.4.1 |
| **Isolations-Gate** (blockierend) | Cross-Org-Lesen → `NOT_FOUND`/leer; Schreiben → `PERMISSION_DENIED`; private Tabellen anon-dicht | §2.3 (`db-rls-spezialist` + `qa-tester`) |
| **`hidden_*`-Gate** | jede Verbergung DB-fundiert; UI spiegelt, schützt nicht | §1.3-Tabelle + Grep §2.4.2 |
| **Surface-Gate** | drei Welten getrennt; kein Cross-Surface-Link in falscher Rolle | Review `frontend-design-guardian` + Matrix |
| **Fehlersemantik-Gate** | kanonische Codes; `NOT_FOUND`-statt-`PERMISSION_DENIED`-Konvention konsequent | `functions/_shared/errors.ts` + `security-auditor` |
| **Secret-Gate** (blockierend) | kein `service_role` im Client; nur `VITE_`-Keys | Grep §2.4.3 + `security-auditor` (read-only) |
| **Build/Type-Gate** (blockierend) | `npm run build` grün, deterministisch | §2.1 |
| **Doku-Gate** | Matrix + Permission-Model + Tracker aktuell; File ohne offene Punkte | Review |

**Stop-Regeln (anhalten, minimalen Fix vorschlagen, auf OK warten):**
- Seite/Card ohne klaren Rollen-Owner → STOP, Owner-Entscheidung (Default: **ausblenden**, im ADR/Decision dokumentieren).
- Server-Guard schlägt **permissiv** fehl (kein Org-Kontext = volle Sicht) → **sofort P0-Sicherheitslücke**.
- UI-Ausblendung und API-/RLS-Guard widersprüchlich → **API/RLS ist Wahrheit**, UI angleichen.
- Auth-Provider/MFA/Turnstile live, Domain, echter Key nötig → gehört in **WAVE_06**, Owner-Freigabe.

**Nächste Welle:** `WAVE_04 — Kernprodukt` (A Hofladen-Finder ✅ · B Verfügbarkeit/Erzeuger-Selbstpflege · C Reservierung/Abholfenster · D Saison-Radar) — baut **direkt** auf den hier definierten Guards/`can()`/`hidden_*`-Regeln auf (Selbstpflege = `farm.write.own`/`availability.write.own`, org-gebunden).

---

## 5. Abschlussbericht

```
## Welle abgeschlossen: WAVE_03 — Rollen & Sichtbarkeit
- Geändert:
  · app/src/lib/rbac.ts → zentrales, deklaratives RBAC (Role/Action + can()), einzige
    Frontend-Entscheidungsquelle; deckungsgleich mit DB-Enum user_role (kaeufer/erzeuger/staff/owner).
  · app/src/lib/visibility.ts → spiegelt hidden_*-Zustände (published Reviews, open Bounties,
    deleted_at-Höfe, verified-Badge) als reine Funktionen (Defense in Depth, kein RLS-Ersatz).
  · app/supabase/functions/_shared/errors.ts → kanonischer Fehlercode-Satz (AUTH_REQUIRED …
    NOT_FOUND … TENANT_SCOPE_REQUIRED); _shared/guard.ts → requireUser/requireRole/requireOrgMember
    (service_role nur hier), bestehende Functions nutzen die Guards (keine Inline-Rollenchecks).
  · Surface-Trennung verdrahtet: Käufer (/) · Erzeuger (/erzeuger) · Staff (/staff); Menü aus can()
    gerendert (keine internen Links im Käufermenü).
  · docs/ROLE_VISIBILITY_MATRIX.md + docs/ROLE_AND_PERMISSION_MODEL.md neu; PHASE_STATUS.md +
    MASTER_INDEX.md auf realen Stand; ADR (RBAC + hidden_*-als-DB-Zustand + NOT_FOUND-Konvention).
- Tests/Verifikation:
  · npm run test → RBAC-Wahrheitstabelle + visibility-Filter grün · npm run typecheck/build → grün
  · supabase start + npm run test:rls → Cross-Org-Negativtests grün (fremd lesen = NOT_FOUND/leer,
    fremd schreiben = PERMISSION_DENIED; private Tabellen orgs/audit_log/waitlist anon-dicht;
    hidden_deleted/hidden_unpublished_review/hidden_nonopen_bounty bestätigt)
  · Disziplin-Greps: keine verstreuten Inline-Rollenchecks · keine CSS-only-Verbergung sensibler
    Surfaces · kein service_role im Client.
- Risiken:
  · Niedrig–mittel. RBAC/Visibility additiv; keine destruktive Migration. Live-Enforcement (echter
    Auth-Flow/Session→Guard) wird in WAVE_06 scharfgeschaltet — bis dahin App im Seed-Modus bedienbar.
  · Offen (Owner-Freigabe): Supabase-EU-Auth + Turnstile + Rate-Limits (WAVE_06), Staff-Surface-UI
    (WAVE_07/Phase 3). Rollback = git revert des WAVE_03-Diffs (rein additiv).
- Nächste Welle: WAVE_04 — Kernprodukt (B Verfügbarkeit/Selbstpflege · C Reservierung · D Saison-Radar),
  nutzt direkt can()/Guards/hidden_*-Regeln dieser Welle.
```

---

## 6. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler — v. a. 1 Org-Boundary, 4 RBAC, 5 Audit, 6 Testpflicht, 7 Drilldown; Triage-Kategorie 2 Rollen/Sichtbarkeit), `AGENTS.md` (harte Regeln, `db-rls-spezialist`/`qa-tester`/`security-auditor`/`frontend-design-guardian`), `PHASEN.md` (Phase 1 → WAVE_03).
- **Landkarte:** `MASTER_INDEX.md` (§1 `ROLE_AND_PERMISSION_MODEL.md`, §7 `finalization/WAVE_03`).
- **Reale Artefakte (Bestand, hier verdrahtet):** `app/supabase/migrations/0001_core.sql` (Enum `user_role`, `profiles.role`, RLS deny-by-default, `farms.deleted_at`, `reservations`-Policies, private `orgs`/`audit_log`/`waitlist`), `0003_marketplace.sql` (`is_org_member()`, `org_members.role`, `org_locations.is_unmanned`, `reviews.status`, `bounties.status`, `credits_ledger`, Owner-Policies auf Multi-Org gehoben), `app/src/lib/types.ts`, `app/src/lib/data.ts` (Dual-Source/Demo-Kennzeichnung).
- **Neue Artefakte dieser Welle:** `app/src/lib/rbac.ts`, `app/src/lib/visibility.ts`, `app/supabase/functions/_shared/errors.ts`, `app/supabase/functions/_shared/guard.ts`, `docs/ROLE_VISIBILITY_MATRIX.md`, `docs/ROLE_AND_PERMISSION_MODEL.md`.
- **Folge-Wellen bauen hierauf auf:** WAVE_04 (Selbstpflege = `*.write.own`), WAVE_06 (Security: Guards live, Turnstile, Rate-Limits), WAVE_07/Phase 3 (Staff-/Owner-Surface + Audit-UI), WAVE_09/Track A (Plan-/Feature-Gates `PLAN_REQUIRED`/`FEATURE_NOT_ENABLED` für SB-Bezahlung).
- **Plattform-Pfeiler dieser Welle:** RBAC ohne Lücken · Org-Boundary via RLS · `NOT_FOUND`-statt-Leak · `hidden_*` als DB-Zustand · Surface-Trennung · zentrale Guards (Imperium-Beschleuniger für 20 weitere Plattformen).

> Diese Welle ist **additiv** und ändert keine Backend-/Account-Ressource. Für jeden kosten-/außenwirksamen Schritt (Supabase-Remote-Link/-Push, Cloudflare-Deploy, echte Keys, Auth-Go-Live) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
