# Masterprompt — Phase 3: Betriebszentrale (Owner-/Staff-Konsole + Supabase/Cloudflare-Ops)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> **Zweck:** Diesen Prompt zu Beginn jeder Phase-3-Session in Claude Code einfügen. Er aktiviert die **Betriebszentrale** (die schlanke Owner-/Staff-Konsole als Supabase/Cloudflare-Sicht) und definiert die verbindlichen Arbeitsregeln, Wellen, Gates und den Abschlussbericht.
> **Adaptiert** aus dem TempConnect-Blueprint `finalization/phase3_scc/MASTERPROMPT.md` (read-only; das BBQ-Original bleibt unangetastet). **SCC und Hetzner kommen nicht vor** — an ihre Stelle treten die **Staff-/Owner-Konsole als Andockung an den ConnectCore-Support-/Audit-Kern** und die **Supabase/Cloudflare-Betriebssicht**. VMS-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) sind **konsequent** auf die Hof-Domäne übersetzt.
> **Rolle:** **Vermittler** — kein Eigenverkauf, keine Beratung. Vermittler-Disclaimer durchgängig.

---

## 0. Worum es geht (Phase-3-Scope in einem Satz)

Eine **production-ready, mandantensichere Betriebszentrale**: eine **schlanke Owner-/Staff-Konsole**, mit der die Plattform-Betreiber den laufenden Betrieb steuern — **Kunden-/Hof-Operations, Billing-Übersicht, Monitoring/Incidents, Feature-Flags, Audit** — als **Sicht** auf Supabase + Cloudflare + Stripe, **nicht** als zweite App und **nicht** als Daten-Schattenwahrheit. **Jede kritische Aktion: Confirm + Pflicht-Reason + Risk-Level + unabschaltbares serverseitiges Audit.** Ergebnis-Gate: **Ops-Gate** (Marktstart-Pflicht laut `PHASEN.md`).

> **Abgrenzung (nicht verletzen):** Das Support-/Audit-/Staff-Center ist **Kern** des Imperiums (EIN Center für 14 Plattformen). Phase 3 baut **keine** zweite Support-Maschine und **keine** generische „Admin-Suite", sondern die **Betriebs-Sicht + Spezial-Andockung** (Hof-Operations) auf den geteilten Kern. „Domain owns truth, Konsole owns aggregation."

---

## Empfohlener Session-Start (kombiniert — copy-paste in Claude Code)

