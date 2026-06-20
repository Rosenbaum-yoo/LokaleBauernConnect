# PRICING — Preismodell LokaleBauernConnect (Erzeuger-Abo · Premium-Listing · SB-Transaktionsgebühr)

> **Kanonisches Pricing-Dokument** der Plattform. Nur die Gliederung folgt dem Imperium-Pricing-Blueprint; sämtliche Inhalte — Pläne, Gebührenmodell, Entitlements, SB-Transaktionslogik — sind originär auf die **Hof-Domäne** und den Imperium-Stack (**Supabase/Cloudflare/Stripe**) geschrieben.
>
> **Bezug:** `CLAUDE.md` (§0-Direktive 3 Wirtschaftlichkeit · 7 Produktionspfeiler · Commercial-/Stop-Regeln), `PHASEN.md` (WAVE_09 Billing · Phase 4 Track A SB-Bezahlung · Phase 5 Gate 10), `MASTER_INDEX.md` (4 · Commercial & Billing), `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Mechanik, §7 Gebührenmodell), `docs/COMPLIANCE_MODEL.md` (Vermittler-Position · Subprozessor Stripe · Aufbewahrung), `docs/launch/B_rechtstexte/agb.md` (§6 SB-Gebühr · §10 Tarife · §16 Laufzeit/Kündigung), `docs/ROLE_AND_PERMISSION_MODEL.md` (Käufer/Erzeuger/Staff · Plan-Locks), `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant), `docs/STRIPE-SETUP.md` (geplant), `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (geplant).
>
> **Quelle der Wahrheit:** Entitlements und Preise sind **serverseitig** verankert (`orgs.plan`, Edge-Function-Auflösung, Stripe als Abrechnungs-Backend) — diese Datei ist die **menschenlesbare kommerzielle Spezifikation**, nicht die technische Konfig. Bei Konflikt gilt der serverseitig durchgesetzte Zustand; diese Datei wird dann nachgezogen.

---

## 0 · Pricing-Philosophie — bewusst schlank (gesellschaftlicher Nutzen vor Marge)

LokaleBauernConnect ist **Welle 1, Klasse C** des ConnectCore-Imperiums: Cashflow-Schnellstarter mit **hohem gesellschaftlichem Nutzen** (kurze Wege, faire Margen für Höfe, weniger Lebensmittelverschwendung, Belebung des ländlichen Raums). Das Preismodell folgt daraus drei Leitsätzen — sie sind verbindlich und gehen jeder Tarif-Detailentscheidung voraus:

1. **Niedrige Einstiegshürde für Höfe.** Ein Hof darf **kostenlos sichtbar** werden und erste Käufer gewinnen, bevor Geld fließt. Sichtbarkeit eines kleinen Familienbetriebs darf nie an einer Monatsgebühr scheitern — das würde die Mission untergraben. Der Free-/`demo`-Pfad ist kein Trick, sondern Programm.
2. **Käufer zahlen nie für den Zugang.** Suche, Hofladen-Finder, Verfügbarkeit, Reservierung, Saison-Radar sind für Käufer **dauerhaft kostenlos**. Einzige käuferbezogene Zahlung ist der Warenwert an den Hof; eine etwaige SB-Transaktionsgebühr trägt im Default-Pfad der Hof aus seinem Netto (§3), nicht der Käufer. Das ist Pflicht aus der Vermittler-Rolle und der Mission, regionale Lebensmittel **zugänglicher** zu machen — nicht teurer.
3. **Schlanke, ehrliche Stufen statt Feature-Verknappung.** Wenige Stufen, klar begründet. Wir **verknappen keine sinnvollen Grundfunktionen** künstlich, um Upgrades zu erzwingen. Höhere Stufen liefern echten Mehrwert (Reichweite, Self-Service-Tiefe, reduzierte SB-Gebühr, Support-SLA) — nicht das Entsperren von Selbstverständlichkeiten.

> **Wirtschaftlichkeit ohne Verschwendung (§0-Direktive 3):** „Schlank" heißt **nicht** „kostenlos für den Owner". Es gibt **zwei** komplementäre Geldflüsse: (a) das **wiederkehrende Erzeuger-Abo** (planbar, MRR) und (b) die **nutzungsbasierte SB-Transaktionsgebühr** (skaliert linear mit dem Abverkauf an unbemannten Ständen, über alle Höfe). Beide Muster sind **imperiumsweit wiederverwendbar** — jede ConnectCore-Tochter mit physischem Abverkauf am unbemannten Punkt erbt sie. Skalierung 10→300→3000 Höfe ist mitgedacht: das Modell trägt vom ersten Hof bis zur Region, ohne Re-Pricing.

---

## 1 · Geldfluss-Architektur im Überblick

| Geldfluss | Wer zahlt | An wen | Mechanik | Status |
|---|---|---|---|---|
| **Erzeuger-Abo** (wiederkehrend) | Erzeuger (`org`) | Plattform | Stripe-Subscription auf `orgs.plan` → Webhook → Entitlement serverseitig | `PHASEN.md` WAVE_09 |
| **SB-Transaktionsgebühr** (nutzungsbasiert) | Hof (aus Netto, Default) | Plattform | Stripe Connect **Destination Charge** mit `application_fee_amount` = `platform_fee_cents` | Phase 4 Track A |
| **Warenwert** (Kaufpreis) | Käufer | **Hof** (nicht Plattform) | Connect `transfer_data.destination = orgs.stripe_connect_id`; Plattform ist nur Anbindung | Phase 4 Track A |

**Vermittler-Grundsatz (nicht verhandelbar, `agb.md` §6/§9, `SB_BEZAHLUNG_USP.md` §0):** Der Warenwert fließt **über Stripe Connect unmittelbar an das Hof-Konto**. Die Plattform ist Zahlungsanbindung/Vermittler, **nicht** Verkäufer und **nicht** Empfänger des Kaufpreises; sie behält ausschließlich die konfigurierte Plattformgebühr. Es besteht **kein plattformeigenes Verwahrkonto** im Eigenverkauf (keine Treuhand-/E-Geld-Lizenzfrage durch Saldenhaltung). Die Quittung weist stets den **Hof als Leistungserbringer** und die Plattform als Vermittler aus.

---

## 2 · Erzeuger-Abo — die fünf kanonischen Stufen

Kanonische Plan-Stufen des Imperiums (`CLAUDE.md` Datenbank-/Planregeln, `agb.md` §10): **`demo` · `basis` · `plus` · `pro` · `individuell`**. „Enterprise" ist **kein** öffentlicher Plan, sondern das Funktionsniveau in `individuell`. Plan-Persistenz = `orgs.plan`; Durchsetzung **serverseitig** (RLS + Edge-Function-Entitlement-Auflösung), das Frontend spiegelt nur und zeigt bei Lock einen **konkreten Upgrade-Pfad** (Pfeiler 4).

### 2.1 Stufen-Charakter

| Stufe | Charakter | Für wen | Geldfluss |
|---|---|---|---|
| **`demo`** | Kostenlose Grund-Sichtbarkeit | Jeder neue Hof; Hofläden, die „erst ankommen" wollen | 0 € — kein Abo |
| **`basis`** | Schlankes Einsteiger-Abo | Aktive Höfe mit regelmäßiger Selbstpflege | niedriges Monats-/Jahresabo |
| **`plus`** | Reichweite + Self-Service-Tiefe | Höfe mit mehreren Produkten/Abholfenstern, aktivem SB-Stand | mittleres Abo |
| **`pro`** | Volle Plattform-Hebel | Größere Betriebe, Hofläden-Verbünde, hohes SB-Volumen | höheres Abo |
| **`individuell`** | Verhandelt (Enterprise-Niveau) | Erzeugergemeinschaften, regionale Vermarkter, Sonderbedarf | Angebot/Vertrag (kein Katalogpreis) |

> **Bewusst schlank:** Nur **eine** kostenlose und **eine** Einsteiger-Stufe als Mission-Anker, darüber zwei Wachstums-Stufen und ein Verhandlungs-Tier. Keine künstliche Tier-Inflation. Die Differenzierung läuft über **Reichweite, Self-Service-Tiefe, SB-Gebührenhöhe und Support** — nicht über das Wegsperren von Grundfunktionen.

### 2.2 Feature- & Limit-Matrix

`✓` = enthalten · `✗` = nicht enthalten · `—` = nicht anwendbar. Zahlenwerte mit `[[OWNER: …]]` sind Geschäftsparameter und vom Owner final festzulegen (Commercial-/Stop-Regel `CLAUDE.md`).

```
Funktion / Limit                          │ demo      │ basis     │ plus       │ pro          │ individuell
──────────────────────────────────────────┼───────────┼───────────┼────────────┼──────────────┼─────────────
HOFLADEN-PRÄSENZ
  Hof im Finder/Karte sichtbar             │ ✓ (Basis) │ ✓         │ ✓          │ ✓            │ ✓
  Hof-Detailseite (Beschreibung, Öffnung)  │ ✓ (kurz)  │ ✓         │ ✓          │ ✓            │ ✓
  Hof-Galerie / Bilder                     │ [[OWNER]] │ ✓         │ ✓          │ ✓            │ ✓
  Premium-Listing (bedingt, §4)            │ ✗         │ ✗         │ optional   │ ✓ inkludiert │ ✓ inkludiert
  Mehrere Standorte / Höfe je Org          │ 1         │ 1         │ [[OWNER]]  │ [[OWNER]]    │ unbegrenzt
