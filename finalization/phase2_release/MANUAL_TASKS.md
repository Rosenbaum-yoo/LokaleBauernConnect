# MANUAL_TASKS — Phase 2 (Release-operativ) · Owner-Aufgaben

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C**
> Phase 2 (Release-operativ) aus `PHASEN.md`: Cloudflare-Pages-Deploy, Gates A–F, Burn-in ≥ 7 Tage.
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle = **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig (`docs/COMPLIANCE_MODEL.md`).

---

## 0. Wozu diese Datei — und die ehrliche Grenze

Diese Datei listet **ausschließlich** die Schritte, die der **Owner selbst** durchführen muss, weil sie account-, kosten-, domain-, geld- oder rechtsrelevant und damit **extern sichtbar oder irreversibel** sind. Claude liefert für jeden Schritt **Vorlage, Anleitung, Config-as-Code und Verifikations-Checkliste** — aber **nicht die Durchführung**.

**Ehrliche Grenze (keine Halluzination):** Claude kann ein Supabase-Projekt **nicht anlegen**, keine Domain **kaufen**, keine DNS-Records **setzen**, keine produktiven **Secrets** in fremde Dashboards schreiben und keinen Marktstart **freigeben**. Würde ein Modell „Domain gekauft" oder „Secrets rotiert" als erledigt melden, wäre das eine Falschaussage. Diese Aufgaben gehören dem Owner; das Tracking läuft separat von den technischen Wellen.

**Bezug zu den Gates (`finalization/phase2_release/GATES.md`, `PHASEN.md` → Phase 2 Gates A–F):**

| Gate | Inhalt | Hängt von welcher Owner-Aufgabe ab |
|---|---|---|
| **A — Build** | Reproduzierbarer Cloudflare-Pages-Build (`app/dist/`) | §2 Cloudflare-Account/Projekte |
| **B — Security** | TLS/HSTS/CSP/WAF/Turnstile, Secret-Grenze, RLS-Härtung | §1 Supabase (RLS live), §4 Secrets, §2.4 WAF/Turnstile |
| **C — Tenant-Isolation** | Cross-Org-Negativtest grün gegen **echte** DB | §1 Supabase-Projekt (live) |
| **D — Legal** | Impressum/Datenschutz/AGB/Lebensmittel-Hinweis, AVV/TOMs, Subprozessoren | §5 Recht (anwaltlich), §1/§2 Subprozessor-Liste |
| **E — Performance** | Ladezeit/Queries unter Last (EU-Edge) | §1 Supabase-Tier, §3 Domain/CDN |
| **F — Smoke/Geldfluss** | Kernflow + mind. ein realer Geldfluss (Erzeuger-Abo **oder** SB-Zahlung) | §4 Stripe-Keys, §6 Marktstart-Freigabe |

**Stop-Regel (CLAUDE.md §0):** Jeder mit **🔑 Owner** markierte Schritt wird vorab in Klartext angekündigt und erst nach ausdrücklicher Freigabe ausgeführt. Bis dahin bleibt alles repo-lokal und reversibel (Config-as-Code, Vorlagen, Dry-Run).

---

## 1. Supabase-Projekt (EU) — Backend, DB, RLS, Auth, Edge 🔑 Owner

> Quelle der Wahrheit für Schema/RLS: `app/supabase/migrations/0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql` · Seed: `app/supabase/seed.sql` · Setup-Handbuch: `app/supabase/README.md` · Deploy: `docs/DEPLOYMENT.md` (Abschnitt 3–5).

**Warum Owner:** Account-Anlage, Region-Wahl (DSGVO), Bezahl-Tier, Service-Role-Hoheit.

### 1.1 Projekt anlegen
- [ ] **Supabase-Organisation** anlegen (oder bestehende nutzen) — Firmenkonto, nicht privat.
- [ ] **Neues Projekt** in **EU-Region** anlegen: **`eu-central-1` (Frankfurt)** — Pflicht für DSGVO (`docs/COMPLIANCE_MODEL.md`, Datenschutzerklärung). Region ist nach Anlage **nicht** änderbar — vor dem Klick prüfen.
- [ ] **Projekt-Name/Slug** dokumentieren (z. B. `lokalebauernconnect-prod`); **separate Staging-/Prod-Trennung** entscheiden (empfohlen: getrenntes Projekt `…-staging`, gleiche Migrationen).
- [ ] **DB-Passwort** beim Anlegen in den Passwort-Safe (nicht im Klartext, nicht in Git, nicht in Chat).
- [ ] **Plan-Tier** wählen: für Live-Betrieb **mindestens Pro** (tägliche Backups, PITR-Option, kein Auto-Pause). Free-Tier pausiert und ist nur für Erkundung tauglich (Gate E).

