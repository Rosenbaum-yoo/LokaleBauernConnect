# PLANS_AND_LIMITS — LokaleBauernConnect

> **Kanonische Quelle der Plan-/Limit-/Entitlement-Wahrheit** der Plattform. Dieses Dokument ist die menschenlesbare Spezifikation; die **maschinelle Wahrheit** liegt serverseitig in der Entitlement-Tabelle (`plan_entitlements`, DB) bzw. der Edge-Function-Konstante `app/supabase/functions/_shared/entitlements.ts`. **Bei Widerspruch gilt der serverseitig durchgesetzte Code, nicht der Client.**
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Vermittler-Grundsatz (nicht verhandelbar):** LokaleBauernConnect **vermittelt**, verkauft nicht selbst, berät nicht. **Plan-Locks gelten ausschließlich für Erzeuger.** **Käufer zahlen nichts** und unterliegen **keinem** Funktions-Lock — der gesellschaftliche Nutzen (regionale Lebensmittel zugänglich machen) steht über Maximalmonetarisierung (`CLAUDE.md` §0.3 vs. §0 Konfliktregel; `ROLE_AND_PERMISSION_MODEL.md` §5).
>
> **Bezug:** `ROLE_AND_PERMISSION_MODEL.md` §5 (Plan-Locks & Upgrade-Pfad — diese Datei ist deren commercial-detaillierte Ableitung) · `DATABASE_MODEL.md` §2/§4.1 (`org_plan`-Enum, `orgs.plan`/`plan_valid_until`) · `COMPLIANCE_MODEL.md` §2 (planunabhängige DSGVO-Pflichten) · `CLAUDE.md` (7 Produktionspfeiler, „Datenbank-, RLS- & Planregeln") · `PHASEN.md` (WAVE_09 Billing, Phase 4 Track A SB-Bezahlung) · geplant: `docs/PRICING.md`, `docs/SUBSCRIPTION_LIFECYCLE.md`, `docs/STRIPE-SETUP.md`, `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`.
>
> **Status:** Normativ (Commercial Source of Truth für Plan-Gating). **Stand:** 2026-06-19 · Phase 1 · WAVE_09 (Vorzieh-Spezifikation). Zuständig: Claude (Commercial + payment-engineer). Freigabe: Owner (Preise/Geld = Owner-Entscheidung, `CLAUDE.md`).

---

## 0 · Grundprinzipien des Plan-Modells (nicht verhandelbar)

| Prinzip | Umsetzung |
|---|---|
| **Entitlements serverseitig** | Jede Plan-Sperre wird in einer Edge Function / RLS durchgesetzt. Der Client **spiegelt** nur (Surface-Lock), er **entscheidet** nie. Verstoß → `403 { code: 'plan_limit' }` **und** UI-Lock (Pfeiler 4). |
| **Stripe-Webhook ist die einzige Schreibquelle für `plan`** | `orgs.plan`/`plan_valid_until` werden ausschließlich vom signaturgeprüften, idempotenten Stripe-Webhook gesetzt (Edge Function, service role). Kein clientseitiger Plan-Wechsel (`ROLE_AND_PERMISSION_MODEL.md` §3.2 `subscriptions`/`orgs`). |
| **Datengetrieben, kein Hardcode in UI** | Limit-Schwellwerte stehen in genau **einer** Entitlement-Quelle (DB `plan_entitlements` + gespiegelte TS-Konstante), nie als Magic Number in einer Komponente (`CLAUDE.md`-Verbot „keine hardcodierten Schwellwerte außerhalb Design-System"). |
| **Käufer planfrei** | Plan-Gating betrifft **nur** `profiles.role = 'erzeuger'` (org-gebunden). Käufer/Gäste haben keinen Plan und kein Limit auf Entdecken/Reservieren. |
| **DSGVO-Pflichten planunabhängig** | Auskunft, Export, Löschung, Audit sind **gesetzliche Pflicht** und nie hinter einem Plan-Lock (`COMPLIANCE_MODEL.md` §2). Ein Plan kann sie nie entziehen. |
| **Sicherheit ist kein Premium-Feature** | RLS, MFA-Pflicht (Staff/auszahlungsberechtigte Erzeuger), Turnstile, Audit gelten plan-unabhängig. Kein Plan schaltet eine Sicherheitsmaßnahme ab. |
| **Downgrade verliert nie Daten** | Über-Limit-Daten werden **nicht gelöscht**, sondern read-only markiert, bis reduziert/erneut upgegradet wird (Retrofit-bewusst, §6.3). |
| **Vermittler bleibt Vermittler** | Kein Plan macht die Plattform zum Verkäufer/Berater. SB-Bezahlung = Zahlungsanbindung via Stripe Connect; Geld fließt an den Hof, Plattform behält nur die SB-Gebühr (`COMPLIANCE_MODEL.md` §0/§9). |

---

## 1 · Die fünf kanonischen Pläne (Imperium-Standard)

`org_plan`-Enum (`DATABASE_MODEL.md` §2): `demo` · `basis` · `plus` · `pro` · `individuell`. **„Enterprise" ist kein eigener Plan**, sondern das Funktionsniveau innerhalb von `individuell`.

| Plan | Preis / Monat (netto, zzgl. USt.) | Zielgruppe (Hof-Domäne) | Kern-Versprechen |
|---|---|---|---|
| **`demo`** | kostenlos | Erst-Erzeuger, Evaluierung, Onboarding-Vorschau | Betrieb anlegen + Vorschau, **nicht** öffentlich gelistet, keine Reservierungs-Annahme. Spielwiese vor Verifizierung. |
| **`basis`** | **19 €** | Einzelner kleiner Hofladen / Imkerei / Selbstvermarkter | Öffentlich gelistet (nach Hof-Verifizierung), Reservierungs-Eingang, gepflegtes Sortiment. Der Einstieg in den aktiven Betrieb. |
| **`plus`** | **49 €** | Wachsender Betrieb mit Saison-Marketing | Mehrere Betriebe, großes Sortiment, **Premium-Listing** (Hervorhebung im Finder) + **Saison-Push** an Käufer-Favoriten, kleines Team. |
| **`pro`** | **99 €** | Professioneller Mehrstand-Betrieb mit **unbemanntem SB-Stand** | Alles aus `plus` **+ SB-Bezahl-USP ⭐** (QR → Stripe → Quittung), SB-Auswertung (Einnahmen/Schwund), unbegrenztes Sortiment, eingeschränkter Export. |
| **`individuell`** | individuell (Vertrieb/Owner) | Hof-Verbünde, Genossenschaften, regionale Marken | Enterprise-Funktionsniveau: unbegrenzte Betriebe/Team, voller API-/Export-Zugang, eigene Domain / Whitelabel / SLA, bevorzugte SB-Gebühr. Nicht self-service. |

> **Preis-Hoheit beim Owner.** Die hier genannten Preise (19/49/99 €) sind die Vorgabe-Staffel dieser Spezifikation und stehen unter **Owner-Freigabe**; die wirksamen Beträge werden über die Stripe-`price`-IDs gesetzt (`docs/STRIPE-SETUP.md`, geplant), nicht im Code hartkodiert. Eine Preisänderung ist eine Owner-Aktion (Confirm + Reason + Audit, `ROLE_AND_PERMISSION_MODEL.md` §2.4).
>
> **Bewusst günstig (Wirtschaftlichkeit, §0.3 vs. gesellschaftlicher Nutzen):** Anders als VMS-Pläne (3-/4-stellig) zielt diese Staffel auf **breite Hof-Adoption** — der Hauptgeldfluss des Owners ist die **SB-Transaktionsgebühr** (§4), nicht ein hoher Abo-Preis. Viele aktive Höfe × kleine Gebühr × hohe Story > wenige teure Abos.

---

## 2 · Limits je Plan (Mengen-Entitlements)

`-1` = **unbegrenzt** (kein Limit gesetzt). Serverseitig durchgesetzt bei **jeder** mutierenden Aktion (INSERT in `farms`/`products`/`org_members`/`reservations` läuft über Edge Function bzw. RLS-`WITH CHECK` + Count-Prüfung). Diese Zahlen sind die commercial-Quelle für `ROLE_AND_PERMISSION_MODEL.md` §5.1 (Entitlement-Matrix) und müssen mit ihr konsistent bleiben.

| Limit (Schlüssel) | `demo` | `basis` | `plus` | `pro` | `individuell` | Durchsetzung |
|---|:--:|:--:|:--:|:--:|:--:|---|
| **Betriebe** (`max_farms`) | 1 | 1 | 3 | 10 | **−1** | Edge `farm-create`: `count(farms WHERE org_id AND deleted_at IS NULL) < limit`, sonst 403 `plan_limit`. |
| **Produkte je Betrieb** (`max_products_per_farm`) | 5 | 30 | 150 | **−1** | **−1** | Edge `product-upsert`: `count(products WHERE farm_id AND deleted_at IS NULL) < limit`. |
| **Team-Mitglieder je Org** (`max_team_members`) | 1 | 1 | 3 | 10 | **−1** | Edge `org-member-invite`: `count(org_members WHERE org_id) < limit`. |
| **Aktive Reservierungen / Betrieb** (`max_active_reservations_per_farm`) | 0 | 50 | 200 | **−1** | **−1** | `demo` nimmt keine Reservierungen an; sonst Edge `reservation-create`: `count(reservations WHERE farm_id AND status IN ('requested','confirmed','ready'))` (offene) < limit, sonst 409 `reservation_capacity` (Hof voll, sauberer Zero-State, kein 500). |
| **Saison-Push / Monat** (`max_season_push_per_month`) | 0 | 0 | 4 | 20 | **−1** | Edge `season-push`: Monats-Counter (`billing_usage`) gegen Limit; ab `plus`. |
| **Premium-Listing-Slots** (`premium_listing`) | 0 | 0 | 1 | 1 | **−1** | Hervorhebung im Finder; ab `plus` ein Betrieb hervorhebbar, `individuell` alle. |
| **SB-Stände aktiv** (`max_self_service_stands`) | 0 | 0 | 0 | **−1** | **−1** | SB-Bezahlung nur `pro`+; Anzahl SB-fähiger `farms.is_self_service=true` unbegrenzt im Plan, aber Feature-Gate `sb_payment` muss `true` sein (§3). |
| **Export-Jobs / Monat** (`max_export_jobs_per_month`) | 0 | 0 | 0 | 5 | **−1** | DSGVO-Eigen-Export (`me/export`) ist davon **ausgenommen** (planfrei, §0). Gemeint sind kommerzielle Daten-/Reporting-Exporte. |

> **Zero-State statt Fehler (Pfeiler 2):** Ein erreichtes Limit liefert eine **erwartbare** Antwort (`403 plan_limit` für Plan-Sperren, `409 reservation_capacity` für betriebliche Kapazität) — **nie** 500/NULL-Pointer. Die UI zeigt dann Lock-Karte mit Upgrade-Pfad (§6) bzw. „Dieser Hof nimmt aktuell keine weiteren Reservierungen an".
>
> **`demo` ist eine echte Vorschau, kein totes Konto:** `demo` darf 1 Betrieb + 5 Produkte anlegen und im **eigenen** Vorschau-Modus sehen (`farms.status='draft'`), aber der Betrieb ist **nicht** öffentlich gelistet und nimmt **keine** Reservierungen an. Upgrade auf `basis` + bestandene Hof-Verifizierung schalten die öffentliche Listung frei.

---

## 3 · Feature-Gates je Plan (Funktions-Entitlements)

Quelle: `plan_entitlements` (DB) / `app/supabase/functions/_shared/entitlements.ts` (gespiegelte TS-Konstante). Legende: **✓** enthalten · **—** gesperrt (Lock mit Upgrade-Pfad).

### 3.1 Listung & Sichtbarkeit

| Feature (`flag`) | `demo` | `basis` | `plus` | `pro` | `individuell` |
|---|:--:|:--:|:--:|:--:|:--:|
| Betrieb anlegen + Vorschau (`farm_create_preview`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Öffentlich gelistet (nach Verifizierung) (`farm_public_listing`) | — (Vorschau) | ✓ | ✓ | ✓ | ✓ |
| Sortiment-/Verfügbarkeits-Selbstpflege (`product_self_service`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Abholfenster konfigurieren (`pickup_windows`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Premium-Listing** (Finder-Hervorhebung) (`premium_listing`) | — | — | ✓ | ✓ | ✓ |
| Mehrere Betriebe (`multi_farm`) | — | — | ✓ | ✓ | ✓ |

### 3.2 Reservierung, Saison & Käufer-Bindung

| Feature (`flag`) | `demo` | `basis` | `plus` | `pro` | `individuell` |
|---|:--:|:--:|:--:|:--:|:--:|
| Reservierungs-Eingang annehmen/abhaken (`reservation_inbox`) | — | ✓ | ✓ | ✓ | ✓ |
| Saison-Push an Käufer-Favoriten (`season_push`) | — | — | ✓ | ✓ | ✓ |
| Warteliste / Nachrücker-Wellen (`waitlist_campaigns`) | — | — | ✓ | ✓ | ✓ |
| Team-Mitglieder verwalten (`team_management`) | — | — | ✓ | ✓ | ✓ |

### 3.3 SB-Bezahlung (USP ⭐) & Auswertung

| Feature (`flag`) | `demo` | `basis` | `plus` | `pro` | `individuell` |
|---|:--:|:--:|:--:|:--:|:--:|
| **SB-Bezahlung am unbemannten Stand** (`sb_payment`) | — | — | — | ✓ | ✓ |
| Stripe-Connect-Auszahlungskonto (`stripe_connect_payout`) | — | — | — | ✓ | ✓ |
| SB-Auswertung (Einnahmen/Schwund) (`sb_analytics`) | — | — | — | ✓ | ✓ |
| Bevorzugte SB-Gebühr (`sb_fee_preferred`) | — | — | — | — | ✓ |

### 3.4 Daten, Integration & Enterprise (nur `pro` / `individuell`)

| Feature (`flag`) | `demo` | `basis` | `plus` | `pro` | `individuell` |
|---|:--:|:--:|:--:|:--:|:--:|
| Kommerzieller Daten-/Reporting-Export (`commercial_export`) | — | — | — | eingeschränkt | ✓ |
| API-Zugang (`api_access`) | — | — | — | eingeschränkt | ✓ |
| Eigene Domain / Whitelabel (`whitelabel`) | — | — | — | — | ✓ |
| SLA / priorisierter Support (`sla`) | — | — | — | — | ✓ |
| Mehr-Betriebs-Verbund-Verwaltung (`org_federation`) | — | — | — | — | ✓ |

> **Planfrei (kein Gate, immer aktiv — §0):** DSGVO-Eigen-Export (`me/export`), DSGVO-Löschung (`me/delete`), Audit-Einsicht der eigenen Org, RLS-Org-Isolation, MFA, Turnstile, Vermittler-/Lebensmittel-Disclaimer. Diese erscheinen **nie** als Lock.
>
> **`individuell` ≠ separate Feature-Liste:** `individuell` = höchstes Funktionsniveau (alle Flags `✓`, alle Limits `−1`, bevorzugte SB-Gebühr). Es gibt keine „versteckten" Enterprise-Flags außerhalb dieser Matrix — die Matrix ist vollständig.

---

## 4 · SB-Zahlung — Transaktionsgebühr (Haupt-Monetarisierung ⭐)

Der zentrale Geldfluss des Owners. Geld fließt via **Stripe Connect** an den Hof; die Plattform behält ausschließlich `platform_fee_cents` (`DATABASE_MODEL.md` §4.7 `sb_payments`). Plattform berührt **keine** Vollkartendaten (SAQ-A, `COMPLIANCE_MODEL.md` §0/§7).

### 4.1 Gebühren-Modell

| Plan | SB-Plattformgebühr je Transaktion (`sb_fee`) | Berechnung |
|---|---|---|
| `pro` | **1,9 % + 0,25 €** | `platform_fee_cents = round(amount_cents * 0.019) + 25` |
| `individuell` | **1,4 % + 0,25 €** (bevorzugt, verhandelbar) | `platform_fee_cents = round(amount_cents * 0.014) + 25` |
| `demo`/`basis`/`plus` | **n/a** (SB-Bezahlung nicht freigeschaltet) | Feature-Gate `sb_payment` = `false` → kein PaymentIntent erzeugbar |

> **Zusätzlich, durchlaufend (kein Plattform-Ertrag):** Stripe-eigene Processing-Gebühren trägt der Hof (Stripe Connect Direct/Destination Charge). Unsere Gebühr ist **transparent** auf der Quittung als „Servicegebühr LokaleBauernConnect" ausgewiesen; die Quittung nennt den **Erzeuger als Leistungserbringer** (`COMPLIANCE_MODEL.md` §9, CMP-04).

### 4.2 Server-Durchsetzung der Gebühr (Anti-Tampering)

- **Betrag + Gebühr werden serverseitig neu bestimmt**, nie aus dem Client übernommen (`COMPLIANCE_MODEL.md` §6.2 „Integrität — Eingabe"). Die Edge Function `sb-payment-create` liest Plan + Preise aus DB, errechnet `platform_fee_cents` aus der Gebühren-Konstante (§4.1) und übergibt `application_fee_amount` an Stripe Connect.
- **Idempotent + signaturgeprüft:** EIN Webhook-Handler (`stripe-webhook`) ist Wahrheit; `UNIQUE(stripe_event_id)` + `UNIQUE(stripe_payment_intent_id)` (`DATABASE_MODEL.md` §4.7) verhindern Doppelverbuchung.
- **Plan-Gate vor Intent:** Ohne `sb_payment`-Entitlement (Plan < `pro`) liefert `sb-payment-create` `403 plan_limit` — es entsteht **kein** PaymentIntent. Der QR-Code eines Standes ohne Entitlement ist inaktiv (sauberer Zustand, kein toter Pfad).
- **Connect-Voraussetzung:** SB-Bezahlung setzt einen verbundenen, KYC-bestätigten Stripe-Connect-Account voraus (`orgs.stripe_connect_id`). Fehlt er → Lock-CTA „Auszahlungskonto verbinden" statt aktivem QR.

---

## 5 · Serverseitige Entitlement-Architektur (End-to-End)

Vom Plan in der DB bis zum gespiegelten UI-Lock — eine lückenlose Kette, Backend führend.

```
Stripe Checkout/Portal  ──▶  stripe-webhook (Edge, service role, idempotent, signaturgeprüft)
                                   │  setzt orgs.plan + plan_valid_until  +  audit_log(billing.*)
                                   ▼
                         orgs.plan (org_plan-Enum)  ──join──  plan_entitlements (DB, datengetrieben)
                                   │
        ┌──────────────────────────┼───────────────────────────────────────┐
        ▼                          ▼                                         ▼
  RLS / WITH CHECK         Edge Function Guard                      bootstrap (GET /functions/v1/bootstrap)
  (z. B. farm_public_       requireEntitlement(flag) /              liefert { role, org_id, plan,
   listing nur published)    requireLimit(key, currentCount)         entitlements, limits, usage }
        │                          │                                         │
        ▼                          ▼                                         ▼
   0 Zeilen / 403          403 { code:'plan_limit',                  Frontend spiegelt: Lock-Karte
   bei Fremd-Org            requiredPlan, feature, upgradeUrl }       mit Upgrade-Pfad (entscheidet nie)
```

### 5.1 Durchsetzungs-Ebenen (Defense-in-Depth)

| Ebene | Mechanismus | Beispiel |
|---|---|---|
| **DB / RLS** | `WITH CHECK` + Helper; öffentliche Listung nur `status='published'` | `farms` öffentlich-SELECT nur published → `demo` nie im Finder. |
| **Edge Function Guard** | `requireEntitlement(orgPlan, 'sb_payment')` / `requireLimit('max_products_per_farm', count)` vor der Mutation | `product-upsert` bricht bei Limit mit `403 plan_limit` ab, **bevor** geschrieben wird. |
| **Bootstrap-Response** | Serverseitig erzeugte Wahrheit für die UI: `entitlements`, `limits`, aktuelle `usage` | UI weiß ohne Raten, was gesperrt ist. |
| **Frontend-Spiegel** | Surface-Lock + Upgrade-CTA (Defense-in-Depth, **nicht** Ersatz für Backend) | „Premium-Listing" als Lock-Karte für `basis`. |
| **Stripe-Webhook** | Einzige Schreibquelle für `orgs.plan` | Plan-Wechsel wirkt erst nach Webhook, nie clientseitig. |

### 5.2 Fehler-Vertrag (einheitlich, maschinenlesbar)

```jsonc
// Plan-Sperre (Funktions- oder Mengen-Limit)
{
  "error": "PLAN_LIMIT",
  "code": "plan_limit",
  "feature": "sb_payment",          // betroffenes Flag ODER Limit-Schlüssel
  "currentPlan": "plus",
  "requiredPlan": "pro",            // niedrigster Plan, der freischaltet
  "limit": 150,                     // nur bei Mengen-Limits gesetzt
  "current": 150,                   // aktueller Verbrauch
  "upgradeUrl": "/erzeuger/billing?upgrade=pro&feature=sb_payment"
}
```

```jsonc
// Betriebliche Kapazität (kein Plan-Problem, sondern Hof voll) — sauberer Zero-State
{ "error": "RESERVATION_CAPACITY", "code": "reservation_capacity", "farmId": "…" }
```

> **Pfeiler 4 (RBAC ohne Lücken):** Jeder `plan_limit`-Fehler trägt `requiredPlan` **und** einen **funktionierenden** `upgradeUrl` — kein toter Button, keine Sackgasse. Die UI rendert daraus die Lock-Karte (§6.1).

### 5.3 Beispiel-Guard (Edge, Deno — illustrativ, kein Platzhalter-TODO)

```ts
// app/supabase/functions/_shared/entitlements.ts (gespiegelte Wahrheit der DB-Tabelle)
import { ENTITLEMENTS } from "./entitlements.ts";

export function requireEntitlement(plan: OrgPlan, flag: EntitlementFlag): void {
  if (!ENTITLEMENTS[plan].features[flag]) {
    throw new PlanLimitError({ feature: flag, currentPlan: plan, requiredPlan: lowestPlanWith(flag) });
  }
}

export function requireLimit(plan: OrgPlan, key: LimitKey, current: number): void {
  const limit = ENTITLEMENTS[plan].limits[key];     // -1 = unbegrenzt
  if (limit !== -1 && current >= limit) {
    throw new PlanLimitError({ feature: key, currentPlan: plan, requiredPlan: lowestPlanWithLimitAbove(key, current), limit, current });
  }
}
```

---

## 6 · Upgrade-, Downgrade- & Lifecycle-Pfade

### 6.1 Lock-UI-Vertrag (Pfeiler 4 — kein toter Button)

Jeder Plan-Lock rendert verbindlich:
1. **Was** gesperrt ist (klare deutsche Mikrocopy, kein Reizwort, Editorial-Ton).
2. Der **niedrigste** Plan, der es freischaltet (`requiredPlan`).
3. Ein **funktionierender** Deep-Link `/erzeuger/billing?upgrade=<plan>&feature=<flag>` (aus `upgradeUrl`).

Beispiel-Mikrocopy (SB-Bezahlung für `plus`-Erzeuger):
> „**Sichere SB-Bezahlung am unbemannten Stand** ist ab Plan **Pro** verfügbar. Käufer scannen den QR am Stand und zahlen direkt — sicher, bargeldlos, mit Quittung. **[Auf Pro upgraden →]**"

### 6.2 Upgrade-Pfade

```
demo ──(basis + Hof-Verifizierung)──▶ basis ──▶ plus ──▶ pro ──▶ individuell (Vertrieb/Owner)
                                                        │
SB-USP-Wunsch ──────────────────────────────────────────┴─▶ erfordert pro+ ▶ /erzeuger/billing?upgrade=pro&feature=sb_payment
```

| Von | Nach | Prozess | Wirksamkeit |
|---|---|---|---|
| `demo` → `basis` | Self-Service Stripe-Checkout (+ Hof-Verifizierung für öffentliche Listung) | sofort nach Webhook |
| `basis` → `plus` | Self-Service Stripe-Checkout (Plan-Wechsel) | sofort nach Webhook |
| `plus` → `pro` | Self-Service Stripe-Checkout; SB benötigt zusätzlich Connect-Onboarding (KYC) | sofort nach Webhook; SB aktiv nach Connect-Bestätigung |
| `pro` → `individuell` | Formular „Vertrieb kontaktieren" → Owner/Vertrieb (auditiert, kein Self-Service) | nach manueller Aktivierung (Webhook/Owner) |

- **Upgrade-Flow ohne Reload-Bruch:** Deep-Link → Stripe-Checkout → Webhook aktualisiert `orgs.plan` → Bootstrap liefert neue Entitlements → Surface entsperrt (`ROLE_AND_PERMISSION_MODEL.md` §5.2).
- **`individuell`** ist nie self-service kaufbar → Lock-CTA „Vertrieb kontaktieren", auditiert.

### 6.3 Downgrade & Über-Limit (kein Datenverlust)

- Über-Limit-Daten (z. B. 8 Betriebe bei Downgrade `pro`→`plus` mit Limit 3) werden **nicht gelöscht**, sondern als **„über Plan-Limit, nur lesbar"** markiert (read-only): nicht mehr editierbar, ältere bleiben sichtbar/depublizierbar, bis der Erzeuger reduziert **oder** erneut upgradet.
- **SB-Stände** bei Downgrade unter `pro`: `sb_payment`-Gate wird `false`, neue QR-PaymentIntents werden abgelehnt; **laufende/abgeschlossene** Transaktionen bleiben unangetastet und auswertbar (Belegpflicht Kat. C, `COMPLIANCE_MODEL.md` §4).
- **Auslauf bezahlter Periode:** Fällt `plan_valid_until` in die Vergangenheit (Webhook `subscription.deleted`/`past_due`), greift ein Übergang auf `basis`-Funktionsniveau (nicht `demo`, um öffentliche Listung verifizierter Höfe nicht abrupt zu kappen — `orgs.status='past_due'` mit Hinweisbanner + Zahlungs-CTA). Owner-Kulanz möglich (auditiert).

### 6.4 Lebenszyklus-Hooks (Audit-Pflicht, Namespace `billing.*`)

| Stripe-Event | Wirkung | Audit |
|---|---|---|
| `checkout.session.completed` / `customer.subscription.created` | `orgs.plan` setzen, `plan_valid_until` setzen, `stripe_customer_id` verknüpfen | `billing.subscription.changed`, `entitlement.granted` |
| `customer.subscription.updated` | Plan-Wechsel (Up/Down), Periode aktualisieren | `billing.subscription.changed` |
| `customer.subscription.deleted` | Auslauf → Übergang `basis`/`past_due` (§6.3) | `billing.subscription.cancelled` |
| `invoice.payment_failed` | `orgs.status='past_due'` + Hinweisbanner | `billing.payment_failed` |
| SB: `payment_intent.succeeded` | `sb_payments` succeeded, `platform_fee_cents` verbucht, Quittung | `payment.succeeded`, `payout.transfer` |

> Vollständiger Subscription-Lifecycle: `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant). Stripe-Setup (Products/Prices/Connect/Webhook-Secret): `docs/STRIPE-SETUP.md` (geplant). Diese Datei ist die **Entitlement-Wahrheit**, auf die beide verweisen.

---

## 7 · Datenmodell-Anbindung (was wo lebt)

| Aspekt | Ort der Wahrheit | Bemerkung |
|---|---|---|
| Aktueller Plan einer Org | `orgs.plan` (`org_plan`-Enum) | nur vom Stripe-Webhook schreibbar (`DATABASE_MODEL.md` §4.1, §7 `orgs`-UPDATE-Policy „sensible Felder nur service role"). |
| Bezahlte Periode | `orgs.plan_valid_until` | Webhook-gesetzt; Basis für Auslauf-Logik (§6.3). |
| Limit-/Feature-Schwellen | `plan_entitlements` (DB) ⇄ `_shared/entitlements.ts` | **eine** Quelle, datengetrieben; TS-Konstante ist exakte Spiegelung (Test erzwingt Gleichheit, §8). |
| SB-Gebühr je Transaktion | `sb_payments.platform_fee_cents` | serverseitig errechnet (§4.2); nie aus Client. |
| Verbrauch (für Limits/Usage) | Count über `farms`/`products`/`org_members`/`reservations` + `billing_usage` (Monatszähler für `season_push`/`commercial_export`) | Bootstrap aggregiert `usage` für die UI. |
| Stripe-Verknüpfung | `orgs.stripe_customer_id` (Abo), `orgs.stripe_connect_id` (SB-Auszahlung) | UNIQUE; KYC bei Stripe. |
| Audit jeder Plan-/Geld-Mutation | `audit_log` (append-only) | Namespace `billing.*` / `payment.*` (`COMPLIANCE_MODEL.md` §10.1). |

> **Hinweis (Doku-Konsistenz):** `ROLE_AND_PERMISSION_MODEL.md` §3.2 nennt eine Tabelle `subscriptions` als Webhook-Schreibziel. In diesem Modell ist die **minimal-tragende Wahrheit** `orgs.plan` + `plan_valid_until` (Spiegel der Stripe-Subscription); eine separate `subscriptions`-Historientabelle ist additive Erweiterung in WAVE_09 (Rechnungs-/Periodenhistorie) und ändert nichts an der Entitlement-Auflösung. Bei Einführung: additive Migration, keine Doppel-Wahrheit (Webhook bleibt einzige Schreibquelle).

---

## 8 · Verifikations-Checkliste (Commercial-/Entitlement-Gate — WAVE_09)

- [ ] `org_plan`-Enum-Werte = exakt {`demo`,`basis`,`plus`,`pro`,`individuell`}; kein Fremdwert.
- [ ] `plan_entitlements` (DB) und `_shared/entitlements.ts` sind **wertgleich** (Test schlägt fehl bei Drift — keine zweite Wahrheit).
- [ ] Limit-Schwellen dieser Datei = `ROLE_AND_PERMISSION_MODEL.md` §5.1 (Konsistenz-Test über beide Tabellen).
- [ ] Jede limitierte Mutation (`farm-create`, `product-upsert`, `org-member-invite`, `reservation-create`, `season-push`, `sb-payment-create`) prüft **serverseitig** Plan/Limit **vor** dem Schreiben → `403 plan_limit` / `409 reservation_capacity`, nie 500.
- [ ] Kein Schwellwert hartkodiert in einer React-Komponente (Grep-Gate auf Magic Numbers).
- [ ] `orgs.plan`/`plan_valid_until` nur über Stripe-Webhook schreibbar (RLS verbietet client-UPDATE; Cross-Org-Negativtest).
- [ ] SB-Gebühr serverseitig errechnet (Tamper-Test: manipulierter Client-Betrag wird ignoriert/abgelehnt).
- [ ] Jeder Plan-Lock liefert `requiredPlan` + funktionierenden `upgradeUrl`; UI rendert Lock-Karte ohne toten Button (Pfeiler 4).
- [ ] DSGVO-Eigen-Export/-Löschung/Audit-Einsicht **nicht** plan-gegated (planfrei, `COMPLIANCE_MODEL.md` §2).
- [ ] Käufer-Welt komplett planfrei (kein Lock auf Entdecken/Reservieren).
- [ ] Downgrade verliert keine Daten (Über-Limit = read-only, Test); SB-Bestand bei Downgrade auswertbar (Kat. C).
- [ ] Jede Plan-/Geld-Mutation auditiert (`billing.*`/`payment.*`, `reason` bei Owner-Kulanz/Preisänderung).
- [ ] Webhook idempotent (`UNIQUE(stripe_event_id)`); Replay verändert Entitlements nicht doppelt.

---

## 9 · Abgrenzung zum VMS-Erbe (nicht übernehmen)

Aus dem strukturellen Blueprint (TempConnect) werden folgende Plan-Begriffe **nicht** übernommen und sind durch Hof-Äquivalente ersetzt:

| VMS-Begriff (Blueprint) | Status | Hof-Äquivalent in dieser Datei |
|---|---|---|
| „Requests senden/empfangen", „aktive Listings" (Vendor/Requisition) | ➖ entfällt | „Betriebe", „Produkte je Betrieb", „aktive Reservierungen" |
| „Notdienst-Einsätze", „Notfall-Staffing", „Worker-Modul", „Timesheets" | ➖ entfällt | — (zeitarbeitsspezifisch; kein Pendant) |
| „Rate Card Management", „Spend Analytics", „Advanced Matching", „Inter-Agency Matching" | ➖ entfällt | „SB-Auswertung", „Premium-Listing", „Saison-Push" |
| „Capacity Exchange / Capacity Multi-Location" | ➖ entfällt | „Mehrere Betriebe (`multi_farm`)" |
| `individuell`-Unterklassen nach **Mitarbeiterzahl** (S/M/L/Enterprise) | ➖ entfällt | `individuell` einstufig (Vertriebsvereinbarung); kein Mitarbeiter-Auto-Tiering (für Hof-Domäne unpassend) |
| „Pilot-Override" (alle Enterprise-Features) | ⚠ optional | Owner-seitiger Kulanz-/Beta-Override möglich (auditiert), **nicht** als öffentliches Plan-Versprechen |
| `executive_control_access`/`admin_panel` als Maturity-Gate | ➖ entfällt | Plattform-Steuerung ist Owner/Staff-Welt (RBAC), kein Erzeuger-Plan-Feature |

> **Kanon-Verbot eingehalten:** kein Zeitarbeits-/Vendor-Pool-/Requisition-Vokabular; konsequent Hof-Domäne (`CLAUDE.md`, „NIEMALS TempConnect/VMS-Begriffe").

---

*Letzte Aktualisierung: Phase 1 · WAVE_09 (Vorzieh-Spezifikation) · 2026-06-19*
*Zuständig: Claude (Commercial + payment-engineer) · Freigabe: Owner (Preise/Geld)*
*Querverweise: `docs/ROLE_AND_PERMISSION_MODEL.md` §5 · `docs/DATABASE_MODEL.md` §2/§4.1/§4.7 · `docs/COMPLIANCE_MODEL.md` §2/§4/§10 · `docs/PRICING.md` (geplant) · `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant) · `docs/STRIPE-SETUP.md` (geplant) · `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (geplant)*
*Hinweis: Preise stehen unter Owner-Freigabe; wirksam sind die Stripe-`price`-IDs, nicht dieses Dokument.*
