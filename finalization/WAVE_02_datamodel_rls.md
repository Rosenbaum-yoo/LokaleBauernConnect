# WAVE 02 — Datenmodell + RLS (orgs · profiles · farms · products · availability · reservations · sb_payments · audit) + Isolationstest

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · `PHASEN.md` → Phase 1, **WAVE_02 Datenmodell+RLS** · Gate-Bezug: **Isolations-Gate**. **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> **Adaptiert** aus dem TempConnect-Blueprint (read-only; das BBQ-Original bleibt unangetastet). VMS-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) sind **konsequent** auf die Hof-Domäne übersetzt: Mandant = `org` (ein Hof-Betrieb), Erzeuger pflegt eigenen Hof, Käufer reserviert/zahlt, Staff verifiziert/eskaliert.

---

## 0. Ziel

Ein **mandantenfähiges, additiv migriertes, deny-by-default abgesichertes Datenmodell**, das den gesamten Kernflow (Hofladen-Finder → Verfügbarkeit → Reservierung/Abholung → SB-Bezahlung → Audit) trägt — und ein **automatisierter Tenant-Isolationstest**, der jede Welle danach blockierend schützt. Konkret:

1. **Vollständiges Kern-Schema, additiv** — `orgs · profiles · farms · products · availability(+`availability_log`) · reservations · sb_payments · audit_log` plus die schon vorhandenen Support-Tabellen (`subscriptions · payment_events · org_members · org_locations · reviews · …`). Jede Mutationstabelle trägt `org_id`/Tenant-Bezug, Zeitstempel, weiche Löschung (`deleted_at`, wo sinnvoll).
2. **RLS deny-by-default ab Migration #1** — RLS ist auf **jeder** Tabelle aktiv; ohne explizite Policy = **kein** Zugriff für `anon`/`authenticated`. `service_role` (nur Edge Functions) umgeht RLS systemseitig und ist die einzige Schreibinstanz für sensible Tabellen (`orgs`, `audit_log`, `payment_events`, `sb_payments`, `subscriptions`).
3. **Org-Boundary lückenlos (Produktionspfeiler 1)** — fremde Org = **kein Treffer** (RLS filtert auf 0 Zeilen), nie „200 mit Fremddaten". Käufer-, Erzeuger-, Staff-Sichten strikt getrennt; öffentlicher Katalog (`farms`/`products`) bewusst und eng als `select`-only freigegeben.
4. **Audit & Verantwortlichkeit (Pfeiler 5)** — `audit_log` als unabschaltbare, nur per `service_role` beschreibbare Wahrheit (wer/was/warum); `reason` ist Pflicht bei kritischen Aktionen. Verfügbarkeits-Änderungen der Erzeuger-Selbstpflege landen revisionssicher in `availability_log`.
5. **Beweisbarer Isolationstest** — ein deterministischer, lokal und in CI lauffähiger Negativ-/Positiv-Test, der zeigt: anon liest keine Reservierungen/Zahlungen; Org A sieht keine Daten von Org B; valider Aufruf liefert das erwartete Shape; leere Daten ⇒ Zero-State (leeres Array), kein 500. **Rot = kein Merge.**

**Nicht-Ziel dieser Welle:** Live-Schalten gegen ein echtes Supabase-EU-Projekt (Account-/Kosten-relevant → Owner-Freigabe, WAVE_06/Phase 2). Auth-Flows/Turnstile (WAVE_06), echte Stripe-Zahlungen (WAVE_09/Track A), RBAC-Surface-Logik (WAVE_03). Diese Welle liefert **Schema + Policies + Test**, prüfbar lokal über die Supabase-CLI (Docker-loser Postgres-Container der CLI; kein Self-Host).

---

## 1. Ist-Zustand (repo-genau geprüft)

