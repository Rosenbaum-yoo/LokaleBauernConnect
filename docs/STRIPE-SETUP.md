# STRIPE-SETUP — LokaleBauernConnect (Einrichtungs-Runbook)

> **Operatives Einrichtungs-Runbook für Stripe (+ Connect).** Diese Datei ist die *umsetzbare* Companion-Spezifikation zu den normativen Quellen `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Flow) und `docs/product/PLANS_AND_LIMITS.md` (Plan-/Gebühren-Wahrheit): **Was muss der Owner im Stripe-Dashboard anlegen, welche Secrets gehören wohin, wie wird der signaturgeprüfte, idempotente Webhook in einer Edge Function verdrahtet, wie testet man, und wie geht man von Test → Live.**
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Vermittler-Grundsatz (nicht verhandelbar):** LokaleBauernConnect ist **Zahlungsanbindung/Vermittler**, nicht Verkäufer und nicht Berater. Bei der SB-Bezahlung fließt das Geld via **Stripe Connect** an den **Hof**; die Plattform behält ausschließlich `platform_fee_cents`. Vertragspartner des Käufers ist stets der Erzeuger. Kein Abschnitt dieses Dokuments darf so gelesen werden, dass die Plattform Eigenverkauf betreibt, Kundengelder treuhänderisch hält oder die Produkt-/Lebensmittelverantwortung der Erzeuger übernimmt.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Webhook-Regel · Backend-/Edge-Regeln · Stop-/Commercial-Regeln) · `AGENTS.md` (`payment-engineer` · `edge-functions-spezialist` · `security-auditor`) · `PHASEN.md` (WAVE_09 Billing · Phase 4 Track A) · `docs/DATABASE_MODEL.md` (§4.1 `orgs`, §4.7 `sb_payments`, §2 `payment_status`/`org_plan`) · `docs/product/PLANS_AND_LIMITS.md` (§1 Pläne · §3.3 Feature-Gates · §4 SB-Gebühr · §5 Entitlement-Architektur) · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (§4 Bezahl-Flow · §11 Edge-Function-Inventar · §13 Owner-Entscheidungen) · `docs/COMPLIANCE_MODEL.md` (§0/§7/§9 Subprozessor/SAQ-A/CMP-04) · `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant) · `docs/PRICING.md` (geplant).
>
> **Status:** Normativ-operativ (Einrichtungs-/Betriebsanleitung für WAVE_09 + Phase 4 Track A). Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.
> **Stand:** 2026-06-19 · Zuständig: Payment (Claude) · Subagenten: `payment-engineer` · `edge-functions-spezialist` · `security-auditor` · `compliance-officer` · Freigabe: **Owner** (Stripe-Account · Connect · Live-Keys · Pricing · Go-Live).

---

## 0 · Geltungsbereich & zwei Geldflüsse

LokaleBauernConnect hat **genau zwei** Stripe-Geldflüsse. Sie sind sauber getrennt — anderes Stripe-Objekt, andere Edge Function, anderer Empfänger.

| # | Geldfluss | Wer zahlt → wer empfängt | Stripe-Objekt | Quelle der Wahrheit (DB) | Phase |
|---|---|---|---|---|---|
| **A** | **Erzeuger-Abo** (`basis`/`plus`/`pro`/`individuell`) | Erzeuger-Betrieb → **Plattform** | `Subscription` (Recurring Price) via Checkout/Billing Portal | `orgs.plan` · `orgs.plan_valid_until` · `orgs.stripe_customer_id` | WAVE_09 |
| **B** | **SB-Bezahlung am unbemannten Stand ⭐** (USP) | Käufer → **Hof** (Connect), Plattform behält Gebühr | `PaymentIntent` (Connect Destination Charge + `application_fee_amount`) | `sb_payments` · `orgs.stripe_connect_id` | Phase 4 Track A |

> **Disziplin:** Beide Flüsse teilen **denselben** signaturgeprüften, idempotenten Webhook-Handler-Pfad als Wahrheit (§6). `orgs.plan` wird **ausschließlich** vom Abo-Webhook geschrieben (`PLANS_AND_LIMITS.md` §0); `sb_payments`-Status **ausschließlich** vom SB-Webhook. Der Client setzt **nie** Plan oder Zahlungsstatus.

---

## 1 · Voraussetzungen (Owner-Konto bei Stripe)

| Voraussetzung | Begründung |
|---|---|
| **Stripe-Account, Land = Deutschland, Währung EUR** | EU-Datenresidenz/Vertragsraum; alle Preise in EUR-Cent. |
| **Stripe Connect aktiviert** (Platform/Connect-Profil) | Für Geldfluss B (SB-Bezahlung an Höfe). Connect-Profil + Branding ausfüllen (erscheint im Connect-Onboarding der Erzeuger). |
| **Stripe Radar** (Standard, in Connect enthalten) | Zweite Anti-Betrugs-Schicht zusätzlich zu Turnstile/Rate-Limit (`SB_BEZAHLUNG_USP.md` §8). |
| **Geschäftsdaten/Verifizierung der Plattform** | Voraussetzung für Live-Zahlungen + Connect-Auszahlungen. |
| **Datenschutz/DPA mit Stripe** | Stripe ist Subprozessor + eigener Verantwortlicher (`COMPLIANCE_MODEL.md` §0/§7). DPA + SCC/Adequacy ablegen. |

> **Owner-Entscheidungen vor Live** (aus `SB_BEZAHLUNG_USP.md` §13, hier referenziert, nicht dupliziert): SB-01 Gebührenhöhe/Erhebungsweg · SB-02 Connect-Variante (Express vs. Standard) · SB-03 aufsichtsrechtliche Einordnung · SB-04 Live-Keys/Webhook-Endpoint. Diese sind **Owner/extern** zu bestätigen — dieses Runbook setzt die *technische* Verdrahtung, nicht die rechtliche/preisliche Festlegung.

