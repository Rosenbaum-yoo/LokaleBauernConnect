# Phasen A–R — Skalierungswelle 10 → 300 (kompakt, mit Befehlen)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 5 · `PHASEN.md` → **„Phase 5 — Skalierung & Selbstlernen"** · Customer-Gates 10/50/100/300. Diese Datei ist der **operative Bauplan der 18 Skalierungs-Phasen A–R**: pro Phase **Ziel · Aufgaben · Befehle · Acceptance**.
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Vermittler-Disclaimer durchgängig (Finder, Detail, Reservierung, Checkout, SB-Bezahlung, jede nach außen wirkende Owner-/Staff-Sicht).
> **Adaptiert** aus dem TempConnect-Blueprint `finalization/phase5_scale/PHASES_A_TO_R.md` (read-only; das TempConnect-Original bleibt unangetastet). **VMS-/Hetzner-Begriffe sind konsequent ersetzt:** `SCC` → **Betriebszentrale (Owner/Staff-Konsole)** · `Hetzner Control` → **Cloud-Plattform-Sicht (Supabase + Cloudflare + Stripe)** · `Einsatzportal` → **Reservierung/Abholung + Erzeuger-Self-Service** · `Vendor Pool/Requisition/Stundenzettel/Matching-Engine` kommen **nicht** vor. „Kunde" = registrierte Käufer (aggregiert) + zahlende **Erzeuger-Orgs**; „Hof" = `farms` / `org_locations` (inkl. unbemannter SB-Stand).
> **Eine Phase (oder eng gekoppelte Gruppe) pro Session.** **Preserve-first:** nichts Funktionierendes brechen — additiv, retrofit-bewusst, Rollback gedacht.

---

## Konflikt-Hierarchie & Pflicht-Lesereihenfolge

**Konflikt:** User-Anweisung > `~/AGENTS.md` (global) > `AGENTS.md` (Projekt) > Subagent/Skill > `CLAUDE.md` > `finalization/00_RULES.md` > `finalization/phase2_release/*` > `finalization/phase3_betrieb/*` > diese Datei.