| Fakt | Stand | Konsequenz für diese Welle |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` | enthält `orgs, profiles, farms, products, reservations, waitlist, audit_log` + Indizes + **RLS deny-by-default** + Policies | Kern steht. **Profile-Helfer + `availability_log` + Isolations-Helfer fehlen** → additive Migration `0004`. |
| `app/supabase/migrations/0002_payments.sql` | `subscriptions, sb_payments, payment_events` + `reservations.payment_method/_status`, RLS (Owner read, service_role write) | `sb_payments` vorhanden — Policies in dieser Welle **verifiziert**, nicht neu gebaut. |
| `app/supabase/migrations/0003_marketplace.sql` | `org_members, org_locations, reviews, bounties, credits_ledger`, `is_org_member()`, hebt Owner-Policies auf **Multi-Org** | `is_org_member()` ist ab hier die kanonische Org-Zugehörigkeitsprüfung → der Isolationstest prüft genau diese Funktion. |
| `availability` | modelliert als **Spalte** `products.availability` (enum `availability_state`: `available/low/soon/out`) — **nicht** als eigene Tabelle | Bewusste Designentscheidung (1 Produkt = 1 aktueller Verfügbarkeitszustand). Diese Welle ergänzt **additiv** `availability_log` für die **Historie** der Erzeuger-Selbstpflege (Audit-Trail), ohne den Zustand zu duplizieren. (ADR-pflichtig.) |
| `app/src/lib/data.ts` | schaltet bei `isSupabaseConfigured` real auf `supabase.from('farms').select().is('deleted_at', null)`, Insert in `reservations` mit `org_id` | Datenschicht passt zum Schema (snake_case ↔ camelCase an der Grenze). Keine Frontend-Änderung in dieser Welle nötig. |
| `app/supabase/seed.sql` | 9 Höfe = **9 eigene Orgs** + 25 Produkte + Demo-Reviews | Echte **Isolationsbasis**: zwei verschiedene Orgs (z. B. `…0001` Hof Sonnenwiese vs. `…0002` Imkerei Lindenblüte) für Cross-Org-Negativtests. |
| `app/supabase/migrations/` | additives, vierstelliges Schema (`0001…0003`) | Neue Arbeit = **`0004_isolation_and_availability_log.sql`**, additiv, idempotent, mit dokumentiertem Rollback — **keine** Änderung an `0001…0003`. |

> **Abweichung zum Prompt dokumentiert (Stop-Regel „Datenmodell für Zielzustand"):** Der Wellen-Titel listet `availability` als Tabelle. Im Repo ist Verfügbarkeit als **Spalte** mit Enum modelliert (korrekt für „1 aktueller Zustand pro Produkt"). Statt eine redundante Tabelle zu erzwingen, liefert diese Welle die **Verfügbarkeits-Historie** (`availability_log`) additiv — sie macht die Erzeuger-Selbstpflege revisionssicher (wer hat wann `available→low` gesetzt) und erfüllt damit Pfeiler 5 (Audit), ohne eine Schatten-Wahrheit zum Spaltenzustand zu schaffen. Begründung als ADR (`.claude/memory/decisions/`).

---

## 2. Aufgaben

### 2.1 Verifikation des Bestands-Schemas (kein Rebuild — Inkrementell-Regel)
- `0001…0003` werden **gelesen und verifiziert**, nicht neu geschrieben. Prüf-Checkliste je Tabelle: hat `org_id` (außer bewusst globalen wie `waitlist`/`payment_events`), Zeitstempel, RLS aktiv, mindestens eine explizite Policy ODER bewusst **keine** (= nur `service_role`).
- Bestätigte deny-by-default-Linien:
  - **Öffentlich lesbar (eng):** `farms`, `products`, `org_locations`, `reviews(status='published')`, `bounties(status='open')` — nur `select`, nur aktive/veröffentlichte Zeilen.
  - **Insert-only (auch anon):** `reservations` (nur valide `farm_id`+`org_id`-Kombi aktiver Höfe), `waitlist`, `reviews`, `bounties`.
  - **Owner-read (org-gebunden via `is_org_member`):** `reservations`, `subscriptions`, `sb_payments`, `org_members`, `credits_ledger`.
  - **Owner-write (org-gebunden):** `farms`, `products`, `org_locations`; `profiles` nur self.
  - **Nur `service_role` (keine anon/auth-Policy):** `orgs`, `audit_log`, `payment_events`, sowie alle Schreibpfade auf `sb_payments`/`subscriptions`/`credits_ledger`.

### 2.2 Additive Migration `0004_isolation_and_availability_log.sql` (das einzige neue SQL)
Vierstellig, additiv, **idempotent** (`if not exists` / `drop policy if exists`), mit Rollback-Block im Kopfkommentar. Inhalt:

1. **`profiles.org_id` Owner-Konsistenz** — Helfer `current_org_ids()` (`stable security definer`, prüft **nur** `auth.uid()`), der die Org-Menge des aktuellen Users aus `profiles` **und** `org_members` vereint — eine einzige kanonische Quelle für alle Owner-Read-Policies (heute teils inline `org_id in (select … from profiles …)`, teils `is_org_member`). Bestehende Policies werden auf diesen Helfer vereinheitlicht (additiv via `drop policy if exists` + `create policy`), damit es **eine** Wahrheit für „meine Orgs" gibt.
2. **`availability_log`** — Historie der Verfügbarkeits-Selbstpflege:
   - Spalten: `id uuid pk`, `product_id text → products`, `org_id uuid → orgs`, `from_state availability_state`, `to_state availability_state not null`, `changed_by uuid` (auth user, `set null` on delete), `note text`, `created_at timestamptz default now()`.
   - Trigger `products_availability_audit` **after update** auf `products`: schreibt nur bei `old.availability <> new.availability` eine Zeile (mit `org_id` der Zeile, `changed_by = auth.uid()`).
   - RLS: aktiv; **Owner-read** (`org_id` ∈ `current_org_ids()`); **kein** anon/auth-Insert (Schreiben ausschließlich über den Trigger im DB-Kontext bzw. `service_role`).
   - Index `availability_log_product_idx (product_id, created_at desc)`.
3. **Pflicht-Härtung „kein org_id-Drift" auf `reservations`/`sb_payments`** — `with check`, dass das mitgegebene `org_id` zur `farm_id` gehört (für `reservations` bereits vorhanden → für die Insert-Disziplin bestätigt; für `sb_payments` ist Insert ohnehin nur `service_role`, der Edge-Handler setzt `org_id` aus dem Hof — als Kommentar-Anker dokumentiert, kein Client-Insert).
4. **Negativ-Garantien als Kommentar-Inventar** — am Dateiende eine geprüfte Liste „Tabellen ohne anon/auth-Policy" (= nur `service_role`): `orgs`, `audit_log`, `payment_events`. Macht das deny-by-default-Versprechen im Schema selbst sichtbar und reviewbar.

> Alle Policy-Vereinheitlichungen sind **semantik-erhaltend** (gleiche Org-Grenze, nur eine Quelle) — kein Rechte-Upgrade, kein neuer Lesepfad. Retrofit-Risiko: niedrig; Rollback = `drop`-Block (siehe Migrationskopf).

### 2.3 Isolationstest (automatisiert, das Herzstück der Welle)
Ein eigenständiges Test-Skript prüft die RLS-Grenzen gegen die **lokale Supabase-CLI-Datenbank** (mit angewandten Migrationen + Seed). Es nutzt **drei Identitäten**:
- `anon` (anon key, kein Login),
- **Owner A** (User mit `profiles.org_id = …0001`, Hof Sonnenwiese),
- **Owner B** (User mit `profiles.org_id = …0002`, Imkerei Lindenblüte).

Geprüfte Fälle (jeder als harte Assertion, Test = Spezifikation — §0.9):

| # | Identität | Aktion | Erwartung (RLS-Wahrheit) |
|---|---|---|---|
| T1 | anon | `select * from farms` | OK, nur `deleted_at is null` (öffentlicher Katalog) |
| T2 | anon | `select * from reservations` | **0 Zeilen** (keine Select-Policy für anon) |
| T3 | anon | `select * from sb_payments` | **0 Zeilen** |
| T4 | anon | `select * from orgs` / `audit_log` | **0 Zeilen** (nur `service_role`) |
| T5 | anon | `insert into reservations` (valide `farm_id`+`org_id`) | OK (Insert-only erlaubt) |
| T6 | anon | `insert into reservations` (org_id ≠ farm.org_id) | **abgelehnt** (`with check` schlägt fehl) |
| T7 | Owner A | `select * from reservations` | nur Reservierungen mit `org_id = …0001` |
| T8 | Owner A | `select * from reservations where org_id = …0002` | **0 Zeilen** (Cross-Org dicht) |
| T9 | Owner A | `update products set availability=… where org_id=…0002` | **0 Zeilen betroffen** (fremder Hof nicht beschreibbar) |
| T10 | Owner A | `update products set availability=… where org_id=…0001` | OK + `availability_log`-Zeile entsteht (Trigger) |
| T11 | Owner A | `select * from sb_payments where org_id=…0002` | **0 Zeilen** |
| T12 | Owner A | `select * from farms` (leere Sicht erzwungen) | leeres Array, **kein 500** (Zero-State) |

> **Umsetzung (Stack-konform, ohne Account/Kosten):** Test gegen `supabase start` (lokale CLI-DB). Owner-Identitäten via `auth.admin.createUser` (service_role, nur im Test-Setup), `profiles`/`org_members` verknüpft; Owner-Clients über `supabase-js` mit user-scoped JWT (`auth.signInWithPassword`) → RLS greift wie in Prod. `anon`-Client mit anon key. Test-Runner: Node + `node:test` (kein neues Test-Framework nötig; passt zur strikten, schlanken Toolchain). Ablage: `app/supabase/tests/isolation.test.mjs` + Helfer `app/supabase/tests/_clients.mjs`; npm-Script `db:test`. Datei-/Pfadauflösung relativ zur Testdatei (`import.meta.url`) — nie nur `process.cwd()` (§0.9, kein stiller Skip).

### 2.4 Dokumentation, ADR & Tracker
- ADR `.claude/memory/decisions/` — „Verfügbarkeit als Zustands-Spalte + `availability_log` für Historie (statt Verfügbarkeits-Tabelle)" und „eine kanonische Org-Zugehörigkeit (`current_org_ids`)".
- `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md` (Soll laut MASTER_INDEX) — die Fallmatrix T1–T12 als verbindliche Soll-Spezifikation festschreiben.
- `app/supabase/README.md` (Abschnitt „Isolationstest") + `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` auf den realen Stand ziehen.
- Wiederverwendbares Muster (Isolationstest-Harness + `current_org_ids`-Helfer) → `.claude/memory/patterns/` (Imperium-Beschleuniger für 20 weitere Plattformen).

---

## 3. Konkrete Befehle

> Working-Dir für App-/DB-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich. Die Supabase-CLI startet eine **lokale** Postgres-Instanz (kein Self-Host, kein Account) — ideal für RLS-Tests ohne Kosten.

### 3.1 Lokale Supabase-DB hochfahren (kostenlos, kein Account)
```bash
cd app

