# OCC — Offene Entscheidungen

> Technische und Produkt-Entscheidungen die noch ausstehen oder dokumentiert werden müssen.  
> Stand: Mai 2026

---

## Status-Legende

- 🔴 Blocker — muss vor Go-Live entschieden werden
- 🟡 Wichtig — sollte bald entschieden werden
- 🟢 Nice-to-Have — kann nach Go-Live entschieden werden
- ✅ Entschieden

---

## Offene Entscheidungen

### OD-001 — Step-Up-Auth-Mechanismus 🔴

**Frage:** Welcher Step-Up-Mechanismus wird verwendet?

**Optionen:**
1. E-Mail-Token (einfach, kein Extra-Setup)
2. TOTP (Google Authenticator, höhere Sicherheit)
3. Biometrie / WebAuthn (höchste Sicherheit)

**Impact:** Frontend zeigt `StepUpRequiredView` und verlinkt auf `/api/owner-control/step-up/initiate`.
Das Frontend ist bereit — der Mechanismus dahinter ist Warp-Entscheidung.

**Entscheidungsträger:** Dennis (Owner) + Warp

---

### OD-002 — SOC CSRF-Implementierung 🔴

**Frage:** SOC hat aktuell kein CSRF-Management.

**Aktueller Stand:** `socApi` schickt keinen CSRF-Token. Mutierende Aktionen (POST /cases/:id/action, POST /escalations) sind ohne CSRF.

**Vorgeschlagene Lösung:** SOC analog zu OCC umbauen — `GET /api/csrf-token` aufrufen, Token cachen, bei mutierenden Requests mitschicken. Oder: Cookie-basiertes CSRF (Warp implementiert, Frontend muss nichts ändern).

**Blockiert:** SOC-Go-Live (mutierende Aktionen dürfen nicht ohne CSRF live gehen)

**Entscheidungsträger:** Warp + Claude

---

### OD-003 — Decisions & Requests: Woher kommen die Einträge? 🔴

**Frage:** Wer erstellt `decisions_requests`-Einträge? Nur Warp manuell? Automatisch aus anderen Domains?

**Optionen:**
1. Nur manuell durch Warp/Ops (Low-tech)
2. Automatisch: Wenn ein Custom-Offer über X€ erstellt wird → Request
3. Automatisch: Wenn Risk-Signal kritisch → Request
4. API für andere Domains zum Erstellen von Requests

**Impact:** Frontend-Seite ist gebaut und erwartet die Daten. Die Business-Logik wann Requests entstehen liegt im Backend.

**Entscheidungsträger:** Dennis + ChatGPT (Produkt) + Warp (Implementierung)

---

### OD-004 — Revenue-Daten: Aggregations-Source 🟡

**Frage:** Wo und wie wird MRR/ARR berechnet?

**Optionen:**
1. Live-Berechnung bei jedem Request (teuer bei vielen Subscriptions)
2. Materialized View mit stündlicher Aktualisierung
3. Dedizierter Analytics-Job (tägliche Aggregation)

**Impact:** OCC-Frontend fragt `GET /api/owner-control/revenue/summary`. Das Format ist definiert (API_CONTRACT.md). Die Quelle ist Warp-Entscheidung.

**Entscheidungsträger:** Warp

---

### OD-005 — Infrastructure Telemetrie-Collector 🟡

**Frage:** Wie kommt der Hetzner-State in die API?

**Optionen:**
1. Hetzner-API direkt aus Backend (Latenz, Rate-Limit)
2. Dedizierter Collector-Service (Daemon auf Hetzner-Host, schreibt in DB)
3. Prometheus + Push-Gateway

**Impact:** OCC `infrastructure/hetzner.tsx` zeigt leere oder veraltete Daten bis Telemetrie läuft. `DisabledModule` wird nicht gezeigt — stattdessen leere Tabellen mit Skeleton-State. Das ist akzeptabel für Phase 1.

**Entscheidungsträger:** Warp

---

### OD-006 — Multi-Owner RBAC 🟢

**Frage:** Brauchen wir unterschiedliche OCC-Rollen (z.B. `owner` vs `read_only_owner`)?

**Aktueller Stand:** `owner_control_access.role = 'owner'` — alle Owner haben gleiche Rechte.

**Optionen:**
1. Flat (alle Owner gleich) — aktuell implementiert
2. Differenziert: `owner`, `owner_readonly`, `ops_admin`

**Impact:** Frontend prüft bereits `useCanAction()` — die Action-Liste kommt vom Bootstrap. Wenn Warp verschiedene `allowed_actions` je Rolle zurückgibt, funktioniert das Frontend sofort.

**Entscheidungsträger:** Dennis (Produkt)

---

### OD-007 — Playwright E2E Setup 🟢

**Frage:** Wann und wie werden E2E-Tests eingerichtet?

**Vorschlag:** Nach Go-Live Phase 1 (Bootstrap funktioniert), Playwright-Setup einrichten.
Erste Tests: Login-Flow, Executive-Load, Decision-Flow.

**Verantwortung:** Claude (Frontend-Tests) + Warp (Test-Daten-Setup, Testdatenbank)

---

### OD-008 — OCC-Build in CI/CD 🟡

**Frage:** Wann wird `npm run build:occ` (und `build:soc`) in die CI/CD-Pipeline integriert?

**Vorschlag:** Als eigener CI-Step nach Backend-Tests:
1. `npm run typecheck` (Frontend)
2. `npm run build:occ`
3. `npm run build:soc`
4. Artifacts deployen (Nginx-Volume)

**Verantwortung:** Warp (CI/CD-Pipeline) + Claude (Build-Skripte sind bereit)

---

## Entschiedene Punkte

### ✅ ED-001 — Zwei getrennte Vite-Apps (OCC + SOC)

**Entschieden:** Zwei vollständig getrennte Shells, keine Code-Sharing.
**Begründung:** Klare Isolation, unterschiedliche Zielgruppen, unterschiedliche Security-Profiles.

### ✅ ED-002 — Response-Envelope nur für OCC, nicht für SOC

**Entschieden:** OCC erwartet `{ success, data, error }` Wrapper. SOC erwartet direktes JSON.
**Begründung:** OCC war zuerst, SOC wurde separat ohne Envelope designed. Wird zukünftig vereinheitlicht.

### ✅ ED-003 — Feature-Flags aus Bootstrap (nicht aus separatem Endpoint)

**Entschieden:** Feature-Flags kommen im Bootstrap-Response mit.
**Begründung:** Kein Extra-Request, kein Flash-of-Wrong-State, einfachere Implementierung.

### ✅ ED-004 — Masking-Verantwortung liegt beim Backend

**Entschieden:** Backend maskiert sensitive Felder. Frontend zeigt nur was es bekommt.
**Ausnahme:** Data Explorer User-Email: Domain kommt vom Backend, Local-Part wird Frontend-seitig maskiert.
