# Track A ⭐ — Sichere bargeldlose Bezahlung am unbemannten SB-Hofladen (USP)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 4 · `PHASEN.md` → **Phase 4, Track A — SB-Bezahlung (USP)** · Marktstart-Pflicht-Set: „Track A **ODER** WAVE_09 — mind. ein Geldfluss". Track A ist der **monetarisierbare USP** dieser Plattform.
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — die Plattform bindet Zahlung an und stellt eine Quittung aus; sie **verkauft nicht selbst** und **berät nicht**. Disclaimer durchgängig.
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/phase4_vertical/TRACK_A_MARKETPLACE.md`, read-only; das BBQ-Original bleibt unangetastet). Das TempConnect-Marketplace-Visibility-Center wird **nicht** übernommen — es ist VMS-spezifisch. Track A wird hier von Grund auf für die **Hof-Domäne** geschrieben: QR am Stand → Stripe(+Connect) → Quittung → Erzeuger-Auszahlung.

---

## 0. Produktziel & Leitprinzipien (nicht verhandelbar)

Viele Hofläden sind **unbesetzt** (Vertrauenskasse). Käufer nimmt Ware, wirft Geld in die Box — Schwund, Bargeld-Handling, kein Beleg. Track A ersetzt die Box durch einen **sicheren, bargeldlosen Bezahlpunkt am Stand**: Käufer scannt den **QR am Regal/Stand**, wählt Menge, zahlt mit dem hinterlegten Zahlmittel (Karte, SEPA, PayPal, Giropay, Klarna, Apple/Google Pay — alles über Stripe), erhält **sofort eine Quittung**. Der Erzeuger sieht **Einnahmen in Echtzeit** und einen **Schwund-Indikator**.

```text
Wirtschaftlich:   senkt Schwund, eliminiert Bargeld-Handling, senkt Käufer-Friktion.
Monetarisierung:  kleine Plattform-Transaktionsgebühr (application_fee via Stripe Connect)
                  + Erzeuger-Abo (WAVE_09) — Geld fließt direkt zum Hof, Plattform behält Fee.
Vermittler:       Plattform = Zahlungsanbindung + Beleg. Verkäufer ist der HOF (Connected Account).
                  Kein Eigenverkauf, keine Beratung, keine Warenhaftung der Plattform.