### 1.2 Schema + RLS live ziehen (Claude liefert die Migrationen, Owner triggert/bestätigt)
- [ ] Supabase **CLI** installieren (`npm i -g supabase`) und **einloggen** (`supabase login`, persönlicher Access-Token — 🔑 Owner).
- [ ] Projekt verknüpfen: `supabase link --project-ref <project-ref>`.
- [ ] Migrationen anwenden: `supabase db push` (wendet `0001_core`, `0002_payments`, `0003_marketplace` **in Reihenfolge** an) — **oder** `app/supabase/setup_all.sql` im SQL-Editor.
- [ ] Seed einspielen (nur Stamm-/Demo-Daten, **als Demo gekennzeichnet**): `app/supabase/seed.sql`.
- [ ] **RLS-Verifikation (blockierend für Gate B/C):** Bestätigen, dass **alle** Domain-Tabellen `ENABLE ROW LEVEL SECURITY` haben und **deny-by-default** greifen — Beleg liefert der Cross-Org-Isolationstest (`docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`). Kein Live-Schalter ohne grünen Isolationstest gegen die echte DB.

### 1.3 Auth (Supabase Auth) konfigurieren — 🔑 Owner
- [ ] **E-Mail-Auth** aktivieren; **Site-URL** = `https://app.lokalebauernconnect.de`, **Redirect-URLs** = App-URL(s) (Prod + ggf. Preview).
- [ ] **Bestätigungs-/Reset-Mail-Templates** auf Markenton/Deutsch setzen (Vorlagen liefert Claude in `docs/ONBOARDING_SYSTEM.md`).
- [ ] **MFA** für eigene Owner-/Staff-Konten aktivieren.
- [ ] Optional (später): OAuth-Provider — nur wenn fachlich gewollt, sonst leer lassen (kein toter Pfad).

### 1.4 Storage (Hof-/Produktbilder) — 🔑 Owner
- [ ] Bucket(s) anlegen (z. B. `farm-media`), **Zugriffspolicy** = privat + signierte URLs bzw. öffentlich nur für freigegebene Hofbilder. Policy-Skizze: `docs/DATABASE_MODEL.md`.

### 1.5 Backups & DR — 🔑 Owner
- [ ] Backup-Plan gemäß `docs/BACKUP_DISASTER_RECOVERY.md` aktivieren (tägliches Backup; PITR auf Pro-Tier prüfen).
- [ ] **Restore-Probe** mindestens einmal vor Marktstart durchführen (Backup ohne getesteten Restore zählt nicht).

**Was Claude liefert:** alle Migrationen + Seed + RLS-Policies + Isolationstest + Setup-Anleitung (`app/supabase/README.md`, `docs/DATABASE_MODEL.md`, `docs/security/TENANT_ISOLATION_MODEL.md`).
**Owner-Beleg für Gate:** `project-ref` + Region notiert · `db push` erfolgreich · Isolationstest grün · Backup+Restore-Probe dokumentiert.

---

## 2. Cloudflare-Account & Pages-Projekte 🔑 Owner

> Deploy-Handbuch: `docs/DEPLOYMENT.md` (Abschnitt 1–2). Architektur: **zwei Pages-Projekte, eine Domain** — Landing (`web/`, statisch) unter Apex/`www`, App (`app/`, Vite-Build) unter `app.`-Subdomain.

**Warum Owner:** Account, kostenrelevante Projekte/Worker, Domain-Bindung, WAF-Regeln.

### 2.1 Account & Domain-Zone
- [ ] **Cloudflare-Account** anlegen (Firmenkonto, MFA aktiv).
- [ ] Domain `lokalebauernconnect.de` als **Zone** hinzufügen (DNS-Setup in §3).

### 2.2 Pages-Projekt A — Marketing-Landing (`web/`, kein Build)
- [ ] Projekt anlegen, Quelle = Repo, **Root** = `web/`, **Build-Command** = leer, **Output** = `web/` (statisches HTML).
- [ ] Custom-Domain binden: Apex `lokalebauernconnect.de` (+ `www` → Redirect auf Apex).

