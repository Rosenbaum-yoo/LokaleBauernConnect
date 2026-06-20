# MONITORING — LokaleBauernConnect (Cloudflare · Supabase · Stripe — serverless)

> Verbindliches Observability- & Monitoring-Handbuch. **Phase 1 · WAVE_13 (Observability)**, vorbereitend für **Phase 2 (Release-operativ)**.
> Stack fix: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker, kein Prometheus/Grafana-Stack, keine Worker-Queue.**
>
> **Rolle = Vermittler.** Die Plattform betreibt Auslieferung und Zahlungsanbindung — sie verkauft nicht selbst und berät nicht. Monitoring beobachtet die Vermittlungs-Infrastruktur, **niemals** den Inhalt von Kaufverträgen zwischen Käufer und Erzeuger. Disclaimer durchgängig (siehe `docs/COMPLIANCE_MODEL.md`).
>
> **Owner-Hoheit:** Alle mit **🔑 Owner** markierten Schritte sind account-, kosten- oder vertraglich-extern relevant (externe Uptime-Provider, E-Mail-Versand, kostenpflichtige Plan-Stufen). Sie werden vorab in Klartext angekündigt und erst nach ausdrücklicher Freigabe ausgeführt (CLAUDE.md §0, Stop-Regeln). Reversible lokale Vorbereitung (Health-Endpoint-Code, Config-as-Code, Dashboards einrichten) ist decide-and-act.
>
> **Verwandte Dokumente:** `docs/DEPLOYMENT.md` (Gate B/E/F) · `docs/ARCHITEKTUR.md` (§Betrieb) · `docs/ENTERPRISE_ARCHITECTURE.md` · `docs/security/SECURITY_OVERVIEW.md` (§10 Audit, §9 Secrets — **kanonische Quelle**) · `docs/INCIDENT_RUNBOOK.md` · `docs/BACKUP_DISASTER_RECOVERY.md` · `docs/engineering/OPERATIONS_RUNBOOK.md` · `PHASEN.md` (WAVE_13).

---

## 0. Leitprinzip — Observability ohne eigenen Server

LokaleBauernConnect ist **serverless und managed** (ADR 0001): es gibt keinen Host, keinen Docker-Daemon, keinen langlaufenden Node-Prozess und keine selbstbetriebene Metrik-Pipeline. Daraus folgt die gesamte Monitoring-Architektur:

- **Es gibt keinen Prometheus-Scrape und kein Grafana.** Statt eines Pull-Modells (`GET /metrics` an einem Dauerprozess) nutzen wir die **nativen Telemetrie-Ebenen der drei Plattformen** (Cloudflare Analytics, Supabase Observability, Stripe Dashboard/Events) plus **eigene, leichtgewichtige Health-Endpunkte** als Supabase Edge Functions, die **externe Uptime-Dienste** im Push-Pull-Verfahren prüfen.
- **Drei Telemetrie-Quellen, eine Wahrheit pro Domäne:** Auslieferung/Edge → Cloudflare; Daten/Auth/Logik → Supabase; Geld → Stripe. Es gibt keine Schattenkopie von Zahlungs-KPIs außerhalb von Stripe — Stripe ist und bleibt die Wahrheit (SECURITY_OVERVIEW §8). Monitoring **aggregiert und alarmiert**, es **dupliziert keine Fachwahrheit**.
- **Das `audit_log` ist Teil der Observability, nicht ihr Ersatz.** Sicherheits-/Geschäfts-Events (wer/was/warum) leben revisionssicher in `audit_log` (SECURITY_OVERVIEW §10). Monitoring beobachtet *Verfügbarkeit, Latenz, Fehlerrate, Kosten* — nicht die fachliche Nachvollziehbarkeit. Beide ergänzen sich; keiner ersetzt den anderen.
- **Datensparsamkeit gilt auch für Telemetrie (DSGVO).** Logs/Metriken enthalten **keine** personenbezogenen Klartextdaten (Namen, Kontakt, Reservierungsinhalte), keine Secrets, keine Tokens, keine PAN/CVC. Es werden technische Korrelations-IDs und aggregierte Zähler geloggt — niemals der Reservierungs- oder Zahlungs-*Inhalt*. Verstoß = Stop-Regel.

> **Mapping zu den 7 Produktionspfeilern:** Monitoring deckt direkt **Pfeiler 5** (Audit & Verantwortlichkeit — operative Sicht) und stützt **Pfeiler 2** (Zero-State: ein leeres Ergebnis ist *kein* Alarm) und **Pfeiler 6** (Testpflicht: Health-Endpunkte sind getestet). Ein leeres Finder-Ergebnis darf **niemals** einen Fehler-Alarm auslösen — `available:false` + leeres Array ist der erwartete Zustand, kein Incident.

---

## 1. Health-Endpunkte (Supabase Edge Functions)

Da kein eigener Webserver existiert, werden Health-/Readiness-Signale als **schlanke, öffentlich erreichbare Supabase Edge Functions (Deno)** bereitgestellt. Sie sind die kanonische Probe für externe Uptime-Dienste (Abschnitt 4) und für den manuellen Smoke (DEPLOYMENT.md Gate F).

### 1.1 Endpunkt-Übersicht

