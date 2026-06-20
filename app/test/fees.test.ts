import { describe, it, expect } from 'vitest'
import { computeFee, BASE_FEE, FLOOR_PCT, MIN_FEE_CENTS, TIERS } from '../src/lib/fees'

// Reine-Logik-Tests fuer das Provisionsmodell (SINGLE SOURCE OF TRUTH).
// Tests = Spezifikation: alle Zahlen leiten sich aus dem dokumentierten Modell ab.
describe('computeFee — Provisionsmodell', () => {
  it('Basisfall: NEU-Verkaeufer ohne Premium -> 1% Kaeufer / 5% Verkaeufer = 6% gesamt', () => {
    // 100,00 EUR Bruttowert -> Kaeufer 1,00 EUR, Verkaeufer 5,00 EUR.
    const r = computeFee({ grossCents: 10000 })
    expect(r.buyerPct).toBe(BASE_FEE.buyerPct) // 1
    expect(r.sellerPct).toBe(BASE_FEE.sellerPct) // 5
    expect(r.buyerFeeCents).toBe(100)
    expect(r.sellerFeeCents).toBe(500)
    expect(r.applicationFeeCents).toBe(600)
    expect(r.destinationCents).toBe(9500) // 10000 - 500 an den Hof
    expect(r.totalEffectivePct).toBe(6)
  })

  it('Tier senkt korrekt: Gold reduziert Verkaeufer-Satz auf 3,8% (Kaeufer unveraendert)', () => {
    const r = computeFee({ grossCents: 10000, sellerTier: 'Gold' })
    expect(r.sellerPct).toBe(3.8) // 5,0 - 1,2 PP Status-Rabatt
    expect(r.buyerPct).toBe(1) // Kaeufer-Satz tier-unabhaengig
    expect(r.sellerFeeCents).toBe(380)
    expect(r.buyerFeeCents).toBe(100)
    expect(r.applicationFeeCents).toBe(480)
  })

  it('Premium senkt korrekt: Verkaeufer-Premium setzt Verkaeufer-Term auf 0% -> faellt auf FLOOR_PCT', () => {
    // Premium zieht den vollen Basissatz ab; Untergrenze FLOOR_PCT (1,2%) greift -> keine echten 0/0.
    const r = computeFee({ grossCents: 10000, sellerPremium: true })
    expect(r.sellerPct).toBe(FLOOR_PCT) // 1,2 statt 0
    expect(r.buyerPct).toBe(1) // Kaeufer zahlt weiterhin
    expect(r.sellerFeeCents).toBe(120) // 1,2% von 100 EUR
    expect(r.buyerFeeCents).toBe(100)
  })

  it('Untergrenze EUR greift: Kleinbetrag am SB-Stand erzwingt Mindestgebuehr 0,25 EUR', () => {
    // 3,00 EUR Ticket -> 5% = 15 ct, aber MIN_FEE_CENTS (25) deckt Stripe-Fixkosten.
    const r = computeFee({ grossCents: 300 })
    expect(r.sellerFeeCents).toBe(MIN_FEE_CENTS) // 25, nicht 15
    expect(r.sellerFeeCents).toBeGreaterThanOrEqual(MIN_FEE_CENTS)
    expect(r.destinationCents).toBe(275) // 300 - 25
  })

  it('Untergrenze % greift auch bei Premium + Platin kumuliert (nie unter FLOOR_PCT)', () => {
    const r = computeFee({ grossCents: 100000, sellerTier: 'Platin', sellerPremium: true })
    expect(r.sellerPct).toBe(FLOOR_PCT) // trotz Platin-Rabatt + Premium nie < 1,2%
    expect(r.sellerFeeCents).toBe(1200) // 1,2% von 1000 EUR
  })

  it('Betragsberechnung stimmt: krummer Betrag wird kaufmaennisch gerundet', () => {
    // 17,77 EUR -> Verkaeufer 5% = 88,85 ct -> 89; Kaeufer 1% = 17,77 -> 18.
    const r = computeFee({ grossCents: 1777 })
    expect(r.sellerFeeCents).toBe(89)
    expect(r.buyerFeeCents).toBe(18)
    expect(r.applicationFeeCents).toBe(107)
    expect(r.destinationCents).toBe(1777 - 89)
  })

  it('Kaeufer-Premium ist gestrichen -> ohne Wirkung auf den Kaeufer-Satz', () => {
    const withFlag = computeFee({ grossCents: 10000, buyerPremium: true })
    const without = computeFee({ grossCents: 10000, buyerPremium: false })
    expect(withFlag.buyerFeeCents).toBe(without.buyerFeeCents)
    expect(withFlag.buyerPct).toBe(BASE_FEE.buyerPct)
  })

  it('wirft bei ungueltigem Warenwert (kein stiller Fehler — Stop-Regel)', () => {
    expect(() => computeFee({ grossCents: 0 })).toThrow()
    expect(() => computeFee({ grossCents: -100 })).toThrow()
    expect(() => computeFee({ grossCents: 12.5 })).toThrow()
  })

  it('TIERS-Tabelle ist konsistent: Verkaeufer-Satz sinkt monoton, Kaeufer-Satz konstant', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].sellerPct).toBeLessThan(TIERS[i - 1].sellerPct)
      expect(TIERS[i].buyerPct).toBe(BASE_FEE.buyerPct)
    }
    expect(TIERS[0].sellerPct).toBe(BASE_FEE.sellerPct) // 'Neu' = Basissatz
  })
})
