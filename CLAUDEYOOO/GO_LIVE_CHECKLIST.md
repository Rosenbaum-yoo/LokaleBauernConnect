# OCC — Go-Live Checkliste

> Alle Punkte müssen vor dem ersten echten Owner-Login erfüllt sein.  
> Stand: Mai 2026

---

## Phase 1 — Infrastruktur-Bereitschaft

- [ ] **Warp:** DB-Migration 108 `owner_control_access` deployed und verifiziert
- [ ] **Warp:** `requireOwnerControlAccess`-Middleware in `api/app.js` registriert
- [ ] **Warp:** Nginx-Config für `/owner-control/` deployed und getestet
- [ ] **Warp:** OCC-Build auf Server verfügbar (`frontend/owner-control/index.html`)
- [ ] **Warp:** ENV-Variablen gesetzt (mindestens `OCC_ENABLED=true`)
- [ ] **Warp:** TLS-Zertifikat gültig

---

## Phase 2 — Backend-Endpunkte

- [ ] **Warp:** `GET /api/owner-control/bootstrap` antwortet mit korrektem Envelope
- [ ] **Warp:** Bootstrap gibt korrektes `identity`-Objekt zurück
- [ ] **Warp:** Bootstrap gibt `feature_flags` zurück (alle gesetzten Flags)
- [ ] **Warp:** Bootstrap gibt `allowed_modules` zurück
- [ ] **Warp:** Bootstrap gibt `executive_summary` zurück (kann Null-Werte enthalten)

---

## Phase 3 — Zugangs-Verwaltung

- [ ] **Warp:** Mindestens 1 Owner in `owner_control_access` eingetragen
- [ ] **Warp:** CLI-Befehl `npm run occ:grant-owner` funktioniert
- [ ] **Warp:** CLI-Befehl `npm run occ:revoke-owner` funktioniert
- [ ] **Warp:** CLI-Befehl `npm run occ:list-owners` funktioniert

---

## Phase 4 — Smoke-Tests (vor Owner-Zugang)

### Unauthentifizierter Zugriff
- [ ] `curl /api/owner-control/bootstrap` → `401 UNAUTHORIZED`
- [ ] Browser `/owner-control/` ohne Login → OCC lädt, zeigt `UnauthorizedView`

### Authentifiziert, kein Owner
- [ ] Login mit regulärem User → `GET /bootstrap` → `403 FORBIDDEN`
- [ ] Browser `/owner-control/` → OCC lädt, zeigt `ForbiddenView`

### Owner-Login
- [ ] Owner loggt sich ein → `/owner-control/` → OCC lädt vollständig
- [ ] Sidebar zeigt korrekte Module
- [ ] Executive-Dashboard zeigt KPIs (auch wenn alle 0)
- [ ] Kein JavaScript-Fehler in der Browser-Konsole

---

## Phase 5 — Modul-Tests

- [ ] **Executive:** Lädt ohne Fehler, KPIs sichtbar
- [ ] **Decisions:** Liste lädt (kann leer sein)
- [ ] **Revenue:** Summary-Tab lädt, Plan-Breakdown sichtbar
- [ ] **Platform:** Metriken laden
- [ ] **Operations:** Health-Status sichtbar
- [ ] **Support Oversight:** Eskalationen-Tab sichtbar
- [ ] **Risk:** Signals-Tab sichtbar
- [ ] **Audit:** Feed lädt
- [ ] **Infrastructure:** Alle 4 Sub-Views erreichbar
- [ ] **Data Explorer:** Zeigt `DisabledModule` wenn Flag `false`
- [ ] **Automation:** Lädt, Jobs sichtbar oder leer

---

## Phase 6 — Kill-Switch-Tests

- [ ] `OCC_ENABLED=false` → alle Users sehen `OccDisabledView`
- [ ] `OCC_DATA_EXPLORER_ENABLED=false` → Data Explorer zeigt `DisabledModule`
- [ ] `OCC_WARP_EXECUTION_ENABLED=false` → Warp-Modul zeigt `DisabledModule`
- [ ] `OCC_RUNBOOK_EXECUTION_ENABLED=false` → Automation zeigt `DisabledModule`

---

## Phase 7 — Action-Tests (mit echtem Backend)

- [ ] **Decision decide:** Request in DB anlegen → OCC decide → Audit-Log-Eintrag vorhanden
- [ ] **Decision triage:** Priority + Risk-Level ändern → Audit-Log-Eintrag vorhanden
- [ ] **Decision close:** Schließen → Status `closed` → Audit-Log
- [ ] **Warp dry-run:** Runbook dry-run → Ergebnis sichtbar → kein echter Eingriff
- [ ] **Automation trigger:** Job trigger → Bestätigung → Ausführung
- [ ] **ConfirmModal:** reason-Feld leer → Button gesperrt ✅ (Frontend)
- [ ] **ConfirmModal:** reason-Feld leer → Backend lehnt ab ✅ (Backend)

---

## Phase 8 — Sicherheits-Abnahme

- [ ] Security Review (SECURITY_REVIEW.md) vollständig abgehakt
- [ ] CSRF-Test: POST ohne Token → 403
- [ ] Rate-Limit-Test: Viele Requests → 429
- [ ] Audit-Feed prüfen: alle Aktionen aus Phase 7 sind geloggt
- [ ] Keine sensiblen Daten in Browser-Konsole / Network-Tab sichtbar

---

## Phase 9 — Dokumentation

- [ ] IMPLEMENTATION_STATE.md aktuell
- [ ] BACKEND_HANDOFF.md vollständig abgearbeitet
- [ ] OWNER_ACCESS_RUNBOOK.md an Ops übergeben
- [ ] WARP-TASKS-PERMANENT.md abgehakte Punkte markiert

---

## Go/No-Go

| Bedingung | Status |
|---|---|
| Bootstrap antwortet korrekt | ☐ |
| Owner kann einloggen | ☐ |
| Mindestens Executive + Decisions funktionieren | ☐ |
| Kein 500er in Browser-Konsole | ☐ |
| Audit-Log schreibt | ☐ |
| CSRF aktiv | ☐ |

**GO wenn:** Alle 6 Bedingungen erfüllt.  
**NO-GO wenn:** Irgendein Sicherheitspunkt (A–G in SECURITY_REVIEW.md) offen.
