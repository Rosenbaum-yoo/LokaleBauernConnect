import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { getFarm } from '../lib/data'
import { goToCheckout } from '../lib/payments'
import { AvailabilityBadge } from '../components/AvailabilityBadge'
import type { Farm } from '../lib/types'

// Buyer-Flow am unbemannten SB-Stand: QR scannen → Korb füllen → sicher bezahlen (Stripe).
export function StandPayPage() {
  const { farmId } = useParams()
  const [params] = useSearchParams()
  const paidOk = params.get('ok') === '1'

  const [farm, setFarm] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'info' | 'err'; text: string } | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getFarm(farmId || '').then((f) => { if (alive) { setFarm(f); setLoading(false) } })
    return () => { alive = false }
  }, [farmId])

  const payable = farm ? farm.products.filter((p) => p.availability !== 'out') : []
  const items = payable.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ product: p, quantity: qty[p.id] }))
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const set = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(50, n)) }))

  async function pay() {
    if (!farm || items.length === 0) return
    setBusy(true); setMsg(null)
    const base = window.location.origin + '/stand/' + farm.id
    const err = await goToCheckout({
      mode: 'sb_basket', farmId: farm.id, contact: contact || undefined,
      items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      successUrl: base + '?ok=1', cancelUrl: base,
    })
    if (err) {
      setBusy(false)
      setMsg(err === 'not_configured'
        ? { kind: 'info', text: 'Online-Bezahlung wird zum Marktstart aktiviert. Vor Ort kannst du wie gewohnt in die Vertrauenskasse zahlen.' }
        : { kind: 'err', text: 'Zahlung konnte nicht gestartet werden. Bitte versuch es gleich erneut.' })
    }
  }

  return (
    <main className="wrap pay-page">
      <Link to="/" className="lbc-btn lbc-btn--ghost lbc-btn--sm" style={{ marginBottom: 18 }}>← Zurück zum Finder</Link>

      {loading ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : !farm ? (
        <div className="state"><h3>Stand nicht gefunden</h3><p>Bitte den QR-Code erneut scannen.</p></div>
      ) : (
        <div className="pay-card">
          <div className="eyebrow">Selbstbedienung · Sichere Bezahlung</div>
          <h1 className="pay-card__title">{farm.name}</h1>
          <div className="pay-card__loc">{farm.plz} {farm.city} · {farm.street}</div>

          {paidOk && (
            <div className="note note--ok" role="status" style={{ marginTop: 16 }}>
              Zahlung erfolgreich — vielen Dank! Eine Quittung geht (falls angegeben) an deine E-Mail.
            </div>
          )}

          <p className="muted" style={{ marginTop: 14 }}>
            Kein Personal am Stand? Kein Problem: Korb füllen, sicher bezahlen, mitnehmen — bargeldlos statt Vertrauenskasse.
          </p>

          {payable.length === 0 ? (
            <div className="state" style={{ marginTop: 18 }}><h3>Aktuell nichts verfügbar</h3><p>Schau bald wieder vorbei.</p></div>
          ) : (
            <div className="pay-form">
              <div className="basket">
                {payable.map((p) => (
                  <div className="basket-row" key={p.id}>
                    <div>
                      <div className="basket-row__name">{p.name}{p.seasonal ? ' · Saison' : ''}</div>
                      <div className="basket-row__meta">{p.unit} · {p.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} · <AvailabilityBadge value={p.availability} /></div>
                    </div>
                    <div className="stepper" aria-label={`Menge ${p.name}`}>
                      <button type="button" className="lbc-btn lbc-btn--sm" aria-label="weniger" onClick={() => set(p.id, (qty[p.id] ?? 0) - 1)}>−</button>
                      <span className="stepper__n" aria-live="polite">{qty[p.id] ?? 0}</span>
                      <button type="button" className="lbc-btn lbc-btn--sm" aria-label="mehr" onClick={() => set(p.id, (qty[p.id] ?? 0) + 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="field" style={{ marginTop: 16 }}>
                <label className="lbc-label" htmlFor="pp-mail">E-Mail für Quittung <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input id="pp-mail" className="lbc-input" type="email" inputMode="email" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="name@beispiel.de" />
              </div>

              <div className="pay-total">
                <span>Summe ({items.length} {items.length === 1 ? 'Position' : 'Positionen'})</span>
                <strong>{total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</strong>
              </div>

              <button className="lbc-btn lbc-btn--primary lbc-btn--block lbc-btn--lg" onClick={pay} disabled={busy || items.length === 0}>
                {busy ? 'Weiterleitung …' : 'Jetzt sicher bezahlen'}
              </button>
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                Bezahlung über Stripe — Karte, SEPA, PayPal, Apple/Google Pay. Zahlung geht direkt an den Hof.
              </p>
              {msg && <div className={`note note--${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'} style={{ marginTop: 14 }}>{msg.text}</div>}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
