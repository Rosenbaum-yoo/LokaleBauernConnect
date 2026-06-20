import { describe, it, expect } from 'vitest'
import { haversine, distanceFromPlz, isValidPlz, centroidForPlz } from '../src/lib/geo'

describe('isValidPlz', () => {
  it('akzeptiert 5-stellige PLZ', () => { expect(isValidPlz('49074')).toBe(true) })
  it('lehnt zu kurze/nicht-numerische ab', () => {
    expect(isValidPlz('4907')).toBe(false)
    expect(isValidPlz('abcde')).toBe(false)
    expect(isValidPlz('490745')).toBe(false)
  })
})

describe('centroidForPlz', () => {
  it('kennt Seed-Region', () => { expect(centroidForPlz('49074')).not.toBeNull() })
  it('unbekannte PLZ → null', () => { expect(centroidForPlz('99999')).toBeNull() })
})

describe('haversine', () => {
  it('gleicher Punkt = 0', () => { expect(haversine([52, 8], [52, 8])).toBe(0) })
  it('positive Distanz zwischen zwei Punkten', () => { expect(haversine([52, 8], [53, 9])).toBeGreaterThan(0) })
})

describe('distanceFromPlz', () => {
  it('liefert kleine reale Distanz im selben Ort', () => {
    const d = distanceFromPlz('49074', 52.2731, 8.0512)
    expect(d).not.toBeNull()
    expect(d!).toBeGreaterThanOrEqual(0)
    expect(d!).toBeLessThan(20)
  })
  it('unbekannte PLZ → null', () => { expect(distanceFromPlz('99999', 52, 8)).toBeNull() })
  it('ungültige (NaN) Koordinaten → null statt Riesendistanz', () => {
    expect(distanceFromPlz('49074', NaN, 8)).toBeNull()
  })
})
