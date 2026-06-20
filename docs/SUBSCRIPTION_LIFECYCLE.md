# SUBSCRIPTION_LIFECYCLE — LokaleBauernConnect

> **Die kanonische Wahrheit über den Abo-Lebenszyklus der Erzeuger** — von der ersten Demo (`lead`) über den aktiven Betrieb (`active`), die Pausierung (`paused`), den Zahlungsverzug (`overdue`) bis zur Kündigung (`cancelled`). Wer welchen Übergang auslöst, welches Stripe-Event ihn spiegelt, welche Entitlements er schaltet und wie das Dunning (Mahnwesen) abläuft, ist hier verbindlich definiert. **Was hier nicht steht, ist verboten** (deny-by-default — auch für Status).
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Geltungsbereich:** Nur das **Erzeuger-Abo** (org-gebundenes Funktionspaket, Stripe-Subscription). Die **SB-Bezahlung** (Einzeltransaktion am Stand, USP) hat einen **eigenen** Lebenszyklus und ist in `CORE_BUSINESS_STATE_MACHINES.md §4` (`sb_payments`) sowie `spezialmodule/SB_BEZAHLUNG_USP.md` beschrieben — sie wird hier nur dort berührt, wo das Abo ihre Freischaltung steuert (`pro`+).
>
> **Käufer haben kein Abo.** Plan-/Abo-Logik betrifft ausschließlich `profiles.role = 'erzeuger'` (org-gebunden). Käufer/Gäste zahlen nichts und unterliegen keinem Lock (`PLANS_AND_LIMITS.md §0`).
>
> **Bezug:** `PLANS_AND_LIMITS.md` (Entitlement-Wahrheit, §6.4 Lifecycle-Hooks — diese Datei ist deren ausführlicher Lebenszyklus) · `ROLE_AND_PERMISSION_MODEL.md §3.2/§5` (Rollen, `subscriptions`/`orgs`-Schreibrechte) · `DATABASE_MODEL.md §2/§4.1` (`org_plan`-Enum, `orgs.plan`/`plan_valid_until`/`status`/`stripe_customer_id`) · `CORE_BUSINESS_STATE_MACHINES.md` (Status-Invarianten, Notation) · `COMPLIANCE_MODEL.md §3/§4/§10` (Aufbewahrung, Audit, Lösch-Blocker `ACTIVE_SUBSCRIPTION`) · `ENTERPRISE_ARCHITECTURE.md §6.3` (Degradationsstufen) · `CLAUDE.md` (7 Produktionspfeiler, Stop-/Verbots-Regeln) · `AGENTS.md` (EIN idempotenter, signaturgeprüfter Webhook) · geplant: `docs/STRIPE-SETUP.md`, `docs/PRICING.md`, `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`.
>
> **Status:** Normativ (Lebenszyklus-Wahrheit für das Erzeuger-Abo). **Stand:** 2026-06-19 · Phase 1 · WAVE_09 (Vorzieh-Spezifikation). Zuständig: Claude (Commercial + payment-engineer). **Freigabe:** Owner (Preise/Geld/Dunning-Fristen = Owner-Entscheidung, `CLAUDE.md`).

---

## 0 · Grundprinzipien (vor den Diagrammen — nicht verhandelbar)