| Endpunkt | Auth | Zweck | Erwartete Antwort |
|---|---|---|---|
| `GET …/functions/v1/health` | keine (öffentlich) | Liveness — „antwortet die Edge-Ebene überhaupt?" | `200 { "ok": true, "ts": "<ISO>" }` |
| `GET …/functions/v1/ready` | keine (öffentlich) | Readiness — „ist die DB über eine harmlose Lese-Probe erreichbar?" | `200 { "ok": true, "db": "up", "ts": "<ISO>" }` / sonst `503 { "ok": false, "db": "down" }` |
| `GET …/functions/v1/status` | `x-monitor-token` Header | Detail-Status für Betreiber: DB, neueste Migration, Stripe-Webhook-Frische, Edge-Region | `200 { … }` / `401` ohne gültiges Token |
| `GET …/functions/v1/metrics-snapshot` | `x-monitor-token` Header | Aggregierte operative KPIs (siehe §6) — **read-only, org-übergreifend nur via `service_role` server-intern** | `200 { … }` |

> **Frontend-seitige Erreichbarkeit (Apex/App):** Die Landing (`web/`) und die App (`app/`) werden von Cloudflare Pages ausgeliefert; ihre Verfügbarkeit prüft der externe Uptime-Dienst direkt gegen `https://lokalebauernconnect.de` (HTTP 200 + erwarteter Title) und `https://app.lokalebauernconnect.de` (HTTP 200 + `index.html`-Marker). Die Edge-Health-Functions oben prüfen zusätzlich die **Backend-Ebene**, die ein reiner Pages-Ping nicht abdeckt.

### 1.2 `health` (Liveness) — Referenzimplementierung

```ts
// app/supabase/functions/health/index.ts
// Liveness: antwortet die Edge-Ebene? Kein DB-Zugriff, minimale Kosten, kein Secret.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(() =>
  new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
)
```

### 1.3 `ready` (Readiness) — harmlose DB-Lese-Probe

```ts
// app/supabase/functions/ready/index.ts
// Readiness: ist Postgres über eine RLS-konforme, harmlose Lese-Probe erreichbar?
// Nutzt den anon key (RLS deny-by-default schützt) — KEIN service_role im Liveness-Pfad.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')! // public, RLS-gebunden

serve(async () => {
  const started = Date.now()
  try {
    const sb = createClient(SUPABASE_URL, ANON_KEY)
    // Leichtgewichtige Count-Probe auf eine öffentlich lesbare Katalog-Tabelle.
    // Wirft NICHT bei leerem Ergebnis (Zero-State ist gesund, Pfeiler 2).
    const { error } = await sb.from('farms').select('id', { count: 'exact', head: true })
    if (error) throw error
    return Response.json(
      { ok: true, db: 'up', latency_ms: Date.now() - started, ts: new Date().toISOString() },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    )
  } catch {
    // Bewusst nicht-leakend: kein Stacktrace, keine SQL-Details nach außen.
    return Response.json(
      { ok: false, db: 'down', latency_ms: Date.now() - started, ts: new Date().toISOString() },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
})
```

> **Wichtig (Zero-State, Pfeiler 2):** `ready` darf **nicht** `503` liefern, nur weil eine Tabelle leer ist. Geprüft wird *Erreichbarkeit*, nicht *Datenfülle*. Ein frisch deployter, leerer Tenant ist „ready".

### 1.4 `status` (geschützter Betreiber-Status)

`status` ist nicht öffentlich. Es verlangt den `x-monitor-token`-Header (Wert = `MONITOR_TOKEN`, nur in Edge-Env, **nie** `VITE_`). Es liefert tiefergehende, **nicht personenbezogene** Betriebsfakten:

```jsonc
{
  "ok": true,
  "ts": "2026-06-19T10:00:00.000Z",
  "edge_region": "eu-central-1",
  "db": "up",
  "latest_migration": "0007_availability_slots",   // aus supabase_migrations
  "stripe_webhook": { "last_event_at": "2026-06-19T09:58:11Z", "stale": false },
  "version": "<git-sha>"                            // Build-Commit, zur Deploy-Zuordnung
}
```

Regeln: kein `service_role`-Geheimnis in der Antwort; `401` (nicht `403`, nicht stiller `null`) bei fehlendem/falschem Token; `cache-control: no-store`; Token rotierbar gemäß `docs/security/SECRET_ROTATION.md`.

---

## 2. Cloudflare-Metriken (Auslieferung & Edge)

Cloudflare ist die Wahrheit für alles, was **vor** Supabase passiert: TLS, CDN, WAF, Turnstile, Rate-Limit, Edge-Antworten. Die Telemetrie wird **nativ** im Cloudflare-Dashboard und per **GraphQL Analytics API** erhoben — kein eigener Exporter nötig.

### 2.1 Was Cloudflare liefert

