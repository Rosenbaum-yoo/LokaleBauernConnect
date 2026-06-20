# DEPLOYMENT — LokaleBauernConnect (Cloudflare Pages · Workers/Edge · Supabase)

> Verbindliches Deployment-Handbuch für **Phase 2 (Release-operativ)**. Stack fix: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
>
> **Rolle = Vermittler.** Die Plattform betreibt Auslieferung und Zahlungsanbindung — sie verkauft nicht selbst und berät nicht. Disclaimer durchgängig (siehe `docs/COMPLIANCE_MODEL.md`).
>
> **Owner-Hoheit:** Alle hier mit **🔑 Owner** markierten Schritte sind account-, kosten-, domain- oder geld­relevant und **irreversibel oder extern sichtbar**. Sie werden vorab in Klartext angekündigt und erst nach ausdrücklicher Freigabe ausgeführt (CLAUDE.md §0, Stop-Regeln). Reversible lokale Vorbereitung (Build, Config-as-Code, Dry-Run) ist decide-and-act.
>
> **Verwandte Dokumente:** `docs/ARCHITEKTUR.md` (§9 Betrieb/Deployment) · `docs/ENTERPRISE_ARCHITECTURE.md` · `docs/security/SECURITY_OVERVIEW.md` (§1–3 TLS/CSP/WAF — **kanonische Header-Quelle**) · `docs/security/SECRET_ROTATION.md` · `docs/STRIPE-SETUP.md` · `app/supabase/README.md` · `docs/BACKUP_DISASTER_RECOVERY.md` · `docs/INCIDENT_RUNBOOK.md` · `PHASEN.md` (Phase 2, Gates A–F).

---

## 0. Überblick — was wird wohin deployt

LokaleBauernConnect besteht aus **zwei** über Cloudflare Pages ausgelieferten Frontends und einer **Supabase**-Backend-Ebene. Cloudflare Workers liefern Edge-Logik nur dort, wo Pages-`_headers`/`_redirects` nicht ausreichen.

| Artefakt | Quelle | Build | Auslieferung | Sichtbar unter |
|---|---|---|---|---|
| **Marketing-Landing** | `web/` (statisch, kein Build) | — (direkt `web/`) | Cloudflare Pages (Projekt A) | `https://lokalebauernconnect.de` (Apex) |
| **Plattform-App** | `app/` (Vite/React/TS) | `tsc --noEmit && vite build` → `app/dist/` | Cloudflare Pages (Projekt B) | `https://app.lokalebauernconnect.de` |
| **Backend (DB + RLS + Auth)** | `app/supabase/migrations/` + `seed.sql` | Supabase CLI (`db push`) | Supabase Managed Postgres (EU) | intern, via `VITE_SUPABASE_URL` |
| **Edge Functions** (Deno) | `app/supabase/functions/*` (ab WAVE_06/09) | `supabase functions deploy` | Supabase Edge (EU) | `…/functions/v1/*` |
| **Edge-Logik (optional)** | `app/_worker.js` bzw. Pages Functions `functions/` | im Pages-Build | Cloudflare Workers (Edge) | Header/Routing/Rate-Limit |

> **Architektur-Entscheidung (zwei Pages-Projekte, eine Domain):** Landing und App werden als **getrennte** Pages-Projekte unter **Subdomains** ausgeliefert (`@`/`www` → Landing, `app.` → App). Das hält Build-Pipelines, Caching, CSP und Security-Header pro Oberfläche sauber getrennt und vermeidet Pfad-Kollisionen zwischen statischem HTML und SPA-Routing. Begründung als Default-Vorschlag — der Owner kann stattdessen Pfad-Splitting (`/` Landing, `/app/*` App) wählen; dann Abschnitt 2.4 (Pfad-Variante) befolgen.

**Trennung der Welten** (Käufer · Erzeuger · Staff) erfolgt in der App über Session/Berechtigung und in der DB über RLS — **nicht** über getrennte Deployments. Siehe `docs/ROLE_AND_PERMISSION_MODEL.md`.

---

## 1. Voraussetzungen (einmalig)

### 1.1 Lokale Werkzeuge

