// Datenschicht — eine API, zwei Quellen:
//  • Supabase (sobald VITE_SUPABASE_* gesetzt) → echte DB
//  • Seed-Daten (Fallback) → App ist sofort lauffähig, kein Backend nötig
// So bleibt die UI identisch; der Umstieg ist eine reine Konfigurationssache.

import { supabase, isSupabaseConfigured } from './supabase'
import { SEED_FARMS } from './seed'
import { distanceFromPlz, distanceFromCoords, isValidPlz } from './geo'
import { freshestHarvest } from './freshness'
import type { Availability, Farm, FarmApplicationInput, FarmFilter, Product, Reservation, ReservationInput } from './types'

const RES_KEY = 'lbc_reservations'

// Distanz pro Hof: GPS-Standort des Kunden hat Vorrang, sonst PLZ-Zentroid, sonst keine.
function withDistance(farms: Farm[], filter: FarmFilter): Farm[] {
  if (filter.origin) {
    return farms.map((f) => ({ ...f, distanceKm: distanceFromCoords(filter.origin!, f.lat, f.lng) }))
  }
  if (filter.plz && isValidPlz(filter.plz)) {
    return farms.map((f) => ({ ...f, distanceKm: distanceFromPlz(filter.plz!, f.lat, f.lng) }))
  }
  return farms.map((f) => ({ ...f, distanceKm: null }))
}

function minPrice(f: Farm): number {
  const prices = f.products.map((p) => p.price).filter((n) => Number.isFinite(n))
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY
}

function applyFilter(farms: Farm[], filter: FarmFilter): Farm[] {
  let out = farms
  if (filter.category && filter.category !== 'all') {
    out = out.filter((f) => f.categories.includes(filter.category as Farm['categories'][number]))
  }
  out = withDistance(out, filter)
  const hasDistance = out.some((f) => f.distanceKm != null)
  const sort = filter.sort ?? 'distance'
  const byName = (a: Farm, b: Farm) => a.name.localeCompare(b.name, 'de')
  if (sort === 'distance' && hasDistance) {
    out = [...out].sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || byName(a, b))
  } else if (sort === 'price') {
    out = [...out].sort((a, b) => minPrice(a) - minPrice(b) || byName(a, b))
  } else if (sort === 'rating') {
    out = [...out].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0) || byName(a, b))
  } else if (sort === 'fresh') {
    out = [...out].sort((a, b) => (freshestHarvest(b.products) ?? '').localeCompare(freshestHarvest(a.products) ?? '') || byName(a, b))
  } else {
    out = [...out].sort(byName)
  }
  return out
}

/** Höfe laden (gefiltert + sortiert). Nutzt Supabase, fällt bei Fehler auf Seed zurück. */
export async function listFarms(filter: FarmFilter = {}): Promise<Farm[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*, products(*)')
        .is('deleted_at', null)
        .limit(filter.limit ?? 60)
      if (error) throw error
      if (data) return applyFilter(data.map(mapFarm), filter)
    } catch (e) {
      console.warn('[data] Supabase-Abfrage fehlgeschlagen, nutze Seed-Daten:', e)
    }
  }
  return applyFilter(SEED_FARMS, filter)
}

/** Normalisiert den Erzeuger-Typ (lange Labels oder Kurzform) auf gewerblich/privat/verein. */
function normalizeKind(v: unknown): Farm['producerKind'] {
  const s = v ? String(v).toLowerCase() : ''
  if (!s) return undefined
  if (s.includes('privat') || s.includes('hobby')) return 'privat'
  if (s.includes('verein')) return 'verein'
  return 'gewerblich'
}

/** Mappt eine Supabase-Zeile (snake_case) auf den Farm-Typ (camelCase). */
function mapFarm(row: Record<string, unknown>): Farm {
  const products = Array.isArray(row.products) ? (row.products as Record<string, unknown>[]) : []
  return {
    id: String(row.id),
    orgId: row.org_id ? String(row.org_id) : undefined,
    name: String(row.name),
    type: row.type as Farm['type'],
    street: String(row.street ?? ''),
    plz: String(row.plz ?? ''),
    city: String(row.city ?? ''),
    lat: row.lat != null ? Number(row.lat) : NaN,
    lng: row.lng != null ? Number(row.lng) : NaN,
    story: String(row.story ?? ''),
    openingHours: String(row.opening_hours ?? ''),
    pickupWindows: (row.pickup_windows as string[] | null) ?? [],
    categories: (row.categories as Farm['categories'] | null) ?? [],
    rating: row.rating_avg != null ? Number(row.rating_avg) : undefined,
    ratingCount: row.rating_count != null ? Number(row.rating_count) : undefined,
    reputationGrade: (row.reputation_grade as Farm['reputationGrade']) ?? undefined,
    producerKind: normalizeKind(row.producer_kind),
    products: products.map((p): Product => ({
      id: String(p.id),
      name: String(p.name),
      category: p.category as Product['category'],
      unit: String(p.unit ?? ''),
      price: Number(p.price),
      availability: p.availability as Product['availability'],
      seasonal: Boolean(p.seasonal),
      harvestedAt: p.harvested_at ? String(p.harvested_at) : undefined,
    })),
  }
}

