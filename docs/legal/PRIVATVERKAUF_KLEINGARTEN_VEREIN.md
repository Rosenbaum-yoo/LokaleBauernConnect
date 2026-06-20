# Privat-, Hobby- & Vereins-Erzeuger — Rechtsrahmen (DE)

> Quelle: Research-Workflow 2026-06-20. **Kein Rechts-/Steuerrat** — LokaleBauernConnect ist Vermittler. Vor Live-Gang anwaltliche/steuerliche Endprüfung. Owner-Freigabe ausstehend.

## Kernaussage
Es gibt **keine feste Euro-/Mengen-Grenze für „steuerfreien Privatverkauf"**. Maßgeblich ist das Zusammenspiel aus **Gewinnerzielungsabsicht**, **Produktklasse** und **Lebensmittelrecht** (gilt ab dem ersten Verkauf, unabhängig von Steuer/Gewerbe).

## Drei belastbare Linien
1. **Unverarbeitete eigene Erzeugnisse** (Obst, Gemüse, Eier, Honig) = landwirtschaftliche **Urproduktion** (§13 EStG) → **keine Gewerbeanmeldung**; gelegentlicher Kleinst-Verkauf ohne Gewinnabsicht = steuerlich irrelevante **Liebhaberei**. LuF-Freibetrag 900 €/1.800 € (nur wenn Summe der Einkünfte < 30.700 €).
2. **Verarbeitete Produkte** (Marmelade, Säfte, Backwaren) = **keine Urproduktion** → schnell gewerblich + zugelassene Küche/Hygiene. **Wichtigste Trennlinie.**
3. **Umsatzsteuer:** §19 UStG Kleinunternehmer (seit 2025: **25.000 €** Vorjahr / **100.000 €** lfd. Jahr).

## Sonderfälle
- **Kleingarten (BKleingG):** gewerbliche Nutzung **und Verkauf von Erzeugnissen sind grundsätzlich UNZULÄSSIG.** → **Kleingärtner NICHT als Verkäufer-Typ.** Plattform blockt das bzw. verweist auf gewerblichen/Vereins-Weg. (Hobby-Gärtner mit eigenem Grundstück fallen unter „Privat/Hobby — Urproduktion".)
- **Verein:** Lebensmittelverkauf = i. d. R. wirtschaftlicher Geschäftsbetrieb; körperschaft-/gewerbesteuerfrei nur bis **Bruttoeinnahmen-Freigrenze 45.000 €/Jahr**; darüber voll steuerpflichtig, Gemeinnützigkeit ggf. gefährdet.
- **Lebensmittelrecht (immer):** LMIV-Kennzeichnung, **Allergenangabe Pflicht**, LMHV-Hygiene, Registrierung beim Lebensmittel-/Veterinäramt. **Eier:** Schild mit MHD (28 Tage), Name/Anschrift, Preis. **Honig:** Honigverordnung. **Rohmilch:** streng, faktisch nichts für Hobby.

## Umsetzung in der Plattform (Stand: gebaut)
- **Erzeuger-Typen:** Gewerblicher Hof · **Privat / Hobby (Urproduktion)** · **Verein** (`onboardingForm.ts` → `PRODUCER_KINDS`). Kleingarten bewusst ausgelassen + Hinweis.
- **Onboarding-Schritt „Rechtliches"** mit Pflicht-Selbsterklärungen (versioniert, im Audit): selbst erzeugt · Eigenverantwortung Steuer/Gewerbe · Lebensmittelrecht eingehalten (`farm_applications.decl_*`).
- **Durchgängiger Disclaimer:** Vermittler, keine Steuer-/Rechtsberatung.
- **Finder-Badge** „Privat-Erzeuger"/„Verein" (Erwartungsmanagement).

## Offen / Owner-Freigabe
- Produktklassen-Verzweigung (unverarbeitet/tierisch/verarbeitet) im Onboarding härten (Privat-Typ bei „verarbeitet" sperren).
- Pflichtfelder je Produkt (Allergene, MHD) im Sortiment erfassen.
- Anwaltliche/steuerliche Endprüfung der Disclaimer + AGB-Nachzug.
