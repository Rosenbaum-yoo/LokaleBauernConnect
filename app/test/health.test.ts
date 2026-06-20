import { describe, it, expect } from 'vitest'
import { checkHealth } from '../src/lib/data'

describe('checkHealth', () => {
  it('Demo-Modus → mode demo, Supabase demo, 9 Höfe', async () => {
    const h = await checkHealth()
    expect(h.mode).toBe('demo')
    expect(h.supabase).toBe('demo')
    expect(h.farms).toBe(9)
  })
})
