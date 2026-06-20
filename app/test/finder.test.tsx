import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { FinderPage } from '../src/pages/FinderPage'

describe('FinderPage (Component)', () => {
  it('rendert Saison-Bar, Umschalter und 9 Hof-Karten (Seed)', async () => {
    const { container } = render(<FinderPage />)
    expect(container.querySelector('.season-bar')).toBeTruthy()
    expect(container.querySelector('.view-toggle')).toBeTruthy()
    await waitFor(() => expect(container.querySelectorAll('.farm-card').length).toBe(9))
  })
})
