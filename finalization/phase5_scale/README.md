# LokaleBauernConnect — Phase 5: Skalierung 10 → 300 & selbstlernende `CLAUDE.md`

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C
> Stack: React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF, Cache API/Edge-Cache) · Stripe (+ Connect)
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Vertrag & Zahlung entstehen **direkt zwischen Käufer:in und Hof**. Disclaimer durchgängig.
> **Bezug:** `../README.md` (Phase-1-Index) · `../99_GOLIVE_GATE.md` (Phase-1-Gate, A–H) · `../phase2_release/README.md` (Gates A–F) · `../phase4_vertical/TRACK_E_DATABASE.md` (Datenmodell-Skalierung) · `PHASEN.md` (Phase 5) · `MASTER_INDEX.md` (Abschnitt 0 + 7) · `docs/releases/PHASE_STATUS.md` · `CLAUDE.md` (7 Produktionspfeiler, §0-Direktive).
> **Adaptiert** aus der TempConnect-Skalierungs-/Selbstlern-Maschine (read-only Referenz, falls vorhanden) auf diese Domäne und diesen Stack. Keine VMS-/Self-Host-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne übersetzt.

Dieses Verzeichnis (`finalization/phase5_scale/`) ist die **Werkbank für Phase 5** — den Schritt von „live mit 10 Höfen" zu **„trägt 300 Höfe und zahlende Erzeuger ohne Latenz-Einbruch, ohne RLS aufzuweichen, ohne Kostenexplosion"** — und zugleich die **Selbstlern-Schleife**, die jede Erkenntnis aus dem Wachstum kontrolliert in den Kanon (`CLAUDE.md` / Wellen / Tracks) zurückspielt. Phase 5 ist **Pflicht-Block des Marktstart-Sets** (`PHASEN.md`): **Gate 10 (erste zahlende Erzeuger)** ist nicht optional.

> **Abgrenzung zu Phase 4 · Track E:** Track E baut die **Datenmodell-Wachstumsschicht** (Materialized Views, Caching-Stufen, Geo-Box, Volltext, Verlaufsdaten-Lebenszyklus, Last-Benchmark gegen 300-Hof-Synthetik) und liefert das blockierende **Track-E-Scale-Gate**. **Phase 5 baut keine neue Fachlogik und keine neuen Indizes** — sie **misst, verdichtet und gatet**: Sie validiert die ganze Plattform (nicht nur die DB) gegen wachsende reale Kundenzahlen (10/50/100/300), schärft die Produktpolitur gegen austauschbare SaaS-Masse und betreibt die Selbstlern-Schleife. Wer hier neue Tabellen oder Features einzieht, hat die Phase verwechselt (Track E bzw. Phase 1/4).

---

## 0. Zweck dieses Verzeichnisses — „skaliert & lernt"

`phase5_scale/` ist **kein** Ablageort für Feature-Code, sondern die **kontrollierte Skalierungs- und Lern-Maschine**. „Skaliert" bedeutet konkret und nachweisbar — nicht als Gefühl, sondern als gemessene Zahl (`CLAUDE.md §0.4`):

