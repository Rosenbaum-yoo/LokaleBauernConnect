# WAVE_13 — Observability (Sentry · strukturierte Logs · Health-Checks · Alerts)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> **Phase 1, WAVE_13** (`PHASEN.md` → „WAVE_13 Observability: Sentry, strukturierte Logs, Health-Checks"). **Eine Welle pro Session.**
> **Prio:** P1 (Marktstart-stützend) mit **P0-Kern**: ohne Error-Tracking + Health-Check kein verantwortbarer Go-Live (Phase 2 Gate **F — Smoke/Burn-in** baut darauf auf).
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker, kein Prometheus/Grafana-Container** — Telemetrie ist **managed/edge-nativ** (Cloudflare Analytics + Logpush · Supabase Logs/Reports · Sentry EU).
> **Rolle = VERMITTLER** — kein Eigenverkauf, keine Beratung. Observability darf **nie** zur stillen Umgehung von Datenschutz/Vermittler-Disziplin werden: keine personenbezogenen Klartextdaten, keine Zahlungs-PII in Logs/Traces.
> **Voraussetzung:** WAVE_00 (Baseline/Token-Kanon), WAVE_01 (Release-Hygiene/CI + Secret-Grenze), WAVE_02 (Datenmodell + RLS), WAVE_06 (Security: Edge-Guards, `_shared/cors.ts`, Rate-Limit, `audit_log`), WAVE_12 (QA-Tests). WAVE_13 **macht das Fundament beobachtbar**, es ändert keine Geschäftslogik.
> **Ausführungsagenten:** Claude (gesamter Stack) + Subagenten **devops** (Cloudflare Web Analytics/Logpush, Sentry-Projekt, Uptime-Health), **edge-functions-spezialist** (JSON-Logger, Health-Function, Sentry-Deno-Init, `request_id`-Propagierung), **security-auditor** (kein PII-/Secret-Leck in Logs/Traces, read-only), **compliance-officer** (DSGVO/Sub-Auftragsverarbeiter, Aufbewahrung, AVV), **performance-cost-optimizer** (Sampling, Logvolumen, Sentry-Eventbudget).
> **Owner-Freigabe erforderlich für:** Sentry-Projekt/Tarif (Account/Kosten, EU-Residency, AVV mit Sub-Auftragsverarbeiter), Cloudflare-Logpush-Ziel + Aufbewahrungsdauer (Kosten/Vertrag), Uptime-Monitor-Account, Alert-Empfänger/Eskalationskanäle, jeden `git commit`/`push`. Bis dahin ist die Welle **repo-lokal, reversibel** (Logger-Modul, Sentry-Init hinter Flag, Health-Function, SQL-Views, `_headers`-CSP-Erweiterung, Doku) und wird **vorbereitet, nicht live geschaltet**.

---

## 0. Ziel

LokaleBauernConnect wird **lückenlos beobachtbar**: Bei einer fehlgeschlagenen Reservierung, einer hängenden SB-Zahlung oder einer langsamen Karten-Suche ist in **unter zwei Minuten** rekonstruierbar **was**, **wo**, **für wen** (pseudonym), **seit welchem Deploy** und **wie oft** es passiert — ohne neuen Deploy, ohne `console.log("hier")`-Archäologie. Observability operationalisiert das bereits geschriebene Handbuch `docs/OBSERVABILITY.md` (Drei-Säulen-Modell, Korrelations-ID, DSGVO) als **reale, verdrahtete Artefakte** im Repo. Konkret und prüfbar:

1. **Strukturierte Logs (JSON, ein Objekt pro Zeile) überall serverseitig.** Ein zentraler `_shared/logger.ts` ersetzt freitextliche `console.*`-Zeilen in allen Edge Functions (`create-checkout`, `stripe-webhook`, `submit-form`). Jedes Log trägt `request_id`, `org_id` (pseudonym), `severity`, `event`, `duration_ms` — maschinell filterbar über Supabase-Logs-SQL. **Kein PII, kein Secret, keine Zahlungsklartext-Felder** (security-auditor-Gate).
2. **Korrelations-ID (`request_id`) über alle Schichten.** Browser (React) erzeugt `crypto.randomUUID()` → `X-Request-Id`-Header → Cloudflare → Edge Function → Postgres-GUC (`app.request_id`). Existiert der Header eingehend, wird er übernommen (ein End-to-End-Pfad = eine ID), sonst neu erzeugt. Ohne durchgehende Korrelations-ID kein produktionsreifer Pfad.
3. **Error-Tracking mit Sentry (EU-Residency), Browser + Deno.** Frontend-SDK (`@sentry/react`) hinter `VITE_SENTRY_DSN`-Flag (im Seed-/Dev-Modus deaktiviert, kein Crash), Edge-Functions-SDK (`@sentry/deno`) hinter `SENTRY_DSN`-Secret. Releases werden mit `VITE_APP_VERSION`/Git-SHA getaggt, damit „welcher Deploy hat es gebrochen?" beantwortbar ist. **Zero-State ist kein Fehler:** leere Datenmengen erzeugen `info`-Events (`empty_result`), nie Sentry-Errors (Produktionspfeiler 2).
4. **Health-Checks (Liveness + Readiness) als echte Edge Function.** Neue Function `health/index.ts` liefert `{status, version, checks:{db, stripe_config, ...}}` — keine PII, kein Auth nötig, aber **rate-limitiert** und ohne interne Details preiszugeben. Wird vom Uptime-Monitor (Owner-Account) und vom Phase-2-Smoke-Gate gepollt.
5. **Datenbank-Observability (langsame Queries, Zero-State-Signal).** Read-only-Views auf `pg_stat_statements`/Supabase-Reports für die langsamsten Queries; ein `empty_result`-Logpfad, der leere Finder-/Verfügbarkeits-Ergebnisse als Geschäftslogik (`info`), nicht als Fehler markiert.
6. **Alerts signal-, nicht rausch-getrieben.** Definierte Schwellen (Error-Rate, fehlgeschlagene Zahlungen, Health-Ausfall, Webhook-Idempotenz-Anomalie) mit Eskalationskanal (Owner-Freigabe) — dokumentiert in `docs/MONITORING.md` und an `docs/INCIDENT_RUNBOOK.md` angebunden.
7. **Datenschutz in der Telemetrie hart erzwungen.** Pseudonymisierung (IDs/Hashes statt E-Mail/Name/Adresse/IBAN/Stripe-PII), `beforeSend`-Scrubber im Sentry-SDK, Aufbewahrungsfristen dokumentiert (Sub-Auftragsverarbeiter im AVV, `docs/COMPLIANCE_MODEL.md`).

