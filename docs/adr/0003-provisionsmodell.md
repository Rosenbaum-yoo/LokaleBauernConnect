# ADR 0003 — Provisionsmodell: Transaktions-Provision statt SaaS-Stufen (Connect-basiert, status-gestaffelt)

- **Status:** **Vorgeschlagen — Owner-Freigabe ausstehend** (Pricing/Geld = Stop-/Commercial-Regel, `CLAUDE.md`). Alle konkreten Prozent- und Eurowerte unten gelten als **Empfohlen — Owner-Freigabe ausstehend**, bis der Owner sie per Confirm + Reason + Audit bestätigt.
- **Datum:** 2026-06-20
- **Entscheider:** Owner (Geld). Vorbereitet von Claude (Commercial + payment-engineer).
- **Betroffen:** `app/src/lib/fees.ts` (neu, Single Source of Truth Code) · `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (gespiegelt) · `docs/PRICING.md` · `app/supabase/functions/create-checkout/index.ts` · `app/supabase/functions/_shared/commercial-catalog.ts` · neue Migration `0005_connect.sql` (+ `fee_ledger`).
- **Bezug:** `docs/PRICING.md` (§0 Mission, §1 Geldfluss, §3 SB-Gebühr), `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` (Origin-Hierarchie, Katalog), `docs/spezialmodule/SB_BEZAHLUNG_USP.md`, `docs/COMPLIANCE_MODEL.md` (Vermittler-Position), ADR 0001 (Stack), ADR 0002 (standalone-first).

---

## Kontext

### Warum der Wechsel von SaaS-Stufen zu Transaktions-Provision

Das bisher kanonisierte Pricing (`docs/PRICING.md`, `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`) ruht auf **zwei** Geldflüssen: einem wiederkehrenden Erzeuger-Abo (`demo/basis/plus/pro/individuell`, MRR) **und** einer nutzungsbasierten SB-Transaktionsgebühr. Der Owner schlägt einen **Modellwechsel** vor: weg von klassischen SaaS-Abo-Stufen, hin zu einer **zweiseitigen Transaktions-Provision** als primärem Geldfluss:

- Käufer zahlt X % beim Kauf **und** Verkäufer zahlt Y % beim Verkauf (Owner-Vorschlag-Basis: **6 % gesamt = 3 % / 3 %**, „3/3").
- Optionale **Premium-Mitgliedschaft 30 €/Monat** senkt auf 3 % gesamt („0/3"); beide Seiten Premium → 0/0.
- Zusätzlich **Reputations-/Bounty-Status-Stufen** (Bronze/Silber/Gold/…), die die %-Gebühr mit steigendem Status senken.

Der Wechsel ist **strategisch stimmig**: Eine zweiseitige Marktplatz-Provision skaliert linear mit GMV, finanziert die Plattform genau dort, wo sie Wert stiftet (vermittelte, bezahlte Transaktion), und passt zur Klasse-C-Mission (Cashflow-Schnellstart, hoher gesellschaftlicher Nutzen). Sie ist imperiumsweit wiederverwendbar (jede ConnectCore-Tochter mit physischem Abverkauf erbt das Muster).

### Drei harte Randbedingungen, die das Modell zwingend formen

1. **Vermittler-Rolle (nicht verhandelbar).** Der Warenwert darf **nie** auf dem Plattformkonto landen; die Plattform behält nur ihre Provision. Erfordert **Stripe Connect Destination Charge** (`transfer_data.destination` an den Hof, `application_fee_amount` = Plattformanteil).
2. **Mission-Konflikt „Käufer zahlen nie für den Zugang"** (`PRICING.md` §0.2). Eine sichtbare 3 %-Käuferprovision kollidiert direkt mit diesem dokumentierten Leitsatz **und** mit der USP-Friktionsfreiheit am SB-Stand (scannen → zahlen muss reibungslos sein) **und** mit der PAngV-Transparenzlast (Endpreis vor dem zahlungspflichtigen Button).
3. **Code-Realität (verifiziert 2026-06-20).** Die aktuelle Edge Function `create-checkout` erhebt **keine** `application_fee`, nutzt **kein** Connect und **kein** `transfer_data.destination` — der gesamte Betrag fließt heute auf das Plattformkonto. Das ist faktischer Eigenverkauf und verletzt die Vermittler-Rolle. **Vor jedem Live-Gang mit echtem Geld muss Connect stehen.** Der Wechsel auf das Provisionsmodell ist damit nicht nur kommerziell, sondern auch der Hebel, der diesen Compliance-Blocker schließt.

> **Hinweis zur Bestands-Doku:** `PRICING.md`/`COMMERCIAL_SOURCE_OF_TRUTH.md` beschreiben heute Abo-Stufen + SB-Gebühr. Diese ADR schlägt vor, die **primäre** Monetarisierung auf die Transaktions-Provision umzustellen; das Abo wird zum **optionalen Premium-Produkt** (siehe Entscheidung). Bei Annahme werden beide Dokumente nachgezogen, `app/src/lib/fees.ts` wird neue Single Source of Truth für die Gebührenberechnung.

---

## Optionen

| # | Option | Beschreibung | Bewertung |
|---|---|---|---|
| **A** | **Nur Verkäufer (6/0)** | Käufer zahlt 0 %, Hof trägt die volle Provision. | Maximal mission-/USP-konform (Käufer komplett gebührenfrei), aber verwirft die zweiseitige Provisions-Story des Owners vollständig. |
| **B** | **Geteilt 3/3 (Owner-Vorschlag)** | Käufer 3 % sichtbar, Verkäufer 3 %. | Klare zweiseitige Story, aber: sichtbare 3 %-Käuferprovision ist der #1-Konversionskiller am SB-Stand, kollidiert mit Mission-Leitsatz „Käufer zahlen nie" und erhöht die PAngV-Last (Drip-Pricing-Abmahnrisiko). |
| **C** | **Mit Premium** | Provision + optionale Mitgliedschaft, die den Satz senkt (bis 0/0). | Premium kannibalisiert den Plattformanteil an den umsatzstärksten Höfen; **echte 0/0** subventioniert die Stripe-Selbstkosten. Tragbar nur, wenn Premium **über** Break-even bepreist + an Wert-Bundle gekoppelt ist und **keine** echten 0/0 angeboten werden. |
| **D** | **Mit Tiers** | Reputations-/Status-Stufen senken den Provisionssatz mit steigender Reife. | Starker Loyalitäts-/Qualitäts-Anreiz, nutzt bestehende RLS-Infra (`reviews.verified`, Reputation, Bounties, `credits_ledger` aus Migration 0003). Risiko: Anti-Gaming (Selbstkauf/Kollusion) und Over-Discounting bei Reife → strenge Kriterien + `floorPct`-Bremse nötig. |
| **E (empfohlen)** | **Hybrid A′+C+D** | **Asymmetrische 5/1** (Verkäufer 5 %, Käufer 1 %) als Standard, Verkäufer-only-Premium über Break-even, Status-Tiers senken **nur** die Verkäufer-Provision, harte Untergrenzen. | Behält die zweiseitige Provisions-Story (1 % Käufer) **und** schützt SB-Konversion + Mission; korrigiert die drei Owner-Vorschlags-Fehler (sichtbare 3 % Käufer, Käufer-Premium, echte 0/0). Siehe Entscheidung. |

---

## Entscheidung (empfohlen — Owner-Freigabe ausstehend)

**Modell:** *LokaleBauernConnect Provisionsmodell v1 — Connect-basiert, status-gestaffelt* (Option E).

### 1 · Rate-Card (Standard, Neu-Verkäufer ohne Premium)

| Seite | Satz (Empfohlen — Owner-Freigabe ausstehend) | Begründung |
|---|---|---|
| **Verkäufer** | **5,0 %** | Hauptlast trägt der Hof — er spart durch SB-Bezahlung Schwund + Bargeld-Handling. |
| **Käufer** | **1,0 %** | Statt der vorgeschlagenen 3 %: minimale SB-Stand-Friktion, entschärft den Mission-Konflikt „Käufer zahlen nie", hält die zweiseitige Story intakt. |
| **Gesamt** | **6,0 %** | Gleiche Take-Rate wie der Owner-Vorschlag, nur anders verteilt. |

- **Absolute Mindestgebühr 0,25 €/Transaktion** (aus dem Verkäuferanteil): Unter ~5,56 € Ticket decken 6 % sonst die Stripe-Kosten (1,5 % + 0,25 €) nicht. **Zwingend** für den SB-Kleinbetrags-USP.
- **Floor (effektiver Verkäufersatz nie unter `floorPct = 1,2 %`)** — greift bei Premium/Top-Tier, damit pro Transaktion nie subventioniert wird.
- **Wettbewerb:** 6 % gesamt ist massiv günstiger als Marktschwärmer (18,35 %) und CrowdFarming/La Ruche (20 %), leicht unter Etsy (~6,5 % + Payment) → Marketing-Argument „über 94 % bleiben beim Hof".

### 2 · Premium „Hof-Plus" (optional, Verkäufer-only)

- **Preis: 39 €/Monat** (Empfohlen — Owner-Freigabe ausstehend; statt 30 €): bewusst **über** Break-even (39 € / 5 % = 780 €/Mo GMV) + an Wert-Bundle gekoppelt (Prioritäts-Ranking im Finder, Saison-Alerts, mehrere SB-Stände, Einnahmen-Dashboard).
- **Wirkung:** setzt den Verkäufer-Provisionsterm rechnerisch auf 0 %, real abgefangen durch `floorPct` 1,2 % / 0,25 €-Floor (reale Premium-Verkäufergebühr = `floorPct`, **nicht** 0). Käufer-1 % + Floor bleiben.
- **Käufer-Premium wird gestrichen** (Break-even ~1000 €/Mo Käuferausgaben → unverkäuflich, lenkt vom USP ab).
- **Keine echten 0/0** (Subventionsfalle ausgeschlossen).
- Technisch als Stripe-Subscription (wiederverwendbare `subscriptions`-Mechanik), Webhook setzt `premium_active`/`premium_until` pro `org_id`. Zielgruppe: nur umsatzstarke Voll-Erwerbs-Höfe (>~780 €/Mo GMV), erwartete Konversion bewusst niedrig (~15–20 %).

### 3 · Status-Tiers (senken **nur** die Verkäufer-Provision)

| Tier | Kriterien (verkürzt; verified=true, nicht-refundiertes GMV) | Käufer | Verkäufer |
|---|---|---|---|
| **Neu** | Default: 0–89 Tage **oder** < 2.000 € kum. GMV | 1,0 % | 5,0 % |
| **Bronze** | ≥ 2.000 € GMV, ≥ 5 verif. Bewertungen, Rating ≥ 4,0, ≥ 30 Tage | 1,0 % | 4,6 % |
| **Silber** | ≥ 10.000 € GMV, ≥ 15 Bewertungen, ≥ 4,3, ≥ 90 Tage, ≥ 1 Bounty | 1,0 % | 4,2 % |
| **Gold** | ≥ 40.000 € GMV, ≥ 40 Bewertungen, ≥ 4,5, ≥ 180 Tage, ≥ 3 Bounties, ≥ 95 % Erfüllungsquote | 1,0 % | 3,8 % |
| **Platin** | ≥ 150.000 € GMV, ≥ 100 Bewertungen, ≥ 4,6, ≥ 365 Tage, ≥ 8 Bounties, ≥ 98 % Quote, 0 offene Disputes/90 T | 1,0 % | 3,4 % |

Reputation ist ein **Verkäufer**-Attribut → Tiers berühren den Käufer-1 % nie. Laufende Demotion bei Refunds/Disputes/Rating-Abfall/Inaktivität.

### 4 · Gebühren-Formel (serverseitig materialisiert)

```
effective_seller_pct = max( floorPct,
                            basis_seller_pct − status_rabatt − (premium_active ? basis_seller_pct : 0) )
