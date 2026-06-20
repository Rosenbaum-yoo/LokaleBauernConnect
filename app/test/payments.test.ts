import { describe, it, expect } from 'vitest'
import { startCheckout } from '../src/lib/payments'

describe('startCheckout (ohne Supabase)', () => {
  it('liefert not_configured im Demo-Modus (kein toter Button)', async () => {
    const res = await startCheckout({ mode: 'sb_payment', farmId: 'x', productId: 'p1', quantity: 1 })
    expect(res.error).toBe('not_configured')
  })
  it('auch für Abo-Modus not_configured', async () => {
    const res = await startCheckout({ mode: 'subscription', plan: 'plus', orgId: 'o1' })
    expect(res.error).toBe('not_configured')
  })
  it('auch für Korb-Modus not_configured', async () => {
    const res = await startCheckout({ mode: 'sb_basket', farmId: 'x', items: [{ productId: 'p1', quantity: 2 }] })
    expect(res.error).toBe('not_configured')
  })
})
