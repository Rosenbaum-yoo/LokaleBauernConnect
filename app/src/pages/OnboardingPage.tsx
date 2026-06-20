import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OnboardingWizard } from '../components/OnboardingWizard'
import { createFarmApplication } from '../lib/data'
import type { OnboardingData } from '../lib/onboardingForm'
import type { FarmType, ProductCategory } from '../lib/types'

export function OnboardingPage() {
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(false)

  async function handle(d: OnboardingData) {
    setSubmitting(true); setErr(false)
    const ok = await createFarmApplication({
      name: d.name, type: d.type as FarmType, email: d.email, phone: d.phone || undefined,
      street: d.street, plz: d.plz, city: d.city,
      categories: d.categories as ProductCategory[], story: d.story, openingHours: d.openingHours,
      pickupWindows: (d.pickupWindows || '').split(',').map((s) => s.trim()).filter(Boolean),
      producerKind: d.producerKind,
      declSelfProduced: d.declSelfProduced === 'true',
      declResponsibility: d.declResponsibility === 'true',
      declFoodLaw: d.declFoodLaw === 'true',
    })
    setSubmitting(false)
    if (ok) setDone(true); else setErr(true)
  }

  return (
    <main className="wrap pay-page" style={{ maxWidth: 720 }}>
      <Link to="/" className="lbc-btn lbc-btn--ghost lbc-btn--sm" style={{ marginBottom: 18 }}>← Zum Finder</Link>

      {done ? (
        <div className="pay-card">
          <div className="eyebrow">Willkommen an Bord</div>
          <h1 className="pay-card__title">Danke — deine Anmeldung ist da.</h1>
          <p className="muted" style={{ marginTop: 12 }}>
            Wir prüfen deinen Hof und melden uns per E-Mail. Nach der Freigabe richten wir gemeinsam dein Hofprofil ein —
            danach pflegst du Verfügbarkeit & Abholfenster selbst, ganz vom Handy.
          </p>
          <Link to="/" className="lbc-btn lbc-btn--primary" style={{ marginTop: 18 }}>Zurück zum Finder</Link>
        </div>
      ) : (
        <>
          <div className="eyebrow">Für Höfe & Erzeuger</div>
          <h1 className="pay-card__title" style={{ marginBottom: 6 }}>Mach deinen Hof sichtbar.</h1>
          <p className="muted" style={{ margin: '0 0 22px' }}>
            In vier kurzen Schritten — mehr Reichweite in deiner Region, Reservierungen ohne Telefon-Pingpong und bargeldlose Bezahlung am SB-Stand.
          </p>
          <OnboardingWizard onSubmit={handle} submitting={submitting} />
          {err && <div className="note note--err" style={{ marginTop: 16 }}>Anmeldung fehlgeschlagen. Bitte versuch es gleich noch einmal.</div>}
        </>
      )}
    </main>
  )
}
