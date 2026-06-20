# COMPLIANCE_MODEL — LokaleBauernConnect

> Verbindliches Compliance-Modell der Plattform-Spezialschicht: **DSGVO** (EU-Hosting, Auskunft/Export, Löschung/Anonymisierung, Aufbewahrung/Retention, AVV/TOMs), **Lebensmittel-Kennzeichnungs-Hinweis** (Verantwortung beim Erzeuger), **Vermittler-Disclaimer**, **Audit-Vollständigkeit** und **Subprozessoren**.
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Vermittler-Grundsatz (nicht verhandelbar):** LokaleBauernConnect **vermittelt** zwischen Käufern und Erzeugern. Die Plattform **verkauft nicht selbst**, **berät nicht** und übernimmt **keine Lebensmittel-Haftung**. Kein Abschnitt dieses Dokuments darf so gelesen werden, dass die Plattform Eigenverkauf, fachliche Beratung oder die Kennzeichnungs-/Produktverantwortung der Erzeuger übernimmt. Disclaimer durchgängig sichtbar.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Verbots-/Stop-Regeln), `AGENTS.md` (`compliance-officer`, harte Regeln), `PHASEN.md` (WAVE_14 Legal/DSGVO · Phase 4 Track A SB-Bezahlung), `docs/security/SECURITY_OVERVIEW.md` (§9 Secrets · §10 Audit · §11 Datenschutz), `docs/ROLE_AND_PERMISSION_MODEL.md` (Rollen/Org-Scope), `docs/security/TENANT_ISOLATION_MODEL.md` (RLS), `docs/launch/B_rechtstexte/*` (Impressum/Datenschutz/AGB/AVV-TOMs — geplant).
>
> **Status:** Normativ (Spezifikation für WAVE_14). Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.
> **Stand:** 2026-06-19 · Zuständig: Compliance (Claude) · Freigabe: Owner · Phase 1 · WAVE_14 (Vorzieh-Spezifikation).

---

## 0 · Geltungsbereich, Rollen & DSGVO-Verantwortlichkeiten

LokaleBauernConnect verarbeitet personenbezogene Daten dreier strikt getrennter Welten (`docs/ROLE_AND_PERMISSION_MODEL.md`): **Käufer**, **Erzeuger** (org-gebunden = Betrieb) und **Staff/Owner** (Plattform-Org). Die datenschutzrechtliche Rollenzuordnung folgt der tatsächlichen Verarbeitungssituation, nicht nur dem Vertragstext.

| Datenkontext | Verantwortlicher (Art. 4 Nr. 7 DSGVO) | Auftragsverarbeiter (Art. 28) | Begründung |
|---|---|---|---|
| **Käufer-Stammdaten, Reservierungen, Saison-Alerts, Favoriten** | **Plattform-Betreiber** (eigenverantwortlich) | — | Die Plattform bestimmt Zweck/Mittel der Käufer-Beziehung selbst (Vermittlungsdienst). |
| **Hof-/Produkt-/Verfügbarkeits-/Standort-Daten der Erzeuger** | **Erzeuger (Betrieb)** für die Inhalte; **Plattform** für Betrieb des Dienstes | **Plattform** ist AV für die im Auftrag verarbeiteten Betriebsinhalte/-PII | Erzeuger pflegt Inhalte selbst (Selbstpflege); Plattform hostet/strukturiert sie → AVV mit Erzeuger nötig (Art. 28). |
| **SB-Zahlungsdaten (Käufer ↔ Erzeuger)** | **Stripe** als eigener Verantwortlicher für die Zahlungsabwicklung; **Erzeuger** als Zahlungsempfänger (Connect) | **Plattform** nur als Vermittler der Zahlungsanbindung (kein Karteninhaber-Datenzugriff) | Geld fließt via **Stripe Connect** an den Erzeuger (Destination/Direct Charge); Plattform berührt keine PAN/CVC (SAQ-A). |
| **Staff-/Owner-Konten, Audit-Log, Betriebsdaten der Plattform** | **Plattform-Betreiber** | — | Interne Verarbeitung des Betreibers. |

> **Konsequenz für den AVV-Aufbau:** Die Plattform schließt **als Auftragsverarbeiter** einen AVV mit jedem **Erzeuger** (Verantwortlicher für seine gelisteten Betriebs-/Kontaktdaten), und ist **selbst Verantwortlicher** gegenüber **Käufern**. Diese Doppelrolle ist sauber zu trennen (Abschnitt 6).

**EU-Hosting (Datenresidenz).** Supabase EU-Region (Postgres + Storage + Auth) und Cloudflare EU-Edge. Personenbezogene Daten verlassen die EU im Regelbetrieb nicht. **Einzige strukturelle Drittland-/Spezialfälle:** Stripe (Zahlungsabwicklung, eigener AVV + SCC/Adequacy) und ggf. Cloudflare-Edge-Routing — beide in Abschnitt 7 (Subprozessoren) mit Rechtsgrundlage geführt. Karten-Tiles (OSM/MapLibre) werden ohne PII abgerufen; Käufer-Standort wird **nur clientseitig** für „in der Nähe" genutzt und **nicht** ohne ausdrückliche Einwilligung an den Server übertragen.

