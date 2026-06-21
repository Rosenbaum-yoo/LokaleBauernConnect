# OCC + SOC — Frontend Handoff (Claude)

Übergabedokumentation des React-Frontends für OCC und SOC.
Stand: Mai 2026. Branch: `feat/occ-react-shell-claude`.

---

## 1. Architektur-Übersicht

Zwei vollständig getrennte Vite-Apps innerhalb desselben `frontend/`-Verzeichnisses.
Kein gemeinsamer Code — absichtlich. Isolation verhindert versehentliche Cross-Imports zwischen Owner-Shell und Support-Shell.

| App | Config | Entry HTML | Build-Output | Base Path | Alias |
|---|---|---|---|---|---|
| OCC | `vite.config.ts` | `occ.html` | `frontend/owner-control/` | `/owner-control/` | `@occ` |
| SOC | `vite.config.support.ts` | `support.html` | `frontend/support-ops/` | `/support-ops/` | `@soc` |

Das bestehende HTML-Frontend (`frontend/public/`) bleibt vollständig unangetastet.
Nginx bedient `/owner-control/` und `/support-ops/` aus separaten Build-Outputs.

---

## 2. Dateistruktur

### OCC (`frontend/src/owner-control/`)

```
src/owner-control/
├── main.tsx                      Entry point, mountet <App />
├── App.tsx                       BrowserRouter + alle Routes + BootstrapProvider
├── api/
│   ├── client.ts                 occApi (get/post/patch/del), OccApiError, CSRF-Management
│   └── endpoints.ts              OCC_EP Konstanten, buildQuery()
├── components/
│   ├── shell/
│   │   ├── AppShell.tsx          Outer layout: Sidebar + <Outlet />
│   │   ├── Sidebar.tsx           Nav mit feature-flag-gesteuerter Sichtbarkeit
│   │   └── Topbar.tsx            Owner-Identity-Display, Bootstrap-Status
│   ├── ui/
│   │   ├── ActivityFeed.tsx      Timeline/Feed
│   │   ├── ConfirmModal.tsx      Bestätigung + Pflicht-Reason-Feld
│   │   ├── DataTable.tsx         Generische sortierbare Tabelle
│   │   ├── DetailDrawer.tsx      Slide-in Drawer
│   │   ├── DisabledModule.tsx    Kill-Switch-State
│   │   ├── EmptyState.tsx        Leerer Datenzustand
│   │   ├── ErrorBoundary.tsx     React ErrorBoundary
│   │   ├── ErrorState.tsx        Fehler + Retry
│   │   ├── FilterBar.tsx         Filter-Dropdowns + Suche
│   │   ├── ForbiddenView.tsx     403-State
│   │   ├── KPICard.tsx           Executive KPI-Karte
│   │   ├── LoadingSkeleton.tsx   Lade-Platzhalter
│   │   ├── RiskBadge.tsx         Risk-Level-Badge
│   │   ├── StatusBadge.tsx       Allgemeines Status-Badge
│   │   ├── Toast.tsx             Toast-Notification
│   │   └── UnauthorizedView.tsx  401-State
│   └── layout/
│       ├── Breadcrumbs.tsx       Breadcrumb-Navigation
│       └── SectionHeader.tsx     Modul-Header mit Titel/Aktionen
├── hooks/
│   └── useOccQuery.ts            useOccQuery<T> + useOccPaginatedQuery<T>
├── modules/
│   ├── audit/index.tsx
│   ├── automation-runbooks/index.tsx
│   ├── data-explorer/index.tsx
│   ├── decisions-requests/index.tsx
│   ├── executive/index.tsx
│   ├── infrastructure/
│   │   ├── index.tsx             Router für Sub-Views
│   │   ├── overview.tsx          InfraStatus
│   │   ├── hetzner.tsx           Hetzner-Detail (hosts, docker, network, storage, backups, deploys)
│   │   ├── warp.tsx              Warp Command Center
│   │   └── automation.tsx        Automation Jobs
│   ├── operations/index.tsx
│   ├── platform/index.tsx
│   ├── revenue/index.tsx
│   ├── risk/index.tsx
│   └── support-oversight/index.tsx
├── state/
│   ├── BootstrapContext.tsx      BootstrapProvider + alle Hooks
│   └── ToastContext.tsx          ToastProvider + useToast
├── styles/
│   └── occ.css                   OCC-spezifische CSS-Variablen + Layout
├── types/
│   ├── bootstrap.ts              BootstrapResponse, OwnerIdentity, FeatureFlags, ...
│   ├── common.ts                 ApiResponse<T>, PaginatedResponse<T>, AuditEntry, ...
│   ├── infrastructure.ts         HetznerHost, DockerContainer, Runbook, ...
│   └── requests.ts               OccRequest, DecisionPayload, RequestFilter, ...
└── utils/
    └── format.ts                 Datum/Währung/Zahl-Formatter
```