---

## 2 · Produkte & Preise

### 2.1 — Erzeuger-Abo (Geldfluss A) — als **vorangelegte** Stripe-Produkte/Preise

Anders als der TempConnect-Vorläufer (dynamisches `price_data` im Checkout) legen wir die Abo-Preise **als feste Stripe-`Price`-Objekte** an. Begründung (`PLANS_AND_LIMITS.md` §1, Preis-Hoheit beim Owner): Preise sind eine **Owner-Entscheidung** und dürfen **nicht im Code hartkodiert** sein — die wirksame Wahrheit ist die Stripe-`price`-ID, der Server liest nur die ID aus Env. Das macht Preisänderungen zu einer Stripe-/Env-Operation ohne Codedeploy und hält Abo-Lifecycle, Proration und Billing-Portal konsistent.

**Anlegen (Dashboard → Product catalog → Add product), je Plan ein Produkt mit einem monatlichen Recurring-Price (EUR, netto zzgl. USt., Tax-Behavior nach Owner/Steuerberatung):**

| Plan (`org_plan`) | Produktname | Preis/Monat (Vorgabe-Staffel, Owner-Freigabe) | Env-Variable für die `price`-ID |
|---|---|---|---|
| `basis` | LokaleBauernConnect — Basis | **19 €** | `STRIPE_PRICE_BASIS` |
| `plus` | LokaleBauernConnect — Plus | **49 €** | `STRIPE_PRICE_PLUS` |
| `pro` | LokaleBauernConnect — Pro (inkl. SB-Bezahlung ⭐) | **99 €** | `STRIPE_PRICE_PRO` |
| `individuell` | LokaleBauernConnect — Individuell | individuell (Vertrieb/Owner) | `STRIPE_PRICE_INDIVIDUELL` (optional; meist manuell/Invoice) |

- **`demo` hat keinen Stripe-Preis** — kostenlose Vorschau, kein Stripe-Objekt (`PLANS_AND_LIMITS.md` §1).
- **`price` → Plan-Mapping** lebt serverseitig: die Edge-Function-Konstante `app/supabase/functions/_shared/stripe-prices.ts` mappt `price`-ID → `org_plan` (gespiegelt aus den Env-IDs). So weiß der Webhook bei `checkout.session.completed`/`customer.subscription.updated`, **welcher Plan** gesetzt wird — ohne Magic-String. Bei unbekannter `price`-ID: kein Plan-Wechsel, `audit_log(billing.unknown_price)` + Alarm.
- **USt./Tax:** Stripe Tax oder feste Steuersätze nach Owner/Steuerberatung. Die Vorgabe-Staffel ist **netto** (`PLANS_AND_LIMITS.md` §1).

### 2.2 — SB-Bezahlung (Geldfluss B) — **kein** vorangelegtes Produkt nötig

Die SB-Zahlung ist ein **dynamischer `PaymentIntent`** über den serverseitig aus `products.price_cents × qty` berechneten Betrag (`SB_BEZAHLUNG_USP.md` §4.1, §5.3). Es gibt **kein** Stripe-Product je Hofprodukt — das wäre Eigenverkauf-Modellierung und widerspräche der Vermittler-Rolle. Stripe sieht nur Betrag, Währung, `application_fee_amount`, `transfer_data.destination` und `metadata` (`sb_payment_id`, `farm_id`, `org_id`, `stand_code`).

