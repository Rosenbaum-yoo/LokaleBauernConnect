import { describe, it, expect } from 'vitest'
import { onboardingSchema } from '../src/lib/onboardingForm'

const valid = {
  producerKind: 'Gewerblicher Hof / Direktvermarkter',
  name: 'Hof Sonnenwiese', type: 'Hofladen', email: 'a@hof.de', phone: '',
  street: 'Weg 1', plz: '49074', city: 'Osnabrück',
  categories: ['Gemüse', 'Eier'], story: 'Ein schöner Familienbetrieb.',
  openingHours: 'Mo–Fr 9–18', pickupWindows: '',
  declSelfProduced: 'true', declResponsibility: 'true', declFoodLaw: 'true',
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
  it('lehnt fehlende Selbsterklärung ab', () => {
    expect(onboardingSchema.safeParse({ ...valid, declFoodLaw: '' }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...valid, declSelfProduced: '' }).success).toBe(false)
  })
  it('lehnt unbekannten Erzeuger-Typ ab (z. B. Kleingarten)', () => {
    expect(onboardingSchema.safeParse({ ...valid, producerKind: 'Kleingarten' }).success).toBe(false)
  })
  it('akzeptiert Privat- und Vereins-Erzeuger', () => {
    expect(onboardingSchema.safeParse({ ...valid, producerKind: 'Privat / Hobby-Erzeuger (eigene Ernte)' }).success).toBe(true)
    expect(onboardingSchema.safeParse({ ...valid, producerKind: 'Verein / gemeinnützig' }).success).toBe(true)
  })
})
