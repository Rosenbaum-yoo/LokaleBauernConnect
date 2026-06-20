# MASTERPROMPT — Phase 5 (Skalierung 10 → 300 & selbstlernende `CLAUDE.md`) · LokaleBauernConnect

> **Zweck:** Diesen Prompt zu Beginn einer **Phase-5-Session** in Claude Code einfügen. Er aktiviert die **kontrollierte Skalierungs- und Selbstlern-Maschine** (Customer-Gates 10/50/100/300 + die Lernschleife `insights → distill → apply → consolidate`) **zusätzlich** zu den Phase-1-, Phase-2- und Phase-3-Regeln und gibt das verbindliche Arbeitsprinzip vor.
>
> **Geltung:** Phase 5 aus `PHASEN.md` (Skalierung & Selbstlernen). **Eine Customer-Stufe ODER eine Feinphase A–R ODER ein Baustein pro Session.** Phase-1/2/3-Regeln bleiben aktiv; Phase 5 ergänzt sie, hebt sie nie auf.
> **Konflikt-Hierarchie:** User-Anweisung > `~/AGENTS.md` (global) > `AGENTS.md` (Projekt) > Subagent/Skill > `CLAUDE.md` > `finalization/00_RULES.md` > `finalization/phase2_release/*` > `finalization/phase3_betrieb/*` > `finalization/phase5_scale/{README,CUSTOMER_GATES,PHASES_A_TO_R,SELF_UPDATING_CLAUDE_MD}.md` > diese Datei.
> **Stack fix (Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF, Cache API/Edge-Cache) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker, keine SCC-Logik, kein Self-Host-Admin-Panel.**
> **Rolle = VERMITTLER:** kein Eigenverkauf, keine Beratung, kein eigener Kaufvertrag. Vertrag & Zahlung entstehen **direkt zwischen Käufer:in und Hof**. Vermittler-Disclaimer durchgängig sichtbar (Finder, Detail, Reservierung, Checkout, SB-Bezahlung) — **auch unter Last und auch in jeder Owner-/Staff-Sicht mit Außenwirkung** (E-Mail, Quittung, Hof-Antwort). *Domain owns truth, Plattform owns aggregation & isolation.*

---

## Was Phase 5 ist — und was sie NICHT ist

**Phase 1** macht das Produkt *fertig* (Fundament + Kernprodukt, Wellen 00–15, Phase-1-Go-Live-Gate in `finalization/99_GOLIVE_GATE.md`).
**Phase 2** macht es *live* (Cloudflare-Pages-Deploy, Domain, Security-Header/CSP/HSTS, Gates A–F, Burn-in ≥ 7 Tage — `finalization/phase2_release/`).
**Phase 3** macht es *betreibbar* (schlanke, serverseitig harte Owner-/Staff-Betriebszentrale + Supabase-/Cloudflare-Ops, Ops-Gate — `finalization/phase3_betrieb/`).
**Phase 5** macht es **skalierbar & selbstlernend**: Aus „live mit 10 Höfen" wird **„trägt 300 Höfe und zahlende Erzeuger ohne Latenz-Einbruch, ohne RLS aufzuweichen, ohne Kostenexplosion"** — und jede Erkenntnis aus dem Wachstum fließt **kontrolliert** in den Kanon zurück. **Gate 10 (erste zahlende Erzeuger)** ist Pflicht-Block des Marktstart-Sets (`PHASEN.md`) — nicht optional.

> **Begriffs-Korrektur (verbindlich, gegen den TempConnect-Blueprint):** „Skaliert" ist hier **keine** Self-Host-/Hetzner-Frage und **keine** zweite Plattform. Skaliert wird **innerhalb** der Supabase/Postgres- und Cloudflare-Plattform. VMS-/Self-Host-Begriffe sind verboten und sind konsequent übersetzt: `SCC` → **Betriebszentrale (Owner/Staff-Konsole, Phase 3)** · `Hetzner Control` → **Cloud-Plattform-Sicht (Supabase + Cloudflare + Stripe)** · `Einsatzportal` → **Reservierung/Abholung + Erzeuger-Self-Service** · `Vendor Pool / Requisition / Stundenzettel / Matching-Engine` kommen **nicht** vor. „Kunde" = registrierte Käufer:innen (aggregiert) + zahlende **Erzeuger-Orgs**; „Hof" = `farms` / `org_locations` (inkl. unbemannter SB-Stand `is_unmanned`).

> **Abgrenzung zu Phase 4 · Track E (kritisch):** **Phase 5 baut KEINE neue Fachlogik, KEINE neuen Tabellen, KEINE neuen Indizes.** Track E (`finalization/phase4_vertical/TRACK_E_DATABASE.md`) baut die Datenmodell-Wachstumsschicht (Materialized Views, Caching-Stufen, Geo-Box, Volltext, Verlaufs-Lebenszyklus, 300-Hof-Synthetik) und liefert das **Track-E-Scale-Gate** (technischer Vorgate für Gate 100/300). **Phase 5 misst, verdichtet, gatet und lernt** — sie validiert die *ganze* Plattform (nicht nur die DB) gegen wachsende **reale** Kundenzahlen, schärft die Produktpolitur gegen austauschbare SaaS-Masse und betreibt die Selbstlern-Schleife. **Wer in Phase 5 eine Migration schreibt oder ein Feature einzieht, hat die Phase verwechselt** → Track E / Phase 1 / Phase 4 (Stop-Regel).

Phase 5 ist auch **kein** Doku-Berg und **keine** Auto-Edit-Maschine an `CLAUDE.md`. Die Lernschleife ist **getaktet** (insights laufend als 1-Zeiler · distill am Session-Ende · apply **nur** nach Owner-Review · consolidate monatlich) — **nie pro Nachricht, nie selbst-übernommen** (`SELF_UPDATING_CLAUDE_MD.md`, falls vorhanden; sonst erste Aufgabe der Session, siehe Setup-Block unten).

---

## Pflicht-Lesereihenfolge (VOR dem ersten Edit der Session)

Gezielt lesen (Ranges/Diffs statt Volldateien), unabhängige Reads bündeln — `CLAUDE.md §0.2` (Token-Effizienz). **Repo-genau:** keine Annahme über Dateien/Routen/Tabellen — erst per Glob/Grep verifizieren, dann referenzieren (`00_RULES.md §1.1`).

