import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { configured, signIn, userEmail, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!configured) { setMsg({ kind: 'info', text: 'Login wird aktiv, sobald Supabase verbunden ist. Im Demo-Modus sind die Bereiche offen.' }); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setMsg({ kind: 'err', text: 'Bitte eine gültige E-Mail-Adresse angeben.' }); return }
    setBusy(true); setMsg(null)
    const res = await signIn(email.trim())
    setBusy(false)
    setMsg(res.error ? { kind: 'err', text: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.' } : { kind: 'ok', text: 'Magischer Link verschickt — prüf dein E-Mail-Postfach.' })
  }

  return (
    <main className="wrap pay-page" style={{ maxWidth: 480 }}>
      <Link to="/" className="lbc-btn lbc-btn--ghost lbc-btn--sm" style={{ marginBottom: 18 }}>← Zum Finder</Link>
      <div className="pay-card">
        <div className="eyebrow">Anmelden</div>
        <h1 className="pay-card__title" style={{ fontSize: 28 }}>Willkommen zurück</h1>
        {userEmail ? (
          <>
            <p className="muted" style={{ marginTop: 12 }}>Angemeldet als <strong>{userEmail}</strong>.</p>
            <button className="lbc-btn" style={{ marginTop: 14 }} onClick={() => signOut()}>Abmelden</button>
          </>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 16 }}>
            <div className="field">
              <label className="lbc-label" htmlFor="lg-email">E-Mail</label>
              <input id="lg-email" className="lbc-input" type="email" inputMode="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" />
            </div>
            <button className="lbc-btn lbc-btn--primary lbc-btn--block lbc-btn--lg" type="submit" disabled={busy}>
              {busy ? 'Sende Link …' : 'Magischen Link senden'}
            </button>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Passwortlos: Wir senden dir einen Anmeldelink per E-Mail.</p>
            {!configured && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Demo-Modus aktiv — Login wird mit Supabase scharf geschaltet.</p>}
          </form>
        )}
        {msg && <div className={`note note--${msg.kind}`} role={msg.kind === 'err' ? 'alert' : 'status'} style={{ marginTop: 14 }}>{msg.text}</div>}
      </div>
    </main>
  )
}