```text
Du arbeitest im Repository LokaleBauernConnect (ConnectCore-Imperium, Welle 1, Klasse C).
Branch-Konvention: feat/<task-name>-claude. Eine Welle pro Session.

Lies ZUERST in dieser Reihenfolge (Pflicht vor dem ersten Edit):
1. AGENTS.md (Projekt) + ~/AGENTS.md (global)
2. .claude/agents/* (Subagenten) + MASTER_INDEX.md (Doku-/Bauplan-Landkarte)
3. CLAUDE.md (Repo-Root: §0-Direktive, 7 Produktionspfeiler, Verbote, Backend-/Edge-/RLS-Regeln, "Kern nie neu bauen, nur andocken")
4. .claude/CLAUDE_RECS.md (persistente Empfehlungen)
5. relevantes .claude/memory/ (INDEX + decisions/learnings/patterns)
6. PHASEN.md (Phase 3 — Betriebszentrale, Ops-Gate) + docs/releases/PHASE_STATUS.md (realer Stand)
7. finalization/phase3_betrieb/MASTERPROMPT.md (diese Datei) + GATES.md + MANUAL_TASKS.md (sobald vorhanden)

Ziel:
Bringe die Betriebszentrale (Owner-/Staff-Konsole als Supabase/Cloudflare/Stripe-Sicht) auf
Enterprise-Operations-Niveau — mandantensicher, auditiert, end-to-end verdrahtet, Zero-State statt Error.
Sie ist die Steuerungsschicht für den laufenden Betrieb der Plattform, NICHT die Käufer-/Erzeuger-App.

Aktuelle Basis (repo-genau, NICHT neu bauen — lesen + erweitern):
- App-Fundament: app/ (React + Vite + TypeScript strict, Editorial-Design-System, build gruen), Finder-Port 5409
- Datenmodell + RLS: app/supabase/migrations/0001_core.sql (orgs, profiles, farms, products, availability,
  reservations, audit_log; user_role enum kaeufer/erzeuger/staff/owner; RLS deny-by-default; set_updated_at())
- Payments: 0002_payments.sql (subscriptions, sb_payments, payment_events + RLS),
  Edge create-checkout + stripe-webhook (idempotent, signaturgeprueft), _shared/* (supabaseAdmin, cors, email, stripe)
- Marketplace: 0003_marketplace.sql (is_org_member(), org_members, reviews + Trigger, org_locations is_unmanned,
  Owner-Policies auf Multi-Org gehoben), Reputation auf farms (im Finder sichtbar)
- Datenschicht: app/src/lib/data.ts | supabase.ts | types.ts (Dual-Source Seed<->Supabase via isSupabaseConfigured,
  snake_case<->camelCase nur an der Grenze), Routing-Einstieg app/src/App.tsx
- Design: app/src/styles/theme.css (Editorial-Tokens, KEINE hardcodierten Farben, KEINE Deko-Emojis)

Stack (fix, Imperium-Grundgesetz):
React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage)
· Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). KEIN Hetzner, KEIN Self-Host-Docker.

Arbeitsregeln (nicht verhandelbar — Phase 3):
- Die Konsole ist INTERN. Nur profiles.role in ('staff','owner'). Kein Kaeufer/Erzeuger erhaelt Zugriff.
- Zugriffskontrolle gehoert in die DB (RLS), nicht nur in den Client. Server bleibt fuehrend, Client-Guard ist UX.
- Kein Fake-Enterprise, keine Demo-KPIs/Deko-Karten, keine toten Buttons, keine Platzhalter, kein TODO.
- Keine freie Shell, kein freies SQL, keine unkontrollierte Impersonation aus der Konsole.
- Keine Secrets ausgeben/lesen/loggen. service_role NUR in Edge Functions, Frontend nur VITE_-Public-Keys.
- Keine mutierende Aktion ohne Audit. Kritische Aktion: Confirm + Pflicht-Reason + Risk-Level + serverseitiges Audit.
- Feature-Flags: serverseitig durchgesetzt (DB), nicht nur Client-Toggle.
- Zero-State statt Error: kein 500 bei leeren Daten; available:false + leere Arrays; UI zeigt "Noch keine Daten".
- Scope-Transparenz: jede Antwort traegt scope (org/region/zeitraum); UI zeigt Kontext + Datenstand.
- SQL nur als NEUE additive Migration unter app/supabase/migrations/ (idempotent, Rollback-Block). 0001..0003 unveraendert.
- Owner-Freigabe bei Deploy/Go-Live/Kosten/Account/irreversibel + bei jedem git commit/push (Co-Author-Zeile anhaengen).
- .claude/ gehoert NICHT ins externe Release-Artefakt.
- Vermittler-Disclaimer durchgaengig: Plattform vermittelt, verkauft nicht selbst, beraet nicht.

Arbeite Welle fuer Welle (Phase 3 — Betriebszentrale):
B-WAVE 00  Scope & Ist-Aufnahme (read-only Audit der Konsolen-Oberflaeche)
B-WAVE 01  Access Boundary (RBAC-Gate /betrieb/*; is_staff()/is_owner() als einzige org-uebergreifende Hoheit)
B-WAVE 02  Step-up & Audit-Pflicht (Reauth fuer kritische Aktionen; reason + risk_level + Audit unabschaltbar)
B-WAVE 03  Betriebs-Datenschicht (lib/ops.ts, Dual-Source; read-only Aggregat-Views, keine Schattenwahrheit)
B-WAVE 04  Kunden-/Hof-Operations (Org-/Hof-Lifecycle, Verifizierungs-Andockung, Reservierungs-Sicht)
B-WAVE 05  Billing-Uebersicht (Abos + SB-Zahlungen + payment_events als Sicht; Stripe Source-of-Truth)
B-WAVE 06  Monitoring & Incidents (Health-Checks, strukturierte Logs, Incident-Lifecycle, Runbook-Verweise)
B-WAVE 07  Feature-Flags (serverseitig durchgesetzt, auditiert, Risk-Level je Flag)
B-WAVE 08  Audit-Center & Decisions (durchsuchbarer Audit-Feed, Reason-Pflicht, Export/Retention)
B-WAVE 09  Tests/CI (Isolations- + Verhaltens-Tests; kein Merge ohne gruenen Isolationstest)
B-WAVE 10  Ops-Gate-Integration (alle Gates gruen, MANUAL_TASKS vom Owner bestaetigt)

Reihenfolge:
- B-WAVE 00-02 zuerst (Boundary + Step-up + Audit-Fundament MUESSEN stehen, bevor Mutationen gebaut werden).
- B-WAVE 03 vor 04-08 (Datenschicht-Pattern festlegen, kein Direkt-Schreiben aus der Konsole).
- B-WAVE 04-08 darauf aufbauend; B-WAVE 09 begleitend (Tests pro Feature), 10 zum Abschluss.

Nach jeder Welle liefere den Standard-Welle-Report (siehe Abschnitt 7 dieser Datei).
Pflichtchecks pro Welle (mindestens):
cd app && npx supabase db reset          # alle Migrationen + seed, idempotent
cd app && npm run db:test                # Isolations- + Verhaltens-Tests (inkl. neuer Ops-Tests)
cd app && npm run typecheck && npm run build

Beginne mit B-WAVE 00 (Scope & read-only Ist-Aufnahme) — oder einer spezifischen Welle, die du nennst.
GO nur wenn alle Ops-Gates erfuellt UND die manuellen Aufgaben aus MANUAL_TASKS.md vom Owner bestaetigt sind.
```