### SOC (`frontend/src/support/`)

```
src/support/
├── main.tsx
├── App.tsx                       BrowserRouter + 9 Routes + BootstrapProvider
├── api/
│   ├── client.ts                 socApi (get/post/patch/delete), SocApiError
│   └── endpoints.ts              SOC_EP Konstanten, buildQuery()
├── components/
│   ├── shell/
│   │   ├── AppShell.tsx          Layout mit Sidebar + <Outlet />
│   │   └── Sidebar.tsx           Feature-flag-gesteuertes Nav, External-Scope-Warning
│   ├── ui/
│   │   ├── ActivityFeed.tsx
│   │   ├── CaseBadges.tsx        Status-, Priority-, SLA-Badge für Cases
│   │   ├── CommonStates.tsx      Loading, Error, Empty States
│   │   ├── ConfirmModal.tsx
│   │   ├── DataTable.tsx
│   │   ├── DetailDrawer.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FilterBar.tsx
│   │   └── MaskedField.tsx       Rendert bereits-gemaskede Server-Daten
│   └── layout/
│       └── SectionHeader.tsx
├── hooks/
│   └── useSocQuery.ts
├── modules/
│   ├── audit-log/index.tsx
│   ├── cases/index.tsx           Case-Liste + Case-Detail (/cases/:caseId)
│   ├── escalations/index.tsx
│   ├── inbox/index.tsx
│   ├── knowledge/index.tsx
│   ├── org-lookup/index.tsx
│   ├── quality/index.tsx
│   ├── supervisor/index.tsx
│   └── user-lookup/index.tsx
├── state/
│   ├── BootstrapContext.tsx
│   └── ToastContext.tsx
├── styles/
│   └── soc.css
├── types/
│   ├── bootstrap.ts              SupportBootstrap, SupportIdentity, MaskingRules, ...
│   ├── cases.ts                  CaseSummary, CaseDetail, CaseActionPayload, ...
│   └── common.ts
└── utils/
    └── format.ts
```

---

## 3. Wie Bootstrap funktioniert

### OCC Bootstrap

`BootstrapProvider` mountet in `App.tsx` und ruft `GET /api/owner-control/bootstrap` einmalig auf.

**States:**
- `loading` — Spinner in AppShell, keine Navigation sichtbar
- `ready` — normaler Betrieb
- `unauthorized` (401) — `UnauthorizedView` zeigt Login-Redirect
- `forbidden` (403) — `ForbiddenView` zeigt "Kein OCC-Zugang"
- `error` — `ErrorState` mit Retry-Button

**Wichtig:** Die Sidebar filtert Module anhand von `allowed_modules[].allowed === true`. Module die nicht erlaubt sind, erscheinen nicht in der Nav und können nicht direkt aufgerufen werden — aber das Backend blockiert sie trotzdem.