> **Geld als Integer-Cent (kein Float):** `amount_cents`, `platform_fee_cents` immer in Cent (`DATABASE_MODEL.md` §4.4 „Geld als Integer-Cent"). Kein Float-Geld irgendwo im Pfad.

---

## 3 · Stripe Connect (Geldfluss B — Auszahlung an den Hof)

Vollständige Fachspezifikation: `SB_BEZAHLUNG_USP.md` §4.3. Hier die Einrichtungs-Schritte.

### 3.1 — Connect-Modell (fix)

**Destination Charge mit `application_fee_amount`.** Die Belastung läuft über das **Plattform-Stripe-Konto**, der Nettobetrag wird per `transfer_data.destination = orgs.stripe_connect_id` an den **Connect-Account des Hofes** weitergeleitet; `application_fee_amount = platform_fee_cents` verbleibt bei der Plattform. Konsequenzen (verbindlich):

- **PCI-Scope der Plattform = SAQ-A** — Kartendaten gehen über das **Stripe Payment Element** direkt an Stripe; die Plattform sieht **keine PAN/CVC** (`COMPLIANCE_MODEL.md` §0, `SB_BEZAHLUNG_USP.md` §8/§9).
- **Kein Plattform-Treuhand-Saldo** — Stripe zahlt im Standard-Payout-Zyklus direkt auf das Hof-Bankkonto. Die Plattform hält **keine** Kundengelder → stützt die Vermittler-/Nicht-Zahlungsdienste-Position (finale aufsichtsrechtliche Bewertung = Owner/extern, SB-03).

### 3.2 — Connect-Variante (Owner-Entscheidung SB-02)

| Variante | Onboarding-UX | Branding/Support | Empfehlung |
|---|---|---|---|
| **Express** | Stripe-gehostetes Onboarding, schnell, geringe Erzeuger-Friktion | Stripe-Branding, Stripe-Express-Dashboard | **Default-Empfehlung** für breite Hof-Adoption (niedrige Hürde, `PLANS_AND_LIMITS.md` §1 „bewusst günstig/breit") |
| **Standard** | Erzeuger nutzt vollwertigen eigenen Stripe-Account | Voll beim Erzeuger | Für größere Höfe/Verbünde (`individuell`) |

Die Architektur ist gegen beide Varianten identisch (`stripe_connect_id` + `account.updated`-Webhook). Owner legt die Variante in SB-02 fest; bis dahin ist der Default **Express**.

### 3.3 — Erzeuger-Connect-Onboarding (Self-Service, gegated)

- Edge Function `POST /functions/v1/connect/onboard` (Auth: Erzeuger `org_owner`, **MFA-Pflicht** — `SB_BEZAHLUNG_USP.md` §11): erzeugt einen **Stripe Account Link** (Onboarding-URL) für den Connect-Account, speichert `orgs.stripe_connect_id` (UNIQUE, `DATABASE_MODEL.md` §4.1) nach Account-Erstellung, Audit `billing.connect_onboard_started`.
- **Feature-Gate vor Onboarding:** Nur Plan `pro`/`individuell` mit `stripe_connect_payout`-Entitlement (`PLANS_AND_LIMITS.md` §3.3) erreichen den Onboarding-CTA. Plan `< pro` → Lock-Karte mit Upgrade-Pfad statt aktivem Onboarding (Pfeiler 4).
- **`charges_enabled` / `payouts_enabled`** werden über den `account.updated`-Webhook (§6.3) gepflegt und sind Teil des **Eligibility-Gates** (`SB_BEZAHLUNG_USP.md` §2.1): ohne grünes Connect-Onboarding **keine** SB-Zahlung möglich — die Bezahlseite zeigt „Auszahlungskonto verbinden" statt eines toten Buttons.

### 3.4 — Refunds & Gebühren-Rückerstattung

Refund über die ursprüngliche Charge; `application_fee` wird **konfigurierbar** mit-erstattet (Default: anteilige Gebühren-Rückerstattung bei Vollerstattung) — Owner-Parameter, nie hartkodierte Geschäftslogik (`SB_BEZAHLUNG_USP.md` §4.3). Auslöser: `POST /functions/v1/sb/refund` (Erzeuger auszahlungsberechtigt + MFA / Staff), `reason` Pflicht; den **Status** setzt der Webhook bei `charge.refunded` (§6.3).

---

## 4 · Zahlungsarten: Karte & SEPA

Aktivieren unter **Dashboard → Settings → Payment methods** (für das Plattform-Konto; Connect-Accounts erben die Plattform-Methoden bzw. Stripe steuert die Verfügbarkeit am Standort).

| Methode | Geldfluss A (Abo) | Geldfluss B (SB-Stand) | Hinweis |
|---|---|---|---|
| **Karte** (Visa/Mastercard, 3DS/SCA) | ✓ | ✓ | Standard; SCA/3DS automatisch über Payment Element/Checkout. |
| **SEPA-Lastschrift** (`sepa_debit`) | ✓ (gut für Abo) | ✓ (asynchron) | **Wichtig:** SEPA ist **asynchron** → `payment_status = 'processing'`, Erfolg erst per Webhook (Tage später). Quittung/Einnahme erst bei `payment_intent.succeeded` (nie „auf Verdacht", `SB_BEZAHLUNG_USP.md` §4.2/§5.1). |
| **Apple Pay / Google Pay** | — | ✓ (empfohlen am Stand) | Schneller Spontankauf am SB-Stand. Apple-Pay-Domain-Verifizierung für die Cloudflare-Pages-Domain hinterlegen. |
| **Klarna/Sofort/sonstige** | optional | optional | Owner-Entscheidung; standardmäßig **aus** (Friktion/Abwicklung). |

- **Asynchrone Methoden (SEPA):** Die fachliche State-Machine deckt `processing` ab (`SB_BEZAHLUNG_USP.md` §4.2). Die Bezahlseite zeigt „Zahlung in Bearbeitung — Quittung folgt nach Bestätigung", nicht „bezahlt". Am unbemannten SB-Stand ist **Karte/Wallet** der Default-Pfad (sofortige Bestätigung, weniger Schwund-Risiko); SEPA bleibt für das Abo die kostengünstige Option.
- **Payment Element** (nicht eigene Kartenfelder) → SAQ-A bleibt erhalten.

---

## 5 · Umgebungsvariablen (Secrets) — wohin gehört was

> **Harte Regel (`CLAUDE.md`/`AGENTS.md`):** **service-role-/Secret-Keys nur in Supabase Edge Functions**, **nie** im Frontend. Das Frontend kennt ausschließlich `VITE_`-Public-Keys. Secrets **nie** in Code/Log/Repo — nur Supabase Edge Function Secrets bzw. Cloudflare-Pages-Env. `.env`-Dateien sind **gitignored** und nie Teil des Release-Artefakts (`PHASEN.md` Phase 2).

### 5.1 — Supabase Edge Function Secrets (Server — geheim)

Setzen via `supabase secrets set KEY=…` (oder Supabase-Dashboard → Edge Functions → Secrets). **Niemals** mit `VITE_` prefixen.

| Secret | Pflicht für | Beschreibung |
|---|---|---|
| `STRIPE_SECRET_KEY` | A + B | Geheimer API-Key (`sk_test_…` / `sk_live_…`). Nur Server. |
| `STRIPE_WEBHOOK_SECRET` | Webhook (Abo + Connect-Plattform-Events) | Signing-Secret (`whsec_…`) des Plattform-Webhook-Endpunkts (§6.1). Ohne ihn lehnt der Handler ab. |
| `STRIPE_WEBHOOK_SECRET_CONNECT` | Webhook (Connect-Account-Events) | Signing-Secret des **Connect**-Webhook-Endpunkts (separater Endpunkt für `account.updated` u. a., §6.1). Nur falls getrennter Endpunkt genutzt wird. |
| `STRIPE_PRICE_BASIS` | A | `price`-ID des Basis-Abos (§2.1). |
| `STRIPE_PRICE_PLUS` | A | `price`-ID des Plus-Abos. |
| `STRIPE_PRICE_PRO` | A | `price`-ID des Pro-Abos (inkl. SB-Bezahlung). |
| `STRIPE_PRICE_INDIVIDUELL` | A (optional) | `price`-ID Individuell (meist manuell/Invoice). |
| `SB_QR_HMAC_SECRET` | B | Server-Secret zur HMAC-Signierung/Verifikation der SB-QR-Deep-Links (`SB_BEZAHLUNG_USP.md` §3/§8). Nur Server. |
| `APP_BASE_URL` | A + B | Basis-URL der App (z. B. `https://app.lokalebauernconnect.de`) für Checkout-Redirects, Account-Links, Quittungs-/Bestätigungs-URLs. |
| `STRIPE_CHECKOUT_SUCCESS_PATH` | A (optional) | Default `/app/billing?status=success&session_id={CHECKOUT_SESSION_ID}`. |
| `STRIPE_CHECKOUT_CANCEL_PATH` | A (optional) | Default `/app/billing?status=cancelled`. |

> `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` sind in Edge Functions ohnehin verfügbar (Plattform-injiziert) und gehören **ausschließlich** dorthin — sie umgehen RLS und dürfen die Funktion nie verlassen.

### 5.2 — Frontend (Cloudflare Pages Build-Env — öffentlich)

Nur Public-Keys, mit `VITE_`-Prefix (sonst nicht im Build sichtbar). Diese sind **per Definition öffentlich** — kein Geheimnis darf hier landen.

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | A + B | Öffentlicher Stripe-Key (`pk_test_…` / `pk_live_…`) zum Initialisieren von Stripe.js / Payment Element. |
| `VITE_SUPABASE_URL` | A + B | Supabase-Projekt-URL (öffentlich). |
| `VITE_SUPABASE_ANON_KEY` | A + B | Supabase anon-Key (öffentlich, RLS-geschützt). |
| `VITE_TURNSTILE_SITE_KEY` | B (öffentlicher SB-Flow) | Cloudflare-Turnstile-Site-Key für den öffentlichen `sb/initiate`-Flow. |

> **Verbots-Check (`security-auditor`):** Niemals `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SB_QR_HMAC_SECRET` oder den service-role-Key mit `VITE_` prefixen oder ins Frontend-Bundle ziehen. Ein Grep über das Build-Artefakt nach `sk_live`, `sk_test`, `whsec_`, `service_role` muss **leer** sein (Release-Gate, `PHASEN.md` Phase 2 Gate B).

### 5.3 — Beispiel `.env.local` (nur Test, gitignored, nie committen)

```env
# --- Frontend (öffentlich, VITE_) ---
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXX
VITE_SUPABASE_URL=https://<projektref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon, öffentlich)
VITE_TURNSTILE_SITE_KEY=0xAAAA...

# --- Edge Functions (geheim; via `supabase secrets set`, NICHT im Frontend) ---
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_YYYYYYYYYYYYYYYYYYYY
STRIPE_PRICE_BASIS=price_XXXXXXXXXXXX
STRIPE_PRICE_PLUS=price_XXXXXXXXXXXX
STRIPE_PRICE_PRO=price_XXXXXXXXXXXX
STRIPE_PRICE_INDIVIDUELL=price_XXXXXXXXXXXX
SB_QR_HMAC_SECRET=<32+ Byte Zufallsgeheimnis>
APP_BASE_URL=http://localhost:5409
```

---

## 6 · Webhook (idempotent, signiert) in einer Edge Function

> **Kanon-Regel (`CLAUDE.md` Backend-/Edge-Regeln · `AGENTS.md` harte Regel):** **EIN** signaturgeprüfter, **idempotenter** Handler ist die **einzige** Schreibquelle für Zahlungs-/Plan-Zustände. Entitlements/Pläne serverseitig. Frontend liest nur. (`SB_BEZAHLUNG_USP.md` §4.4 ist die Detailspezifikation des SB-Zweigs.)

### 6.1 — Endpunkte im Stripe-Dashboard anlegen (Developers → Webhooks)

| Endpunkt | URL (Supabase Edge Function) | Modus | Events |
|---|---|---|---|
| **Plattform-Webhook** | `https://<projektref>.supabase.co/functions/v1/stripe-webhook` | Account-Events | **Abo (A):** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` · **SB (B):** `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `refund.updated`, `charge.dispute.created` |
| **Connect-Webhook** | `https://<projektref>.supabase.co/functions/v1/stripe-webhook?scope=connect` (oder eigener Pfad) | **Connect**-Events | `account.updated` (→ `charges_enabled`/`payouts_enabled` für Eligibility-Gate) |

- Nach Anlegen das jeweilige **Signing-Secret** (`whsec_…`) als `STRIPE_WEBHOOK_SECRET` bzw. `STRIPE_WEBHOOK_SECRET_CONNECT` in die Edge-Function-Secrets setzen (§5.1).
- **Ein Handler, klare Verzweigung:** Die Edge Function `stripe-webhook` verifiziert die Signatur, dedupliziert, und routet per `event.type` in den Abo-Zweig (A) oder SB-Zweig (B). Connect-`account.updated` wird mit dem Connect-Secret verifiziert.

### 6.2 — Verarbeitungsreihenfolge (verbindlich, beide Zweige)

```
POST /functions/v1/stripe-webhook
  1. Body als RAW lesen (kein JSON-Parse vor Signaturprüfung!)
  2. Signatur prüfen: stripe.webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET)
        → ungültig  →  400, KEIN State-Change, audit billing.webhook_bad_signature
  3. Idempotenz/Replay-Guard:
        INSERT INTO stripe_events(event_id) VALUES (event.id)  -- UNIQUE
        → Konflikt (schon gesehen)  →  200 no-op (kein zweiter Effekt)
  4. Routing nach event.type:
        A) Abo-Events    → §6.3 A
        B) SB-Events     → §6.3 B   (+ Betrag/Currency-Abgleich gegen sb_payments)
        C) account.updated → §6.3 C (Connect-Eligibility)
  5. Effekt + Audit transaktional koppeln
  6. Antwort:
        200  bei vollständig verarbeitet ODER dedupliziert
        5xx  bei transientem DB-Fehler  →  Stripe retried (idempotent dank Schritt 3)
```

**Doppelte Idempotenz-Achse** (`SB_BEZAHLUNG_USP.md` §4.4): (a) Client → `sb/initiate` mit stabilem `idempotencyKey` (Stripe-`Idempotency-Key`-Header) verhindert Doppel-Intent bei Funkloch/Retry am Stand. (b) Stripe → Webhook über `event.id`-Dedup verhindert Doppelverbuchung. **Beide** sind Pflicht.

> **Dedup-Speicher:** `stripe_events(event_id TEXT PRIMARY KEY, type TEXT, received_at TIMESTAMPTZ DEFAULT now())` (Kategorie D, TTL-bereinigbar, `COMPLIANCE_MODEL.md` §1) **und** die fachlichen UNIQUE-Anker `UNIQUE(stripe_event_id)` + `UNIQUE(stripe_payment_intent_id)` auf `sb_payments` (`DATABASE_MODEL.md` §4.7). Zwei Achsen, beide additiv per Migration mit Rollback.

### 6.3 — Effekt je Event

**A) Erzeuger-Abo (Geldfluss A) — schreibt `orgs.plan` / `plan_valid_until` / `stripe_customer_id` (service role):**

| Event | Effekt | Audit |
|---|---|---|
| `checkout.session.completed` | `stripe_customer_id` + Abo verknüpfen; `price`-ID → Plan (`stripe-prices.ts`, §2.1) → `orgs.plan` setzen; `plan_valid_until` aus Perioden-Ende | `billing.subscription_started` |
| `customer.subscription.updated` | Plan-Wechsel/Erneuerung: `orgs.plan` + `plan_valid_until` neu setzen (Up-/Downgrade; Downgrade verliert nie Daten, `PLANS_AND_LIMITS.md` §0/§6.3) | `billing.subscription_updated` |
| `invoice.paid` | `plan_valid_until` verlängern; Org `status='active'` | `billing.invoice_paid` |
| `invoice.payment_failed` | Org `status='past_due'` (Grace-Period, `orgs.status`-CHECK) | `billing.invoice_failed` |
| `customer.subscription.deleted` | Plan auf **`demo`** zurücksetzen (Kündigung; öffentliche Listung erlischt — `farm_public_listing` gated) | `billing.subscription_cancelled` |

**B) SB-Bezahlung (Geldfluss B) — schreibt `sb_payments` (service role), nur nach Betrag/Currency-Abgleich:**

| Event | Zielzustand (`payment_status`) | Effekt | Audit |
|---|---|---|---|
| `payment_intent.succeeded` | `succeeded` | Betrag/Currency gegen `sb_payments` prüfen (Mismatch → **kein** `paid`, `audit sb_payment.amount_mismatch` + Alarm); `paid_at`; Quittung erzeugen (Storage, signierter Link, CMP-04); Dashboard-Einnahme buchen | `sb_payment.paid` |
| `payment_intent.payment_failed` / `payment_intent.canceled` | `failed` / `cancelled` | UI „erneut versuchen" (neuer Vorgang); kein Geldfluss | `sb_payment.failed` |
| `charge.refunded` / `refund.updated` | `refunded` | `refunded_at` + Betrag; Gutschrift-Beleg; Käufer-Benachrichtigung; Dashboard korrigieren | `sb_payment.refunded` (+ Betrag, `reason`) |
| `charge.dispute.created` | (Flag) | `sb_payments` „strittig" markieren; Staff-Eskalation; Beleg-/Quittungs-Spur als Nachweis | `sb_payment.disputed` |

**C) Connect (`account.updated`) — schreibt `orgs` (service role):**

