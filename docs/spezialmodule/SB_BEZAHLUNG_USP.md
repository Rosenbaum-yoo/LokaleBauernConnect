# SB_BEZAHLUNG_USP — Sichere bargeldlose Bezahlung an unbemannten Selbstbedienungs-Hofläden ⭐

> **Das Alleinstellungsmerkmal von LokaleBauernConnect.** Viele Hofläden sind unbesetzt und arbeiten mit einer Vertrauenskasse — das verursacht **Schwund**, **Bargeld-Handling-Aufwand** und **Käufer-Friktion** („kein passendes Kleingeld"). Diese Spezifikation definiert die Lösung: **QR am SB-Stand → Stripe-Zahlung → Quittung**, mit Geldfluss direkt an den Hof (Stripe Connect), idempotentem Webhook als Wahrheit, Erzeuger-Dashboard für Einnahmen/Schwund, Anti-Betrugs-Maßnahmen und durchgängigem Vermittler-Disclaimer.
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Vermittler-Grundsatz (nicht verhandelbar):** Die Plattform ist **Zahlungsanbindung/Vermittler**, **nicht** Verkäufer. Geld fließt über **Stripe Connect** auf das Konto des **Hofes**; die Plattform behält ausschließlich eine konfigurierte **Transaktionsgebühr**. Vertragspartner des Käufers ist stets der Erzeuger. Gewährleistung/Reklamation richten sich an den Hof. Die Quittung weist den **Hof als Leistungserbringer** und die Plattform als Vermittler aus.
>
> **Bezug:** `PHASEN.md` (Phase 4 Track A · WAVE_09 Vorbereitung) · `CLAUDE.md` (7 Produktionspfeiler · §USP · Webhook-Regel) · `AGENTS.md` (`payment-engineer` + `edge-functions-spezialist` + `security-auditor`) · `docs/DATABASE_MODEL.md` (§4.7 `sb_payments`, §2 `payment_status`, §7 RLS) · `docs/CORE_BUSINESS_STATE_MACHINES.md` (§4 SB-Zahlung, §3 Hof-Verifizierung) · `docs/COMPLIANCE_MODEL.md` (§6/§7/§9, CMP-04) · `docs/ROLE_AND_PERMISSION_MODEL.md` · `docs/security/TENANT_ISOLATION_MODEL.md`.
>
> **Status:** Normativ (Ziel-Spezifikation für **Phase 4 Track A** — PaymentIntent + Stripe Connect + Gebühr + Quittungs-PDF). Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.
> **Stand:** 2026-06-19 · Zuständig: Payment (Claude) · Subagenten: `payment-engineer` · `edge-functions-spezialist` · `security-auditor` · Freigabe: Owner (Stripe-Account/Connect/Kosten/Go-Live).
>
> **Ist-Stand (implementiert, weicht von der Ziel-Architektur unten ab):** Der Live-Flow nutzt **Stripe Checkout (gehostet)**, **nicht** PaymentIntent/Payment Element und **noch kein Connect/keine Gebühr**.
> - **Route:** `/stand/:farmId` (`app/src/pages/StandPayPage.tsx`) — Korb füllen, optionale E-Mail, „Jetzt sicher bezahlen". (Die unten beschriebene Route `/sb/:farmSlug` ist Ziel-Design.)
> - **Edge Functions:** `create-checkout` (Modi `sb_payment`, `sb_basket`, `subscription`) und `stripe-webhook` — **nicht** `sb/initiate`/`sb/webhook`/`sb/refund` etc. (Ziel-Design). Betrag serverseitig aus `products.price`; `sb_payments`-Zeile mit Status `initiated` vor Checkout.
> - **Webhook:** verarbeitet `checkout.session.completed` (→ `sb_payments.status='paid'`, Audit `sb_payment.paid`, **Quittung per E-Mail** via `renderReceipt`/`sendEmail`) und `customer.subscription.updated/deleted`. **Nicht** `payment_intent.succeeded`/`charge.refunded`/`account.updated`.
> - **Idempotenz:** über Tabelle `payment_events` (`id`=Stripe-`event.id` als PK), **nicht** `UNIQUE(stripe_event_id)` auf `sb_payments`.
> - **Noch nicht gebaut:** Stripe Connect (Destination Charge/`application_fee`), `platform_fee_cents`, Plan-Gate, Eligibility-Gate, HMAC-signierte QR, Refund-/Dashboard-Endpunkte, Quittungs-PDF im Storage. Alles unten ab §2 ist **Ziel-Spezifikation** für den Ausbau.

---

## 0 · Warum dieser USP gewinnt (Wert & Marktlogik)

| Schmerz heute (Vertrauenskasse) | Lösung mit SB-Bezahlung | Wert |
|---|---|---|
| **Schwund/Diebstahl** — entnommene Ware ohne Bezahlung | Bezahlung vor Entnahme, digital nachverfolgbar; Schwund-Indikator im Dashboard | Direkter Umsatzschutz für den Erzeuger |
| **Bargeld-Handling** — Kasse leeren, Wechselgeld, Falschgeld, Tresor | Bargeldlos, Auszahlung automatisch via Stripe Connect aufs Hof-Konto | Zeitersparnis, weniger Risiko |
| **Käufer-Friktion** — „kein Kleingeld", kein Vertrauen in fremde Kasse | Scannen → bezahlen → Quittung in < 30 s, vertraute Stripe-UI | Höhere Conversion, mehr Spontankäufe |
| **Keine Belege** — keine Quittung, kein Nachweis | Automatische Quittung (Käufer) + Beleg im Dashboard (Erzeuger) | Steuer-/Streitfall-Sicherheit |
| **Keine Daten** — Erzeuger weiß nicht, was wann verkauft wird | Einnahmen-/Produkt-/Zeit-Auswertung im Erzeuger-Dashboard | Bessere Bestückung/Saisonplanung |

**Monetarisierung (Owner-Wert, §0-Direktive 3):** kleine, serverseitig konfigurierte **Transaktionsgebühr** je erfolgreicher SB-Zahlung (`platform_fee_cents`, §7). Skaliert linear mit dem Transaktionsvolumen über alle Höfe — ein wiederkehrender, nutzungsbasierter Geldfluss **zusätzlich** zum Erzeuger-Abo (`PHASEN.md` WAVE_09). Das Muster ist **imperiumsweit wiederverwendbar** (jede ConnectCore-Tochter mit physischem Abverkauf am unbemannten Punkt).

> **Abgrenzung zur Reservierung (`docs/CORE_BUSINESS_STATE_MACHINES.md` §1):** Reservierung ist eine unverbindliche **Vorbestellung ohne Zahlung**. SB-Bezahlung ist eine **eigenständige Zahlung am Stand** — mit oder ohne vorherige Reservierung (Spontankauf möglich). Beide Vorgänge sind sauber getrennt; optionale Kopplung über `reservation_id` (§5.6).

---

## 1 · End-to-End-Überblick (kein toter Pfad)

```
 ERZEUGER (einmalig)                          KÄUFER (am SB-Stand)                 SYSTEM (Server/Stripe)
 ──────────────────                           ────────────────────                ──────────────────────
 Hof verifiziert (§Verifizierung) ┐
 Stripe-Connect-Onboarding ok     ├─► SB-eligible ──► QR generiert/gedruckt
 SB-Stand aktiviert (is_self_service)┘                 (Hof / Produkt / Stand)
                                                            │ scannt
                                                            ▼
                                              Bezahlseite (Cloudflare Pages,
                                              /sb/:farmSlug?stand=…&p=…)
                                                            │ Betrag/Warenkorb
                                                            ▼
                                              POST initiate ──────────────────► Edge Function (Deno, service role)
                                                            │                    · Zod-Validierung · Turnstile
                                                            │                    · Eligibility-Gate (verified+Connect)
                                                            │                    · Betrag serverseitig bestimmt
                                                            │                    · PaymentIntent (Connect, fee)
                                                            ◄──── client_secret ─┤  · sb_payments=initiated · Audit
                                              Stripe Payment Element (PCI: SAQ-A)
                                                            │ bezahlt
                                                            ▼
                                              Warte-/Bestätigungs-Zustand ◄───── Stripe Webhook ──► Edge Function
                                                            │                    payment_intent.succeeded
                                                            │                    · Signatur · Idempotenz
                                                            ▼                    · sb_payments=paid · Quittung · Audit
                                              Quittung (signierter Link) ◄────── Storage (PDF, EU)
                                                                                  Dashboard-Einnahme gebucht
```

Jeder Knoten ist **real verdrahtet** (Endpoint → Fetch → DOM → Lade/Leer/Fehler → Handler). Es gibt keinen „Bezahlen"-Button ohne erreichbaren Intent, keine Quittung „auf Verdacht", keinen Status, der clientseitig gesetzt wird.

---

## 2 · Akteure, Rollen & Vorbedingungen

| Akteur | Rolle im Flow | Quelle der Berechtigung |
|---|---|---|
| **Käufer** | Scannt QR, zahlt, erhält Quittung. **Auth nicht nötig** (anonymer Spontankauf am Stand erlaubt) | Öffentlicher Flow + Turnstile + Rate-Limit; optional eingeloggt (`buyer_id`) |
| **Erzeuger** (`erzeuger`) | Aktiviert SB am Stand, generiert QR, sieht Einnahmen/Schwund, löst Erstattung aus | RLS: nur eigene Org-Höfe (`owns_farm`); Auszahlungsberechtigte mit **MFA-Pflicht** |
| **Staff/Owner** | Support-/Ops-Einsicht, Erstattung im Eskalationsfall, Eligibility-Übersteuerung | Plattform-Org, jede Aktion mit `reason` + Audit (`docs/ROLE_AND_PERMISSION_MODEL.md`) |
| **Stripe** | Zahlungsabwicklung + Connect-Auszahlung; **eigener Verantwortlicher** für Zahlungsdaten | `docs/COMPLIANCE_MODEL.md` §0/§7 (Subprozessor) |
| **System (Edge/Webhook)** | Setzt Status, schreibt Audit, erzeugt Quittung; **service role nur hier** | Signaturgeprüfter, idempotenter Webhook-Handler |

### 2.1 — Eligibility-Gate (Pflicht, kein toter Bezahl-Flow)

Eine SB-Zahlung kann **nur** initiiert werden, wenn **alle** Bedingungen erfüllt sind (`docs/CORE_BUSINESS_STATE_MACHINES.md` §4.4):

1. **Hof verifiziert** — `farms.status = 'published'` **und** `verified_at IS NOT NULL` (Staff-Verifizierung, schützt vor Fake-Höfen/Phishing-QRs).
2. **SB aktiviert** — `farms.is_self_service = true` (Erzeuger hat den Stand bewusst als SB-fähig markiert).
3. **Stripe-Connect bereit** — `orgs.stripe_connect_id IS NOT NULL` **und** Connect-`charges_enabled` + `payouts_enabled` (serverseitig aus Stripe geprüft/gecacht). Ohne aktives Onboarding **keine** Belastung möglich.
4. **Betrag/Währung gültig** — Betrag `> 0`, Währung `EUR`.

Fehlt eine Bedingung → die Bezahlseite zeigt einen **klaren Sperr-Hinweis** („An diesem Stand ist die digitale Bezahlung noch nicht freigeschaltet") statt eines toten Buttons; **kein** PaymentIntent wird erstellt (`403`/Guard). Verifizierung ist **notwendig, nicht hinreichend** — beide Gates (Verifizierung **und** Connect) müssen grün sein.

---

## 3 · QR-Codes je Hof / Produkt / Stand

Der QR ist der Einstieg in den Flow. Er ist **kein Geheimnis** und enthält **keinen Betrag und keine Zahlungsdaten** — er ist nur ein signierter Deep-Link zur Bezahlseite. Manipulationsschutz liegt **serverseitig** (Eligibility, Betragsbestimmung), nicht im QR.

### 3.1 — Drei QR-Granularitäten

| Granularität | Deep-Link (Cloudflare Pages) | Käufer erfasst | Einsatz |
|---|---|---|---|
| **Hof/Stand** (Default) | `/sb/:farmSlug?stand=<standCode>` | Wählt Produkte + Mengen selbst (Warenkorb) | Genereller SB-Stand-Sticker an der Kasse/am Eingang |
| **Produkt** | `/sb/:farmSlug?stand=<standCode>&p=:productId` | Menge des vorgewählten Produkts | QR am einzelnen Regal/Korb („Eier 6er") |
| **Festbetrag/Spende** | `/sb/:farmSlug?stand=<standCode>&p=:productId&qty=:n` | Nur bestätigen | Mono-Produkt-Stände (z. B. Blumenstrauß zum Festpreis) |

- **`standCode`** = pro Hof eindeutiger, kurzer Code (z. B. `haupt`, `feld-nord`) — erlaubt **mehrere Stände je Hof** (Datenmodell: `farms` 1:N Stände; bis Track A genügt ein Default-Stand `'haupt'`, additiv erweiterbar). Der Code dient der Zuordnung in Dashboard/Audit, nicht der Autorisierung.
- **Keine Preise im QR.** Preise/Beträge werden **immer** serverseitig aus `products.price_cents` (bzw. dem übergebenen Warenkorb gegen die DB) neu bestimmt. Ein im Link manipuliertes `qty` ändert nur die Menge, nie den Stückpreis — Betrags-Tampering ist damit wirkungslos (§5.3, §6).
- **Integrität des Links:** Der QR-Link trägt eine **HMAC-Signatur** (`&sig=…`, server-secret), damit gefälschte/umgeleitete QRs (Phishing-Sticker) erkannt werden: Die Bezahlseite verifiziert `sig` serverseitig vor `initiate`. Ungültige Signatur → Bezahlseite verweigert + Hinweis „QR konnte nicht verifiziert werden".

### 3.2 — QR-Erzeugung (Erzeuger-Self-Service)

- Endpoint `POST /functions/v1/sb/qr` (Auth: Erzeuger, `owns_farm`): erzeugt den signierten Deep-Link + rendert einen **druckfertigen QR** (SVG/PNG, in Supabase Storage, EU). Rückgabe enthält Link, QR-Bild-URL und einen **druckbaren Aushang** (DIN-A-Vorlage mit Hofname, Hinweis „Hier digital & bargeldlos bezahlen", Vermittler-/Quittungs-Hinweis, Editorial-Stil, keine Deko-Emojis).
- **Rotation/Sperre:** Ein Stand-/Produkt-QR kann **rotiert** (neue `sig`, alte ungültig) oder **gesperrt** werden (z. B. Stand-Diebstahl, verlorener Aushang) — auditiert (`sb_payment.qr_rotated` / `sb_payment.qr_revoked`). Gesperrte QRs führen zur Sperr-Seite.
- **Zero-State:** Hof noch nicht eligible → die QR-Funktion erklärt, was fehlt (Verifizierung / Connect-Onboarding), mit direktem Handlungs-CTA — kein blinder Download eines QR, der nirgends bezahlt.

---

## 4 · Bezahl-Flow (Stripe + Connect · Edge Function · idempotenter Webhook)

### 4.1 — Schritt für Schritt

1. **Scan → Bezahlseite** (`/sb/:farmSlug?…`). Öffentliche Cloudflare-Pages-Route, lädt Hof/Stand/Produkte **lesend** (RLS: nur `published`), zeigt Warenkorb/Mengenwahl, **Vermittler-Disclaimer** und Eligibility-Status.
2. **`POST /functions/v1/sb/initiate`** (Edge, service role). Body (Zod): `{ farmSlug, standCode, items:[{productId, qty}], sig, turnstileToken, idempotencyKey, buyerToken? }`.
   - Turnstile prüfen · Signatur (`sig`) prüfen · Eligibility-Gate (§2.1) · `items` gegen DB auflösen → **Betrag serverseitig** (`Σ products.price_cents × qty`) · Plattformgebühr serverseitig (`platform_fee_cents`, §7).
   - **PaymentIntent** via Stripe (Connect, §4.3) mit `transfer_data.destination = orgs.stripe_connect_id`, `application_fee_amount = platform_fee_cents`, `metadata = { sb_payment_id, farm_id, org_id, stand_code }`, `idempotency_key` (Stripe-Header) = client-`idempotencyKey`.
   - Zeile `sb_payments` mit `status='pending'` (≈ State `initiated`) anlegen; `stripe_payment_intent_id`, `line_items`-Snapshot, `amount_cents`, `platform_fee_cents` setzen. Audit `sb_payment.initiated`.
   - Antwort: `{ clientSecret, sbPaymentId }` — **niemals** service-role-Keys an den Client.
3. **Zahlung im Browser** über **Stripe Payment Element** (Karte, Apple/Google Pay). Karten-/Bankdaten gehen **direkt an Stripe** — die Plattform sieht **keine PAN/CVC** (PCI-Scope **SAQ-A**, `docs/COMPLIANCE_MODEL.md`). Der Client wartet auf das **vom Server bestätigte** Ergebnis (kein clientseitiges „bezahlt").
4. **Stripe Webhook** `POST /functions/v1/sb/webhook` (Edge, service role) — die **einzige** Wahrheit für `paid/failed/refunded` (§4.4).
5. **Bestätigung + Quittung** (§Quittung): Bei `paid` erzeugt der Webhook serverseitig die Quittung (Storage, signierter Link) und stellt sie dem Käufer bereit; die Bezahlseite pollt/abonniert den `sb_payments`-Status (Realtime/Read) und zeigt „Bezahlt — Quittung anzeigen".

### 4.2 — Zustände (kanonisch, identisch zu `docs/CORE_BUSINESS_STATE_MACHINES.md` §4 + `payment_status`)

DB-Enum (real, `app/supabase/migrations/0002_payments.sql`): `payment_status = ('initiated','paid','failed','refunded','canceled')`. Die fachliche State-Machine bildet darauf ab:

| State-Machine (Fachbegriff) | `payment_status` | Bedeutung |
|---|---|---|
| `initiated` (▶) | `initiated` | Checkout-Session erstellt (`sb_payments`-Zeile), noch nicht abgeschlossen |
| `paid` (⏹ Erfolg) | `paid` | Stripe meldet `checkout.session.completed`; Quittungs-Mail versendet |
| `failed` (⏹) | `failed` / `canceled` | Abgebrochen/abgelehnt/Timeout; kein Geldfluss |
| `refunded` (⏹) | `refunded` | Zuvor bezahlter Betrag (teilw./voll) erstattet (Ziel-Design; Refund-Pfad noch nicht implementiert) |

> `canceled` deckt den vom Käufer/Timeout abgebrochenen Vorgang. UI-Labels DE, Status-Schlüssel persistiert (sprachneutral). Asynchrone Methoden (z. B. SEPA) werden im Checkout-Modell über `checkout.session.completed` final bestätigt.

### 4.3 — Stripe Connect (Geldfluss zum Hof)

- **Connect-Modell:** **Destination Charge mit `application_fee_amount`** (empfohlen). Belastung läuft über das Plattform-Stripe-Konto, der Nettobetrag wird per `transfer_data.destination` an den **Connect-Account des Hofes** weitergeleitet; die Plattformgebühr verbleibt als `application_fee`. Damit bleibt der **PCI-Scope der Plattform minimal (SAQ-A)** und die Plattform sieht keine Kartendaten.
- **Onboarding:** Erzeuger durchläuft **Stripe Connect Onboarding** (Express/Standard, Owner-Entscheidung) — KYC/Bankverbindung liegen bei Stripe. `orgs.stripe_connect_id` speichert den Account; `charges_enabled`/`payouts_enabled` werden über den `account.updated`-Webhook gepflegt und sind Teil des Eligibility-Gates.
- **Auszahlung:** Standard-Payout-Zyklus von Stripe direkt auf das Hof-Bankkonto (kein Plattform-Treuhand-Saldo). Die Plattform hält keine Kundengelder → keine zusätzliche Zahlungsdienste-/E-Geld-Lizenzfrage durch Treuhandhaltung (Vermittler-Position; finale rechtliche Einordnung = Owner/extern, CMP-Bezug).
- **Refunds:** über die ursprüngliche Charge; `application_fee` wird konfigurierbar mit-erstattet (Default: anteilige Gebühren-Rückerstattung bei Vollerstattung) — als Owner-Parameter, nie hartkodierte Geschäftslogik.

### 4.4 — Idempotenter, signaturgeprüfter Webhook (die Wahrheit)

**Genau ein** Webhook-Handler (`/functions/v1/sb/webhook`) setzt die terminalen Zustände — nie der Client, nie Polling allein (`CLAUDE.md`/`AGENTS.md` harte Regel).

**Verarbeitungsreihenfolge (Pflicht):**
1. **Signatur prüfen** — `stripe.webhooks.constructEvent` mit `STRIPE_WEBHOOK_SECRET` (Env, nie im Code/Log). Ungültig → `400`, **kein** State-Change.
2. **Replay-/Idempotenz-Guard** — `INSERT … sb_payments.stripe_event_id = event.id` bzw. dedizierte `stripe_events`-Dedup-Tabelle (`docs/COMPLIANCE_MODEL.md`: `idempotency_keys`, Kat. D). Bereits gesehen → `200` **no-op** (`docs/DATABASE_MODEL.md` §4.7: `UNIQUE(stripe_event_id)`).
3. **Betrag/Währung gegenprüfen** — `event` PaymentIntent-Betrag/Currency **muss** dem initiierten `sb_payments`-Satz entsprechen. Abweichung → **kein** `paid`, sondern `audit` `sb_payment.amount_mismatch` + Alarm (Manipulationsschutz, §6).
4. **Zustand setzen** (transaktional mit Audit gekoppelt):

| Stripe-Event | Zielzustand | Effekt |
|---|---|---|
| `payment_intent.succeeded` | `succeeded` (`paid`) | Quittung erzeugen (§Quittung) → Käufer; Dashboard-Einnahme buchen; `paid_at` setzen; Audit `sb_payment.succeeded`/`sb_payment.paid` |
| `payment_intent.payment_failed` / `…canceled` | `failed` / `cancelled` | UI-Hinweis „erneut versuchen" (neuer Vorgang); Audit `sb_payment.failed` (+ Stripe-Grund) |
| `charge.refunded` / `refund.updated` | `refunded` | `refunded_at` + Betrag; Gutschrift-Beleg; Käufer-Benachrichtigung; Dashboard korrigieren; Audit `sb_payment.refunded` (+ Betrag, `reason`) |
| `account.updated` (Connect) | — (Org-Update) | `charges_enabled`/`payouts_enabled` aktualisieren → wirkt auf Eligibility-Gate |
| `charge.dispute.created` | — (Flag + Alarm) | `sb_payments` als „strittig" markieren; Staff-Eskalation; Audit `sb_payment.disputed` |

5. **Antwort** — `200` nur bei vollständig verarbeitetem (oder dedupliziertem) Event; bei transienten DB-Fehlern `5xx` → Stripe retried (idempotent).

> **Doppelte Idempotenz-Achse:** (a) Client → `initiate` über client-stabilen `idempotencyKey` (kein Doppel-Intent bei Funkloch/Retry am Stand). (b) Stripe → Webhook über `event.id` (jedes Event genau einmal). Beide nötig (`docs/CORE_BUSINESS_STATE_MACHINES.md` §4.4).

---

## 5 · Quittung, Belege & Reservierungs-Kopplung

### 5.1 — Quittung (Käufer)

Bei `paid` erzeugt der Webhook serverseitig eine **Quittung** und legt sie in Supabase Storage (EU, privat) ab; `sb_payments.receipt_url` trägt einen **signierten, ablaufenden Link** (kein öffentlicher Bucket).

**Pflicht-Inhalt der Quittung (Compliance, CMP-04, `docs/COMPLIANCE_MODEL.md` §9):**
- **Leistungserbringer = Hof** (Name, Anschrift des Betriebs) — **nicht** die Plattform.
- **Vermittler-Hinweis:** „Die Zahlung wurde über Stripe an den genannten Erzeuger geleistet. LokaleBauernConnect ist Zahlungsanbindung/Vermittler, nicht Verkäufer. Gewährleistung/Reklamation richten sich an den Erzeuger."
- Positionen (`line_items`-Snapshot), Einzel-/Gesamtbetrag, Währung, Datum/Uhrzeit, Stand-Code, Zahlungsart, Stripe-Referenz, eindeutige Belegnummer.
- Hinweis auf Lebensmittel-Kennzeichnungs-Verantwortung des Erzeugers (Selbstauskunft, vor Ort verbindlich).

> Quittung wird **nie „auf Verdacht"** vor bestätigter Zahlung erstellt (`docs/CORE_BUSINESS_STATE_MACHINES.md` §4.4). Anonyme Käufer erreichen ihre Quittung über den signierten Link (kein Account nötig); eingeloggte Käufer zusätzlich unter „Meine Käufe".

### 5.2 — Beleg & Buchung (Erzeuger)

Jede `paid`-Zahlung erscheint als Einnahme im Erzeuger-Dashboard (§6) mit Brutto, Plattformgebühr, Netto-Auszahlung, Stand, Zeit, Positionen. `sb_payments` ist **aufbewahrungspflichtig (Kat. C, 10 Jahre, HGB §257/AO §147)** — nicht löschbar während der Frist (`docs/COMPLIANCE_MODEL.md` §4).

### 5.3 — Manipulationssicherheit des Betrags

Der **Server** ist die einzige Quelle des Betrags: `initiate` ignoriert jeden client-gelieferten Betrag und berechnet `amount_cents` aus der DB. Der Webhook prüft den Stripe-Betrag gegen den initiierten Satz (§4.4 Schritt 3). Ein im QR/Link manipuliertes `qty` ändert nur die Menge eines real existierenden, RLS-lesbaren Produkts — der **Stückpreis** kommt immer aus `products.price_cents`.

### 5.6 — Optionale Kopplung Reservierung ↔ SB-Zahlung

`sb_payments.reservation_id` (`docs/DATABASE_MODEL.md` §4.7) verknüpft eine Zahlung mit einer Reservierung (Käufer holt reservierte Ware am SB-Stand ab und zahlt dort). Default **getrennt** (Zahlung ≠ physische Abholung). Optional pro Hof: `sb_payment.paid` auf eine `confirmed` Reservierung löst `reservation.pick_up` (R5) aus (`docs/CORE_BUSINESS_STATE_MACHINES.md` §4.5). Spontankauf ohne Reservierung bleibt jederzeit möglich.

---

## 6 · Erzeuger-Dashboard (Einnahmen / Schwund)

Echtes, RLS-org-gescoptes Dashboard — **keine** Fake-KPIs (`CLAUDE.md` Verbot). Alle Werte aus `sb_payments`/`reservations`/`availability` der eigenen Org.

### 6.1 — Kennzahlen

| KPI | Quelle / Berechnung | Zweck |
|---|---|---|
| **Einnahmen (Zeitraum)** | `Σ amount_cents WHERE status=succeeded` (Brutto), Netto = Brutto − `platform_fee_cents` − Stripe-Gebühr | Umsatzüberblick je Tag/Woche/Monat |
| **Transaktionen** | `count(*) WHERE status=succeeded` | Volumen, Spontankauf-Frequenz |
| **Top-Produkte** | Aggregation über `line_items` | Bestückungsentscheidung |
| **Verteilung über Tageszeit/Stand** | `paid_at`, `stand_code` | Stand-Performance, Nachfüll-Timing |
| **Schwund-Indikator** | Δ aus gepflegtem Bestand (`availability.qty_estimate`) vs. bezahlter Menge (`Σ line_items.qty` mit `succeeded`) über das Fenster | Hinweis auf nicht bezahlte Entnahmen (Kern-USP-Beleg) |
| **Erstattungsquote** | `Σ refunded / Σ succeeded` | Qualitäts-/Streitfall-Signal |
| **Auszahlungs-Status** | Connect `payouts_enabled` + nächster Payout (aus Stripe) | Liquiditäts-Transparenz |

> **Schwund-Indikator ehrlich gerahmt:** Er ist ein **Indikator**, kein Beweis (Bestand ist Erzeuger-Selbstpflege, kein Warenwirtschaftssystem — Vermittler-Haltung). Negative Δ werden als „mögliche nicht bezahlte Entnahme oder ungepflegter Bestand" gezeigt, nie als Anschuldigung. Schwellenwerte sind **Konfig**, nie hartkodiert.

### 6.2 — Aktionen & Endpunkte

| Endpoint (Edge Function) | Auth | Beschreibung |
|---|---|---|
| `GET /functions/v1/sb/dashboard?range=…` | Erzeuger (`owns_farm`) / Staff | Aggregierte KPIs + Scope (`org`/Zeitraum, Pfeiler 3); **Zero-State** bei keinen Zahlungen (leere Arrays, `available:false`) |
| `GET /functions/v1/sb/payments?…` | Erzeuger / Staff | Paginierte Zahlungsliste (Filter Status/Stand/Zeit); RLS-org-gescoped |
| `POST /functions/v1/sb/refund` | Erzeuger (auszahlungsberechtigt, **MFA**) / Staff | Erstattung auslösen — **`reason` Pflicht**; löst Stripe-Refund aus → Webhook setzt `refunded` (§4.4 P4) |
| `POST /functions/v1/sb/qr` / `…/qr/rotate` / `…/qr/revoke` | Erzeuger (`owns_farm`) | QR generieren / rotieren / sperren (§3.2), auditiert |

Jede Mutation (Refund, QR-Rotation/Sperre) = **Confirm + Reason + Audit** (`CLAUDE.md`). Frontend exakt im Editorial-Token-System (`app/src/styles/theme.css`), keine Deko-Emojis, alle Zustände (Lade/Leer/Fehler) real auslösbar.

---

## 7 · Gebührenmodell (Monetarisierung)

| Parameter | Quelle | Regel |
|---|---|---|
| `platform_fee_cents` | serverseitig in `initiate` berechnet, in `sb_payments` gespeichert | **Nie** Client-Wert; nie hartkodiert in der UI — zentrale Konfig (Owner-Parameter pro Plan/Org möglich) |
| **Gebühren-Formel** | Konfig: `max(fixfee_cents, round(amount_cents × pct))` (Default-Beispiel, Owner legt Werte fest) | Deckt Stripe-Mindestkosten; degressiv für höhere Beträge möglich |
| **Plan-Kopplung** | `orgs.plan` (`demo/basis/plus/pro/individuell`) | Höhere Pläne können reduzierte SB-Gebühr als Entitlement haben (serverseitig, `PHASEN.md` WAVE_09) |
| **Stripe-Gebühr** | trägt der Hof (aus Connect-Netto) bzw. konfigurierbar | transparent im Dashboard als separater Posten ausgewiesen |
| **Transparenz** | Quittung + Dashboard | Käufer zahlt den ausgewiesenen Warenwert; Gebühr ist Plattform↔Hof, nicht versteckt auf den Käufer aufgeschlagen (Owner-Entscheidung, Default: keine Käufer-Aufschlag-Anzeige nötig, da Gebühr aus Hof-Netto) |

> **Owner-Entscheidung (offen, §13):** konkrete Gebührenhöhe (pct/fixfee), ob die Gebühr aus Hof-Netto (`application_fee`) **oder** als Käufer-Aufschlag erhoben wird, und Plan-abhängige Staffelung. Default-Pfad = `application_fee` aus Hof-Netto (käuferfreundlich, friktionsarm). Geld-/Pricing-Entscheidung erfordert Owner-Freigabe (`CLAUDE.md` Stop-/Commercial-Regel).

---

## 8 · Anti-Betrug & Missbrauchsschutz

| Vektor | Maßnahme |
|---|---|
| **Phishing-QR** (gefälschter Sticker leitet auf Fremd-Seite) | QR-Link **HMAC-signiert** (`sig`), serverseitig verifiziert; Domain fix (Cloudflare Pages, CSP); QR-Rotation/Sperre (§3.2); Aushang-Vorlage mit Markenstil erschwert Fälschung |
| **Betrags-Tampering** (manipulierter Betrag im Link/Client) | Betrag **ausschließlich serverseitig** aus DB; Webhook-Betrag-/Currency-Abgleich (§4.4); Client-Betrag wird ignoriert |
| **Doppel-Belastung** (Retry/Funkloch am Stand) | client-stabiler `idempotencyKey` an `initiate` + Stripe-`idempotency_key`-Header |
| **Webhook-Replay/Spoof** | Signaturprüfung (`STRIPE_WEBHOOK_SECRET`) + `UNIQUE(stripe_event_id)`-Dedup |
| **Karten-Testing / BIN-Attacken** über öffentlichen `initiate` | **Turnstile** (Cloudflare) + **Rate-Limit** je IP/Stand; Stripe Radar (Connect) als zweite Schicht |
| **Eligibility-Umgehung** (Zahlung an nicht-verifizierten/Fake-Hof) | Eligibility-Gate (§2.1) serverseitig vor PaymentIntent; nur `verified` + Connect-`charges_enabled` |
| **Erstattungs-Missbrauch** | Refund nur durch auszahlungsberechtigten Erzeuger (MFA) / Staff, `reason` Pflicht, Betrag ≤ Original, jede Erstattung auditiert |
| **Chargeback/Dispute** | `charge.dispute.created` → Flag + Staff-Eskalation + Audit; Beleg-/Quittungs-Spur als Nachweis |
| **PII-/Kartendaten-Leck** | SAQ-A: keine PAN/CVC bei uns; Payment Element direkt an Stripe; service role nur in Edge; CSP `connect-src` Allowlist (Supabase/Stripe) |

---

## 9 · Compliance (Vermittler-Position)

Vollständig verankert in `docs/COMPLIANCE_MODEL.md` — hier die SB-relevanten Punkte:

- **Vermittler, nicht Verkäufer** (§0/§9): Geld fließt via Connect an den Hof; Plattform behält nur Gebühr; Quittung weist Hof als Leistungserbringer + Vermittler-Hinweis (CMP-04).
- **Zahlungsdaten-Verantwortung** (§0): Stripe = eigener Verantwortlicher; Plattform berührt keine Vollkartendaten (**SAQ-A**); Erzeuger = Zahlungsempfänger (Connect).
- **Aufbewahrung** (§4): `sb_payments`/Belege Kat. C, **10 Jahre** (HGB §257/AO §147) — Löschung während Frist = Anonymisierung soweit ohne Belegverlust, sonst Verarbeitungseinschränkung (Art. 18).
- **Audit** (§10): `sb_payment.initiated/paid/failed/refunded` + QR-/Dispute-Events, append-only, `reason` bei Erstattung Pflicht.
- **Lebensmittel-Kennzeichnung** (§8): Selbstauskunft des Erzeugers; Quittung/Stand-Aushang verweisen auf Verantwortung des Erzeugers, insbesondere am unbemannten Stand.
- **Subprozessoren** (§7): Stripe (+ Connect) gelistet, DPA + SCC/Adequacy.
- **Rechtliche Einordnung** (Zahlungsdienste/E-Geld): Default-Architektur (Destination Charge, kein Plattform-Treuhand-Saldo) hält die Plattform in der Vermittler-Position; finale aufsichtsrechtliche Bewertung = **Owner/extern** vor Go-Live (CMP-Bezug, kein Platzhalter im Live-Text).

---

## 10 · Datenmodell-Anker (Verweis, keine Duplikation)

Quelle: `app/supabase/migrations/0002_payments.sql` (real) · `docs/DATABASE_MODEL.md`.

- **Tabelle** `sb_payments` (real, `0002_payments.sql`): `id`, `org_id`, `farm_id`, `product_id?`, `quantity`, `amount_cents`, `currency`, `method?`, `status payment_status (default 'initiated')`, `stripe_checkout_session?`, `stripe_payment_intent?`, `payer_contact?`, `created_at`, `paid_at`.
- **Ziel-Felder (Track A, additiv, noch nicht angelegt):** `buyer_id?`, `reservation_id?`, `platform_fee_cents`, `line_items JSONB`, `receipt_url`, `refunded_at`, `deleted_at` sowie UNIQUE-Constraints auf den Stripe-IDs.
- **RLS** (real): `SELECT` org-/staff-gescoped; **`INSERT/UPDATE` nur service role** (ausschließlich Edge `create-checkout` + `stripe-webhook` schreiben). Frontend rein lesend.
- **Idempotenz (real):** über die Tabelle **`payment_events`** (`id` = Stripe-`event.id` als PK) — ein bereits gesehenes Event ergibt `200` no-op. (`UNIQUE(stripe_event_id)`/`UNIQUE(stripe_payment_intent_id)` direkt auf `sb_payments` ist Ziel-Design.)
- **Additive Migration:** `0002_payments.sql` (Schema+RLS, Enums `payment_status`/`subscription_status`, Tabellen `subscriptions`/`sb_payments`/`payment_events`) bestehend; Track A ergänzt **additiv** Connect-/QR-/Gebühr-Felder — neue Spalten `NULL`-bar/`DEFAULT`, mit Rollback (`CLAUDE.md` Verbot „keine Migration ohne Rollback").

> **Keine Schema-Neudefinition hier.** Diese Spec verweist; die DB-Wahrheit bleibt `docs/DATABASE_MODEL.md` + `app/supabase/migrations/`.

---

## 11 · Edge Functions (Deno) — Endpunkt-Inventar

| Endpoint | Auth | Schreibt | Kernpflichten |
|---|---|---|---|
| `POST /functions/v1/sb/initiate` | öffentlich + Turnstile (optional `buyerToken`) | `sb_payments` (service role) | Zod · `sig`-Prüfung · Eligibility · Betrag serverseitig · PaymentIntent (Connect, fee) · Idempotenz · Audit |
| `POST /functions/v1/sb/webhook` | Stripe-Signatur | `sb_payments`, Quittung, `audit_log` | Signatur · Replay-Dedup · Betrag/Currency-Abgleich · State · Quittung · Audit · `200` no-op bei Replay |
| `POST /functions/v1/sb/refund` | Erzeuger (MFA) / Staff | löst Stripe-Refund | `reason` Pflicht · Betrag ≤ Original · Audit; State setzt der Webhook |
| `GET /functions/v1/sb/dashboard` | Erzeuger / Staff | — (read) | Org-Scope · Zero-State · Scope-Transparenz |
| `GET /functions/v1/sb/payments` | Erzeuger / Staff | — (read) | Pagination · RLS-org-gescoped |
| `POST /functions/v1/sb/qr` `/rotate` `/revoke` | Erzeuger (`owns_farm`) | QR-Felder | Eligibility-Hinweis · `sig`-Erzeugung · Audit |
| `POST /functions/v1/connect/onboard` | Erzeuger (Org-Owner, MFA) | `orgs.stripe_connect_id` | Stripe-Connect-Onboarding-Link erzeugen |

**Pflicht für jede Function (`AGENTS.md` `edge-functions-spezialist`):** Zod an der Grenze · Rechteprüfung **vor** Wirkung · **service role nur hier** · Audit nach Mutation · Turnstile an öffentlichen Formularen · Secrets nur aus Env (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SB_QR_HMAC_SECRET`) — nie im Log.

---

## 12 · Akzeptanzkriterien & Tests (Definition of Done)

**Akzeptanz (Phase 4 Track A „grün"):**
- [ ] **Eligibility-Gate** blockiert `initiate` bei nicht-verifiziertem **oder** Connect-unfertigem Hof → `403`/Sperr-Hinweis, **kein** PaymentIntent, kein toter Button.
- [ ] **Betrag serverseitig** bestimmt; client-/QR-gelieferter Betrag wird ignoriert; Webhook-Betrags-/Currency-Abgleich greift.
- [ ] **Connect-Geldfluss**: Nettobetrag landet auf Hof-Connect-Account, `platform_fee_cents` als `application_fee` bei der Plattform.
- [ ] **Webhook ist die einzige Wahrheit** für `paid/failed/refunded`; Client setzt nie Status.
- [ ] **Idempotenz** beidseitig: doppelter Client-Retry → ein Intent; doppeltes Stripe-Event → ein State-Change (`200` no-op).
- [ ] **Quittung** nur bei `paid`, mit Hof als Leistungserbringer + Vermittler-Hinweis (CMP-04); signierter, ablaufender Link.
- [ ] **Dashboard** zeigt echte Einnahmen/Schwund (kein Fake), Zero-State bei 0 Zahlungen, Scope-Transparenz (org/Zeitraum).
- [ ] **Refund** nur mit MFA/Staff + `reason`; auditiert; Dashboard korrigiert.
- [ ] **RLS**: Käufer sieht nur eigene Zahlung/Quittung; Erzeuger nur eigene Org; `INSERT/UPDATE` durch App-Rollen = abgelehnt.
- [ ] **Disclaimer** auf Bezahlseite + Quittung sichtbar, zentral gepflegt.

**Pflicht-Tests (`qa-tester`, `docs/CORE_BUSINESS_STATE_MACHINES.md` §5.3):**

| # | Test | Erwartung |
|---|---|---|
| T1 | Happy-Path: scan → initiate → succeeded-Webhook | `sb_payments=succeeded`, Quittung erzeugt, Dashboard-Einnahme +, Audit `sb_payment.paid` |
| T2 | Illegaler Übergang (`paid→paid`, `failed→paid`) | `409`/no-op, Zustand unverändert |
| T3 | Cross-Org: Org B liest/erstattet Zahlung von Org A | **0 Zeilen** lesend / `403` schreibend (Pfeiler 1) |
| T4 | Refund ohne `reason` / ohne MFA | `422` / `403` |
| T5 | Webhook ohne/falsche Signatur | `400`, kein State-Change |
| T6 | Webhook-Replay (gleiche `event.id` doppelt) | genau **ein** State-Change, zweiter `200` no-op |
| T7 | Client-Retry (gleicher `idempotencyKey`) | genau **ein** PaymentIntent |
| T8 | Betrags-Tampering (manipuliertes `qty`/Betrag im Client) | Server rechnet aus DB; Webhook-Abgleich; `paid` nur bei Übereinstimmung |
| T9 | Eligibility: nicht-verifizierter / Connect-unfertiger Hof | `initiate` → `403`/Sperr-Hinweis, kein Intent |
| T10 | QR-Signatur ungültig/gesperrt | Bezahlseite verweigert + Hinweis |
| T11 | Zero-State: Dashboard ohne Zahlungen | leere Arrays / `available:false`, kein `500` |
| T12 | Phishing-QR (fremde `sig`) | serverseitige `sig`-Verifikation schlägt fehl, kein Intent |
| T13 | Dispute (`charge.dispute.created`) | `sb_payments` strittig markiert, Staff-Eskalation, Audit |
| T14 | Reservierungs-Kopplung (opt-in): `paid` auf `confirmed` Reservierung | `reservation.pick_up` (R5) ausgelöst (wenn konfiguriert) |

> **Stripe-Test:** Test-Keys + Stripe-CLI-Webhook-Forwarding lokal; Test-Connect-Account; deterministische Test-Karten. **Kein** echter Geldfluss in Tests; keine Live-Keys außerhalb von Env/Owner-Freigabe.

---

## 13 · Offene Punkte / Owner-Entscheidungen

| ID | Beschreibung | Priorität | Status |
|---|---|---|---|
| SB-01 | **Gebührenhöhe** (`pct`/`fixfee`) + Erhebungsweg (`application_fee` aus Hof-Netto vs. Käufer-Aufschlag) + Plan-Staffelung | HOCH | Owner-Pricing-Entscheidung (Default: `application_fee`, käuferfreundlich) |
| SB-02 | **Connect-Variante** (Express vs. Standard) + KYC-Onboarding-UX | HOCH | Owner; beeinflusst Onboarding-Flow + Haftung |
| SB-03 | **Aufsichtsrechtliche Einordnung** (Zahlungsdienste/E-Geld) der gewählten Connect-Architektur | HOCH | Owner/extern vor Go-Live (CMP-Bezug) |
| SB-04 | **Stripe-Account/Live-Keys/Webhook-Endpoint** anlegen + Secrets setzen | HOCH | Owner-Freigabe (Account/Kosten) |
| SB-05 | **Mehrere Stände je Hof** (Stand-Tabelle) — initial Default-Stand `'haupt'`, additive Erweiterung | MITTEL | Track A additiv; bei Bedarf eigene `farm_stands`-Migration |
| SB-06 | **Quittungs-Vorlage** final (Editorial-Layout, Pflichtangaben, mehrsprachig?) | MITTEL | i18n-content-spezialist + Compliance |
| SB-07 | **Schwund-Schwellen** + Darstellung (Indikator, keine Anschuldigung) | NIEDRIG | Konfig, Owner-Default |

---

## 14 · Abgleich mit den 7 Produktionspfeilern

| Pfeiler | Beleg in dieser Strecke |
|---|---|
| 1 Org-Boundary | `sb_payments.org_id` + RLS; Cross-Org-Lesen = 0 Zeilen, Schreiben = nur service role; Refund/Dashboard org-gescoped |
| 2 Zero-State | Dashboard/Payments ohne Daten → leere Arrays / `available:false`, nie `500` |
| 3 Scope-Transparenz | Dashboard-Responses tragen `org`/Zeitraum/Stand; Quittung trägt Stand + Datenstand |
| 4 RBAC | Käufer (auch anonym) / Erzeuger (MFA für Geld) / Staff getrennt; Plan-Locks über `orgs.plan` (Gebühr serverseitig) |
| 5 Audit | `sb_payment.*` + QR-/Dispute-Events append-only; `reason` Pflicht bei Refund; Betrags-Mismatch alarmiert |
| 6 Testpflicht | T1–T14 (Happy/Illegal/Cross-Org/Reason/Signatur/Replay/Idempotenz/Tampering/Eligibility/Zero-State/Phishing/Dispute) |
| 7 Drilldown-Integrität | QR-Deep-Links über `farms.slug` + signiertem `sig`; Quittungs-/Zahlungs-Links signiert + ablaufend; nie org-fremde URL |

---

*Letzte Aktualisierung: Phase 4 · Track A (Vorzieh-Spezifikation) · 2026-06-19*
*Zuständig: Payment (Claude) · Subagenten: `payment-engineer` · `edge-functions-spezialist` · `security-auditor` · `compliance-officer` (Quittung/Disclaimer) · Freigabe: Owner (Stripe-Account/Connect/Pricing/Go-Live).*
*Querverweise: `docs/DATABASE_MODEL.md` §4.7 · `docs/CORE_BUSINESS_STATE_MACHINES.md` §4/§3 · `docs/COMPLIANCE_MODEL.md` §0/§4/§7/§9 (CMP-04) · `docs/ROLE_AND_PERMISSION_MODEL.md` · `docs/security/TENANT_ISOLATION_MODEL.md` · `PHASEN.md` Phase 4 Track A / WAVE_09.*
*Hinweis: Technisch-organisatorische Spezifikation, keine Rechts-/Steuerberatung. Aufsichtsrechtliche Einordnung + Pricing sind Owner-/extern vor Go-Live zu bestätigen.*
