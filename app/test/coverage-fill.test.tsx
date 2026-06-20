import { describe, it, expect, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AuthProvider, RequireStaff } from '../src/lib/auth'
import { goToCheckout } from '../src/lib/payments'
import { getFarm, listAllReservations, createReservation } from '../src/lib/data'

beforeEach(() => { localStorage.clear() })

describe('auth (Demo-Modus)', () => {
  it('RequireStaff lässt im Demo-Modus durch', async () => {
    const { container } = render(<AuthProvider><RequireStaff><div className="ok-staff">OK</div></RequireStaff></AuthProvider>)
    await waitFor(() => expect(container.querySelector('.ok-staff')).toBeTruthy())
  })
})

describe('payments goToCheckout (Demo)', () => {
  it('liefert Fehlerstring not_configured (kein Redirect)', async () => {
    expect(await goToCheckout({ mode: 'sb_payment', farmId: 'x', productId: 'p1', quantity: 1 })).toBe('not_configured')
  })
})

describe('data Demo-Helfer', () => {
  it('getFarm liefert Hof per id', async () => {
    expect((await getFarm('hof-sonnenwiese'))?.name).toContain('Sonnenwiese')
  })
  it('listAllReservations liest lokale Reservierungen', async () => {
    await createReservation({ farmId: 'biohof-eichkamp', productId: 'p8', quantity: 1, pickupWindow: 'Heute', name: 'A', contact: 'a@b.de' })
    expect((await listAllReservations()).length).toBe(1)
  })
})
