# OCC — API Contract (Frontend ↔ Backend)

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`  
> Dieses Dokument beschreibt den exakten JSON-Contract zwischen OCC-Frontend und OCC-Backend.  
> Backend-Verantwortung: Warp. Frontend-Verantwortung: Claude.

---

## Allgemeine Konventionen

### Base-URL
Alle OCC-Endpunkte liegen unter:
```
/api/owner-control/
```

### Response-Envelope (PFLICHT für alle OCC-Endpoints)

**Erfolg:**
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

**Fehler:**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Menschenlesbare Fehlerbeschreibung"
  }
}
```

Das Frontend (`occApi`) erwartet dieses Envelope bei ALLEN Responses. Kein Envelope = Parse-Error im Client.

### HTTP-Status-Codes

| Code | Bedeutung |
|---|---|
| 200 | Erfolg (auch bei Pagination) |
| 201 | Ressource erstellt |
| 400 | Ungültige Anfrage (Validierungsfehler) |
| 401 | Nicht eingeloggt → Frontend zeigt `UnauthorizedView` |
| 403 | Eingeloggt, aber kein OCC-Zugang → Frontend zeigt `ForbiddenView` |
| 404 | Ressource nicht gefunden |
| 422 | Semantischer Fehler (Business-Logik) |
| 429 | Rate-Limit |
| 500 | Server-Fehler |

### CSRF

Das Frontend holt einmalig den CSRF-Token von `/api/csrf-token` und cached ihn:
```
GET /api/csrf-token → { "token": "..." }
```

Bei mutatierenden Requests (POST/PATCH/DELETE) wird er als Header mitgeschickt:
```
x-csrf-token: <token>
```

Warp MUSS diesen Token bei mutierenden OCC-Endpoints validieren.

### Pagination

Paginierte Endpoints geben zurück:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 247,
    "page": 1,
    "per_page": 30
  }
}
```

Query-Parameter: `?page=1&per_page=30`

---

## Endpunkt-Spezifikationen

---

### GET /api/owner-control/bootstrap

Der kritischste Endpoint — wird beim Start der App genau einmal aufgerufen.

**Response:**
```json
{
  "success": true,
  "data": {
    "identity": {
      "user_id": "uuid",
      "display_name": "Dennis Stegemann",
      "email": "owner@tempconnect.de",
      "role": "owner",
      "step_up_required": false,
      "last_seen_at": "2026-05-20T10:00:00Z"
    },
    "allowed_modules": [
      { "key": "executive",            "allowed": true },
      { "key": "decisions-requests",   "allowed": true },
      { "key": "revenue",              "allowed": true },
      { "key": "platform",             "allowed": true },
      { "key": "operations",           "allowed": true },
      { "key": "support-oversight",    "allowed": true },
      { "key": "risk",                 "allowed": true },
      { "key": "audit",                "allowed": true },
      { "key": "infrastructure",       "allowed": true },
      { "key": "data-explorer",        "allowed": true },
      { "key": "automation-runbooks",  "allowed": true }
    ],
    "allowed_actions": [
      { "key": "decisions.decide" },
      { "key": "decisions.triage" },
      { "key": "decisions.close" },
      { "key": "decisions.assign" },
      { "key": "warp.execute" },
      { "key": "automation.trigger" }
    ],
    "feature_flags": {
      "occ_enabled": true,
      "infra_actions_enabled": true,
      "warp_execution_enabled": true,
      "runbook_execution_enabled": true,
      "high_risk_actions_enabled": true,
      "external_support_enabled": true,
      "commercial_activation_enabled": true,
      "data_explorer_enabled": true
    },
    "executive_summary": {
      "active_users_30d": 1247,
      "active_orgs": 89,
      "mrr_eur": 18450.00,
      "open_decisions": 3,
      "open_support_escalations": 1
    },
    "critical_signals": [
      {
        "level": "critical",
        "message": "DB-Replikationsverzögerung > 2s",
        "area": "infrastructure",
        "link": "/owner-control/infrastructure"
      }
    ],
    "system_status": "healthy",
    "last_audit_at": "2026-05-20T09:45:00Z",
    "open_requests_count": 3
  }
}
```

**Fehler-Verhalten:**
- `401` → `UnauthorizedView`
- `403` → `ForbiddenView`
- `feature_flags.occ_enabled: false` → `OccDisabledView`
- `identity.step_up_required: true` → `StepUpRequiredView`

---

### GET /api/owner-control/executive/summary

Detailliertere Executive-KPIs, optional gegenüber Bootstrap-Summary.

**Response `data`:**
```json
{
  "active_users_30d": 1247,
  "active_orgs": 89,
  "mrr_eur": 18450.00,
  "open_decisions": 3,
  "open_support_escalations": 1,
  "churn_rate_30d": 0.018,
  "new_signups_30d": 84,
  "conversion_rate": 0.12
}
```

---

### GET /api/owner-control/decisions-requests

**Query-Parameter:**
- `page` (int, default: 1)
- `per_page` (int, default: 30)
- `type` (string: `commercial | feature | approval | operational | support`)
- `status` (string: `open | in_review | decided | closed`)
- `priority` (string: `critical | high | medium | low`)
- `risk_level` (string: `critical | high | medium | low | info`)
- `search` (string)

**Response `data`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "commercial",
      "title": "Enterprise-Anfrage: Acme GmbH",
      "description": "Kunde möchte Custom-Pricing für 50 Seats",
      "status": "open",
      "priority": "high",
      "risk_level": "medium",
      "created_at": "2026-05-19T14:30:00Z",
      "updated_at": "2026-05-20T08:00:00Z",
      "assigned_to": null,
      "decided_by": null,
      "decided_at": null,
      "context": {
        "commercial": {
          "org_id": "uuid",
          "org_name": "Acme GmbH",
          "requested_plan": "enterprise",
          "requested_price_eur": 2400,
          "current_plan": "professional",
          "seats": 50
        }
      }
    }
  ],
  "total": 12,
  "page": 1,
  "per_page": 30
}
```

