import { describe, it, expect } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../src/lib/auth'
import { LoginPage } from '../src/pages/LoginPage'
import { StatusPage } from '../src/pages/StatusPage'
import { OnboardingPage } from '../src/pages/OnboardingPage'
import { ProducerPage } from '../src/pages/ProducerPage'

describe('LoginPage', () => {
  it('zeigt Magic-Link-Form; Demo-Submit → Info-Hinweis', async () => {
    const { container } = render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>)
    expect(container.querySelector('#lg-email')).toBeTruthy()
    const btn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) => /Magischen Link/.test(b.textContent || ''))!
    fireEvent.click(btn)
    await waitFor(() => expect(container.querySelector('.note--info')).toBeTruthy())
  })
})

describe('StatusPage', () => {
  it('zeigt Demo-Status mit 9 Höfen', async () => {
    const { container } = render(<MemoryRouter><StatusPage /></MemoryRouter>)
    await waitFor(() => expect(container.textContent).toContain('Demo-Daten'))
    expect(container.textContent).toContain('9')
  })
})

describe('OnboardingPage', () => {
  it('rendert den Wizard', () => {
    const { container } = render(<MemoryRouter><OnboardingPage /></MemoryRouter>)
    expect(container.querySelector('.wizard')).toBeTruthy()
  })
})

describe('ProducerPage', () => {
  it('rendert Verwaltung mit Produkt-Sektionen', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/hof/hof-sonnenwiese']}>
        <Routes><Route path="/hof/:farmId" element={<ProducerPage />} /></Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(container.querySelector('.admin-grid')).toBeTruthy())
    expect(container.querySelectorAll('.admin-prod').length).toBeGreaterThan(0)
  })
})
