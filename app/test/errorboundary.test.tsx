import { describe, it, expect, vi } from 'vitest'
import { type ReactElement } from 'react'
import { render } from '@testing-library/react'
import { ErrorBoundary } from '../src/components/ErrorBoundary'

function Boom(): ReactElement { throw new Error('boom') }

describe('ErrorBoundary', () => {
  it('zeigt Fallback bei Render-Fehler', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(container.textContent).toContain('schiefgelaufen')
    spy.mockRestore()
  })
})