---

## 1 · Datenkategorien & Verarbeitungs-Inventar (Art. 30 DSGVO)

Alle personenbezogenen Daten werden in vier Kategorien klassifiziert. Die Kategorie steuert **Export**, **Löschverhalten** und **Aufbewahrung** (Abschnitte 2–4). Dies ist die maschinenlesbare Grundlage des Verzeichnisses der Verarbeitungstätigkeiten (VVT).

### Kategorie A — Direkt personenbezogen
- **Tabellen:** `profiles` (Käufer/Erzeuger/Staff), `buyer_contacts`, `farm_contacts`, `reservations` (Name/Kontakt des Käufers), `saison_alerts`/`favorites` (sofern nutzergebunden), `producer_invites`.
- **Löschverhalten:** Felder überschreiben (`[Gelöscht]` / `NULL`), Identität entkoppeln.
- **Export:** vollständig.

### Kategorie B — Geschäftlich/funktional notwendig (referenziert PII)
- **Tabellen:** `orgs` (Betrieb), `farms`, `org_members`, `products`, `availability`, `pickup_windows`, `reservation_items`.
- **Löschverhalten:** Personenreferenzen anonymisieren — Fremdschlüssel bleibt erhalten (Datenintegrität/Statistik), Name/Kontakt → `[Anonymisiert]`. Betriebsdaten eines weiterbestehenden Erzeugers bleiben unberührt.
- **Export:** vollständig (nur die den Betroffenen betreffenden Zeilen).

### Kategorie C — Aufbewahrungspflichtig (HGB §257 / AO §147 / Zahlungsnachweis)
- **Tabellen:** `payments`/`sb_transactions` (SB-Bezahlung), `payouts`/`connect_transfers`, `subscriptions`, `invoices`, `billing_usage`, **`audit_log`**.
- **Löschverhalten:** **NICHT löschbar** während der gesetzlichen Frist (Belegfunktion); nach Fristablauf Retention-Cleanup. Bei Betroffenenlöschung während laufender Frist: **Anonymisierung der personenbezogenen Felder, soweit ohne Belegverlust möglich**; ansonsten Einschränkung der Verarbeitung (Art. 18) statt Löschung, mit dokumentierter Begründung.
- **Export:** vollständig, mit ausdrücklichem Hinweis auf bestehende Aufbewahrungspflicht.

### Kategorie D — Technische Metadaten / TTL
- **Tabellen:** `sessions` (Auth, von Supabase verwaltet), `idempotency_keys` (Stripe-Webhook-Dedup), `rate_limit_counters`, `notifications` (gelesen), `turnstile_verifications` (kurzlebig).
- **Löschverhalten:** sofort/automatisch löschbar.
- **Retention:** TTL-basiert, automatisch bereinigbar (Abschnitt 4).

> **Pflicht (Kanon):** Jede neue Tabelle wird **bei Erstellung** einer dieser vier Kategorien zugeordnet (Migration-Kommentar `-- data_category: A|B|C|D`). Eine Tabelle ohne Kategorie gilt im Compliance-Review als Lücke. Das hält das VVT (Art. 30) automatisch synchron zum Schema.

---

## 2 · Auskunft & Datenexport (Art. 15 / Art. 20 DSGVO)

**Selbstbedienung zuerst, planunabhängig.** Auskunft und Datenportabilität sind **gesetzliche Pflicht** — niemals hinter einem Plan-Lock (`demo/basis/plus/pro/individuell`). Jeder authentifizierte Nutzer kann seinen vollständigen Datensatz selbst exportieren.

| Endpunkt (Edge Function) | Auth | Beschreibung |
|---|---|---|
| `GET /functions/v1/me/export` | Session (Käufer/Erzeuger/Staff) | Vollständiger DSGVO-Export des **eigenen** Datensatzes als **JSON** (maschinenlesbar, Art. 20) + lesbares **PDF/CSV**-Beiblatt (Art. 15). Enthält alle Kategorien A–C, die den Anfragenden betreffen. |
| `GET /functions/v1/org/export` | Erzeuger `org_owner` | Org-weiter Export des **eigenen Betriebs** (Produkte, Verfügbarkeit, Reservierungen am Betrieb, SB-Transaktionen) — RLS-org-gescoped. |

**Garantien:**
- **Org-Scope (Produktionspfeiler 1):** Der Export liest ausschließlich Zeilen, die der Anfragende per RLS sehen darf. Fremd-Org = leere Menge, nie Fremddaten. Implementierung in der Edge Function unter **vorheriger** Rechteprüfung (`auth.uid()` → Rolle → Org), nicht über service-role-Vollabzug ohne Filter.
- **Vollständigkeit:** Der Export deckt jede Kategorie-A/B-Tabelle ab, die eine PII-Referenz auf den Betroffenen hält, plus Kategorie-C-Belege mit Aufbewahrungs-Hinweis. Neue PII-Tabelle ohne Export-Anbindung = Compliance-Lücke (Test in Abschnitt 8).
- **Format:** JSON (Portabilität, Art. 20) + menschenlesbares Beiblatt (Auskunft, Art. 15). Kein proprietäres Format, das die Portabilität faktisch aushebelt.
- **Frist:** Bearbeitung unverzüglich, spätestens **1 Monat** (Art. 12 Abs. 3); Self-Service ist sofort.
- **Verifikation:** Self-Service über bestehende authentifizierte Session (kein zusätzlicher Identitätsnachweis nötig — die Session **ist** der Nachweis). Anfragen außerhalb der Session laufen über den Anfragen-Prozess (Abschnitt 5) mit Identitätsprüfung.