1. **Kunden-Skalierung statt Last-Theorie.** Phase 5 denkt in **echten Kohorten** — 10 → 50 → 100 → 300 Höfe (und die zugehörigen Käufer:innen) — nicht nur in synthetischen Last-Profilen. Jede Stufe ist ein eigenes **Customer-Gate** (`CUSTOMER_GATES.md`): Onboarding-Tragfähigkeit, Support-Last, Geldfluss-Stabilität, Performance-Budget, Daten-/Kostenkurve. Synthetische Last (Track E) beweist die *technische* Tragfähigkeit; die Customer-Gates beweisen die *betriebliche* (Onboarding, Support, Abrechnung, Auszahlung).
2. **Gate 10 = erste zahlende Erzeuger (Marktstart-Pflicht).** Phase 5 ist erst dann für den Marktstart erfüllt, wenn **mindestens ein echter Geldfluss** (Erzeuger-Abo `WAVE_09` **oder** SB-Bezahlung Track A) mit **realen, zahlenden Höfen** stabil läuft — signaturgeprüft, idempotent, auditiert, mit funktionierender Quittung und (bei SB) korrektem Connect-Payout an den Erzeuger.
3. **Performance unter Verlaufsdaten, nicht nur im Leerlauf.** Die in Track E definierten Budgets (Finder p95 ≤ 120 ms DB / ≤ 50 ms Edge-Hit, Hof-Detail ≤ 80 ms, SB-Report ≤ 150 ms, Owner-KPI aus MV ≤ 20 ms) bleiben **unter wachsender realer Last** eingehalten — Pagination/Keyset, Indizes, kein N+1, Edge-Cache nur für anonymen Katalog, kritische Wahrheiten nie gecacht.
4. **Produktpolitur gegen die SaaS-Masse.** Skalierung ist auch eine **Differenzierungs**-Aufgabe: Editorial-Disziplin, Vermittler-Wahrheit, Frische-Signal, Saison-Radar und der **SB-Bezahl-USP** machen LokaleBauernConnect unverwechselbar — nicht zu „noch einem Verzeichnis". Maßstab: State-of-the-Art von übermorgen, nicht Branchenmittel von heute (`CLAUDE.md §0.7`).
5. **Selbstlernende `CLAUDE.md` statt Doku-Verfall.** Jede wiederverwendbare Erkenntnis aus dem Wachstum durchläuft die Schleife **insights → distill → apply → consolidate** (`SELF_UPDATING_CLAUDE_MD.md`) — **getaktet**, **mit Owner-Review**, nie pro Nachricht und nie selbst-übernommen. So wächst der Kanon mit der Plattform, ohne aufzuweichen.
6. **Wirtschaftlichkeit als Gate-Größe.** Skalierung ist ein **Kosten**-Thema (`CLAUDE.md §0.3`): Supabase-Compute, Egress, Edge-Requests, Auszahlungs-/Stripe-Gebühren pro Hof werden je Customer-Gate beobachtet. „Skaliert" heißt auch: die Unit-Economics tragen 300 Höfe, nicht nur die Latenz.
7. **Imperium-Beschleuniger.** Jedes hier verdichtete Muster (MV + security-definer-RPC, Edge-Cache nur für anonymen Katalog, Customer-Gate-Schema, Selbstlern-Schleife) ist so zu formulieren, dass es in den **14 Tochterplattformen** wiederverwendbar ist (`CLAUDE.md §0` Imperium-Denken) → `.claude/memory/patterns/`.

> **Grundsatz:** Phase 5 ist erst „fertig", wenn ein echter, **zahlender** Erzeuger live ist (Gate 10), die Plattform die nächste Kohorte ohne Budget-/Isolations-/Kostenbruch trägt — und die Lern-Schleife mindestens einen vom Owner freigegebenen Kanon-Eintrag produziert hat. „Hält die Last im Test" ist nicht „trägt zahlende Kunden im Betrieb".

---

## 1. Eingangsbedingung (harter Vorgate)

Phase 5 **startet nicht**, bevor Folgendes erfüllt ist (Quelle: `PHASEN.md` → Marktstart-Pflicht-Set; `../99_GOLIVE_GATE.md`, Teil 4; `../phase2_release/README.md`, Abschnitt 9; `TRACK_E_DATABASE.md`, Abschnitt 12):

- [ ] **Phase-1-Go-Live-Gate grün** — alle Wellen `WAVE_00…WAVE_15` als grün in `docs/releases/PHASE_STATUS.md`; Isolationstest grün über `0001_core.sql` / `0002_payments.sql` / `0003_marketplace.sql`.
- [ ] **Phase-2-Release-Gate grün** — Gates A–F, Cloudflare-Pages-Deploy auf eigener Domain, erzwungenes HTTPS/HSTS, Security-Header/CSP, Burn-in ≥7 Tage ohne offene P0/P1, Owner-Sign-off Phase 2.
- [ ] **Phase-3-Ops-Gate grün** — minimale Betriebszentrale (Owner/Staff-Sicht: Hof-Operations, Billing-Übersicht, Monitoring/Incidents, Feature-Flags, Audit; kritische Aktion = Confirm + Reason + serverseitiges Audit).
- [ ] **Mindestens ein Geldfluss produktiv** — Erzeuger-Abo (`WAVE_09`) **oder** SB-Bezahlung (`TRACK_A_SB_PAYMENT.md`); Stripe-Webhook signaturgeprüft & idempotent, Quittung zuverlässig erzeugt.
- [ ] **Track-E-Scale-Gate grün** *für die jeweils adressierte Stufe* — verbindlich, bevor **Customer-Gates 100/300** freigegeben werden (Datenmodell-Skalierung trägt die Verlaufsdaten-Last). Für **Gate 10/50** genügt der Phase-2-Performance-Nachweis (Gate E); Track E ist Vorgate für 100/300.

