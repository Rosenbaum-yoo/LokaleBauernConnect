import { describe, it, expect, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StaffPage } from '../src/pages/StaffPage'

beforeEach(() => { localStorage.clear() })

describe('StaffPage (Component)', () => {
  it('zeigt Leerzustand, wenn keine Bewerbungen vorliegen', async () => {
    const { container } = render(<MemoryRouter><StaffPage /></MemoryRouter>)
    await waitFor(() => expect(container.textContent).toContain('Keine offenen Bewerbungen'))
  })

  it('listet eine vorhandene Bewerbung', async () => {
    localStorage.setItem('lbc_farm_applications', JSON.stringify([{
      id: 'a1', name: 'Test Hof', type: 'Hofladen', email: 'a@b.de', street: 'W 1', plz: '49074', city: 'Os',
      categories: ['Gemüse'], story: 'x', openingHours: 'Mo', pickupWindows: [], status: 'eingereicht', createdAt: '2026-06-20',
    }]))
    const { container } = render(<MemoryRouter><StaffPage /></MemoryRouter>)
    await waitFor(() => expect(container.querySelectorAll('.staff-app').length).toBe(1))
  })
})
