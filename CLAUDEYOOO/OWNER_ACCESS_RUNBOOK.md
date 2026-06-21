# OCC — Owner Access Runbook

> Wie wird ein Owner eingerichtet? Wie wird Zugang entzogen?  
> Diese Dokumentation gilt für: Systemadministrator, Warp-Agent, Ops.

---

## Vorbedingungen

1. Migration 108 (`owner_control_access`-Tabelle) ist deployed
2. `requireOwnerControlAccess`-Middleware ist registriert
3. Nginx serviert `/owner-control/` → `frontend/owner-control/index.html`
4. ENV-Variable `OCC_ENABLED=true`

---

## Owner anlegen

### Schritt 1: Normaler User muss existieren

Der zukünftige Owner muss bereits ein reguläres TempConnect-Konto haben.
E-Mail: die E-Mail-Adresse des Kontos.

Prüfen:
```sql
SELECT id, email, display_name FROM users WHERE email = 'owner@example.de';
```

### Schritt 2: ENV-Allowlist prüfen (optional, empfohlen)

In `.env`:
```
OCC_OWNER_ALLOWLIST=owner@example.de
```

Die Middleware kann diese Allowlist als zusätzliche Sicherheit prüfen.

### Schritt 3: Migration ausführen (einmalig)

```bash
npm run migrate
```

### Schritt 4: Owner-Eintrag anlegen

Via CLI (bevorzugt):
```bash
npm run occ:grant-owner -- --email owner@example.de --reason "Initial owner setup"
```

Oder direkt via SQL (nur in Notfall):
```sql
INSERT INTO owner_control_access (user_id, email, role, reason)
SELECT id, email, 'owner', 'Initial setup'
FROM users WHERE email = 'owner@example.de';
```

### Schritt 5: Verifizieren

```bash
npm run occ:list-owners
```

Erwartete Ausgabe:
```
Owner Control Center — Active Owners
────────────────────────────────────
1. owner@example.de   role: owner   granted: 2026-05-20
```

### Schritt 6: Login testen

1. Owner loggt sich normal in TempConnect ein
2. Navigiert zu `/owner-control/`
3. Bootstrap-Endpoint antwortet → OCC lädt

---

## Owner-Zugang entziehen

### Normal (Soft-Revoke)

```bash
npm run occ:revoke-owner -- --email owner@example.de --reason "Rolle abgegeben"
```

Intern wird `revoked_at = NOW()` gesetzt. Der Eintrag bleibt für die Audit-History erhalten.

### Sofort-Sperren (Emergency)

```bash
npm run occ:revoke-owner -- --email owner@example.de --reason "Kompromittiert — Notfall-Sperre"
```

Danach sofort: Session-Invalidierung (Warp muss Session löschen):
```bash
npm run session:invalidate -- --user-id <uuid>
```

### Vollständige Sperre: Kill-Switch

Wenn der gesamte OCC-Zugang gesperrt werden muss:

```bash
# In .env setzen:
OCC_ENABLED=false

# API neu starten (ohne Downtime via rolling restart):
docker compose restart api
```

Das Frontend zeigt dann `OccDisabledView` für alle Zugriffe.

---

## Audit-Trail prüfen

Alle OCC-Aktionen sind in der Audit-Tabelle unter Namespace `owner_control`:

```sql
SELECT action, actor_id, entity_type, risk_level, reason, created_at
FROM audit_log
WHERE namespace = 'owner_control'
ORDER BY created_at DESC
LIMIT 50;
```

Zugang-Änderungen (grant/revoke) sind eigene Events:
```sql
SELECT * FROM audit_log
WHERE namespace = 'owner_control'
  AND action IN ('access.granted', 'access.revoked')
ORDER BY created_at DESC;
```

---

## Step-Up Authentication

Wenn erhöhte Sicherheit erforderlich ist (z.B. nach kompromittierter Session):

1. In der DB `step_up_required = true` für den User setzen
2. Das Frontend zeigt automatisch `StepUpRequiredView`
3. Der Owner verifiziert sich über `/api/owner-control/step-up/initiate`
4. Nach erfolgreicher Verifikation: `step_up_required = false`

Implementierung liegt bei Warp (Step-Up-Mechanismus: TOTP, E-Mail-Token, o.ä.).

---

## Multi-Owner

Mehrere Owner sind technisch möglich (ein Eintrag pro User in `owner_control_access`).
Empfehlung: maximal 2 Owner (Redundanz), beide mit vollständigem Audit.

```bash
# Zweiten Owner anlegen:
npm run occ:grant-owner -- --email cto@example.de --reason "CTO als Backup-Owner"
```

---

## Checkliste: OCC-Go-Live

- [ ] Migration 108 deployed
- [ ] `requireOwnerControlAccess` vor ALLEN `/api/owner-control/**` Routen
- [ ] Mindestens 1 Owner in `owner_control_access`
- [ ] `OCC_ENABLED=true` in Prod-ENV
- [ ] Nginx-Config deployed: `/owner-control/` → `frontend/owner-control/index.html`
- [ ] Bootstrap-Endpoint antwortet mit korrektem JSON-Envelope
- [ ] Owner kann `/owner-control/` aufrufen und OCC lädt
- [ ] Nicht-Owner bekommt 403 bei `/api/owner-control/bootstrap`
- [ ] Nicht-eingeloggter User bekommt 401
