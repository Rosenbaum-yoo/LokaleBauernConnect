import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Farm, Product } from '../lib/types'
import { AvailabilityBadge } from './AvailabilityBadge'
import { createReservation } from '../lib/data'

type Status = 'idle' | 'sending' | 'ok' | 'err'

const GRADE_LABEL: Record<NonNullable<Farm['reputationGrade']>, string> = {
  neu: 'Neu dabei', bronze: 'Bronze-Hof', silber: 'Silber-Hof', gold: 'Gold-Hof',
}

export function FarmDrawer({ farm, onClose }: { farm: Farm | null; onClose: () => void }) {
  const reservable = useMemo(
    () => (farm ? farm.products.filter((p) => p.availability !== 'out') : []),
    [farm],
  )

  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [pickup, setPickup] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [msg, setMsg] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)

  // Reset whenever a new farm is opened.
  useEffect(() => {
    setProductId(reservable[0]?.id ?? '')
    setPickup(farm?.pickupWindows[0] ?? '')
    setQty(1); setName(''); setContact(''); setStatus('idle'); setMsg('')
  }, [farm, reservable])

  // Close on Escape
  useEffect(() => {
    if (!farm) return
    closeRef.current?.focus()
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [farm, onClose])

  const selected: Product | undefined = reservable.find((p) => p.id === productId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!farm) return
    if (!selected) { setStatus('err'); setMsg('Bitte ein Produkt wählen.'); return }
    if (!pickup) { setStatus('err'); setMsg('Bitte ein Abholfenster wählen.'); return }
    if (!name.trim()) { setStatus('err'); setMsg('Bitte deinen Namen angeben.'); return }
    if (!contact.trim()) { setStatus('err'); setMsg('Bitte E-Mail oder Telefon angeben.'); return }

    setStatus('sending'); setMsg('')
    try {
      await createReservation({
        farmId: farm.id, orgId: farm.orgId, productId: selected.id, quantity: qty,
        pickupWindow: pickup, name: name.trim(), contact: contact.trim(),
      })
      setStatus('ok')
      setMsg(`Reserviert: ${qty}× ${selected.name} bei ${farm.name}, Abholung „${pickup}". Der Hof bestätigt deine Reservierung.`)
    } catch {
      setStatus('err'); setMsg('Reservierung fehlgeschlagen. Bitte erneut versuchen.')
    }
  }

  return (
    <>
      <div className={`scrim ${farm ? 'open' : ''}`} onClick={onClose} aria-hidden={!farm} />
      <aside className={`drawer ${farm ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Hof-Details">
        {farm && (
          <>
            <div className="drawer__head">
              <div>
                <div className="eyebrow">{farm.type}</div>
                <h2 className="drawer__title">{farm.name}</h2>
                <div className="drawer__sub">{farm.plz} {farm.city} · {farm.street}{farm.distanceKm != null ? ` · ${farm.distanceKm.toLocaleString('de-DE')} km` : ''}</div>
                <a className="drawer__manage" href={`/hof/${farm.id}`}>Hof verwalten (Demo) →</a>
              </div>
              <button className="drawer__close" ref={closeRef} onClick={onClose} aria-label="Schließen">✕</button>
            </div>

            <div className="drawer__body">
              <p className="muted" style={{ lineHeight: 1.65, marginTop: 0 }}>{farm.story}</p>

              <div className="info-grid">
                <div className="info-tile"><div className="k">Öffnungszeiten</div><div className="v">{farm.openingHours}</div></div>
                <div className="info-tile"><div className="k">Kategorien</div><div className="v">{farm.categories.join(', ')}</div></div>
              </div>

              <Link className="lbc-btn lbc-btn--block" to={`/stand/${farm.id}`} style={{ marginTop: 14 }}>Am unbemannten Stand bezahlen →</Link>

              <div className="detail-section">
                <h4>Bewertungen</h4>
                {farm.ratingCount ? (
                  <div className="rep-row">
                    <span className="rep-badge"><span className="star" aria-hidden="true">★</span> {farm.rating?.toFixed(1)}</span>
                    <span className="muted">aus {farm.ratingCount} Bewertungen · {GRADE_LABEL[farm.reputationGrade ?? 'neu']}</span>
                  </div>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>Noch keine Bewertungen — sei die:der Erste nach der Abholung.</p>
                )}
              </div>

              <div className="detail-section">
                <h4>Verfügbarkeit</h4>
                {farm.products.map((p) => (
                  <div className="prod-row" key={p.id}>
                    <div>
                      <div className="prod-row__name">{p.name}{p.seasonal ? ' · Saison' : ''}</div>
                      <div className="prod-row__meta">{p.unit} · {p.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                    </div>
                    <div className="prod-row__right">
                      <AvailabilityBadge value={p.availability} />
                    </div>
                  </div>
                ))}
              </div>

              <form className="reserve-box" onSubmit={submit}>
                <h4 style={{ marginBottom: 14 }}>Reservieren & abholen</h4>
                {reservable.length === 0 ? (
                  <div className="reserve-msg reserve-msg--err">Aktuell ist nichts verfügbar. Schau bald wieder vorbei.</div>
                ) : (
                  <>
                    <div className="reserve-box__row">
                      <div>
                        <label className="lbc-label" htmlFor="r-prod">Produkt</label>
                        <select id="r-prod" className="lbc-select" value={productId} onChange={(e) => setProductId(e.target.value)}>
                          {reservable.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — {p.unit}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="lbc-label" htmlFor="r-qty">Menge</label>
                        <input id="r-qty" className="lbc-input" type="number" min={1} max={20} value={qty}
                          onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label className="lbc-label" htmlFor="r-pickup">Abholfenster</label>
                      <select id="r-pickup" className="lbc-select" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                        {farm.pickupWindows.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className="reserve-box__row">
                      <div>
                        <label className="lbc-label" htmlFor="r-name">Name</label>
                        <input id="r-name" className="lbc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
                      </div>
                      <div>
                        <label className="lbc-label" htmlFor="r-contact">E-Mail oder Telefon</label>
                        <input id="r-contact" className="lbc-input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="für die Bestätigung" />
                      </div>
                    </div>
                    {selected && (
                      <div className="muted" style={{ fontSize: 13, color: 'var(--on-forest-soft)', marginBottom: 12 }}>
                        Summe (Richtwert): {(selected.price * qty).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} · Zahlung direkt beim Hof.
                      </div>
                    )}
                    <button type="submit" className="lbc-btn lbc-btn--gold lbc-btn--block" disabled={status === 'sending'}>
                      {status === 'sending' ? 'Wird reserviert …' : 'Jetzt reservieren'}
                    </button>
                  </>
                )}
                {status === 'ok' && <div className="reserve-msg reserve-msg--ok" role="status">{msg}</div>}
                {status === 'err' && <div className="reserve-msg reserve-msg--err" role="alert">{msg}</div>}
              </form>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
