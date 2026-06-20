import { describe, it, expect, vi } from 'vitest'
import { initObservability, reportError } from '../src/lib/observability'

describe('observability', () => {
  it('initObservability ist idempotent, fängt window-Fehler ab, reportError loggt', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    initObservability()
    initObservability() // zweiter Aufruf darf nichts doppeln
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }))
    reportError('manueller Test')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
