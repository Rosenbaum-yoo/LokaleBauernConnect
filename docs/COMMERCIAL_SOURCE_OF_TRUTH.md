# COMMERCIAL_SOURCE_OF_TRUTH — LokaleBauernConnect

> **Die eine kommerzielle Wahrheit der Plattform.** Provisionssätze, Premium-Logik, Status-Rabatte, Gebühren-Untergrenzen und die Fee-Formel leben an **genau einer** maschinenlesbaren Stelle. Von dort werden Frontend, Edge Functions, DB-Seed, Stripe-`application_fee` und Doku **abgeleitet**, nie parallel gepflegt.
>
> **Quelle der Wahrheit (Code):** `app/src/lib/fees.ts` — gespiegelt durch dieses Dokument. Bei Widerspruch zwischen Doku und Code gilt der **serverseitig materialisierte** Wert (`effective_fee_bps` pro Org). Diese Datei erklärt das Modell; `fees.ts` ist die ausführbare Wahrheit.
>
> Stack-fix: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. Kein Hetzner, kein Self-Host-Docker.
>
> **Vermittler-Grundsatz (nicht verhandelbar):** LokaleBauernConnect **vermittelt**, verkauft nicht selbst, berät nicht. Der Warenwert fließt via **Stripe Connect Destination Charge** unmittelbar an den Hof; die Plattform behält ausschließlich die `application_fee` (Käufer- + Verkäufer-Anteil). Die Quittung weist stets den **Hof als Leistungserbringer** und die Plattform als Vermittler aus.
>
> **Status:** Normativ · **Single Source of Commercial Truth** · **Stand:** 2026-06-20 · Phase 1 · WAVE_09 (payment-vorbereitend). Zuständig: Claude (Commercial + payment-engineer). **Alle %-Zahlen: Empfohlen — Owner-Freigabe ausstehend** (Preise/Geld = Stop-Regel: Confirm + Reason + Audit).
>
> **Bezug:** `docs/PRICING.md` (menschenlesbare Pricing-Spezifikation) · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Mechanik) · `docs/COMPLIANCE_MODEL.md` (Vermittler, ZAG/DAC7/USt) · `docs/launch/B_rechtstexte/agb.md` (§6 Gebühr · §10 Tarife) · `app/supabase/migrations/` (geplant: `0005_connect.sql` + `fee_ledger`).

---

## 0 · Modellwechsel — was diese Datei jetzt definiert

**Kein klassisches SaaS-Abostufen-Modell mehr.** Frühere demo/basis/plus/pro-Preisstufen als Haupt-Monetarisierung sind **nicht** das kanonische Modell. Die Plattform monetarisiert über **eine zweiseitige Transaktions-Provision**, abgesenkt durch **eine optionale Premium-Mitgliedschaft** und durch **reputationsbasierte Status-Rabatte**.

Drei tragende Säulen:

1. **Zweiseitige Provision pro erfolgreicher Transaktion** — Käufer-Anteil + Verkäufer-Anteil, gesamt **6 %** (empfohlen), technisch eine `application_fee` auf der Connect-Belastung.
2. **Optionale Premium-Mitgliedschaft** (Verkäufer) — setzt den Verkäufer-Provisionsanteil rechnerisch auf 0 % (real auf den Floor), gegen feste Monatsgebühr + Wert-Bundle.
3. **Status-/Tier-Staffel** — Reputation senkt **ausschließlich** den Verkäufer-Provisionssatz (Reputation ist ein Verkäufer-Attribut), gestaffelt Neu → Bronze → Silber → Gold → Platin.

> **Warum nicht der Owner-Vorschlag „3/3"?** Gleicher Gesamtsatz (6 %), aber Käufer-Anteil von 3 % auf **1 %** gesenkt: schützt die SB-Stand-Konversion (USP „scannen → zahlen" muss reibungslos sein) und die dokumentierte Mission „Käufer zahlen nie für den Zugang", **ohne** die zweiseitige Provisions-Story aufzugeben. Hauptlast trägt der Verkäufer (5 %), der durch SB-Bezahlung Schwund und Bargeld-Handling spart.

---

## 1 · Rate-Card (Standardsatz Neu-Verkäufer, ohne Premium)

> **Empfohlen — Owner-Freigabe ausstehend.**