| Prinzip | Umsetzung |
|---|---|
| **Stripe ist die Wahrheit, EIN Webhook schreibt sie** | Der Abo-Status (`orgs.plan`, `orgs.plan_valid_until`, `orgs.status`, `subscriptions.*`) wird **ausschließlich** vom einen signaturgeprüften, idempotenten Stripe-Webhook-Handler (`stripe-webhook`, Edge Function, service role) gesetzt. Kein clientseitiger Status-/Plan-Wechsel — niemals (`AGENTS.md` harte Regel · `PLANS_AND_LIMITS.md §0`). |
| **Server führend, Client spiegelt** | Übergänge entscheidet der Server (Webhook / Edge Guard / RLS). Das Frontend liest den Endzustand über `bootstrap` und **spiegelt** ihn (Banner, Lock-Karte, CTA) — es setzt nie selbst einen Übergang. |
| **Deny-by-default für Status** | Jeder Übergang, der nicht in §3.2 steht, ist ungültig → serverseitig `409 Conflict` (illegaler Übergang) bzw. `403` (fehlende Berechtigung). Kein stiller Status-Wechsel (Pfeiler: „kein stiller Fehler"). |
| **Idempotenz** | Jeder Webhook-Übergang ist gegen die Stripe-Event-`id` idempotent (`UNIQUE(stripe_event_id)`). Doppelzustellung = `200` no-op, kein Doppel-Entitlement, keine Doppelbuchung (`ENTERPRISE_ARCHITECTURE.md §6.3 #4`). |
| **Org-Boundary** | Jeder Übergang ist `org_id`-gebunden; ein Webhook-Event wird über `stripe_customer_id` genau **einer** Org zugeordnet. Fremd-Org = kein Zugriff (Pfeiler 1, RLS). |
| **Audit-Pflicht** | Jeder Abo-Übergang erzeugt einen unabschaltbaren `audit_log`-Eintrag im Namespace `billing.*` (wer/was/wann/von→nach/Event-ID; `reason` Pflicht bei Owner-Kulanz, manueller Kündigung, Preisänderung) (Pfeiler 5 · `COMPLIANCE_MODEL.md §10`). |
| **Downgrade verliert nie Daten** | Über-Limit-Daten werden **read-only** markiert, nie gelöscht (`PLANS_AND_LIMITS.md §6.3`). Auslauf kappt nie abrupt verifizierte öffentliche Höfe (Übergang auf `basis`-Niveau, nicht `demo`). |
| **Sicherheit & DSGVO planunabhängig** | RLS, MFA, Audit, DSGVO-Eigen-Export/-Löschung gelten in **jedem** Abo-Zustand (auch `overdue`/`cancelled`) — nie hinter einem Lock (`PLANS_AND_LIMITS.md §0` · `COMPLIANCE_MODEL.md §2`). |
| **Vermittler bleibt Vermittler** | Das Abo verkauft Plattform-Funktionen an den Erzeuger — es macht die Plattform nie zum Verkäufer/Berater der Lebensmittel. Disclaimer durchgängig (`ROLE_AND_PERMISSION_MODEL.md §0`). |

> **Notation** (wie `CORE_BUSINESS_STATE_MACHINES.md §0.2`): Zustand `[zustand]` (intern, snake_case, EN-stabil) — UI-Label in „Anführungszeichen" (DE). Übergang `from --[event / akteur]--> to`. **▶** initial, **⏹** terminal. **Guard** = Vorbedingung. **Effekt** = Seiteneffekt (Entitlement, Banner, Benachrichtigung, Audit). Status-Schlüssel werden **EN/snake_case** persistiert, UI-Labels **DE** (i18n-stabil).

---

## 1 · Die fünf Lebenszyklus-Zustände

Der vom Owner vorgegebene Lebenszyklus lautet `lead → active → paused → overdue → cancelled`. Diese fünf Schlüssel sind der **fachliche Lebenszyklus des Abos** und leben in der additiven Historientabelle `subscriptions.lifecycle_state` (§5). Sie werden **deterministisch** auf die bereits kanonischen Felder `orgs.plan` (`org_plan`-Enum) und `orgs.status` (`active`/`past_due`/`suspended`) projiziert — es entsteht **keine** zweite Wahrheit (§5.2 Konsistenz-Invariante).

| Schlüssel | UI-Label (Erzeuger) | Art | `orgs.plan` | `orgs.status` | Bedeutung |
|---|---|---|---|---|---|
| `lead` | „Vorschau / Demo" | ▶ initial | `demo` | `active` | Erzeuger hat einen Account/Betrieb angelegt, aber **noch kein bezahltes Abo**. Spielwiese: 1 Betrieb + 5 Produkte in der Vorschau, **nicht** öffentlich gelistet, **keine** Reservierungs-Annahme (`PLANS_AND_LIMITS.md §2`). |
| `active` | „Aktiv" | regulär (Erfolg) | `basis` \| `plus` \| `pro` \| `individuell` | `active` | Bezahltes Abo läuft, Zahlung aktuell. Volle Entitlements des gebuchten Plans; öffentliche Listung (nach Hof-Verifizierung) und Reservierungs-Eingang frei. |
| `paused` | „Pausiert" | regulär (gewollt) | letzter bezahlter Plan (eingefroren) | `active` | Vom Erzeuger **gewollte** Unterbrechung (Saisonpause: Winterruhe, Ernteende). Abrechnung pausiert (Stripe Subscription `pause_collection`). Betrieb auf **eingeschränkte Sichtbarkeit** (depubliziert / „Pausiert"-Badge), keine neuen Reservierungen. **Kein** Mahnfall. |
| `overdue` | „Zahlung offen" | Risiko (Dunning) | letzter bezahlter Plan (vorläufig erhalten) | `past_due` | Eine fällige Abo-Rechnung ist **fehlgeschlagen**; Smart-Retry-/Mahnphase läuft (§6). Funktionen vorläufig **erhalten** (Grace), Hinweisbanner + Zahlungs-CTA. Auflösung: Zahlung repariert → `active`, oder Mahnphase erschöpft → `cancelled`/Suspendierung. |
| `cancelled` | „Gekündigt" | ⏹ terminal | Übergang auf `basis`-Funktionsniveau (nicht `demo`, §4.3) | `active` (Basis-Niveau) **oder** `suspended` (bei Hard-Cancel/Missbrauch) | Abo beendet — ordentlich (Kündigung zum Periodenende) oder unfreiwillig (Dunning erschöpft). Bezahlte Funktionen aus; Daten bleiben erhalten (read-only über Limit), Re-Abschluss jederzeit möglich (= **neue** Subscription, kein Rück-Mutieren). |

> **Warum `cancelled` nicht hart auf `demo` fällt:** Ein zuvor verifizierter, öffentlich gelisteter Hof würde durch einen abrupten Sturz auf `demo` aus dem Finder verschwinden und Käufer-Vertrauen zerstören. Der Auslauf landet daher auf **`basis`-Funktionsniveau** (öffentliche Listung bleibt, Premium-/SB-Funktionen fallen weg) — bei ordentlicher Kündigung sogar erst zum Ende der bezahlten Periode. Echte Suspendierung (`orgs.status='suspended'`, aus Finder entfernt) ist eine **separate Betriebs-/Missbrauchs-Entscheidung** (Phase 3, Owner/Staff), nicht der Normal-Auslauf (vgl. `CORE_BUSINESS_STATE_MACHINES.md §3.2` Suspendierungs-Hinweis).

### 1.1 Mapping auf den Imperium-Kanon (keine zweite Wahrheit)

| Lebenszyklus (Prompt) | `org_plan` | `orgs.status` | Stripe-`subscription.status` (Quelle) |
|---|---|---|---|
| `lead` | `demo` | `active` | — (keine Subscription / `incomplete`) |
| `active` | bezahlt | `active` | `active` \| `trialing` |
| `paused` | bezahlt (eingefroren) | `active` | `active` + `pause_collection` gesetzt |
| `overdue` | bezahlt (Grace) | `past_due` | `past_due` \| `unpaid` |
| `cancelled` | `basis`-Niveau / ggf. `suspended` | `active` / `suspended` | `canceled` \| `incomplete_expired` |

> Die Spalte `orgs.status` (`active`/`past_due`/`suspended`) ist DB-Kanon (`DATABASE_MODEL.md §4.1`). `lifecycle_state` ist die **feinere fachliche Sicht** (z. B. unterscheidet `lead` vs. `cancelled`, die beide `orgs.status='active'` haben können). Beide werden vom **selben** Webhook in **einer** Transaktion gesetzt → kein Drift.

---

## 2 · Akteure & Berechtigungen

