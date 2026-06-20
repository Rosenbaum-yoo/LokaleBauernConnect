# LokaleBauernConnect — Secret-Management & Rotation

> Verbindliche Betriebsanleitung für Inventarisierung, Speicherung und Rotation aller Geheimnisse.
> Stack: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Phase 1 · WAVE_06 (Security) · Stand: 2026-06-19
> Verbindlicher Kanon: `CLAUDE.md`, `AGENTS.md`, `PHASEN.md`. Eingebettet in: `docs/security/SECURITY_OVERVIEW.md` §9. Vertiefend: `docs/security/IDENTITY_MODEL.md`, `docs/security/TENANT_ISOLATION_MODEL.md`, `docs/COMPLIANCE_MODEL.md`.

---

## 0. Leitprinzip

**Secrets leben ausschließlich in verwalteten Secret-Stores — niemals im Code, Repo, Bundle oder Log.** Es gibt genau zwei Klassen von Konfigurationswerten, und die Grenze zwischen ihnen ist eine harte Sicherheitsgrenze:

1. **Public** (`VITE_`-Präfix) — wird von Vite in das ausgelieferte Browser-Bundle gebacken und ist damit **für jeden lesbar**. Nur Werte, deren Veröffentlichung explizit unkritisch ist (Supabase-URL, Anon-Key mit RLS-Bindung, Stripe Publishable Key, Turnstile Site-Key).
2. **Secret** (kein `VITE_`-Präfix) — lebt ausschließlich serverseitig (Supabase Function Secrets / Cloudflare Worker Secrets). Wird **nie** an den Client ausgeliefert, nie geloggt, nie commitet.

Wirtschaftlicher Hintergrund (§0 Wirtschaftlichkeit): Ein geleakter Service-Role-Key oder Stripe-Secret-Key bedeutet vollständigen Datenabfluss bzw. direkten Geldverlust. Rotation ist die billigste Versicherung gegen den teuersten Vorfall. Dieses Dokument ist Bestandteil des **Security-Gates (Phase 2 Gate B)** und des **Marktstart-Pflicht-Sets**.

> **Faustregel (Kompromittierungs-Annahme):** Jedes Secret, das jemals in einer lokalen `.env`-Datei, in einer Chat-Nachricht, in einem Ticket, in einem CI-Log oder auf einem Entwicklerrechner stand, gilt als kompromittiert und **muss vor dem ersten Produktionsbetrieb mit echten Personen-/Zahlungsdaten rotiert werden.**

---

## 1. Secret-Inventar (Source of Truth)

Vollständige Liste aller Geheimnisse und öffentlichen Konfigurationswerte. Die Spalte **Klasse** entscheidet über den Speicherort; **Blast-Radius** über die Dringlichkeit bei Verdacht.

### 1a. Public (im Browser-Bundle — bewusst öffentlich)

| Schlüssel | Quelle | Zweck | Warum unkritisch |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Projekt-Endpoint des Clients | Öffentliche URL; Zugriff allein über RLS geschützt |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → Project API keys → `anon` | Client-Auth gegen Supabase | RLS-gebunden; kann nur, was die Policies erlauben (deny-by-default) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys → `pk_…` | Stripe Elements/Checkout im Browser | Von Stripe als clientseitig vorgesehen; keine Geldbewegung möglich |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare → Turnstile → Widget | Rendert das Turnstile-Widget | Site-Key ist per Design public; Verifikation erfolgt serverseitig mit dem Secret |

> **Public ≠ harmlos:** Auch öffentliche Werte werden über die jeweiligen Dashboards gepflegt und versioniert (z. B. bei Project-Wechsel/Domain-Wechsel), aber sie lösen keinen Incident aus, wenn sie sichtbar werden. Der Anon-Key ist nur sicher, **solange RLS korrekt ist** (`docs/security/TENANT_ISOLATION_MODEL.md`).

### 1b. Secret (serverseitig — nie im Client, nie im Log)

