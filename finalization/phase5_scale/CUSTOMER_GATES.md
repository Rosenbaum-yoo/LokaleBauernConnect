# Customer-Gates 10 / 50 / 100 / 300 — zahlende Erzeuger (Phase 5 · Skalierung)

> **Was diese Datei ist.** Die **ausführbare Gate-Maschine** der Skalierung von LokaleBauernConnect: vier kundenmengenbasierte Schwellen (10 / 50 / 100 / 300 zahlende **Erzeuger**), je Stufe als **harte, abnehmbare Bedingung** über vier Betriebs-Dimensionen — **Performance · Ops · Support · Billing** — plus die 7 Produktionspfeiler als Querschnitt. Ein Gate ist **nie eine Behauptung**, sondern eine reproduzierbar geprüfte Schwelle: erst grün, dann die nächste Kundenstufe.
>
> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter) · Rolle = **Vermittler** (kein Eigenverkauf, keine Beratung, kein eigener Kaufvertrag — Disclaimer durchgängig). „Skalierung" heißt hier: mehr Höfe, mehr Käufer:innen, mehr SB-Transaktionen — **ohne** dass die Plattform je Warenbestand, Preis oder Kaufvertrag übernimmt (*Domain owns truth, Plattform owns aggregation & isolation*).
>
> **Stack fix (Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker** — skaliert wird **innerhalb** der Supabase/Postgres- und Cloudflare-Plattform.
>
> **Adaptiert** aus dem TempConnect-Blueprint (read-only Referenz, falls vorhanden — `finalization/phase5_scale/CUSTOMER_GATES.md`) auf diese Domäne und diesen Stack. **Keine VMS-/Hetzner-Begriffe** (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne übersetzt: SCC → Owner-/Staff-Konsole (Phase 3) · Hetzner-Status → Supabase-/Cloudflare-Plattformsicht · Subscription/SEPA → Stripe-Abo + **SB-Bezahl-USP**.
>
> **Bezug & Konflikt-Hierarchie:** `CLAUDE.md` (§0-Direktive · 7 Produktionspfeiler · Verbote · Stop-Regeln) · `AGENTS.md` (harte Regeln · Subagenten) · `PHASEN.md` (Phase 5 · Customer-Gates 10/50/100/300 · **Gate 10 = erste zahlende Erzeuger**) · `MASTER_INDEX.md` · **`docs/finalization/10_300_customer_readiness_matrix.md`** (normative Soll-Staffelung je Bereich §2–§16 — diese Datei ist deren **ausführbares Abnahme-Frontend**) · `docs/GO_LIVE_TEST_MATRIX.md` (Fall-Liste A–X, Gates A–F, Marktstart-Set M-1…M-8) · `finalization/phase2_release/GATES.md` (Release-Gates A–F) · `finalization/phase4_vertical/TRACK_E_DATABASE.md` (Scale-Gate · MV/Cache/Geo/Suche) · `docs/releases/PHASE_STATUS.md` (Ist-Tracker). **User-Anweisung > AGENTS.md > Subagent/Skill > CLAUDE.md > diese Datei.**
>
> **Stand:** 2026-06-20 · **Zuständig:** Claude (gesamter Stack + OZ-Execution-Part) · **Subagenten:** `performance-cost-optimizer` · `db-rls-spezialist` · `payment-engineer` · `qa-tester` · `devops` · `security-auditor` · `compliance-officer` · **Freigabe:** Owner (Go-Live · Supabase-/Cloudflare-Tier · Stripe-Account/Live-Keys · Kosten · Domain).

---

## 0. Grundprinzip & Lesart

### 0.1 — Ein Gate ist eine technische Schwelle, keine Behauptung

Claude Code darf **nie** behaupten „zahlende Kunden sind garantiert" oder „skaliert" als Gefühl. Stattdessen: **harte, reproduzierbar prüfbare Gates**. Die Plattform gilt erst dann als bereit für eine Kundenstufe, wenn das jeweilige Gate **vollständig grün** ist. **Kein „fast grün":** eine offene Pflichtzeile = Gate **nicht** erreicht = No-Go für diese Stufe (`CLAUDE.md` §0.1 — „fast fertig zählt nicht").

### 0.2 — Kumulativ & deny-by-default beim Wachstum

Gates sind **kumulativ**: Gate 50 enthält Gate 10, Gate 100 enthält Gate 50, Gate 300 enthält Gate 100. Was für eine Stufe nicht grün ist, wird **nicht** auf diese Stufe skaliert — deny-by-default gilt auch beim Wachsen, exakt wie die RLS deny-by-default in der DB.

### 0.3 — Die vier Betriebs-Dimensionen (je Gate geprüft)

| Dim. | Bedeutung | Führende Pfeiler / Quelle |
|---|---|---|
| **Performance** | Latenz-Budgets, Pagination, Indizes, N+1-Freiheit, Geo/Suche, Edge-Cache, Kostenlast | P2/P7 · `TRACK_E_DATABASE.md` · `finalization/WAVE_11_database.md` · Release-Gate E |
| **Ops** | Deploy/Rollback, Backup/PITR, Monitoring/Alarme, Audit, Incident, Runbook | P5 · `docs/engineering/OPERATIONS_RUNBOOK.md` · `docs/{MONITORING,OBSERVABILITY,BACKUP_DISASTER_RECOVERY,INCIDENT_RUNBOOK}.md` · Phase 3 Ops-Gate |
| **Support** | Hof-Verifizierung, Eskalation, Staff-Sicht, Ticket-Andockung, Dispute-Handling | P4/P5 · `docs/ROLE_AND_PERMISSION_MODEL.md` · `finalization/WAVE_07_admin_centers.md` |
| **Billing** | Geldfluss (Erzeuger-Abo + **SB-Bezahl-USP**), Webhook-Wahrheit, Entitlements, Dunning, Unit Economics | P5 · `docs/{STRIPE-SETUP,SUBSCRIPTION_LIFECYCLE,PRICING}.md` · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` · `app/supabase/functions/{create-checkout,stripe-webhook}/` |

> Querschnitt über alle Dimensionen: die **7 Produktionspfeiler** (`CLAUDE.md`) — **P1** Org-Boundary/Isolation · **P2** Zero-State · **P3** Scope-Transparenz · **P4** RBAC · **P5** Audit · **P6** Testpflicht · **P7** Drilldown-Integrität. Eine Skalierung darf **keinen** Pfeiler aufweichen; insbesondere **P1 (Tenant-Isolation)** ist auf jeder Stufe ein harter Blocker (fremde Org = 403/0 Zeilen, nie 200 mit Fremddaten).

### 0.4 — Last-Annahmen je Stufe (Planungs-Richtwerte, kein SLA)

Quelle: `PHASEN.md` (300 Höfe) · `docs/finalization/10_300_customer_readiness_matrix.md` §0.1 · `TRACK_E_DATABASE.md` §1. Schwellen/Budgets sind **Konfig, nie hartkodiert** (`CLAUDE.md` Verbote).

| Stufe | Bedeutung | Höfe | Produkte | Reservierungen/Tag | SB-Zahlungen/Tag |
|---|---|---|---|---|---|
| **10** | Erste zahlende Erzeuger — **Marktstart-Schwelle** | ≤ 10 | ≤ 300 | ~50 | ~30 |
| **50** | Erste Region trägt sich | ≤ 50 | ≤ 2 000 | ~400 | ~300 |
| **100** | Mehrere Regionen | ≤ 100 | ≤ 5 000 | ~1 500 | ~1 200 |
| **300** | Überregionaler Marktführer-Anspruch | ≤ 300 | ≤ 15 000 | ~6 000 | ~5 000 |

### 0.5 — Status-Legende (identisch zu `PHASE_STATUS.md` / Readiness-Matrix)

✅ **grün** = implementiert **und** real verifiziert (reproduzierbar) · 🔨 **teilweise** = Code/Datenbasis da, Verifikation fehlt (**nie** „grün" für ein Gate) · ⬜ **offen** · ➖ **entfällt** (bewusst, mit Begründung).

### 0.6 — Verhältnis zur Readiness-Matrix (keine Doppel-Wahrheit)

`docs/finalization/10_300_customer_readiness_matrix.md` ist die **normative Soll-Staffelung** (Was muss je Bereich je Stufe wahr werden?). **Diese Datei** ist das **ausführbare Abnahme-Frontend**: die Checklisten + Verifikationsbefehle + Go/No-Go-Protokolle, mit denen ein Gate **tatsächlich** auf grün gestellt wird. Bei Konflikt gewinnt die Readiness-Matrix als Spezifikation; diese Datei verweist auf deren Abschnitte (§), statt Inhalte zu duplizieren.

---

## 1. Repo-Ist (geprüft, damit Befehle nicht fiktiv sind)

Geprüfte Quellen am 2026-06-20: `app/package.json`, `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql`, `app/supabase/functions/{create-checkout,stripe-webhook,_shared}/`, `app/supabase/{seed.sql,setup_all.sql}`, `finalization/phase2_release/GATES.md`, `docs/finalization/10_300_customer_readiness_matrix.md`.

| Vorhanden heute | Geplant (Welle/Track — noch nicht im Repo) |
|---|---|
| `package.json`-Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `typecheck` | `lint`, `ci`, `scan:secrets`, Test-Runner (`test:iso`/`test:billing`/`smoke`) — WAVE_01/WAVE_12 |
| Migrationen `0001`–`0003` (Kern · Payments · Marktplatz) | `0005_scale.sql` (MV/Cache/Geo/Suche) — **Track E** (`TRACK_E_DATABASE.md`) |
| Edge Functions `create-checkout`, `stripe-webhook`, `_shared/{supabaseAdmin,stripe,email,cors}.ts` | `connect/onboard`, `sb/refund`, `sb/dashboard`, `create-reservation`, `refresh-metrics`, Edge-Cron — WAVE_09/Track A/Track E |
| `supabase/{seed.sql,setup_all.sql}` | `supabase/perf/{seed_bulk,seed_scale,explain_scale}.sql` — WAVE_11/Track E |
| `finalization/phase2_release/GATES.md` (Release-Gates A–F) | `app/scripts/{ci.sh,scale-gate.sh,release-verify.sh}` — WAVE_01/Track E |

> **Disziplin (`CLAUDE.md` §0.9 Test-Integrität):** Wo unten ein Befehl auf ein **geplantes** Script/Migration zeigt, ist die zugehörige Gate-Zeile erst grün, **wenn dieses Artefakt real existiert und real läuft** — kein stiller Skip, kein „grün per Annahme". Ein Gate-Punkt, dessen Werkzeug fehlt, bleibt 🔨/⬜ und blockiert die Stufe.

---

## 2. Gate 10 — Minimaler produktiver Betrieb (Marktstart)

> **Schwelle: erste 10 zahlende Erzeuger.** Das ist das **Marktstart-Pflicht-Set** (`PHASEN.md`). Hier wird bewiesen: echter Geldfluss, echte Tenant-Isolation, echter Kernflow Finder→Reservierung end-to-end mit echten Daten.

### 2.1 — Querschnitt (Pflicht, harte Blocker)
- [ ] **P1 Tenant-Isolation grün, CI-blockierend** — zwei Orgs (`org_a`/`org_b`), JWT-Wechsel: fremde Org = **403/0 Zeilen**, nie 200 mit Fremddaten (E-01…E-09). `AGENTS.md`: **kein Merge ohne grünen Isolationstest.**
- [ ] **P4 Drei-Welten-Trennung** — Käufer / Erzeuger / Staff sauber getrennt in **UI und API**; Token-Tausch = 403 (D-01…D-08).
- [ ] **P5 Audit unabschaltbar** — jede kritische Mutation (Reservierung, Verfügbarkeit, Verifizierung, Zahlung) → Audit (`actor, org, from→to, reason?, request_id, ts`); Reason-Pflicht bei Storno/Refund (X-01/X-02).
- [ ] **P2 Zero-State statt 500** — leere Daten → leere Arrays / `available:false`, UI „Noch keine Daten", **kein** 500 (X-03).
- [ ] **Vermittler-Disclaimer durchgängig** in allen kaufnahen Flows (Finder, Detail, Reservierung, ggf. Bezahlseite/Quittung) — `compliance-officer` (CMP-04).
- [ ] **Kein Fake-Data in Prod-UI** — Header zeigt „Live-Daten"; Seed nur Dev (`isSupabaseConfigured`-Gate); `is_demo`-Sätze in Prod gefiltert.

### 2.2 — Performance (Stufe 10)
- [ ] Finder→Detail→Reservierung end-to-end mit **echten** Supabase-Daten (kein Seed-Fallback in Prod), p95 im Stufen-Budget für ≤ 10 Höfe / ≤ 300 Produkte.
- [ ] Clientseitige Liste ausreichend (≤ 10 Höfe), **aber** Basis-Indizes vorhanden (`farms_plz_idx`, `products_farm_idx` aus `0001`) — kein Seq-Scan auf dem Kernpfad.
- [ ] Keine offenen kritischen **500er** auf dem Kernflow; Konsole sauber (keine `TypeError`/401-Schleifen).

### 2.3 — Ops (Stufe 10)
- [ ] **Build/CI grün** (Gate A) — `tsc --noEmit` + `vite build` deterministisch, kein `any`-Leak.
- [ ] **Secret-Scan leer** (Gate B) — kein `sk_*`/`whsec_`/`service_role`/`.env`/`.claude` im `dist/`.
- [ ] **Security-Header** (CSP `connect-src`-Allowlist Supabase/Stripe, HSTS, X-Frame) am Cloudflare-Rand gesetzt.
- [ ] **Reproduzierbarer Deploy + Rollback-Pfad** dokumentiert (Cloudflare Pages); Owner-Freigabe für Prod.
- [ ] **Backup/PITR aktiv** (Supabase) + Restore-Vorgehen dokumentiert.
- [ ] **Health-Check + Fehler-Alarm** (5xx, **Webhook-Fehlschlag**, Isolations-Regression) sichtbar — Alarm auf echte Fehler, **nicht** auf leere Daten (P2).
- [ ] **Betriebs-Runbook**: tägliche/wöchentliche Routine + Owner-Freigabe-Punkte markiert.

### 2.4 — Support (Stufe 10)
- [ ] **Erzeuger-Onboarding bis `verified` live** — Registrierung → `draft` → `submitted`, serverführende Zod-Validierung (unvollständig = 422, Status bleibt `draft`).
- [ ] **Hof-Verifizierung (Staff)** — `submitted→in_review→verified`; **nie öffentlich/SB-eligible vor `verified`**; Ablehnung mit **Reason-Pflicht** + Audit.
- [ ] Minimale **Staff-Sicht** für Verifizierung + Eskalation (rollengebunden, jeder Zugriff auditiert).

### 2.5 — Billing (Stufe 10) — **mind. ein Geldfluss live**
- [ ] **Mindestens ein Geldfluss aktiv:** Erzeuger-**Abo** *oder* **SB-Zahlung** (M-5). SB-Zahlung darf auf Stufe 10 🔨 sein, wenn das Abo den Geldfluss trägt.
- [ ] **EIN signaturgeprüfter, idempotenter Stripe-Webhook** ist die **einzige** Entitlement-Quelle: setzt `orgs.plan` serverseitig; **Replay = 200 no-op** (`payment_events`-Dedup über `event.id`); Signatur erzwungen.
- [ ] **Betrag serverseitig** (aus DB), Client-/QR-Betrag ignoriert; Plan-Lock zeigt **konkreten Upgrade-Pfad** (kein toter Lock).
- [ ] **Gebühr serverseitig**, nie Client/hartkodiert (`sb_payments.platform_fee_cents` / `application_fee`); Owner-Pricing-Entscheidung getroffen (RM-03).
- [ ] **Unit Economics:** Kosten je Hof bekannt, Free/Low-Tier ausreichend; **Kosten/SB-Transaktion < erhobene Gebühr**.

### 2.6 — Verifikation (Stufe 10)
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# Build + Typecheck (Gate A) — heute vorhanden
npm run build                       # tsc --noEmit && vite build → grün, kein any-Leak

# Secret-Scan über das Release-Artefakt (Gate B)
grep -rEi 'sk_(live|test)_|whsec_|service_role|SUPABASE_SERVICE' dist/ ; echo "exit=$? (1 = sauber/kein Treffer)"
ls -la dist/ | grep -E '\.env|\.claude' ; echo "exit=$? (1 = kein Secret-Artefakt)"

# Tenant-Isolation (Gate C, CI-blockierend) — Runner aus WAVE_12; bis dahin 🔨, kein stiller Skip
node supabase/tests/run-isolation.mjs        # erwartet: fremde Org = 403/0 Zeilen, Exit 0

# Billing-Wahrheit (WAVE_09) — Webhook-Idempotenz/Signatur
node supabase/tests/run-billing.mjs          # Replay = 200 no-op; unsigniert = 401; Plan nur via Webhook

# Kernflow lokal end-to-end gegen Supabase Local
supabase start && supabase db reset          # 0001..0003 frisch
npm run dev                                   # Finder→Detail→Reservierung mit echten Daten klicken
```
> Bis `run-isolation.mjs` / `run-billing.mjs` real existieren (WAVE_12/WAVE_09), bleiben die betroffenen Zeilen **🔨** und Gate 10 ist **nicht** grün. Build + Secret-Scan laufen bereits gegen den realen Stand.

**Abnahme-Dokument:** `docs/finalization/gate_10_decision.md` (Datum · Commit/Tag · Verantwortliche:r · Go/No-Go).

---

## 3. Gate 50 — Stabiler Betrieb (Region trägt sich)

> **Schwelle: bis 50 zahlende Erzeuger.** Zusätzlich zu Gate 10. Beweis: Betrieb **ohne Heldentum**, erste Automatisierung, SB-Bezahl-USP vollständig.

### 3.1 — Performance (Stufe 50)
- [ ] **Serverseitige Pagination** im Finder + in der Reservierungsliste (keine unlimitierten Listen) — `FarmFilter` um `page`/`radiusKm` additiv erweitert, kein UI-Bruch.
- [ ] **Voller DE-PLZ-Zentroid-Datensatz** — kein „PLZ unbekannt"-Reibungspfad regional (Schnittstelle `distanceFromPlz` stabil).
- [ ] Indizes auf heißen Pfaden **und Policy-Prädikaten** (`(org_id,status,created_at)`), `EXPLAIN`-stichprobenfrei kein Seq-Scan unter 50-Hof-Last.

### 3.2 — Ops (Stufe 50)
- [ ] **Strukturierte Logs / Sentry** + **Webhook-Health-Alarme** scharf.
- [ ] **Backup/PITR + Restore real geübt** (nicht nur dokumentiert).
- [ ] **Reservierungs-Ablauf R6/R7** (Expiry) via **Edge-Cron** automatisiert.
- [ ] **Retention-/Soft-Delete-Job** für Fristen (Edge-Cron) vorbereitet; `deleted_at` in keiner Lese-Query sichtbar.
- [ ] Incident-Modell vorhanden (`docs/INCIDENT_RUNBOOK.md` gelebt, nicht nur Datei).

### 3.3 — Support (Stufe 50)
- [ ] **Verfügbarkeits-Selbstpflege live** — Erzeuger pflegt **nur eigene** Produkte (403 fremd), `out` blockt Reservierung-CTA.
- [ ] **Ticket-Andockung** an den Kern-Support; Verifizierungs-Queue mit erster Priorisierung/SLA-Marker.
- [ ] **MFA-Pflicht** für sensible Geld-Aktionen (Refund, Connect-Onboarding) erzwungen; Break-Glass auditiert.

### 3.4 — Billing (Stufe 50) — **SB-Bezahl-USP vollständig**
- [ ] **SB-Eligibility-Gate** — `initiate` blockt bei nicht-`verified` Hof oder unfertigem Connect-Onboarding (kein toter Button, Sperr-Hinweis).
- [ ] **Connect-Geldfluss** — Destination Charge: Netto an Hof-Connect, `application_fee` an Plattform; Betrag aus DB (`products.price_cents`), QR-Betrag ignoriert.
- [ ] **QR (HMAC-signiert) → Bezahlseite → Quittung** — Quittung nur nach `paid`, Hof als Leistungserbringer, **Vermittler-Hinweis** Pflichtinhalt.
- [ ] **Refund** nur mit **MFA/Staff + Reason**, Webhook setzt `refunded`; Webhook-Betrags-/Currency-Abgleich (Mismatch ⇒ kein `paid`).
- [ ] **Dunning/Zahlungsausfall-Flow** für das Abo (`payment_failed` → Status + Mahnung).
- [ ] **Deckungsbeitrag je Hof positiv**; Tier-Wechsel (Supabase/Cloudflare) bewusst durch Owner.

### 3.5 — Verifikation (Stufe 50)
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
npm run build
node supabase/tests/run-isolation.mjs        # weiterhin grün (keine Regression durch Pagination/Indizes)
node supabase/tests/run-billing.mjs          # + SB: Eligibility-Block, Connect-Netto, Refund mit Reason/MFA
node supabase/tests/run-smoke.mjs            # Smoke-Suite über Kern + SB-Flow (Playwright/Headless)
# Pagination-/Index-Stichprobe gegen Supabase Local:
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "explain (analyze) select id from farms where deleted_at is null order by name,id limit 24;"
```
**Abnahme-Dokument:** `docs/finalization/gate_50_decision.md`.

---

## 4. Gate 100 — Differenzierter Betrieb (mehrere Regionen)

> **Schwelle: bis 100 zahlende Erzeuger.** Zusätzlich zu Gate 50. Beweis: **Performance & Kosten unter realer Breite**. Hier muss das **Track-E-Scale-Gate** (`TRACK_E_DATABASE.md`) grün sein.

### 4.1 — Performance (Stufe 100) — Track-E-Schwerpunkt
- [ ] **Cursor-/Keyset-Pagination** überall, **keine N+1** (`getFarm` = 1 Query), `EXPLAIN`-Review der Top-Queries.
- [ ] **Materialized Views** (`platform_kpi_mv`, `farm_metrics_mv`) + getakteter `CONCURRENTLY`-Refresh; KPIs ≤ 20 ms aus MV statt Live-Aggregat.
- [ ] **MV-RLS-dicht:** weder `anon` noch `authenticated` lesen MVs direkt; Zugriff nur via `security definer`-RPC mit `auth.uid()`/`is_org_member`-Bindung (fremde Org = 0 Zeilen).
- [ ] **Edge-Cache** für **anonymen, nicht-personalisierten** Katalog (`s-maxage`+`stale-while-revalidate`); kritische Wahrheiten (Reservierung/SB-Status/Entitlement) **nie** gecacht.
- [ ] **Edge-Geocoding** (rate-limitiert, **kein** Client-Key) + Bounding-Box-Read; kein Voll-Load.
- [ ] **Volltextsuche** über `search_tsv`-GIN (`websearch_to_tsquery`, `german`) statt `ilike '%…%'`.
- [ ] **Last-Benchmark** gegen Verlaufs-Seed (~15k Produkte / ~300k Reservierungen / ~500k SB-Zahlungen): **kein** Seq-Scan auf `farms/products/reservations/sb_payments/reviews`, alle Pfade im Budget (`TRACK_E_DATABASE.md` §1.2).

### 4.2 — Ops (Stufe 100)
- [ ] **Monitoring differenziert** — Fehlertrend, langsame Endpoints sichtbar; **SLO/Burn-Rate**-Dashboards.
- [ ] **DB-Indizes geprüft** (`EXPLAIN` Top-Queries), Queue-/Job-Status (Edge-Cron) sichtbar.
- [ ] **Owner-/Staff-Audit stark** — Audit-Auswertung + Retention; Owner-Konsole (Phase 3) Drilldown-fähig (P7, kein org-fremder Deep-Link).

### 4.3 — Support (Stufe 100)
- [ ] **Saison-Alerts (opt-in)** mit Einwilligung + Rate-Limit (DSGVO); Zero-State bei leerer Saison.
- [ ] **Dispute-Eskalation** — `charge.dispute.created` → Flag + Staff-Eskalation + Audit; Dispute-Dashboard.
- [ ] **Customer-Health-/Risk-Indikatoren** (z. B. veraltete Verfügbarkeit, Onboarding-Stau) in der Konsole.

### 4.4 — Billing (Stufe 100)
- [ ] **Bessere Commercial-/Billing-Auswertungen** (org-gescoped, echte KPIs, Zero-State bei 0 — **kein** Fake).
- [ ] **Connect-Status gecacht** via `account.updated`; Reconciliation-Job (Abgleich Stripe ↔ `subscriptions`/`sb_payments`).
- [ ] **Kosten/Read durch Cache gesenkt**, **Kosten/Transaktion < `platform_fee`** unter 100er-Breite belegt.

### 4.5 — Verifikation (Stufe 100)
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
supabase db reset                            # 0001..0005 (inkl. Track-E 0005_scale.sql)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/seed_bulk.sql   # 300 Höfe
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/seed_scale.sql  # Verlauf + MV-Refresh
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/perf/explain_scale.sql  # kein Seq Scan
bash scripts/scale-gate.sh                    # erwartet: SCALE-GATE: PASS (Track E)
node supabase/tests/run-isolation.mjs         # weiterhin grün (MV/RPC/Cache ohne Leck)
```
**Abnahme-Dokument:** `docs/finalization/gate_100_decision.md`. **Voraussetzung:** Track-E-Scale-Gate grün (`finalization/phase4_vertical/TRACK_E_DATABASE.md` §12).

---

## 5. Gate 300 — Skalierungsfähiger Betrieb (Marktführer-Anspruch)

> **Schwelle: bis 300 zahlende Erzeuger.** Zusätzlich zu Gate 100. Beweis: **zukunfts-/marktführer-fest, selbsttragend, austauschresistent** — alle Gates aller Phasen + Burn-in.

### 5.1 — Performance (Stufe 300)
- [ ] **Bounding-Box-Read am Edge** + Clustering-fähiger Katalog; **Build-Zeit stabil** trotz Feature-Wachstum (Lazy-Routes/Code-Splitting, Bundle-Budget je Route).
- [ ] **Read-Replica/Connection-Pooling bewertet** (Transaction-Pooler / PgBouncer), Indizes auf **allen** Policy-Prädikaten.
- [ ] **Verlaufsdaten-Lebenszyklus** scharf — `archived_at`-Job + Hot-Indizes (`… where archived_at is null`); **Partition-Pfad** für `audit_log`/`sb_payments` als Owner-freigegebenes Runbook bereit.
- [ ] **Robuste Job-Verarbeitung** (Edge-Cron stabil unter Last); keine unlimitierten großen Abfragen.

### 5.2 — Ops (Stufe 300)
- [ ] **Blue/Green-Deploy + Edge-Function-Versions-Rollback**; **RPO/RTO** definiert und **Restore-Drill** durchgeführt.
- [ ] **Incident-Prozess vollständig** (nicht nur Modell) — On-Call, Eskalation, Post-Mortem.
- [ ] **Infrastruktur-/Plattform-Runbooks** vollständig (Supabase/Cloudflare-Sicht statt Hetzner); **Onboarding-Checklisten je Rolle**.
- [ ] **Kosten-/Ressourcenindikatoren** in der Konsole (wirtschaftlich relevant, §0.3) — Hotspots sichtbar.
- [ ] **AI-/Automations-Operationen nur mit Review-Freigabe** (kein autonomer Prod-Eingriff ohne Owner).

### 5.3 — Support (Stufe 300)
- [ ] **Staff-Center mit SLA/Queue-Steuerung**; org-übergreifender Zugriff **nur** über auditierte Support-Andockung.
- [ ] **Mehrere SB-Stände je Hof** + **Schwund-Dashboard**; Dispute-Dashboard vollständig.
- [ ] **Enterprise-Readiness-Doku** vorhanden; **ehrlich dokumentierte Grenzen** nicht vollständig automatisierter Prozesse.

### 5.4 — Billing (Stufe 300)
- [ ] **Beide Geldströme tragend** (Abo + SB-Gebühr), Plan-Migration sauber; Entitlements serverseitig über **alle** Features durchgesetzt (Client-Bypass unmöglich).
- [ ] **Marge unter Voll-Last bestätigt** — Billing vollautomatisch, kein nennenswerter Personalaufwand pro Kunde.
- [ ] **Aufsichtsrechtliche Einordnung** der Connect-Architektur vor breitem SB-Rollout geklärt (RM-06, Owner/extern).

### 5.5 — Verifikation (Stufe 300)
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
npm run build                                 # Bundle-Budget je Route, Build-Zeit stabil
bash scripts/scale-gate.sh                    # Track-E-Scale-Gate PASS unter Verlaufs-Last
# Vollständige Suite + Burn-in (Phase 2 Burn-in ≥ 7 Tage, finalization/phase2_release/GATES.md):
node supabase/tests/run-isolation.mjs && node supabase/tests/run-billing.mjs && node supabase/tests/run-smoke.mjs
# Restore-Drill (Supabase PITR) + RPO/RTO-Protokoll: docs/BACKUP_DISASTER_RECOVERY.md
# Kosten-/Ressourcen-Review: docs/COMMERCIAL_SOURCE_OF_TRUTH.md (Deckungsbeitrag/Hof, Kosten/Transaktion)
```
**Abnahme-Dokument:** `docs/finalization/gate_300_decision.md`. **Voraussetzung:** ALLE Gates aller Phasen + Phase-2-Burn-in + Track E vollständig.

---

## 6. Verknüpfung mit den anderen Phasen-Gates

Die Customer-Gates sind **zusätzlich** zu den Phasen-Gates (`PHASEN.md` · `finalization/phase2_release/GATES.md`):

| Gate | Verlangt mindestens |
|---|---|
| **Gate 10** | Phase 1 (Fundament + Kernflow) + Release-**Gate A** (Build), **B** (Security), **C** (Isolation), **D** (Legal), **F** (Smoke) partiell + **mind. ein Geldfluss** (WAVE_09 *oder* Track A) |
| **Gate 50** | Release-Gates A–E + Phase 3 **Ops-Gate** (Owner-/Staff-Konsole) + **SB-Bezahl-USP** (Track A) vollständig + MFA |
| **Gate 100** | alle Phase-1/2/3-Gates + **Track-E-Scale-Gate** (Performance/MV/Cache/Geo/Suche) grün |
| **Gate 300** | **ALLE** Gates aller Phasen + Phase-2-**Burn-in ≥ 7 Tage** + Track E vollständig (inkl. Partition-Readiness) |

> **Marktstart = Gate 10 grün.** Danach wächst die Plattform **kontrolliert Gate für Gate** — nie wird eine Stufe „auf Verdacht" bedient.

---

## 7. Wirtschaftlichkeits-Verknüpfung (kritisch — `CLAUDE.md` §0.3)

Bei **jedem** Gate werden die **Skalierungskosten** mitgedacht; Erkenntnisse fließen in die Lernschleife (Kategorie **WIRTSCHAFTLICHKEIT**, `finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md`):

| Gate | Wirtschaftliche Leitfrage |
|---|---|
| **10** | Reichen Free/Low-Tier (Supabase/Cloudflare)? Was kostet ein Hof? Stripe-Gebühren einkalkuliert? Geldfluss live? |
| **50** | Skaliert Dunning/Connect-Auszahlung automatisch? Welche Zahlungsausfälle/Disputes? Deckungsbeitrag je Hof positiv? |
| **100** | Welche Queries werden teuer? Senkt der Edge-Cache die Read-Kosten messbar? Webhook-/Refresh-Last? Kosten/Transaktion < Gebühr? |
| **300** | Wo sind die Ressourcen-Hotspots? Read-Replica wirtschaftlich gerechtfertigt? Billing vollautomatisch **ohne** Personalaufwand pro Kunde? Marge unter Voll-Last? |

---

## 8. Gate-Disziplin (verbindlich)

- **Kein „fast grün" durchwinken** — eine offene Pflichtzeile = Gate **nicht** erreicht (`CLAUDE.md` §0.1).
- **Jedes Gate dokumentiert** — `docs/finalization/gate_<n>_decision.md` mit **Datum · Commit/Tag · Verantwortliche:r · Go/No-Go**; Ergebnis spiegelt in `docs/releases/PHASE_STATUS.md` (Tracker-Pflicht).
- **Bei NO-GO:** Blocker nach `docs/finalization/open_risks_and_blockers.md` (Bereich-# + nötige Owner-Entscheidung).
- **Owner-Bestätigung** vor Aufnahme der nächsten Kundenstufe (Go-Live/Tier/Stripe/Kosten = Owner-Freigabe).
- **Test-Integrität (`CLAUDE.md` §0.9):** ein Gate-Punkt, dessen Test/Script unter dem offiziellen Runner nicht **real** läuft, zählt **nicht** als grün. Code wird an Tests angepasst, nie Tests zurechtgebogen.
- **🔨/⬜ ehrlich führen** — Status hier ist keine Lizenz zum Schönen; grün **erst**, wenn reproduzierbar verifiziert.

---

## 9. Abnahme-Protokoll je Stufe (Owner-gegengezeichnet)

```
## Customer-Gate-Abnahme · Stufe <10|50|100|300> · <Datum> · <Commit/Tag>
- Querschnitt (P1 Isolation / P4 RBAC / P5 Audit / P2 Zero-State / Disclaimer):  ✅/⛔
- Performance:  Budgets eingehalten (Stufe §0.4)?  EXPLAIN ohne Seq-Scan?     ✅/⛔
- Ops:          Build/Secret/Deploy/Backup/Monitoring/Runbook                  ✅/⛔
- Support:      Onboarding/Verifizierung/Staff/Eskalation(/Dispute ab 100)     ✅/⛔
- Billing:      Geldfluss · Webhook-Wahrheit · Entitlements · Unit Economics   ✅/⛔
- Release-Gates A–F:  A_ B_ C_ D_ E_ F_
- Suite (GO_LIVE_TEST_MATRIX):  ISO __/__ · SEC __/__ · E2E/Smoke __/__ · Billing __/__
- Lastprofil dieser Stufe eingehalten (§0.4)?  JA/NEIN   (Quelle: docs/engineering/TESTING.md)
- Kosten-Review (Deckungsbeitrag/Hof · Kosten/Transaktion):  __
- Offene Blocker (Bereich-# · Owner-Entscheidung nötig?):  …
- Go / No-Go:  __    ·    Owner-Freigabe:  __ (Name, Datum)
```

---

## 10. Offene Owner-Entscheidungen (Skalierung)

| ID | Beschreibung | Stufe | Status |
|---|---|---|---|
| RM-01 | **Supabase-/Cloudflare-Tier** je Stufe (Compute, PITR, Edge-Cache, Read-Replica) — Kosten/Freigabe | 10→ | Owner (Account/Kosten) |
| RM-02 | **Stripe-Account/Live-Keys/Connect-Variante** (Express vs. Standard) — Voraussetzung Geldfluss | 10 | Owner (`SB_BEZAHLUNG_USP.md` SB-02/SB-04) |
| RM-03 | **SB-Gebührenhöhe + Erhebungsweg** (`application_fee` vs. Käufer-Aufschlag, Plan-Staffelung) | 10→50 | Owner-Pricing (`SB_BEZAHLUNG_USP.md` SB-01) |
| RM-04 | **Lastprofile/Budgets** je Stufe final (LCP, Query-Budget, RPO/RTO) — `docs/engineering/TESTING.md` | 50→ | Claude + Owner |
| RM-05 | **MFA-Aktivierung** (ab welcher Stufe Pflicht für Erzeuger-Geld-Aktionen) | 10/50 | Owner (`IDENTITY_MODEL.md`) |
| RM-06 | **Aufsichtsrechtliche Einordnung** der Connect-Architektur vor breitem SB-Rollout | 50→ | Owner/extern (`COMPLIANCE_MODEL.md`) |
| RM-07 | **Test-/Gate-Tooling** (`lint`/`ci`/`scan:secrets`/Isolations-/Billing-/Smoke-Runner) bereitstellen — Voraussetzung, dass Gate-Befehle real laufen | 10 | Claude (WAVE_01/WAVE_12) |

---

## 11. Übergang

→ **Gate 10 grün = Marktstart freigegeben** (`PHASEN.md` Marktstart-Pflicht-Set). Danach je Stufe: Gate prüfen → `docs/finalization/gate_<n>_decision.md` füllen → `docs/releases/PHASE_STATUS.md` aktualisieren → Owner-Freigabe → nächste Stufe bedienen.

> **Tracker- & Lern-Pflicht nach jedem Gate:** `docs/releases/PHASE_STATUS.md` auf den realen Stand setzen; `MASTER_INDEX.md` (Abschnitt 7 · `finalization/phase5_scale`) auf ✅. Wiederverwendbare Muster (Customer-Gate-Staffelung deny-by-default · MV + `security definer`-RPC mit `auth.uid()`-Bindung · Edge-Cache nur für anonymen Katalog · „Geldfluss-Gate vor Stufe" · Unit-Economics-Schwelle je Gate) als **Imperium-Beschleuniger** nach `.claude/memory/patterns/` verdichten — gültig für alle 14 Tochterplattformen.

---

### Verweise
- Phasen/Wellen/Customer-Gates: `PHASEN.md` (Phase 5 · Gate 10)
- Normative Soll-Staffelung je Bereich: `docs/finalization/10_300_customer_readiness_matrix.md` (§2–§16)
- Ausführbare Fall-Liste + Gates A–F + M-1…M-8: `docs/GO_LIVE_TEST_MATRIX.md`
- Release-Gates A–F + Burn-in: `finalization/phase2_release/GATES.md`
- Performance-Skalierung (MV/Cache/Geo/Suche/Last-Gate): `finalization/phase4_vertical/TRACK_E_DATABASE.md` · `finalization/WAVE_11_database.md`
- Ist-Stand-Tracker: `docs/releases/PHASE_STATUS.md`
- Produktionspfeiler · Verbote · Stop-Regeln: `CLAUDE.md` · harte Regeln + Subagenten: `AGENTS.md`
- Billing/USP: `app/supabase/functions/{create-checkout,stripe-webhook}/` · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` · `docs/{STRIPE-SETUP,SUBSCRIPTION_LIFECYCLE,PRICING}.md`

*Letzte Aktualisierung: 2026-06-20 · Phase 5 (Skalierung 10→300) · Zuständig: Claude (gesamter Stack + OZ-Execution-Part) · Freigabe: Owner (Go-Live/Tier/Stripe/Kosten). Status hier ≠ Lizenz zum Schönen — 🔨/⬜ ehrlich führen; grün erst, wenn real verifiziert (`CLAUDE.md` §0.9 Test-Integrität).*
