# Operations-Runbook — LokaleBauernConnect

> **Zweck.** Das verbindliche Betriebshandbuch für den laufenden Betrieb von LokaleBauernConnect: Routineaufgaben (täglich/wöchentlich/monatlich), Health-Checks, Deploy & Rollback, Skalierung, On-Call-Bereitschaft und Eskalation. Es beschreibt **wer was wann wie** tut, damit der Betrieb reproduzierbar, sicher und auditierbar bleibt — unabhängig davon, wer gerade Dienst hat.
>
> **Stack (fix, Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.** Begründung: `docs/adr/0001-stack-react-supabase-cloudflare.md`.
>
> **Rolle der Plattform:** **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig. Daraus folgt operativ: Wir betreiben die **Vermittlungs- und Zahlungsanbindungs-Infrastruktur**, nicht den Warenbestand eines Hofes. Bestand, Preise und Abholzusagen gehören dem jeweiligen Hof (Domain owns truth); wir gewährleisten Verfügbarkeit, Isolation und Nachvollziehbarkeit der Plattform.
>
> **Abgrenzung zu Nachbar-Dokumenten:** Dieses Runbook ist das **operative Tagesgeschäft**. Reaktion auf konkrete Störungen → `docs/INCIDENT_RUNBOOK.md`. Wiederherstellung nach Datenverlust → `docs/BACKUP_DISASTER_RECOVERY.md`. Deploy-Mechanik im Detail → `docs/DEPLOYMENT.md`. Metriken/Alarme → `docs/MONITORING.md` / `docs/OBSERVABILITY.md`. Architektur-Wahrheit (Skalierung/SLA/Degradation) → `docs/ENTERPRISE_ARCHITECTURE.md`. Security → `docs/security/SECURITY_OVERVIEW.md`.
>
> **Status (Stand 2026-06-19):** Die App ist **standalone-first** (ADR 0002) und läuft mit Seed-Fallback ohne Backend (Dev-Port **5409**). Supabase-/Cloudflare-Live steht unter Owner-Freigabe (Account/Kosten/Domain) aus. Dieses Runbook ist damit teils **Soll** (Live-Betrieb) und teils **Ist** (lokaler Betrieb) — jeder Abschnitt markiert den Reifegrad: ✅ heute gültig · 🔨 teil-aktiv · ⬜ ab Go-Live.

---

## 0 · Betriebs-Grundsätze (gelten immer)

Diese Grundsätze stehen über jeder Einzelprozedur. Bei Zielkonflikt im Betrieb gewinnen sie.

1. **RLS ist die Autorität — auch im Betrieb.** Kein Betriebseingriff weicht die Mandantentrennung auf. Wer zur Diagnose Daten ansieht, tut das rollengebunden und auditiert. Der service-role-Key wird **nie** ins Frontend, in ein Log oder in einen Ad-hoc-Client gezogen (`docs/security/SECURITY_OVERVIEW.md` §9).
2. **Owner-Freigabe vor irreversiblen/kostenwirksamen Schritten.** Deploy auf Prod, Tier-Wechsel (Compute/Plan), produktiver Restore, Secret-Rotation in Prod, Account-/Domain-Änderungen: **vorab in Klartext ankündigen, erst auf OK** (`CLAUDE.md` Stop-Regeln). Reversible lokale Arbeit: decide-and-act.
3. **Zero-State statt Error.** Leere Daten sind ein gültiger Betriebszustand. Ein Health-Check, der „keine Reservierungen heute" meldet, ist **grün**, nicht rot. Operative Alarme feuern auf echte Fehler (5xx, Webhook-Fehlschlag, Isolations-Regression), nicht auf Leere (Produktionspfeiler 2).
4. **Jede Mutation hinterlässt Spuren.** Betriebs-Aktionen mit Wirkung auf Daten/Entitlements/Verfügbarkeit werden auditiert (`audit_log`, reason-Pflicht bei kritischen Aktionen, Pfeiler 5). Ein stiller Eingriff ist ein verbotener Eingriff.
5. **Graceful Degradation vor Totalausfall.** Wo Teilbetrieb möglich ist, gibt es keinen Totalausfall. Öffentliche Reads bleiben aus dem Edge-Cache lesbar, auch wenn der Schreibpfad gestört ist (`docs/ENTERPRISE_ARCHITECTURE.md` §6.3).
6. **Secrets nur in Env/Secret-Manager.** Niemals in Code, Log, Ticket, Chat oder Screenshot. Bei Verdacht auf Leak: sofort Rotation (`docs/security/SECRET_ROTATION.md`).
7. **Keine Schnellfixes zum Nachpflegen.** Ein Betriebseingriff ist erst „fertig", wenn er dokumentiert, auditiert und (wo nötig) als Folgeaufgabe verankert ist.

---

## 1 · Betriebs-Topologie & Verantwortlichkeiten

### 1.1 Was wir betreiben (Komponenten-Inventar)

| Komponente | Betreiber | Unsere Betriebsaufgabe | Reifegrad |
|---|---|---|---|
| **Cloudflare Pages** (`web/` Landing, `app/` React-Build) | managed (Cloudflare) | Deploy, Header/CSP, Cache-Regeln, Build-Health | ⬜ ab Go-Live |
| **Cloudflare Workers** (Edge-Logik, Read-Cache, Header-Härtung) | managed | Deploy, Cache-Invalidierung, Rate-Limit-Regeln | ⬜ ab Go-Live |
| **Cloudflare WAF / Turnstile / Rate-Limit** | managed | Regelpflege, „Under Attack"-Modus bei Bedarf | ⬜ ab Go-Live |
| **Supabase Postgres** (EU, RLS) | managed (Supabase) | Migrationen, Backups/PITR-Überwachung, Compute-Tier | 🔨 Code vorhanden |
| **Supabase PostgREST** (Auto-API, RLS-gebunden) | managed | indirekt über Schema/Policies | 🔨 |
| **Supabase Edge Functions** (Deno: Zod, Audit, Stripe-Webhook, SB-Bezahlung) | managed | Deploy, Versions-Rollback, Secret-Pflege | ⬜ ab WAVE_09 / Phase 4 |
| **Supabase Auth** (JWT/MFA) | managed | Auth-Policy, MFA-Enforcement Staff | ⬜ ab WAVE_06 |
| **Supabase Storage** (Hof-Bilder) | managed | Bucket-Policies, CDN-Auslieferung | ⬜ |
| **Stripe (+ Connect)** (Erzeuger-Abo, SB-Zahlung) | managed (Stripe) | Webhook-Health, Reconciliation, Connect-Onboarding-Status | ⬜ ab WAVE_09 / Phase 4 Track A |
| **App-Repo / CI** (Vite-Build, Typecheck, Tests) | wir | Build grün halten, Gates, Release-Artefakt | ✅ heute |

> **Bewusst NICHT in unserem Betrieb:** Kein VM-/Server-Patching, kein OS-Härten, kein selbst betriebener Postgres, kein Load-Balancer-Betrieb, kein TLS-Cert-Handling. Das ist die Konsequenz der managed/serverless-Wahl (ADR 0001) und der Grund, warum dieses Runbook **kein** Server-HA-Runbook ist (der frühere Hetzner-HA-Pfad entfällt).

### 1.2 Betriebsrollen

| Rolle | Verantwortung im Betrieb | Berechtigung |
|---|---|---|
| **Owner** | Entscheidungsinstanz: Deploy-/Kosten-/Account-/Restore-/SLA-Freigabe. Letzte Eskalationsstufe. | Voll, inkl. Dashboards Cloudflare/Supabase/Stripe |
| **Claude (Betrieb/Engineering)** | Gesamter Stack: Migrationen, Deploys (nach Freigabe), Health-Checks, Diagnose, Fix, Doku, Audit-Pflege. OZ-Execution-Part (Gates, Abschlussberichte). | Voll im Repo; Prod-Eingriffe nur nach Owner-Freigabe |
| **Staff/Support** | Fachlicher Betrieb: Hof-Verifizierung, Eskalationen, Support-Tickets (über Kern-Support-Center). Erste Triage fachlicher Vorfälle. | Explizit rollengebunden (`staff`), MFA-Pflicht, auditiert |
| **Erzeuger** | Self-Service der eigenen `org` (Produkte/Verfügbarkeit/Abholfenster/SB-Stände). Meldet Probleme der eigenen Sicht. | Eigene `org`, RLS-begrenzt |

> Die drei Welten (Käufer/Erzeuger/Staff) sind über Session, Rolle und RLS strikt getrennt — auch im Betrieb. Ein Betriebseingriff „im Namen eines Hofes" ist eine explizite, auditierte Staff-/Owner-Aktion, nie ein impliziter Voll-Zugriff (`docs/ENTERPRISE_ARCHITECTURE.md` §1.4).

### 1.3 Betriebs-Kontakte & Zugänge (Soll, vor Go-Live befüllen)

| Was | Wo | Hinweis |
|---|---|---|
| Cloudflare Dashboard | `dash.cloudflare.com` | Pages, Workers, WAF, Analytics, Logs |
| Supabase Dashboard | `app.supabase.com` | DB, Auth, Functions, Logs, Backups/PITR, Usage |
| Stripe Dashboard | `dashboard.stripe.com` | Zahlungen, Webhooks, Connect, Disputes |
| Status-/Health-Seite | `/<health>` (geplant, WAVE_13) | DB-Reachability, Function-Status, Version, Uptime |
| Provider-Statusseiten | Cloudflare/Supabase/Stripe Status | bei Verdacht „liegt's an uns?" zuerst hier prüfen |
| Secret-Inventar | `docs/security/SECRET_ROTATION.md` | welche Keys existieren, wo, Rotationsintervall |

---

## 2 · Routineaufgaben (Operational Cadence)

Wiederkehrende Aufgaben mit fester Taktung. Jede Routine ist so geschnitten, dass sie in wenigen Minuten erledigbar und eindeutig „grün/rot" beurteilbar ist. **Leere ≠ Fehler** (Pfeiler 2) — eine ruhige Plattform ist ein gültiger Zustand.

### 2.1 Täglich (Werktags-Cadence, ~10 Min)

| # | Aufgabe | Quelle | Grün-Kriterium | Bei Rot |
|---|---|---|---|---|
| D1 | **Health-Check sichten** | Health-Endpoint / Synthetic-Monitor (WAVE_13) | DB erreichbar, Functions ok, Version aktuell | → §3 Health-Checks |
| D2 | **Error-Rate & p95-Latenz** | Sentry + Cloudflare/Supabase-Analytics | 5xx-Rate ~0, p95 im Budget (§3.4) | → §7 On-Call / §3 |
| D3 | **Stripe-Webhook-Health** ⬜ | Stripe Dashboard → Webhooks | keine fehlgeschlagenen Events offen | → §3.5 / Reconciliation |
| D4 | **Auth-Anomalien** ⬜ | Supabase Auth-Logs + `audit_log` (Login-Failed) | keine Brute-Force-/Spike-Muster | → §7 / Rate-Limit prüfen |
| D5 | **WAF/Rate-Limit-Treffer** ⬜ | Cloudflare Security-Analytics | keine ungewöhnliche Block-Welle | → §6.5 DDoS/Bot |
| D6 | **Kosten-Telemetrie (Quick-Glance)** | Supabase/Cloudflare Usage | kein Egress-/Invocation-Spike | → §5.5 Kosten-Anomalie |

> Solange die Plattform standalone/Seed läuft (Pre-Go-Live), reduziert sich D1–D6 auf **Build-Health** (CI grün) — die Live-Telemetrie aktiviert sich mit Cloudflare/Supabase.

### 2.2 Wöchentlich (~30 Min)

| # | Aufgabe | Ziel |
|---|---|---|
| W1 | **Dependency-Audit** | `npm audit --omit=dev` im `app/` → 0 High/Critical (sonst Patch planen). |
| W2 | **Backup-/PITR-Sichtprüfung** ⬜ | Supabase: Backups laufen, PITR-Fenster wie erwartet (`docs/BACKUP_DISASTER_RECOVERY.md`). |
| W3 | **Isolations-Gate nachziehen** | Cross-Org-Negativtests grün (CI-Gate). Jede neue Tabelle/Endpoint im Test abgedeckt. |
| W4 | **Stripe-Reconciliation** ⬜ | Abgleich Stripe-Events ↔ DB-Entitlements/SB-Buchungen; Differenzen klären (§3.5). |
| W5 | **Cache-Hit-Quote & Egress-Trend** ⬜ | Edge-Cache-Hit hoch genug; Origin-Last/Egress flach (§5 Kosten-Hebel). |
| W6 | **Offene Eskalationen / Support-Backlog** | Staff-Center: keine überfälligen Hof-Verifizierungen/Eskalationen. |
| W7 | **PHASE_STATUS & MASTER_INDEX aktuell** | Tracker spiegeln den realen Stand (`docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md`). |

### 2.3 Monatlich (~1–2 h)

| # | Aufgabe | Ziel |
|---|---|---|
| M1 | **Restore-Drill** ⬜ | PITR-Wiederherstellung in eine isolierte Umgebung testen — ein ungetesteter Restore ist kein Restore (`docs/ENTERPRISE_ARCHITECTURE.md` §7.1). |
| M2 | **Secret-Rotation-Review** | Fällige Keys rotieren bzw. Fälligkeit prüfen (`docs/security/SECRET_ROTATION.md`); Owner-Freigabe für Prod-Rotation. |
| M3 | **Kapazitäts-/Skalierungs-Review** | Höfe-/Käufer-/Last-Trend gegen Skalierungsstufen (§5) — nähert sich eine Schwelle (300/3000)? |
| M4 | **Kosten-Review** | Monatskosten gegen Trend; Anomalien? Optimierungshebel (Cache/Aggregate/Bilder) ziehen (`docs/ENTERPRISE_ARCHITECTURE.md` §5.4). |
| M5 | **Sicherheits-Review** | `security-auditor`-Durchlauf: RLS-Lücken, Secret-im-Client, Webhook-Signatur, ungeprüfte Eingaben. |
| M6 | **Insights konsolidieren** | `.claude/learning/insights_inbox.md` destillieren → Owner-Review → übernehmen (`AGENTS.md` Lern-Loop). |
| M7 | **Provider-Changelog-Sichtung** | Breaking Changes Cloudflare/Supabase/Stripe (Pflicht-Migrationen, Deprecations) vormerken. |

### 2.4 Ereignisgetrieben (anlassbezogen)

| Anlass | Pflicht-Aufgabe |
|---|---|
| Neue Migration | additiv + Rollback-Pfad + Isolationstest grün, **dann** Deploy (§4). |
| Neue Edge Function / Webhook-Änderung | Zod-Grenze, Rechteprüfung, Audit, Idempotenz verifizieren; Staging-Test vor Prod. |
| Neuer Hof / Connect-Onboarding ⬜ | Verifizierungs-Status, Connect-Payout-Status prüfen (Staff). |
| Markttag / Saison-Peak | §5 Skalierung: Cache-TTL prüfen, Compute-Headroom, On-Call-Schärfung. |
| Provider-Incident gemeldet | Statusseite verifizieren, Degradationsstufe wählen (§6.3), Owner informieren. |

---

## 3 · Health-Checks

Health-Checks sind die **Voraussetzung jeder Beherrschbarkeit** — kein Ausfall ist managebar ohne Erkennung (`docs/ENTERPRISE_ARCHITECTURE.md` §7.2). Sie unterscheiden sauber zwischen **„leer"** (grün) und **„kaputt"** (rot).

### 3.1 Health-Ebenen

| Ebene | Was wird geprüft | Werkzeug | Soll |
|---|---|---|---|
| **L0 Synthetic** | Kernpfad von außen: Finder lädt → Detail → Reservierung (Probe) | Synthetic-Monitor (WAVE_13) | ⬜ |
| **L1 Edge** | Pages erreichbar, Header/CSP gesetzt, Cache antwortet | Cloudflare-Analytics + Header-Scan | ⬜ |
| **L2 API** | PostgREST antwortet, RLS aktiv (anon sieht nur Öffentliches) | Supabase-Logs + gezielte Read-Probe | 🔨 |
| **L3 DB** | Postgres erreichbar, Latenz im Budget, Connections gesund | Supabase Dashboard | 🔨 |
| **L4 Functions** | Edge Functions antworten, Fehlerquote ~0 | Supabase Function-Logs | ⬜ |
| **L5 Zahlung** | Stripe-Webhook empfängt & verarbeitet, Idempotenz greift | Stripe + Idempotenz-Logs | ⬜ |
| **L6 App-Build** | Typecheck + Build grün, Artefakt secret-frei | CI / lokal | ✅ |

### 3.2 Health-Endpoint (Soll, WAVE_13)

Ein dedizierter, **nicht-leakender** Health-Endpoint liefert maschinenlesbar:

```jsonc
{
  "status": "ok",            // ok | degraded | down
  "version": "<git-sha>",    // Release-Tagging (Sentry-konform)
  "db": "reachable",         // reachable | slow | unreachable
  "functions": "ok",         // ok | errors | unreachable
  "checked_at": "<iso>"      // UTC
}
```

> Der Endpoint gibt **keine** mandanten-/personenbezogenen Daten, keine Secrets, keine Stacktraces preis (Security-Disziplin). „degraded" ist ein gültiger, kommunizierbarer Zustand (z. B. Read-Only, §6.3).

### 3.3 Lokaler Health-Check (✅ heute gültig)

Vor jedem Push/Release und zur schnellen Diagnose — ausgeführt im Verzeichnis `app/`:

```bash
# Typecheck + Build (Gate vor jedem Deploy)
npm run build            # tsc --noEmit && vite build

# Nur Typecheck (schnell)
npm run typecheck        # tsc --noEmit

# Build lokal vorschauen (Prod-Bundle gegen 4173)
npm run preview

# Dev-Server (Port 5409, vgl. app/vite.config.ts)
npm run dev

# Supply-Chain
npm audit --omit=dev     # Ziel: 0 High/Critical
```

**Manuelle Verdrahtungs-Probe (UI):** Finder lädt echte/Seed-Höfe → Detail öffnet → Reservierung absendbar → Konsole sauber (keine `TypeError`, keine 401-Schleifen). Header zeigt korrekt „Seed-Daten" bzw. „Live-Daten" je nach `VITE_SUPABASE_*`.

### 3.4 Performance-Budget (Richtwerte — Alarm bei Verletzung)

Quelle: `docs/ENTERPRISE_ARCHITECTURE.md` §4.3.

| Pfad | p95-Ziel |
|---|---|
| Landing LCP (4G) | < 2,5 s |
| Finder-Erstanzeige (warmer Edge-Cache) | < 1,5 s |
| API-Read (gecacht / DB) | < 300 ms / < 800 ms |
| Reservierung / SB-Zahlung-Roundtrip | < 1,2 s |

Anhaltende Verletzung → §5 Skalierung (Cache, Replica, Compute) bzw. §7 On-Call.

### 3.5 Zahlungs-Health & Reconciliation (⬜ ab Stripe-Anbindung)

- **Webhook-Health täglich (D3):** keine offenen fehlgeschlagenen Events im Stripe-Dashboard. Fehlschläge → Edge-Function-Logs prüfen; Stripe-Replay nutzen (Idempotenz macht Replay folgenlos).
- **Idempotenz-Invariante:** Doppelzustellung = no-op (Dedup über Stripe-Event-ID, Unique-Constraint). Ein Doppel-Entitlement/eine Doppelbuchung ist ein **Bug**, kein Betriebszustand → eskalieren.
- **Reconciliation wöchentlich (W4):** Stripe-Events ↔ DB-Entitlements/`sb_payments` abgleichen. Differenz = Untersuchung (verlorenes Event? fehlende Verarbeitung?). Entitlements sind **immer** serverseitig aus dem Webhook abgeleitet, nie aus Client-State.
- **Connect-Payout-Status ⬜:** Erzeuger-Auszahlungen (Destination/Direct Charge) im Connect-Dashboard auf „enabled" prüfen; blockierte Payouts an Staff/Erzeuger eskalieren.

---

## 4 · Deploy & Rollback

> **Owner-Freigabe-Pflicht:** Jeder Prod-Deploy und jeder Prod-Rollback wird **vorab in Klartext angekündigt** (was, warum, Risiko, Rollback-Plan) und erst nach OK ausgeführt (`CLAUDE.md` Stop-Regeln). Detail-Mechanik: `docs/DEPLOYMENT.md`.

### 4.1 Release-Bausteine

| Artefakt | Quelle | Ziel | Deploy-Weg |
|---|---|---|---|
| Statische Landing | `web/` | Cloudflare Pages | Pages-Build aus Repo |
| React-App | `app/` (Vite-Build → `app/dist/`) | Cloudflare Pages | Pages-Build aus Repo |
| Edge Functions ⬜ | `app/supabase/functions/*` | Supabase | `supabase functions deploy <name>` |
| DB-Migration | `app/supabase/migrations/*.sql` | Supabase Postgres | `supabase db push` (additiv) |
| Secrets | Cloudflare/Supabase Secret-Store | Edge/Build-Env | Dashboard/CLI, nie im Repo |

### 4.2 Pre-Deploy-Checkliste (Release-Gate — alle Punkte grün)

- [ ] `npm run build` grün (Typecheck + Vite-Build), keine TS-Fehler.
- [ ] Gezielte Tests auf geänderten Pfaden grün (nicht blind „alle"); bei DB/RLS: **Cross-Org-Negativtests** grün (blockierendes Isolations-Gate).
- [ ] `npm audit --omit=dev` ohne High/Critical.
- [ ] **Release-Artefakt secret-frei:** Grep auf `service_role`, `sk_`, Secret-Namen im Build-Output → 0 Treffer. `.env*` und `.claude/` **nicht** im Artefakt.
- [ ] Security-Header/CSP/HSTS als Code aktuell (`app/public/_headers` / Worker).
- [ ] Migration (falls vorhanden) ist **additiv** + hat **dokumentierten Rollback-Pfad**; Isolationstest deckt neue Objekte.
- [ ] Feature-Flag-Plan für riskante Pfade festgelegt (Sofort-Abschaltung ohne Redeploy).
- [ ] Version/Release-Tag gesetzt (Health-Endpoint + Sentry-Release-Tagging).
- [ ] **Owner-Freigabe eingeholt** (Prod).

### 4.3 Deploy-Reihenfolge (Vorwärts)

Reihenfolge ist bewusst gewählt, damit jede Stufe rückwärtskompatibel zur vorherigen ist:

1. **DB-Migration zuerst (additiv).** Neue Spalten/Tabellen/Policies, die der alte Code ignoriert. Niemals destruktiv in-place — kein `DROP`/`RENAME`, der den laufenden Code bricht.
2. **Edge Functions** (neue Version, abwärtskompatibel zur DB). Webhook-Idempotenz bleibt gewahrt.
3. **Frontend (Pages)** zuletzt — es darf das neue Schema/die neuen Functions erwarten, weil diese bereits live sind.
4. **Verifikation (Post-Deploy, §4.5)** bevor der Deploy als „fertig" gilt.

> **Expand/Contract für Schema-Änderungen:** Erst **expand** (additiv ausrollen, alter + neuer Code lauffähig), dann Code migrieren, dann in einem **späteren** Release **contract** (Altes entfernen) — nie expand+contract im selben Schritt. So bleibt jeder Zwischenzustand rollback-fähig.

### 4.4 Rollback-Strategie

| Schicht | Rollback-Mechanik | RTO-Erwartung |
|---|---|---|
| **Frontend (Pages)** | Cloudflare Pages: vorheriges Deployment „Rollback"/Re-Publish (Deploy-Historie) | Minuten |
| **Edge Functions** | Re-Deploy der letzten guten Function-Version (Supabase Deploy-Historie); betroffenen Pfad per **Feature-Flag** sofort deaktivieren | Minuten |
| **DB-Migration (additiv)** | Vorwärts ausgerollte additive Objekte sind i. d. R. **inert** für alten Code → Frontend/Function-Rollback genügt oft, das Schema bleibt | Minuten |
| **DB-Migration (fehlerhaft/datenwirksam)** | Dokumentierter **Rollback-Pfad** der Migration; bei Datenkorruption **PITR** (Owner-Freigabe, irreversibel) → `docs/BACKUP_DISASTER_RECOVERY.md` | bis ~1 h (RTO-Ziel) |
| **Secrets/Config** | Vorherigen Wert aus Secret-Store wiederherstellen; bei Kompromittierung stattdessen rotieren (kein Roll-back auf altes Secret) | Minuten |

**Rollback-Entscheidung (Faustregel):** Bricht der Kernpfad (Finder → Reservierung / SB-Zahlung) oder feuern 5xx/Webhook-Fehler über Schwelle → **zuerst Feature-Flag/Frontend-Rollback** (schnellste Wirkung), **dann** Ursache analysieren. „Fix-forward" nur, wenn der Fix nachweislich kleiner/sicherer ist als der Rollback.

### 4.5 Post-Deploy-Verifikation (Deploy gilt erst danach als fertig)

- [ ] Health-Endpoint `ok`, Version = erwarteter Release-Tag.
- [ ] Synthetic-Kernpfad grün (Finder → Detail → Reservierung).
- [ ] 5xx-Rate & p95 im Budget (§3.4); kein Fehler-Spike in Sentry.
- [ ] Bei Zahlungsänderung: Test-Webhook verarbeitet, Idempotenz greift (§3.5).
- [ ] Header/CSP/HSTS im Live-Response gesetzt (Header-Scan).
- [ ] `audit_log` schreibt weiterhin kritische Mutationen.
- [ ] Abschlussnotiz: `docs/releases/PHASE_STATUS.md` aktualisiert.

### 4.6 Standalone/Seed-Betrieb (✅ heute)

Vor Supabase/Cloudflare-Live ist „Deploy" = lokaler Build + Vorschau; es existiert kein Prod-Endpunkt. Das standalone-first-Datenlayer (`app/src/lib/data.ts`) macht die UI quellenunabhängig: ohne `VITE_SUPABASE_*` läuft sie auf Seed (`app/src/lib/seed.ts`), mit gesetzten Keys gegen Postgres (RLS aktiv). **Vor dem ersten Live-Schreibpfad** wird der Seed-/`localStorage`-Fallback für Reservierungen abgeschaltet (SEC-06 in `docs/security/SECURITY_OVERVIEW.md`), damit Schreibfehler nicht still maskiert werden.

---

## 5 · Skalierung

Leitsatz: **Skalierung = Konfiguration, kein Re-Architecting** (`docs/ENTERPRISE_ARCHITECTURE.md` §3). Last ist **lesedominiert** (Finder/Verfügbarkeit) mit punktuellen Schreib-Spitzen (Reservierung/SB-Zahlung zu Markt-/Abholzeiten). Dieses Runbook beschreibt die **operativen Auslöser und Handgriffe** je Stufe; die Architektur-Begründung steht in der Enterprise-Architektur.

### 5.1 Skalierungsstufen & operative Auslöser

| Stufe | Maßgröße | Operativer Auslöser (Alarm) | Handgriff | Owner-Freigabe? |
|---|---|---|---|---|
| **10 Höfe** (Gate 10) | erste zahlende Erzeuger | — (Korrektheit > Durchsatz) | Indizes ab Migration #1 vorhanden; Cache für statische Assets | nein |
| **300 Höfe** | regionale Durchdringung | p95-Read steigt, DB-CPU > ~70 %, Egress-Trend hoch | Edge-Read-Cache ausbauen (stale-while-revalidate), **Read-Replica** aktivieren, Pagination/Keyset prüfen, materialisierte Aggregate | **ja** (Tier/Replica = Kosten) |
| **3000 Höfe** | überregional | Replica-Last, Connection-Sättigung, Partition-Wartungsdruck | Connection-Pooling (Supavisor, Transaction-Mode), mehrere Replicas + Region-Routing, **Partitionierung** (`audit_log`/`reservations`/`sb_payments`), Cache-Tag-Invalidierung je `org_id`/Region | **ja** |

### 5.2 Lese-Skalierung (erster, billigster Hebel)

- **Edge-Read-Cache** (Cloudflare Worker + Cache API/KV) für quasi-statische Finder-/Saison-/Kategorie-Daten, **kurze TTL + stale-while-revalidate**. Senkt Origin-Requests, DB-Compute **und** Egress gleichzeitig — der wirtschaftlich stärkste Hebel (§ Kosten).
- **Cache-Sicherheit (nicht verhandelbar):** Mandanten-/personenbezogene Antworten werden **nie** am Edge gecacht (`private, no-store`). Cache-Key enthält die Sicht-Dimension (Region/PLZ/Filter), damit kein Fremddaten-Leck entsteht (`docs/ENTERPRISE_ARCHITECTURE.md` §4.2).
- **Read-Replica** für schwere Read-Last (Finder, Berichte); Schreibpfad bleibt **Primary**. Reporting nie auf dem Primary.

### 5.3 Schreib-Skalierung

- Reservierung/SB-Zahlung über Edge Functions mit **kurzer** Transaktion; Bestands-Dekrement **atomar** (kein Überreservieren).
- Schwere/asynchrone Effekte (E-Mail, Quittungs-PDF, Benachrichtigungen) **aus dem Request-Pfad entkoppeln** (Queue/Background) — Request-Latenz bleibt konstant.

### 5.4 Lastspitzen (Markttag / Saison-Peak — ereignisgetrieben)

1. **Vorab (planbar):** Cache-TTL für öffentliche Finder-Sichten temporär anheben; Compute-Headroom prüfen; On-Call schärfen (§7).
2. **Während:** Edge-Cache + Replica absorbieren die Lesespitze; async-Effekte stauen, blockieren aber nicht.
3. **Bei Sättigung:** Compute kurzfristig hochskalieren (**Owner-Freigabe** bei Tier-Wechsel).
4. **Noisy-Neighbor-Schutz:** Rate-Limits **pro `org_id`** und pro Käufer-IP, damit ein Mandant/Bot die Plattform nicht ausbremst.

### 5.5 Kosten-Wachsamkeit beim Skalieren

- **Kosten-Anomalie ist ein Alarm, kein Monatsend-Schock** (`docs/ENTERPRISE_ARCHITECTURE.md` §5.4). Egress-/Invocation-Spike → Ursache eingrenzen (Cache-Miss-Welle, Scraper, Loop), Cache/WAF nachziehen.
- **Jeder Tier-Wechsel ist eine Owner-Entscheidung** (Supabase-Compute, Cloudflare Business, Replica). Vorab Klartext-Ankündigung mit erwartetem Kostendelta.
- Spar-Hebel in Reihenfolge der Wirkung: Edge-Read-Cache → materialisierte Aggregate → Bilder über CDN → Soft-Delete/Archiv-Partitionen (heißer Datensatz klein halten).

### 5.6 Skalierungs-Invarianten (gelten auf jeder Stufe)

RLS deny-by-default · `org_id` in jeder fachlichen Query · Webhook-Idempotenz · Reads cachebar/Writes auditiert · keine N+1 / keine `offset`-Tiefpaginierung · Async-Entkopplung schwerer Effekte. **Anti-Pattern (verboten):** „läuft bei 10, optimieren wir bei 300" — Indizes, RLS, Idempotenz, Pagination-Muster und Audit existieren **ab Tag 1**.

---

## 6 · Betriebszustände & Degradation

Die Plattform hat definierte Betriebszustände. On-Call wählt bewusst den niedrigst-möglichen Eingriff, der den Betrieb sichert.

### 6.1 Zustände

| Zustand | Bedeutung | Käufer-Erlebnis | Auslöser |
|---|---|---|---|
| **Voll** | alle Schichten gesund | alles funktioniert | Normalbetrieb |
| **Read-Only-Degradation** | Schreibpfad gestört (Edge-Function/DB-Write) | Finder/Verfügbarkeit/Saison **lesbar** aus Cache; Reservierung meldet ehrlich „aktuell nicht verfügbar" (kein 500) | DB-Write-Fehler, Function-Down |
| **Cache-Only** | Origin nicht erreichbar | gecachte öffentliche Sichten bleiben; personalisierte Bereiche melden Nicht-Verfügbarkeit | Supabase-Ausfall |
| **Wartungsmodus** | geplanter Eingriff | statische Wartungsseite (Pages) | geplante Migration/Restore |

> Zero-State-Disziplin (Pfeiler 2): In **jedem** degradierten Zustand zeigt die UI eine ehrliche, nicht-leakende Meldung — niemals einen rohen 500/Stacktrace.

### 6.2 Wartungsmodus (geplanter Eingriff)

1. Owner-Freigabe + Zeitfenster (lastarm wählen, vgl. §5.4).
2. Statische Wartungsseite (Cloudflare Pages) aktivieren — öffentliche Reads bleiben wo möglich aus Cache lesbar.
3. Eingriff durchführen (Migration/Restore/Function-Deploy).
4. Verifikation (§4.5) → Wartungsmodus deaktivieren.
5. Abschlussnotiz + Audit.

### 6.3 Häufige Störbilder & Sofortwirkung (Schnellreferenz)

> Tiefe Schritt-für-Schritt-Reaktion: `docs/INCIDENT_RUNBOOK.md`. Hier nur die **operative Erstreaktion**.

| Störbild | Erkennung | Sofortwirkung (Architektur) | Erstreaktion |
|---|---|---|---|
| DB nicht erreichbar / Read-Spike | Health, Sentry, p95-Alarm | Edge-Cache hält öffentliche Reads | Provider-Status prüfen; ggf. Wartungsmodus; nach Recovery Cache-Revalidierung |
| Edge-Function down / Deploy-Regression | Function-Error-Rate, Webhook-Fehler | Lese-UI über PostgREST/Cache stabil | Function-Rollback (§4.4) + Feature-Flag auf betroffenen Pfad |
| Stripe-Webhook-Doppel/-Verlust | Idempotenz-Logs, Reconciliation | Idempotenter Handler ⇒ Doppel = no-op | bei Verlust: Stripe-Replay; W4-Reconciliation |
| Cloudflare-Edge-Störung (Region) | Synthetic, Statusseite | Anycast routet auf gesunde PoPs | abwarten/eskalieren; Provider-Status |
| DDoS / Bot-Flut / Scraping | WAF-Metriken, Rate-Limit-Quote | WAF + Rate-Limit + Turnstile blocken am Edge | WAF verschärfen; „Under Attack"-Modus; Origin bleibt geschützt |
| **Verdacht Mandanten-Leck** | Isolations-Regression, Audit-Review | RLS ist erste Verteidigung; Pfad per Flag sperrbar | **Security-Incident** (§7.4): Policy fixen, Isolationstest erweitern, Forensik, Owner-Meldung, DSGVO-Prüfung |
| **Secret-Leak** | Secret-Scan, Log-Review | Frontend hat nur anon-Key (RLS) → begrenzter Blast-Radius | **Rotation** (`docs/security/SECRET_ROTATION.md`); Key invalidieren; Audit auf Missbrauch; Owner-Meldung |
| Kosten-Anomalie | Usage-Alarm | kein Funktionsausfall | Ursache eingrenzen + beheben; Cache/WAF nachziehen (§5.5) |

---

## 7 · On-Call & Eskalation

### 7.1 On-Call-Auftrag

On-Call sichert die **Verfügbarkeit des Kernpfads** (Finder → Reservierung → SB-Zahlung) und die **Integrität der Mandantentrennung**. On-Call diagnostiziert, wählt den niedrigst-möglichen sichernden Eingriff (Feature-Flag/Rollback vor Tieffix) und eskaliert sauber. On-Call **entscheidet nicht** über Kosten-/irreversible Schritte — das ist Owner.

### 7.2 Schweregrade (Severity)

| Sev | Definition | Beispiel | Reaktionsziel | Owner sofort? |
|---|---|---|---|---|
| **SEV-1 Kritisch** | Plattform unbenutzbar **oder** Datensicherheit/-isolation verletzt | Kernpfad down; **Mandanten-Leck**; Secret-Leak; Datenkorruption | sofort | **ja** |
| **SEV-2 Hoch** | Wesentliche Funktion gestört, kein Totalausfall | Schreibpfad/Reservierung down (Read-Only-Degradation); Webhook-Verarbeitung fehlerhaft | < 1 h | bei Wirkung/Kosten |
| **SEV-3 Mittel** | Teilstörung mit Workaround/Degradation | erhöhte Latenz, einzelne Function instabil, Cache-Miss-Welle | im Tagesverlauf | nein (informieren) |
| **SEV-4 Niedrig** | kosmetisch / kein Nutzerimpact | UI-Detail, nicht-blockierender Log-Noise | nächster Arbeitszyklus | nein |

> **Sicherheits-Override:** Jeder begründete Verdacht auf **Mandanten-Leck** oder **Secret-Leak** ist mindestens **SEV-1**, unabhängig vom sichtbaren Nutzerimpact — Owner sofort, DSGVO-Meldepflicht prüfen.

### 7.3 On-Call-Ablauf (für jeden Alarm)

1. **Bestätigen & einordnen.** Alarm gesehen; Severity (§7.2) bestimmen. Echtes Problem oder Zero-State-Fehlalarm (leer ≠ kaputt)?
2. **Provider zuerst ausschließen.** Cloudflare/Supabase/Stripe-Statusseite — „liegt's an uns oder am Provider?"
3. **Blast-Radius eingrenzen.** Welche Welt (Käufer/Erzeuger/Staff)? Welche `org`/Region? Alle oder einzelne?
4. **Sichern vor Reparieren.** Niedrigst-möglicher Eingriff: Feature-Flag deaktivieren → Frontend/Function-Rollback (§4.4) → Wartungsmodus (§6.2). Kernpfad-Verfügbarkeit vor Eleganz.
5. **Eskalieren wenn nötig** (§7.4): SEV-1 immer Owner; kosten-/irreversible Schritte (Tier-Wechsel, **PITR-Restore**) nur mit Owner-Freigabe.
6. **Auditieren.** Eingriff in `audit_log` / Incident-Notiz: wer/was/warum/wann/Ergebnis.
7. **Verifizieren.** Health grün, Kernpfad grün, kein Fehler-Spike (§4.5).
8. **Nachbereiten.** Bei SEV-1/SEV-2: kurzes Post-Mortem (Ursache, Wirkung, Fix, Prävention) → Lehre in `.claude/learning/insights_inbox.md`; Folgeaufgabe verankern.

### 7.4 Eskalationspfad

```
Alarm / Meldung
   │
   ▼
On-Call (Claude/Engineering): bestätigen → einordnen → sichern
   │
   ├─ SEV-3/4, reversibel, kein Kostenimpact ──▶ selbst beheben + auditieren + Tracker
   │
   ├─ SEV-2: wesentliche Störung ──────────────▶ sichern (Flag/Rollback) → Owner informieren
   │                                              (Freigabe bei Kosten/irreversibel)
   │
   └─ SEV-1: Kernpfad down / Sicherheits-/Datenvorfall
                │
                ▼
            OWNER sofort (Entscheidungsinstanz)
                │
                ├─ Security-/Isolations-Vorfall ▶ security-auditor: Policy-Fix, Isolationstest
                │                                  erweitern, Forensik, DSGVO-Meldepflicht prüfen
                ├─ Zahlung/Connect/Disput ──────▶ payment-engineer: Webhook/Idempotenz/Reconciliation
                ├─ Daten korrumpiert/verloren ──▶ PITR-Restore (NUR mit Owner-Freigabe)
                │                                  → docs/BACKUP_DISASTER_RECOVERY.md
                └─ Provider-Großstörung ────────▶ Degradationsstufe wählen (§6) + Status kommunizieren
```

**Fachliche Eskalation (kein technischer Ausfall):** Hof-Verifizierungs-Streit, missbräuchliche Inhalte, Käufer-/Erzeuger-Beschwerde → **Staff/Support-Center** (Kern), nicht On-Call-Engineering. On-Call zieht Staff hinzu, wenn ein technischer Vorfall fachliche Wirkung hat (z. B. fehlerhafte Reservierungen).

### 7.5 Kommunikation im Vorfall

- **Intern:** Severity, Blast-Radius, aktueller Zustand (§6.1), ergriffene Maßnahme, nächster Schritt — knapp und faktenbasiert. **Keine Secrets, keine unmaskierte Käufer-PII** in Vorfall-Kanälen/Logs.
- **Extern (Käufer/Erzeuger):** ehrliche, nicht-leakende Statusmeldung (Wartungsseite/Zero-State-Text). Kein Stacktrace, keine Schuldzuweisung, kein internes Detail.
- **Owner:** bei SEV-1/SEV-2 proaktiv; bei kosten-/irreversiblen Schritten **vor** der Ausführung.

---

## 8 · Betriebs-Sicherheit & Compliance (Operations-Sicht)

- **Least-Privilege im Betrieb:** Diagnose mit der **niedrigst** ausreichenden Rolle. service-role-Zugriff nur in Edge Functions, nie ad hoc im Browser/Client (`docs/security/SECURITY_OVERVIEW.md` §9).
- **Audit ist unabschaltbar:** Jeder Betriebseingriff mit Daten-/Entitlement-/Verfügbarkeitswirkung wird auditiert (reason-Pflicht bei kritischen Aktionen).
- **DSGVO im Betrieb:** EU-Hosting (Supabase EU/Cloudflare EU). Vorfälle mit Personenbezug (Leck-Verdacht) → Meldepflicht prüfen, Owner sofort (`docs/COMPLIANCE_MODEL.md`). Lösch-/Auskunftsbegehren laufen über den dokumentierten Prozess, nicht über Ad-hoc-DB-Eingriffe.
- **Vermittler-Disziplin:** Betriebseingriffe ändern nie eigenmächtig Hof-Bestand/-Preise (Domain owns truth). Korrekturen am Hof-Datenbestand sind Self-Service des Erzeugers bzw. explizit auditierte Staff-Aktion.
- **Backups/Restore:** managed Backups + PITR; Restore-Drills monatlich (M1); produktiver Restore nur mit Owner-Freigabe (`docs/BACKUP_DISASTER_RECOVERY.md`).

---

## 9 · Schnellreferenz (Cheat-Sheet)

```text
LOKAL (app/, ✅ heute)
  npm run dev        # Dev-Server, Port 5409
  npm run build      # tsc --noEmit && vite build  (Pre-Deploy-Gate)
  npm run typecheck  # nur Typecheck
  npm run preview    # Prod-Bundle lokal
  npm audit --omit=dev   # Supply-Chain (0 High/Critical)

DEPLOY-REIHENFOLGE (Prod, nach Owner-OK)
  1) DB-Migration (additiv, +Rollback)  2) Edge Functions  3) Frontend (Pages)  4) Verifizieren

ROLLBACK (schnellster Hebel zuerst)
  Feature-Flag aus → Frontend/Function-Rollback → (Daten) PITR mit Owner-Freigabe

HEALTH (was zuerst?)
  Provider-Status → Health-Endpoint → Sentry/Analytics (5xx, p95) → Stripe-Webhooks → audit_log

SEVERITY
  SEV-1 Kernpfad down / Leck / Secret-Leak → Owner SOFORT
  SEV-2 wesentliche Störung → sichern, Owner informieren
  SEV-3/4 → selbst beheben + auditieren

NIE OHNE OWNER-FREIGABE
  Prod-Deploy · Tier-Wechsel/Replica (Kosten) · PITR-Restore · Prod-Secret-Rotation · Account/Domain · öffentliches SLA
```

---

## 10 · Pflege dieses Runbooks

- **Lebendiges Dokument.** Relevante Betriebs-/Architekturänderung ⇒ hier aktualisieren **und** `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` (+ bei Tragweite ADR). Widerlegte Annahme wird **korrigiert, nicht dupliziert** (`AGENTS.md` Lern-Loop).
- **Reifegrad ehrlich halten.** ⬜→🔨→✅ wandern mit, sobald eine Komponente live geht (Supabase/Cloudflare/Stripe). Kein „so tun als ob".
- **Verknüpfte Soll-Dokumente** (MASTER_INDEX §5): `docs/DEPLOYMENT.md`, `docs/BACKUP_DISASTER_RECOVERY.md`, `docs/INCIDENT_RUNBOOK.md`, `docs/MONITORING.md` / `docs/OBSERVABILITY.md` — dieses Runbook verweist auf sie und überschneidet sich bewusst nicht.

---

*Letzte Aktualisierung: Phase 1 · WAVE_13-Vorlauf (Observability/Ops) · 2026-06-19*
*Zuständig: Betrieb/Engineering (Claude) · Freigabe operativer Live-Schritte: Owner*
*Querverweise: `docs/ENTERPRISE_ARCHITECTURE.md` · `docs/security/SECURITY_OVERVIEW.md` · `docs/security/SECRET_ROTATION.md` · `docs/COMPLIANCE_MODEL.md` · `docs/releases/PHASE_STATUS.md` · `PHASEN.md` · `MASTER_INDEX.md` · `docs/adr/0001…`, `0002…`*