PRODUKTVERFÜGBARKEIT (Erzeuger-Selbstpflege)
  Gepflegte Produkte (aktiv)               │ [[OWNER]] │ [[OWNER]] │ [[OWNER]]  │ unbegrenzt   │ unbegrenzt
  Verfügbarkeits-/Bestandspflege (mobil)   │ ✓ (Basis) │ ✓         │ ✓          │ ✓            │ ✓
  Saison-/Vorankündigung pflegen           │ ✗         │ ✓         │ ✓          │ ✓            │ ✓
RESERVIERUNG & ABHOLUNG
  Reservierung/Abholfenster anbieten       │ ✓ (Basis) │ ✓         │ ✓          │ ✓            │ ✓
  Aktive Reservierungen gleichzeitig       │ [[OWNER]] │ [[OWNER]] │ [[OWNER]]  │ unbegrenzt   │ unbegrenzt
  Abholfenster-Kalender (Slots)            │ einfach   │ ✓         │ ✓ erweitert│ ✓ erweitert  │ ✓ erweitert
SAISON-RADAR & REICHWEITE
  Im Saison-Radar gelistet                 │ ✓         │ ✓         │ ✓          │ ✓            │ ✓
  Push bei Saison-/Verfügbarkeits-Alerts*  │ ✗         │ ✓         │ ✓          │ ✓            │ ✓
  Hervorhebung „in der Nähe" / Ranking-Boost│ ✗         │ ✗         │ optional   │ ✓            │ ✓
