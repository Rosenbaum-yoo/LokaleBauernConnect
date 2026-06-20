import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StandPayPage } from '../src/pages/StandPayPage'

function renderStand(id = 'hof-sonnenwiese') {
  return render(
    <MemoryRouter initialEntries={[`/stand/${id}`]}>
      <Routes><Route path="/stand/:farmId" element={<StandPayPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('StandPayPage (SB-Korb)', () => {
  it('zeigt Korb-Zeilen mit Stepper; Summe steigt beim Hinzufügen', async () => {
    const { container } = renderStand()
    await waitFor(() => expect(container.querySelectorAll('.basket-row').length).toBeGreaterThan(0))
    const plus = Array.from(container.querySelectorAll<HTMLButtonElement>('.stepper button')).find((b) => b.textContent === '+')!
    fireEvent.click(plus)
    await waitFor(() => expect(/[1-9]/.test(container.querySelector('.pay-total strong')!.textContent || '')).toBe(true))
  })

  it('Bezahlen ohne Stripe → Info-Hinweis (kein toter Button)', async () => {
    const { container } = renderStand()
    await waitFor(() => expect(container.querySelectorAll('.basket-row').length).toBeGreaterThan(0))
    fireEvent.click(Array.from(container.querySelectorAll<HTMLButtonElement>('.stepper button')).find((b) => b.textContent === '+')!)
    fireEvent.click(Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) => /sicher bezahlen/i.test(b.textContent || ''))!)
    await waitFor(() => expect(container.querySelector('.note--info')).toBeTruthy())
  })
})
