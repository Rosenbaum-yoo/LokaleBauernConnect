import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkHealth } from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'
import { reportError } from '../lib/observability'

export function StatusPage() {
  const [h, setH] = useState<{ mode: string; supabase: string; farms: number } | null>(null)
  useEffect(() => { checkHealth().then(setH) }, [])
  const ok = !!h && (h.supabase === 'ok' || h.supabase === 'demo')

  return (
    <main className="wrap pay-page" style={{ maxWidth: 560 }}>
      <Link to="/" className="lbc-btn lbc-btn--ghost lbc-btn--sm" style={{ marginBottom: 18 }}>← Zum Finder</Link>
      <div className="eyebrow">System</div>
      <h1 className="pay-card__title" style={{ marginBottom: 16 }}>Status</h1>
      {!h ? <div className="skeleton" style={{ height: 180 }} /> : (
        <div className="pay-card">
          <div style={{ marginBottom: 14 }}>
            <span className={`lbc-badge ${ok ? 'av-available' : 'av-out'}`} role="status"><span className="dot" aria-hidden="true" />{ok ? 'Betriebsbereit' : 'Fehler'}</span>
          </div>
          <div className="info-grid">
            <div className="info-tile"><div className="k">Modus</div><div className="v">{h.mode === 'live' ? 'Live (Supabase)' : 'Demo-Daten'}</div></div>
            <div className="info-tile"><div className="k">Datenbank</div><div className="v">{h.supabase}</div></div>
            <div className="info-tile"><div className="k">Höfe erreichbar</div><div className="v">{h.farms}</div></div>
            <div className="info-tile"><div className="k">Supabase konfiguriert</div><div className="v">{isSupabaseConfigured ? 'ja' : 'nein'}</div></div>
          </div>
          <button className="lbc-btn lbc-btn--sm" style={{ marginTop: 16 }} onClick={() => reportError('manueller Status-Test')}>Fehler-Reporting testen</button>
        </div>
      )}
    </main>
  )
}