```text
1.  ~/AGENTS.md (global) + ~/CLAUDE.md (§0-Direktive, gilt immer)
2.  AGENTS.md (Projekt) + .claude/agents/* (bes. performance-cost-optimizer, db-rls-spezialist,
    payment-engineer, security-auditor, devops, qa-tester, compliance-officer)
3.  CLAUDE.md (7 Produktionspfeiler · §0-Direktive · Stop-Regeln · Verbote · „Domain owns truth, OCC owns aggregation")
4.  PHASEN.md (Abschnitt „Phase 5 — Skalierung & Selbstlernen" + Marktstart-Pflicht-Set → Gate 10)
5.  MASTER_INDEX.md (Abschnitt 0 .claude/learning · 4 Commercial · 5 Operations · 6 Testing · 7 Finalisierung)
6.  finalization/00_RULES.md  (nicht-verhandelbares Regelwerk aller Wellen)
7.  finalization/01_PRIORITIES.md  (P0–P3 + 7 Produktionspfeiler als Maßstab)
8.  finalization/99_GOLIVE_GATE.md  (Phase-1-Gate A–H — Eingangs-Vertrag)
9.  finalization/phase2_release/GATES.md + README.md  (Gates A–F + Performance-Gate E)
10. finalization/phase3_betrieb/MASTERPROMPT.md  (Ops-Gate — betrieblicher Eingangs-Vertrag von Phase 5)
11. finalization/phase5_scale/README.md  (Phase-5-Übersicht: 3 Bausteine + Matrix + Dependency-Gates)
12. finalization/phase5_scale/CUSTOMER_GATES.md  (Gates 10/50/100/300 · 4 Dimensionen · Last-Annahmen)
13. finalization/phase5_scale/PHASES_A_TO_R.md  (nur die adressierte Feinphase A–R)
14. finalization/phase4_vertical/TRACK_E_DATABASE.md  (Track-E-Scale-Gate + Performance-Budgets — Vorgate 100/300)
15. finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md  (Lernschleife)  ← falls vorhanden; sonst Setup-Block unten
16. docs/releases/PHASE_STATUS.md  (was bereits grün ist — kein Doppelbau)
17. docs/finalization/10_300_customer_readiness_matrix.md  (Readiness-Matrix)  ← falls vorhanden; sonst anlegen
18. .claude/CLAUDE_RECS.md + .claude/memory/ (INDEX + decisions/learnings/patterns) + .claude/learning/{config.md,insights_inbox.md}
```

> **Repo-Genauigkeit (Pflicht):** Existiert eine der Dateien 15/17 noch nicht (`SELF_UPDATING_CLAUDE_MD.md`, `docs/finalization/10_300_customer_readiness_matrix.md`), ist ihr **kanonisches Anlegen** Teil der Session (Quelle: `MASTER_INDEX.md` Abschnitt 0 + 7; `README.md` Abschnitt 2). **Niemals** auf eine nicht-existente Datei/Edge Function/Tabelle/Route verweisen oder Inhalte erfinden — erst verifizieren (`00_RULES.md §1.1`). `.claude/` liegt im **Repo-Root** (`<repo>/.claude/`), nicht unter `app/`.

---

## Eingangsbedingung (harter Vorgate — Phase 5 startet nicht ohne)

Quelle: `PHASEN.md` → Marktstart-Pflicht-Set · `README.md` Abschnitt 1 · `TRACK_E_DATABASE.md`.

- [ ] **Phase-1-Go-Live-Gate grün** — `WAVE_00…WAVE_15` grün in `docs/releases/PHASE_STATUS.md`; Isolationstest grün über `app/supabase/migrations/0001_core.sql` / `0002_payments.sql` / `0003_marketplace.sql` (Plattform- + Org-Isolation).
- [ ] **Phase-2-Release-Gate grün** — Gates A–F, Cloudflare-Pages-Deploy auf eigener Domain, erzwungenes HTTPS/HSTS, Security-Header/CSP, **Burn-in ≥ 7 Tage** ohne offene P0/P1, Owner-Sign-off Phase 2.
- [ ] **Phase-3-Ops-Gate grün** — minimale Betriebszentrale (Owner/Staff-Sicht: Hof-Operations, Billing-Übersicht, Monitoring/Incidents, Feature-Flags, Audit; kritische Aktion = Confirm + Reason + serverseitiges Audit).
- [ ] **Mindestens ein Geldfluss produktiv** — Erzeuger-Abo (`WAVE_09`) **oder** SB-Bezahlung (Track A); Stripe-Webhook signaturgeprüft & **idempotent** (`payment_events` PK = `event.id`), Quittung zuverlässig erzeugt, bei SB korrekter Connect-Payout an den Erzeuger.
- [ ] **Track-E-Scale-Gate grün** *für die adressierte Stufe* — verbindlicher Vorgate, bevor **Customer-Gate 100/300** freigegeben wird. Für **Gate 10/50** genügt der Phase-2-Performance-Nachweis (Gate E).

> Ist eine Bedingung offen → **zurück in die zuständige Phase**, nicht in Phase 5 vorarbeiten. Phase 5 validiert Skalierung und betreibt das Lernen — sie repariert keine Fundament-Lücke (`README.md` Abschnitt 1; Stop-Regel).

---

## Ziel der Phase-5-Session (Auftrag)

> **Bringe LokaleBauernConnect von „live mit wenigen Höfen" zu „trägt die nächste reale Kundenstufe (10 → 50 → 100 → 300 zahlende Erzeuger) nachweislich" — gemessen, nicht behauptet: alle Performance-Budgets unter realer/synthetischer Last gehalten, RLS deny-by-default dicht, Geldfluss idempotent & auditiert, Unit-Economics tragend, Produkt unverwechselbar (Editorial, Frische, Saison, SB-USP, Vermittler-Wahrheit) — und betreibe die Selbstlern-Schleife so, dass der Kanon mit jedem Wachstumsschritt besser wird, ohne je Sicherheit, Isolation oder Vermittler-Disziplin aufzuweichen. Beweis oder kein PASS.**

Konkret in dieser Phase (je nach gewähltem Baustein/Stufe — **immer nur einer pro Session**):

1. **Reifeprüfung zuerst (read-only).** Vor jeder Änderung den Ist-Zustand der Zielstufe gegen die **vier Betriebs-Dimensionen** (`CUSTOMER_GATES.md`: Performance · Ops · Support · Billing) und die **7 Produktionspfeiler** lesen und in der **Readiness-Matrix** (`docs/finalization/10_300_customer_readiness_matrix.md`) als Soll/Ist festhalten. Keine behauptete Zahl ohne Beleg.
2. **Eine Customer-Stufe end-to-end messen.** Last-Setup (real/synthetisch je Stufe via Track-E-Seed) → alle Dimensionen prüfen → Budgets gegen Track-E-Größen → **Isolations-Regression** (Cross-Org = 403/0 Zeilen) → **Geldfluss** (Webhook-Idempotenz, Quittung, Connect-Payout) → **Kosten/Hof** (Supabase-Compute/Egress, Edge-Requests, Stripe-Gebühr) → Nachweis sammeln.
3. **Performance-Härtung validieren, nicht neu bauen.** Die in Track E gebauten Budgets (Finder p95 ≤ 120 ms DB / ≤ 50 ms Edge-Hit · Hof-Detail ≤ 80 ms · SB-Report ≤ 150 ms · Owner-KPI aus MV ≤ 20 ms — Werte aus `CUSTOMER_GATES.md`/`TRACK_E_DATABASE.md`, **Konfig, nie hartkodiert**) unter wachsender realer Last halten: `EXPLAIN (ANALYZE)` ohne Seq-Scan auf heißen Tabellen, Keyset/Pagination, kein N+1, Edge-Cache **nur** für anonymen Katalog, kritische Wahrheiten nie gecacht.
4. **Wirtschaftlichkeit als Gate-Größe.** Kosten je Hof/Monat beobachten und je Stufe in der Matrix führen; teure Pfade (Read-Replica, PostGIS/`pg_trgm`/`pg_cron`/`pg_stat_statements`, größere Compute-Instanz, Cloudflare-Cache-Reserve) **nur mit Owner-Freigabe** (`CLAUDE.md §0.3`).
5. **Produktpolitur gegen die SaaS-Masse.** Editorial-Disziplin (nur `app/src/styles/theme.css`-Tokens, keine Deko-Emojis), echte Zero-States, Frische-Signal, Saison-Radar, SB-USP, durchgängige Vermittler-Wahrheit — Maßstab: State-of-the-Art von übermorgen (`CLAUDE.md §0.7`), nicht Branchenmittel von heute.
6. **Selbstlern-Schleife bedienen.** Wiederverwendbare Lektionen laufend als **1-Zeiler** in `.claude/learning/insights_inbox.md` (Kategorie EFFIZIENZ / WIRTSCHAFTLICHKEIT / TECHNIK + Quelle Welle/Track/Gate). Am Stufen-/Session-Ende **distill** → `.claude/learning/proposals.md`. Kanon-Übernahme (**apply**) **nur** nach Owner-Review; protokolliert in `.claude/learning/applied_log.md`.
7. **Gate-Sign-off + Tracker.** Stufe nur „grün", wenn **alle** Dimensionen + alle 7 Pfeiler grün sind (kein „fast grün"). Danach `docs/releases/PHASE_STATUS.md` + Readiness-Matrix auf den realen Stand setzen; wiederverwendbare Muster als Imperium-Beschleuniger nach `.claude/memory/patterns/`.

