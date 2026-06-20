import { describe, it, expect } from 'vitest'
import { listFarms, listCategories } from '../src/lib/data'

describe('listFarms (Seed-Modus)', () => {
  it('liefert alle 9 Seed-Höfe ohne Filter', async () => {
    const f = await listFarms({})
    expect(f.length).toBe(9)
  })

  it('filtert nach Kategorie', async () => {
    const f = await listFarms({ category: 'Honig' })
    expect(f.length).toBeGreaterThan(0)
    expect(f.every((x) => x.categories.includes('Honig'))).toBe(true)
  })

  it('sortiert nach Distanz bei bekannter PLZ (nächste zuerst)', async () => {
    const f = await listFarms({ plz: '49074', sort: 'distance' })
    const dists = f.map((x) => x.distanceKm).filter((d): d is number => d != null)
    expect(dists.length).toBeGreaterThan(0)
    const sorted = [...dists].sort((a, b) => a - b)
    expect(dists).toEqual(sorted)
  })

  it('unbekannte PLZ → keine Distanz, alphabetisch', async () => {
    const f = await listFarms({ plz: '99999' })
    expect(f.every((x) => x.distanceKm === null)).toBe(true)
    const names = f.map((x) => x.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'de')))
  })
})

describe('listCategories', () => {
  it('liefert eindeutige, sortierte Kategorien', () => {
    const c = listCategories()
    expect(c.length).toBeGreaterThan(3)
    expect(new Set(c).size).toBe(c.length)
    expect(c).toEqual([...c].sort((a, b) => a.localeCompare(b, 'de')))
  })
})