**Feature-Flags:** `useFeatureFlag(key)` liest aus `bootstrap.feature_flags`. Safe defaults sind alle `false` bis Bootstrap geladen ist — kein kurzes Aufblitzen von gesperrten Features.

### SOC Bootstrap

Analog, aber einfacher. Kein `reload()`-Mechanismus im SOC-Bootstrap (OCC hat einen für manuelle Refreshes). SOC liest `features` (FeatureAvailability) für Sidebar-Sichtbarkeit und `identity.masking_rules` für alle Lookup-Anzeigen.

---

## 4. Permissions

### OCC

```typescript
useIsModuleAllowed(key: ModuleKey): boolean
// Prüft: bootstrap.allowed_modules.find(m => m.key === key)?.allowed

useCanAction(actionKey: string): boolean
// Prüft: bootstrap.allowed_actions.find(a => a.key === actionKey)

useFeatureFlag(key: keyof FeatureFlags): boolean
// Prüft: bootstrap.feature_flags[key] (default: false)
```

`useCanAction` wird in Komponenten vor dem Render von Aktions-Buttons verwendet.
`useFeatureFlag` steuert, ob ein ganzes Modul als `DisabledModule` gerendert wird.

Alle drei Hooks sind sichere Defaults — sie geben `false` zurück, wenn Bootstrap noch lädt oder fehlgeschlagen ist.

### SOC

Permissions kommen aus `identity.allowed_actions: string[]` und `identity.data_scope`.
Sidebar-Gates aus `features: FeatureAvailability`.
Module prüfen vor Aktionen: `identity.allowed_actions.includes("resend_verification")` etc.

---

## 5. API Client

### OCC: `occApi`

```typescript
// Basis: /api/owner-control
occApi.get<T>(path)
occApi.post<T>(path, body)
occApi.patch<T>(path, body)
occApi.del<T>(path, body?)
```

- CSRF-Token wird einmalig von `/api/csrf-token` geladen und gecacht
- Bei mutatierenden Requests (`POST/PATCH/DELETE`) wird `x-csrf-token` Header gesetzt
- 401 → `OccApiError` mit `isUnauthorized = true`
- 403 → `OccApiError` mit `isForbidden = true`
- Backend-Fehler → `OccApiError` mit `status`, `code`, `message`
- Parse-Fehler → `OccApiError` mit `code: "PARSE_ERROR"`

Response-Envelope erwartet: `{ success: boolean, data: T | null, error: { code, message } | null }`

### SOC: `socApi`

```typescript
// Volle URLs (SOC_EP enthält bereits /api/support/...)
socApi.get<T>(url)
socApi.post<T>(url, body)
socApi.patch<T>(url, body)
socApi.delete<T>(url)
```

Kein Envelope — SOC erwartet direktes JSON-Response (kein `{ success, data }` Wrapper).
`SocApiError` hat `status` und `code`, kein CSRF-Management (vorerst).

---

## 6. Kill Switches

Wenn ein Feature-Flag serverseitig `false` ist:

1. `useFeatureFlag("warp_execution_enabled")` gibt `false` zurück
2. Das Modul rendert `<DisabledModule moduleName="Warp" flagKey="WARP_EXECUTION_ENABLED" />`
3. `DisabledModule` zeigt den ENV-Key, den Warp aktivieren muss
4. Das Backend blockiert den Endpoint trotzdem zusätzlich

Die Reihenfolge ist Absicht: auch wenn ein Angreifer den Frontend-State manipuliert, ist das Backend die echte Sicherheitsschranke.

`DisabledModule` Props:
- `moduleName` — Name des Bereichs für die Anzeige
- `flagKey` — ENV-Variable-Name (z.B. `OCC_INFRA_ACTIONS_ENABLED`)
- `reason?` — optionaler Text warum deaktiviert

---

## 7. UI Component Library

### DataTable

Generisch über `TableColumn<T>[]`. Columns können `render: (row: T) => ReactNode` haben.
Sortierung clientseitig (für kleine Datensätze) oder serversseitig via `onSort`-Callback.

