import { describe, it, expect, beforeEach } from 'vitest'
import {
  createReservation, createFarmApplication, listFarmApplications,
  setApplicationStatus, updateProductAvailability,
} from '../src/lib/data'

beforeEach(() => { localStorage.clear() })

describe('createReservation (Demo)', () => {
  it('legt Reservierung an und persistiert lokal', async () => {
    const r = await createReservation({
      farmId: 'hof-sonnenwiese', productId: 'p1', quantity: 2,
      pickupWindow: 'Heute 14–16 Uhr', name: 'Test', contact: 't@x.de',
    })
    expect(r.id).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem('lbc_reservations') || '[]')
    expect(stored.length).toBe(1)
    expect(stored[0].productId).toBe('p1')
  })
})

const application = {
  name: 'Neuer Hof', type: 'Hofladen' as const, email: 'n@hof.de',
  street: 'Weg 1', plz: '49074', city: 'Osnabrück',
  categories: ['Gemüse' as const], story: 'Eine Story, lang genug.',
  openingHours: 'Mo–Fr 9–18', pickupWindows: [],
}

describe('Erzeuger-Bewerbung (Demo)', () => {
  it('createFarmApplication speichert; listFarmApplications liest mit Status', async () => {
    expect(await createFarmApplication(application)).toBe(true)
    const apps = await listFarmApplications()
    expect(apps.length).toBe(1)
    expect(apps[0].status).toBe('eingereicht')
  })
  it('setApplicationStatus aktualisiert Status + Grund', async () => {
    await createFarmApplication(application)
    const apps = await listFarmApplications()
    expect(await setApplicationStatus(apps[0].id, 'angenommen', 'passt')).toBe(true)
    const after = await listFarmApplications()
    expect(after[0].status).toBe('angenommen')
  })
})

describe('updateProductAvailability (Seed)', () => {
  it('true für existierendes Produkt', async () => {
    expect(await updateProductAvailability('hof-sonnenwiese', 'p1', 'low')).toBe(true)
  })
  it('false für unbekanntes Produkt', async () => {
    expect(await updateProductAvailability('hof-sonnenwiese', 'gibt-es-nicht', 'low')).toBe(false)
  })
})