**Vor dem ersten Edit der Session** (gezielt lesen, Reads bündeln — §0 Token-Effizienz):
1. `~/AGENTS.md` + `~/CLAUDE.md` (§0-Direktive) · `AGENTS.md` (Projekt) + `.claude/agents/*`
2. `CLAUDE.md` (7 Produktionspfeiler · Stop-Regeln · Verbote · „Domain owns truth, Ops owns aggregation")
3. `PHASEN.md` (Phase 5 + Marktstart-Pflicht-Set · **Gate 10 = erste zahlende Erzeuger**)
4. `MASTER_INDEX.md` (Abschnitt 4 Commercial, 5 Operations, 6 Testing, 7 Finalisierung)
5. `finalization/00_RULES.md` · `01_PRIORITIES.md` (P0–P3) · `99_GOLIVE_GATE.md`
6. `finalization/phase2_release/GATES.md` · `finalization/phase3_betrieb/GATES.md` (Ops-Gate — Eingangsvertrag von Phase 5)
7. `finalization/phase5_scale/CUSTOMER_GATES.md` + `SELF_UPDATING_CLAUDE_MD.md` (Gate-Definitionen + Lern-Loop)
8. `.claude/memory/` (INDEX + decisions/learnings/patterns) — vorhandene Wahrheiten nicht duplizieren

---

## Leitprinzipien der Skalierungswelle (jede Phase wahrt sie)

```text
1.  Preserve-first.        Bestehende Strukturen ZUERST suchen + erweitern; keine Parallelstrukturen, kein Rebuild.
2.  Additiv & idempotent.  SQL nur als neue Migration (app/supabase/migrations/, vierstellig ab 0004); RLS deny-by-default + Isolationstest ab Migration #1.
3.  Eine Wahrheit.         Stripe-Webhook ist die Billing-Wahrheit (idempotent, signiert). audit_log ist die Aktions-Wahrheit. Keine zweite Buchhaltung.
4.  Org-Boundary.          Jede Query org-gebunden via is_org_member()/is_staff()/is_owner(); fremde Org = 0 Zeilen/403, nie 200 mit Fremddaten.
5.  Zero-State statt 500.   Leere Daten/fehlende Integration → available:false + leere Arrays + UI „Noch keine Daten / Nicht konfiguriert"; nie Crash.
6.  service_role nur in Edge. Frontend nur VITE_-Public-Keys + Turnstile-Sitekey; jedes Secret nur als Function-/CF-Secret.
7.  Audit + Reason.        Jede kritische Mutation: Confirm + Pflicht-reason + Risk-Level + serverseitiges, unabschaltbares Audit.
8.  Effizienz = Pflicht.   Automatisierung (Stripe Billing, Mail-Provider) statt Handarbeit; günstige Cloud-Muster (Cloudflare/Supabase) ohne Sicherheits-/Designverlust.
9.  Vermittler durchgängig. Plattform vermittelt + bindet Zahlung an + stellt Beleg aus. Verkäufer/Steuerpflichtiger ist der HOF. Kein Eigenverkauf, keine Beratung, keine Warenhaftung.
10. Keine Fake-Fertigmeldung. „Fertig" erklärt der Owner. Restrisiken ehrlich dokumentiert, nicht weggelassen.
```

> **Verbots-Erinnerung (CLAUDE.md):** kein Fake-Data/Mock-KPI in Prod-UI · kein unescaptes User-Input · kein stiller Fehler (`if(!orgId) return null` ohne 403) · keine hardcodierten Farben außerhalb Design-System · keine Secrets im Log · keine Migration ohne Rollback · keine Mutation ohne Audit · keine sensible Route ohne serverseitigen Org-Scope · **kein freier SQL-Runner / kein offenes service-role-Tor in der Betriebszentrale** (Ops-Gate-Blocker).

---

## Repo-Realität (Basis — repo-genau, kein Rebuild)

| Reales Artefakt | Stand | Konsequenz für Phasen A–R |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` | `orgs`, `profiles(role)`, `farms(verified)`, `user_role`-Enum (`kaeufer/erzeuger/staff/owner`), `availability`, `reservations`, **`audit_log`** (`org_id, actor_user_id, action, entity_type, entity_id, reason, details jsonb`, nur `service_role`-beschreibbar) | Customer-Lifecycle (B) + Commercial Desk (C) + Audit (R/N) docken **an `orgs`/`audit_log`** an, bauen sie nicht neu. |
| `0002_payments.sql` | `subscriptions`, `sb_payments`, `payment_events` (Idempotenz), `payment_status`-Enum, RLS owner-read/service-write | Billing (D) liest/aggregiert **diese** Tabellen; `payment_events` PK=`event.id` = Webhook-Idempotenz-Wahrheit. |
| `0003_marketplace.sql` | `is_org_member()` (security definer), `org_members`, `org_locations(is_unmanned)`, `reviews(status)` | `is_org_member()` = kanonische Org-Zugehörigkeit; `org_locations.is_unmanned` = SB-Stand für Billing-/Monitoring-Sicht. |
| `app/supabase/functions/{create-checkout,stripe-webhook}` + `_shared/{supabaseAdmin,cors,stripe,email}.ts` | EIN signaturgeprüfter, idempotenter Webhook; `service_role` nur in Edge; Resend-Mail-Renderer | Provider-Services (D Billing, E Mail) erweitern **diese** Shared-Module; Ops-Mutationen laufen über **neue** Edge-Funktion `ops-action` (analog), nie Client-Direktschreiben. |
| `app/src/lib/{data,payments,supabase,types,geo,seed}.ts` | Dual-Source-Schicht (Seed ↔ Supabase), `isSupabaseConfigured`-Schalter, `snake_case`↔`camelCase` an der Grenze, Port **5409** | Alle neuen Sichten (B/C/D/F/I/M/Q) nutzen **dieselbe** Dual-Source-Schicht (neue `lib/*.ts`) → ohne Account bedienbar, Demo-Stand klar gekennzeichnet, kein toter Pfad. |
| `app/.env.example` | nur `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (Frontend-Public) | **Alle** neuen Secrets (Stripe/Resend/Turnstile/Connect) sind **Function-/CF-Secrets**, niemals `VITE_`. Server-Env wird in den Phasen unten je Modul deklariert. |
| `app/package.json` | Scripts `dev/build (tsc --noEmit && vite build)/preview/typecheck/test (vitest run)/test:watch`; **Vitest-Runner + `@vitest/coverage-v8` vorhanden** | Phase O härtet den vorhandenen **Vitest-Runner** (Frontend) und ergänzt Deno-Tests für SQL/Edge; laufende Verifikation `npm run typecheck` + `npm test` + `npm run build` (+ `supabase db reset` für Migrationen). |
| `app/finalization/phase2_release/*`, `phase3_betrieb/MASTERPROMPT.md`, `WAVE_05…15_*.md` | Release-Gates A–F, Betriebszentrale, KPI/QA/Observability/Legal-Wellen | Phasen A–R sind die **Skalierungs-Vollendung** dieser Wellen für 10→300 Kunden, nicht ihr Ersatz (Querverweise je Phase). |

> **Stop-Regel-Check:** `orgs`/`audit_log`/`is_org_member`/`is_staff`/`is_owner`/`sb_payments`/`payment_events` existieren real (bzw. WAVE_07-eingeplant) → kein „API/Service nicht gefunden". **Offene Owner-Gates** (Account/Kosten/Vertrag, **nicht** Teil der lokalen Phasen): Stripe Live + Connect-Aktivierung + Price-IDs + SEPA/Tax · Resend-/SMTP-Domain (SPF/DKIM/DMARC) · Supabase-EU-Projekt + Domain · Cloudflare Pages/Turnstile/WAF · Sentry-DSN. Siehe `finalization/phase5_scale/MANUAL_TASKS.md`.

---

# PHASE A — Reife- und Strukturprüfung

**Ziel:** Echte, repo-genaue Reifeprüfung für 10→300 Kunden. **Keine Codeänderung.**

**Aufgaben:**
- Prüfe real: API-/Edge-Routen, RLS-Policies + Isolationstest, Migrationen, Datenschicht (`lib/*`), Frontend-Seiten/Router, **Betriebszentrale** (Owner/Staff-Konsole, Phase 3), **Reservierung/Abholung** + **Erzeuger-Self-Service**, Payment/Subscription (`sb_payments`/`subscriptions`/`payment_events`), Mail/Notification, Cloudflare/Supabase-Config, Tests, Doku, TODOs/`FIXME`, Legacy/Duplikate, Env-Trennung (`VITE_` vs. Server-Secret), Security-Header/CSP, Monitoring/Logging, Audit-Vollständigkeit.
- Aktualisiere `docs/finalization/10_300_customer_readiness_matrix.md` mit Spalten:
  `Bereich | Ist-Zustand | Bestehende Dateien | Ziel 10 | Ziel 50 | Ziel 100 | Ziel 300 | Risiko | Änderung | Tests | Gate`
- Jede Zeile mit **echtem Datei-/Code-Bezug** — keine erfundenen Strukturen, keine VMS/Hetzner-Begriffe.

**Befehle:**
```bash
cd app
rg -l "is_org_member|is_staff|is_owner|service_role" supabase/
ls -1 supabase/migrations/ | tail -30
rg "TODO|FIXME|HACK" src/ supabase/ --count
rg -n "VITE_" src/ | rg -i "secret|service" || echo "OK: kein Secret unter VITE_"
npm run typecheck
```

**Acceptance:** Readiness-Matrix mit Datei-/Code-Bezug für jede Zeile · keine erfundenen Strukturen · keine VMS/Hetzner-Reste · **keine Codeänderung** · `rg`-Befund (TODO/Secret-Leak) dokumentiert.

> **Querverweis:** `finalization/phase3_betrieb/GATES.md` §1 (Ist-Zustand) · `PHASEN.md` Phase 5.

---

# PHASE B — Customer Lifecycle & zahlende Organisationen

**Ziel:** Zahlende **Erzeuger-Orgs** (und aggregierte Käufer) sauber, mandantensicher verwalten.

**Kernobjekte (prüfen, minimal additiv ergänzen — an `orgs`/`org_members`):** Organisation (= `orgs`), Account-Owner, Billing-Kontakt, technischer Kontakt, Plan/Tarif, Subscription (`subscriptions`), Entitlements, Payment-Status, Onboarding-Status, Customer-Health, Support-Status.

**Lifecycle-Status (`org_lifecycle_status` — neue Migration, Enum + `orgs.lifecycle_status`):**
```
lead → angefragt → qualifiziert → angebot_vorbereitet → angebot_versandt →
vertrag_offen → zahlung_offen → aktiv → aktiv_individuell →
pausiert → ueberfaellig → gesperrt → kuendigung_angefragt → gekuendigt → archiviert
```

**Betriebszentrale-Bereich „Kunden/Höfe" (Phase 3 → vertieft):** Org-Liste, Filter (Status/Plan/Risiko), Detailansicht, Tarif-/Zahlungsstatus, aktive Module/Entitlements, Höfe/SB-Stände + Standorte, letzte Aktivität, offene Tickets, Systemfehler, Onboarding-Fortschritt, interne Notizen, **Statuswechsel (Confirm + Pflicht-reason + Risk-Level)**, Audit-Verlauf.

**Sicherheit:** Nur `staff`/`owner` (via `is_staff()`/`is_owner()`). Statuswechsel berechtigt + auditiert über Edge-Funktion `ops-action`. Käufer/Erzeuger sehen **nur eigene** Org-Daten (`is_org_member`). Kein Cross-Org-Leak.

**Befehle:**
```bash
cd app
# neue Migration anlegen (additiv, mit Rollback-Block)
printf '%s\n' "-- 0004_org_lifecycle.sql" > supabase/migrations/0004_org_lifecycle.sql
npx supabase db reset   # 0001..0004 fehlerfrei + idempotent (2. Lauf ohne Fehler)
npm run typecheck
```

**Tests:** Org-Liste nur `staff`/`owner` · Erzeuger sieht nur eigene Org · Statuswechsel schreibt `audit_log` (`ops.lifecycle.*` + reason) · gesperrte Org → keine bezahlten Aktionen · Entitlements ändern sich korrekt bei Lifecycle-Wechsel · Cross-Org-Negativtest (Org A sieht Org B nicht).

**Acceptance:** Lifecycle additiv + idempotent migriert · Statuswechsel nur über `ops-action` (reason Pflicht, auditiert) · Zero-State für leere Liste · keine Codeänderung an `0001…0003`.

> **Querverweis:** Phase 3 Betriebszentrale (Kunden/Höfe) · WAVE_03 (RBAC) · WAVE_07 (`is_staff`/`is_owner`, Audit-Namespaces).

---

# PHASE C — Individuelle Tarife / Commercial Desk

**Ziel:** Plan **`individuell`** (= Funktionsniveau „Enterprise", kein öffentlicher Plan) vollständig operativ — von Anfrage bis Aktivierung.

**Betriebszentrale-Modul:** `Betriebszentrale > Commercial Desk > Individuelle Tarife`.

**Kanonische Pläne (Imperium, verbindlich):** `demo`, `basis`, `plus`, `pro`, `individuell`.

**Erzeuger-Anfrage-Felder (Tabelle `tariff_requests`, additive Migration):** Hof/Organisation, Ansprechpartner, Rechnungsadresse, E-Mail, Telefon, Region/Bundesland, Anzahl Höfe/Standorte/SB-Stände, erwartetes Reservierungs-/SB-Transaktionsvolumen, gewünschte Module (Finder-Premium, SB-Bezahlung, Saison-Alerts, Self-Service-Plus), Laufzeit, Starttermin, Zahlungsart, Datenschutz-Hinweise, Notiz.

**Staff-Aktionen (alle via `ops-action`, auditiert):** Anfrage öffnen · interne Notizen · Risiko markieren · Rückfrage · Angebot vorbereiten (Preis/Setup-Fee/Rabatt/Laufzeit/Kündigungsfrist) · Module/Entitlements freigeben · Limits setzen · SLA wählen · Zahlungsart festlegen · Vertrag markieren · freigeben/ablehnen/Entwurf.

**Aktivierung:** Tarif aktivieren → `orgs.plan='individuell'`, `lifecycle_status='aktiv_individuell'`, Entitlements + Limits setzen, Billing-Profil anlegen, Zahlungsstatus initialisieren → **automatisch** Stripe-Objekt erzeugen (Phase D, nie Excel/PDF von Hand).

**Befehle:**
```bash
cd app
printf '%s\n' "-- 0005_tariff_requests.sql" > supabase/migrations/0005_tariff_requests.sql
npx supabase db reset && npm run typecheck
```

**Tests:** Anfrage erstellbar (Erzeuger) · Staff kann bearbeiten · Aktivierung auditierbar (`commercial.tariff.activate` + reason) · Entitlements/Limits greifen serverseitig · nur `staff`/`owner` sieht Commercial Desk · `individuell` ist nicht öffentlich wählbar.

**Acceptance:** Voller Pfad Anfrage → Angebot → Aktivierung end-to-end · Entitlements serverseitig erzwungen · Audit lückenlos · Plan-Modell exakt (`demo/basis/plus/pro/individuell`).

> **Querverweis:** WAVE_09 (Billing-Mechanik) · Phase 4 Track A (SB-Bezahlung als monetarisierbares Modul) · `docs/PRICING.md` / `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`.

---

# PHASE D — Billing vollautomatisiert (Stripe ab Tag 1)

**Ziel:** Vollautomatische Zahlungsabwicklung für 10–300 Kunden — **KEINE manuelle Rechnungserstellung.** Automatisierung ist Pflicht (§0 Effizienz/Wirtschaftlichkeit), nicht Option.

**Entscheidung (verbindlich, ADR):** **Stripe Billing** ist der produktive Standard ab dem ersten zahlenden Erzeuger. Rechnungen erzeugt **Stripe automatisch** (B2B-Pflicht, aber nie von Hand). Zwei Geldflüsse: **(1) Erzeuger-Abo** (`subscriptions`, Plan-Price-IDs) · **(2) SB-Transaktionen** (Phase 4 Track A, Stripe **Connect** — Geld zum Hof, Plattform behält `application_fee`).

**Provider-Service:** `BillingProviderService` (in `app/supabase/functions/_shared/`) mit Providern `stripe` (Standard), `manual` (Notfall-Fallback, default AUS), `disabled` (lokale Entwicklung). Schalter über Server-Env, **nie** `VITE_`.

**Server-Env (Function-/CF-Secrets — NICHT im Frontend):**
```env
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MAP=        # basis/plus/pro → price_...
STRIPE_AUTO_INVOICE=true
STRIPE_SEPA_ENABLED=true
STRIPE_TAX_ENABLED=true
STRIPE_DUNNING_ENABLED=true
STRIPE_CONNECT_ENABLED=true # SB-USP (Track A)
SB_FEE_BPS=                 # Plattform-Fee Basispunkte (gedeckelt, transparent im Beleg)
SB_FEE_FIXED_CENTS=
MANUAL_INVOICE_FALLBACK_ENABLED=false
```

**Stripe Billing vollautomatisch (produktiv):**
- Subscriptions je Plan (`basis/plus/pro` via Price-IDs); `individuell` über Stripe Invoicing mit Custom-Betrag/Custom-Price (Phase C → System erzeugt automatisch Subscription/Rechnung, kein PDF von Hand).
- Auto-Rechnung (Stripe Invoicing) · **SEPA Direct Debit** für deutsche B2B-Erzeuger · **Stripe Tax** (USt) falls aktiviert · **automatisches Dunning** (Smart Retries) bei Fehlzahlung.
- **Customer Portal** (Stripe Billing Portal): Zahlungsmethode ändern, Rechnungen laden, kündigen — Selbstverwaltung statt Support-Last.
- **EIN** idempotenter, signaturgeprüfter Webhook (`stripe-webhook`, `payment_events` PK=`event.id`) für: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`, `payment_method.attached`, sowie SB-/Connect-Events (`checkout.session.completed`, `charge.refunded`, `charge.dispute.*`, `account.updated`, `payout.paid|failed`).
- **Payment-Status → Lifecycle (Phase B):** `zahlung_offen → aktiv`; `payment_failed → ueberfaellig → gesperrt` (Grace Period).

**Manueller Fallback (NUR Notfall, default AUS):** `MANUAL_INVOICE_FALLBACK_ENABLED=false`; aktivierbar nur bei Stripe-Ausfall/nachweislich Stripe-untauglichem Kunden; jede manuelle Rechnung = Audit + Owner-Benachrichtigung. Ziel: praktisch nie genutzt.

**Betriebszentrale Billing-Dashboard:** aktive zahlende Erzeuger, MRR/ARR (aus Stripe), offene/überfällige Zahlungen, Dunning-Status, SEPA-Mandate, **SB-Transaktionen + Fee/Net + Auszahlungen (Connect)**, Webhook-Gesundheit, fehlgeschlagene Zahlungen mit Retry-Status, Provider-Config.

**Befehle:**
```bash
cd app
npx supabase functions deploy stripe-webhook   # Owner-Gate: Live-Keys/Secrets erst nach Freigabe
npx supabase functions deploy create-checkout
npm run typecheck
```

**Tests:** Subscription erzeugt automatisch Rechnung · SEPA-Mandat-Flow · Webhook **idempotent** (doppeltes Event → keine Doppelbuchung; identische `event.id`) · `payment_failed` → Dunning + `ueberfaellig` · wiederholtes Scheitern → `gesperrt` (Grace) · Kündigung über Portal entzieht Entitlements korrekt · `individuell` erzeugt Stripe-Objekt automatisch · manueller Fallback default deaktiviert (Test: Aktivierung erfordert Flag + Audit) · Stripe Tax USt korrekt · **SB-Connect:** `fee + net == amount`, Geld zum Hof (destination), Refund/Dispute setzen Status+Beträge.

**Acceptance:** Geldfluss vollautomatisch über Stripe (Abo + SB-Connect) · keine Handarbeit · EIN idempotenter signierter Webhook für **alle** Event-Typen · Status-Mapping auf Lifecycle korrekt · Secrets nur Function-/CF-Secret.

> **Querverweis:** WAVE_09 (Billing) · **Phase 4 `TRACK_A_SB_PAYMENT.md`** (SB-USP, Connect, Beleg). **Owner-Gate:** Stripe-Account + Keys + Price-IDs + SEPA/Tax + **Connect-Aktivierung** = **Marktstart-Blocker für Gate 10** (siehe `MANUAL_TASKS.md`).

---

# PHASE E — Mail- & Notification-System (Resend/SMTP)

**Ziel:** Professionelle, sichere E-Mail produktionsreif — auf dem **bestehenden** Resend-Renderer (`_shared/email.ts`).

**Provider-Service:** `EmailProviderService` (erweitert `_shared/email.ts`) mit Providern `console` (Default lokal), `resend` (produktiv, bereits angebunden), `smtp` (Alternative), `disabled`. Mailfehler dürfen **nie** den Businessflow zerstören (Best-Effort + Audit).

**Server-Env (Secrets):**
```env
EMAIL_PROVIDER=resend
EMAIL_FROM=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

**Mailtypen (vorbereiten, deutsch, Markenton, Vermittler-Disclaimer im Footer):** Registrierung/Bestätigung · Passwort-Reset · Login-Security · Tarif-Anfrage eingegangen/in-Prüfung/freigegeben/abgelehnt · Zahlung offen/fehlgeschlagen · Rechnung bezahlt · **SB-Quittung** (Pflichtangaben: Hof-Anschrift, Positionen, Summe, Beleg-Nr., Zeitstempel, USt-Hinweis) · **Reservierungs-Bestätigung/Abhol-Erinnerung** · Onboarding gestartet · Support-Ticket erstellt/aktualisiert · Systemwarnung/Incident/Deployment/Backup-fehlgeschlagen/Owner-kritischer Fehler.

**Betriebszentrale Mail-Center:** Provider-Status, Resend/SMTP konfiguriert?, letzte Mails, Fehler, Bounces, Webhook-Status, Template-Status.

**Sicherheit:** Keine Secrets in Mails · keine User-Enumeration · Rate-Limits für sensible Mails (Reset/Security) · Audit für Commercial-/Billing-/Security-Mails · DSGVO: Beleg-/Marketing-Mail nur mit Zweck/Einwilligung, Datensparsamkeit.

**Befehle:**
```bash
cd app
rg -n "sendEmail|renderReceipt" supabase/functions/_shared/email.ts
npm run typecheck
```

**Tests:** `console`-Provider funktioniert lokal · Resend ohne Key deaktiviert sauber (kein Crash) · Mailfehler zerstört Reservierungs-/Zahlungsflow nicht · kritische Mails protokolliert · SB-Quittung trägt alle Pflichtangaben + Disclaimer · keine User-Enumeration.

**Acceptance:** Provider-Abstraktion produktionsreif · alle Mailtypen vorbereitet + Disclaimer · Mail entkoppelt vom Businessflow · Mail-Center zeigt realen Status (Zero-State bei „nicht konfiguriert").

> **Querverweis:** WAVE_13 (Observability) · `TRACK_A_SB_PAYMENT.md` (Quittungs-Mail). **Owner-Gate:** Resend-Domain + DNS (SPF/DKIM/DMARC).

---

# PHASE F — Betriebszentrale als zentrale Owner/Staff-Konsole

**Ziel:** Die Betriebszentrale (Phase 3) wird zur **echten, kundentauglichen Betriebssicht** für 10→300 — keine Demo-Konsole, kein DB-Viewer, **kein** freier SQL-Runner.

> **Begriffs-Korrektur (verbindlich):** Was bei TempConnect „SCC" war, ist hier **keine eigene Server-Konsole und kein Self-Host-Panel**, sondern eine **React-Sicht innerhalb derselben App** (scharf abgetrennte `/staff/ops/*`-Surface, hinter RBAC-Gate `staff`/`owner`) auf **Supabase-Daten + Cloudflare-/Stripe-Telemetrie**, serverseitig hart abgesichert.

**Module (bauen/finalisieren — Hof-Domäne):**
```
Betriebszentrale-Dashboard · Kunden/Höfe (Phase B) · Commercial Desk (Phase C) ·
Billing & Payments (Phase D) · Mail & Notifications (Phase E) · Support & Tickets (Phase M) ·
Monitoring & Incidents (Phase I) · Cloud-Plattform-Sicht (Phase G) · Deployment & Releases (Phase P) ·
AI Operations (Phase H) · Audit & Security (Phase N/R) · Feature-Flags & Entitlements ·
Design-/Theme-Control (Phase J) · System-Health · Backups & Datenexport (Phase P)
```

**Qualitätsstandard pro Modul:** klare Zielgruppe · Überschrift · Status-Karten · Tabelle/Detail · Empty/Error/Loading-State · Filter · Suche (falls sinnvoll) · Audit-Verlauf · rollenbasierte Sichtbarkeit · **keine Demo-Daten ohne Kennzeichnung** · Scope-Anzeige (Org/Plattform/Zeitraum/Datenstand).

**Kritische Aktionen (Confirm + Pflicht-reason + Risk-Level + Audit, alle via `ops-action`):** Kunde aktivieren/sperren · Tarif ändern · Zahlungsstatus ändern · Refund anstoßen · Feature freigeben · Deployment/Rollback · Backup auslösen · AI-Job freigeben · Theme global setzen · Userrolle ändern · Hof-Verifizierung zurückziehen.

**Befehle:**
```bash
cd app
npm run build       # tsc --noEmit && vite build (Betriebszentrale ist Teil derselben App, KEIN build:scc)
npm run typecheck
```

**Tests:** Käufer/Erzeuger kein `/staff/ops/*`-Zugriff (403) · Staff sieht nur erlaubte Module · Owner sieht kritische Module · kritische Aktion schreibt Audit (+reason) · Betriebszentrale funktioniert mit **deaktivierten** Integrationen (Zero-State, kein 500) · kein freier Query-Editor vorhanden.

**Acceptance:** Betriebszentrale wirkt wie Betriebssicht (nicht Demo-Panel) · jede Mutation scoped + auditiert über Edge-Funktion · Zero-State überall · **kein** service-role im Frontend, **kein** SQL-Runner.

> **Querverweis:** `finalization/phase3_betrieb/{MASTERPROMPT,GATES}.md` (Grundlage) — Phase F erweitert um Vollbetrieb 10→300.

---

# PHASE G — Cloud-Plattform-Sicht (Supabase + Cloudflare + Stripe) *— ersetzt „Hetzner Control"*

**Ziel:** Die Cloud-Plattform sichtbar + kontrolliert steuerbar — **als read-/aggregierte Sicht**, keine freie Shell, keine destruktiven Aktionen. **Kein Hetzner, kein SSH, kein Bare-Metal.**

**Provider-Service:** `CloudPlatformProviderService` mit Providern `supabase` · `cloudflare` · `stripe` · `disabled` (lokal). Liest Telemetrie/Status über offizielle APIs/Health-Endpunkte.

**Server-Env (Secrets — read/aggregate-scoped, niemals Vollzugriffs-Token im Frontend):**
```env
CLOUD_PLATFORM_ENABLED=false
SUPABASE_PROJECT_REF=
SUPABASE_MGMT_READ_TOKEN=     # read-scoped (Status/Usage), keine Mutations-Allmacht
CLOUDFLARE_API_TOKEN=         # read-scoped (Pages/WAF/Analytics)
CLOUDFLARE_ACCOUNT_ID=
STRIPE_SECRET_KEY=            # bereits Phase D (Balance/Payouts/Webhook-Health)
```

**Sicht (read-only/aggregiert):** Provider-Status (Token vorhanden/fehlt) · Supabase: DB-Größe/Usage, langsame Queries, Connection-Pool, Storage-Auslastung, RLS-aktiv-Indikator, letzte Migration · Cloudflare: Pages-Deploy-Status, WAF/Rate-Limit-Treffer, Turnstile-Quote, Edge-Latenz, Cache-Hit-Rate · Stripe: Balance, Payout-Status, Webhook-Health/-Lag · Skalierungs-Hinweise (Phase Q).

**Erlaubte Aktionen (mit Step-up + Confirm + Audit):** Status lesen · Cloudflare-Cache-Purge · Deploy auslösen (Phase P) · Feature-Flag toggeln. **Verbotene Aktionen:** Projekt/DB löschen oder rebuilden · Schlüssel-Reset über UI · freie SQL-/API-Calls · Massen-Mutation · jeglicher Shell-/SSH-Zugang.

**Jobmodell:** Action-Request-Layer (analog `ops-action`) — jede Mutation als auditierter Job, nie Direktaufruf aus dem Client.

**Befehle:**
```bash
cd app
rg -n "CLOUD_PLATFORM|CLOUDFLARE_API_TOKEN|SUPABASE_MGMT" supabase/functions/ || echo "noch nicht angebunden"
npm run typecheck
```

**Tests:** Production-Stub liefert **nie** `stubbed-ok` für Mutationen · unbekannte/verbotene Aktion abgelehnt · kritische Aktion mit Audit · fehlendes Token → „nicht konfiguriert" (nicht „failed") · kein Vollzugriffs-Token im Frontend-Bundle.

**Acceptance:** Cloud-Sicht zeigt realen Plattform-Status (Supabase/Cloudflare/Stripe) · destruktive Aktionen technisch unmöglich · Read-Token read-scoped · Zero-State bei fehlender Anbindung.

> **Querverweis:** Phase 3 Betriebszentrale · `docs/DEPLOYMENT.md` / `docs/MONITORING.md`. **VMS/Hetzner ausdrücklich ersetzt** (kein Self-Host).

---

# PHASE H — AI Operations / Claude-Code-Control in der Betriebszentrale

**Ziel:** AI-Operations sicher in der Betriebszentrale steuern. **Keine freie Codeausführung, keine Auto-Deploys ohne Freigabe.**

**Modul:** `Betriebszentrale > AI Operations` — Work-Orders + Vorschläge der **selbstlernenden CLAUDE.md** (`SELF_UPDATING_CLAUDE_MD.md`).

**Funktionen:** Work-Orders erstellen/anzeigen · GitHub-Issue/PR-Verknüpfung · **Risikocheck** (Unsafe-Prompt-Classifier) · Status-Lifecycle (Entwurf → Freigabe → ausgeführt → geprüft) · Audit · **Lern-Inbox-Sicht** (`insights → distill → apply → consolidate`, getaktet, Owner-Review-pflichtig).

**Server-Env (Secrets):**
```env
AI_OPS_ENABLED=false
AI_OPS_REQUIRE_OWNER_APPROVAL=true
```

**Risikocheck:** Prompts/Jobs mit `lösche/delete/drop/ssh/secret/production/service_role` → blockieren oder Entwurf + Freigabe-Pflicht. Lern-Vorschläge gehen **nie** automatisch in `CLAUDE.md` — immer Owner-Review (Lern-Loop §0.9 Test-Integrität gewahrt).

**Befehle:**
```bash
cd app
rg -n "insights_inbox|AI_OPS" .claude/ supabase/ || echo "Lern-Loop-Dateien prüfen"
npm run typecheck
```

**Tests:** Nur Owner/Developer-Staff sieht AI-Ops · Käufer/Erzeuger sehen nichts · Job ohne Konfiguration bleibt Entwurf · secret-ähnliche Inhalte gewarnt/blockiert · Hochrisiko-Job verlangt Freigabe · Audit geschrieben · Lern-Vorschlag wird nie ohne Owner-Review angewandt.

**Acceptance:** AI-Ops sicher gegated · Risikocheck aktiv · Lern-Loop an Owner-Review gekoppelt · Audit lückenlos.

> **Querverweis:** `finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md` · `.claude/learning/insights_inbox.md`.

---

# PHASE I — Monitoring, Incidents, Health, Observability

**Ziel:** Betrieb beobachtbar machen — Kernpfade leben sichtbar, Zero-State statt 500.

**Health-Endpunkte (Edge):** `/health`, `/ready`; Teilchecks DB / Storage / Mail / Billing(Stripe) / Webhook-Lag / Cloudflare-Edge. Optionale Provider = „nicht konfiguriert", nicht „failed".

**Server-Env (Secrets):**
```env
MONITORING_ENABLED=true
SENTRY_DSN=
LOG_LEVEL=info
LOG_FORMAT=json
ALERT_EMAIL=
```

**Betriebszentrale Monitoring:** Gesamtstatus · App/Edge/DB/Storage/Mail/Billing/Cloudflare/Stripe-Webhook · letzte Incidents · offene kritische Fehler · Fehlertrend · langsame Endpoints · letzte Deployments/Backups · Webhook-Erfolgs-/Fehlerrate.

**Incident-Modell (additive Migration):** `incident_events`, `incident_status`, `incident_notes`, `incident_notifications` mit `severity, source, status, owner, customer_impact, created_at, resolved_at, internal_notes, public_message?`.

**Befehle:**
```bash
cd app
printf '%s\n' "-- 00NN_incidents.sql" > supabase/migrations/00NN_incidents.sql
npx supabase db reset && npm run typecheck
```

**Tests:** Health ohne externe Keys sauber · fehlende optionale Provider = „nicht konfiguriert" (nicht „failed") · kritische Fehler erscheinen in Betriebszentrale · Incident erstell-/aktualisier-/schließbar · Logs **PII-frei** (keine Klartext-IP/E-Mail).

**Acceptance:** Health-Endpunkte robust · Monitoring zeigt realen Status + Zero-State · Incident-Lebenszyklus vollständig · Sentry/Logs PII-frei.

> **Querverweis:** WAVE_13 (Observability) · Phase 2 (Smoke-Gate) · `docs/{MONITORING,OBSERVABILITY,INCIDENT_RUNBOOK}.md`.

---

# PHASE J — Design-Scopes & Theme-System (Editorial bleibt Default)

**Ziel:** Professionelles, wechselbares Theme-System. **Default bleibt das bestehende Editorial-Design** (`app/src/styles/theme.css`). Ultra-Premium auswählbar.

**Drei Scopes:** `platform` (Käufer-Welt) · `producer_portal` (Erzeuger-Self-Service) · `betriebszentrale` (Owner/Staff).

**Theme-Registry:** `ThemeRegistry`, `ThemeProvider`, `ThemeScope`, `DesignTokens`, `ThemeControlService` — **strikt** über CSS-Custom-Properties (`--ds-*`), keine hardcodierten Farben/Fonts.

**Themes:** `editorial_default` · `ultra_premium` · `enterprise_dark` · `enterprise_light` · `high_contrast` (optional).

**Tokens:** Farben, Hintergründe, Flächen, Typografie, Spacing, Radius, Schatten, Buttons, Inputs, Tables, Cards, Badges, Modals, Toasts, Navigation, Sidebar, Topbar, Maps/Charts, Statusfarben, Empty/Error/Focus-States.

**Theme-Control (Owner):** aktives Theme je Scope sehen/ändern · Vorschau · speichern · auf Default zurücksetzen · Audit.

**Server-Env:**
```env
THEME_SWITCHER_ENABLED=true
ULTRA_PREMIUM_THEME_ENABLED=true
```

**Befehle:**
```bash
cd app
rg -n "var\(--ds-|#[0-9a-fA-F]{3,6}" src/ | rg "#[0-9a-fA-F]{3,6}" && echo "WARN: hardcodierte Farbe gefunden" || echo "OK: nur Tokens"
npm run build
```

**Tests:** Default (`editorial_default`) bleibt aktiv · Themewechsel je Scope funktioniert · Theme-Control nur Owner · kein Themewechsel zerstört Navigation/Map · Ultra-Premium auswählbar · fehlendes Theme → Fallback auf Default · keine hardcodierte Farbe in geänderten Dateien.

**Acceptance:** 3 Scopes · Editorial bleibt Default · Ultra-Premium ruhig/premium (keine Vorlagenoptik, keine Deko-Emojis) · gute Mobile-Zustände · nur Tokens.

> **Querverweis:** WAVE_10 (Premium UX, Design-Tokens) · `frontend-design-guardian`.

---

# PHASE K — Plattformbereich finalisieren (Käufer + Erzeuger)

**Ziel:** Die zwei zahlungswürdigen Welten klar und rollenrichtig — **Käufer** + **Erzeuger** (kein VMS-„Unternehmen/Personaldienstleister").

**Käufer-Welt:** Hofladen-Finder (Karte) · Produktverfügbarkeit · Reservierung/Abholfenster · Saison-Radar · SB-Bezahlung am Stand · Lieblings-Höfe/Alerts.

**Erzeuger-Welt:** eigener Hof/Org · Verfügbarkeit selbst pflegen · Abholfenster/Reservierungen verwalten · SB-Stände + Einnahmen/Schwund · Abo/Tarif · Verifizierungs-Status.

**Terminologie:** rollenabhängig + regional (Markenton, deutsch). Keine VMS/Mischbegriffe (kein „Personal finden", „Vendor", „Einsatz").

**Befehle:**
```bash
cd app
rg -in "vendor|requisition|einsatz|stundenzettel|personaldienstleister|matching" src/ && echo "WARN: VMS-Begriff" || echo "OK: keine VMS-Begriffe"
npm run build
```

**Tests:** rollenrichtige Begriffe · keine toten Buttons · echte Datenquellen **oder** Zero-State · keine Mischbegriffe · Vermittler-Disclaimer durchgängig sichtbar.

**Acceptance:** beide Welten klar, vollständig verdrahtet (Endpoint→Fetch→DOM→Zustände→Handler) · keine VMS-Reste · Disclaimer durchgängig.

> **Querverweis:** WAVE_04 (Kernprodukt) · Phase 4 Track B (Karte) / Track C (Saison) / Track D (Self-Service) · `docs/product/TERMINOLOGY_GUIDE.md`.

---

# PHASE L — Reservierung/Abholung + Erzeuger-Self-Service finalisieren *— ersetzt „Einsatzportal"*

**Ziel:** Der **operative Tagesbereich** — Reservierung/Abholung (Käufer) + mobile Verfügbarkeits-/Bestandspflege (Erzeuger) — isoliert, mobil, robust, Cross-Org-sicher. **Kein Einsatzportal, keine Stundenzettel.**

**Anforderungen:**
- **Käufer-Reservierung:** Status-Machine `requested → confirmed → picked_up → cancelled/expired`; Abholfenster; eigene Reservierungen; mobil; robuste Fehlerzustände.
- **Erzeuger-Self-Service:** Verfügbarkeit/Bestand mobil pflegen, Abholfenster setzen, Reservierungen bestätigen, SB-Stände verwalten — **nur eigene Org** (`is_org_member`).
- Beide Welten strikt getrennt (Session/Berechtigung); kein Admin-Ballast in der operativen Sicht.

**Befehle:**
```bash
cd app
rg -n "requested|confirmed|picked_up|cancelled|expired" src/ supabase/migrations/0001_core.sql
npm run build && npm run typecheck
```

**Tests:** Käufer sieht nur eigene Reservierungen · Erzeuger pflegt nur eigene Org · Statusübergänge erlaubt-only (kein Client setzt verbotenen Status) · Cross-Org-Negativtest (Erzeuger A ändert nicht Hof B) · mobil nutzbar · Zero-/Fehlerzustände vollständig.

**Acceptance:** operativer Tagesbereich isoliert + mobil + robust · Statusübergänge serverseitig erzwungen · Cross-Org dicht · hält im 10–300-Betrieb.

> **Querverweis:** WAVE_04 (Reservierung/Verfügbarkeit) · Phase 4 Track D (Self-Service) · `docs/CORE_BUSINESS_STATE_MACHINES.md`.

---

# PHASE M — Support- & Ticket-System

**Ziel:** Supportprozess vorhanden (an den **Kern**-Support angedockt, nicht dupliziert — ein Center für 14 Plattformen).

**Funktionen:** Ticket erstellen · Status `open/in_progress/waiting/resolved/closed` · Priorität · Kategorie · Zuweisung · interne Notizen · **Kundensicht vs. Staff-Sicht** · SLA-Timer · Audit · Ticket-Mails (Phase E).

**Kategorien:** technisch · kommerziell · Onboarding · Incident · Feature-Anfrage · Hof-Verifizierung · sonstige.

**Befehle:**
```bash
cd app
rg -n "support_tickets|escalations" supabase/migrations/ || echo "WAVE_07-Tabellen prüfen/anlegen (additiv)"
npm run typecheck
```

**Tests:** Käufer/Erzeuger sieht nur eigene Tickets · Staff sieht alle · Statuswechsel auditiert (`support.ticket.*` + reason) · Priorisierung funktioniert · **keine Cross-Org-Leaks** · Ticket-Mail entkoppelt vom Flow.

**Acceptance:** Support end-to-end (erstellen→bearbeiten→schließen) · Sichttrennung Kunde/Staff · Audit lückenlos · kein zweites Support-Center.

> **Querverweis:** WAVE_07 (Staff/Support-Andockung) · Phase E (Ticket-Mails) · Phase I (Incident-Verknüpfung).

---

# PHASE N — Security, Legal, Datenschutz, Compliance

**Ziel:** Rechtliche + Sicherheits-Basis für Skalierung prüfen/finalisieren.

**Prüfen/finalisieren:** Auth-Härtung (Supabase Auth/MFA) · **Tenant-Isolation** (RLS deny-by-default + Isolationstest-Harness) · CSRF · Rate-Limits + Turnstile · **Security-Header/CSP/HSTS** (Cloudflare) · API-Key-/Token-Scopes (read-scoped, Phase G) · Audit-Vollständigkeit + Immutability · DSGVO-Texte (Impressum, Datenschutz, AGB) · **AVV/DPA** mit Stripe/Resend/Supabase/Cloudflare · TOMs · Subprocessor-Liste · Datenexport · Löschkonzept (inkl. Belege) · Retention · **Lebensmittel-Kennzeichnungs-Hinweis** + **Vermittler-Disclaimer** durchgängig.

**Befehle:**
```bash
cd app
rg -n "enable row level security|create policy" supabase/migrations/ | wc -l
rg -n "service_role" src/ && echo "FEHLER: service_role im Frontend" || echo "OK"
rg -n "Content-Security-Policy|Strict-Transport-Security" .. ../web public || echo "Security-Header prüfen (Cloudflare _headers)"
```

**Tests:** Cross-Tenant-Negativtests (Org A ↛ Org B) · Rollen-/Plan-Gates · Security-Header aktiv · kein PII-Leak (Logs/Responses) · `audit_log` immutable (nur `service_role`-Insert, kein Update/Delete) · alle public Edge-Eingänge Turnstile + Zod.

**Acceptance:** Isolation bewiesen · Header/CSP aktiv · Audit immutable · DSGVO-Texte + AVV + Disclaimer vollständig · kein Secret im Client/Log.

> **Querverweis:** WAVE_06 (Security) · WAVE_14 (Legal/DSGVO) · `docs/security/*` · `docs/COMPLIANCE_MODEL.md` · `docs/launch/B_rechtstexte/*`.

---

# PHASE O — Tests, CI & Qualitätssicherung

**Ziel:** Reproduzierbar grün — oder Restfehler nach P0–P3 klassifiziert. **Führt den offiziellen Test-Runner ein** (Repo hat aktuell keinen).

**Test-Runner (verbindlich, §0.9 Test-Integrität):**
- **SQL/Edge:** Deno-Tests unter `app/supabase/tests/` — Pfadauflösung relativ zur Testdatei (`import.meta.url`), **nie** nur `process.cwd()` (sonst stiller Skip). Isolationstest-Harness ist blockierendes Gate.
- **Frontend:** Vitest unter `app/src/**/*.test.ts(x)`. Neue Scripts in `package.json`: `test`, `test:ci`.
- Code wird an Tests angepasst, **nie** Tests zurechtgebogen.

**Pflichtchecks:** install · lint · typecheck · unit · integration · **tenant-isolation** · migration (`db reset` idempotent) · frontend-smoke · build.

**Testbereiche:** alle Domänen aus WAVE_12 **+** Customer-Lifecycle (B) + Commercial Desk (C) + Billing/SB-Connect (D) + Mail (E) + Betriebszentrale (F) + Monitoring (I) + Theme (J) + Reservierung/Self-Service (L) + Support (M).

**Befehle:**
```bash
cd app
npm ci
npm run typecheck
npx supabase db reset            # 0001..00NN idempotent
deno test --allow-env --allow-read supabase/tests/   # Isolation + Webhook-Idempotenz + Server-Preis
npm run test:ci                  # Frontend (Vitest)
npm run build
npm audit --omit=dev || true
```

**Acceptance:** keine P0/P1-Testfehler · CI auf frischem Clone reproduzierbar (GitHub Actions / Cloudflare-CI) · **Cross-Org-Negativtests bestehen** · Webhook-Idempotenz + Server-Preis bewiesen · kein stiller Skip (Tests laufen real im offiziellen Runner).

> **Querverweis:** WAVE_12 (QA) · Phase 2 (Build-/Security-Gate) · `docs/engineering/TESTING.md` · `docs/GO_LIVE_TEST_MATRIX.md`.

---

# PHASE P — Deployment, Cloudflare, Backup, Rollback, Release *— ersetzt „Hetzner"*

**Ziel:** Sicher deploybar + wiederherstellbar — **Cloudflare Pages/Workers + Supabase**, kein Hetzner/Docker.

**Dokumente:** `docs/DEPLOYMENT.md` (Cloudflare Pages `web/` + `app/`, Workers, Base `/`, `_headers`/CSP) · `docs/BACKUP_DISASTER_RECOVERY.md` (Supabase PITR/Export) · `docs/operations/ROLLBACK.md` · `docs/INCIDENT_RUNBOOK.md`.

**Release-Artefakt (Phase 2 WAVE_01-konform):** sauber — **keine** Secrets, `.env`, `.git`, `node_modules`, `.claude`; Manifest + SHA-256; Cloudflare-Pages-Build-Output deterministisch.

**Backup/Restore:** Supabase-Backup (PITR/`pg_dump`) + **Restore-Drill durchgeführt** (nicht nur dokumentiert); RPO/RTO definiert; Edge-Function-Versionierung; Migrations-Rollback-Blöcke geprüft.

**Befehle:**
```bash
cd app
npm run build                         # Cloudflare-Pages-Output (dist/)
rg -rn "STRIPE_SECRET|SERVICE_ROLE|RESEND_API_KEY|password" dist/ && echo "FEHLER: Secret im Build" || echo "OK: Build secret-frei"
test -d dist/.git -o -f dist/.env && echo "FEHLER: verbotenes Artefakt" || echo "OK"
# Supabase: db push / functions deploy nur nach Owner-Gate (Live)
```

**Tests:** Build secret-frei + ohne verbotene Artefakte · Release-Verifier grün · **Restore getestet** (Drill) · Rollback-Block je Migration vorhanden · `_headers`/CSP im Deploy aktiv.

**Acceptance:** deterministischer, secret-freier Cloudflare-Deploy · Restore-Drill bestanden · Rollback dokumentiert + geprüft · keine Hetzner/Docker-Reste.

> **Querverweis:** Phase 2 WAVE_01 (Hygiene) · `finalization/phase2_release/GATES.md` · `docs/DEPLOYMENT.md`. **Owner-Gate:** Live-Deploy/Domain/Go-Live = Account-/Kosten-/außenwirksam → vorab ankündigen, erst auf OK.

---

# PHASE Q — Performance & Skalierung (300 Höfe / viele Käufer)

**Ziel:** Für 300 Kunden tauglich — Latenz, Queries, Kosten.

**Prüfen/finalisieren:** **Pagination überall** (keine unlimitierten Listen — Finder, Reservierungen, SB-Payments, Belege, Audit) · **DB-Indizes** auf häufig gequerten Spalten (`org_id`, `status`, `paid_at`, `created_at`, Geo) · **keine N+1** (Aggregate in der DB, nicht im Client) · Geo-Query-Performance (Finder „in der Nähe", PostGIS/Bounding-Box) · Edge-Caching (Cloudflare) für public Reads (Finder/Stand) · Connection-Pool/PgBouncer · Rate-Limit-Tuning · **Cloud-Kosten** (Cloudflare/Supabase) im Blick (§0 Wirtschaftlichkeit).

**Betriebszentrale Skalierungsanzeige (Phase G-Daten):** aktive Kunden/Höfe · Ressourcennutzung · langsamste Endpoints · DB-Last/Pool · Cache-Hit-Rate · Webhook-Lag · Kosten-/Ressourcenindikatoren.

**Befehle:**
```bash
cd app
rg -n "\.limit\(|\.range\(|order by .* limit" src/ supabase/ | head -40   # Pagination-Stichprobe
rg -n "create index" supabase/migrations/ | wc -l
rg -n "select .*\bin\b|map\(.*await" src/lib/ && echo "N+1-Verdacht prüfen" || echo "OK"
npm run build
```

**Tests:** Listen mit 300+ Einträgen performant + paginiert · keine N+1 auf Kernseiten (Finder/Reservierung/Dashboard) · Geo-Query unter Last stabil · Cache-Strategie für public Reads greift · Index-Coverage für `org_id`/`status`/`paid_at` belegt.

**Acceptance:** Pagination + Indizes vollständig · keine N+1 · public Reads gecacht · Skalierungsanzeige real · Kostenindikatoren sichtbar.

> **Querverweis:** WAVE_11 (DB-Härtung) · Phase 4 Track E (Datenmodell-Skalierung) · Lern-Loop (WIRTSCHAFTLICHKEIT/EFFIZIENZ-Insights).

---

# PHASE R — Produktpolitur gegen austauschbare SaaS-Masse

**Ziel:** LokaleBauernConnect wirkt wie eine **spezialisierte Premium-Plattform für regionale Lebensmittel direkt vom Hof**, nicht wie generische SaaS. Finale Politur vor Marktstart.

**Pro Hauptseite:** klare Zielgruppe · fachliche Aussage (Hof-Domäne) · hochwertige Headline (New-York-Marketing-Niveau, deutsch) · klare Primär-/Sekundäraktion · echte Datenquelle **oder** professioneller Zero-State · keine Dummytexte/toten Buttons/irrelevanten Karten/Mischbegriffe · rollenrichtige Begriffe · gutes Responsive (mobil-first, viele Käufer am Stand) · sichtbarer Kundennutzen · Trust-Elemente (Verifiziert-Badge, Vermittler-Disclaimer, Beleg-Pflichtangaben).

**Die Betriebszentrale muss wirken wie:** Betriebssicht · Kundensteuerung · Commercial Desk · Monitoring-Center · Cloud-Plattform-Sicht · AI-Operations · Audit-/Sicherheitszentrale. **NICHT wie:** Demo-Adminpanel · lose Linkliste · unfertige Entwicklerseite · DB-Viewer.

**Der operative Tagesbereich (L) muss wirken wie:** schneller mobiler Reservierungs-/Self-Service-Bereich — klar, reduziert, robust, ohne Admin-Ballast.

**Befehle:**
```bash
cd app
rg -in "lorem|TODO|placeholder|FIXME|coming soon|demgetext" src/ && echo "WARN: Platzhalter" || echo "OK"
rg -in "vendor|requisition|einsatz|stundenzettel|hetzner|SCC" src/ web ../web && echo "WARN: VMS/Hetzner-Rest" || echo "OK"
npm run build
```

**Acceptance:** jede Hauptseite premium + rollenklar + verdrahtet · keine Platzhalter/toten Buttons/Mischbegriffe · keine VMS/Hetzner-Reste · Disclaimer + Trust durchgängig · Betriebszentrale + operativer Bereich wirken wie spezialisierte Premium-Sicht.

> **Querverweis:** WAVE_10 (Premium UX) · Phase J (Theme) · `docs/MARKTSTART_PLAN.md` / `docs/SALES_DEMO_PATH.md`.

---

## Finale Abnahmeberichte (nach Phase R)

**Pflichtdatei 1 — `docs/finalization/final_acceptance_report_10_300_customers.md`:** geprüfte Bereiche · Änderungen · neue/geänderte Dateien · Migrationen · Server-Env · Betriebszentrale-Module · Edge-Routen · Tests · bestandene/fehlgeschlagene Checks · Risiken · Blocker · **Empfehlung pro Gate (10/50/100/300)**.

**Pflichtdatei 2 — `docs/finalization/open_risks_and_blockers.md`:** Blocker · Risiko · Auswirkung · betroffene Kunden · Priorität (P0–P3) · Lösungsvorschlag · Status.

**Pflichtdatei 3 — `docs/finalization/changed_files_index.md`:** Datei · Änderung · Grund · Risiko · Test.

---

## Definition von „fertig" (Phase 5)

Erst fertig, wenn: bestehende Strukturen erhalten + abgesichert · keine Kernflows beschädigt · **Customer-Lifecycle** steuerbar · **individuelle Tarife** funktionieren · Entitlements greifen serverseitig · **Billing vollautomatisch über Stripe** (Abo-Subscriptions, Auto-Rechnung, SEPA, Dunning + **SB-Connect**: Geld zum Hof, `fee+net==amount`) — **keine manuelle Rechnungserstellung** · Mail-Provider sicher vorbereitet · **Betriebszentrale** als echte Betriebssicht (kein SQL-Runner, kein service-role-Tor) · **Cloud-Plattform-Sicht** (Supabase/Cloudflare/Stripe) sicher + read-scoped · AI-Operations gegated + Owner-Review · Monitoring + Incidents sichtbar (Zero-State statt 500) · **Support** funktioniert (Kunde/Staff getrennt) · Theme-System mit 3 Scopes, **Editorial bleibt Default**, Ultra-Premium auswählbar · Plattform rollenklar (Käufer/Erzeuger, **keine VMS-Begriffe**) · **Reservierung/Abholung + Erzeuger-Self-Service** isoliert + mobil (kein Einsatzportal) · Security/Isolation/Audit geprüft · Tests im **offiziellen Runner** dokumentiert + reproduzierbar · Deployment/Backup/Rollback (**Cloudflare/Supabase, kein Hetzner**) geprüft (Restore-Drill bestanden) · Performance für 300 tauglich · Risiken ehrlich dokumentiert · **keine Fake-Fertigmeldung** (Owner erklärt „fertig").

---

## Abschlussbericht-Format pro Phase/Block

```md
## Block abgeschlossen: <A…R — Name>
- Geändert: <Dateien — Migrationen, Edge Functions, React-Sichten, Doku>
- Tests/Verifikation: <db reset idempotent · Isolation Cross-Org · Webhook-Idempotenz · Server-Preis · typecheck/build grün · Restore-Drill>
- Risiken: <additiv? Retrofit? Feature-Flag? Rollback (drop-Block)?>
- Compliance: <Vermittler-Disclaimer · Beleg-Pflichtangaben · keine Klartext-IP/PII · Secrets nur Edge/CF>
- Owner-Gate offen? <Stripe Live/Connect · Resend-Domain · Supabase-EU · Cloudflare · Domain · Sentry>
- Nächster Block: <…>
```

> Kein Prosa-Ballast. Token sparen. Arbeitsdateien als Gedächtnis nutzen (`finalization/phase5_scale/{WORK_FILES,CUSTOMER_GATES,MANUAL_TASKS}.md`).

---

## Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Stop-Regeln, Verbote, USP) · `AGENTS.md` (Subagenten-Roster, harte Regeln) · `PHASEN.md` (Phase 5, Marktstart-Pflicht-Set, **Gate 10**).
- **Landkarte:** `MASTER_INDEX.md` (4 Commercial/Billing · 5 Operations · 6 Testing · 7 Finalisierung — `phase5_scale/PHASES_A_TO_R` = diese Datei).
- **Phase-5-Geschwister:** `CUSTOMER_GATES.md` (Gates 10/50/100/300) · `SELF_UPDATING_CLAUDE_MD.md` (Lern-Loop) · `MANUAL_TASKS.md` (Owner-Gates) · `MASTERPROMPT.md` · `WORK_FILES.md`.
- **Vorphasen:** `finalization/WAVE_05…15_*.md` · `phase2_release/GATES.md` (A–F) · `phase3_betrieb/{MASTERPROMPT,GATES}.md` (Ops-Gate) · `phase4_vertical/TRACK_A_SB_PAYMENT.md` (SB-USP/Connect).
- **Reale Artefakte (Basis):** `app/supabase/migrations/0001…0003` · `app/supabase/functions/{create-checkout,stripe-webhook,_shared/*}` · `app/src/lib/{data,payments,supabase,types,geo,seed}.ts` · `app/package.json` · `app/.env.example`.
- **Subagenten:** `architekt` (Kern-vs-Spezial-Grenze) · `db-rls-spezialist` + `qa-tester` (Migrationen/Isolation) · `payment-engineer` + `edge-functions-spezialist` (Billing/SB) · `security-auditor` + `compliance-officer` (N/R) · `frontend-design-guardian` (J/K/L/R) · `performance-cost-optimizer` (Q) · `devops` (P) · `platform-onboarder` (Steuerung).

> **Vermittler-Disclaimer (durchgängig):** Die Plattform **vermittelt**, **bindet die Zahlung an** und stellt einen **Beleg** aus. Verkäufer und Steuerpflichtiger ist der **Hof** (Stripe Connected Account). Die Plattform **verkauft nicht selbst**, **berät nicht** und übernimmt **keine Warenhaftung**. Jeder Account-/Kosten-/Vertrags-/Go-Live-Schritt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
