# LokaleBauernConnect — Datenbank-Modell

> **Stand:** 2026-06-20 · **Supabase (EU) · PostgreSQL · RLS deny-by-default ab Migration #1**
> Verbindliche Datenmodell-Referenz der Plattform-Spezialschicht (Hofladen-Finder · Produktverfügbarkeit · Reservierung/Abholung · Saison-Radar · Bewertungen/Reputation · USP SB-Bezahlung) auf dem fixen Stack React/Vite/TS · Supabase · Cloudflare · Stripe. Vollständig in der **Hof-Domäne** modelliert — **keine VMS-/Zeitarbeits-Begriffe** (kein Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC).
>
> **Quelle der Wahrheit (verbindlich):** die echten Migrationen `app/supabase/migrations/0001_core.sql` … `0004_onboarding.sql`. Dieses Dokument beschreibt **exakt** das dort definierte Schema (Tabellen, Spalten, Enums, RLS-Policies, Trigger). Bei Abweichung gewinnt die Migration; ergänzend zeigt `app/src/lib/types.ts` die Frontend-Typen (`Farm`, `Product`, `Availability`, `Reservation`, `ProductCategory`, `FarmType`), die der Data-Layer (`app/src/lib/data.ts`) auf das DB-Schema mappt.
>
> **Bezug:** `PHASEN.md` WAVE_02 (Datenmodell+RLS, Isolations-Gate) · `CLAUDE.md` §„Datenbank-, RLS- & Planregeln" + 7 Produktionspfeiler · ADR `docs/adr/0001`, `0002`.

---

## 0 · Grundprinzipien (nicht verhandelbar)

| Prinzip | Umsetzung im Modell |
|---|---|
| **Mandantenfähigkeit** | Jede fachliche Tabelle trägt `org_id UUID NOT NULL` → genau **eine** Erzeuger-/Betreiber-Org. Käufer-Aktionen sind org-zugeordnet über den referenzierten Hof. |
| **Deny-by-default RLS** | `ENABLE` + `FORCE ROW LEVEL SECURITY` ab Migration #1. Ohne passende Policy = **kein** Zugriff (kein „200 mit Fremddaten"). |
| **service role nur Edge** | Schreibpfade mit erhöhten Rechten (Webhooks, Backfill, Audit) laufen ausschließlich in Supabase Edge Functions. Frontend = `anon`/`authenticated` mit `VITE_`-Public-Key. |
| **Soft-Delete** | `deleted_at TIMESTAMPTZ` statt physischem Löschen (DSGVO-Löschpflicht via Edge-Job + Audit). Alle Read-Policies filtern `deleted_at IS NULL`. |
| **Zeitstempel** | `created_at` / `updated_at TIMESTAMPTZ DEFAULT now()`; `updated_at` per Trigger `set_updated_at()`. |
| **Audit & Verantwortlichkeit** | Jede kritische Mutation → `audit_log` (wer/was/warum). `reason` Pflicht bei Status-/Geld-/Lösch-Aktionen. |
| **Zero-State** | Leere Mengen geben leere Arrays / `available=false` zurück — nie 500/NULL-Pointer (Pfeiler 2). |
| **Vermittler-Rolle** | Kein Eigenverkauf-Datensatz der Plattform. `sb_payments` modelliert nur die **Zahlungsanbindung** zwischen Käufer und Hof (Stripe Connect, Geld fließt an den Hof; Plattform behält nur Gebühr). |

**Identität:** `auth.users` (Supabase Auth, EU) ist Eigentümer der Login-Identität. `public.profiles` hängt 1:1 daran (`user_id = auth.users(id)`, PK) und trägt die fachliche Rolle über das Enum `user_role` (`kaeufer` | `erzeuger` | `staff` | `owner`). Der **Owner** ist hier ein vierter, persistierter `user_role`-Wert (nicht nur eine Rang-Ausprägung) — siehe Enum-Liste in §2.

---

## 1 · ER-Übersicht (Entity Relationships)

```
                         ┌─────────────────────────┐
                         │  auth.users (Supabase)  │
                         │  id (UUID PK), email     │
                         └────────────┬────────────┘
                                      │ 1:1
                                      ▼
┌──────────────┐  1:N    ┌──────────────────────────────────┐
│    orgs      │◀────────│            profiles              │
│ id (UUID PK) │ org_id  │ user_id (UUID PK = auth.users.id)│
│ name,        │         │ org_id?, role(user_role),        │
│ created_at,  │         │ display_name, created_at         │
│ deleted_at   │         └──────────────────────────────────┘
└──────┬───────┘
       │ 1:N
       │ org_id
       ▼
┌──────────────────────────┐
│           farms          │   (id = TEXT-Slug, PK)
│ id (TEXT PK = Slug),     │
│ org_id, name, type,      │
│ street, plz, city,       │
│ lat, lng, story,         │
│ opening_hours,           │
│ pickup_windows[],        │
│ categories[], verified,  │
│ rating_avg, rating_count,│
│ reputation_grade,        │
│ deleted_at, ...          │
└───┬──────────┬───────────┘
    │ 1:N      │ 1:N
    │ farm_id  │ farm_id
    ▼          ▼
┌─────────────┐  ┌──────────────┐
│  products   │  │ reservations │
│ id (TEXT),  │  │ id (UUID),   │
│ farm_id,    │  │ org_id,      │
│ org_id,     │  │ farm_id,     │
│ name,       │  │ product_id,  │
│ category,   │  │ quantity,    │
│ unit, price,│  │ pickup_window│
│ availability│  │ name,contact,│
│ (Enum),     │  │ status,      │
│ seasonal    │  │ payment_*    │
└─────────────┘  └──────────────┘

  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   waitlist   │   │  audit_log   │   │   reviews    │
  │ id (UUID),   │   │ id (UUID),   │   │ id (UUID),   │
  │ role, name,  │   │ org_id?,     │   │ farm_id,     │
  │ email, plz,  │   │ actor_user_id│   │ org_id,      │
  │ ort, source  │   │ action,      │   │ rating,      │
  │ (Landing/    │   │ entity_type, │   │ comment,     │
  │  Interesse)  │   │ entity_id,   │   │ verified,    │
  └──────────────┘   │ reason,      │   │ status       │
                     │ details JSONB│   └──────────────┘
                     └──────────────┘

  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ sb_payments  │   │subscriptions │   │ org_members  │
  │ id, org_id,  │   │ id, org_id,  │   │ org_id,      │
  │ farm_id,     │   │ plan, status,│   │ user_id,     │
  │ product_id?, │   │ stripe_*,    │   │ role         │
  │ amount_cents,│   │ current_     │   │ (user_role)  │
  │ status,      │   │ period_end   │   │ (Multi-Org)  │
  │ stripe_*     │   └──────────────┘   └──────────────┘
  └──────────────┘

  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐
  │org_locations │   │   bounties   │   │farm_applications│
  │ id, org_id,  │   │ id, title,   │   │ id, name, type, │
  │ farm_id?,    │   │ category?,   │   │ email, plz,     │
  │ name, type,  │   │ plz, radius, │   │ categories[],   │
  │ is_unmanned  │   │ reward_cents,│   │ status          │
  └──────────────┘   │ status       │   │ (application_   │
                     └──────────────┘   │  status)        │
   ┌──────────────┐  ┌──────────────┐   └────────────────┘
   │credits_ledger│  │payment_events│
   │ id, org_id,  │  │ id (Stripe   │
   │ amount_cents,│  │  evt-ID PK), │
   │ reason, ref  │  │ type         │
   └──────────────┘  └──────────────┘
```

