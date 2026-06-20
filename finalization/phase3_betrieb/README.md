# Phase 3 — Betriebszentrale (Owner-/Staff-Konsole + Supabase/Cloudflare-Ops)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 3 · `PHASEN.md` → **Phase 3 Betriebszentrale (statt SCC/Hetzner)**. **Ops-Gate** (Marktstart-Pflicht-Set).
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker** — die Control-Plane ist eine **managed/edge-native Sicht**, kein Server-Hosting.
> Rolle = **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig (`docs/COMPLIANCE_MODEL.md`).
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/phase3_scc/README.md`, read-only — das BBQ-Original bleibt unangetastet). Konsequent auf die Hof-Domäne überschrieben: **SCC/Staff-Control-Center mit Hetzner-Control-Plane → schlanke Owner-/Staff-Betriebszentrale als Supabase/Cloudflare-Sicht.** VMS-/Hetzner-Begriffe (Vendor Pool, Requisition, Einsatzportal, SSH-aus-dem-Browser, Server-Rebuild/Rescue) kommen **nicht** vor.

---

## 1. Was Phase 3 ist

Phase 3 ist die **interne Steuerzentrale** von LokaleBauernConnect: eine **schlanke, mandantensichere Owner-/Staff-Konsole** plus die **operative Sicht auf die Plattform-Infrastruktur** (Supabase + Cloudflare + Stripe). Anders als bei TempConnect gibt es **keinen eigenen Server-Park und keine Hetzner-Control-Plane** — die Plattform läuft auf **managed/serverless** Diensten. Die Betriebszentrale steuert deshalb nicht Maschinen, sondern **Geschäftsvorgänge, Konfiguration und Provider-Zustände**:

- **Kunden-/Hof-Operations** — Höfe, Erzeuger-Accounts, Reservierungen, SB-Zahlungen aus Betriebssicht sehen, eingreifen (Confirm + Reason + Audit), nie blind.
- **Billing-Übersicht** — Abos (Erzeuger) + SB-Transaktionsgebühr aus einer Hand; Stripe ist die Wahrheit, die Konsole spiegelt.
- **Monitoring/Incidents** — der eine Ort, an dem Health, Fehlerrate, langsame Queries und offene Incidents sichtbar sind (Andockung an `docs/MONITORING.md` / `docs/OBSERVABILITY.md` / `docs/INCIDENT_RUNBOOK.md`).
- **Feature-Flags** — kontrollierte Schalter (z. B. SB-Bezahlung pro Region/Hof), serverseitig durchgesetzt, auditiert.
- **Audit** — jede betriebliche Mutation: wer/was/warum, unabschaltbar (`audit_log`, Namespace `ops.*`).

Phase 3 ist **kein Konzept-Neubau**: Auth/MFA/Rollen/Tenancy/Audit/Support-Center sind **Kern** des ConnectCore-Imperiums (EIN Staff-/Support-Center für 14 Plattformen). LokaleBauernConnect liefert die **Spezial-Schicht** (Hof-/Reservierungs-/SB-Zahlungs-Operations) und **dockt an** den geteilten Kern an — es baut **keine zweite Konsole**. Das hält das Muster in 20 weiteren Plattformen wiederverwendbar (Imperium-Beschleuniger).

---

## 2. Zwei Tracks (statt TempConnects Track A „Profi" + Track B „Hetzner")

| Track | Inhalt | Adaptions-Herkunft |
|---|---|---|
| **Track A — Betriebskonsole (Business-Ops)** | Owner-/Staff-Konsole: Hof-/Kunden-Operations, Billing-Übersicht, Eskalations-/Ticket-Andockung, Feature-Flags, Audit-Sicht. Identity, Step-up, RBAC-Welten-Trennung, Profi-UI, Audit-Evidence. | TempConnect **Track A (SCC Profi-Level)** |
| **Track B — Plattform-Ops (Control-Plane)** | Supabase/Cloudflare/Stripe **als read-first Sicht**: Health/Status, Migrations-/Edge-Deploy-Status, Backup-/DR-Sicht, Secret-Rotation-Status, Domain/DNS/WAF-Zustand. **Keine** freien Live-Kommandos aus dem Browser. | TempConnect **Track B (Hetzner Control Plane)** — radikal verschlankt: kein Server, keine SSH-/Rebuild-/Rescue-Aktionen |

**Track B ist bewusst dünn.** Wo TempConnect eine Server-Control-Plane mit Whitelist-Kommandos brauchte, genügt hier eine **read-first Betriebssicht** plus klar abgegrenzte, auditierte, zweifach bestätigte Mutationen (z. B. Feature-Flag umlegen). **Mutierende Infra-Aktionen** (Migration `db push`, `functions deploy`, Domain/DNS, WAF-Regel, Secret-Rotation) laufen **nicht** durch die Browser-Konsole, sondern über die dokumentierten Owner-Runbooks (`docs/DEPLOYMENT.md`, `docs/engineering/OPERATIONS_RUNBOOK.md`, `docs/security/SECRET_ROTATION.md`, `docs/BACKUP_DISASTER_RECOVERY.md`) mit Owner-Freigabe.

---

## 3. Verhältnis zu Phase 1, 2, 4, 5

| Phase | Ebene | Fokus | Anknüpfung an Phase 3 |
|---|---|---|---|
| **Phase 1** | Fachlich-architektonisch | Produkt korrekt bauen | Liefert Schema/RLS/Rollen/Audit + Staff-/Support-Andockung (`WAVE_07`), KPI-Dashboard (`WAVE_05`), Observability (`WAVE_13`) — die **Datenquellen** der Konsole |
| **Phase 2** | Release-operativ | Produkt auslieferbar machen | Cloudflare-Deploy, Security-Header/CSP, Gates A–F — Phase 3 **konsumiert** den Deploy-/Health-Zustand und macht ihn bedienbar |
| **Phase 3** | **Betriebs-spezifisch** | **Interne Steuerzentrale finalisieren** | **läuft parallel** zu Phase 2 — bringt das interne Tooling zur Operations-Reife |
| **Phase 4** | Vertikale Strecken | SB-Bezahl-USP, Karte, Saison | SB-Zahlungen + Schwund/Einnahmen werden in Track A **betrieblich** sichtbar/steuerbar |
| **Phase 5** | Skalierung 10→300 | Customer-Gates, Performance | Track B liefert die **Skalierungs-Sicht** (Query-Last, Kosten, Limits) für die Gates |

Phase 3 läuft **parallel, nicht sequenziell**. Während Phase 2 das Außenprodukt zur Release-Reife bringt, bringt Phase 3 die interne Betriebszentrale zur Operations-Reife.

**Konkrete Anknüpfungspunkte (repo-genau):**

| Phase-3-Baustein | Greift in Phase 1/2 |
|---|---|
| Track A — Hof-/Kunden-Operations | `WAVE_02` (Schema/RLS), `WAVE_03` (Rollen), `WAVE_04` (Finder/Verfügbarkeit/Reservierung), `WAVE_07` (Verifizierung/Eskalation/Ticket) |
| Track A — KPI-/Betriebsmetriken | `WAVE_05` (Owner/KPI-Dashboard) |
| Track A — Billing-Übersicht | `WAVE_09` (Stripe-Abo) + Phase 4 Track A (SB-Bezahlung) |
| Track A — Audit-Sicht | `WAVE_13` (Observability) + `audit_log` (0001) |
| Track A — Welten-Trennung/RBAC | `WAVE_06` (Auth/Turnstile/RLS-Härtung), `is_staff()`/`is_owner()` (aus WAVE_07) |
| Track B — Health/Status/Incidents | `docs/MONITORING.md`, `docs/OBSERVABILITY.md`, `docs/INCIDENT_RUNBOOK.md` |
| Track B — Deploy-/Migrations-/Backup-Sicht | `docs/DEPLOYMENT.md`, `docs/BACKUP_DISASTER_RECOVERY.md`, `docs/security/SECRET_ROTATION.md` |

---

## 4. Aktueller Code-/Doku-Stand (Wahrheitspunkt)

**Im Repo bereits real vorhanden** (Datenquellen + Pattern für die Konsole):

```text
app/supabase/migrations/0001_core.sql          # orgs, profiles, user_role(kaeufer/erzeuger/staff/owner),
                                               # farms.verified, audit_log(reason), set_updated_at()
