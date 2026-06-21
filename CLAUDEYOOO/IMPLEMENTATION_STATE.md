# OCC — Implementation State (Stand: Mai 2026)

Branch: `feat/occ-react-shell-claude`

---

## ERLEDIGT — Claude (Frontend)

### OCC React Shell

- Vite + React 18 + TypeScript, vollständig isoliert vom bestehenden HTML-Stack
- Entry: `frontend/occ.html` → Build-Output: `frontend/owner-control/index.html`
- Base-Path korrekt: `/owner-control/`
- Path-Alias `@occ` → `src/owner-control`
- TypeScript strict mode, 0 Fehler
- Build-Skript: `npm run build:occ`

### App-Shell

- `AppShell.tsx` — Outer layout container mit Sidebar + Topbar
- `Sidebar.tsx` — Feature-flag-gesteuertes Nav; Module ohne Zugang werden ausgeblendet
- `Topbar.tsx` — Owner-Identity, Bootstrap-Status, Reload-Trigger
- `BrowserRouter` mit `<Routes>` — alle Routes unter `/owner-control/**`
- Default-Redirect: `/owner-control` → `/owner-control/executive`

### 11 Module — alle registriert, geroutet, in ErrorBoundary

| Modul | Route | Endpoint(s) |
|---|---|---|
| Executive | `/executive` | `GET /executive/summary` |
| Decisions & Requests | `/decisions-requests` | `GET /decisions-requests`, `POST /decisions-requests/decide`, `POST /triage`, `POST /close`, `POST /assign` |
| Revenue | `/revenue` | `GET /revenue/summary`, `GET /revenue/billing`, `GET /revenue/invoices`, `GET /revenue/offers-mirror` |
| Platform | `/platform` | `GET /platform/summary` |
| Operations | `/operations` | `GET /operations/health` |
| Support Oversight | `/support-oversight` | `GET /support/escalations`, `GET /support/sla`, `GET /support/metrics` |
| Risk | `/risk` | `GET /risk/signals`, `GET /risk/drift`, `GET /risk/compliance` |
| Audit | `/audit` | `GET /audit/feed` |
| Infrastructure | `/infrastructure` | Sub-Views: Overview, Hetzner, Warp, Automation |
| Data Explorer | `/data-explorer` | `GET /data-explorer/users`, `/organizations`, `/subscriptions`, `/invoices`, `/audit`, `/integrity-checks` |
| Automation & Runbooks | `/automation-runbooks` | `GET /automation/jobs`, `GET /automation/history`, `POST /automation/trigger` |

### Infrastructure — 4 Sub-Views

- `overview.tsx` — `GET /infrastructure/status`
- `hetzner.tsx` — `GET /infrastructure/hetzner` + alle Hetzner-Detail-Endpunkte (hosts, docker, network, storage, backups, deployments)
- `warp.tsx` — `GET /warp/hosts`, `GET /warp/runbooks`, `POST /warp/execute`, `POST /warp/dry-run`, `GET /warp/history`
- `automation.tsx` — `GET /automation/jobs`, `GET /automation/schedules`, `GET /automation/history`, `POST /automation/trigger`

### Bootstrap & Permissions

- `BootstrapContext.tsx` — lädt einmalig `GET /api/owner-control/bootstrap`
- States: `loading | ready | unauthorized | forbidden | error`
- `useIsModuleAllowed(key)` — Sidebar-Sichtbarkeit + Modul-Guard
- `useCanAction(actionKey)` — Schreibaktionen prüfen
- `useFeatureFlag(key)` — Kill-Switch prüfen (safe default: `false`)
- `SAFE_FEATURE_DEFAULTS` — alle riskanten Flags defaulten auf `false` solange Bootstrap noch lädt

### Feature Flags / Kill Switches

| Flag | Steuert |
|---|---|
| `occ_enabled` | Gesamtsystem-Killswitch |
| `infra_actions_enabled` | Hetzner-Aktionen |
| `warp_execution_enabled` | Warp Runbook Execution |
| `runbook_execution_enabled` | Automation Jobs |
| `high_risk_actions_enabled` | Aktionen mit risk_level critical/high |
| `external_support_enabled` | Externes Support-Portal |
| `commercial_activation_enabled` | Abo-Aktivierung aus OCC |
| `data_explorer_enabled` | Data Explorer |

Wenn Flag `false`: `DisabledModule`-Komponente rendert. Backend blockiert zusätzlich.

### API Client

- `occApi` — zentraler Fetch-Wrapper, Basis `/api/owner-control`
- CSRF-Token-Management (GET `/api/csrf-token`, gecacht, bei Mutation mitgeschickt)
- `OccApiError` — 401 (`isUnauthorized`), 403 (`isForbidden`), 404, 5xx
- `useOccQuery<T>` — einheitlicher Data-Fetching-Hook mit loading/error/forbidden/reload
- `useOccPaginatedQuery<T>` — Pagination-Variante

### TypeScript Types (vollständig definiert)