> Hinweis: Auth, Billing-Mechanik, Chat, Benachrichtigungen und das Staff-/Support-Center stammen aus dem ConnectCore-**Kern**. **Bewertungen** (`reviews`) sind in dieser Plattform jedoch real in Migration `0003_marketplace.sql` modelliert (inkl. Reputations-Trigger auf `farms`). Dieses Dokument beschreibt die **tatsächlich migrierte** Spezialschicht.

---

## 2 · Enums (Domänen-Vokabular)

Als native Postgres-Enums modelliert (Typsicherheit). Erweiterung additiv via `ALTER TYPE … ADD VALUE`. Die folgende Liste ist **1:1 aus den Migrationen** `0001_core.sql` (Kern), `0002_payments.sql` (Payments) und `0004_onboarding.sql` (Onboarding):

```sql
-- Fachliche Rolle (0001_core.sql) — vier Werte; 'owner' ist persistiert, KEIN reiner Rang.
create type user_role as enum ('kaeufer', 'erzeuger', 'staff', 'owner');

-- Hof-/Betriebstyp  (= FarmType in types.ts) — 0001_core.sql
create type farm_type as enum
  ('Hofladen', 'Bauernhof', 'Imkerei', 'Hofmetzgerei', 'Manufaktur', 'Gärtnerei');

-- Produktkategorie  (= ProductCategory in types.ts) — 0001_core.sql
create type product_category as enum
  ('Obst', 'Gemüse', 'Eier', 'Käse', 'Honig', 'Fleisch & Wurst',
   'Kartoffeln', 'Säfte', 'Marmelade', 'Blumen', 'Getreide & Mehl');

-- Verfügbarkeitsstufe  (= Availability in types.ts) — Enum heißt 'availability_state' (0001_core.sql)
create type availability_state as enum ('available', 'low', 'soon', 'out');

-- Reservierungs-Lifecycle (Zustandsmaschine, siehe §6) — 0001_core.sql
create type reservation_status as enum
  ('requested', 'confirmed', 'picked_up', 'cancelled', 'expired');

-- SB-/Reservierungs-Zahlungsstatus (0002_payments.sql, Stripe-gespiegelt)
create type payment_status as enum
  ('initiated', 'paid', 'failed', 'refunded', 'canceled');

-- Abo-Status (0002_payments.sql)
create type subscription_status as enum
  ('inactive', 'trialing', 'active', 'past_due', 'canceled');

-- Erzeuger-Bewerbung (0004_onboarding.sql)
create type application_status as enum
  ('eingereicht', 'in_pruefung', 'angenommen', 'abgelehnt');
```

> **Nicht als Enum modelliert (Stand 0001–0004):** Es gibt **keinen** `farm_status`-, `org_plan`- oder `waitlist_status`-Typ. Hof-Sichtbarkeit läuft über `farms.verified BOOLEAN` + `farms.deleted_at` (kein `published/draft`-Status). Der **Org-Plan** ist ein `text`-CHECK auf `subscriptions.plan` (`'demo' | 'basis' | 'plus' | 'pro' | 'individuell'`), kein eigenes Enum. Die `reputation_grade`-Stufen (`neu/bronze/silber/gold`) sind ein `text`-CHECK auf `farms` (0003), kein Enum. Weitere `text`-CHECK-Felder: `reviews.status` (`published/hidden`), `bounties.status` (`open/fulfilled/expired/cancelled`), `org_locations.type` (`hofladen/marktstand/sb_stand/ab_hof`), `reservations.payment_method` (`pickup_cash/online`).

---

## 3 · Hilfsfunktionen & Trigger (Ist-Stand der Migrationen)

Die Migrationen `0001`–`0004` definieren **genau drei** Funktionen. Es gibt (Stand 0004) **keine** `current_org_id()`, `current_role_kind()`, `is_staff()`, `owns_farm()`, `is_owner()` oder `is_org_owner()` — RLS-Policies fragen `profiles`/`org_members` stattdessen **inline per Sub-Select** ab (siehe §7).

```sql
-- updated_at-Trigger (0001_core.sql) — auf farms, products, subscriptions
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- Multi-Org-Mitgliedschaftsprüfung (0003_marketplace.sql), SECURITY DEFINER, prüft nur auth.uid().
-- Berücksichtigt sowohl org_members als auch profiles.org_id.
create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from profiles  pr where pr.org_id = p_org and pr.user_id = auth.uid());
$$;

-- Reputations-Neuberechnung auf farms (0003_marketplace.sql), Trigger nach INSERT/UPDATE/DELETE auf reviews.
create or replace function recompute_farm_reputation() returns trigger language plpgsql as $$ … $$;
```