| Quelle (Dashboard) | Kennzahlen | Beantwortet |
|---|---|---|
| **Web Analytics** (Pages) | Page Views, Visits, Core Web Vitals (LCP/INP/CLS), Top-Pfade | Erreichen Nutzer die App? Ist sie schnell? (DEPLOYMENT.md Gate E) |
| **Pages Deployments** | Build-Status, Deploy-Historie, Commit-SHA pro Deploy | Welcher Stand ist live? Rollback-Ziel (DEPLOYMENT.md §10) |
| **Security → WAF Events** | geblockte Requests, ausgelöste Managed/OWASP-Rules, Bot-Score-Verteilung | Greift jemand an? Falsch-Positiv-Welle? |
| **Security → Rate Limiting** | `429`-Rate je Rule (Auth, öffentl. Schreibpfade, SB-Intent) | Brute-Force/Spam-Spitze? (SECURITY_OVERVIEW §4) |
| **Turnstile Analytics** | Challenge-Rate, Solve-/Fail-Rate | Bot-Druck auf Formularen? |
| **DNS / SSL/TLS Analytics** | Query-Volumen, Cert-Status, TLS-Versionsverteilung | DNS/Cert gesund? |
| **Workers/Pages Functions Metrics** (falls Worker aktiv) | Invocations, Errors, CPU-Time, Subrequests | Edge-Middleware gesund/teuer? |
| **Logpush / Logs** (kostenpflichtig, Owner) | strukturierte Request-/Firewall-Logs an R2/extern | Forensik, Aggregation |

### 2.2 GraphQL Analytics API (automatisierte Abfrage)

Cloudflare exponiert Zonen-Analytics über eine GraphQL-API — geeignet für tägliche Reports oder einen Cron-getriggerten Health-Check ohne Dashboard-Login.

```bash
# 🔑 Owner: nutzt einen Scoped API-Token (Permission: Analytics:Read).
# Token NUR in CI/Secret-Store, nie im Repo, nie im Client.
curl -s https://api.cloudflare.com/client/v4/graphql \
  -H "Authorization: Bearer $CF_ANALYTICS_TOKEN" \
  -H "Content-Type: application/json" \
  --data @- <<'JSON'
{
  "query": "query($zone:String!,$since:Time!){ viewer { zones(filter:{zoneTag:$zone}){ httpRequests1hGroups(limit:24, filter:{datetime_geq:$since}){ dimensions{datetime} sum{requests cachedRequests threats} avg{sampleInterval} } } } }",
  "variables": { "zone": "<ZONE_TAG>", "since": "2026-06-18T00:00:00Z" }
}
JSON
```

> **Abgrenzung (nicht verletzen):** Cloudflare-Telemetrie endet an der Auslieferungs-/Edge-Grenze. Geschäftslogik-, DB- und Zahlungs-Metriken kommen aus Supabase bzw. Stripe (Abschnitte 3 + 5). Kein Vermischen — sonst entstehen Schattenwahrheiten.

---

## 3. Supabase-Metriken (Daten · Auth · Edge Functions)

Supabase liefert über das **Project Dashboard → Reports/Logs/Advisors** und über einen **Prometheus-kompatiblen Metrik-Endpunkt** (`/customer/v1/privileged/metrics`, projektgebunden, Service-Role-/Token-geschützt) operative DB- und API-Telemetrie. Wir konsumieren primär das Dashboard; der Metrik-Endpunkt ist die optionale Ausbaustufe (Abschnitt 9), **nicht** zwingend für den Launch.

### 3.1 Datenbank & API (Postgres + PostgREST)

| Bereich (Dashboard) | Kennzahlen | Beantwortet |
|---|---|---|
| **Database → Reports** | aktive Connections, Pool-Auslastung, Cache-Hit-Rate, DB-Größe, langsamste Queries (`pg_stat_statements`) | Ist die DB unter Druck? Welche Query ist langsam? |
| **API → Reports** | Request-Rate, Fehlerrate je Statuscode, Latenz (PostgREST/Auth/Storage) | Antwortet das Daten-API gesund? |
| **Auth → Logs/Reports** | Sign-ins, Sign-ups, fehlgeschlagene Logins, MFA-Challenges | Auth-Funktion + Brute-Force-Sicht (ergänzt CF-Rate-Limit) |
| **Storage → Reports** | Bandbreite, Objekt-/Bucket-Größe, Egress | Hof-/Produktbild-Egress + Kostentreiber |
| **Database → Advisors (Security/Performance)** | fehlende RLS, fehlende Indizes, gefährliche Defaults | **Security-Advisor: jede RLS-Warnung ist blockierend** (SECURITY_OVERVIEW §6, Pfeiler 1) |
| **Logs Explorer** | strukturierte Logs (Postgres, PostgREST, Auth, Edge, Storage), SQL-abfragbar | Forensik, Fehlersuche, Korrelation per Request-ID |

### 3.2 Edge Functions (Deno) — Logs & Telemetrie

Edge Functions sind unser einziger „Anwendungs-Code" zur Laufzeit (Turnstile-Verify, SB-Bezahl-Intent, Stripe-Webhook, Health/Status). Telemetrie:

| Quelle | Kennzahl | Beantwortet |
|---|---|---|
| **Edge Functions → Invocations** | Aufrufe/Min je Function | Lastsicht je Function |
| **Edge Functions → Errors** | Fehlerrate, Exception-Rate je Function | Bricht eine Function? |
| **Edge Functions → Logs** | strukturierte `console.*`-Ausgaben (JSON), Boot-/Laufzeitfehler | Ursachenanalyse |
| **Function-Dauer / CPU** | Laufzeit je Invocation | Timeout-Risiko, Kosten |

