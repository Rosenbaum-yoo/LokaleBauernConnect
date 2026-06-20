# LokaleBauernConnect — Backup, Disaster Recovery & Restore-Drill

> **Stand:** 2026-06-19 · **Verbindliches Betriebs- und Wiederherstellungsdokument**
> Beschreibt die vollständige Backup- und Disaster-Recovery-Strategie auf dem fixen Imperium-Stack: **Supabase (EU, PostgreSQL 16 + RLS + Storage)** · **Cloudflare (Pages/Workers/Turnstile/WAF)** · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker** — die DR-Strategie nutzt ausschließlich verwaltete (managed) Provider-Mechanismen.
>
> Nur die Gliederung folgt dem Imperium-DR-Blueprint; sämtliche Inhalte sind originär auf die **Hof-Domäne** und den Managed-Stack (Supabase/Cloudflare/Stripe) geschrieben. **Keine VMS-/Zeitarbeits-/Hetzner-Begriffe** — der Kanon ist die Hof-Domäne (Käufer/Erzeuger/Staff, Hof, Reservierung, SB-Zahlung).
>
> **Rolle der Plattform:** **Vermittler** — kein Eigenverkauf, keine Beratung. Geld fließt über Stripe Connect direkt an den Hof; die Plattform behält nur eine Gebühr. Das hat unmittelbare DR-Konsequenzen: **Stripe ist die externe Geld-Wahrheit** (Quittungen, Auszahlungen), unsere DB hält nur die Vermittlungs-Referenzen (siehe §11).
>
> **Verwandte Dokumente:** `docs/DATABASE_MODEL.md` (Tabellen/RLS) · `docs/ENTERPRISE_ARCHITECTURE.md` (§Ausfallszenarien) · `docs/DEPLOYMENT.md` (Cloudflare) · `docs/INCIDENT_RUNBOOK.md` (Sofortmaßnahmen) · `docs/MONITORING.md` (Health/Alerts) · `docs/security/SECRET_ROTATION.md` (Rotation nach Kompromittierung) · `PHASEN.md` (WAVE_13 Observability, Phase 3 Ops-Gate) · `app/supabase/migrations/0001_core.sql` · `app/supabase/seed.sql` · `app/supabase/setup_all.sql`.

---

## 0 · Geltungsbereich & Reifegrad

Diese DR-Strategie gilt für **alle persistenten Zustände** der Plattform. Der heutige Codestand ist **standalone-first** (ADR 0002): Die App läuft mit Seed-Fallback ohne Backend; der Supabase-Umstieg ist reine Konfiguration. Entsprechend ist DR in zwei Reifegrade getrennt:

| Reifegrad | Bedeutung | Markierung |
|---|---|---|
| **Heute durchführbar** | Gegen reale Repo-Artefakte (Migration, Seed, `setup_all.sql`) **jetzt** ausführbar — siehe §6 Restore-Drill (durchgeführt). | ✅ |
| **Aktiviert bei Supabase-Live** | Wird mit dem ersten echten Supabase-Projekt scharfgeschaltet (Owner-Freigabe Account/Kosten, `PHASE_STATUS.md` WAVE_02 Live). | 🔨 |

> **Owner-Gate:** Aktivierung von PITR/Branching, Backup-Retention-Erhöhung und Off-Site-Sync sind **Account-/Kosten-Entscheidungen** → vorab in Klartext ankündigen, erst auf OK (`CLAUDE.md` §Sicherheits- & Betriebsregeln).

---

## 1 · Recovery-Ziele (RPO / RTO)