| Schlüssel | Quelle | Verwendung (nur hier) | Blast-Radius bei Leak |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → Project API keys → `service_role` | Edge Functions, die RLS **bewusst umgehen** (z. B. systemische Aggregation, Webhook-Verarbeitung) | **KRITISCH** — umgeht RLS vollständig, voller Lese-/Schreibzugriff auf alle Mandanten |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → `sk_…` | Edge Function: PaymentIntent (SB-Bezahlung), Connect, Abo-Verwaltung | **KRITISCH** — direkte Geldbewegung, Auslesen aller Zahlungsdaten |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → Endpoint → Signing secret (`whsec_…`) | Edge Function: Signaturprüfung des **einen** idempotenten Webhook-Handlers | **HOCH** — gefälschte Webhooks → falsche Entitlements/Quittungen |
| `STRIPE_CONNECT_*` (Webhook-Secret für Connect-Events, falls separater Endpoint) | Stripe → Connect → Webhooks | Connect-Auszahlungs-/Account-Events | **HOCH** — manipulierte Auszahlungs-/Account-Statusmeldungen |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → Widget → Secret Key | Edge Function: `siteverify` gegen `challenges.cloudflare.com` | **MITTEL** — Bot-/Spam-Schutz auf öffentlichen Formularen fällt aus |
| `SUPABASE_DB_PASSWORD` | Supabase → Database → Connection / Reset password | Migrations-/Admin-Zugang zur Postgres-DB (CLI, nicht im Laufbetrieb der App) | **KRITISCH** — direkter DB-Zugriff unter Umgehung von PostgREST/RLS |
| `SUPABASE_ACCESS_TOKEN` (PAT) | Supabase → Account → Access Tokens | CI/CD: `supabase` CLI (Migrations-Deploy, Function-Deploy) | **HOCH** — Steuerung des Projekts via CLI/API |
| `CLOUDFLARE_API_TOKEN` (scoped) | Cloudflare → My Profile → API Tokens (least privilege) | CI/CD: Pages/Workers-Deploy via `wrangler` | **HOCH** — Deploy-/DNS-/WAF-Änderungen je nach Scope |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` (geplant, WAVE_13) | Sentry → Project Settings | Fehler-Telemetrie (DSN = ingest; Auth-Token = Source-Map-Upload in CI) | DSN: NIEDRIG (ingest-only) · Auth-Token: **MITTEL** |

> **Hinweis zur DB-Verbindung:** Die App spricht Postgres **niemals** mit `SUPABASE_DB_PASSWORD` direkt an — der Laufbetrieb läuft über PostgREST mit Anon-/User-JWT (RLS) bzw. in Edge Functions über den Service-Role-Key. Das DB-Passwort ist ausschließlich ein Admin-/Migrations-Geheimnis (CLI, CI). Diese Trennung verkleinert den Angriffspfad bewusst.

> **Es gibt KEINE** plattformeigenen `SESSION_SECRET`/`JWT_SECRET`/`STAFF_SESSION_SECRET`/`ADMIN_SECRET`/`PROMETHEUS_METRICS_SECRET` — Session-/JWT-Verwaltung übernimmt vollständig **Supabase Auth (GoTrue)**. (Diese Werte stammen aus einem fremden Self-Host-/Node-Stack und gehören **nicht** in diese Plattform.)

---

## 2. Speicherung — wo welcher Wert lebt

### 2a. Public-Werte (Build-Zeit)

- **Cloudflare Pages → Project → Settings → Environment variables** (Scope `Production` und `Preview` getrennt). Nur `VITE_`-Werte. Diese werden beim Build in das Bundle eingebacken.
- **Lokale Entwicklung:** `app/.env.local` (in `.gitignore`, **nie** commiten). Vorlage ohne echte Werte in `app/.env.example` (im Repo, nur Schlüsselnamen + Kommentare).

### 2b. Secret-Werte (Laufzeit, serverseitig)

| Konsument | Speicherort | Befehl / Pfad |
|---|---|---|
| **Supabase Edge Functions** (Deno) | Supabase Function Secrets | `supabase secrets set NAME=wert` · Lesen zur Laufzeit via `Deno.env.get('NAME')` |
| **Cloudflare Workers** (falls genutzt) | Worker Secrets (verschlüsselt) | `wrangler secret put NAME` · **nicht** als Plaintext-`[vars]` in `wrangler.toml` |
| **CI/CD-Pipeline** | Repository/Org Secrets des CI (z. B. GitHub Actions Encrypted Secrets) | nur als maskierte Build-Variablen; nie in Logs ausgegeben |
| **Lokale Entwicklung gegen Live-Dienste** | persönliche `.env`-Datei außerhalb des Repos / OS-Keychain | bevorzugt **Test-Mode-Keys** (Stripe `sk_test_…`), nie Live-Secrets lokal |

**Verbote bei der Speicherung (hart):**
- Secrets **nie** in `wrangler.toml`, `supabase/config.toml`, Migrationen, Seeds, Tests oder Markdown-Doku im Klartext.
- Secrets **nie** mit `VITE_`-Präfix anlegen (würden ins Bundle wandern) — der Präfix ist der einzige Schalter, der über „öffentlich" entscheidet.
- `.env*` und `.claude/` sind aus jedem Release-Artefakt ausgeschlossen (`.gitignore`, Phase-2-Gate-Check).

---

## 3. Verbot im Client & im Log (nicht verhandelbar)

> Aus `CLAUDE.md` / `AGENTS.md`: „Secrets nie in Dateien/Log — nur Env. service role nur in Edge Functions, Frontend nur `VITE_`-Public."

**Im Client (Browser/Bundle):**
- Niemals ein Secret aus §1b in Frontend-Code (`app/src/**`) referenzieren. Der einzige im Frontend erlaubte Supabase-Zugang ist `VITE_SUPABASE_ANON_KEY` über `app/src/lib/supabase.ts`.
- Der **Service-Role-Key umgeht RLS** und darf den Browser unter keinen Umständen erreichen — Verwendung ausnahmslos in Edge Functions mit eigener Rechteprüfung.
- Beträge/Preise werden serverseitig aus `products` neu bestimmt; der Client erhält nie Secret-gestützte Berechnungslogik (kein Preis-Tampering, siehe `SECURITY_OVERVIEW.md` §8).

**Im Log / in Fehlermeldungen:**
- Edge Functions loggen **niemals** `Deno.env.get(...)`-Werte, Authorization-Header, Stripe-Roh-Payloads mit Tokens oder vollständige Request-Bodies. Logging erfolgt strukturiert (Aktion, Ressource, Org-Scope, Ergebnis) — ohne Geheimnisse, ohne unnötige PII (DSGVO-Datenminimierung).
- Fehlerantworten an den Client sind **nicht-leakend** (`400/403/429` mit generischer Meldung), keine internen Keys/Stacktraces (`SECURITY_OVERVIEW.md` §4/§7).
- `audit_log` enthält **wer/was/warum/wann/Ergebnis**, **niemals** Secrets oder Karten-/Token-Rohdaten.

**Verifikation (automatisierbar, Teil des Security-Gates):**
```bash
# 1) Kein Secret-Pattern im Build-Output (Pages-Bundle)
grep -rEn 'service_role|sk_live_|sk_test_|whsec_|SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET' app/dist/ \
  && echo "FAIL: Secret im Bundle" || echo "OK: kein Secret im Bundle"

# 2) Kein Nicht-VITE-Secret im Frontend-Quellcode referenziert
grep -rEn 'SERVICE_ROLE|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|TURNSTILE_SECRET_KEY' app/src/ \
  && echo "FAIL: Secret-Referenz im Frontend" || echo "OK: keine Secret-Referenz im Frontend"

# 3) Keine Klartext-Secrets in Konfig-Dateien
grep -rEn 'sk_(live|test)_|whsec_|service_role' app/ --include='*.toml' --include='*.json' --include='*.md' \
  | grep -v '\.example' && echo "FAIL: Secret in Konfig" || echo "OK"
```
Ein Treffer in (1)–(3) ist ein **blockierender Gate-Fehler** (kein Go-Live).

---

## 4. Rotationsplan (Kadenz)

| Anlass | Pflicht-Rotation |
|---|---|
| **Vor erstem Produktionsbetrieb** (erste echten Käufer/Erzeuger, erste Live-Zahlung) | **Alle** Secrets aus §1b (Kompromittierungs-Annahme aus §0) — **PFLICHT**, Teil Marktstart-Pflicht-Set |
| **Verdacht / Leak** (Secret in Log, Repo, Chat, Screenshot, Ex-Mitarbeiter) | Betroffene Secrets **sofort** (siehe §6 Incident) |
| **Personalwechsel** (Zugriff auf Stores entfällt) | Service-Role-Key, DB-Passwort, CI-Tokens, Cloudflare/Supabase-PATs |
| **Routine** | Stripe-Keys & DB-Passwort ≤ 12 Monate · CI/Deploy-Tokens ≤ 6 Monate · Service-Role-Key ≤ 12 Monate |
| **Stack-Änderung** | Bei Webhook-Endpoint-Wechsel: neues `STRIPE_WEBHOOK_SECRET`; bei Projekt-/Domain-Wechsel: Anon-/Service-Keys neu verdrahten |

Jede Rotation wird im Nachweisprotokoll (§7) dokumentiert. **Deploy/Rotation an Live-Diensten vorab dem Owner in Klartext ankündigen** (Kosten/Account/Downtime), erst auf OK ausführen (`CLAUDE.md` Sicherheits-/Betriebsregeln).

---

## 5. Rotations-Runbooks (pro Secret, mit Validierung)

> Reihenfolge so gewählt, dass die App während der Rotation funktionsfähig bleibt; wo eine kurze Lücke unvermeidbar ist, ist sie markiert. Alle Befehle setzen die offiziellen CLIs voraus (`supabase`, `wrangler`, `stripe`).

### 5.1 Supabase `service_role`-Key — **KRITISCH**

1. **Ankündigen** (Owner-OK), Wartungsfenster optional (kurze Lücke für Edge Functions, die den Key nutzen).
2. Supabase Dashboard → **Project Settings → API → „Reset/Rotate service_role key"** (erzeugt neuen Key, alter wird ungültig).
3. Neuen Wert in den Function-Store setzen:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="NEUER_WERT"
   ```
4. Edge Functions, die den Key zur Cold-Start-Zeit lesen, neu deployen, damit der neue Wert greift:
   ```bash
   supabase functions deploy --project-ref <PROJECT_REF>
   ```
5. **Validieren:** geschützte Edge-Function aufrufen, die Service-Role nutzt → erwartetes Ergebnis; Cross-Org-Negativtest weiterhin `403`/leer (RLS bleibt Autorität).
6. **Wichtig:** Falls der Key je geleakt war, zusätzlich RLS-Annahmen prüfen — der Anon-Key bleibt sicher, der Service-Role-Key war es nicht.

### 5.2 Stripe Secret Key (`sk_…`) — **KRITISCH**

1. Stripe Dashboard → **Developers → API keys → „Roll secret key"** mit kurzer Überlappungsfrist (Stripe erlaubt befristete Doppelgültigkeit → **zero-downtime**).
2. Neuen Wert setzen:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY="sk_live_NEU"
   ```
   Edge Functions (PaymentIntent/Connect/Abo) neu deployen.
3. **Validieren (Test-Mode zuerst):** im Stripe-Testmodus eine PaymentIntent über die Edge Function erzeugen → Erfolg; danach kontrollierter Live-Smoke (kleiner Betrag, anschließend refunden) nach Owner-OK.
4. Alten Key in Stripe nach Verifikation **revoken**.

### 5.3 Stripe Webhook-Signing-Secret (`whsec_…`) — **HOCH**

1. Stripe Dashboard → **Developers → Webhooks → Endpoint → „Roll signing secret"** (Überlappung möglich → zero-downtime).
2. Während der Überlappung den Handler so deployen, dass er **beide** Secrets gegen `Stripe-Signature` prüft (alt **und** neu), dann nach Ablauf nur noch das neue:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_NEU"
   supabase functions deploy stripe-webhook --project-ref <PROJECT_REF>
   ```
3. **Validieren:** „Send test webhook" aus dem Stripe-Dashboard → Handler antwortet `2xx`, Signaturprüfung grün, **Idempotenz** über `event.id` greift (kein Doppel-Effekt). Ungültige Signatur → `400`, **kein** DB-Schreibzugriff.

### 5.4 Turnstile Secret Key — **MITTEL**

1. Cloudflare → **Turnstile → Widget → „Rotate secret"** (Site-Key bleibt; nur Secret ändert sich → kein Frontend-Redeploy nötig).
2. ```bash
   supabase secrets set TURNSTILE_SECRET_KEY="NEU"
   supabase functions deploy --project-ref <PROJECT_REF>
   ```
3. **Validieren:** öffentliches Formular (Reservierung/Onboarding) absenden → `siteverify` grün; manipuliertes/leeres Token → `403` ohne DB-Schreibzugriff.

### 5.5 Supabase DB-Passwort — **KRITISCH (Wartungsfenster)**

1. **Ankündigen + Wartungsfenster** (Migrations-/CLI-Zugang betroffen; der App-Laufbetrieb über PostgREST/JWT ist **nicht** betroffen, da er das DB-Passwort nicht nutzt).
2. Supabase Dashboard → **Database → „Reset database password"** → neues starkes Passwort erzeugen lassen.
3. Connection-String in **CI-Secrets** (`SUPABASE_DB_PASSWORD` / `DATABASE_URL` für Migrationen) aktualisieren. **Nicht** in App-`.env`, da die App es nicht verwendet.
4. **Validieren:** Migrations-Dry-Run gegen die DB (`supabase db push --dry-run` / `psql`-Connect mit neuem Passwort) → Erfolg.

### 5.6 CI/Deploy-Tokens (`SUPABASE_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN`) — **HOCH**

1. Im jeweiligen Dashboard neuen, **least-privilege** scoped Token erzeugen (nur die für Deploy nötigen Rechte).
2. Token in den CI-Secrets ersetzen, **alten Token revoken**.
3. **Validieren:** CI-Pipeline einmal durchlaufen lassen (Build + Function-Deploy + Pages-Deploy) → grün.

### 5.7 Public-Keys (Anon / Publishable / Site-Key)

Routinerotation i. d. R. nicht nötig (kein Secret-Charakter). **Rotation erforderlich bei:** Supabase-Projektwechsel, Stripe-Account-/Restricted-Key-Wechsel, Turnstile-Widget-Neuanlage. Dann Cloudflare-Pages-Env aktualisieren und **neu builden** (Werte sind build-time gebacken).

---

## 6. Incident-Sofortmaßnahmen (Secret vermutet kompromittiert)

> Ziel: Blast-Radius in Minuten schließen, dann sauber rotieren. Reihenfolge nach Blast-Radius (§1b).

1. **`STRIPE_SECRET_KEY` / `service_role` / `SUPABASE_DB_PASSWORD`:** sofort im jeweiligen Dashboard **revoken/rollen** (nicht auf das Wartungsfenster warten — Geld/Datenabfluss-Risiko übersteigt Downtime).
2. **`STRIPE_WEBHOOK_SECRET`:** rollen; bis dahin Handler so härten, dass nur signaturgeprüfte Events verarbeitet werden (ist Default — Idempotenz schützt zusätzlich vor Replays).
3. **CI-/Deploy-Tokens:** revoken, neue scoped Tokens, Pipeline prüfen.
4. **Forensik & Eindämmung:** Cloudflare- und Supabase-Logs auf anomale Zugriffe sichten; bei Verdacht auf RLS-Umgehung über einen geleakten Service-Role-Key zusätzlich Audit-Feed (`audit_log`) prüfen.
5. **Audit-Event** anlegen (Aktion `secret.rotate` / `secret.compromise`, reason Pflicht), Owner informieren (Klartext-Meldung).
6. **DSGVO-Prüfung:** Bei möglichem Personen-/Zahlungsdaten-Abfluss Meldepflichten gem. `docs/COMPLIANCE_MODEL.md` bewerten (72-h-Frist im Blick behalten).
7. Anschließend reguläres Runbook (§5) + Nachweis (§7) abschließen.

---

## 7. Nachweis / Abnahme (pro Rotation auszufüllen)

```
Secret(s):            __________________________________
Klasse / Blast-Radius: ____________  /  ____________
Anlass:               [ ] Pre-Prod  [ ] Routine  [ ] Personalwechsel  [ ] Incident
Owner-Freigabe:       ____-__-__ __:__   durch: _______________
Rotiert am:           ____-__-__ __:__   durch: _______________
Store aktualisiert:   [ ] Supabase Secrets  [ ] Cloudflare Pages/Worker  [ ] CI-Secrets
Re-Deploy:            [ ] Edge Functions  [ ] Pages-Build (bei Public-Keys)
Alten Wert revoked:   [ ] ja, am ____-__-__ __:__
Verify:               _________________________________________________
                      (z. B. Stripe Test-Webhook 2xx · Turnstile siteverify OK ·
                       Cross-Org-Negativtest 403/leer · CI-Pipeline grün)
Audit-Event-ID:       __________________________________
```

---

## 8. Checkliste — Secret-Härtung vor Go-Live (Security-Gate, Phase 2 Gate B)

- [ ] Alle Secrets aus §1b vor Produktionsbetrieb **mindestens einmal rotiert** (Kompromittierungs-Annahme)
- [ ] Kein Secret-Pattern im Build-Output (`grep` §3 (1) grün)
- [ ] Keine Nicht-`VITE_`-Secret-Referenz im Frontend (`grep` §3 (2) grün)
- [ ] Keine Klartext-Secrets in `wrangler.toml` / `config.toml` / Migrationen / Doku (`grep` §3 (3) grün)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ausschließlich in Edge Functions, nie im Client
- [ ] Stripe Secret/Webhook-Secret nur als Supabase/Worker-Secret; Webhook signaturgeprüft + idempotent
- [ ] `TURNSTILE_SECRET_KEY` nur serverseitig; `siteverify` erzwungen auf öffentlichen Schreibpfaden
- [ ] CI-/Deploy-Tokens least-privilege & scoped; ungenutzte/alte Tokens revoked
- [ ] `.env*` und `.claude/` nicht im Release-Artefakt
- [ ] Edge-Function-Logs ohne Secrets/Authorization-Header/Roh-Payloads; Fehlerantworten nicht-leakend
- [ ] Nachweisprotokoll (§7) für jede Rotation ausgefüllt + Audit-Event vorhanden

---

## 9. Offene Punkte / Owner-Entscheidungen

| ID | Beschreibung | Priorität | Status |
|---|---|---|---|
| ROT-01 | Erst-Rotation aller §1b-Secrets steht bis zum Live-Deploy aus (Account/Domain/Kosten nicht freigegeben) | HOCH | Owner-Freigabe ausstehend |
| ROT-02 | CI/CD-Secret-Store noch nicht eingerichtet (CI-Pipeline folgt mit Cloudflare-/Supabase-Deploy) | MITTEL | nach Deploy-Freigabe |
| ROT-03 | Sentry-DSN/Auth-Token erst mit Observability (WAVE_13) relevant | NIEDRIG | geplant |
| ROT-04 | Optionaler separater Connect-Webhook-Endpoint → eigenes `whsec_…` (abwägen mit Phase 4 Track A) | NIEDRIG | abwägen pro Architektur |

---

*Letzte Aktualisierung: Phase 1 · WAVE_06 · 2026-06-19*
*Zuständig: Security (Claude) · Freigabe: Owner*
*Querverweise: `docs/security/SECURITY_OVERVIEW.md` §9 · `docs/security/IDENTITY_MODEL.md` · `docs/security/TENANT_ISOLATION_MODEL.md` · `docs/COMPLIANCE_MODEL.md` · `docs/adr/0001…`, `0002…`*