---

## 3 · Löschung & Anonymisierung (Art. 17 DSGVO)

**Soft-Delete als Standard, Anonymisierung als Löschverfahren.** Jede Tabelle hat `deleted_at` (Kanon). „Recht auf Vergessenwerden" wird über **kategoriebewusste Anonymisierung** umgesetzt, nicht über blindes Hard-Delete, das referenzielle Integrität und Belegpflichten verletzen würde.

### Ablauf (verbindlich)

1. **Vorbedingungsprüfung** (`GET /functions/v1/me/delete/check` bzw. `org/delete/check`): prüft auf Blocker, die einer sofortigen Löschung entgegenstehen.

| Blocker (Hof-Domäne) | Code | Wirkung |
|---|---|---|
| Offene Reservierung mit künftigem Abholfenster | `OPEN_RESERVATIONS` | Erst abschließen/stornieren |
| Laufendes Erzeuger-Abo (aktiv) | `ACTIVE_SUBSCRIPTION` | Erst kündigen/auslaufen lassen |
| Offene SB-Auszahlung / nicht abgeschlossener Connect-Transfer | `PENDING_PAYOUT` | Erst abschließen (Geldfluss-Integrität) |
| Belege innerhalb gesetzlicher Aufbewahrungsfrist | `RETENTION_LOCK` | Anonymisieren statt löschen (Kat. C), Frist im Hinweis |
| Erzeuger ist alleiniger `org_owner` mit aktiven, öffentlich gelisteten Betriebsdaten | `SOLE_ORG_OWNER` | Betrieb erst depublizieren/übertragen (verhindert verwaiste öffentliche Listings) |

2. **Anonymisierung** (`DELETE /functions/v1/me` / `org/:id` mit **reason-Pflicht** für Staff-initiierte Löschungen): kategorieweise Verarbeitung —
   - **Kat. A:** PII überschreiben (`[Gelöscht]`), Auth-Identität (Supabase Auth User) löschen/entkoppeln.
   - **Kat. B:** Personenreferenz → `[Anonymisiert]`, Fremdschlüssel/Statistik erhalten.
   - **Kat. C:** **nicht** löschen; PII soweit ohne Belegverlust pseudonymisieren; Aufbewahrungsfrist gilt. Nach Fristablauf greift Retention-Cleanup (Abschnitt 4).
   - **Kat. D:** sofort entfernen.
3. **Audit (unauslöschlich):** Jede Löschung/Anonymisierung erzeugt einen unveränderlichen `audit_log`-Eintrag (Kat. C) — `compliance.user.anonymized` / `compliance.org.deleted` — mit Actor, Zeitpunkt, betroffenen Kategorien und (bei Staff-Aktion) **reason**. Der Audit-Eintrag selbst enthält **keine** wiederherstellbare PII des Betroffenen (nur pseudonyme Referenz-ID).

**Käufer-Sonderfall (anonyme Reservierung).** Käufer können als Gast (anonym, Turnstile-geschützt) reservieren. Solche Reservierungen tragen nur das funktional Nötige (Name, Kontakt, Abholfenster, Produkt). Für sie gilt: Selbstlöschung über einen **signierten Reservierungs-Link** (kein Account nötig); nach Ablauf des Abholfensters + Kulanzfrist greift Retention (Abschnitt 4).

---

## 4 · Aufbewahrung & Retention (HGB §257 · AO §147 · DSGVO Art. 5 Abs. 1 lit. e)

Datenminimierung über Zeit: Daten werden nur so lange aufbewahrt, wie sie für den Zweck nötig sind oder eine gesetzliche Frist gilt. Retention-Cleanup unterstützt **Dry-Run** (Vorschau) und tatsächliche Bereinigung; jeder Lauf ist auditiert.

| Datentyp / Tabelle | Kategorie | Frist | Rechtsgrundlage / Zweck |
|---|---|---|---|
| `payments` / `sb_transactions`, `invoices`, `payouts`, `subscriptions` | C | **10 Jahre** | HGB §257 Abs. 4, AO §147 (Buchungsbelege) |
| `billing_usage` (abrechnungsrelevant) | C | **6 Jahre** | HGB §257 (Handelsbriefe/sonstige Unterlagen) |
| `audit_log` (sicherheits-/nachweisrelevant) | C | **10 Jahre** | Nachweis-/Rechenschaftspflicht (Art. 5 Abs. 2), Belegfunktion |
| `reservations` (abgeschlossen/storniert) | A/B | **90 Tage** nach Abholfenster | Streitfall-Kulanz; danach Anonymisierung |
| `producer_invites` (abgelaufen/ungenutzt) | A | **90 Tage** | Onboarding-Sicherheit |
| `notifications` (gelesen) | D | **180 Tage** | Komfort/Verlauf |
| `sessions` (abgelaufen) | D | **14 Tage** | Auth-Hygiene (Supabase-Default respektiert) |
| `idempotency_keys` (Stripe-Dedup) | D | **7 Tage** | Webhook-Idempotenz (Fenster) |
| `rate_limit_counters` / `turnstile_verifications` | D | **24 h** | Spam-/Abuse-Schutz |

