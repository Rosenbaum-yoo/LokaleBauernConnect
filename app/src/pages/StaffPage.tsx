import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllReservations, listFarmApplications, setApplicationStatus, type FarmApplication } from '../lib/data'
import type { Reservation } from '../lib/types'

const STATUS_LABEL: Record<string, string> = {
  eingereicht: 'Eingereicht', in_pruefung: 'In Prüfung', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt',
}

export function StaffPage() {
  const [apps, setApps] = useState<FarmApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([listFarmApplications(), listAllReservations()]).then(([a, r]) => {
      setApps(a); setReservations(r); setLoading(false)
    })
  }, [])
  useEffect(load, [load])

  async function decide(app: FarmApplication, status: 'angenommen' | 'abgelehnt') {
    const verb = status === 'angenommen' ? 'annehmen' : 'ablehnen'
    if (!window.confirm(`Bewerbung von „${app.name}" (${app.plz} ${app.city}) wirklich ${verb}?`)) return
    // Kanon: mutierende Aktion mit Grund (in Prod serverseitig auditiert).
    const reason = window.prompt(`Grund für „${verb}" (wird protokolliert):`, '') ?? ''
    if (status === 'abgelehnt' && !reason.trim()) { window.alert('Ablehnung braucht einen Grund.'); return }
    setBusy(app.id)
    const ok = await setApplicationStatus(app.id, status, reason.trim() || undefined)
    setBusy(null)
    if (!ok) { window.alert('Aktion fehlgeschlagen — evtl. fehlende Berechtigung (nur Staff/Owner). Bitte erneut versuchen.'); return }
    load()
  }

  const pending = apps.filter((a) => a.status === 'eingereicht' || a.status === 'in_pruefung')
  const decided = apps.filter((a) => a.status === 'angenommen' || a.status === 'abgelehnt')

  return (
    <main className="wrap pay-page" style={{ maxWidth: 980 }}>
      <Link to="/" className="lbc-btn lbc-btn--ghost lbc-btn--sm" style={{ marginBottom: 18 }}>← Zum Finder</Link>
      <div className="eyebrow">Staff-Center · Hof-Verifizierung</div>
      <h1 className="pay-card__title" style={{ marginBottom: 6 }}>Erzeuger-Bewerbungen</h1>
      <p className="muted" style={{ margin: '0 0 22px' }}>Neue Höfe prüfen und freigeben. Demo-Ansicht — in Produktion login-/RLS-gated (nur Staff).</p>

      {loading ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : (
        <>
          <h4 className="admin-h">Offen ({pending.length})</h4>
          {pending.length === 0 ? (
            <p className="muted">Keine offenen Bewerbungen. (Über `/mitmachen` eine Demo-Bewerbung anlegen.)</p>
          ) : (
            <div className="staff-list">
              {pending.map((a) => (
                <div className="staff-app" key={a.id}>
                  <div className="staff-app__main">
                    <div className="staff-app__name">{a.name} <span className="muted">· {a.type}</span></div>
                    <div className="staff-app__meta">{a.plz} {a.city} · {a.street} · {a.email}{a.phone ? ` · ${a.phone}` : ''}</div>
                    <div className="staff-app__cats">{a.categories.join(', ')}</div>
                    {a.story && <div className="staff-app__story">„{a.story}"</div>}
                  </div>
                  <div className="staff-app__actions">
                    <button className="lbc-btn lbc-btn--primary lbc-btn--sm" disabled={busy === a.id} onClick={() => decide(a, 'angenommen')}>Annehmen</button>
                    <button className="lbc-btn lbc-btn--sm" disabled={busy === a.id} onClick={() => decide(a, 'abgelehnt')}>Ablehnen</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {decided.length > 0 && (
            <>
              <h4 className="admin-h" style={{ marginTop: 28 }}>Entschieden ({decided.length})</h4>
              <div className="staff-list">
                {decided.map((a) => (
                  <div className="staff-app staff-app--done" key={a.id}>
                    <div className="staff-app__main">
                      <div className="staff-app__name">{a.name} <span className="muted">· {a.plz} {a.city}</span></div>
                    </div>
                    <span className={`lbc-badge ${a.status === 'angenommen' ? 'av-available' : 'av-out'}`}><span className="dot" />{STATUS_LABEL[a.status] ?? a.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {reservations.length > 0 && (
            <>
              <h4 className="admin-h" style={{ marginTop: 28 }}>Reservierungen (gesamt: {reservations.length})</h4>
              <div className="staff-list">
                {reservations.slice(0, 20).map((r) => (
                  <div className="staff-app staff-app--done" key={r.id}>
                    <div className="staff-app__main">
                      <div className="staff-app__name">{r.quantity}× <span className="muted">{r.productId}</span></div>
                      <div className="staff-app__meta">{r.name} · {r.contact} · Abholung „{r.pickupWindow}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  )
}
