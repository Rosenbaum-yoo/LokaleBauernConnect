# Ops-Gate — Phase 3 Betriebszentrale (LokaleBauernConnect)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 3 · `PHASEN.md` → **„Phase 3 — Betriebszentrale (statt SCC/Hetzner)"**. Liefert das **Ops-Gate** für den Marktstart.
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> **Andocken statt neu bauen:** Staff-/Support-/Audit-Center ist **Kern** des ConnectCore-Imperiums (EIN Center für 14 Plattformen). Phase 3 baut **keine** zweite Betriebsmaschine, sondern die schlanke **Betriebssicht** (Owner/Staff) als Supabase/Cloudflare/Stripe-Aggregation oben drauf — „Domain owns truth, Ops owns aggregation".
> **Adaptiert** aus dem TempConnect-Blueprint `finalization/phase3_scc/GATES.md` (read-only; das BBQ-Original bleibt unangetastet). **VMS/Hetzner-Begriffe sind konsequent ersetzt:** SCC/Operations-Konsole → **Betriebszentrale (Owner/Staff-Konsole)**, Hetzner-Infra-Actions → **Supabase-/Cloudflare-/Stripe-Ops**, „Vendor Pool/Requisition/Einsatzportal/Stundenzettel/SCC" kommen **nicht** vor. „Kunde" = registrierte Käufer + zahlende Erzeuger-Orgs; „Hof" = `farms`/`org_locations` (inkl. unbemannter SB-Stand).
> Voraussetzung: **WAVE_02** (Datenmodell+RLS, deny-by-default + Isolationstest), **WAVE_03** (RBAC), **WAVE_06** (Auth/Turnstile/RLS-Härtung), **WAVE_07** (Staff-/Support-Andockung, `is_staff()`/`is_owner()`, Audit-Namespaces), **WAVE_09** (Billing/Stripe) sowie **Phase 2 Gates A–F** (Cloudflare-Deploy, Security-Header, Tenant-Isolation) grün.

---

## 0. Ziel des Ops-Gates

Eine **minimale, aber lückenlose und mandantensichere Betriebssicht**, mit der Owner + Staff die Plattform am Markttag **real steuern und beobachten** können — nicht eine Demo-Konsole, nicht ein KPI-Schaufenster. Vier Betriebsfelder müssen end-to-end verdrahtet, mit echten Backend-Daten und mit unabschaltbarem Audit hinterlegt sein:

1. **Kunden/Höfe** — wer ist da, in welchem Zustand: registrierte Käufer (anonymisiert/aggregiert), Erzeuger-Orgs, Höfe/SB-Stände, Verifizierungs-Status (aus WAVE_07), aktive vs. gesperrte Konten. Auffinden, ansehen, drilldown — **nie** org-fremde Daten ungewollt sichtbar.
2. **Billing** — der reale Geldfluss: Abo-Status der Erzeuger (Stripe), SB-Transaktionen (USP, `sb_payments`), offene/fehlgeschlagene Zahlungen, Webhook-Gesundheit. Eine Wahrheit aus dem **idempotenten Stripe-Webhook**, kein Fake-Billing, keine doppelte Buchhaltung.
3. **Monitoring/Incidents** — lebt die Plattform: Health der Kernpfade (App/Edge/DB), Fehlerrate, Webhook-Lag, Cloudflare-/Supabase-Status, offene Incidents. Zero-State statt 500, klare „Datenstand"-Anzeige.
4. **Audit** — wer hat was warum getan: durchsuchbarer, filterbarer `audit_log`-Feed über alle Ops-Namespaces (`farm_verification.*`, `support.*`, `billing.*`, `ops.*`), High/Critical filterbar, fehlgeschlagene Aktionen sichtbar, Retention dokumentiert.

Quer dazu — der **nicht-verhandelbare Kern** des Ops-Gates: **jede kritische Aktion** (sperren/entsperren, Verifizierung zurückziehen, Refund/Abo-Eingriff, Feature-Flag, Daten-Export) verlangt **Confirm + Pflicht-`reason` + Risk-Level + serverseitiges Audit** und läuft über eine Edge-Funktion mit `service_role` — **nie** per Client-Direktschreiben.