> **Owner-Rang:** Der **Owner** ist in diesem Schema ein **persistierter `user_role`-Wert** (`'owner'`, 0001), nicht eine `org_members.org_role`-Ausprägung. `org_members.role` ist selbst vom Typ `user_role` (Default `'erzeuger'`) — es existiert **kein** separates `org_role`-Enum mit `platform_owner/org_owner/org_member`.

> **Wichtig (Pfeiler 1):** Lese-Policies geben für fremde Org **0 Zeilen** zurück — kein „leiser Fehler". Schreibversuche auf fremde Org scheitern an `WITH CHECK` → der Edge-/RLS-Pfad liefert 403, nie 200 mit Fremddaten.

---

## 4 · Tabellen-Referenz

Konvention je Tabelle (Stand 0001–0004): Primärschlüssel meist `uuid DEFAULT gen_random_uuid()` — **Ausnahme:** `farms.id` und `products.id` sind `TEXT` (stabile Slugs), `payment_events.id` ist die Stripe-Event-ID (`text`). `created_at` ist durchgängig vorhanden; `updated_at` (+ `set_updated_at`-Trigger) nur auf `farms`, `products`, `subscriptions`; `deleted_at` nur auf `orgs`, `farms`, `org_locations`. `org_id` trägt jede mandantengebundene Tabelle.

### 4.1 `orgs` — Erzeuger-/Betreiber-Organisation (0001_core.sql)

Eine Org = ein wirtschaftlicher Träger (Bauernhof-Betrieb, Hofladen-Verbund, Manufaktur). Käufer benötigen **keine** Org. Die Tabelle ist bewusst schlank; Abo/Plan/Stripe-Felder liegen in `subscriptions` (0002), nicht hier.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `name` | text | NOT NULL | Anzeigename des Betriebs |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `deleted_at` | timestamptz | NULL | Soft-Delete |

> Felder wie `slug`, `plan`, `stripe_customer_id`, `stripe_connect_id`, `status`, `billing_address` existieren **nicht** auf `orgs`. Plan/Status/Stripe-IDs liegen in `subscriptions` (§4.x); Stripe-IDs für SB-Zahlungen in `sb_payments`.

### 4.2 `profiles` — Nutzerprofil (1:1 zu `auth.users`, 0001_core.sql)

Trägt die fachliche Rolle. `kaeufer`: typischerweise kein `org_id` (kauft hofübergreifend). `erzeuger`/`staff`/`owner`: `org_id` gesetzt. **PK ist `user_id`** (nicht `id`).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `user_id` | uuid | PK, **FK → `auth.users(id)` ON DELETE CASCADE** | identisch mit `auth.uid()` |
| `org_id` | uuid | NULL, FK → `orgs(id)` ON DELETE SET NULL | NULL bei reinem Käufer |
| `role` | `user_role` | NOT NULL DEFAULT `'kaeufer'` | kaeufer \| erzeuger \| staff \| owner |
| `display_name` | text | NULL | Anzeigename |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

> **Hinweis:** Es gibt (Stand 0004) **keine** `CHECK ((role='kaeufer') OR org_id IS NOT NULL)`-Invariante, keine `phone/plz/city/marketing_opt_in`-Spalten und **keinen** `on_auth_user_created`-Trigger in den Migrationen. Schreiben auf `profiles` (insb. `role`/`org_id`) ist per RLS nur `service_role` erlaubt (verhindert Self-Promotion); Lesen nur das eigene Profil.

### 4.3 `farms` — Hof / Hofladen (0001_core.sql, erweitert in 0003)

DB-Entsprechung des `Farm`-Typs. **`id` ist ein `TEXT`-Slug** (stabil, z. B. `'hof-sonnenwiese'`), kein UUID. `lat/lng` sind `NOT NULL`. Sichtbarkeit läuft über `verified` (Trust-Flag) + `deleted_at` (Soft-Delete) — es gibt **keinen** `status`-Lifecycle. Reputationsspalten (`rating_avg/rating_count/reputation_grade`) ergänzt Migration `0003_marketplace.sql` (per Trigger gepflegt).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | text | PK | stabiler Slug (Deep-Link `/hof/:id`) |
| `org_id` | uuid | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant |
| `name` | text | NOT NULL | |
| `type` | `farm_type` | NOT NULL | Hofladen/Bauernhof/Imkerei/… |
| `street` | text | NOT NULL | |
| `plz` | text | NOT NULL | Such-/Filterschlüssel (Index) |
| `city` | text | NOT NULL | |
| `lat` | double precision | NOT NULL | Distanz/Karte |
| `lng` | double precision | NOT NULL | |
| `story` | text | NOT NULL DEFAULT `''` | Editorial-Hoftext |
| `opening_hours` | text | NOT NULL DEFAULT `''` | Freitext |
| `pickup_windows` | text[] | NOT NULL DEFAULT `'{}'` | Wählbare Abholfenster |
| `categories` | `product_category[]` | NOT NULL DEFAULT `'{}'` | Kategorie-Facette (Finder-Filter) |
| `verified` | boolean | NOT NULL DEFAULT false | Staff-Verifizierung (Trust) |
| `rating_avg` | numeric(3,2) | NOT NULL DEFAULT 0 (0003) | aggregiert aus `reviews` (Trigger) |
| `rating_count` | integer | NOT NULL DEFAULT 0 (0003) | Anzahl veröffentlichter Bewertungen |
| `reputation_grade` | text | NOT NULL DEFAULT `'neu'`, CHECK in (`neu`,`bronze`,`silber`,`gold`) (0003) | abgeleitete Reputationsstufe |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | created/updated DEFAULT now(); `updated_at` per Trigger | |

