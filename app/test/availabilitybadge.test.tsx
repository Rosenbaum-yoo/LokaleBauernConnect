import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AvailabilityBadge } from '../src/components/AvailabilityBadge'
import type { Availability } from '../src/lib/types'

describe('AvailabilityBadge', () => {
  it('rendert alle vier Verfügbarkeitsstufen', () => {
    const states: Availability[] = ['available', 'low', 'soon', 'out']
    for (const s of states) {
      const { container } = render(<AvailabilityBadge value={s} />)
      expect(container.querySelector('.lbc-badge')).toBeTruthy()
    }
  })
  it('nutzt optionales Label', () => {
    const { container } = render(<AvailabilityBadge value="available" label="Erdbeeren" />)
    expect(container.textContent).toContain('Erdbeeren')
  })
})
