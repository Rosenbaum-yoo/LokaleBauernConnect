# OBSERVABILITY — LokaleBauernConnect (strukturierte Logs · Error-Tracking · Tracing · langsame Queries · Dashboards)

> Verbindliches Observability-Handbuch für **Phase 1 WAVE_13** (Sentry, strukturierte Logs, Health-Checks) und den Dauerbetrieb. Stack fix: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker, kein Prometheus/Grafana-Container.** Telemetrie läuft als **managed/edge-natives** Modell über Cloudflare Analytics + Logpush, Supabase Logs/Reports und Sentry (EU-Residency).
>
> **Rolle = Vermittler.** Die Plattform vermittelt Hofläden, Verfügbarkeit, Reservierung und Zahlungsanbindung — sie verkauft nicht selbst und berät nicht. Observability darf **niemals** zur stillen Umgehung von Datenschutz/Vermittler-Disziplin werden: keine personenbezogenen Klartextdaten in Logs/Traces, kein Mitschneiden von Zahlungsdaten, durchgängige Pseudonymisierung (siehe §8).
>
> **Owner-Hoheit:** Alle mit **🔑 Owner** markierten Schritte sind account-, kosten- oder vertraglich relevant (Sentry-Tarif, Cloudflare-Logpush-Ziel, Datenaufbewahrung, AVV mit Sub-Auftragsverarbeitern). Sie werden vorab in Klartext angekündigt und erst nach ausdrücklicher Freigabe ausgeführt (CLAUDE.md §0, Stop-Regeln). Reversible lokale Vorbereitung (Logger-Modul, Sentry-SDK-Init hinter Flag, SQL-Views) ist decide-and-act.
>
> **Verwandte Dokumente:** `docs/DEPLOYMENT.md` (Cloudflare/Supabase Deploy) · `docs/INCIDENT_RUNBOOK.md` (Eskalation/Postmortem) · `docs/MONITORING.md` (Uptime/SLO-Sicht) · `docs/BACKUP_DISASTER_RECOVERY.md` · `docs/security/SECURITY_OVERVIEW.md` (Header/WAF/Rate-Limit — Quelle für Security-Signale) · `docs/COMPLIANCE_MODEL.md` (DSGVO, Auftragsverarbeiter, Aufbewahrung) · `docs/ROLE_AND_PERMISSION_MODEL.md` (Welten Käufer/Erzeuger/Staff) · `docs/CORE_BUSINESS_STATE_MACHINES.md` (Reservierungs-/Zahlungs-Zustände als Telemetrie-Anker) · `PHASEN.md` (WAVE_13).

---

## 0. Zielbild & Prinzipien

Observability ist die Fähigkeit, vom **Außenverhalten** des Systems auf seinen **inneren Zustand** zu schließen — ohne neuen Deploy. Für LokaleBauernConnect heißt das konkret: Bei einer fehlgeschlagenen Reservierung, einer hängenden SB-Zahlung oder einer langsamen Karten-Suche muss in **unter zwei Minuten** rekonstruierbar sein **was**, **wo**, **für wen** (pseudonym) und **warum** passiert ist.

**Die drei Säulen (auf unseren Stack gemappt):**

| Säule | Frage | Werkzeug bei uns | Aufbewahrung (Default) |
|---|---|---|---|
| **Logs** (strukturiert, JSON) | „Was ist Schritt für Schritt passiert?" | Edge Functions → `console.*` (JSON) → **Supabase Logs** · Worker → `console.*` (JSON) → **Cloudflare Logpush** | 7 Tage (Supabase Free/Pro Logs), 30 Tage (Logpush-Ziel, 🔑 Owner) |
| **Errors** (Aggregation + Alarm) | „Welcher Fehler, wie oft, seit wann, betrifft wen?" | **Sentry** (Browser-SDK + Deno-SDK), EU-Region | 90 Tage Events |
| **Metriken/Traces** | „Wie schnell, wie viel, welche Spanne war langsam?" | **Cloudflare Web Analytics** (RUM) · **Supabase Reports** (DB/API) · Sentry **Performance/Tracing** (Spans über Edge ↔ DB) | 30–90 Tage je Quelle |

**Leitprinzipien (verbindlich):**

