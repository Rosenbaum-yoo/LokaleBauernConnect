# OCC — Test Report

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`

---

## TypeScript-Checks

```
npm run typecheck
Result: 0 errors ✅
```

Zuletzt geprüft: Mai 2026, nach allen Fixes von unused imports in:
- `decisions-requests/index.tsx` (useCallback, RequestStatus, openRequests entfernt)
- `data-explorer/index.tsx` (truncate entfernt)
- `infrastructure/hetzner.tsx` (formatBytes entfernt)
- `infrastructure/warp.tsx` (formatDateTime, shortId entfernt)
- `risk/index.tsx` (SUB_NAV Konstante entfernt)

---

## Build-Tests

```
npm run build:occ
Result: ✅ erfolgreich
Output: frontend/owner-control/index.html + assets/

npm run build:soc
Result: ✅ erfolgreich
Output: frontend/support-ops/index.html + assets/
```

---

## Manuelle Smoke-Tests (Frontend-seitig)

> Alle ohne echtes Backend — mit gemockten Daten oder Bootstrap-Fallback

| Test | Ergebnis |
|---|---|
| AppShell rendert ohne Bootstrap | ✅ (Loading-State sichtbar) |
| `UnauthorizedView` bei status=unauthorized | ✅ |
| `ForbiddenView` bei status=forbidden | ✅ |
| `OccDisabledView` bei occ_enabled=false | ✅ |
| `StepUpRequiredView` bei step_up_required=true | ✅ |
| `SystemStatusBanner` bei system_status=degraded | ✅ |
| Feature-Flag safe defaults (alle false) während Loading | ✅ |
| `DisabledModule` bei data_explorer_enabled=false | ✅ |
| `DisabledModule` bei warp_execution_enabled=false | ✅ |
| ErrorBoundary fängt Modul-Crash, Shell bleibt | ✅ |
| ConfirmModal: reason leer → Button disabled | ✅ |
| Sidebar blendet nicht-erlaubte Module aus | ✅ |
| Revenue: 4 Tabs navigierbar | ✅ |
| Data Explorer: User-Tab, Org-Tab, Subscriptions, Integrity | ✅ |
| Revenue: Billing-Tab mit FilterBar | ✅ |
| Revenue: CommercialTab mit RiskBadge | ✅ |

---

## Ausstehende Tests (Warp-Backend erforderlich)

### Integration-Tests (nach Bootstrap-Endpoint)

- [ ] Bootstrap-Endpoint antwortet → OCC lädt vollständig
- [ ] Executive KPIs zeigen echte Zahlen
- [ ] Decisions-Liste mit Pagination
- [ ] Decision decide → Audit-Log-Eintrag
- [ ] Decision triage → Status-Änderung
- [ ] Revenue Summary mit echten MRR-Daten
- [ ] Warp Dry-Run ohne echte Ausführung
- [ ] Data Explorer Users mit Masking

### Sicherheits-Tests

- [ ] CSRF: POST ohne Token → 403
- [ ] CSRF: POST mit falschen Token → 403
- [ ] Rate-Limit: Flood → 429
- [ ] Direkt-URL ohne Auth: `/api/owner-control/executive/summary` → 401
- [ ] Non-Owner User: `/api/owner-control/bootstrap` → 403

### E2E-Tests (Playwright — noch nicht geschrieben)

Geplant:
- Login → OCC-Aufruf → Executive lädt
- Decision-Flow: Open → Review → Decide → Audit
- Kill-Switch: Flag setzen → DisabledModule → Flag zurücksetzen → Modul aktiv
- Warp Dry-Run: Runbook auswählen → Dry-Run → Ergebnis lesen

---

## Bekannte Einschränkungen

1. **Keine echten Backend-Daten:** Alle Daten kommen aktuell aus dem laufenden Backend — aber das OCC-Backend ist noch nicht live. Die Komponenten werden vollständig gegen echte Endpunkte getestet sobald Warp Bootstrap liefert.

2. **SOC hat kein CSRF:** `socApi` schickt keinen CSRF-Token. Muss nachgezogen werden vor SOC-Go-Live.

3. **Keine automatischen Tests:** Kein Vitest-Setup, keine RTL-Tests geschrieben. Folgende Prioritäten für erste Tests:
   - `ConfirmModal` (Sicherheitskomponente)
   - `useOccQuery` (Data-Fetching-Hook)
   - `BootstrapContext` States

---

## Nächste Testschritte

1. Warp Bootstrap bereitstellen (Minimal-Response aus BACKEND_HANDOFF.md)
2. OCC gegen echte API starten: `npm run dev:occ`
3. Jeden Modul-Tab manuell durchgehen
4. Action-Flows testen: Decisions decide/triage/close
5. Playwright-Setup einrichten, erste E2E-Tests schreiben