| Werkzeug | Version | Zweck | Installation |
|---|---|---|---|
| Node.js | ≥ 20 LTS | Build der App | `nvm install 20` / nodejs.org |
| npm | ≥ 10 | Paketmanager | mit Node |
| Cloudflare **Wrangler** | ≥ 3.x | Pages/Workers Deploy + Secrets | `npm i -g wrangler` |
| Supabase **CLI** | ≥ 1.190 | Migrationen, Functions, Secrets | `npm i -g supabase` |
| Git | beliebig aktuell | Repo / CI-Trigger | git-scm.com |

> **psql** (PostgreSQL-Client) wird nur benötigt, wenn der Seed über `psql` statt über den Supabase-SQL-Editor eingespielt wird.

### 1.2 Accounts & Projekte (🔑 Owner — kosten-/accountrelevant, vorab abstimmen)

1. **Cloudflare-Account** + Domain `lokalebauernconnect.de` als Zone hinzugefügt (Nameserver auf Cloudflare umgestellt → siehe Abschnitt 7).
2. **Supabase-Organisation** + Projekt in **EU-Region** (z. B. `eu-central-1` Frankfurt) — DSGVO-Pflicht, siehe `docs/COMPLIANCE_MODEL.md` und `docs/launch/B_rechtstexte/datenschutz.md`.
3. **Stripe-Account** (+ Connect-Aktivierung für SB-Bezahlung/Erzeuger-Auszahlung, Phase 4 Track A) — erst relevant ab WAVE_09. Bis dahin Platzhalter-frei lassen, nicht „leer deployen".

### 1.3 Repo-Konventionen, die das Deployment voraussetzt

- App baut **ausschließlich** aus `app/`; Build-Output `app/dist/` ist **gitignored** (`app/.gitignore`).
- Secrets/`.env`/`.claude/` gehören **nie** ins Release-Artefakt (siehe Abschnitt 9, Release-Hygiene).
- Frontend kennt nur `VITE_`-Public-Keys. `service_role`, Stripe-Secrets, Turnstile-Secret leben **nur** in Server-Env (Supabase Edge bzw. Cloudflare Worker).

---

## 2. Cloudflare Pages — Frontend-Deployment

Empfohlen: **Git-Integration** (automatischer Build pro Push) für reproduzierbare CI-Builds. Alternativ **Direct Upload** via Wrangler für manuelle/Notfall-Deploys (Abschnitt 2.5).

### 2.1 Projekt A — Marketing-Landing (`web/`)

Die Landing ist statisches HTML (kein Build-Step). Cloudflare liefert `web/` unverändert aus, inklusive `web/_headers`.

**Git-Integration (🔑 Owner — legt öffentliches Projekt an):**

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → Repo wählen.
2. Build-Konfiguration:
   - **Production branch:** `main` (bzw. der Release-Branch).
   - **Framework preset:** *None*.
   - **Build command:** *(leer)* — kein Build.
   - **Build output directory:** `web`
   - **Root directory:** *(leer / Repo-Root)*
3. **Save and Deploy.**
4. Custom Domain zuweisen → Abschnitt 7.

> `web/_headers` wird von Pages automatisch angewandt (Security-Header der Landing). Inhalt siehe Abschnitt 5; vor Go-Live an die kanonische CSP aus `docs/security/SECURITY_OVERVIEW.md` angleichen.

### 2.2 Projekt B — Plattform-App (`app/`)

**Git-Integration (🔑 Owner):**

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → selbes Repo, **zweites** Pages-Projekt.
2. Build-Konfiguration:
   - **Production branch:** `main`
   - **Framework preset:** *Vite*
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Root directory (advanced):** `app`  ← kritisch: Build läuft im `app/`-Verzeichnis
3. **Environment variables (Build & Runtime):** unter *Settings → Environment variables* setzen (siehe Abschnitt 4):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (ab WAVE_06) `VITE_TURNSTILE_SITE_KEY`
   - (ab WAVE_09) `VITE_STRIPE_PUBLISHABLE_KEY`
   - Getrennt für **Production** und **Preview** pflegen.
4. **Save and Deploy** → Cloudflare führt `tsc --noEmit && vite build` aus (via `npm run build`, siehe `app/package.json`).
5. Custom Domain `app.lokalebauernconnect.de` zuweisen → Abschnitt 7.

