# Global Execution Playbook
Stand: Mai 2026
## Ziel
Wiederverwendbare Regeln aus Dennis-Prompts in eine globale Arbeitslogik ueberfuehren, damit Umsetzung schneller, praeziser, wirtschaftlicher und stabiler wird.
## Prompt-Signale -> Arbeitsmodus
- `kurze antwort` -> maximal kompakt antworten, nur Kernaussage + 1-3 Argumente
- `nichts bauen` -> nur Analyse/Schaetzung, keine Datei- oder Systemaenderung
- `pruefe mal` -> kurze faktenbasierte Verifikation im Repo mit Zahlen
- `bring ... in ordnung` -> sofort Diagnose -> Fix -> Validierung -> kurzer Status
- `und jetzt?` -> aktueller Stand + naechster konkreter Schritt
- `merke dir` / `skill erweitern` -> dauerhaftes Wissen in Skill/Playbook verdichten
- `erst plan` / Frageform mit Unsicherheit -> Plan erstellen, auf Freigabe warten
## Globale Arbeitsprinzipien
- Aktion vor Erklaerung: bei klaren Befehlen direkt umsetzen
- Bestehende Strukturen zuerst: erweitern statt neu erfinden
- Kleine sichere Schritte statt Big-Bang-Refactors
- Wirtschaftlich priorisieren: Pilot-Core, Umsatz-/Retention-Wirkung, Betriebsstabilitaet
- Objektiv bleiben: Risiken frueh benennen, Annahmen pruefen
## Effizienzregeln
- Erst Skill/kontext lesen, dann gezielt suchen
- Harte Groessenwerte fuer Schaetzungen nutzen (Datei-/Zeilen-/Kopplungsumfang)
- Tool-Calls buendeln, doppelte Reads vermeiden
- Nur fokussiert testen/linten auf geaenderte Pfade
- Erkenntnisse verdichten statt Prompts wortwoertlich archivieren
## Qualitaetsgates vor Abschluss
- Syntax-/Build-Check fuer geaenderte Dateien
- Relevante Tests fuer betroffene Flows
- Kein Regression-Risiko bei Auth, Rechte, kritischen Kernpfaden
- Kurze Abschlussmeldung: was geaendert, wie verifiziert, was offen
## Kontinuierliches Lernen (pro Aufgabe)
1. Wiederverwendbare Regel aus dem Prompt extrahieren
2. Klassifizieren: global oder projekt-spezifisch
3. Globales Playbook erweitern (nur dauerhafte Muster)
4. Projektskill um konkrete, technische Wahrheit ergaenzen
5. Doppelte/ueberholte Regeln periodisch verdichten
## TempConnect Overlay (projektbezogen, dauerhaft)
- Backend-Autoritaet fuer Berechtigungen und Limits ist unantastbar
- Sichtbarkeits-/Surface-Wahrheit muss ueber Matrix + Hub-Regeln konsistent bleiben
- Plan-/Feature-/Preis-Wahrheit bleibt zentralisiert (kein Hardcode-Drift)
- SCC bleibt strikt getrennt, mutierende Aktionen mit Step-up + Confirm + Reason
- Compose-Startreihenfolge (`frontend` wartet auf `api` healthy) gegen Startup-502 beibehalten
## Anti-Pattern (immer vermeiden)
- Grossmigration direkt vor Pilotstart
- Parallelwelten mit doppelter Logik
- UI-Locks ohne Backend-Gate
- \"Schnellfix\" ohne Validierung
- Wiederholte lange Erklaerungen ohne neue Information
## Pflege-Regel
Dieses Dokument wird nach relevanten Prompts/Befehlen inkrementell erweitert.
Nur Regeln behalten, die in mehreren Aufgaben wiederverwendbar sind.
