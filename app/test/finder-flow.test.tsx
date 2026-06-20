import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FinderPage } from '../src/pages/FinderPage'

beforeEach(() => { localStorage.clear() })

describe('E2E: Finder → Reservierung (Demo)', () => {
  it('Hof öffnen → Formular ausfüllen → reservieren → Erfolg + lokal gespeichert', async () => {
    const { container } = render(<MemoryRouter><FinderPage /></MemoryRouter>)
    await waitFor(() => expect(container.querySelectorAll('.farm-card').length).toBe(9))

    fireEvent.click(container.querySelector('.farm-card')!)
    await waitFor(() => expect(container.querySelector('.drawer.open')).toBeTruthy())

    fireEvent.change(container.querySelector('#r-name')!, { target: { value: 'Käufer Test' } })
    fireEvent.change(container.querySelector('#r-contact')!, { target: { value: 'k@test.de' } })

    const submit = Array.from(container.querySelectorAll<HTMLButtonElement>('.reserve-box button'))
      .find((b) => /reservieren/i.test(b.textContent || ''))!
    fireEvent.click(submit)

    await waitFor(() => expect(container.querySelector('.reserve-msg--ok')).toBeTruthy())
    const stored = JSON.parse(localStorage.getItem('lbc_reservations') || '[]')
    expect(stored.length).toBe(1)
    expect(stored[0].name).toBe('Käufer Test')
  })
})
