import { useEffect, useState } from 'react'
import type { Farm, FarmFilter, FarmSort, ProductCategory } from '../lib/types'
import { listCategories, listFarms } from '../lib/data'
import { isValidPlz } from '../lib/geo'
import { FarmCard } from '../components/FarmCard'
import { FarmDrawer } from '../components/FarmDrawer'
import { FarmMap } from '../components/FarmMap'
import { monthName, seasonNow, farmHasSeasonOffer } from '../lib/season'

const CATEGORIES = listCategories()

export function FinderPage() {
  const [plz, setPlz] = useState('')
  const [category, setCategory] = useState<ProductCategory | 'all'>('all')
  const [sort, setSort] = useState<FarmSort>('distance')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [seasonOnly, setSeasonOnly] = useState(false)
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [geo, setGeo] = useState<'idle' | 'locating' | 'on' | 'denied' | 'unavailable'>('idle')
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Farm | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const filter: FarmFilter = { plz, category, sort, origin: origin ?? undefined }
    listFarms(filter).then((res) => {
      if (alive) { setFarms(res); setLoading(false) }
    })
    return () => { alive = false }
  }, [plz, category, sort, origin])

  function locateMe() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) { setGeo('unavailable'); return }
    setGeo('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeo('on'); setSort('distance') },
      () => setGeo('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    )
  }

  const plzKnown = isValidPlz(plz) && farms.some((f) => f.distanceKm != null)
  const plzUnknown = isValidPlz(plz) && !plzKnown && !origin
  const shown = seasonOnly ? farms.filter(farmHasSeasonOffer) : farms
  const note = (() => {
    if (sort === 'fresh') return 'Sortiert nach Erntedatum — frischeste zuerst.'
    if (sort === 'price') return 'Sortiert nach niedrigstem Produktpreis.'
    if (sort === 'rating') return 'Sortiert nach bester Bewertung.'
    if (sort === 'name') return 'Alphabetisch sortiert (A–Z).'
    if (origin) return 'Sortiert nach Entfernung zu deinem Standort.'
    if (plzKnown) return 'Sortiert nach Entfernung zu deiner PLZ.'
    if (plzUnknown) return 'Diese PLZ kennen wir noch nicht — wir zeigen alle Höfe. Tipp: „Meinen Standort" für exakte Entfernung.'
    if (geo === 'denied') return 'Standortzugriff abgelehnt — gib deine PLZ ein, dann sortieren wir nach Nähe.'
    if (geo === 'unavailable') return 'Standort wird vom Gerät nicht unterstützt — PLZ funktioniert genauso.'
    return 'Tipp: PLZ eingeben oder „Meinen Standort" nutzen, um die nächsten Höfe zuerst zu sehen.'
  })()

  return (
    <main>
      <section className="wrap finder-hero">
        <div className="eyebrow">Hofladen-Finder</div>
        <h1>Höfe in deiner Nähe — <em>frisch verfügbar.</em></h1>
        <p>Gib deine Postleitzahl ein und entdecke Höfe, Hofläden und Erzeuger in deiner Umgebung. Sieh, was heute da ist, und reserviere zur Abholung.</p>

        <div className="searchbar">
          <div className="field field--plz">
            <label className="lbc-label" htmlFor="f-plz">Postleitzahl</label>
            <input id="f-plz" className="lbc-input" inputMode="numeric" maxLength={5}
              value={plz} onChange={(e) => setPlz(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="z. B. 49074" />
          </div>
          <div className="field field--cat">
            <label className="lbc-label" htmlFor="f-cat">Produktkategorie</label>
            <select id="f-cat" className="lbc-select" value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory | 'all')}>
              <option value="all">Alle Kategorien</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field field--sort">
            <label className="lbc-label" htmlFor="f-sort">Sortierung</label>
            <select id="f-sort" className="lbc-select" value={sort}
              onChange={(e) => setSort(e.target.value as FarmSort)}>
              <option value="distance">Nächste zuerst</option>
              <option value="fresh">Frischeste zuerst</option>
              <option value="price">Günstigste zuerst</option>
              <option value="rating">Beste Bewertung</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
          <div className="field field--geo">
            <label className="lbc-label" htmlFor="f-geo">Standort</label>
            <button id="f-geo" type="button"
              className={`lbc-btn ${geo === 'on' ? 'lbc-btn--primary' : ''}`}
              aria-pressed={geo === 'on'} disabled={geo === 'locating'} onClick={locateMe}>
              {geo === 'locating' ? 'Suche Standort …' : geo === 'on' ? 'Standort aktiv' : 'Meinen Standort'}
            </button>
          </div>
        </div>

        <div className="season-bar">
          <div>
            <span className="eyebrow">Saison-Radar</span>
            <div className="season-bar__title">Jetzt im {monthName()} Saison</div>
            <div className="season-bar__chips">
              {seasonNow().map((s) => <span className="season-chip" key={s}><span className="pulse" aria-hidden="true" />{s}</span>)}
            </div>
          </div>
          <button type="button" className={`lbc-btn ${seasonOnly ? 'lbc-btn--primary' : ''}`} aria-pressed={seasonOnly} onClick={() => setSeasonOnly((v) => !v)}>
            Nur Saison-Höfe
          </button>
        </div>
      </section>

      <section className="wrap">
        <div className="finder-meta">
          <div>
            <div className="finder-meta__count">
              {loading ? 'Lädt …' : `${shown.length} ${shown.length === 1 ? 'Hof' : 'Höfe'} gefunden${seasonOnly ? ' · Saison' : ''}`}
            </div>
            <div className="finder-meta__note">{note}</div>
          </div>
          <div className="view-toggle" role="group" aria-label="Ansicht wählen">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</button>
            <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>Karte</button>
          </div>
        </div>

        {loading ? (
          <div className="farm-grid">
            {Array.from({ length: 6 }).map((_, i) => <div className="skeleton" key={i} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="state">
            <h3>Keine Höfe für diese Auswahl</h3>
            <p>{seasonOnly ? 'Gerade kein Saison-Angebot in der Auswahl — Filter „Nur Saison-Höfe" deaktivieren.' : 'Versuch eine andere Kategorie oder entferne den Filter.'}</p>
          </div>
        ) : view === 'map' ? (
          <FarmMap farms={shown} onOpen={setSelected} />
        ) : (
          <div className="farm-grid">
            {shown.map((f) => <FarmCard key={f.id} farm={f} onOpen={setSelected} />)}
          </div>
        )}
      </section>

      <FarmDrawer farm={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