> Ist eine dieser Bedingungen offen → **zurück in die zuständige Phase**, nicht in Phase 5 vorarbeiten. Phase 5 validiert Skalierung und betreibt das Lernen — sie repariert keine Fundament-Lücke. (Stop-Regel 13, `00_RULES.md`.)

---

## 2. Bausteine — Phase 5 (verbindlich)

> Quelle der Wahrheit für Inhalt & Reihenfolge: `PHASEN.md` → „Phase 5 — Skalierung & Selbstlernen" und `MASTER_INDEX.md` (Abschnitt 7: `phase5_scale/{PHASES_A_TO_R, CUSTOMER_GATES, SELF_UPDATING_CLAUDE_MD}.md`). Live-Status: `docs/releases/PHASE_STATUS.md`.

Phase 5 zerfällt in **drei in sich geschlossene Bausteine** plus diese Übersicht. Jeder Baustein hat Scope, Akzeptanzkriterien, Nachweis und Abschlussbericht (Format siehe Abschnitt 7).

| Baustein | Datei | Inhalt | Nachweis (grün =) |
|---|---|---|---|
| **A** | `CUSTOMER_GATES.md` | Customer-Gates **10/50/100/300**: pro Stufe Onboarding-Tragfähigkeit, Support-Last-Budget, Geldfluss-Stabilität, Performance-Budget (Track-E-Größen), Daten-/Kosten-Kurve. **Gate 10 = erste zahlende Erzeuger.** | Stufe nachweislich getragen: reale/synthetische Kohorte + Budgets eingehalten + Geldfluss + Isolation grün. |
| **B** | `PHASES_A_TO_R.md` | Feinphasen **A…R** der Skalierungs-/Politur-Arbeit (Mess-Setup → Performance-Härtung-Validierung → Produktpolitur → Kosten-Disziplin → Differenzierung gegen SaaS-Masse → Gate-Sign-off). Eine Feinphase je Session. | Jede Feinphase liefert ihren Nachweis (Benchmark, Screenshot, Budget-Dump, Lern-Eintrag). |
| **C** | `SELF_UPDATING_CLAUDE_MD.md` | Die **selbstlernende `CLAUDE.md`**: Mechanik der Schleife **insights → distill → apply → consolidate**, Takt, Owner-Review-Pflicht, Schreibpfade (`.claude/learning/`, `.claude/memory/`), Konflikt-/Widerlegungsregeln. | Schleife läuft getaktet; ≥1 vom Owner freigegebener Kanon-Eintrag; kein selbst-übernommener Eintrag. |
| **Matrix** | `docs/finalization/10_300_customer_readiness_matrix.md` | Lebende **Readiness-Matrix 10→300**: je Stufe × Dimension (Onboarding/Support/Performance/Geldfluss/Kosten/Isolation/UX) der reale Soll-/Ist-Status. | Matrix gepflegt, kein Feld „unbekannt" für die aktive Stufe. |

**Begleit-Dokumente (jederzeit referenzierbar):**