| Akteur | Darf auslösen | Mechanismus |
|---|---|---|
| **Erzeuger (Org-Owner)** | Abo buchen/upgraden/downgraden, pausieren/fortsetzen, ordentlich kündigen | Stripe-Checkout / **Stripe Customer Portal** (gehostet) → Stripe sendet Event → Webhook schreibt. Self-Service, kein direkter DB-Schreibzugriff. |
| **System (Stripe-Webhook)** | Alle tatsächlichen Statuswechsel (`active`/`overdue`/`paused`/`cancelled`) persistieren | EIN signaturgeprüfter, idempotenter Handler `stripe-webhook` (service role). **Einzige** Schreibquelle für `orgs.plan`/`plan_valid_until`/`status` und `subscriptions.*`. |
| **System (Edge-Cron)** | Grace-Ablauf prüfen, Dunning-Eskalation auslösen, Auslauf-Downgrade anwenden | `billing-lifecycle-cron` (geplant, `actor=system`, voll auditiert) — reagiert auf `plan_valid_until` + Dunning-Timer, ruft Stripe nur ab, schreibt Endzustand. |
| **Owner / Staff** | Kulanz (Reaktivierung trotz Verzug), manuelle Kündigung/Suspendierung, Preisänderung, `individuell`-Aktivierung | Owner/Staff-Konsole (Phase 3): **Confirm + Reason (Pflicht) + Audit**. Wirkt über Stripe-API bzw. dokumentierten Override (`billing.*`-Audit, `PLANS_AND_LIMITS.md §9` „Kulanz-Override"). |

> **Erzeuger schreiben nie direkt.** `orgs.plan`/`status` sind per RLS für den Erzeuger **lese-, nicht schreibbar** (`DATABASE_MODEL.md §7` orgs-UPDATE: „sensible Felder `plan/stripe_*` nur service role"). Jeder gewünschte Wechsel läuft über Stripe → Webhook.

---

## 3 · Zustandsmaschine

### 3.1 Diagramm (textuell)

```
  ▶ Account/Betrieb anlegen
 ───────────────────────────► [lead] ──(Checkout bezahlt / sub.created)──► [active]
   (demo, Vorschau)              │                                            │  ▲  │
                                 │                                            │  │  │ Erzeuger: kündigen
   (Checkout abgebrochen,        │                       Erzeuger: pausieren  │  │  │ (zum Periodenende)
    sub.incomplete_expired)      │                       (pause_collection)   ▼  │  ▼
                                 │                                        [paused]│ ┌──────────────┐
                                 │                                            │  │ │ ordentliche  │
                                 │           Erzeuger: fortsetzen (resume) ───┘  │ │ Kündigung    │
                                 │                                               │ │ vorgemerkt   │
                                 │                                               │ │(active bis   │
                                 │   invoice.payment_failed                      │ │ Periodenende)│
                                 │           (1. Versuch scheitert)              │ └──────┬───────┘
                                 │                       ┌───────────────────────┘        │
                                 │                       ▼                                 │
                                 │                   [overdue] ──Zahlung repariert────► [active]
                                 │                  (past_due,  (invoice.paid /              │
                                 │                   Dunning §6) payment_succeeded)          │
                                 │                       │                                   │
                                 │   Smart-Retries +     │  Mahnfristen erschöpft            │
                                 │   Mahnstufen          │  (sub.deleted / unpaid)           │
                                 │   erschöpft           ▼                                   ▼
                                 └───────────────────► [cancelled] ⏹ ◄───────────────────────┘
                                                     (basis-Niveau; Daten read-only;
                                                      Re-Abschluss = NEUE Subscription)

  Re-Abschluss aus [cancelled]/[lead]: Checkout/Portal ──► NEUE Subscription ──► [active]
  (kein Rück-Mutieren eines terminalen Zustands — neues Objekt, vgl. CORE_BUSINESS_STATE_MACHINES §0.1.7)
```

### 3.2 Erlaubte Übergänge (deny-by-default)

| # | from | event (Quelle) | to | Akteur | Guard (Vorbedingung) | Effekt |
|---|---|---|---|---|---|---|
| **S1** | ▶ — | Account-/Betriebsanlage | `lead` | Erzeuger (Signup) | Profil `role='erzeuger'` + Org existiert | `orgs.plan='demo'`, `status='active'`; Audit `billing.subscription.lead`; Onboarding-CTA „Plan wählen" |
| **S2** | `lead` | `checkout.session.completed` + `customer.subscription.created` (**Webhook**) | `active` | System (Webhook) | Signatur gültig; `stripe_customer_id` der Org zuordenbar; `price` ∈ erlaubte Plan-Prices | `orgs.plan` = gebuchter Plan, `plan_valid_until` = Periodenende, `stripe_customer_id` verknüpft; Entitlements **gewährt** (§4.1); Audit `billing.subscription.created` + `entitlement.granted` |
| **S3** | `active` | `customer.subscription.updated` (Up-/Downgrade) (**Webhook**) | `active` | System (Webhook) | Signatur; neuer `price` gültig | `orgs.plan` neu setzen, `plan_valid_until` aktualisieren; bei Upgrade sofort mehr Entitlements, bei Downgrade Über-Limit→read-only (§4.2); Audit `billing.subscription.changed` |
| **S4** | `active` | `pause_collection` gesetzt → `customer.subscription.updated` (**Webhook**) | `paused` | Erzeuger via Portal → System (Webhook) | Signatur; keine offene fehlgeschlagene Rechnung (Pause aus `overdue` ist verboten — erst zahlen) | Plan eingefroren; Betrieb depubliziert/„Pausiert"-Badge; Reservierungs-Eingang aus; Audit `billing.subscription.paused` |
| **S5** | `paused` | `pause_collection` entfernt → `customer.subscription.updated` (**Webhook**) | `active` | Erzeuger via Portal → System (Webhook) | Signatur; Zahlungsmittel gültig | Plan re-aktiviert; Re-Publikation (sofern Hof verifiziert); Entitlements wiederhergestellt; Audit `billing.subscription.resumed` |
| **S6** | `active` | `invoice.payment_failed` (1. Fehlschlag) (**Webhook**) | `overdue` | System (Webhook) | Signatur; Rechnung gehört zur Abo-Subscription der Org | `orgs.status='past_due'`; Grace-Timer starten; Funktionen **vorläufig erhalten**; Hinweisbanner + Zahlungs-CTA; Audit `billing.payment_failed` |
| **S7** | `overdue` | `invoice.paid` / `invoice.payment_succeeded` (**Webhook**) | `active` | System (Webhook) | Signatur; offene Rechnung beglichen | `orgs.status='active'`; Banner entfernen; `plan_valid_until` verlängern; Audit `billing.payment_recovered` |
| **S8** | `overdue` | `customer.subscription.deleted` / `…unpaid` nach Mahn-Erschöpfung (**Webhook**) **oder** Cron-Eskalation | `cancelled` | System (Webhook/Cron) | Smart-Retries + alle Mahnstufen erschöpft (§6) **oder** Stripe meldet `unpaid`/`canceled` | Übergang auf `basis`-Funktionsniveau; Über-Limit→read-only; Banner „Abo beendet"; Audit `billing.subscription.cancelled` (Grund=dunning_exhausted) |
| **S9** | `active` / `paused` | Erzeuger kündigt (`cancel_at_period_end=true`) → `customer.subscription.updated` (**Webhook**) | `active` *(Kündigung vorgemerkt)* | Erzeuger via Portal → System (Webhook) | Signatur | `subscriptions.cancel_at_period_end=true`; Funktionen **bis Periodenende erhalten**; UI „Läuft am <Datum> aus"; Audit `billing.subscription.cancel_scheduled` |
| **S10** | `active` *(Kündigung vorgemerkt)* | `customer.subscription.deleted` zum Periodenende (**Webhook**) | `cancelled` | System (Webhook) | Periodenende erreicht | Übergang auf `basis`-Niveau; Audit `billing.subscription.cancelled` (Grund=voluntary) |
| **S11** | `cancelled` / `lead` | neuer `checkout.session.completed` + `subscription.created` (**Webhook**) | `active` | Erzeuger → System (Webhook) | Signatur; **neue** Stripe-Subscription | Re-Abschluss als **neues** Abo-Objekt (Historie bleibt); Entitlements neu gewährt; Über-Limit-Daten wieder editierbar; Audit `billing.subscription.created` (Grund=reactivation) |
| **S12** | `overdue` / `cancelled` | Owner/Staff-Kulanz (Reaktivierung) | `active` | Owner/Staff (Konsole) | **Confirm + Reason Pflicht**; auditiert | Plan via Stripe/Override re-aktivieren; Audit `billing.owner_override` (reason) — kein öffentliches Plan-Versprechen (`PLANS_AND_LIMITS.md §9`) |
| **S13** | beliebig (außer terminal) | Missbrauch/Verstoß → Suspendierung | `cancelled` *(suspended)* | Owner/Staff (Konsole) | **Confirm + Reason Pflicht** | `orgs.status='suspended'`; Hof aus Finder entfernt; alle Entitlements aus; Audit `billing.org_suspended` (reason) — Betriebs-/Missbrauchs-Domäne (Phase 3), nicht Normal-Auslauf |

> **Nicht erlaubt (Beispiele, `409`/`403`):** `paused → overdue` (pausierte Abos rechnen nicht ab), `overdue → paused` (erst zahlen, dann pausieren), clientseitiges Setzen von `orgs.plan` (`403`, nur service role), `cancelled → active` durch Rück-Mutation derselben Subscription (verboten — Re-Abschluss = neue Subscription, S11), Übergang ausgelöst durch ein Webhook-Event mit **ungültiger Signatur** (Event wird verworfen, `400`, kein Statuswechsel).

### 3.3 Stripe-Subscription-Status → Lebenszyklus (Webhook-Mapping, vollständig)

Stripe ist die Wahrheit; der Webhook übersetzt deterministisch. Diese Tabelle ist der **vollständige** Mapping-Vertrag des Handlers (`stripe-webhook`).

| Stripe-Event | Stripe-`subscription.status` / Kontext | Übergang | Setzt `orgs.plan` | Setzt `orgs.status` | Audit-Action |
|---|---|---|---|---|---|
| `checkout.session.completed` | (Abo-Checkout abgeschlossen) | →`active` (S2) | gebuchter Plan | `active` | `billing.subscription.created` |
| `customer.subscription.created` | `active` / `trialing` | →`active` (S2) | gebuchter Plan | `active` | `billing.subscription.created` |
| `customer.subscription.updated` | `active`, neuer `price` | →`active` (S3) | neuer Plan | `active` | `billing.subscription.changed` |
| `customer.subscription.updated` | `pause_collection` ≠ null | →`paused` (S4) | unverändert | `active` | `billing.subscription.paused` |
| `customer.subscription.updated` | `pause_collection` = null (zuvor pausiert) | →`active` (S5) | unverändert | `active` | `billing.subscription.resumed` |
| `customer.subscription.updated` | `cancel_at_period_end=true` | →`active` *(vorgemerkt)* (S9) | unverändert | `active` | `billing.subscription.cancel_scheduled` |
| `customer.subscription.updated` | `status='past_due'` | →`overdue` (S6) | unverändert | `past_due` | `billing.payment_failed` |
| `invoice.payment_failed` | (Abo-Rechnung) | →`overdue` (S6) | unverändert | `past_due` | `billing.payment_failed` |
| `invoice.paid` / `invoice.payment_succeeded` | (offene Rechnung beglichen) | →`active` (S7) | unverändert | `active` | `billing.payment_recovered` |
| `customer.subscription.updated` | `status='unpaid'` (Mahnung erschöpft) | →`cancelled` (S8) | `basis`-Niveau | `active` (Basis) | `billing.subscription.cancelled` |
| `customer.subscription.deleted` | `status='canceled'` | →`cancelled` (S10/S8) | `basis`-Niveau | `active` (Basis) | `billing.subscription.cancelled` |
| `customer.subscription.created` | `status='incomplete'` (Erstzahlung offen) | bleibt `lead`/„unvollständig" | `demo` | `active` | `billing.subscription.incomplete` |
| `customer.subscription.updated` | `status='incomplete_expired'` | bleibt `lead` | `demo` | `active` | `billing.subscription.incomplete_expired` |
| `customer.subscription.trial_will_end` | (3 Tage vor Trial-Ende, falls Trial aktiv) | kein Übergang | — | — | `billing.trial_will_end` (+ Erinnerungs-Benachrichtigung) |
| beliebig, Signatur ungültig | — | **kein** Übergang | — | — | `400`, Event verworfen, Security-Log (kein PII) |
| beliebig, `stripe_event_id` bereits verarbeitet | — | **kein** Übergang (no-op) | — | — | `200` idempotent |

> **Reihenfolge-Robustheit:** Stripe garantiert keine Event-Reihenfolge. Der Handler ist **zustandskonvergent**: Er liest bei jedem relevanten Event die **aktuelle** Subscription (`stripe.subscriptions.retrieve`) und setzt den daraus abgeleiteten Soll-Zustand (statt blind Deltas anzuwenden). So führt auch ein verspätet/doppelt zugestelltes Event nicht zu Drift (`ENTERPRISE_ARCHITECTURE.md §6.3` Reconciliation).

---

## 4 · Entitlement-Wirkung je Zustand

Was ein Zustand **schaltet**, ist die Entitlement-Matrix aus `PLANS_AND_LIMITS.md §3` — diese Datei legt nur fest, **welcher Plan** in welchem Zustand wirksam ist. Die maschinelle Wahrheit bleibt `plan_entitlements` (DB) ⇄ `app/supabase/functions/_shared/entitlements.ts` (gespiegelte TS-Konstante, Drift-Test erzwungen). **Eine** Quelle, datengetrieben, kein Hardcode in der UI.

### 4.1 Entitlement je Lebenszyklus-Zustand

| Zustand | Wirksamer Plan | Öffentl. Listung | Reservierungs-Eingang | Premium/Saison-Push | SB-Bezahlung (`pro`+) | Anmerkung |
|---|---|---|---|---|---|---|
| `lead` | `demo` | — (nur Vorschau) | — | — | — | Spielwiese; Upgrade-CTA überall sichtbar |
| `active` | gebuchter Plan | ✓ (nach Verifizierung) | ✓ (ab `basis`) | gemäß Plan | ✓ nur `pro`/`individuell` **und** Connect-KYC ok | Voller Plan-Umfang |
| `paused` | eingefroren | depubliziert / „Pausiert" | — (keine neuen) | — (ruht) | — (QR inaktiv, kein toter Pfad) | Bestehende offene Reservierungen laufen aus/werden abgewickelt; SB-Historie bleibt auswertbar |
| `overdue` | letzter Plan (Grace) | ✓ (erhalten, Banner) | ✓ (erhalten) | ✓ (erhalten) | ✓ (erhalten, mit Warnhinweis) | Funktionen **bewusst erhalten** während Dunning → maximale Recovery-Chance, kein Käufer-Schaden |
| `cancelled` | `basis`-Niveau (oder `suspended`→nichts) | ✓ bei Basis-Niveau / — bei suspended | ✓ (Basis) / — | — | — (Gate `false`; laufende/abgeschlossene Transaktionen unangetastet & auswertbar, Belegpflicht Kat. C) | Daten read-only über Limit; Re-Abschluss reaktiviert |

> **`overdue` erhält bewusst die Funktionen:** Würde ein erster Fehlschlag (oft nur abgelaufene Karte) sofort den Hof abschalten, schadete das Käufern und der Recovery-Quote. Daher: Grace mit Banner statt Sofort-Abschaltung. Erst nach **erschöpfter** Mahnphase (§6) fällt der Hof auf `basis`-Niveau. SB-Bezahlung bleibt im Grace aktiv, **weil** Geld direkt an den Hof fließt (Connect) — ein offener Abo-Betrag der Plattform rechtfertigt keinen Stopp des Käufer-Geldflusses zum Hof; er wird über die SB-Gebühr/Mahnung getrennt verfolgt.

### 4.2 Downgrade & Über-Limit (kein Datenverlust — `PLANS_AND_LIMITS.md §6.3`)

- Über-Limit-Daten (z. B. 8 Betriebe nach `pro→plus`, Limit 3) werden **nicht gelöscht**, sondern **„über Plan-Limit, nur lesbar"** markiert: nicht editierbar/neu anlegbar, ältere sichtbar/depublizierbar, bis der Erzeuger reduziert **oder** erneut upgradet.
- **SB-Stände** bei Downgrade unter `pro`: `sb_payment`-Gate → `false`; neue QR-PaymentIntents werden mit `403 plan_limit` abgelehnt; **laufende/abgeschlossene** `sb_payments` bleiben unangetastet und auswertbar (Kat. C, 10 Jahre, `COMPLIANCE_MODEL.md §4`).
- **Premium-Listing/Saison-Push** fallen bei Downgrade sofort weg (Feature-Gate `false`); bereits versandte Pushes bleiben in der Historie.

### 4.3 Auslauf-Regel (warum `basis`, nicht `demo`)

Fällt `plan_valid_until` in die Vergangenheit ohne Recovery (S8/S10), greift der Übergang auf **`basis`-Funktionsniveau** statt `demo`:
- Verifizierte, öffentlich gelistete Höfe bleiben im Finder sichtbar (kein abrupter Käufer-Vertrauensbruch).
- Bezahl-/Premium-Features (`plus`/`pro`-Flags, SB-Bezahlung) fallen weg.
- Owner-Kulanz (`subscriptions`/Override, S12) kann den vollen Plan auditiert verlängern.
- Nur echte **Suspendierung** (Missbrauch, S13, `orgs.status='suspended'`) entfernt den Hof aus dem Finder.

---

## 5 · Datenmodell-Anbindung (`subscriptions` — additive WAVE_09-Tabelle)

`PLANS_AND_LIMITS.md §7` hält fest: die **minimal-tragende Wahrheit** ist `orgs.plan` + `plan_valid_until` + `orgs.status`. Für Lebenszyklus-Feinheiten (Periodenhistorie, `cancel_at_period_end`, Pause-Zeitraum, Mahnstufe, Rechnungsbezug) führt WAVE_09 **additiv** eine Historientabelle `subscriptions` ein — **ohne** zweite Wahrheit (Webhook bleibt einzige Schreibquelle, `org_id`-gebunden, RLS).

### 5.1 Tabelle `subscriptions` (Soll, additiv — Migration `0010_subscriptions.sql`)

| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` | |
| `org_id` | UUID | NOT NULL, FK → `orgs(id)` ON DELETE RESTRICT | Mandant (1 aktive Subscription je Org) |
| `stripe_subscription_id` | TEXT | UNIQUE, NULL | Stripe-Subscription-Anker |
| `stripe_customer_id` | TEXT | NOT NULL | = `orgs.stripe_customer_id` (Konsistenz-Trigger) |
| `plan` | `org_plan` | NOT NULL | gebuchter Plan (Spiegel von `orgs.plan`, vom Webhook gehalten) |
| `lifecycle_state` | TEXT | NOT NULL, CHECK in (`lead`,`active`,`paused`,`overdue`,`cancelled`) | fachlicher Lebenszyklus (§1) |
| `stripe_status` | TEXT | NULL | roher Stripe-`subscription.status` (Audit/Reconciliation) |
| `current_period_start` | TIMESTAMPTZ | NULL | bezahlte Periode (Start) |
| `current_period_end` | TIMESTAMPTZ | NULL | = `orgs.plan_valid_until` (Konsistenz) |
| `cancel_at_period_end` | BOOLEAN | NOT NULL DEFAULT false | ordentliche Kündigung vorgemerkt (S9) |
| `paused_at` | TIMESTAMPTZ | NULL | Beginn der Pause (S4) |
| `dunning_stage` | SMALLINT | NOT NULL DEFAULT 0, CHECK 0–4 | aktuelle Mahnstufe (§6); 0 = kein Verzug |
| `dunning_started_at` | TIMESTAMPTZ | NULL | Start des Verzugs (Grace-Timer-Basis) |
| `grace_until` | TIMESTAMPTZ | NULL | Ende der Grace-/Mahnfrist (§6) — danach Auslauf |
| `cancellation_reason` | TEXT | NULL | `voluntary` \| `dunning_exhausted` \| `owner_action` (Pflicht bei manueller/Owner-Kündigung) |
| `stripe_event_id` | TEXT | UNIQUE, NULL | letztes verarbeitetes Event (Idempotenz-Replay-Schutz) |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | Kanon (Trigger `set_updated_at`) | |

**Invarianten:**
- Partieller Unique-Index `UNIQUE (org_id) WHERE deleted_at IS NULL` → höchstens **eine** lebende Subscription je Org (Re-Abschluss legt eine neue an, alte bleibt `deleted_at`-historisiert für Belegpflicht).
- `UNIQUE (stripe_subscription_id)` und `UNIQUE (stripe_event_id)` → Webhook-Idempotenz (analog `sb_payments`, `DATABASE_MODEL.md §4.7`).
- Konsistenz-Trigger (`BEFORE INSERT/UPDATE`): `subscriptions.plan = orgs.plan`, `current_period_end = orgs.plan_valid_until`, `org_id`→`stripe_customer_id` stimmig (kein Cross-Org-Schmuggel, vgl. `DATABASE_MODEL.md §8`).

### 5.2 Konsistenz-Invariante (eine Wahrheit, drei Spiegel)

Der Webhook setzt in **einer** Transaktion: `orgs.plan`, `orgs.plan_valid_until`, `orgs.status`, `subscriptions.lifecycle_state`/`plan`/`current_period_end`. Ein Verifikationstest (§8) erzwingt: `lifecycle_state` ⇄ (`orgs.plan`,`orgs.status`) folgt **exakt** der Mapping-Tabelle §1.1 — Drift = roter Test, kein Merge.

### 5.3 RLS (`subscriptions`)

| Aktion | Policy |
|---|---|
| SELECT | `org_id = current_org_id() OR is_staff()` (Erzeuger sieht eigene Abo-Historie, Staff alles) |
| INSERT / UPDATE / DELETE | **nur service role** (ausschließlich `stripe-webhook` / `billing-lifecycle-cron` / Owner-Override-Edge). Frontend rein lesend (Banner/Status). |

Deny-by-default; fremde Org = 0 Zeilen / 403 (Pfeiler 1). Belegpflicht: `subscriptions` ist Kategorie C → **10 Jahre** Aufbewahrung (`COMPLIANCE_MODEL.md §4`), Soft-Delete statt Hard-Delete; Lösch-Blocker `ACTIVE_SUBSCRIPTION` (`COMPLIANCE_MODEL.md §3`).

---

## 6 · Dunning (Mahnwesen) — von `overdue` zur Auflösung

Ziel: **maximale Recovery bei minimalem Käufer-Schaden**. Die meisten Fehlschläge sind technisch (abgelaufene/limitierte Karte), nicht zahlungsunwillig. Stripe übernimmt die Retry-Mechanik, die Plattform die Kommunikation, Sichtbarkeit und den Endzustand.

### 6.1 Mahnstufen (`subscriptions.dunning_stage`)

> **Alle Fristen/Stufen sind Konfig (Stripe Smart Retries + `billing-lifecycle-cron`-Schwellen), nie im Code hartkodiert** (`CLAUDE.md`-Verbot „keine hardcodierten Schwellwerte"). Die folgenden Werte sind die **Vorgabe-Staffel** dieser Spezifikation und stehen unter **Owner-Freigabe**.

| Stufe | Zeitpunkt (ab 1. Fehlschlag) | Stripe-Aktion | Plattform-Kommunikation | Funktionswirkung |
|:--:|---|---|---|---|
| **1** | Tag 0 | Smart Retry #1 | E-Mail „Zahlung fehlgeschlagen — Zahlungsmittel prüfen" + In-App-Banner (gelb) + Zahlungs-CTA (Portal-Link) | voll erhalten (Grace) |
| **2** | Tag 3 | Smart Retry #2 | Erinnerung E-Mail + persistenter Banner | voll erhalten |
| **3** | Tag 7 | Smart Retry #3 | „Letzte Erinnerung" E-Mail + Banner (orange) + Hinweis auf bevorstehende Einschränkung | voll erhalten |
| **4** | Tag 14 | finaler Retry / `unpaid` | „Abo wird beendet" E-Mail + Banner (rot) | **Grace-Ende** → §6.3 |
| **—** | Tag 14 + Grace-Ablauf | `subscription.deleted`/`unpaid` | Bestätigung „Abo beendet — Re-Abschluss jederzeit möglich" | Übergang `cancelled` (S8), `basis`-Niveau |

`dunning_stage` wird vom `billing-lifecycle-cron` (`actor=system`, auditiert) anhand `dunning_started_at` fortgeschrieben; jede Stufe erzeugt eine Benachrichtigung (Kern-Notification-Andockung) + Audit `billing.dunning.stage_<n>`.

### 6.2 Recovery (Happy Path raus aus `overdue`)

- Erzeuger aktualisiert Zahlungsmittel im **Stripe Customer Portal** → Stripe zieht ein → `invoice.paid` → Webhook S7 → `overdue → active`, `dunning_stage=0`, `grace_until=null`, Banner weg, `plan_valid_until` verlängert. Audit `billing.payment_recovered`.
- **Self-Service ohne Support-Last:** Der Banner-CTA führt direkt in das gehostete Portal (PCI bei Stripe, SAQ-A) — die Plattform berührt keine Kartendaten (`COMPLIANCE_MODEL.md §0/§7`).

### 6.3 Grace-Ende (Auslauf aus `overdue`)

- `billing-lifecycle-cron` prüft `grace_until`. Ist es überschritten **und** keine Recovery erfolgt → Anstoß an Stripe (`unpaid`/Cancel) bzw. Verarbeitung des `subscription.deleted`-Events → Übergang `cancelled` (S8).
- **Auslauf = `basis`-Niveau, nicht `demo`** (§4.3): verifizierter Hof bleibt gelistet; Premium/SB fallen weg; Über-Limit → read-only. `cancellation_reason='dunning_exhausted'`.
- **Owner-Kulanz** (S12): Owner/Staff kann mit **Reason + Audit** den vollen Plan verlängern/reaktivieren (`billing.owner_override`).

### 6.4 Reconciliation (Stripe ↔ DB, täglich)

Ein täglicher Reconciliation-Lauf (`billing-reconcile-cron`, `actor=system`) gleicht alle Subscriptions zwischen Stripe und DB ab (Soll-Zustand aus Stripe ziehen, Abweichung korrigieren + auditieren). Fängt verlorene/fehlgeleitete Webhook-Events ab — **idempotent**, keine Doppelwirkung (`ENTERPRISE_ARCHITECTURE.md §6.3 #4`).

---

## 7 · Frontend-Wirkung (Spiegel, End-to-End, kein toter Pfad)

Die UI **liest** den Zustand aus `bootstrap` (`GET /functions/v1/bootstrap` → `{ role, org_id, plan, status, lifecycle_state, entitlements, limits, usage, dunning_stage }`) und rendert verbindlich:

| Zustand | UI-Element (Erzeuger-Dashboard) | CTA (funktionierend, kein Platzhalter) |
|---|---|---|
| `lead` | „Vorschau"-Banner + Plan-Auswahl-Karten | „Plan wählen" → Stripe-Checkout |
| `active` | Plan-Badge + Verbrauchsanzeige (`usage`/`limits`) | „Abo verwalten" → Stripe Customer Portal |
| `paused` | „Pausiert"-Badge + Hinweis zur Sichtbarkeit | „Abo fortsetzen" → Portal (`resume`) |
| `overdue` | Dunning-Banner (gelb→rot je `dunning_stage`) + Restzeit | „Zahlung aktualisieren" → Portal |
| `cancelled` | „Abo beendet"-Hinweis, read-only-Markierung über Limit | „Erneut buchen" → Checkout (neue Subscription) |

- **Plan-Locks** rendern den Lock-UI-Vertrag aus `PLANS_AND_LIMITS.md §6.1` (was gesperrt, `requiredPlan`, funktionierender `upgradeUrl`) — nie ein toter Button (Pfeiler 4 · `CLAUDE.md` End-to-End-Pflicht).
- **Käufer-UI** zeigt **nie** Abo-/Plan-Elemente (planfreie Welt). Ein pausierter/ausgelaufener Hof erscheint im Finder gemäß §4.1 (depubliziert bzw. Basis-Sichtbarkeit) — der Käufer sieht keinen Abo-Status, nur Verfügbarkeit (Pfeiler 3 Scope-Transparenz, keine Schattenwahrheit).
- **Zero-State:** kein Abo / leere Verbrauchsdaten → Vorschau-/Onboarding-Zustand, nie `500` (Pfeiler 2).

---

## 8 · Verifikations-Checkliste (Lifecycle-Gate — WAVE_09)

- [ ] `lifecycle_state` ∈ exakt {`lead`,`active`,`paused`,`overdue`,`cancelled`}; CHECK-Constraint, kein Fremdwert.
- [ ] Mapping `lifecycle_state` ⇄ (`orgs.plan`,`orgs.status`) folgt §1.1 **exakt** (Konsistenz-Test; Drift = rot).
- [ ] **Jeder** Statuswechsel ausschließlich über `stripe-webhook` (service role); clientseitiges `UPDATE orgs.plan/status` per RLS unmöglich (Cross-Org-Negativtest).
- [ ] Webhook idempotent (`UNIQUE(stripe_event_id)`); Doppelzustellung = `200` no-op, kein Doppel-Entitlement (Replay-Test).
- [ ] Webhook **zustandskonvergent**: out-of-order/verspätetes Event führt nicht zu Drift (Reorder-Test, §3.3).
- [ ] Illegaler Übergang (z. B. `paused→overdue`, `cancelled→active` Rück-Mutation) ⇒ `409`, Zustand unverändert (kein `500`).
- [ ] `overdue` erhält Entitlements (Grace); erst Grace-Ende → `basis`-Niveau (kein abrupter Abschalt-Test).
- [ ] Auslauf landet auf `basis`-Niveau, **nicht** `demo`; verifizierter Hof bleibt im Finder (Listungs-Test).
- [ ] Downgrade/`cancelled` verliert keine Daten (Über-Limit = read-only, Test); SB-Bestand auswertbar (Kat. C).
- [ ] Dunning-Stufen 1–4 erzeugen je Benachrichtigung + Audit `billing.dunning.stage_<n>`; Fristen aus Konfig, nicht hartkodiert (Grep-Gate).
- [ ] Recovery (`invoice.paid`) setzt `overdue→active`, `dunning_stage=0`, entfernt Banner (Recovery-Test).
- [ ] Owner-Kulanz (S12) / Suspendierung (S13) erfordern **Reason** und schreiben `billing.owner_override`/`billing.org_suspended` (Audit-Test).
- [ ] Jeder Abo-Übergang auditiert (`billing.*`), unabschaltbar; Audit ohne wiederherstellbare PII (`COMPLIANCE_MODEL.md §10`).
- [ ] Lösch-Blocker `ACTIVE_SUBSCRIPTION` greift (DSGVO-Löschung erst nach Kündigung/Auslauf, `COMPLIANCE_MODEL.md §3`).
- [ ] `subscriptions` Kat. C, 10 Jahre, Soft-Delete; RLS `org_id`-gebunden, Schreiben nur service role.
- [ ] Käufer-Welt komplett abofrei (kein Abo-Element/Lock in der Käufer-UI).
- [ ] Reconciliation-Lauf korrigiert Stripe↔DB-Drift idempotent (Reconcile-Test, §6.4).

---

## 9 · Abgrenzung zum VMS-Erbe (nicht übernehmen)

| VMS-Begriff (Blueprint TempConnect) | Status | Hof-Äquivalent in dieser Datei |
|---|---|---|
| „Vendor-Onboarding-Pipeline", „Requisition-Abo" | ➖ entfällt | Erzeuger-Abo-Lebenszyklus (`lead→active→…`) |
| „Einsatz-/Timesheet-Abrechnung", „Stundenzettel-Billing" | ➖ entfällt | — (zeitarbeitsspezifisch; kein Pendant) |
| „Agency-Tier-Eskalation nach Spend" | ➖ entfällt | Plan-Upgrade `basis→plus→pro→individuell` (`PLANS_AND_LIMITS.md §6.2`) |
| „SCC/Hetzner-Abo-Infra" | ➖ entfällt | Stripe + Supabase Edge (Webhook/Cron), kein Self-Host |

> **Kanon-Verbot eingehalten:** kein Zeitarbeits-/Vendor-Pool-/Requisition-/Hetzner-Vokabular; konsequent Hof-Domäne (`CLAUDE.md`, „NIEMALS TempConnect/VMS-Begriffe").

---

## 10 · Offene Owner-Entscheidungen (Stop-Regel-bewusst)

Diese Punkte sind **Owner-Geld-/Fristen-Entscheidungen** und in dieser Spezifikation als Vorgabe-Default gesetzt, aber explizit **freigabepflichtig** (`CLAUDE.md` Stop-Regeln: „Finance/Export ohne Audit", Geld = Owner):

1. **Mahnfristen-Staffel** (Tag 0/3/7/14 + Grace-Länge) — Default §6.1; final über Stripe Smart Retries + Cron-Konfig.
2. **Pause-Maximaldauer** (z. B. saisonale Obergrenze) — Default: keine harte Grenze; Owner kann Limit setzen.
3. **Trial** (ja/nein, Länge) — Default: **kein** Trial (`lead`/`demo` ist die Vorschau); `trial_will_end`-Pfad ist vorbereitet, falls aktiviert.
4. **Anteilige Erstattung** bei Mid-Period-Downgrade/Kündigung — Default gemäß AGB: keine anteilige Erstattung laufender Perioden (`launch/B_rechtstexte/agb.md §10/§11`).
5. **`individuell`-Aktivierung** — kein Self-Service; Vertrieb/Owner, auditiert (S12-Pfad).

---

*Letzte Aktualisierung: Phase 1 · WAVE_09 (Vorzieh-Spezifikation) · 2026-06-19*
*Zuständig: Claude (Commercial + payment-engineer) · Freigabe: Owner (Preise/Geld/Dunning-Fristen)*
*Querverweise: `docs/PLANS_AND_LIMITS.md` §3/§6 · `docs/ROLE_AND_PERMISSION_MODEL.md` §3.2/§5 · `docs/DATABASE_MODEL.md` §2/§4.1/§7 · `docs/CORE_BUSINESS_STATE_MACHINES.md` §0/§4 · `docs/COMPLIANCE_MODEL.md` §3/§4/§10 · `docs/ENTERPRISE_ARCHITECTURE.md` §6.3 · `docs/STRIPE-SETUP.md` (geplant) · `docs/PRICING.md` (geplant) · `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (geplant)*
*Hinweis: Preise/Fristen stehen unter Owner-Freigabe; wirksam sind die Stripe-`price`-IDs + Smart-Retry-/Cron-Konfig, nicht dieses Dokument.*