# Supabase-CLI (einmalig; falls nicht global vorhanden)
npm i -D supabase            # oder: npm i -g supabase
npx supabase --version       # Toolchain-Check

# Lokale Stack-Instanz (Postgres + Auth + Storage) starten
npx supabase start           # gibt API URL + anon key + service_role key (lokal) aus
```

### 3.2 Migrationen + Seed anwenden (lokal)
```bash
cd app

# Wendet ALLE Migrationen (0001…0004) sauber an und spielt Seed ein (idempotent).
npx supabase db reset        # frischer Stand: migrations/ + supabase/seed.sql

# Alternativ einzeln verifizieren (z. B. nur neue Migration prüfen):
# psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/migrations/0004_isolation_and_availability_log.sql
```

### 3.3 Isolationstest fahren (das Acceptance-Gate dieser Welle)
```bash
cd app

# Test-Identitäten + RLS-Grenzen prüfen (Node node:test, gegen lokale Supabase-DB)
npm run db:test              # = node --test supabase/tests/isolation.test.mjs

# Erwartet: alle T1–T12 grün. Ein roter Fall = RLS-Leck = Merge blockiert.
```
`app/package.json` → `scripts` additiv ergänzen (bestehende nicht entfernen):
```jsonc
"db:reset": "supabase db reset",
"db:test":  "node --test supabase/tests/isolation.test.mjs"
```

### 3.4 Negativ-Probe (Test muss Lecks fangen — Beweis der Schärfe)
```bash
cd app
# Temporär eine zu weite Select-Policy einschleusen und beweisen, dass der Test rot wird:
#   create policy LEAK on reservations for select to anon using (true);   -- NUR im Wegwerf-Branch
# npm run db:test   → MUSS fehlschlagen (T2/T7/T8). Danach Policy verwerfen / db reset.
npx supabase db reset        # sauberer Stand wiederherstellen
```

### 3.5 Build-/Typ-Gate unberührt halten
```bash
cd app
npm run typecheck            # strict — Datenschicht-Typen passen weiter zum Schema
npm run build                # tsc --noEmit && vite build → dist/ (keine Frontend-Änderung nötig)
```

### 3.6 Go-Live (NUR mit Owner-Freigabe — Account/Kosten; nicht Teil dieser Welle)
```bash
# supabase login                          # Owner-Account
# supabase link --project-ref <eu-ref>    # EU-Projekt verknüpfen (Freigabe)
# supabase db push                        # additive Migrationen 0001…0004 (Freigabe)
# danach: app/.env mit VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY füllen → Live-Daten
```

---

## 4. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Schema & Migrationen**
1. `npx supabase db reset` wendet `0001…0004` fehlerfrei an; ein zweiter Lauf ist idempotent (kein Fehler bei Wiederholung).
2. Alle Zieltabellen existieren mit Tenant-Bezug: `orgs · profiles · farms · products · reservations · sb_payments · audit_log` + `availability_log`; Mutationstabellen haben `org_id`, Zeitstempel, `deleted_at` (wo sinnvoll).
3. `availability_log` wird **automatisch** befüllt, sobald sich `products.availability` ändert (Trigger), mit korrekter `org_id` und `changed_by`.

**RLS deny-by-default**
4. **Jede** Tabelle hat RLS aktiv (`pg_tables.rowsecurity = true`); kein Zugriff ohne explizite Policy.
5. `orgs`, `audit_log`, `payment_events` haben **keine** anon/authenticated-Policy → für sie liefert jede Client-Query 0 Zeilen.
6. Öffentlicher Katalog (`farms`/`products`) ist **nur** `select` und **nur** für aktive Zeilen (`deleted_at is null`) lesbar; kein Insert/Update/Delete für anon/authenticated.

**Isolationstest (blockierend)**
7. `npm run db:test` ist **grün**: alle Fälle T1–T12 erfüllt.
8. **Cross-Org dicht:** Owner A erhält für `org_id = …0002` in `reservations`/`sb_payments`/`products`-Update **0 Zeilen** (T8/T9/T11).
9. **anon dicht:** anon liest 0 Zeilen aus `reservations`/`sb_payments`/`orgs`/`audit_log` (T2–T4), darf aber valide `reservations` einfügen (T5) und wird bei org_id-Drift abgelehnt (T6).
10. **Zero-State statt Error:** leere Sicht ⇒ leeres Array, **kein 500** (T12); keine Query wirft `permission denied` als sichtbaren Server-Fehler statt 0 Zeilen.
11. **Schärfe bewiesen:** eine künstlich eingeschleuste zu weite Policy lässt `db:test` reproduzierbar **fehlschlagen** (§3.4); nach `db reset` wieder grün.

**Hygiene & Doku**
12. Nur `0004_*.sql` ist neu; `0001…0003` **unverändert** (additive Regel). Migrationskopf enthält Rollback-Block.
13. Kein Secret im Repo/Test: lokale service_role-Keys stammen aus `supabase status` (Laufzeit), werden **nicht** ins Repo geschrieben; Test liest sie aus der CLI-Umgebung.
14. `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`, `app/supabase/README.md`, `docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md` spiegeln den realen WAVE_02-Stand; ADRs liegen unter `.claude/memory/decisions/`.

---

## 5. Gate (Übergang zu WAVE_03)

> **WAVE_02-Isolations-Gate** ist **blockierend** (`PHASEN.md` → Isolations-Gate). Es ist Vorgate zu Phase-2-Gate **C (Tenant-Isolation)**. Kein Merge, keine Folge-Welle ohne grünen Isolationstest (AGENTS.md: „Kein Merge ohne grünen Isolationstest").

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **Schema-Gate** | `db reset` (0001…0004) grün + idempotent; alle Zieltabellen + `availability_log` da | §3.2 Lauf · §4.1–4.3 |
| **RLS-Gate** | RLS auf allen Tabellen aktiv; `orgs/audit_log/payment_events` ohne anon/auth-Policy | `db-rls-spezialist`-Review · §4.4–4.6 |
| **Isolations-Gate (blockierend)** | `npm run db:test` grün (T1–T12); Cross-Org & anon dicht; Zero-State statt 500 | §3.3 Lauf · `qa-tester` |
| **Schärfe-Gate** | künstliches Policy-Leck ⇒ `db:test` rot, danach grün | §3.4 Negativ-Probe |
| **Additiv-Gate** | nur `0004` neu, `0001…0003` unberührt, Rollback dokumentiert | Diff-Review `core-guardian` |
| **Secret-Gate** | keine service_role-Keys im Repo; Test liest aus CLI-Laufzeit | `security-auditor` (read-only) |
| **Doku-Gate** | TENANT_ISOLATION_TESTS.md + Tracker + ADRs aktuell | Review |

**Stop-Regeln in dieser Welle:**
- Eine sensible Route/Tabelle wäre serverseitig **nicht** org-scopebar oder Statusübergänge sind undefiniert → **STOP**, minimalen Fix vorschlagen, Owner-OK.
- Es wird ein **echtes** Supabase-EU-Projekt (Link/`db push`), produktive Keys oder eine Domain nötig → **STOP**, Owner-Freigabe (Account/Kosten).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

**Nächste Welle:** `WAVE_03 — Rollen/Sichtbarkeit` (RBAC Käufer/Erzeuger/Staff, Surface-Sichtbarkeit auf Basis dieser RLS-Grenzen) und parallel `WAVE_04` (Kernprodukt gegen das nun abgesicherte Schema).

---

## 6. Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_02 — Datenmodell + RLS + Isolationstest
- Geändert:
  · app/supabase/migrations/0004_isolation_and_availability_log.sql (NEU, additiv, idempotent,
    Rollback-Block): current_org_ids()-Helfer (eine kanonische Org-Zugehörigkeit), availability_log
    (+ Trigger products_availability_audit, RLS owner-read, Index), Vereinheitlichung der Owner-Read-
    Policies, Negativ-Garantie-Inventar (orgs/audit_log/payment_events = nur service_role).
  · app/supabase/tests/isolation.test.mjs + _clients.mjs (NEU): T1–T12 gegen lokale Supabase-DB
    (anon · Owner A …0001 · Owner B …0002), node:test, Pfade via import.meta.url.
  · app/package.json (scripts: db:reset, db:test — additiv).
  · docs/enterprise_pack/TENANT_ISOLATION_TESTS.md (NEU, Soll-Fallmatrix).
  · .claude/memory/decisions/ (2 ADRs), .claude/memory/patterns/ (Isolations-Harness).
  · app/supabase/README.md · docs/releases/PHASE_STATUS.md · MASTER_INDEX.md (Stand gezogen).
- Tests/Verifikation:
  · npx supabase db reset → 0001…0004 grün + idempotent.
  · npm run db:test → T1–T12 grün (anon dicht, Cross-Org dicht, Zero-State statt 500).
  · Negativ-Probe: künstliches Policy-Leck → db:test rot; nach db reset wieder grün.
  · npm run typecheck / npm run build → unverändert grün (keine Frontend-Änderung nötig).
- Risiken:
  · Niedrig. Additive Migration, semantik-erhaltende Policy-Vereinheitlichung (kein Rechte-Upgrade).
    Retrofit: bestehende Owner-Reads auf eine Quelle gehoben → Verhalten identisch, getestet.
    Rollback = drop-Block in 0004 (availability_log + Trigger + Helfer) → Stand 0003.
  · Offen (Owner-Freigabe): echtes Supabase-EU-Projekt + db push (WAVE_06/Phase 2).
- Nächste Welle: WAVE_03 — Rollen/Sichtbarkeit (RBAC, Surface-Sichtbarkeit auf diesen RLS-Grenzen),
  parallel WAVE_04 — Kernprodukt gegen das abgesicherte Schema.
```