**Nicht-Ziel dieser Welle:** Vollständiges SLO-/Error-Budget-Programm mit On-Call-Rotation (Phase 3 Ops-Gate / Phase 5 Skalierung), verteiltes Tracing über externe Drittsysteme, eigenes Log-Warehouse (managed reicht für 10→300), synthetisches Last-/Chaos-Testing (Phase 2 Gate E Performance). **Audit (`audit_log`) ist nicht Observability** — es bleibt die revisionssichere, unabschaltbare Geschäfts-Mutationsspur (WAVE_06/Compliance); beide teilen nur die `request_id`.

---

## 1. Ist-Zustand (repo-genau geprüft)

| Fakt (real im Repo) | Stand | Konsequenz für WAVE_13 |
|---|---|---|
| `docs/OBSERVABILITY.md` | ✅ vollständiges Handbuch (Drei-Säulen, Korrelations-ID, JSON-Log-Schema, Sentry, Tracing, langsame Queries, Alerts, DSGVO §8, Kosten §9, Dashboards, DoD §11, Anti-Patterns §12) | **Spezifikation dieser Welle.** WAVE_13 setzt sie in reale Artefakte um — keine neue Theorie, sondern Verdrahtung. |
| `docs/MONITORING.md` | ✅ Uptime/SLO-Sicht (geplant→befüllt) | Alert-Schwellen + Eskalation hier verankern; Health-Function-Ergebnis ist die Datenquelle. |
| `docs/INCIDENT_RUNBOOK.md` | ✅ Eskalation/Postmortem | Alert → Incident-Anbindung; `request_id` ist der Brückenschlüssel zwischen Alarm und Untersuchung. |
| `app/supabase/functions/_shared/` | `cors.ts`, `stripe.ts`, `supabaseAdmin.ts` (`admin()`), `email.ts` | **Neu:** `logger.ts` (JSON-Logger + `request_id`), `sentry.ts` (Deno-Init + `beforeSend`-Scrubber). Bestehende Helfer bleiben. |
| `create-checkout/index.ts`, `stripe-webhook/index.ts` | freitextnahe `console.*`-Diagnostik, Signatur/Idempotenz vorbildlich (WAVE_06) | `console.*` → `logger.*` (JSON) ersetzen; `request_id` aus Header übernehmen; Sentry-Capture nur für echte Fehler, **nie** für Zero-State/erwartete 4xx. Logik unverändert. |
| `submit-form/index.ts` (WAVE_06) | Turnstile + Rate-Limit + Zod + service_role-Insert | Logging + `request_id` + Sentry-Init ergänzen; `rate_limited`/`turnstile_failed`/`validation` sind **erwartete** Ausgänge → `info`/`warn`, kein Sentry-Error. |
| `app/supabase/functions/.env.example` | Stripe/Mail/CORS dokumentiert | **Ergänzen:** `SENTRY_DSN=`, `SENTRY_ENVIRONMENT=`, `SENTRY_TRACES_SAMPLE_RATE=`, `LOG_LEVEL=info`. |
| `app/.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | **Ergänzen:** `VITE_SENTRY_DSN=` (public DSN, im Bundle ok), `VITE_APP_VERSION=`, `VITE_SENTRY_TRACES_SAMPLE_RATE=`. |
| `app/src/vite-env.d.ts` | typisiert `VITE_SUPABASE_*` (+ ggf. `VITE_TURNSTILE_SITE_KEY` WAVE_06) | **Ergänzen:** `VITE_SENTRY_DSN?`, `VITE_APP_VERSION?`, `VITE_SENTRY_TRACES_SAMPLE_RATE?`. |
| `app/src/main.tsx`, `App.tsx` | React-Bootstrap ohne Telemetrie | **Neu:** `lib/observability.ts` (Sentry-Init hinter Flag + ErrorBoundary), `lib/requestId.ts` (UUID + Fetch-Wrapper, der `X-Request-Id` setzt). |
| `app/src/lib/supabase.ts` | Client nur bei gesetzten `VITE_`-Keys, sonst `null` (Seed-Modus) | Telemetrie **Seed-Modus-sicher**: ohne DSN keine Initialisierung, kein toter Pfad, keine Konsolen-Spam. |
| `app/public/_headers` | CSP `connect-src 'self' https://*.supabase.co` (+ ggf. Stripe/Turnstile WAVE_06) | **Härten:** `connect-src` um Sentry-Ingest (`https://*.ingest.de.sentry.io`) + Cloudflare-Analytics-Beacon erweitern — **nur bei aktivem Pfad**, kein toter CSP-Eintrag. |
| Health-Check | **existiert nicht** | **Neu:** `health/index.ts` (Liveness/Readiness, rate-limitiert, PII-frei). |
| Rate-Limiter `_shared/rateLimit.ts` (WAVE_06) | DB-gestützt (`rl_hit`) | Wiederverwenden für Health-Endpoint-Drosselung; **nicht** duplizieren. |
| `audit_log` (WAVE_06, service_role-only, force RLS) | ✅ revisionssicher | Observability bleibt **getrennter** Speicher; nur `request_id`-Verknüpfung, keine Vermischung. |

