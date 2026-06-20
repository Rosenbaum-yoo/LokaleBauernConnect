import type { Availability } from '../lib/types'

const MAP: Record<Availability, { label: string; cls: string }> = {
  available: { label: 'Verfügbar', cls: 'av-available' },
  low: { label: 'Wenig übrig', cls: 'av-low' },
  soon: { label: 'Bald wieder', cls: 'av-soon' },
  out: { label: 'Ausverkauft', cls: 'av-out' },
}

export function AvailabilityBadge({ value, label }: { value: Availability; label?: string }) {
  const m = MAP[value]
  return (
    <span className={`lbc-badge ${m.cls}`}>
      <span className="dot" aria-hidden="true" />
      {label ?? m.label}
    </span>
  )
}
