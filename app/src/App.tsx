import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { FinderPage } from './pages/FinderPage'
import { StandPayPage } from './pages/StandPayPage'
import { ProducerPage } from './pages/ProducerPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { StatusPage } from './pages/StatusPage'
import { LoginPage } from './pages/LoginPage'
import { StaffPage } from './pages/StaffPage'
import { AuthProvider, useAuth, RequireStaff } from './lib/auth'
import { isSupabaseConfigured } from './lib/supabase'

function Header() {
  const { userEmail, signOut } = useAuth()
  return (
    <header className="app-header">
      <div className="wrap app-header__inner">
        <Link className="brand" to="/" aria-label="LokaleBauernConnect">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C7 6 6 11 12 22 18 11 17 6 12 2Z" /><path d="M12 8v9" /></svg>
          </span>
          <span><b>LokaleBauern</b><i>Connect</i></span>
        </Link>
        <div className="app-header__right">
          <Link to="/mitmachen" className="lbc-btn lbc-btn--sm">Hof anmelden</Link>
          {userEmail
            ? <button className="lbc-btn lbc-btn--sm lbc-btn--ghost" onClick={() => signOut()} title={userEmail}>Abmelden</button>
            : <Link to="/login" className="lbc-btn lbc-btn--sm lbc-btn--ghost">Anmelden</Link>}
          <div className="app-header__env" title={isSupabaseConfigured ? 'Verbunden mit Supabase' : 'Demo-Daten (kein Backend konfiguriert)'}>
            <span className="dot" style={{ background: isSupabaseConfigured ? 'var(--ok)' : 'var(--gold)' }} />
            {isSupabaseConfigured ? 'Live-Daten' : 'Demo-Daten'}
          </div>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="app-foot">
      <div className="wrap app-foot__inner">
        <span className="disclaimer-line">
          LokaleBauernConnect ist eine Vermittlungsplattform. Verkauf, Produktangaben und Verfügbarkeit liegen bei den Erzeugern.
          Reservierung ohne Kaufgarantie; Zahlung direkt beim Hof bzw. online. Alle Angaben ohne Gewähr.
        </span>
        <span>© {new Date().getFullYear()} LokaleBauernConnect</span>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a className="skip-link" href="#main">Zum Inhalt springen</a>
        <Header />
        <div id="main">
        <Routes>
          <Route path="/" element={<FinderPage />} />
          <Route path="/stand/:farmId" element={<StandPayPage />} />
          <Route path="/hof/:farmId" element={<ProducerPage />} />
          <Route path="/mitmachen" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/staff" element={<RequireStaff><StaffPage /></RequireStaff>} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*" element={<FinderPage />} />
        </Routes>
        </div>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}