> Felder wie `slug`, `status`, `is_self_service`, `verified_at`, `verified_by` existieren **nicht**. Unbemannte SB-Stände werden über `org_locations.is_unmanned` (0003) modelliert, nicht über ein `farms`-Flag.

### 4.4 `products` — Produkt eines Hofes (0001_core.sql)

Stammdaten **inkl.** aktueller Verfügbarkeit. Die Verfügbarkeit lebt **direkt** als Enum-Spalte `availability` auf `products` — es gibt **keine** separate `availability`-Tabelle und keine Verfügbarkeits-Historie.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | text | PK | stabiler Slug/ID |
| `farm_id` | text | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | |
| `org_id` | uuid | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant |
| `name` | text | NOT NULL | |
| `category` | `product_category` | NOT NULL | |
| `unit` | text | NOT NULL | z. B. „Schale 500g", „Glas 250g", „kg" |
| `price` | numeric(10,2) | NOT NULL, CHECK ≥ 0 | Preis in EUR (kein Cent-Integer) |
| `availability` | `availability_state` | NOT NULL DEFAULT `'available'` | aktueller Bestands-/Saisonstatus |
| `seasonal` | boolean | NOT NULL DEFAULT false | Saison-Radar-Kennzeichnung |
| `created_at` / `updated_at` | timestamptz | DEFAULT now(); `updated_at` per Trigger | |

> **Preis als `numeric(10,2)` (EUR):** `Product.price` (`types.ts`) entspricht direkt der DB-Spalte; der Data-Layer (`mapFarm` in `data.ts`) liest `price` ohne Cent-Umrechnung. Es gibt **keine** `currency`-, `sort_order`- oder `deleted_at`-Spalte auf `products`.

### 4.5 `reservations` — Vorbestellung/Abholung (0001_core.sql, erweitert in 0002)

DB-Entsprechung des `Reservation`-Typs. Käufer (eingeloggt **oder** Gast) reserviert ein Produkt zu einem Abholfenster. Es gibt **keinen** `buyer_id`-Bezug — der Käufer wird über `name` + `contact` erfasst (Gast-fähig). Zustandsmaschine siehe §6.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `farm_id` | text | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | |
| `product_id` | text | NOT NULL, FK → `products(id)` ON DELETE CASCADE | |
| `org_id` | uuid | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant des Hofes |
| `quantity` | integer | NOT NULL, CHECK between 1 and 50 | |
| `pickup_window` | text | NOT NULL | Gewähltes Abholfenster |
| `name` | text | NOT NULL | Abholer-Name (auch bei Gast) |
| `contact` | text | NOT NULL | E-Mail oder Telefon |
| `status` | `reservation_status` | NOT NULL DEFAULT `'requested'` | Lifecycle |
| `payment_method` | text | NOT NULL DEFAULT `'pickup_cash'`, CHECK in (`pickup_cash`,`online`) (0002) | Barzahlung vor Ort vs. online |
| `payment_status` | `payment_status` | NOT NULL DEFAULT `'initiated'` (0002) | Zahlungsstatus bei Online-Zahlung |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

> Felder wie `buyer_id`, `unit_price_cents`, `note`, `cancel_reason`, `sb_payment_id`, `updated_at`, `deleted_at` existieren **nicht** auf `reservations`. Mengen-Obergrenze ist **50** (nicht 999).

### 4.6 `sb_payments` — Sichere SB-Bezahlung (⭐ USP, 0002_payments.sql; `location_id` aus 0003)

Zahlungsanbindung am unbemannten SB-Hofladen: QR am Stand → Stripe → Quittung. **Stripe ist die Wahrheit**, diese Tabelle ist der idempotente Spiegel (vom Webhook-Handler in einer Edge Function gepflegt).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `org_id` | uuid | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant |
| `farm_id` | text | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | SB-Stand |
| `product_id` | text | NULL, FK → `products(id)` ON DELETE SET NULL | optional |
| `quantity` | integer | NOT NULL DEFAULT 1, CHECK between 1 and 50 | |
| `amount_cents` | integer | NOT NULL, CHECK ≥ 0 | Bruttobetrag |
| `currency` | text | NOT NULL DEFAULT `'eur'` | |
| `method` | text | NULL | card/sepa_debit/paypal/giropay/klarna… |
| `status` | `payment_status` | NOT NULL DEFAULT `'initiated'` | Stripe-gespiegelt |
| `stripe_checkout_session` | text | NULL | |
| `stripe_payment_intent` | text | NULL | Idempotenz-Anker |
| `payer_contact` | text | NULL | optional, für Quittung |
| `location_id` | uuid | NULL, FK → `org_locations(id)` ON DELETE SET NULL (0003) | QR je Stand |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `paid_at` | timestamptz | NULL | |

> **Hinweis:** Spaltennamen sind `stripe_payment_intent`/`stripe_checkout_session` (ohne `_id`-Suffix). Es gibt **keine** `platform_fee_cents`, `line_items`, `stripe_event_id`, `receipt_url`, `refunded_at`, `buyer_id`, `reservation_id` Spalten auf `sb_payments`. Webhook-Idempotenz läuft über die separate Tabelle `payment_events` (Stripe-Event-ID als PK). Frontend liest nur lesend; Schreiben nur `service_role`.

### 4.7 `subscriptions` — Erzeuger-Abo (0002_payments.sql)

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK | |
| `org_id` | uuid | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | |
| `plan` | text | NOT NULL DEFAULT `'basis'`, CHECK in (`demo`,`basis`,`plus`,`pro`,`individuell`) | Abo-Stufe |
| `status` | `subscription_status` | NOT NULL DEFAULT `'inactive'` | inactive/trialing/active/past_due/canceled |
| `stripe_customer_id` | text | NULL | |
| `stripe_subscription_id` | text | UNIQUE, NULL | |
| `current_period_end` | timestamptz | NULL | Ablauf bezahlter Periode (Webhook) |
| `created_at` / `updated_at` | timestamptz | DEFAULT now(); `updated_at` per Trigger | |

### 4.8 `audit_log` — Audit (0001_core.sql)