**Logging-Konvention in Edge Functions (verbindlich):**

```ts
// Strukturiertes, NICHT personenbezogenes Log. Korrelations-ID statt Klartext-PII.
console.log(JSON.stringify({
  evt: 'reservation.create',
  fn: 'reservation-create',
  request_id: crypto.randomUUID(),
  org_scope: orgId,          // technischer Scope, keine personenbezogenen Felder
  outcome: 'ok',             // ok | denied | invalid | error
  status: 201,
  duration_ms: Date.now() - t0,
  // VERBOTEN: name, email, telefon, reservierungs-inhalt, token, key, betrag-als-pii
}))
```

> **Verbote (CLAUDE.md / SECURITY_OVERVIEW §9):** kein Secret, kein Token, kein `service_role`, keine personenbezogenen Klartextdaten, keine PAN/CVC im Log. Fehler werden **mit Status** geloggt (nie stiller `null`-Return) und nach außen **nicht-leakend** (`400/401/403/503` ohne Stacktrace).

---

## 4. Uptime-Monitoring (extern)

Weil kein eigener Host existiert, der sich selbst überwacht, kommt die **Verfügbarkeitsüberwachung von außen** — ein unabhängiger Dienst, der die öffentlichen Oberflächen und Health-Endpunkte aus dem Internet prüft. So wird auch ein vollständiger Cloudflare-/Supabase-Ausfall erkannt (Self-Monitoring würde dann mit ausfallen).

### 4.1 Was extern überwacht wird

| Monitor | Ziel-URL | Erwartung | Intervall | Eskalation |
|---|---|---|---|---|
| **Landing erreichbar** | `https://lokalebauernconnect.de` | `200` + erwarteter Title-Marker | 60 s | Warnung → Kritisch nach 3 Fehlversuchen |
| **App erreichbar** | `https://app.lokalebauernconnect.de` | `200` + `index.html`-Marker | 60 s | Warnung → Kritisch nach 3 Fehlversuchen |
| **Edge Liveness** | `…/functions/v1/health` | `200 { ok:true }`, Body-Keyword `"ok":true` | 60 s | Kritisch nach 2 Fehlversuchen |
| **Edge + DB Readiness** | `…/functions/v1/ready` | `200 { ok:true, db:"up" }` | 120 s | Kritisch nach 2 Fehlversuchen |
| **TLS-Zertifikat** | App- + Apex-Domain | Cert-Ablauf > 14 Tage | täglich | Warnung bei < 14 Tagen Restlaufzeit |
| **Stripe-Webhook-Frische** | `…/functions/v1/status` (`stripe_webhook.stale`) | `stale:false` (Live-Modus) | 15 min | Warnung wenn `stale:true` (siehe §5) |

### 4.2 Empfohlener Dienst & Einrichtung (🔑 Owner — externer Account)

- **Empfehlung:** ein leichtgewichtiger Uptime-Dienst mit globalen Prüfpunkten, Status-Page und E-Mail/Webhook-Alerts (z. B. UptimeRobot, Better Stack / Better Uptime, oder Cloudflare **Health Checks** als zonen-natives Pendant).
- **Cloudflare Health Checks** (zonen-nativ, kein Drittanbieter nötig): Dashboard → **Traffic → Health Checks** → Monitor auf die App-Hostnamen/Health-Pfade, Region EU, Erwartung `2xx` + Body-Keyword. Vorteil: keine zusätzliche Vertragsbeziehung; Nachteil: misst „von Cloudflare aus" — für echtes Außen-Monitoring zusätzlich einen unabhängigen Dienst.
- **Status-Page (optional, Außenwirkung):** öffentliche Status-Seite (`status.lokalebauernconnect.de`) für Erzeuger/Käufer — premium, vertrauensbildend (New-York-Marketing-Stil). Erst nach stabilem Betrieb aktivieren.

> **Health-Endpunkte sind bewusst leichtgewichtig**, damit der externe Minuten-Takt **keine** nennenswerten Supabase-/Stripe-Kosten erzeugt (Wirtschaftlichkeit, §0.3): `health` ohne DB-Zugriff, `ready` mit `head:true`-Count statt Full-Scan, `status`/`metrics-snapshot` nur im Minuten-/Stunden-Takt und tokengeschützt.

---

## 5. Stripe-Monitoring (Zahlung & SB-USP)

Stripe ist die **Wahrheit** für jeden Geldfluss (SECURITY_OVERVIEW §8). Monitoring beobachtet hier ausschließlich **Zustellung und Integrität der Signale** — nie eine parallele Geld-Buchhaltung.

