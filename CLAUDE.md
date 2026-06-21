# LokaleBauernConnect — CLAUDE.md · Verbindliche Arbeitsanweisung

> Vor **jeder** Coding-Aktion lesen. Adaptiert aus dem TempConnect-Blueprint (`tempconnect_docker/CLAUDE.md`, Stand 2026-06-09) auf diese Plattform + Stack. **Das BBQ-Original bleibt unangetastet — dies ist die überschriebene Repo-Kopie.**
> Globale Standards: `@C:\Users\DennisStegemann\AGENTS.md` + `@C:\Users\DennisStegemann\CLAUDE.md` (§0-Direktive, gilt immer).
> **Konflikt-Hierarchie:** User-Anweisung > `AGENTS.md` > Subagenten/Skill > `CLAUDE.md`.

## Pflicht-Lesereihenfolge vor dem ersten Edit
1. `AGENTS.md` (Projekt) + `~/AGENTS.md` (global)
2. `.claude/agents/*` (Subagenten) + `MASTER_INDEX.md` (Doku-/Bauplan-Landkarte)
3. diese `CLAUDE.md`
4. `.claude/CLAUDE_RECS.md` (persistente Empfehlungen)
5. relevantes `.claude/memory/` (INDEX + decisions/learnings/patterns)

---

## §0 — Globale Direktive (Kurzfassung, Volltext in `~/CLAUDE.md`)
1. **Enterprise-Reife & Lückenlosigkeit** — keine TODOs/Platzhalter/toten Buttons, End-to-End verdrahtet, verifiziert.
2. **Extreme Token-Effizienz** — gezielt lesen (Ranges/Diffs), Tool-Calls bündeln, Arbeitsdateien als Gedächtnis.
3. **Wirtschaftlichkeit** — Owner-Wert maximieren, keine Verschwendung, Skalierung 10→300 mitdenken.
4. **Geschwindigkeit × Max-Output** — astronomisch schnell, maximaler nutzbarer Output pro Schritt.
5. **Team-Qualität** — Output wie von einem ganzen Team.
6. **Marketing-Premium** — Außenwirkung Top-Agentur-Niveau.
7. **Zukunfts-/Marktführer-Standard** — State-of-the-Art von übermorgen, kategorie-definierend.
8. **Durcharbeiten statt Pausieren** — an Stopp-Punkten den nächsten Mehrwert liefern; Pause nur bei echtem Bedarf.
9. **Test-Integrität** — Code an Tests anpassen, nie Tests zurechtbiegen.

---

## Mission & strategischer Kontext

- **Teil des ConnectCore-Imperiums:** EIN gemeinsamer Kern, 14 Tochter-Plattformen, EIN Staff-/Support-Center. **LokaleBauernConnect = Welle 1, Klasse C** (Cashflow-Schnellstarter: schnell, hoher gesellschaftlicher Nutzen, starke Story). Bewiesen aus `_WELLEN_ROADMAP/00_WELLENPLAN.md`.
- **Blueprint-Denken:** Jede Entscheidung unter „Funktioniert dieses Pattern auch in 20 anderen Projekten?". Wiederverwendbarkeit + Wirtschaftlichkeit vor Eleganz.
- **Doppel-Ziel (verbindlich):** (a) **SOFORT online, damit man spielen kann** — kürzester Pfad zu einer benutzbaren, deploybaren Version; (b) **in Rekordzeit Enterprise-Premium** — die volle Tiefe folgt diszipliniert über die Phasen/Wellen. **Pro Entscheidung abwägen**, welches Ziel gerade führt; **bei echter Unsicherheit fragen**.
- **Vermittler-Rolle:** Plattform vermittelt, verkauft nicht selbst, berät nicht. Disclaimer durchgängig.

## Stack (fix — Imperium-Grundgesetz)
**React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.** Individuelle Formulare datengetrieben (Schema + Zod).