/** Einzelnen Hof laden. */
export async function getFarm(id: string): Promise<Farm | null> {
  const farms = await listFarms()
  return farms.find((f) => f.id === id) ?? null
}

/** Verfügbare Produktkategorien (für Filter). */
export function listCategories(): string[] {
  const set = new Set<string>()
  SEED_FARMS.forEach((f) => f.categories.forEach((c) => set.add(c)))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'))
}

/** Reservierung anlegen — Supabase wenn konfiguriert, sonst lokal (kein Verlust, kein toter Button). */
export async function createReservation(input: ReservationInput): Promise<Reservation> {
  const reservation: Reservation = {
    ...input,
    id: cryptoId(),
    createdAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    // Konfiguriert → KEIN stiller localStorage-Fallback: echte Fehler propagieren.
    const { error } = await supabase.from('reservations').insert({
      farm_id: input.farmId,
      org_id: input.orgId,
      product_id: input.productId,
      quantity: input.quantity,
      pickup_window: input.pickupWindow,
      name: input.name,
      contact: input.contact,
    })
    if (error) throw new Error('reservation_failed')
    return reservation
  }
  // Demo-Modus (kein Supabase): lokal sichern.
  try {
    const list = JSON.parse(localStorage.getItem(RES_KEY) || '[]') as Reservation[]
    list.push(reservation)
    localStorage.setItem(RES_KEY, JSON.stringify(list))
  } catch {
    /* localStorage nicht verfügbar — Reservierung bleibt trotzdem bestätigt */
  }
  return reservation
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'r-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Erzeuger-Selbstpflege: Verfügbarkeit eines Produkts setzen. Supabase (RLS: nur eigener Hof) oder Seed. */
export async function updateProductAvailability(
  farmId: string, productId: string, availability: Availability,
): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    // .select() → 0 betroffene Zeilen (RLS-Denial/nicht gefunden) wird als Fehler erkannt, kein Schein-Erfolg.
    const { data, error } = await supabase.from('products').update({ availability }).eq('id', productId).select('id')
    return !error && Array.isArray(data) && data.length > 0
  }
  const prod = SEED_FARMS.find((f) => f.id === farmId)?.products.find((p) => p.id === productId)
  if (prod) { prod.availability = availability; return true }
  return false
}

/** Erzeuger-Bewerbung (Onboarding-Wizard). Supabase-Insert (RLS: anon erlaubt) oder lokal. */
export async function createFarmApplication(input: FarmApplicationInput): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('farm_applications').insert({
      name: input.name, type: input.type, email: input.email, phone: input.phone ?? null,
      street: input.street, plz: input.plz, city: input.city,
      categories: input.categories, story: input.story,
      opening_hours: input.openingHours, pickup_windows: input.pickupWindows,
      producer_kind: input.producerKind ?? null,
      decl_self_produced: input.declSelfProduced ?? false,
      decl_responsibility: input.declResponsibility ?? false,
      decl_food_law: input.declFoodLaw ?? false,
    })
    return !error
  }
  try {
    const key = 'lbc_farm_applications'
    const list = JSON.parse(localStorage.getItem(key) || '[]')
    list.push({ ...input, id: cryptoId(), status: 'eingereicht', createdAt: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(list))
    return true
  } catch { return false }
}

/** Reservierungen für einen Hof (Demo: lokal gesicherte; mit Supabase: serverseitig + RLS). */
export async function listReservationsForFarm(farmId: string): Promise<Reservation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('reservations').select('*').eq('farm_id', farmId).order('created_at', { ascending: false })
      if (!error && data) {
        return data.map((r: Record<string, unknown>) => ({
          id: String(r.id), farmId: String(r.farm_id), productId: String(r.product_id),
          quantity: Number(r.quantity), pickupWindow: String(r.pickup_window),
          name: String(r.name), contact: String(r.contact), createdAt: String(r.created_at),
        }))
      }
    } catch (e) {
      console.warn('[data] Reservierungen Supabase fehlgeschlagen, nutze lokale:', e)
    }
  }
  try {
    const list = JSON.parse(localStorage.getItem('lbc_reservations') || '[]') as Reservation[]
    return list.filter((r) => r.farmId === farmId).reverse()
  } catch { return [] }
}