1. **Korrelierbar vor vollständig.** Jeder Request trägt eine durchgehende `request_id` (Trace-ID), die Browser → Worker → Edge Function → DB-Logzeile verbindet. Ohne Korrelations-ID kein produktionsreifer Pfad.
2. **Struktur vor Prosa.** Logs sind **immer** JSON (ein Objekt pro Zeile), niemals freitextliche `console.log("hier war ich")`-Zeilen. Maschinell filterbar via Supabase-Logs-SQL bzw. Logpush-Ziel.
3. **Pseudonym vor personenbezogen.** Niemals E-Mail, Klarname, Adresse, IBAN, Karten-/Stripe-PII oder Reservierungs-Klartext ins Log. Nur IDs/Hashes (§8). Vermittler-Rolle + DSGVO sind nicht verhandelbar.
4. **Zero-State auch in der Telemetrie.** Leere Datenmengen (keine Höfe in der Region, keine Verfügbarkeit) sind **Geschäftslogik, kein Fehler** — sie erzeugen ein `info`-Ereignis (`empty_result`), niemals einen Sentry-Error oder 500 (deckt CLAUDE.md Produktionspfeiler 2 ab).
5. **Tenant im Signal.** Jedes Server-Log und jeder Span trägt `org_id` als pseudonymes Feld, damit Auswertungen org-scoped bleiben (Produktionspfeiler 1 & 3). Cross-Org-Auswertung ist nur Staff/Owner mit Audit erlaubt.
6. **Kosten bewusst.** Telemetrie ist nicht gratis (Sentry-Events, Logpush-Volumen). Sampling, Rate-Limits und Severity-Schwellen halten Volumen + Kosten im Rahmen (§9).

**Abgrenzung Observability vs. Audit:** Audit (`docs/COMPLIANCE_MODEL.md`, Tabelle `audit_log`) ist die **revisionssichere, unabschaltbare** Aufzeichnung *geschäftlicher* Mutationen (wer/was/warum, reason-Pflicht). Observability ist die **technische, samplebare, kurzlebige** Sicht auf Laufzeitverhalten. Beide nutzen dieselbe `request_id` zur Verknüpfung, sind aber getrennte Speicher mit getrennter Aufbewahrung. Eine kritische Aktion erzeugt **immer** einen Audit-Eintrag; ein Log/Trace ist optional und darf gesampelt werden.

---

## 1. Korrelations-Modell (Trace-ID über alle Schichten)

Die `request_id` ist das Rückgrat. Sie wird **am Eingang erzeugt**, durch alle Schichten weitergereicht und in jedem Telemetrie-Ereignis mitgeführt.

```
Browser (React)                Cloudflare Worker        Supabase Edge Function     Postgres
─────────────────              ──────────────────       ──────────────────────     ────────
crypto.randomUUID()  ──header──►  X-Request-Id  ──fwd──►   X-Request-Id  ──set──►   app.request_id (GUC)
  └─ Sentry trace                  └─ Logpush field          └─ JSON-Log + Sentry      └─ erscheint in
     (window context)                                          (Deno-SDK)                 Query-Logs
```

**Regel:** Existiert ein eingehender `X-Request-Id`-Header (vorgelagerte Schicht hat ihn gesetzt), wird er übernommen; sonst neu generiert. So bleibt ein End-to-End-Pfad eine einzige ID.

**Frontend — ID erzeugen und an jeden Supabase-/Edge-Call hängen** (`app/src/lib/telemetry.ts`, neu in WAVE_13):

```ts
// app/src/lib/telemetry.ts
// Erzeugt/propagiert die Korrelations-ID. Pro Browser-Tab-Sitzung stabil,
// pro Request frisch — wir nutzen pro Request frisch für präzise Korrelation.

export function newRequestId(): string {
  // crypto.randomUUID ist in allen Zielbrowsern (2024+) verfügbar.
  return crypto.randomUUID();
}

/** Standard-Header für jeden fetch/Supabase-Functions-Aufruf. */
export function traceHeaders(requestId = newRequestId()): Record<string, string> {
  return { "X-Request-Id": requestId };
}
```

**Supabase-Aufrufe** reichen den Header über `functions.invoke(..., { headers })` bzw. den globalen Fetch-Wrapper weiter (siehe `app/src/lib/supabase.ts`). Direkte PostgREST-Reads brauchen die ID nicht zwingend (RLS schützt), Edge Functions und Mutationen **immer**.

---

## 2. Strukturierte Logs (JSON) — Server (Edge Functions & Worker)

### 2.1 Kanonisches Log-Schema