| Endpunkt | Permission | Beschreibung |
|---|---|---|
| `GET /functions/v1/retention/status` | Owner/Staff `retention` | Übersicht fälliger Bereinigungen je Tabelle |
| `POST /functions/v1/retention/cleanup` | Owner/Staff `retention` | Bereinigung mit `{ dry_run: true \| false }`; Dry-Run liefert Trefferzahl ohne Schreibvorgang |

> **Konflikt-Regel:** Aufbewahrungspflicht (Kat. C) **sticht** ein Löschverlangen, solange die Frist läuft (Art. 17 Abs. 3 lit. b/e). In diesem Fall: **Einschränkung der Verarbeitung** (Art. 18) + transparenter Hinweis an den Betroffenen, **nicht** stilles Ignorieren der Anfrage.

---

## 5 · DSGVO-Anfragen-Workflow (Art. 12 — Fristen & Nachweis)

Anfragen, die **nicht** per Self-Service erledigt werden (z. B. von Dritten, ohne aktive Session, oder behördlich), laufen über einen nachvollziehbaren, fristengesteuerten Prozess.

| Endpunkt | Permission | Beschreibung |
|---|---|---|
| `POST /functions/v1/dsgvo/requests` | Staff `requests` (oder öffentl. Formular + Turnstile + Identitätsprüfung) | Neue Anfrage (`access` / `portability` / `erasure` / `rectification` / `restriction` / `objection`) |
| `GET /functions/v1/dsgvo/requests` | Staff `requests` | Liste (Filter: `status`, `request_type`, Fristanzeige) |
| `PATCH /functions/v1/dsgvo/requests/:id/complete` | Staff `requests` | Abschluss + Nachweis-Artefakt (Audit) |

**Fristen:** Eingangsbestätigung unverzüglich; Erledigung **innerhalb 1 Monat** (Art. 12 Abs. 3), verlängerbar um 2 Monate bei Komplexität (mit Begründung). Jeder Statuswechsel ist auditiert (`compliance.dsgvo_request.*`). **Datenpanne (Art. 33/34):** Meldekette + 72-Stunden-Frist gegenüber der Aufsichtsbehörde sind im `docs/INCIDENT_RUNBOOK.md` (geplant) verankert; dieses Dokument verweist normativ darauf.

---

## 6 · AVV & TOMs (Art. 28 / Art. 32 DSGVO)

### 6.1 Auftragsverarbeitungsvertrag (AVV)

Die Plattform tritt **gegenüber Erzeugern als Auftragsverarbeiter** auf (sie verarbeitet im Auftrag die gelisteten Betriebs-/Kontaktdaten). Der AVV (`docs/launch/B_rechtstexte/avv-toms.md`, geplant) regelt mindestens:

- **Gegenstand/Dauer:** Bereitstellung der Plattform zur **Vermittlung regionaler Lebensmittel** (Hofladen-Finder, Verfügbarkeit, Reservierung, SB-Bezahl-Anbindung) — **ausdrücklich kein Eigenverkauf, keine Beratung**.
- **Art/Umfang/Zweck:** Erheben, Speichern, Strukturieren, Anzeigen, Übermitteln (an Käufer im Rahmen der Vermittlung), Löschen.
- **Betroffenenkategorien:** Erzeuger-Mitarbeitende (Betriebszugang), Käufer (Reservierungs-/Kontaktdaten), ggf. SB-Zahlende.
- **Datenkategorien:** Stammdaten (Name, E-Mail, Telefon, Betrieb), Betriebs-/Produktdaten, Reservierungsdaten, Zahlungsstatus (**keine Vollkartendaten — Stripe-Scope**), technische Daten (IP pseudonymisiert, Session).
- **Weisungsbindung, Vertraulichkeit, Unterstützung bei Betroffenenrechten, Datenpannen-Meldung (24 h an Verantwortlichen), Löschung/Rückgabe nach Vertragsende (30 Tage, vorbehaltlich gesetzlicher Fristen), Kontrollrechte.**
- **Subprozessoren:** Genehmigung der in Abschnitt 7 gelisteten; 30-Tage-Vorabinformation bei neuen, 14-Tage-Widerspruchsrecht.
- **TOMs als Anlage:** Verweis auf Abschnitt 6.2.

> **Doppelrolle sauber halten:** Gegenüber **Käufern** ist die Plattform **eigenverantwortlich** (kein AVV mit Käufern, sondern Datenschutzerklärung + Einwilligung). Gegenüber **Erzeugern** ist sie **AV**. Diese Trennung ist im Rechtstext-Set explizit zu führen, damit keine Rollenvermischung entsteht.

### 6.2 Technische & Organisatorische Maßnahmen (TOMs, Art. 32) — Stack-konkret

