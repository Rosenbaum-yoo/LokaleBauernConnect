# SOC — RBAC Matrix (Rollen & Berechtigungen)

> Stand: Mai 2026  
> Wer darf was im Support Operations Center?

---

## Rollen-Übersicht

| Rolle | Scope | Beschreibung |
|---|---|---|
| `agent` (intern) | `all_cases` oder `assigned_only` | Standard interner Support-Agent |
| `agent` (extern/BPO) | `assigned_only` | Externer Callcenter-Agent, eingeschränkte Sicht |
| `supervisor` | `all_cases` | Team-Lead, sieht alle Agenten und Metriken |
| `admin` | `all_cases` | SOC-Admin, volle Rechte inkl. Agent-Verwaltung |

**Hinweis:** Rolle und Scope kommen aus dem Bootstrap (`identity.role`, `identity.scope`, `identity.data_scope`).
Das Frontend rendert Sidebar und Module entsprechend.

---

## Action-Matrix

| Aktion | Agent intern | Agent extern (BPO) | Supervisor | Admin |
|---|---|---|---|---|
| Cases anzeigen (eigene Queue) | ✅ | ✅ | ✅ | ✅ |
| Cases anzeigen (alle) | ✅ | ❌ | ✅ | ✅ |
| Case-Detail anzeigen | ✅ | ✅ (nur zugewiesene) | ✅ | ✅ |
| Interne Notiz hinzufügen | ✅ | ❌ | ✅ | ✅ |
| Externe Notiz hinzufügen | ✅ | ✅ | ✅ | ✅ |
| Case zuweisen (eigene Queue) | ✅ | ❌ | ✅ | ✅ |
| Case zwischen Queues verschieben | ✅ | ❌ | ✅ | ✅ |
| Case schließen | ✅ | ✅ (mit Einschränkung) | ✅ | ✅ |
| Case-Priorität ändern | ✅ | ❌ | ✅ | ✅ |
| Eskalation erstellen (→ OCC) | ✅ | ❌ | ✅ | ✅ |
| User Lookup | ✅ | ⚠️ (domain_only masking) | ✅ | ✅ |
| Org Lookup | ✅ | ⚠️ (eingeschränkt) | ✅ | ✅ |
| Knowledge Base lesen | ✅ | ✅ | ✅ | ✅ |
| Knowledge Base bearbeiten | ❌ | ❌ | ✅ | ✅ |
| Quality Metrics anzeigen | ❌ | ❌ | ✅ | ✅ |
| Agent-Performance anzeigen | ❌ | ❌ | ✅ | ✅ |
| Supervisor-Panel | ❌ | ❌ | ✅ | ✅ |
| Audit Log anzeigen | ❌ | ❌ | ✅ | ✅ |
| Inbox (eigene Cases) | ✅ | ✅ | ✅ | ✅ |

---

## Feature-Flag-Gates (Bootstrap `features`)

| Feature-Flag | Steuert | Standard (intern) | Standard (extern) |
|---|---|---|---|
| `user_lookup` | User-Lookup-Modul sichtbar | `true` | `false` oder `true` (je Vertrag) |
| `org_lookup` | Org-Lookup-Modul sichtbar | `true` | `false` oder `true` |
| `supervisor_view` | Supervisor-Panel + Quality-Agenten-Tab | `false` (nur für Supervisors) | `false` |
| `quality_metrics` | Quality-Modul-Tabs sichtbar | `false` (nur für Supervisors) | `false` |
| `audit_view` | Audit-Log-Modul sichtbar | `false` (nur für Supervisors) | `false` |
| `knowledge_base` | Knowledge-Modul sichtbar | `true` | `true` |

**Implementierung:** Das Frontend prüft `features.<flag>` aus dem Bootstrap. Module die nicht erlaubt sind, erscheinen nicht in der Sidebar.

---

## Data-Scope-Regeln

### `data_scope: "all_cases"`

- Cases-Liste zeigt ALLE Cases (über alle Queues)
- Filter-Dropdown "Meine Queues" / "Alle" verfügbar
- Supervisor-Panel und Quality-Tabs zugänglich (wenn Feature aktiv)

### `data_scope: "assigned_only"`

- Cases-Liste zeigt NUR eigene und Queue-zugewiesene Cases
- Kein Filter für andere Queues
- Kein Zugriff auf andere Agenten-Cases
- Cases-API filtert serverseitig (`WHERE assigned_to = agent_id OR queue IN agent.queue_assignments`)

**Wichtig:** Der Filter passiert SERVERSEITIG. Das Frontend vertraut der API und rendert was kommt. Ein externer Agent der direkt die API aufruft ohne Frontend bekommt trotzdem gefilterte Daten.

---

## Masking-Regeln per Rolle

Die `masking_rules` kommen aus dem Bootstrap (`identity.masking_rules`) und steuern wie `MaskedField` rendert.

### Interne Agenten

```json
{
  "user_email": "domain_only",
  "user_phone": "hidden",
  "user_name": "full"
}
```

→ `MaskedField` zeigt `●●●●@domain.de`, Telefon versteckt, voller Name

### Externe Agenten (BPO)

```json
{
  "user_email": "hidden",
  "user_phone": "hidden",
  "user_name": "initials_only"
}
```

→ Email komplett versteckt, Telefon versteckt, nur Initialen ("M. S.")

### Supervisors/Admins

```json
{
  "user_email": "domain_only",
  "user_phone": "masked_partial",
  "user_name": "full"
}
```

**Kritisch:** Das Backend maskiert die Daten und sendet nur was erlaubt ist. Das Frontend zeigt nur was es bekommt. `MaskedField` ist kein Sicherheits-Feature — es ist eine Display-Konvention.

---

## Vendor-Isolation (BPO)

Externe Agenten haben eine `vendor_id` im Bootstrap. Diese stellt sicher:

1. Externe Agenten sehen nur Cases ihrer Queues (Backend-seitig gefiltert)
2. Externe Agenten sehen keine internen Notizen (`note_type: "internal"`)
3. Externe Agenten können keine Eskalationen zu OCC senden (nur via Supervisor)
4. Audit-Events von externen Agenten sind mit `vendor_id` getaggt

```json
{
  "agent_id": "uuid",
  "vendor_id": "bpo-acme-gmbh",
  "data_scope": "assigned_only"
}
```

---

## Allowed Actions (im Bootstrap)

Jeder Agent bekommt eine Liste erlaubter Aktionen im Bootstrap:

| Action Key | Bedeutung |
|---|---|
| `case.assign` | Case zuweisen |
| `case.close` | Case schließen |
| `case.note.add` | Notiz hinzufügen |
| `case.note.internal` | Interne Notiz (nur interne Agenten) |
| `case.priority.change` | Priorität ändern |
| `case.queue.move` | Queue wechseln |
| `escalation.create` | Eskalation erstellen |
| `escalation.to_occ` | Eskalation zu OCC (erfordert erhöhte Berechtigung) |
| `user_lookup` | User-Lookup nutzen |
| `org_lookup` | Org-Lookup nutzen |
| `supervisor.view` | Supervisor-Panel sehen |
| `quality.view` | Quality-Metriken sehen |
| `audit.view` | Audit-Log sehen |

Das Frontend prüft `identity.allowed_actions.includes(actionKey)` vor dem Render von Aktions-Buttons.
