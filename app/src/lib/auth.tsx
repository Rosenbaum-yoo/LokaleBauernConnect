import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

// Auth-Gerüst: Supabase-Session + Rolle (aus profiles). Env-gated:
// Ohne Supabase läuft alles im Demo-Modus (kein Login, Guards offen) — kein toter Button.
interface AuthState {
  ready: boolean
  configured: boolean
  userEmail: string | null
  role: string | null
  signIn: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth außerhalb von <AuthProvider>')
  return c
}

async function loadRole(userId: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('role').eq('user_id', userId).maybeSingle()
  return (data as { role?: string } | null)?.role ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setReady(true); return }
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      const u = data.session?.user
      const r = u ? await loadRole(u.id) : null
      if (!alive) return
      setUserEmail(u?.email ?? null)
      setRole(r)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user
      const r = u ? await loadRole(u.id) : null
      if (!alive) return
      setUserEmail(u?.email ?? null)
      setRole(r)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  async function signIn(email: string): Promise<{ error?: string }> {
    if (!isSupabaseConfigured || !supabase) return { error: 'not_configured' }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    return error ? { error: error.message } : {}
  }
  async function signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut()
    setUserEmail(null); setRole(null)
  }

  return <Ctx.Provider value={{ ready, configured: isSupabaseConfigured, userEmail, role, signIn, signOut }}>{children}</Ctx.Provider>
}

/** Guard: nur Staff/Owner. Demo-Modus (ohne Supabase) lässt durch, damit die Demo nutzbar bleibt. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { ready, configured, role } = useAuth()
  if (!ready) return <div className="wrap" style={{ padding: 48 }}>Lädt …</div>
  if (!configured) return <>{children}</>
  if (role !== 'staff' && role !== 'owner') {
    return (
      <main className="wrap" style={{ padding: '48px 22px' }}>
        <div className="state">
          <h3>Kein Zugriff</h3>
          <p>Dieser Bereich ist dem Team vorbehalten. Bitte mit einem Staff-Konto anmelden.</p>
        </div>
      </main>
    )
  }
  return <>{children}</>
}