## Rollen
- **Claude = gesamter Stack** (Frontend, Backend/Edge, DB/RLS, Security, Tests, UX) **+ OZ-Execution-Part** (Scope, Akzeptanzkriterien, Phasen/Wellen-Planung, Gates, Abschlussberichte). OZ ist durch Claude ersetzt.
- **Owner = Entscheidungsinstanz.** Architektur-/Security-/Geld-/Deploy-/Account-/irreversible Schritte: **vorab ankündigen + Owner-Freigabe**. Reversible lokale Arbeit: decide-and-act.

---

## Arbeitsmodus (verbindlich)
- Inkrementell: bestehende Strukturen ZUERST suchen & erweitern, keine Parallelstrukturen.
- Production-ready/Enterprise-Niveau, keine Quick-and-dirty-Workarounds, keine verdeckten Architekturwechsel.
- **Retrofit-bewusst:** vor jedem Patch — Was kann brechen? Feature-Flag? Rollback?
- **Repo-genau:** echte Dateien/Routen/Tabellen prüfen, keine Annahmen.

## Prompt-Signale → Arbeitsmodus (OZ-Playbook)
`kurze antwort` → kompakt · `nichts bauen` → nur Analyse · `prüfe mal` → faktenbasiert mit Zahlen · `bring in ordnung` → Diagnose→Fix→Validierung→Status · `und jetzt?` → Stand + nächster Schritt · `merke dir` → ins Memory verdichten · `erst plan`/Frageform → Plan, auf Freigabe warten.

## Triage vor jedem Ticket (kritisch)
1. **Bug** — Code funktioniert nicht wie beabsichtigt
2. **Rollen-/Sichtbarkeitslogik** — Code ok, Sichtbarkeitsregel falsch/fehlt
3. **UX** — Logik ok, Nutzer wird in die Irre geführt
4. **Produktausbau** — Funktion fehlt
5. **Commercial** — Pricing/Plan/Entitlement greift nicht
> Jede Kategorie = anderer Fix + andere Tests. Vermischen kostet Wochen.

## Output-Block (proportional zur Ticketgröße)
- **Klein** (1–5 Z., 1 Datei): `Bereich | Geänderte Datei | Risiko | Nächster Schritt`
- **Mittel**: `+ Kategorie | Betroffene APIs/Rollen | Tests`
- **Kritisch** (RLS/Security/Migration/Org-Scope/Payment): voller Block inkl. `Gelesene Dateien · Org-/Mandantenlogik · Retrofit-Risiko · Feature-Flag · Rollback · Tests (Unit/Edge/E2E/Cross-Org) · Wiederverwendbarkeit`.

---

## Kritische Produkt-Abgrenzung (nicht verletzen)
- **Plattform-Scope = Spezialschicht:** Hofladen-Finder (Karte) · Produktverfügbarkeit (Erzeuger-Selbstpflege) · Reservierung/Abholfenster · Saison-Radar · **USP: sichere Bezahlung an unbemannten SB-Hofläden**.
- **Kern (nie neu bauen, nur andocken):** Auth/MFA/SSO · Rollen/Tenancy · Matching · Chat · Bewertungen · Billing-Mechanik · Benachrichtigungen · Staff-/Support-Center · Audit.
- Käufer-, Erzeuger-, Staff-Welten strikt trennen (Session/Berechtigung).

## Backend- & Edge-Function-Regeln (Supabase)
- Zugriffskontrolle gehört in die **DB (RLS)**, nicht nur in den Client.
- **service role nur in Edge Functions**, nie im Frontend. Frontend nur `VITE_`-Public-Keys.
- Edge Functions (Deno): Zod-Validierung an der Grenze, Rechteprüfung, Audit, Turnstile bei öffentlichen Formularen.
- Webhooks (Stripe): **EIN** signaturgeprüfter, **idempotenter** Handler als Wahrheit. Entitlements serverseitig.