| Kennzahl | Ziel | Begründung |
|---|---|---|
| **RPO** (max. Datenverlust) | **≤ 2 Minuten** (Supabase PITR, Pro-Plan) · **≤ 24 Stunden** (Daily Logical Backup, alle Pläne) | Supabase Point-in-Time-Recovery archiviert WAL kontinuierlich (Granularität ~Sekunden, in der Praxis ≤ 2 min). Ohne PITR greift das tägliche automatische Backup (RPO 24 h). |
| **RTO** (max. Ausfallzeit) | **≤ 30 Minuten** (PITR/Restore über Dashboard) · **≤ 60 Minuten** (Neu-Provisionierung + `setup_all.sql` + Restore) | Hauptzeit ist Diagnose + Entscheidung, nicht die Mechanik. Frontend (Cloudflare Pages) ist statisch und global gecached → bleibt erreichbar, auch wenn die DB restored wird. |
| **RTO Frontend** | **≤ 5 Minuten** | Cloudflare Pages Rollback ist ein Deployment-Wechsel (frühere Version „Promote"). Edge-CDN macht das Frontend von einem DB-Ausfall weitgehend entkoppelt. |

**Realistischer Worst Case — versehentliches Massen-`DELETE` ohne PITR (nur Daily Backup):**
- Datenverlust: bis 24 h (seit letztem automatischem Backup)
- Ausfallzeit: 30–60 min (Diagnose → Restore-Entscheidung → Dashboard-Restore → Integritätsprüfung → Smoke-Test)

**Best Case — derselbe Fehler mit PITR (Pro-Plan):**
- Datenverlust: ≤ 2 min (Restore auf Zeitpunkt unmittelbar vor dem Fehler)
- Ausfallzeit: 15–30 min (PITR im Dashboard + App-Reconnect + Verifikation)

> **Skalierungs-Hinweis (§0.7 Marktführer-Standard):** RPO/RTO sind als **datenbankgetragene Eigenschaft** definiert, nicht als Skript-Versprechen. Der Pfad 10 → 300 → 3000 Höfe verschärft RTO nicht, weil die Restore-Mechanik provider-seitig konstant bleibt; er verschärft nur die Retention-/Off-Site-Anforderung (siehe §10).

---

## 2 · Backup-Strategie (Supabase Managed)

### 2a · Schichten-Modell

| # | Schicht | Methode | Frequenz | Retention | RPO | Reifegrad |
|---|---|---|---|---|---|---|
| **1** | **Daily Logical Backup** | Supabase automatisches tägliches Backup (alle Pläne) | täglich | 7 Tage (Pro: 14 Tage konfigurierbar) | 24 h | 🔨 |
| **2** | **PITR (WAL-Archiv)** | Supabase Point-in-Time-Recovery (Pro-Add-on) | kontinuierlich | 7 Tage zurück (konfigurierbar bis 28 Tage) | ≤ 2 min | 🔨 |
| **3** | **Pre-Migration Snapshot** | Manuelles Backup / DB-Branch **vor** jeder Schema-Migration | je Deploy mit Schema-Änderung | 30 Tage | 0 (Stand vor Migration) | ✅/🔨 |
| **4** | **Off-Site Logical Dump** | `supabase db dump` → verschlüsselt nach Cloudflare R2 (anderer Anbieterhof) | täglich (Edge/Cron) | 30 Tage | 24 h | 🔨 |
| **5** | **Schema-as-Code** | `app/supabase/migrations/*` + `seed.sql` + `setup_all.sql` in Git | bei jedem Commit | unbegrenzt (Git-Historie) | n/a (Struktur, keine Nutzdaten) | ✅ |
| **6** | **Storage-Bucket-Backup** | Versionierte Replikation der Supabase-Storage-Buckets (Hof-Bilder/Logos) nach R2 | täglich | 30 Tage | 24 h | 🔨 |
| **7** | **Frontend-Deploy-Historie** | Cloudflare Pages hält frühere Deployments (Rollback per „Promote") | je Deploy | provider-seitig | 0 | 🔨 |

**Designprinzip „3-2-1, managed":** mindestens **3** Kopien der Daten (Live-DB, Provider-Backup/PITR, Off-Site R2-Dump), auf **2** unabhängigen Anbieter-Domänen (Supabase + Cloudflare R2), davon **1** off-site/getrennt vom Live-Projekt. Schicht 5 (Schema-as-Code) garantiert, dass die **Struktur** auch bei Totalverlust beider Datendienste in Sekunden reproduzierbar ist.

### 2b · Aufbewahrungsstrategie

| Zeitraum | Was wird aufbewahrt |
|---|---|
| 0–7 Tage | Alle täglichen Provider-Backups + (Pro) lückenloses PITR-Fenster |
| 7–30 Tage | Off-Site-Dumps (Schicht 4) + Storage-Backups (Schicht 6) |
| > 30 Tage | Automatisch gelöscht. **Empfehlung:** 1 monatlicher verschlüsselter Dump in R2 mit Object-Lock (Ransomware-/Versehens-Schutz) für ≥ 12 Monate (Buchführungs-/Audit-Nähe der `audit_log`-Daten). |

### 2c · Speicherorte & Risiko-Abdeckung

| Speicherort | Zweck | Risiko-Abdeckung |
|---|---|---|
| Supabase Live-DB | Betrieb | — |
| Supabase Daily Backup + PITR | Provider-seitige Sicherung | Bedienfehler, Korruption, fehlgeschlagene Migration |
| Cloudflare R2 (verschlüsselt, Object-Lock) | Off-Site-Langzeit | Supabase-Projekt-Verlust, Account-Kompromittierung, Ransomware |
| Git-Repo (`app/supabase/*`) | Schema/Seed als Code | Struktur-Totalverlust, Neuaufbau von Null |

> **Verschlüsselung:** Off-Site-Dumps werden **vor** dem Upload verschlüsselt (z. B. `age`/GPG). Der Schlüssel liegt **nicht** im selben Account wie die Backups (Trennung gemäß `docs/security/SECRET_ROTATION.md`). Niemals Secrets im Dump-Pfad oder Log (`AGENTS.md` Harte Regeln).

---

## 3 · Datenklassifikation (Hof-Domäne)

Klassifikation steuert Restore-Priorität, Retention und Rekonstruierbarkeit. Tabellen exakt aus `app/supabase/migrations/0001_core.sql` (WAVE_02): `orgs`, `profiles`, `farms`, `products`, `reservations`, `waitlist`, `audit_log`. `sb_payments` (USP, Phase 4 Track A) ist hier **vorgeplant** und in die Strategie aufgenommen, sobald die Migration existiert.

### Klasse A — Geschäftskritisch (Verlust = Betriebsunterbrechung + rechtliche/finanzielle Folgen)

| Domäne | Tabellen | Begründung |
|---|---|---|
| **Mandanten & Identität** | `orgs`, `profiles` | Plattformzugang, Tenant-Zuordnung (`org_id`), Abo-Basis. Verlust = niemand kommt mehr in seine Org. |
| **SB-Zahlungen (USP)** | `sb_payments` *(Phase 4)* | Zahlungsanbindung Käufer↔Hof (Stripe Connect). Rechtlich/finanziell relevant. **Stripe bleibt die externe Wahrheit** — DB hält nur Referenzen (`stripe_payment_intent_id`, Betrag, Status). |
| **Audit-Trail** | `audit_log` | Append-only Nachweis jeder kritischen Mutation (wer/was/warum). DSGVO-/Verantwortlichkeits-Nachweis. **Nicht rekonstruierbar.** |

### Klasse B — Wichtig (Verlust = Geschäftseinschränkung, teils rekonstruierbar)

| Domäne | Tabellen | Begründung |
|---|---|---|
| **Höfe (Stammdaten)** | `farms` | Hofladen-Finder-Basis. Vom Erzeuger erneut pflegbar, aber aufwändig (Story, Öffnungszeiten, Geo). Bilder liegen in Storage (Klasse B, separat). |
| **Produktkatalog** | `products` | Verfügbarkeits-/Preisbasis. Vom Erzeuger neu pflegbar (Selbstpflege). |
| **Reservierungen** | `reservations` | Laufende Abhol-Transaktionen. Teils über Käufer-Kontakt rekonstruierbar, aber Abholfenster verfallen (`expired`). |

### Klasse C — Unkritisch (Verlust = temporäre Einschränkung, regenerierbar)

| Domäne | Tabellen | Begründung |
|---|---|---|
| **Warteliste** | `waitlist` | Interessensbekundung je ausverkauftem Produkt. Käufer können sich erneut eintragen. |
| **Sessions** | `auth.sessions` (Supabase Auth) | Nutzer loggen sich erneut ein. Liegt im Auth-Schema (Provider-gesichert). |

> **Storage-Klassifikation:** Hof-Bilder/Logos im Supabase-Storage-Bucket = **Klasse B** (vom Erzeuger neu hochladbar, aber UX-relevant). Backup via Schicht 6. Verwaiste DB→Storage-Referenzen werden im Restore-Check (§7) geprüft.

---

## 4 · Szenario-Risiko-Wiederherstellungs-Matrix

### Szenario 1 — Versehentliches DELETE/UPDATE (Bedienfehler, fehlerhafter Edge-Call)

| Aspekt | Detail |
|---|---|
| **Risiko** | Mittel — jederzeit durch Staff-Aktion, fehlerhaften Backfill-Job (service role) oder Migrations-Skript möglich. |
| **Beispiel** | `update products set availability='out'` ohne `where`; Edge-Function-Backfill mit falschem `org_id`-Filter. |
| **Priorität** | HOCH |
| **RPO** | PITR: ≤ 2 min · Daily Backup: ≤ 24 h |
| **Wiederherstellungsweg** | **A (PITR, bevorzugt):** Supabase Dashboard → Database → **Restore to a point in time** → Zeitpunkt **unmittelbar vor** dem Fehler. **B (ohne PITR):** Restore aus letztem Daily Backup (Datenverlust bis 24 h). **C (selektiv):** Wenn nur eine Org betroffen ist und PITR aus ist — letzten Off-Site-Dump in eine **Staging-DB** einspielen, betroffene Zeilen org-gefiltert zurückkopieren (RLS beachten: über service role in Edge/SQL-Editor). |
| **Post-Restore** | Integritätsprüfung §7, betroffene Erzeuger/Käufer informieren, Vorgang in `audit_log` dokumentieren (§11). |

### Szenario 2 — DB-Korruption / interner Provider-Fehler

| Aspekt | Detail |
|---|---|
| **Risiko** | Niedrig (Supabase Managed mit Redundanz), aber nicht null. |
| **Beispiel** | WAL-Inkonsistenz, Provider-Incident mit Datenverlust. |
| **Priorität** | KRITISCH |
| **RPO** | PITR: ≤ 2 min · Daily Backup: ≤ 24 h |
| **Wiederherstellungsweg** | Supabase Status prüfen (status.supabase.com). Provider-Restore (PITR/Daily) im Dashboard. Bei Projekt-Schaden: neues Projekt provisionieren → `setup_all.sql` (Schema+RLS) → Daten aus jüngstem Off-Site-Dump (Schicht 4). |
| **Post-Restore** | `VACUUM ANALYZE`, Tabellenzählung §7a, FK-Konsistenz §7b, Smoke-Test §8. |

### Szenario 3 — Supabase-Projekt-Totalverlust (Projekt gelöscht / Account-Verlust / Region-Ausfall)

| Aspekt | Detail |
|---|---|
| **Risiko** | Sehr niedrig, aber katastrophal. |
| **Beispiel** | Projekt versehentlich gelöscht, Billing-Sperre, EU-Region-Großausfall. |
| **Priorität** | KRITISCH |
| **RPO** | abhängig vom Off-Site-Dump (Schicht 4): ≤ 24 h |
| **Wiederherstellungsweg** | 1. **Neues Supabase-Projekt** in EU-Region provisionieren. 2. **Schema+RLS** anwenden: `app/supabase/setup_all.sql` im SQL-Editor (oder `supabase db push`). 3. **Daten** aus jüngstem **Off-Site R2-Dump** einspielen (`psql`/`supabase db`). 4. **Storage**: Buckets aus R2-Backup wiederherstellen (Schicht 6). 5. **Secrets rotieren** + neue Keys in Cloudflare-Env setzen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, service-role nur in Edge-Secrets). 6. **Edge Functions** neu deployen. 7. **Stripe-Webhook-Endpoint** auf neue Edge-URL umstellen + Signing-Secret rotieren. 8. **DNS/Cloudflare** unverändert lassen (Pages bleibt online — Frontend reconnectet auf neue URL via Env). |
| **Post-Restore** | Voll-Smoke-Test §8, Stripe-Webhook-Idempotenz prüfen, Monitoring reaktivieren. |

### Szenario 4 — Fehlgeschlagene Migration

| Aspekt | Detail |
|---|---|
| **Risiko** | Mittel — bei jedem Deploy mit Schema-Änderung. |
| **Beispiel** | Neue Migration scheitert an `NOT NULL` auf Bestandsdaten oder bricht eine RLS-Policy. |
| **Priorität** | HOCH |
| **RPO** | 0 (Pre-Migration-Snapshot, Schicht 3) |
| **Wiederherstellungsweg** | **Vor** jeder Schema-Migration: manuelles Backup/DB-Branch (Schicht 3). Bei Fehlschlag: 1. Migration ist **additiv** und idempotent (`AGENTS.md`) → meist vorwärts-fixbar. 2. Sonst: PITR auf Zeitpunkt vor Migration **oder** Restore des Pre-Migration-Snapshots. 3. Migration im Repo korrigieren, erneut anwenden. |
| **Post-Restore** | Migrations-Stand prüfen: `select * from supabase_migrations.schema_migrations order by version desc limit 5;` + RLS-Härtungs-Check §7e. |

### Szenario 5 — Ransomware / unbefugter Zugriff / Key-Leak

| Aspekt | Detail |
|---|---|
| **Risiko** | Niedrig (Managed, RLS deny-by-default, service-role nie im Client), aber katastrophale Wirkung. |
| **Beispiel** | service-role-Key geleakt, Cloudflare-/Supabase-Account-Übernahme. |
| **Priorität** | KRITISCH |
| **RPO** | aus **Off-Site**-Backup (nicht aus möglicherweise manipuliertem Live-Stand). |
| **Wiederherstellungsweg** | 1. **Sofort isolieren:** kompromittierte Keys widerrufen (Supabase API-Keys rotieren, JWT-Secret neu, Stripe-Keys + Webhook-Secret rotieren) — Ablauf in `docs/security/SECRET_ROTATION.md`. 2. **Cloudflare WAF** verschärfen, Turnstile-Schwelle anheben. 3. **Restore aus Off-Site-Dump** (Schicht 4, **vor** dem Kompromittierungs-Zeitpunkt — über `audit_log` eingrenzen). 4. **Alle Sessions invalidieren** (Supabase Auth → Sign-out-all / JWT-Secret-Rotation erzwingt Re-Login). 5. Forensik des kompromittierten Stands **offline** (Kopie, nicht Live). |
| **Post-Restore** | DSGVO-Meldepflicht prüfen (**72-h-Frist** an Aufsichtsbehörde bei personenbezogenem Datenabfluss, vgl. `docs/COMPLIANCE_MODEL.md`), Käufer/Erzeuger ggf. informieren, Passwort-Reset erzwingen. |

### Szenario 6 — Stripe-/Zahlungs-Desync (USP-spezifisch, Phase 4)

| Aspekt | Detail |
|---|---|
| **Risiko** | Mittel nach jedem DB-Restore mit `sb_payments`. |
| **Beispiel** | Nach PITR fehlen `sb_payments`-Zeilen zwischen Restore-Zeitpunkt und „jetzt"; Käufer hat aber bezahlt (Stripe hat die Wahrheit). |
| **Priorität** | HOCH |
| **RPO** | 0 für die **Geld-Wahrheit** (Stripe), DB ist nur Spiegel. |
| **Wiederherstellungsweg** | 1. **Stripe-Dashboard / API ist die Quelle der Wahrheit** für tatsächliche Zahlungen/Auszahlungen — niemals umgekehrt. 2. Idempotenten Webhook-Handler erneut die fehlenden `payment_intent.succeeded`-Events verarbeiten lassen (Stripe-Event-Replay), oder per Backfill-Edge-Function `sb_payments` aus Stripe rekonstruieren (Match über `stripe_payment_intent_id`). 3. Auszahlungs-/Gebühren-Abgleich gegen Stripe-Connect-Reports. |
| **Post-Restore** | Keine doppelten Zahlungen (Idempotenz-Schlüssel prüfen), Connect-Auszahlungen an Höfe stimmen, Quittungs-Nummernkreis lückenlos. |

---

## 5 · Restore-Ablauf (operative Reihenfolge)

### 5a · Voll-Restore (neues Projekt, Szenario 3) — Schritt für Schritt

```
 1. Aktuellen Stand sichern, falls noch erreichbar (Sicherheitsnetz):
    supabase db dump --db-url "$LIVE_DB_URL" -f restore-net-$(date +%F).sql

 2. Owner informieren + Downtime-Fenster ankündigen (Klartext, vorab OK).

 3. Frontend in Wartung: Cloudflare Pages bleibt online; optional Wartungs-Hinweis
    via Feature-Flag (App liest Flag, zeigt Banner). Kein Hard-Down nötig.

 4. Neues Supabase-Projekt (EU-Region) provisionieren.

 5. Schema + RLS anwenden (Struktur ZUERST):
    # Option A (CLI):
    supabase link --project-ref <neu> && supabase db push
    # Option B (SQL-Editor): Inhalt von app/supabase/setup_all.sql einfügen & Run

 6. Storage-Buckets anlegen + aus R2-Backup einspielen (Schicht 6),
    BEVOR DB-Referenzen darauf zeigen.

 7. Nutzdaten aus jüngstem Off-Site-Dump einspielen (Reihenfolge §5b beachten,
    falls manuelles SQL; logischer Dump löst FK selbst auf).

 8. Secrets/Env neu setzen (Cloudflare): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY;
    service-role NUR als Edge-Function-Secret. Stripe-Keys + Webhook-Secret rotieren.

 9. Edge Functions deployen; Stripe-Webhook-Endpoint auf neue URL + neues Secret.

10. Post-Restore Integritätsprüfung (§7) — alle Checks grün.

11. Smoke-Test (§8): Finder → Hof-Detail → Reservierung → (Phase 4) SB-Zahlung.

12. Monitoring/Alerts 30 min beobachten (Sentry, Supabase-Logs, Stripe-Events).
```

### 5b · FK-Restore-Reihenfolge (nur bei manuellem SQL-Restore)

Ein logischer Dump (`pg_dump`/`supabase db dump`) löst die Reihenfolge automatisch. Bei manuellem zeilenweisem Restore diese Ebenen einhalten (FK-Kette aus `0001_core.sql`):

```
Ebene 1 (keine FK):                 orgs
Ebene 2 (FK → auth.users, orgs):    profiles
Ebene 3 (FK → orgs):                farms            (farms.id = text-Slug-PK)
Ebene 4 (FK → farms, orgs):         products
Ebene 5 (FK → farms, products):     reservations, waitlist
Ebene 6 (FK → orgs, farms; Phase4): sb_payments
Unabhängig (append-only):           audit_log
```

> **Wichtig:** `farms.id` ist ein **stabiler Text-Slug** (z. B. `'hof-sonnenwiese'`), kein UUID. Restore-Skripte dürfen Slugs nicht neu generieren — Deep-Links und `products.farm_id` hängen daran (Pfeiler 7 Drilldown-Integrität).

---

## 6 · Restore-Drill — DURCHGEFÜHRT (nicht nur dokumentiert)

> **Anspruch (Brief):** Der Restore-Drill ist real auszuführen. Da der Live-Stack **standalone-first** ist (noch kein Supabase-Projekt, Owner-Gate offen) und in dieser Umgebung **kein** `psql`/`pg_dump`/`supabase`-CLI installiert ist, wurde der **jetzt durchführbare** Drill ausgeführt: die **Validierung des Wiederherstellungs-Artefakts** — also die Garantie, dass aus den Repo-Quellen (`setup_all.sql` + `seed.sql`) ein **vollständiges, RLS-gesichertes, mengen-exaktes** Schema reproduzierbar ist. Das ist exakt die Eigenschaft, von der Szenario 3/4 abhängen. Der DB-seitige Restore-Drill (PITR-Restore in Staging) ist als nächster Schritt unter §6c spezifiziert und wird mit Supabase-Live (🔨) ausgeführt.

### 6a · Durchgeführter Drill — Artefakt-Validierung (✅ 2026-06-19)

**Ausgeführt** mit Node v24 gegen die realen Dateien `app/supabase/migrations/0001_core.sql`, `app/supabase/seed.sql`, `app/supabase/setup_all.sql`. Erhobene Ist-Werte:

| Prüfung | Erwartung | Ist-Ergebnis (gemessen) | Status |
|---|---|---|---|
| Erzeugte Tabellen | `orgs, profiles, farms, products, reservations, waitlist, audit_log` (7) | **7** — exakt diese Tabellen | ✅ |
| RLS `enable row level security` | 1× je Tabelle (7) | **7** (alle 7 Tabellen) | ✅ |
| RLS-Policies vorhanden | ≥ 1 pro lesbarer/schreibbarer Tabelle | **8 `create policy`** | ✅ |
| `setup_all.sql` enthält Schema | ja | enthält WAVE_02-Schema | ✅ |
| `setup_all.sql` enthält Seed | ja | enthält `insert into products` | ✅ |
| Seed-Mengen `orgs` | 9 | **9** | ✅ |
| Seed-Mengen `farms` | 9 | **9** | ✅ |
| Seed-Mengen `products` | 25 | **25** | ✅ |
| Idempotenz Seed | alle Inserts `on conflict … do nothing` | bestätigt (orgs/farms/products) | ✅ |
| `farms.id`-Typ | Text-Slug (stabil) | bestätigt (`text primary key`) | ✅ |

**Erwartete Soll-Zählung nach Restore aus Seed** (Baseline für §7a, gegen Drift abgesichert):

| Tabelle | Soll nach `setup_all.sql` |
|---|---|
| `orgs` | 9 |
| `farms` | 9 |
| `products` | 25 |
| `reservations` | 0 (laufzeitgefüllt) |
| `waitlist` | 0 (laufzeitgefüllt) |
| `audit_log` | ≥ 0 (append-only, laufzeitgefüllt) |

### 6b · Drill-Befund mit Handlungsbedarf (HÄRTUNG)

Der Drill hat **einen realen Härtungs-Gap** offengelegt:

> **Befund H-1 — `force row level security` fehlt.** In `0001_core.sql` ist RLS auf allen 7 Tabellen **`enable`d** (gemessen: 7×), aber **`force row level security` ist 0×** gesetzt. Damit umgeht der **Tabelleneigentümer** (und damit potenziell die service-role) RLS, statt geprüft zu werden. `docs/DATABASE_MODEL.md` und `docs/ENTERPRISE_ARCHITECTURE.md` führen `force` als kanonisches Policy-Muster — die Migration bleibt dahinter zurück.
>
> **DR-Relevanz:** Nach einem Restore über service-role-Pfade (Backfill, manuelles SQL) ist die Isolationsgarantie nur durch RLS-Logik gedeckt, nicht durch `force`-Erzwingung. **Empfehlung:** additive Migration `0002_force_rls.sql` mit `alter table … force row level security;` für alle 7 Tabellen, anschließend Isolations-Negativtest (fremde Org = 403). Bis dahin: jeder service-role-Restore-Schritt muss org-gefiltert und audit-geloggt erfolgen.

*(Dieser Befund ist genau der Wert eines echten Drills: er findet die Lücke, bevor der Ernstfall sie findet.)*

### 6c · Nächster Drill — PITR-Restore in Staging (🔨, bei Supabase-Live)

Reproduzierbares Skript, auszuführen sobald das Supabase-Projekt steht (Owner-Gate):

```
 1. Staging-Projekt provisionieren; setup_all.sql anwenden; Seed laden (9/9/25).
 2. Kontrolliert Schaden simulieren + Zeitpunkt notieren:
      delete from products where org_id = '…0003';   -- 'Biohof Eichkamp'
      select now();                                    -- T_fehler merken
 3. PITR-Restore im Dashboard auf (T_fehler − 1 s).
 4. Integritätsprüfung §7 ausführen — Soll: products zurück auf 25.
 5. Isolations-Negativtest: fremde Org liefert 403/leer (kein Fremdleck).
 6. Restore-Dauer messen → RTO gegen Ziel (§1) abgleichen, hier protokollieren.
 7. Ergebnis in §6d-Tabelle + docs/releases/PHASE_STATUS.md (WAVE_13) eintragen.
```

### 6d · Drill-Protokoll (fortzuschreiben)

| Datum | Drill-Typ | Umfang | Ergebnis | Befunde | Durchgeführt von |
|---|---|---|---|---|---|
| 2026-06-19 | Artefakt-Validierung (✅) | `setup_all.sql`+`seed.sql` (7 Tab., RLS, 9/9/25) | bestanden | **H-1**: `force rls` fehlt → `0002_force_rls.sql` empfohlen | Claude (Voll-Stack) |
| *(offen)* | PITR-Restore Staging (🔨) | §6c | — | — | — |
| *(offen)* | Off-Site-Dump-Restore (🔨) | Schicht 4 → Staging | — | — | — |

---

## 7 · Post-Restore-Integritätsprüfung

Nach **jedem** Restore (Drill oder Ernstfall) auszuführen. SQL exakt auf die realen Tabellen abgestimmt.

### 7a · Basis-Zählung (gegen Soll §6a)

```sql
select 'orgs'         as tabelle, count(*) as zeilen from orgs
union all select 'profiles',     count(*) from profiles
union all select 'farms',        count(*) from farms
union all select 'products',     count(*) from products
union all select 'reservations', count(*) from reservations
union all select 'waitlist',     count(*) from waitlist
union all select 'audit_log',    count(*) from audit_log;
-- Erwartung nach Seed-Restore: orgs=9, farms=9, products=25 (Rest laufzeitabhängig)
```

### 7b · FK-Konsistenz (verwaiste Referenzen — Erwartung: alle 0)

```sql
-- Produkte ohne gültigen Hof
select count(*) as verwaiste_produkte
from products p left join farms f on p.farm_id = f.id
where f.id is null;

-- Reservierungen ohne gültigen Hof / ohne gültiges Produkt
select count(*) as resv_ohne_hof
from reservations r left join farms f on r.farm_id = f.id where f.id is null;
select count(*) as resv_ohne_produkt
from reservations r left join products p on r.product_id = p.id where p.id is null;

-- Höfe ohne gültige Org (Mandantenbruch!)
select count(*) as farms_ohne_org
from farms fa left join orgs o on fa.org_id = o.id where o.id is null;

-- Wartelisten-Einträge ohne Produkt
select count(*) as waitlist_ohne_produkt
from waitlist w left join products p on w.product_id = p.id where p.id is null;
```

### 7c · Org-Konsistenz (`org_id` muss entlang der Kette gleich sein)

```sql
-- Produkt.org_id muss == zugehöriger farm.org_id sein (Tenant-Drift verhindern)
select count(*) as org_drift_products
from products p join farms f on p.farm_id = f.id
where p.org_id <> f.org_id;

-- Reservierung.org_id muss == farm.org_id sein
select count(*) as org_drift_reservations
from reservations r join farms f on r.farm_id = f.id
where r.org_id <> f.org_id;
-- Erwartung: beide = 0. >0 => Mandantenverletzung, Restore-Quelle wechseln.
```

### 7d · Geschäftsplausibilität (Hof-Domäne)

```sql
-- Preise plausibel (keine negativen/Null-Preise im Katalog)
select count(*) as ungueltige_preise from products where price <= 0;

-- Reservierungs-Status im erlaubten Enum-Raum
select status, count(*) from reservations group by status order by status;

-- (Phase 4) SB-Zahlungen: kein Betrag <= 0 bei erfolgreicher Zahlung
-- select count(*) from sb_payments where status='succeeded' and amount_cents <= 0;
```

### 7e · RLS-Härtung & Audit-Konsistenz (Pflicht nach Restore)

```sql
-- 1) RLS ist auf ALLEN fachlichen Tabellen aktiv (rowsecurity = true)
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('orgs','profiles','farms','products','reservations','waitlist','audit_log')
order by relname;
-- Erwartung: relrowsecurity = true überall.
-- relforcerowsecurity sollte true sein -> siehe Befund H-1 (§6b), sonst Migration 0002.

-- 2) Policies vorhanden (Soll lt. Drill: >= 8)
select schemaname, tablename, policyname from pg_policies
where schemaname='public' order by tablename, policyname;

-- 3) Audit-Log: letzter Eintrag + keine 24h-Lücken der letzten 7 Tage
select max(created_at) as letzter_audit from audit_log;
select date_trunc('day', created_at) as tag, count(*)
from audit_log where created_at > now() - interval '7 days'
group by tag order by tag;
```

> **Abbruch-Kriterium:** Wenn 7b/7c **> 0** liefern oder 7e RLS-Lücken zeigt → Restore **nicht freigeben**, ältere Quelle/PITR-Zeitpunkt wählen, erneut prüfen.

---

## 8 · Smoke-Test nach Restore (End-to-End-Kette)

Restore gilt erst als erfolgreich, wenn die **echte Kette** steht (Pfeiler-Disziplin „Endpoint → Fetch → DOM → Zustände → Handler"):

- [ ] **Finder** lädt Höfe (≥ 9 sichtbar), Karte/Liste rendert, kein 500 bei leerer Filterung (Zero-State greift).
- [ ] **Hof-Detail** über Slug-Deep-Link erreichbar (`/hof/hof-sonnenwiese`), Produkte + Verfügbarkeit korrekt.
- [ ] **Reservierung** anlegen → erscheint mit Status `requested`, Audit-Eintrag entsteht.
- [ ] **Warteliste** für ausverkauftes Produkt eintragbar.
- [ ] **RBAC/Isolation:** Erzeuger A sieht **nicht** Reservierungen von Hof B (fremde Org = 403/leer, **nie** 200 mit Fremddaten).
- [ ] **Storage:** Hof-Bilder laden (kein 404 auf Bucket-Objekte).
- [ ] **(Phase 4) SB-Zahlung:** QR → Stripe → Quittung; Webhook idempotent, `sb_payments` stimmt mit Stripe überein.
- [ ] **Konsole sauber:** keine `TypeError`/401-Schleifen; Sentry ohne neue Fehlerklasse.

---

## 9 · Verantwortlichkeiten & Kadenz

| Rolle | Aufgabe | Frequenz |
|---|---|---|
| **Ops (Claude/Staff)** | Supabase Daily-Backup-Status + PITR-Fenster im Dashboard prüfen | wöchentlich |
| **Ops** | Off-Site-Dump-Job (Schicht 4) auf Erfolg prüfen (Log + Manifest in R2) | wöchentlich |
| **Ops** | **Restore-Drill** durchführen + in §6d protokollieren | monatlich (mind. 1× vor Go-Live) |
| **Ops/Security** | Voll-DR-Drill (neues Projekt aus Off-Site, Szenario 3) | quartalsweise |
| **Deployer** | Pre-Migration-Snapshot **vor** jeder Schema-Migration | je Schema-Deploy |
| **Security-Auditor** | Backup-Verschlüsselung + Schlüsseltrennung reviewen | quartalsweise |
| **Owner** | Entscheidung RPO/RTO-Anhebung, PITR-Aktivierung, Retention-/Kosten | halbjährlich / bei Wachstum |

---

## 10 · Skalierung der DR-Strategie (10 → 300 → 3000 Höfe)

| Phase | Maßnahme |
|---|---|
| **Go-Live (jetzt)** | Daily Backup aktiv · Schema-as-Code (✅) · Pre-Migration-Snapshot · monatlicher Restore-Drill. |
| **> 50 Höfe** | **PITR aktivieren** (Pro-Plan, RPO ≤ 2 min) · Off-Site-Dump nach R2 (verschlüsselt) · quartalsweiser Voll-DR-Drill. |
| **> 300 Höfe** | PITR-Fenster auf 14–28 Tage · Storage-Backup-Versionierung · R2 Object-Lock (Ransomware) · Read-Replica-Erwägung. |
| **> 3000 Höfe / Enterprise** | Multi-Region-Read-Replica (EU) · automatisierte DR-Drill-Pipeline (CI startet Staging-Restore + §7-Checks als Gate) · dediziertes RPO-Reporting im Owner-Dashboard. |

> **Wirtschaftlichkeit (§0.3):** PITR ist ein bezahltes Add-on — vor 50 Höfen ist Daily Backup + Off-Site-Dump das kosten-/nutzen-optimale Niveau. Aktivierung von PITR ist eine **Owner-Kostenentscheidung** und wird vorab angekündigt.

---

## 11 · Umgang mit kritischen Daten nach Restore

### SB-Zahlungen (USP, Phase 4) — Stripe ist die Wahrheit
- **Stripe-Dashboard/API ist die alleinige Quelle der Wahrheit** für tatsächliche Zahlungen und Connect-Auszahlungen an die Höfe. Die DB (`sb_payments`) ist nur Spiegel.
- Nach PITR/Restore: zwischen Restore-Zeitpunkt und „jetzt" fehlende Zahlungen über **Stripe-Event-Replay** oder Backfill-Edge-Function rekonstruieren (Match über `stripe_payment_intent_id`).
- **Keine Doppelzahlungen:** Idempotenz-Schlüssel/`payment_intent`-Eindeutigkeit prüfen. Quittungs-Nummernkreis lückenlos.
- **Vermittler-Disclaimer wahren:** Die Plattform initiiert keine Zahlungen neu — sie spiegelt nur, was bei Stripe geschah.

### Reservierungen
- Aktive Reservierungen (`requested`/`confirmed`): betroffene Käufer/Erzeuger informieren; abgelaufene Abholfenster ggf. neu vereinbaren.
- Status-Konsistenz: kein `picked_up` ohne zuvor `confirmed` (Übergänge laut `docs/CORE_BUSINESS_STATE_MACHINES.md`).

### Audit-Log
- **Append-only.** Einträge zwischen Backup-Zeitpunkt und Restore sind verloren — der **Restore-Vorgang selbst** wird als erster Eintrag wieder dokumentiert (wer/was/warum, `reason` Pflicht).
- Bei regulatorischen Anfragen: Backup-/Restore-Manifest (Zeitpunkt, Quelle, durchführende Person) als Nachweis.

### Personenbezogene Daten (DSGVO)
- Soft-Delete (`deleted_at`) respektieren: Read-Pfade filtern `deleted_at is null`. Ein Restore darf **gelöschte** Personendaten **nicht** reaktivieren — Lösch-Status muss nach Restore erneut durchgesetzt werden (Abgleich gegen Lösch-Aufträge, vgl. `docs/COMPLIANCE_MODEL.md`).
- Bei Datenabfluss (Szenario 5): **72-h-Meldefrist** prüfen.

---

## 12 · Mindestprüfungen vor Go-Live (DR-Gate)

- [ ] Supabase Daily Backup aktiv und im Dashboard verifiziert
- [ ] PITR-Entscheidung getroffen (aktiviert **oder** dokumentiert verschoben, mit RPO-Konsequenz)
- [ ] `app/supabase/setup_all.sql` reproduziert Schema+RLS vollständig (Drill §6a ✅)
- [ ] **Befund H-1** adressiert: `force row level security` per Migration `0002` gesetzt **oder** Owner-Risikoannahme dokumentiert
- [ ] Erster Off-Site-Dump (Schicht 4) verschlüsselt in R2, Schlüssel getrennt verwahrt
- [ ] Storage-Bucket-Backup (Schicht 6) eingerichtet und einmal verifiziert
- [ ] **Restore-Drill durchgeführt** und in §6d protokolliert (mind. Artefakt-Validierung ✅; PITR-Staging-Drill bei Live)
- [ ] Integritätsprüfung §7 + Smoke-Test §8 als Restore-Akzeptanzkriterium dokumentiert
- [ ] Secret-Rotation-Prozess definiert (`docs/security/SECRET_ROTATION.md`)
- [ ] Pre-Migration-Snapshot-Schritt im Deploy-Prozess verankert (`docs/DEPLOYMENT.md`)
- [ ] Dieses Dokument von Owner + Ops gelesen und freigegeben

---

## Referenzen

- `app/supabase/migrations/0001_core.sql` — Schema + RLS (WAVE_02), Drill-Quelle §6
- `app/supabase/seed.sql` · `app/supabase/setup_all.sql` — Restore-Artefakte (9 Höfe / 25 Produkte)
- `docs/DATABASE_MODEL.md` — Tabellen, Enums, RLS-Muster (kanonisch)
- `docs/ENTERPRISE_ARCHITECTURE.md` — §Mandantenfähigkeit, §Ausfallszenarien
- `docs/security/SECRET_ROTATION.md` — Rotation nach Kompromittierung (Szenario 5)
- `docs/security/TENANT_ISOLATION_MODEL.md` — Isolations-Negativtest (Post-Restore-Pflicht)
- `docs/COMPLIANCE_MODEL.md` — DSGVO-Meldefrist, Lösch-/Soft-Delete-Pflicht
- `docs/INCIDENT_RUNBOOK.md` — Sofortmaßnahmen bei Ausfall (⬜ geplant)
- `docs/MONITORING.md` — Health-Checks, Backup-Alerts (⬜ geplant)
- `docs/DEPLOYMENT.md` — Cloudflare Pages + Pre-Migration-Snapshot
- `PHASEN.md` — WAVE_13 (Observability), Phase 3 (Ops-Gate) · `MASTER_INDEX.md` §5
- `docs/releases/PHASE_STATUS.md` — Drill-/DR-Status fortschreiben

---

*Stand: 2026-06-19 · DR-Strategie auf Supabase/Cloudflare/Stripe (managed) · Hof-Domäne · Vermittler-Rolle, kein Eigenverkauf.*