| TOM-Kategorie | Maßnahme im LokaleBauernConnect-Stack |
|---|---|
| **Vertraulichkeit — Zutritt** | Kein eigenes Rechenzentrum/Self-Host (kein Hetzner/Docker). Physische Sicherheit delegiert an Supabase (EU) & Cloudflare (zertifizierte RZ). |
| **Vertraulichkeit — Zugang** | Supabase Auth (kurzlebiges JWT, rotierender Refresh, Reuse-Detection), **MFA-Pflicht** für Staff/Owner und auszahlungsberechtigte Erzeuger, Leaked-Password-Schutz (`SECURITY_OVERVIEW.md` §5). |
| **Vertraulichkeit — Zugriff** | **PostgreSQL RLS deny-by-default** als Autorität (`enable`+`force`), Org-Scope je Zeile, **service-role nur in Edge Functions** (`SECURITY_OVERVIEW.md` §6/§9, `TENANT_ISOLATION_MODEL.md`). |
| **Integrität — Weitergabe** | TLS 1.2+/1.3 überall, HSTS+preload, CSP/`connect-src`-Allowlist (nur Supabase/Stripe), Stripe-Webhook signaturgeprüft (`SECURITY_OVERVIEW.md` §1/§2/§8). |
| **Integrität — Eingabe** | **Zod** an allen Edge-Grenzen, React-Auto-Escaping, kein `dangerouslySetInnerHTML`; Beträge serverseitig neu bestimmt (kein Tampering). |
| **Verfügbarkeit** | Cloudflare DDoS/WAF/Rate-Limiting, Supabase Managed Backups (Point-in-Time, EU); DR in `docs/BACKUP_DISASTER_RECOVERY.md` (geplant). |
| **Belastbarkeit & Wiederherstellung** | Managed Backups + dokumentiertes Recovery; Burn-in ≥ 7 Tage vor Go-Live (Phase 2). |
| **Evaluierung (Art. 32 Abs. 1 lit. d)** | `npm audit --omit=dev` vor Release (0 High/Critical), Security-Header-Scan, **Cross-Org-Negativtests** als blockierendes Gate (`TENANT_ISOLATION_MODEL.md`). |
| **Auftragskontrolle** | AV-Verträge mit allen Subprozessoren (Abschnitt 7), SCC/Adequacy für Drittland-Pfade. |
| **Trennungskontrolle** | Mandanten-/Welten-Trennung via `org_id` + RLS; drei getrennte Auth-Welten (Käufer/Erzeuger/Staff). |
| **Pseudonymisierung/Verschlüsselung** | At-rest-Verschlüsselung (Supabase), TLS in-transit, IP-Pseudonymisierung, Karten ohne PII, Anonymisierung als Löschverfahren (Abschnitt 3). |

---

## 7 · Subprozessoren (Art. 28 Abs. 4 DSGVO)

Aktuelle, vollständige Liste der eingesetzten Unterauftragsverarbeiter (Anlage zum AVV, `docs/launch/B_rechtstexte/avv-toms.md`). Jede Änderung wird Verantwortlichen 30 Tage im Voraus angekündigt (14-Tage-Widerspruchsrecht).

| Subprozessor | Zweck | Datenkategorien | Region / Transfer-Grundlage |
|---|---|---|---|
| **Supabase** (Postgres, Auth, Storage, Edge Functions) | Kern-Hosting, Datenbank, Authentifizierung, Datei-/Bild-Speicher | A, B, C, D | **EU-Region**; Daten verbleiben in der EU |
| **Cloudflare** (Pages, Workers, Turnstile, WAF, CDN) | Edge-Auslieferung, Bot-/DDoS-Schutz, Rate-Limiting, statisches Hosting | Technische Daten (IP pseudonymisiert), Turnstile-Token | **EU-Edge** bevorzugt; Cloudflare-DPA + SCC für Restpfade |
| **Stripe** (Payments + Connect) | SB-Bezahlung, Erzeuger-Abo, Auszahlungen | Zahlungs-/Transaktionsdaten (**keine Vollkartendaten bei uns** — SAQ-A), Auszahlungsstammdaten | Stripe ist eigener Verantwortlicher für die Zahlungsabwicklung; Stripe-DPA + SCC/Adequacy-Mechanismus |
| **OpenStreetMap / MapLibre Tiles** | Kartendarstellung Hofladen-Finder | **Keine PII** (Tile-Requests ohne Nutzeridentität); Käufer-Standort nur clientseitig | Tiles ohne personenbezogene Übermittlung; Standort wird nicht serverseitig geteilt |
| *(optional, Owner-Entscheidung)* **E-Mail-Versand** (Saison-Alerts/Transaktionsmails) | Benachrichtigungen | E-Mail-Adresse, Benachrichtigungsinhalt | nur EU-Anbieter; DPA + SCC; **erst nach Owner-Freigabe** aufnehmen |

> **Pflicht:** Jeder neue externe Dienst, der PII berührt, wird **vor** Inbetriebnahme hier eingetragen, vertraglich (DPA) abgesichert und der Transfer-Mechanismus dokumentiert. Kein „stiller" Subprozessor. Karten-Tiles/Drittquellen ohne PII sind ausdrücklich als PII-frei zu kennzeichnen, um Scope-Inflation zu vermeiden.

