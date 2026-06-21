# SOC — BPO / Externes Callcenter: Readiness-Checkliste

> Wann kann ein externer BPO-Partner das SOC produktiv nutzen?  
> Stand: Mai 2026

---

## Was "BPO-bereit" bedeutet

Ein externer Support-Partner (Callcenter, BPO) greift auf das SOC unter `/support-ops/` zu.
Ihre Agenten haben:
- Eigene Login-Accounts in TempConnect (normale User-Registration)
- Eintrag in `support_agents` mit `scope: "external"` und `vendor_id`
- Maximale Daten-Maskierung
- Nur Zugriff auf ihre zugewiesenen Queues

**Ziel:** BPO-Agenten können Cases bearbeiten ohne direkten Zugriff auf sensitive Plattformdaten.

---

## Checkliste: Technisch

### Backend (Warp)

- [ ] `support_agents`-Tabelle existiert mit `vendor_id`, `scope`, `data_scope`, `masking_rules`
- [ ] `requireSupportAccess`-Middleware filtert nach `scope: "external"` + `vendor_id`
- [ ] Cases-API filtert serverseitig: externe Agenten sehen nur Queue-/Assigned-Cases
- [ ] Knowledge-Artikel gefiltert nach `allowed_roles`: externe Agenten sehen nur `role: ["agent", "external"]`
- [ ] Interne Notizen (`note_type: "internal"`) kommen NICHT in Responses für externe Agenten
- [ ] Masking-Middleware: externe Agenten bekommen Email=null, Phone=null, Name=initials
- [ ] Audit-Log: alle Lookup-Events mit `vendor_id` getaggt
- [ ] Feature-Flags für externe Agenten: `supervisor_view=false`, `quality_metrics=false`, `audit_view=false`
- [ ] Eskalation "to OCC" für externe Agenten nicht erlaubt (muss über internen Supervisor gehen)

### Frontend (Claude) ✅

- [x] `scope === "external"` → prominenter Scope-Warning-Banner
- [x] Sidebar blendet Supervisor, Quality, Audit aus wenn Features disabled
- [x] `MaskedField` rendert null-Werte als "[verborgen]"
- [x] Externe Agenten sehen keine "interne Notiz"-Schaltfläche
- [x] `data_scope: "assigned_only"` → Cases-Liste zeigt nur eigene Cases

### Nginx

- [ ] `/support-ops/` erreichbar für externe IP-Adressen (nicht nur internes Netz)
- [ ] HTTPS erzwungen
- [ ] Optional: IP-Allowlist für BPO-Büro-IPs

---

## Checkliste: Organisatorisch

- [ ] **Datenschutzvertrag (DPA / AVV)** mit dem BPO-Partner abgeschlossen (DSGVO Art. 28)
- [ ] **Schulung:** BPO-Agenten kennen die Einschränkungen (keine echten Kontaktdaten, nur Case-Kontext)
- [ ] **Eskalations-Prozess definiert:** Wenn externer Agent nicht weiterkommt → interner Supervisor → ggf. OCC
- [ ] **Account-Verwaltung:** Wer legt externe Agent-Accounts an? Wer entzieht Zugang?
- [ ] **SLA-Definition:** Welche SLAs gelten für externe Agenten? (eigene Queue-SLAs?)
- [ ] **Qualitätssicherung:** Supervisor prüft BPO-Cases regelmäßig (Quality-Modul)
- [ ] **Incident-Prozess:** Was passiert wenn ein BPO-Agent Datenschutzverletzung meldet?

---

## BPO-Onboarding-Prozess

### 1. Accounts anlegen

```bash
# Für jeden BPO-Agenten:
# 1. User normal registrieren lassen (oder Admin-CLI)
# 2. Support-Agent-Eintrag anlegen:
npm run soc:grant-agent -- \
  --email agent@bpo-partner.de \
  --scope external \
  --vendor-id bpo-acme-gmbh \
  --queues "Billing,Account" \
  --masking '{"user_email":"hidden","user_phone":"hidden","user_name":"initials_only"}'
```

### 2. Zugangsdaten übergeben

- Login-URL: `https://app.tempconnect.de/login`
- Nach Login: `/support-ops/` aufrufen
- Kein separater SOC-Login — gleiche Credentials wie reguläre Plattform

### 3. Smoke-Test

- Agent loggt sich ein und navigiert zu `/support-ops/`
- SOC lädt, External-Scope-Banner sichtbar
- Cases-Liste zeigt nur zugewiesene Cases
- User-Lookup und Org-Lookup zeigen nur erlaubte (maskierte) Daten
- Kein Supervisor-Panel, kein Audit-Log sichtbar

### 4. Zugangsentzug

```bash
npm run soc:revoke-agent -- --email agent@bpo-partner.de --reason "Vertrag beendet"
```

---

## Datenschutz-Checks vor BPO-Go-Live

| Prüfpunkt | Status |
|---|---|
| AVV mit BPO-Partner abgeschlossen | ☐ |
| Externe Agenten sehen keine E-Mails (backend-seitig) | ☐ Warp |
| Externe Agenten sehen keine Telefonnummern | ☐ Warp |
| Externe Agenten sehen nur Initialen | ☐ Warp |
| Interne Notizen sind für externe Agenten unsichtbar | ☐ Warp |
| Eskalation zu OCC ist gesperrt für externe Agenten | ☐ Warp |
| Audit-Trail für alle Lookup-Aktionen | ☐ Warp |
| Datenexport ist nicht möglich | ✅ Claude (kein Export-Button) |
| Bildschirmaufnahme-Richtlinie für BPO-Büros definiert | ☐ Organisatorisch |

---

## Skalierbarkeit

Das SOC unterstützt beliebig viele BPO-Partner parallel. Jeder hat seine eigene `vendor_id`.
Queue-Zuweisungen steuern welche Cases welcher Partner sieht.

Für große BPO-Setups (100+ Agenten):
- Queue-Granularität wichtig (kleine Queues → weniger Sichtbarkeit)
- Supervisor je Partner (eigener `supervisor`-Account mit `vendor_id`)
- Regelmäßige Audit-Reviews durch internen Supervisor
