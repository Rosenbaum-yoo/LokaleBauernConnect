import type { Farm } from '../lib/types'
import { AvailabilityBadge } from './AvailabilityBadge'
import { harvestLabel, freshestHarvest } from '../lib/freshness'

export function FarmCard({ farm, onOpen }: { farm: Farm; onOpen: (f: Farm) => void }) {
  const top = farm.products.slice(0, 3)
  const freshest = harvestLabel(freshestHarvest(farm.products))
  const open = () => onOpen(farm)
  return (
    <article
      className="farm-card"
      tabIndex={0}
      role="button"
      aria-label={`${farm.name} ansehen`}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
    >
      <div className="farm-card__top">
        <div>
          <div className="farm-card__type">{farm.type}</div>
          {farm.producerKind === 'privat' && <span className="lbc-badge lbc-badge--kind">Privat-Erzeuger</span>}
          {farm.producerKind === 'verein' && <span className="lbc-badge lbc-badge--kind">Verein</span>}
          <h3 className="farm-card__name">{farm.name}</h3>
          <div className="farm-card__loc">{farm.plz} {farm.city} · {farm.street}</div>
          {farm.ratingCount ? (
            <div className="rep-badge"><span className="star" aria-hidden="true">★</span> {farm.rating?.toFixed(1)} <span className="rep-badge__count">· {farm.ratingCount} Bewertungen</span></div>
          ) : (
            <div className="rep-badge rep-badge--new">Neu dabei</div>
          )}
        </div>
        {farm.distanceKm != null && (
          <span className="farm-card__dist">{farm.distanceKm.toLocaleString('de-DE')} km</span>
        )}
      </div>
      <div className="farm-card__body">
        <div className="farm-card__cats">
          {farm.categories.map((c) => (
            <span className="farm-card__cat" key={c}>{c}</span>
          ))}
        </div>
        {freshest && (
          <div className="farm-card__fresh"><span className="lbc-badge lbc-badge--fresh">{freshest}</span></div>
        )}
        <div className="farm-card__avail">
          {top.map((p) => (
            <AvailabilityBadge key={p.id} value={p.availability} label={`${p.name}`} />
          ))}
          {farm.products.length > top.length && (
            <span className="lbc-badge">+{farm.products.length - top.length} mehr</span>
          )}
        </div>
        <div className="farm-card__foot">
          <span className="farm-card__hours">{farm.openingHours}</span>
          <span className="lbc-btn lbc-btn--ghost lbc-btn--sm" aria-hidden="true">Ansehen →</span>
        </div>
      </div>
    </article>
  )
}