```

**Leitprinzipien (jede Welle muss sie wahren):**

```text
1.  Preis IMMER serverseitig.   Client-Betrag wird NIE vertraut (Manipulationsschutz).
2.  EIN Webhook = die Wahrheit.  Signaturgeprüft, idempotent, serverseitige Entitlements/Status.
3.  Geld fließt zum Hof.         Stripe Connect (destination/Connected Account), Plattform nimmt nur Fee.
4.  QR-Token ist signiert.       Stand-QR trägt einen signierten Token, kein Klartext-Preis, kein Geheimnis.
5.  RLS deny-by-default.         Erzeuger sieht NUR eigene Einnahmen (org-gebunden). anon zahlt, liest nichts.
6.  Audit für jede Mutation.     paid/refunded/disputed/payout → audit_log (wer/was/warum), unabschaltbar.
7.  Anti-Betrug eingebaut.       Turnstile, Rate-Limit, Betrags-Caps, Velocity, Dispute-/Refund-Pfad.
8.  Zero-State statt Error.      Hof ohne Connect = klarer „Einrichtung nötig"-State, kein 500.
9.  service_role nur in Edge.    Frontend nur VITE_-Public-Keys. Stripe-Secret nur Function-Secret.
10. Compliance durchgängig.      DSGVO, Beleg-Pflichtangaben, Vermittler-Disclaimer, kein Klartext-Tracking.
```

---

## 1. Ist-Zustand (repo-genau geprüft)

Track A baut **additiv** auf einem bereits funktionierenden Fundament auf — kein Rebuild.

| Reales Artefakt | Stand | Konsequenz für Track A |
|---|---|---|
| `app/supabase/migrations/0002_payments.sql` | `sb_payments` (org_id, farm_id, product_id, qty, amount_cents, currency, method, status `payment_status`, stripe_checkout_session, stripe_payment_intent, payer_contact, paid_at), `subscriptions`, `payment_events` (Idempotenz), RLS owner-read/service-write | Kern-Tabelle steht. **Es fehlen:** Connect-Felder, `application_fee_cents`, `net_to_farm_cents`, Refund/Dispute-Status, `sb_stands`, `sb_receipts`, `farm_payouts`. → additive Migrationen `0005…`. |
| `app/supabase/functions/create-checkout/index.ts` | `mode:'sb_payment'` ermittelt Preis aus `products` (serverseitig), legt `sb_payments` an, erzeugt Checkout-Session, schreibt `stripe_checkout_session` zurück | Korrektes Fundament. **Es fehlt:** `payment_intent_data.application_fee_amount` + `transfer_data.destination` (Connect), Stand-Token-Verifikation, Turnstile, Velocity-Cap. |
| `app/supabase/functions/stripe-webhook/index.ts` | EIN signaturgeprüfter, **idempotenter** Handler (`payment_events` PK = event.id), setzt `sb_payments.paid`, schreibt `audit_log` `sb_payment.paid`, sendet Quittungs-Mail | Wahrheit steht. **Es fehlt:** `charge.refunded`, `charge.dispute.created/closed`, `payment_intent.payment_failed`, `account.updated` (Connect-Onboarding), Persistenz `sb_receipts`, Fee/Net-Aufschlüsselung. |
| `app/supabase/functions/_shared/stripe.ts` | `getStripe()` (env-gated → null = Payments aus), `priceIdForPlan`, `mapSubStatus`, apiVersion `2024-06-20`, Fetch-HttpClient (Deno) | Erweitern um Connect-Helfer (`platformFeeCents`, `getConnectAccountId`) + Stand-Token-HMAC-Helfer (eigenes Shared-Modul). |
| `app/supabase/functions/_shared/email.ts` | `sendEmail` (Resend), `renderReceipt({amount, farmName})`, Layout | Quittungs-Renderer **erweitern** um Pflichtangaben (Hof-Name/Anschrift/USt-Hinweis, Positionen, Beleg-Nr., Zeitstempel, Vermittler-Disclaimer) + PDF/HTML-Persistenz in Storage. |
| `app/supabase/migrations/0001_core.sql` | `farms` (id slug, org_id, name, street/plz/city, lat/lng, verified, …), `products` (price numeric, availability enum), `audit_log` (org_id, actor_user_id, action, entity_type, entity_id, **reason**, details jsonb), `is_org_member()`-Vorbereitung | `farms` ist der Verkäufer-Anker → Connect-Account hängt an `farms`/`org`. `audit_log` trägt bereits `reason` (Pflichtfeld-fähig). |
| `app/supabase/migrations/0003_marketplace.sql` | `is_org_member(p_org uuid)` = kanonische Org-Zugehörigkeit; hebt Owner-Policies auf Multi-Org | **Alle** neuen Owner-Read-Policies in Track A nutzen `is_org_member(org_id)` — eine Wahrheit. |
| `app/supabase/migrations/0004_isolation_and_availability_log.sql` (WAVE_02) | `current_org_ids()`-Helfer, Isolationstest-Harness T1–T12 | Track-A-Tabellen werden in den **bestehenden** Isolationstest aufgenommen (neue T-Fälle), nicht in einen Parallel-Test. |
| `app/src/lib/data.ts` · `supabase.ts` · `types.ts` | Dual-Source-Datenschicht (Seed ↔ Supabase), `snake_case`↔`camelCase` an der Grenze, Port **5409** | SB-Bezahl-Screens (Käufer-Stand-Flow + Erzeuger-Dashboard) docken hier an — keine Parallel-Datenschicht. |

> **Stop-Regel-Check (sauber):** `farms`/`products`/`audit_log`/`sb_payments`/`is_org_member` existieren real → kein „API/Service nicht gefunden". Statusübergänge der Zahlung sind definiert (siehe §3 State-Machine). Org-Scope ist serverseitig prüfbar (`is_org_member`/`current_org_ids`). **Offene Owner-Freigabe:** Stripe-**Connect**-Aktivierung (Account/Verträge/Auszahlungen) + Live-Keys + Domain → Account-/Kosten-/Vertrags-relevant, **nicht** Teil der lokalen Wellen, sondern explizit als Owner-Gate (§ Manuelle Owner-Tasks).

---

## 2. Zielarchitektur (End-to-End-Kette)

```text
 ┌── Stand am unbemannten Hofladen ─────────────────────────────────────────────┐
 │  QR-Aufkleber  ──►  https://app.../stand/<stand_token>                        │
 │  (signierter Token: farm_id + stand_id + HMAC; KEIN Preis, KEIN Secret)      │
 └──────────────────────────────────────────────────────────────────────────────┘
        │  (Käufer scannt mit Smartphone, ohne App-Installation, ohne Login)
        ▼
 ┌── React-Stand-Seite (Cloudflare Pages, public) ──────────────────────────────┐
 │  - Turnstile (unsichtbar) gegen Bots                                          │
 │  - lädt Stand-Kontext über verify-stand (Token→farm+products, RLS-konform)    │
 │  - Käufer wählt Produkt(e) + Menge, optional E-Mail für Beleg                 │
 │  - "Jetzt bezahlen" ──► create-checkout (mode:'sb_payment')                   │
 └──────────────────────────────────────────────────────────────────────────────┘
        │  POST { mode:'sb_payment', standToken, items[], contact?, turnstileToken }
        ▼
 ┌── Edge Function create-checkout (Deno, service_role) ─────────────────────────┐
 │  1. Turnstile verify  2. Stand-Token HMAC verify  3. Velocity/Cap-Check       │
 │  4. PREIS SERVERSEITIG aus products (Client-Betrag ignoriert)                 │
 │  5. sb_payments INSERT (status initiated, fee + net berechnet)                │
 │  6. Stripe Checkout Session:                                                   │
 │     mode:'payment', automatic_payment_methods,                                 │
 │     payment_intent_data.application_fee_amount = fee,                          │
 │     payment_intent_data.transfer_data.destination = farm.stripe_account_id    │  ◄── Connect
 │     metadata { kind:'sb_payment', sb_payment_id, org_id, farm_id, stand_id }   │
 │  7. session.url ──► Redirect zu Stripe Checkout (PCI-scope bei Stripe)        │
 └──────────────────────────────────────────────────────────────────────────────┘
        │  Käufer zahlt bei Stripe (alle aktivierten Methoden)
        ▼
 ┌── Stripe ── Webhook (signiert) ──────────────────────────────────────────────┐
 │  checkout.session.completed / charge.refunded / charge.dispute.* /           │
 │  payment_intent.payment_failed / account.updated                              │
 └──────────────────────────────────────────────────────────────────────────────┘
        ▼
 ┌── Edge Function stripe-webhook (Deno, service_role) — EINE WAHRHEIT ──────────┐
 │  - constructEventAsync (Signatur)  - payment_events PK = event.id (idempotent)│
 │  - paid: sb_payments→paid, fee/net persistiert, sb_receipts erzeugt+gespeich. │
 │  - audit_log: sb_payment.paid|refunded|disputed (+reason), unabschaltbar      │
 │  - Quittungs-Mail (Resend) mit Pflichtangaben + Beleg-Link                    │
 └──────────────────────────────────────────────────────────────────────────────┘
        ▼
 ┌── Käufer: Quittung (Mail + /beleg/<id>)   ┌── Erzeuger-Dashboard (auth, RLS) ──┐
 │  - Beleg-Nr., Positionen, Summe,          │  - Einnahmen heute/7/30 Tage         │
 │    Hof-Anschrift, USt-Hinweis,            │  - je Stand / Produkt, Auszahlungen  │
 │    Vermittler-Disclaimer                  │  - Schwund-Indikator (Soll vs. Ist)  │
 └───────────────────────────────────────────  - Refund anstoßen (reason+Audit)  ─┘
