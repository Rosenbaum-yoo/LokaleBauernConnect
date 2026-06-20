import { describe, it, expect } from 'vitest'
import { monthName, seasonNow, farmHasSeasonOffer } from '../src/lib/season'
import { SEED_FARMS } from '../src/lib/seed'

describe('Saison', () => {
  it('Monatsname korrekt', () => { expect(monthName(new Date(2026, 5, 15))).toBe('Juni') })
  it('Juni hat Erdbeeren in Saison', () => { expect(seasonNow(new Date(2026, 5, 15))).toContain('Erdbeeren') })

  it('Hof mit verfügbarem Saison-Produkt = true', () => {
    const f = SEED_FARMS.find((x) => x.id === 'hof-sonnenwiese')!
    expect(farmHasSeasonOffer(f)).toBe(true)
  })
  it('Hof ohne Saison-Produkt = false', () => {
    const f = SEED_FARMS.find((x) => x.id === 'biohof-eichkamp')!
    expect(farmHasSeasonOffer(f)).toBe(false)
  })
})
