// Saison-Radar: was hat in DE gerade Saison + ob ein Hof ein aktuelles Saison-Angebot führt.
import type { Farm } from './types'

const SEASON: Record<number, string[]> = {
  0: ['Feldsalat', 'Lageräpfel', 'Pastinaken', 'Grünkohl'],
  1: ['Feldsalat', 'Lauch', 'Rote Bete', 'Lagerkartoffeln'],
  2: ['Bärlauch', 'Rhabarber', 'Spinat', 'Radieschen'],
  3: ['Spargel', 'Rhabarber', 'Radieschen', 'Frühlingszwiebeln'],
  4: ['Spargel', 'Erdbeeren', 'Mairübchen', 'Kohlrabi'],
  5: ['Erdbeeren', 'Spargel', 'Kirschen', 'Zucchini', 'Frische Eier'],
  6: ['Erdbeeren', 'Johannisbeeren', 'Tomaten', 'Gurken', 'Honig'],
  7: ['Tomaten', 'Zwetschgen', 'Mais', 'Bohnen', 'Pfirsiche'],
  8: ['Äpfel', 'Birnen', 'Kürbis', 'Trauben', 'Pflaumen'],
  9: ['Kürbis', 'Äpfel', 'Maronen', 'Walnüsse', 'Rote Bete'],
  10: ['Kürbis', 'Feldsalat', 'Grünkohl', 'Lagerbirnen'],
  11: ['Grünkohl', 'Lageräpfel', 'Rosenkohl', 'Honig'],
}
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export function monthName(d = new Date()): string { return MONTHS[d.getMonth()] }
export function seasonNow(d = new Date()): string[] { return SEASON[d.getMonth()] ?? [] }

/** Hof hat ein aktuelles Saison-Angebot, das verfügbar ist. */
export function farmHasSeasonOffer(f: Farm): boolean {
  return f.products.some((p) => p.seasonal && p.availability !== 'out')
}
