# MASTERPROMPT — Phase 2 (Release-operativ) · LokaleBauernConnect

> **Zweck:** Diesen Prompt zu Beginn einer **Phase-2-Session** in Claude Code einfügen. Er aktiviert die Release-Schicht (Cloudflare-Deploy, Gates A–F, Burn-in) **zusätzlich** zu den Phase-1-Regeln und gibt das verbindliche Arbeitsprinzip vor.
>
> **Geltung:** Phase 2 aus `PHASEN.md` (Release-operativ). **Eine Welle pro Session.** Phase-1-Regeln bleiben aktiv; Phase 2 ergänzt sie, hebt sie nie auf.
> **Konflikt-Hierarchie:** User-Anweisung > `~/AGENTS.md` (global) > `AGENTS.md` (Projekt) > Subagent/Skill > `CLAUDE.md` > `finalization/00_RULES.md` > diese Datei.
> **Stack fix (Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.**
> **Rolle = VERMITTLER:** kein Eigenverkauf, keine Beratung. Vermittler-Disclaimer durchgängig sichtbar (Finder, Detail, Reservierung, Checkout, SB-Bezahlung).

---

## Was Phase 2 ist — und was sie NICHT ist

**Phase 1** macht das Produkt *fertig* (Fundament + Kernprodukt, Wellen 00–15, Phase-1-Go-Live-Gate in `finalization/99_GOLIVE_GATE.md`).
**Phase 2** macht es *live*: aus einem fertigen Repo wird ein **releasefähiges, gehärtetes, deploybares Artefakt auf Cloudflare** — mit beweisbaren Gates A–F und einem stabilen Burn-in ≥ 7 Tagen.

Phase 2 ist **kein** Feature-Bau. Neue Spezial-Strecken (SB-Bezahl-USP, Karte, Saison-Alerts) gehören in **Phase 4 (Tracks A–E)**. Wer in Phase 2 ein fehlendes Feature entdeckt: dokumentieren, soft-locken oder ehrlich als „Bald verfügbar" markieren — **nicht hier nachbauen** (Stop-Regel + Owner einbeziehen).

> **Vollständige Releasefähigkeit heißt NICHT**, dass `.env`, `node_modules`, Secrets, `.git`, `.claude/`, `dist/` oder lokale Artefakte im Release enthalten sind. Diese Dinge müssen **ausgeschlossen** werden — sie sind keine fehlenden Bestandteile, sondern **Release-Blocker** (Hygiene = WAVE_01).

---

## Pflicht-Lesereihenfolge (VOR dem ersten Edit der Session)

Gezielt lesen (Ranges/Diffs statt Volldateien), unabhängige Reads bündeln — §0 Token-Effizienz.

```text
1. ~/AGENTS.md (global) + ~/CLAUDE.md (§0-Direktive, gilt immer)
2. AGENTS.md (Projekt) + .claude/agents/* (Subagenten-Roster)
3. CLAUDE.md (Projekt — 7 Produktionspfeiler, Stop-Regeln, Verbote)
4. PHASEN.md (Abschnitt „Phase 2 — Release-operativ" + Marktstart-Pflicht-Set)
5. MASTER_INDEX.md (Abschnitt 7 — Finalisierung & Releases)
6. finalization/00_RULES.md  (nicht-verhandelbares Regelwerk aller Wellen)
7. finalization/01_PRIORITIES.md  (P0–P3-Definition — Reihenfolge der Arbeit)
8. finalization/99_GOLIVE_GATE.md  (Phase-1-Gate A–H — der Eingangs-Vertrag von Phase 2)
9. finalization/phase2_release/WAVES.md  (alle Release-Wellen dieser Phase)   ← falls vorhanden
10. finalization/phase2_release/GATES.md  (Gates A–F: Abnahmekriterien + Nachweise)  ← falls vorhanden
11. .claude/CLAUDE_RECS.md + relevantes .claude/memory/ (INDEX + decisions/learnings/patterns)
12. docs/releases/PHASE_STATUS.md  (was bereits grün ist — kein Doppelbau)
```

> **Repo-Genauigkeit (Pflicht):** Existiert eine der Dateien 9–10 noch nicht, ist die **erste Aufgabe** der Phase-2-Session, sie kanonisch anzulegen (Quelle: `MASTER_INDEX.md` Abschnitt 7, adaptiert aus dem TempConnect-Release-Set, auf den fixen Stack überschrieben). **Niemals** auf eine nicht-existente Datei verweisen oder Inhalte erfinden — erst per Glob/Grep verifizieren, dann referenzieren.

---

## Ziel der Phase-2-Session (Auftrag)

> **Bringe LokaleBauernConnect von „fertig gebaut" zu „releasefähig auf Cloudflare" — Welle für Welle, mit beweisbaren Gates A–F und einem stabilen Burn-in. Keine kosmetische Fertigmeldung. Beweis oder kein PASS.**

Konkret in dieser Phase:

1. **Release-Hygiene 10/10** — Artefakt enthält *alles Notwendige* und *nichts Gefährliches/Lokales/Generierbares*. Kein `.env`, `.git`, `node_modules`, `.claude/`, `dist/`, kein Service-Role-Key, kein Stripe-Secret im Bundle.
2. **Reproduzierbarer Cloudflare-Pages-Build** — `web/` (Editorial-Landing) **und** `app/` (React-App, `npm run build` = `tsc --noEmit && vite build`, grün, ohne Typfehler). Build-Output deterministisch, keine geheimen Build-Args.
3. **Security-Header & Edge-Härtung** — CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; Turnstile auf allen öffentlichen Formularen (Reservierung, Onboarding, Kontakt); WAF/Rate-Limits auf Login, Reservierung, Onboarding-Invite, Checkout/Zahlungs-Flows.
4. **Beweisbare Tenant-Isolation** — RLS deny-by-default; Cross-Org-Negativtest über **alle** Tabellen der Migrationen `0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`. Fremde Org = **403/leer**, nie 200 mit Fremddaten. **Kein GO ohne grünen Isolationstest.**
5. **Gates A–F grün + Nachweise** — jeder Gate-Status mit ausgeführtem Befehl/Output, Testlauf oder dokumentiertem manuellem Prüfschritt (Owner + Datum).
6. **Burn-in ≥ 7 Tage stabil** — Preprod-Betrieb beobachtet; P0/P1-Incidents dokumentiert (siehe Notfall-Prompt); Burn-in-Timer wird bei Incident **nicht stillschweigend zurückgesetzt**, sondern bewertet.
7. **Go-Live-Entscheidungen als Dokumente** — `docs/releases/PHASE2_GO_LIVE_DECISION.md` + `docs/releases/MANUAL_TASKS_CHECKLIST.md` (Owner-Aufgaben: Domain, DNS, Secrets, Rechtstexte, Stripe-Live-Keys).

---

## Gates A–F (Phase 2) — Abnahme-Raster

> Detail-Kriterien + Nachweisformate stehen in `finalization/phase2_release/GATES.md`. Hier die verbindliche Bedeutung. Ein Gate ist **grün**, wenn jeder Punkt mit Befehl/Output, Testlauf oder Owner-bestätigtem manuellem Schritt belegt ist — nicht „sieht gut aus".

| Gate | Bedeutung | Pflicht-Nachweis (Beispiele) |
|---|---|---|
| **A — Technical / Build** | App + Landing bauen reproduzierbar grün | `npm run build` grün (tsc strict + vite); Cloudflare-Pages-Build reproduzierbar; keine offenen Konsolenfehler |
| **B — Security** | Keine Secrets im Artefakt; Header/CSP/HSTS; Turnstile; Zod an Edge-Grenzen; Webhook-Signatur | Hygiene-Scan grün; CSP-/Header-Check; Turnstile auf Public-Formularen; `service role` nur in Edge Functions |
| **C — Tenant-Isolation** | RLS deny-by-default über alle Migrationstabellen | Cross-Org-Negativtest grün (fremde Org = 403/leer); Plattform-Isolation des Public-Katalogs bewusst |
| **D — Product / UX-Wahrheit** | Kein totes Feature kaufbar; Zero-State überall; Vermittler-Disclaimer durchgängig | Kernflow Finder→Detail→Verfügbarkeit→Reservierung E2E mit echten Daten; Empty States; „Bald verfügbar" eindeutig |
| **E — Operations** | Deploy-Pfad, Monitoring, Backup/Restore, Incident-Prozess | Cloudflare-Deploy reproduzierbar; Sentry/strukturierte Logs; Supabase-Restore mind. 1× getestet; `docs/INCIDENT_RUNBOOK.md` |
| **F — Commercial / Legal** | Geldfluss steht; ein kanonisches Planmodell; Rechtstexte verlinkt | Stripe-Webhook idempotent (`supabase/functions/stripe-webhook`); Pläne `demo/basis/plus/pro/individuell` konsistent; Impressum/Datenschutz/AGB/Lebensmittel-Hinweis/AVV verlinkt |

**GO darf nur vergeben werden, wenn A–F grün sind UND der Burn-in ≥ 7 Tage stabil war.** Ist ein Punkt offen → **Phase 2 = NO GO**.

---

## Leitplanken (nicht-verhandelbar — gelten in jeder Phase-2-Welle)

- **Beweis statt Behauptung.** Kein Feature/keine Welle gilt als fertig ohne Build/Test/Audit/Doku/Abnahmebeweis. „Alle Tests grün" ohne Ausführungs-Output ist kein PASS.
- **P0 vor P1 vor P2 vor P3** (`01_PRIORITIES.md`). Keine Politur, solange ein Launch-Blocker offen ist (Tenant-Leck, gebrochener Kernflow, Payment-Risiko, fehlende RLS, Secret im Artefakt).
- **Triage zuerst** (`00_RULES.md` Abschnitt 2): Bug ≠ Rollen-/Sichtbarkeitslogik ≠ Tenant-Isolation ≠ Commercial ≠ Security ≠ Core-Flow ≠ QA ≠ UX. Jede Kategorie = anderer Fix + andere Tests.
- **Server-Guards vor UI-Kosmetik.** Zugriffskontrolle gehört in DB (RLS, deny-by-default) + Edge Function (Rechteprüfung). React ≠ Sicherheit. UI-Ausblendung ist nie Schutz.
- **`service role` nur in Edge Functions.** Frontend ausschließlich `VITE_`-Public-Keys (Anon Key). Niemals Service-Role-Key, DB-Connection-String oder Stripe-Secret im Client-Bundle oder Log.
- **Stripe-Webhook = EINE Wahrheit:** ein signaturgeprüfter, **idempotenter** Handler (`supabase/functions/stripe-webhook`) setzt Entitlements/Zahlungsstatus serverseitig. Doppeltes Event → ein Effekt (getestet). Geld fließt via Connect an den Erzeuger (Vermittler-Modell, kein Eigenverkauf).
- **Zero-State statt Error.** Leere Daten ergeben nie einen 500: `{ available: false }` + leere Arrays; UI zeigt Editorial-Leerzustand, keinen Fehlerbalken.
- **Editorial-Disziplin.** Nur Design-System-Tokens (`app/src/styles/theme.css`), keine hardcodierten Farben/Schwellwerte, **keine Deko-Emojis** in Prod-UI. User-Werte vor Ausgabe escapen.
- **Keine Phantomfeatures / toten Pfade.** Jede Strecke ist produktiv verdrahtet, bewusst feature-geflaggt oder ehrlich „Bald verfügbar" — kein TODO, kein toter Button, kein Deep-Link ins Leere.
- **SB-Bezahl-USP:** in Phase 2 entweder **ehrlich produktiv** (Phase 4 Track A + ADR vorausgesetzt) **oder kontrolliert deaktiviert / „Bald verfügbar"** — nie halbfertig kaufbar sichtbar.
- **Keine Commits ohne ausdrückliche Owner-Freigabe.** Bei Freigabe Co-Author-Zeile anhängen. `.claude/`, `.env`, Secrets, Build-Output nie ins Release-Artefakt.
- **VMS-/Self-Host-Begriffe verboten** (Zeitarbeit, Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne (Höfe, Erzeuger, Käufer, Reservierung, Verfügbarkeit, SB-Bezahlung).

---

## Stop-Regeln (anhalten, minimalen sicheren Fix vorschlagen, auf Owner-OK warten)

Phase 2 berührt Deploy, Security-Header, Domain, Secrets und Geldfluss — hier wird **angehalten**, nicht geraten (`CLAUDE.md` Stop-Regeln · `00_RULES.md` Abschnitt 5). Insbesondere:

- **Deploy / Go-Live / Domain / DNS / Account / Kosten / Stripe-Live-Keys** → vorab in Klartext ankündigen, erst auf Owner-OK ausführen (irreversibel/extern).
- Org-/Tenant-Scope serverseitig **nicht** prüfbar (RLS fehlt oder umgehbar) → Stop.
- Turnstile/CSRF/Auth an einer öffentlichen oder mutierenden Strecke unklar → Stop.
- Geldfluss/Export ohne Audit möglich (Reservierung, Stripe, SB-Einnahmen, Connect-Payout, Erstattung) → Stop.
- Secrets in Code/Doku/Release-Artefakt gefunden → Stop, redigieren, Rotation empfehlen, **nicht** committen.
- Eine referenzierte Edge Function / Route / Tabelle / Datei wird **nicht gefunden** (Annahme statt Fakt) → Stop.
- Eine Änderung würde den Stack-Kanon verletzen (Hetzner/Docker-Self-Host/Service-Role-im-Client) oder eine Kern-Funktion neu bauen statt andocken → Stop.

> **Ausnahme zu §0.8 („Durcharbeiten statt Pausieren"):** Stop-Regeln **stechen** das Durcharbeiten. An echten Blockern wird angehalten — Sicherheit/Verifikation werden nie für Tempo geopfert. An *natürlichen* Stopp-Punkten (kein Blocker) wird hingegen weitergearbeitet: nächster wertvoller autonomer Schritt (Härtung, Tests, Doku, Gate-Nachweise).

---

## Arbeitsrhythmus der Session (eine Welle)

1. **Lesen** (Pflicht-Lesereihenfolge oben) → aktuellen Stand aus `docs/releases/PHASE_STATUS.md` ziehen, nicht doppelt bauen.
2. **Triage** der anstehenden Welle/Tickets (Kategorie + Priorität) gemäß `00_RULES.md`.
3. **Sichersten kleinen Slice bauen** — server-seitig abgesichert, end-to-end verdrahtet, Zero-State + Audit, Retrofit-bewusst (Was kann brechen? Feature-Flag? Rollback?).
4. **Verifizieren** (siehe nächster Abschnitt) — ausführen, nicht behaupten.
5. **Gate-Bezug aktualisieren** (welches der Gates A–F adressiert dieser Slice; Status mit Nachweis).
6. **Abschlussbericht** (Format unten) + `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` pflegen; wiederverwendbare Lektion → `.claude/learning/insights_inbox.md`.
7. **Entscheidung:** weiter zur nächsten Welle / stoppen wegen Blocker (mit Kategorie, Priorität, ETA).

---

## Verifikation vor „fertig" (Definition of Done je Welle)

Ausführen, Output zeigen — keine kosmetische Fertigmeldung:

- `npm run build` (tsc strict + vite) **grün** — Auszug zeigen.
- Gezielte Tests auf den **geänderten** Pfaden grün (nicht blind „alle"). **Test-Integrität (§0.9):** Code an Tests anpassen, nie Tests zurechtbiegen, abschwächen, löschen oder still skippen.
- Bei DB/RLS: **Cross-Org-Negativtest** (fremde Org = 403/leer) + Plattform-Isolationstest grün.
- Bei Payment/SB-Bezahlung: Webhook-Signatur + **Idempotenz** + serverseitiges Entitlement getestet (doppeltes Event → ein Effekt).
- Bei UI: Verdrahtungs-Kette belegt (Endpoint → realer Supabase-Fetch → DOM → Lade/Leer/Fehler → gebundener Handler), Konsole sauber (keine `TypeError`/401-Schleifen). Lokaler Dev-Check: `npm run dev` (Port 5409) / `npm run preview` für Build-Vorschau.
- Bei Release-Hygiene: Artefakt-Scan zeigt keine `.env`/`.git`/`node_modules`/`.claude/`/`dist/`/Secrets.
- 7 Produktionspfeiler für die berührte Fläche geprüft; relevante Doku/Tracker aktualisiert.
- **„Fertig" erklärt der Owner**, nicht Claude. Diffs bleiben uncommitted bis Owner-Freigabe.

---

## Abschlussbericht-Format (Pflicht pro Welle)

```text
## Welle abgeschlossen: PHASE2 / WAVE_xx <Name>   (Datum: · Gate-Bezug: A–F)

### Geändert
- <Datei/Migration/Edge Function/Config> — <was + warum>

### Verifikation (ausgeführt, nicht behauptet)
- npm run build (tsc strict + vite):        <grün/rot + Auszug>
- Gezielte Tests (geänderte Pfade):         <Liste + Ergebnis>
- RLS-Isolationstest (Plattform + Cross-Org-Negativ): <Ergebnis>
- Webhook-Idempotenz / Entitlement-Gate (falls Payment/Plan): <Ergebnis>
- Verdrahtungs-Check UI (Endpoint→DOM→Action→Lade/Leer/Fehler): <Ergebnis>
- Release-Hygiene-Scan (keine Secrets/.env/.claude/dist): <Ergebnis>
- Security-Header/CSP/Turnstile (falls berührt):  <Ergebnis>
- Konsole sauber (keine TypeError/401-Schleifen):  <ja/nein>

### Gate-Bezug (Phase 2)
- Adressiertes Gate (A Technical / B Security / C Tenant / D Product / E Operations / F Commercial-Legal): <Status + Nachweis>

### 7 Produktionspfeiler (Selbstcheck)
- Org-Boundary · Zero-State · Scope-Transparenz · RBAC · Audit · Testpflicht · Drilldown-Integrität: <je ✅/offen>

### P0/P1-Status
- Gelöst: · Offen: · Bewusst verschoben (mit Begründung):

### Risiken & manuelle Owner-Aufgaben
- <Risiko + Mitigation + Rollback>
- Manuelle Owner-Tasks → docs/releases/MANUAL_TASKS_CHECKLIST.md (Domain/DNS/Secrets/Stripe-Live/Rechtstexte)

### Doku/Tracker aktualisiert
- docs/releases/PHASE_STATUS.md · MASTER_INDEX.md · ggf. ADR/learning/pattern: <ja/nein>

### Entscheidung
- weiter zu PHASE2 / WAVE_yy  ODER  Stop wegen Blocker (Kategorie/Priorität/ETA)
```

**Verbotene Abschluss-Formate:** reine Dateiliste ohne Fachbeschreibung · „erledigt" ohne Test-Bezug · „alle Tests grün" ohne Ausführungsnachweis · schwammige Risiken („könnte vielleicht…") · Verschweigen von Restfehlern.

---

## Subagenten-Einbindung (Delegationsregeln, `AGENTS.md` / `.claude/agents/*`)

- **Release-Hygiene / Cloudflare Pages-Workers / CI / Header / WAF / Rollback** → `devops` (Isolationstest als blockierendes Gate) + `performance-cost-optimizer`.
- **Tenant-Isolation / RLS / Migrationen** → `db-rls-spezialist`, danach `qa-tester` (kein GO ohne grünen Isolationstest).
- **Security-Header, Secrets, Webhook-Signatur** → `security-auditor` (read-only, meldet) + `edge-functions-spezialist`.
- **Geldfluss / SB-Bezahl-USP** → `payment-engineer` + `edge-functions-spezialist`, danach `security-auditor`.
- **UI-Wahrheit / Editorial / Disclaimer / Copy** → `frontend-design-guardian` + `i18n-content-spezialist`.
- **Rechtstexte / DSGVO / Lebensmittel-Hinweis / Audit-Vollständigkeit** → `compliance-officer`.
- **Architekturfrage** → `architekt`; Ergebnis als ADR in `.claude/memory/decisions/`.

---

## Pro-Welle-Kurzstart (wenn nicht der volle Masterprompt nötig ist)

```text
Arbeite an PHASE 2 / WAVE_xx aus finalization/phase2_release/WAVES.md.

Lies vorher (gezielt):
- CLAUDE.md · finalization/00_RULES.md · finalization/01_PRIORITIES.md
- finalization/phase2_release/WAVES.md (nur Abschnitt WAVE_xx)
- finalization/phase2_release/GATES.md (das adressierte Gate)
- docs/releases/PHASE_STATUS.md (aktueller Stand)

Liefere am Wellenende:
- Status pro Aufgabe (PASS/FAIL) mit ausgeführten Befehlen + Output
- Gate-Bezug (A–F) mit Nachweis
- Offene P0/P1-Blocker (Kategorie/Priorität/ETA)
- Manuelle Owner-Aufgaben (Domain/DNS/Secrets/Stripe-Live/Rechtstexte)
- Empfehlung: weiter zu WAVE_yy oder Blocker zuerst klären
```

---

## Notfall-Prompt (Burn-in-Incident · P0/P1 im Preprod-Betrieb)

```text
Burn-in-Incident im Preprod-Betrieb (Phase 2, Cloudflare).

Symptom:        [Beschreibung]
Logs/Fehler:    [Output — Secrets redigiert]

Aufgabe:
1. Triage gemäß finalization/00_RULES.md Abschnitt 2 + 01_PRIORITIES.md
2. Klassifizieren: P0 / P1 / P2
3. Root Cause finden (echte Repo-Dateien, nichts annehmen)
4. Fix vorschlagen mit: Retrofit-Risiko · Rollback-Strategie · Feature-Flag (ja/nein) · Regressionstest
5. Burn-in-Timer NICHT stillschweigend zurücksetzen — Incident dokumentieren in
   docs/releases/BURN_IN_INCIDENTS.md
6. Entscheidung: Burn-in fortsetzen / pausieren / neu starten (mit Begründung)

Owner-Freigabe für jeden Deploy-/Domain-/Secret-Eingriff einholen.
```

---

## GO / NO-GO — die Phase-2-Schlussbedingung

```text
PHASE-2-GO darf nur vergeben werden, wenn ALLE folgenden Punkte erfüllt sind:

- Phase-1-Go-Live-Gate (finalization/99_GOLIVE_GATE.md, A–H) bestanden  → Eingangs-Vertrag
- Gate A (Technical/Build)        grün + Nachweis
- Gate B (Security)               grün + Nachweis
- Gate C (Tenant-Isolation)       grün + Cross-Org-Negativtest belegt
- Gate D (Product/UX-Wahrheit)    grün + Kernflow E2E mit echten Daten
- Gate E (Operations)             grün + Deploy/Monitoring/Restore belegt
- Gate F (Commercial/Legal)       grün + Geldfluss + Rechtstexte belegt
- Burn-in ≥ 7 Tage stabil (keine offenen P0/P1)
- Manuelle Owner-Tasks (Domain/DNS/Secrets/Stripe-Live/Rechtstexte) erledigt
- Owner hat aktiv bestätigt — „fertig" erklärt der Owner, nicht Claude

Ist EIN Punkt offen → PHASE 2 = NO GO.
```

**Vollständige Releasefähigkeit heißt:**
Alles Notwendige ist enthalten. Alles Gefährliche, Lokale oder Generierbare ist ausgeschlossen. Alle Builds, Tests, Audits und Release-Checks sind grün. Alle Vermittler-/Compliance-Versprechen sind bewiesen oder ehrlich deaktiviert. Alle manuellen Rechts-, Infrastruktur-, Secret- und Commercial-Punkte sind separat erledigt.

> **Ziel ist nicht** „die Plattform sieht gut aus."
> **Ziel ist** ein Release, das einer seriösen Due-Diligence, einer Erzeuger-/Pilot-Demo und einem echten Cloudflare-Go-Live standhält — als regionaler **Vermittler**, der Höfe und Käufer sicher zusammenbringt und (über Erzeuger-Abo oder SB-Bezahlung) den ersten echten Geldfluss trägt.
