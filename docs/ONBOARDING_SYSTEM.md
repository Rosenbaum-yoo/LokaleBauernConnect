# ONBOARDING_SYSTEM — LokaleBauernConnect (Erzeuger-Onboarding)

> Verbindliche Spezifikation des **Erzeuger-Onboardings**: ein **datengetriebener Wizard** (Schema + Zod), der einen neuen Betrieb von der Registrierung bis zur staff-geprüften Veröffentlichung im Hofladen-Finder führt — **Profil → Standort → Story → Produkte → Verifizierungs-Nachweise → Einreichung**.
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Vermittler-Grundsatz (nicht verhandelbar):** Das Onboarding bereitet ein **Listing** vor — keinen Eigenverkauf, keine Beratung, keine Lebensmittel-Haftung der Plattform. Verantwortung für Inhalte, Kennzeichnung und Produktangaben liegt **beim Erzeuger** (`docs/COMPLIANCE_MODEL.md` §0, §9). Vermittler-Disclaimer ist im Wizard durchgängig sichtbar.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Verbots-/Stop-Regeln · datengetriebene Formulare Schema+Zod), `AGENTS.md` (`platform-onboarder`, `compliance-officer`, `db-rls-spezialist`, `edge-functions-spezialist`, harte Regeln), `PHASEN.md` (**WAVE_15 Demo/Onboarding** · WAVE_02 Datenmodell+RLS · WAVE_07 Staff/Verifizierung · WAVE_09 Billing · Phase 4 Track A SB-Bezahlung), `docs/DATABASE_MODEL.md` (Schema-Referenz), `docs/ROLE_AND_PERMISSION_MODEL.md` (Rollen/Org-Scope/Plan-Locks), `docs/CORE_BUSINESS_STATE_MACHINES.md` §3 (Hof-Verifizierung), `docs/COMPLIANCE_MODEL.md` (DSGVO, Datenkategorien, Retention).
>
> **Status:** Normativ (Spezifikation für WAVE_15). Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.
> **Stand:** 2026-06-19 · Zuständig: Claude (gesamter Stack) · Freigabe: Owner · Phase 1 · WAVE_15.

---

## 0 · Geltungsbereich & Abgrenzung

Dieses Dokument beschreibt **ausschließlich** das **Erzeuger-Onboarding** der Plattform-Spezialschicht — den Weg eines Betriebs vom Signup bis zum live geschalteten, reservierbaren Hof.

| Im Scope | Nicht im Scope (anderswo definiert) |
|---|---|
| Erzeuger-Registrierung, Org-/Profil-Anlage, Wizard-Schritte (Schema+Zod), Nachweis-Upload, Einreichung zur Verifizierung, Fortschrittsspeicherung, Akzeptanzkriterien | **Käufer-Registrierung** (optional, leichtgewichtig — `docs/ROLE_AND_PERMISSION_MODEL.md` §1, §6; Gast-Reservierung ohne Konto). |
| Mapping auf `orgs`/`profiles`/`org_members`/`farms`/`products`/`availability` (Selbstpflege-Stammdaten) | **Staff-Verifizierungs-Workflow** (Entscheidung verify/reject) — `docs/CORE_BUSINESS_STATE_MACHINES.md` §3; hier nur die **Einreichung** (`farm.submit`). |
| Plan-bewusstes Onboarding (`demo` → `basis`+, Entitlement-Limits) | **Stripe-Connect-Onboarding** für SB-Bezahlung (Phase 4 Track A) — hier nur als **späterer** Onboarding-Hook referenziert. |
| Vermittler-/Lebensmittel-Disclaimer & DSGVO-Einwilligungen im Flow | **Reservierungs-/SB-Zahlungs-Maschinen** — `CORE_BUSINESS_STATE_MACHINES.md` §1, §4. |

> **Begriffsdisziplin (Kanon):** keine VMS-/Zeitarbeits-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC). Onboarding = **Betriebs-Aufnahme in den Hofladen-Finder**, nicht „Mitarbeiter-Onboarding".

---

## 1 · Designprinzipien (warum dieser Wizard so gebaut ist)

