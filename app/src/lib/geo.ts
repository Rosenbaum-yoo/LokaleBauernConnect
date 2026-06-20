// Leichte Geo-Hilfen: PLZ-Zentroide (Beispiel-Regionen) + Haversine-Distanz.
// Bewusst kompakt gehalten; in P-späteren Phasen durch echten PLZ-Datensatz/Geocoding
// (Supabase Edge Function) ersetzbar. Unbekannte PLZ → null (App zeigt dann ohne Distanz).

const PLZ_CENTROIDS: Record<string, [number, number]> = {
  // Osnabrück & Umland
  '49074': [52.2719, 8.0471], '49078': [52.2599, 8.0089], '49080': [52.2585, 8.0782],
  '49090': [52.3179, 8.0560], '49124': [52.2300, 7.8870], '49191': [52.2030, 8.2860],
  '49477': [52.2630, 8.2780],
  // Münster & Umland
  '48143': [51.9607, 7.6261], '48149': [51.9750, 7.6010], '48151': [51.9380, 7.6090],
  '48155': [51.9530, 7.6700], '48249': [51.7900, 7.3300], '48291': [51.9180, 7.8830],
  // Oldenburg & Umland
  '26121': [53.1480, 8.2146], '26123': [53.1500, 8.2300], '26135': [53.1280, 8.2470],
  '26160': [53.1790, 8.0040], '27749': [53.0380, 8.6020],
  // Bremen / weitere Anker
  '28195': [53.0793, 8.8017], '28203': [53.0730, 8.8260], '49565': [52.4860, 7.9400],
  '32049': [52.2030, 8.5840], '33602': [51.9180, 8.5760],
}

const R = 6371 // km

export function haversine(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function centroidForPlz(plz: string): [number, number] | null {
  return PLZ_CENTROIDS[plz] ?? null
}

/** Distanz (km, gerundet) von einer PLZ zu einem Punkt; null wenn PLZ unbekannt. */
export function distanceFromPlz(plz: string, lat: number, lng: number): number | null {
  const c = centroidForPlz(plz)
  if (!c) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return Math.round(haversine(c, [lat, lng]) * 10) / 10
}

export function isValidPlz(plz: string): boolean {
  return /^\d{5}$/.test(plz)
}