| Anteil | Satz | Trägt | Begründung |
|---|---|---|---|
| **Käufer-Anteil** | **1 %** | Käufer | Minimale SB-Friktion; mission-konform; konstant (premium-/tier-unabhängig). |
| **Verkäufer-Anteil** | **5 %** | Hof (aus Netto) | Hauptlast beim Profiteur des SB-Modells; tier-/premium-absenkbar. |
| **Gesamt-Take-Rate** | **6 %** | — | Wettbewerbsfähig: Marktschwärmer 18,35 %, CrowdFarming/La Ruche 20 %, Etsy ≈ 6,5 % + Payment. Verkaufsargument: „über 94 % bleiben beim Hof". |
| **Mindestgebühr / Transaktion** | **0,25 €** (aus Verkäufer-Anteil) | Hof | **Zwingend.** Unter ≈ 5,56 € Ticket deckt 6 % sonst die Stripe-Kosten (1,5 % + 0,25 €) nicht — Verlust genau am USP (SB-Kleinbeträge 3–8 €). |

**Technik:** Stripe Connect **Destination Charge** — Warenwert via `transfer_data.destination` an den Hof, Plattform behält `application_fee_amount = buyer_fee_cents + seller_fee_cents`.

---

## 2 · Premium-Mitgliedschaft „Hof-Plus" (Verkäufer)

> **Empfohlen — Owner-Freigabe ausstehend.**

| Merkmal | Wert | Begründung |
|---|---|---|
| **Preis** | **39 €/Monat** | Bewusst **über** Break-even (39 € ÷ 5 % = 780 €/Mo GMV) — Retention/Status-Produkt, kein Spar-Rechner. |
| **Effekt** | Verkäufer-Provisionssatz **0 %** (real = Floor 1,2 % bzw. 0,25 €/Tx) | Plattform subventioniert **nie** unter Stripe-Selbstkosten. Käufer-1 % bleibt. |
| **Wert-Bundle** | Priorität/Ranking im Hofladen-Finder · Saison-Alerts · mehrere SB-Stände · Einnahmen-Dashboard | Vorausbezahlter Cashflow + Status für Voll-Erwerbs-Höfe. |
| **Abo-Mechanik** | Stripe-Subscription; Webhook setzt `premium_active`/`premium_until` pro `org_id` | Wiederverwendbare Subscriptions-Mechanik. |
| **Zielgruppe** | Nur umsatzstarke Voll-Erwerbs-Höfe (> ≈ 780 €/Mo GMV); erwartete Konversion bewusst niedrig (~15–20 %). | B2B-Erzeuger → geringere Verbraucherschutz-Pflichten (AGB/Transparenz trotzdem Pflicht). |

> **Käufer-Premium gestrichen.** Break-even läge bei ≈ 1.000 €/Mo Käufer-Ausgaben → für Gelegenheitskäufer unverkaufbar, lenkt vom USP ab. **Keine echten 0/0:** Bei Verkäufer-Premium bleiben 1 % Käufer + 0,25 €-Floor erhalten.

---

## 3 · Status-/Tier-Staffel (senkt ausschließlich den Verkäufer-Satz)

> **Empfohlen — Owner-Freigabe ausstehend.** Käufer-Anteil bleibt in **allen** Stufen 1 %. Nur `verified=true` & nicht-refundiertes GMV zählt; laufende **Demotion** bei Refunds/Disputes/Rating-Abfall/Inaktivität.

| Tier | Verkäufer-% | Käufer-% | Kriterien (kumulativ) |
|---|---|---|---|
| **Neu** | 5,0 % | 1 % | Default ab Onboarding: 0–89 Tage aktiv **oder** < 2.000 € kum. nicht-refundiertes GMV. |
| **Bronze** | 4,6 % | 1 % | ≥ 2.000 € GMV · ≥ 5 verif. Bewertungen · Ø-Rating ≥ 4,0 · ≥ 30 Tage aktiv. |
| **Silber** | 4,2 % | 1 % | ≥ 10.000 € GMV · ≥ 15 verif. Bewertungen · Ø ≥ 4,3 · ≥ 90 Tage · ≥ 1 erfüllte Bounty. |
| **Gold** | 3,8 % | 1 % | ≥ 40.000 € GMV · ≥ 40 verif. Bewertungen · Ø ≥ 4,5 · ≥ 180 Tage · ≥ 3 Bounties · Erfüllungsquote ≥ 95 %. |
| **Platin** | 3,4 % | 1 % | ≥ 150.000 € GMV · ≥ 100 verif. Bewertungen · Ø ≥ 4,6 · ≥ 365 Tage · ≥ 8 Bounties · ≥ 98 % Quote · 0 offene Streitfälle/90 Tage. |