1. **Datengetrieben statt hartcodiert.** Schritte, Felder, Validierung, Sichtbarkeit und Pflichtgrad stammen aus **einem Schema** (`onboardingSchema`, §3) — die UI rendert das Schema, die Edge Function validiert gegen **dasselbe** Zod-Schema (§5). Ein neuer Schritt/ein neues Feld = Schema-Eintrag, **kein** UI-Rewrite (Imperium-Beschleuniger, wiederverwendbar in 20 Plattformen).
2. **Server ist führend.** Pflichtfelder, Längen, Formate, Plan-Limits und der Übergang `draft → submitted` werden **serverseitig** erzwungen (Zod an der Edge-Grenze + DB-Constraints + RLS). Das Frontend spiegelt nur (Defense-in-Depth) — es **entscheidet** nie (`CLAUDE.md` Frontend-Regeln, Pfeiler 1/4).
3. **Speichern ohne Schmerz.** Jeder Schritt ist **einzeln speicherbar** (Autosave-fähig), der Betrieb bleibt bis zur Einreichung im Zustand `farms.status = 'draft'`. Abbruch + Wiederkehr verliert nichts (Fortschritt in `producer_onboarding_progress`, §6).
4. **Zero-State vor Error.** Leere Listen (noch keine Produkte/Nachweise) → freundlicher Zero-State mit nächstem Schritt-CTA, nie 500/leerer Bildschirm (Pfeiler 2).
5. **Ehrlichkeit über Daten.** Unbekannte Geo (`lat/lng = NULL`) ist ein **gültiger** Zustand mit ehrlicher UI („Standort wird beim ersten Käuferzugriff geokodiert"), kein erfundener Pin (ADR 0002).
6. **Trust by design.** Veröffentlichung ist **gated**: ein Betrieb erscheint **nie** im öffentlichen Finder, bevor Staff `verified` gesetzt hat (`CORE_BUSINESS_STATE_MACHINES.md` §3.4). Das schützt Käufervertrauen und den SB-USP.
7. **Compliance eingebaut, nicht angeschraubt.** AVV-Hinweis (Plattform = AV des Erzeugers), Lebensmittel-Kennzeichnungs-Verantwortung und DSGVO-Einwilligungen sind **Schritte/Felder** im Schema (§3.7), nicht nachträgliche Modals.

---

## 2 · Onboarding-Reise (End-to-End)

```
  Registrierung           Wizard (draft, jederzeit speicherbar)                Verifizierung (Staff)        Live
 ┌───────────────┐   ┌──────────────────────────────────────────────────┐   ┌────────────────────────┐   ┌──────────┐
 │ Signup        │   │ 1 Profil  2 Betrieb  3 Standort  4 Story          │   │ farm.start_review      │   │ verified │
 │ (Erzeuger)    │──▶│ 5 Produkte  6 Verfügbarkeit  7 Abholfenster       │──▶│ farm.verify / reject   │──▶│ öffentl. │
 │ + E-Mail-     │   │ 8 Nachweise (Upload)  9 Disclaimer/Einwilligung   │   │ (CORE_..STATE_MACH §3) │   │ Finder   │
 │   Verifizierg.│   │  ▶ Vollständigkeits-Check (Server, Zod)           │   └────────────────────────┘   └──────────┘
 └───────────────┘   │  ▶ farm.submit  ⇒ status: draft → pending_review  │            │ rejected ▲
                     └──────────────────────────────────────────────────┘            └──────────┘ farm.resubmit (neuer Zyklus)
```

| Phase | Auslöser | Server-Effekt | Sichtbarkeit |
|---|---|---|---|
| **Registrierung** | Erzeuger meldet sich an (`/erzeuger/registrieren`) | Supabase Auth User; Trigger `on_auth_user_created` legt `profiles` (Default `role='buyer'`) an; Edge Function `producer-onboarding-start` setzt `role='producer'`, legt **Org** (`orgs`, `plan='demo'`) + `org_members(org_role='org_owner')` an (service role, auditiert) | nur Erzeuger |
| **Wizard** | Erzeuger durchläuft Schritte 1–9 | je Schritt: Zod-Validierung an der Edge, Upsert auf `farms`/`products`/`availability` (Status bleibt `draft`), Fortschritt in `producer_onboarding_progress` | nur Erzeuger (RLS), Staff im Ticket |
| **Einreichung** | `farm.submit` (alle Pflicht-Schritte grün + ≥1 Nachweis) | Vollständigkeits-Re-Validierung (Server), `farms.status: draft → pending_review`, `verification_status: submitted`, Staff-Queue-Eintrag, Audit `farm.submitted` | Erzeuger sieht „In Prüfung" |
| **Verifizierung** | Staff prüft (eigene Maschine) | `verified` ⇒ `farms.status='published'`, öffentlich + reservierbar; `rejected` ⇒ Begründung, Re-Einreichung möglich | nach `verified`: öffentlich |

> **Statuskopplung (eine Wahrheit):** Der Wizard schreibt nur `farms.status='draft'`. Der Übergang nach `pending_review`/`published`/`suspended` ist **ausschließlich** über die definierten Events (`farm.submit` durch den Erzeuger; `farm.verify`/`farm.reject` durch Staff) erlaubt — `CORE_BUSINESS_STATE_MACHINES.md` §3. `farms.status` (Sichtbarkeit) und `farms.verification_status` (Prüf-Lebenszyklus) werden synchron geführt (`draft↔submitted/—`, `pending_review↔submitted/in_review`, `published↔verified`).

---

## 3 · Datengetriebenes Wizard-Schema (Single Source of Truth)

Das Schema beschreibt **Schritte** und **Felder** maschinenlesbar. Frontend (Renderer) und Edge Function (Validator) konsumieren dieselbe Definition. Datei: `app/src/lib/onboarding/schema.ts`.

### 3.0 — Schema-Typen (TypeScript, strict)

```ts
// app/src/lib/onboarding/schema.ts — Single Source of Truth für UI + Edge-Validierung
import { z } from 'zod'

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'tel' | 'plz' | 'select' | 'multiselect'
  | 'number' | 'money_eur' | 'time_ranges' | 'file_upload' | 'checkbox' | 'repeat_group'

export interface FieldDef {
  key: string                       // DB-/Zod-Schlüssel (snake_case-kompatibel)
  label: string                     // DE-Label (Editorial-Ton)
  type: FieldType
  required: boolean                 // PFLICHT — serverseitig erzwungen (kein UI-only)
  help?: string                     // Mikrocopy/Erklärung
  placeholder?: string
  options?: readonly { value: string; label: string }[]  // select/multiselect
  min?: number; max?: number        // Länge/Wert/Anzahl
  accept?: readonly string[]        // file_upload: erlaubte MIME-Typen
  maxSizeMb?: number                // file_upload: Größenlimit
  group?: FieldDef[]                // repeat_group (Produkte/Abholfenster)
  visibleIf?: { key: string; equals: unknown }  // bedingte Sichtbarkeit
  planGate?: { minPlan: OrgPlan; feature: string }  // Plan-Lock (Upgrade-Pfad)
}

export interface StepDef {
  id: OnboardingStepId
  title: string
  subtitle?: string
  fields: FieldDef[]
  requiredForSubmit: boolean        // muss vor farm.submit grün sein?
  entity: 'profile' | 'org' | 'farm' | 'products' | 'availability' | 'consent'
}

export type OnboardingStepId =
  | 'profile' | 'business' | 'location' | 'story'
  | 'products' | 'availability' | 'pickup' | 'proofs' | 'consent'

export type OrgPlan = 'demo' | 'basis' | 'plus' | 'pro' | 'individuell'
```

### 3.1 — Step-Katalog (Übersicht)

| # | Step `id` | Titel | Entity | Pflicht für `submit` | Plan-Hinweis |
|---|---|---|---|:--:|---|
| 1 | `profile` | Ansprechperson & Kontakt | `profiles` | ✓ | — |
| 2 | `business` | Betrieb & Betriebstyp | `orgs` + `farms` | ✓ | Betriebs-Anzahl Plan-gated (§7) |
| 3 | `location` | Standort & Öffnungszeiten | `farms` | ✓ | — |
| 4 | `story` | Hof-Story (Editorial) | `farms` | ○ empfohlen | — |
| 5 | `products` | Sortiment | `products` | ✓ (≥1 Produkt) | Produkt-Anzahl Plan-gated (§7) |
| 6 | `availability` | Verfügbarkeit & Saison | `availability` | ✓ (je Produkt 1 Satz) | — |
| 7 | `pickup` | Abholfenster | `farms.pickup_windows` | ○ (Pflicht, falls Reservierung aktiv) | Reservierungs-Eingang ab `basis` |
| 8 | `proofs` | Verifizierungs-Nachweise | `farm_verification_documents` | ✓ (≥1 Nachweis) | — |
| 9 | `consent` | Disclaimer & Einwilligungen | `consent`/`profiles` | ✓ | — |

> **„Pflicht für submit"** ist die serverseitig geprüfte Bedingung des `farm.submit`-Guards (`CORE_BUSINESS_STATE_MACHINES.md` H1: „Pflichtfelder + ≥1 Nachweis"). Optionale Schritte (Story) blockieren die Einreichung nicht, werden aber als „empfohlen" markiert (Conversion-/Qualitätshinweis).