SB-BEZAHLUNG (USP)
  SB-Stand aktivierbar (QR → Stripe)       │ [[OWNER]] │ ✓         │ ✓          │ ✓            │ ✓
  SB-Transaktionsgebühr (§3)               │ Standard  │ Standard  │ reduziert  │ stärker red. │ verhandelt
  Einnahmen-/Schwund-Dashboard             │ ✗         │ ✓ (Basis) │ ✓          │ ✓ erweitert  │ ✓ erweitert
SUPPORT & SLA
  Support-Kanal                            │ Self-Serv.│ E-Mail    │ E-Mail prio│ prio + Chat  │ benannt/SLA
  Reaktionsziel (Werktags)                 │ —         │ [[OWNER]] │ [[OWNER]]  │ [[OWNER]]    │ vertraglich
  Plattform-Verfügbarkeits-Zusage          │ —         │ —         │ —          │ —            │ [[OWNER: SLA]]
```

\* *Saison-/Verfügbarkeits-Alerts sind ein **Käufer**-Feature (`docs/spezialmodule/SAISON_RADAR.md`); hier ist gemeint, dass der Hof als **Auslöser** solcher Alerts in höheren Stufen aktiv erfasst/priorisiert wird.*

> **Pfeiler 4 (RBAC ohne Lücken):** Jeder Plan-Lock zeigt dem Erzeuger den **konkreten** Upgrade-Pfad („Diese Funktion ist ab `plus` verfügbar — jetzt upgraden"), kein toter Hinweis, kein Sackgassen-State. Limits werden **serverseitig** geprüft; ein Client-seitiges Umgehen ändert nichts an der DB-Durchsetzung.

### 2.3 Beispielpreise (Owner-Entscheidung)

> **Geld-/Pricing-Entscheidung erfordert Owner-Freigabe** (`CLAUDE.md` Commercial-/Stop-Regel). Die folgenden Felder sind **Platzhalter**, keine zugesagten Preise. Beim Festlegen gilt §0-Direktive 3 (Owner-Wert × Mission-Balance) sowie Mission-Leitsatz 1 (niedrige Einstiegshürde).

```
Stufe         │ Monatspreis            │ Jahrespreis (Vorteil)        │ USt-Ausweisung
──────────────┼────────────────────────┼──────────────────────────────┼──────────────────────────
demo          │ 0 €                    │ 0 €                          │ —
basis         │ [[OWNER: z. B. X €/Mon]]│ [[OWNER: z. B. Y €/Jahr]]    │ [[OWNER: zzgl./inkl. USt.]]
plus          │ [[OWNER: z. B. X €/Mon]]│ [[OWNER: z. B. Y €/Jahr]]    │ [[OWNER: zzgl./inkl. USt.]]
pro           │ [[OWNER: z. B. X €/Mon]]│ [[OWNER: z. B. Y €/Jahr]]    │ [[OWNER: zzgl./inkl. USt.]]
individuell   │ Angebot                │ Angebot                      │ vertraglich
```

- **Abrechnungsintervall:** Monats- oder Jahresabo (Jahr mit Rabatt zur Bindung empfohlen). [[OWNER: Höhe Jahresrabatt, z. B. „2 Monate frei".]]
- **Währung:** EUR (EU-Plattform, `agb.md`/`COMPLIANCE_MODEL.md`).
- **Umsatzsteuer:** [[OWNER: Preise zzgl. oder inkl. gesetzlicher USt. — konsistent zu `agb.md` §10 Abs. 3.]]
- **Zahlungsmittel:** Stripe (Karte/SEPA-Lastschrift, je nach Stripe-Konfiguration). Abo-Mechanik vollständig über Stripe-Subscriptions; Entitlement erst nach signiertem Webhook (§5).

---

## 3 · SB-Transaktionsgebühr (USP-Monetarisierung)

> **Quelle der Mechanik:** `docs/spezialmodule/SB_BEZAHLUNG_USP.md` §7 (Gebührenmodell). Diese Sektion ist die **kommerzielle** Sicht; die technische Wahrheit liegt in der Edge Function (`initiate`) und in `sb_payments.platform_fee_cents`. **Nie** Client-Wert, **nie** in der UI hartkodiert.

### 3.1 Gebühren-Formel (serverseitig)

Je **erfolgreicher** SB-Zahlung erhebt die Plattform eine kleine, serverseitig berechnete Gebühr:

```
platform_fee_cents = max( fixfee_cents , round( amount_cents × pct ) )
```

- Der `max(...)`-Term deckt die Stripe-Mindestkosten auch bei Kleinstbeträgen ab.
- Die Gebühr ist **degressiv gestaltbar** (z. B. niedrigerer `pct` ab einem Volumen/Betrag), damit höhere Beträge nicht überproportional belastet werden.
- `amount_cents` wird **immer serverseitig** aus `products.price_cents` (bzw. dem gegen die DB aufgelösten Warenkorb) bestimmt — kein Preis kommt aus dem QR/Link (Tamper-Schutz, `SB_BEZAHLUNG_USP.md` §5.3/§6).

### 3.2 Erhebungsweg

| Aspekt | Default-Pfad (käuferfreundlich) | Alternative (Owner-Entscheidung) |
|---|---|---|
| **Wer trägt die Gebühr** | **Hof aus Netto** via `application_fee_amount` bei der Connect-Belastung | Käufer-Aufschlag, vor Zahlung transparent ausgewiesen |
| **Käufer-Sicht** | Käufer zahlt den **ausgewiesenen Warenwert**, keine separate Käufer-Gebühr | Gebühr separat auf der Quittung ausgewiesen |
| **Transparenz** | Im Erzeuger-Dashboard als separater Posten (Brutto · Plattformgebühr · Stripe-Gebühr · Netto) | zusätzlich auf der Käufer-Quittung |
| **Stripe-Gebühr** | trägt der Hof aus Connect-Netto; im Dashboard separat ausgewiesen | konfigurierbar |

> **Default = `application_fee` aus Hof-Netto.** Begründung: friktionsarm für Käufer (kein Aufschlag, keine Abbruch-Hürde am SB-Stand), mission-konsistent (Lebensmittel nicht verteuern) und für den Hof transparent gegenüber dem klassischen Bargeld-Schwund. Der Erhebungsweg ist ein **Owner-Parameter**, keine hartkodierte Geschäftslogik (`agb.md` §6 weist die jeweils geltende Gebühr vor Abschluss transparent aus).

### 3.3 Plan-Kopplung der SB-Gebühr

Die SB-Gebührenhöhe ist an `orgs.plan` koppelbar — höhere Abo-Stufen erhalten eine **reduzierte** SB-Gebühr als Entitlement (serverseitig aufgelöst). Damit ist das Abo **nicht** reines Kostenrisiko, sondern senkt die variable Gebühr — ein in sich stimmiger Upgrade-Anreiz für Höfe mit hohem SB-Volumen.

```
Stufe         │ SB-Transaktionsgebühr (pct / fixfee)              │ Charakter
──────────────┼───────────────────────────────────────────────────┼──────────────────────
demo          │ [[OWNER: z. B. A % + B €, Standardsatz]]          │ Standard
basis         │ [[OWNER: Standardsatz]]                           │ Standard
plus          │ [[OWNER: reduzierter Satz]]                       │ reduziert
pro           │ [[OWNER: stärker reduzierter Satz]]               │ stärker reduziert
individuell   │ [[OWNER: vertraglich verhandelt]]                 │ verhandelt
```

> **Mindestgebühr (`fixfee_cents`):** [[OWNER: z. B. „mind. B € pro Transaktion".]] **Prozentsatz (`pct`):** [[OWNER: z. B. „A %".]] Diese beiden Werte sind die zentralen Stellschrauben der USP-Monetarisierung und werden zentral konfiguriert (Owner-Parameter pro Plan/Org), nicht im Code verstreut.

### 3.4 Erstattungen

Bei Refund über die ursprüngliche Charge wird die `application_fee` **konfigurierbar mit-erstattet** (Default: anteilige Gebühren-Rückerstattung bei Vollerstattung) — als Owner-Parameter, nie hartkodierte Geschäftslogik (`SB_BEZAHLUNG_USP.md` §4.3). [[OWNER: Refund-Gebührenpolitik bestätigen — z. B. „Plattformgebühr wird bei Vollerstattung anteilig zurückerstattet".]]

---

## 4 · Premium-Listing (bedingt)

Premium-Listing ist eine **Reichweiten-Hervorhebung** des Hofes (Ranking-Boost im Finder/Saison-Radar, Hervorhebung „in der Nähe", optisch abgesetzte Karte). Es ist **bedingt** — bewusst nicht beliebig käuflich, um die Mission-Integrität zu wahren:

1. **Plan-gebunden:** als **Option** ab `plus`, **inkludiert** ab `pro`/`individuell`. In `demo`/`basis` **nicht** verfügbar (kein Pay-to-Win für inaktive Einsteiger-Höfe).
2. **Qualitäts-/Aktivitäts-Gate (nicht verhandelbar):** Premium-Sichtbarkeit setzt einen **gepflegten, verifizierten** Hof voraus — d. h. Hof-Verifizierung durch Staff abgeschlossen (`PHASEN.md` WAVE_07), aktuelle Verfügbarkeitspflege und vollständige Pflichtangaben (Öffnung, Kontakt, Lebensmittel-Hinweis). **Geld allein kauft keine Top-Platzierung** — ein veralteter oder unverifizierter Hof wird nicht hochgereiht. Das schützt das Käufer-Vertrauen (der eigentliche Plattform-Wert) und ist Pfeiler-konform (Pfeiler 4/7).
3. **Transparenz & Fairness:** Hervorgehobene Treffer sind als solche **erkennbar** (kein verdecktes Bezahl-Ranking, das Käufer täuscht). Organisches Ranking (Nähe, Saison-Passung, Aktualität) bleibt die Basis; Premium ist ein **moderater** Boost, kein Ausblenden der Konkurrenz.

> **Owner-Entscheidung:** Ob Premium-Listing als separat buchbares Add-on (Aufpreis) oder rein als Plan-Inklusivleistung geführt wird. Default = Plan-Inklusivleistung (schlank, keine zusätzliche Buchungs-Komplexität). [[OWNER: Premium-Listing als Add-on mit Aufpreis (z. B. X €/Mon) ODER ausschließlich Plan-inkludiert? Falls Add-on: Preis + Buchbarkeit ab welcher Stufe.]]

---

## 5 · Abrechnung, Entitlement & Webhook-Wahrheit

> **Bezug:** `SB_BEZAHLUNG_USP.md` (Webhook-Pattern), `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant), `docs/STRIPE-SETUP.md` (geplant).