> **Abweichung zum TempConnect-Blueprint dokumentiert (Stop-Regel):** Der Referenz-Blueprint kennt Self-Host-Telemetrie (Prometheus/Grafana/Loki auf Hetzner, Node-Exporter, VMS-Begriffe). Hier konsequent auf **managed/edge-nativ** adaptiert: Cloudflare Web Analytics + Logpush · Supabase Logs/Reports · Sentry EU. „Job-/Einsatz-Metriken" → **Reservierungs-/Verfügbarkeits-/SB-Zahlungs-Signale** der Hof-Domäne. Keine VMS-/Hetzner-/Container-Begriffe übernommen.

---

## 2. Aufgaben

> Reihenfolge = Abhängigkeit: erst Korrelations-ID + JSON-Logger (Fundament), dann Sentry (Browser+Deno), dann Health-Function, dann DB-Observability/Zero-State, dann Alerts/Dashboards, zuletzt CSP/Env-Hygiene + Tests + Doku-Anbindung.

### 2.1 Korrelations-ID (`request_id`) end-to-end

- **`app/src/lib/requestId.ts` (neu):** erzeugt `crypto.randomUUID()` pro Top-Level-Aktion (Reservierung, Checkout, Form-Submit) und liefert einen **Fetch-Wrapper** `apiFetch(url, init)`, der `X-Request-Id` setzt (vorhandenen Wert wiederverwendet, sonst neu) und ihn für Sentry-Tagging zurückgibt. Alle App-Aufrufe an Edge Functions laufen über diesen Wrapper — **keine nackten `fetch`-Calls mehr** auf den mutierenden Pfaden.
- **`_shared/logger.ts` (neu):** liest `X-Request-Id` aus dem Request (sonst generiert) und stellt `getRequestId(req)` + den Logger bereit. Edge Functions setzen den Wert zusätzlich als Postgres-GUC für DB-Logkorrelation:
  ```sql
  select set_config('app.request_id', $1, true);  -- pro Transaktion, erscheint in Query-Logs
  ```
- **Regel (verbindlich, aus `docs/OBSERVABILITY.md` §1):** Eingehender Header → übernehmen; sonst neu. Eine ID über Browser → Cloudflare → Edge → DB.

### 2.2 Strukturierter JSON-Logger (`_shared/logger.ts`)

Zentraler Logger, ein JSON-Objekt pro Zeile, severity-geschwellt über `LOG_LEVEL` (`debug|info|warn|error`):

```ts
// _shared/logger.ts — strukturierte JSON-Logs für Edge Functions.
// Regel: niemals PII/Secrets/Zahlungsklartext; immer request_id + org_id (pseudonym).
type Severity = 'debug' | 'info' | 'warn' | 'error'
const ORDER: Record<Severity, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN = ORDER[(Deno.env.get('LOG_LEVEL') as Severity) ?? 'info'] ?? 20

export function getRequestId(req: Request): string {
  const incoming = req.headers.get('x-request-id')
  return incoming && /^[0-9a-f-]{8,64}$/i.test(incoming) ? incoming : crypto.randomUUID()
}

export function makeLogger(ctx: { requestId: string; fn: string; orgId?: string }) {
  const base = { request_id: ctx.requestId, fn: ctx.fn, ...(ctx.orgId ? { org_id: ctx.orgId } : {}) }
  const emit = (severity: Severity, event: string, fields?: Record<string, unknown>) => {
    if (ORDER[severity] < MIN) return
    // Defense-in-Depth: bekannte sensible Schlüssel hart entfernen (Scrubber-Allowlist in §2.7).
    const line = JSON.stringify({ ts: new Date().toISOString(), severity, event, ...base, ...scrub(fields) })
    severity === 'error' ? console.error(line) : console.log(line)
  }
  return {
    debug: (e: string, f?: Record<string, unknown>) => emit('debug', e, f),
    info:  (e: string, f?: Record<string, unknown>) => emit('info', e, f),
    warn:  (e: string, f?: Record<string, unknown>) => emit('warn', e, f),
    error: (e: string, f?: Record<string, unknown>) => emit('error', e, f),
  }
}
```

- **Migration der Funktionen:** in `create-checkout`, `stripe-webhook`, `submit-form` und `health` alle freitextlichen `console.*` durch `logger.*` ersetzen. Jeder Eintritt loggt `event:'request'` mit `duration_ms` am Ende; erwartete 4xx (`rate_limited`, `turnstile_failed`, `validation`, `not_found`) → `warn`; nur unerwartete 5xx/Exceptions → `error` + Sentry-Capture.
- **`scrub()`** entfernt verbotene Felder (E-Mail, `name`, `contact`, `email`, `iban`, `card*`, `secret`, `token`, `authorization`) und kürzt Freitext — siehe §2.7. **Kein Wert wird ungeprüft geloggt.**

### 2.3 Sentry — Browser (React) + Edge (Deno)

