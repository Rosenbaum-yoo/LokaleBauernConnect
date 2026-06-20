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

describe('listFarms — Sortierung & GPS-Standort', () => {
  const minP = (x: { products: { price: number }[] }) => Math.min(...x.products.map((p) => p.price))

  it('sortiert nach Preis (günstigste zuerst)', async () => {
    const f = await listFarms({ sort: 'price' })
    const prices = f.map(minP)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('sortiert nach Bewertung (beste zuerst, ohne Bewertung ans Ende)', async () => {
    const f = await listFarms({ sort: 'rating' })
    const ratings = f.map((x) => x.rating ?? 0)
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a))
  })

  it('Frische-Sortierung: erster Hof hat ein Erntedatum', async () => {
    const f = await listFarms({ sort: 'fresh' })
    expect(f[0].products.some((p) => p.harvestedAt)).toBe(true)
  })

  it('GPS-Standort liefert Distanz für alle Höfe und sortiert aufsteigend', async () => {
    const f = await listFarms({ origin: { lat: 52.2731, lng: 8.0512 }, sort: 'distance' })
    const dists = f.map((x) => x.distanceKm).filter((d): d is number => d != null)
    expect(dists.length).toBe(9)
    expect(dists).toEqual([...dists].sort((a, b) => a - b))
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