Jede kritische Mutation: wer/was/warum. Geschrieben ausschließlich über `service_role` (keine RLS-Policy für anon/authenticated).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `org_id` | uuid | NULL | betroffener Mandant |
| `actor_user_id` | uuid | NULL | Akteur (NULL = System/Edge-Job) |
| `action` | text | NOT NULL | z. B. `reservation.cancel`, `farm.verify` |
| `entity_type` | text | NOT NULL | `farm` \| `product` \| `reservation` \| … |
| `entity_id` | text | NULL | betroffene Zeile (text, da Hof-/Produkt-IDs Slugs sind) |
| `reason` | text | NULL (App-Pflicht bei kritischen Aktionen) | Begründung (Confirm+Reason) |
| `details` | jsonb | NOT NULL DEFAULT `'{}'` | strukturierter Kontext (Vorher/Nachher etc.) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

> **Hinweis:** `id` ist `uuid` (nicht BIGSERIAL). Es gibt **keine** `actor_id`/`old_values`/`new_values`/`ip_address`/`user_agent`-Spalten und keine FK-Constraints auf `actor_user_id`/`org_id`. Vorher-/Nachher-Snapshots werden in `details` (jsonb) abgelegt. Append-only wird über die **Abwesenheit** von UPDATE/DELETE-Policies erzwungen (kein Zugriff für anon/authenticated, nur `service_role` schreibt).

### 4.9 `waitlist` — Plattform-Interessenten (Landing, 0001_core.sql)

In den Migrationen ist `waitlist` die **Landing-/Go-Live-Interessentenliste** (frühe Anmelder), **nicht** eine Produkt-Nachrücker-Warteliste. Sie ist insert-only (anon erlaubt), Lesen nur `service_role`.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | |
| `role` | text | NOT NULL DEFAULT `'kaeufer'` | Interessent als Käufer/Erzeuger |
| `name` | text | NULL | |
| `email` | text | NOT NULL | |
| `plz` | text | NOT NULL | |
| `ort` | text | NULL | |
| `source` | text | NOT NULL DEFAULT `'landing'` | Herkunft |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

> **Hinweis:** `waitlist` hat **kein** `org_id`/`farm_id`/`product_id`/`buyer_id`/`status`/`queue_rank`. Eine Produkt-Nachrücker-Warteschlange (queued→notified→converted) ist **nicht** migriert. Insert-Policy validiert nur `char_length(email) ≤ 320 AND char_length(plz) ≤ 16`.

### 4.10 Marktplatz-Tabellen (0003_marketplace.sql)

| Tabelle | Schlüsselspalten | Zweck |
|---|---|---|
| `org_members` | PK `(org_id, user_id)`; `role user_role DEFAULT 'erzeuger'` | Multi-Org: ein User in mehreren Orgs |
| `org_locations` | `id uuid`, `org_id`, `farm_id?`, `name`, `type` CHECK (`hofladen`/`marktstand`/`sb_stand`/`ab_hof`), `is_unmanned bool`, `deleted_at` | Multi-Standorte inkl. unbemannter SB-Stand (USP) |
| `reviews` | `id uuid`, `farm_id`, `org_id`, `reservation_id?`, `author_user_id?`, `rating smallint` CHECK 1–5, `comment` (≤2000), `verified bool`, `status` CHECK (`published`/`hidden`) | Bewertungen → Reputation (Trigger `recompute_farm_reputation`) |
| `bounties` | `id uuid`, `author_user_id?`, `title`, `category product_category?`, `plz`, `radius_km` CHECK 1–200, `reward_cents?`, `status` CHECK (`open`/`fulfilled`/`expired`/`cancelled`) | Käufer-Gesuche mit optionaler Belohnung |
| `credits_ledger` | `id uuid`, `org_id`, `amount_cents`, `reason`, `ref?` | Empfehlungs-/Bonus-Guthaben für Erzeuger |

### 4.11 `farm_applications` — Erzeuger-Bewerbung (0004_onboarding.sql)

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | uuid | PK | |
| `name` | text | NOT NULL | |
| `type` | `farm_type` | NOT NULL | |
| `email` | text | NOT NULL | |
| `phone` | text | NULL | |
| `street` / `plz` / `city` | text | NOT NULL | |
| `categories` | `product_category[]` | NOT NULL DEFAULT `'{}'` | |
| `story` | text | NOT NULL DEFAULT `''` | |
| `opening_hours` | text | NOT NULL DEFAULT `''` | |
| `pickup_windows` | text[] | NOT NULL DEFAULT `'{}'` | |
| `status` | `application_status` | NOT NULL DEFAULT `'eingereicht'` | eingereicht/in_pruefung/angenommen/abgelehnt |
| `decision_reason` | text | NULL | Begründung (Staff-Entscheidung) |
| `decided_at` | timestamptz | NULL | |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

> Insert öffentlich (auch anonym) mit Validierung (`name` 2–200, `email` ≤320, `plz ~ '^[0-9]{5}$'`); Lesen/Moderieren nur `role in ('staff','owner')`.

---

## 5 · Indizes (Ist-Stand 0001–0004)

Genau die in den Migrationen angelegten Indizes — heiße Pfade: **PLZ-Suche** (Finder), **org-Scoping**, **Status-Listen**.