---

## 8 · Lebensmittel-Kennzeichnungs-Hinweis (Verantwortung beim Erzeuger)

**Grundsatz (nicht verhandelbar):** Die rechtskonforme **Lebensmittelkennzeichnung** liegt **vollständig und ausschließlich beim Erzeuger** als Lebensmittelunternehmer. LokaleBauernConnect ist **Vermittler/Anzeigemedium**, kein Inverkehrbringer und kein Lebensmittelunternehmer — die Plattform prüft, garantiert und verantwortet **keine** Produktangaben.

### 8.1 Was der Erzeuger verantwortet (gesetzlicher Rahmen, Hinweischarakter)
- **LMIV (VO (EU) 1169/2011):** Bezeichnung, **Zutatenverzeichnis**, **Allergenkennzeichnung** (Anhang II, 14 Hauptallergene), Nettofüllmenge, **Mindesthaltbarkeits-/Verbrauchsdatum**, Name/Anschrift des verantwortlichen Lebensmittelunternehmers, ggf. Nährwertkennzeichnung.
- **Lose Ware / SB-Stand:** Allergeninformation muss auch bei **unverpackter Ware** und an **unbemannten SB-Ständen** bereitgestellt werden (z. B. Aushang/Etikett am Produkt). Die digitale Anzeige in der App **ersetzt nicht** die physische Pflichtkennzeichnung am Produkt.
- **Herkunfts-/Bio-/Klassen-Angaben:** Bio-Auslobung nur mit gültiger Öko-Zertifizierung/Kontrollstellen-Nummer; Herkunfts-/Güteklassen nach jeweiliger Spezialnorm — **Erzeuger-Verantwortung**.
- **Preisangaben:** Grundpreis-/Preisangaben (PAngV) liegen beim Erzeuger.

### 8.2 Umsetzung in der Plattform (End-to-End, kein Fake)
- **Pflicht-/Optionalfelder am Produkt** (`products`): strukturierte Felder für **Allergene** (Mehrfachauswahl, LMIV-Anhang II), Zutaten (Freitext, escaped), MHD/Verbrauchsdatum, Herkunft, Bio-Status + Kontrollstellen-Nummer. Diese Felder sind **Erzeuger-Selbstpflege** (Selbstauskunft), per Zod validiert.
- **Durchgängiger Disclaimer:** Auf **jeder** Produkt-/Hof-Detailansicht und im Reservierungs-Flow erscheint der Hinweis:
  > „Angaben zu Produkten, Zutaten, Allergenen und Haltbarkeit stammen vom jeweiligen Erzeuger und werden von LokaleBauernConnect **nicht geprüft**. Für die vollständige und rechtskonforme Kennzeichnung ist der Erzeuger verantwortlich. Verbindlich ist stets die Kennzeichnung am Produkt vor Ort."
- **Allergen-Sicht-Hinweis:** Bei gepflegten Allergenen wird zusätzlich der Hinweis gezeigt, dass die Angabe eine **Selbstauskunft** ist und vor Ort zu prüfen bleibt — insbesondere am **unbemannten SB-Stand**.
- **Onboarding-Bestätigung:** Im Erzeuger-Onboarding (Wizard, datengetrieben/Zod) bestätigt der Erzeuger ausdrücklich, dass er für die rechtskonforme Kennzeichnung seiner Produkte verantwortlich ist (auditierte Zustimmung, `compliance.producer.labeling_ack`).
- **Keine Heilversprechen/Health-Claims durch die Plattform:** Die Plattform formuliert **keine** produktbezogenen Aussagen; sie zeigt ausschließlich Erzeuger-Selbstangaben (escaped) an.

> **Abgrenzung zum VMS-Erbe:** Das aus dem Blueprint stammende „Compliance-Dokumenten-/Ampel-System für Lieferanten" (Versicherungs-/Zertifikatsnachweise im Zeitarbeits-Kontext) wird **nicht** übernommen. An seine Stelle tritt die **Hof-Verifizierung** (Staff prüft Existenz/Plausibilität des Betriebs vor öffentlicher Listung, WAVE_07) plus die hier definierte **Kennzeichnungs-Selbstauskunft + Disclaimer**. Optional kann ein Bio-/Öko-Zertifikat als Erzeuger-**Selbstnachweis** hochgeladen werden — als Transparenz-Feature, **nicht** als Plattform-Garantie.

---

## 9 · Vermittler-Disclaimer (durchgängig, end-to-end verdrahtet)

Der Vermittler-Status muss an jedem rechtsrelevanten Berührungspunkt sichtbar sein — nicht nur in den AGB, sondern im Produktfluss. „Im UI versteckt" zählt nicht (Kanon: keine toten Verweise, End-to-End-Pflicht).