> **SPA-Routing:** Sobald die App clientseitige Routen nutzt (über die aktuelle Single-Page hinaus), eine `app/public/_redirects` mit `/*  /index.html  200` hinterlegen, damit Deep-Links nicht 404en. Aktuell (FinderPage als Single-Entry) nicht zwingend, aber für „Deep-Links statt Sackgassen" (CLAUDE.md) vorzusehen, sobald Routing eingeführt wird.

### 2.3 Reproduzierbarer Build — lokal verifizieren (decide-and-act, vor jedem Owner-Deploy)

```bash
cd app
npm ci                 # exakte Versionen aus package-lock.json
npm run typecheck      # tsc --noEmit — strict muss grün sein
npm run build          # tsc --noEmit && vite build → dist/
npm run preview        # lokaler Smoke-Test der gebauten App (Port aus vite preview)
```

Erwartung: Typecheck grün, `app/dist/` enthält `index.html` + gehashte Assets, Preview zeigt den Finder ohne Konsolenfehler (keine `TypeError`, keine 401-Schleifen). **Ohne grünen lokalen Build kein Owner-Deploy.**

### 2.4 Pfad-Variante (nur falls Owner *eine* Domain ohne Subdomain wünscht)

Statt zwei Domains: Landing unter `/`, App unter `/app/`.
1. In `app/vite.config.ts` `base: '/app/'` setzen.
2. Beide Outputs in **ein** Pages-Projekt mergen (Build-Skript kopiert `web/*` + `app/dist/*` nach einem gemeinsamen `out/`), oder Cloudflare-Worker-Routing (`/app/*` → App-Assets).
3. `_redirects`: `/app/*  /app/index.html  200`.
> Default bleibt die Subdomain-Variante (sauberere CSP/Cache-Trennung). Diese Variante nur auf ausdrücklichen Owner-Wunsch.

### 2.5 Direct Upload (Notfall/manuell, ohne Git-CI)

```bash
cd app && npm ci && npm run build
wrangler pages deploy dist --project-name=lokalebauernconnect-app --branch=main
# Landing:
wrangler pages deploy web --project-name=lokalebauernconnect-web --branch=main
```
> Direct Upload umgeht die CI-Gates (Abschnitt 8). Nur für Notfall-Rollback/Hotfix nach ausdrücklicher Owner-Freigabe; danach regulären Git-Build nachziehen.

---

## 3. Cloudflare Workers / Edge — wann und wie

**Default: kein eigener Worker.** Pages liefert statische Header (`_headers`) und Redirects (`_redirects`). Ein Worker (bzw. **Pages Functions** im `functions/`-Verzeichnis des App-Projekts) kommt nur dazu, wenn dynamisches Verhalten am Edge nötig ist:

| Bedarf | Lösung | Phase |
|---|---|---|
| Security-Header auf **dynamische** Antworten / feinere Steuerung als `_headers` | Pages Function (`functions/_middleware.ts`) setzt Header zentral | Phase 2 |
| Pfad-/Host-Routing (Pfad-Variante 2.4) | Worker/Pages Function | optional |
| Edge-Rate-Limit jenseits WAF-Rules | Worker + Cloudflare KV/Durable Object | Phase 5 |
| Caching günstiger Lesepfade (Skalierung 10→300) | Worker Cache API / Pages-Cache-Header | Phase 5 |

> **Abgrenzung (nicht verletzen):** Geschäftslogik, Rechteprüfung, Zahlungs-/Webhook-Verarbeitung und alles mit `service_role` gehören in **Supabase Edge Functions** (Deno), **nicht** in Cloudflare Workers (siehe `docs/ARCHITEKTUR.md` §Edge-Regeln). Cloudflare-Edge = Auslieferung, Header, Routing, Rate-Limit. Kein langer Job in einer Edge Function (Timeout-Limits → Workers/Queues).

**Minimal-Pages-Function für zentrale Header** (`app/functions/_middleware.ts`, nur falls `_headers` nicht reicht):

```ts
// Setzt Security-Header zentral auf jede App-Antwort (Ergänzung zu public/_headers).
export const onRequest: PagesFunction = async (context) => {
  const res = await context.next()
  const h = new Headers(res.headers)
  h.set('X-Content-Type-Options', 'nosniff')
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  h.set('X-Frame-Options', 'DENY')
  // CSP/HSTS: kanonisch via public/_headers (Abschnitt 5) — hier nicht duplizieren.
  return new Response(res.body, { status: res.status, headers: h })
}
```