**Status-Rabatt (Prozentpunkte auf den Verkäufer-Satz):** Neu 0,0 · Bronze 0,4 · Silber 0,8 · Gold 1,2 · Platin 1,6.

---

## 4 · Gebühren-Formel + Untergrenze (die ausführbare Wahrheit)

> Spiegelt `app/src/lib/fees.ts`. `effective_fee_bps` wird **serverseitig pro Org materialisiert** (Source-of-Truth), von `create-checkout`/`application_fee` **gelesen**, **nie** im Client berechnet.

```
basis_seller_pct   = 5,0 %
status_rabatt      = { Neu 0,0 | Bronze 0,4 | Silber 0,8 | Gold 1,2 | Platin 1,6 }  (Prozentpunkte)
floorPct           = 1,2 %     // effektiver Verkäufer-Satz nie darunter
MIN_FEE_CENTS      = 25        // harte Untergrenze je Transaktion (0,25 €)

effective_seller_pct =
  max( floorPct,
       basis_seller_pct − status_rabatt − (premium_active ? basis_seller_pct : 0) )

effective_buyer_pct  = 1,0 %   // premium-/tier-unabhängig konstant (Käufer-Premium gestrichen)

seller_fee_cents = max( round(gross * effective_seller_pct / 100), MIN_FEE_CENTS )
buyer_fee_cents  = round(gross * effective_buyer_pct / 100)

application_fee_amount = buyer_fee_cents + seller_fee_cents   // → Plattform
// Rest des Warenwerts via transfer_data.destination → Hof
```

> **Premium ∩ Floor:** Premium setzt den Verkäufer-Term rechnerisch auf 0 %, wird aber durch `floorPct = 1,2 %` bzw. die 0,25 €-Mindestgebühr abgefangen → reale Premium-Verkäufergebühr = **Floor**, nicht 0. **Anti-Gaming:** nur `verified=true` (serverseitig nach echter bezahlter Reservierung), nicht-refundiertes GMV, Velocity-/Ausreißer-Check, Selbstkauf-Fingerprint, Demotion bei Refund/Dispute.

---

## 5 · Wo die Wahrheit lebt — Origin-Hierarchie

```
1. effective_fee_bps  (serverseitig pro Org materialisiert)        ── der real angewandte Satz
2. app/src/lib/fees.ts (Formel, Basis-Sätze, Tier-Rabatte, Floor) ── KANON (Code)
3. fee_ledger          (Audit pro Tx: gross, buyer_fee, seller_fee, tier, premium) ── DB-Spiegel/Beleg
4. Stripe price-ID     (Premium-Abo-Betrag, der real abgebucht wird) ── Geld (Premium)
5. dieses Dokument + docs/PRICING.md                               ── Erklärung, nie Entscheidung
```

| Schicht | Liest aus | Tippt NIE |
|---|---|---|
| `create-checkout` / `application_fee` | `effective_fee_bps` (Org) + `fees.ts` | keinen %-Satz inline, keinen Client-Betrag als Wahrheit |
| Reputations-Trigger (Tier-Auf-/Abstufung) | `reviews.verified`, GMV, Tenure, Bounties, Quote → schreibt `effective_fee_bps` | keinen Tier-Sprung aus Client-Signal |
| React Pricing-/Dashboard-UI | Bootstrap (`tier`, `premium_active`, `effective_seller_pct`) | keinen Satz, keinen Floor, keine Mindestgebühr |
| Premium-Webhook | `parse*Strict` → setzt `premium_active`/`premium_until` | keinen rohen Metadaten-String |
| Doku | erklärt; bei Konflikt gilt `fees.ts`/`effective_fee_bps` | keine abweichende Zahl |

---

## 6 · USt / Recht — Kurzhinweise (Volltext: `docs/COMPLIANCE_MODEL.md`)