---

## 1. Ist-Zustand (repo-genau — Basis, auf der Phase 3 andockt)

> Phase 3 **baut nichts neu**, was schon existiert — sie liest, verifiziert und ergänzt **additiv**.

| Fakt (real im Repo) | Stand | Konsequenz für die Betriebszentrale |
|---|---|---|
| `app/` (React+Vite+TS strict, Editorial-Tokens, build grün), Finder-Port **5409** | ✅ | Konsole wird **additiv** als Route-Gruppe `/betrieb/*` eingehängt — **keine** Parallel-Shell, **keine** zweite App. |
| `0001_core.sql`: `orgs, profiles, farms, products, availability, reservations, audit_log`; `user_role` enum (`kaeufer/erzeuger/staff/owner`); RLS deny-by-default; `set_updated_at()` | ✅ | `staff`/`owner` + `audit_log` (mit `reason`) existieren → Konsole baut **darauf**, erfindet keine neue Rollen-/Audit-Mechanik. |
| `0002_payments.sql`: `subscriptions, sb_payments, payment_events` (+ RLS); Edge `create-checkout`, `stripe-webhook` (idempotent, signiert); `_shared/{supabaseAdmin,cors,email,stripe}.ts` | ✅ | Billing-Übersicht ist eine **read-only Sicht** auf diese Tabellen; **Stripe bleibt Source-of-Truth**, Entitlements serverseitig. Kein zweiter Webhook. |
| `0003_marketplace.sql`: `is_org_member()`, `org_members`, `reviews`+Trigger, `org_locations(is_unmanned)`, Owner-Policies auf Multi-Org gehoben | ✅ | `is_org_member()` ist kanonische Org-Zugehörigkeit. Phase 3 ergänzt die kanonische **`is_staff()`/`is_owner()`-Hilfe** als **einzige** org-übergreifende Lese-/Schreib-Hoheit (falls noch nicht durch WAVE_07 gesetzt). |
| `app/src/lib/data.ts · supabase.ts · types.ts` (Dual-Source Seed↔Supabase via `isSupabaseConfigured`, Case-Mapping nur an der Grenze) | ✅ | Konsole nutzt **dieselbe** Dual-Source-Schicht (neue `lib/ops.ts`) → ohne Account voll bedienbar, Demo-Stand **klar gekennzeichnet**, kein toter Pfad. |
| `app/src/App.tsx` (Routing-Einstieg), `app/src/styles/theme.css` (Editorial-Tokens) | ✅ | RBAC-gegateter Einhängepunkt; UI strikt im Token-Kanon (keine neuen Farben/Fonts, keine Deko-Emojis). |
| WAVE_07 (Staff/Support) liefert ggf. `is_staff()`/`is_owner()`, `farm_verification_log`, `escalations`, `support_tickets`, Edge `farm-verify`/`support-action` | abhängig vom Stand | Phase 3 **dockt** an dieses Fundament an (Verifizierungs-/Support-Sicht), dupliziert es **nicht**. Falls WAVE_07 offen ist: `is_staff()`/`is_owner()` in der ersten Phase-3-Migration anlegen (additiv, idempotent). |

> **Stop-Regel-Hinweis (Datenmodell für Zielzustand):** Wo eine Betriebsfunktion eine Tabelle braucht, die es noch nicht gibt (Feature-Flags, Incidents), legt Phase 3 sie **additiv** an — mit `org_id`/Plattform-Bezug, Zeitstempeln, `deleted_at`, RLS deny-by-default + Isolationstest. Nie ein nacktes Client-Flag, nie eine Schattenwahrheit neben Stripe/Domain.