### 2.3 Pages-Projekt B — Plattform-App (`app/`, Vite)
- [ ] Projekt anlegen mit Settings exakt wie in `docs/DEPLOYMENT.md` / WAVE_01:

  | Setting | Wert |
  |---|---|
  | Production branch | `main` |
  | Root directory (Monorepo) | `app` |
  | Build command | `npm ci && npm run build` |
  | Build output directory | `dist` |
  | Node version | `20` (`.node-version` / `NODE_VERSION=20`) |

- [ ] Custom-Domain binden: **`app.lokalebauernconnect.de`**.
- [ ] **Env-Vars** (Production **und** Preview) setzen — **nur die zwei Public-Keys**, keine Secrets:
  - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = `<supabase-anon-public-key>`
  > Anon-Key landet ohnehin im Bundle und ist public — er ist **kein** Secret. Service-Role gehört **niemals** hierher (→ §4, Edge-Secrets).

### 2.4 Sicherheits-Edge: Turnstile + WAF — 🔑 Owner
- [ ] **Turnstile-Widget** anlegen (Sitekey öffentlich → App-Env; **Secret** → Server/Edge, §4). Bindet an Auth-/Formular-Endpunkte (WAVE_06).
- [ ] **WAF-Grundregeln** aktivieren (Bot-Fight, Rate-Limit auf Auth-/Webhook-Pfade) gemäß `docs/security/SECURITY_OVERVIEW.md`.
- [ ] **Security-Header/CSP/HSTS**: liegen als Config-as-Code im Repo (`app/public/_headers`, `_redirects`) — Owner bestätigt nur, dass Pages sie ausliefert (Gate B). CSP `connect-src` deckt `https://*.supabase.co`; Stripe-/Karten-Domains werden erst beim jeweiligen Go-Live ergänzt (kein toter CSP-Eintrag).

**Was Claude liefert:** `_headers`, `_redirects`, `.node-version`, Pages-Settings-Tabelle, CSP-Vorlage, WAF-Regelvorschlag.
**Owner-Beleg für Gate:** beide Projekte deployen grün · App unter `app.…` erreichbar · TLS aktiv · Header/CSP/HSTS messbar (`curl -I`) · Turnstile+WAF aktiv.

---

## 3. Domain & DNS 🔑 Owner

> Nameserver auf Cloudflare; alle Records in der Cloudflare-Zone. E-Mail-DNS gehört zum Transaktionsmailing (§3.3).

### 3.1 Domain & Nameserver
- [ ] Domain `lokalebauernconnect.de` **registriert** (Owner-Eigentum, Auto-Renew aktiv, Domain-Lock).
- [ ] **Nameserver** beim Registrar auf die von Cloudflare zugewiesenen NS umgestellt; Zone „aktiv" in Cloudflare.

### 3.2 DNS-Records (Apex/App)
- [ ] Apex + `www` → Pages-Projekt A (Landing); Cloudflare verwaltet die CNAME/Apex-Flattening automatisch beim Domain-Binden.
- [ ] `app` → Pages-Projekt B (App).
- [ ] **TLS/SSL** = „Full (strict)"; **Always Use HTTPS** + **HSTS** aktiv (Gate B).
- [ ] CAA-Record (optional, empfohlen) zur CA-Eingrenzung.

### 3.3 Transaktions-E-Mail-DNS (für Quittungen/Reservierungs-Mails)
> Versand läuft über den in den Edge-Functions konfigurierten Provider (`EMAIL_PROVIDER=resend|sendgrid|console`, §4). `console` = kein realer Versand (Dev). Für Live: echter Provider + DNS-Authentifizierung.
- [ ] **Versanddomain/Absender** festlegen: `EMAIL_FROM=LokaleBauernConnect <noreply@lokalebauernconnect.de>` (Default im Repo bereits gesetzt).
- [ ] **SPF**-TXT für den gewählten Provider setzen.
- [ ] **DKIM**-CNAME/TXT (Provider-spezifisch, vom Provider generiert) setzen.
- [ ] **DMARC**-TXT (`p=quarantine` → später `reject`) setzen.
- [ ] **Support-/Antwort-Adresse** einrichten (z. B. `hallo@…` / `support@…`).
- [ ] **Zustellbarkeit testen** (Testmail an Gmail/Outlook, Header prüfen: SPF/DKIM/DMARC = pass).