```

---

## 3. State-Machine der SB-Zahlung (verbindlich, Pfeiler 5)

```text
            create-checkout                webhook                 webhook/erzeuger
  (kein)  ───────────────►  initiated  ───────────────►  paid  ───────────────►  refunded
                               │  (kein checkout.completed in TTL)        │ (charge.refunded, full/partial)
                               │                                          │
                               ├──► failed   (payment_intent.payment_failed)
                               │
                               └──► canceled (Session expired / Käufer bricht ab)
                                            paid ───► disputed (charge.dispute.created)
                                            disputed ───► paid|refunded (dispute.closed won/lost)
```

- **Erlaubte Übergänge** sind die einzige Wahrheit; jeder Übergang nur durch den **Webhook** oder einen **auditierten Erzeuger-/Staff-Pfad** (Refund). Kein Client setzt `status` direkt.
- `payment_status`-Enum (`0002_payments.sql`) deckt `initiated|paid|failed|refunded|canceled`. **Additiv** in `0005`: `disputed` ergänzen (enum `add value if not exists`).
- **Idempotenz:** doppelte Stripe-Events → `payment_events`-Konflikt → 200 ohne Doppelbuchung (bereits implementiert; für neue Event-Typen beibehalten).

---

## 4. Datenmodell-Erweiterung (additiv, idempotent, RLS deny-by-default)

> Neue Migrationen, **vierstellig, additiv**, mit Rollback-Block im Kopf. **Keine** Änderung an `0001…0004`.

### `0005_sb_payment_connect.sql` — Connect, Stände, Belege, Auszahlungen

```sql
-- Rollback (Kopf): drop table sb_receipts, sb_stands, farm_payouts;
--   alter table sb_payments drop column application_fee_cents, net_to_farm_cents,
--     refunded_cents, dispute_status, stand_id, refund_reason;
--   alter table farms drop column stripe_account_id, stripe_charges_enabled,
--     stripe_payouts_enabled, sb_enabled;

-- ── Connect: Verkäufer = der Hof (Connected Account) ───────────────
alter table farms add column if not exists stripe_account_id      text unique;
alter table farms add column if not exists stripe_charges_enabled boolean not null default false;
alter table farms add column if not exists stripe_payouts_enabled boolean not null default false;
alter table farms add column if not exists sb_enabled             boolean not null default false; -- SB-Bezahlung am Stand aktiv?