/** Health-Check: Modus + Supabase-Erreichbarkeit + Hof-Anzahl (für /status). */
export async function checkHealth(): Promise<{ mode: 'live' | 'demo'; supabase: 'ok' | 'error' | 'demo'; farms: number }> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { count, error } = await supabase.from('farms').select('id', { count: 'exact', head: true })
      return { mode: 'live', supabase: error ? 'error' : 'ok', farms: count ?? 0 }
    } catch { return { mode: 'live', supabase: 'error', farms: 0 } }
  }
  const f = await listFarms({})
  return { mode: 'demo', supabase: 'demo', farms: f.length }
}

/** Alle Reservierungen (Staff-Übersicht). Supabase (Staff-RLS) oder lokal. */
export async function listAllReservations(): Promise<Reservation[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('reservations').select('*').order('created_at', { ascending: false }).limit(100)
      if (!error && data) return data.map((r: Record<string, unknown>) => ({
        id: String(r.id), farmId: String(r.farm_id), productId: String(r.product_id),
        quantity: Number(r.quantity), pickupWindow: String(r.pickup_window),
        name: String(r.name), contact: String(r.contact), createdAt: String(r.created_at),
      }))
    } catch (e) { console.warn('[data] Reservierungen (alle) Supabase fehlgeschlagen, nutze lokale:', e) }
  }
  try {
    return (JSON.parse(localStorage.getItem('lbc_reservations') || '[]') as Reservation[]).reverse()
  } catch { return [] }
}

// ── Staff-Konsole: Erzeuger-Bewerbungen verwalten ─────────────
export interface FarmApplication {
  id: string; name: string; type: string; email: string; phone?: string | null
  street: string; plz: string; city: string; categories: string[]; story: string
  openingHours: string; pickupWindows: string[]; status: string; createdAt: string
}

export async function listFarmApplications(): Promise<FarmApplication[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('farm_applications').select('*').order('created_at', { ascending: false })
      if (!error && data) {
        return data.map((r: Record<string, unknown>) => ({
          id: String(r.id), name: String(r.name), type: String(r.type), email: String(r.email),
          phone: (r.phone as string | null) ?? null, street: String(r.street), plz: String(r.plz), city: String(r.city),
          categories: (r.categories as string[] | null) ?? [], story: String(r.story ?? ''),
          openingHours: String(r.opening_hours ?? ''), pickupWindows: (r.pickup_windows as string[] | null) ?? [],
          status: String(r.status ?? 'eingereicht'), createdAt: String(r.created_at),
        }))
      }
    } catch (e) { console.warn('[data] Bewerbungen Supabase fehlgeschlagen, nutze lokale:', e) }
  }
  try {
    const list = JSON.parse(localStorage.getItem('lbc_farm_applications') || '[]') as Array<Record<string, unknown>>
    return list.map((a) => ({
      id: String(a.id), name: String(a.name), type: String(a.type), email: String(a.email),
      phone: (a.phone as string | undefined) ?? null, street: String(a.street), plz: String(a.plz), city: String(a.city),
      categories: (a.categories as string[]) ?? [], story: String(a.story ?? ''),
      openingHours: String(a.openingHours ?? ''), pickupWindows: (a.pickupWindows as string[]) ?? [],
      status: String(a.status ?? 'eingereicht'), createdAt: String(a.createdAt ?? ''),
    })).reverse()
  } catch { return [] }
}

export async function setApplicationStatus(id: string, status: string, reason?: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    // .select() prüft betroffene Zeilen → RLS-Denial (kein Staff) ergibt 0 rows = false, kein Schein-Erfolg.
    const { data, error } = await supabase.from('farm_applications')
      .update({ status, decision_reason: reason ?? null, decided_at: new Date().toISOString() })
      .eq('id', id).select('id')
    return !error && Array.isArray(data) && data.length > 0
  }
  try {
    const key = 'lbc_farm_applications'
    const list = JSON.parse(localStorage.getItem(key) || '[]') as Array<Record<string, unknown>>
    localStorage.setItem(key, JSON.stringify(list.map((a) => (String(a.id) === id ? { ...a, status, decision_reason: reason ?? null } : a))))
    return true
  } catch { return false }
}