### 3.2 — Step 1 · Profil (Ansprechperson) → `profiles`

| Feld `key` | Typ | Pflicht | Regeln (Zod, server-erzwungen) | Mapping |
|---|---|:--:|---|---|
| `full_name` | text | ✓ | `min(2).max(120)` | `profiles.full_name` |
| `phone` | tel | ✓ | `regex(/^[+0-9 ()/-]{6,30}$/)` | `profiles.phone` |
| `contact_email` | email | ✓ | `string().email()`; = Login-E-Mail vorbefüllt, änderbar | `orgs.contact_email` |
| `role_in_business` | select | ✓ | `enum(['inhaber','mitarbeiter','vertretung'])` | (nur Onboarding-Kontext; setzt `org_members.org_role`-Vorschlag) |

> Die **Rolle** (`profiles.role='producer'`, `org_members.org_role='org_owner'`) wird **nicht** aus diesem Feld clientseitig gesetzt — sie wird ausschließlich serverseitig in `producer-onboarding-start` vergeben (`ROLE_AND_PERMISSION_MODEL.md` §6: „Rolle ist nie clientseitig setzbar").

### 3.3 — Step 2 · Betrieb & Typ → `orgs` + `farms`

| Feld `key` | Typ | Pflicht | Regeln | Mapping |
|---|---|:--:|---|---|
| `org_name` | text | ✓ | `min(2).max(120)` | `orgs.name` |
| `farm_name` | text | ✓ | `min(2).max(120)` | `farms.name` |
| `farm_type` | select | ✓ | `enum(FARM_TYPES)` — Hofladen/Bauernhof/Imkerei/Hofmetzgerei/Manufaktur/Gärtnerei | `farms.type` |
| `is_self_service` | checkbox | ○ | `boolean()` (Default false) — „Unbemannter SB-Stand?" | `farms.is_self_service` |
| `slug` | text | (auto) | server-generiert aus `farm_name`, `regex(/^[a-z0-9-]{2,80}$/)`, **kollisionsfrei** (Suffix bei Duplikat) | `farms.slug`, `orgs.slug` |

> `slug` ist **server-vergeben** (Edge Function), kein Eingabefeld — verhindert Kollisionen/Deep-Link-Hijacking (`farms.slug` UNIQUE). `is_self_service=true` aktiviert später (Plan `pro`+) den SB-Bezahl-Onboarding-Hook (§8.4).

### 3.4 — Step 3 · Standort & Öffnungszeiten → `farms`

| Feld `key` | Typ | Pflicht | Regeln | Mapping |
|---|---|:--:|---|---|
| `street` | text | ✓ | `min(3).max(160)` | `farms.street` |
| `plz` | plz | ✓ | `regex(/^[0-9]{5}$/)` | `farms.plz` (Finder-Index) |
| `city` | text | ✓ | `min(2).max(120)` | `farms.city` |
| `opening_hours` | text | ○ | `max(200)` (Freitext, z. B. „Mo–Fr 9–18, Sa 8–13") | `farms.opening_hours` |
| `lat` / `lng` | number | ○ | `lat ∈ [-90,90]`, `lng ∈ [-180,180]`; **NULL erlaubt** | `farms.lat`/`lng` |

> **Geo-Ehrlichkeit:** Erzeuger kann den Pin auf der Karte setzen (Track B) oder leer lassen. Bei NULL wird **kein** falscher Pin erzeugt; ein Edge-Geocoding-Job (PLZ→Zentroid, ohne PII) kann später befüllen. Bis dahin zeigt die UI ehrlich „Standort wird ermittelt" (ADR 0002).

### 3.5 — Step 4 · Hof-Story → `farms.story`

| Feld `key` | Typ | Pflicht | Regeln | Mapping |
|---|---|:--:|---|---|
| `story` | textarea | ○ (empfohlen) | `max(2000)` (= DB-CHECK); HTML wird **escaped** (kein Markup), Editorial-Plaintext | `farms.story` |

> Conversion-Hebel (New-York-Marketing-Ton in der Mikrocopy): „Erzählen Sie, was Ihren Hof ausmacht — Käufer reservieren bei Höfen mit Geschichte deutlich häufiger." Keine Pflicht (blockiert `submit` nicht), aber im Vollständigkeits-Score gewichtet (§4.2). Eingabe wird vor Ausgabe escaped (Frontend-Regel: „User-Werte vor Ausgabe immer escapen").

### 3.6 — Step 5–7 · Sortiment, Verfügbarkeit, Abholfenster (`repeat_group`)

**Step 5 · Produkte → `products`** (`repeat_group`, je Eintrag):

| Feld `key` | Typ | Pflicht | Regeln | Mapping |
|---|---|:--:|---|---|
| `name` | text | ✓ | `min(1).max(120)` | `products.name` |
| `category` | select | ✓ | `enum(PRODUCT_CATEGORIES)` (11 Kategorien) | `products.category` |
| `unit` | text | ✓ | `min(1).max(40)` (z. B. „Schale 500g", „Glas 250g", „kg") | `products.unit` |
| `price_eur` | money_eur | ✓ | `number().min(0).max(99999)`; intern → `price_cents = round(price_eur*100)` | `products.price_cents` |
| `seasonal` | checkbox | ○ | `boolean()` | `products.seasonal` |

- Guard: **≥ 1 Produkt** für `farm.submit` (sonst leerer Hof — kein reservierbares Angebot).
- Plan-Limit: Produkt-Anzahl je Betrieb plan-gated (`demo`=5, `basis`=30, `plus`=150, `pro/individuell`=∞ — `ROLE_AND_PERMISSION_MODEL.md` §5.1). Überschreitung → serverseitig `403 code:'plan_limit'` + UI-Lock mit Upgrade-Deep-Link.

**Step 6 · Verfügbarkeit → `availability`** (je Produkt **ein** `is_current`-Satz):

| Feld `key` | Typ | Pflicht | Regeln | Mapping |
|---|---|:--:|---|---|
| `status` | select | ✓ | `enum(['available','low','soon','out'])` | `availability.status` (+ Spiegel `products.availability`) |
| `qty_estimate` | number | ○ | `int().min(0)` | `availability.qty_estimate` |
| `valid_from` / `valid_to` | datetime | ○ | `valid_to` > `valid_from` (falls gesetzt) | `availability.valid_from`/`valid_to` |
| `note` | text | ○ | `max(160)` (z. B. „Erntefrisch ab Do") | `availability.note` |

- Guard: je Produkt genau ein aktueller Satz (DB Partial-Unique `(product_id) WHERE is_current AND deleted_at IS NULL`). Default beim Anlegen: `status='available'`, `is_current=true`.

**Step 7 · Abholfenster → `farms.pickup_windows TEXT[]`** (`repeat_group` von Zeitfenstern):

| Feld `key` | Typ | Pflicht | Regeln | Mapping |
|---|---|:--:|---|---|
| `pickup_windows` | time_ranges | ○* | `array(string().max(60)).max(20)` (z. B. „Sa 9–12") | `farms.pickup_windows` |

> *Bedingt-Pflicht: Wenn der Betrieb Reservierungen annehmen will (Plan `basis`+ mit Reservierungs-Eingang), ist **≥ 1 Abholfenster** Pflicht — sonst kann kein Käufer ein Fenster wählen (`reservations.pickup_window ∈ farms.pickup_windows`, Edge-validiert). Bei reinem SB-Stand ohne Reservierung optional.

### 3.7 — Step 8 · Verifizierungs-Nachweise → Storage + `farm_verification_documents`

Trust-Anker: Belege, die Staff prüft, **bevor** der Hof live geht. Upload in **Supabase Storage** (EU, privater Bucket `farm-verifications/`), Metadaten in einer dedizierten Tabelle (Cat. A, DSGVO).

| Feld `key` | Typ | Pflicht | Regeln | Zweck |
|---|---|:--:|---|---|
| `doc_type` | select | ✓ | `enum(DOC_TYPES)` (s. u.) | Art des Nachweises |
| `file` | file_upload | ✓ | `accept: ['image/jpeg','image/png','image/webp','application/pdf']`, `maxSizeMb: 10` | Upload-Datei |
| `note` | text | ○ | `max(200)` | Erläuterung für Staff |

**`DOC_TYPES` (Nachweis-Katalog):**

| `value` | Label | Belegt |
|---|---|---|
| `business_registration` | Gewerbe-/Betriebsanmeldung | Existenz des Betriebs |
| `farm_proof` | Hof-/Eigentums-/Pachtnachweis | Bezug zum Standort |
| `food_business_reg` | Lebensmittelunternehmer-Registrierung (LMUB) | lebensmittelrechtliche Anmeldung (Erzeuger-Verantwortung) |
| `id_owner` | Ausweis Betriebsinhaber (geschwärzt zulässig) | Identität des `org_owner` |
| `photo_stand` | Foto des Hofladens/SB-Stands | Plausibilität/SB-Tauglichkeit |
| `other` | Sonstiger Nachweis | freie Ergänzung |

- Guard `farm.submit`: **≥ 1 Nachweis** (`CORE_BUSINESS_STATE_MACHINES.md` H1). Empfohlen: `business_registration` **oder** `farm_proof` + `photo_stand`.
- **Upload-Pfad (sicher):** Frontend fordert von der Edge Function `producer-onboarding-upload-url` eine **signierte Upload-URL** an (Rechteprüfung: `owns_farm(farm_id)`); der direkte Storage-Bucket ist **privat** (keine öffentliche Lese-URL). Staff liest Belege nur über signierte, kurzlebige Download-URLs im Ticket-Kontext (PII-Minimierung, `COMPLIANCE_MODEL.md` §0).
- **Antivirus/Hygiene:** Größen-/MIME-Whitelist serverseitig; Dateiname server-normalisiert (kein Pfad-Traversal); EXIF/Geo-Stripping optional bei Bildern.
- **Retention:** Nach `verified` werden Nachweise gemäß `COMPLIANCE_MODEL.md` aufbewahrt (Trust-Beleg) bzw. bei Ablehnung/Nichtnutzung nach Frist (analog `producer_invites`, 90 Tage) bereinigt.

### 3.8 — Step 9 · Disclaimer & Einwilligungen → `consent` / `profiles`

| Feld `key` | Typ | Pflicht | Regeln | Bedeutung |
|---|---|:--:|---|---|
| `accept_terms` | checkbox | ✓ | `literal(true)` | AGB + **AVV** (Plattform = Auftragsverarbeiter des Erzeugers, `COMPLIANCE_MODEL.md` §0/§6) |
| `accept_food_responsibility` | checkbox | ✓ | `literal(true)` | Bestätigung: **Lebensmittel-Kennzeichnung/Produktangaben liegen in Erzeuger-Verantwortung**, Plattform haftet nicht |
| `accept_listing_accuracy` | checkbox | ✓ | `literal(true)` | Angaben (Standort, Preise, Verfügbarkeit) wahrheitsgemäß |
| `marketing_opt_in` | checkbox | ○ | `boolean()` (Default false) | Saison-Newsletter (DSGVO-Einwilligung, `profiles.marketing_opt_in`) |

> Pflicht-Checkboxen sind **`literal(true)`** — leerer/false-Wert lässt die `submit`-Validierung serverseitig fehlschlagen. Einwilligungen werden mit Zeitstempel + Version + IP in `consent_log` protokolliert (Nachweisbarkeit, Art. 7 DSGVO). Der Vermittler-/Lebensmittel-Disclaimer ist zusätzlich **persistent sichtbar** im gesamten Wizard (nicht nur in diesem Schritt).

---

## 4 · Zod-Validierung (eine Definition, zwei Konsumenten)

### 4.1 — Schema-Beispiel (`app/src/lib/onboarding/zod.ts`)

```ts
import { z } from 'zod'

const FARM_TYPES = ['Hofladen','Bauernhof','Imkerei','Hofmetzgerei','Manufaktur','Gärtnerei'] as const
const PRODUCT_CATEGORIES = ['Obst','Gemüse','Eier','Käse','Honig','Fleisch & Wurst',
  'Kartoffeln','Säfte','Marmelade','Blumen','Getreide & Mehl'] as const
const AVAILABILITY = ['available','low','soon','out'] as const
const DOC_TYPES = ['business_registration','farm_proof','food_business_reg',
  'id_owner','photo_stand','other'] as const

export const profileStep = z.object({
  full_name:     z.string().min(2).max(120),
  phone:         z.string().regex(/^[+0-9 ()/-]{6,30}$/, 'Ungültige Telefonnummer'),
  contact_email: z.string().email(),
  role_in_business: z.enum(['inhaber','mitarbeiter','vertretung']),
})

export const businessStep = z.object({
  org_name:        z.string().min(2).max(120),
  farm_name:       z.string().min(2).max(120),
  farm_type:       z.enum(FARM_TYPES),
  is_self_service: z.boolean().default(false),
  // slug wird serverseitig vergeben — kein Client-Input
})

export const locationStep = z.object({
  street:        z.string().min(3).max(160),
  plz:           z.string().regex(/^[0-9]{5}$/, 'PLZ = 5 Ziffern'),
  city:          z.string().min(2).max(120),
  opening_hours: z.string().max(200).optional(),
  lat:           z.number().min(-90).max(90).nullable().optional(),
  lng:           z.number().min(-180).max(180).nullable().optional(),
})

export const storyStep = z.object({
  story: z.string().max(2000).optional(),       // empfohlen, nicht Pflicht
})

export const productItem = z.object({
  name:      z.string().min(1).max(120),
  category:  z.enum(PRODUCT_CATEGORIES),
  unit:      z.string().min(1).max(40),
  price_eur: z.number().min(0).max(99999),
  seasonal:  z.boolean().default(false),
})
export const productsStep = z.object({
  products: z.array(productItem).min(1, 'Mindestens ein Produkt'),
})

export const availabilityItem = z.object({
  product_ref:  z.string().min(1),               // Bezug zum Produkt (id/temp-id)
  status:       z.enum(AVAILABILITY),
  qty_estimate: z.number().int().min(0).optional(),
  valid_from:   z.string().datetime().optional(),
  valid_to:     z.string().datetime().optional(),
  note:         z.string().max(160).optional(),
}).refine(a => !a.valid_to || !a.valid_from || a.valid_to > a.valid_from,
  { message: 'valid_to muss nach valid_from liegen', path: ['valid_to'] })
export const availabilityStep = z.object({ availability: z.array(availabilityItem) })

export const pickupStep = z.object({
  pickup_windows: z.array(z.string().max(60)).max(20).default([]),
})

export const proofItem = z.object({
  doc_type:    z.enum(DOC_TYPES),
  storage_path: z.string().min(1),               // Pfad nach signiertem Upload
  note:        z.string().max(200).optional(),
})
export const proofsStep = z.object({
  proofs: z.array(proofItem).min(1, 'Mindestens ein Nachweis'),
})

export const consentStep = z.object({
  accept_terms:               z.literal(true),
  accept_food_responsibility: z.literal(true),
  accept_listing_accuracy:    z.literal(true),
  marketing_opt_in:           z.boolean().default(false),
})

// Vollständige Einreichung (Server-Guard für farm.submit)
export const submitSchema = z.object({
  profile:      profileStep,
  business:     businessStep,
  location:     locationStep,
  story:        storyStep,
  products:     productsStep,
  availability: availabilityStep,
  pickup:       pickupStep,
  proofs:       proofsStep,
  consent:      consentStep,
})
export type SubmitPayload = z.infer<typeof submitSchema>
```

### 4.2 — Vollständigkeits-Score (UI-Spiegel, kein Gate)

Für die Conversion-Anzeige (Fortschrittsbalken) berechnet der Wizard aus dem Schema einen Score:
`score = (erfüllte Pflichtfelder + 0.5·erfüllte empfohlene Felder) / (alle gewichteten Felder)`.
Der Balken ist **rein informativ**; der **echte** Gate ist die serverseitige `submitSchema`-Validierung (§5). Ein 100%-Balken ohne grünen Server-Check führt **nie** zur Einreichung (Pfeiler-Disziplin: Server führt).

---

## 5 · Edge Functions & API (Server führt)

Alle Schreibpfade laufen über Supabase Edge Functions (Deno) mit **Zod an der Grenze**, **Rechteprüfung vor Wirkung**, **Audit** und (bei öffentlichen/identitätsnahen Schritten) **Turnstile**. **service role nur hier**, nie im Frontend.

| Endpunkt (Edge Function) | Methode | Auth | Beschreibung |
|---|---|---|---|
| `POST /functions/v1/producer-onboarding-start` | POST | Session (frisch registrierter Nutzer) + Turnstile | Hebt `profiles.role → 'producer'`, legt `orgs (plan='demo')` + `org_members(org_role='org_owner')` + leeren `farms`-Draft an (service role, Audit `org.created`/`farm.created`). Idempotent (kein Doppel-Org bei Retry). |
| `GET  /functions/v1/producer-onboarding/state` | GET | Session (producer) | Liefert Schema-Version, gespeicherten Schritt-Zustand, Vollständigkeit, Plan-Limits/Entitlements (Bootstrap des Wizards). Zero-State bei frischem Draft. |
| `POST /functions/v1/producer-onboarding/save-step` | POST | Session (producer, `owns_farm`) | Validiert **einen** Schritt gegen das passende Zod-Sub-Schema, Upsert auf Ziel-Entity (Status bleibt `draft`), aktualisiert `producer_onboarding_progress`. Gibt Feld-genaue Fehler zurück. |
| `POST /functions/v1/producer-onboarding/upload-url` | POST | Session (producer, `owns_farm`) | Liefert **signierte** Storage-Upload-URL (privater Bucket `farm-verifications/{org}/{farm}/…`), MIME/Größen-Whitelist serverseitig. |
| `POST /functions/v1/producer-onboarding/submit` | POST | Session (producer = `org_owner`) | **Re-validiert die gesamte `submitSchema`** + Plan-Limits + ≥1 Nachweis, prüft `farm.submit`-Guard, setzt `farms.status: draft→pending_review` und `verification_status: submitted`, schreibt Staff-Queue + Audit `farm.submitted`. Bei Fehlern: `422` mit Feld-/Schritt-Fehlern, **kein** Statuswechsel. |

**Fehlersemantik (einheitlich, Pfeiler-konform):**

| Lage | Status | Body |
|---|---|---|
| Validierung fehlgeschlagen | `422` | `{ ok:false, errors: { step, field, message }[] }` |
| Plan-Limit erreicht | `403` | `{ ok:false, code:'plan_limit', minPlan, feature, upgradeUrl }` |
| Falsche Rolle / fremde Org | `403` | `{ ok:false, code:'forbidden' }` (RLS-Deny, nie 200 mit Fremddaten) |
| Illegaler Statusübergang (Doppel-Submit) | `409` | `{ ok:false, code:'invalid_transition', from, to }` |
| Leerer Draft / nichts gespeichert | `200` | Zero-State-Shape (`{ ok:true, step:'profile', complete:false }`), **kein** 500 |

> **`farm.submit`-Guard (Server, verbindlich):** `submitSchema` grün **UND** `products.length ≥ 1` **UND** `proofs.length ≥ 1` **UND** alle `requiredForSubmit`-Schritte vollständig **UND** Plan erlaubt Veröffentlichung. Andernfalls bleibt der Betrieb `draft` — der Übergang wird **nicht** durchgeführt (deny-by-default für Status, `CORE_BUSINESS_STATE_MACHINES.md` §0.1).

---

## 6 · Fortschrittsspeicherung (`producer_onboarding_progress`)

Damit Erzeuger das Onboarding **unterbrechen und fortsetzen** können, wird der Fortschritt persistiert. Die fachlichen Inhalte leben in den echten Tabellen (`farms`/`products`/`availability` als `draft`); diese Tabelle hält nur **Wizard-Meta** (welcher Schritt, wann zuletzt gespeichert, Vollständigkeit).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant |
| `farm_id` | UUID | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | Betrieb im Aufbau |
| `user_id` | UUID | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | bearbeitender Erzeuger |
| `schema_version` | INTEGER | NOT NULL DEFAULT 1 | Versions-Tag des Wizard-Schemas (Migrationssicherheit) |
| `current_step` | TEXT | NOT NULL DEFAULT `'profile'`, CHECK in Step-IDs | zuletzt aktiver Schritt |
| `completed_steps` | TEXT[] | NOT NULL DEFAULT `'{}'` | abgeschlossene Schritte |
| `completion_score` | NUMERIC(4,3) | NOT NULL DEFAULT 0 | informativer Vollständigkeits-Score (0–1) |
| `submitted_at` | TIMESTAMPTZ | NULL | Zeitpunkt `farm.submit` |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. DB-Konvention | |

- **Unique:** `(farm_id) WHERE deleted_at IS NULL` — ein Fortschritts-Datensatz je Betrieb.
- **RLS (deny-by-default):** SELECT/INSERT/UPDATE nur `owns_farm(farm_id) AND current_role_kind()='producer'`; Staff lesend im Ticket-Kontext (`is_platform_staff()`); DELETE nur service role. Spiegelt das Muster aus `DATABASE_MODEL.md` §7 / `ROLE_AND_PERMISSION_MODEL.md` §3.2.
- **DSGVO-Kategorie:** A (referenziert PII über `user_id`) — Migration-Kommentar `-- data_category: A`; in `me/export` enthalten; Retention analog `producer_invites` (90 Tage bei ungenutztem Abbruch, `COMPLIANCE_MODEL.md` §1/§4).
- **Migration:** additive Migration unter `app/supabase/migrations/` (z. B. `0010_producer_onboarding.sql`: diese Tabelle + `farm_verification_documents` + `consent_log`), RLS + Isolationstest ab Migration #1, dokumentierter Rollback (`CLAUDE.md` Datenbankregeln).

> **Begleit-Tabellen** (selbe Migration): `farm_verification_documents` (Nachweis-Metadaten, Storage-Pfad, `doc_type`, `reviewed_by`, Cat. A) und `consent_log` (Einwilligungen mit Version/Zeit/IP, Cat. A/C). Beide org-gescoped, RLS deny-by-default.

---

## 7 · Plan-bewusstes Onboarding (Entitlements & Upgrade-Pfad)

Onboarding startet immer im Plan **`demo`** (`orgs.plan='demo'`). Limits sind **datengetrieben** (Entitlement-Tabelle, kein hardcodierter Schwellwert — Kanon-Verbot), serverseitig durchgesetzt, vom Client nur gespiegelt (`ROLE_AND_PERMISSION_MODEL.md` §5).

| Wizard-Aspekt | `demo` | `basis` | `plus` | `pro` | `individuell` |
|---|:--:|:--:|:--:|:--:|:--:|
| Betrieb anlegen & vollständig pflegen | ✓ | ✓ | ✓ | ✓ | ✓ |
| Öffentlich gelistet nach Verifizierung | Vorschau | ✓ | ✓ | ✓ | ✓ |
| Anzahl Betriebe | 1 | 1 | 3 | 10 | ∞ |
| Produkte je Betrieb (Step 5-Limit) | 5 | 30 | 150 | ∞ | ∞ |
| Reservierungs-Eingang (Abholfenster sinnvoll) | — | ✓ | ✓ | ✓ | ✓ |
| SB-Bezahl-Onboarding-Hook (Stripe Connect) ⭐ | — | — | — | ✓ | ✓ |

- **Demo-Spezial:** Im `demo`-Plan kann der Erzeuger den Wizard **vollständig durchlaufen und einreichen** (Verifizierung möglich), aber das Listing bleibt nach `verified` **Vorschau** (nicht öffentlich im Finder), bis auf `basis`+ gewechselt wird → Lock-CTA „Jetzt freischalten" mit Deep-Link.
- **Plan-Lock-Vertrag (kein toter Button):** Jeder Lock zeigt (a) was gesperrt ist, (b) den **niedrigsten** Plan, der es löst, (c) einen **funktionierenden** Deep-Link `/erzeuger/billing?upgrade=<plan>&feature=<flag>`. Server-Ablehnung bei Überschreitung: `403 code:'plan_limit'` (`ROLE_AND_PERMISSION_MODEL.md` §5.2).
- **Kein Downgrade-Datenverlust:** Über-Limit-Produkte werden bei späterem Downgrade als „über Plan-Limit, nur lesbar" markiert, nicht gelöscht (Retrofit-bewusst).

> **Käufer zahlen nichts** (Vermittler-Prinzip, gesellschaftlicher Nutzen). Plan-Locks gelten ausschließlich für Erzeuger.

---

## 8 · Frontend-Verdrahtung (End-to-End-Pflicht)

Routen (Erzeuger-Welt, `ROLE_AND_PERMISSION_MODEL.md` §4 — nur `producer`/Owner-Sicht):

| Route | Inhalt |
|---|---|
| `/erzeuger/registrieren` | Signup (Supabase Auth + Turnstile) → E-Mail-Verifizierung → `producer-onboarding-start` |
| `/erzeuger/onboarding` | Wizard-Shell (Schema-Renderer, Schritt-Navigation, Autosave, Fortschrittsbalken) |
| `/erzeuger/onboarding/:step` | Deep-Link auf einen Schritt (Drilldown-Integrität, trägt `farm_id`-Kontext) |
| `/erzeuger` | Nach `submit`: Status „In Prüfung"; nach `verified`: Dashboard mit Listing-Link |

**Verdrahtungs-Kette (jeder Schritt, Kanon „End-to-End-Pflicht"):**
`Endpoint erreichbar (Edge Function) → realer Fetch (API-Client) → echtes DOM (Schema-Renderer) → Lade-/Leer-/Fehler-Zustand → gebundener Speichern-Handler → Refresh des Fortschritts`. Kein TODO, kein toter Button, kein Platzhalter.

**Zustände je Schritt (Pflicht):** `loading` (Skeleton), `empty/zero-state` (z. B. „Noch keine Produkte — legen Sie Ihr erstes Produkt an"), `error` (feld-genaue Zod-Fehler, kein roher 500), `saved` (Bestätigung + nächster Schritt).

### 8.1 — Schema-Renderer (eine Komponente rendert alle Schritte)

Ein generischer `OnboardingStep`-Renderer mappt `FieldType → Editorial-Komponente` (Text/Select/Multiselect/Money/Upload/Repeat-Group), nutzt ausschließlich Design-System-Tokens (`app/src/styles/theme.css`), keine hardcodierten Farben, keine Deko-Emojis. Bedingte Sichtbarkeit (`visibleIf`) und Plan-Gates (`planGate`) werden aus dem Schema gelesen.

### 8.2 — Autosave & Resume

- Debounced Save je Schritt (`save-step`), optimistic UI mit Rollback bei `422`.
- Resume: `GET state` lädt `current_step` + bisherige Inhalte; der Wizard springt an die zuletzt aktive Stelle.

### 8.3 — Disclaimer (durchgängig)

Persistenter Vermittler-/Lebensmittel-Hinweis als Footer im gesamten Wizard: „LokaleBauernConnect vermittelt — Vertragspartner und Verantwortlicher für Produkte/Kennzeichnung ist der Hof." (`COMPLIANCE_MODEL.md`, `ROLE_AND_PERMISSION_MODEL.md` Vermittler-Regel).

### 8.4 — SB-Bezahl-Onboarding-Hook (Phase 4 Track A, vorbereitet)

Wenn `is_self_service=true` **und** Plan `pro`+: nach `verified` erscheint ein **zusätzlicher** Onboarding-Schritt „Auszahlungskonto verbinden" (Stripe Connect, KYC bei Stripe). Bis dahin: Plan-Lock-CTA. SB-Zahlung wird erst möglich, wenn `verification_status='verified'` **und** Connect-Onboarding abgeschlossen ist (Eligibility-Gate, `CORE_BUSINESS_STATE_MACHINES.md` §3.4/§4) — kein toter Bezahl-Flow.

---

## 9 · Audit & Compliance im Onboarding

Jede mutierende Onboarding-Aktion schreibt nach `audit_log` (append-only, nur service role, Pfeiler 5). Namespace domänen-präfixiert.

| Aktion | `action` | `entity_type` | `reason`-Pflicht |
|---|---|---|---|
| Org/Profil-Provisioning | `org.created`, `profile.role_set` | `org`/`profile` | nein (System) |
| Betriebs-Draft angelegt | `farm.created` | `farm` | nein |
| Schritt gespeichert (sensible Felder) | `farm.draft_updated` | `farm` | nein |
| Nachweis hochgeladen | `farm.proof_uploaded` | `farm` | nein |
| Einwilligungen erteilt | `consent.granted` | `profile` | nein (Version protokolliert) |
| Einreichung | `farm.submitted` | `farm` | nein (System-Guard) |
| (Staff) Verifizierung/Ablehnung | `farm.verified` / `farm.rejected` | `farm` | **ja bei reject** (Staff-Maschine, §3 CORE) |

**DSGVO-Bezug (`COMPLIANCE_MODEL.md`):** `producer_onboarding_progress`, `farm_verification_documents`, `consent_log` sind **Kat. A** (PII), in `me/export`/`org/export` enthalten, mit definierter Retention; Nachweis-Belege liegen im **privaten** EU-Storage-Bucket, Zugriff nur über kurzlebige signierte URLs im berechtigten Kontext. Einwilligungs-Protokoll erfüllt Art. 7 (Nachweisbarkeit).

---

## 10 · Sicherheits- & Stop-Regeln (Onboarding-spezifisch)

- **Rolle/Org nie clientseitig.** `role`, `org_id`, `org_role`, `slug`, `verification_status`, `status` werden ausschließlich serverseitig vergeben/verändert. Client-Versuch → ignoriert/`403`.
- **Org-Boundary.** Jeder Save/Upload prüft `owns_farm(farm_id)`; fremde Org = `403`, nie `200` mit Fremddaten (Pfeiler 1, Isolationstest-Pflicht).
- **Turnstile** an Signup + `producer-onboarding-start` (Bot-/Spam-Schutz öffentlicher/identitätsnaher Einstiegspunkte).
- **Upload-Härtung.** Privater Bucket, signierte Upload-URLs, MIME-/Größen-Whitelist serverseitig, Dateiname-Normalisierung, kein öffentlicher Lesezugriff.
- **Idempotenz.** `producer-onboarding-start` und `submit` sind idempotent (kein Doppel-Org, kein Doppel-Submit; `409` bei bereits `pending_review`).
- **Stop-Regel (Kanon):** Ist unklar, *welche Rolle schreiben darf*, oder ist der **Org-Scope serverseitig nicht prüfbar**, oder ein **Statusübergang undefiniert** → **nicht bauen**, minimalen Fix vorschlagen, Owner-OK abwarten.

---

## 11 · Akzeptanzkriterien (Definition of Done — WAVE_15)

Funktional, End-to-End, Enterprise-Niveau — alles serverseitig verifiziert.

- [ ] **Datengetrieben:** Wizard rendert ausschließlich aus `onboardingSchema`; ein neuer Schritt/ein neues Feld erfordert **nur** eine Schema-Änderung (kein UI-Rewrite). UI- und Edge-Validierung nutzen **dasselbe** Zod-Schema.
- [ ] **Alle 9 Schritte** (Profil, Betrieb, Standort, Story, Produkte, Verfügbarkeit, Abholfenster, Nachweise, Disclaimer/Einwilligung) sind end-to-end verdrahtet (Endpoint→Fetch→DOM→Lade/Leer/Fehler→Handler→Refresh), keine toten Buttons/Platzhalter.
- [ ] **Pflichtfelder serverseitig erzwungen:** `submit` lehnt unvollständige Daten mit `422` (feld-genau) ab; Betrieb bleibt `draft`. Manipuliertes Frontend kann **keine** unvollständige/illegale Einreichung durchsetzen.
- [ ] **`farm.submit`-Guard greift:** Übergang `draft → pending_review` nur bei vollständigem `submitSchema` **+ ≥1 Produkt + ≥1 Nachweis + Pflicht-Einwilligungen**. Doppel-Submit → `409`, kein zweiter Statuswechsel.
- [ ] **Verifizierungs-Kopplung:** Eingereichter Betrieb erscheint **nicht** im öffentlichen Finder, bis Staff `verified` setzt; `rejected` zeigt Begründung + erlaubt `resubmit` (neuer Zyklus, Historie bleibt).
- [ ] **Nachweis-Upload sicher:** signierte Upload-URL, privater EU-Bucket, MIME/Größen-Whitelist serverseitig; Staff liest nur über kurzlebige signierte URLs im Ticket-Kontext.
- [ ] **Plan-Limits:** Produkt-/Betriebs-Limit serverseitig (`403 code:'plan_limit'`) + UI-Lock mit funktionierendem Upgrade-Deep-Link; `demo`-Listing bleibt Vorschau bis `basis`+.
- [ ] **Resume:** Abbruch + Wiederkehr verliert nichts; `state` lädt korrekten Schritt + Inhalte; Autosave robust gegen Reload.
- [ ] **Zero-State:** leere Produkte/Nachweise → freundlicher Zero-State + nächster CTA, nie 500/leerer Screen.
- [ ] **RLS/Isolation (Pfeiler 1/6):** Org B kann Draft/Progress/Nachweise von Org A weder lesen (0 Zeilen) noch schreiben (403). Käufer/anonyme Nutzer haben keinen Zugriff auf Onboarding-Daten. Isolationstest grün (Plattform- **und** Org-Ebene).
- [ ] **Rollen-Integrität:** `role`/`org_role`/`status`/`verification_status`/`slug` clientseitig **nicht** setzbar; Privilege-Escalation-Versuch schlägt fehl.
- [ ] **Audit (Pfeiler 5):** jede Mutation in `audit_log` (wer/was/wann); `reason` bei Staff-Ablehnung Pflicht; unabschaltbar.
- [ ] **Compliance:** Vermittler-/Lebensmittel-Disclaimer durchgängig sichtbar; Pflicht-Einwilligungen (`literal(true)`) protokolliert (`consent_log`, Version/Zeit/IP); Onboarding-PII in `me/export`/`org/export` enthalten; Retention definiert.
- [ ] **Migration:** additive Migration (`producer_onboarding_progress`, `farm_verification_documents`, `consent_log`), RLS deny-by-default + Indizes + dokumentierter Rollback; `-- data_category`-Annotation je Tabelle.
- [ ] **Build/Typecheck grün** (`npm run build`), Konsole sauber (keine `TypeError`/401-Schleifen), gezielte Tests auf den geänderten Pfaden (Pflichtfeld-Negativtests, Cross-Org-Negativtest, Plan-Limit, Doppel-Submit `409`).

---

## 12 · Abgleich mit den 7 Produktionspfeilern

| Pfeiler | Beleg im Onboarding |
|---|---|
| 1 Org-Boundary | jeder Save/Upload `owns_farm`-gated; fremde Org = 0 Zeilen / 403 |
| 2 Zero-State | leere Produkte/Nachweise → Zero-State + CTA; leerer Draft → `200`, nie 500 |
| 3 Scope-Transparenz | Wizard zeigt Org/Betrieb/Plan + Fortschritt/Datenstand; Status sichtbar („In Prüfung") |
| 4 RBAC | nur `producer`/`org_owner` onboardet; Plan-Locks mit konkretem Upgrade-Pfad |
| 5 Audit | jede Mutation in `audit_log`, `reason` bei Ablehnung, unabschaltbar |
| 6 Testpflicht | Pflichtfeld-/Plan-Limit-/Cross-Org-/Doppel-Submit-Tests als Gate |
| 7 Drilldown-Integrität | `/erzeuger/onboarding/:step` trägt `farm_id`-Kontext, baut nie org-fremde URLs |

---

> **Änderungen** an diesem Onboarding-Modell sind produkt-/security-relevant → **Owner-Freigabe** + ADR in `.claude/memory/decisions/` + Update in `MASTER_INDEX.md` (§3 `docs/ONBOARDING_SYSTEM.md` → ✅) und `docs/releases/PHASE_STATUS.md` (WAVE_15).
