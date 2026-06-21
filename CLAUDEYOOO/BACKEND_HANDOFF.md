# OCC — Backend Handoff (für Warp)

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`  
> Dieses Dokument ist Warps To-Do-Liste. Das Frontend ist fertig. Es wartet auf dich.

---

## Überblick: Was das Frontend erwartet

Das OCC-Frontend (React 18 + Vite, TypeScript strict) ist vollständig implementiert.
Es läuft unter `/owner-control/` und ruft alle Endpunkte unter `/api/owner-control/` auf.

**Das Frontend macht NICHTS ohne Backend.** Es zeigt sofort einen Fehler-State wenn Bootstrap nicht antwortet.

---

## Kritischer Pfad (Reihenfolge beachten)

### Schritt 1 — DB-Migrationen

```sql
-- Migration 108: OCC Access
CREATE TABLE owner_control_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'owner',
  granted_by  UUID REFERENCES users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,
  reason      TEXT,
  UNIQUE (user_id)
);

CREATE INDEX idx_oca_user_id ON owner_control_access(user_id);
CREATE INDEX idx_oca_revoked ON owner_control_access(revoked_at) WHERE revoked_at IS NULL;
```

### Schritt 2 — Middleware

```javascript
// api/middleware/requireOwnerControlAccess.js
async function requireOwnerControlAccess(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Nicht eingeloggt' } });
  }

  const access = await db.query(
    'SELECT id, role FROM owner_control_access WHERE user_id = $1 AND revoked_at IS NULL',
    [req.session.userId]
  );

  if (access.rows.length === 0) {
    return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Kein OCC-Zugang' } });
  }

  req.occRole = access.rows[0].role;
  next();
}
```

Diese Middleware **vor ALLEN** `/api/owner-control/**` Routen registrieren.

### Schritt 3 — Bootstrap-Endpoint

```javascript
// GET /api/owner-control/bootstrap
router.get('/bootstrap', requireOwnerControlAccess, async (req, res) => {
  const user = await getUserById(req.session.userId);
  const featureFlags = await getFeatureFlags();
  const executiveSummary = await getExecutiveSummary();
  const criticalSignals = await getCriticalSignals();

  res.json({
    success: true,
    data: {
      identity: {
        user_id: user.id,
        display_name: user.display_name,
        email: user.email,
        role: req.occRole,
        step_up_required: false,
        last_seen_at: new Date().toISOString()
      },
      allowed_modules: ALL_MODULES,  // alle auf true, RBAC kommt später
      allowed_actions: ALL_ACTIONS,
      feature_flags: featureFlags,
      executive_summary: executiveSummary,
      critical_signals: criticalSignals,
      system_status: 'healthy',
      last_audit_at: null,
      open_requests_count: 0
    }
  });
});
```

### Schritt 4 — Feature Flags aus ENV

```javascript
// api/config/featureFlags.js
function getFeatureFlags() {
  return {
    occ_enabled:                 process.env.OCC_ENABLED !== 'false',
    infra_actions_enabled:       process.env.OCC_INFRA_ACTIONS_ENABLED === 'true',
    warp_execution_enabled:      process.env.OCC_WARP_EXECUTION_ENABLED === 'true',
    runbook_execution_enabled:   process.env.OCC_RUNBOOK_EXECUTION_ENABLED === 'true',
    high_risk_actions_enabled:   process.env.OCC_HIGH_RISK_ACTIONS_ENABLED === 'true',
    external_support_enabled:    process.env.OCC_EXTERNAL_SUPPORT_ENABLED === 'true',
    commercial_activation_enabled: process.env.OCC_COMMERCIAL_ACTIVATION_ENABLED === 'true',
    data_explorer_enabled:       process.env.OCC_DATA_EXPLORER_ENABLED === 'true',
  };
}
```

---

## Router-Registrierung

```javascript
// api/app.js
const occRouter = require('./routes/ownerControl');
app.use('/api/owner-control', occRouter);
```

---

## Vollständige Endpoint-Liste

### Pflicht (Frontend blockiert ohne diese)

| Methode | Pfad | Priorität |
|---|---|---|
| GET | `/api/owner-control/bootstrap` | **KRITISCH** |
| GET | `/api/owner-control/executive/summary` | hoch |
| GET | `/api/owner-control/decisions-requests` | hoch |
| GET | `/api/owner-control/revenue/summary` | hoch |
| GET | `/api/owner-control/operations/health` | hoch |
| GET | `/api/owner-control/risk/signals` | hoch |
| GET | `/api/owner-control/audit/feed` | hoch |

### Decisions & Requests — Aktionen (alle mit Audit-Event)

| Methode | Pfad | Audit-Event |
|---|---|---|
| GET | `/decisions-requests` | — |
| GET | `/decisions-requests/:id` | — |
| POST | `/decisions-requests/decide` | `owner_control.decision.decided` |
| POST | `/decisions-requests/triage` | `owner_control.decision.triaged` |
| POST | `/decisions-requests/close` | `owner_control.decision.closed` |
| POST | `/decisions-requests/assign` | `owner_control.decision.assigned` |

### Commercial

| Methode | Pfad | Audit-Event |
|---|---|---|
| GET | `/commercial/offers` | — |
| GET | `/commercial/offers/:id` | — |
| POST | `/commercial/offers/approve` | `owner_control.commercial.approved` |
| POST | `/commercial/offers/reject` | `owner_control.commercial.rejected` |
| POST | `/commercial/offers/propose` | `owner_control.commercial.proposed` |

### Revenue

| Methode | Pfad |
|---|---|
| GET | `/revenue/summary` |
| GET | `/revenue/billing` |
| GET | `/revenue/invoices` |
| GET | `/revenue/offers-mirror` |

### Platform, Operations, Support

| Methode | Pfad |
|---|---|
| GET | `/platform/summary` |
| GET | `/operations/health` |
| GET | `/support/escalations` |
| GET | `/support/sla` |
| GET | `/support/metrics` |

### Risk & Audit

| Methode | Pfad |
|---|---|
| GET | `/risk/signals` |
| GET | `/risk/drift` |
| GET | `/risk/compliance` |
| GET | `/audit/feed` |
| GET | `/audit/:id` |

### Infrastructure

| Methode | Pfad | Kill-Switch |
|---|---|---|
| GET | `/infrastructure/status` | — |
| GET | `/infrastructure/hetzner` | — |
| GET | `/infrastructure/hetzner/hosts` | — |
| GET | `/infrastructure/hetzner/docker` | — |
| GET | `/infrastructure/hetzner/network` | — |
| GET | `/infrastructure/hetzner/storage` | — |
| GET | `/infrastructure/hetzner/backups` | — |
| GET | `/infrastructure/hetzner/deployments` | — |
| GET | `/warp/hosts` | `OCC_WARP_EXECUTION_ENABLED` |
| GET | `/warp/runbooks` | `OCC_WARP_EXECUTION_ENABLED` |
| GET | `/warp/runbooks/:id` | `OCC_WARP_EXECUTION_ENABLED` |
| POST | `/warp/execute` | `OCC_WARP_EXECUTION_ENABLED` + `OCC_INFRA_ACTIONS_ENABLED` |
| POST | `/warp/dry-run` | `OCC_WARP_EXECUTION_ENABLED` |
| GET | `/warp/history` | — |
| GET | `/warp/command-registry` | — |

### Automation

| Methode | Pfad | Kill-Switch |
|---|---|---|
| GET | `/automation/jobs` | — |
| GET | `/automation/jobs/:id` | — |
| POST | `/automation/trigger` | `OCC_RUNBOOK_EXECUTION_ENABLED` |
| GET | `/automation/history` | — |
| GET | `/automation/schedules` | — |

### Data Explorer

| Methode | Pfad | Kill-Switch |
|---|---|---|
| GET | `/data-explorer/users` | `OCC_DATA_EXPLORER_ENABLED` |
| GET | `/data-explorer/organizations` | `OCC_DATA_EXPLORER_ENABLED` |
| GET | `/data-explorer/requests` | `OCC_DATA_EXPLORER_ENABLED` |
| GET | `/data-explorer/subscriptions` | `OCC_DATA_EXPLORER_ENABLED` |
| GET | `/data-explorer/invoices` | `OCC_DATA_EXPLORER_ENABLED` |
| GET | `/data-explorer/audit` | `OCC_DATA_EXPLORER_ENABLED` |
| GET | `/data-explorer/integrity-checks` | `OCC_DATA_EXPLORER_ENABLED` |

---

## Audit-Events Namespace

Alle OCC-Aktionen MÜSSEN in die Audit-Tabelle geschrieben werden:

```javascript
await db.query(`
  INSERT INTO audit_log
    (namespace, action, actor_id, entity_type, entity_id, risk_level, reason, metadata)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`, [
  'owner_control',
  'decision.decided',
  req.session.userId,
  'request',
  requestId,
  'high',
  req.body.reason,
  { decision: req.body.decision }
]);
```

---

## CLI Scripts (Owner-Management)

```bash
# Owner anlegen
npm run occ:grant-owner -- --email owner@tempconnect.de --reason "Initial owner setup"

# Owner entziehen
npm run occ:revoke-owner -- --email owner@tempconnect.de --reason "Kompromittiert"

# Alle Owner auflisten
npm run occ:list-owners
```

---

## Nginx-Konfiguration

```nginx
# Owner Control Center SPA
location /owner-control/ {
    alias /app/frontend/owner-control/;
    try_files $uri $uri/ /owner-control/index.html;
    
    # Kein Cache für index.html
    location = /owner-control/index.html {
        add_header Cache-Control "no-cache, no-store";
    }
    
    # Lange Cache-TTL für Assets (sie haben Content-Hash im Namen)
    location /owner-control/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Minimale Bootstrap-Response (zum Testen)

Wenn der Bootstrap-Endpoint noch nicht alle Daten liefern kann, reicht diese Minimal-Response
damit das Frontend überhaupt lädt:

```json
{
  "success": true,
  "data": {
    "identity": {
      "user_id": "test-uuid",
      "display_name": "Test Owner",
      "email": "owner@test.de",
      "role": "owner",
      "step_up_required": false,
      "last_seen_at": "2026-05-20T10:00:00Z"
    },
    "allowed_modules": [
      { "key": "executive", "allowed": true }
    ],
    "allowed_actions": [],
    "feature_flags": {
      "occ_enabled": true,
      "infra_actions_enabled": false,
      "warp_execution_enabled": false,
      "runbook_execution_enabled": false,
      "high_risk_actions_enabled": false,
      "external_support_enabled": false,
      "commercial_activation_enabled": false,
      "data_explorer_enabled": false
    },
    "executive_summary": {
      "active_users_30d": 0,
      "active_orgs": 0,
      "mrr_eur": 0,
      "open_decisions": 0,
      "open_support_escalations": 0
    },
    "critical_signals": [],
    "system_status": "healthy",
    "last_audit_at": null,
    "open_requests_count": 0
  }
}
```
