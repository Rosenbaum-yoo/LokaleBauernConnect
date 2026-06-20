// Frische-/Erntedatum-Label für Produkt-Cards. Relativ ("heute/gestern/vor X Tagen"),
// für ältere Daten absolutes Datum. Reine, testbare Funktionen (now injizierbar → kein Flaky-Test).

/** Menschliches Erntedatum-Label; null bei fehlendem/ungültigem/zukünftigem Datum. */
export function harvestLabel(iso?: string | null, now: Date = new Date()): string | null {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((startOfToday.getTime() - d.getTime()) / 86_400_000)
  if (days < 0) return null
  if (days === 0) return 'heute geerntet'
  if (days === 1) return 'gestern geerntet'
  if (days <= 13) return `vor ${days} Tagen geerntet`
  return 'geerntet am ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Neuestes Erntedatum (ISO 'YYYY-MM-DD') einer Produktliste; null wenn keines vorhanden. */
export function freshestHarvest(items: { harvestedAt?: string }[]): string | null {
  let best: string | null = null
  for (const it of items) {
    if (it.harvestedAt && (!best || it.harvestedAt > best)) best = it.harvestedAt
  }
  return best
}