---

## 2. Die Betriebs-Wellen (B-WAVE 00–10)

> **Eine Welle pro Session.** Jede Welle liefert: Schema (falls nötig, additiv) + RLS + ggf. Edge-Funktion + Datenschicht + UI (end-to-end) + Test + Doku/Tracker. Jede Welle endet mit dem Standard-Welle-Report (Abschnitt 7).

| Welle | Inhalt | Liefergegenstand (Kern) | Betroffene Pfeiler |
|---|---|---|---|
| **B-WAVE 00** | **Scope & Ist-Aufnahme** | Read-only Audit: welche Betriebs-Daten existieren bereits, welche Sicht fehlt; Abgleich „andocken statt neu bauen"; ADR „Betriebszentrale = Sicht, nicht Schattenwahrheit". | — |
| **B-WAVE 01** | **Access Boundary** | Route-Gruppe `/betrieb/*` additiv in `App.tsx`, hinter RBAC-Gate (`role in ('staff','owner')`); kanonische `is_staff()`/`is_owner()` als **einzige** org-übergreifende Hoheit; Käufer/Erzeuger → Zero-State „Kein Zugriff" (UI) **und** 0 Zeilen via RLS (DB). | 1, 4 |
| **B-WAVE 02** | **Step-up & Audit-Pflicht** | Step-up = **echte Reauth** für kritische Aktionen (kein bloßer Confirm-Dialog); jede Mutation erzwingt `reason` + `risk_level` + `audit_log`-Zeile (Namespace `betrieb.*`); Audit **unabschaltbar** (nur `service_role` schreibt). | 5 |
| **B-WAVE 03** | **Betriebs-Datenschicht** | `app/src/lib/ops.ts` (Dual-Source nach `data.ts`-Muster); read-only **Aggregat-Sichten** (KPIs/Counts) ohne Schattenwahrheit; Domänentypen in `types.ts` (kein `any`); jede Antwort trägt `scope`. | 2, 3 |
| **B-WAVE 04** | **Kunden-/Hof-Operations** | Org-/Hof-Lifecycle-Sicht (aktiv/gesperrt), Verifizierungs-**Andockung** (an `farm-verify`/WAVE_07, nicht dupliziert), Reservierungs-/Abholfenster-Sicht; kritische Aktionen (Org sperren, Hof sperren) mit Confirm+Reason+Risk+Audit. | 1, 4, 5, 7 |
| **B-WAVE 05** | **Billing-Übersicht** | Read-only Sicht auf `subscriptions`, `sb_payments`, `payment_events`; **Stripe = Source-of-Truth**, Entitlements serverseitig; Drilldown Org→Abo→Zahlung (Deep-Link, nie org-fremde URL); keine Geld-Mutation aus der Konsole (nur Sicht/Verweis ins Stripe-Dashboard). | 1, 3, 7 |
| **B-WAVE 06** | **Monitoring & Incidents** | Health-Checks (DB/Edge/Stripe-Webhook-Lag), strukturierte Logs (keine Secrets), Incident-Lebenszyklus (`offen→in_bearbeitung→geloest`) mit Runbook-Verweis (`docs/INCIDENT_RUNBOOK.md`); Zero-State bei „alles grün". | 2, 5 |
| **B-WAVE 07** | **Feature-Flags** | `feature_flags`-Tabelle (additiv, org/plattform-scoped), **serverseitig durchgesetzt** (DB/Edge, nicht nur Client); je Flag `risk_level`; Toggle = kritische Aktion (Confirm+Reason+Audit); Upgrade-/Plan-Locks zeigen konkreten Pfad. | 4, 5 |
| **B-WAVE 08** | **Audit-Center & Decisions** | Durchsuchbarer Audit-Feed (Filter: Akteur/Aktion/Zeitraum/Org), Reason sichtbar, Export (DSGVO-konform, kein PII-Leak), Retention dokumentiert; Decision-Log für kritische Owner-Entscheidungen. | 5, 7 |
| **B-WAVE 09** | **Tests/CI** | Erweiterung der Isolations-Harness um Betriebs-Identitäten (`anon`, Käufer, Erzeuger A/B, **Staff**, **Owner**); Verhaltens-Tests (Zero-State, 403 ohne Step-up, Feature-Flag-Durchsetzung, Audit-Pflicht); Schärfe-Probe. | 6 |
| **B-WAVE 10** | **Ops-Gate-Integration** | Alle Ops-Gates grün; `MANUAL_TASKS.md` vom Owner bestätigt; `PHASE_STATUS.md`/`MASTER_INDEX.md` gezogen; ADRs/Patterns aktualisiert; Übergabe an Phase 4 (Track A SB-Bezahlung) / Phase 5 (Gate 10). | alle |