---

## Repo-Realität (repo-genau — kein Rebuild, nur Andocken/Messen)

> Quelle: `PHASES_A_TO_R.md` Abschnitt „Repo-Realität". Phase 5 **liest und misst** diese Artefakte, sie verändert sie nicht (außer Mess-/Doku-/Lern-Dateien).

| Reales Artefakt | Relevanz für Phase 5 |
|---|---|
| `app/supabase/migrations/0001_core.sql` (`orgs`, `profiles(role)`, `farms(verified)`, `user_role`-Enum `kaeufer/erzeuger/staff/owner`, `availability`, `reservations`, **`audit_log`**) | Isolations-Regression je Stufe gegen `audit_log` + `org_id`; Customer-Lifecycle dockt an `orgs`/`audit_log` an, baut nichts neu. |
| `0002_payments.sql` (`subscriptions`, `sb_payments`, `payment_events`, `payment_status`-Enum) | Geldfluss-Dimension liest/aggregiert **diese** Tabellen; `payment_events` PK = `event.id` = **Webhook-Idempotenz-Wahrheit** (Idempotenz-Test je Stufe). |
| `0003_marketplace.sql` (`is_org_member()` security definer, `org_members`, `org_locations(is_unmanned)`, `reviews(status)`) | `is_org_member()` = kanonische Org-Zugehörigkeit für Isolations-Negativtest; `org_locations.is_unmanned` = SB-Stand für Billing-/Kosten-Sicht. |
| `app/supabase/functions/{create-checkout,stripe-webhook}` + `_shared/{supabaseAdmin,cors,stripe,email}.ts` | EIN signaturgeprüfter, idempotenter Webhook (Geldfluss-Wahrheit); `service_role` **nur** in Edge; Resend-Mail-Renderer für Quittung. Phase 5 misst Idempotenz/Quittung, baut keinen zweiten Pfad. |
| `app/src/lib/{data,payments,supabase,types,geo,seed}.ts` (Dual-Source Seed↔Supabase, `isSupabaseConfigured`, snake↔camel an der Grenze, Port **5409**) | Mess-/Last-Setup nutzt **diese** Dual-Source-Schicht; ohne Account synthetischer Stand klar gekennzeichnet, kein toter Pfad. |
| `app/.env.example` (nur `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) | **Alle** weiteren Secrets (Stripe/Resend/Turnstile/Connect/Sentry) sind **Function-/CF-Secrets**, niemals `VITE_`. |
| `app/package.json` (Scripts `dev/build (tsc --noEmit && vite build)/preview/typecheck/test (vitest run)/test:watch`; **Vitest-Runner + `@vitest/coverage-v8` vorhanden**) | Feinphase **O** härtet den vorhandenen Vitest-Runner (Frontend) und ergänzt Deno-Tests für SQL/Edge. Verifikation laufend: `npm run typecheck` + `npm test` + `npm run build` (+ `supabase db reset` für Migrationen). |

> **Stop-Regel-Check:** `orgs` / `audit_log` / `is_org_member` / `sb_payments` / `payment_events` / die Edge-Funktionen existieren real → kein „API/Service nicht gefunden". **Offene Owner-Gates** (Account/Kosten/Vertrag — **nicht** Teil der lokalen Phasen): Stripe Live + Connect + Price-IDs + SEPA/Tax · Resend-/SMTP-Domain (SPF/DKIM/DMARC) · Supabase-EU-Projekt + Domain · Cloudflare Pages/Turnstile/WAF · Sentry-DSN. Siehe `finalization/phase5_scale/MANUAL_TASKS.md` (falls vorhanden; sonst dort dokumentieren).

---

## Dependency-Gates (harte Reihenfolge — Skalierung ist eine Kette)

```text
Vorgate: Phase-1-Gate + Phase-2-Gate (A–F + Burn-in) + Phase-3-Ops-Gate + mind. ein Geldfluss
         MÜSSEN grün sein, bevor Phase 5 startet.

Gate 10  (erste zahlende Erzeuger) = Marktstart-Pflicht und Voraussetzung für alles Weitere.
         Reale Höfe zahlen real (Abo ODER SB), Quittung/Payout korrekt, Audit + Isolation grün.

Gate 50  baut auf Gate 10: Onboarding-Durchsatz + Support-Last bei 50 Höfen tragbar,
         Performance-Budget (Phase-2-Gate E) unter realer 50-Hof-Last gehalten.

Track-E-Scale-Gate (Phase 4) MUSS grün sein, BEVOR Gate 100/300 freigegeben werden
         (MVs, Geo-Box, Volltext, Verlaufs-Lebenszyklus, 300-Hof-Synthetik).

Gate 100 läuft erst, wenn Gate 50 grün UND Track-E-Scale-Gate grün ist.
Gate 300 läuft erst, wenn Gate 100 grün ist; Partition-/Read-Replica-Entscheide NUR mit Owner-Freigabe.

Selbstlern-Schleife läuft GETAKTET über alle Stufen hinweg und blockiert keine Stufe:
         insights (laufend, 1-Zeiler) → distill (Session-Ende) → apply (NUR nach Owner-Review)
         → consolidate (monatlich).
```

> **Skalierungs-Regel:** Eine Stufe gilt erst als getragen, wenn **alle** vier Dimensionen + alle 7 Pfeiler im Budget sind — gemessen unter realer/synthetischer Last dieser Stufe, nicht angenommen. Ein P0/P1 (Isolations-Leck, gebrochener Geldfluss, Budget-/Kosten-Riss) **setzt die Stufe zurück**, keine Teilanrechnung (analog Burn-in-Regel Phase 2; `README.md` Abschnitt 3).

---

## Leitplanken (nicht-verhandelbar — gelten in jeder Phase-5-Session)

- **Beweis statt Behauptung.** Kein Gate/keine Stufe gilt als grün ohne ausgeführten Befehl/Output, `EXPLAIN (ANALYZE)`-Plan, Benchmark-Dump, Webhook-Idempotenz-Test, Negativtest oder Owner-bestätigten manuellen Schritt. „Skaliert" ohne Messung ist kein PASS.
- **Phase 5 ist additiv-frei von Fachlogik.** Keine neue Migration, keine neue Tabelle, kein neues Feature, kein neuer Index — das ist Track E / Phase 1 / Phase 4. Phase 5 ändert nur Mess-/Benchmark-/Doku-/`.claude/learning`-Dateien (Stop-Regel bei Versuch, hier Fachlogik einzuziehen).
- **P0 vor P1 vor P2 vor P3** (`01_PRIORITIES.md`). Keine Produktpolitur, solange ein Skalierungs-Blocker offen ist (Isolations-Leck, gebrochener Geldfluss, Budget-Riss, unwirtschaftliche Unit-Economics).
- **Triage zuerst** (`00_RULES.md §2`): Bug ≠ Rollen-/Sichtbarkeitslogik ≠ Tenant-Isolation ≠ Performance ≠ Commercial ≠ Kosten ≠ UX. Jede Kategorie = anderer Fix + andere Tests.
- **Org-Boundary / Tenant-Isolation ist auf JEDER Stufe ein harter Blocker (P1).** Keine Skalierungs-Optimierung (Aggregat-MV, Edge-Cache, vorberechneter Bestand, RPC) darf org-fremd lecken: Cross-Org = **403 / 0 Zeilen**, nie 200 mit Fremddaten; MV nie direkt für `anon`/`authenticated` lesbar (security-definer-RPC mit `auth.uid()`-Bindung).
- **`service role` nur in Edge Functions.** Frontend nur `VITE_`-Public-Keys (Anon) + Turnstile-Sitekey; jedes Secret nur als Function-/CF-Secret. Kein Service-Role-Key, kein DB-Connection-String, kein Stripe-Secret im Bundle.
- **Eine Wahrheit.** Stripe-Webhook = Billing-Wahrheit (idempotent, signiert). `audit_log` = Aktions-Wahrheit. Keine zweite Buchhaltung, keine Schattenwahrheit durch ein Aggregat.
- **Zero-State statt Error.** Leere Daten/fehlende Integration → `available:false` + leere Arrays + Editorial-Leerzustand, nie 500/Crash — auch unter Last.
- **Editorial-Disziplin.** Nur Design-System-Tokens (`app/src/styles/theme.css`), keine hardcodierten Farben/Schwellwerte, **keine Deko-Emojis** in Prod-/Ops-UI; Budgets/Last-Schwellen sind **Konfig, nie hartkodiert**. User-/Hof-/Käufer-Werte vor Ausgabe escapen.
- **Vermittler-Wahrheit bleibt skalierungsfest.** Keine Optimierung darf Eigenverkauf, garantierte Menge/Lieferung oder Beratung suggerieren. Verfügbarkeit = Erzeuger-Selbstauskunft mit Frische-Signal — auch bei 300 Höfen. Disclaimer durchgängig, auch in Quittung/Mail/Hof-Antwort.
- **Lernschleife getaktet & owner-kontrolliert.** `insights` laufend (1-Zeiler, billig); `distill` am Session-Ende; `apply` **nie** automatisch — nur nach expliziter Owner-Freigabe; `consolidate` monatlich. Ein Lern-Eintrag steht **unter** der Konflikt-Hierarchie und weicht Sicherheits-/Isolations-/Vermittler-/Test-Regeln nie auf.
- **Test-Integrität (`CLAUDE.md §0.9`).** Code an Tests anpassen, nie Tests zurechtbiegen/abschwächen/löschen/still skippen. Pfadauflösung relativ zur Testdatei. Kein Lern-Eintrag rechtfertigt ein Zurechtbiegen.
- **Keine Commits ohne ausdrückliche Owner-Freigabe.** Bei Freigabe Co-Author-Zeile anhängen. `.claude/`, `.env`, Secrets, Build-Output nie ins Release-Artefakt.
- **VMS-/Self-Host-Begriffe verboten** (Zeitarbeit, Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne (Höfe, Erzeuger, Käufer, Reservierung, Verfügbarkeit, SB-Bezahlung, Betriebszentrale, Cloud-Plattform-Sicht).

---

## Stop-Regeln (anhalten, minimalen sicheren Fix vorschlagen, auf Owner-OK warten)

Phase 5 berührt **echtes Geld (zahlende Kunden), Plattformkosten und irreversible Plattform-Settings** — hier wird **angehalten**, nicht geraten (`CLAUDE.md` Stop-Regeln · `00_RULES.md §5` · `README.md` Abschnitt 8). Insbesondere:

1. **Eine Customer-Stufe ist praktisch nicht tragbar** (Budget-Riss, Support-Last explodiert, Kosten/Hof unwirtschaftlich) → **Stop, Owner einbeziehen.** Stufe nicht „grün" reden; härten oder ehrlich verschieben.
2. **Skalierung würde RLS/Vermittler-Wahrheit aufweichen** (Aggregat/Cache leckt org-fremd; Bestand wird als verbindliches Angebot dargestellt) → **Stop**, Isolations-/Compliance-Bruch, nicht ausliefern.
3. **Prod/Kosten/irreversibel nötig** (PostGIS/`pg_trgm`/`pg_cron`/`pg_stat_statements`, Read-Replica, größere Compute-Instanz, Cloudflare-Cache-Reserve, Prod-Migration, Stripe-Live-Skalierung, Connect-Onboarding weiterer Erzeuger, Refresh-Scheduler / Edge-Cache-Proxy scharf, Verlaufs-Partition/Archiv-Job) → **Stop**, Trade-off + Kosten in Klartext, Owner entscheidet (`CLAUDE.md §0.3`).
4. **Lern-Vorschlag widerspricht Sicherheits-/Isolations-/Vermittler-/Test-Integritäts-Regeln** → **Stop**, nicht übernehmen; Konflikt-Hierarchie sticht jeden Insight.
5. **Gate 10 nicht ehrlich erreichbar** (kein realer zahlender Erzeuger, Quittungs-/Payout-Pfad tot) → **Stop**, Marktstart nicht freigeben; kein „halb zahlbar".
6. **Eine referenzierte Datei/Edge Function/Route/Tabelle/Command wird nicht gefunden** (Annahme statt Fakt) → **Stop**, erst verifizieren/anlegen, dann referenzieren.
7. **Eine Änderung würde Fachlogik/Migration in Phase 5 einziehen** (falsche Phase) → **Stop**, nach Track E / Phase 1 / Phase 4 verlagern.

> **Ausnahme zu `CLAUDE.md §0.8` („Durcharbeiten statt Pausieren"):** Stop-Regeln **stechen** das Durcharbeiten. An echten Blockern wird angehalten — Sicherheit/Verifikation werden nie für Tempo geopfert. An *natürlichen* Stopp-Punkten (kein Blocker) wird hingegen weitergearbeitet: nächster wertvoller autonomer Schritt (mehr Benchmarks, Isolations-Negativtests, Matrix-Tiefe, Gate-Nachweise, Lern-Destillation).

---

## Arbeitsrhythmus der Session (eine Stufe / Feinphase / ein Baustein)

> Verbindliche Reihenfolge je `README.md` Abschnitt 6. **Niemals** mehrere Customer-Gates gleichzeitig „grün" erklären.

1. **Lesen** (Pflicht-Lesereihenfolge oben) → aktuellen Stand aus `docs/releases/PHASE_STATUS.md` + Readiness-Matrix ziehen, nicht doppelt bauen. Eingangs-Vorgate (Phase 1/2/3 + Geldfluss; für 100/300 zusätzlich Track-E-Scale-Gate) als grün bestätigen.
2. **Genau EIN Ziel wählen** — eine Customer-Stufe aus `CUSTOMER_GATES.md` **oder** eine Feinphase A–R aus `PHASES_A_TO_R.md` **oder** einen Baustein (A Gates / B Feinphasen / C Selbstlernen). Nur dieses abarbeiten.
3. **Reifeprüfung (read-only zuerst)** — Ist-Zustand gegen die vier Dimensionen + 7 Pfeiler messen, in der Readiness-Matrix als Soll/Ist festhalten.
4. **Last-Setup** — reale Kohorte und/oder synthetischer Seed je Stufe (Track-E-Seed), klar gekennzeichnet (Demo ≠ Prod).
5. **End-to-end messen** — alle Dimensionen prüfen → Budgets gegen Track-E-Größen (`EXPLAIN (ANALYZE)`, p95) → Isolations-Regression (Cross-Org = 403/0) → Geldfluss (Idempotenz/Quittung/Payout) → Kosten/Hof → Nachweis sammeln. Keine behauptete Zahl ohne Beleg.
6. **Owner-Freigabe** für alles Kostenpflichtige/Irreversible (siehe Stop-Regel 3) **bevor** real geschaltet wird. Bis dahin alles repo-lokal/reversibel.
7. **Selbstlern-Schleife** bedienen — Lektionen als 1-Zeiler in `insights_inbox.md`; am Stufen-/Session-Ende `distill` → `proposals.md`; Kanon-Übernahme **nur** nach Owner-Review (`apply` → `applied_log.md`).
8. **Abschlussbericht** (Format unten) + Readiness-Matrix für die Stufe aktualisieren + `docs/releases/PHASE_STATUS.md` (+ ggf. `MASTER_INDEX.md` Abschnitt 0/7) auf den realen Stand setzen. Wiederverwendbare Muster → `.claude/memory/patterns/`.

**Niemals:** mehrere Stufen gleichzeitig grün erklären · eine Budget-Zahl ohne `EXPLAIN`/Messung behaupten · die Lern-Schleife selbst-übernehmen lassen · ein Gate verkürzen, „weil Wachstum drängt".

---

## Verifikation vor „fertig" (Definition of Done je Stufe / Baustein)

Ausführen, Output zeigen — keine kosmetische Fertigmeldung:

- `npm run build` (tsc strict + vite) **grün** + `npm test` (Vitest) **grün** — Auszug zeigen. (Feinphase O ergänzt zusätzlich Deno-Tests für SQL/Edge; für Migrationen `supabase db reset`.)
- **Performance-Beweis (Pflicht je Stufe):** `EXPLAIN (ANALYZE)` der heißen Pfade (Finder/Detail/SB-Report/Owner-KPI) **ohne Seq-Scan** auf großen Tabellen; gemessenes p95 ≤ Budget (Soll vs. Ist mit Dump); Edge-Cache-Hit-Rate für anonymen Katalog; keine N+1 (Keyset/Pagination).
- **Isolations-Negativtest (Pflicht je Stufe):** fremde Org / fremde Rolle → **403 / 0 Zeilen**, nie 200 mit Fremddaten; MV/RPC/Cache leckt nicht (security-definer-RPC `auth.uid()`-gebunden).
- **Geldfluss-Beweis (falls Geldfluss-Dimension):** Webhook-Idempotenz (doppeltes `event.id` → ein Effekt über `payment_events`); Quittung erzeugt; Connect-Payout (bei SB) belegt; `audit_log`-Eintrag vorhanden, PII maskiert.
- **Kosten-Beweis:** Kosten/Hof/Monat (Supabase-Compute/Egress, Edge-Requests, Stripe-Gebühr) für die Stufe geschätzt/gemessen; Origin-Hit-Rate; teure Pfade nur mit Owner-Freigabe.
- **UX/Differenzierung:** echte Zero-States unter Last; Vermittler-/Lebensmittel-Disclaimer durchgängig sichtbar; keine Deko-KPIs; Konsole sauber (keine `TypeError`/401-Schleifen). Lokaler Dev-Check: `npm run dev` (Port 5409) / `npm run preview`.
- **Lern-Schleife:** Erkenntnisse gesammelt? `distill` → `proposals.md` gelaufen? Owner-Review-Stand? `applied_log`-Eintrag bei Übernahme?
- 7 Produktionspfeiler für die berührte Fläche geprüft; Readiness-Matrix + relevante Doku/Tracker aktualisiert.
- **„Fertig" erklärt der Owner**, nicht Claude. Diffs bleiben uncommitted bis Owner-Freigabe.

---

## Abschlussbericht-Format (Pflicht pro Stufe / Baustein)

Identisch zu `README.md` Abschnitt 7, mit Skalierungs-Fokus:

```text
## Stufe/Baustein abgeschlossen: PHASE 5 · <Customer-Gate N / Feinphase A–R / Baustein A–C>   (Datum: )

### Geändert
- <Skripte / Benchmarks / Readiness-Matrix / Doku / .claude/learning — konkret, mit Pfaden>
  (Phase 5 ändert KEINE Fachlogik/Migration/Index — sonst falsche Phase, siehe Leitplanken)

### Last-Setup
- <reale Kohorte (N Höfe / zahlend) und/oder synthetischer Seed (Track-E seed_scale), Demo≠Prod gekennzeichnet>

### Dimensionen (CUSTOMER_GATES.md)
- Performance: <grün/offen + Beleg>   Ops: <…>   Support: <…>   Billing: <…>

### Budgets (p95, Soll vs. gemessen, mit EXPLAIN/Dump)
- Finder · Hof-Detail · SB-Report · Owner-KPI(MV): <…>

### Geldfluss
- Abo/SB · zahlende Höfe · Webhook-Idempotenz (event.id) · Quittung · Connect-Payout: <Nachweis>

### Isolation
- Cross-Org-Negativtest = 403/0 · MV/RPC/Cache nicht org-fremd lesbar: <Ergebnis>

### Kosten / Unit-Economics
- Supabase/Edge/Stripe je Hof/Monat · Origin-Hit-Rate · Owner-Freigaben für teure Pfade: <…>

### UX / Differenzierung
- Zero-State real · Disclaimer durchgängig · keine Deko-KPI · Konsole sauber: <…>

### 7 Produktionspfeiler (Selbstcheck)
- Org-Boundary · Zero-State · Scope-Transparenz · RBAC · Audit · Tests · Drilldown/Disclaimer: <je ✅/offen>

### Lern-Schleife
- insights gesammelt? distill→proposals? Owner-Review-Stand? applied_log-Eintrag?: <…>

### P0/P1-Status
- Gelöst: · Offen: · Bewusst verschoben (mit Begründung):

### Risiken & manuelle Owner-Aufgaben
- <Risiko + Mitigation + Rollback>
- Manuelle Owner-Tasks → finalization/phase5_scale/MANUAL_TASKS.md (Stripe-Live/Connect/Price-IDs, Tier-Upgrade,
  Extension-Freigabe, Read-Replica, Sentry-DSN, Domain/DNS)

### Doku/Tracker aktualisiert
- docs/releases/PHASE_STATUS.md · docs/finalization/10_300_customer_readiness_matrix.md · MASTER_INDEX.md (0/7) · ggf. ADR/learning/pattern: <ja/nein>

### Entscheidung
- weiter zu <nächste Stufe/Feinphase nach Dependency-Kette>  ODER  Stop wegen Blocker (Kategorie/Priorität/ETA)
```

**Verbotene Abschluss-Formate:** reine Dateiliste ohne Fachbeschreibung · „skaliert" ohne Messung · „Budget gehalten" ohne `EXPLAIN`/p95-Dump · „Isolation ok" ohne Negativtest · „alle Tests grün" ohne Ausführungsnachweis · Lern-Eintrag selbst übernommen ohne Owner-Review · Verschweigen von Restrisiken.

---

# TEIL B — Setup der Lernschleife (selbstlernende `CLAUDE.md`)

> **Einmalig, früh in Phase 5** (idealerweise vor/direkt nach der ersten Reifeprüfung). Setzt die Mechanik aus `SELF_UPDATING_CLAUDE_MD.md` (Baustein C) konkret im Repo um. **Ziel:** Claude Code optimiert sich kontinuierlich für **Wirtschaftlichkeit & Effizienz** dieses Projekts und hält den Kanon aktuell — **getaktet, mit Owner-Governance, ohne Aufblähen**.

## Warum getaktet statt „bei jeder Nachricht" (verbindliche Einordnung)

Eine `CLAUDE.md`, die bei jeder Nachricht schreibt, **bläht auf** (mehr Tokens/Session → teurer, das Gegenteil von Effizienz), **entwickelt Widersprüche**, wird **unkontrollierbar** und ist ein **Sicherheitsrisiko** (eine falsche Erkenntnis vergiftet alle künftigen Sessions). Die kontrollierte Lernschleife erreicht das Ziel besser: **sammeln (billig) → destillieren (Session-Ende) → vorschlagen → Owner bestätigt → periodisch konsolidieren.** Das ist kontinuierliches Lernen **mit** Governance.

## Ist-Stand der Lernschleife im Repo (repo-genau)

```text
Vorhanden (Repo-Root, <repo>/.claude/ — NICHT unter app/):
  .claude/learning/config.md          (Auto-Approve: nur EFFIZIENZ · WIRTSCHAFTLICHKEIT/TECHNIK = Owner-Review)
  .claude/learning/insights_inbox.md  (laufender 1-Zeilen-Eingang)
  .claude/memory/ (INDEX + decisions/ + ggf. learnings/patterns)   .claude/agents/   .claude/CLAUDE_RECS.md

Anzulegen, falls noch nicht vorhanden (erste Setup-Aufgabe):
  .claude/learning/proposals.md       (destillierte Vorschläge — Session-Ende)
  .claude/learning/applied_log.md     (Audit der übernommenen Kanon-Änderungen)
  .claude/commands/lbc-learn-distill.md     (Session-Ende-Destillation)
  .claude/commands/lbc-learn-apply.md       (Übernahme NUR nach Owner-Review)
  .claude/commands/lbc-learn-consolidate.md (monatliche Konsolidierung)
  finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md   (Baustein-C-Spezifikation, falls fehlend)
```

> **Kein blinder Doppelbau:** `config.md` + `insights_inbox.md` existieren bereits — sie werden **gelesen/erweitert**, nicht überschrieben. Die lokale Policy (Auto-Approve nur EFFIZIENZ; Quelle Pflicht; kein Auto-Write pro Nachricht; `.claude/` nie ins Release) ist bindend (`.claude/learning/config.md`).

## Setup-Prompt (einmalig — direkt nach Phase-A-Reifeprüfung ausführen)

```text
Richte die kontrollierte Selbstlern-Schleife für LokaleBauernConnect ein
(Spezifikation: finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md, falls vorhanden — sonst zuerst kanonisch anlegen).

Repo-genau, additiv, nichts überschreiben:
1. PRÜFE Ist-Stand: .claude/learning/{config.md, insights_inbox.md} existieren bereits → lesen, nicht neu anlegen.
2. LEGE FEHLENDE Lern-Dateien an:
   - .claude/learning/proposals.md   (leer, mit Kopf: Datum/Format „[KATEGORIE] <Erkenntnis> (Quelle: <Datei/Welle>)")
   - .claude/learning/applied_log.md (leer, mit Kopf: Datum · Erkenntnis · Ziel-Abschnitt · Owner-OK)
3. LEGE die 3 Command-Dateien an (Skelette unten):
   - .claude/commands/lbc-learn-distill.md
   - .claude/commands/lbc-learn-apply.md
   - .claude/commands/lbc-learn-consolidate.md
4. ERWEITERE CLAUDE.md (Abschnitt „Dokumentation, Tracker & Selbstlernen" + „Self-Learning Log")
   um den Verweis auf diese getaktete Schleife — KEINE neuen Regeln erfinden, nur die Mechanik referenzieren.
5. STELLE SICHER: .claude/ steht auf der Ausschlussliste des Phase-2-Release-Verifiers (WAVE_01) — kein .claude im Artefakt.
6. TESTE: erfasse EINE Test-Erkenntnis (1-Zeilen-Append), führe /lbc-learn-distill aus, zeige proposals.md.

Owner-Governance ist bindend (.claude/learning/config.md): Auto-Approve NUR EFFIZIENZ;
WIRTSCHAFTLICHKEIT/TECHNIK brauchen Owner-Review. apply NIE automatisch. .claude/ nie ins Release.
Kompakter Abschlussbericht. Token sparen.
```

## Erfassung während der Arbeit (laufend, billig — 1-Zeilen-Append)

Wenn eine **wiederverwendbare** Lektion entsteht (kein Einmal-Bug, kein Triviales, keine Spekulation, nichts schon im Kanon):

```bash
echo "- [EFFIZIENZ] <Erkenntnis> (Quelle: <Datei/Welle/Gate>, $(date +%Y-%m-%d))" >> .claude/learning/insights_inbox.md
# Kategorien: EFFIZIENZ (Token/Zeit) · WIRTSCHAFTLICHKEIT (Projekt-Ökonomie) · TECHNIK (projektspezifisches Wissen)
```

Phase-5-relevante Erfassungs-Schwerpunkte (`README.md` Abschnitt 0.6):
- **WIRTSCHAFTLICHKEIT:** Was kostet ein Hof an Ressourcen (Supabase-Compute/Egress, Edge-Requests, Stripe-Gebühr)? Welcher Query/Job ist der teuerste? Wo droht bei 10→300 eine Kostenexplosion?
- **EFFIZIENZ:** Welche Datei ist Domänen-Index (immer zuerst lesen)? Welche Last-/Benchmark-Schritte sind teuer? Welcher Mess-Pfad ist reproduzierbar?
- **TECHNIK:** Plan-Keys `demo/basis/plus/pro/individuell`; `payment_events` PK = `event.id` = Webhook-Idempotenz-Wahrheit; MV nur via security-definer-RPC mit `auth.uid()`-Bindung; Edge-Cache nur für anonymen Katalog.

## Command-Skelette (anlegen, falls fehlend)

### `.claude/commands/lbc-learn-distill.md`

```markdown
---
description: Destilliert gesammelte Erkenntnisse am Session-Ende zu CLAUDE.md-Vorschlägen
---

Lies .claude/learning/insights_inbox.md.

Für jede Erkenntnis:
1. Klassifiziere: EFFIZIENZ / WIRTSCHAFTLICHKEIT / TECHNIK.
2. Prüfe gegen bestehende CLAUDE.md + .claude/memory/:
   - Schon vorhanden? → verwerfen.
   - Widerspricht Bestehendem/Sicherheits-/Isolations-/Vermittler-Regel? → als KONFLIKT markieren, NICHT auto-übernehmen.
   - Neu & wertvoll? → als Vorschlag formulieren.
3. Formuliere jeden Vorschlag in max. 3 Sätzen (Was ändern? Wo? Warum jetzt?):
   Format: `[KATEGORIE] <Erkenntnis> (Quelle: <Datei/Welle/Gate>)`

Schreibe alle Vorschläge mit Datum nach .claude/learning/proposals.md.
Archiviere die Inbox-Zeilen nach .claude/learning/applied_log.md (als „distilled") und leere insights_inbox.md.

Gib NUR eine kompakte Zusammenfassung aus:
"X destilliert: Y Effizienz, Z Wirtschaftlichkeit, W Technik. K Konflikte. Review mit /lbc-learn-apply."
KEINE langen Erklärungen. Token sparen.
```

### `.claude/commands/lbc-learn-apply.md`

```markdown
---
description: Übernimmt bestätigte Lern-Vorschläge in den Kanon (kontrolliert)
---

Lies .claude/learning/proposals.md und .claude/learning/config.md.

Für jeden Vorschlag:
1. Wenn Kategorie in config.md auf auto_approve (= NUR EFFIZIENZ) UND kein KONFLIKT:
   → direkt in CLAUDE.md übernehmen.
2. Sonst (WIRTSCHAFTLICHKEIT/TECHNIK oder KONFLIKT):
   → dem Owner zeigen, auf explizite Bestätigung warten, NUR bei „ja/übernehmen" schreiben.

Übernahme-Ziel:
- EFFIZIENZ + TECHNIK → CLAUDE.md („Self-Learning Log" / passender Regel-Abschnitt).
- WIRTSCHAFTLICHKEIT → CLAUDE.md + Verweis auf §0.3 (Wirtschaftlichkeit).
- Architektur-/Imperium-Muster → .claude/memory/patterns/ ; Entscheidungen → .claude/memory/decisions/ (ADR).

Regeln:
- Jede übernommene Zeile prägnant (max 1–2 Zeilen). Kein Duplikat.
- Konflikt-Hierarchie sticht jeden Insight: Sicherheits-/Isolations-/Vermittler-/Test-Regeln nie aufweichen.
- Nach Übernahme: Eintrag in .claude/learning/applied_log.md (Datum, Erkenntnis, Ziel, Owner-OK).
- proposals.md nach Übernahme leeren. Abgelehnte NICHT zweimal vorschlagen.

Gib kompakt aus: "X übernommen, Y verworfen, Z wartet auf Owner."
```

### `.claude/commands/lbc-learn-consolidate.md`

```markdown
---
description: Konsolidiert den Kanon monatlich, hält ihn schlank
---

Lies CLAUDE.md (Lern-/Regel-Abschnitte) + .claude/learning/applied_log.md + .claude/memory/patterns/.

Aufgaben:
1. Ähnliche Erkenntnisse zusammenfassen (z. B. 3 Performance-Hinweise zu Finder-Queries → 1 Regel).
2. Veraltete/widerlegte entfernen (z. B. „Stripe noch nicht live", sobald live) — korrigieren, nicht duplizieren.
3. Widersprüche auflösen (Owner fragen bei Unklarheit).
4. Token-Budget prüfen: Lern-Abschnitte schlank halten; Überlauf → docs/finalization/claude_learnings_archive.md auslagern.
5. Muster auf Imperium-Tauglichkeit prüfen („Funktioniert das Pattern in 20 anderen Projekten?") → .claude/memory/patterns/.

Zeige Owner ein Vorher/Nachher-Diff. NUR nach Bestätigung schreiben.
Gib aus: "Konsolidiert: vorher X Zeilen, nachher Y. Z archiviert."
```

> **Hinweis zu Hooks:** Der TempConnect-Blueprint registriert einen Stop-Hook in `.claude/settings.json`. Im lokalen Repo existiert `.claude/settings.local.json`; ein automatischer Session-Ende-Hook ist **optional und Owner-Entscheidung** (Settings-Eingriff). Der **getaktete Default ohne Hook** ist verbindlich ausreichend: `insights` laufend → am Session-Ende manuell `/lbc-learn-distill`. Kein Hook wird ohne Owner-OK in den Settings registriert.

## Acceptance der Lernschleife

```text
- [ ] Erkenntnis-Erfassung funktioniert (1-Zeilen-Append in insights_inbox.md, mit Quelle)
- [ ] /lbc-learn-distill erzeugt Vorschläge in proposals.md, leert die Inbox, archiviert nach applied_log.md
- [ ] /lbc-learn-apply übernimmt NUR nach Owner-Review (außer EFFIZIENZ ohne Konflikt) und protokolliert in applied_log.md
- [ ] /lbc-learn-consolidate hält den Kanon schlank, mit Vorher/Nachher-Diff vor dem Schreiben
- [ ] Auto-Approve NUR für EFFIZIENZ (config.md); WIRTSCHAFTLICHKEIT/TECHNIK = Owner-Review
- [ ] Konflikt-Hierarchie sticht jeden Insight (kein Lern-Eintrag weicht Sicherheits-/Isolations-/Vermittler-/Test-Regel auf)
- [ ] .claude/ ist im Phase-2-Release-Verifier ausgeschlossen (kein .claude im Artefakt)
- [ ] applied_log.md führt lückenlosen Audit der Kanon-Änderungen
```

---

# TEIL C — Kurzstarts & Spezial-Prompts

## Pro-Stufe-Kurzstart (eine Customer-Stufe)

```text
Arbeite an PHASE 5 / Customer-Gate <10|50|100|300> aus finalization/phase5_scale/CUSTOMER_GATES.md.

Lies vorher (gezielt):
- CLAUDE.md · finalization/00_RULES.md · finalization/01_PRIORITIES.md
- finalization/phase5_scale/{README.md, CUSTOMER_GATES.md (nur die Stufe)}
- finalization/phase4_vertical/TRACK_E_DATABASE.md (Budgets + Scale-Gate; bei 100/300 Vorgate-Pflicht)
- docs/releases/PHASE_STATUS.md + docs/finalization/10_300_customer_readiness_matrix.md (aktueller Stand)

Pflicht in JEDER Stufe:
- Reifeprüfung read-only zuerst → Matrix Soll/Ist
- 4 Dimensionen (Performance/Ops/Support/Billing) + 7 Pfeiler messen, nicht behaupten
- Performance: EXPLAIN(ANALYZE) ohne Seq-Scan, p95 ≤ Budget · Isolation: Cross-Org = 403/0 · Geldfluss: Idempotenz/Quittung/Payout
- Kosten/Hof beobachten; teure Pfade NUR mit Owner-Freigabe
- Lernschleife: Erkenntnisse → .claude/learning/insights_inbox.md (1-Zeiler)

Liefere am Ende den Phase-5-Abschlussbericht (Format MASTERPROMPT) + Matrix + PHASE_STATUS aktualisiert.
Phase 5 baut KEINE Migration/Fachlogik. Eine Stufe pro Session. „Fertig" erklärt der Owner.
```

## Pro-Feinphase-Kurzstart (eine Phase A–R)

```text
Arbeite an PHASE 5 / Feinphase <X> aus finalization/phase5_scale/PHASES_A_TO_R.md.

Lies vorher: CLAUDE.md · 00_RULES.md · phase5_scale/README.md · PHASES_A_TO_R.md (nur Phase X)
            · docs/releases/PHASE_STATUS.md (wo stehe ich?).
Lernschleife aktiv: Erkenntnisse → .claude/learning/insights_inbox.md (1-Zeilen-Append).
Liefere: Abschlussbericht (Format MASTERPROMPT) + Matrix/Tracker. Token sparen. Eine Feinphase pro Session.
```

## Gruppen-Prompt (eng gekoppelte Feinphasen in einer Session)

```text
Arbeite an Feinphasen-Gruppe <Name> aus finalization/phase5_scale/PHASES_A_TO_R.md
(z. B. Mess-Setup → Performance-Validierung; oder Kosten-Disziplin → Differenzierung).
Phasen der Gruppe nacheinander; pro Phase ein Abschlussbericht. Lernschleife aktiv. Matrix/Tracker pflegen. Token sparen.
```

## Session-Ende-Prompt (Lernschleife)

```text
Session-Ende. Führe /lbc-learn-distill aus.
Zeige die destillierten Vorschläge aus .claude/learning/proposals.md.
Kompakt: X Erkenntnisse (Y Effizienz / Z Wirtschaftlichkeit / W Technik), K Konflikte.
KEINE Auto-Übernahme — apply NUR nach meiner Bestätigung.
```

---

## Subagenten-Einbindung (Delegationsregeln, `AGENTS.md` / `.claude/agents/*`)

- **Performance-Budgets / Kosten / Caching / Query-Last** → `performance-cost-optimizer` (führend), gestützt durch `db-rls-spezialist` (EXPLAIN/Indizes-Lesen).
- **Isolations-Regression je Stufe (RLS deny-by-default, MV/RPC/Cache-Leck)** → `db-rls-spezialist` + `security-auditor` (read-only, meldet), danach `qa-tester` (Cross-Org-Negativtest = blockierendes Gate).
- **Geldfluss-Stabilität bei N Höfen (Idempotenz, Quittung, Connect-Payout)** → `payment-engineer` + `edge-functions-spezialist`, danach `security-auditor`.
- **Cloud-Plattform-Sicht (Supabase/Cloudflare-Tier, Egress, Monitoring/Alarme, Backup/PITR unter Last)** → `devops` + `performance-cost-optimizer`.
- **Differenzierung/Editorial/Zero-State/Disclaimer/Mikrocopy unter Last** → `frontend-design-guardian` + `i18n-content-spezialist`.
- **DSGVO/PII-Maskierung/Vermittler-Wahrheit bei Aggregaten** → `compliance-officer`.
- **Skalierungs-Architekturfrage** (Customer-Gate-Schema, Aggregations-/Cache-Modell, Lern-Loop-Governance) → `architekt`; Ergebnis als ADR in `.claude/memory/decisions/`.

---

## GO / NO-GO — Gate 10 (Marktstart-Schlussbedingung der Phase 5)

```text
PHASE-5-GATE-10-GO (Marktstart-Pflicht) darf nur vergeben werden, wenn ALLE Punkte erfüllt sind:

- Vorgate grün: Phase-1-Gate + Phase-2-Gate (A–F + Burn-in ≥7d) + Phase-3-Ops-Gate, Owner-bestätigt
- Performance: Finder/Detail/SB-Report/Owner-KPI p95 ≤ Budget unter 10-Hof-Last (EXPLAIN-Beleg, kein Seq-Scan)
- Isolation: Cross-Org-Negativtest = 403/0 Zeilen; MV/RPC/Cache leckt nicht org-fremd
- Geldfluss: mind. EIN realer zahlender Erzeuger (Abo ODER SB); Webhook idempotent + signaturgeprüft;
             Quittung erzeugt; bei SB Connect-Payout korrekt; audit_log-Eintrag, PII maskiert
- Ops/Support: Onboarding-Wizard trägt 10 Höfe ohne manuellen Engpass; Eskalations-/Support-Pfad steht
- Kosten/Unit-Economics: Kosten/Hof tragbar; keine ungeplante Kostenexplosion
- UX/Differenzierung: Zero-States real; Vermittler-/Lebensmittel-Disclaimer durchgängig; keine Deko-KPI
- Lernschleife: läuft getaktet; ≥1 Erkenntnis destilliert; apply NUR nach Owner-Review (kein Selbst-Eintrag)
- Readiness-Matrix + PHASE_STATUS auf realem Stand; kein Feld „unbekannt" für Stufe 10
- Owner hat aktiv bestätigt — „fertig" erklärt der Owner, nicht Claude

Ist EIN Punkt offen → GATE 10 = NO GO → Marktstart NICHT freigeben (kein „halb zahlbar").
Gates 50/100/300 folgen NACH dem Marktstart; 100/300 erst nach grünem Track-E-Scale-Gate.
```

---

## Letzter Hinweis

**Ziel ist nicht:** „Die Plattform hält die Last im Benchmark" oder „die `CLAUDE.md` schreibt sich selbst."
**Ziel ist:** LokaleBauernConnect trägt **300 echte Höfe und zahlende Erzeuger** unter realer Last — RLS dicht, Geldfluss stabil, Kosten tragbar, Produkt unverwechselbar — **und** der Kanon lernt mit jedem Wachstumsschritt kontrolliert dazu, ohne je seine Sicherheits-, Isolations- und Vermittler-Disziplin aufzuweichen. **Gate 10 macht den Marktstart einlösbar; die getaktete Selbstlern-Schleife macht die Plattform mit der Zeit besser, nicht nur größer.**

Erscheint ein Eintrag dieser Phase praktisch nicht erfüllbar — **Stop. Owner einbeziehen.** Entweder die Stufe sauber tragen oder ehrlich verschieben (kein „halb skaliert", kein „fast zahlbar"). Und kein Lern-Eintrag, der eine Sicherheits-, Isolations-, Vermittler- oder Test-Integritäts-Regel aufweicht, wird je übernommen — die Konflikt-Hierarchie sticht jeden Insight.
