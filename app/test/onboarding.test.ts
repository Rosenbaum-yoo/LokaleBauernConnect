import { describe, it, expect } from 'vitest'
import { onboardingSchema } from '../src/lib/onboardingForm'

const valid = {
  name: 'Hof Sonnenwiese', type: 'Hofladen', email: 'a@hof.de', phone: '',
  street: 'Weg 1', plz: '49074', city: 'Osnabrück',
  categories: ['Gemüse', 'Eier'], story: 'Ein schöner Familienbetrieb.',
  openingHours: 'Mo–Fr 9–18', pickupWindows: '',
}

describe('onboardingSchema', () => {
  it('akzeptiert gültige Eingabe', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true)
  })
  it('lehnt ungültige E-Mail ab', () => {
    expect(onboardingSchema.safeParse({ ...valid, email: 'keine-mail' }).success).toBe(false)
  })
  it('lehnt leere Kategorien ab', () => {
    expect(onboardingSchema.safeParse({ ...valid, categories: [] }).success).toBe(false)
  })
  it('lehnt unbekannte Kategorie ab (Enum)', () => {
    expect(onboardingSchema.safeParse({ ...valid, categories: ['Raketen'] }).success).toBe(false)
  })
  it('lehnt ungültige PLZ ab', () => {
    expect(onboardingSchema.safeParse({ ...valid, plz: '12' }).success).toBe(false)
  })
  it('lehnt zu kurze Story ab', () => {
    expect(onboardingSchema.safeParse({ ...valid, story: 'kurz' }).success).toBe(false)
  })
})