| Event | Effekt | Audit |
|---|---|---|
| `account.updated` | `charges_enabled` / `payouts_enabled` aktualisieren (gecacht) → wirkt direkt auf das **Eligibility-Gate** (`SB_BEZAHLUNG_USP.md` §2.1) | `billing.connect_account_updated` |

### 6.4 — Pflichten der Edge Function (`AGENTS.md` `edge-functions-spezialist`)

- **RAW-Body vor Signaturprüfung** (kein vorzeitiges JSON-Parsing — sonst bricht die HMAC-Verifikation).
- **service role nur hier**; nie an den Client.
- **Secrets nur aus Env** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`[`_CONNECT`]) — nie loggen. Logs strukturiert, ohne Secrets/PAN.
- **`200` no-op bei Replay**, `5xx` nur bei transienten Fehlern (Stripe-Retry erwünscht), `400` bei Signaturfehler.
- **Zero-State/Defensive:** unbekanntes Event → `200` + `audit billing.webhook_unhandled` (kein Crash). Unbekannte `price`-ID → kein Plan-Wechsel + Alarm (§2.1).

---

## 7 · Erzeuger-Abo-Flow (Geldfluss A) — Checkout & Billing-Portal

1. **Plan wählen** in der App (`/app/billing`, Erzeuger `org_owner`). Surface-Lock spiegelt nur — die Wahrheit ist `orgs.plan` + `plan_entitlements` aus `bootstrap` (`PLANS_AND_LIMITS.md` §5).
2. **`POST /functions/v1/billing-checkout`** (Edge, Auth Erzeuger): erstellt eine **Stripe Checkout Session** (`mode: 'subscription'`) mit der `price`-ID aus Env (§2.1), `customer`/`customer_email` (legt `stripe_customer_id` an/verknüpft), `success_url`/`cancel_url` aus `APP_BASE_URL` + Pfaden (§5.1). Antwort `{ url }` → Frontend leitet weiter. **Keine** Secrets/Beträge aus dem Client.
3. **Nach Zahlung:** Stripe redirectet auf `success_url`; **gleichzeitig** trifft `checkout.session.completed` am Webhook ein → Plan wird gesetzt (§6.3 A). Die UI zeigt erst nach **Server-Bestätigung** (erneuter `bootstrap`) den neuen Plan — nie clientseitig.
4. **Plan verwalten / kündigen:** **`POST /functions/v1/billing-portal`** erzeugt einen **Stripe-Billing-Portal**-Link (Zahlungsmittel ändern, kündigen, Rechnungen). Kündigung/Änderung kommen als Webhook zurück (§6.3 A) — Single Source of Truth.

> **Plan-Hoheit:** Kein clientseitiger Plan-Wechsel. `orgs.plan` ändert **ausschließlich** der Webhook (`PLANS_AND_LIMITS.md` §0). Preisänderung = neue `price`-ID + Env-Update = Owner-Aktion (Confirm + Reason + Audit), kein Codedeploy.

---

## 8 · SB-Bezahl-Flow (Geldfluss B) — Kurz-Verdrahtung

Vollständig in `SB_BEZAHLUNG_USP.md` §4/§11. Stripe-seitige Einrichtungs-Essenz:

1. **`POST /functions/v1/sb/initiate`** (öffentlich + Turnstile): Zod · `sig`-HMAC prüfen · **Eligibility-Gate** (verifiziert + Connect `charges_enabled`/`payouts_enabled`) · Betrag **serverseitig** aus `products.price_cents × qty` · `platform_fee_cents` serverseitig (§9) · **PaymentIntent** (Connect Destination Charge, `transfer_data.destination = orgs.stripe_connect_id`, `application_fee_amount = platform_fee_cents`, `metadata`, Stripe-`Idempotency-Key` = client-`idempotencyKey`) · `sb_payments` `pending` anlegen · Audit · Antwort `{ clientSecret, sbPaymentId }`.
2. **Browser:** **Stripe Payment Element** (Karte/Wallet/SEPA) — Kartendaten direkt an Stripe (SAQ-A).
3. **Webhook** `stripe-webhook` (§6.3 B) ist die einzige Wahrheit für `succeeded/failed/refunded`; Quittung nur bei `succeeded`.
4. **Quittung** (CMP-04): Hof als Leistungserbringer + Vermittler-Hinweis, signierter ablaufender Storage-Link (`SB_BEZAHLUNG_USP.md` §5.1).

---

## 9 · Gebühren (Plattform-Ertrag) — serverseitig, nie aus dem Client

Quelle der Wahrheit: `PLANS_AND_LIMITS.md` §4. Hier zur Stripe-Verdrahtung gespiegelt (nicht neu definiert):

| Plan | SB-Plattformgebühr je Transaktion | Berechnung (`platform_fee_cents`) | Stripe-Übergabe |
|---|---|---|---|
| `pro` | **1,9 % + 0,25 €** | `round(amount_cents × 0.019) + 25` | `application_fee_amount` am PaymentIntent |
| `individuell` | **1,4 % + 0,25 €** (bevorzugt) | `round(amount_cents × 0.014) + 25` | `application_fee_amount` am PaymentIntent |
| `demo`/`basis`/`plus` | n/a (`sb_payment`-Gate = false) | kein Intent erzeugbar → `403 plan_limit` | — |

- **Werte nicht hartkodiert in der UI:** Prozentsatz/Fixbetrag stehen in **einer** serverseitigen Gebühren-Konfig (Edge-Function-Konstante / `plan_entitlements`), Owner-parametrierbar (`PLANS_AND_LIMITS.md` §4.2 „Anti-Tampering", `SB_BEZAHLUNG_USP.md` §7). Default-Erhebungsweg: `application_fee` aus **Hof-Netto** (käuferfreundlich; Owner-Entscheidung SB-01).
- **Stripe-Processing-Gebühr** trägt der Hof (Connect-Netto), transparent im Dashboard als separater Posten (kein Plattform-Ertrag).
- **Transparenz:** Quittung weist „Servicegebühr LokaleBauernConnect" aus, Erzeuger als Leistungserbringer (CMP-04).

---

## 10 · Lokal testen (Test-Modus + Stripe CLI)

> **Niemals** Live-Keys lokal/in Tests. Test-Modus = `sk_test_…`/`pk_test_…`. **Kein** echter Geldfluss in Tests (`SB_BEZAHLUNG_USP.md` §12).

### 10.1 — Webhook lokal forwarden

```bash
# Stripe CLI installieren + einloggen
stripe login