---

## 4. Environment-Variablen & Secrets

**Grundregel (CLAUDE.md / AGENTS.md):** Secrets nie in Code/Log. Frontend kennt **nur** `VITE_`-Public-Werte. Server-Secrets (`service_role`, Stripe-Secret, Turnstile-Secret, Webhook-Secret) leben **ausschließlich** in Supabase-Edge-Env bzw. Cloudflare-Secrets — nie in `VITE_`, nie im Repo.

### 4.1 Matrix — wer kennt was

| Variable | Wert | Ort | `VITE_`? | Rotation |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Projekt-URL (EU) | Cloudflare Pages (App) Build/Runtime | ja (public) | bei Projektwechsel |
| `VITE_SUPABASE_ANON_KEY` | anon/public key | Cloudflare Pages (App) | ja (public, RLS schützt) | bei Kompromittierung |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile Site-Key | Cloudflare Pages (App) | ja (public) | selten |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe pk_live/pk_test | Cloudflare Pages (App) | ja (public) | bei Rotation |
| `SUPABASE_SERVICE_ROLE_KEY` | service role | **Supabase Edge-Env** | **nein** | per `docs/security/SECRET_ROTATION.md` |
| `TURNSTILE_SECRET_KEY` | Turnstile Secret | **Supabase Edge-Env** | **nein** | bei Kompromittierung |
| `STRIPE_SECRET_KEY` | sk_live/sk_test | **Supabase Edge-Env** | **nein** | bei Rotation |
| `STRIPE_WEBHOOK_SECRET` | whsec_… | **Supabase Edge-Env** | **nein** | bei Endpoint-Neuanlage |
| `DATABASE_URL` | Postgres-Conn (Migration/Seed) | **lokal/CI-Secret**, nie Frontend | **nein** | n/a |

> **Warum `anon key` public sein darf:** Er ist durch **RLS deny-by-default** abgesichert (`app/supabase/migrations/0001_core.sql`). Die Sicherheit liegt in der DB, nicht im Verstecken des Keys. Trotzdem: `service_role` niemals in den Client — er umgeht RLS vollständig.

### 4.2 Setzen der Werte

**Cloudflare Pages (App-Projekt) — 🔑 Owner-relevant für Production-Keys:**
- Dashboard → Pages-Projekt → *Settings → Environment variables* → je *Production* und *Preview* setzen. Nach Änderung **Re-Deploy** nötig (Vite bäckt `VITE_`-Werte zur Build-Zeit ein).
- Oder CLI: `wrangler pages secret put VITE_… --project-name=lokalebauernconnect-app` (für sensible) bzw. Variablen im Dashboard.

**Supabase Edge-Secrets (🔑 Owner — Geld/Service-Role):**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=… TURNSTILE_SECRET_KEY=… \
  STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… --project-ref <ref>
supabase secrets list --project-ref <ref>   # Verifikation (zeigt nur Namen)
```

**Lokal:** `app/.env` aus `app/.env.example` füllen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). `.env` ist gitignored. Solange leer, läuft die App auf Seed-Daten (`app/src/lib/seed.ts`) — kein Backend nötig.

---

## 5. Security-Header · CSP · HSTS

**Kanonische Quelle der Header/CSP ist `docs/security/SECURITY_OVERVIEW.md` (§1–3).** Dieses Kapitel ist die deploy-seitige Umsetzung. **Vor Go-Live müssen `web/_headers` und `app/public/_headers` mit der kanonischen CSP übereinstimmen** (aktuell ist `web/_headers` minimal und erlaubt `'unsafe-inline'` für Scripts — das ist für die statische Landing tolerierbar, für die App jedoch zu eng/zu locker; siehe Hinweis unten).

### 5.1 App — `app/public/_headers` (Vite kopiert `public/` nach `dist/`)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(self), microphone=()
  Cross-Origin-Opener-Policy: same-origin
```