---

## 3. Konkrete Befehle

> Working-Dir für App-/DB-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich. Die Supabase-CLI fährt eine **lokale** Postgres-Instanz hoch (kein Self-Host, kein Account) — RLS-/Verhaltens-Tests kostenlos.

### 3.1 Lokale Supabase-DB + Edge-Runtime (kostenlos, kein Account)
```bash
cd app
npm i -D supabase            # einmalig, falls nicht vorhanden
npx supabase --version
npx supabase start           # Postgres + Auth + Edge-Runtime lokal (gibt anon/service_role aus)
```

### 3.2 Neue additive Migration anlegen + anwenden
```bash
cd app
# Naechste freie vierstellige Nummer waehlen (z. B. 0004_betrieb.sql oder 0005_*, je nach realem Stand) —
# niemals 0001..0003 aendern. Additiv, idempotent (if not exists / drop policy if exists), Rollback-Block im Kopf.
npx supabase db reset        # wendet ALLE Migrationen + supabase/seed.sql an (idempotent)
```

### 3.3 Betriebs-Edge-Funktionen lokal bedienen (Step-up + Audit serverseitig)
```bash
cd app
npx supabase functions serve betrieb-action --no-verify-jwt=false
# Beispiel (kritische Aktion erfordert Staff/Owner-JWT + reason + step-up-Token):
# curl -i -X POST "$SUPABASE_URL/functions/v1/betrieb-action" \
#   -H "Authorization: Bearer <staff-jwt>" -H "Content-Type: application/json" \
#   -d '{"kind":"flag.toggle","flag":"sb_payment","value":true,"reason":"Pilot Hof X","stepUp":"<token>"}'
# Erwartet 200 + audit_log-Zeile (action='betrieb.flag.toggle', reason Pflicht);
# ohne Staff/Owner-JWT -> 403; ohne Step-up bei kritischer Aktion -> 401/403; nie 500 bei leerer Eingabe.
```

### 3.4 Tests — das Acceptance-Gate (Isolations- + Verhaltens-Tests)
```bash
cd app
npm run db:test              # node --test supabase/tests/*.test.mjs (inkl. neuer betrieb-Tests)
# Erwartet: alle gruen. Ein roter Test = RLS-/Rechte-/Audit-Leck = Merge blockiert.
```

### 3.5 Build-/Typ-Gate
```bash
cd app
npm run typecheck            # strict — neue Typen (FeatureFlag/Incident/OpsKpi/...) ohne any
npm run build                # tsc --noEmit && vite build -> dist/ (Betriebs-Konsole baut sauber)
```

### 3.6 Schärfe-Probe (der Test muss Lecks fangen)
```bash
cd app
# Temporaer zu weite Policy/zu schwaches Gate einschleusen (Wegwerf-Branch), z. B.:
#   create policy LEAK on feature_flags for update to authenticated using (true);
# npm run db:test  -> MUSS rot werden. Danach verwerfen:
npx supabase db reset
```

### 3.7 Go-Live (NUR mit Owner-Freigabe — Account/Kosten; NICHT Teil dieser Phase ohne OK)
```bash
# supabase login                              # Owner-Account
# supabase link --project-ref <eu-ref>        # EU-Projekt (Freigabe)
# supabase db push                            # additive Migration(en) (Freigabe)
# supabase functions deploy betrieb-action    # Edge (Freigabe)
# supabase secrets set ...                     # Secrets nie ins Repo
# Cloudflare Pages/Workers Deploy             # Phase 2 — Owner-Freigabe (Domain/Kosten)
```

---

## 4. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Boundary & RBAC**
1. `/betrieb/*` ist RBAC-gegated; nur `role in ('staff','owner')`. Käufer/Erzeuger → Zero-State „Kein Zugriff" (UI) **und** 0 Zeilen via RLS (DB), nie 200 mit Fremddaten.
2. `is_staff()`/`is_owner()` (`stable security definer`, `search_path=public`) sind die **einzige** org-übergreifende Hoheit — negativ wie positiv getestet.