- **EIN signaturgeprüfter, idempotenter Stripe-Webhook** ist die einzige Quelle für Entitlement-Änderungen (`CLAUDE.md` Backend-Regeln). Frontend-Signale (z. B. „Upgrade geklickt") setzen **nie** ein Entitlement.
- **Entitlement-Auflösung serverseitig:** `orgs.plan` + Plan→Limit-Map (Edge Function / DB), nie im Client. Das Frontend liest den aufgelösten Zustand und spiegelt ihn (Locks, Upgrade-CTAs).
- **Idempotenz:** Jedes Stripe-Event wird über eine eindeutige Event-ID genau einmal wirksam (kein Doppel-Grant bei Webhook-Retries).
- **Audit (Pfeiler 5):** Jede plan-/entitlement-relevante Mutation schreibt `subscription.changed` bzw. `entitlement.granted` (`COMPLIANCE_MODEL.md` §Commercial-Audit) — wer/was/warum, unabschaltbar.
- **Zahlungsverzug:** Bei ausbleibender Abo-Zahlung können kostenpflichtige Funktionen **nach Ankündigung** ausgesetzt werden (`agb.md` §10 Abs. 4). Rückstufung erfolgt geordnet (§6), nicht durch hartes Löschen.

---

## 6 · Tarifwechsel & Lebenszyklus

> **Detail-Spezifikation:** `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant). Hier die kommerziellen Eckpunkte; sie sind konsistent zu `agb.md` §16 (Laufzeit/Kündigung).

| Vorgang | Wirksamkeit | Folge |
|---|---|---|
| **Upgrade** | Sofort | Differenz anteilig (Stripe-Proration); neue Entitlements/SB-Gebühr greifen unmittelbar nach Webhook |
| **Downgrade** | Zum Ende des Abrechnungszeitraums | höhere Entitlements (Premium-Listing, reduzierte SB-Gebühr, erweiterte Limits) enden zeitgleich; Daten bleiben erhalten |
| **Kündigung** | Zum Ende des Abrechnungszeitraums, Frist im Bestellprozess | kostenpflichtige Funktionen aus; Hof kann auf **kostenfreie `demo`-Basis-Sichtbarkeit** zurückgestuft oder nach Ankündigung depubliziert werden |
| **Rückstufung auf `demo`** | mit Kündigungswirksamkeit | Hof bleibt grundsichtbar; Premium/erweiterte Limits entfallen; **keine** Datenlöschung allein durch Downgrade |

- **Mindestlaufzeit & Kündigungsfrist:** [[OWNER: z. B. „Mindestlaufzeit 1 Monat, Kündigungsfrist 30 Tage zum Laufzeitende" — konsistent zu `agb.md` §16 Abs. 2.]]
- **Erstattung laufender Perioden:** Bereits gezahlte Entgelte werden für laufende Perioden, soweit gesetzlich nicht anders geboten, **nicht** anteilig erstattet (`agb.md` §16 Abs. 3).
- **Datenportabilität bleibt planunabhängig:** Auch nach Downgrade/Kündigung kann der Erzeuger seinen Betriebs-Datensatz selbst exportieren (`COMPLIANCE_MODEL.md` §Auskunft/Export) — Export ist **gesetzliche Pflicht**, nie hinter einem Plan-Lock.

---

## 7 · Aufbewahrung & kommerzielle Wahrheitsdefinitionen

> **Bezug:** `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (geplant), `COMPLIANCE_MODEL.md` §4 (Aufbewahrung), `SB_BEZAHLUNG_USP.md` (`sb_payments` Kat. C).

- **Aufbewahrung:** SB-Zahlungen (`sb_payments`) und Abo-Rechnungen sind **aufbewahrungspflichtig (Kat. C, 10 Jahre, HGB §257/AO §147)** — während der Frist **nicht löschbar**, auch nicht über Erzeuger-Self-Service.
- **MRR-/Revenue-Trennung** (für Due-Diligence-fähige Reporting-Sichten):

```
Catalog MRR (theoretisch)   │ Katalog-/Tier-Referenzwert aktiver bezahlter Abos
Contractual MRR (anerkannt) │ MRR nach Preisquellen-Präzedenz je aktiver Subscription
Invoiced Revenue            │ Σ Rechnungen mit Status issued | overdue | paid
Paid Revenue                │ Σ Rechnungen mit Status paid
Open Receivables            │ Σ Rechnungen mit Status issued | overdue
SB-Volumen (usage)          │ Σ sb_payments.platform_fee_cents WHERE status = succeeded (Zeitraum)
```

- **Preisquellen-Präzedenz für `individuell`** (analog Imperium-Standard):
  1. `custom_quote_pending` — **keine** Revenue-Anerkennung (offene Angebotsphase fließt nie als „0 €" implizit in KPI-Summen ein),
  2. `individual_contract_price_cents`,
  3. `pilot_price_cents`,
  4. Katalog-/Tierpreis.

---

## 8 · Offene Owner-Entscheidungen (Pricing) — Sammelübersicht

> Konsolidiert alle `[[OWNER: …]]` dieses Dokuments. **Geld-/Pricing ist Owner-Hoheit** (`CLAUDE.md` Stop-/Commercial-Regel). Korrespondiert mit `SB_BEZAHLUNG_USP.md` §13 (SB-01) und den `agb.md`-Platzhaltern §6/§10/§16.

| ID | Entscheidung | Priorität | Default-Empfehlung |
|---|---|---|---|
| PR-01 | Abo-Preise `basis`/`plus`/`pro` (Monat + Jahr) | HOCH | niedrige Einstiegshürde (Mission-Leitsatz 1), Jahresrabatt zur Bindung |
| PR-02 | USt.-Ausweisung (zzgl./inkl.) | HOCH | konsistent zu `agb.md` §10 |
| PR-03 | SB-Gebühr `pct` + `fixfee_cents` (Standardsatz) | HOCH | klein, deckt Stripe-Mindestkosten, degressiv |
| PR-04 | Plan-Staffelung der SB-Gebühr (reduziert ab `plus`/`pro`) | MITTEL | reduzierter Satz als Upgrade-Anreiz |
| PR-05 | Erhebungsweg SB-Gebühr (`application_fee` aus Hof-Netto vs. Käufer-Aufschlag) | HOCH | `application_fee` aus Hof-Netto (käuferfreundlich) |
| PR-06 | Refund-Gebührenpolitik (anteilig/voll/keine Rückerstattung) | MITTEL | anteilige Rückerstattung bei Vollerstattung |
| PR-07 | Premium-Listing: Plan-inkludiert vs. Add-on mit Aufpreis | MITTEL | Plan-inkludiert (schlank) |
| PR-08 | Limits je Stufe (Produkte, Reservierungen, Standorte) | MITTEL | großzügig, keine künstliche Verknappung |
| PR-09 | Mindestlaufzeit + Kündigungsfrist | HOCH | konsistent zu `agb.md` §16 |
| PR-10 | Support-Reaktionsziele + SLA-Zusage `individuell` | MITTEL | Reaktionsziele staffeln; SLA nur in `individuell` |
| PR-11 | `demo`: SB-Stand und Galerie erlaubt? | MITTEL | SB ja (Volumen-Hebel), Galerie limitiert |

---

## 9 · Querverweise

`docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Mechanik, §7 Gebührenmodell) · `docs/COMPLIANCE_MODEL.md` (Vermittler · Subprozessor Stripe · Aufbewahrung · Export) · `docs/launch/B_rechtstexte/agb.md` (§6 SB-Gebühr · §10 Tarife · §16 Laufzeit) · `docs/ROLE_AND_PERMISSION_MODEL.md` (Plan-Locks · Org-Scope) · `docs/SUBSCRIPTION_LIFECYCLE.md` (geplant) · `docs/STRIPE-SETUP.md` (geplant, + Connect/SB) · `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (geplant) · `PHASEN.md` (WAVE_09 Billing · Phase 4 Track A · Phase 5 Gate 10) · `MASTER_INDEX.md` (4 · Commercial & Billing).