| Tabelle | Index (Migration) | Spalten | Zweck |
|---|---|---|---|
| `farms` | `farms_plz_idx` (0001) | `(plz)` | PLZ-Filter (Finder) |
| `farms` | `farms_org_idx` (0001) | `(org_id)` | Mandanten-Scoping / RLS-Joins |
| `farms` | `farms_active_idx` (0001) | `(deleted_at) WHERE deleted_at IS NULL` | aktive Höfe |
| `products` | `products_farm_idx` (0001) | `(farm_id)` | Hofladen-Auflistung |
| `products` | `products_cat_idx` (0001) | `(category)` | Kategorie-Filter |
| `reservations` | `reservations_farm_idx` (0001) | `(farm_id)` | Hof-Reservierungsliste |
| `reservations` | `reservations_status_idx` (0001) | `(status)` | Status-Filter |
| `subscriptions` | `subscriptions_org_idx` (0002) | `(org_id)` | Abo je Mandant |
| `subscriptions` | UNIQUE `stripe_subscription_id` (0002) | `(stripe_subscription_id)` | Stripe-Lookup/Idempotenz |
| `sb_payments` | `sb_payments_org_idx` (0002) | `(org_id)` | Einnahmen je Mandant |
| `sb_payments` | `sb_payments_farm_idx` (0002) | `(farm_id)` | Einnahmen je Stand |
| `sb_payments` | `sb_payments_status_idx` (0002) | `(status)` | Status-Filter |
| `org_members` | `org_members_user_idx` (0003) | `(user_id)` | Multi-Org-Lookup |
| `org_locations` | `org_locations_org_idx` (0003) | `(org_id)` | Standorte je Org |
| `org_locations` | `org_locations_plz_idx` (0003) | `(plz)` | Standort-PLZ |
| `reviews` | `reviews_farm_idx` (0003) | `(farm_id)` | Bewertungen je Hof |
| `bounties` | `bounties_status_idx` (0003) | `(status)` | offene Gesuche |
| `bounties` | `bounties_plz_idx` (0003) | `(plz)` | Gesuch-PLZ |
| `credits_ledger` | `credits_org_idx` (0003) | `(org_id)` | Guthaben je Org |
| `farm_applications` | `farm_applications_status_idx` (0004) | `(status)` | Bewerbungs-Queue |
| `farm_applications` | `farm_applications_plz_idx` (0004) | `(plz)` | Bewerbungs-PLZ |

> **Nicht vorhanden (Stand 0004):** GIN-Index auf `farms.categories`, Geo-Index `(lat,lng)`, zusammengesetzte `(org_id,status,created_at)`-Indizes, `audit_log`-Indizes, `profiles`-Indizes. Diese sind in `ENTERPRISE_ARCHITECTURE.md` §3 als **Skalierungsausbau** (Stufe 300+) geplant, aber noch nicht migriert.

---

## 6 · Zustandsmaschine `reservations` (CORE_BUSINESS_STATE_MACHINES)

Enum `reservation_status` = `requested | confirmed | picked_up | cancelled | expired` (0001). Es gibt **keinen** `ready`- oder `no_show`-Status.

```
requested ──confirm(Erzeuger)──▶ confirmed ──pickup(Erzeuger)──▶ picked_up
   │                                │
   ├─cancel(Käufer/Erzeuger)─▶ cancelled ◀──cancel─┤
   │                                                │
   └─Abholfenster+Karenz verstrichen─▶ expired ◀───┘
```
- **Erlaubte Übergänge** werden serverseitig (Edge Function / Trigger) erzwungen, nicht im Client. Jeder Übergang → `audit_log` (`reason` Pflicht bei `cancelled`).
- `requested → expired` und `confirmed → expired` per Cron-Edge-Job (Abholfenster + Karenz überschritten).
- Nur Erzeuger der besitzenden Org (bzw. `staff`/`owner`) dürfen `confirmed`/`picked_up` setzen; Käufer darf nur stornieren.
- **Verfügbarkeit:** liegt direkt als `products.availability` (Enum) — es gibt keinen separaten Verfügbarkeitssatz, der dekrementiert wird; Mengenführung ist nicht migriert. Vollständige Übergangstabelle: `docs/CORE_BUSINESS_STATE_MACHINES.md` §1.

---

## 7 · Row-Level Security (deny-by-default) — Policy je Tabelle

**Aktivierung für jede Tabelle:**
```sql
alter table <t> enable row level security;
```
> **Hinweis:** Die Migrationen verwenden `enable row level security`; ein zusätzliches `force row level security` ist (Stand 0004) **nicht** gesetzt. Ohne passende Policy = kein Zugriff. `service_role` umgeht RLS systemseitig (Server/Edge-Funktionen). Die Policies fragen Identität **inline** ab (`select org_id from profiles where user_id = auth.uid()`) bzw. ab 0003 über `is_org_member(org_id)`.

### `orgs`
| Aktion | Policy (real) |
|---|---|
| ALL | **keine Policy** für anon/authenticated → nur `service_role` (Org-Anlage/Soft-Delete via Edge). |

### `profiles`
| Aktion | Policy (real) |
|---|---|
| SELECT | `profiles_self_read`: `user_id = auth.uid()` (nur eigenes Profil). |
| INSERT/UPDATE/DELETE | **keine Policy** → nur `service_role`. Schreiben von `role`/`org_id` ausschließlich serverseitig (verhindert Self-Promotion zu `staff`/`owner`). |

### `farms`
| Aktion | Policy (real) |
|---|---|
| SELECT (öffentlich) | `farms_public_read`: `deleted_at IS NULL` für `anon`/`authenticated` (Finder). **Kein `status='published'`-Filter** — Sichtbarkeit nur über Soft-Delete. |
| ALL (Owner-Write) | `farms_owner_write` (0001): `org_id IN (select org_id from profiles where user_id = auth.uid())` — in 0003 gehoben auf `is_org_member(org_id)` (Multi-Org), `USING` + `WITH CHECK` identisch. |

### `products`
| Aktion | Policy (real) |
|---|---|
| SELECT (öffentlich) | `products_public_read`: `EXISTS (select 1 from farms f where f.id = products.farm_id AND f.deleted_at IS NULL)`. |
| ALL (Owner-Write) | `products_owner_write`: org-gebunden, in 0003 auf `is_org_member(org_id)` gehoben (`USING` + `WITH CHECK`). |