### DetailDrawer

Slide-in Panel. Props: `open`, `onClose`, `title`, `children`. Schließt mit Escape oder X-Button.

### ConfirmModal

Wichtigstes Sicherheits-UI. Zeigt:
- Titel und Beschreibung der Aktion
- Risk-Level (critical/high/medium/low)
- Pflichtfeld `reason` (required, min. 10 Zeichen)
- Aktions-Button (kann als Danger gestylt werden)

Kein Bypass möglich — `reason` muss ausgefüllt sein bevor Confirm-Button aktiv wird.

### ErrorBoundary

Jedes Modul in `App.tsx` ist in `<ErrorBoundary moduleName={...}>` gewrappt. 
Bei unbehandelten React-Fehlern wird nur das betroffene Modul mit Fehlermeldung + Retry gerendert. Die Shell bleibt funktional.

### FilterBar

Props: `filters: FilterDefinition[]`, `value: FilterState`, `onChange`. Rendert Dropdowns und Textsuche. Debounced `onChange` für Suche.

### KPICard

Executive-Dashboard-Karte. Props: `label`, `value`, `trend?`, `status?`, `loading`.

---

## 8. Modul-Schnellreferenz

### Executive

Zeigt `ExecutiveSummary` aus dem Bootstrap-Response direkt — kein separater Fetch nötig wenn Bootstrap geladen. Dazu `SystemSignal[]` für Critical-Alerts.
Endpoint: `GET /executive/summary` für detailliertere Daten.

### Decisions & Requests

Liste von `OccRequest`-Einträgen mit Pagination und Filter (type, status, priority, risk_level).
Detail: `DrawerDetail` mit allen Context-Payloads (commercial, feature, approval, operational, support).
Aktionen: decide/triage/close/assign — alle mit `ConfirmModal`.

### Revenue

Drei Tabs: Summary (KPIs), Billing (MRR, Churn, Zahlungshistorie), Invoices (Rechnungsliste).
Revenue-Mirror: gespiegelte Ansicht der Commercial Offers mit Aktivierungsstatus.

### Platform

User- und Org-Metriken, Registration-Trend, Plan-Distribution.

### Operations

Platform-Health: API Latenz, Error Rate, DB-Status, Queue-Status, externe Abhängigkeiten.

### Support Oversight

Aggregierte Sicht auf den Support: offene Eskalationen, SLA-Compliance, Metriken pro Queue.
Schreibzugang auf Entscheidungen (nicht auf Cases direkt).

### Risk

Drei Tabs: Signals (aktive Risikoereignisse), Drift (Metriken außerhalb Normalbereich), Compliance (offene Compliance-Punkte).

### Audit

Feed aller `owner_control.*` Audit-Events. Filter nach Actor, Action-Typ, Risk-Level, Zeitraum.

### Infrastructure

Sub-Tab-Navigation:
- Overview: `InfraStatus` — DB, Redis, API, Docker Services
- Hetzner: Full Host-Übersicht, Docker, Network/TLS, Storage, Backups, Deployments
- Warp: Host-Registry, Runbook-Bibliothek, Ausführung mit Dry-Run + Confirm
- Automation: Geplante Jobs, Trigger, History

### Data Explorer

Read-Only-Datenansicht für Users, Orgs, Subscriptions, Invoices, Audit-Stream, Integrity-Checks.
Nur aktiv wenn `data_explorer_enabled === true`.

### Automation & Runbooks

Übersicht aller Automation-Jobs, Schedules, History. Trigger mit Confirm + Reason.

---

## 9. Build-Befehle

```bash
# OCC entwickeln (Port 5173, Proxy zu localhost:3000)
npm run dev:occ

# SOC entwickeln (Port 5174, Proxy zu localhost:3000)
npm run dev:soc

# OCC Production Build (TypeCheck + Vite Build)
npm run build:occ

# SOC Production Build
npm run build:soc

# Beide bauen
npm run build:all

# Nur TypeScript prüfen (kein Build)
npm run typecheck
```