**Step-up, Audit & Verantwortlichkeit**
3. Kritische Aktionen (Org/Hof sperren, Feature-Flag toggeln, Incident schließen) erfordern **echte Step-up-Reauth** + **Pflicht-Reason** + **Risk-Level**; jede Mutation schreibt eine `audit_log`-Zeile (Namespace `betrieb.*`), **unabschaltbar** (nur `service_role`).
4. Ohne gültiges Staff/Owner-JWT → **403**; ohne Step-up bei kritischer Aktion → 401/403; keine Mutation, kein Audit-Leak, kein Secret im Log.

**Sicht statt Schattenwahrheit**
5. Billing-Übersicht ist **read-only** Sicht auf `subscriptions`/`sb_payments`/`payment_events`; **Stripe bleibt Source-of-Truth**; keine Geld-Mutation aus der Konsole.
6. Aggregat-KPIs sind aus echten Tabellen berechnet (kein Fake/keine Deko-KPI); jede Antwort trägt `scope` (org/region/zeitraum) + Datenstand.

**Datenmodell & Migration**
7. Neue Tabellen (`feature_flags`, `incidents`, ggf. `ops_*`) haben `org_id`/Plattform-Bezug, Zeitstempel, `deleted_at`, RLS deny-by-default; `db reset` idempotent; `0001…0003` unverändert; Rollback-Block dokumentiert.

**UI end-to-end**
8. Jede Aktion ist verdrahtet (Edge/Endpoint → realer Fetch → DOM-Update → Lade/Leer/Fehler → Refresh); kein toter Button, kein Platzhalter, kein TODO; User-Werte escaped; Tokens aus `theme.css`; keine Deko-Emojis.
9. Zero-State statt Error: leere Queue/leere KPIs ⇒ leeres Array + „Noch keine Daten", **kein 500**.
10. Drilldown-Integrität: Deep-Links übergeben Kontext, bauen **nie** org-fremde URLs.

**Tests & Hygiene**
11. `npm run db:test` grün (Isolations- + Verhaltens-Tests inkl. Betriebs-Fälle); Schärfe-Probe macht den Test reproduzierbar rot, nach `db reset` grün.
12. `npm run typecheck` / `npm run build` grün; nur neue Migration(en)/Funktionen sind neu; keine Secrets im Repo/Log; `.claude/` nicht im Release-Artefakt.
13. `docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md`, ADRs/Patterns, `docs/engineering/OPERATIONS_RUNBOOK.md` (Soll laut MASTER_INDEX) spiegeln den realen Phase-3-Stand.

**Vermittler-Disclaimer**
14. Betriebs-Aktionen (z. B. Hof sperren, Verifizierung) bestätigen **formale** Plausibilität/Betriebszustand — **keine** Produkt-/Qualitäts-/Beratungsgarantie. Hinweis sichtbar in den relevanten Aktions-Dialogen.

---

## 5. Ops-Gate (Phase-3-Abschluss → Marktstart-Pflicht)

> Das **Ops-Gate** ist laut `PHASEN.md` **Pflicht für den Marktstart**. Es ist nachgelagert zu Phase-2-Gate **C (Tenant-Isolation)** und Vorbedingung für Phase 5 **Gate 10** (erste zahlende Erzeuger). **Kein Merge, keine Folge-Welle ohne grünen Isolationstest** (AGENTS.md).

| Gate-Prüfung | Kriterium | Beleg / Subagent |
|---|---|---|
| **Boundary-Gate (blockierend)** | `/betrieb/*` nur Staff/Owner; Käufer/Erzeuger 0 Zeilen + Zero-State (Acc. 1–2) | §3.4 · `db-rls-spezialist` + `qa-tester` |
| **Step-up-/Audit-Gate (blockierend)** | echte Reauth + Reason + Risk + unabschaltbares Audit; 403/401 sauber (Acc. 3–4) | §3.3 · `edge-functions-spezialist` + `security-auditor` |
| **Sicht-Gate** | Billing/KPIs read-only Sicht, Stripe Source-of-Truth, keine Schattenwahrheit (Acc. 5–6) | §4 · `payment-engineer` |
| **Migration-/Additiv-Gate** | nur neue additive Migration, `0001…0003` unberührt, Rollback dokumentiert, RLS auf allen neuen Tabellen (Acc. 7) | Diff-Review `core-guardian` |
| **UI-Verdrahtungs-Gate** | Konsole end-to-end, Zero-State, Disclaimer, Tokens, Deep-Links (Acc. 8–10) | `frontend-design-guardian` |
| **Schärfe-Gate** | künstliches Leck ⇒ `db:test` rot, danach grün (Acc. 11) | §3.6 |
| **Secret-/Release-Gate** | keine Secrets im Repo/Log, `.claude/` nicht im Artefakt (Acc. 12) | `security-auditor` |
| **Doku-Gate** | Tracker + ADRs + Operations-Runbook aktuell (Acc. 13) | Review |