---

## 7. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, Datenbank-/RLS-Regeln), `AGENTS.md` (SQL nur als additive Migration, „kein Merge ohne grünen Isolationstest"), `PHASEN.md` (Phase 1 → WAVE_02, Isolations-Gate).
- **Landkarte:** `MASTER_INDEX.md` (Abschnitt 1 `docs/DATABASE_MODEL.md`, Abschnitt 2 `TENANT_ISOLATION_MODEL.md`, Abschnitt 6 `enterprise_pack/TENANT_ISOLATION_TESTS.md`, Abschnitt 7 `finalization/WAVE_02`).
- **Reale Artefakte (Bestand):** `app/supabase/migrations/0001_core.sql · 0002_payments.sql · 0003_marketplace.sql`, `app/supabase/seed.sql`, `app/supabase/setup_all.sql`, `app/src/lib/data.ts · supabase.ts · types.ts`.
- **Vorwelle:** `finalization/WAVE_00_baseline.md` (Token-Kanon, Dual-Source-Datenschicht, Secret-Grenze, `snake_case`↔`camelCase`), `app/finalization/WAVE_01_release_hygiene.md` (Hygiene-Gate, CI, `.env`-Trennung).
- **Plattform-Pfeiler dieser Welle:** Org-Boundary/Datenisolation (1) · Zero-State statt Error (2) · RBAC-Fundament (4) · Audit & Verantwortlichkeit (5, `audit_log` + `availability_log`) · Testpflicht pro Feature (6, T1–T12) · Drilldown-Integrität (7, keine org-fremden Lesepfade).

> Diese Welle ist **additiv** und ändert keine kosten-/außenwirksame Ressource. Für jeden Live-/Account-/Kosten-Schritt (Supabase-Link, `db push`, Cloudflare-Deploy, echte Keys) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.** Vermittler-Disclaimer bleibt durchgängig: Die Plattform vermittelt und bindet Zahlung an — sie verkauft nicht selbst und berät nicht.
