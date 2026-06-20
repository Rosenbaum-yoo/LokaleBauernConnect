import { describe, it, expect } from 'vitest'
import { harvestLabel, freshestHarvest } from '../src/lib/freshness'

const NOW = new Date('2026-06-20T10:00:00')

describe('freshness.harvestLabel', () => {
  it('heute', () => expect(harvestLabel('2026-06-20', NOW)).toBe('heute geerntet'))
  it('gestern', () => expect(harvestLabel('2026-06-19', NOW)).toBe('gestern geerntet'))
  it('vor N Tagen', () => expect(harvestLabel('2026-06-17', NOW)).toBe('vor 3 Tagen geerntet'))
  it('älter → absolutes Datum', () => expect(harvestLabel('2026-06-01', NOW)).toMatch(/geerntet am 01\.06\.2026/))
  it('null bei leer/ungültig/zukunft', () => {
    expect(harvestLabel(undefined, NOW)).toBeNull()
    expect(harvestLabel('', NOW)).toBeNull()
    expect(harvestLabel('kein-datum', NOW)).toBeNull()
    expect(harvestLabel('2026-06-25', NOW)).toBeNull()
  })
})

describe('freshness.freshestHarvest', () => {
  it('neuestes Datum gewinnt', () =>
    expect(freshestHarvest([{ harvestedAt: '2026-06-10' }, { harvestedAt: '2026-06-18' }, {}])).toBe('2026-06-18'))
  it('null wenn keines vorhanden', () =>
    expect(freshestHarvest([{}, { harvestedAt: undefined }])).toBeNull())
})