**Was Claude liefert:** DNS-Record-Templates + Provider-Auswahlhilfe (`docs/engineering/OPERATIONS_RUNBOOK.md` / `docs/DEPLOYMENT.md` Abschnitt 7) sowie die Mail-Provider-Anbindung im Code (`app/supabase/functions/_shared/email.ts`).
**Owner-Beleg für Gate:** Zone aktiv · TLS „Full (strict)" + HSTS · SPF/DKIM/DMARC = pass · Testmail zugestellt.

---

## 4. Secrets & Schlüssel 🔑 Owner

> **Goldene Regel (AGENTS.md):** Frontend kennt **nur** `VITE_`-Public-Keys. **Service-Role-, Stripe-Secret-, Webhook-, Mail- und Turnstile-Secret leben ausschließlich als Supabase Edge Function Secrets** — nie im Bundle, nie in Git, nie im Chat-/CI-Log. Rotations-Doku: `docs/security/SECRET_ROTATION.md`. Edge-Secret-Vorlage (secret-frei): `app/supabase/functions/.env.example`.

### 4.1 Edge-Function-Secrets setzen (Owner führt aus; Claude liefert nur Namen/Vorlage)
- [ ] `supabase secrets set` für die real existierenden Functions (`create-checkout`, `stripe-webhook`):

  | Secret-Name | Zweck | gehört in |
  |---|---|---|
  | `STRIPE_SECRET_KEY` | Stripe-API (Checkout/SB-Zahlung) | Edge Secret |
  | `STRIPE_WEBHOOK_SECRET` | Signaturprüfung Webhook (`whsec_…`) | Edge Secret |
  | `STRIPE_PRICE_BASIS` / `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_PRO` | Erzeuger-Abo-Preise (Price-IDs) | Edge Secret |
  | `EMAIL_PROVIDER` (`resend`/`sendgrid`/`console`) | Mailversand-Schalter | Edge Secret |
  | `RESEND_API_KEY` **oder** `SENDGRID_API_KEY` | Mail-Provider-Key | Edge Secret |
  | `EMAIL_FROM` | Absenderzeile | Edge Secret |
  | `PUBLIC_APP_URL` | Erfolgs-/Abbruch-Redirect | Edge Secret |
  | `CORS_ORIGIN` | CORS auf App-Domain einschränken | Edge Secret |

  > `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` werden von Supabase in Edge Functions **automatisch injiziert** — **nicht** manuell als Secret duplizieren, **nie** mit `VITE_` präfixen.
- [ ] `supabase secrets list` zur Verifikation (zeigt **nur Namen, keine Werte**).
- [ ] **Turnstile-Secret** dort hinterlegen, wo die Validierung läuft (Edge bzw. Worker), **Sitekey** als Public-Var in der App.

