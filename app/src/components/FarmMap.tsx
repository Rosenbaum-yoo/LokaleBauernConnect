import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Farm } from '../lib/types'

// Teardrop-Pin als divIcon (keine externen Marker-Bilder → kein Asset-/CSP-Problem).
function pin(grade?: Farm['reputationGrade']): L.DivIcon {
  const ring = grade === 'gold' ? '#b8935a' : grade === 'silber' ? '#9aa0a6' : '#2d4f3f'
  return L.divIcon({
    className: 'farm-pin',
    html: `<span class="farm-pin__dot" style="--ring:${ring}"></span>`,
    iconSize: [22, 30],
    iconAnchor: [11, 28],
    popupAnchor: [0, -26],
  })
}

function FitBounds({ farms }: { farms: Farm[] }) {
  const map = useMap()
  useEffect(() => {
    if (!farms.length) return
    const bounds = L.latLngBounds(farms.map((f) => [f.lat, f.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 11 })
  }, [farms, map])
  return null
}

export function FarmMap({ farms, onOpen }: { farms: Farm[]; onOpen: (f: Farm) => void }) {
  const center = useMemo<[number, number]>(() => {
    if (!farms.length) return [51.3, 9.5] // Mitte Deutschland
    return [farms[0].lat, farms[0].lng]
  }, [farms])

  return (
    <div className="farm-map">
      <MapContainer center={center} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds farms={farms} />
        {farms.map((f) => (
          <Marker key={f.id} position={[f.lat, f.lng]} icon={pin(f.reputationGrade)}>
            <Popup>
              <div className="map-pop">
                <div className="map-pop__type">{f.type}</div>
                <div className="map-pop__name">{f.name}</div>
                <div className="map-pop__meta">{f.plz} {f.city}{f.distanceKm != null ? ` · ${f.distanceKm.toLocaleString('de-DE')} km` : ''}</div>
                {f.ratingCount ? <div className="map-pop__rep">★ {f.rating?.toFixed(1)} · {f.ratingCount}</div> : null}
                <button className="lbc-btn lbc-btn--primary lbc-btn--sm" style={{ marginTop: 8, width: '100%' }} onClick={() => onOpen(f)}>Ansehen</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
