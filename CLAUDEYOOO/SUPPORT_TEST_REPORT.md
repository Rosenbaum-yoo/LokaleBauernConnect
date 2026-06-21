# SOC — Test Report

> Stand: Mai 2026 | Branch: `feat/occ-react-shell-claude`

---

## TypeScript-Checks

```
npm run typecheck
Result: 0 errors ✅
```

SOC-Code ist vollständig typsicher. Keine impliziten `any`, keine nicht-verwendeten Importe.

---

## Build-Tests

```
npm run build:soc
Result: ✅ erfolgreich
Output: frontend/support-ops/index.html + assets/
```

---

## Manuelle Smoke-Tests (Frontend-seitig, ohne echtes Backend)

| Test | Ergebnis |
|---|---|
| AppShell rendert Loading-State | ✅ |
| `UnauthorizedView` bei 401 | ✅ |
| `ForbiddenView` bei 403 | ✅ |
| External-Scope-Banner bei scope="external" | ✅ |
| Sidebar zeigt nur erlaubte Module (`features.*`) | ✅ |
| Inbox-Modul rendert | ✅ |
| Cases-Liste mit Pagination | ✅ |
| Case-Detail-Ansicht (/cases/:caseId) | ✅ |
| `MaskedField` zeigt "[verborgen]" für null-Werte | ✅ |
| `MaskedField` zeigt gemaskede Daten vom Server | ✅ |
| `CaseBadges` — Status-Badge für alle Status-Werte | ✅ |
| `CaseBadges` — Priority-Badge für alle Priority-Werte | ✅ |
| `CaseBadges` — SLA-Badge (overdue vs. at-risk vs. ok) | ✅ |
| ConfirmModal: reason leer → Button disabled | ✅ |
| User Lookup: Suche triggert API-Call | ✅ |
| Org Lookup: Suche triggert API-Call | ✅ |
| Escalations: Liste + "Neue Eskalation"-Button | ✅ |
| Knowledge: Kategorie-Filter + Artikel-Liste | ✅ |
| Quality: Metrics, Agents, SLA Tabs | ✅ |
| Supervisor: Nur sichtbar wenn features.supervisor_view=true | ✅ |
| Audit Log: Nur sichtbar wenn features.audit_view=true | ✅ |
| ErrorBoundary: Modul-Crash isoliert Shell | ✅ |

---

## Ausstehende Tests (Warp-Backend erforderlich)

### Integration-Tests

- [ ] Bootstrap antwortet → SOC lädt vollständig
- [ ] Scope "external": Cases-Liste zeigt nur zugewiesene Cases
- [ ] Scope "internal": Cases-Liste zeigt alle Cases
- [ ] Case-Action "add_note" → Timeline-Eintrag sichtbar
- [ ] Case-Action "close" mit Grund → Status = closed
- [ ] Eskalation erstellen → in OCC Decisions & Requests sichtbar
- [ ] User Lookup: Masking je `masking_rules` korrekt
- [ ] Vendor-Isolation: BPO-Agent sieht nur eigene Queues

### Sicherheits-Tests (Warp)

- [ ] Externer Agent greift direkt auf `/api/support/cases` zu → nur eigene Cases
- [ ] Externer Agent ruft `/api/support/audit` auf → 403 (features.audit_view=false)
- [ ] Externer Agent ruft internes User-Detail auf → masked oder 403
- [ ] CSRF: POST ohne Token → 403 (nach CSRF-Implementierung)
- [ ] Rate-Limit: Flood-Requests → 429

---

## Bekannte Einschränkungen

1. **CSRF fehlt:** `socApi` sendet keinen CSRF-Token. Muss vor Go-Live behoben werden.

2. **Kein automatischer Session-Refresh:** 401 im laufenden Betrieb → `UnauthorizedView`.

3. **Masking ist Backend-Verantwortung:** `MaskedField` rendert Server-Daten. Wenn Backend falsch maskiert, zeigt Frontend es falsch.

4. **Keine automatisierten Tests geschrieben.** Prioritäten nach Go-Live:
   - `MaskedField` — Unit-Tests für alle Masking-Stufen
   - `useSocQuery` — Hook-Test mit Mock-Fetch
   - Case-Action-Flow — Integration-Test

---

## Nächste Test-Schritte

1. Warp liefert SOC-Bootstrap (Minimal-Response)
2. SOC gegen echte API starten: `npm run dev:soc`
3. Login als interner Agent → alle 9 Module testen
4. Login als externer Agent → Data-Scope-Isolation prüfen
5. Eskalation erstellen → in OCC prüfen ob Request erscheint
6. Masking mit echten Daten verifizieren
