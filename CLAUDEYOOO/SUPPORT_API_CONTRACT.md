# SOC — API Contract (Frontend ↔ Backend)

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`  
> Alle SOC-Endpunkte liegen unter `/api/support/`

---

## Allgemeine Konventionen

### Unterschied zu OCC

**SOC erwartet KEIN Response-Envelope.** Direktes JSON-Objekt als Response:

```json
{
  "identity": { ... },
  "queues": [ ... ]
}
```

Fehler als HTTP-Status + JSON:
```json
{
  "code": "FORBIDDEN",
  "message": "Kein Support-Agent-Zugang"
}
```

### HTTP-Status-Codes

| Code | Bedeutung |
|---|---|
| 200 | Erfolg |
| 201 | Erstellt |
| 400 | Validierungsfehler |
| 401 | Nicht eingeloggt |
| 403 | Kein Support-Zugang / Data-Scope-Verletzung |
| 404 | Not found |
| 422 | Business-Logik-Fehler |

---

## Endpunkt-Spezifikationen

---

### GET /api/support/bootstrap

Der kritischste SOC-Endpoint.

**Response:**
```json
{
  "identity": {
    "agent_id": "uuid",
    "user_id": "uuid",
    "display_name": "Anna Müller",
    "role": "agent",
    "scope": "internal",
    "data_scope": "all_cases",
    "vendor_id": null,
    "queue_assignments": ["Billing", "Tech"],
    "allowed_actions": [
      "case.assign",
      "case.close",
      "case.note.add",
      "escalation.create",
      "user_lookup",
      "org_lookup"
    ],
    "masking_rules": {
      "user_email": "domain_only",
      "user_phone": "hidden",
      "user_name": "initials_only"
    }
  },
  "queues": [
    {
      "id": "uuid",
      "name": "Billing",
      "open_count": 8,
      "overdue_count": 2,
      "my_assigned_count": 3
    }
  ],
  "sla_summary": {
    "compliance_rate_7d": 0.92,
    "breached_count_7d": 4,
    "at_risk_count": 2
  },
  "features": {
    "user_lookup": true,
    "org_lookup": true,
    "supervisor_view": false,
    "quality_metrics": false,
    "audit_view": false,
    "knowledge_base": true
  }
}
```

**Scope-Werte:**
- `internal` — interner TempConnect-Support-Agent
- `external` — BPO/Callcenter-Agent (eingeschränkte Sicht)

**Data-Scope-Werte:**
- `all_cases` — sieht alle Cases (interne Agenten)
- `assigned_only` — sieht nur eigene/Queue-zugewiesene Cases (externe Agenten)

---

### GET /api/support/cases

**Query:** `?status=&priority=&queue=&assigned_to_me=true&search=&page=1&per_page=30`

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "case_number": "TMP-00842",
      "subject": "Zahlungsabgleich fehlgeschlagen",
      "status": "open",
      "priority": "high",
      "type": "billing",
      "queue": "Billing",
      "assigned_to": {
        "agent_id": "uuid",
        "display_name": "Anna M."
      },
      "org_name": "Musterfirma GmbH",
      "created_at": "2026-05-19T10:00:00Z",
      "updated_at": "2026-05-20T08:00:00Z",
      "sla_deadline": "2026-05-20T18:00:00Z",
      "is_overdue": false,
      "unread_notes": 2
    }
  ],
  "total": 24,
  "page": 1,
  "per_page": 30
}
```

**Status-Werte:** `open | in_progress | pending_customer | resolved | closed`  
**Priority-Werte:** `critical | high | medium | low`

---

### GET /api/support/cases/:id

```json
{
  "id": "uuid",
  "case_number": "TMP-00842",
  "subject": "Zahlungsabgleich fehlgeschlagen",
  "description": "Kunde berichtet, dass Zahlung abgebucht aber Subscription nicht aktiviert...",
  "status": "open",
  "priority": "high",
  "type": "billing",
  "queue": "Billing",
  "assigned_to": { "agent_id": "uuid", "display_name": "Anna M." },
  "org": {
    "id": "uuid",
    "name": "Musterfirma GmbH",
    "plan": "professional"
  },
  "user": {
    "id": "uuid",
    "display": "●●●●@musterfirma.de",
    "masked_name": "M. S."
  },
  "sla_deadline": "2026-05-20T18:00:00Z",
  "is_overdue": false,
  "created_at": "2026-05-19T10:00:00Z",
  "updated_at": "2026-05-20T08:00:00Z",
  "notes": [
    {
      "id": "uuid",
      "note_type": "internal",
      "body": "Habe Billing-Team kontaktiert",
      "author": { "agent_id": "uuid", "display_name": "Anna M." },
      "created_at": "2026-05-19T14:00:00Z"
    }
  ],
  "timeline": [
    {
      "id": "uuid",
      "event": "case_created",
      "actor": "System",
      "detail": "Case erstellt via Web-Form",
      "created_at": "2026-05-19T10:00:00Z"
    },
    {
      "id": "uuid",
      "event": "assigned",
      "actor": "Anna M.",
      "detail": "Zugewiesen an Queue: Billing",
      "created_at": "2026-05-19T10:05:00Z"
    }
  ]
}
```

---

### POST /api/support/cases/:id/action

