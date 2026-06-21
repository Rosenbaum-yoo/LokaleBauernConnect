# SOC — Frontend Handoff (Claude → Warp)

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`  
> Das SOC-Frontend ist fertig. Was Warp noch liefern muss.

---

## Architektur-Zusammenfassung

Das Support Operations Center (SOC) ist eine vollständig separate React-App.
Sie teilt keinen Code mit dem OCC-Frontend.

| Aspekt | Detail |
|---|---|
| Vite-Config | `frontend/vite.config.support.ts` |
| Entry HTML | `frontend/support.html` |
| Build-Output | `frontend/support-ops/index.html + assets/` |
| Base-Path | `/support-ops/` |
| Alias | `@soc` → `frontend/src/support/` |
| OCC-Isolation | ✅ Kein einziger `@occ`-Import |
| TypeScript | strict, 0 Fehler |

### Dev-Starten

```bash
npm run dev:soc   # Port 5174, Proxy → localhost:3000
```

### Build

```bash
npm run build:soc
# Output: frontend/support-ops/index.html + assets/
```

---

## Was das Frontend macht

### Bootstrap-Flow

1. `BootstrapProvider` mount in `App.tsx`
2. Ruft `GET /api/support/bootstrap` auf
3. Bei 401 → `UnauthorizedView`
4. Bei 403 → `ForbiddenView`
5. Bei Erfolg → Shell rendert, Sidebar filtert nach `features` und `identity.scope`

### Sidebar-Gate

Die Sidebar zeigt Module nur wenn:
- `features.<module>` = `true` (z.B. `features.supervisor_view`)
- Oder: Modul ist immer sichtbar (Inbox, Cases, Knowledge)

Externe Agenten sehen einen prominenten Scope-Warning-Banner: "Du arbeitest als externer Agent — eingeschränkte Sicht aktiv."

### Daten-Fetching

`useSocQuery<T>(url, options)` — der zentrale Hook:
- `AbortController` + `mountedRef` für sauberes Cleanup
- `loading`, `error`, `data`, `reload`
- Kein Caching — immer fresh fetch
- Hängt sich an `deps`-Array für Re-Fetch bei Filter-Änderungen

### Action-Pattern

Alle mutatierenden Aktionen gehen durch `ConfirmModal`:
1. Agent klickt auf Aktion (z.B. "Case eskalieren")
2. `ConfirmModal` öffnet sich
3. `reason`-Feld ist Pflicht (min. 10 Zeichen)
4. Nach Confirm: `POST /api/support/cases/:id/action` mit Action-Payload

---

## Was Warp liefern muss

### Kritischer Pfad (ohne diese geht gar nichts)

1. **`GET /api/support/bootstrap`** — muss `identity`, `queues`, `features`, `masking_rules` enthalten
2. **`requireSupportAccess`-Middleware** — 401/403 korrekt
3. **Nginx `/support-ops/`** — analog zu `/owner-control/`

### Alle Endpunkte (vollständige Specs in SUPPORT_API_CONTRACT.md)

| Methode | Pfad | Priorität |
|---|---|---|
| GET | `/api/support/bootstrap` | **KRITISCH** |
| GET | `/api/support/cases` | hoch |
| GET | `/api/support/cases/:id` | hoch |
| POST | `/api/support/cases/:id/action` | hoch |
| GET | `/api/support/lookup/users` | mittel |
| GET | `/api/support/lookup/orgs` | mittel |
| GET | `/api/support/escalations` | mittel |
| POST | `/api/support/escalations` | mittel |
| GET | `/api/support/knowledge` | mittel |
| GET | `/api/support/quality/metrics` | niedrig |
| GET | `/api/support/quality/agents` | niedrig |
| GET | `/api/support/quality/sla` | niedrig |
| GET | `/api/support/audit` | niedrig |
| GET | `/api/support/supervisor/overview` | niedrig |
| GET | `/api/support/supervisor/agents` | niedrig |

---

## Response-Format

**SOC erwartet KEIN Envelope** — direktes JSON:

```json
// Erfolg:
{ "items": [...], "total": 24 }

// Fehler:
{ "code": "FORBIDDEN", "message": "Kein Support-Zugang" }
```

Das ist der Unterschied zu OCC (`{ success, data, error }`). Wenn Warp möchte, kann das vereinheitlicht werden — dann muss `socApi` angepasst werden (1 Zeile im Client).

---

## Risiken

### CSRF (offenes Problem)

`socApi` sendet aktuell **keinen CSRF-Token**. Das muss vor Go-Live nachgezogen werden.

**Option A (empfohlen):** Warp implementiert Cookie-basiertes SameSite CSRF — Frontend muss nichts ändern.
**Option B:** Claude baut CSRF analog zu OCC in `socApi` ein (ca. 30 Zeilen).

### Session-Management

Kein automatisches Session-Refresh. 401 im laufenden Betrieb → `UnauthorizedView`. Agent muss manuell neu einloggen.

### Masking-Verantwortung

`MaskedField` rendert nur was das Backend schickt. Wenn Backend ungemaskede Daten schickt, zeigt das Frontend sie an. **Warp trägt die Masking-Verantwortung.**

---

## DB-Migrationen (Warp)

```sql
-- Migration 109: Support Agents
CREATE TABLE support_agents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  vendor_id         TEXT,
  role              TEXT NOT NULL DEFAULT 'agent',
  scope             TEXT NOT NULL DEFAULT 'internal',
  data_scope        TEXT NOT NULL DEFAULT 'all_cases',
  queue_assignments TEXT[] DEFAULT '{}',
  masking_rules     JSONB NOT NULL DEFAULT '{"user_email":"domain_only","user_phone":"hidden","user_name":"full"}',
  allowed_actions   TEXT[] DEFAULT '{}',
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration 110: Support Cases
CREATE TABLE support_cases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number   TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'open',
  priority      TEXT NOT NULL DEFAULT 'medium',
  type          TEXT NOT NULL,
  queue_id      UUID,
  assigned_to   UUID REFERENCES support_agents(id),
  org_id        UUID REFERENCES organizations(id),
  user_id       UUID REFERENCES users(id),
  subject       TEXT NOT NULL,
  description   TEXT,
  sla_deadline  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration 111: Case Notes, Timeline, Escalations
CREATE TABLE support_case_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES support_cases(id),
  author_id   UUID NOT NULL REFERENCES support_agents(id),
  note_type   TEXT NOT NULL DEFAULT 'internal',
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_case_timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES support_cases(id),
  event       TEXT NOT NULL,
  actor       TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_escalations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES support_cases(id),
  target      TEXT NOT NULL,
  reason      TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES support_agents(id),
  status      TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Nginx-Konfiguration (Warp)

```nginx
# Support Operations Center SPA
location /support-ops/ {
    alias /app/frontend/support-ops/;
    try_files $uri $uri/ /support-ops/index.html;
    
    location = /support-ops/index.html {
        add_header Cache-Control "no-cache, no-store";
    }
    location /support-ops/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```