### `reservations`
| Aktion | Policy (real) |
|---|---|
| INSERT | `reservations_insert` für `anon`/`authenticated`: `EXISTS (select 1 from farms f where f.id = reservations.farm_id AND f.org_id = reservations.org_id AND f.deleted_at IS NULL)`. Gast-Reservierung erlaubt; **kein** `buyer_id`-Bezug. |
| SELECT | `reservations_owner_read`: `org_id IN (eigene Orgs)` — 0001 via `profiles`, 0003 via `is_org_member(org_id)`. Käufer/Gast haben **keine** SELECT-Policy (Einsicht nur über Edge/Token). |
| UPDATE/DELETE | **keine Policy** → nur `service_role` (Statusübergänge serverseitig). |

### `sb_payments`
| Aktion | Policy (real) |
|---|---|
| SELECT | `sb_payments_owner_read`: `org_id IN (eigene Orgs)` (0002 via `profiles`, 0003 via `is_org_member`). |
| INSERT/UPDATE/DELETE | **keine Policy** → nur `service_role` (Stripe-Webhook-Handler, idempotent). Frontend rein lesend. |

### `subscriptions`
| Aktion | Policy (real) |
|---|---|
| SELECT | `subscriptions_owner_read`: `org_id IN (eigene Orgs)` (0002 via `profiles`, 0003 via `is_org_member`). |
| Schreiben | **keine Policy** → nur `service_role` (Stripe-Webhook). |

### `audit_log` / `payment_events` / `credits_ledger`
| Tabelle | Policy (real) |
|---|---|
| `audit_log` | **keine Policy** → nur `service_role` (RLS aktiviert; weder Lesen noch Schreiben für anon/authenticated). Append-only ergibt sich aus der Abwesenheit von UPDATE/DELETE-Zugriff. |
| `payment_events` | **keine Policy** → nur `service_role` (Webhook-Idempotenz). |
| `credits_ledger` | `credits_owner_read`: `is_org_member(org_id)` (lesen); Schreiben `service_role`. |

### `waitlist`
| Aktion | Policy (real) |
|---|---|
| INSERT | `waitlist_insert` für `anon`/`authenticated`: `WITH CHECK (char_length(email) ≤ 320 AND char_length(plz) ≤ 16)`. |
| SELECT/UPDATE/DELETE | **keine Policy** → nur `service_role` (Landing-Liste, keine Käufer-Einsicht). |

### `org_members` / `org_locations` / `reviews` / `bounties` (0003)
| Tabelle | SELECT | Schreiben |
|---|---|---|
| `org_members` | `org_members_read`: `is_org_member(org_id)` | `service_role` |
| `org_locations` | `org_locations_public_read`: `deleted_at IS NULL` (öffentlich) | `org_locations_owner_write`: `is_org_member(org_id)` (`USING`+`WITH CHECK`) |
| `reviews` | `reviews_public_read`: `status='published'` | `reviews_insert` (anon/auth): `rating 1–5 AND verified=false AND status='published' AND (author_user_id IS NULL OR = auth.uid())`; `reviews_owner_moderate` (UPDATE): `is_org_member(org_id)` |
| `bounties` | `bounties_public_read`: `status='open'` | `bounties_insert` (anon/auth): `char_length(title) 3–200 AND (author_user_id IS NULL OR = auth.uid())`; `bounties_author_manage` (UPDATE): `author_user_id = auth.uid()` |

### `farm_applications` (0004)
| Aktion | Policy (real) |
|---|---|
| INSERT (anon/auth) | `farm_applications_insert`: `char_length(name) 2–200 AND char_length(email) ≤ 320 AND plz ~ '^[0-9]{5}$'`. |
| SELECT | `farm_applications_staff_read`: `EXISTS (select 1 from profiles p where p.user_id = auth.uid() AND p.role IN ('staff','owner'))`. |
| UPDATE | `farm_applications_staff_update`: gleiche Staff/Owner-Prüfung; `WITH CHECK (status IN ('eingereicht','in_pruefung','angenommen','abgelehnt'))`. |

> **Negativ-Erwartung (Pfeiler 6, qa-tester):** Org B liest mit RLS **0** Zeilen von Org A (kein 500), schreibt auf Org A = abgelehnt (`WITH CHECK`-Fehler). `anon` sieht nur nicht-gelöschte Höfe/Produkte/Standorte, veröffentlichte Reviews und offene Bounties. Eskalation der eigenen `role` ist unmöglich (kein Schreibpfad auf `profiles` außer `service_role`).

---

## 8 · Beziehungen (Foreign Keys, Zusammenfassung — Ist-Stand)

- `auth.users` 1:1 `profiles` (`profiles.user_id` PK/FK)
- `orgs` 1:N `profiles` (`org_id`, ON DELETE SET NULL)
- `orgs` 1:N `farms` · `products` · `reservations` · `sb_payments` · `subscriptions` · `org_members` · `org_locations` · `reviews` · `credits_ledger`
- `farms` (text-PK) 1:N `products` · `reservations` · `sb_payments` · `reviews` · `org_locations` (`farm_id` nullable, SET NULL)
- `products` (text-PK) 1:N `reservations` · `sb_payments` (`product_id` SET NULL)
- `auth.users` 1:N `org_members` · `reviews.author_user_id` · `bounties.author_user_id` (SET NULL)
- `reservations` 0:1 `reviews` (`reviews.reservation_id`, SET NULL)
- `org_locations` 1:N `sb_payments` (`location_id`, SET NULL, 0003)

> **Kein** `buyer_id`/`verified_by`/`sb_payment_id`-FK auf `reservations`; **keine** `availability`-Tabelle.

**Trigger (real, Stand 0001–0003):**
1. `set_updated_at()` als `BEFORE UPDATE` auf `farms`, `products`, `subscriptions`.
2. `recompute_farm_reputation()` als `AFTER INSERT/UPDATE/DELETE` auf `reviews` → aktualisiert `farms.rating_avg/rating_count/reputation_grade`.

> Trigger für `org_id`-Konsistenz (Cross-Org-Schutz), `farms.categories`-Neuberechnung aus `products` oder Preis-Snapshot existieren (Stand 0004) **nicht** — Cross-Org-Konsistenz wird über die RLS-`WITH CHECK`-Bedingungen und die Insert-`EXISTS`-Prüfungen erreicht, nicht über Trigger.