| Touchpoint | Disclaimer-Inhalt (Kern) |
|---|---|
| **Footer / global** | „LokaleBauernConnect ist eine **Vermittlungsplattform** für regionale Lebensmittel. Wir verkaufen nicht selbst und beraten nicht. Verträge kommen ausschließlich zwischen Käufer und Erzeuger zustande." |
| **Hof-/Produkt-Detail** | Kennzeichnungs-/Selbstauskunfts-Hinweis (Abschnitt 8.2) + „Anbieter ist der jeweilige Erzeuger." |
| **Reservierung** | „Eine Reservierung ist eine **unverbindliche Vorbestellung zur Abholung**, **kein** Kaufvertrag und **keine** Bezahlung. Der Vertrag entsteht beim Erzeuger vor Ort." |
| **SB-Bezahlung (USP)** | „Die Zahlung erfolgt über **Stripe** direkt an den Erzeuger. LokaleBauernConnect ist die **Zahlungsanbindung/Vermittler**, nicht der Verkäufer; Gewährleistung/Reklamation richten sich an den Erzeuger." + Quittung nennt Erzeuger als Leistungserbringer. |
| **Saison-Radar / Alerts** | „Verfügbarkeits- und Saisonangaben sind **Erzeuger-Selbstauskunft** ohne Gewähr." |
| **Erzeuger-Onboarding** | Auditierte Bestätigung der Vermittler-Rolle, Kennzeichnungs-Verantwortung und Datenschutz-/AVV-Zustimmung. |

**Implementierungs-Prinzip:** Disclaimer-Texte sind zentral gepflegte Inhalte (i18n/Content, deutsche Markenstimme, Editorial-Disziplin — keine Deko-Emojis), nicht hartcodiert in einzelnen Komponenten verstreut. Änderungen am Rechtsstand wirken so an **allen** Touchpoints zugleich.

---

## 10 · Audit-Vollständigkeit (Rechenschaftspflicht, Art. 5 Abs. 2 · Produktionspfeiler 5)

**Grundsatz:** **Jede** mutierende Aktion erzeugt einen `audit_log`-Eintrag — **wer / was / warum / wann / Org-Scope / Ergebnis**. Das Audit-Log ist **append-only/unabschaltbar** (Kat. C, RLS-geschützt, org-gefiltert). Keine Mutation ohne Audit (Kanon-Verbot). `reason` ist **Pflicht** bei kritischen Aktionen.

### 10.1 Pflicht-Events (Compliance-relevanter Auszug, Namespace `compliance.*` / domänen-Namespaces)

| Bereich | Events |
|---|---|
| **Auth/Identität** | `auth.login` · `auth.login_failed` · `auth.logout` · `mfa.enable` · `mfa.disable` · `mfa.verify` |
| **Erzeuger/Betrieb** | `farm.create` · `farm.update` · `farm.delete` · `farm.verify` (Staff) · `product.update` · `availability.update` |
| **Reservierung** | `reservation.create` · `reservation.cancel` |
| **SB-Bezahlung (USP)** | `payment.intent_created` · `payment.succeeded` · `payment.failed` · `payout.transfer` (Connect) |
| **Commercial** | `subscription.changed` · `entitlement.granted` (aus Webhook) |
| **DSGVO/Compliance** | `compliance.user.anonymized` · `compliance.org.deleted` · `compliance.export.generated` · `compliance.dsgvo_request.created/completed` · `compliance.retention.cleanup` · `compliance.producer.labeling_ack` · `compliance.consent.granted/withdrawn` |
| **Staff/Owner** | `support.escalation` · jede privilegierte Org-übergreifende Aktion (immer mit `reason`) |

### 10.2 Audit-Garantien
- **Schreibweg:** in der Edge Function **nach** erfolgreicher Mutation, transaktional gekoppelt — keine Mutation ohne korrespondierenden Audit-Eintrag.
- **Unveränderlichkeit:** keine `UPDATE`/`DELETE`-Policy auf `audit_log` für Anwendungsrollen; nur Retention-Cleanup nach Fristablauf (10 Jahre) durch privilegierten, ebenfalls auditierten Lauf.
- **PII-Sparsamkeit im Log:** Audit referenziert Betroffene über pseudonyme IDs, nicht über wiederherstellbare Klartext-PII — so bleibt das aufbewahrungspflichtige Log auch nach einer Betroffenenlöschung DSGVO-konform.
- **Scope-Transparenz:** jeder Eintrag trägt `org_id`/`scope`; Staff-Aktionen tragen zusätzlich Ziel-Org + `reason`.
- **Nachweisbarkeit:** Das Audit-Log ist die Quelle für Rechenschaft (Art. 5 Abs. 2), DSGVO-Anfragen-Nachweise und SB-Zahlungs-/Auszahlungsbelege.

---

## 11 · Einwilligung, Tracking & Datenminimierung

