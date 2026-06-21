# OCC — Security Review Checklist

> Stand: Mai 2026  
> Zu prüfen vor Go-Live. Verantwortung: Warp (Backend) + Claude (Frontend).

---

## A — Authentifizierung & Zugang

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| A1 | 401 bei unauthentifiziertem Zugriff auf alle `/api/owner-control/**` | Warp | ☐ |
| A2 | 403 bei authentifiziertem User ohne `owner_control_access`-Eintrag | Warp | ☐ |
| A3 | `requireOwnerControlAccess` ist VOR allen OCC-Routen registriert | Warp | ☐ |
| A4 | `owner_control_access.revoked_at IS NULL` wird geprüft (weiche Sperre) | Warp | ☐ |
| A5 | Session-Invalidierung nach Revoke funktioniert sofort | Warp | ☐ |
| A6 | Step-Up-Auth-Flow implementiert (initiate + verify) | Warp | ☐ |
| A7 | `OCC_ENABLED=false` blockiert ALLE Endpoints sofort (ohne API-Neustart nicht nötig) | Warp | ☐ |

---

## B — Autorisierung (RBAC)

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| B1 | Alle mutatierenden Endpoints prüfen `allowed_actions` des OCC-Users | Warp | ☐ |
| B2 | Feature-Flags werden serverseitig ZUSÄTZLICH geprüft (nicht nur Frontend) | Warp | ☐ |
| B3 | `warp.execute` ohne `OCC_WARP_EXECUTION_ENABLED=true` → 403 | Warp | ☐ |
| B4 | `data_explorer`-Endpoints ohne `OCC_DATA_EXPLORER_ENABLED=true` → 403 | Warp | ☐ |
| B5 | `high_risk_actions_enabled: false` → alle high/critical-Aktionen abgelehnt | Warp | ☐ |

---

## C — CSRF

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| C1 | `GET /api/csrf-token` gibt Token zurück | Warp | ☐ |
| C2 | Alle POST/PATCH/DELETE-Endpoints prüfen `x-csrf-token` Header | Warp | ☐ |
| C3 | CSRF-Token rotiert nach jeder mutatierenden Anfrage oder ist Session-gebunden | Warp | ☐ |
| C4 | CORS ist auf erlaubte Origins begrenzt (`CORS_ORIGIN`) | Warp | ☐ |

---

## D — Input-Validierung

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| D1 | `reason`-Pflichtfeld bei mutatierenden Aktionen — Backend lehnt ohne Reason ab | Warp | ☐ |
| D2 | `request_id` wird gegen existierende IDs geprüft (kein Blind-Insert) | Warp | ☐ |
| D3 | Alle Query-Parameter werden escaped (SQL-Injection-Schutz) | Warp | ☐ |
| D4 | Warp-Runbook-IDs kommen aus der Registry — freie Inputs nicht akzeptiert | Warp | ☐ |
| D5 | Automation-Trigger: nur bekannte Job-IDs | Warp | ☐ |

---

## E — Audit

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| E1 | Alle mutatierenden OCC-Aktionen schreiben in `audit_log` (Namespace `owner_control`) | Warp | ☐ |
| E2 | Audit-Einträge enthalten: actor_id, action, entity_type, entity_id, reason, metadata | Warp | ☐ |
| E3 | Audit-Log ist unveränderlich (keine UPDATE/DELETE auf `audit_log`) | Warp | ☐ |
| E4 | Fehlgeschlagene Aktionen (403, 422) werden ebenfalls geloggt | Warp | ☐ |
| E5 | Bootstrap-Aufruf wird geloggt (als Zugriff) | Warp | ☐ |

---

## F — Datenschutz / Data Minimization

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| F1 | User-Email kommt aus Data Explorer nur mit Domain (Frontend baut `●●●●@domain`) | Beide | ☐ |
| F2 | Passwort-Hashes kommen NIEMALS aus OCC-Endpoints | Warp | ☐ |
| F3 | Zahlungsmittel (IBAN, Kreditkarten) kommen NIEMALS aus OCC-Endpoints | Warp | ☐ |
| F4 | Sensitive Felder sind in DB-Level Queries explizit excluded (kein `SELECT *`) | Warp | ☐ |
| F5 | Hetzner-Credentials kommen nicht in API-Responses | Warp | ☐ |

---

## G — Rate-Limiting

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| G1 | OCC-Endpoints haben Rate-Limits (kleiner als Public-API) | Warp | ☐ |
| G2 | Mutierende Aktionen haben engere Limits (z.B. 10/Minute) | Warp | ☐ |
| G3 | Warp-Execute hat besonders enges Limit (z.B. 2/Minute) | Warp | ☐ |

---

## H — Frontend-Sicherheit

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| H1 | Feature-Flags defaulten auf `false` während Bootstrap lädt (SAFE_FEATURE_DEFAULTS) | Claude ✅ | ✅ |
| H2 | `ConfirmModal` erzwingt `reason`-Eingabe — kein Bypass über State | Claude ✅ | ✅ |
| H3 | Keine sensitive Daten im `localStorage` oder `sessionStorage` | Claude ✅ | ✅ |
| H4 | `ErrorBoundary` auf jedem Modul — kein Crash des gesamten Shells | Claude ✅ | ✅ |
| H5 | `useCanAction()` gibt `false` zurück wenn Bootstrap fehlt | Claude ✅ | ✅ |
| H6 | OCC-Shell ist von bestehendem HTML-Frontend vollständig isoliert | Claude ✅ | ✅ |
| H7 | Keine Cross-Imports zwischen OCC (`@occ`) und SOC (`@soc`) | Claude ✅ | ✅ |

---

## I — Infrastruktur

| # | Prüfpunkt | Verantwortung | Status |
|---|---|---|---|
| I1 | `/owner-control/` ist NICHT über öffentliche Suchmaschinen-Crawling auffindbar | Warp | ☐ |
| I2 | `X-Robots-Tag: noindex, nofollow` Header auf OCC-Responses | Warp | ☐ |
| I3 | TLS-Zertifikat gültig für die OCC-Domain | Warp | ☐ |
| I4 | Security-Headers gesetzt: `X-Frame-Options`, `X-Content-Type-Options`, `CSP` | Warp | ☐ |
| I5 | OCC-Frontend-Build ist nicht in der öffentlichen `public/`-Ordner | Claude ✅ | ✅ |

---

## Zusammenfassung

**Frontend-Sicherheit (Claude):** Alle H-Punkte implementiert ✅  
**Backend-Sicherheit (Warp):** A–G und I noch offen — zu verifizieren vor Go-Live  

**Hochriskante offene Punkte (Warp, sofort prüfen):**
- A3: Middleware-Reihenfolge in `app.js`
- B2: Feature-Flags serverseitig zusätzlich validieren
- C2: CSRF auf ALLEN mutatierenden Endpoints
- E1: Audit-Logging vollständig