- **Vermittler / Merchant of Record:** Destination Charge hält den **Hof** als MoR und USt-Schuldner der **Ware**. Plattform schuldet **19 % USt nur auf die Provision**. Quittung: Hof = Leistungserbringer, Plattform = Vermittler.
- **ZAG/E-Geld (BaFin, höchstes Risiko):** Bounties/Credits **ausschließlich** als nicht-auszahlbarer, nicht-übertragbarer **Gebühren-Rabatt** — nie Guthaben/Auszahlung. AGB regeln Verfall/Nicht-Auszahlbarkeit.
- **PAngV/UWG:** Sichtbarer Käufer-Anteil braucht den **vollständigen Endpreis vor dem zahlungspflichtigen Button** (kein Drip-Pricing). Premium (falls je B2C) = Dauerschuldverhältnis mit Widerruf + Kündigungsbutton (§ 312k BGB).
- **DAC7 + § 14c UStG:** Erzeuger-Onboarding erhebt Steuer-/USt-ID, Anschrift, Rechtsform, ggf. HR-Nr., Geburtsdatum (nat. Pers.); jährliche BZSt-Meldung. Kleinunternehmer-Flag (§ 19 UStG) trennt USt Ware vs. Provision.
- **Dispute-Haftung:** Bei Destination Charges trägt die **Plattform** Chargebacks; unbemannte SB-Stände → erhöhtes „Ware nicht erhalten"-Risiko. `reverse_transfer` nur bei gedecktem Connect-Saldo → Reserve-/Rolling-Payout-Strategie erwägen.

---

## 7 · Offene Owner-Entscheidungen (alle Freigabe-pflichtig)