- `types/bootstrap.ts` — `BootstrapResponse`, `OwnerIdentity`, `AllowedModule`, `AllowedAction`, `FeatureFlags`, `ExecutiveSummary`, `SystemSignal`
- `types/common.ts` — `ApiResponse<T>`, `PaginatedResponse<T>`, `TableColumn<T>`, `ConfirmPayload`, `AuditEntry`
- `types/requests.ts` — `OccRequest`, `DecisionPayload`, `RequestListResponse`, alle Enumerations + Label-Maps
- `types/infrastructure.ts` — `HetznerHost`, `DockerContainer`, `NetworkOverview`, `DiskUsage`, `BackupState`, `Deployment`, `WarpHost`, `Runbook`, `RunbookExecution`, `AutomationJob`, `InfraStatus`

### UI Component Library

- `DataTable` — generisch, sortierbar, mit custom column renderers
- `DetailDrawer` — Slide-in Drawer für Detailansichten
- `FilterBar` — generisches Filter-Komponente mit Dropdowns und Textsuche
- `ActivityFeed` — Timeline/Feed-Komponente
- `StatusBadge` — farbkodiertes Status-Badge
- `RiskBadge` — Risk-Level-Badge (critical / high / medium / low / info)
- `ConfirmModal` — Bestätigungs-Dialog mit Pflichtfeld `reason`, Risk-Level-Anzeige
- `ErrorBoundary` — React Error Boundary, rendert modulbezogene Fehler-UI
- `DisabledModule` — Kill-Switch-State, zeigt aktivierenden ENV-Key
- `LoadingSkeleton` — Lade-Platzhalter
- `EmptyState` — leere Datenzustand
- `ErrorState` — Fehler-Datenzustand mit Retry
- `KPICard` — Executive KPI-Karte
- `Toast` / `ToastContext` — temporäre Benachrichtigungen
- `ForbiddenView` — 403-State
- `UnauthorizedView` — 401-State

---

## ERLEDIGT — Claude (Frontend SOC)

### SOC React Shell

- Vollständig getrennte Vite-App: `vite.config.support.ts`
- Entry: `frontend/support.html` → Build-Output: `frontend/support-ops/index.html`
- Base-Path: `/support-ops/`
- Path-Alias `@soc` → `src/support`
- Kein einziger `@occ`-Import — komplett isoliert
- Build-Skript: `npm run build:soc`

### 9 Module

| Modul | Route | Funktion |
|---|---|---|
| Inbox | `/inbox` | Offene Queue-Ansicht, persönlich zugewiesene Cases |
| Cases | `/cases`, `/cases/:caseId` | Case-Liste + Case-Detail-Ansicht |
| User Lookup | `/users` | Nutzer-Suche mit Masking |
| Org Lookup | `/orgs` | Organisations-Suche |
| Escalations | `/escalations` | Eskalations-Liste + neu erstellen |
| Knowledge | `/knowledge` | Wissensdatenbank + Skript-Kategorien |
| Quality | `/quality` | Metriken, Agent-Performance, SLA-Report |
| Audit Log | `/audit` | Vollständiger Audit-Feed |
| Supervisor | `/supervisor` | Team-Übersicht, Agent-Monitoring |

### SOC-spezifische Komponenten

- `MaskedField` — rendert bereits-gemaskede Daten vom Server (email, phone, name)
- `CaseBadges` — Status-, Priority- und SLA-Badges für Cases
- `CommonStates` — Loading, Error, Empty States
- Alle generischen UI-Komponenten parallel zu OCC (keine Cross-Importe)

### SOC Bootstrap

- `BootstrapContext.tsx` — lädt `GET /api/support/bootstrap`
- `SupportBootstrap` → `identity`, `queues`, `sla_summary`, `features`, Counts
- `SupportIdentity` enthält `masking_rules`, `data_scope`, `vendor_id`, `allowed_actions`
- Feature-Availability-Gates: `user_lookup`, `org_lookup`, `supervisor_view`, `quality_metrics`, `audit_view`
- External-Scope-Warning: wenn `identity.scope === "external"`, zeigt SOC einen prominenten Hinweis

### Externe Agenten (BPO)

- Sidebar-Nav reagiert auf `identity.scope` und `identity.data_scope`
- externe Agenten sehen nur zugewiesene Cases (`data_scope: "assigned_only"`)
- Supervisor-Panel und Audit-Log nur sichtbar wenn `features.supervisor_view` / `features.audit_view` aktiv

---

## OFFEN — Warp (Backend)

### DB-Migrationen

- [ ] `owner_control_access` Tabelle (user_id, email, role, granted_by, granted_at, revoked_at, reason)
- [ ] `support_agents` (user_id, vendor_id, role, scope, queue_assignments, active)
- [ ] `support_cases` (id, case_number, status, priority, type, assigned_to, queue_id, sla_deadline, org_id, user_id, subject, description)
- [ ] `support_case_notes` (id, case_id, author_id, note_type, body, created_at)
- [ ] `support_case_timeline` (id, case_id, event, actor, detail, created_at)
- [ ] `support_escalations` (id, case_id, target, reason, created_by, resolved_at)
- [ ] `support_knowledge` (id, category, title, body, tags, allowed_roles, active)
- [ ] `support_audit_log` (id, actor_id, action, entity_type, entity_id, before, after, created_at)
- [ ] `warp_hosts` (id, name, role, env, ssh_config, allowed_actions, active)
- [ ] `warp_runbooks` (id, name, category, risk_level, steps JSON, preconditions, requires_confirm)
- [ ] `warp_executions` (id, runbook_id, actor_id, host_name, status, dry_run, reason, step_results JSON, started_at, finished_at)
- [ ] `automation_jobs` (id, name, trigger, schedule_cron, status, runbook_id, last_run_at, next_run_at)

