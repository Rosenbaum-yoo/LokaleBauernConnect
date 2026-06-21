# SOC — Support Operations Center: Implementation State

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`  
> Separate React-Shell für interne und externe Support-Agenten.

---

## ERLEDIGT — Claude (Frontend SOC)

### SOC React Shell

| Aspekt | Status | Detail |
|---|---|---|
| Vite-Config | ✅ | `vite.config.support.ts` — komplett getrennt von OCC |
| Entry HTML | ✅ | `frontend/support.html` |
| Build-Output | ✅ | `frontend/support-ops/index.html + assets/` |
| Base-Path | ✅ | `/support-ops/` |
| Path-Alias | ✅ | `@soc` → `src/support/` |
| OCC-Isolation | ✅ | Kein einziger `@occ`-Import im SOC-Code |
| TypeScript | ✅ | strict mode, 0 Fehler |
| Build-Skript | ✅ | `npm run build:soc` |
| Dev-Server | ✅ | `npm run dev:soc` (Port 5174) |

---

### 9 Module — vollständig implementiert

| Modul | Route | Hauptfunktion | Status |
|---|---|---|---|
| Inbox | `/inbox` | Offene Queue, persönlich zugewiesen | ✅ |
| Cases | `/cases`, `/cases/:caseId` | Case-Liste + Case-Detail | ✅ |
| User Lookup | `/users` | Nutzer-Suche mit Server-Masking | ✅ |
| Org Lookup | `/orgs` | Organisations-Suche | ✅ |
| Escalations | `/escalations` | Eskalations-Liste + neue Eskalation | ✅ |
| Knowledge | `/knowledge` | Wissensdatenbank + Skript-Kategorien | ✅ |
| Quality | `/quality` | Metriken, Agent-Performance, SLA | ✅ |
| Audit Log | `/audit` | Vollständiger Audit-Feed | ✅ |
| Supervisor | `/supervisor` | Team-Übersicht, Agent-Monitoring | ✅ |

---

### Bootstrap & State

| Aspekt | Status | Detail |
|---|---|---|
| `BootstrapContext.tsx` | ✅ | Lädt `GET /api/support/bootstrap` |
| States | ✅ | loading / ready / unauthorized / forbidden / error |
| `features` Gate | ✅ | Sidebar-Sichtbarkeit über FeatureAvailability |
| `identity.scope` | ✅ | `internal` / `external` — Sidebar reagiert darauf |
| `identity.data_scope` | ✅ | `all_cases` / `assigned_only` — Cases-Module berücksichtigt |
| `masking_rules` | ✅ | Vom Bootstrap übermittelt, steuert MaskedField |
| External-Warning | ✅ | Prominent-Banner wenn `scope === "external"` |

---

### API Client

| Aspekt | Status | Detail |
|---|---|---|
| `socApi` | ✅ | Zentraler Fetch-Wrapper |
| Basis-URL | ✅ | `/api/support/` (vollständige URLs in SOC_EP) |
| `SocApiError` | ✅ | `status`, `code` |
| `useSocQuery<T>` | ✅ | AbortController + mountedRef, loading/error/reload |
| CSRF | ❌ | Noch nicht implementiert — **vor Go-Live nachholen** |

---

### UI-Komponenten (SOC-eigene)

| Komponente | Funktion | Status |
|---|---|---|
| `MaskedField` | Rendert Server-gemaskede Daten (Email, Phone, Name) | ✅ |
| `CaseBadges` | Status-, Priority-, SLA-Badge für Cases | ✅ |
| `CommonStates` | Loading, Error, Empty States | ✅ |
| `ConfirmModal` | Bestätigungs-Dialog mit Pflicht-Reason | ✅ |
| `DataTable` | Generische sortierbare Tabelle | ✅ |
| `DetailDrawer` | Slide-in Panel für Case-Detail | ✅ |
| `ErrorBoundary` | Modul-Fehler-Isolation | ✅ |
| `FilterBar` | Filter-Dropdowns + Suche | ✅ |
| `ActivityFeed` | Timeline/Feed für Case-History | ✅ |

---

### Typen (vollständig definiert)

| Datei | Inhalt |
|---|---|
| `types/bootstrap.ts` | `SupportBootstrap`, `SupportIdentity`, `MaskingRules`, `FeatureAvailability`, `QueueSummary` |
| `types/cases.ts` | `CaseSummary`, `CaseDetail`, `CaseNote`, `CaseTimelineEvent`, `CaseActionPayload` |
| `types/common.ts` | `ApiResponse<T>`, `PaginatedResponse<T>`, gemeinsame Interfaces |

---

### Styles

| Datei | Zeilen | Inhalt |
|---|---|---|
| `styles/soc.css` | 430+ | SOC-Layout, Dark-Theme, Case-Badges, Queue-Cards, Masking-Styles |

---

## OFFEN — Warp (Backend SOC)

### DB-Migrationen

- [ ] `support_agents` — Tabelle für Support-Agent-Stammdaten
- [ ] `support_cases` — Haupt-Case-Tabelle
- [ ] `support_case_notes` — Case-Notizen + Kommunikationshistorie
- [ ] `support_case_timeline` — Audit-Trail pro Case
- [ ] `support_escalations` — Eskalations-Einträge
- [ ] `support_knowledge` — Wissensdatenbank-Artikel
- [ ] `support_audit_log` — SOC-spezifischer Audit-Log

### Middleware

- [ ] `requireSupportAccess` — prüft `support_agents`, 401/403
- [ ] Masking-Middleware — maskiert User-Daten je `masking_rules` des Agents

### Endpunkte (18 total)

Vollständige Liste in `SUPPORT_API_CONTRACT.md`.

### Nginx

- [ ] Location-Block `/support-ops/` analog zu `/owner-control/`
