import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '../src/components/OnboardingWizard'

function weiterBtn(container: HTMLElement): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll<HTMLButtonElement>('.wizard__nav button')).find((x) => /Weiter/.test(x.textContent || ''))
  if (!b) throw new Error('Weiter-Button nicht gefunden')
  return b
}

describe('OnboardingWizard (Component)', () => {
  it('blockiert leeres Weiter mit Fehler, advanced bei gültiger Eingabe', async () => {
    const { container } = render(<OnboardingWizard onSubmit={vi.fn()} submitting={false} />)
    fireEvent.click(weiterBtn(container))
    await waitFor(() => expect(container.querySelector('.field__err')).toBeTruthy())

    fireEvent.change(container.querySelector('#f-name')!, { target: { value: 'Hof X' } })
    fireEvent.change(container.querySelector('#f-email')!, { target: { value: 'a@b.de' } })
    fireEvent.click(weiterBtn(container))
    await waitFor(() => expect(container.textContent).toContain('Standort'))
  })
})