| Quelle | Kennzahl | Beantwortet |
|---|---|---|
| **Stripe Dashboard → Developers → Webhooks** | Zustellrate, fehlgeschlagene Deliveries, Retry-Backlog des Endpoints `…/functions/v1/stripe-webhook` | Kommt jedes Event idempotent an? |
| **Stripe Dashboard → Events** | `payment_intent.succeeded/.payment_failed`, `checkout.session.completed`, `account.updated` (Connect) | SB-Bezahl-Flow + Erzeuger-Auszahlung gesund? |
| **Stripe Radar** | Risk-/Betrugs-Signale auf SB-Zahlungen | Missbrauch am unbemannten Stand? |
| **Connect → Accounts/Payouts** | Auszahlungsstatus an Erzeuger, blockierte/verzögerte Payouts | Fließt Geld korrekt an den Erzeuger? |
| **`audit_log` (eigen)** | `sb_payment.created/.succeeded/.failed`, `payout.*` | Eigene revisionssichere Korrelation (SECURITY_OVERVIEW §10) |

**Webhook-Gesundheit als Alarm-Signal:** `status.stripe_webhook.stale` (Abschnitt 1.4) wird `true`, wenn länger als ein definiertes Fenster (z. B. 24 h im Live-Modus mit erwartetem Traffic, konservativ konfigurierbar) **kein** Event verbucht wurde — das deckt einen *kaputten oder de-registrierten* Endpoint auf, den Stripe selbst nur als „Delivery-Fehler" am Endpoint zeigt. Ergänzend gilt: Stripe-eigene Webhook-Fehler-Alerts (Dashboard) aktivieren.

> **Idempotenz vor Limit (SECURITY_OVERVIEW §4/§8):** Der Webhook hat kein Rate-Limit, sondern Idempotenz über `event.id` (Dedup-Tabelle). Monitoring achtet daher auf **Delivery-Fehler & Verarbeitungs-Exceptions**, nicht auf Durchsatz-Limits.

---

## 6. Operative KPIs (`metrics-snapshot`)

Der geschützte Endpunkt `metrics-snapshot` liefert **aggregierte, nicht personenbezogene** Betriebskennzahlen — als Ergänzung zu den Plattform-Dashboards, abrufbar per Token für interne Reports. Alle Werte sind **Zähler/Aggregate**, keine Datensätze; org-übergreifende Aggregation ausschließlich server-intern (`service_role`), nie an einen Client.

```jsonc
{
  "ts": "2026-06-19T10:00:00.000Z",
  "scope": "platform",                  // Pfeiler 3: Scope transparent in jeder Antwort
  "farms":        { "total": 9,  "verified": 7, "new_7d": 1 },
  "products":     { "total": 25, "in_season": 12, "available": 18 },
  "reservations": { "total_7d": 34, "by_status": { "pending": 4, "confirmed": 20, "picked_up": 8, "cancelled": 2 } },
  "waitlist":     { "active": 11 },
  "subscriptions":{ "by_plan": { "demo": 2, "basis": 4, "plus": 2, "pro": 1 }, "active": 9 },
  "sb_payments":  { "succeeded_7d": 41, "failed_7d": 1 },   // Zähler aus audit_log, NICHT aus Stripe dupliziert
  "audit":        { "entries_24h": 212 }
}
```

Regeln: **kein Fake-Data** (Pfeiler / CLAUDE.md-Verbot) — jeder Wert kommt aus einer echten Aggregat-Query; leere Plattform = Nullen, **kein `500`** (Pfeiler 2); `scope` ist Pflichtfeld (Pfeiler 3); keine personenbezogenen Felder. Zahlungs-KPIs hier sind **Betriebszähler aus dem eigenen `audit_log`**, nicht Stripes Buchhaltung — für Geldwahrheit gilt Stripe (Abschnitt 5).

---

## 7. Alerting (ALERT_EMAIL)

Alarme laufen zentral über die in der Edge-/Monitoring-Konfiguration hinterlegte Adresse **`ALERT_EMAIL`** (Empfänger des Betriebsteams; bei Mehrfachempfang eine Verteiler-/Gruppenadresse). Die Adresse ist **Konfiguration, kein Secret**, lebt aber in Server-Env (nicht `VITE_`), damit sie nicht ins Bundle gelangt und nicht öffentlich Spam anzieht.

### 7.1 Alarmierungsketten

```
[A] Externe Verfügbarkeit (Down/Recovery, TLS-Ablauf)
      Uptime-Dienst  ──►  ALERT_EMAIL  (+ optional Webhook → Chat)

[B] Edge/DB-/Stripe-Health
      status / ready  ──►  geplanter Cron-Check (Abschnitt 8)
                      ──►  bei ok:false  ──►  ALERT_EMAIL

[C] Plattform-native Alerts
      Cloudflare Notifications  ──►  ALERT_EMAIL  (WAF-Spike, Origin-Error, Cert)
      Supabase Project Alerts   ──►  ALERT_EMAIL  (DB-Auslastung, Function-Errors)
      Stripe Webhook-Alerts     ──►  ALERT_EMAIL  (Delivery-Fehler)
```

### 7.2 Alarm-Katalog (Schwellen & Severity)