---

## 9 · Additive Migrations-Strategie

**Regeln (CLAUDE.md / AGENTS.md):** SQL nur als **neue** Migration unter `app/supabase/migrations/`, **additiv**, niemals destruktiv ohne Owner-Freigabe. Jede Tabelle ab Migration #1: `org_id`/Tenant · Zeitstempel · `deleted_at` · **RLS deny-by-default + Isolationstest** (Plattform- + Org-Isolation).

**Tatsächlich vorhandene Migrationen (`app/supabase/migrations/`):**

| Migration | Inhalt (real) |
|---|---|
| `0001_core.sql` | Enums (`farm_type`, `product_category`, `availability_state`, `reservation_status`, `user_role`), `set_updated_at()`, Tabellen `orgs`, `profiles`, `farms`, `products`, `reservations`, `waitlist`, `audit_log`, Indizes, RLS deny-by-default + Policies. |
| `0002_payments.sql` | Enums `payment_status`, `subscription_status`; Tabellen `subscriptions`, `sb_payments`, `payment_events`; `reservations` um `payment_method`/`payment_status` erweitert; RLS. |
| `0003_marketplace.sql` | Funktion `is_org_member()`; Tabellen `org_members`, `org_locations`, `reviews` (+ Reputations-Trigger auf `farms`), `bounties`, `credits_ledger`; `sb_payments.location_id`; Owner-Policies auf `is_org_member()` gehoben. |
| `0004_onboarding.sql` | Enum `application_status`; Tabelle `farm_applications`; RLS (Insert öffentlich, Lesen/Moderieren nur staff/owner). |

**Additive Konventionen (CLAUDE.md/AGENTS.md):**
- **Nur** `ADD COLUMN` / neuer Index / `ALTER TYPE … ADD VALUE` / neue Policy. Neue Spalten `NULL`-bar **oder** mit `DEFAULT`.
- Enum-Werte werden **angehängt**, nie umbenannt/entfernt.
- Spalten-Entfernung erst nach Deprecation-Welle + Owner-Freigabe.
- Migrationen sind idempotent gehalten (`if not exists`, `do $$ … exception when duplicate_object`, `drop policy if exists … create policy`).
- Ein dedizierter Seed-/Demo-Stand liegt **nicht** als nummerierte Migration unter `migrations/`, sondern als separates, idempotentes (`on conflict … do nothing`) SQL-Skript `app/supabase/seed.sql` (deckungsgleich mit dem Frontend-Fallback `app/src/lib/seed.ts`, je Hof eine eigene `org` als echte Isolationsbasis). Zusätzlich bündelt `app/supabase/setup_all.sql` die Migrationen für ein One-Shot-Setup (siehe §10).

**Isolationstest als blockierendes Gate (devops/qa-tester):** Nach jeder DB-Migration läuft der Cross-Org-/Boundary-Test (zwei Orgs, je ein Erzeuger + Käufer; Assert: 0 Fremdzeilen lesend, Ablehnung schreibend, nur `published` für `anon`). Rot = kein Merge (`PHASEN.md` Isolations-Gate).

---

## 10 · Seed-Hinweis

- **Wahrheit der Form:** `app/src/lib/seed.ts` (`SEED_FARMS`) definiert realistische Höfe + Produkte; deren Struktur entspricht `Farm`/`Product` aus `types.ts` und damit den Tabellen `farms`/`products`. Für Postgres existiert das deckungsgleiche, idempotente SQL-Skript `app/supabase/seed.sql` (kein nummerierter Migrationsschritt unter `migrations/`, sondern separat ausführbar; je Hof eine eigene `org`). Der Frontend-Fallback bleibt parallel aktiv (`data.ts` schaltet auf Supabase um, sobald `VITE_SUPABASE_*` gesetzt sind). Beim DB-Seed gilt:
  - Höfe aus `SEED_FARMS` → `farms` (`id` = Slug, `verified=true` bei freigeschalteten Höfen).
  - Produkte → `products` mit `price` direkt als `numeric(10,2)` (keine Cent-Umrechnung) und `availability` (Enum `availability_state`) gemäß `Product.availability`.
  - **Keine** echten `sb_payments`/`reservations` im Seed (Geldfluss nur über echten Live-Test, CLAUDE.md „kein Fake-Data in Prod-UI").
- **Landing-Warteliste:** `waitlist` (`source='landing'`) ist die Go-Live-Interessentenliste; Insert öffentlich (anon), Lesen nur `service_role`. Kein Seed nötig.
- **Reproduzierbarkeit:** `supabase db reset` (lokal) spielt Migrationen + Seed deterministisch ein; der Data-Layer (`app/src/lib/data.ts`) schaltet automatisch von Seed-Fallback auf Supabase um, sobald `VITE_SUPABASE_*` gesetzt ist (ADR 0002 — Umstieg = reine Konfiguration).

---

## 11 · Abgleich mit den 7 Produktionspfeilern

| Pfeiler | Beleg im Modell |
|---|---|
| 1 Org-Boundary | `org_id NOT NULL` + RLS via `profiles`-Sub-Select / `is_org_member()`; fremde Org = 0 Zeilen / 403, nie 200 mit Fremddaten |
| 2 Zero-State | leere `products` → leere Arrays; `availability='out'` statt Fehler |
| 3 Scope-Transparenz | Responses tragen `org`/`plz`-Kontext; `created_at` zeigt Datenstand |
| 4 RBAC | `user_role` (kaeufer/erzeuger/staff/owner) + Policies je Rolle; Plan über `subscriptions.plan` (serverseitig) |
| 5 Audit | `audit_log` nur via `service_role`, `reason`-Feld bei kritischen Aktionen, append-only (kein UPDATE/DELETE-Zugriff) |
| 6 Testpflicht | Isolations-/Boundary-Tests als Gate (§9) |
| 7 Drilldown-Integrität | Deep-Links über `farms.id` (Slug)/`entity_id`; Policies verhindern org-fremde Kontextbildung |
