import { describe, it, expect } from 'vitest'
import { buildBrandedPdf } from '../src/lib/pdf'

describe('pdf.buildBrandedPdf', () => {
  it('erzeugt gültige PDF-Bytes (%PDF-Header)', async () => {
    const bytes = await buildBrandedPdf({
      eyebrow: 'Test', title: 'Beleg', subtitle: 'Untertitel',
      rows: [{ label: 'Hof', value: 'Hof Sonnenwiese' }, { label: 'Summe', value: '12,50 €' }],
      documentId: 'TST-ABCDEF', dateLabel: '20.06.2026',
    })
    expect(bytes.length).toBeGreaterThan(500)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('bricht lange Texte um, ohne zu scheitern', async () => {
    const long = 'Wort '.repeat(200)
    const bytes = await buildBrandedPdf({ title: 'Lang', intro: long, footer: long, rows: [] })
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })
})