| Alarm | Quelle | Bedingung | Dauer | Severity | Empfänger |
|---|---|---|---|---|---|
| **AppDown** | Uptime | App/Landing `!= 2xx` | 3 Checks (~3 min) | **kritisch** | `ALERT_EMAIL` |
| **EdgeDown** | Uptime / `health` | `health != 200` | 2 Checks (~2 min) | **kritisch** | `ALERT_EMAIL` |
| **DbUnreachable** | `ready` / Supabase | `ready.db == down` bzw. DB-API-Fehler | 2 Checks (~4 min) | **kritisch** | `ALERT_EMAIL` |
| **CertExpiringSoon** | Uptime / Cloudflare | Cert-Restlaufzeit < 14 Tage | sofort | warnung | `ALERT_EMAIL` |
| **WafSpike** | Cloudflare Notif. | geblockte Requests stark über Baseline | 5 min | warnung | `ALERT_EMAIL` |
| **AuthBruteForce** | Supabase / CF Rate-Limit | fehlgeschlagene Logins / `429`-Auth über Baseline | 10 min | warnung | `ALERT_EMAIL` |
| **EdgeFnErrorRate** | Supabase Functions | Fehlerrate einer Function über Schwelle | 5 min | warnung→kritisch | `ALERT_EMAIL` |
| **DbPressure** | Supabase DB-Report | Connection-/Pool-Auslastung hoch, Cache-Hit niedrig | 10 min | warnung | `ALERT_EMAIL` |
| **StripeWebhookFailing** | Stripe / `status` | Delivery-Fehler bzw. `stripe_webhook.stale == true` | 15 min | **kritisch** | `ALERT_EMAIL` |
| **StoragEgressSurge** | Supabase Storage | Egress/Bandbreite stark über Baseline (Kosten) | 30 min | warnung | `ALERT_EMAIL` |
| **RlsAdvisorWarning** | Supabase Security Advisor | neue RLS-/Security-Warnung | bei Erkennung | **kritisch** | `ALERT_EMAIL` |

> **Nie-Alarm-Regel (Pfeiler 2):** Leeres Suchergebnis, leere Reservierungsliste, leerer Saison-Radar, `available:false` → **kein Alarm**. Diese Zustände sind erwartet (Zero-State). Ein Alarm darf nur auf *Verfügbarkeit, Fehlerrate, Sicherheit, Kosten* feuern — nie auf „wenig/keine Daten".

### 7.3 ALERT_EMAIL einrichten (Empfänger pro Quelle)

| Quelle | Konfigurationsort | Was setzen |
|---|---|---|
| **Eigene Cron-Checks** (Edge/DB/Stripe) | Supabase Edge-Env: `ALERT_EMAIL`, `ALERT_FROM`, plus Versand-Provider-Key | Versand via transaktionalem E-Mail-Provider (z. B. Resend/Postmark), Key **nur** Edge-Env |
| **Cloudflare** | Dashboard → **Notifications** | Empfänger = `ALERT_EMAIL`; Trigger: Health-Check-Status, WAF, Origin-Error, SSL/TLS-Ablauf |
| **Supabase** | Dashboard → Project Settings → **Alerts/Notifications** (bzw. Org-Billing-Alerts) | Empfänger = `ALERT_EMAIL`; DB-/Function-/Nutzungs-Alerts |
| **Stripe** | Dashboard → Developers → Webhooks → Endpoint → **Alerts** + Account-Notifications | Empfänger = `ALERT_EMAIL`; Webhook-Delivery-Fehler |

**Beispiel — Alarmversand aus einem Cron-Check (Edge Function, nicht-leakend):**

```ts
// Versand NUR bei echtem Fehlersignal; ALERT_EMAIL/Provider-Key aus Edge-Env, nie VITE_.
async function alert(subject: string, summary: string) {
  const to = Deno.env.get('ALERT_EMAIL')!
  const key = Deno.env.get('EMAIL_PROVIDER_KEY')!     // Secret, nur Edge-Env
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('ALERT_FROM') ?? 'monitor@lokalebauernconnect.de',
      to, subject: `[LBC-MONITOR] ${subject}`,
      // Summary enthält NUR technische Fakten: Endpoint, Status, Zeit. Keine PII, keine Secrets.
      text: summary,
    }),
  })
}
```

---

## 8. Geplante Health-/Synthetik-Checks (Supabase Cron)

Statt eines Dauerprozesses mit eigenem Scheduler nutzen wir **`pg_cron` / Supabase Scheduled Functions**, um in festem Takt die Health-Signale auszuwerten und bei `ok:false` `ALERT_EMAIL` zu benachrichtigen — die serverless-native Entsprechung eines „Heartbeat-Watchdogs".

| Check | Takt | Aktion bei Fehler |
|---|---|---|
| `ready`-Selbstprobe (DB-Erreichbarkeit) | alle 5 min | `DbUnreachable` → `ALERT_EMAIL` |
| Stripe-Webhook-Frische (`status.stripe_webhook.stale`) | alle 15 min | `StripeWebhookFailing` → `ALERT_EMAIL` |
| Migrations-Drift (erwartete vs. neueste Migration) | täglich | Warnung → `ALERT_EMAIL` |
| Egress-/Nutzungs-Snapshot (Kostenfrühwarnung) | täglich | `StoragEgressSurge` bei Schwelle → `ALERT_EMAIL` |

