# 99 — Globales Go-Live-Gate (Phase 1), Definition of Done & Abschlussbericht

> **Letzte Stufe vor dem Marktstart.** Diese Datei definiert, wann **LokaleBauernConnect** launchbar ist und wie jede Welle abgeschlossen wird.
> Adaptiert aus der TempConnect-Finalisierungsmaschine (`finalization/99_GOLIVE_GATE.md`) auf **React+Vite+TS · Supabase (EU, RLS, Edge/Deno) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect)**. VMS-/Hetzner-Begriffe sind konsequent auf die Hof-Domäne überschrieben.
> **Bezug:** `PHASEN.md` (Phase 1, WAVE 00–15) · `MASTER_INDEX.md` · `docs/releases/PHASE_STATUS.md` · `CLAUDE.md` (7 Produktionspfeiler, §0-Direktive).
> **Rolle = VERMITTLER:** kein Eigenverkauf, keine Beratung. Vermittler-Disclaimer durchgängig sichtbar.

---

## Geltungsbereich & Konfliktregel

- **Dieses Gate deckt Phase 1 ab** (Fundament + Kernprodukt, Wellen 00–15) und ist der **Pflicht-Block des Marktstart-Sets** (`PHASEN.md` → „Marktstart-Pflicht-Set"). Die operativen Gates A–F (Phase 2), das Ops-Gate (Phase 3) und Gate 10 (Phase 5) sind nachgelagerte, eigene Gates — sie werden hier referenziert, nicht ersetzt.
- **Kein Punkt darf wegdiskutiert werden.** Erscheint ein Eintrag praktisch nicht erfüllbar → **Stop, Owner einbeziehen** (Stop-Regeln aus `CLAUDE.md`). Feature so anpassen, dass es das Gate besteht, oder ehrlich **nicht launchen** / als „Bald verfügbar" markieren (nicht abrechenbar).
- **„Fertig" erklärt der Owner**, nicht Claude. Diffs bleiben uncommitted bis ausdrückliche Owner-Freigabe (`CLAUDE.md` → Verifikation).
- Konflikt-Hierarchie: **User-Anweisung > AGENTS.md > Subagent/Skill > CLAUDE.md > diese Datei**.

---

## Teil 1 — Globales Go-Live-Gate (Phase 1)

LokaleBauernConnect ist erst launchbereit, wenn **ALLE** folgenden Punkte erfüllt sind. Jeder Punkt ist nachweisbar (Befehl, Testlauf, Screenshot oder manueller Prüfschritt mit Owner + Datum).

### A. Produkt — Kernflow & Spezialmodule

- [ ] **Kernflow Ende-zu-Ende mit echten Daten:** Hofladen-Finder (Suche/Filter/Karte) → Hof-Detail → Produktverfügbarkeit → **Reservierung/Abholfenster** → Bestätigung — vollständig über Supabase (nicht nur Seed). Endpoint → realer Fetch → echtes DOM → Lade-/Leer-/Fehlerzustand → gebundener Handler → Refresh.
- [ ] **Produktverfügbarkeit = Erzeuger-Selbstpflege:** Erzeuger kann Verfügbarkeit/Bestand/Abholfenster eigenständig pflegen; Änderungen schlagen serverseitig (RLS-geschützt) auf den Finder durch.
- [ ] **Saison-Radar** zeigt korrekte saisonale Daten (kein Fake, kein Platzhalter) ODER ist klar als „Bald verfügbar" markiert (nicht als nutzbar vorgetäuscht).
- [ ] **SB-Bezahl-USP** ist entweder **ehrlich produktiv** (QR am Stand → Stripe → Quittung, Webhook-bestätigt) ODER kontrolliert deaktiviert / als „Bald verfügbar" markiert — **nie halbfertig kaufbar sichtbar**. Bei Aktivierung gilt zusätzlich Phase 4 Track A + ADR.
- [ ] **Käufer-, Erzeuger-, Staff-Welten strikt getrennt** (Session/Berechtigung, Surface-Sichtbarkeit aus WAVE_03). Keine Welt sieht/verändert eine fremde Welt.
- [ ] **Kein Feature ist als kaufbar/aktiv sichtbar, das technisch nicht lieferbar ist.** „Bald verfügbar" ist eindeutig markiert und nicht abrechenbar.
- [ ] **Vermittler-Disclaimer** durchgängig sichtbar (Finder, Detail, Reservierung, Checkout): Plattform vermittelt, verkauft nicht selbst, berät nicht.

### B. Commercial — Pläne, Abos & Geldfluss

- [ ] **Kanonische Pläne** (`demo`, `basis`, `plus`, `pro`, `individuell`) sind konsistent — **eine kanonische Quelle**, UI und Backend stimmen überein. „Enterprise" = Funktionsniveau in `individuell`, kein öffentlicher Plan.
- [ ] **Buchbare Features sind wirklich lieferbar.** Entitlements/Plan-Locks zeigen einen konkreten Upgrade-Pfad statt einer Sackgasse.
- [ ] **Mindestens ein Geldfluss steht** (Marktstart-Pflicht): Erzeuger-Abo (`WAVE_09`, Migration `0002_payments.sql`) **ODER** SB-Bezahlung (Phase 4 Track A). Stripe Connect-Onboarding für auszahlungsberechtigte Erzeuger ist abgeschlossen oder bewusst aufgeschoben (dokumentiert).
- [ ] **Stripe-Webhook = EINE Wahrheit:** ein signaturgeprüfter, **idempotenter** Handler (`supabase/functions/stripe-webhook`) setzt Entitlements/Zahlungsstatus serverseitig. Idempotenz getestet (doppeltes Event → ein Effekt).
- [ ] **Individuelle Tarife laufen über Staff-Freigabe**, nicht selbst-aktivierbar.
- [ ] **Quittung/Beleg** wird nach erfolgreicher Zahlung zuverlässig erzeugt/zugestellt (kein toter Pfad).

### C. Security — Isolation, Auth & Härtung

- [ ] **Keine Secrets im Release** (`WAVE_01`): keine `.env`, kein service-role-Key, kein `.claude/` im Artefakt. Frontend nur `VITE_`-Public-Keys; **service role ausschließlich in Edge Functions**.
- [ ] **Tenant-/Org-Isolation getestet (RLS deny-by-default):** Cross-Org-Negativtests bestehen über **alle** Tabellen der Migrationen `0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`. Fremde Org = **403/leer**, nie 200 mit Fremddaten. **Kein Merge ohne grünen Isolationstest.**
- [ ] **Plattform-Isolation:** Public-Katalog (`farms`/`products`) ist bewusst lesbar; alle schreibenden/sensiblen Pfade (Reservierungen, Payments, Abo, Mitgliedschaften, Bewertungen) sind org-/rollengebunden.
- [ ] **Supabase Auth** produktiv; sensible Owner-/Staff-Bereiche zusätzlich geschützt (Step-up / Allowlist, falls vorhanden) ODER ehrlich nicht exponiert.
- [ ] **Cloudflare Turnstile** auf allen öffentlichen Formularen (Reservierung, Onboarding, Kontakt). **WAF/Rate-Limits** auf Login, Reservierung, Onboarding-Invite, Zahlungs-/Checkout-Flows.
- [ ] **Zod-Validierung an allen Eingangsgrenzen** der Edge Functions (`create-checkout`, `stripe-webhook`). Rechteprüfung serverseitig vor jeder Mutation.
- [ ] **Kein stiller Fehler:** kein `if(!orgId) return null` ohne 403; kein unescaptes User-Input im DOM.

### D. QA — Build, Migrationen & Tests

- [ ] **Fresh Clone läuft / CI grün:** `npm run build` (TypeScript strict) ohne Fehler; Cloudflare-Pages-Build reproduzierbar.
- [ ] **Migrationen laufen sauber** (Fresh-Setup über `supabase/setup_all.sql` bzw. `migrations/0001→0003` + `seed.sql`). Additiv, keine destruktiven Schritte ohne Rollback-Pfad.
- [ ] **CI grün ODER Restfehler klassifiziert** und nachweislich **nicht P0/P1**.
- [ ] **Release-Artefakt sauber** (Hygiene-Check: keine Secrets/`.env`/`.claude`/Build-Müll).
- [ ] **Kernseiten haben Smoke-Tests** (Finder, Hof-Detail, Reservierung, Checkout/Zahlbestätigung).
- [ ] **Leere Daten verursachen keine 500** — überall **Zero-State** (`available:false` + leere Arrays, UI „Noch keine Daten").
- [ ] **Cross-Tenant-Negativtests bestehen** (siehe C). **Plan-Gate-Tests** und **Rollen-Gate-Tests** (Käufer/Erzeuger/Staff) bestehen.
- [ ] **Webhook-Idempotenz-Test** grün (siehe B).

### E. Enterprise — Audit, Betrieb & Compliance

- [ ] **Audit vorhanden** (immutable, exportierbar): jede kritische Mutation protokolliert **wer/was/warum** (`reason` Pflicht bei kritischen Aktionen) — Hof-Verifizierung, Plan-/Tarifwechsel, Zahlungs-/Auszahlungsereignisse, Staff-Eingriffe.
- [ ] **Rechts-/Datenschutztexte vorbereitet** (`WAVE_14`): Impressum, Datenschutz, AGB, **Lebensmittel-Kennzeichnungs-Hinweis**, AVV/TOMs (`docs/launch/B_rechtstexte/`).
- [ ] **Backup-/Restore** der Supabase-DB dokumentiert und mindestens einmal getestet.
- [ ] **Support-/Incident-Prozess existiert** (Staff/Support-Andockung aus `WAVE_07`; `docs/INCIDENT_RUNBOOK.md`).
- [ ] **SLA/Zusagen nur bei operativer Deckung** — keine Versprechen ohne Betriebsabdeckung.

### F. UX — Editorial-Disziplin & Wahrheit

- [ ] **Keine toten Links, keine kaputten Cards, keine unklaren Nullwerte.**
- [ ] **Keine falsche Sichtbarkeit** — Rollenmatrix vollständig (Käufer/Erzeuger/Staff, `WAVE_03`).
- [ ] **Professionelle Empty States** auf allen Kernseiten (Finder ohne Treffer, Hof ohne Verfügbarkeit, keine Reservierungen).
- [ ] **Dashboard hat Managementwahrheit** — jede KPI erklärbar, kein Deko-KPI (`WAVE_05`: Reservierungen, aktive Höfe, Conversion).
- [ ] **Keine Deko-Emojis in produktiver UI.** Nur Design-System-Tokens (`app/src/styles/theme.css`), keine hardcodierten Farben/Schwellwerte.
- [ ] **Mobile/PWA-tauglich** auf Kernseiten; **Scope-Transparenz** sichtbar (Region/Zeitraum/Datenstand).

### G. Public / Privacy

- [ ] **Keine sensiblen Daten ungewollt öffentlich** (Reservierungen, Kontaktdaten, Zahlungen) — nur explizit erlaubter Public-Katalog ist offen.
- [ ] **Datenschutz/Impressum von allen relevanten Surfaces verlinkt** (Landing, App, Onboarding, Checkout).
- [ ] **`noindex`-Entscheidung pro Surface dokumentiert** (App-Innenflächen, Owner-/Staff-Bereiche → `noindex`; Marketing-Landing indexierbar).
- [ ] **Cookie-/Consent-Pfad** für öffentliche Flächen vorhanden, wo erforderlich (Turnstile/Analytics).

### H. Finance / Governance

- [ ] **Zahlungs-/Abo-/Auszahlungsereignisse sind auditierbar** und nachvollziehbar.
- [ ] **Hof-Verifizierungen und Statuswechsel** (z. B. Hof aktiv/gesperrt, Bewertung moderiert) sind auditierbar.
- [ ] **Finance-/Daten-Export** (sofern vorhanden) ist auditiert und org-gebunden.
- [ ] **Kritische Aktionen** folgen dem Muster **Confirm + Reason (Pflicht) + Risk-Level + serverseitiges Audit**.

---

## Teil 2 — Strenge Definition of Done (pro Ticket / Slice)

Eine Aufgabe ist **NUR** fertig, wenn **ALLE** Punkte erfüllt sind:

- [ ] Code umgesetzt, inkrementell (bestehende Struktur erweitert, keine Parallelstruktur)
- [ ] **Serverseitige Guards vorhanden** — UI-Ausblendung reicht nie (RLS/Edge-Rechteprüfung)
- [ ] UI-Zustand korrekt (Lade-/Leer-/Fehler-Zustand real auslösbar und sichtbar)
- [ ] **Zero-State** korrekt (keine 500 bei leeren Daten)
- [ ] Error-State korrekt (keine `TypeError`/401-Schleifen in der Konsole)
- [ ] **Tests vorhanden** ODER bewusst begründet nicht vorhanden (mit Risiko-Hinweis) — bei RLS/Payment/Rollen ist Test **Pflicht**
- [ ] Doku aktualisiert (`docs/` und ggf. Welle-Datei + `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md`)
- [ ] **Kein bestehender Kernflow gebrochen** (Retrofit-Check: Was kann brechen? Feature-Flag? Rollback?)
- [ ] Plan-/Rollen-/Tenant-Auswirkungen geprüft (Käufer/Erzeuger/Staff + org_id)
- [ ] Relevante Release-Gates laufen weiterhin grün (insb. Isolationstest)
- [ ] **Audit-Eintrag** bei sensiblen Aktionen (wer/was/warum)
- [ ] **CSRF-/Signaturschutz** bei Mutationen/Webhooks; **Rate-Limit** bei sensiblen Flows
- [ ] Abschlussbericht nennt Tests und Risiken **ehrlich**

**Keine dieser Punkte ist optional.** Ein „fertig" ohne Test ist kein „fertig" — entweder Test schreiben oder Risiko explizit dokumentieren. (Test-Integrität: Code an Tests anpassen, nie Tests zurechtbiegen.)

---

## Teil 3 — Abschlussbericht-Format (Pflicht pro Welle)

Nach Abschluss jeder Welle (oder größeren Slice) liefere **genau** diese Struktur:

```text
## Abschlussbericht — WAVE_XX <Name>

### 1. Geprüfte Repo-Bereiche
- Dateien:        (z. B. app/src/..., app/supabase/migrations/...)
- Routen/Seiten:  (z. B. FinderPage, Hof-Detail, Checkout)
- Edge Functions: (z. B. create-checkout, stripe-webhook)
- Tabellen/RLS:   (betroffene Tabellen + Policies)
- Tests:

### 2. Getroffene Produktentscheidungen
- Triage: Bug vs. Rollen-/Sichtbarkeit vs. UX vs. Ausbau vs. Commercial
- (Für jede Entscheidung: Begründung + Risiko)

### 3. Umgesetzte Änderungen
- (Fachlich beschrieben, nicht nur Dateiliste)
- Code:
- DB/Migration:
- Doku:
- Tests:

### 4. Aktualisierte Dokumente
- (docs/-Dateien, Welle-Dateien, PHASE_STATUS.md, MASTER_INDEX.md)

### 5. Tests und Checks
- Befehl: (z. B. npm run build · Isolationstest · Webhook-Idempotenz)
- Ergebnis:
- Offene Fehler:
- Manuelle Prüfschritte (mit Owner + Datum):

### 6. P0/P1-Status
- Gelöst:
- Offen:
- Bewusst verschoben (mit Begründung):

### 7. Risiken vor Pilot / Enterprise
- (Konkret, nicht generisch — mit Schweregrad + Mitigation)

### 8. Welle-übergreifende Erkenntnisse
- (Was gehört in CLAUDE.md / andere Wellen? → Owner fragen, nicht selbst übernehmen)

### 9. Nächster sinnvoller Slice
- (NUR eine klare Empfehlung)
```

**Verbotene Abschluss-Formate:**
- Reine Dateiliste ohne Fachbeschreibung
- „Erledigt" ohne Test-Bezug
- „Alle Tests grün" ohne Ausführungs-Nachweis
- Schwammige Risiko-Aussagen („könnte vielleicht…")
- Verschweigen von Restfehlern

---

## Teil 4 — Wann ist die Finalisierungswelle (Phase 1) abgeschlossen?

Erst wenn **alle** folgenden Bedingungen erfüllt sind:

1. **Alle 16 Wellen (WAVE_00 bis WAVE_15)** sind als **grün** gemeldet (`docs/releases/PHASE_STATUS.md`).
2. **Isolationstest grün** über alle Migrationstabellen (Plattform- **und** Org-Isolation) — blockierendes Gate.
3. **Kernflow end-to-end mit echten Daten:** Finder → Hof-Detail → Verfügbarkeit → Reservierung/Abholfenster (Supabase, nicht Seed).
4. **Globales Go-Live-Gate (Teil 1, A–H)** ohne offene Punkte.
5. **Definition of Done (Teil 2)** für jedes erstellte Ticket erfüllt.
6. **Owner hat den finalen Status bestätigt** — **nicht Claude entscheidet „fertig", sondern der Owner nach Prüfung.**

> **Hinweis zum Marktstart:** Nach diesem Phase-1-Gate folgen als Pflicht noch **Phase 2 (Gates A–F + Cloudflare-Deploy + Domain + Security-Header)**, **Phase 3 (Ops-Gate)** und **Phase 5 (Gate 10 = erste zahlende Erzeuger)**. Dieses Gate macht das Produkt *fertig*; die nachgelagerten Gates machen es *live*.

---

## Teil 5 — Owner-Freigabe (verbindliche Schlusssignatur)

Das Phase-1-Gate gilt erst als bestanden, wenn der Owner aktiv bestätigt:

```text
GO-LIVE-GATE PHASE 1 — OWNER-ENTSCHEID

Geprüft von:      (Owner)
Datum:
Build-/Commit:    (Hash, falls freigegeben)
Isolationstest:   [ ] grün   Befehl/Nachweis:
Kernflow E2E:     [ ] grün   Nachweis (Screenshot/Run):
Teil 1 (A–H):     [ ] alle Punkte erfüllt   Offene Ausnahmen (begründet):
Geldfluss aktiv:  [ ] Erzeuger-Abo  [ ] SB-Bezahlung   (mind. einer)

Entscheid:        [ ] FERTIG (Phase 1) – Freigabe für Phase 2
                  [ ] NICHT FERTIG – offene Punkte:
Unterschrift:     (Owner)
```

---

## Letzter Hinweis

**Ziel ist nicht:** „LokaleBauernConnect sieht gut aus."
**Ziel ist:** Die Plattform hält einer seriösen Due-Diligence, einer Erzeuger-/Pilot-Demo und einem echten Go-Live stand — als regionaler Vermittler, der Höfe und Käufer sicher zusammenbringt und (über Abo oder SB-Bezahlung) den ersten echten Geldfluss trägt.

Wenn ein Eintrag dieses Gates praktisch nicht erfüllbar erscheint — **Stop. Owner einbeziehen.** Entweder das Feature so anpassen, dass es das Gate besteht, oder es ehrlich nicht launchen.