| ID | Entscheidung | Default-Empfehlung |
|---|---|---|
| OD-01 | Finale Sätze: **5 % Verkäufer / 1 % Käufer (= 6 %)** statt Owner-„3/3" | bestätigen; Alternativen: 6/0 (käuferfrei) oder Owner-3/3 |
| OD-02 | Käufer-Anteil: **on-top sichtbar** (Line-Item „Service-Gebühr", PAngV-Endpreis) **oder** eingepreist | entscheidet Checkout-UX + AGB |
| OD-03 | **Mindestgebühr 0,25 €/Tx + floorPct 1,2 %** bestätigen | zwingend (Margenschutz < 5,56 € Ticket) |
| OD-04 | Premium **39 €/Mo**, Verkäufer-only, Käufer-Premium gestrichen, **keine** echten 0/0 | bestätigen |
| OD-05 | Refund-/Storno-Gebühren-Policy (`refund_application_fee` true/false) + Dispute-Reserve | Gebühr bei Storno behalten (vermittler-üblich) |
| OD-06 | Connect-Kontotyp **Express** + Connect-Platform-Profil/Terms (Stripe-Dashboard) | Express bestätigen |
| OD-07 | Bounties/Credits **nur** nicht-auszahlbarer Gebühren-Rabatt (ZAG-sicher) | bestätigen + AGB-Verfall |
| OD-08 | DAC7-Pflichtfelder ins Onboarding + Kleinunternehmer-Flag | aufnehmen (teurer Retro-Einbau sonst) |
| OD-09 | Steuerberater/anwaltliche Endprüfung (USt 19 % nur Provision, MoR Hof, AGB-Nachzug) | vor Live |
| OD-10 | Umsetzungs-Reihenfolge: (1) Connect + `application_fee`, (2) `effective_fee_bps` serverseitig, (3) Reputations-Trigger fee-wirksam (Platin/GMV/Tenure/Bounty/Quote), (4) Anti-Gaming; Migration `0005_connect.sql` + `fee_ledger` (RLS org-gebunden) | bestätigen |

---

## 8 · Top-Risiken

- **COMPLIANCE-BLOCKER:** `app/supabase/functions/create-checkout/index.ts` erhebt **keine** `application_fee`, **kein** Connect (`transfer_data.destination`) → 100 % Geld bleibt bei der Plattform = faktischer Eigenverkauf, verletzt die Vermittler-Rolle. Vor **jedem** Live-Gang mit echtem Geld muss Destination-Charge-Connect stehen (sonst USt-/Haftungs-/MoR-Risiko für fremde Lebensmittelumsätze).
- **Stripe-Kleinbetrags-Falle am SB-Stand (Kern-USP):** bei 3–8 € Tickets frisst 0,25 € Fixkosten 3–8 % → ohne Mindestgebühr 0,25 €/Tx + floorPct Verlust genau am USP. Annahmen (18 € Ticket, 60 Tx/Mo) **nicht** datenbelegt → 4–8 Wochen Pilotdaten erheben.
- **Premium-Kannibalisierung:** jedes Premium senkt den Plattformanteil an den umsatzstärksten Höfen. In allen Projektionen liefert reine Provision **mehr** Umsatz als der Premium-Mix → nur tragbar mit Preis über Break-even (39 €) + Wert-Bundle (Retention, nicht Umsatzmaximierung).
- **Recht (PAngV/UWG + Verbraucherschutz):** sichtbare Käuferprovision braucht vollständigen Endpreis vor dem Button (sonst abmahnbar); Käufer-Premium (falls je) = Dauerschuldverhältnis mit Widerruf + Kündigungsbutton.
- **ZAG/E-Geld (BaFin):** falsch ausgestaltete Bounties/Credits (auszahlbar/übertragbar) = erlaubnispflichtiges Zahlungs-/E-Geld-Geschäft. Strikt nur nicht-auszahlbarer Gebühren-Rabatt.
- **Dispute-Haftung:** Plattform trägt Chargebacks bei Destination Charges; SB-Stände strukturell erhöhtes Risiko. `reverse_transfer` nur bei gedecktem Saldo → Reserve nötig.
- **Anti-Gaming:** Tier-Sprünge hängen an Geld → Selbstkauf/Kollusion. Gegenmittel: `verified=true`, nicht-refundiertes GMV, Velocity-/Ausreißer-Check, Selbstkauf-Fingerprint, Demotion.
- **Over-Discounting bei Reife:** erreichen mehr Orgs Gold/Platin als modelliert, sinkt die gewichtete Take-Rate. Gegenmittel: strenge Platin-Kriterien, jährliches Re-Qualifizieren, floorPct als harte Bremse, Tier an Loyalität (Monate/Rating) koppeln.
- **DAC7-Meldeverstoß + § 14c UStG:** fehlende Erzeuger-Identifizierung/BZSt-Meldung = Bußgeld; falscher USt-Ausweis bei Kleinunternehmer-Ware + Provision. Felder ab Onboarding erheben.

---

## 9 · Begründung (Konsens)

6 % Gesamt-Take-Rate bleibt — massiv günstiger als Marktschwärmer (18,35 %) / CrowdFarming-La Ruche (20 %), leicht günstiger als Etsy/eBay (≈ 10–13 % effektiv) → starkes Verkäufer-Marketing „über 94 % bleiben beim Hof". Drei Owner-Vorschlags-Korrekturen: (1) sichtbare 3 %-Käuferprovision ist der #1-Konversionskiller + kollidiert mit Mission/PAngV → auf 1 % gesenkt (höhere SB-Konversion = mehr GMV = mehr Provision), zweiseitige Story bleibt. (2) Käufer-Premium hat negativen Erwartungswert → gestrichen. (3) Echte 0/0 lassen die Plattform Stripe-Kosten subventionieren → ausgeschlossen via floorPct 1,2 % + 0,25 €/Tx. Premium wird vom Spar-Hack zum Retention-/Status-Produkt (39 €, über Break-even, Wert-Bundle). Status-Stufen senken **nur** den Verkäufer-Satz (Reputation = Verkäufer-Attribut), nutzen vorhandene RLS-Infra (`reviews.verified`, `recompute_farm_reputation`, Bounties, `credits_ledger`) und werden erst fee-wirksam, **nachdem** das Provisionsmodell via Connect existiert (heute im Code nicht vorhanden). Skaliert 10 → 3000: bei wenigen Orgs ≈ 5,6–6 % Take-Rate (finanziert Akquise), bei Reife ≈ 5,0–5,4 % gewichtet (nur das Top-Drittel erreicht Gold/Platin, liefert aber überproportional GMV; floorPct schützt die Marge). **Alle Zahlen Owner-Freigabe-pflichtig** und annahmenbasiert → erste Kohorte messen (Ticket-Verteilung, Tx-Frequenz, GMV-Streuung), dann Rate-Card kalibrieren.

---

*Letzte Aktualisierung: Phase 1 · WAVE_09 (payment-vorbereitend) · 2026-06-20*
*Quelle der Wahrheit (Code): `app/src/lib/fees.ts` (geplant) · serverseitig materialisiert als `effective_fee_bps` pro Org · Audit: `fee_ledger`.*
*Alle %-Zahlen: **Empfohlen — Owner-Freigabe ausstehend** (Preise/Geld = Stop-Regel: Confirm + Reason + Audit).*
*Querverweise: `docs/PRICING.md` · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` · `docs/COMPLIANCE_MODEL.md` · `docs/launch/B_rechtstexte/agb.md` · `app/supabase/migrations/0005_connect.sql` (geplant).*