**2.3a `app/src/lib/observability.ts` (neu) — Browser-Init hinter Flag.**
```ts
// observability.ts — Sentry nur initialisieren, wenn DSN gesetzt (Seed/Dev: kein-op).
import * as Sentry from '@sentry/react'
export function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return // Seed-/Dev-Modus: keine Telemetrie, kein toter Pfad
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'dev',
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,            // DSGVO: niemals automatische PII
    beforeSend: scrubEvent,           // E-Mail/Name/Contact/Query-Param raus (§2.7)
    beforeBreadcrumb: dropNoisyCrumbs,
  })
}
```
- In `main.tsx` **vor** dem Render aufrufen; `App` in `Sentry.ErrorBoundary` mit Editorial-Fallback („Etwas ist schiefgelaufen — bitte erneut versuchen", Disclaimer-Zeile sichtbar) hüllen. **Keine Deko-Emojis.**
- `apiFetch` (§2.1) hängt `request_id` als Sentry-Tag, damit Frontend-Error und Server-Log dieselbe ID teilen.

**2.3b `_shared/sentry.ts` (neu) — Deno-Init für Edge Functions.**
```ts
// sentry.ts — Sentry für Edge Functions; ohne SENTRY_DSN = kein-op (lokal/Seed).
import * as Sentry from 'npm:@sentry/deno'
let ready = false
export function initSentry(fn: string) {
  const dsn = Deno.env.get('SENTRY_DSN')
  if (!dsn || ready) return
  Sentry.init({
    dsn, environment: Deno.env.get('SENTRY_ENVIRONMENT') ?? 'production',
    tracesSampleRate: Number(Deno.env.get('SENTRY_TRACES_SAMPLE_RATE') ?? 0.1),
    sendDefaultPii: false, beforeSend: scrubServerEvent,
  })
  ready = true
}
export function captureUnexpected(err: unknown, requestId: string, fn: string) {
  if (!Deno.env.get('SENTRY_DSN')) return
  Sentry.withScope((s) => { s.setTag('request_id', requestId); s.setTag('fn', fn); Sentry.captureException(err) })
}
```
- **Regel:** Sentry-Capture **nur** für unerwartete Exceptions/5xx. Erwartete Ausgänge (Zero-State, Rate-Limit, Turnstile, Validierung, 404) werden **nie** als Error gemeldet (Produktionspfeiler 2, `docs/OBSERVABILITY.md` §3 + Anti-Patterns §12).

### 2.4 Health-Check Edge Function (`health/index.ts`, neu)

PII-frei, rate-limitiert (wiederverwendet `_shared/rateLimit.ts`), keine internen Details/Stacktraces nach außen:
```ts
// health/index.ts — Liveness + Readiness. Keine PII, keine internen Details, rate-limitiert.
import { corsFor } from '../_shared/cors.ts'
import { allow } from '../_shared/rateLimit.ts'
import { admin } from '../_shared/supabaseAdmin.ts'
import { getRequestId, makeLogger } from '../_shared/logger.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsFor(req) })
  const requestId = getRequestId(req)
  const log = makeLogger({ requestId, fn: 'health' })
  if (!(await allow('health', req, 60, 60))) return Response.json({ status: 'rate_limited' }, { status: 429 })
  const t0 = performance.now()
  const checks: Record<string, 'ok' | 'fail' | 'skip'> = {}
  try { const { error } = await admin().from('orgs').select('id', { head: true, count: 'exact' }).limit(1); checks.db = error ? 'fail' : 'ok' }
  catch { checks.db = 'fail' }
  checks.stripe_config = Deno.env.get('STRIPE_SECRET_KEY') ? 'ok' : 'skip'
  const ok = !Object.values(checks).includes('fail')
  log.info('health', { ok, checks, duration_ms: Math.round(performance.now() - t0) })
  return Response.json(
    { status: ok ? 'ok' : 'degraded', version: Deno.env.get('APP_VERSION') ?? 'dev', checks },
    { status: ok ? 200 : 503, headers: { ...corsFor(req), 'cache-control': 'no-store' } },
  )
})
```
- **Liveness** = Function antwortet überhaupt (200). **Readiness** = `db:ok` (DB erreichbar). Bei `db:fail` → `503 degraded` (Uptime-Monitor + Smoke-Gate erkennen es). **Kein** Abfluss von Verbindungsstrings/Versions-Internas/Stacktraces.

### 2.5 Datenbank-Observability & Zero-State-Signal (Migration `0007_observability.sql`, additiv)

Additive, **read-only-orientierte** Migration `app/supabase/migrations/0007_observability.sql` (Rollback als Kommentar; ergänzt `setup_all.sql`):
- **Langsame Queries:** Sicht auf `pg_stat_statements` (sofern Extension verfügbar — Supabase aktiviert sie projektseitig), gekapselt als `security definer`-View für Staff/Owner, `search_path` gepinnt, **nur lesbar für service_role/Staff** (keine anon/auth-Policy). Fällt die Extension aus, dokumentiert die Migration den Supabase-Reports-Pfad als Alternative (kein toter View).
- **Zero-State als Geschäftslogik:** der Finder-/Verfügbarkeitspfad loggt leere Ergebnisse als `logger.info('empty_result', { scope, count: 0 })` — **kein** Fehler, **kein** Sentry-Event (deckt Produktionspfeiler 2). Spiegelt das `available:false`/leere-Arrays-Muster der API.
- **Telemetrie ≠ Audit:** keine Vermischung mit `audit_log`; einzig die `request_id` verknüpft beide Speicher.

### 2.6 Alerts & Dashboards (signal-getrieben, dokumentiert)

Im Repo verbindlich dokumentiert (Aktivierung mit Owner-Freigabe), Schwellen nach `docs/OBSERVABILITY.md` §6 + `docs/MONITORING.md`:

| Signal | Schwelle (Default) | Quelle | Reaktion |
|---|---|---|---|
| **Health degraded** | `health` ≠ 200 für ≥ 2 aufeinanderfolgende Polls (1 min) | Uptime-Monitor → `/functions/v1/health` | Alert → `docs/INCIDENT_RUNBOOK.md` |
| **Server-Error-Rate** | > 1 % der Requests `severity:error` über 5 min | Sentry (Issue-Alert) | Alert + Release-Korrelation |
| **Fehlgeschlagene SB-Zahlung** | > 3 in 10 min | Sentry-Tag `event:payment_failed` / Logpush | Alert (P1, geldflussnah) |
| **Webhook-Idempotenz-Anomalie** | wiederholte `payment_events`-PK-Konflikte als Error statt 200 | Edge-Log | Untersuchung (Signaturproblem?) |
| **Frontend-Crash-Welle** | neuer Issue mit > 10 Nutzern in 15 min | Sentry-React | Alert + sofortiges Release-Rollback prüfen |
| **Karten-/Finder-Latenz** | p95 > 1,5 s über 10 min | Cloudflare Web Analytics / Sentry-Perf | Performance-Untersuchung (WAVE_11) |

- **Dashboards (was-wo, `docs/OBSERVABILITY.md` §10):** Sentry (Errors/Releases/Perf) · Cloudflare Web Analytics (RUM/Latenz) · Supabase Reports (DB/API) · Uptime-Monitor (Verfügbarkeit). **Release-Korrelation** via `release`-Tag = Git-SHA — „welcher Deploy hat es gebrochen?" ist eine Filterung, keine Detektivarbeit.

### 2.7 PII-Scrubber, CSP, Env- & Hygiene-Erweiterung

- **Scrubber (Frontend `scrubEvent`/`dropNoisyCrumbs`, Server `scrubServerEvent`/`scrub`):** entfernt/maskiert E-Mail, Name, `contact`, Adresse, `plz`, `iban`, `card*`, Stripe-PII, Auth-Header, Query-Strings mit Token; behält IDs/Hashes/`org_id`. **Allowlist-Prinzip**: nur explizit erlaubte Felder passieren — Defense-in-Depth zusätzlich zur Disziplin im Code.
- **`app/public/_headers` CSP:** `connect-src` um `https://*.ingest.de.sentry.io` (EU-Ingest) + Cloudflare-Analytics-Beacon erweitern — **nur weil der Pfad jetzt aktiv ist**; im Seed-/Dev-Build ohne DSN bleibt der Eintrag konsistent dokumentiert, aber funktional ungenutzt (kein toter Pfad ohne Begründung). Kein `unsafe-eval`.
- **`app/supabase/functions/.env.example`** ergänzen (secret-frei): `SENTRY_DSN=`, `SENTRY_ENVIRONMENT=production`, `SENTRY_TRACES_SAMPLE_RATE=0.1`, `LOG_LEVEL=info`, `APP_VERSION=`.
- **`app/.env.example`** ergänzen: `VITE_SENTRY_DSN=` (public DSN), `VITE_APP_VERSION=`, `VITE_SENTRY_TRACES_SAMPLE_RATE=0.1`.
- **`app/src/vite-env.d.ts`** um `VITE_SENTRY_DSN?`, `VITE_APP_VERSION?`, `VITE_SENTRY_TRACES_SAMPLE_RATE?` erweitern (public, im Bundle erlaubt).
- **WAVE_01-Hygiene-Gate** (`scripts/release-hygiene-check.sh`) um Observability-Assertions erweitern: kein `VITE_SENTRY_*SECRET*` (DSN ist public, aber **Auth-Token nie** `VITE_`-präfixt); Grep-Assertion „keine nackte `console.log("…")`-Freitextzeile in `supabase/functions/**`" (nur `logger.*` erlaubt); Grep-Assertion „kein `email`/`contact`/`iban` als direktes Log-Feld".
- **Doku-Anbindung:** `docs/OBSERVABILITY.md` §11 DoD abhaken, `docs/MONITORING.md` (Alert-Schwellen + Eskalation), `docs/INCIDENT_RUNBOOK.md` (`request_id` als Untersuchungsschlüssel) querverlinken; `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` (Abschnitt 5: `MONITORING.md`/`OBSERVABILITY.md` → ✅ verdrahtet) aktualisieren.

---

## 3. Konkrete Befehle (Reihenfolge · Working-Dir `app/`, Windows-PowerShell-tauglich)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Frontend-Sentry-SDK installieren (Browser/React)
npm install @sentry/react
npm ci                       # reproduzierbar; lockfile-konsistent (WAVE_01)

# 2) Typen/Lint/Build grün (Observability-Wiring darf nichts brechen)
npm run typecheck            # strict — neue lib/observability.ts, lib/requestId.ts typsicher
npm run lint                 # ESLint flat config (WAVE_01): keine nackten console.log auf Server-Pfaden
npm run build                # tsc --noEmit && vite build -> dist/ (mit erweiterter _headers-CSP)

# 3) Edge Functions (Deno) prüfen — inkl. neuer health + _shared/logger/sentry
cd supabase/functions
deno lint
deno check health/index.ts create-checkout/index.ts stripe-webhook/index.ts submit-form/index.ts \
            _shared/logger.ts _shared/sentry.ts
cd ../..

# 4) Migration lokal anwenden (lokaler Supabase-Stack; NICHT gegen Prod ohne Owner-Freigabe)
supabase start                              # lokaler Stack (Docker NUR lokal für CLI; kein Self-Host-Deploy)
supabase db reset                           # wendet migrations/0001..0007 + seed an (frisches Schema)
#  alternativ rein additiv gegen laufende lokale DB:
#  supabase migration up

# 5) Health-Function lokal smoke-testen (Liveness/Readiness, JSON, kein PII)
supabase functions serve health --env-file supabase/functions/.env
curl -s http://localhost:54321/functions/v1/health | python -m json.tool
#  erwartet: {"status":"ok","version":"dev","checks":{"db":"ok","stripe_config":"skip"}}  (HTTP 200)
#  DB künstlich abklemmen -> erwartet {"status":"degraded",...}  (HTTP 503)

# 6) Health-Rate-Limit-Smoke (61. Request in 60s -> 429)
for i in $(seq 1 61); do \
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:54321/functions/v1/health; \
done   # erwartet: letzte Zeile 429

# 7) Strukturierte Logs prüfen (JSON, request_id, kein PII)
curl -s -X POST http://localhost:54321/functions/v1/submit-form \
  -H 'content-type: application/json' -H 'x-request-id: test-trace-0001' \
  -d '{"kind":"reservation","farmId":"hof-sonnenwiese","productId":"p1","quantity":2,"pickupWindow":"Sa 9-12","name":"Test","contact":"test@example.de"}'
#  In der `supabase functions serve`-Konsole MUSS eine JSON-Zeile mit "request_id":"test-trace-0001"
#  erscheinen, OHNE "name"/"contact"/"email" im Klartext. (Scrubber-Beleg)

# 8) Sentry-Init Seed-Sicherheit prüfen (ohne DSN darf nichts crashen / nichts senden)
#  -> dev ohne VITE_SENTRY_DSN starten, Konsole sauber, keine Sentry-Requests im Network-Tab:
npm run dev                  # erwartet: keine TypeError, kein Sentry-Call ohne DSN

# 9) Hygiene-Gate (WAVE_01) erneut — jetzt mit Observability-Assertions
bash scripts/release-hygiene-check.sh       # erwartet: HYGIENE-GATE: PASS
#  (kein VITE_*SECRET*; keine nackte console.log("…") in functions/**; kein email/contact/iban als Log-Feld)

# 10) Gezielte Tests auf geänderten Pfaden (WAVE_12-Suite)
npm run test -- observability requestId health    # logger/requestId/health-Tests grün

# 11) Secrets server-seitig setzen — NUR mit Owner-Freigabe (Platzhalter, nie echte Werte ins Repo/Log)
# supabase secrets set SENTRY_DSN=<https://...ingest.de.sentry.io/...> SENTRY_ENVIRONMENT=production \
#   SENTRY_TRACES_SAMPLE_RATE=0.1 LOG_LEVEL=info APP_VERSION=$(git rev-parse --short HEAD)
# supabase secrets list                     # zeigt nur Namen, keine Werte

# 12) Deploy der Functions/Migration + Sentry-/Logpush-Aktivierung — NUR mit Owner-Freigabe (Account/Kosten)
# supabase db push
# supabase functions deploy health submit-form create-checkout stripe-webhook
# (Cloudflare: Web Analytics aktivieren, Logpush-Ziel + Aufbewahrung setzen, Uptime-Monitor auf /functions/v1/health)
```

> **Stop-Regel:** `supabase db push` / `functions deploy` / Setzen produktiver Secrets / Sentry-Projekt + Tarif / Cloudflare-Logpush-Ziel + Aufbewahrung / Uptime-Monitor-Account / Alert-Empfänger → **anhalten, Owner-Freigabe** (Account-/Kosten-/AVV-relevant). Lokal (`supabase start`, `db reset`, `functions serve`, `npm run dev/build/test`) ist kostenlos und reversibel.

---

## 4. Acceptance (Akzeptanzkriterien — alle müssen grün sein)

**Korrelation & strukturierte Logs**
1. Jede Edge Function (`health`, `submit-form`, `create-checkout`, `stripe-webhook`) loggt **ausschließlich JSON** (ein Objekt/Zeile) mit `ts`, `severity`, `event`, `request_id`, `fn` (+ `org_id` wo vorhanden, + `duration_ms`). **Keine** freitextliche `console.log("…")`-Zeile mehr.
2. Eingehender `X-Request-Id`-Header wird übernommen; sonst neu generiert. `apiFetch` (Frontend) setzt ihn auf allen mutierenden Aufrufen — eine ID über Browser → Edge → DB-GUC.
3. **Kein PII/Secret im Log:** `name`/`contact`/`email`/`plz`/`iban`/`card*`/Auth-Header/Stripe-Secret erscheinen nie im Klartext (Scrubber-Beleg via §3 Schritt 7).

**Sentry (Error-Tracking)**
4. Browser-SDK initialisiert **nur** bei gesetztem `VITE_SENTRY_DSN`; im Seed-/Dev-Modus deaktiviert — **kein Crash, kein Netz-Call, keine Konsolen-Spam** (§3 Schritt 8).
5. Edge-SDK initialisiert nur bei `SENTRY_DSN`; Capture **nur** für unerwartete Exceptions/5xx. **Zero-State, Rate-Limit, Turnstile-Fail, Validierungsfehler, 404 lösen nie einen Sentry-Error aus.**
6. Errors tragen `release` (Git-SHA/`VITE_APP_VERSION`) + `request_id`-Tag → Release-Korrelation + Frontend↔Server-Verknüpfung funktioniert.
7. `beforeSend`-Scrubber entfernt PII aus Sentry-Events (Browser + Server); `sendDefaultPii:false` gesetzt.

**Health-Checks**
8. `GET /functions/v1/health` liefert `{status, version, checks}` als JSON; `200` wenn `db:ok`, `503 degraded` bei `db:fail`. **Keine PII, keine internen Details/Stacktraces, `cache-control: no-store`.**
9. Health ist rate-limitiert (`> 60/min/IP → 429`) und nutzt den bestehenden `_shared/rateLimit.ts` (kein dupliziertes Limiter-Konstrukt).

**DB-Observability & Zero-State**
10. `0007_observability.sql` läuft additiv sauber (`supabase db reset` grün); Rollback-Pfad dokumentiert; langsame-Queries-Sicht ist **nur** für service_role/Staff lesbar (keine anon/auth-Policy), `search_path` gepinnt.
11. Leere Finder-/Verfügbarkeitsergebnisse erzeugen `info`-Log `empty_result` — **nie** einen Fehler oder Sentry-Event (Produktionspfeiler 2).

**Alerts & Dashboards (dokumentiert)**
12. Alert-Schwellen (Health degraded, Error-Rate, fehlgeschlagene Zahlung, Webhook-Anomalie, Crash-Welle, Latenz) sind in `docs/MONITORING.md` verankert und an `docs/INCIDENT_RUNBOOK.md` (`request_id` als Schlüssel) angebunden.
13. Dashboard-Zuordnung (Sentry/Cloudflare/Supabase/Uptime) dokumentiert; Release-Tag = Git-SHA.

**CSP, Env, Hygiene, Build**
14. `app/public/_headers` `connect-src` deckt Sentry-EU-Ingest + Cloudflare-Beacon — **nur** mit aktivem Pfad; kein `unsafe-eval`.
15. `.env.example` (App + Functions) + `vite-env.d.ts` vollständig & secret-frei; **DSN ist public**, aber kein Auth-Token `VITE_`-präfixt. Hygiene-Gate prüft das + „keine nackte `console.log`" + „kein PII-Log-Feld".
16. `npm run typecheck && npm run lint && npm run build` grün; `deno check` für alle Functions grün; `docs/OBSERVABILITY.md` §11 DoD abgehakt; `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` auf WAVE_13-Stand.

---

## 5. Gate (blockierend)

> **WAVE_13-Observability-Gate** muss grün sein, bevor WAVE_14 (Legal/DSGVO) abgeschlossen und insbesondere der reale Go-Live (Phase 2 Gate **F — Smoke/Burn-in** ≥ 7 Tage) freigegeben wird — Burn-in ist ohne Health-Check + Error-Tracking nicht verantwortbar.

```
GATE WAVE_13:
  ✅ Strukturierte JSON-Logs    (ein Objekt/Zeile, request_id+severity+event; keine Freitext-console.log)
  ✅ Korrelations-ID end-to-end (X-Request-Id Browser -> Edge -> DB-GUC; apiFetch setzt sie)
  ✅ PII-Grenze im Log/Trace    (kein name/contact/email/iban/Secret; Scrubber Browser+Server)
  ✅ Sentry Seed-sicher          (ohne DSN kein-op; Capture nur unerwartete 5xx; Zero-State != Error)
  ✅ Release-Korrelation         (release=Git-SHA + request_id-Tag)
  ✅ Health-Check                (200 ok / 503 degraded, PII-frei, rate-limitiert, no-store)
  ✅ DB-Observability additiv    (0007 grün, slow-query-View nur Staff/service_role, search_path gepinnt)
  ✅ Alerts/Dashboards           (Schwellen in MONITORING.md, an INCIDENT_RUNBOOK.md angebunden)
  ✅ CSP/Hygiene/Build grün      (connect-src Sentry-EU; Hygiene-Gate PASS; typecheck+lint+build+deno check)
```

**Blockierend (kein Merge / kein Deploy ohne):** PII-Grenze im Log/Trace, Sentry-Seed-Sicherheit (kein-op ohne DSN), Health-Check liefert korrektes 200/503.
**Stop-Regeln dieser Welle:**
- `supabase db push` / `functions deploy` / produktive Secrets / Sentry-Projekt+Tarif / Cloudflare-Logpush+Aufbewahrung / Uptime-Monitor / Alert-Empfänger → **STOP**, Owner-Freigabe (Account/Kosten/AVV).
- PII/Secret in Log oder Sentry-Event entdeckt → **STOP**: Scrubber/Code korrigieren, nie die Assertion abschwächen (CLAUDE.md §0.9 Test-Integrität).
- Zero-State (leere Daten) erzeugt einen Error/Sentry-Event → **STOP**: Geschäftslogik vs. Fehler trennen, `info empty_result` herstellen (Produktionspfeiler 2).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 6. Abschlussbericht (Vorlage — nach Ausführung füllen, Format gem. `finalization/99_GOLIVE_GATE.md` Teil 3)

```text
## Abschlussbericht — WAVE_13 Observability

### 1. Geprüfte Repo-Bereiche
- Dateien:        app/supabase/functions/_shared/{logger,sentry}.ts · app/supabase/functions/health/index.ts
                  · create-checkout/stripe-webhook/submit-form (console.* -> logger.*)
                  · app/src/lib/{observability,requestId}.ts · app/src/main.tsx (Init+ErrorBoundary)
                  · app/src/vite-env.d.ts · app/public/_headers (CSP connect-src Sentry-EU)
                  · app/.env.example · app/supabase/functions/.env.example · scripts/release-hygiene-check.sh
                  · app/supabase/migrations/0007_observability.sql
- Routen/Seiten:  Finder/Verfügbarkeit (empty_result-Signal) · Reservierung/Checkout/Form (request_id)
- Edge Functions: health (neu) · submit-form/create-checkout/stripe-webhook (JSON-Log + Sentry-Init)
- Tabellen/Views: slow-query-View (Staff/service_role) ; keine Vermischung mit audit_log
- Tests:          logger/requestId/health-Tests · Scrubber-Beleg · Health 200/503/429 · Seed-Sicherheit

### 2. Getroffene Produktentscheidungen
- Managed/edge-nativ statt Self-Host-Telemetrie (Cloudflare/Supabase/Sentry EU). (Begründung/Risiko)
- Sentry-Capture nur für unerwartete 5xx; Zero-State/4xx = info/warn. (Begründung/Risiko)
- request_id als einziger Brückenschlüssel Observability<->Audit (getrennte Speicher). (Begründung/Risiko)

### 3. Umgesetzte Änderungen
- Code:      JSON-Logger, request_id-Wrapper, Sentry Browser+Deno hinter Flag, ErrorBoundary, Scrubber
- DB/Migration: 0007_observability.sql (slow-query-View, search_path gepinnt, kein anon/auth)
- Health:    health/index.ts (Liveness/Readiness, rate-limitiert, PII-frei)
- Doku:      docs/OBSERVABILITY.md (§11 DoD), docs/MONITORING.md (Alerts), docs/INCIDENT_RUNBOOK.md (request_id)
- Tests:     logger/requestId/health + Scrubber-/Seed-Sicherheits-Checks

### 4. Aktualisierte Dokumente
- docs/OBSERVABILITY.md, docs/MONITORING.md, docs/INCIDENT_RUNBOOK.md,
  docs/releases/PHASE_STATUS.md (WAVE_13), MASTER_INDEX.md (Abschnitt 5: MONITORING/OBSERVABILITY ✅)

### 5. Tests und Checks
- Befehl: deno check · npm run build · npm run test · curl health (200/503/429) · curl submit-form (Scrubber)
- Ergebnis:           <…>
- Offene Fehler:      <…>
- Manuelle Prüfschritte (mit Owner + Datum): Sentry-Projekt EU + AVV · Cloudflare Logpush/Aufbewahrung · Uptime-Monitor · Alert-Empfänger

### 6. P0/P1-Status
- Gelöst:             JSON-Logs, request_id, Sentry (seed-sicher), Health-Check, PII-Scrubber, Zero-State-Signal
- Offen:              Live-Aktivierung (Owner-Freigabe: Sentry-Tarif, Logpush, Uptime, Alerts, Deploy)
- Bewusst verschoben: SLO/Error-Budget + On-Call (Phase 3/5), synthetisches Last-/Chaos-Testing (Phase 2 Gate E)

### 7. Risiken vor Pilot / Enterprise
- (Konkret, mit Schweregrad + Mitigation — z. B. Sentry-Eventbudget bei Crash-Welle: mittel, Mitigation = Sampling + Issue-Rate-Limit §9.)

### 8. Welle-übergreifende Erkenntnisse
- Wiederverwendbares Imperium-Muster: request_id-Fetch-Wrapper + JSON-Logger + Sentry-Flag-Init + PII-Scrubber
  + Health-Function -> .claude/memory/patterns/ (Owner fragen) — direkt in 20 weiteren Plattformen nutzbar.

### 9. Nächster sinnvoller Slice
- WAVE_14 (Legal/DSGVO: Impressum/Datenschutz/AGB/AVV-TOMs) — Sub-Auftragsverarbeiter (Sentry/Cloudflare) aus dieser Welle fließen in den AVV.
```

---

## 7. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler — bes. 2 Zero-State, 1/3 Tenant/Scope, 5 Audit; §0.9 Test-Integrität; Verbote: kein stiller Fehler, kein Secret im Log), `AGENTS.md` (service_role nur Edge, deutsche Kommentare, keine Deko-Emojis), `PHASEN.md` (Phase 1 → WAVE_13; Phase 2 Gate F Smoke/Burn-in), `MASTER_INDEX.md` (Abschnitt 5: `MONITORING.md`/`OBSERVABILITY.md`).
- **Handbuch (Spezifikation dieser Welle):** `docs/OBSERVABILITY.md` (Drei-Säulen, §1 Korrelations-ID, §2 JSON-Logs, §3 Sentry, §4 Tracing, §5 langsame Queries, §6 Alerts, §7 Release-Korrelation, §8 DSGVO, §9 Kosten/Sampling, §10 Dashboards, §11 DoD, §12 Anti-Patterns).
- **Gate-Bezug:** `finalization/99_GOLIVE_GATE.md` (Smoke/Health vor Go-Live; Confirm+Reason+Audit-Trennung von Telemetrie) + Phase 2 Gate F.
- **Reale Artefakte (Bestand, geprüft):** `app/supabase/functions/{_shared/cors.ts,_shared/supabaseAdmin.ts,_shared/stripe.ts,_shared/email.ts,create-checkout/index.ts,stripe-webhook/index.ts,.env.example}` (+ `submit-form`, `_shared/rateLimit.ts` aus WAVE_06), `app/src/lib/supabase.ts`, `app/src/main.tsx`, `app/src/vite-env.d.ts`, `app/public/_headers`, `app/.env.example`, `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql`.
- **Vorgänger:** `finalization/WAVE_06_security.md` (Edge-Guards, Rate-Limit, `audit_log`, CSP — hier um Sentry-/Beacon-Origins erweitert), `app/finalization/WAVE_01_release_hygiene.md` (Hygiene-Gate — hier um Observability-Assertions erweitert), `finalization/WAVE_12_qa_tests.md` (Test-Suite, in die die Observability-Tests einhängen).
- **Plattform-Pfeiler dieser Welle:** Zero-State auch in der Telemetrie (Produktionspfeiler 2) · Tenant im Signal (`org_id` pseudonym, Pfeiler 1 & 3) · Audit getrennt von Observability (Pfeiler 5) · Secret-/PII-Grenze hart · Korrelierbarkeit (`request_id`) · Kosten-/Sampling-Bewusstsein. **Vermittler-Disclaimer + DSGVO** bleiben unangetastet.

> Diese Welle ist **additiv** und reversibel bis zum Deploy. Jeder kosten-/außenwirksame Schritt (Supabase-Push/Deploy, Sentry-Projekt+Tarif, Cloudflare-Logpush+Aufbewahrung, Uptime-Monitor, Alert-Empfänger, produktive Secrets, `git commit`/`push`) wird **vorab in Klartext angekündigt und erst auf Owner-OK ausgeführt.**