### Middleware

- [ ] `requireOwnerControlAccess` — Prüft `owner_control_access` Tabelle, setzt 403 wenn kein Eintrag
- [ ] `requireSupportAccess` — Prüft `support_agents`, setzt 401/403
- [ ] Audit-Hook für alle mutatierenden OCC-Aktionen (`owner_control.*` Namespace)

### OCC Endpoints (alle 40+)

Alle unter `/api/owner-control/**`, alle hinter `requireOwnerControlAccess`.

- [ ] `GET /bootstrap`
- [ ] `GET /executive/summary`
- [ ] `GET /decisions-requests` (mit Pagination + Filter)
- [ ] `GET /decisions-requests/:id`
- [ ] `POST /decisions-requests/decide`
- [ ] `POST /decisions-requests/triage`
- [ ] `POST /decisions-requests/close`
- [ ] `POST /decisions-requests/assign`
- [ ] `GET /commercial/offers`
- [ ] `GET /commercial/offers/:id`
- [ ] `POST /commercial/offers/approve`
- [ ] `POST /commercial/offers/reject`
- [ ] `POST /commercial/offers/propose`
- [ ] `GET /revenue/summary`
- [ ] `GET /revenue/billing`
- [ ] `GET /revenue/invoices`
- [ ] `GET /revenue/offers-mirror`
- [ ] `GET /platform/summary`
- [ ] `GET /operations/health`
- [ ] `GET /support/escalations`
- [ ] `GET /support/sla`
- [ ] `GET /support/metrics`
- [ ] `GET /risk/signals`
- [ ] `GET /risk/drift`
- [ ] `GET /risk/compliance`
- [ ] `GET /audit/feed`
- [ ] `GET /audit/:id`
- [ ] `GET /infrastructure/status`
- [ ] `GET /infrastructure/hetzner`
- [ ] `GET /infrastructure/hetzner/hosts`
- [ ] `GET /infrastructure/hetzner/docker`
- [ ] `GET /infrastructure/hetzner/network`
- [ ] `GET /infrastructure/hetzner/storage`
- [ ] `GET /infrastructure/hetzner/backups`
- [ ] `GET /infrastructure/hetzner/deployments`
- [ ] `GET /warp/hosts`
- [ ] `GET /warp/runbooks`
- [ ] `GET /warp/runbooks/:id`
- [ ] `POST /warp/execute`
- [ ] `POST /warp/dry-run`
- [ ] `GET /warp/history`
- [ ] `GET /warp/command-registry`
- [ ] `GET /automation/jobs`
- [ ] `GET /automation/jobs/:id`
- [ ] `POST /automation/trigger`
- [ ] `GET /automation/history`
- [ ] `GET /automation/schedules`
- [ ] `GET /data-explorer/users`
- [ ] `GET /data-explorer/organizations`
- [ ] `GET /data-explorer/requests`
- [ ] `GET /data-explorer/subscriptions`
- [ ] `GET /data-explorer/invoices`
- [ ] `GET /data-explorer/audit`
- [ ] `GET /data-explorer/integrity-checks`

### SOC Endpoints (alle 18)

Alle unter `/api/support/**`, alle hinter `requireSupportAccess`.

- [ ] `GET /bootstrap`
- [ ] `GET /cases` (mit Pagination + Filter)
- [ ] `GET /cases/:id`
- [ ] `POST /cases/:id/action`
- [ ] `GET /lookup/users`
- [ ] `GET /lookup/orgs`
- [ ] `GET /escalations`
- [ ] `POST /escalations`
- [ ] `GET /knowledge`
- [ ] `GET /knowledge/categories`
- [ ] `GET /quality/metrics`
- [ ] `GET /quality/agents`
- [ ] `GET /quality/sla`
- [ ] `GET /audit`
- [ ] `GET /supervisor/overview`
- [ ] `GET /supervisor/agents`

### Owner CLI Scripts

- [ ] `npm run occ:grant-owner`
- [ ] `npm run occ:revoke-owner`
- [ ] `npm run occ:list-owners`

### Nginx

- [ ] Location-Block `/support-ops/` analog zu `/owner-control/`

### Backend Tests

- [ ] Unit Tests Middleware: `requireOwnerControlAccess`, `requireSupportAccess`
- [ ] Integration Tests: Bootstrap-Endpoint (OCC + SOC)
- [ ] Integration Tests: Decision-Flows (decide, triage, close, assign)
- [ ] Security Tests: 401/403 Verhalten ohne gültige Session