**Context-Typen je `type`:**

| `type` | `context`-Felder |
|---|---|
| `commercial` | `org_id`, `org_name`, `requested_plan`, `requested_price_eur`, `current_plan`, `seats` |
| `feature` | `feature_key`, `requested_by_org`, `description`, `impact` |
| `approval` | `action`, `target`, `risk_note` |
| `operational` | `service`, `impact`, `proposed_action`, `rollback_plan` |
| `support` | `case_id`, `case_number`, `escalation_reason`, `affected_org` |

---

### POST /api/owner-control/decisions-requests/decide

**Request Body:**
```json
{
  "request_id": "uuid",
  "decision": "approve",
  "reason": "Strategisch sinnvoll, Preis akzeptiert.",
  "notes": "optional"
}
```

`decision`: `approve | reject | defer`

**Response `data`:**
```json
{ "id": "uuid", "status": "decided", "decided_at": "2026-05-20T10:05:00Z" }
```

**Audit-Event:** `owner_control.decision.decided` mit actor, request_id, decision, reason.

---

### POST /api/owner-control/decisions-requests/triage

```json
{
  "request_id": "uuid",
  "priority": "critical",
  "risk_level": "high",
  "reason": "Zeitkritisch, eskaliere zu critical."
}
```

---

### POST /api/owner-control/decisions-requests/close

```json
{
  "request_id": "uuid",
  "reason": "Nicht mehr relevant nach Kundengespräch."
}
```

---

### POST /api/owner-control/decisions-requests/assign

```json
{
  "request_id": "uuid",
  "assigned_to": "user_id",
  "reason": "Zugewiesen an operatives Team."
}
```

---

### GET /api/owner-control/revenue/summary

```json
{
  "mrr_eur": 18450.00,
  "arr_eur": 221400.00,
  "churn_rate_30d": 0.018,
  "new_mrr_30d": 1200.00,
  "lost_mrr_30d": 250.00,
  "plan_breakdown": [
    { "plan": "starter",      "count": 45, "mrr_eur": 2250.00 },
    { "plan": "professional", "count": 32, "mrr_eur": 9600.00 },
    { "plan": "enterprise",   "count": 8,  "mrr_eur": 6400.00 },
    { "plan": "trial",        "count": 24, "mrr_eur": 0 }
  ],
  "at_risk_mrr_eur": 1400.00,
  "overdue_invoices_count": 3,
  "overdue_invoices_eur": 680.00
}
```

---

### GET /api/owner-control/revenue/billing

**Query:** `?search=&status=&page=1&per_page=30`