| Datei | Zweck |
|---|---|
| `../00_RULES.md` | Arbeitsregeln, Triage, Output-/Abschlussbericht-Format, Stop-Regeln (gelten auch hier). |
| `../01_PRIORITIES.md` | P0/P1/P2/P3 — Skalierungs-/Geldfluss-/Isolations-Blocker vor Politur. |
| `../phase4_vertical/TRACK_E_DATABASE.md` | Datenmodell-Skalierung + Track-E-Scale-Gate (technischer Vorgate für Gate 100/300). |
| `.claude/learning/insights_inbox.md` · `config.md` | Eingang & Takt-Konfiguration der Selbstlern-Schleife (Baustein C). |
| `.claude/learning/proposals.md` · `applied_log.md` | Destillierte Vorschläge (Owner-Review) & Audit-Log übernommener Kanon-Änderungen. |
| `.claude/memory/patterns/` · `decisions/` | Imperium-Muster (Beschleuniger) & ADRs aus Skalierungsentscheidungen. |

> **Marktstart-Bezug:** **Gate 10** (erste zahlende Erzeuger) ist Pflicht-Block des **Marktstart-Pflicht-Sets** (`PHASEN.md`). Gates 50/100/300 sind Wachstums-Gates **nach** dem Marktstart — sie gehören in Phase 5, blockieren aber den ersten Launch nicht (außer Track-E-Vorgate für 100/300).

---

## 3. Dependency-Gates (harte Reihenfolge)

Skalierung ist eine Kette — die Gates laufen nicht beliebig parallel:

```
Vorgate: Phase-1-Gate + Phase-2-Gate (A–F) + Phase-3-Ops-Gate + mind. ein Geldfluss
         MÜSSEN grün sein, bevor Phase 5 startet.

Gate 10  (erste zahlende Erzeuger)  ist Marktstart-Pflicht und Voraussetzung für alles Weitere.
         Reale Höfe zahlen real (Abo ODER SB), Quittung/Payout korrekt, Audit + Isolation grün.

Gate 50  baut auf Gate 10 auf: Onboarding-Durchsatz + Support-Last bei 50 Höfen tragbar,
         Performance-Budget (Phase-2-Gate E) unter realer 50-Hof-Last gehalten.

Track-E-Scale-Gate (Phase 4) MUSS grün sein, BEVOR Gate 100/300 freigegeben werden
         (MVs, Geo-Box, Volltext, Verlaufs-Lebenszyklus, Last-Benchmark gegen 300-Hof-Synthetik).

Gate 100 läuft erst, wenn Gate 50 grün UND Track-E-Scale-Gate grün ist.
Gate 300 läuft erst, wenn Gate 100 grün ist; Partition-/Read-Replica-Entscheide nur mit Owner-Freigabe.

Selbstlern-Schleife (Baustein C) läuft GETAKTET über alle Stufen hinweg:
         insights (laufend, 1-Zeiler) → distill (Session-Ende) → apply (NUR nach Owner-Review)
         → consolidate (monatlich). Sie blockiert keine Stufe, begleitet jede.
```

> **Skalierungs-Regel:** Eine Kohorten-Stufe gilt erst als getragen, wenn **alle** Dimensionen (Abschnitt 4) im Budget sind — gemessen unter realer/synthetischer Last dieser Stufe, nicht angenommen. Ein P0/P1 (Isolations-Leck, gebrochener Geldfluss, Budget-Riss) **setzt die Stufe zurück**, keine Teilanrechnung. (Analog Burn-in-Regel Phase 2.)

---

## 4. Skalierungs-Dimensionen je Customer-Gate (verbindlich)

Jede Stufe (10/50/100/300) wird über **dieselben sieben Dimensionen** geprüft — eine Stufe ist erst grün, wenn **alle** grün sind. Dies ist das Schema von `CUSTOMER_GATES.md` und der `10_300_customer_readiness_matrix.md`:

| Dimension | Frage je Stufe | Nachweis |
|---|---|---|
| **Onboarding-Tragfähigkeit** | Schaffen wir N Höfe ohne manuellen Engpass durch den Erzeuger-Wizard (`WAVE_15`, datengetrieben/Zod)? | Onboarding-Durchsatz/Stunde; Wizard-Abbruchquote; keine toten Schritte. |
| **Support-Last** | Bleibt die Support-/Eskalations-Last (`WAVE_07`, Phase 3) je Hof tragbar? | Tickets/Hof/Woche; mittlere Lösungszeit; Eskalationspfad steht. |
| **Performance** | Halten die Track-E-Budgets (Finder/Detail/Report/KPI) unter N-Hof-Last? | `EXPLAIN (ANALYZE)`-Plan ohne Seq-Scan auf heißen Tabellen; p95 im Budget; Edge-Cache-Hit-Rate. |
| **Geldfluss-Stabilität** | Läuft der Geldfluss (Abo/SB) bei N Höfen idempotent, signaturgeprüft, mit Payout & Quittung? | Webhook-Idempotenz-Test; Stripe-Live-Beleg; Connect-Payout-Nachweis; Audit-Eintrag. |
| **Tenant-Isolation** | Bleibt RLS deny-by-default dicht — keine MV/RPC/Cache-Schicht leckt? | Cross-Org-Negativtest = 403/0 Zeilen; MV nicht direkt für anon/authenticated lesbar. |
| **Kosten / Unit-Economics** | Tragen die Plattformkosten je Hof (Supabase-Compute/Egress, Edge, Stripe-Gebühr) die Stufe? | Kosten/Hof/Monat; Origin-Hit-Rate; teure Pfade (Read-Replica/Extension) nur mit Owner-Freigabe. |
| **UX / Differenzierung** | Bleibt das Produkt unverwechselbar (Editorial, Frische, Saison, SB-USP, Vermittler-Wahrheit)? | Empty-States real; Disclaimer durchgängig; keine Deko-KPIs; keine austauschbare SaaS-Masse. |

> **Vermittler-Wahrheit bleibt skalierungsfest:** Keine Skalierungs-Optimierung (Aggregat-MV, Edge-Cache, vorberechneter Bestand) darf Eigenverkauf, garantierte Menge/Lieferung oder eine Beratung suggerieren. Verfügbarkeit = Erzeuger-Selbstauskunft mit Frische-Signal — auch bei 300 Höfen. (`00_RULES.md` §15, Stop-Regel 6 Track E.)

---

## 5. Die Selbstlern-Schleife (`CLAUDE.md`) — Mechanik

Detail-Spezifikation: `SELF_UPDATING_CLAUDE_MD.md`. Schreibpfade: `.claude/learning/` (Imperium-Root, je `CLAUDE.md §12` / `00_RULES.md §12`). Hier der verbindliche Überblick — **die Schleife ist getaktet, nie pro Nachricht, und ändert den Kanon nie ohne Owner-Review:**

```
insights      Laufend während der Arbeit: jede wiederverwendbare Lektion als 1-Zeiler nach
   │          .claude/learning/insights_inbox.md — mit Kategorie (EFFIZIENZ / WIRTSCHAFTLICHKEIT /
   │          TECHNIK) und Quelle (Welle/Track/Gate). Kein Edit am Kanon hier.
   ▼
distill       Session-/Stufen-Ende: Inbox sichten, Duplikate/Widerlegtes markieren, echte Muster
   │          zu konkreten Vorschlägen verdichten → .claude/learning/proposals.md
   │          (max. 3 Sätze je Vorschlag: Was ändern? Wo? Warum jetzt?).
   ▼
apply         NUR nach ausdrücklicher Owner-Bestätigung: Vorschlag in den Kanon übernehmen
   │          (CLAUDE.md / PHASEN.md / Welle / Track / .claude/memory/patterns|decisions).
   │          Übernahme protokollieren in .claude/learning/applied_log.md (wer/was/warum/Datum).
   │          Bei Ablehnung: verwerfen, nicht zweimal vorschlagen (00_RULES.md §12 / README §7).
   ▼
consolidate   Monatlich: applied_log + Kanon konsolidieren — Redundanz mergen, widerlegte
              Annahmen korrigieren (nicht duplizieren), Muster auf Imperium-Tauglichkeit prüfen
              („Funktioniert das Pattern in 20 anderen Projekten?"). Stale-Wahrheit entfernen.
```

**Eiserne Regeln der Schleife (nicht verhandelbar):**