Jede Server-Logzeile ist **ein JSON-Objekt**. Pflichtfelder fett. Supabase und Cloudflare leiten `console.log(JSON.stringify(obj))` unverändert in ihre Log-Pipelines weiter — kein zusätzliches SDK nötig.

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| **`ts`** | ISO-8601 String | ✅ | Zeitstempel (`new Date().toISOString()`) |
| **`level`** | `"debug"\|"info"\|"warn"\|"error"\|"fatal"` | ✅ | Schweregrad |
| **`msg`** | String | ✅ | Kurze, stabile Ereignis-Kennung (z. B. `reservation.created`, nicht „Reservierung wurde erstellt für Hans") |
| **`request_id`** | String (UUID) | ✅ | Korrelations-ID (§1) |
| **`fn`** | String | ✅ | Logischer Ursprung (Edge-Function-Name / Worker-Route) |
| `org_id` | String (UUID) | ✅ (wenn vorhanden) | Mandant — Pflicht in jedem org-gebundenen Pfad |
| `actor_role` | `"buyer"\|"producer"\|"staff"\|"anon"` | empfohlen | Welt des Aufrufers (keine User-ID im Klartext) |
| `actor_hash` | String | optional | HMAC-Pseudonym der User-ID (§8), nur wenn nötig |
| `duration_ms` | Number | empfohlen | Dauer der Operation |
| `status` | Number | bei HTTP | HTTP-Statuscode der Antwort |
| `err_code` | String | bei Fehler | Stabiler Fehlercode (z. B. `RESERVATION_SLOT_TAKEN`) |
| `err_kind` | String | bei Fehler | Exception-Klasse/Kategorie |
| `meta` | Objekt | optional | Zusatzkontext — **nur nicht-personenbezogen** (§8) |

> **Niemals** im Log: `email`, `name`, `phone`, `address`, `iban`, `card`, `stripe_customer_*`, Klartext-Reservierungsdaten, Tokens, Secrets, vollständige Request-Bodies. Das wird durch den Logger-Redaktor (§2.3) erzwungen.

### 2.2 Logger-Modul für Edge Functions (Deno)

Lege das Modul neben den vorhandenen Shared-Helpern an: `app/supabase/functions/_shared/logger.ts`. Es kapselt Schema, Redaction, Severity und die `request_id`-Bindung.

```ts
// app/supabase/functions/_shared/logger.ts
// Strukturierter JSON-Logger für Supabase Edge Functions (Deno).
// Gibt EIN JSON-Objekt pro Zeile aus -> landet 1:1 in den Supabase Function-Logs.

type Level = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10, info: 20, warn: 30, error: 40, fatal: 50,
};

// Über Secret steuerbar: in Prod "info", in Dev "debug".
const MIN_LEVEL: Level = (Deno.env.get("LOG_LEVEL") as Level) ?? "info";

// Felder, die NIE im Log erscheinen dürfen (Redaction, §8).
const FORBIDDEN_KEYS = new Set([
  "email", "name", "vorname", "nachname", "phone", "telefon", "address",
  "adresse", "iban", "card", "cardnumber", "cvc", "password", "token",
  "authorization", "apikey", "api_key", "secret", "stripe_secret",
  "service_role", "access_token", "refresh_token",
]);

function redact(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) { out[k] = "[redacted]"; continue; }
    out[k] = redact(v);
  }
  return out;
}

export interface LogContext {
  request_id: string;
  fn: string;
  org_id?: string;
  actor_role?: "buyer" | "producer" | "staff" | "anon";
  actor_hash?: string;
}

export function createLogger(ctx: LogContext) {
  function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
    const line = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...ctx,
      ...(fields ? { meta: redact(fields) } : {}),
    };
    // Eine Zeile, valides JSON -> maschinell filterbar in Supabase Logs.
    console.log(JSON.stringify(line));
  }
  return {
    debug: (m: string, f?: Record<string, unknown>) => emit("debug", m, f),
    info:  (m: string, f?: Record<string, unknown>) => emit("info", m, f),
    warn:  (m: string, f?: Record<string, unknown>) => emit("warn", m, f),
    error: (m: string, f?: Record<string, unknown>) => emit("error", m, f),
    fatal: (m: string, f?: Record<string, unknown>) => emit("fatal", m, f),
  };
}
```

### 2.3 Einbindung am Funktionsrand (Pflicht-Muster)

Jede Edge Function folgt demselben Rahmen: ID lesen/erzeugen → Logger binden → Zod-Validierung → Arbeit → strukturiertes Erfolgs-/Fehler-Log → Antwort mit `X-Request-Id`.

```ts
// Auszug aus einer Edge Function, z. B. app/supabase/functions/create-reservation/index.ts
import { createLogger } from "../_shared/logger.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const requestId = req.headers.get("X-Request-Id") ?? crypto.randomUUID();
  const started = performance.now();

  // org_id/actor_role stammen NACH Auth-Prüfung aus dem verifizierten JWT-Claim,
  // nicht aus dem Body (Spoofing-Schutz). Hier vereinfacht dargestellt.
  const log = createLogger({ request_id: requestId, fn: "create-reservation" });

  try {
    // ... Zod-Validierung, Rechteprüfung (RLS-gestützt), Geschäftslogik ...
    const duration_ms = Math.round(performance.now() - started);
    log.info("reservation.created", { duration_ms, status: 201 });
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { ...corsHeaders, "X-Request-Id": requestId, "Content-Type": "application/json" },
    });
  } catch (e) {
    const duration_ms = Math.round(performance.now() - started);
    // Zero-State ist KEIN Fehler -> würde als info("empty_result") geloggt, nicht hier.
    log.error("reservation.failed", {
      duration_ms, status: 500,
      err_kind: e instanceof Error ? e.name : "Unknown",
      err_code: (e as { code?: string })?.code ?? "INTERNAL",
    });
    // Sentry-Capture (§3) erfolgt im selben catch, mit derselben request_id.
    return new Response(JSON.stringify({ error: "internal_error", request_id: requestId }), {
      status: 500,
      headers: { ...corsHeaders, "X-Request-Id": requestId, "Content-Type": "application/json" },
    });
  }
});
```

> **`X-Request-Id` in jeder Antwort** ermöglicht dem Frontend, bei einem Fehler dem Nutzer eine **Referenznummer** zu zeigen („Bitte nennen Sie dem Support: `a1b2…`") — ohne PII, aber sofort im Log auffindbar.

### 2.4 Cloudflare Worker / Pages Functions

Worker-`console.*`-Ausgaben fließen in **Workers Logs** (Live-Tail via `wrangler tail`) und, bei aktivem **Logpush** (🔑 Owner), in das konfigurierte Ziel (R2/externes SIEM). Dasselbe JSON-Schema verwenden; Worker-Variante des Loggers ohne Deno-Spezifika (identische Felder, `globalThis.crypto.randomUUID`). Der Worker setzt/propagiert `X-Request-Id` und reicht ihn an die Edge Function weiter.

---

## 3. Error-Tracking mit Sentry

Sentry aggregiert Frontend- und Edge-Fehler, dedupliziert sie zu **Issues**, alarmiert und liefert Release-/Breadcrumb-Kontext. **EU-Datenresidenz** (`*.de.sentry.io` / EU-Org) ist Pflicht (DSGVO, `docs/COMPLIANCE_MODEL.md`).

### 3.1 Owner-Setup (🔑 Owner — account-/kostenrelevant)

1. Sentry-Org in **EU-Region** anlegen; zwei Projekte: `lbc-app` (Browser/JS) und `lbc-edge` (Deno).
2. **DSN** je Projekt → als `VITE_SENTRY_DSN` (nur Public-DSN, kein Secret) bzw. `SENTRY_DSN_EDGE` (Supabase-Function-Secret) hinterlegen.
3. **PII-Scrubbing** serverseitig in Sentry aktivieren (Data Scrubbing „on", `sendDefaultPii: false` im SDK — siehe unten).
4. **AVV** mit Sentry als Auftragsverarbeiter im Verzeichnis führen (`docs/COMPLIANCE_MODEL.md`).
5. **Aufbewahrung/Quota** je Tarif prüfen; Sampling (§9) so wählen, dass das Free/Team-Kontingent nicht gesprengt wird.

> Ohne Owner-Freigabe wird die Sentry-Initialisierung **hinter ein Flag** gelegt (`if (import.meta.env.VITE_SENTRY_DSN) { … }`) — die App läuft vollständig auch ohne Sentry (kein toter Pfad, kein Crash bei fehlender DSN).

### 3.2 Frontend-Initialisierung (React)

`@sentry/react` als Dependency in `app/`. Init früh in `app/src/main.tsx`, hinter DSN-Flag:

```ts
// app/src/main.tsx (Auszug)
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // "production" | "development"
    release: import.meta.env.VITE_APP_RELEASE, // Git-SHA, im CI gesetzt (§7)
    sendDefaultPii: false,             // keine IP/Headers/Userdaten automatisch
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% Tracing in Prod (§9)
    replaysSessionSampleRate: 0,       // Session-Replay AUS (PII-Risiko, DSGVO)
    replaysOnErrorSampleRate: 0,
    // beforeSend: letzte Redaction-Schicht, entfernt versehentliche PII (§8).
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.user) event.user = { id: event.user.id }; // nur pseudonyme ID
      return event;
    },
  });
}
```

- **Error Boundary:** Die App in `Sentry.ErrorBoundary` mit einem Editorial-Fallback (Token-konform, keine Deko-Emojis) kapseln — kein weißer Bildschirm, sondern „Etwas ist schiefgelaufen" + Referenznummer (`request_id`) + Reload-Aktion.
- **Tag pro Event:** `Sentry.setTag("org_id", orgId)` und `Sentry.setTag("actor_role", role)` nach Login (pseudonym), damit Issues org-/rollenscoped filterbar sind.

### 3.3 Edge-Function-Initialisierung (Deno)

`@sentry/deno` (npm-Spezifier in Deno). Im selben `catch` wie das Error-Log, mit derselben `request_id` als Tag:

```ts
// app/supabase/functions/_shared/sentry.ts
import * as Sentry from "npm:@sentry/deno";

const dsn = Deno.env.get("SENTRY_DSN_EDGE");
if (dsn) {
  Sentry.init({ dsn, environment: Deno.env.get("SENTRY_ENV") ?? "production", sendDefaultPii: false });
}

export function captureEdge(e: unknown, ctx: { request_id: string; fn: string; org_id?: string }) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    scope.setTag("request_id", ctx.request_id);
    scope.setTag("fn", ctx.fn);
    if (ctx.org_id) scope.setTag("org_id", ctx.org_id);
    Sentry.captureException(e);
  });
}
```

### 3.4 Was wird gemeldet — was nicht

| Ereignis | Sentry? | Begründung |
|---|---|---|
| Unerwartete Exception (5xx) | ✅ Error | echter Defekt |
| Stripe-Webhook-Signatur ungültig (wiederholt) | ✅ Warn → Alert | möglicher Angriff/Fehlkonfiguration |
| RLS-Verletzung / 403 bei org-fremdem Zugriff | ✅ Warn (gesampelt) | Sicherheitssignal; Flut → Rate-Limit |
| 404 / Validierungsfehler (4xx, Nutzerfehler) | ❌ | erwartbar, nur als `warn`-Log |
| Zero-State (keine Höfe/Verfügbarkeit) | ❌ | Geschäftslogik (Pfeiler 2) |
| Turnstile-Challenge fehlgeschlagen | ❌ (Log `info`) | erwartbar bei Bots |

---

## 4. Tracing & Performance (Spans über Browser ↔ Edge ↔ DB)

Tracing zeigt **wo** die Zeit verbraucht wird. Drei Quellen werden über die `request_id`/Trace-ID verbunden:

1. **Sentry Performance (Frontend):** automatische Spans für Page-Loads, Route-Wechsel und `fetch`/Supabase-Calls (`tracesSampleRate`, §3.2). Liefert Web Vitals (LCP, INP, CLS) und die Dauer kritischer Flows (Finder-Suche, Reservierung absenden, SB-Zahlung).
2. **Sentry Performance (Edge):** der `@sentry/deno`-Span umschließt die Function-Ausführung; manuell instrumentierte Sub-Spans für DB-Aufruf und Stripe-Call zeigen die Aufteilung Edge-Logik vs. DB vs. externe API.
3. **Cloudflare Web Analytics (RUM):** datenschutzfreundliches, cookieloses Real-User-Monitoring (Web Vitals, Seiten, Länder) ohne PII — ideal als kostengünstige Dauer-Baseline (deckt 100 % der Sessions, ergänzt das gesampelte Sentry-Tracing).

**Manuelle Sub-Spans am heißen Pfad** (Beispiel SB-Zahlung — USP, dort zählt jede Millisekunde):

```ts
// innerhalb der Edge Function, bei aktivem Sentry
await Sentry.startSpan({ name: "db.create_reservation", op: "db.query" }, async () => {
  // PostgREST/RPC-Aufruf
});
await Sentry.startSpan({ name: "stripe.create_payment_intent", op: "http.client" }, async () => {
  // Stripe-Aufruf
});
```

**Trace-Budget (Richtwerte, als Alert-Schwellen in §6 verwendet):**

| Flow | p75-Ziel | p95-Alarm |
|---|---|---|
| Hofladen-Finder Suche (Region) | < 400 ms | > 1200 ms |
| Reservierung absenden (Edge + DB) | < 600 ms | > 1500 ms |
| SB-Zahlung QR → PaymentIntent | < 800 ms | > 2000 ms |
| Verfügbarkeits-Pflege speichern (Erzeuger) | < 500 ms | > 1500 ms |

---

## 5. Langsame Queries & Datenbank-Observability (Postgres/Supabase)

Die DB ist der häufigste Engpass bei Wachstum 10→300 Höfe. Supabase liefert die Werkzeuge managed — kein eigener Exporter nötig.

### 5.1 `pg_stat_statements` (kanonische Quelle für langsame Queries)

In Supabase standardmäßig aktiv. Aggregiert pro normalisierter Query: Aufrufzahl, Gesamt-/Mittel-/p99-Zeit, Zeilen, Cache-Trefferquote. **Top-Auswertung** (Supabase SQL-Editor oder via Dashboard → Reports → Query Performance):

```sql
-- Die 20 teuersten Queries nach kumulierter Zeit (Hotspots zuerst).
select
  round(total_exec_time::numeric, 1)         as total_ms,
  calls,
  round(mean_exec_time::numeric, 2)          as mean_ms,
  round((100 * total_exec_time
        / nullif(sum(total_exec_time) over (), 0))::numeric, 1) as pct_total,
  rows,
  -- Query normalisiert; enthält KEINE Literalwerte (keine PII), nur Struktur.
  left(query, 160) as query
from pg_stat_statements
order by total_exec_time desc
limit 20;
```

> **Zählerstand vor Lasttest zurücksetzen:** `select pg_stat_statements_reset();` (nur Owner/Service-Role) — danach den Kernflow durchspielen, dann obige Auswertung lesen. So misst man eine Welle isoliert.

### 5.2 Langsame-Query-Logschwelle

In Supabase-Postgres über `log_min_duration_statement` (Projekt-Settings / Custom Config, 🔑 Owner) auf z. B. **500 ms** setzen: Jede Query darüber landet mit Dauer im Postgres-Log (Supabase → Logs → Postgres). Schwelle bewusst > p95-Budget der schnellen Pfade, damit nur echte Ausreißer geloggt werden (Volumen/Kosten).

### 5.3 RLS-Performance ist Pflichtbestandteil

RLS-Policies laufen pro Zeile. Eine teure `org_id`-Prüfung wird zum Skalierungsbremser. Regeln:

- **Jede RLS-relevante Spalte indiziert** — `org_id`, `farm_id`, Status-/Zeit-Spalten, die in Policies/Filtern vorkommen (gehört in die Migration, WAVE_11 DB-Härtung).
- **`explain (analyze, buffers)`** auf den drei heißesten Reads (Finder, Verfügbarkeit, Reservierungsliste) — `Seq Scan` über große Tabellen ist ein Befund, kein Detail.

```sql
-- Beispiel: Finder-Read muss Index nutzen, nicht Seq Scan.
explain (analyze, buffers)
select id, name, region from farms
where org_id = current_setting('app.org_id')::uuid
  and deleted_at is null
order by name limit 50;
```

- **N+1 vermeiden:** Frontend-Listen laden Relationen über PostgREST-Embeds/Views, nicht in einer Schleife. Auffällig in `pg_stat_statements`: dieselbe Query mit sehr hoher `calls`-Zahl.

### 5.4 Health-Checks (Liveness der DB-/Edge-Schicht)

Schlanke Edge Function `app/supabase/functions/health/index.ts` (öffentlich, ohne PII), prüft DB-Erreichbarkeit + Migrationsstand:

```ts
// Antwort-Shape (Zero-State-tauglich, kein 500 bei „leer"):
// 200 { "ok": true,  "db": "up",   "migration": "0002", "ts": "…" }
// 503 { "ok": false, "db": "down", "error_code": "DB_UNREACHABLE", "request_id": "…" }
```

Cloudflare-Health-Check / externer Uptime-Ping (z. B. UptimeRobot, 🔑 Owner) trifft diesen Endpoint minütlich. Details zur Alarmierung in `docs/MONITORING.md` / `docs/INCIDENT_RUNBOOK.md`.

---

## 6. Alerts & Schwellen (signal-, nicht rausch-getrieben)

Ein Alert, auf den niemand reagiert, ist Lärm. Jeder Alert hat **Eigentümer, Schwelle, Kanal, Runbook-Verweis**.

| Signal | Quelle | Schwelle (Default) | Kanal | Reaktion / Runbook |
|---|---|---|---|---|
| **Edge-Fehlerrate** | Sentry `lbc-edge` | > 2 % aller Calls je 5 Min **oder** neues Issue-Vorkommen | Sentry-Alert → E-Mail/Slack (Owner) | `INCIDENT_RUNBOOK §Triage` |
| **Stripe-Webhook-Fehler** | Sentry/Log `err_code=WEBHOOK_*` | ≥ 3 in 10 Min | Owner sofort | Idempotenz/Signatur prüfen (`STRIPE-SETUP`) |
| **SB-Zahlung p95** | Sentry Performance | > 2000 ms über 15 Min | Owner | Stripe-Latenz vs. Edge prüfen |
| **DB langsame Query** | Postgres-Log (`> 500 ms`) | neue Query-Signatur taucht auf | wöchentliche Sichtung | Index/Welle 11 |
| **Health-Endpoint** | Uptime-Ping | 2 Fehlschläge in Folge | Owner sofort | `INCIDENT_RUNBOOK §DB down` |
| **RLS/403-Flut** | Log `status=403` | > 50 / 5 Min aus einer org_id/IP | security-auditor | möglicher Angriff (`SECURITY_OVERVIEW`) |
| **4xx-Spitze** | Cloudflare Analytics | ungewöhnliche Spitze | wöchentlich | UX-/Routing-Defekt |

> **Eskalation = Owner-Entscheidung.** Observability *erkennt*; der Incident-Runbook *handelt*. Diese Datei definiert die Signale, nicht die Eskalationskette.

---

## 7. Releases korrelieren (Welcher Deploy hat es gebrochen?)

Jeder Fehler muss einem **Release** zuordenbar sein.

- **`release` = Git-SHA** im CI gesetzt: `VITE_APP_RELEASE=$CF_PAGES_COMMIT_SHA` (Cloudflare-Pages-Build-Var) → an Sentry-Init übergeben (§3.2).
- **Source Maps** im CI an Sentry hochladen (`@sentry/vite-plugin`), damit Stacktraces lesbar sind; Maps **nicht** öffentlich mit ausliefern (nur an Sentry, dann aus dem Artefakt entfernen — Release-Hygiene wie `docs/DEPLOYMENT.md` §9).
- **Edge-Functions** tragen ihre Version als `SENTRY_ENV`/Release-Tag.
- So zeigt Sentry „regression in Release `a1b2c3`" und der Incident-Runbook kann gezielt rollbacken.

---

## 8. Datenschutz in der Telemetrie (DSGVO, Vermittler, nicht verhandelbar)

Observability ist ein **Auftragsverarbeitungs-Risiko**. Regeln (verbindlich, von `compliance-officer` + `security-auditor` zu prüfen):

1. **Keine personenbezogenen Klartextdaten** in Logs/Traces/Sentry. Der Logger-Redaktor (§2.2) und `beforeSend` (§3.2) sind die technischen Erzwinger — Verstöße sind ein Defekt, kein „Detail".
2. **Pseudonymisierung statt User-ID:** Wo ein Bezug nötig ist, `actor_hash = HMAC_SHA256(user_id, PSEUDONYM_SECRET)` (Secret nur in Edge/Server-Env). Nicht rückrechenbar ohne Secret, aber innerhalb eines Incidents korrelierbar.
3. **`org_id` ist Pflichtfeld, aber pseudonym** (UUID, kein Name). Auswertung über mehrere Orgs nur Staff/Owner, **mit Audit** (`owner_control`/`staff`-Namensraum analog Kern).
4. **EU-Residency** für Sentry und jedes Logpush-Ziel. Sub-Auftragsverarbeiter im AVV-Verzeichnis (`docs/COMPLIANCE_MODEL.md`).
5. **Aufbewahrung & Löschung:** Logs ≤ 30 Tage, Sentry-Events ≤ 90 Tage, danach automatische Löschung. Auf Betroffenenauskunft/-löschung: pseudonyme Telemetrie ist i. d. R. nicht personenbeziehbar — Bewertung dokumentiert im Compliance-Modell.
6. **Keine Zahlungs-PII:** Stripe-Daten (Karte, IBAN, `payment_method`) erscheinen **nie** im Log; nur die `payment_intent_id` (Pseudonym) und der Status.
7. **Kein Session-Replay** (DSGVO/PII-Risiko bei einem Marktplatz mit Adressen) — explizit aus (§3.2).

---

## 9. Kosten & Sampling (Wirtschaftlichkeit)

Telemetrie skaliert mit Traffic — unkontrolliert sprengt sie Quota und Budget (CLAUDE.md §0.3 Wirtschaftlichkeit).

| Hebel | Default | Begründung |
|---|---|---|
| Sentry `tracesSampleRate` (Frontend) | 0.1 (Prod) | 10 % Tracing reicht für Trends; Cloudflare RUM deckt 100 % Web Vitals gratis |
| Sentry Error-Events | 100 % der Errors, aber **deduppt** | Fehler immer sehen; Flut über Sentry-Rate-Limit/`ignoreErrors` dämpfen |
| `log_min_duration_statement` | 500 ms | nur Ausreißer loggen, nicht jede Query |
| Server-`LOG_LEVEL` | `info` (Prod), `debug` (Dev) | Debug-Flut nicht in Prod |
| Cloudflare Logpush | erst ab Bedarf (🔑 Owner) | kostet Volumen; Workers Logs + `wrangler tail` reichen anfangs |
| Cloudflare Web Analytics | an (kostenlos, cookielos) | beste Kosten/Nutzen-Baseline |
| `warn`/403-Sampling | rate-limit pro org_id/IP | Sicherheits-Flut verstopft Sentry nicht |

> **Reihenfolge der Einführung (Rekordzeit, WAVE_13):** (1) JSON-Logger + `request_id` end-to-end (kostenlos, sofort wirksam) → (2) Health-Endpoint + Uptime-Ping → (3) Sentry hinter DSN-Flag (Frontend zuerst, dann Edge) → (4) `pg_stat_statements`-Auswertung + Index-Pass (WAVE_11-Schnittstelle) → (5) Alerts scharf schalten → (6) Logpush/erweiterte Aufbewahrung nur bei Bedarf (🔑 Owner).

---

## 10. Dashboards (was man wo ansieht)

Keine selbstgehosteten Grafana-Container. Dashboards sind die **nativen Konsolen** der managed Dienste, ergänzt um schmale SQL-Views/eine Owner-Sicht.

| Dashboard | Quelle | Zielgruppe | Inhalt |
|---|---|---|---|
| **App-Fehler & Releases** | Sentry `lbc-app` | Owner/Claude | Top-Issues, Fehlerrate, Web Vitals, Regression nach Release |
| **Edge-Fehler & Performance** | Sentry `lbc-edge` | Owner/Claude | Function-Fehler, Span-Latenz (DB/Stripe), Webhook-Fehler |
| **Real-User Web Vitals** | Cloudflare Web Analytics | Owner | LCP/INP/CLS, Seiten, Länder, 4xx/5xx-Trend |
| **DB Query Performance** | Supabase → Reports / `pg_stat_statements` | Claude/db-rls | langsamste Queries, Cache-Trefferquote, Index-Nutzung |
| **API & Auth** | Supabase → Reports | Owner/security-auditor | Request-Volumen, Auth-Fehlerraten, Rate-Limit-Treffer |
| **Geschäfts-Health (Owner-Konsole)** | DB-Views, Phase 3 Betriebszentrale | Owner | Reservierungen/Tag, aktive Höfe, SB-Zahlungen erfolgreich/fehlgeschlagen, Conversion |

**Owner-fähige Geschäfts-Views** (read-only, org-scoped, kein PII) gehören zur **Betriebszentrale (PHASEN Phase 3)** und ziehen ihre Wahrheit aus den Domänen-Tabellen — *Domain owns truth, Konsole owns aggregation*. Beispiel-View für die SB-Zahlungs-Gesundheit (USP):

```sql
-- Aggregierte SB-Zahlungs-Health pro Tag/Org. KEIN PII, nur Zähler/Status.
-- Quelle: payments-Tabelle (0002_payments.sql). Read-only Sicht für Owner-Konsole.
create or replace view obs_sb_payment_daily as
select
  org_id,
  date_trunc('day', created_at) as day,
  count(*)                                              as attempts,
  count(*) filter (where status = 'succeeded')          as succeeded,
  count(*) filter (where status = 'failed')             as failed,
  round(avg(amount_cents)::numeric, 0)                  as avg_amount_cents
from payments
where deleted_at is null
group by org_id, date_trunc('day', created_at);
-- RLS der zugrundeliegenden Tabelle bleibt wirksam; Owner/Staff-Sicht via Policy.
```

> **Disclaimer in Owner-Sichten:** Kennzahlen sind technische Aggregation der Vermittlungsplattform — keine Buchhaltung, keine Steuerberatung. Hinweis sichtbar halten (Vermittler-Rolle, `docs/COMPLIANCE_MODEL.md`).

---

## 11. Checkliste WAVE_13 (Definition of Done)

- [ ] `app/src/lib/telemetry.ts` — `request_id`-Erzeugung + `traceHeaders`, an alle Edge-/Mutations-Calls gebunden.
- [ ] `app/supabase/functions/_shared/logger.ts` — JSON-Logger mit Redaction, `LOG_LEVEL` über Secret.
- [ ] Jede Edge Function nutzt das Rahmen-Muster (§2.3): ID → Logger → Erfolg/Fehler-Log → `X-Request-Id` in Antwort.
- [ ] `app/supabase/functions/health/index.ts` — Liveness (DB + Migrationsstand), Zero-State-tauglich.
- [ ] Sentry Frontend hinter `VITE_SENTRY_DSN`-Flag, `sendDefaultPii:false`, Error-Boundary mit Editorial-Fallback + Referenznummer.
- [ ] Sentry Edge (`_shared/sentry.ts`) im `catch`, derselbe `request_id`-Tag.
- [ ] `release`/Git-SHA + Source-Maps-Upload im CI; Maps nicht öffentlich ausgeliefert.
- [ ] `pg_stat_statements`-Auswertung dokumentiert; `explain analyze` der drei heißesten Reads grün (kein Seq Scan über große Tabellen).
- [ ] `log_min_duration_statement = 500ms` gesetzt (🔑 Owner).
- [ ] Alerts (§6) konfiguriert mit Owner/Kanal/Runbook-Verweis.
- [ ] PII-Redaction durch `security-auditor` + `compliance-officer` geprüft; EU-Residency + AVV dokumentiert (`COMPLIANCE_MODEL`).
- [ ] Sampling/Kostenhebel (§9) gesetzt; Logpush nur bei Bedarf (🔑 Owner).
- [ ] Owner-Geschäfts-Views (§10) read-only, org-scoped, mit Disclaimer.
- [ ] Build/Typecheck grün (`tsc --noEmit && vite build`), Konsole sauber, App läuft auch **ohne** Sentry-DSN.

---

## 12. Anti-Patterns (verboten)

- ❌ `console.log("debug")` / freitextliche Logs in Prod-Pfaden — immer strukturiertes JSON.
- ❌ PII (E-Mail, Adresse, IBAN, Karte, Klarname) in Log/Trace/Sentry.
- ❌ Zero-State (leere Liste) als Error/500/Sentry-Issue behandeln.
- ❌ Eigener Prometheus/Grafana-Container, Hetzner-VM, Docker-Self-Host für Telemetrie (Stack-fix verletzt).
- ❌ Sentry Session-Replay aktivieren.
- ❌ Fehlende `request_id` auf einem mutierenden/Edge-Pfad.
- ❌ Cross-Org-Telemetrie-Auswertung ohne Audit.
- ❌ Source Maps oder Secrets im öffentlichen Artefakt.
- ❌ Alert ohne Eigentümer/Schwelle/Runbook-Verweis (= Lärm).
- ❌ 100 % Tracing/Logging in Prod ohne Sampling (Kosten/Quota).
```