- **Rechtsgrundlagen:** Vertrag/„vorvertraglich" (Art. 6 Abs. 1 lit. b) für Reservierung/Onboarding; berechtigtes Interesse (lit. f) für Spam-/Abuse-Schutz (Turnstile, Rate-Limit, Audit); **Einwilligung (lit. a)** für Saison-Alerts/E-Mail-Benachrichtigungen und für jede nicht-essentielle Cookie-/Analytics-Nutzung.
- **Cookie-/Consent:** Nur **technisch notwendige** Cookies ohne Einwilligung (Session). Alles darüber (Analytics, Marketing) erst nach aktiver Einwilligung über ein Consent-Banner (TTDSG/§25). Standardzustand = **kein** nicht-essentielles Tracking. Einwilligung/Widerruf auditiert (`compliance.consent.*`).
- **Standort:** „In der Nähe" nutzt die Geolocation **clientseitig** und nur nach Browser-Permission; keine serverseitige Speicherung des Roh-Standorts ohne ausdrückliche Einwilligung.
- **Datenminimierung by design:** Reservierung speichert nur Name + Kontakt + Abholfenster + Produkt. Keine optionalen PII-Felder „auf Vorrat". Öffentliche Daten (Hof/Produkt/Verfügbarkeit) sind bewusst öffentlich lesbar; private Daten (Reservierung/Kontakt/Zahlung) sind streng RLS-geschützt.

---

## 12 · Verifikations-Checkliste (Compliance-Gate — Phase 2 Gate D „Legal")

- [ ] Jede Tabelle ist einer Datenkategorie (A/B/C/D) zugeordnet (Migration-Kommentar) → VVT (Art. 30) vollständig.
- [ ] `me/export` deckt **alle** PII-tragenden Tabellen ab (Vollständigkeits-Test: neue PII-Tabelle ohne Export-Anbindung = rot).
- [ ] `me/delete` anonymisiert kategoriebewusst; Kat. C bleibt belegfähig; Blocker-Checks greifen.
- [ ] Retention-Cleanup mit Dry-Run; Fristen gemäß Tabelle (Abschnitt 4); jeder Lauf auditiert.
- [ ] AVV-Vorlage + TOMs vorhanden (`docs/launch/B_rechtstexte/avv-toms.md`); Doppelrolle (AV vs. Verantwortlicher) korrekt getrennt.
- [ ] Subprozessor-Liste aktuell, DPA + Transfer-Grundlage je Eintrag; kein stiller PII-Subprozessor.
- [ ] Lebensmittel-Disclaimer + Allergen-Selbstauskunfts-Hinweis auf **jeder** Produkt-/Reservierungs-/SB-Ansicht sichtbar (End-to-End-Verdrahtung geprüft).
- [ ] Vermittler-Disclaimer an allen Touchpoints (Tabelle Abschnitt 9), zentral gepflegt.
- [ ] Audit schreibt **jede** kritische Mutation mit `reason`; `audit_log` ohne UPDATE/DELETE-Policy für App-Rollen.
- [ ] Consent-Banner: kein nicht-essentielles Tracking ohne Einwilligung; Widerruf möglich + auditiert.
- [ ] Datenpannen-Prozess (72 h, Art. 33/34) verankert (`docs/INCIDENT_RUNBOOK.md`).
- [ ] Cross-Org-Negativtest: Export/Löschung liefern **nie** Fremd-Org-Daten (Produktionspfeiler 1).

---

## 13 · Offene Punkte / Owner-Entscheidungen

| ID | Beschreibung | Priorität | Status |
|---|---|---|---|
| CMP-01 | Rechtstext-Set (`impressum`, `datenschutz`, `agb`, `avv-toms`) noch zu erstellen + anwaltlich/DSB zu prüfen | HOCH | WAVE_14, vor Go-Live; juristische Endprüfung beim Owner |
| CMP-02 | Verantwortlicher/Impressumsdaten (Firmierung, Anschrift, DSB) noch festzulegen | HOCH | Owner-Input nötig (kein Platzhalter im Live-Text) |
| CMP-03 | DSGVO-Edge-Functions (`me/export`, `me/delete`, `retention`, `dsgvo/requests`) zu implementieren | HOCH | nach WAVE_06 (Auth) / WAVE_02 (RLS); diese Datei ist die Spezifikation |
| CMP-04 | SB-Bezahl-Quittung muss Erzeuger als Leistungserbringer + Vermittler-Hinweis tragen | MITTEL | Phase 4 Track A |
| CMP-05 | E-Mail-Subprozessor (Saison-Alerts) erst nach Owner-Freigabe + DPA aufnehmen | MITTEL | Owner-Entscheidung |
| CMP-06 | Consent-Banner-Lösung (eigenbau vs. Tool) + Analytics-Strategie | NIEDRIG | abwägen; Default = kein nicht-essentielles Tracking |

---

*Letzte Aktualisierung: Phase 1 · WAVE_14 (Vorzieh-Spezifikation) · 2026-06-19*
*Zuständig: Compliance (Claude) · Subagent: `compliance-officer` · Freigabe: Owner (juristische Endprüfung extern)*
*Querverweise: `docs/security/SECURITY_OVERVIEW.md` · `docs/ROLE_AND_PERMISSION_MODEL.md` · `docs/security/TENANT_ISOLATION_MODEL.md` (geplant) · `docs/launch/B_rechtstexte/{impressum,datenschutz,agb,avv-toms}.md` (geplant) · `docs/INCIDENT_RUNBOOK.md` (geplant) · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (geplant)*
*Hinweis: Dieses Dokument ist eine technisch-organisatorische Spezifikation, keine Rechtsberatung. Live-Rechtstexte sind vor Go-Live anwaltlich / durch den Datenschutzbeauftragten zu prüfen.*
