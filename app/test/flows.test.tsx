import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StaffPage } from '../src/pages/StaffPage'
import { OnboardingPage } from '../src/pages/OnboardingPage'

beforeEach(() => { localStorage.clear() })

describe('Staff: Bewerbung annehmen (Demo)', () => {
  it('Annehmen verschiebt in „Entschieden"', async () => {
    localStorage.setItem('lbc_farm_applications', JSON.stringify([{
      id: 'a1', name: 'Test Hof', type: 'Hofladen', email: 'a@b.de', street: 's', plz: '49074', city: 'OS',
      categories: ['Gemüse'], story: 'x', openingHours: 'Mo', pickupWindows: [], status: 'eingereicht', createdAt: '2026-06-20',
    }]))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('passt')
    const { container } = render(<MemoryRouter><StaffPage /></MemoryRouter>)
    await waitFor(() => expect(container.querySelectorAll('.staff-app').length).toBe(1))
    fireEvent.click(Array.from(container.querySelectorAll<HTMLButtonElement>('.staff-app button')).find((b) => /Annehmen/.test(b.textContent || ''))!)
    await waitFor(() => expect(container.textContent).toContain('Entschieden'))
    vi.restoreAllMocks()
  })
})

describe('Onboarding: voller Wizard → gespeichert (Demo)', () => {
  it('alle Schritte ausfüllen → Erfolgsmeldung', async () => {
    const { container } = render(<MemoryRouter><OnboardingPage /></MemoryRouter>)
    const weiter = () => fireEvent.click(Array.from(container.querySelectorAll<HTMLButtonElement>('.wizard__nav button')).find((b) => /Weiter/.test(b.textContent || ''))!)

    fireEvent.change(container.querySelector('#f-name')!, { target: { value: 'Hof Z' } })
    fireEvent.change(container.querySelector('#f-email')!, { target: { value: 'z@hof.de' } })
    weiter()
    await waitFor(() => expect(container.textContent).toContain('Standort'))
    fireEvent.change(container.querySelector('#f-street')!, { target: { value: 'Weg 1' } })
    fireEvent.change(container.querySelector('#f-plz')!, { target: { value: '49074' } })
    fireEvent.change(container.querySelector('#f-city')!, { target: { value: 'Osnabrück' } })
    weiter()
    await waitFor(() => expect(container.textContent).toContain('Sortiment'))
    fireEvent.click(container.querySelector('.chip-toggle')!)
    weiter()
    await waitFor(() => expect(container.textContent).toContain('Profil'))
    fireEvent.change(container.querySelector('#f-story')!, { target: { value: 'Eine schöne, lang genug formulierte Story.' } })
    fireEvent.change(container.querySelector('#f-openingHours')!, { target: { value: 'Mo–Fr 9–18' } })
    weiter()
    await waitFor(() => expect(container.textContent).toContain('Rechtliches'))
    container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((c) => fireEvent.click(c))
    fireEvent.click(Array.from(container.querySelectorAll<HTMLButtonElement>('.wizard__nav button')).find((b) => /Hof anmelden/.test(b.textContent || ''))!)
    await waitFor(() => expect(container.textContent).toContain('Anmeldung ist da'))
    expect(JSON.parse(localStorage.getItem('lbc_farm_applications') || '[]').length).toBe(1)
  })
})