-- ── Stände (ein Hof kann mehrere SB-Stände/Standorte haben) ────────
create table if not exists sb_stands (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  farm_id      text not null references farms(id) on delete cascade,
  label        text not null,                 -- z. B. "Eierregal Hofeinfahrt"
  token_version integer not null default 1,   -- erlaubt QR-Rotation/Sperrung ohne Datenverlust
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists sb_stands_farm_idx on sb_stands (farm_id) where deleted_at is null;

-- ── sb_payments: Fee/Net/Refund/Dispute/Stand ergänzen ─────────────
do $$ begin perform 1 from pg_enum e join pg_type t on t.oid=e.enumtypid
  where t.typname='payment_status' and e.enumlabel='disputed';
  if not found then alter type payment_status add value 'disputed'; end if; end $$;

alter table sb_payments add column if not exists stand_id            uuid references sb_stands(id) on delete set null;
alter table sb_payments add column if not exists application_fee_cents integer not null default 0 check (application_fee_cents >= 0);
alter table sb_payments add column if not exists net_to_farm_cents     integer not null default 0 check (net_to_farm_cents >= 0);
alter table sb_payments add column if not exists refunded_cents        integer not null default 0 check (refunded_cents >= 0);
alter table sb_payments add column if not exists dispute_status        text;     -- needs_response/won/lost/null
alter table sb_payments add column if not exists refund_reason         text;
create index if not exists sb_payments_stand_idx on sb_payments (stand_id);
create index if not exists sb_payments_paid_at_idx on sb_payments (paid_at desc);

-- ── Belege (revisionssicher; PDF/HTML in Storage, Metadaten hier) ──
create table if not exists sb_receipts (
  id            uuid primary key default gen_random_uuid(),
  sb_payment_id uuid not null references sb_payments(id) on delete cascade,
  org_id        uuid not null references orgs(id) on delete cascade,
  receipt_no    text not null unique,          -- fortlaufend pro Org (z. B. LBC-2026-000123)
  storage_path  text,                          -- Supabase Storage (privat)
  emailed_to    text,
  created_at    timestamptz not null default now()
);
create index if not exists sb_receipts_payment_idx on sb_receipts (sb_payment_id);

-- ── Auszahlungs-Spiegel (Stripe Payout je Connected Account) ───────
create table if not exists farm_payouts (
  id               text primary key,            -- Stripe payout id (po_...)
  org_id           uuid not null references orgs(id) on delete cascade,
  farm_id          text not null references farms(id) on delete cascade,
  amount_cents     integer not null,
  currency         text not null default 'eur',
  status           text not null,               -- paid/pending/in_transit/failed/canceled
  arrival_date     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists farm_payouts_farm_idx on farm_payouts (farm_id);

-- ── RLS deny-by-default ────────────────────────────────────────────
alter table sb_stands    enable row level security;
alter table sb_receipts  enable row level security;
alter table farm_payouts enable row level security;

-- Erzeuger pflegt/liest eigene Stände (org-gebunden über is_org_member).
drop policy if exists sb_stands_owner_all on sb_stands;
create policy sb_stands_owner_all on sb_stands for all to authenticated
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Belege + Auszahlungen: NUR Owner-read (Schreiben ausschließlich service_role/Webhook).
drop policy if exists sb_receipts_owner_read on sb_receipts;
create policy sb_receipts_owner_read on sb_receipts for select to authenticated
  using (is_org_member(org_id));
drop policy if exists farm_payouts_owner_read on farm_payouts;
create policy farm_payouts_owner_read on farm_payouts for select to authenticated
  using (is_org_member(org_id));

-- Negativ-Garantie (Kommentar-Inventar): farm_payouts/sb_receipts haben KEINE Insert/Update-Policy
--   für authenticated → Schreiben nur durch service_role (Webhook). sb_payments-Schreiben bleibt service_role.
```

> **Belege als eigene Tabelle (ADR-pflichtig):** Quittung = rechtlich relevanter, unveränderlicher Beleg → eigene `sb_receipts` mit fortlaufender, lückenloser Nummer pro Org (kein Löschen, nur Storno via Gegenbuchung/Refund). Schreiben nur via Webhook (`service_role`). Begründung als ADR in `.claude/memory/decisions/`.

### `0006_sb_payment_fraud.sql` — Anti-Betrug & Velocity (additiv)

```sql
-- Velocity-Fenster pro Stand/Token (Bot-/Spam-Schutz, ergänzt Turnstile + Rate-Limit am Edge)
create table if not exists sb_payment_attempts (
  id           uuid primary key default gen_random_uuid(),
  stand_id     uuid references sb_stands(id) on delete set null,
  ip_hash      text not null,                -- HMAC(ip + tagesrotierendes Salt) — NIE Klartext-IP
  ua_hash      text,
  outcome      text not null,                -- created/rate_limited/turnstile_failed/cap_exceeded
  created_at   timestamptz not null default now()
);
create index if not exists sb_payment_attempts_stand_idx on sb_payment_attempts (stand_id, created_at desc);
alter table sb_payment_attempts enable row level security;
-- keine anon/auth-Policy → nur service_role (reine Edge-Schutz-Tabelle).
```

---

## 5. Die Wellen A0 → A9 (eine Welle pro Session)

> Reihenfolge bindend: A0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → A9. Jede Welle endet mit grünen Tests + aktualisiertem Tracker. Account-/Kosten-/Vertrags-Schritte (Connect-Aktivierung, Live-Keys) sind **Owner-Gates**, nicht Code-Wellen.

### WAVE A0 — Read-only Audit, Connect-Strategie & ADR (keine Code-Änderung)
**Ziel:** Stand verifizieren, Connect-Modell festlegen, Skelett-Doku.
**Aufgaben:**
1. Inventar der realen Artefakte (`sb_payments`, `create-checkout`, `stripe-webhook`, `_shared/stripe.ts`, `_shared/email.ts`, `farms`, `is_org_member`) — Mapping „vorhanden ↔ fehlt" (wie §1).
2. **Connect-Modell-Entscheidung (ADR):** **Destination Charges mit `application_fee_amount`** (Plattform ist „merchant of record"-nah, Hof erhält Net automatisch via `transfer_data.destination`; Plattform behält Fee; Refund/Dispute klar zuordenbar). Alternative „Separate Charges & Transfers" wird verworfen (mehr Buchungsaufwand, kein Mehrwert für SB-Kleinbeträge). Account-Typ: **Express** (schnellstes Onboarding für Höfe, Stripe-gehostetes KYC).
3. `docs/spezialmodule/SB_BEZAHLUNG_USP.md` Skelett (Status-Sektionen) + `docs/STRIPE-SETUP.md`-Abschnitt „Connect" anlegen.
**Acceptance:** ADR „Connect Destination Charges + Express" liegt unter `.claude/memory/decisions/`; Skelett-Docs existieren; **keine** Code-Änderung; Mapping-Tabelle vorhanden.

### WAVE A1 — Datenmodell-Migration (`0005` + `0006`)
**Ziel:** Connect-Felder, Stände, Belege, Auszahlungen, Anti-Betrug-Tabellen — additiv, idempotent.
**Aufgaben:** `0005_sb_payment_connect.sql` + `0006_sb_payment_fraud.sql` (§4) anlegen; RLS deny-by-default; `is_org_member`-basierte Owner-Reads; Negativ-Garantie-Inventar; Rollback-Block.
**Acceptance:**
- `npx supabase db reset` wendet `0001…0006` fehlerfrei + **idempotent** an (zweiter Lauf ohne Fehler).
- Neue Tabellen haben RLS aktiv; `farm_payouts`/`sb_receipts`/`sb_payment_attempts` ohne anon/auth-Policy.
- `payment_status` enthält `disputed`; `sb_payments` trägt Fee/Net/Refund/Dispute/Stand-Spalten mit CHECK ≥ 0.
- **Keine** Änderung an `0001…0004`.

### WAVE A2 — Stand-Token (signiert) + `verify-stand` Edge Function
**Ziel:** QR-Token, der **fälschungssicher** Stand→Hof auflöst, ohne Preis/Secret im QR.
**Aufgaben:**
1. `app/supabase/functions/_shared/standToken.ts` (NEU): `signStand({farmId, standId, version})` + `verifyStand(token)` via **HMAC-SHA256** mit Function-Secret `STAND_TOKEN_SECRET`. Token = `base64url(payload).base64url(sig)`; `payload` enthält `farm_id`, `stand_id`, `v` (token_version). Konstante-Zeit-Vergleich.
2. `app/supabase/functions/verify-stand/index.ts` (NEU, **public**, CORS): Token verifizieren → Stand laden (`active`, `deleted_at is null`), Hof laden (`verified`, `sb_enabled`, `stripe_charges_enabled`), **freigegebene Produkte** + serverseitige Preise zurückgeben. Turnstile-vorbereitet. Zero-State: Stand/Hof nicht freigeschaltet → `{ available:false, reason:'stand_inactive'|'connect_pending' }`, **kein 500**.
3. Stand-QR-Generierung im Erzeuger-Dashboard vorbereiten (A6): `signStand` Server-seitig, QR-PNG (Storage) zum Drucken.
**Acceptance:**
- Gültiger Token → korrekter Stand+Hof+Produkte (nur freigegebene, serverseitige Preise).
- Manipulierter/abgelaufener Token (`v` ≠ `token_version`) → **abgelehnt** (kein Datenleck).
- Inaktiver Stand / Hof ohne Connect → `available:false` mit klarem `reason` (Zero-State), kein 500.
- `STAND_TOKEN_SECRET` nur als Function-Secret; **nie** im Repo/Client.

### WAVE A3 — `create-checkout` auf Connect + Server-Preis + Velocity härten
**Ziel:** Bestehende Function so erweitern, dass Geld zum Hof fließt und Betrug abgefangen wird.
**Aufgaben (additiv, bestehender `mode:'sb_payment'`-Pfad):**
1. **Stand-Token-Pflicht:** statt rohem `farmId/productId` jetzt `standToken` → `verifyStand` → daraus `farm_id`/`stand_id`. Produkt(e) + Menge weiterhin gegen `products` (serverseitiger Preis, Client-Betrag ignoriert).
2. **Turnstile** verifizieren (`TURNSTILE_SECRET`) vor Session-Erstellung.
3. **Velocity/Cap:** `sb_payment_attempts` zählen (z. B. > N Versuche/Stand/Minute → 429; Betrag > `SB_MAX_AMOUNT_CENTS` → 400). Jeder Versuch protokolliert (ip_hash/ua_hash, **nie** Klartext).
4. **Connect:** Hof muss `stripe_account_id` + `stripe_charges_enabled` haben, sonst `{ error:'connect_pending' }` (Zero-State, kein Checkout). Session bekommt:
   `payment_intent_data.application_fee_amount = platformFeeCents(amount)`,
   `payment_intent_data.transfer_data.destination = farm.stripe_account_id`.
5. `sb_payments`-Insert um `stand_id`, `application_fee_cents`, `net_to_farm_cents` ergänzen.
6. `platformFeeCents()` in `_shared/stripe.ts`: konfigurierbar via `SB_FEE_BPS` (Basispunkte) + `SB_FEE_FIXED_CENTS`, gedeckelt; nie negativ; net = amount − fee.
**Acceptance:**
- Ohne gültigen Stand-Token / ohne Turnstile / über Cap → **kein** Checkout (klarer Fehlercode), Versuch protokolliert.
- Hof ohne aktiven Connect-Account → `connect_pending`, kein Checkout, kein 500.
- Erfolgreiche Session trägt `application_fee_amount` **und** `transfer_data.destination`; `sb_payments` hat fee+net konsistent (`fee+net == amount`).
- Preis stammt **ausschließlich** aus `products` (Test: manipuliertes Client-`amount` ändert nichts).

### WAVE A4 — `stripe-webhook` vervollständigen (paid · refunded · dispute · failed · account.updated)
**Ziel:** EINE idempotente Wahrheit für den vollen Lebenszyklus + Beleg-Persistenz.
**Aufgaben (additiv, bestehender Handler):**
1. **`checkout.session.completed` (sb_payment):** wie heute → `paid`; zusätzlich `application_fee`/`net` aus PaymentIntent verifizieren (Drift-Schutz), `sb_receipts` erzeugen (fortlaufende `receipt_no` pro Org, HTML/PDF in **privatem** Storage), Beleg-Mail mit Pflichtangaben + Beleg-Link.
2. **`payment_intent.payment_failed`** → `sb_payments.failed` (+audit).
3. **`charge.refunded`** → `refunded_cents` setzen, Status `refunded` (voll) bzw. teilweise (`refunded_cents < amount_cents`), audit `sb_payment.refunded` (+reason aus Refund-Metadata).
4. **`charge.dispute.created`** → `dispute_status='needs_response'`, Status `disputed`, audit + Staff-Benachrichtigung. **`charge.dispute.closed`** → `won`→zurück `paid`, `lost`→`refunded`.
5. **`account.updated` (Connect)** → `farms.stripe_charges_enabled/payouts_enabled` spiegeln; `sb_enabled` bleibt Erzeuger-Schalter.
6. **`payout.paid|failed`** (Connect, optional via Connect-Webhook-Endpoint) → `farm_payouts` spiegeln.
7. **Idempotenz** für **alle** neuen Typen über bestehendes `payment_events` (PK=event.id).
**Acceptance:**
- Jeder Event-Typ genau **einmal** wirksam (doppeltes Event → 200, keine Doppelbuchung; Test mit identischer event.id).
- `paid` erzeugt genau **einen** Beleg mit eindeutiger, fortlaufender `receipt_no`; Mail enthält Pflichtangaben + Disclaimer.
- Refund/Dispute setzen Status + Beträge korrekt; jede Mutation hat `audit_log`-Eintrag (action + reason + details), org-gebunden.
- `account.updated` schaltet Hof erst frei, wenn `charges_enabled` — vorher `connect_pending` im Checkout.

### WAVE A5 — Käufer-Stand-Flow (React, public, Cloudflare Pages)
**Ziel:** Die Seite hinter dem QR — schnell, mobil, ohne Login, ohne App.
**Aufgaben:**
1. Route `/stand/:standToken` (öffentlich) in `app/src/`: lädt `verify-stand`, zeigt Hof-Header (Name, Standort, Verifiziert-Badge), Produktliste mit serverseitigen Preisen, Mengenwähler, optional E-Mail-Feld für Beleg, **Vermittler-Disclaimer** sichtbar.
2. „Jetzt bezahlen" → `create-checkout` (mit `standToken` + Turnstile-Token) → Redirect zu Stripe.
3. Rückkehr `/beleg/:id` (success_url): zeigt Beleg-Zusammenfassung + „Beleg per Mail erneut senden"; Fehler/Abbruch (cancel_url) → freundlicher Retry-State.
4. Lade-/Leer-/Fehler-Zustände vollständig (Stand inaktiv → „Dieser Stand ist gerade nicht aktiv"; Connect pending → „Bezahlung wird hier in Kürze freigeschaltet"). **Keine toten Buttons.**
5. Editorial-Token-Design (`app/src/styles/theme.css`), keine hardcodierten Farben, keine Deko-Emojis.
**Acceptance:**
- Voll verdrahtete Kette: QR-Token → DOM → Fetch → Stripe-Redirect → Beleg-Seite (kein TODO/Platzhalter).
- Mobil sauber, schnell; alle Zustände real auslösbar (inaktiv/pending/leer/Fehler).
- Konsole sauber (keine `TypeError`/401-Schleifen); Disclaimer durchgängig sichtbar.

### WAVE A6 — Connect-Onboarding + Stand-Verwaltung (Erzeuger, auth)
**Ziel:** Hof richtet bargeldlose SB-Bezahlung selbst ein und druckt seine QR-Codes.
**Aufgaben:**
1. Edge Function `connect-onboard` (auth + `is_org_member`): erstellt/holt Express-Account (`stripe_account_id` an `farms`), erzeugt **Account Link** (Onboarding-URL), Rückkehr aktualisiert `account.updated`-Status.
2. Erzeuger-UI „SB-Bezahlung einrichten": Status (KYC offen / aktiv / Auszahlung aktiv), CTA Onboarding, Schalter `sb_enabled`.
3. Stand-Verwaltung: Stände anlegen/umbenennen/deaktivieren (RLS owner-all); **QR generieren** (Server `signStand` → QR-PNG in Storage → Druck-PDF „Am Stand aufhängen"). Token-Rotation = `token_version++` (alte QR sofort ungültig).
**Acceptance:**
- Hof ohne Account sieht klaren Onboarding-CTA; nach Stripe-Onboarding spiegelt `charges_enabled` korrekt (über `account.updated`).
- Stand anlegen → druckbarer QR; Rotation macht alte QR **sofort** ungültig (verify-stand lehnt `v`-Mismatch ab).
- Alle Aktionen org-gebunden (Cross-Org-Negativtest: fremder Hof nicht verwaltbar).

### WAVE A7 — Erzeuger-Dashboard: Einnahmen, Auszahlungen, **Schwund-Indikator**
**Ziel:** Der wirtschaftliche Mehrwert sichtbar — Echtzeit-Einnahmen + Schwund-Signal.
**Aufgaben:**
1. Edge Function/Query (RLS-konform, `is_org_member`): aggregierte Einnahmen heute/7/30 Tage, je Stand/Produkt, Plattform-Fee transparent, Net, Auszahlungen (`farm_payouts`).
2. **Schwund-Indikator (USP-Kern):** vergleicht erwartete Verkäufe (optional gepflegte Bestands-/Auffüll-Mengen aus `availability`/Erzeuger-Eingabe) mit tatsächlich **bezahlten** Mengen → Indikator „Differenz/Schwund" je Produkt/Zeitraum. Klar als **Indikator** (keine Anschuldigung), mit Hinweis „Schätzung — Plattform vermittelt nur".
3. Refund-Pfad: Erzeuger stößt (oder Staff) Refund an → Edge Function `sb-refund` (auth, `is_org_member`, **reason Pflicht**, Stripe Refund mit Connect-Reverse-Fee-Option), Webhook bestätigt → Status/Audit.
4. Vollständige Zero-States (noch keine Zahlungen → „Noch keine Einnahmen — so richten Sie einen Stand ein").
**Acceptance:**
- Dashboard zeigt nur **eigene** Org-Daten (Cross-Org-Negativtest 403/0 Zeilen); Fee/Net/Auszahlung transparent.
- Schwund-Indikator rechnet korrekt + ist als Schätzung gekennzeichnet; Zero-State professionell.
- Refund nur mit `reason` (Pflicht) → Stripe-Refund → Webhook → Status `refunded` + Audit; ohne reason **abgelehnt**.

### WAVE A8 — Anti-Betrug, Compliance & Härtung (durchgängig)
**Ziel:** Produktionsreife gegen Manipulation + rechtssicher.
**Aufgaben:**
- **Anti-Betrug:** Turnstile aktiv, Rate-Limit + Velocity (A3), Betrags-Cap, Stripe Radar-Hinweise, Dispute-Pfad (A4), suspicious-Velocity → Staff-Flag. Keine Klartext-IP/UA (nur HMAC mit tagesrotierendem Salt).
- **Compliance:** Beleg-Pflichtangaben (Hof-Name/Anschrift, Datum/Uhrzeit, Positionen, Summe, Beleg-Nr.; USt-Hinweis: **Hof** ist Verkäufer/Steuerpflichtiger, Plattform = Vermittler/Zahlungsanbindung); **Vermittler-Disclaimer** auf Stand-Seite + Beleg; DSGVO (Beleg-Mail nur mit Einwilligung/Zweck, Datensparsamkeit, Storage privat, Löschkonzept); Geldwäsche/KYC liegt bei **Stripe Connect** (Express).
- **Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STAND_TOKEN_SECRET`, `TURNSTILE_SECRET` nur Function-Secrets; Frontend nur `VITE_`-Public + Turnstile-Sitekey.
**Acceptance:**
- `security-auditor` (read-only): kein Secret im Client/Log, kein service-role im Frontend, Webhook signaturgeprüft, alle public Edge-Eingänge Turnstile+Zod.
- Beleg + Stand-Seite tragen Pflichtangaben + Vermittler-Disclaimer; keine Klartext-IP gespeichert.
- Manipulationsversuche (Stand-Token, Client-Betrag, Replay) sind nachweisbar abgefangen (Tests).

### WAVE A9 — Tests, Observability, Doku & Track-A-Gate
**Ziel:** Beweisbare Reife, dann Go-Live-fähig.
**Aufgaben:**
1. **Tests** in den bestehenden Harness aufnehmen (`app/supabase/tests/`, Pfade via `import.meta.url`):
   - Isolation: Erzeuger A sieht keine `sb_payments`/`sb_receipts`/`farm_payouts`/Stände von Org B (neue T-Fälle, an WAVE_02 T1–T12 anschließend).
   - Webhook-Idempotenz: identische `event.id` → genau eine Wirkung (paid/refund/dispute je einmal).
   - Server-Preis: manipuliertes Client-`amount` ändert Betrag/Fee/Net nicht.
   - Stand-Token: Manipulation/Rotation → abgelehnt.
   - Fee/Net-Invariante: `application_fee_cents + net_to_farm_cents == amount_cents`.
   - Refund-Pflicht: ohne `reason` abgelehnt; mit reason → Status+Audit korrekt.
   - Zero-State: Hof ohne Connect → `available:false`, kein 500; leeres Dashboard → leere Arrays.
2. **Observability:** strukturierte Logs (ohne PII), Metriken (Checkout-Erfolgsrate, Webhook-Fehlerrate, Dispute-Quote, Refund-Quote, Payout-Latenz), Sentry-Anbindung (WAVE_13-konform).
3. **Doku final:** `docs/spezialmodule/SB_BEZAHLUNG_USP.md`, `docs/STRIPE-SETUP.md` (Connect + SB), `docs/PRICING.md` (SB-Transaktionsgebühr), `docs/COMPLIANCE_MODEL.md`-Abschnitt (Beleg/Vermittler/DSGVO); Tracker (`docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md`); ADRs + Pattern (Connect-Destination-Charge-Harness als Imperium-Beschleuniger).
**Acceptance:**
- Alle Track-A-Tests grün im offiziellen Runner; Cross-Org dicht; Idempotenz bewiesen; Server-Preis erzwungen.
- Observability-Metriken sichtbar; Logs PII-frei.
- Doku vollständig; Tracker spiegelt realen Stand.

---

## 6. Acceptance (Track-A-Gesamtabnahme — alle grün)

**Geldfluss & Connect**
1. Geld fließt zum **Hof** (Connected Account via `transfer_data.destination`); Plattform behält nur `application_fee_amount`. `fee + net == amount` (Test-Invariante).
2. Hof ohne aktiven Connect-Account kann **nicht** verkaufen (`connect_pending`, kein Checkout, kein 500).

**Sicherheit & Integrität**
3. **Preis ausschließlich serverseitig** aus `products` (Client-Betrag wirkungslos — Test).
4. **EIN** Webhook, signaturgeprüft + **idempotent** über `payment_events` für **alle** Event-Typen (paid/failed/refunded/dispute/account/payout).
5. Stand-QR trägt einen **signierten** Token (HMAC), kein Klartext-Preis/Geheimnis; Rotation macht alte QR sofort ungültig.
6. Public Edge-Eingänge (`verify-stand`, `create-checkout`) durch **Turnstile** + **Velocity/Cap** geschützt; keine Klartext-IP/UA gespeichert.

**Isolation & RBAC (Pfeiler 1/4)**
7. Erzeuger sieht **nur** eigene Org-Daten (`sb_payments`/`sb_receipts`/`farm_payouts`/`sb_stands`) via `is_org_member`; Cross-Org = 0 Zeilen/403 (Test).
8. `farm_payouts`/`sb_receipts`/`payment_events`/`sb_payment_attempts` ohne anon/auth-Policy → nur `service_role`.

**Audit & Compliance (Pfeiler 5 / Vermittler)**
9. Jede Mutation (paid/refunded/disputed/payout/connect) → `audit_log` (action + **reason** bei kritischen + details), org-gebunden, unabschaltbar. Refund **nur mit reason**.
10. Beleg trägt Pflichtangaben (Hof-Anschrift, Positionen, Summe, Beleg-Nr., Zeitstempel, USt-Hinweis) + **Vermittler-Disclaimer**; Belegnummer fortlaufend/lückenlos pro Org.

**Erlebnis & Zero-State (Pfeiler 2/3/7)**
11. Käufer-Stand-Flow end-to-end verdrahtet (QR→DOM→Fetch→Stripe→Beleg), mobil, alle Zustände real; keine toten Buttons/TODOs.
12. Schwund-Indikator korrekt + als Schätzung gekennzeichnet; alle Leer-/Fehlerzustände professionell (kein 500).

**Hygiene**
13. Nur neue Migrationen (`0005`, `0006`) + neue Functions/Routes; `0001…0004` unverändert; Rollback dokumentiert; `npm run typecheck` + `npm run build` grün; keine Secrets im Repo/Log.

---

## 7. Gate (Track-A-Gate — blockierend vor Kunden-Freischaltung)

> Track A ist nach A9 fertig. Das **Track-A-Gate** muss grün sein, bevor der USP für echte Höfe/Käufer scharf geschaltet wird. Es ist Vorgate zum Marktstart-Pflicht-Set („mind. ein Geldfluss") und schließt an Phase-2-Gate **C (Tenant-Isolation)** + **B (Security)** an.

| Gate-Prüfung | Kriterium | Beleg / Verantwortlich |
|---|---|---|
| **Migrations-Gate** | `db reset` `0001…0006` grün + idempotent; neue RLS aktiv; `0001…0004` unberührt | §5 A1 · `db-rls-spezialist` |
| **Connect-Gate** | Geld zum Hof (destination), Plattform-Fee korrekt, `fee+net==amount`; Hof ohne Connect blockiert | §5 A3/A4 · `payment-engineer` |
| **Webhook-Gate (blockierend)** | EIN signierter, idempotenter Handler über alle Event-Typen; doppeltes Event = eine Wirkung | §5 A4 · `qa-tester` |
| **Server-Preis-Gate** | Client-Betrag wirkungslos; Preis nur aus `products` | §5 A3 Test · `qa-tester` |
| **Token-Gate** | Stand-Token HMAC-signiert; Manipulation/Rotation abgewiesen; kein Preis/Secret im QR | §5 A2 · `security-auditor` |
| **Isolations-Gate (blockierend)** | Cross-Org 0 Zeilen/403; service-role-only Tabellen dicht | §5 A9 (an WAVE_02-Harness) · `qa-tester` |
| **Anti-Betrug-Gate** | Turnstile + Velocity + Cap aktiv; Dispute/Refund-Pfad; keine Klartext-IP | §5 A8 · `security-auditor` |
| **Compliance-Gate** | Beleg-Pflichtangaben + Vermittler-Disclaimer + DSGVO; Belegnummer lückenlos | §5 A8/A9 · `compliance-officer` |
| **Secret-Gate** | keine Secrets im Client/Log; service_role nur in Edge; Frontend nur `VITE_`/Sitekey | `security-auditor` (read-only) |
| **Doku-Gate** | `SB_BEZAHLUNG_USP.md`, `STRIPE-SETUP.md`, `PRICING.md`, Tracker, ADRs aktuell | Review |

**Stop-Regeln in diesem Track:**
- **Stripe Connect aktivieren** (Plattform-Profil, Verträge, Auszahlungen, Live-Keys), **Domain/Go-Live**, echte Gebührenhöhe → **STOP**, Owner-Freigabe (Account/Kosten/Vertrag).
- Statusübergang einer Zahlung unklar oder serverseitig nicht org-scopebar → **STOP**, minimalen Fix + Owner-OK.
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 8. Manuelle Owner-Tasks (Account/Kosten/Vertrag — außerhalb der Code-Wellen)

```text
[ ] Stripe-Plattform-Profil + Connect aktivieren (Express), Plattform-AGB/Connect-Vertrag akzeptieren.
[ ] Gebührenmodell festlegen (SB_FEE_BPS / SB_FEE_FIXED_CENTS) — wirtschaftlich, gedeckelt, transparent im Beleg.
[ ] Zahlmethoden im Stripe-Dashboard aktivieren (Karte, SEPA, PayPal, Giropay, Klarna, Apple/Google Pay).
[ ] Function-Secrets setzen: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STAND_TOKEN_SECRET, TURNSTILE_SECRET,
    RESEND_API_KEY, PUBLIC_APP_URL, SB_MAX_AMOUNT_CENTS, SB_FEE_BPS, SB_FEE_FIXED_CENTS.
[ ] Webhook-Endpunkt(e) in Stripe registrieren (Plattform + Connect) → STRIPE_WEBHOOK_SECRET.
[ ] Cloudflare: Turnstile-Sitekey/-Secret, WAF/Rate-Limit für /functions/* und /stand/*.
[ ] Supabase-EU-Projekt: db push 0005/0006, privater Storage-Bucket „receipts", Domain.
[ ] DSGVO: AVV mit Stripe/Resend/Supabase/Cloudflare prüfen; Löschkonzept Belege.
```

> Diese Schritte sind **kosten-/vertrags-/außenwirksam** → **vorab in Klartext ankündigen, erst auf Owner-OK** (CLAUDE.md/AGENTS.md). Die Code-Wellen A0–A9 sind lokal, additiv und account-neutral (lokale Supabase-CLI + Stripe-Testmodus).

---

## 9. Abschlussbericht (Vorlage — pro Welle füllen)

```
## Welle abgeschlossen: <A0…A9 — Name>
- Geändert: <Dateien — Migrationen 0005/0006, Edge Functions, React-Routen, Doku>
- Tests/Verifikation: <db reset idempotent · Webhook-Idempotenz · Server-Preis · Stand-Token ·
  Isolation Cross-Org · fee+net==amount · Refund-reason · Zero-State · typecheck/build grün>
- Risiken: <additiv? Retrofit? Feature-Flag (sb_enabled)? Rollback (drop-Block)?>
- Compliance: <Beleg-Pflichtangaben · Vermittler-Disclaimer · keine Klartext-IP · Secrets nur Edge>
- Nächste Welle: <…>
```

---

## 10. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, USP-Abschnitt, Backend-/Edge-/Payment-Regeln), `AGENTS.md` (`payment-engineer`: EIN idempotenter signierter Webhook + Entitlements serverseitig; SQL nur additiv; kein Merge ohne grünen Isolationstest), `PHASEN.md` (Phase 4 Track A; Marktstart-Pflicht-Set „mind. ein Geldfluss").
- **Landkarte:** `MASTER_INDEX.md` (3 `spezialmodule/SB_BEZAHLUNG_USP.md` ⭐, 4 `STRIPE-SETUP.md`/`PRICING.md`, 7 `phase4_vertical/TRACK_A_SB_PAYMENT` = diese Datei).
- **Reale Artefakte (Bestand, Basis):** `app/supabase/migrations/0001…0004`, `0002_payments.sql` (`sb_payments`/`payment_events`), `app/supabase/functions/create-checkout/index.ts`, `stripe-webhook/index.ts`, `_shared/stripe.ts`, `_shared/email.ts`, `_shared/supabaseAdmin.ts`, `_shared/cors.ts`, `app/src/lib/{data,supabase,types}.ts`.
- **Vorwellen:** `finalization/WAVE_02_datamodel_rls.md` (Isolations-Harness T1–T12, `current_org_ids`/`is_org_member`), `WAVE_06_security.md` (Turnstile, Rate-Limits), `WAVE_09_billing.md` (Stripe-Abo, SB-Vorbereitung — Track A ist dessen vertikale Vollendung), `WAVE_14`/`docs/COMPLIANCE_MODEL.md` (DSGVO, Lebensmittel-/Vermittler-Hinweis).
- **Subagenten:** `payment-engineer` + `edge-functions-spezialist` (Build) → `security-auditor` + `compliance-officer` (Prüfung) → `qa-tester` (Gate), `db-rls-spezialist` (Migrationen/RLS), `frontend-design-guardian` (Stand-Flow/Dashboard-UI).

> **Vermittler-Disclaimer (durchgängig):** Die Plattform **vermittelt** und **bindet die Zahlung an** und stellt einen **Beleg** aus. Verkäufer und Steuerpflichtiger ist der **Hof** (Stripe Connected Account). Die Plattform **verkauft nicht selbst**, **berät nicht** und übernimmt **keine Warenhaftung**. Jeder Account-/Kosten-/Vertrags-/Go-Live-Schritt: **vorab ankündigen, erst auf Owner-OK.**