## Frontend-Regeln
- User-Werte vor Ausgabe immer escapen. Keine hardcodierten Farben — Design-System-Tokens (`app/src/styles/theme.css`, Editorial-Skin).
- **Keine Deko-Emojis** in produktiver UI (Editorial-Disziplin).
- **End-to-End-Pflicht:** Feature gilt erst fertig, wenn Kette steht — Endpoint erreichbar → realer Fetch → echtes DOM → Lade/Leer/Fehler → gebundener Handler → ggf. Refresh. Kein TODO, kein toter Button, kein Platzhalter.
- **Deep-Links statt Sackgassen**; jeder interaktive Zustand real auslösbar/sichtbar.

## Datenbank-, RLS- & Planregeln
- SQL nur als **neue Migration** unter `app/supabase/migrations/`. Additiv. Jede Tabelle: `org_id`/Tenant, Zeitstempel, `deleted_at`, **RLS deny-by-default + Isolationstest** (Plattform- + Org-Isolation) — ab Migration #1.
- Kanonische Pläne (Imperium): `demo`, `basis`, `plus`, `pro`, `individuell`. „Enterprise" = Funktionsniveau in `individuell`, kein öffentlicher Plan.
- **Plattformspezifische Abweichung (LokaleBauernConnect):** STATT klassischer SaaS-Abostufen gilt ein **Transaktions-Provisionsmodell** — Käufer- **und** Verkäufer-Provision pro Kauf, optionale **Premium-Mitgliedschaft 30 EUR/Monat** (senkt die Provision) sowie **Reputations-/Tier-Rabatte** (status-gestaffelt). Begründung, Sätze, Risiken und Owner-Freigaben: `docs/adr/0003-provisionsmodell.md`.
- **Provisions-Source-of-Truth (verbindlich):** Jede Gebühren-/Provisionsänderung MUSS synchron in `app/src/lib/fees.ts` (Single Source of Truth) UND `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` gepflegt werden; Strukturänderung → neue ADR.

## Sicherheits- & Betriebsregeln
- Secrets nie in Code/Log — nur Env/Secret-Manager. Kein Commit ohne ausdrückliche Owner-Freigabe; Co-Author-Zeile anhängen.
- **Deploy/Go-Live/Kosten/Account** vorab in Klartext ankündigen, erst auf OK.