### 4.2 Stripe-Account & Connect — 🔑 Owner
- [ ] **Stripe-Account** anlegen (Firmen-/Steuer-Daten, Geschäftskonto verifiziert).
- [ ] **Connect aktivieren** für die **SB-Bezahlung/Erzeuger-Auszahlung** (Phase 4 Track A, `docs/spezialmodule/SB_BEZAHLUNG_USP.md`, `docs/STRIPE-SETUP.md`).
- [ ] **Produkte/Preise** für Erzeuger-Abo anlegen → **Price-IDs** in die o. g. Secrets (`docs/PRICING.md`, `docs/product/PLANS_AND_LIMITS.md`).
- [ ] **Webhook-Endpoint** auf die deployte Function registrieren (`…/functions/v1/stripe-webhook`), Signing-Secret → `STRIPE_WEBHOOK_SECRET`.
- [ ] **Live-Testkauf** (mind. ein realer Geldfluss) — Pflicht für Gate F (`docs/SUBSCRIPTION_LIFECYCLE.md`, „Definition of Done").

### 4.3 Secret-Rotation vor Marktstart — 🔑 Owner (Pflicht)
- [ ] **Jede** Variable, die je in einem `.env`-Artefakt oder im Klartext war, als **kompromittiert** behandeln und rotieren (`docs/security/SECRET_ROTATION.md`):
  - Supabase `service_role` (Settings → API → Reset) und ggf. `anon` (Pages-Env aktualisieren + Redeploy)
  - DB-Passwort
  - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
  - Mail-Provider-Key (`RESEND_API_KEY` / `SENDGRID_API_KEY`)
  - Turnstile-Secret, Cloudflare-/GitHub-Access-Tokens (Wrangler/CLI)
- [ ] Alte Tokens deaktivieren. **Niemals** echte Werte in Code, Doku oder Chat.

**Was Claude liefert:** vollständige, **secret-freie** `.env.example`-Vorlagen, Rotations-Checkliste, Webhook-Idempotenz/Signaturprüfung im Code, Live-Testkauf-Anleitung.
**Owner-Beleg für Gate:** `secrets list` zeigt nur Namen · kein `VITE_`-Präfix auf Server-Secrets · Webhook signiert & idempotent · Live-Testkauf erfolgreich · Rotation dokumentiert.

---

## 5. Recht & Datenschutz (für Gate D) 🔑 Owner — anwaltlich prüfen

> Rolle = **Vermittler**: keine Eigenvermarktung, keine Beratung. Lebensmittel-Kennzeichnung ist **Pflicht der Erzeuger** — die Plattform weist nur hin (`docs/COMPLIANCE_MODEL.md`). Claude liefert **Vorlagen, niemals juristische Garantie.**

- [ ] **Impressum** finalisieren (Anbieter-Kennzeichnung, Vermittler-Rolle explizit).
- [ ] **Datenschutzerklärung** finalisieren (Supabase EU, Cloudflare, Stripe, Mail-Provider als **Subprozessoren** benennen — Liste aus §1/§2 ableiten).
- [ ] **AGB / Nutzungsbedingungen** (Käufer · Erzeuger) finalisieren — inkl. Reservierungs-/Abhol- und SB-Zahlungsregeln.
- [ ] **Lebensmittel-Hinweis** an Erzeuger (Kennzeichnungspflicht, Allergene) — Disclaimer durchgängig sichtbar bestätigen.
- [ ] **AVV/DPA** mit den Subprozessoren abschließen; **TOMs** dokumentieren (`docs/security/` Vorlagen).
- [ ] **Löschkonzept / Aufbewahrungsfristen** festlegen (DSGVO Art. 17).
- [ ] **Cookie-/Tracking-Bewertung** (möglichst tracking-arm; Consent nur falls nötig).
- [ ] Rolle klären: **Verantwortlicher vs. Auftragsverarbeiter** je Datenfluss.

**Was Claude liefert:** Rechtstext-Skelette (`docs/launch/B_rechtstexte/*`), `docs/COMPLIANCE_MODEL.md`, TOMs-Vorlage, Subprozessor-Tabelle.

---

## 6. Marktstart-Freigabe (Go-Live-Gate) 🔑 Owner

> Endgültige Owner-Entscheidung „**Live schalten**". Erst nach grünen Gates A–F + erfülltem Marktstart-Pflicht-Set (`PHASEN.md` → „Marktstart-Pflicht-Set"). „Fast fertig" zählt nicht.

### 6.1 Freigabe-Vorbedingungen (alle müssen erfüllt sein)
- [ ] Phase 1 **WAVE 02–15 grün** + Isolationstest grün (echte DB).
- [ ] Phase 2 **Gates A–F grün** (`GATES.md`), Cloudflare-Deploy live, Domain + Security-Header aktiv.
- [ ] Phase 3 **Ops-Gate** grün (minimale Betriebssicht: Monitoring/Incident-Weg).
- [ ] **Mindestens ein realer Geldfluss** funktioniert: Erzeuger-Abo (WAVE_09) **oder** SB-Zahlung (Track A) — Live-Testkauf bestanden.
- [ ] **Burn-in ≥ 7 Tage** ohne P0/P1-Incident (Phase 2).
- [ ] Phase 5 **Gate 10** angesteuert (erste zahlende Erzeuger als Ziel).

### 6.2 Betriebsbereitschaft festlegen
- [ ] **Erste Zielregion/-kunden** definieren (Erzeuger + Käufer-Korridor).
- [ ] **Supportzeiten** + **Eskalationsweg** (P0 → wer wann; `docs/INCIDENT_RUNBOOK.md`).
- [ ] **Onboarding-Termine** für Pilot-Erzeuger planen (`docs/ONBOARDING_SYSTEM.md`).
- [ ] **Demo- vs. Echtdaten** trennen — Seed-/Demo-Datensätze sind **gekennzeichnet** und werden für Live bewusst behandelt (entfernen oder klar markieren).
- [ ] **Monitoring/Alerting** scharf (Sentry/Health-Checks, `docs/MONITORING.md`, `docs/OBSERVABILITY.md`).
- [ ] **Sales-/Marktstart-Unterlagen** finalisieren (`docs/MARKTSTART_PLAN.md`, `docs/SALES_DEMO_PATH.md`); **keine unbewiesenen Funktionen versprechen**.

