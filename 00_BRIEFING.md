# LokaleBauernConnect — Session-Briefing
> **Plattform-Akte für eine eigene Claude-Code-Session.** Diese Datei ist der Einstieg. Sie setzt den fertigen **ConnectCore-Kern** voraus (Auth, Rollen, Billing, Staff/Support, Compliance) und beschreibt **nur** die plattform-spezifische Schicht. Vorgehen: erst `_PLATTFORM_PLAYBOOK/00_PLAYBOOK.md` lesen, dann diese Akte abarbeiten.
---
## Steckbrief
| Feld | Wert |
|---|---|
| **Claim** | *Regional direkt vom Hof — finden, reservieren, abholen.* |
| **Klasse (A/B/C)** | C |
| **Welle** | 1 |
| **Prio-Score** | 7.2 |
| **Umsatzpotenzial** | kleiner, hohe Story (regional/gesellschaftlich) |

---
## 1. Was die Plattform ist
Plattform für regionale Lebensmittel direkt vom Bauern, Hofladen oder Erzeuger.

## 2. Kernproblem
Verbraucher wollen regional kaufen, finden aber Höfe/Verfügbarkeiten schlecht; Erzeuger haben wenig digitale Reichweite.

## 3. USP / Differenzierung
Gute regionale Story + gesellschaftlicher Nutzen + Synergie mit AgrarConnect. Einfacher, schneller MVP.

## 4. Zielgruppen
**Kundenseite:** Verbraucher, Familien, regional-bewusste Käufer, Gastronomie (regional).

**Anbieterseite:** Bauern, Hofläden, Erzeuger, Imker, Hofmetzger, regionale Manufakturen.

## 5. MVP (so klein wie möglich starten)
Hofladen-Finder + Produktverfügbarkeit + Reservierung/Abholung.

## 6. Spezialmodule (das baut die Plattform obendrauf)
> Der Kern liefert Auth, Rollen, Listings, Matching, Chat, Bewertungen, Billing, Benachrichtigungen, Verifizierung, Audit. **Neu** ist nur:

- **Hofladen-Finder (Karte)** — Höfe in der Nähe, Öffnungszeiten.
- **Produktverfügbarkeit** — Saisonale Produkte, Bestand, Selbstpflege durch Erzeuger.
- **Reservierung/Abholung** — Vorbestellen, Abholfenster.
- **Saison-Kennzeichnung** — Was hat gerade Saison.

## 7. Individuelle Formulare
Datengetrieben (Schema + Zod), mit gemeinsamer Wizard-Komponente aus `packages/ui`:

- **Anfrage-/Gesuch-Formular** (plattformspezifische Felder/Kategorien)
- **Angebots-Formular** (Anbieterseite)
- **Onboarding** (Profil + Fähigkeitsrolle + ggf. Verifizierungs-Nachweise)

## 8. Monetarisierung
Anbieter-Abo (klein), Premium-Listing bedingt, Provision bedingt. Bewusst schlank — gesellschaftlicher Nutzen > Maximalmonetarisierung.

> Mechanik kommt aus dem Kern (`_ABO_BILLING/`). Hier nur Preise/Limits/Stufen konfigurieren.

## 9. Marketing- & Go-to-Market-Strategie
Regionale Story (Presse, Social), Saison-Content, Kooperation mit Tourismus/Region. Synergie mit AgrarConnect (gleiche Anbieterbasis). Klasse C → nach Aufbau Partner/Verkauf.

## 10. Compliance & Recht (haargenau)
Niedrig. Lebensmittel-Kennzeichnung (Hinweis an Erzeuger), keine Eigenvermarktung durch Plattform. Vermittler.

> Details/Checklisten: `_COMPLIANCE_SSO/`. Grundsatz: Die Plattform **vermittelt**, sie führt nicht aus und berät nicht — Disclaimer durchgängig sichtbar.

## 11. Datenmodell-Erweiterung (Skizze)
Nur die **Zusatz**-Tabellen über den Kern hinaus (Migrationen additiv, RLS + Isolationstest):

- plattformspezifische Kategorien/Felder
- die zu den Spezialmodulen gehörenden Tabellen (siehe Abschnitt 6)
- alle mandantenbezogen: `org_id`, Zeitstempel, `deleted_at`, RLS deny-by-default

---
## Definition of Done (diese Plattform)
- [ ] App angelegt, Kern importiert
- [ ] Spezial-Datenmodell + RLS + Isolationstest grün
- [ ] Spezialmodule funktionsfähig
- [ ] Individuelle Formulare (datengetrieben, validiert)
- [ ] Billing konfiguriert + Live-Testkauf bestanden
- [ ] Staff-/Support-Andockung sichtbar
- [ ] Compliance/SSO geprüft
- [ ] Landing im gemeinsamen Design
- [ ] Deployt, Domain, Security-Header
- [ ] Tracker aktualisiert

## Nächster Schritt
→ `01_DATENMODELL.md` (Detail-Schema) · `02_SPEZIALMODULE.md` (Feature-Specs) · `03_LANDING.md` (Landing-Page) · `99_CHECKLISTE.md`