> **`script-src 'self'`** (ohne `unsafe-inline`): Vite emittiert externe, gehashte JS-Dateien — Inline-Scripts sind nicht nötig. Das ist die strikte, kategorie-definierende Wahl. **`connect-src`** erlaubt ausschließlich Supabase und Stripe; **`frame-src`** nur Stripe.js und Turnstile (für SB-Bezahlung/Bot-Schutz). **`img-src … https:`** wird mit Einführung der interaktiven Karte (Phase 4 Track B) ggf. auf konkrete Tile-Hosts (OSM) verengt — dann CSP entsprechend pflegen.
>
> **Geolocation:** für „in der Nähe" (Finder) auf `self` gesetzt; falls nicht genutzt, auf `()` reduzieren (Least-Privilege).

### 5.2 Landing — `web/_headers` (bereits vorhanden)

Die Landing rendert kein Stripe/Supabase im DOM; ihre CSP darf enger sein als die der App. Aktueller Stand (`web/_headers`) ist funktional, aber **vor Go-Live angleichen**: `'unsafe-inline'` bei `script-src` entfernen, sobald keine Inline-Scripts in `web/index.html` mehr nötig sind, und `Strict-Transport-Security` um `preload` ergänzen (konsistent zur App). `connect-src 'self' https://*.supabase.co` nur belassen, falls die Landing tatsächlich Supabase anspricht — sonst auf `'self'` reduzieren.

### 5.3 HSTS-Preload & TLS (🔑 Owner)

- HSTS-Header (oben) liefert `preload`; zusätzlich Domain bei **hstspreload.org** einreichen, **erst** wenn HTTPS produktiv stabil ist (Preload ist schwer rückgängig zu machen → Owner-Entscheidung).
- Cloudflare: **SSL/TLS → Full (strict)**, **Always Use HTTPS = on**, **Minimum TLS = 1.2**, **TLS 1.3 = on**, **Automatic HTTPS Rewrites = on**. Universal SSL (Auto-Renewal) — kein manuelles Cert-Handling.

### 5.4 Verifikation (nach Deploy)

```bash
curl -sI https://app.lokalebauernconnect.de | grep -iE 'content-security|strict-transport|x-content-type|x-frame|referrer|permissions-policy'
```
Erwartung: alle Header gesetzt, CSP exakt wie 5.1. Optional: securityheaders.com / Mozilla Observatory (Ziel-Note A+).

---

## 6. Supabase — Migrationen, Seed, Edge Functions, Auth

> Quelle/Detail: `app/supabase/README.md`. Hier der vollständige Deploy-Ablauf.

### 6.1 Projekt verbinden & Schema ausrollen (🔑 Owner — DB-Zustand)

```bash
cd app
supabase login                               # einmalig (Token)
supabase link --project-ref <project-ref>    # EU-Projekt aus Abschnitt 1.2
supabase db push                             # wendet supabase/migrations/ additiv an (0001_core.sql …)
```
Erwartung: `0001_core.sql` legt Tabellen (`orgs, profiles, farms, products, reservations, waitlist, audit_log`), Indizes und **RLS deny-by-default + Policies** an. **Migrationen sind additiv** (CLAUDE.md) — nie destruktiv überschreiben; neuer Stand = neue Datei `app/supabase/migrations/000N_*.sql`.

### 6.2 Seed einspielen (🔑 Owner — Daten)

```bash
# Variante A — psql gegen die Projekt-DB:
psql "$DATABASE_URL" -f supabase/seed.sql
# Variante B — Inhalt von seed.sql im Supabase SQL-Editor ausführen
```
Seed: 9 reale Höfe + 25 Produkte (deckungsgleich mit `app/src/lib/seed.ts`), je Hof eigene `org` (Isolationsbasis). **Demo-/Seed-Daten in Prod kennzeichnen** (WAVE_15) oder vor echtem Launch durch reale Erzeuger-Daten ersetzen — kein Fake-Data in produktiver Käufer-UI (CLAUDE.md-Verbot). Für eine **leere** Produktions-DB Seed weglassen und Höfe über das Erzeuger-Onboarding (`docs/ONBOARDING_SYSTEM.md`) befüllen.

### 6.3 Isolationstest — blockierendes Gate (Pflicht vor Go-Live)