### 6.3 Die Freigabe selbst
- [ ] Owner gibt **schriftlich** „Go-Live" frei → erst dann produktiver Switch (Domain final, Demo-Daten-Politik aktiv, Monitoring scharf).
- [ ] Datum + Verantwortlicher in `docs/releases/MANUAL_TASKS_CHECKLIST.md` und `docs/releases/PHASE_STATUS.md` (Zeile „Gate 10") eintragen.

---

## 7. Workflow & Tracking (verbindlich)

**Pro Aufgabe:**
1. Claude prüft, ob Vorlage/Anleitung in `docs/` existiert; falls nein → erstellt sie als belastbares Skelett.
2. Owner setzt Status „in Bearbeitung" in `docs/releases/MANUAL_TASKS_CHECKLIST.md`.
3. Owner führt durch (Account/Secret/DNS/Recht/Freigabe).
4. Owner setzt Status „abgeschlossen" **mit Datum + Beleg** (z. B. `secrets list`-Ausgabe, `curl -I`-Header, Stripe-Event-ID — **ohne** Geheimwerte).
5. **Gate-Pass** erst, wenn alle für das Gate relevanten manuellen Aufgaben erledigt **und belegt** sind.

### `docs/releases/MANUAL_TASKS_CHECKLIST.md` (Tracking-Format)
```
| Gate | Bereich | Aufgabe | Status | Datum | Verantwortlich | Beleg (ohne Werte) |
|---|---|---|---|---|---|---|
| B/C | Supabase | Projekt EU + db push + Isolationstest | offen | — | Owner | — |
| B   | Cloudflare | Pages A+B live + Header/CSP/HSTS | offen | — | Owner | — |
| B/E | DNS | Zone aktiv, TLS strict, SPF/DKIM/DMARC pass | offen | — | Owner | — |
| B/F | Secrets | Edge-Secrets + Stripe + Rotation | offen | — | Owner | — |
| D   | Recht | Impressum/DS/AGB/AVV/TOMs (anwaltlich) | offen | — | Owner | — |
| F   | Marktstart | Go-Live-Freigabe + Burn-in ≥7T | offen | — | Owner | — |
```

---

## 8. Warum diese Trennung zählt

Meldet ein Modell „Domain gekauft", „Secrets rotiert" oder „Live geschaltet" als erledigt, ist das eine **Halluzination** — kein Modell kann auf fremde Accounts, Geld oder Recht zugreifen. Diese Schritte gehören dem Owner; Claude liefert die Vorarbeit lückenlos (Config-as-Code, Migrationen, Vorlagen, Verifikations-Checklisten), aber den Knopf drückt der Owner. **Gate D (Legal)** und **Gate F (Smoke/Geldfluss)** werden ohne die manuellen Aufgaben dieser Datei **nie** grün — und ohne grüne Gates kein Marktstart.

---

## 9. Referenzen
- **Steuerung:** `CLAUDE.md` (§0, Stop-Regeln) · `AGENTS.md` (harte Regeln, Secret-Grenze) · `PHASEN.md` (Phase 2, Gates A–F, Marktstart-Pflicht-Set).
- **Gates/Release:** `finalization/phase2_release/GATES.md` · `WAVES.md` · `MASTERPROMPT.md` · `README.md`.
- **Deploy/Infra:** `docs/DEPLOYMENT.md` · `app/supabase/README.md` · `docs/engineering/OPERATIONS_RUNBOOK.md` · `docs/BACKUP_DISASTER_RECOVERY.md` · `docs/INCIDENT_RUNBOOK.md`.
- **Security/Compliance:** `docs/security/SECURITY_OVERVIEW.md` · `SECRET_ROTATION.md` · `TENANT_ISOLATION_MODEL.md` · `docs/COMPLIANCE_MODEL.md` · `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`.
- **Commercial:** `docs/PRICING.md` · `docs/STRIPE-SETUP.md` · `docs/SUBSCRIPTION_LIFECYCLE.md` · `docs/spezialmodule/SB_BEZAHLUNG_USP.md`.
- **Marktstart:** `docs/MARKTSTART_PLAN.md` · `docs/SALES_DEMO_PATH.md` · `docs/ONBOARDING_SYSTEM.md`.
- **Reale Artefakte:** `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql` · `app/supabase/seed.sql` · `app/supabase/setup_all.sql` · `app/supabase/functions/{create-checkout,stripe-webhook}/index.ts` · `app/supabase/functions/.env.example` · `app/.env.example` · `app/public/{_headers,_redirects}`.
