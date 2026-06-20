# Preise & Gebühren — LokaleBauernConnect

> **Über 94 % bleiben beim Hof.** Wir verdienen nur mit, wenn ein Hof über die Plattform verkauft — keine versteckten Kosten, kein Pflichtabo, keine Listengebühr.

> **Öffentlich orientierte Preis- und Gebührendarstellung.** Dieses Dokument erklärt in Klartext, was Käufer:innen zahlen, was Höfe zahlen, wie die optionale Premium-Mitgliedschaft und die Status-Stufen die Gebühr senken — mit Beispiel-Rechnungen und vollständigen Gesamtpreis-Hinweisen nach Preisangabenverordnung (PAngV).
>
> **Single Source of Truth:** Die rechnerische Wahrheit lebt **serverseitig** im Code-Modul `app/src/lib/fees.ts` (kanonische Gebührenformel) und ist in `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` gespiegelt. Diese Datei ist die **menschenlesbare, verkaufsorientierte** Sicht. Bei Konflikt gilt der serverseitig durchgesetzte Wert; diese Datei wird dann nachgezogen.
>
> **Status der Zahlen:** Alle konkreten Prozentsätze und Eurobeträge in diesem Dokument sind **Empfohlen — Owner-Freigabe ausstehend** (Preise/Geld = Owner-Entscheidung gemäß `CLAUDE.md` Commercial-/Stop-Regel). Sie gelten erst nach ausdrücklicher Freigabe und werden zugleich im Code (`fees.ts`) und in den Rechtstexten (`agb.md`) verbindlich.

---

## 1 · Das Versprechen in einem Satz

LokaleBauernConnect **vermittelt** den Kontakt zwischen dir und regionalen Höfen — wir verkaufen nicht selbst und beraten nicht. Bezahlst du über die Plattform (online reserviert oder am unbemannten SB-Hofladen per QR-Code), kümmern wir uns um die **sichere bargeldlose Bezahlung**. Dafür behalten wir eine kleine, transparente Gebühr ein. **Der Warenwert geht direkt an den Hof.**

---

## 2 · Was Käufer:innen zahlen

**Die Plattform nutzen kostet dich nichts.** Suche, Hofladen-Finder, Karte, Produktverfügbarkeit, Reservierung und der Saison-Radar sind und bleiben für Käufer:innen **dauerhaft kostenlos**. Es gibt kein Käufer-Abo und keine Anmeldegebühr.

Beim **Kauf über die Plattform** kommt eine kleine Service-Gebühr hinzu:

| Posten | Käufer-Gebühr |
|---|---|
| **Service-Gebühr je Kauf** | **1 %** des Warenwerts · *Empfohlen — Owner-Freigabe ausstehend* |

- Diese 1 % decken die sichere Zahlungsabwicklung und Betrugsschutz ab — gerade am unbemannten SB-Stand der entscheidende Mehrwert (kein Bargeld nötig, sofortige Quittung).
- **Vollständiger Gesamtpreis vor dem Kauf (PAngV):** Bevor du auf den zahlungspflichtigen Button tippst, siehst du den **kompletten Endpreis** — Warenwert **plus** Service-Gebühr als eigene Position. Kein Drip-Pricing, keine Überraschung an der Kasse.
- **Kein Käufer-Premium.** Wir bieten bewusst keine kostenpflichtige Käufer-Mitgliedschaft an — für Gelegenheitskäufe lohnt sie sich nie. Deine 1 % bleiben fix und niedrig.

> **Hinweis für Höfe / Owner-Entscheidung:** Ob die Service-Gebühr für Käufer:innen **sichtbar on-top** als eigene Position erscheint oder bereits **in den Stückpreis eingerechnet** ist (dann trägt der Hof rechnerisch die vollen 6 % netto), ist eine offene Owner-Entscheidung (siehe §8). Beide Varianten zeigen vor dem Kauf den vollständigen Endpreis.

---

## 3 · Was Höfe (Verkäufer:innen) zahlen

**Sichtbar werden kostet nichts.** Ein Hof kann sich kostenlos im Finder eintragen, Produkte und Abholfenster pflegen und erste Käufer:innen gewinnen, **bevor Geld fließt**. Es gibt kein Pflicht-Abo und keine Listengebühr — wir verdienen erst, wenn der Hof über die Plattform verkauft.