**Aktionen:**

```json
// Note hinzufügen
{ "action": "add_note", "note_type": "internal", "body": "Habe Billing-Team kontaktiert" }

// Status ändern
{ "action": "update_status", "status": "in_progress" }

// Priorität ändern
{ "action": "update_priority", "priority": "critical" }

// Zuweisen
{ "action": "assign", "agent_id": "uuid" }

// Queue wechseln
{ "action": "move_queue", "queue_id": "uuid" }

// Schließen
{ "action": "close", "resolution": "Billing-Team hat Subscription manuell aktiviert" }

// Eskalieren (→ OCC)
{ "action": "escalate", "target": "occ", "reason": "Kritische Zahlungsanomalie" }
```

**Response:**
```json
{
  "case_id": "uuid",
  "action": "add_note",
  "applied_at": "2026-05-20T10:00:00Z"
}
```

---

### GET /api/support/lookup/users

**Query:** `?search=<domain oder Firmenname>&page=1&per_page=20`

**Wichtig:** Masking passiert serverseitig je `agent.masking_rules`.

```json
{
  "items": [
    {
      "id": "uuid",
      "display_email": "●●●●@musterfirma.de",
      "company_name": "Musterfirma GmbH",
      "plan": "professional",
      "status": "active",
      "org_count": 2,
      "created_at": "2025-01-01T00:00:00Z",
      "last_login_at": "2026-05-18T09:00:00Z"
    }
  ],
  "total": 3
}
```

---

### GET /api/support/lookup/orgs

**Query:** `?search=<Organisationsname>&page=1&per_page=20`

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Musterfirma GmbH",
      "plan": "professional",
      "status": "active",
      "member_count": 12,
      "open_cases": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /api/support/escalations

```json
{
  "items": [
    {
      "id": "uuid",
      "case_number": "TMP-00842",
      "target": "occ",
      "reason": "Kritische Zahlungsanomalie über 10k€",
      "status": "open",
      "created_by": { "agent_id": "uuid", "display_name": "Anna M." },
      "created_at": "2026-05-20T09:00:00Z",
      "resolved_at": null
    }
  ],
  "total": 3
}
```

---

### POST /api/support/escalations

```json
{
  "case_id": "uuid",
  "target": "occ",
  "reason": "Zahlungsanomalie kritisch, manuelle Prüfung erforderlich"
}
```

`target`-Werte: `occ | commercial | ops | billing`

---

### GET /api/support/knowledge

**Query:** `?category=&search=&page=1&per_page=30`

```json
{
  "categories": [
    { "id": "uuid", "name": "Billing", "article_count": 12 },
    { "id": "uuid", "name": "Technisch", "article_count": 8 }
  ],
  "items": [
    {
      "id": "uuid",
      "category": "Billing",
      "title": "Zahlungsabgleich manuell starten",
      "body": "1. Öffne Admin → Billing...",
      "tags": ["billing", "payment", "manual"],
      "allowed_roles": ["agent", "supervisor"],
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ],
  "total": 20
}
```

---

### GET /api/support/quality/metrics

**Nur wenn `features.quality_metrics = true`**

```json
{
  "period": "30d",
  "resolved_cases": 124,
  "avg_resolution_hours": 18.4,
  "first_contact_resolution_rate": 0.68,
  "customer_satisfaction_score": 4.3,
  "sla_compliance_rate": 0.94
}
```

---

### GET /api/support/quality/agents

**Nur wenn `features.quality_metrics = true` UND `features.supervisor_view = true`**

```json
{
  "items": [
    {
      "agent_id": "uuid",
      "display_name": "Anna M.",
      "open_cases": 12,
      "resolved_30d": 34,
      "avg_resolution_hours": 14.2,
      "overdue_cases": 2,
      "online": true
    }
  ]
}
```

---

### GET /api/support/quality/sla

```json
{
  "compliance_rate_30d": 0.94,
  "breached_30d": 8,
  "at_risk": 3,
  "by_queue": [
    { "queue": "Billing", "compliance": 0.91, "breached": 4 },
    { "queue": "Tech",    "compliance": 0.98, "breached": 2 }
  ]
}
```

---

### GET /api/support/audit

**Nur wenn `features.audit_view = true`**

**Query:** `?page=1&per_page=50`

```json
{
  "items": [
    {
      "id": "uuid",
      "action": "case.note.added",
      "actor": "Anna M.",
      "entity_type": "case",
      "entity_id": "TMP-00842",
      "created_at": "2026-05-20T10:00:00Z",
      "detail": "Interne Notiz hinzugefügt"
    }
  ],
  "total": 420
}
```

---

### GET /api/support/supervisor/overview

**Nur wenn `features.supervisor_view = true`**

```json
{
  "total_agents_online": 4,
  "total_open_cases": 24,
  "overdue_cases": 3,
  "queue_health": [
    {
      "queue": "Billing",
      "open": 8,
      "overdue": 2,
      "assigned_agents": 2,
      "oldest_open_hours": 6.5
    }
  ]
}
```

---

### GET /api/support/supervisor/agents

**Nur wenn `features.supervisor_view = true`**

Identisch zu `/quality/agents` aber mit zusätzlichem `online`-Status und `last_action_at`.