**Response `data.items`:**
```json
[
  {
    "id": "uuid",
    "org_name": "Acme GmbH",
    "plan": "professional",
    "status": "active",
    "amount_eur": 300.00,
    "billing_cycle": "monthly",
    "next_billing_at": "2026-06-01T00:00:00Z",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

---

### GET /api/owner-control/revenue/invoices

**Query:** `?status=&page=1&per_page=30`

**Response `data.items`:**
```json
[
  {
    "id": "uuid",
    "invoice_number": "INV-2026-0084",
    "org_name": "Musterfirma GmbH",
    "amount_eur": 300.00,
    "status": "paid",
    "issued_at": "2026-05-01T00:00:00Z",
    "due_at": "2026-05-15T00:00:00Z",
    "paid_at": "2026-05-12T00:00:00Z"
  }
]
```

---

### GET /api/owner-control/revenue/offers-mirror

Gespiegelte Ansicht der Commercial Offers (read-only, keine Mutation hier).

```json
{
  "items": [
    {
      "id": "uuid",
      "org_name": "Acme GmbH",
      "offered_plan": "enterprise",
      "offered_price_eur": 2400,
      "status": "pending",
      "created_at": "2026-05-18T12:00:00Z",
      "expires_at": "2026-05-25T12:00:00Z"
    }
  ]
}
```

---

### GET /api/owner-control/platform/summary

```json
{
  "total_users": 3840,
  "active_users_30d": 1247,
  "new_users_30d": 84,
  "total_orgs": 219,
  "active_orgs": 89,
  "new_orgs_30d": 12,
  "plan_distribution": [
    { "plan": "starter",      "user_count": 45 },
    { "plan": "professional", "user_count": 32 },
    { "plan": "enterprise",   "user_count": 8 },
    { "plan": "trial",        "user_count": 24 }
  ],
  "signup_trend_7d": [
    { "date": "2026-05-14", "count": 9 },
    { "date": "2026-05-15", "count": 11 },
    { "date": "2026-05-16", "count": 14 }
  ]
}
```

---

### GET /api/owner-control/operations/health

```json
{
  "overall": "healthy",
  "services": [
    { "name": "API",         "status": "healthy", "latency_ms": 42,   "error_rate": 0.001 },
    { "name": "Database",    "status": "healthy", "latency_ms": 8,    "error_rate": 0 },
    { "name": "Redis",       "status": "healthy", "latency_ms": 1,    "error_rate": 0 },
    { "name": "Email",       "status": "degraded","latency_ms": 1200, "error_rate": 0.05 },
    { "name": "JobQueue",    "status": "healthy", "latency_ms": null,  "error_rate": 0 }
  ],
  "checked_at": "2026-05-20T10:00:00Z"
}
```

---

### GET /api/owner-control/support/escalations

```json
{
  "items": [
    {
      "id": "uuid",
      "case_number": "TMP-00842",
      "subject": "Zahlungsabgleich fehlgeschlagen",
      "org_name": "Musterfirma GmbH",
      "priority": "high",
      "escalated_at": "2026-05-20T07:00:00Z",
      "assigned_to": "Support-Team",
      "sla_breach_at": "2026-05-20T12:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /api/owner-control/support/sla

```json
{
  "compliance_rate_30d": 0.94,
  "breached_count_30d": 8,
  "at_risk_count": 3,
  "avg_first_response_minutes": 42,
  "avg_resolution_hours": 18
}
```

---

### GET /api/owner-control/support/metrics

```json
{
  "open_cases": 24,
  "closed_today": 7,
  "queue_breakdown": [
    { "queue": "Billing", "open": 4, "overdue": 1 },
    { "queue": "Tech",    "open": 12,"overdue": 0 },
    { "queue": "Account", "open": 8, "overdue": 2 }
  ]
}
```

---

### GET /api/owner-control/risk/signals

```json
{
  "items": [
    {
      "id": "uuid",
      "level": "critical",
      "area": "infrastructure",
      "title": "DB-Replikationsverzögerung",
      "description": "Replikationsverzögerung liegt bei 3.2s (Schwellwert: 2s)",
      "first_seen": "2026-05-20T09:00:00Z",
      "last_seen": "2026-05-20T10:00:00Z",
      "count": 12,
      "auto_resolved": false
    }
  ],
  "total": 1
}
```

---

### GET /api/owner-control/risk/drift

```json
{
  "metrics": [
    {
      "name": "api_error_rate",
      "current": 0.045,
      "baseline": 0.01,
      "threshold": 0.05,
      "status": "warning",
      "unit": "rate"
    },
    {
      "name": "db_query_p95_ms",
      "current": 120,
      "baseline": 80,
      "threshold": 200,
      "status": "ok",
      "unit": "ms"
    }
  ]
}
```

---

### GET /api/owner-control/risk/compliance

```json
{
  "items": [
    {
      "id": "uuid",
      "category": "DSGVO",
      "title": "Datenschutzerklärung veraltet",
      "description": "Letzte Aktualisierung > 12 Monate",
      "severity": "medium",
      "due_date": "2026-06-01",
      "status": "open",
      "owner": "Legal"
    }
  ]
}
```

---

### GET /api/owner-control/audit/feed

**Query:** `?actor=&action=&risk_level=&from=&to=&page=1&per_page=50`

```json
{
  "items": [
    {
      "id": "uuid",
      "namespace": "owner_control",
      "action": "decision.decided",
      "actor_id": "uuid",
      "actor_display": "Dennis Stegemann",
      "entity_type": "request",
      "entity_id": "uuid",
      "risk_level": "high",
      "reason": "Strategisch sinnvoll",
      "metadata": { "decision": "approve", "request_type": "commercial" },
      "created_at": "2026-05-20T10:05:00Z"
    }
  ],
  "total": 847,
  "page": 1,
  "per_page": 50
}
```

---

### GET /api/owner-control/infrastructure/status

```json
{
  "database": { "status": "healthy", "replica_lag_ms": 120, "connections": 24 },
  "redis":    { "status": "healthy", "used_memory_mb": 180 },
  "api":      { "status": "healthy", "uptime_s": 604800, "version": "2.4.1" },
  "docker":   { "status": "healthy", "running_containers": 8, "unhealthy": 0 }
}
```

---

### GET /api/owner-control/infrastructure/hetzner

Aggregierte Hetzner-Übersicht (alle Sub-Ressourcen in einem Response).

```json
{
  "hosts": [...],
  "docker_services": [...],
  "network": {...},
  "storage": {...},
  "backups": {...},
  "last_deployment": {...}
}
```

Für Sub-Ressourcen: einzelne Endpoints wie `/hetzner/hosts`, `/hetzner/docker`, etc.

---

### GET /api/owner-control/warp/runbooks

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "DB Vacuum & Analyze",
      "category": "database",
      "risk_level": "low",
      "description": "Führt VACUUM ANALYZE auf allen großen Tabellen aus",
      "steps": ["vacuum analyze users", "vacuum analyze organizations", "vacuum analyze subscriptions"],
      "preconditions": ["DB erreichbar", "< 100 aktive Transaktionen"],
      "requires_confirm": false,
      "estimated_duration_s": 120
    }
  ]
}
```

---

### POST /api/owner-control/warp/execute

```json
{
  "runbook_id": "uuid",
  "host": "hetzner-prod-01",
  "dry_run": false,
  "reason": "Routine-Maintenance nach Deployment"
}
```

**Response:**
```json
{
  "execution_id": "uuid",
  "status": "running",
  "started_at": "2026-05-20T10:10:00Z"
}
```

---

### POST /api/owner-control/warp/dry-run

Identisch zu `/execute`, aber `dry_run` wird intern auf `true` gesetzt.

---

### GET /api/owner-control/data-explorer/users

**Query:** `?search=&page=1&per_page=30`

```json
{
  "items": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "company_name": "Beispiel GmbH",
      "created_at": "2025-01-15T10:00:00Z",
      "last_login_at": "2026-05-19T08:30:00Z",
      "status": "active",
      "plan": "professional",
      "org_count": 2
    }
  ],
  "total": 3840
}
```

**WICHTIG:** Die E-Mail wird serverseitig so geliefert wie oben. Das Frontend maskiert sie selbst:  
`●●●●@example.com` — das Backend muss die Domain liefern, Frontend baut die Maskierung.

---

### GET /api/owner-control/data-explorer/integrity-checks

```json
{
  "items": [
    {
      "id": "orphaned_orgs",
      "title": "Verwaiste Organisationen",
      "description": "Organisationen ohne gültigen Owner-User",
      "status": "passed",
      "severity": "high",
      "affected_count": 0,
      "last_run": "2026-05-20T08:00:00Z",
      "details": null
    }
  ]
}
```

---

## Fehler-Codes (standardisiert)

| Code | Bedeutung |
|---|---|
| `UNAUTHORIZED` | Nicht eingeloggt |
| `FORBIDDEN` | Kein OCC-Zugang |
| `NOT_FOUND` | Ressource nicht gefunden |
| `VALIDATION_ERROR` | Pflichtfeld fehlt oder ungültig |
| `REASON_REQUIRED` | `reason` fehlt bei mutatierender Aktion |
| `STEP_UP_REQUIRED` | Zusätzliche Auth erforderlich |
| `FEATURE_DISABLED` | Feature-Flag ist false |
| `CONFLICT` | State-Konflikt (z.B. Request bereits entschieden) |
| `INTERNAL_ERROR` | Unerwarteter Server-Fehler |

---

## Step-Up Flow

```
POST /api/owner-control/step-up/initiate
→ Initiiert Step-Up-Auth (E-Mail-Token, TOTP, etc.)
→ Frontend zeigt "Bereits verifiziert – neu laden" Button

Nach erfolgreicher Verifizierung:
GET /api/owner-control/bootstrap  → identity.step_up_required: false
```