| Posten | Hof-Gebühr (Standard, Status „Neu") |
|---|---|
| **Provision je Verkauf** | **5 %** des Warenwerts · *Empfohlen — Owner-Freigabe ausstehend* |
| **Mindestgebühr je Transaktion** | **0,25 €** · *Empfohlen — Owner-Freigabe ausstehend* |

- **Über 94 % bleiben beim Hof.** Zusammen mit der Käufer-Service-Gebühr von 1 % ergibt das eine **Gesamt-Take-Rate von 6 %** — deutlich günstiger als vergleichbare Vermarktungs-Plattformen (siehe §7).
- **Warum 5 %?** Die Hauptlast trägt bewusst der Hof, denn er spart durch die sichere SB-Bezahlung am meisten: kein Bargeld-Handling, kein Schwund aus der Vertrauenskasse, sofortige Gutschrift.
- **Mindestgebühr 0,25 € je Transaktion:** Bei sehr kleinen Beträgen (z. B. 2 € für ein Glas Honig) deckt die prozentuale Gebühr die Zahlungsdienstleister-Kosten nicht. Die kleine Mindestgebühr stellt sicher, dass jede Transaktion kostendeckend bleibt — fair für beide Seiten.
- **Der Warenwert geht direkt an den Hof.** Über Stripe Connect fließt der Kaufpreis **unmittelbar auf das Hof-Konto**; die Plattform behält ausschließlich ihre Gebühr. Wir sind Zahlungsanbindung und Vermittler, **nicht** Verkäufer und **nicht** Empfänger des Kaufpreises. Die Quittung weist immer den **Hof als Leistungserbringer** aus.

---

## 4 · Premium-Mitgliedschaft „Hof-Plus" (optional, nur für Höfe)

Umsatzstarke Voll-Erwerbs-Höfe können mit der Premium-Mitgliedschaft ihre Verkaufs-Provision **auf 0 %** senken — gegen einen festen Monatsbeitrag plus echtem Wert-Bundle.

| Premium „Hof-Plus" | Wert |
|---|---|
| **Monatsbeitrag** | **39 €/Monat** · *Empfohlen — Owner-Freigabe ausstehend* |
| **Effekt auf die Provision** | Verkäufer-Provision **0 %** statt 5 % |
| **Bleibt bestehen** | Käufer-Service-Gebühr 1 % · Mindestgebühr 0,25 €/Transaktion |

**Im Premium-Beitrag enthalten (Wert-Bundle, nicht nur Spar-Rechner):**

- **Prioritäts-Ranking** im Hofladen-Finder und Saison-Radar (fair gekennzeichnet, kein verdecktes Bezahl-Ranking).
- **Saison-Alerts** für deine Stammkundschaft.
- **Mehrere SB-Stände** unter einer Mitgliedschaft.
- **Einnahmen-Dashboard** (Brutto · Plattformgebühr · Zahlungsdienstleister-Gebühr · Netto, je Transaktion und im Zeitverlauf).

> **Für wen lohnt sich Premium?** Ab rund **780 € Plattform-Umsatz pro Monat** gleicht die eingesparte Provision den Beitrag aus — darüber sparst du. Für kleinere Höfe ist die reine Provision (ohne Abo) die günstigere Wahl. Wir verkaufen Premium bewusst als **planbaren, vorausbezahlten Cashflow + Status**, nicht als versteckte Pflicht.
>
> **Der Owner-Vorschlag lag bei 30 €/Monat;** empfohlen sind 39 €/Monat (bewusst über der reinen Spar-Schwelle, gekoppelt an das Wert-Bundle). Final = Owner-Freigabe ausstehend.

**Keine echten 0/0-Gebühren.** Auch mit Premium bleiben die 1 % Käufer-Service-Gebühr und die Mindestgebühr von 0,25 €/Transaktion bestehen — so subventioniert die Plattform nie eine einzelne Transaktion unter ihren eigenen Zahlungsdienstleister-Kosten.

---

## 5 · Status-Stufen — gute Höfe zahlen weniger

Je länger und besser ein Hof über die Plattform verkauft, desto **niedriger** wird seine Verkaufs-Provision — automatisch, ohne Abo. Die Status-Stufen belohnen **echte, verifizierte Leistung** (bezahlte Verkäufe, gute Bewertungen, zuverlässige Abholung), nicht nur Volumen. Die Käufer-Service-Gebühr von 1 % bleibt auf allen Stufen gleich.

| Status | Verkäufer-Provision | Woran er sich orientiert (vereinfacht) |
|---|---|---|
| **Neu** | **5,0 %** | Startwert ab Onboarding |
| **Bronze** | **4,6 %** | ab ~2.000 € Umsatz · ≥ 5 verifizierte Bewertungen · Rating ≥ 4,0 |
| **Silber** | **4,2 %** | ab ~10.000 € Umsatz · ≥ 15 Bewertungen · Rating ≥ 4,3 |
| **Gold** | **3,8 %** | ab ~40.000 € Umsatz · ≥ 40 Bewertungen · Rating ≥ 4,5 · ≥ 95 % erfüllte Reservierungen |
| **Platin** | **3,4 %** | ab ~150.000 € Umsatz · ≥ 100 Bewertungen · Rating ≥ 4,6 · ≥ 98 % erfüllte Reservierungen |

> Alle Werte: *Empfohlen — Owner-Freigabe ausstehend.*

- **Untergrenze (Floor):** Die Verkäufer-Provision sinkt nie unter **1,2 %** — auch bei Premium oder höchstem Status bleibt sie kostendeckend.
- **Fair und manipulationssicher:** Es zählt nur **verifizierter, nicht erstatteter** Umsatz aus echten bezahlten Reservierungen. Bei Rückerstattungen, Streitfällen, sinkendem Rating oder längerer Inaktivität kann ein Hof in eine niedrigere Stufe zurückgestuft werden. Selbstkäufe oder Kollusion werden technisch erkannt und greifen nicht.
- **Status ist ein Verkäufer-Attribut.** Die Stufen senken ausschließlich die **Verkäufer**-Provision — die Käufer-Gebühr ist davon unberührt.

---

## 6 · Beispiel-Rechnungen

Alle Beträge gerundet, Prozentsätze *Empfohlen — Owner-Freigabe ausstehend*. „ZD-Gebühr" = Zahlungsdienstleister-Gebühr (Stripe), die der Hof aus seinem Netto trägt.

### 6.1 Korb für 20,00 € — Standard-Hof (Status „Neu", kein Premium)

| Posten | Betrag |
|---|---|
| Warenwert (an den Hof) | 20,00 € |
| **Käufer zahlt** (Warenwert + 1 % Service-Gebühr) | **20,20 €** |
| Verkäufer-Provision (5 %, mind. 0,25 €) | − 1,00 € |
| Plattform-Gebühr gesamt (1 % Käufer + 5 % Hof) | 1,20 € |
| Hof erhält (vor ZD-Gebühr) | ≈ 19,00 € |

> Ergebnis: Käufer:in zahlt **20,20 €**, der Hof behält rund **19,00 €** — die Plattform erhält **1,20 €** (6 % gesamt).

### 6.2 Korb für 20,00 € — Gold-Hof (Provision 3,8 %)

| Posten | Betrag |
|---|---|
| **Käufer zahlt** (20,00 € + 1 %) | **20,20 €** |
| Verkäufer-Provision (3,8 %) | − 0,76 € |
| Hof erhält (vor ZD-Gebühr) | ≈ 19,24 € |

> Höherer Status = mehr bleibt beim Hof: hier rund **19,24 €** statt 19,00 €.

### 6.3 Korb für 20,00 € — Premium-Hof „Hof-Plus" (0 % Provision)

| Posten | Betrag |
|---|---|
| **Käufer zahlt** (20,00 € + 1 %) | **20,20 €** |
| Verkäufer-Provision (0 %, aber Mindestgebühr) | − 0,25 € |
| Hof erhält (vor ZD-Gebühr) | ≈ 19,75 € |
| zzgl. Premium-Beitrag | 39,00 €/Monat |

> Premium lohnt sich erst ab Umsatz: bei nur einem 20-€-Korb im Monat trägt der Hof 39 € Beitrag; ab ~780 €/Monat Plattform-Umsatz kippt die Rechnung zugunsten von Premium.

### 6.4 Kleiner SB-Kauf für 3,00 € (USP: Honigglas am unbemannten Stand)

| Posten | Betrag |
|---|---|
| **Käufer zahlt** (3,00 € + 1 %) | **3,03 €** |
| Verkäufer-Provision (5 % = 0,15 € → Mindestgebühr greift) | − 0,25 € |
| Hof erhält (vor ZD-Gebühr) | ≈ 2,78 € |

> Bei Kleinbeträgen greift die **Mindestgebühr 0,25 €** statt der 5 % — sonst würde die Plattform am USP (sichere SB-Kleinbeträge) Verlust machen.

---

## 7 · Wie wir im Vergleich dastehen

| Plattform | Gesamt-Take-Rate (Richtwert) |
|---|---|
| **LokaleBauernConnect** | **≈ 6 %** *(Empfohlen — Owner-Freigabe ausstehend)* |
| Marktschwärmer | ≈ 18 % |
| CrowdFarming / La Ruche | ≈ 20 % |
| Etsy (inkl. Payment) | ≈ 6,5 % + Gebühren |

> Quelle der Vergleichswerte: interne Marktrecherche (`docs/COMMERCIAL_SOURCE_OF_TRUTH.md`). Richtwerte, keine tagesaktuellen Garantien der Wettbewerber. Unsere Botschaft an Höfe: **über 94 % deines Umsatzes bleiben bei dir.**

---

## 8 · Offene Owner-Entscheidungen (Pricing)

> **Geld-/Pricing ist Owner-Hoheit.** Alle Zahlen oben gelten erst nach Freigabe. Konsolidiert aus `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`.

| ID | Entscheidung | Empfehlung |
|---|---|---|
| PR-01 | Finale Sätze: 5 % Hof / 1 % Käufer (= 6 % gesamt) statt Owner-Vorschlag 3/3 | 5/1 — schützt SB-Konversion + Mission „Käufer zahlen nie für den Zugang" |
| PR-02 | Käufer-Gebühr **sichtbar on-top** vs. **in den Stückpreis eingerechnet** | entscheidet Checkout-UX + AGB; vollständiger Endpreis vor Kauf in beiden Fällen Pflicht |
| PR-03 | Mindestgebühr 0,25 €/Transaktion + Floor 1,2 % bestätigen | bestätigen — sonst Verlust bei Tickets < ~5,56 € |
| PR-04 | Premium-Preis 39 €/Monat (statt 30) · nur Höfe · kein Käufer-Premium · keine echten 0/0 | bestätigen |
| PR-05 | Refund-/Storno-Gebührenpolitik (Plattformgebühr bei Storno behalten/erstatten?) | vermittler-üblich: Gebühr bei Storno anteilig regeln; Reserve gegen Chargebacks erwägen |
| PR-06 | Status-Kriterien & -Sätze (Neu→Platin) final bestätigen | wie §5; nur verifizierter, nicht erstatteter Umsatz zählt |
| PR-07 | Bounties/Credits ausschließlich als nicht-auszahlbarer Gebühren-Rabatt | bestätigen — vermeidet ZAG/E-Geld-Erlaubnispflicht (BaFin) |

---

## 9 · Rechtliche Hinweise (Kurzfassung)

- **Vermittler-Rolle:** Die Plattform vermittelt und wickelt die Zahlung ab; **Vertragspartner des Kaufs ist der jeweilige Hof**. Die Plattform schuldet Umsatzsteuer nur auf ihre **Provision**, nicht auf den Warenwert.
- **Vollständiger Endpreis (PAngV):** Der zu zahlende Gesamtpreis inkl. Service-Gebühr wird **vor** dem zahlungspflichtigen Klick vollständig angezeigt.
- **Verbindliche Geltung:** Maßgeblich sind die jeweils gültigen Gebühren aus dem Bestell-/SB-Prozess sowie die AGB (`docs/launch/B_rechtstexte/agb.md`). Dieses Dokument ist die erklärende Übersicht, nicht der Vertrag.

---

## 10 · Querverweise

`app/src/lib/fees.ts` (kanonische Gebührenformel · Single Source of Truth) · `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (technische Spiegelung) · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Mechanik) · `docs/COMPLIANCE_MODEL.md` (Vermittler · DAC7 · USt · Aufbewahrung) · `docs/launch/B_rechtstexte/agb.md` (Gebühren · Premium · Widerruf) · `docs/STRIPE-SETUP.md` (Stripe Connect · Destination Charge · application_fee).