app/supabase/migrations/0002_payments.sql      # Zahlungs-/Billing-Grundlage
app/supabase/migrations/0003_marketplace.sql   # is_org_member(), org_members, reviews, org_locations(is_unmanned)
app/supabase/functions/_shared/               # cors.ts, supabaseAdmin.ts, stripe.ts, email.ts (Edge-Pattern)
app/supabase/functions/create-checkout/       # Stripe-Checkout (Edge)
app/supabase/functions/stripe-webhook/        # EIN idempotenter, signaturgeprüfter Webhook
app/src/pages/FinderPage.tsx                   # Hofladen-Finder (end-to-end, Seed/Supabase dual-source)
app/src/pages/StandPayPage.tsx                 # SB-Bezahl-Einstieg (USP)
app/src/lib/                                   # data.ts/supabase.ts/types.ts (Dual-Source-Datenschicht)
app/src/styles/                                # Editorial-Design-Tokens (theme.css)
docs/engineering/OPERATIONS_RUNBOOK.md         # Routine/On-Call/Deploy/Rollback
docs/INCIDENT_RUNBOOK.md                       # Notfall-/Störungshandbuch (Cloudflare/Supabase/Stripe)
docs/MONITORING.md · docs/OBSERVABILITY.md     # serverless Telemetrie-Modell
docs/BACKUP_DISASTER_RECOVERY.md               # Supabase-Backup/DR
docs/security/SECRET_ROTATION.md               # Secret-Rotation
docs/releases/PHASE_STATUS.md                  # Wellen-/Phasen-Tracker
```

**Bewusste Lücke (was Phase 3 baut):** Es existiert noch **keine `/ops/*`-Konsole** und **keine `is_staff()`/`is_owner()`-Helfer-Migration** (geplant aus `WAVE_07`). Phase 3 baut die Konsole **additiv** auf den vorhandenen Datenquellen + RLS-Helfern auf — kein Rebuild, keine Parallel-Shell, keine zweite App.

> **Abweichung dokumentiert (Stop-Regel „Datenmodell für Zielzustand"):** Eine generische „Admin-Panel"-Allmacht wird **nicht** gebaut. Die Betriebszentrale ist eine **gegatete Sicht mit eng definierten, auditierten Aktionen** — Owner-Ebene (Geschäft + Konfiguration) und Staff-Ebene (Operations) sauber getrennt. Begründung als ADR (`.claude/memory/decisions/`).

---

## 5. Rollenabgrenzung (verbindlich — Welten-Trennung)

| Bereich | Pfad | Zweck | Wer hat Zugriff |
|---|---|---|---|
| **Käufer-Welt** | `/` (Finder, Reservierung, SB-Zahlung) | Endkunden | öffentlich / eingeloggte Käufer |
| **Erzeuger-Welt** | `/erzeuger/*` | Hof-/Verfügbarkeits-Selbstpflege | Erzeuger der eigenen Org |
| **Betriebszentrale — Staff** | `/ops/*` | Plattform-Operations (Hof-/Kunden-Ops, Eskalation, Ticket, Monitoring) | `profiles.role = 'staff'` (+ Step-up) |
| **Betriebszentrale — Owner** | `/ops/owner/*` | Owner-Ebene (Billing-Hoheit, Feature-Flags, Infra-Sicht, kritische Aktionen) | `profiles.role = 'owner'` (+ Step-up) |

**Pflicht (deny-by-default, serverseitig via RLS — der Client-Guard ist nur UX):**
- Keine Navigation zwischen Käufer-/Erzeuger-App und `/ops/*`.
- Kein Käufer/Erzeuger erreicht die Betriebszentrale — fremde Rolle = **Zero-State „Kein Zugriff"** + Rückpfad, **nie** 200 mit Fremddaten.
- Staff erhält **nicht automatisch** Owner-Hoheit (Billing-/Flag-/Infra-Mutationen).
- Staff sieht Kundendaten **nur zweckgebunden** — kein freier Daten-Export ohne Audit.
- `is_staff()`/`is_owner()` sind die **einzige** org-übergreifende Hoheit; negativ wie positiv im Isolationstest geprüft.

---

## 6. Sicherheitsprinzip Phase 3 (serverless-adaptiert)

```text
Kein freier API-Pfad aus der Konsole.
Kein Live-Shell-/SSH-Kommando (es gibt keinen Server — managed/serverless).
Kein Server-Delete / Rebuild / Rescue / Root-Reset (existiert nicht — entfällt vollständig).
Kein Secret-Reveal in der UI — Secrets nur in Supabase/Cloudflare-Secret-Stores, nie im Frontend/Log.
Keine mutierende Aktion ohne: Owner-/Staff-Allowlist (RLS-Rolle), Step-up/MFA, Pflicht-Reason, Audit.
service_role ausschließlich in Edge Functions — niemals im Frontend (dort nur VITE_-Public-Keys).
Production ohne gültige Provider-Credentials liefert für Mutationen niemals „stubbed-ok" — sondern 403/Fehler.
Feature-Flags werden serverseitig durchgesetzt (RLS/Edge), nicht nur im Client umgeschaltet.
```

Diese Prinzipien sind die Hof-/Serverless-Übersetzung von TempConnects „Kein SSH aus dem Browser / Kein Rebuild / Kein Reset Root Password". Da es **keinen Server** gibt, entfällt die ganze Server-Mutations-Klasse — die verbleibende Angriffsfläche ist **Daten + Konfiguration**, und die ist über RLS + Edge + Audit abgesichert.

---

## 7. Inhalt dieser Schicht (geplante Dateien des Ordners)

| Datei | Zweck | Status |
|---|---|---|
| `README.md` (diese Datei) | Überblick, Tracks, Rollenabgrenzung, Sicherheitsprinzip, Arbeitsweise | ✅ |
| `TRACK_A_BETRIEBSKONSOLE.md` | Wellen der Owner-/Staff-Konsole (Identity/Step-up, Ops-UI, Billing-Übersicht, Audit, Tests) | ⬜ |
| `TRACK_B_PLATTFORM_OPS.md` | Supabase/Cloudflare/Stripe Control-Plane (read-first Sicht, Health, Deploy-/Backup-/Secret-Status) | ⬜ |
| `GATES.md` | **Ops-Gate** (Welten-Trennung, Audit-Evidence, Health-Sicht, Confirm+Reason) + Übergabe ans Phase-2-Gate C | ⬜ |
| `MANUAL_TASKS.md` | Owner-Aufgaben (Account/Kosten/Domain/Secrets/Staff-Anlage) — bewusst **außerhalb** der Konsole | ⬜ |
| `MASTERPROMPT.md` | Kombinierter Start-Prompt für die Betriebszentralen-Finalisierung | ⬜ |

> Reihenfolge der Erstellung: **Track A** (Business-Ops, größter Owner-Wert) vor **Track B** (Infra-Sicht). `GATES.md` definiert das Ops-Gate, das beide Tracks abnimmt. **Eine Welle/ein Track pro Session.**

---

## 8. Wie Claude Code mit Phase 3 arbeitet

**Pflicht-Lesereihenfolge pro Phase-3-Session** (Konflikt-Hierarchie: User > `AGENTS.md` > Subagent > `CLAUDE.md`):

1. `AGENTS.md` (Projekt) + `~/AGENTS.md` (global, §0-Direktive)
2. `CLAUDE.md` (Repo-Root) + `PHASEN.md` (Phase 3 Ops-Gate) + `MASTER_INDEX.md` (Abschnitt 5 Operations)
3. `finalization/phase3_betrieb/README.md` (diese Datei)
4. Die spezifische Track-Datei (`TRACK_A_BETRIEBSKONSOLE.md` **oder** `TRACK_B_PLATTFORM_OPS.md`)
5. Bei Gate-/Abnahme-Themen: `GATES.md`; bei Owner-Aufgaben: `MANUAL_TASKS.md`
6. Relevantes `.claude/memory/` (INDEX + decisions/learnings/patterns)

**Reihenfolge der Umsetzung:** Track A (Wellen aufsteigend) → Track B (read-first Sicht). Voraussetzung für jeden mutierenden Pfad: `is_staff()`/`is_owner()`-Helfer + RLS aus `WAVE_07` grün. Bei vorhandener Kapazität dürfen Track A und B alternieren — Track A muss die RBAC-/Welten-Trennung jedoch **zuerst** stehen haben.

---

## 9. Was Claude Code in Phase 3 NICHT tun darf (kritisch)

- Eine **zweite** Konsole/Admin-Suite bauen, statt an den geteilten Kern (Auth/Rollen/Support/Audit) **anzudocken**.
- service_role oder Secrets ins Frontend bringen oder in Logs schreiben.
- Mutierende Infra-Aktionen (`supabase db push`, `functions deploy`, Domain/DNS, WAF-Regel, Secret-Rotation) **aus der Browser-Konsole** auslösen — diese laufen über Owner-Runbooks mit Freigabe.
- Eine Staff-/Owner-Mutation **ohne** Pflicht-`reason` + `audit_log`-Zeile durchführen.
- RLS umgehen oder eine `/ops/*`-Route ohne serverseitigen Rollen-Check ausliefern (`if(!role) return null` ohne 403 = Bug).
- Staff-/Owner-Accounts **selbst** anlegen oder Rollen vergeben (Owner-Aufgabe, `MANUAL_TASKS.md`).
- Echte Provider-Credentials / Live-`db push` / `functions deploy` / Domain / Cloudflare-Deploy ohne **vorab angekündigte Owner-Freigabe** (Account/Kosten).
- `git commit`/`push` ohne ausdrückliche Owner-Freigabe (Co-Author-Zeile anhängen).

---

## 10. Ops-Gate (Abnahme dieser Phase — Marktstart-Pflicht)

> Phase 3 ist im **Marktstart-Pflicht-Set** (`PHASEN.md` → „Phase 3 Ops-Gate grün — minimale Betriebssicht"). Das Ops-Gate ist Vorgate/Partner zum **Phase-2-Gate C (Tenant-Isolation)**. Detail-Kriterien in `GATES.md`.

| Gate-Prüfung | Kriterium | Beleg/Verantwortlich |
|---|---|---|
| **Welten-/RBAC-Gate (blockierend)** | `/ops/*` und `/ops/owner/*` sauber getrennt; Käufer/Erzeuger → Zero-State „Kein Zugriff"; `is_staff()`/`is_owner()` einzige org-übergreifende Hoheit; negativ wie positiv getestet | `db-rls-spezialist` + `qa-tester` (Isolationstest) |
| **Audit-/Confirm-Gate** | jede betriebliche Mutation: Confirm + Pflicht-`reason` + `audit_log` (`ops.*`), unabschaltbar | `security-auditor` + `edge-functions-spezialist` |
| **Zero-State-Gate** | leere Listen/Metriken ⇒ leeres Array + „Noch keine Daten", **kein 500** | `frontend-design-guardian` |
| **Health-/Incident-Sicht-Gate** | Betriebssicht zeigt realen Health/Fehler-/Incident-Stand (Andockung an Monitoring/Incident-Runbook), keine Fake-KPIs | Review gegen `docs/MONITORING.md` · `docs/INCIDENT_RUNBOOK.md` |
| **Secret-/service_role-Gate** | keine Secrets/service_role im Frontend/Log; mutierende Infra nur über Owner-Runbook | `security-auditor` |
| **UI-Verdrahtungs-Gate** | Konsole end-to-end (Endpoint→Fetch→DOM→Lade/Leer/Fehler→Refresh), kein toter Button, Editorial-Tokens, Disclaimer | `frontend-design-guardian` |
| **Doku-Gate** | `PHASE_STATUS.md`, `MASTER_INDEX.md`, ADRs/Patterns auf realem Stand | Review |

**Stop-Regeln in dieser Phase:**
- Käufer-/Erzeuger-/Staff-/Owner-Sicht wäre nicht sauber trennbar oder eine betriebliche Schreibhoheit serverseitig nicht prüfbar → **STOP**, minimalen Fix vorschlagen, Owner-OK.
- Eine mutierende Aktion ohne definierten Statusübergang, ohne `reason` oder ohne Audit → **STOP**.
- Echtes Supabase-EU-Projekt (`link`/`db push`/`functions deploy`), produktive Keys, Domain oder Cloudflare-Deploy nötig → **STOP**, Owner-Freigabe (Account/Kosten).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 11. Verbindlicher Branch

Wie Phase 2: alle Phase-3-Commits auf den Release-Branch (`feat/<task-name>-claude` bzw. der für den Marktstart festgelegte Release-Branch). Eigener Sub-Branch `feat/ops-betriebszentrale-claude` ist zulässig, der später in den Release-Branch mergt — Entscheidung im Track A WAVE 00. **Kein Commit ohne Owner-Freigabe.**

---

## 12. Abhängigkeiten & Referenzen

- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, „Kern nie neu bauen, nur andocken", „jede mutierende Aktion: Confirm + Reason + Audit"), `AGENTS.md` (SQL nur als additive Migration, „kein Merge ohne grünen Isolationstest", service_role nur in Edge), `PHASEN.md` (Phase 3 Ops-Gate, Marktstart-Pflicht-Set).
- **Landkarte:** `MASTER_INDEX.md` (Abschnitt 5 Operations & Deployment, Abschnitt 7 Finalisierung).
- **Reale Artefakte (Bestand):** `app/supabase/migrations/0001_core.sql` (`audit_log`, `user_role`, `farms.verified`), `0002_payments.sql`, `0003_marketplace.sql` (`is_org_member`, `org_members`), `app/supabase/functions/_shared/*` + `stripe-webhook` (Edge-/Webhook-Pattern), `app/src/lib/*` (Dual-Source), `app/src/pages/*`, `app/src/styles/theme.css`.
- **Betriebs-Doku (Andockung, nicht duplizieren):** `docs/engineering/OPERATIONS_RUNBOOK.md`, `docs/INCIDENT_RUNBOOK.md`, `docs/MONITORING.md`, `docs/OBSERVABILITY.md`, `docs/DEPLOYMENT.md`, `docs/BACKUP_DISASTER_RECOVERY.md`, `docs/security/SECRET_ROTATION.md`.
- **Vorwellen:** `WAVE_05` (KPI-Dashboard — Metrikquellen), `WAVE_06` (Auth/Turnstile/RLS-Härtung), `WAVE_07` (Staff-/Support-Andockung, `is_staff()`/`is_owner()`), `WAVE_13` (Observability).
- **Subagenten:** `architekt` (Kern-vs-Spezial-Grenze), `db-rls-spezialist` + `qa-tester` (Welten-Trennung/Isolationstest), `edge-functions-spezialist` + `security-auditor` (Audit/service_role), `frontend-design-guardian` (Editorial-UI), `devops` (Cloudflare/Supabase-Ops), `performance-cost-optimizer` (Kosten/Skalierung 10→300).

> Diese Schicht ist **additiv** und ändert keine kosten-/außenwirksame Ressource. Für jeden Live-/Account-/Kosten-Schritt (Supabase-Link, `db push`, `functions deploy`, Cloudflare-Deploy, Domain, echte Keys) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.** Vermittler-Disclaimer bleibt durchgängig: Die Betriebszentrale steuert die **Vermittlungs-/Zahlungsanbindung** — die Plattform vermittelt, verkauft nicht selbst und berät nicht.