Vor dem Schalten von Live-Daten: Negativtest fahren (CLAUDE.md Pfeiler 1/6, AGENTS.md db-rls-spezialist).
- Anon/fremde Org liest **keine** fremden Reservierungen (fremde Org → 403/leer, nie 200 mit Fremddaten).
- Owner A sieht **keine** Daten von Org B.
- `orgs`/`audit_log` nur via `service_role`.
Testfälle: `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md` bzw. `docs/security/TENANT_ISOLATION_MODEL.md`. **Roter Isolationstest = kein Deploy.**

### 6.4 Edge Functions deployen (ab WAVE_06 Turnstile / WAVE_09 Stripe)

```bash
cd app
supabase functions deploy <name> --project-ref <ref>     # z. B. turnstile-verify, stripe-webhook
supabase functions list --project-ref <ref>
```
Regeln (verbindlich): Zod-Validierung an der Grenze · Rechteprüfung · `service_role` **nur hier** · Audit jeder Mutation · Turnstile-`siteverify` für öffentliche Formulare · **EIN** signaturgeprüfter, **idempotenter** Stripe-Webhook als Wahrheit. Details: `docs/ARCHITEKTUR.md` §Edge / `docs/STRIPE-SETUP.md`.

### 6.5 Auth & Stripe-Webhook konfigurieren (🔑 Owner)

- **Supabase Auth → URL Configuration:** Site-URL = `https://app.lokalebauernconnect.de`; **Redirect URLs** für Prod **und** Preview-Domains der Pages-Builds eintragen (sonst brechen Auth-Redirects in Previews). E-Mail-Templates auf Deutsch/Markenton (`i18n-content-spezialist`).
- **Stripe → Webhooks:** Endpoint = `https://<ref>.supabase.co/functions/v1/stripe-webhook`; `STRIPE_WEBHOOK_SECRET` (whsec_…) in Supabase-Edge-Secrets setzen. Niemals Test- und Live-Webhook-Secret verwechseln.

### 6.6 Storage (falls genutzt, z. B. Hof-/Produktbilder)

Buckets in EU-Region anlegen, **RLS-Policies** je Bucket (Lesen public nur für Katalog-Assets, Schreiben org-gebunden). Public-Bucket-URLs in CSP `img-src` aufnehmen.

---

## 7. Domain, DNS & Custom Domains (🔑 Owner — domain-relevant)

1. **Zone:** `lokalebauernconnect.de` in Cloudflare; Registrar-Nameserver auf die von Cloudflare zugewiesenen NS umstellen (Propagation abwarten).
2. **Custom Domains in Pages zuweisen:**
   - Landing-Pages-Projekt → *Custom domains* → `lokalebauernconnect.de` **und** `www.lokalebauernconnect.de`.
   - App-Pages-Projekt → *Custom domains* → `app.lokalebauernconnect.de`.
   Cloudflare legt die nötigen CNAME/`A`-Records automatisch an (Pages-managed).
3. **Apex vs. www:** Redirect-Regel `www → @` (oder umgekehrt — eine kanonische Variante wählen) via Cloudflare *Redirect Rules*.
4. **TLS:** Universal SSL aktiv (Abschnitt 5.3). Erst nach gültigem Zertifikat HSTS-Preload erwägen.
5. **E-Mail-Sicherheit** (falls Domain auch Mails sendet, z. B. Transaktions-Mails): SPF/DKIM/DMARC setzen — verhindert Spoofing, schützt Marke.

> **Reihenfolge wichtig:** erst DNS/Domain stabil + HTTPS grün, **dann** Auth-Redirect-URLs (6.5) final setzen, **dann** HSTS-Preload (5.3). Falsche Reihenfolge sperrt im Worst Case Nutzer aus.

---

## 8. CI/CD & Phase-2-Gates (A–F)

Cloudflare-Pages-Git-Builds sind die CI. **Kein Production-Deploy ohne grüne Gates** (PHASEN.md Phase 2). Gates als blockierende Schritte (in CI oder als Pre-Deploy-Checkliste):

