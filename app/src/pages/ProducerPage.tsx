import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getFarm, listReservationsForFarm, updateProductAvailability } from '../lib/data'
import { goToCheckout } from '../lib/payments'
import { AvailabilityBadge } from '../components/AvailabilityBadge'
import type { Availability, Farm, Reservation } from '../lib/types'

const AV_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'available', label: 'Verfügbar' },
  { value: 'low', label: 'Wenig übrig' },
  { value: 'soon', label: 'Bald wieder' },
  { value: 'out', label: 'Ausverkauft' },
]

const GRADE_LABEL: Record<NonNullable<Farm['reputationGrade']>, string> = {
  neu: 'Neu dabei', bronze: 'Bronze-Hof', silber: 'Silber-Hof', gold: 'Gold-Hof',
}

export function ProducerPage() {
  const { farmId } = useParams()
  const [farm, setFarm] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [aboMsg, setAboMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([getFarm(farmId || ''), listReservationsForFarm(farmId || '')]).then(([f, r]) => {
      if (!alive) return
      setFarm(f); setReservations(r); setLoading(false)
    })
    return () => { alive = false }
  }, [farmId])

  async function setAvail(productId: string, availability: Availability) {
    if (!farm) return
    setSaving(productId)
    // optimistisch
    setFarm({ ...farm, products: farm.products.map((p) => p.id === productId ? { ...p, availability } : p) })
    await updateProductAvailability(farm.id, productId, availability)
    setSaving(null)
  }

  async function startAbo(plan: string) {
    setAboMsg(null)
    const err = await goToCheckout({ mode: 'subscription', plan, orgId: farm?.orgId ?? '' })
    if (err) setAboMsg(err === 'not_configured'
      ? 'Abo-Checkout wird mit Stripe scharf geschaltet (aktuell Demo-Modus).'
      : 'Konnte nicht gestartet werden — bitte erneut versuchen.')
  }

  const standUrl = farm ? `${window.location.origin}/stand/${farm.id}` : ''

  return (
    <main className="wrap pay-page" style={{ maxWidth: 880 }}>
      <Link to="/" className="lbc-btn lbc-btn--ghost lbc-btn--sm" style={{ marginBottom: 18 }}>← Zum Finder</Link>

      {loading ? (
        <div className="skeleton" style={{ height: 360 }} />
      ) : !farm ? (
        <div className="state"><h3>Hof nicht gefunden</h3><p>Bitte Link prüfen.</p></div>
      ) : (
        <>
          <div className="eyebrow">Erzeuger-Bereich · Selbstpflege</div>
          <h1 className="pay-card__title">{farm.name}</h1>
          <div className="pay-card__loc">
            {farm.plz} {farm.city} · {farm.type}
            {farm.ratingCount ? ` · ★ ${farm.rating?.toFixed(1)} (${farm.ratingCount}) · ${GRADE_LABEL[farm.reputationGrade ?? 'neu']}` : ' · Noch keine Bewertungen'}
          </div>

          <div className="admin-grid">
            {/* Verfügbarkeit pflegen */}
            <section className="pay-card" style={{ gridColumn: '1 / -1' }}>
              <h4 className="admin-h">Verfügbarkeit pflegen</h4>
              <p className="muted" style={{ marginTop: 0 }}>Setz mit einem Tipp, was gerade da ist — Käufer sehen es sofort im Finder.</p>
              <div className="admin-prod-list">
                {farm.products.map((p) => (
                  <div className="admin-prod" key={p.id}>
                    <div>
                      <div className="admin-prod__name">{p.name}{p.seasonal ? ' · Saison' : ''}</div>
                      <div className="admin-prod__meta">{p.unit} · {p.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</div>
                    </div>
                    <div className="admin-prod__right">
                      <AvailabilityBadge value={p.availability} />
                      <select className="lbc-select" style={{ width: 'auto', minWidth: 140 }} value={p.availability}
                        disabled={saving === p.id}
                        onChange={(e) => setAvail(p.id, e.target.value as Availability)}>
                        {AV_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* QR für SB-Stand */}
            <section className="pay-card">
              <h4 className="admin-h">QR für deinen SB-Stand</h4>
              <p className="muted" style={{ marginTop: 0 }}>Ausdrucken, an den unbemannten Stand kleben. Käufer scannen → bezahlen bargeldlos.</p>
              <div className="qr-box">
                <QRCodeSVG value={standUrl} size={168} bgColor="#faf7ee" fgColor="#15291f" level="M" />
              </div>
              <div className="muted" style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 8 }}>{standUrl}</div>
              <button className="lbc-btn lbc-btn--block" style={{ marginTop: 12 }} onClick={() => window.print()}>QR drucken</button>
            </section>

            {/* Reservierungen */}
            <section className="pay-card">
              <h4 className="admin-h">Reservierungen</h4>
              {reservations.length === 0 ? (
                <p className="muted" style={{ marginTop: 0 }}>Noch keine Reservierungen.</p>
              ) : (
                <div className="admin-res-list">
                  {reservations.map((r) => {
                    const prod = farm.products.find((p) => p.id === r.productId)
                    return (
                      <div className="admin-res" key={r.id}>
                        <div className="admin-res__main">{r.quantity}× {prod?.name ?? r.productId}</div>
                        <div className="admin-res__meta">{r.name} · {r.contact} · Abholung „{r.pickupWindow}"</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Abo & Plan */}
            <section className="pay-card">
              <h4 className="admin-h">Dein Abo</h4>
              <p className="muted" style={{ marginTop: 0 }}>Mehr Reichweite & Funktionen freischalten. Monatlich kündbar.</p>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>Aktueller Plan: <strong>kein aktives Abo</strong></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {(['basis', 'plus', 'pro'] as const).map((plan) => (
                  <button key={plan} className="lbc-btn lbc-btn--sm" onClick={() => startAbo(plan)}>{plan.toUpperCase()}</button>
                ))}
              </div>
              {aboMsg && <div className="note note--info" role="status" style={{ marginTop: 12 }}>{aboMsg}</div>}
            </section>
          </div>

          <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
            Demo-Ansicht. In Produktion ist dieser Bereich durch Login + Org-Mitgliedschaft (RLS) geschützt — du siehst nur deinen eigenen Hof.
          </p>
        </>
      )}
    </main>
  )
}