```sql
-- app/supabase/migrations/00NN_monitoring_cron.sql  (additiv, nie destruktiv)
-- Heartbeat: ruft die ready-Function alle 5 Minuten serverseitig auf.
-- Auth-Header/Secret kommen aus Vault/Edge-Env, NICHT inline im SQL.
select cron.schedule(
  'lbc-readiness-heartbeat',
  '*/5 * * * *',
  $$ select net.http_get(
       url := 'https://<ref>.functions.supabase.co/ready',
       headers := '{"x-monitor-source":"pg_cron"}'::jsonb
     ) $$
);
```

> Der Cron-Job verarbeitet das Ergebnis in einer kleinen Begleit-Function/Procedure und ruft bei `ok:false` den `alert(...)`-Versand (§7.3). Migration ist **additiv** mit Rollback-Pfad (`00NN_revert_monitoring_cron.sql`), CLAUDE.md-Verbot „keine Migration ohne Rollback" eingehalten.

---

## 9. Ausbaustufen (zukunftsdefinierend, nach Launch)

Bewusst **nicht** zum MVP — eingeplant für Skalierung 10→300→3000 (§0.7), je mit Kosten-/Nutzen-Abwägung:

- **Sentry (Error-Tracking) — `SENTRY_DSN`:** Frontend (`@sentry/react`) + Edge Functions (`@sentry/deno`) zur Exception-Aggregation, Release-Health und Performance-Spans. DSN ist konfig-frei deaktivierbar (leer = aus, kein Overhead). PII-Scrubbing **verbindlich** aktivieren (keine Namen/Kontakte/Tokens an Sentry). Erst sinnvoll mit realem Traffic.
- **Supabase Prometheus-Metrik-Endpunkt → Grafana Cloud:** der projektgebundene `…/privileged/metrics`-Endpunkt kann an **Grafana Cloud** (managed, kein Self-Host) angebunden werden — falls tiefere DB-Zeitreihen nötig werden. Bleibt managed; **kein** eigener Prometheus/Grafana-Container (Stack-Verbot).
- **Cloudflare Logpush → R2:** strukturierte Request-/Firewall-Logs für Forensik & langfristige Analyse, EU-Bucket, Aufbewahrung gemäß DSGVO-Frist.
- **Web-Vitals-RUM (eigenes, schlankes Beacon):** falls Cloudflare Web Analytics nicht reicht — anonymisiertes LCP/INP-Beacon an eine Edge Function, kein Drittanbieter-Tracker (Datensparsamkeit, kein Cookie-Consent-Zwang).
- **Öffentliche Status-Page:** vertrauensbildende Außenwirkung für Erzeuger/Käufer (premium, §0.6).
- **SLO-Formalisierung:** Verfügbarkeits-Ziel (z. B. 99,5 %/Monat) und Latenz-SLO als gemessene Größe + Error-Budget-Report. Sinnvoll ab realem Traffic, damit das Ziel auf Messung, nicht Vermutung, beruht.

---

## 10. Lokale & Live-Prüfanleitung

```bash
# --- Health-Endpunkte (öffentlich) ---
curl -s https://<ref>.functions.supabase.co/health           # erwartet: {"ok":true,...}
curl -s https://<ref>.functions.supabase.co/ready            # erwartet: {"ok":true,"db":"up",...}

# --- Geschützter Betreiber-Status (Token aus Edge-Env, NICHT VITE_) ---
curl -s https://<ref>.functions.supabase.co/status \
  -H "x-monitor-token: $MONITOR_TOKEN"                        # 200 mit Detail / 401 ohne Token

# --- Frontend erreichbar (Pages) ---
curl -sI https://lokalebauernconnect.de        | head -n 1   # erwartet: HTTP/2 200
curl -sI https://app.lokalebauernconnect.de    | head -n 1   # erwartet: HTTP/2 200

# --- Negativ-/Sicherheitsprüfung ---
curl -s -o /dev/null -w "%{http_code}\n" \
  https://<ref>.functions.supabase.co/status                 # erwartet: 401 (kein Token)
# Health-Antworten dürfen KEIN Secret/PII enthalten:
curl -s https://<ref>.functions.supabase.co/ready | grep -iE 'service_role|sk_live|email|telefon' \
  && echo "FEHLER: sensibler Inhalt im Health-Body" || echo "OK: kein sensibler Inhalt"
```

Erwartung: `health`/`ready` `200` und schlank; `status` `401` ohne Token, `200` mit Token; Pages `200`; **kein** Secret/PII in irgendeinem Health-Body. Ergänzend Cloudflare-, Supabase- und Stripe-Dashboards stichprobenhaft prüfen (Abschnitte 2/3/5).

---

## 11. Monitoring-Checkliste vor Go-Live (Phase 2 — stützt Gate B/E/F)