**Nicht-Ziel:** keine zweite Support-/Audit-Suite (Kern wird angedockt, nicht dupliziert); keine destruktiven Infra-Aktionen (kein Projekt-Delete/-Rebuild, kein DB-Drop, kein Schlüssel-Reset über die UI); keine automatischen Geld-Bewegungen ohne Owner-Hand (Refunds nur als bestätigte, auditierte Einzelaktion); keine KI-Auto-Triage (Phase 5). Das Ops-Gate liefert **die minimale Betriebssicht für den Marktstart** — alles darüber ist Phase 4/5.

---

## 1. Ist-Zustand (repo-genau geprüft — kein Rebuild)

| Fakt | Stand | Konsequenz fürs Ops-Gate |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` | `orgs`, `profiles(role)`, `farms(verified)`, `user_role enum ('kaeufer','erzeuger','staff','owner')`, **`audit_log`** (`org_id, actor_user_id, action, entity_type, entity_id, reason, details jsonb`), nur `service_role`-beschreibbar | Audit-Tabelle + Rollen + Org-Modell existieren → Ops-Sicht **aggregiert** darauf, baut sie nicht neu. |
| `0002_payments.sql` | `subscriptions`, `sb_payments`, `payment_events` (+ RLS) | Billing-Sicht liest **diese** Tabellen; `payment_events` = idempotenz-/Webhook-Wahrheit, nicht parallel buchen. |
| `0003_marketplace.sql` | `is_org_member()` (security definer), `org_members`, `org_locations(is_unmanned)`, `reviews(status)`, Multi-Org-Owner-Policies | `is_org_member()` = kanonische Org-Zugehörigkeit; `org_locations.is_unmanned` = SB-Stand für Billing-/Monitoring-Sicht. |
| WAVE_07 (geplant, `00NN_staff_support.sql`) | `is_staff()`/`is_owner()` (einzige org-übergreifende Hoheit), `escalations`, `support_tickets`, Verifizierungs-Workflow, Audit-Namespaces `farm_verification.*` / `support.*` | Ops-Gate **setzt WAVE_07 voraus**: `is_staff()`/`is_owner()` ist das Gate-Rechtemodell; Betriebssicht hängt sich an `/staff/*` an. |
| `app/supabase/functions/{create-checkout,stripe-webhook}` + `_shared/{supabaseAdmin,cors,stripe,email}.ts` | EIN signaturgeprüfter, idempotenter Webhook (Wahrheit); `service_role` nur in Edge | Ops-Mutationen (sperren/refund/flag) laufen über **neue** Edge-Funktion `ops-action` analog — nie Client-Direktschreiben; Webhook-Gesundheit ist ein Monitoring-Signal. |
| `app/src/lib/{data,payments,supabase,types}.ts` (Dual-Source Seed↔Supabase) | `isSupabaseConfigured`-Schalter, `snake_case`↔`camelCase` an der Grenze | Ops-Konsole nutzt **dieselbe** Dual-Source-Schicht (neue `lib/ops.ts`) → ohne Account bedienbar, Demo-Stand klar gekennzeichnet, kein toter Pfad. |
| `app/src/pages/{FinderPage,StandPayPage}.tsx`, `App.tsx` (Router) | bestehende Käufer-/SB-Seiten | Ops-Konsole wird **additiv** unter `/staff/ops/*` eingehängt (hinter RBAC-Gate `staff`/`owner`) — keine Parallel-Shell. |
| `docs/{INCIDENT_RUNBOOK,MONITORING,OBSERVABILITY,BACKUP_DISASTER_RECOVERY}.md`, `docs/releases/PHASE_STATUS.md` | teils vorhanden | Ops-Gate verlinkt + zieht diese auf realen Stand; kein zweites Runbook. |

> **Abgrenzung dokumentiert (Stop-Regel „Datenmodell für Zielzustand"):** Die Betriebszentrale ist **schlank** (Sicht + bestätigte Einzelaktionen), nicht eine generische Admin-Plattform. Das Aggregations-Muster (`lib/ops.ts` + `ops-action`-Edge + Ops-Gate) ist so geschnitten, dass es in 20 weiteren Imperium-Plattformen wiederverwendbar ist (Imperium-Beschleuniger). Begründung als ADR (`.claude/memory/decisions/`).

---

## 2. Aufbau der Betriebssicht (was gebaut wird — additiv)

> Server bleibt führend (RLS + `is_staff()`/`is_owner()` + Edge); die UI ist nur die Sicht. Tokens aus `app/src/styles/theme.css`, keine neuen Farben/Emojis, User-Werte escaped, durchgängiger Vermittler-Disclaimer.

### 2.1 `lib/ops.ts` (Dual-Source, typisiert) + Ops-Typen in `lib/types.ts`
Aggregations-Lesepfade (RLS-gefiltert, bei `isSupabaseConfigured` real, sonst gekennzeichneter Seed): `getOpsOverview()`, `listCustomers()`, `listFarms()`, `getBillingSummary()`, `getMonitoringSnapshot()`, `getAuditFeed(filter)`. Mutationen rufen **ausschließlich** die Edge-Funktion `ops-action`. Domänentypen ohne `any`: `OpsOverview`, `CustomerRow`, `FarmRow`, `BillingSummary`, `MonitoringSnapshot`, `AuditEntry`, `OpsActionResult`. Case-Mapping nur hier. Leer-/Division-Fälle → neutrale Defaults, kein `NaN`/Throw.

### 2.2 Edge-Funktion `app/supabase/functions/ops-action/index.ts` (Deno)
Eine Funktion für **alle** kritischen Ops-Mutationen, nach dem Bestands-Pattern (`_shared/{cors,supabaseAdmin,stripe}.ts`):
- Eingang: JWT (Pflicht) → **serverseitige** Rechteprüfung `is_staff()`/`is_owner()` (nicht nur Client). Zod-Discriminated-Union:
  `{ kind:'suspend_account'|'reactivate_account'|'revoke_verification'|'refund_sb_payment'|'set_feature_flag'|'export_data', ... reason, riskLevel }`.
- `reason` ist für **jede** `kind` Pflicht (`min 5`); `riskLevel ∈ ('low'|'medium'|'high'|'critical')` serverseitig je `kind` erzwungen (z. B. `refund_sb_payment`/`revoke_verification` = high; `suspend_account` = high; `export_data` = critical).
- Aktion + Idempotenz + Audit: Zustandsübergang prüfen, Mutation ausführen, **immer** `audit_log` mit `action='ops.<kind>'`, Pflicht-`reason`, `details` (vorher/nachher, riskLevel) schreiben — **auch bei Fehlschlag** (`ops.<kind>.failed`). Gleiche Aktion auf Zielzustand = no-op + 200 (idempotent).
- **Verbote im Code:** kein Projekt-Delete/-Rebuild, kein DB-Drop, kein Secret-/Key-Reset, kein Schlüssel im Log. `refund_sb_payment` ruft Stripe nur über `_shared/stripe.ts`, gegen reale `sb_payments`-Zeile, idempotent (kein Doppel-Refund).
- Antworten: `{ ok:true, data }` / `{ ok:false, error }`; `400/403` mit klarer Meldung, nie 500 bei abgelehnter Eingabe.

### 2.3 UI — Betriebszentrale unter `/staff/ops/*` (additiv, RBAC-gegated)
- **`OpsOverviewPage`** — Tachometer: aktive Käufer/Erzeuger/Höfe, offene Verifizierungen/Eskalationen (WAVE_07), Billing-Kurzbild, Health-Ampel, letzte Audit-Einträge. Scope-Badge (Plattform), Datenstand, echte Counts, Zero-State.
- **`CustomersFarmsPage`** — durchsuch-/filterbare Listen (Käufer aggregiert/anonymisiert, Erzeuger-Orgs, Höfe/SB-Stände mit Verifizierungs-Status). Drilldown-Deep-Link trägt Kontext, baut **nie** org-fremde URL. Aktion **Konto sperren/entsperren** + **Verifizierung zurückziehen** mit Confirm + Pflicht-Reason + Risk-Hinweis.
- **`BillingOpsPage`** — Abo-Status (Stripe), SB-Transaktionen, fehlgeschlagene/offene Zahlungen, Webhook-Gesundheit (letzter `payment_events`-Lauf, Lag). Aktion **Refund SB-Zahlung** als bestätigte, auditierte Einzelaktion (kein Auto-Refund). „Vermittler, kein Eigenverkauf" sichtbar.
- **`MonitoringPage`** — Health-Snapshot (App/Edge/DB erreichbar, Fehlerrate, Webhook-Lag, Supabase-/Cloudflare-Status), offene Incidents (Link `docs/INCIDENT_RUNBOOK.md`). Zero-State statt Fehlerseite.
- **`AuditFeedPage`** — durchsuchbarer Feed (Namespace/Actor/Entity/Risk/Zeitraum), High/Critical-Filter, fehlgeschlagene Aktionen sichtbar, Retention-Hinweis. Read-only.
- **End-to-End-Pflicht:** jede Aktion verdrahtet (Edge → realer Fetch → DOM → Lade/Leer/Fehler → Refresh), kein toter Button, kein Platzhalter. Käufer/Erzeuger → Zero-State „Kein Zugriff", **nie** 200 mit Fremddaten.

---

## 3. Verifikationsbefehle (lokal, kostenlos, kein Account)

> Working-Dir: `app/`. Node ≥ 20. Supabase-CLI fährt lokale Postgres/Edge hoch (kein Self-Host, kein Account) → RLS-/Edge-Tests kostenlos.

```bash
cd app
npx supabase start                 # Postgres + Auth + Edge-Runtime lokal
npx supabase db reset              # alle Migrationen inkl. 00NN_staff_support + seed (idempotent)
npx supabase functions serve ops-action --no-verify-jwt=false
npm run db:test                    # Isolations-/Verhaltens-Tests inkl. O1–O12 (s. Gate C/E)
npm run typecheck                  # strict — Ops-Typen ohne any
npm run build                      # tsc --noEmit && vite build → dist/ (Ops-Konsole baut sauber)
# Beispiel kritische Aktion (Confirm+Reason+Audit, idempotent):
# curl -i -X POST "$SUPABASE_URL/functions/v1/ops-action" \
#   -H "Authorization: Bearer <staff-jwt>" -H "Content-Type: application/json" \
#   -d '{"kind":"suspend_account","orgId":"…0002","reason":"Verstoß gg. Kennzeichnungspflicht","riskLevel":"high"}'
# Erwartet 200 + audit_log('ops.suspend_account'); ohne Staff-JWT → 403, keine Mutation (O10).
```

---

## Die sechs Ops-Gates (A–F) — jedes muss **vollständig** grün sein, sonst Ops-Gate = NO-GO

> Anordnung wie der TempConnect-SCC-Block, Inhalte auf Supabase/Cloudflare/Stripe überschrieben. **Kein Gate wird „fast grün" durchgewunken.**

### Gate A — Access / Identity (Betriebszugang gesichert)

**GO nur wenn:**
- [ ] Betriebszentrale liegt hinter RBAC-Gate `profiles.role in ('staff','owner')`; Käufer/Erzeuger erhalten Zero-State „Kein Zugriff", **nie** Fremddaten (Server führt via RLS, Client-Guard ist nur UX).
- [ ] `is_staff()`/`is_owner()` (WAVE_07) ist die **einzige** org-übergreifende Lese-/Schreibhoheit — negativ wie positiv getestet.
- [ ] Owner-/Staff-Auth aktiv (Supabase Auth); **MFA für Owner + Staff** aktiv ODER bewusst als Marktstart-Blocker dokumentiert.
- [ ] Step-up-Reauth (echte Passwort-/MFA-Prüfung, nicht `confirmed=true`) für `high`/`critical`-Aktionen.
- [ ] Cloudflare schützt `/staff/*` (WAF/Turnstile auf öffentlichen Eingängen, kein offener Admin-Pfad).
- [ ] Session-/Cookie-Härtung produktionssicher (`httpOnly`, `secure`, `sameSite`).

**Verifikation:** `npm run db:test` (Identitäts-Matrix O5–O10) · manueller RBAC-Check `/staff/ops/*` als `kaeufer`/`erzeuger` → Zero-State.

---

### Gate B — Build / Test (Betriebssicht baut & läuft)

**GO nur wenn ALLE grün:**
```bash
cd app
npm run typecheck     # Ops-Typen strict, ohne any
npm run build         # tsc --noEmit && vite build → dist/
npm run db:test       # Isolation + O1–O12
```
- [ ] `typecheck` grün (Ops-Konsole + `lib/ops.ts`).
- [ ] `build` grün (Cloudflare-Pages-tauglich, kein Secret im Bundle, nur `VITE_`-Public).
- [ ] `db:test` grün (inkl. Ops-Verhaltens-Tests O1–O12).
- [ ] CI blockt Ops-Regressionen (Isolationstest als blockierendes Gate — `devops`).

---

### Gate C — Operations / Critical Actions (das Herz des Ops-Gates)

**GO nur wenn:**
- [ ] **Jede** kritische Aktion verlangt **Confirm + Pflicht-`reason` + Risk-Level + serverseitiges Audit** — ohne `reason` keine Mutation (`400`).
- [ ] Kritische Mutationen laufen **ausschließlich** über `ops-action` (`service_role` nur in Edge); **kein** Client-Direktschreiben auf sensible Tabellen.
- [ ] `riskLevel` serverseitig je `kind` erzwungen; `high`/`critical` brauchen Step-up-Reauth (Gate A).
- [ ] **Keine destruktiven Aktionen** im Code: kein Projekt-Delete/-Rebuild, kein DB-Drop, kein Secret-/Key-Reset, kein Schlüssel im Log.
- [ ] Aktionen sind **idempotent** (gleiche Aktion auf Zielzustand = no-op + 200); `refund_sb_payment` verhindert Doppel-Refund (gegen `sb_payments`/Stripe).
- [ ] Read-only-Pfade (Listen/Feeds) lösen **nie** eine Mutation aus.
- [ ] `export_data` (= `critical`) nur mit Audit + DSGVO-konformem Scope (kein Fremd-Org-Leak).

**Verifikation:** `npm run db:test` (O1–O4, O10) · Schärfe-Probe Gate F.

---

### Gate D — Billing / Commercial (echter Geldfluss, eine Wahrheit)

**GO nur wenn:**
- [ ] Billing-Sicht liest reale `subscriptions`/`sb_payments`/`payment_events` — **kein Fake-Billing**, keine parallele Buchhaltung.
- [ ] Webhook-Gesundheit sichtbar (letzter Lauf, Lag, fehlgeschlagene `payment_events`); **EIN** signaturgeprüfter, idempotenter Stripe-Webhook bleibt die Wahrheit.
- [ ] Erzeuger-Abo-Status (Stripe Connect) korrekt gespiegelt; Entitlements serverseitig (nicht aus der UI ableitbar).
- [ ] `refund_sb_payment` ist bestätigte, auditierte **Einzelaktion** (kein Auto-Refund, kein Batch ohne Owner-Hand).
- [ ] SB-Transaktionen (USP) korrekt zugeordnet (Hof/SB-Stand, `org_locations.is_unmanned`); Quittungs-/Mail-Pfad sichtbar (kein Secret im Log).
- [ ] Vermittler-Disclaimer in jeder Billing-Sicht: Plattform = Zahlungsanbindung/Vermittler, **kein Eigenverkauf**.

---

### Gate E — Audit / Monitoring / Evidence (nachvollziehbar & beobachtbar)

**GO nur wenn:**
- [ ] **Jede** Ops-Mutation erzeugt einen `audit_log`-Eintrag (wer/was/warum, Risk, vorher/nachher) — **auch Fehlschläge** (`ops.<kind>.failed`); Audit ist **unabschaltbar**.
- [ ] Audit-Feed durchsuch-/filterbar (Namespace `farm_verification.*` / `support.*` / `billing.*` / `ops.*`, Actor, Entity, Risk, Zeitraum); High/Critical filterbar.
- [ ] **Audit-Retention dokumentiert** (`docs/COMPLIANCE_MODEL.md`); fehlgeschlagene Aktionen bleiben sichtbar.
- [ ] Monitoring-Snapshot echt: Health App/Edge/DB, Fehlerrate, Webhook-Lag, Supabase-/Cloudflare-Status; Zero-State statt 500.
- [ ] Incident-Pfad verdrahtet (`docs/INCIDENT_RUNBOOK.md` verlinkt, offene Incidents sichtbar).
- [ ] **Ops Evidence-Pack** vorhanden + aktuell:
  - `docs/MONITORING.md` / `docs/OBSERVABILITY.md`
  - `docs/INCIDENT_RUNBOOK.md`
  - `docs/BACKUP_DISASTER_RECOVERY.md` (Supabase PITR/Backups, Owner-bestätigt)
  - `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (Billing-Wahrheit)
  - `docs/COMPLIANCE_MODEL.md` (Audit-Retention, DSGVO, Vermittler-Disclaimer)

---

### Gate F — Isolation / Härtung (Welten-Trennung + Schärfe-Probe)

**GO nur wenn:**
- [ ] Tenant-Isolation auch in der Aggregations-Sicht dicht: kein Lesepfad liefert org-fremde Daten an Käufer/Erzeuger; `is_staff()` ist die einzige Cross-Org-Hoheit.
- [ ] Käufer-Daten in Listen aggregiert/anonymisiert (keine ungewollte PII-Streuung); DSGVO-Datenminimierung.
- [ ] **Schärfe-Probe besteht:** künstlich zu weite Ops-Policy / fehlender `reason`-Zwang ⇒ `db:test` wird **rot**; nach `npx supabase db reset` wieder **grün** (Test = Spezifikation, §0.9).
- [ ] Nur additive Migration(en); `0001…0003` unverändert; Rollback im Migrationskopf dokumentiert.
- [ ] Release-Verifier: `.claude/`, `.env`, Secrets **nicht** im Release-Artefakt (Phase-2-Kopplung).

---

## Ops-Verhaltens-Test-Matrix (O1–O12 — additiv zur WAVE_02/07-Harness)

Identitäten: `anon`, **Käufer**, **Erzeuger A** (`org …0001`), **Erzeuger B** (`org …0002`), **Staff** (`role='staff'`), **Owner**.

| # | Identität | Aktion | Erwartung |
|---|---|---|---|
| O1 | Staff | `ops-action suspend_account` **ohne** `reason` | **abgelehnt** (`400`), keine Mutation, kein Audit-Leak |
| O2 | Staff | `ops-action suspend_account` mit `reason` | OK, `audit_log('ops.suspend_account', reason, risk=high)` |
| O3 | Staff | gleiche `suspend_account` erneut (Zielzustand erreicht) | **no-op + 200** (idempotent) |
| O4 | Staff | `refund_sb_payment` zweimal auf gleiche Zahlung | zweiter Aufruf = **no-op** (kein Doppel-Refund) |
| O5 | Käufer | Direktaufruf `/staff/ops/*` | Zero-State „Kein Zugriff" (UI) **und** 0 Zeilen via RLS (DB) |
| O6 | Erzeuger A | `select` Ops-Kundenliste mit Org B-Daten | **0 fremde Zeilen** (Cross-Org dicht) |
| O7 | Staff | `getAuditFeed` über alle Orgs | OK, org-übergreifend (`is_staff()`), High/Critical filterbar |
| O8 | leere Daten | Ops-Overview / Billing / Monitoring | leere Arrays, **kein 500** (Zero-State) |
| O9 | Staff | fehlgeschlagene Mutation (ungültiger Übergang) | `audit_log('ops.<kind>.failed')` geschrieben, klare Fehlermeldung |
| O10 | anon / kein Staff-JWT | `ops-action` (jede `kind`) | **403**, keine Mutation, kein Audit-Leak |
| O11 | Staff | `export_data` (critical) | nur eigener Plattform-Scope, Audit `critical`, kein Fremd-Org-Leak |
| O12 | Schärfe-Probe | künstlich zu weite Policy / `reason`-Zwang entfernt | `db:test` **rot**; nach `db reset` **grün** |

> Test = Spezifikation (§0.9): rote Assertion = Rechte-/Audit-/Isolations-Leck = Merge blockiert. Pfade via `import.meta.url` (kein stiller Skip).

---

## Gate-Pass-Workflow (pro Gate)

1. **Check ausführen** (Befehle aus §3 ODER manueller Check).
2. **Ergebnis dokumentieren** in `docs/releases/OPS_GATE_<A–F>_RESULT.md`.
3. **Bei GO:** Commit-Hash + Datum + Verantwortlicher festhalten.
4. **Bei NO-GO:** Blocker in `docs/releases/OPS_OPEN_BLOCKERS.md` mit Owner, Priorität, ETA.

**Kein Gate wird „fast grün" durchgewunken.**

---

## Ops-Gate-Marktstart-Entscheidung

**Betriebszentrale = produktiv freigegeben** nur wenn:
- Gate A (Access/Identity) grün ✓
- Gate B (Build/Test) grün ✓
- Gate C (Operations/Critical Actions) grün ✓
- Gate D (Billing/Commercial) grün ✓
- Gate E (Audit/Monitoring/Evidence) grün ✓
- Gate F (Isolation/Härtung) grün ✓

**Dokumentiert in:** `docs/releases/OPS_GO_LIVE_DECISION.md` mit Datum, Commit-Hash, Release-Version, je Gate (Status/Verantwortlicher/Prüfdatum), bekannten Restrisiken (transparent), Owner-Freigabe.

---

## Verknüpfung mit Phase-2-Gates (A–F) und Marktstart-Pflicht-Set

Das **Ops-Gate ist zusätzlich** zu den Phase-2-Gates und baut auf WAVE_07 auf:

| Phase-2-Gate | Ops-Gate-Beitrag |
|---|---|
| Gate B (Security) | Ops Gate A erfüllt Owner-/Staff-Identity (RBAC, MFA, Step-up) |
| Gate C (Tenant-Isolation) | Ops Gate F sichert Isolation auch in der Aggregations-Sicht (O5/O6) |
| Gate E/Operations | Ops Gate C + E liefern Critical-Action-Kontrolle + Monitoring/Incident |
| Gate F (Commercial/Legal) | Ops Gate D liefert die reale Billing-/SB-Betriebssicht + Vermittler-Disclaimer |

**Marktstart-GO** (laut `PHASEN.md` → „Marktstart-Pflicht-Set") verlangt: Phase 1 WAVE 02–15 grün + Isolationstest · Phase 2 Gates A–F grün + Cloudflare-Deploy + Domain + Security-Header · **Phase 3 Ops-Gate A–F grün (diese Datei)** · Phase 4 Track A (SB-Bezahlung) **oder** WAVE_09 (Erzeuger-Abo) — mind. ein Geldfluss · Phase 5 Gate 10.

---

## Stop-Regeln in Phase 3 (anhalten, minimalen Fix vorschlagen, auf Owner-OK warten)

- Eine kritische Ops-Aktion wäre serverseitig org-übergreifend **nicht** prüfbar, oder `reason`/Audit/Risk-Level fehlt → **STOP**.
- Eine Aktion wäre **destruktiv/irreversibel** (Projekt-/DB-Löschung, Key-Reset, Massen-Refund, irreversibler Export) → **STOP**, Owner-Freigabe, niemals über die UI ausführen.
- Käufer-/Erzeuger-/Staff-Sicht wäre nicht sauber trennbar oder Käufer-PII würde ungewollt streuen → **STOP**.
- Echtes Supabase-EU-Projekt (Link/`db push`/`functions deploy`), produktive Stripe-/Mail-Keys, Cloudflare-Deploy oder Domain nötig → **STOP**, Owner-Freigabe (Account/Kosten).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## Abhängigkeiten & Referenzen

- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, „Kern nie neu bauen, nur andocken", „jede mutierende Aktion: Confirm + Reason + Risk-Level + serverseitiges Audit"), `AGENTS.md` (SQL nur als additive Migration, „kein Merge ohne grünen Isolationstest", service_role nur in Edge), `PHASEN.md` (Phase 3 Betriebszentrale, Ops-Gate, Marktstart-Pflicht-Set).
- **Landkarte:** `MASTER_INDEX.md` (Abschnitt 5 Operations: `DEPLOYMENT`, `OPERATIONS_RUNBOOK`, `BACKUP_DISASTER_RECOVERY`, `INCIDENT_RUNBOOK`, `MONITORING`/`OBSERVABILITY`; Abschnitt 7 Finalisierung).
- **Reale Artefakte (Bestand):** `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql`, `app/supabase/functions/{create-checkout,stripe-webhook,_shared}`, `app/src/lib/{data,payments,supabase,types}.ts`, `app/src/pages/{FinderPage,StandPayPage}.tsx`, `app/src/App.tsx`, `app/src/styles/theme.css`.
- **Vorwellen/-gates:** `WAVE_07_admin_centers.md` (`is_staff()`/`is_owner()`, Audit-Namespaces — **Voraussetzung**), `WAVE_09` (Billing/Stripe), `finalization/phase2_release/GATES.md` (Phase-2 A–F).
- **Plattform-Pfeiler dieses Gates:** Org-Boundary/Datenisolation (1, Gate F) · Zero-State statt Error (2, O8) · Scope-Transparenz (3, Plattform-Scope-Badge + Datenstand) · RBAC ohne Lücken (4, Gate A/O5) · Audit & Verantwortlichkeit (5, Gate C/E, `reason` Pflicht, Fehlschläge auditiert) · Testpflicht pro Feature (6, O1–O12) · Drilldown-Integrität (7, Deep-Links ohne org-fremde URLs).

> Diese Datei ist **Spezifikation + Abnahme**; sie ändert keine kosten-/außenwirksame Ressource. Für jeden Live-/Account-/Kosten-Schritt (Supabase-Link, `db push`, `functions deploy`, echte Keys, Cloudflare-Deploy, Domain) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.** Vermittler-Disclaimer durchgängig: Die Plattform vermittelt und bindet Zahlungen an — sie verkauft nicht selbst und berät nicht.