**Stop-Regeln in Phase 3 (anhalten, minimalen Fix vorschlagen, auf Owner-OK warten):**
- Org-Scope einer Betriebs-Aktion serverseitig nicht prüfbar, oder eine Aktion könnte org-fremde Daten mutieren → **STOP**.
- Käufer-/Erzeuger-/Staff-Session nicht sauber trennbar, oder Step-up wäre nur ein Confirm-Dialog statt echter Reauth → **STOP**.
- Eine Aktion würde Geld bewegen/Entitlement clientseitig setzen statt über Stripe/Server → **STOP**.
- Echtes Supabase-EU-Projekt (`link`/`db push`/`functions deploy`), produktive Keys, Cloudflare-Deploy oder Domain nötig → **STOP**, Owner-Freigabe (Account/Kosten).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 6. Pro-Welle-Session-Start (kürzer)

```text
Arbeite an [B-WAVE-NN] der Betriebszentrale (Phase 3) aus finalization/phase3_betrieb/.

Lies vorher:
- AGENTS.md + CLAUDE.md (§0-Direktive, 7 Produktionspfeiler, Verbote)
- MASTER_INDEX.md + PHASEN.md (Phase 3, Ops-Gate) + docs/releases/PHASE_STATUS.md
- finalization/phase3_betrieb/MASTERPROMPT.md (Abschnitt der Welle) + GATES.md (sobald vorhanden)
- reale Artefakte: app/supabase/migrations/0001..0003, app/supabase/functions/_shared/*,
  app/src/lib/data.ts|supabase.ts|types.ts, app/src/App.tsx, app/src/styles/theme.css

Regeln: Konsole intern (nur staff/owner) · RLS fuehrend · kritische Aktion = Step-up+Reason+Risk+Audit
· Zero-State statt Error · additive Migration only · keine Secrets · keine Deko/keine toten Buttons
· Owner-Freigabe fuer Deploy/Kosten/commit · Vermittler-Disclaimer durchgaengig.

Liefere am Ende den Standard-Welle-Report (Abschnitt 7): Geaenderte Dateien · Migrationen · APIs/Edge
· UI-Module · ausgefuehrte Checks (Befehl + Output) · PASS/FAIL je Aufgabe · Sicherheitsbewertung
· offene manuelle Owner-Aufgaben · betroffene Produktionspfeiler · naechste Welle/Empfehlung.

Branch: feat/betrieb-<welle>-claude
```

---

## 7. Standard-Welle-Report (Vorlage — nach jeder Welle füllen)

```
## Welle abgeschlossen: B-WAVE NN — <Name>
- Geaendert (Dateiliste):
  · app/supabase/migrations/00NN_betrieb*.sql (falls neu: additiv, idempotent, Rollback-Block, RLS deny-by-default)
  · app/supabase/functions/betrieb-action/index.ts (falls neu: is_staff()/is_owner() serverseitig, Zod,
    Step-up-Pruefung, audit_log reason Pflicht, service_role nur hier)
  · app/src/lib/ops.ts (Dual-Source) + app/src/lib/types.ts (Domaenentypen ohne any)
  · app/src/pages/betrieb/*.tsx (RBAC-gegatet, end-to-end, Editorial-Tokens, Disclaimer)
  · app/supabase/tests/betrieb.test.mjs (Isolations- + Verhaltens-Faelle)
  · docs/releases/PHASE_STATUS.md · MASTER_INDEX.md · docs/engineering/OPERATIONS_RUNBOOK.md
    · .claude/memory/decisions|patterns/
- Migrationen: <neue Nummer(n) + Inhalt | keine>
- Neue/angepasste APIs/Edge: <Liste>
- Neue/angepasste UI-Module: <Liste>
- Ausgefuehrte Checks (Befehl -> Output):
  · npx supabase db reset            -> alle Migrationen gruen + idempotent
  · npm run db:test                  -> Isolations- + Verhaltens-Tests gruen (Cross-Org dicht, 403 ohne Step-up,
                                        Zero-State statt 500, Audit-Pflicht erzwungen)
  · Schaerfe-Probe                   -> kuenstliches Leck rot; nach db reset gruen
  · npm run typecheck && npm run build -> gruen
- Ergebnis je Aufgabe: PASS / FAIL
- Sicherheitsbewertung: <Boundary/Step-up/Audit/Secret — Risiko + Belege>
- Offene manuelle Owner-Aufgaben: <Supabase-Link/db push/functions deploy/Cloudflare-Deploy/Stripe-Keys/commit>
- Betroffene Produktionspfeiler (1-7): <z. B. 1 Org-Boundary, 4 RBAC, 5 Audit>
- Naechste Welle / Empfehlung: <B-WAVE NN+1 oder Blocker zuerst>
```