# Account-Events (Abo A + SB B) an die lokale/Supabase-Edge-Function forwarden
stripe listen --forward-to https://<projektref>.supabase.co/functions/v1/stripe-webhook

# Connect-Account-Events separat (account.updated)
stripe listen --latest --events account.updated \
  --forward-connect-to "https://<projektref>.supabase.co/functions/v1/stripe-webhook?scope=connect"
```

`stripe listen` gibt ein temporäres `whsec_…` aus → für die lokale Session als `STRIPE_WEBHOOK_SECRET` setzen (überschreibt nicht das Live-Secret; nur für diese Session).

### 10.2 — Events simulieren

```bash
# Abo (A)
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted

# SB-Bezahlung (B)
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded

# Connect (C)
stripe trigger account.updated
```

### 10.3 — Test-Karten & Test-Connect

- **Erfolg:** `4242 4242 4242 4242` · **3DS/SCA-Pflicht:** `4000 0027 6000 3184` · **Ablehnung:** `4000 0000 0000 0002` · weitere: `stripe.com/docs/testing`.
- **SEPA-Test:** Test-IBAN `DE89370400440532013000` → bewusst **asynchron** (`processing` → später `succeeded`) — validiert §4-Verhalten.
- **Test-Connect-Account:** Express-Onboarding im Test-Modus mit Stripes Test-Daten durchlaufen; `charges_enabled`/`payouts_enabled` kommen via `account.updated`.

### 10.4 — Akzeptanz lokal (Auszug der Pflicht-Tests, `SB_BEZAHLUNG_USP.md` §12)

- Happy-Path (T1) · Webhook-Replay = ein State-Change, zweiter `200` no-op (T6) · Client-Retry = ein Intent (T7) · Betrags-Tampering → Server rechnet aus DB, Webhook-Abgleich (T8) · Eligibility-Gate blockt (T9) · falsche Webhook-Signatur → `400` (T5) · Cross-Org → 0 Zeilen/`403` (T3) · Refund ohne `reason`/MFA → `422`/`403` (T4) · Zero-State-Dashboard (T11).

---

## 11 · Test → Live (Promotion-Checkliste)

> **Go-Live ist eine Owner-Aktion** (`CLAUDE.md`: Deploy/Go-Live/Kosten/Account vorab in Klartext ankündigen, erst auf OK). Diese Checkliste ist die technische Vorbedingung.

| # | Schritt | Verantwortlich |
|---|---|---|
| 1 | Stripe-Account **aktiviert** (Geschäftsdaten/Verifizierung) + Connect freigeschaltet | Owner |
| 2 | **Live**-Produkte/Preise (§2.1) angelegt; Live-`price`-IDs notiert | Owner |
| 3 | **Live**-Secrets gesetzt: `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_PRICE_*=price_…` (live), `SB_QR_HMAC_SECRET` (eigenes Live-Geheimnis) — als Edge-Function-Secrets | Owner |
| 4 | **Live**-Webhook-Endpunkte (Plattform + Connect) im **Live**-Dashboard angelegt; `STRIPE_WEBHOOK_SECRET`[`_CONNECT`] = Live-`whsec_…` gesetzt | Owner |
| 5 | `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_…` in Cloudflare-Pages-**Production**-Env; Test-Key nur in Preview | Claude/Owner |
| 6 | **Apple-Pay-Domain** für die Live-Pages-Domain verifiziert (falls Wallet aktiv) | Owner |
| 7 | **Secret-Leak-Gate:** Grep über Live-Build nach `sk_live`/`sk_test`/`whsec_`/`service_role` = leer (`security-auditor`, Phase 2 Gate B) | Claude |
| 8 | **CSP** `connect-src` enthält Stripe (`api.stripe.com`, `js.stripe.com`) + Supabase; Payment Element lädt sauber (`SB_BEZAHLUNG_USP.md` §8) | Claude |
| 9 | **Smoke-Test Live (Kleinstbetrag):** eine echte SB-Zahlung (z. B. 1 €) am Test-Stand → `succeeded` via Webhook → Quittung → Connect-Transfer sichtbar → danach **Refund** (Geld zurück) | Owner |
| 10 | **Abo-Smoke:** Test-Checkout im Live-Billing-Portal eines internen Erzeugers → Plan gesetzt via Webhook → Kündigung → `demo` | Owner |
| 11 | **DPA/Subprozessor** (Stripe) in `COMPLIANCE_MODEL.md` §7 + Datenschutzerklärung gelistet; CMP-04-Quittungstext final | Compliance |
| 12 | **Aufsichtsrechtliche Einordnung** (SB-03) + Pricing (SB-01) Owner-bestätigt | Owner/extern |

> **Rollback:** Live-Keys können jederzeit rotiert werden (§12). Bei Problemen → `STRIPE_SECRET_KEY` rotieren / Webhook-Endpunkt deaktivieren / Feature-Flag `sb_payment` org-/global aussetzen (kein toter Button: Bezahlseite fällt auf Sperr-Hinweis zurück).

---

## 12 · Schlüssel-/Secret-Rotation & Betrieb

- **Key-Rotation:** API-Keys im Stripe-Dashboard rollen; neues Secret zuerst als Edge-Function-Secret setzen, dann altes widerrufen (kurzes Overlap-Fenster). Webhook-Signing-Secret pro Endpunkt rollbar. (Querbezug: `docs/security/SECRET_ROTATION.md`, geplant.)
- **Leak-Reaktion:** Exponierten Key **sofort** im Dashboard widerrufen, rotieren, Audit prüfen, ggf. Stripe-Support. Secrets erscheinen **nie** in Logs (Pflicht-Review `security-auditor`).
- **Monitoring:** Webhook-Zustellfehler im Stripe-Dashboard beobachten; `5xx`-Quote der Edge Function überwachen (Stripe-Retry deckt transiente Fehler, anhaltende `5xx` = Incident). Disputes/Refund-Quote im Erzeuger-Dashboard + Staff-Sicht (`SB_BEZAHLUNG_USP.md` §6).
- **Aufbewahrung:** `sb_payments`/Belege = Kategorie C (HGB §257/AO §147, 10 Jahre) — nicht löschbar während der Frist (`COMPLIANCE_MODEL.md` §1/§4). `stripe_events`-Dedup = Kategorie D (TTL-bereinigbar).

---

## 13 · Owner-Aufgaben (Quick-Checkliste — Keys & Konto)

> Was **nur der Owner** tun kann (Account/Geld/Live = Owner-Entscheidung, `CLAUDE.md`). Claude verdrahtet alles Übrige (Edge Functions, Migration, Frontend, Tests) gegen diese Werte.

**Einmalig (Account):**
- [ ] Stripe-Account (DE/EUR) anlegen + Geschäftsdaten verifizieren.
- [ ] **Stripe Connect** aktivieren, Connect-Branding/Support-Infos ausfüllen, Variante festlegen (SB-02: Default Express).
- [ ] DPA mit Stripe abschließen; Subprozessor in Datenschutzerklärung/`COMPLIANCE_MODEL.md` §7 aufnehmen.

**Test-Modus (zum Bauen/Testen):**
- [ ] Test-`price`-Objekte (`basis`/`plus`/`pro`[/`individuell`]) anlegen → IDs an Claude für `STRIPE_PRICE_*`.
- [ ] Test-Keys an Claude: `pk_test_…` (→ `VITE_STRIPE_PUBLISHABLE_KEY` Preview-Env), `sk_test_…` (→ Edge-Secret).
- [ ] Test-Webhook-Endpunkte (Plattform + Connect) anlegen → `whsec_…` an Claude.

**Live (Go-Live, nach grüner Checkliste §11):**
- [ ] Live-`price`-Objekte anlegen → IDs für `STRIPE_PRICE_*` (live).
- [ ] Live-Keys setzen: `sk_live_…` (Edge-Secret), `pk_live_…` (Pages-Production-Env).
- [ ] Live-Webhook-Endpunkte (Plattform + Connect) anlegen → `whsec_…` (live) als Edge-Secrets.
- [ ] Apple-Pay-Domain verifizieren (falls Wallet aktiv).
- [ ] **Pricing** (SB-01) + **aufsichtsrechtliche Einordnung** (SB-03) bestätigen.
- [ ] Live-Smoke (SB-Kleinstbetrag + Refund · Abo-Checkout + Kündigung) freigeben.

**Pflege/Notfall:**
- [ ] Key-Rotation nach Plan/`SECRET_ROTATION.md`; bei Leak sofort widerrufen + rotieren.
- [ ] Disputes/Refund-Quote + Webhook-Zustellung regelmäßig prüfen.

---

## 14 · Abgleich mit den 7 Produktionspfeilern

| Pfeiler | Beleg in dieser Einrichtung |
|---|---|
| 1 Org-Boundary | `orgs.stripe_customer_id`/`stripe_connect_id` org-gebunden (UNIQUE); `sb_payments.org_id` + RLS; Webhook schreibt service-role-gescoped auf die korrekte Org via `metadata`/Customer-Lookup |
| 2 Zero-State | Unbehandeltes/dupliziertes Event → `200` no-op, kein `500`; fehlendes Connect → Sperr-Hinweis statt totem Button; SEPA `processing` sauber dargestellt |
| 3 Scope-Transparenz | Quittung/Dashboard tragen Stand/Zeitraum/Org; Gebühr transparent ausgewiesen (CMP-04) |
| 4 RBAC | Abo-Checkout/Portal nur Erzeuger `org_owner`; Connect-Onboarding + Refund MFA-pflichtig; SB-Gate nur `pro`/`individuell`; Plan-Lock mit Upgrade-Pfad |
| 5 Audit | `billing.*` + `sb_payment.*` append-only; `reason` Pflicht bei Refund; Betrags-Mismatch/Bad-Signature/Unknown-Price alarmieren |
| 6 Testpflicht | §10.4 + `SB_BEZAHLUNG_USP.md` §12 (T1–T14): Signatur, Replay, Idempotenz, Tampering, Eligibility, Cross-Org, Zero-State, Dispute |
| 7 Drilldown-Integrität | QR-Deep-Links HMAC-signiert; Checkout/Portal/Quittungs-Links signiert/ablaufend; nie org-fremde URL; Redirects aus `APP_BASE_URL` (keine offene Redirect-Lücke) |

---

*Letzte Aktualisierung: WAVE_09 (Billing) / Phase 4 Track A (SB-Bezahlung) · 2026-06-19*
*Zuständig: Payment (Claude) · Subagenten: `payment-engineer` · `edge-functions-spezialist` · `security-auditor` · `compliance-officer` · Freigabe: Owner (Stripe-Account/Connect/Live-Keys/Pricing/Go-Live).*
*Querverweise: `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (Flow/Tests) · `docs/product/PLANS_AND_LIMITS.md` (Pläne/Gebühren/Entitlements) · `docs/DATABASE_MODEL.md` §4.1/§4.7/§2 · `docs/COMPLIANCE_MODEL.md` §0/§7/§9 (CMP-04) · `PHASEN.md` WAVE_09 / Phase 4 Track A.*
*Hinweis: Technisch-organisatorische Einrichtungsanleitung, keine Rechts-/Steuerberatung. Pricing (SB-01) und aufsichtsrechtliche Einordnung (SB-03) sind Owner-/extern vor Go-Live zu bestätigen.*
