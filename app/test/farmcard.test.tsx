import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { FarmCard } from '../src/components/FarmCard'
import type { Farm } from '../src/lib/types'

const base: Farm = {
  id: 'x', name: 'Garten Glück', type: 'Hofladen', street: 'Weg 1', plz: '49074', city: 'Osnabrück',
  lat: 52.27, lng: 8.05, story: '', openingHours: 'Mo–Fr 9–18', pickupWindows: [], categories: ['Gemüse'],
  products: [{ id: 'p', name: 'Tomaten', category: 'Gemüse', unit: 'kg', price: 3, availability: 'available' }],
}

// Container-gescopte Queries (kein document.body) → keine Kontamination zwischen Renders.
describe('FarmCard — Erzeuger-Badge', () => {
  it('zeigt Privat-Erzeuger-Badge', () => {
    const { container } = render(<FarmCard farm={{ ...base, producerKind: 'privat' }} onOpen={vi.fn()} />)
    expect(container.querySelector('.lbc-badge--kind')?.textContent).toBe('Privat-Erzeuger')
  })
  it('zeigt Verein-Badge', () => {
    const { container } = render(<FarmCard farm={{ ...base, producerKind: 'verein' }} onOpen={vi.fn()} />)
    expect(container.querySelector('.lbc-badge--kind')?.textContent).toBe('Verein')
  })
  it('gewerblich → kein Erzeuger-Badge', () => {
    const { container } = render(<FarmCard farm={{ ...base, producerKind: 'gewerblich' }} onOpen={vi.fn()} />)
    expect(container.querySelector('.lbc-badge--kind')).toBeNull()
  })
})
