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

### 4.3 `farms` — Hof / Hofladen (Erzeuger-gepflegt)

DB-Entsprechung des `Farm`-Typs. `lat/lng` für Distanz/Karte; `pickup_windows` als `TEXT[]` (wählbare Abholfenster). Geschäftsfelder vom Erzeuger gepflegt, Sichtbarkeit über `status` + Staff-Verifizierung.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant |
| `name` | TEXT | NOT NULL, CHECK length 2–120 | |
| `type` | `farm_type` | NOT NULL | Hofladen/Bauernhof/Imkerei/… |
| `slug` | TEXT | NOT NULL, UNIQUE | Deep-Link (`/hof/:slug`) |
| `story` | TEXT | NULL, CHECK length ≤ 2000 | Editorial-Hoftext |
| `street` | TEXT | NOT NULL | |
| `plz` | TEXT | NOT NULL, CHECK `~ '^[0-9]{5}$'` | Such-/Filterschlüssel (Index) |
| `city` | TEXT | NOT NULL | |
| `lat` | DOUBLE PRECISION | NULL, CHECK between -90 and 90 | NULL = unbekannte Geo (ehrliche UI, ADR 0002) |
| `lng` | DOUBLE PRECISION | NULL, CHECK between -180 and 180 | |
| `opening_hours` | TEXT | NULL | Freitext (z. B. „Mo–Fr 9–18, Sa 8–13") |
| `pickup_windows` | TEXT[] | NOT NULL DEFAULT `'{}'` | Wählbare Abholfenster |
| `categories` | `product_category[]` | NOT NULL DEFAULT `'{}'` | Denormalisierte Kategorie-Facette (Finder-Filter; via Trigger aus `products` gepflegt) |
| `is_self_service` | BOOLEAN | NOT NULL DEFAULT false | Unbemannter SB-Hofladen → SB-Bezahlung anwendbar (USP) |
| `status` | `farm_status` | NOT NULL DEFAULT `'draft'` | draft→pending_review→published; suspended via Staff |
| `verified_at` | TIMESTAMPTZ | NULL | Staff-Verifizierung (Trust) |
| `verified_by` | UUID | NULL, FK → `profiles(id)` | Staff-Akteur |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

### 4.4 `products` — Produkt eines Hofes (Erzeuger-Selbstpflege)

Stammdaten des Produkts. Die **momentane** Verfügbarkeit/Saison lebt in `availability` (zeitveränderlich); ein gespiegeltes `availability`-Enum auf `products` hält den Schnellfilter aktuell (Trigger).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant (= `farms.org_id`, per Trigger erzwungen) |
| `farm_id` | UUID | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | |
| `name` | TEXT | NOT NULL, CHECK length 1–120 | |
| `category` | `product_category` | NOT NULL | |
| `unit` | TEXT | NOT NULL | z. B. „Schale 500g", „Glas 250g", „kg" |
| `price_cents` | INTEGER | NOT NULL, CHECK ≥ 0 | Preis in Cent (kein Float-Geld) |
| `currency` | CHAR(3) | NOT NULL DEFAULT `'EUR'` | |
| `availability` | `availability_status` | NOT NULL DEFAULT `'available'` | Schnellfilter-Spiegel des aktuellen `availability`-Satzes |
| `seasonal` | BOOLEAN | NOT NULL DEFAULT false | Saison-Radar-Kennzeichnung |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | Reihenfolge im Hofladen |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

> **Geld als Integer-Cent:** `price` aus `types.ts` (EUR-Float) wird DB-seitig als `price_cents` geführt; der Data-Layer mappt `price_cents/100 → price`. Verhindert Rundungsfehler bei SB-Zahlung.

### 4.5 `availability` — Verfügbarkeits-/Saison-Fenster (zeitveränderlich)

Trennt die *flüchtige* Verfügbarkeit von den Produktstammdaten. Treibt **Saison-Radar** und Schnellfilter; jeder Erzeuger-Pflegevorgang erzeugt einen neuen, gültigen Satz (Historie bleibt erhalten → Auswertung/Audit).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant |
| `farm_id` | UUID | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | Denormalisiert für Finder-Joins |
| `product_id` | UUID | NOT NULL, FK → `products(id)` ON DELETE CASCADE | |
| `status` | `availability_status` | NOT NULL | available \| low \| soon \| out |
| `qty_estimate` | INTEGER | NULL, CHECK ≥ 0 | Optionaler Restbestand (Erzeuger-Schätzung) |
| `valid_from` | TIMESTAMPTZ | NOT NULL DEFAULT now() | Gültig ab |
| `valid_to` | TIMESTAMPTZ | NULL, CHECK `valid_to IS NULL OR valid_to > valid_from` | Gültig bis (NULL = bis auf Weiteres) |
| `is_current` | BOOLEAN | NOT NULL DEFAULT true | genau **ein** aktueller Satz pro `product_id` (Partial-Unique-Index) |
| `note` | TEXT | NULL | z. B. „Nur Vorbestellung", „Erntefrisch ab Do" |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

> **Invariante:** Partieller Unique-Index `UNIQUE (product_id) WHERE is_current AND deleted_at IS NULL` — höchstens ein aktueller Verfügbarkeitssatz je Produkt. Beim Setzen eines neuen Satzes wird der bisherige per Trigger auf `is_current=false` gesetzt. `products.availability` wird vom selben Trigger gespiegelt.

### 4.6 `reservations` — Vorbestellung/Abholung (Kernflow)

DB-Entsprechung des `Reservation`-Typs. Käufer (eingeloggt **oder** Gast mit Kontakt) reserviert ein Produkt zu einem Abholfenster. Zustandsmaschine siehe §6.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE CASCADE | Mandant des Hofes |
| `farm_id` | UUID | NOT NULL, FK → `farms(id)` ON DELETE CASCADE | |
| `product_id` | UUID | NOT NULL, FK → `products(id)` ON DELETE RESTRICT | |
| `buyer_id` | UUID | NULL, FK → `profiles(id)` ON DELETE SET NULL | NULL = Gast-Reservierung |
| `quantity` | INTEGER | NOT NULL, CHECK between 1 and 999 | |
| `pickup_window` | TEXT | NOT NULL | Gewähltes Abholfenster (muss in `farms.pickup_windows` liegen — Edge-Validierung) |
| `name` | TEXT | NOT NULL, CHECK length 2–120 | Abholer-Name (auch bei Gast) |
| `contact` | TEXT | NOT NULL | E-Mail oder Telefon (Zod-validiert in Edge Function) |
| `status` | `reservation_status` | NOT NULL DEFAULT `'requested'` | Lifecycle |
| `unit_price_cents` | INTEGER | NOT NULL, CHECK ≥ 0 | Preis-Snapshot zur Reservierungszeit (kein nachträgliches Drift) |
| `note` | TEXT | NULL | Käufer-Nachricht an den Hof |
| `cancel_reason` | TEXT | NULL | Pflicht bei Status `cancelled`/`no_show` (Audit) |
| `sb_payment_id` | UUID | NULL, FK → `sb_payments(id)` ON DELETE SET NULL | optionale Verknüpfung zur SB-Zahlung |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

### 4.7 `sb_payments` — Sichere SB-Bezahlung (⭐ USP)

Zahlungsanbindung am unbemannten SB-Hofladen: QR am Stand → Stripe → Quittung. **Stripe ist die Wahrheit**, diese Tabelle ist der signaturgeprüfte, idempotente Spiegel (vom Webhook-Handler in einer Edge Function gepflegt). Geld fließt via **Stripe Connect** an den Hof; die Plattform behält nur `platform_fee_cents`.

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE RESTRICT | Mandant (Auszahlungsempfänger via Connect) |
| `farm_id` | UUID | NOT NULL, FK → `farms(id)` ON DELETE RESTRICT | SB-Stand |
| `product_id` | UUID | NULL, FK → `products(id)` ON DELETE SET NULL | optional (Warenkorb in `line_items`) |
| `buyer_id` | UUID | NULL, FK → `profiles(id)` ON DELETE SET NULL | NULL = anonymer SB-Kauf |
| `reservation_id` | UUID | NULL, FK → `reservations(id)` ON DELETE SET NULL | falls aus Reservierung bezahlt |
| `amount_cents` | INTEGER | NOT NULL, CHECK > 0 | Bruttobetrag |
| `platform_fee_cents` | INTEGER | NOT NULL DEFAULT 0, CHECK ≥ 0 | Plattformgebühr (Monetarisierung) |
| `currency` | CHAR(3) | NOT NULL DEFAULT `'EUR'` | |
| `line_items` | JSONB | NOT NULL DEFAULT `'[]'` | gekaufte Positionen (Snapshot für Quittung) |
| `status` | `payment_status` | NOT NULL DEFAULT `'pending'` | Stripe-gespiegelt |
| `stripe_payment_intent_id` | TEXT | UNIQUE, NULL | Idempotenz-Anker |
| `stripe_checkout_session_id` | TEXT | UNIQUE, NULL | |
| `stripe_event_id` | TEXT | UNIQUE, NULL | Webhook-Replay-Schutz |
| `receipt_url` | TEXT | NULL | Quittungs-Link (Käufer) |
| `paid_at` | TIMESTAMPTZ | NULL | |
| `refunded_at` | TIMESTAMPTZ | NULL | |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

> **Webhook-Regel (CLAUDE.md):** EIN signaturgeprüfter, idempotenter Handler ist Wahrheit. Idempotenz über `UNIQUE(stripe_event_id)` + `UNIQUE(stripe_payment_intent_id)`. Frontend liest nur lesend; Statusübergänge schreibt ausschließlich die Edge Function (service role). Compliance: Plattform = Zahlungsanbindung/Vermittler, kein Eigenverkauf.

### 4.8 `audit_log` — Append-only Audit (unabschaltbar)

Jede kritische Mutation: wer/was/warum. Append-only (kein UPDATE/DELETE per RLS). `reason` Pflicht bei Status-, Geld- und Lösch-Aktionen (Pfeiler 5).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | BIGSERIAL | PK | monoton, billige Sortierung |
| `actor_id` | UUID | NULL, FK → `profiles(id)` ON DELETE SET NULL | NULL = System/Edge-Job |
| `org_id` | UUID | NULL, FK → `orgs(id)` ON DELETE SET NULL | betroffener Mandant |
| `action` | TEXT | NOT NULL | z. B. `farm.publish`, `reservation.cancel`, `sb_payment.succeeded`, `farm.verify` |
| `entity_type` | TEXT | NOT NULL | `farm` \| `product` \| `availability` \| `reservation` \| `sb_payment` \| `waitlist` \| `org` \| `profile` |
| `entity_id` | UUID | NULL | betroffene Zeile |
| `reason` | TEXT | NULL (App-Pflicht bei kritischen Aktionen) | Begründung (Confirm+Reason) |
| `old_values` | JSONB | NULL | Vorher-Snapshot |
| `new_values` | JSONB | NULL | Nachher-Snapshot |
| `ip_address` | INET | NULL | aus Edge-Request |
| `user_agent` | TEXT | NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### 4.9 `waitlist` — Nachrücker bei ausverkauftem Produkt

Käufer trägt sich für ein `out`-Produkt ein und wird bei Wieder-Verfügbarkeit benachrichtigt (Saison-Radar-Synergie). Doppelt verwendbar: Produkt-Warteliste **und** frühe Plattform-Interessenten (Landing → siehe Seed/ADR 0001, `waitlist` für Go-Live).

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK | |
| `org_id` | UUID | NULL, FK → `orgs(id)` ON DELETE CASCADE | NULL = plattformweite Landing-Warteliste |
| `farm_id` | UUID | NULL, FK → `farms(id)` ON DELETE CASCADE | NULL bei reiner Plattform-Anmeldung |
| `product_id` | UUID | NULL, FK → `products(id)` ON DELETE CASCADE | NULL = „ganzer Hof"/Plattform |
| `buyer_id` | UUID | NULL, FK → `profiles(id)` ON DELETE SET NULL | NULL = Gast/anonym |
| `contact` | TEXT | NOT NULL, CHECK length 3–200 | E-Mail/Telefon (Zod + Turnstile am öffentlichen Formular) |
| `status` | `waitlist_status` | NOT NULL DEFAULT `'queued'` | queued→notified→converted / removed / expired |
| `queue_rank` | INTEGER | NOT NULL DEFAULT 0 | stabile Reihenfolge für Nachrücker-Wellen |
| `notified_at` | TIMESTAMPTZ | NULL | |
| `converted_at` | TIMESTAMPTZ | NULL | Eintrag führte zu Reservierung/Kauf |
| `source` | TEXT | NOT NULL DEFAULT `'app'`, CHECK in (`app`,`landing`,`saison_radar`) | Herkunft |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

> **Anti-Spam:** `UNIQUE (coalesce(product_id,'00000000-…'), lower(contact)) WHERE deleted_at IS NULL` verhindert Doppel-Eintragungen pro Produkt+Kontakt. Öffentliche Anmeldung läuft über Edge Function mit Turnstile-Prüfung.

---

## 5 · Indizes

Ausgelegt auf die drei heißen Pfade: **PLZ-/Geo-Suche** (Finder), **org+status** (Mandanten-Scoping & Sichtbarkeit), **Reservierungs-/Zahlungs-Listen**.

| Tabelle | Index | Typ | Zweck |
|---|---|---|---|
| `profiles` | `(org_id)` | B-tree | RLS-Joins, Org-Mitglieder |
| `profiles` | `(role)` | B-tree | Staff-/Rollen-Lookups |
| `farms` | `(org_id, status)` | B-tree | Pfeiler 1 — Mandanten-Scoping + Sichtbarkeit |
| `farms` | `(plz)` | B-tree | PLZ-Filter (Finder) |
| `farms` | `(status, plz)` `WHERE deleted_at IS NULL` | B-tree (partial) | öffentlicher Finder (nur `published`) |
| `farms` | `(lat, lng)` `WHERE deleted_at IS NULL AND lat IS NOT NULL` | B-tree (partial) | Distanz/„in der Nähe" (Track B Karte; später GiST/PostGIS) |
| `farms` | `categories` | GIN | Kategorie-Facetten-Filter |
| `farms` | `(slug)` | UNIQUE | Deep-Link |
| `products` | `(farm_id)` | B-tree | Hofladen-Auflistung |
| `products` | `(org_id, category)` | B-tree | Kategorie-Listen je Mandant |
| `products` | `(category, seasonal)` `WHERE deleted_at IS NULL` | B-tree (partial) | Saison-Radar |
| `availability` | `(product_id) WHERE is_current AND deleted_at IS NULL` | UNIQUE (partial) | genau ein aktueller Satz |
| `availability` | `(farm_id, status)` | B-tree | Finder-Verfügbarkeitsfacette |
| `reservations` | `(org_id, status, created_at DESC)` | B-tree | Erzeuger-Dashboard / Owner-KPI |
| `reservations` | `(farm_id, status)` | B-tree | Hof-Reservierungsliste |
| `reservations` | `(buyer_id, created_at DESC)` `WHERE buyer_id IS NOT NULL` | B-tree (partial) | „Meine Reservierungen" |
| `sb_payments` | `(org_id, status, created_at DESC)` | B-tree | Einnahmen-/Schwund-Dashboard |
| `sb_payments` | `(stripe_payment_intent_id)` | UNIQUE | Idempotenz |
| `sb_payments` | `(stripe_event_id)` | UNIQUE | Webhook-Replay-Schutz |
| `audit_log` | `(org_id, created_at DESC)` | B-tree | Audit-Feed je Mandant |
| `audit_log` | `(entity_type, entity_id)` | B-tree | Entity-Historie / Drilldown |
| `waitlist` | `(product_id, status, queue_rank)` | B-tree | Nachrücker-Welle |
| `waitlist` | `(coalesce(product_id,…), lower(contact))` `WHERE deleted_at IS NULL` | UNIQUE (partial) | Anti-Doppel |
| `orgs` | `(slug)` / `(stripe_customer_id)` / `(stripe_connect_id)` | UNIQUE | Lookups |

---

## 6 · Zustandsmaschine `reservations` (CORE_BUSINESS_STATE_MACHINES)

```
requested ──confirm(Erzeuger)──▶ confirmed ──mark_ready──▶ ready ──pickup──▶ picked_up
   │                                │                         │
   ├─cancel(Käufer/Erzeuger)─▶ cancelled ◀──cancel───────────┤
   │                                                          │
   └─TTL/Abholfenster verstrichen─▶ expired       no_show◀────┘ (Abholfenster ohne Abholung)
```
- **Erlaubte Übergänge** werden in der Edge Function (`reservation-transition`) erzwungen, nicht im Client. Jeder Übergang → `audit_log` (`reason` Pflicht bei `cancelled`/`no_show`).
- `requested → expired` per Cron-Edge-Job (Abholfenster + Karenz überschritten).
- Nur Erzeuger der besitzenden Org oder Staff dürfen `confirmed/ready/picked_up/no_show` setzen; Käufer darf nur `requested → cancelled` (eigene Reservierung).
- **Verfügbarkeitskopplung:** Bei `confirmed` darf `qty_estimate` des aktuellen `availability`-Satzes dekrementiert werden (optional, transaktional).

---

## 7 · Row-Level Security (deny-by-default) — Policy je Tabelle

**Aktivierung für jede Tabelle:**
```sql
alter table public.<t> enable row level security;
alter table public.<t> force row level security;   -- gilt auch für Tabelleneigentümer
```
Ohne passende Policy = kein Zugriff. Mutierende Schreibpfade mit erhöhten Rechten laufen über Edge Functions (service role umgeht RLS bewusst und kontrolliert).

### `orgs`
| Aktion | Policy |
|---|---|
| SELECT | `id = current_org_id() OR is_staff()` |
| UPDATE | `id = current_org_id() AND current_role_kind() = 'erzeuger'` (nur eigene Org; sensible Felder `plan/stripe_*` nur service role) — `WITH CHECK` identisch |
| INSERT/DELETE | nur service role (Org-Anlage via Onboarding-Edge-Function; Soft-Delete via Edge) |

### `profiles`
| Aktion | Policy |
|---|---|
| SELECT | `id = auth.uid() OR (org_id = current_org_id() AND current_role_kind() IN ('erzeuger','staff')) OR is_staff()` |
| INSERT | `id = auth.uid()` (Self-Provisioning; Trigger setzt Default-Rolle) |
| UPDATE | `id = auth.uid()` **mit** `WITH CHECK (role = (select role from profiles where id = auth.uid()))` → Selbst-Rollen-Eskalation blockiert; `role`/`org_id` nur via service role |
| DELETE | nur service role (DSGVO-Löschpfad mit Audit) |

### `farms`
| Aktion | Policy |
|---|---|
| SELECT (öffentlich) | `deleted_at IS NULL AND status = 'published'` für `anon`/`authenticated` (Finder) |
| SELECT (Erzeuger/Staff) | `org_id = current_org_id() OR is_staff()` (auch `draft`/`pending_review`) |
| INSERT | `org_id = current_org_id() AND current_role_kind() = 'erzeuger'` |
| UPDATE | `owns_farm(id) AND current_role_kind() = 'erzeuger'` (eigene Höfe) **oder** `is_staff()` (Verifizierung/Suspend); `WITH CHECK (org_id = current_org_id() OR is_staff())` verhindert Org-Wechsel |
| DELETE | nur service role (Soft-Delete via Edge + Audit) |

### `products`
| Aktion | Policy |
|---|---|
| SELECT (öffentlich) | `deleted_at IS NULL AND farm_id IN (select id from farms where status='published' and deleted_at is null)` |
| SELECT (Erzeuger/Staff) | `org_id = current_org_id() OR is_staff()` |
| INSERT | `owns_farm(farm_id) AND current_role_kind() = 'erzeuger'` — `WITH CHECK (org_id = current_org_id())` |
| UPDATE | `owns_farm(farm_id)` — `WITH CHECK (org_id = current_org_id())` (Org-Migration unmöglich) |
| DELETE | nur service role |

### `availability`
| Aktion | Policy |
|---|---|
| SELECT (öffentlich) | `is_current AND deleted_at IS NULL AND farm_id IN (published farms)` |
| SELECT (Erzeuger/Staff) | `org_id = current_org_id() OR is_staff()` (volle Historie) |
| INSERT/UPDATE | `owns_farm(farm_id) AND current_role_kind() = 'erzeuger'` — `WITH CHECK (org_id = current_org_id())` |
| DELETE | nur service role |

### `reservations`
| Aktion | Policy |
|---|---|
| SELECT | `buyer_id = auth.uid() OR (org_id = current_org_id() AND current_role_kind() IN ('erzeuger','staff')) OR is_staff()` (Käufer sieht eigene, Erzeuger die seines Hofes) |
| INSERT | `org_id = (select org_id from farms where id = farm_id and status='published')` **und** (`buyer_id = auth.uid()` ODER `buyer_id IS NULL` Gast) — `WITH CHECK` setzt korrekten `org_id`; Pflichtfelder via Edge/Zod |
| UPDATE | Käufer: nur eigene + nur `status='cancelled'` (Trigger erzwingt erlaubten Übergang). Erzeuger/Staff: `org_id = current_org_id() OR is_staff()`. `WITH CHECK` blockiert Org-Wechsel & illegale Übergänge |
| DELETE | nur service role |

### `sb_payments`
| Aktion | Policy |
|---|---|
| SELECT | `buyer_id = auth.uid() OR (org_id = current_org_id() AND current_role_kind() IN ('erzeuger','staff')) OR is_staff()` |
| INSERT/UPDATE/DELETE | **nur service role** (ausschließlich der Stripe-Webhook-Handler schreibt; idempotent, signaturgeprüft). Frontend rein lesend |

### `audit_log`
| Aktion | Policy |
|---|---|
| SELECT | `org_id = current_org_id() OR is_staff()` (Erzeuger sieht eigene Org-Historie, Staff alles) |
| INSERT | service role (aus Edge Functions) **oder** über `SECURITY DEFINER`-Funktion `log_audit(...)` — App schreibt nie direkt |
| UPDATE/DELETE | **keine Policy → unmöglich** (append-only, unabschaltbar) |

### `waitlist`
| Aktion | Policy |
|---|---|
| SELECT | `buyer_id = auth.uid() OR (org_id = current_org_id() AND current_role_kind() IN ('erzeuger','staff')) OR is_staff()` |
| INSERT | öffentlich erlaubt **nur über Edge Function** (Turnstile + Zod + Anti-Doppel); direkte Tabellen-INSERTs nur `authenticated` mit `buyer_id = auth.uid()` und `WITH CHECK (status = 'queued')` |
| UPDATE | Erzeuger/Staff der Org (Nachrücker-Welle: `queued→notified→…`); Käufer darf eigenen Eintrag `→ removed` |
| DELETE | nur service role |

> **Negativ-Erwartung (Pfeiler 6, qa-tester):** Org B liest mit RLS **0** Zeilen von Org A (kein 500), schreibt auf Org A = abgelehnt (403-Pfad). Käufer kann fremde Reservierung weder lesen noch ändern. `anon` sieht nur `published`-Höfe/Produkte/aktuelle Verfügbarkeit. Eskalation der eigenen `role` ist unmöglich.

---

## 8 · Beziehungen (Foreign Keys, Zusammenfassung)

- `auth.users` 1:1 `profiles`
- `orgs` 1:N `profiles` (erzeuger/staff)
- `orgs` 1:N `farms` · 1:N `products` · 1:N `availability` · 1:N `reservations` · 1:N `sb_payments` · 1:N `audit_log` · 1:N `waitlist`
- `farms` 1:N `products` · 1:N `availability` · 1:N `reservations` · 1:N `sb_payments` · 1:N `waitlist`
- `products` 1:N `availability` · 1:N `reservations` · 1:N `waitlist`
- `profiles` (buyer) 1:N `reservations` · 1:N `sb_payments` · 1:N `waitlist`
- `reservations` 0:1 `sb_payments` (Bezahlung einer Reservierung)
- `profiles` (verified_by, staff) 1:N `farms` (Verifizierung)

**Konsistenz-Trigger** (alle `BEFORE INSERT/UPDATE`):
1. `farms/products/availability/reservations/sb_payments/waitlist.org_id` muss zu `farm_id.org_id` passen (kein Cross-Org-Schmuggel).
2. `set_updated_at()` auf jeder Tabelle mit `updated_at`.
3. `availability`: neuer `is_current`-Satz → alter Satz `is_current=false`; `products.availability` spiegeln.
4. `farms.categories` aus `products` neu berechnen.
5. `reservations.unit_price_cents` aus `products.price_cents` snapshotten (BEFORE INSERT).

---

## 9 · Additive Migrations-Strategie

**Regeln (CLAUDE.md / AGENTS.md):** SQL nur als **neue** Migration unter `app/supabase/migrations/`, **additiv**, niemals destruktiv ohne Owner-Freigabe. Jede Tabelle ab Migration #1: `org_id`/Tenant · Zeitstempel · `deleted_at` · **RLS deny-by-default + Isolationstest** (Plattform- + Org-Isolation).

| Migration | Inhalt | Reversibel? |
|---|---|---|
| `0001_init_enums_helpers.sql` | Enums (§2), Helper-Funktionen (§3), `set_updated_at`, `log_audit()` | ja (DROP) |
| `0002_orgs_profiles.sql` | `orgs`, `profiles` (+ `auth.users`-Trigger `on_auth_user_created`), RLS, Indizes | ja |
| `0003_farms_products.sql` | `farms`, `products` + Konsistenz-/`categories`-Trigger, RLS, Indizes | ja |
| `0004_availability.sql` | `availability` + `is_current`-Trigger + Spiegelung, RLS, Index | ja |
| `0005_reservations.sql` | `reservations` + Snapshot-/Transition-Trigger, RLS, Indizes | ja |
| `0006_audit_log.sql` | `audit_log` (append-only), RLS, Indizes | ja |
| `0007_waitlist.sql` | `waitlist` + Anti-Doppel-Index, RLS | ja |
| `0008_sb_payments.sql` | `sb_payments` (USP) + Idempotenz-Indizes, RLS (nur service role schreibt) | ja |
| `0009_seed_demo.sql` | **gekennzeichnete** Demo-Daten (siehe §10) — nur Dev/Staging | ja |

**Additive Konventionen:**
- **Nur** `ADD COLUMN` / `CREATE INDEX CONCURRENTLY` / `ALTER TYPE … ADD VALUE` / neue Policy. Neue Spalten `NULL`-bar **oder** mit `DEFAULT` (kein Rewrite-Lock auf großen Tabellen).
- Enum-Werte werden **angehängt**, nie umbenannt/entfernt (umbenennen = neuer Wert + Backfill + Deprecation).
- Spalten-Entfernung erst nach Deprecation-Welle + Owner-Freigabe; bis dahin „tote" Spalte tolerieren.
- Jede Migration hat eine dokumentierte Down-/Rollback-Strategie (keine Migration ohne Rollback — CLAUDE.md-Verbot).
- **Reihenfolge ist FK-getrieben:** Enums/Helper → orgs → profiles → farms → products → availability → reservations → audit → waitlist → sb_payments.
- `CREATE INDEX CONCURRENTLY` außerhalb von Transaktions-Migrationen für Live-Tabellen.

**Isolationstest als blockierendes Gate (devops/qa-tester):** Nach jeder DB-Migration läuft der Cross-Org-/Boundary-Test (zwei Orgs, je ein Erzeuger + Käufer; Assert: 0 Fremdzeilen lesend, Ablehnung schreibend, nur `published` für `anon`). Rot = kein Merge (`PHASEN.md` Isolations-Gate).

---

## 10 · Seed-Hinweis

- **Wahrheit der Form:** `app/src/lib/seed.ts` (`SEED_FARMS`) definiert bereits realistische Höfe + Produkte; deren Struktur = diese Tabellen. Der Seed (`0009_seed_demo.sql`) übersetzt diese Datensätze nach Postgres:
  - 1 Demo-Org (`plan='demo'`, `slug='demo-hofverbund'`).
  - Höfe aus `SEED_FARMS` → `farms` (`status='published'`, `is_self_service` bei SB-tauglichen Höfen `true`).
  - Produkte → `products` (`price` EUR → `price_cents`), plus je Produkt **ein** `availability`-Satz (`is_current=true`) gemäß `Product.availability`.
  - **Keine** echten `sb_payments`/`reservations` im Seed (Geldfluss nur über echten Live-Test, CLAUDE.md „kein Fake-Data in Prod-UI").
- **Kennzeichnung (Pflicht):** Demo-Daten klar markiert (`orgs.name` mit „(Demo)" bzw. Flag), nur in Dev/Staging eingespielt — **nie** in Produktion (`WAVE_15` Demo/Onboarding-Regel). Idempotenter Seed via `ON CONFLICT (slug) DO NOTHING`.
- **Landing-Warteliste:** Für den Marketing-Go-Live (ADR 0001) genügt initial `orgs`-frei nutzbare `waitlist` (`org_id NULL`, `source='landing'`), befüllt ausschließlich über die Turnstile-geschützte Edge Function — kein Seed nötig.
- **Reproduzierbarkeit:** `supabase db reset` (lokal) spielt Migrationen + Seed deterministisch ein; der Data-Layer (`app/src/lib/data.ts`) schaltet automatisch von Seed-Fallback auf Supabase um, sobald `VITE_SUPABASE_*` gesetzt ist (ADR 0002 — Umstieg = reine Konfiguration).

---

## 11 · Abgleich mit den 7 Produktionspfeilern

| Pfeiler | Beleg im Modell |
|---|---|
| 1 Org-Boundary | `org_id NOT NULL` + RLS `current_org_id()`/`owns_farm()`; fremde Org = 0 Zeilen / 403, nie 200 mit Fremddaten |
| 2 Zero-State | leere `products`/`availability` → leere Arrays; `availability_status='out'` statt Fehler |
| 3 Scope-Transparenz | Responses tragen `org`/`plz`/`status`-Kontext; `valid_from/valid_to` zeigt Datenstand |
| 4 RBAC | `role_kind` (kaeufer/erzeuger/staff) + Policies je Rolle; Plan-Locks über `orgs.plan` (serverseitig) |
| 5 Audit | `audit_log` append-only, `reason` Pflicht bei kritischen Aktionen, unabschaltbar (kein UPDATE/DELETE) |
| 6 Testpflicht | Isolations-/Boundary-Tests als Migrations-Gate (§9) |
| 7 Drilldown-Integrität | Deep-Links über `farms.slug`/`entity_id`; Policies verhindern org-fremde Kontextbildung |