1. **Owner besitzt den Kanon.** `apply` passiert **nie** automatisch — nur nach expliziter Owner-Freigabe (`00_RULES.md §12`, README-Phase-1 §7, `CLAUDE.md §0`-Konfliktregel).
2. **Getaktet, nicht reaktiv.** `insights` laufend (billig, 1-Zeiler); `distill` am Session-/Stufen-Ende; `apply` nach Review; `consolidate` monatlich. Keine Kanon-Edits mitten im Feature-Flow.
3. **Konflikt-Hierarchie bleibt.** Ein Lern-Eintrag steht **unter** User-Anweisung > `AGENTS.md` > Subagent/Skill > `CLAUDE.md` > Wellen/Tracks. Er weicht Sicherheits-/Isolations-/Vermittler-Regeln **nie** auf.
4. **Widerlegen statt duplizieren.** Eine widerlegte Annahme wird **korrigiert**, nicht als zweiter Eintrag angehängt. `.claude/` gehört **nie** ins Release-Artefakt.
5. **Test-Integrität (`CLAUDE.md §0.9`).** Kein Lern-Eintrag rechtfertigt das Zurechtbiegen oder stille Skippen eines Tests. Tests sind die Spezifikation; Code folgt Tests.

---

## 6. Wie ein Baustein / eine Stufe pro Session bearbeitet wird

**Pro Arbeitssession — verbindliche Reihenfolge:**

1. Zuerst `CLAUDE.md` (Stimme, 7 Produktionspfeiler, §0), dann `AGENTS.md`, dann `00_RULES.md` lesen.
2. `PHASEN.md` → „Phase 5" + `docs/releases/PHASE_STATUS.md` öffnen und die **nächste offene Stufe / Feinphase** bestimmen.
3. Genau **einen** Baustein / **eine** Customer-Stufe wählen (`CUSTOMER_GATES.md` oder eine Feinphase aus `PHASES_A_TO_R.md`) — und nur diesen abarbeiten. Niemals mehrere Stufen gleichzeitig.
4. Dependency-Kette (Abschnitt 3) prüfen: Sind alle Vorgate grün (Phase 1/2/3 + Geldfluss; für 100/300 zusätzlich Track-E-Scale-Gate)? Wenn nein → blockierendes Gate zuerst.
5. Stufe **end-to-end messen**: Last-Setup (real/synthetisch je Stufe) → alle sieben Dimensionen (Abschnitt 4) prüfen → Budgets gegen Track-E-Größen → Isolations-Regression → Nachweis sammeln. Keine TODOs, keine behauptete Zahl ohne Beleg.
6. **Owner-Freigabe** für alles Kostenpflichtige/Irreversible (Prod-Migration, Extension, Read-Replica, Scheduler/Edge-Cache scharf schalten, Stripe-Live-Skalierung, jeder `commit`/`push`) — siehe Abschnitt 8 — **bevor** real geschaltet wird.
7. **Selbstlern-Schleife** bedienen: Lektionen als 1-Zeiler in `insights_inbox.md`; am Stufen-Ende `distill` → `proposals.md`; Kanon-Übernahme **nur** nach Owner-Review.
8. Am Ende: **Abschlussbericht** (Format aus `../99_GOLIVE_GATE.md`, Teil 3) schreiben, `10_300_customer_readiness_matrix.md` für die Stufe aktualisieren und `docs/releases/PHASE_STATUS.md` (+ ggf. `MASTER_INDEX.md` Abschnitt 7) auf den realen Stand setzen.

**Niemals:** mehrere Customer-Gates gleichzeitig „grün" erklären · eine Budget-Zahl ohne `EXPLAIN`/Messung behaupten · die Lern-Schleife selbst-übernehmen lassen · ein Gate verkürzen, „weil Wachstum drängt".

---

## 7. Abschlussbericht-Format pro Stufe / Baustein (verbindlich)

Identisch zum Welle-/Gate-Format aus `../99_GOLIVE_GATE.md` (Teil 3), mit Skalierungs-Fokus:

```text
## Stufe/Baustein abgeschlossen: Phase 5 · <Customer-Gate N / Baustein A–C>
- Geändert:        <Skripte / Benchmarks / Matrix / Doku / .claude/learning — konkret, mit Pfaden>
                   (Phase 5 ändert KEINE Fachlogik/Migration — sonst falsche Phase, siehe §0)
- Last-Setup:      <reale Kohorte (N Höfe/zahlend) und/oder synthetischer Seed (Track E seed_scale)>
- Dimensionen:     <Onboarding · Support · Performance · Geldfluss · Isolation · Kosten · UX — je grün/offen>
- Budgets (p95):   <Finder · Hof-Detail · SB-Report · Owner-KPI(MV) — Soll vs. gemessen, mit Beleg>
- Geldfluss:       <Abo/SB · zahlende Höfe · Webhook-Idempotenz · Quittung · Connect-Payout — Nachweis>
- Isolation:       <Cross-Org-Negativtest = 403/0 · MV nicht direkt lesbar — Ergebnis>
- Kosten/Hof:      <Supabase/Edge/Stripe je Hof; Origin-Hit-Rate; Owner-Freigaben für teure Pfade>
- Lern-Schleife:   <insights gesammelt? distill→proposals? Owner-Review-Stand? applied_log-Eintrag?>
- Disclaimer:      <Vermittler-/Lebensmittel-Hinweis bei Skalierung weiterhin durchgängig sichtbar?>
- Risiken:         <offene Punkte, Annahmen, Owner-Entscheidungen, Rollback>
- Nächste Stufe:   <nach Dependency-Kette>
```

Danach `docs/releases/PHASE_STATUS.md` (Stufe → grün) und `10_300_customer_readiness_matrix.md` aktualisieren; — falls Doku-Soll aus `MASTER_INDEX.md` erfüllt — Status dort (Abschnitt 0 `.claude/learning/`, Abschnitt 7 `phase5_scale/*`) auf ✅ heben.

---

## 8. Owner-Freigabe & Stop-Regeln (Phase-5-spezifisch)

Phase 5 berührt **echtes Geld (zahlende Kunden), Plattformkosten und irreversible Plattform-Settings**. Folgendes wird **nur nach ausdrücklicher Owner-Freigabe** real geschaltet — bis dahin bleibt alles repo-lokal/reversibel (Skripte, Benchmarks, Doku, Lern-Vorschläge; kein Live-Schalten):

- **Stripe-Skalierung Test → Live** für eine neue Kohorte; **Connect-Onboarding** weiterer auszahlungsberechtigter Erzeuger.
- **Kostenpflichtige Plattform-Aktivierung** (aus Track-E-Stop-Regeln): PostGIS, `pg_trgm`, `pg_cron`, `pg_stat_statements`, **Read-Replica**, größere Compute-Instanz, Cloudflare-Cache-Reserve.
- **Scharfschalten** des Prod-Refresh-Schedulers (`refresh-metrics` Cron-Worker) und des **Edge-Cache-Proxys** (Track E, Abschnitt 4/5).
- **Verlaufsdaten-Partitionierung / Archiv-Job** gegen Prod (Track E, Abschnitt 7) — eigener, additiver, Owner-freigegebener Migrationsschritt.
- **Übernahme eines Lern-Eintrags in den Kanon** (`apply`, Abschnitt 5) und jeder `git commit` / `push` (Co-Author-Zeile anhängen).

**Stop-Regeln (anhalten, minimalen sicheren Fix vorschlagen, auf Owner-OK warten):**

1. **Eine Customer-Stufe ist praktisch nicht tragbar** (Budget-Riss, Support-Last explodiert, Kosten/Hof unwirtschaftlich) → **Stop, Owner einbeziehen.** Stufe nicht „grün" reden; entweder härten oder ehrlich verschieben.
2. **Skalierung würde RLS/Vermittler-Wahrheit aufweichen** (Aggregat/Cache leckt org-fremd; Bestand wird als verbindliches Angebot dargestellt) → **Stop**, Isolations-/Compliance-Bruch, nicht ausliefern (Track-E-Stop-Regel 4/6).
3. **Prod/Kosten/irreversibel nötig** (Extension, Read-Replica, Prod-Migration, Stripe-Live-Skalierung, Scheduler/Edge-Cache scharf) → **Stop**, Trade-off + Kosten in Klartext, Owner entscheidet (`CLAUDE.md §0.3`).
4. **Lern-Vorschlag widerspricht Sicherheits-/Isolations-/Vermittler-/Test-Integritäts-Regeln** → **Stop**, nicht übernehmen; Konflikt-Hierarchie sticht jeden Insight (Abschnitt 5).
5. **Gate 10 nicht ehrlich erreichbar** (kein realer zahlender Erzeuger, Quittung/Payout-Pfad tot) → **Stop**, Marktstart nicht freigeben; kein „halb zahlbar".