---

## 8. Was diese Betriebszentrale bedeutet (Kurzfassung)

```
- Owner-/Staff-Konsole hart abgesichert (RLS-Boundary, is_staff()/is_owner(), Audit) — INTERN, nie fuer Kunden.
- Step-up = echte Reauth, nicht Confirm-Dialog. Jede kritische Aktion: Reason + Risk-Level + unabschaltbares Audit.
- Sicht statt Schattenwahrheit: Billing/KPIs read-only auf echte Tabellen; Stripe = Source-of-Truth.
- Feature-Flags serverseitig durchgesetzt, je Flag Risk-Level, Toggle = auditierte kritische Aktion.
- Monitoring/Incidents mit Runbook-Verweis; Zero-State bei "alles gruen".
- Audit-Center durchsuchbar, Reason-Pflicht, DSGVO-konformer Export.
- additive Migration only · keine Secrets im Log · service_role nur in Edge · .claude/ nicht im Release.
- Vermittler-Disclaimer durchgaengig: Plattform vermittelt, verkauft nicht selbst, beraet nicht.
```

**Wenn einer dieser Punkte offen ist → Ops-Gate = NO GO → Marktstart blockiert.**

---

## 9. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, Backend-/Edge-/RLS-Regeln, „Kern nie neu bauen, nur andocken", USP SB-Bezahlung), `AGENTS.md` (SQL nur als additive Migration, „kein Merge ohne grünen Isolationstest", service_role nur in Edge, Step-up/Confirm/Reason/Audit), `PHASEN.md` (Phase 3 Betriebszentrale + Ops-Gate; Phase-2-Gate C; Phase 5 Gate 10).
- **Landkarte:** `MASTER_INDEX.md` (Abschnitt 5 `docs/engineering/OPERATIONS_RUNBOOK.md`, `MONITORING.md`/`OBSERVABILITY.md`, `INCIDENT_RUNBOOK.md`; Abschnitt 7 `finalization/phase3_betrieb/*`), `docs/releases/PHASE_STATUS.md` (realer Stand).
- **Reale Artefakte (Bestand, read + erweitern):** `app/supabase/migrations/0001_core.sql · 0002_payments.sql · 0003_marketplace.sql`, `app/supabase/functions/{create-checkout,stripe-webhook,_shared/*}`, `app/src/lib/{data,supabase,types}.ts`, `app/src/App.tsx`, `app/src/styles/theme.css`. Falls vorhanden: WAVE_07-Artefakte (`is_staff()`/`is_owner()`, `farm-verify`, `support-action`).
- **Subagenten (Delegationsregeln, `AGENTS.md`):** UI → `frontend-design-guardian` · DB/RLS → `db-rls-spezialist` + `qa-tester` (Isolationstest) · Step-up/Edge → `edge-functions-spezialist` · Billing-Sicht → `payment-engineer` · sensible Änderung → `security-auditor` (read-only) · DSGVO/Disclaimer → `compliance-officer` · Architekturfrage → `architekt` (Ergebnis als ADR) · Kosten/Performance → `performance-cost-optimizer`.
- **Plattform-Pfeiler dieser Phase:** Org-Boundary/Datenisolation (1) · Zero-State statt Error (2) · Scope-Transparenz (3) · RBAC ohne Lücken (4, Welten-Trennung, Konsole intern) · Audit & Verantwortlichkeit (5, `audit_log`/`betrieb.*`, Reason Pflicht) · Testpflicht pro Feature (6) · Drilldown-Integrität (7, Deep-Links ohne org-fremde URLs).

> Diese Phase ist **additiv** und ändert keine kosten-/außenwirksame Ressource. Für jeden Live-/Account-/Kosten-Schritt (Supabase-Link, `db push`, `functions deploy`, Cloudflare-Deploy, echte Keys, Domain) und für jeden `git commit`/`push` gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.** Vermittler-Disclaimer bleibt durchgängig: Die Betriebszentrale steuert den Plattform-Betrieb — die Plattform vermittelt, verkauft nicht selbst und berät nicht.