## Verifikation vor Abschluss
- Build/Typecheck (`npm run build`) + gezielte Tests auf geänderten Pfaden (nicht blind „alle").
- Bei UI: Verdrahtungs-Check (Endpoint→DOM→Action→Zustände) + Konsole sauber (keine `TypeError`/401-Schleifen).
- Bei RLS/Berechtigung: Boundary-/Cross-Org-Negativtests.
- **„Fertig" erklärt der Owner**, nicht Claude. Diffs bleiben uncommitted bis Freigabe.

---

## Test-Integrität (verbindlich)
- **Tests sind die Spezifikation.** Bei einem roten Test wird **der Code an den Test angepasst** — der Test wird **niemals** abgeschwächt, gelöscht, geskippt oder „grün gebogen", um zu bestehen.
- **Einzige Ausnahme:** Der Test ist nachweisbar falsch (kodiert einen Bug als Soll) oder spröde (prüft Implementierungsdetail statt Verhalten) → dann wird der **Test** korrigiert, mit Begründung. Reine Fixture-Pflege (Mock-Daten an legitim geänderte Query angleichen) ist erlaubt, solange die `expect/assert`-Prüfungen unverändert bleiben.
- **Kein stiller Skip / kein Auskommentieren** — ein nicht real ausgeführter Test zählt nicht als grün.
- **Zielniveau: Tests + Dokus 100 %** — alle Tests grün, Logik (`app/src/lib`) ~100 % Coverage, jede Seite/Komponente getestet; jede Doku vorhanden + code-konsistent. Vor „fertig": `npm test` + `npm run build` grün.

## Enterprise Readiness ≥ 85 % — die 7 Produktionspfeiler
1. **Org-Boundary / Datenisolation** — jede Query org-gebunden via RLS; fremde Org = 403, nie 200 mit Fremddaten.
2. **Zero-State statt Error** — kein 500 bei leeren Daten; `available:false` + leere Arrays; UI zeigt „Noch keine Daten".
3. **Scope-Transparenz** — Responses tragen `scope` (org/region/zeitraum); UI zeigt Kontext + Datenstand.
4. **RBAC ohne Lücken** — Käufer/Erzeuger/Staff sauber getrennt; Plan-Locks zeigen konkreten Upgrade-Pfad.
5. **Audit & Verantwortlichkeit** — jede Mutation: wer/was/warum (reason Pflicht bei kritischen Aktionen), unabschaltbar.
6. **Testpflicht pro Feature** — fremde Org = 403, leere Daten = Zero-State, valider Aufruf = erwartetes Shape.
7. **Drilldown-Integrität** — Deep-Links übergeben Kontext, bauen nie org-fremde URLs.

## Nicht-verhandelbare Verbote
Kein Fake-Data/Mock-KPIs in Prod-UI · kein unescaptes User-Input · kein stiller Fehler (`if(!orgId) return null` ohne 403) · keine hardcodierten Farben/Schwellwerte außerhalb Design-System · keine Secrets im Log · keine Migration ohne Rollback · keine Mutation ohne CSRF/Audit · keine sensible Route ohne serverseitigen Org-Scope · keine „Schnellfixes" zum Nachpflegen.

## Stop-Regeln (anhalten, minimalen Fix vorschlagen, auf OK warten)
API/Service nicht gefunden · unklar welche Rolle schreiben darf · Org-Scope serverseitig nicht prüfbar · CSRF/Auth unklar · Statusübergänge undefiniert · Datenmodell für Zielzustand fehlt · Public-Flow ohne Einwilligung · SSO-Enforce ohne Break-Glass · Finance/Export ohne Audit · Sessions (Käufer/Erzeuger/Staff) nicht trennbar.

---

## Dokumentation, Tracker & Selbstlernen (Pflicht)
- Relevante Änderung → `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` aktualisieren; Projektwahrheiten ins Memory/`.claude/`.
- **Self-Update getaktet (nicht pro Nachricht):** wiederverwendbare Lektion → 1-Zeile `.claude/learning/insights_inbox.md` (Kategorien EFFIZIENZ/WIRTSCHAFTLICHKEIT/TECHNIK) → Session-Ende destillieren → **Owner-Review** → übernehmen → monatlich konsolidieren. Jede Erkenntnis mit Quelle. `.claude/` nie ins Release-Artefakt.
- Architekturentscheidungen als **ADR** (`.claude/memory/decisions/`). Widerlegte Annahme korrigieren, nicht duplizieren. Muster → `.claude/memory/patterns/` (Imperium-Beschleuniger).

## Subagenten
Delegationsregeln + Rollen siehe `AGENTS.md` und `.claude/agents/*`. UI → frontend-design-guardian · DB/RLS → db-rls-spezialist + qa-tester · Payment → payment-engineer + edge-functions-spezialist + security-auditor · neue Strecke → platform-onboarder · Architekturfrage → architekt (Ergebnis als ADR).

## Phasen / Wellen / Gates
Der vollständige Bauplan steht in **`PHASEN.md`** (5 Phasen, Wellen, Gates, Marktstart-Pflicht-Set) — adaptiert aus TempConnects Finalisierungsmaschine auf React/Supabase/Cloudflare. Status: **`docs/releases/PHASE_STATUS.md`**. Vollständige Doku-/Bauplan-Landkarte: **`MASTER_INDEX.md`**. **Eine Welle pro Session.**

## ⭐ USP — Sichere Bezahlung an unbemannten Selbstbedienungs-Hofläden
Viele Hofläden sind unbesetzt (Vertrauenskasse). Wir bieten **sichere bargeldlose Bezahlung am SB-Stand** (QR scannen → zahlen → fertig). Löst Schwund/Bargeld-Handling, senkt Käufer-Friktion, monetarisierbar (kleine Gebühr). Eigene Welle in `PHASEN.md` (Phase 4) + ADR. Compliance: Plattform = Zahlungsanbindung/Vermittler, kein Eigenverkauf.

---

## Status (Kurz)
| Bereich | Stand |
|---|---|
| Landing (`web/index.html`) | ✅ Editorial, responsive — geparkt (Marketing) |
| App-Fundament (`app/`) | ✅ React+Vite+TS, Editorial-Design, build grün |
| Hofladen-Finder | ✅ Finder + Detail + Reservierung end-to-end (Seed, Supabase-ready), Port **5409** |
| Governance-Kanon | ✅ CLAUDE.md (diese), AGENTS.md, Subagenten, PHASEN.md, MASTER_INDEX, PHASE_STATUS |
| Doku-/Bauplan-Tiefe (≥ TempConnect) | 🔨 im Aufbau über Wellen — siehe MASTER_INDEX |
| Supabase/Cloudflare live | ⬜ Owner-Freigabe (Account/Kosten/Domain) |

## Self-Learning Log
- **2026-06-19** — Governance-Kanon aus TempConnect-Blueprint adaptiert (überschriebene Repo-Kopie; BBQ-Original unberührt). Stack-Mapping: SCC/Hetzner → Cloudflare/Supabase-Ops; VMS-Spezifika → Hofladen-Finder/Verfügbarkeit/Reservierung/SB-Payment. OZ-Execution-Part übernommen. Doppel-Ziel verankert: schnell online + Rekordzeit-Enterprise. Vollständige Historie früherer Sessions: siehe `.claude/memory/`.
- **2026-06-20** — App auf MVP-Feature-Niveau: Finder (Liste+Karte/Leaflet, Saison-Radar, Reputation, Reservierung), **SB-Korb-Bezahlung** (USP), Erzeuger-Onboarding-Wizard (Zod)/Self-Service/Abo, Staff-Konsole, Auth-Gerüst (Magic-Link+RLS-Guard), PWA, `/status`. **39 Tests** (Unit/Integration/Component/E2E). Alle Security-Review-Findings behoben (RLS-Härtung, 0-Row-Erkennung, Auth-Race). Live-Status führend in `docs/releases/PHASE_STATUS.md`; Go-Live: `docs/launch/GO_LIVE_ANLEITUNG.md`. npm-Audit-Funde = Dev-only, bewusst belassen.
- **2026-06-21** — Monetarisierung + Premium-Features + Git/CI. **Provisionsmodell statt Abos**: Transaktions-Provision (empf. 1 % Käufer / 5 % Verkäufer = 6 %, Premium 39 €/Mo seller-only, Status Bronze..Platin, Floor 1,2 % + 0,25 €/Tx) — Single Source `app/src/lib/fees.ts` + `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` + ADR 0003; **Owner-Freigabe + Stripe-Connect-Bau ausstehend** (Befund: Checkout ohne Connect = faktischer Eigenverkauf → vor Live zwingend Destination-Charges). **SB-Unterstützungsbeitrag** (freiwillig, Mig 0005). **Finder-Premium**: GPS-Entfernung + Erntedatum/Frische + Sortierung (Mig 0006). **Erzeuger-Typen** gewerblich/Privat-Hobby/Verein + Selbsterklärungen (Mig 0007); Kleingarten ausgeschlossen (BKleingG). **Globale PDF-Belege** (pdf-lib lazy, eigener Chunk). **Git/CI**: Repo public (github.com/Rosenbaum-yoo/LokaleBauernConnect) + GitHub-Actions-CI (account-gated bis E-Mail-Verifizierung). **87 Tests** grün. Wirtschaftlichkeits-/Effizienz-Lektionen destilliert in `.claude/learning/insights_inbox.md` (lazy-load schwerer Libs, client-PDF = 0 Serverkosten, Provisions-Floor, Recht-vor-Bau, parallele Read-only-Research-Workflows). Globale CI/Git/Test-Standards zusätzlich im ConnectCore-Imperium-Master verankert.