> Konflikt-Hierarchie: **User-Anweisung > AGENTS.md > Subagent/Skill > CLAUDE.md > diese Datei.** Stop-Regeln stechen das „Durcharbeiten" (`CLAUDE.md §0.8`): An echten Blockern wird angehalten — Sicherheit/Verifikation werden nie für Tempo geopfert.

---

## 9. Übergang & Marktstart-Bezug

Nach grünem **Gate 10** (erste zahlende Erzeuger) ist der **Phase-5-Pflichtanteil des Marktstart-Sets** erfüllt — zusammen mit Phase 1 (WAVE 02–15 + Isolationstest), Phase 2 (Gates A–F + Deploy + Domain + Security-Header), Phase 3 (Ops-Gate) und mindestens einem Geldfluss ist die Plattform **marktstart-bereit** (`PHASEN.md` → Marktstart-Pflicht-Set).

```
Phase 1 (WAVE 02–15 + Isolationstest)      ✔ Fundament & Kernprodukt
Phase 2 (Gates A–F + Deploy + Domain)      ✔ auslieferbar & gehärtet
Phase 3 (Ops-Gate)                         ✔ betreibbar
mind. ein Geldfluss (Abo ODER SB)          ✔ monetarisiert
Phase 5 Gate 10 (erste zahlende Erzeuger)  ✔ → MARKTSTART frei
   → Gate 50 → Gate 100 → Gate 300          Wachstum (100/300 erst nach Track-E-Scale-Gate)
   ↺ selbstlernende CLAUDE.md begleitet jede Stufe (insights→distill→apply→consolidate)
```

Die Wachstums-Gates **50/100/300** folgen **nach** dem Marktstart; **100/300** setzen das grüne **Track-E-Scale-Gate** voraus. Echter Umkreis-Distanz-Sort (PostGIS) bleibt **Track B (Karte)** mit eigenem ADR; Verlaufsdaten-Partition bleibt ein eigener, Owner-freigegebener Schritt (Track E, Abschnitt 7).

> **Tracker-Pflicht nach Abschluss:** `docs/releases/PHASE_STATUS.md` (Phase-5-Stufen) und `10_300_customer_readiness_matrix.md` auf den realen Stand setzen; `MASTER_INDEX.md` Abschnitt 0 (`.claude/learning/`) + Abschnitt 7 (`phase5_scale/*`) auf ✅ heben, sobald die jeweilige Datei real geliefert ist. Wiederverwendbare Muster (Customer-Gate-Schema · MV + security-definer-RPC mit `auth.uid()`-Bindung · Edge-Cache nur für anonymen Katalog · Selbstlern-Schleife mit Owner-Review) als **Imperium-Beschleuniger** nach `.claude/memory/patterns/` verdichten — gültig für alle 14 Tochterplattformen.

---

## Letzter Hinweis

**Ziel ist nicht:** „Die Plattform hält die Last im Benchmark."
**Ziel ist:** LokaleBauernConnect trägt **300 echte Höfe und zahlende Erzeuger** unter realer Last — RLS dicht, Geldfluss stabil, Kosten tragbar, Produkt unverwechselbar — **und** der Kanon lernt mit jedem Wachstumsschritt dazu, ohne je seine Sicherheits-, Isolations- und Vermittler-Disziplin aufzuweichen. **Gate 10 macht den Marktstart einlösbar; die Selbstlern-Schleife macht die Plattform mit der Zeit besser, nicht nur größer.**

Erscheint ein Eintrag dieser Phase praktisch nicht erfüllbar — **Stop. Owner einbeziehen.** Entweder die Stufe sauber tragen oder ehrlich verschieben (kein „halb skaliert", kein „fast zahlbar").
