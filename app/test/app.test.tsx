import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import App from '../src/App'

describe('App (Routing)', () => {
  it('rendert Header + Finder auf /', async () => {
    const { container } = render(<App />)
    expect(container.querySelector('.app-header')).toBeTruthy()
    await waitFor(() => expect(container.querySelectorAll('.farm-card').length).toBe(9))
  })
})