- [ ] `health`, `ready` deployt, öffentlich `200`, ohne DB-Zwang bzw. mit harmloser Lese-Probe (§1).
- [ ] `status`/`metrics-snapshot` tokengeschützt (`401` ohne Token), kein Secret/PII im Body (§1, §6, §10).
- [ ] 🔑 Externer Uptime-Dienst (oder Cloudflare Health Checks) auf Landing/App/`health`/`ready` aktiv (§4).
- [ ] 🔑 `ALERT_EMAIL` als Empfänger in **allen** Quellen gesetzt: eigene Cron-Checks, Cloudflare, Supabase, Stripe (§7.3).
- [ ] Cloudflare Notifications: WAF-Spike, Origin-Error, SSL/TLS-Ablauf → `ALERT_EMAIL` (§2, §7).
- [ ] Supabase Security-Advisor ohne offene RLS-Warnung (blockierend, Pfeiler 1) (§3.1).
- [ ] Stripe-Webhook-Alerts aktiv; `stripe_webhook.stale`-Check geplant (§5, §8) — erst ab WAVE_09 relevant.
- [ ] `pg_cron`-Heartbeat (`ready`/Webhook-Frische) deployt, additive Migration mit Rollback (§8).
- [ ] Edge-Function-Logs strukturiert, ohne PII/Secrets, Fehler immer mit Status (§3.2).
- [ ] Zero-State löst **keinen** Alarm aus (Pfeiler 2) — verifiziert mit leerem Tenant (§7.2).
- [ ] `docs/INCIDENT_RUNBOOK.md` verlinkt; Erstreaktions-Runbooks je Alarm vorhanden (§12).
- [ ] `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` aktualisiert.

---

## 12. Erstreaktions-Runbooks (Kurz)

> **Vollständige Incident-Abläufe, Eskalationspfade und Post-Incident-Reviews:** `docs/INCIDENT_RUNBOOK.md`. Die folgenden Kurzanleitungen dienen der schnellen Erstreaktion. DB-Wiederherstellung: `docs/BACKUP_DISASTER_RECOVERY.md`, PITR.

### AppDown / EdgeDown
1. `curl -sI` auf App/Landing + `…/functions/v1/health` — wer ist down (Pages vs. Edge)?
2. Cloudflare → **Pages → Deployments**: letzter Deploy fehlerhaft? → **Rollback** (DEPLOYMENT.md §10.1).
3. Cloudflare → Status/Incidents prüfen (Plattform-Ausfall?).
4. Wenn nur Edge: Supabase → **Edge Functions → Logs/Errors** der betroffenen Function.

### DbUnreachable
1. `…/functions/v1/ready` → `db:"down"` bestätigen.
2. Supabase → **Database → Reports**: Connections/Pool ausgelastet? Projekt pausiert/Maintenance?
3. **Logs Explorer** nach DB-Fehlern filtern (Korrelations-ID aus Edge-Log).
4. Migration ausstehend? `status.latest_migration` vs. erwarteter Stand prüfen.
5. Datenverlust-Verdacht: **kein** blindes Schreiben — PITR-Pfad (`BACKUP_DISASTER_RECOVERY.md`).

### StripeWebhookFailing
1. Stripe → Developers → **Webhooks**: Delivery-Fehler/Retries am Endpoint?
2. Supabase → **Edge Functions → `stripe-webhook` Logs**: Signaturfehler? Exception?
3. **Idempotenz prüfen** (`event.id`-Dedup) — kein Doppel-Verbuchen (SECURITY_OVERVIEW §8).
4. `STRIPE_WEBHOOK_SECRET` korrekt (Live ≠ Test)? Endpoint-URL aktuell?
5. Nichts manuell „nachbuchen" — Stripe ist die Wahrheit; Events ggf. aus Stripe re-deliveren.

### WafSpike / AuthBruteForce
1. Cloudflare → **Security → Events**: Quelle, Pfad, ausgelöste Rule.
2. Falsch-Positiv? Rule justieren. Echter Angriff? Rate-Limit/WAF verschärfen (SECURITY_OVERVIEW §3/§4).
3. Auth: Supabase → **Auth → Logs** auf fehlgeschlagene Logins; ggf. betroffene Konten prüfen.

### EdgeFnErrorRate / RlsAdvisorWarning
1. Supabase → **Edge Functions → Errors**: welche Function, welcher Statuscode?
2. Logs nach `outcome:"error"` + `request_id` (§3.2) korrelieren.
3. RLS-Advisor: **sofort** behandeln (Pfeiler 1, Isolations-Gate) — fehlende/zu offene Policy schließen, Isolationstest erneut grün (`docs/security/TENANT_ISOLATION_MODEL.md`).

---

> **Disclaimer (Vermittler):** Monitoring beobachtet ausschließlich die Vermittlungs-Infrastruktur (Verfügbarkeit, Latenz, Fehler, Sicherheit, Kosten) — **nicht** den Inhalt von Kaufverträgen zwischen Käufer und Erzeuger und **keine** personenbezogenen Reservierungs-/Zahlungsdaten. Geldwahrheit liegt bei Stripe, fachliche Nachvollziehbarkeit im `audit_log`. LokaleBauernConnect ist kein Verkäufer und keine Beratung. Siehe `docs/COMPLIANCE_MODEL.md` und `docs/security/SECURITY_OVERVIEW.md`.

*Letzte Aktualisierung: Phase 1 · WAVE_13 (Observability) · 2026-06-19*
*Zuständig: Claude (Gesamtstack) · Freigabe Owner-Schritte (🔑): Owner*
*Querverweise: `docs/DEPLOYMENT.md` · `docs/security/SECURITY_OVERVIEW.md` · `docs/INCIDENT_RUNBOOK.md` · `docs/BACKUP_DISASTER_RECOVERY.md` · `PHASEN.md` (WAVE_13)*