basis_seller_pct = 5,0 %
status_rabatt    = { Neu 0,0 | Bronze 0,4 | Silber 0,8 | Gold 1,2 | Platin 1,6 }  (Prozentpunkte)
floorPct         = 1,2 %        // effektiver Verkäufersatz nie darunter
effective_buyer_pct = 1,0 %     // konstant, premium-unabhängig (Käufer-Premium gestrichen)

// Pro Transaktion, harte EUR-Untergrenze:
seller_fee_cents  = max( round(gross * effective_seller_pct/100), 25 )   // nie < 0,25 €
buyer_fee_cents   = round(gross * effective_buyer_pct/100)
application_fee_amount = buyer_fee_cents + seller_fee_cents              // an Plattform
// Rest via transfer_data.destination an den Hof.
```

- **`effective_fee_bps` wird SERVERSEITIG materialisiert** (Source of Truth pro Org, gelesen von `create-checkout`/`application_fee`), **nie** im Client berechnet — analog `computeSbFeeCents` (Anti-Tampering, `COMMERCIAL_SOURCE_OF_TRUTH.md` §6.1).
- Nur `verified=true` & nicht-refundiertes GMV zählt fürs Tier.

---

## Konsequenzen

### Technik (Stripe Connect)
- **Connect Destination Charge** ist Pflicht: `transfer_data.destination = orgs.stripe_connect_id`, `application_fee_amount` = Käufer- + Verkäuferanteil. **Existiert im Code heute NICHT** — `create-checkout` muss umgebaut werden (verifiziert: aktuell ohne Connect/`application_fee`).
- **Connect-Kontotyp Express** (KYC bei Stripe, Plattform-Branding/Beleg) — Owner-Freigabe + extern Connect-Platform-Profil aktivieren/Connect-Terms akzeptieren.
- **`app/src/lib/fees.ts`** wird Single Source of Truth (Code) für die Gebührenberechnung, gespiegelt nach `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`; integriert sich neben dem bestehenden Katalog-Helper `computeSbFeeCents`.
- **Migration `0005_connect.sql`** + **`fee_ledger`** (Audit pro Transaktion: effektiver Satz, Käufer-/Verkäuferanteil, Tier, premium-Flag; RLS org-gebunden, deny-by-default, Isolationstest).
- **`effective_fee_bps`** pro Org serverseitig materialisiert; Reputations-Trigger (vorhanden aus Migration 0003) werden **fee-wirksam** erweitert (Platin + GMV/Tenure/Bounty/Quote ergänzen) + Anti-Gaming.

### Recht (USt / PAngV / DAC7 / ZAG)
- **USt 19 % nur auf die Provision.** Destination Charge hält den **Hof als Merchant of Record / USt-Schuldner der Ware**; Quittung weist Hof als Leistungserbringer + Plattform als Vermittler aus. Steuerberater/anwaltliche Endprüfung Pflicht.
- **PAngV/UWG:** Sichtbarer Käuferanteil (falls on-top) braucht vollständigen Endpreis **vor** dem zahlungspflichtigen Button — kein Drip-Pricing (sonst abmahnbar).
- **DAC7:** Pflichtfelder ins Erzeuger-Onboarding (Steuer-/USt-ID, Anschrift, Rechtsform, ggf. HR-Nr., Geburtsdatum bei nat. Personen) + jährliche BZSt-Meldung. Kleinunternehmer-Flag (§ 19 UStG) für USt-Trennung Ware vs. Provision. Retro-Einbau ist teuer → ab Onboarding erheben.
- **ZAG/E-Geld (BaFin, höchstes Regulierungsrisiko):** Bounties/Credits **ausschließlich** als nicht-auszahlbarer, nicht-übertragbarer Rabatt auf die Plattform-**Gebühr** (nie Guthaben/Auszahlung) → vermeidet Erlaubnispflicht. AGB: Verfall/Nicht-Auszahlbarkeit regeln.
- **Verbraucherschutz:** Premium ist B2B (Erzeuger) → geringere Pflichten; falls je B2C, Widerruf + Kündigungsbutton (§ 312k BGB).

### Wirtschaftlichkeit
- **Take-Rate:** bei wenigen Orgs ~5,6–6 % (finanziert Akquise); bei Reife ~5,0–5,4 % gewichtet, weil nur das Top-Drittel Gold/Platin erreicht und diese überproportional GMV liefern (Volumen × niedrigerer % > wenig Volumen × hoher %). `floorPct` schützt die Marge.
- **Premium = Retention/Bindung, nicht Umsatzmaximierung:** reine Provision liefert in jeder 10/300/3000-Projektion mehr Umsatz als der Premium-Mix → Premium nur über Break-even tragbar.
- **Annahmenbasiert:** Ticket-Verteilung/Tx-Frequenz/GMV-Streuung sind **nicht** datenbelegt (Annahme 18 € Ticket, 60 Tx/Mo) → 4–8 Wochen Pilotdaten erheben, dann Rate-Card kalibrieren.

### Was im Code geändert werden muss
1. `create-checkout/index.ts`: SB-Pfade auf Connect Destination Charge umstellen (`transfer_data.destination` + `application_fee_amount`).
2. `app/src/lib/fees.ts` neu: `effective_seller_pct`/`buyer_fee`/`floorPct`/Mindestgebühr — Single Source of Truth, serverseitig gelesen.
3. Reputations-Trigger fee-wirksam erweitern (Platin + GMV/Tenure/Bounty/Quote).
4. Anti-Gaming (verified-only, Velocity-/Ausreißer-Check, Selbstkauf-Fingerprint, Tier-Demotion bei Refund/Dispute).
5. Migration `0005_connect.sql` + `fee_ledger` (RLS org-gebunden).
6. `orgs`: `stripe_connect_id`, `premium_active`, `premium_until`, `effective_fee_bps`, `tier`.

### Top-Risiken
- **Compliance-Blocker:** ohne Connect = faktischer Eigenverkauf (USt-/Haftungs-/MoR-Risiko) — Connect vor jedem Live-Geld-Gang.
- **Stripe-Kleinbetrags-Falle** am SB-Stand: ohne 0,25 €-Floor + `floorPct` verliert die Plattform genau am USP Geld.
- **Premium-Kannibalisierung** / **Over-Discounting bei Reife** → strenge Platin-Kriterien, `floorPct`, jährliches Re-Qualifizieren.
- **Dispute-Haftung:** bei Destination Charges trägt die Plattform Chargebacks; unbemannte SB-Stände (kein Lieferbeleg) → Reserve-/Rolling-Payout-Strategie.
- **Anti-Gaming:** geld-gekoppelte Tier-Sprünge laden zu Selbstkauf/Kollusion ein.

---

## Folgeschritte (Owner-Freigabe-pflichtig, Reihenfolge)

1. **[FREIGABE]** Finale Sätze: Standard **5 % Verkäufer / 1 % Käufer** (statt 3/3). Alternativen: 6/0 (käuferfrei) oder Owner-3/3.
2. **[FREIGABE]** Käufer-Anteil-Darstellung: on-top sichtbar (PAngV-Endpreis) **oder** in den Stückpreis eingepreist.
3. **[FREIGABE]** Mindestgebühr 0,25 €/Tx + `floorPct` 1,2 % bestätigen (Margenschutz Kleinbeträge).
4. **[FREIGABE]** Premium 39 €/Mo, Verkäufer-only, Käufer-Premium gestrichen, keine echten 0/0.
5. **[FREIGABE]** Refund-/Storno-Gebühren-Policy (`refund_application_fee:false`?) + Dispute-Reserve.
6. **[FREIGABE]** Connect-Kontotyp Express + Connect-Platform-Profil/Terms (Stripe-Dashboard, Account/Kosten).
7. **[FREIGABE]** Bounties/Credits ausschließlich als nicht-auszahlbarer Gebühren-Rabatt (ZAG/BaFin).
8. **[FREIGABE]** DAC7-Pflichtfelder ins Onboarding + BZSt-Meldung + Kleinunternehmer-Flag.
9. **[FREIGABE]** Steuerberater-/anwaltliche Endprüfung (USt nur auf Provision, MoR = Hof, AGB-Nachzug Käuferprovision + Premium).
10. **Umsetzung nach Freigabe:** (1) Connect + `application_fee` bauen, (2) `app/src/lib/fees.ts` + `effective_fee_bps` serverseitig, (3) Reputations-Trigger fee-wirksam, (4) Anti-Gaming, (5) `0005_connect.sql` + `fee_ledger`. Danach `PRICING.md`/`COMMERCIAL_SOURCE_OF_TRUTH.md` nachziehen.
