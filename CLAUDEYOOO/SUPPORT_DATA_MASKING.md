# SOC — Data Masking Spezifikation

> Wie werden sensitive Nutzerdaten im Support Portal behandelt?  
> Stand: Mai 2026

---

## Grundprinzip

```
Das Backend maskiert. Das Frontend zeigt nur was es bekommt.
MaskedField ist eine Display-Komponente, kein Sicherheits-Feature.
```

Die Backend-Middleware ist verantwortlich dafür, dass keine un-maskierten sensitiven Daten
in API-Responses gelangen. Das Frontend vertraut den Backend-Daten — wenn ungemaskede Daten
ankommen, werden sie angezeigt. Das ist Warps Verantwortung.

---

## Felder und Masking-Stufen

### E-Mail

| Stufe | Anzeige | Beispiel |
|---|---|---|
| `full` | Vollständige E-Mail | `max.muster@firma.de` |
| `domain_only` | Nur Domain | `●●●●@firma.de` |
| `hidden` | Komplett versteckt | `[E-Mail verborgen]` |

**In API-Response bei `domain_only`:** Backend sendet nur die Domain (`firma.de`), das Frontend baut `●●●●@firma.de`.
**In API-Response bei `hidden`:** Backend sendet `null` oder lässt Feld weg.

### Telefon

| Stufe | Anzeige | Beispiel |
|---|---|---|
| `full` | Vollständige Nummer | `+49 171 12345678` |
| `masked_partial` | Teilweise | `+49 171 ●●●●●678` |
| `hidden` | Komplett versteckt | `[Telefon verborgen]` |

### Name

| Stufe | Anzeige | Beispiel |
|---|---|---|
| `full` | Voller Name | `Max Muster` |
| `initials_only` | Nur Initialen | `M. M.` |
| `hidden` | Komplett versteckt | `[Name verborgen]` |

---

## Masking pro Rollen-Konfiguration

### Interne Agenten (Standard)

```json
{
  "user_email": "domain_only",
  "user_phone": "hidden",
  "user_name": "full"
}
```

Begründung: Interne Agenten brauchen den Namen für die Kommunikation, aber nicht die E-Mail-Adresse direkt. Telefonnummern sind besonders sensibel.

### Externe Agenten / BPO

```json
{
  "user_email": "hidden",
  "user_phone": "hidden",
  "user_name": "initials_only"
}
```

Begründung: Externe Agenten (Callcenter) haben keinen Bedarf an Kontaktdaten — sie arbeiten nur mit dem Case-Kontext. Maximal Initialen für die Identifikation.

### Supervisors

```json
{
  "user_email": "domain_only",
  "user_phone": "masked_partial",
  "user_name": "full"
}
```

Begründung: Supervisors brauchen mehr Kontext für Qualitätsmanagement, aber volle Kontaktdaten sind auch für sie nicht notwendig.

---

## `MaskedField`-Komponente (Frontend)

Pfad: `frontend/src/support/components/ui/MaskedField.tsx`

```tsx
interface MaskedFieldProps {
  value: string | null;
  type: "email" | "phone" | "name";
  // Wenn value vom Backend bereits gemaskiert kommt, wird er direkt gerendert.
  // Falls value = null, wird "[verborgen]" gezeigt.
}
```

**Was die Komponente tut:**
- Zeigt `value` an wenn nicht null
- Zeigt `[E-Mail verborgen]` / `[Telefon verborgen]` / `[Name verborgen]` wenn null
- Rendert mit visuell gedämpftem Stil (italic, muted color)
- Kein Tooltip der den echten Wert enthüllt

**Was die Komponente NICHT tut:**
- Sie maskiert keine Daten selbst (außer User Lookup Email im OCC — das ist ein Sonderfall)
- Sie hält keine nicht-maskierten Daten im State

---

## Nicht-anzuzeigende Felder (absolute Verbote)

Diese Felder dürfen unter keinen Umständen aus Support-Endpunkten kommen:

| Feld | Grund |
|---|---|
| Passwort-Hash | Keine Verwendung im Support |
| Session-Token | Security |
| IBAN / Kontonummer | PCI-DSS |
| Kreditkartendaten | PCI-DSS |
| Vollständige API-Keys | Security |
| 2FA-Secrets | Security |

Wenn das Backend diese Felder in API-Responses zurückgibt, ist das ein kritischer Sicherheitsbug.

---

## DSGVO-Relevanz

### Datenminimierung

Nicht jeder Support-Agent braucht alle Nutzerdaten. Die Masking-Regeln implementieren das Prinzip der Datensparsamkeit gemäß DSGVO Art. 5 Abs. 1 lit. c.

### Zweckbindung

Support-Agenten sehen Nutzerdaten nur im Kontext eines Cases — nicht als allgemeine Suche.
User Lookup ist auf Case-relevante Suche beschränkt (kein Browse-Mode).

### Externe Verarbeiter (BPO)

Externe Callcenter-Agenten sind Auftragsverarbeiter. Die `vendor_id`-Isolation und maximale Masking-Stufe stellt sicher, dass sie nur die für ihre Tätigkeit notwendigen Daten sehen (Art. 28 DSGVO).

---

## Audit-Spur für Lookups

Jeder User Lookup und Org Lookup muss in `support_audit_log` geschrieben werden:

```json
{
  "action": "user_lookup",
  "actor_id": "agent_uuid",
  "entity_type": "user",
  "entity_id": "looked_up_user_id",
  "detail": "Lookup im Kontext von Case TMP-00842",
  "created_at": "..."
}
```

Begründung: Wenn ein Agent sensitiv auf Nutzerdaten zugreift, muss das nachvollziehbar sein.

---

## Frontend-Verantwortung

| Was | Status |
|---|---|
| `MaskedField`-Komponente rendert Server-Daten korrekt | ✅ Claude |
| `null`-Werte zeigen "[verborgen]" statt Leerzeichen | ✅ Claude |
| Keine sensitiven Daten in `localStorage` / `sessionStorage` | ✅ Claude |
| Keine sensitiven Daten in URL-Parametern | ✅ Claude |
| Browser-Konsole loggt keine sensitiven Werte | ✅ Claude |

## Backend-Verantwortung

| Was | Status |
|---|---|
| Masking passiert serverseitig je `masking_rules` | ☐ Warp |
| `null` oder Feld-Weglassen für `hidden`-Felder | ☐ Warp |
| Nur Domain zurückgeben bei `domain_only`-Email | ☐ Warp |
| Verbotene Felder niemals in API-Response | ☐ Warp |
| Audit-Log für alle Lookups | ☐ Warp |
| Vendor-Isolation: externe Agenten sehen nur erlaubte Cases | ☐ Warp |