Build-Outputs:
- OCC → `frontend/owner-control/index.html` + `assets/`
- SOC → `frontend/support-ops/index.html` + `assets/`

---

## 10. Was Warp liefern muss

Das gesamte Frontend ist fertig. Es wartet auf diese Backend-Deliverables:

**Kritischer Pfad (ohne diese geht gar nichts):**
1. `GET /api/owner-control/bootstrap` — muss mindestens `identity`, `allowed_modules`, `feature_flags`, `executive_summary` zurückgeben
2. `requireOwnerControlAccess` Middleware — 401 wenn nicht eingeloggt, 403 wenn eingeloggt aber kein OCC-Zugang
3. `GET /api/support/bootstrap` — muss `identity`, `queues`, `features`, `masking_rules` zurückgeben
4. `requireSupportAccess` Middleware

**Für alle Module:**
Alle Endpunkte aus `OCC_EP` und `SOC_EP` — vollständige Liste in `BACKEND_HANDOFF.md`.

**Response-Envelope für OCC:**
```json
{ "success": true, "data": { ... }, "error": null }
```
Fehler:
```json
{ "success": false, "data": null, "error": { "code": "ERROR_CODE", "message": "..." } }
```

**SOC erwartet kein Envelope** — direktes JSON-Objekt als Response.

---

## 11. Risiken und bekannte Einschränkungen

**Masking ist nicht Frontend-seitig.** `MaskedField` rendert nur, was der Server bereits maskiert zurückgibt. Wenn der Backend-Endpunkt ungemaskede Daten zurückgibt, zeigt `MaskedField` sie ungemaskiert. Die Verantwortung liegt bei Warp.

**SOC hat kein CSRF.** `socApi` schickt keinen CSRF-Token. Muss nachgezogen werden, sobald mutierende SOC-Aktionen live gehen.

**Keine Offline-Unterstützung.** Wenn Bootstrap fehlschlägt (z.B. API down), sitzt der Nutzer auf einem Fehler-Screen ohne Fallback.

**Kein automatisches Token-Refresh.** 401-Fehler im laufenden Betrieb landen in `UnauthorizedView`. Es gibt kein automatisches Session-Refresh oder Token-Rotation im Frontend.

**ErrorBoundary fängt nur React-Fehler.** Async Errors (z.B. fehlgeschlagener Fetch nach Bootstrap) werden vom `useOccQuery`-Error-State behandelt, nicht von ErrorBoundary.

**Infrastructure/Warp-Module hängen von Telemetrie-Infrastruktur ab.** Wenn kein Telemetrie-Collector auf Hetzner läuft, zeigen alle Infrastructure-Endpoints leere oder veraltete Daten. Das ist ein Warp-Problem.

---

## 12. Nächste Frontend-Schritte

Sobald Warp Bootstrap liefert:

1. **Integration-Smoke-Test** — OCC und SOC gegen echte API starten, Bootstrap-Flow verifizieren
2. **Module einzeln durchgehen** — jeden Endpunkt mit echten Daten testen
3. **ConfirmModal-Flows testen** — Decision-Aktionen end-to-end (Frontend → Backend → Audit)
4. **Masking prüfen** — SOC User Lookup mit echtem Backend, sicherstellen dass MaskedField korrekt rendert
5. **Feature-Flag-Tests** — alle Kill-Switches auf false setzen, DisabledModule-Rendering verifizieren
6. **Deep-Link-Tests** — `/owner-control/decisions-requests` direkt aufrufen, Nginx-Rewrite prüfen
7. **TypeScript Build-CI** — `npm run typecheck` in CI-Pipeline
8. **Komponenten-Tests** — DataTable, ConfirmModal, MaskedField mit Vitest/RTL