| Gate | Inhalt | Befehl / Nachweis | Blockierend |
|---|---|---|---|
| **A — Build** | Typecheck + Vite-Build grün | `cd app && npm ci && npm run build` | ja |
| **B — Security** | CSP/HSTS/Header gesetzt; keine Secrets im Artefakt; `service_role` nicht im Client | `curl -sI` (5.4) + Artefakt-Scan (9.1) + `security-auditor` | ja |
| **C — Tenant-Isolation** | RLS-Negativtests grün | 6.3 / `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md` | **ja (hartes Gate)** |
| **D — Legal/DSGVO** | Impressum/Datenschutz/AGB/Lebensmittel-Hinweis live & verlinkt; Vermittler-Disclaimer | `docs/launch/B_rechtstexte/*` + `docs/COMPLIANCE_MODEL.md` | ja |
| **E — Performance** | Kernpfade ohne N+1, akzeptable TTFB/LCP | Lighthouse/Pages-Analytics; `performance-cost-optimizer` | ja |
| **F — Smoke** | Kernflow Finder→Reservierung end-to-end gegen Live-DB; Konsole sauber | manueller/automatisierter Smoke nach Deploy | ja |

**Vorgeschlagener Branch-Flow:** Feature-Branch → PR → Cloudflare **Preview-Deploy** (automatisch, eigene URL) → Gates A–F auf Preview → Merge nach `main` → **Production-Deploy** (automatisch). Production-Merge nur nach Owner-Freigabe (CLAUDE.md: „Fertig erklärt der Owner").

---

## 9. Release-Artefakt-Hygiene

### 9.1 Was niemals deployt/committed wird

- `**/.env`, `**/.env.*` (außer `.env.example`) · `**/.claude/` · `node_modules/` · jegliche Keys/Secrets/Tokens.
- Cloudflare baut nur das jeweilige Output-Verzeichnis (`web/` bzw. `app/dist/`) — `.claude/` und `app/.env` liegen außerhalb von `dist/` und werden nicht mitgepackt. Trotzdem **vor jedem Owner-Deploy verifizieren**:

```bash
# Secret-Leak-Scan im Build-Artefakt (muss leer sein):
grep -rIlE 'service_role|sk_live|sk_test|whsec_|SUPABASE_SERVICE_ROLE|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY' app/dist || echo "OK: keine Secrets im Artefakt"
# Sicherstellen, dass keine .env/.claude im Output liegt:
find app/dist -name '.env*' -o -name '.claude' | grep . && echo "FEHLER: sensible Datei im Artefakt" || echo "OK"
```

### 9.2 Versionierung & Nachvollziehbarkeit

- Jeder Production-Deploy ist an einen **Git-Commit** gebunden (Pages zeigt Commit-SHA pro Deploy) → eindeutige Rückverfolgung für Rollback.
- Relevante Änderung → `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` aktualisieren (CLAUDE.md-Doku-Pflicht).

---

## 10. Rollback

Cloudflare Pages hält **jede** frühere Production-Deployment-Version vor → Rollback ist ein Klick und sekundenschnell. DB-Rollback ist separat und heikler (Daten!).

### 10.1 Frontend-Rollback (schnell, reversibel)

**Dashboard:** Pages-Projekt → *Deployments* → vorherigen grünen Deploy wählen → **„Rollback to this deployment“**.
**CLI (Notfall, Re-Deploy eines bekannten guten Builds):**
```bash
git checkout <letzter-guter-commit>
cd app && npm ci && npm run build
wrangler pages deploy dist --project-name=lokalebauernconnect-app --branch=main
```
Danach Ursache des fehlerhaften Deploys beheben und regulär über Git nachziehen. Smoke (Gate F) nach Rollback erneut fahren.

### 10.2 Edge-Function-Rollback

Vorige Funktionsversion erneut deployen (aus dem entsprechenden Git-Stand):
```bash
git checkout <guter-commit> -- app/supabase/functions/<name>
supabase functions deploy <name> --project-ref <ref>
```

### 10.3 Datenbank-Rollback (🔑 Owner — riskant, nie automatisch)

- **Migrationen sind additiv** → bevorzugter Weg ist eine **neue, kompensierende Migration** (`000N_revert_*.sql`), **nicht** das Zurücksetzen alter Dateien.
- Datenverlust-Szenario: **Point-in-Time-Recovery** (Supabase, EU) → Wiederherstellung auf Zeitpunkt vor dem Vorfall. Vorab Backup-/PITR-Verfügbarkeit im Plan prüfen. Details: `docs/BACKUP_DISASTER_RECOVERY.md`.
- **Jede** DB-Rückrollung: vorab ankündigen, Audit-Eintrag, danach Isolationstest (6.3) erneut grün.
- Kein Migrations-Merge ohne Rollback-Pfad (CLAUDE.md-Verbot).

### 10.4 Rollback-Entscheidungsbaum (Kurz)

| Symptom | Sofortmaßnahme |
|---|---|
| App lädt nicht / weißer Screen / JS-Fehler | Pages-Rollback (10.1) |
| Security-Header/CSP defekt (Konsole blockt Assets) | Pages-Rollback (10.1) + Header korrigieren |
| Auth-Redirect bricht | Auth-URLs (6.5) prüfen; ggf. Pages-Rollback |
| Falsche/kaputte Daten sichtbar | Schreiben stoppen → DB prüfen → PITR/kompensierende Migration (10.3) |
| Webhook doppelt/fehlerhaft verbucht | Idempotenz prüfen; Endpoint pausieren; Audit-Log auswerten |

---

## 11. Owner-Aufgaben — kompakte Checkliste

> Alle Punkte sind account-, kosten-, domain- oder geldrelevant (🔑) und werden **vorab in Klartext angekündigt**, erst nach Freigabe ausgeführt.

**Einmalig (Setup):**
- [ ] 🔑 Cloudflare-Account + Zone `lokalebauernconnect.de` (Nameserver umgestellt).
- [ ] 🔑 Supabase-Projekt **EU-Region** angelegt.
- [ ] 🔑 (ab WAVE_09) Stripe-Account + Connect aktiviert.
- [ ] 🔑 Zwei Cloudflare-Pages-Projekte (Landing `web/`, App `app/`) per Git verbunden.

**Pro Release:**
- [ ] Lokaler Build grün (2.3) + Artefakt-Scan sauber (9.1).
- [ ] 🔑 `VITE_`-Variablen in Pages (Prod+Preview) gesetzt (4.2).
- [ ] 🔑 Supabase: `db push` + (optional) Seed + Isolationstest grün (6.1–6.3).
- [ ] 🔑 Edge-Secrets gesetzt (`service_role`, Turnstile, Stripe) (4.2/6.4).
- [ ] 🔑 Custom Domains zugewiesen, TLS grün, Redirects gesetzt (7).
- [ ] Security-Header/CSP verifiziert (5.4); Gates A–F grün (8).
- [ ] 🔑 Auth-Redirect-URLs + Stripe-Webhook-Endpoint final (6.5).
- [ ] Smoke (Finder→Reservierung) gegen Live-DB ok; Konsole sauber.
- [ ] `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` aktualisiert.

**Erst spät & bewusst:**
- [ ] 🔑 HSTS-Preload einreichen (hstspreload.org) — erst nach stabilem HTTPS (5.3).
- [ ] 🔑 Seed-Daten durch reale Erzeuger-Daten ersetzen/kennzeichnen (6.2).

---

## 12. Schnellreferenz — Befehle

```bash
# --- App lokal bauen & prüfen ---
cd app && npm ci && npm run typecheck && npm run build && npm run preview

# --- Cloudflare (manueller Deploy) ---
wrangler pages deploy app/dist --project-name=lokalebauernconnect-app --branch=main
wrangler pages deploy web      --project-name=lokalebauernconnect-web --branch=main

# --- Supabase (Schema/Seed/Functions) ---
cd app
supabase link --project-ref <ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
supabase functions deploy <name> --project-ref <ref>
supabase secrets set KEY=VALUE --project-ref <ref>

# --- Verifikation ---
curl -sI https://app.lokalebauernconnect.de | grep -iE 'content-security|strict-transport|x-frame|x-content-type'
grep -rIlE 'service_role|sk_live|whsec_' app/dist || echo "OK: keine Secrets"
```

---

> **Disclaimer (Vermittler):** LokaleBauernConnect betreibt Auslieferung und Zahlungsanbindung, ist aber **kein Verkäufer und keine Beratung**. Kaufverträge entstehen zwischen Käufer und Erzeuger. Lebensmittel-Kennzeichnung und Produktverantwortung liegen beim Erzeuger. Siehe `docs/COMPLIANCE_MODEL.md` und `docs/launch/B_rechtstexte/`.
