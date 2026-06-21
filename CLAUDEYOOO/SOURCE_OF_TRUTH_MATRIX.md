# OCC — Source-of-Truth Matrix

> Wer besitzt welche Daten? Wo liegt die Wahrheit?  
> Das OCC liest und aggregiert — es besitzt keine eigenen Daten.

---

## Kernprinzip

```
OCC = Aggregation-Layer, kein Source of Truth.
Backend-Domains sind die Wahrheit.
OCC spiegelt, filtert und entscheidet — schreibt aber nur in seinen eigenen Namespace.
```

---

## Matrix: Daten → Domain → OCC-Leseberechtigung

| Datenbereich | Source of Truth | Liest OCC davon? | OCC schreibt? | Audit-Namespace |
|---|---|---|---|---|
| Nutzer-Stammdaten | User-Domain (users-Tabelle) | ✅ (read-only, maskiert) | ❌ | — |
| Nutzer-Status (active/inactive) | User-Domain | ✅ | ❌ | — |
| Organisation | Org-Domain | ✅ (read-only) | ❌ | — |
| Plan / Subscription | Billing-Domain | ✅ | ❌ | — |
| MRR / ARR / Churn | Billing-Domain | ✅ | ❌ | — |
| Invoices / Zahlungen | Billing-Domain | ✅ (read-only) | ❌ | — |
| Custom Offers (Commercial) | Commercial-Domain | ✅ | ✅ (approve/reject) | `owner_control.commercial.*` |
| Decisions & Requests | **OCC-Domain** | ✅ | ✅ (decide/triage/close) | `owner_control.decision.*` |
| Feature Flags | Config (ENV) | ✅ | ❌ | — |
| Audit-Feed | Audit-Domain | ✅ (eigener Namespace) | ✅ (via Aktionen) | `owner_control.*` |
| Support-Cases | Support-Domain | ✅ (Oversight, kein Eingriff) | ❌ (nur lesen) | — |
| Support-Eskalationen | Support-Domain | ✅ | ❌ (SOC owns this) | — |
| Platform-Metriken | Analytics-Domain | ✅ | ❌ | — |
| Infrastructure-State | Hetzner/Telemetry | ✅ | ⚠️ (via Warp, mit Audit) | `owner_control.warp.*` |
| Warp-Runbooks | Warp-Registry | ✅ | ✅ (execute, dry-run) | `owner_control.warp.*` |
| Automation-Jobs | Automation-Domain | ✅ | ✅ (trigger) | `owner_control.automation.*` |
| Compliance-Punkte | Compliance-Domain | ✅ | ❌ | — |
| Risk-Signals | Risk-Engine | ✅ | ❌ | — |
| Integrity-Checks | DB-Layer | ✅ | ❌ | — |

---

## Schreib-Operationen im Detail

### Was OCC schreiben darf

1. **Decisions & Requests** — eigene Domain, OCC ist Source of Truth
   - Entscheidungen (approve/reject/defer)
   - Triage (Priority/Risk-Level hochstufen)
   - Schließen (close)
   - Zuweisen (assign)

2. **Commercial Offers** — OCC entscheidet, Commercial-Domain führt aus
   - `approve` → Commercial-Domain aktiviert den Plan
   - `reject` → Commercial-Domain archiviert das Angebot
   - `propose` → Neues Angebot erstellen (aus OCC)

3. **Warp-Ausführung** — OCC triggert, Warp führt aus
   - `execute` mit Reason + Confirmation
   - `dry-run` für Vorschau

4. **Automation** — OCC triggert, Automation-Domain führt aus
   - `trigger` mit Reason + Confirmation

### Was OCC NICHT schreiben darf

- Nutzer-Daten (kein User-Management aus OCC)
- Subscriptions/Billing (kein direktes Plan-Upgrade aus OCC)
- Support-Cases (kein direktes Case-Editing aus OCC — das ist SOC-Territorium)
- Feature Flags (nur lesend — Warp setzt sie per ENV)

---

## Masking-Regeln

### Wer maskiert was?

```
Backend maskiert → Frontend zeigt maskiert
```

Das Frontend maskiert NICHTS eigenständig außer bei `data-explorer/users` (Email-Domain wird client-seitig aus der vollständigen E-Mail extrahiert und der Local-Part mit `●●●●` ersetzt).

**Alle anderen Maskierungen passieren im Backend:**

| Feld | Maskierung | Wer maskiert |
|---|---|---|
| User-Email im Data Explorer | `●●●●@domain.de` (Frontend extrahiert Domain) | Frontend (einzige Ausnahme) |
| Zahlungsmittel | Kommt nie aus OCC-Endpoints | Backend blockiert |
| Passwort-Hash | Kommt nie aus OCC-Endpoints | Backend blockiert |
| Vollständige User-Profile | Nur in SOC Lookup (Backend maskiert) | Backend |

---

## Aggregation-Pattern

OCC aggregiert Daten aus verschiedenen Backend-Domains. Das Backend ist verantwortlich dafür, diese Aggregation korrekt zu implementieren. Das Frontend fragt nur einen Endpunkt:

```
GET /api/owner-control/executive/summary
→ Backend aggregiert: User-Count (User-Domain) + MRR (Billing) + Open Decisions (OCC-Domain) + ...
```

Das Frontend hat keine direkte Verbindung zu den Einzel-Domains.

---

## Temporal-Konsistenz

OCC-Daten müssen nicht real-time sein. Akzeptable Staleness:

| Bereich | Max. Staleness |
|---|---|
| Executive KPIs | 5 Minuten |
| Risk Signals | 1 Minute (kritisch) |
| Operations Health | 30 Sekunden |
| Revenue Summary | 15 Minuten |
| Platform Metrics | 15 Minuten |
| Audit Feed | Real-time (bei eigenen Actions), 1 Minute (historisch) |
| Infrastructure Status | 30 Sekunden |
| Decisions & Requests | Real-time |
