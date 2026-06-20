# 00_RULES — Arbeitsregeln der Finalisierungswelle (LokaleBauernConnect)

> **Bei JEDER Welle zuerst lesen** — zusätzlich zu `CLAUDE.md`, `AGENTS.md`, `PHASEN.md`, `MASTER_INDEX.md`.
> Diese Datei ist das nicht-verhandelbare Regelwerk der Finalisierungsphase. Sie gilt für **alle Phasen (1–5) und alle Wellen (00–15) sowie Tracks A–E**.
> **Konflikt-Hierarchie:** User-Anweisung > `AGENTS.md` > Subagent/Skill > `CLAUDE.md` > diese `00_RULES.md`.
> Stack fix (Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle der Plattform: **Vermittler** — kein Eigenverkauf, keine Beratung, Disclaimer durchgängig.

---

## 0. Pflicht-Lesereihenfolge vor dem ersten Edit einer Welle

1. `AGENTS.md` (Projekt) + `~/AGENTS.md` (global) + `~/CLAUDE.md` (§0-Direktive)
2. `CLAUDE.md` (Projekt) · `PHASEN.md` (Welle + Gate-Bezug der aktuellen Welle) · `MASTER_INDEX.md` (Doku-Landkarte)
3. `finalization/00_RULES.md` (diese) · `finalization/01_PRIORITIES.md` (P0–P3-Definition) · die Wellen-Datei `finalization/WAVE_xx_*.md`
4. `.claude/CLAUDE_RECS.md` (persistente Empfehlungen) · relevantes `.claude/memory/` (INDEX + decisions/learnings/patterns)
5. `docs/releases/PHASE_STATUS.md` (aktueller Stand, was bereits grün ist)

Wer ohne diese Lektüre editiert, verletzt §0 (Token-Effizienz + Repo-Genauigkeit) und Stop-Regel „Annahme statt Fakt".

---

## 1. Absolut verbindliche Arbeitsregeln

1. **Echte Repo-Dateien lesen, nichts halluzinieren.** Keine erfundenen Pfade, Tabellen, Routen, Edge Functions, Policies oder Tests. Vor Bezugnahme: per Glob/Grep verifizieren.
2. **Erst prüfen, dann bauen.** Vor jeder Änderung: betroffene Komponenten, Migrationen, RLS-Policies, Edge Functions, API-Client-Aufrufe, Zod-Schemas, Routen und UI-Zustände inspizieren.
3. **Inkrementell, keine Big-Bang-Rewrites.** Bestehende Strukturen ZUERST suchen & erweitern — keine Parallelstrukturen, keine verdeckten Architekturwechsel. Kleine, nachvollziehbare Slices.
4. **P0 vor P1, P1 vor P2, P2 vor P3.** Kein Politur-Schritt, solange Launch-Blocker (Tenant-Leck, gebrochener Kernflow, Payment-Risiko, fehlende RLS) offen sind. Priorisierung gemäß `01_PRIORITIES.md`.
5. **Triage zuerst** (Abschnitt 2): Bug ≠ Sichtbarkeitslogik ≠ Tenant-Isolation ≠ Commercial ≠ UX. Vermischen kostet Wochen.
6. **Server-Guards vor UI-Kosmetik.** Zugriffskontrolle gehört in die **DB (RLS, deny-by-default)** und in die **Edge Function** (Rechteprüfung) — UI-Ausblendung ist NIE Security. React ≠ Sicherheit.
7. **`service role` ausschließlich in Edge Functions.** Frontend nutzt nur `VITE_`-Public-Keys (Anon Key). Niemals Service-Role-Key, DB-Connection-String oder Stripe-Secret im Client-Bundle.
8. **Keine Secrets ausgeben oder committen.** Bei Fund: Pfad + Kategorie dokumentieren, Werte redigieren, Rotation empfehlen (`SECRET_ROTATION`). Secrets leben nur in Cloudflare/Supabase-Env bzw. Secret-Manager.
9. **Keine Phantomfeatures / toten Pfade.** Jedes Feature ist produktiv end-to-end verdrahtet, bewusst deaktiviert (Feature-Flag) oder ehrlich als „Bald verfügbar" markiert. Kein TODO, kein toter Button, kein Platzhalter, kein Deep-Link ins Leere.
10. **End-to-End-Pflicht.** Ein Feature gilt erst fertig, wenn die Kette steht: **Edge Function / Endpoint erreichbar → realer Supabase-Fetch (RLS-gescoped) → echtes DOM → Lade-/Leer-/Fehlerzustand → gebundener Handler → ggf. Refresh/Invalidierung**.
11. **Zero-State statt Error.** Leere Daten ergeben nie einen 500. Antwort: `{ available: false }` + leere Arrays; UI zeigt Editorial-Leerzustand („Noch keine Höfe in dieser Region" / „Noch keine Verfügbarkeiten gepflegt"), keinen Fehlerbalken.
12. **Keine Deko-KPIs.** Jede Kennzahl (aktive Höfe, Reservierungen, Conversion, SB-Einnahmen) braucht Quelle, Definition, Zeitraum, Berechnungslogik und einen funktionierenden Drilldown. Kein Fake-Data, keine Mock-KPIs in Prod-UI.
13. **Keine Commercial-Doppelwahrheit.** Pricing, Plan-Limits, SB-Transaktionsgebühr und Entitlements stammen aus EINER kanonischen Quelle (`COMMERCIAL_SOURCE_OF_TRUTH`). Entitlements werden serverseitig erzwungen, nie nur im Client gespiegelt.
14. **Kanonisches Planmodell:** ausschließlich `demo`, `basis`, `plus`, `pro`, `individuell`. „Enterprise" ist ein **Funktionsniveau innerhalb `individuell`**, kein öffentlicher Plan. Legacy-/Fremdbegriffe nur als Aliase über eine zentrale Normalisierung — nie als neuer Plan-Key.
15. **Vermittler-Disziplin (rechtlich kritisch).** Plattform vermittelt, **verkauft nicht selbst und berät nicht**. Disclaimer durchgängig sichtbar. Bei SB-Bezahlung gilt: Plattform = Zahlungsanbindung/Vermittler (Stripe Connect, Geld fließt an den Erzeuger), kein Eigenverkauf, kein Vertragspartner des Lebensmittelkaufs.
16. **Surface-/Welten-Trennung respektieren** (Session + Berechtigung strikt getrennt — siehe Abschnitt 8):
    - **Käufer-Welt:** öffentliche/eingeloggte Käufersicht (Finder, Reservierung, Saison-Radar, SB-Bezahlung).
    - **Erzeuger-Welt:** Hof-/Produkt-/Verfügbarkeits-Selbstpflege, Reservierungs-Eingang, SB-Einnahmen-Dashboard.
    - **Staff/Owner-Betriebszentrale:** Hof-Verifizierung, Support/Eskalation, Billing-Übersicht, Feature-Flags, Audit (Phase 3). Kritische Aktion = Confirm + Reason (Pflicht) + serverseitiges Audit.
17. **Keine Deko-Emojis in produktiver UI** (Editorial-Disziplin). User-Werte vor Ausgabe immer escapen. Keine hardcodierten Farben/Schwellwerte — nur Design-System-Tokens (`app/src/styles/theme.css`).
18. **Keine schwammigen Abschlussmeldungen.** Pro Ticket der Output-Block (Abschnitt 3), pro Welle der Abschlussbericht (Abschnitt 9).
19. **Bei unklarer Business-Entscheidung: sicherer Default.** Deaktivieren, soft-locken, „Bald verfügbar", oder Staff-Freigabe erzwingen — und dokumentieren. Nie raten, das Geld kostet.
20. **Keine Commits ohne ausdrückliche Owner-Freigabe.** Bei Freigabe: Co-Author-Zeile anhängen. `.claude/`, `.env`, Secrets und Build-Output gehören nie ins Release-Artefakt.

---

## 2. Triage VOR jedem Ticket (Pflicht)

Bevor irgendetwas gebaut/gefixt wird, klassifiziere — jede Kategorie hat einen **anderen Fix und andere Tests**:

| Kategorie | Beschreibung | Lösungstyp |
|---|---|---|
| **Bug** | Code funktioniert nicht wie beabsichtigt | Reparieren + Regressionstest |
| **Rollen-/Sichtbarkeitslogik** | Code ok, Sichtbarkeitsregel falsch/fehlt | Ausblenden, soft-locken, ausgrauen, Plan-Gate, **serverseitiger Guard + RLS** |
| **Tenant-Isolation** | Cross-Org-Datenleck-Risiko (fremder Hof/fremde Org) | RLS deny-by-default, Org-Scope erzwingen, Isolationstest — meist **P0** |
| **Commercial** | Pricing/Plan/Entitlement/SB-Gebühr greift nicht wie definiert | Source of Truth angleichen, serverseitiges Entitlement |
| **Security** | Auth-/CSRF-/Turnstile-/Webhook-Signatur-/Session-Schwäche | Härten, ggf. **P0** |
| **Core Flow** | Kernprodukt-Fluss gebrochen (Finder → Reservierung → SB-Bezahlung) | Reparieren — meist **P0** |
| **QA** | Test-/Build-/Typecheck-/Gate-Lücke | Test ergänzen, Gate härten |
| **UX/Default** | Logik korrekt, aber Käufer/Erzeuger wird irregeführt | Copy, Leerzustand, sinnvoller Default, Disclaimer |
| **Produktausbau** | Funktion fehlt schlicht | Bewusste Entscheidung: bauen (nur Spezial-Schicht) oder „Bald verfügbar" |
| **Cleanup/Doku** | Redundanz, veraltete Wahrheit, Doku-Lücke | Bereinigen oder deprecaten, `MASTER_INDEX` + `PHASE_STATUS` pflegen |

### Triage-Fragen pro Element (jede Card / Seite / Button / Edge Function / Query)

1. Für welche **Welt/Rolle** ist dieser Bereich bestimmt — Käufer, Erzeuger, Staff/Owner?
2. Für welchen **Plan / welches Add-on / welche SB-Gebührenstufe**?
3. Ist es käufer-, erzeuger-, staff- oder owner-intern relevant?
4. Lösung: reparieren / ausblenden / ausgrauen / soft-locken / „Bald verfügbar" / Upgrade-Request / entfernen?
5. Muss die **Edge Function / RLS-Policy** ebenfalls geschützt werden (nicht nur die UI)?
6. **Datenleck-Risiko**, wenn die UI nur versteckt wird (Org-Scope / fremder Hof)?
7. Betrifft es **Geldfluss** (Reservierung, Stripe, SB-Zahlung, Connect-Payout)? → Audit + Idempotenz + Reason pflichtig.

---

## 3. Output-Block pro Ticket (Pflicht — proportional zur Ticketgröße)

Der Detailgrad richtet sich nach Risiko (analog `CLAUDE.md` „Output-Block"):

- **Klein** (1–5 Z., 1 Datei, kein Daten-/Security-Bezug): `Bereich | Geänderte Datei | Risiko | Nächster Schritt`
- **Mittel:** zusätzlich `Kategorie | Betroffene Edge Functions/Rollen | Tests`
- **Kritisch** (RLS/Security/Migration/Org-Scope/Payment/SB-Bezahlung): **voller Block** — kein Feld überspringen:

```
Bereich (Welle / Track / Modul):
Ticket:
Problemklassifizierung (Bug / Rollen-Logik / Tenant / Commercial / Security / Core Flow / QA / UX / Ausbau / Cleanup):
Priorität (P0/P1/P2/P3):
Gelesene Dateien:
Geänderte Dateien:
Betroffene Edge Functions / Routen:
Betroffene RLS-Policies / Tabellen:
Betroffene Zod-Schemas:
Betroffene Rollen / Welten (Käufer / Erzeuger / Staff/Owner):
Betroffene Org-/Tenant-Scope-Regeln (org_id):
Feature-/Plan-/SB-Gebührenbezug:
Turnstile-/CSRF-/Auth-Auswirkung:
Stripe-/Webhook-/Idempotenz-Auswirkung:
Audit-Auswirkung (wer/was/warum, Reason-Pflicht?):
Observability-/Logging-Auswirkung (Sentry, strukturierte Logs):
Rate-Limit-Auswirkung:
Datenmodell-/Migration-Auswirkung (neue additive Migration?):
Bruchrisiko (welche bestehenden Flows nutzen den Code?):
Rollback-Strategie:
Feature-Flag nötig (ja/nein, welcher):
Tests (Unit / Edge-Function / RLS-Isolation / Integration / E2E / Cross-Org-Negativ / Plan-Gate / Webhook-Idempotenz):
Manuelle Prüfschritte (mit Owner & Datum ODER explizit als Risiko markiert):
Offene Risiken:
Wiederverwendbarkeit für andere Imperium-Plattformen:
Nächster sinnvoller Schritt:
```

**Manuelle Prüfschritte dürfen nicht zur Ausrede werden.** Entweder automatisierter Test, oder explizites Risiko mit Owner + Datum, oder klarer manueller Abnahmepunkt mit Verantwortlichem.

---

## 4. Verbote (nicht-verhandelbar)

- Kein Fake-Data / Mock-KPIs in Prod-UI · kein unescaptes User-Input.
- Kein stiller Fehler (`if (!orgId) return null` ohne 403) — fremde Org = **403, nie 200 mit Fremddaten**.
- Keine hardcodierten Farben/Schwellwerte außerhalb des Design-Systems · keine Deko-Emojis in Prod-UI.
- Keine Secrets in Code/Log/Doku/Release-Artefakt · kein `service role` im Frontend.
- Keine Migration ohne deny-by-default-RLS + Isolationstest · keine Migration ohne Rollback-Pfad.
- Keine Mutation ohne Audit (kritische Aktion zusätzlich ohne Reason) · kein Stripe-Webhook ohne Signaturprüfung + Idempotenz.
- Keine sensible Route/Edge Function ohne serverseitigen Org-Scope · keine Vermischung von Käufer-/Erzeuger-/Staff-Session.
- Keine „Schnellfixes zum Nachpflegen" · keine Parallel-/Schattenstruktur statt Erweiterung des Bestehenden.
- Keine VMS-/Self-Host-Begriffe übernehmen (Zeitarbeit, Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne adaptieren.
- Kein Eigenverkauf / keine Beratung durch die Plattform · kein fehlender Vermittler-Disclaimer.

---

## 5. Stop-Regeln (sofort anhalten, minimalen sicheren Fix vorschlagen, auf Owner-OK warten)

Nicht weiterpatchen, sondern Befund melden, wenn:

1. Eine betroffene Edge Function / Route / Tabelle **nicht gefunden** wird (Annahme statt Fakt).
2. Unklar ist, **welche Rolle/Welt schreiben** darf.
3. **Org-/Tenant-Scope serverseitig nicht prüfbar** ist (RLS fehlt oder umgehbar).
4. Turnstile/CSRF/Auth an einer öffentlichen oder mutierenden Strecke unklar ist.
5. **Statusübergänge** (z. B. Reservierung: offen → bestätigt → abgeholt → storniert; SB-Zahlung: initiiert → bezahlt → quittiert → erstattet) nicht definiert sind.
6. Das **Datenmodell für den Zielzustand fehlt**.
7. Ein **öffentlicher Flow ohne Einwilligung/Freigabe** existiert (Hof-Veröffentlichung, Kontaktdaten, Standort).
8. **SSO-/MFA-Enforce ohne Recovery / Break-Glass** möglich wäre.
9. **Geldfluss/Export ohne Audit** möglich ist (Reservierung, Stripe-Zahlung, SB-Einnahmen, Connect-Payout, Erstattung).
10. **Käufer-/Erzeuger-/Staff-Session nicht sauber trennbar** ist.
11. **Secrets** in Code, Doku oder Release-Artefakt gefunden werden.
12. **Zwei widersprüchliche Wahrheiten** in Commercial-/Plan-/Feature-/Gebühren-Definitionen bestehen.
13. Eine Änderung den **Stack-Kanon verletzen** würde (Hetzner/Docker-Self-Host/Service-Role-im-Client) oder eine **Kern-Funktion neu bauen** würde, statt sie anzudocken.

**Dann:** Befund dokumentieren → minimalen sicheren Fix vorschlagen → auf Owner-Bestätigung warten → erst dann umsetzen.

> Ausnahme zu §0.8 („Durcharbeiten statt Pausieren"): Stop-Regeln **sticht** das Durcharbeiten. An echten Blockern wird angehalten — Sicherheit/Verifikation werden nie für Tempo geopfert.

---

## 6. Retrofit-Strategie (LokaleBauernConnect wächst über Wellen — bestehende Flows dürfen nicht brechen)

Vor jeder Änderung beantworten:

1. **Was kann brechen?** Welche bestehenden Flows nutzen den betroffenen Code/Endpoint/Table (z. B. der bereits end-to-end laufende Hofladen-Finder + Reservierung)?
2. **Gibt es ein Feature-Flag?** Lässt sich der Patch dahinter verstecken, falls er Probleme macht?
3. **Gibt es Rollback?** Wie wird der vorherige Zustand wiederhergestellt (DB + Code + Deploy)?
4. **Welche bestehenden Flows MÜSSEN unverändert weiterlaufen?**
5. **Migration nötig?** Wenn ja: **additiv**, idempotent, mit Rollback, als **neue** Datei unter `app/supabase/migrations/`, mit RLS deny-by-default + Isolationstest ab Migration #1.
6. **Skalierung mitgedacht?** Funktioniert das Muster bei 10 → 300 Höfen / vielen Käufern (Indizes, Pagination, kein N+1)?

Wenn diese Fragen nicht beantwortet werden können → Stop-Regel 3/6 greift.

---

## 7. Architektur-Konventionen (aus AGENTS.md / CLAUDE.md, auf den fixen Stack gemappt)

- **Frontend (React + Vite + TS strict):** Komponenten dünn; fachliche Logik in Hooks/Utils. User-Werte immer escapen. Nur Design-System-Tokens (`app/src/styles/theme.css`), keine Emojis in Prod-UI. Lade-/Leer-/Fehlerzustand für jeden Datenpfad.
- **API-Client:** zentral (`app/src/api/*` bzw. zentraler Supabase-Client). Kein direkter `fetch` verstreut, kein Service-Role-Key, nur `VITE_`-Public-Env.
- **Edge Functions (Supabase/Deno):** Zod-Validierung an der Grenze · Rechteprüfung · `service role` nur hier · Audit · Turnstile bei öffentlichen Formularen · Rate-Limits.
- **Datenbank:** SQL nur als **neue additive Migration** unter `app/supabase/migrations/`. Jede Tabelle: `org_id`/Tenant, Zeitstempel, `deleted_at`, **RLS deny-by-default + Isolationstest** (Plattform- + Org-Isolation).
- **RBAC:** über zentrale RLS-Policies + Edge-Guards — keine Inline-Rollenchecks im Frontend als alleinige Absicherung.
- **Stripe/Webhooks:** **EIN** signaturgeprüfter, **idempotenter** Handler als Wahrheit. Entitlements und SB-Zahlungsstatus serverseitig. Geld fließt via Connect an den Erzeuger (Vermittler-Modell).
- **Mutationen:** Confirm + (bei kritischen Aktionen) Reason-Pflicht + serverseitiges Audit (unabschaltbar). Scope (`org`/`region`/`zeitraum`) in Responses mitführen (Scope-Transparenz).
- **Secrets:** nur in Cloudflare/Supabase-Env. Niemals in Dateien, Logs oder Bundle.

---

## 8. Welten- & Berechtigungs-Trennung (verbindlich)

| Welt | Wer | Darf | Niemals |
|---|---|---|---|
| **Käufer** | öffentliche/eingeloggte Käufer | Höfe finden, Verfügbarkeit sehen, reservieren, Saison-Radar abonnieren, am SB-Stand bezahlen | fremde Reservierungen/Erzeuger-Daten sehen, Hof-Daten ändern, Staff-Funktionen |
| **Erzeuger** | Hofbetreiber (org-gebunden) | eigenen Hof + Produkte + Verfügbarkeit pflegen, Reservierungseingang, eigene SB-Einnahmen, Abo verwalten | fremde Höfe/Orgs sehen oder ändern, Käuferdaten über das Nötige hinaus, Staff/Owner-Konsole |
| **Staff/Owner** | Betriebszentrale (Phase 3) | Hof-Verifizierung, Support/Eskalation, Billing-Übersicht, Feature-Flags, Audit | unauditierte Mutation, Reason-lose kritische Aktion, Datenexport ohne Audit |

Sessions, Tokens und Berechtigungen sind strikt getrennt. Jede org-fremde Query = **403**. Deep-Links übergeben Kontext, bauen nie org-fremde URLs (Drilldown-Integrität).

---

## 9. Abschlussbericht pro Welle (Pflicht — analog `PHASEN.md`)

Am Ende jeder Welle exakt dieser Block (kein Feld leeren, nichts erfinden):

```
## Welle abgeschlossen: WAVE_xx <Name>   (Phase: · Track: · Datum:)

### Geändert
- <Datei/Migration/Edge Function> — <was + warum>

### Verifikation (ausgeführt, nicht behauptet)
- Build/Typecheck (npm run build): <grün/rot + Auszug>
- Gezielte Tests auf geänderten Pfaden: <Liste + Ergebnis>
- RLS-Isolationstest (Plattform + Org, Cross-Org-Negativ): <Ergebnis>
- Webhook-Idempotenz / Entitlement-Gate (falls Payment/Plan berührt): <Ergebnis>
- Verdrahtungs-Check UI (Endpoint→DOM→Action→Lade/Leer/Fehler): <Ergebnis>
- Konsole sauber (keine TypeError/401-Schleifen): <ja/nein>

### Gate-Bezug
- Adressiertes Gate (z. B. Isolations-Gate / Gates A–F / Ops-Gate / Gate 10): <Status>

### 7 Produktionspfeiler (Selbstcheck)
- Org-Boundary · Zero-State · Scope-Transparenz · RBAC · Audit · Testpflicht · Drilldown-Integrität: <je ✅/offen>

### Risiken & offene Punkte
- <Risiko + Owner-Entscheidung nötig? + Rollback>

### Doku/Tracker aktualisiert
- docs/releases/PHASE_STATUS.md · MASTER_INDEX.md · ggf. ADR/learning/pattern: <ja/nein>

### Nächste Welle / nächster sinnvoller Schritt
- <konkret>
```

---

## 10. Verifikation vor „fertig" (Definition of Done je Welle)

Eine Welle ist erst abschließbar, wenn:

1. `npm run build` (inkl. Typecheck, strict) **grün**.
2. Gezielte Tests auf den **geänderten** Pfaden grün (nicht blind „alle"; Test-Integrität gemäß §0.9 — Code an Tests anpassen, nie Tests zurechtbiegen oder still skippen).
3. Bei DB/RLS: **Cross-Org-Negativtest** (fremde Org = 403) + Plattform-Isolationstest grün.
4. Bei Payment/SB-Bezahlung: Webhook-Signatur + **Idempotenz** + serverseitiges Entitlement getestet.
5. Bei UI: Verdrahtungs-Kette (Endpoint → realer Fetch → DOM → Lade/Leer/Fehler → Handler) belegt, Konsole sauber.
6. Die 7 Produktionspfeiler für die berührte Fläche erfüllt; relevante Doku/Tracker aktualisiert.
7. **„Fertig" erklärt der Owner**, nicht Claude. Diffs bleiben uncommitted bis Owner-Freigabe.

---

## 11. Subagenten-Einbindung pro Welle (Delegationsregeln)

- **UI/Editorial** → `frontend-design-guardian` (Token-/Komponenten-Treue) + `i18n-content-spezialist` (Markenton, Disclaimer).
- **DB/Tabellen/RLS** → `db-rls-spezialist`, danach `qa-tester` (kein Merge ohne grünen Isolationstest).
- **Zahlungen / SB-Bezahl-USP** → `payment-engineer` + `edge-functions-spezialist`, danach `security-auditor` (read-only).
- **Neue Strecke/Welle** → `platform-onboarder` (stellt sicher: nur Spezial-Schicht, Kern nur andocken).
- **Vor jedem Merge** → `qa-tester`; bei sensiblen Änderungen zusätzlich `security-auditor`.
- **Architekturfrage** → `architekt`; Ergebnis als **ADR** in `.claude/memory/decisions/`.
- **Compliance** (DSGVO, Lebensmittel-Hinweis, Vermittler-Disclaimer, Audit-Vollständigkeit) → `compliance-officer`.

---

## 12. Selbstlernen & Doku-Pflege (getaktet, nicht pro Nachricht)

- Wiederverwendbare Lektion → 1-Zeile in `.claude/learning/insights_inbox.md` (Kategorie EFFIZIENZ / WIRTSCHAFTLICHKEIT / TECHNIK, mit Quelle).
- Session-Ende: destillieren → **Owner-Review** → übernehmen → monatlich konsolidieren.
- Architekturentscheidung → ADR; wiederverwendbares Muster → `.claude/memory/patterns/` (Imperium-Beschleuniger: „Funktioniert das Pattern in 20 anderen Projekten?").
- Widerlegte Annahme korrigieren, nicht duplizieren. `.claude/` nie ins Release-Artefakt.

---

> **Merksatz der Welle:** Erst lesen, dann triagieren, dann den sichersten kleinen Slice bauen — server-seitig abgesichert, end-to-end verdrahtet, mit Zero-State und Audit, verifiziert und im Abschlussbericht belegt. „Fast fertig" zählt nicht.
