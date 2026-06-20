# Track B — Interaktive Karte (Hofladen-Finder · Leaflet/MapLibre · OSM)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 4 · `PHASEN.md` → **Phase 4, Track B — Interaktive Karte** · erweitert **WAVE_04 A (Hofladen-Finder)**. Such-/Entdeck-UX, **nicht** Marktstart-blockierend (Marktstart-Pflicht = Track A **oder** WAVE_09 für den Geldfluss).
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — die Karte zeigt Höfe und führt zum Hof; sie **verkauft nicht selbst** und **berät nicht**. Disclaimer durchgängig.
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/phase4_vertical/TRACK_B_EINSATZPORTAL.md`, read-only; das BBQ-Original bleibt unangetastet). Das TempConnect-„Einsatzportal" (VMS-Disposition/Schichtkarte) wird **nicht** übernommen — es ist VMS-spezifisch. Track B wird hier von Grund auf für die **Hof-Domäne** geschrieben: Hofladen-Pins, Cluster, „in der Nähe", Liste↔Karte, Deep-Link in die Hof-Detailseite.

---

## 0. Produktziel & Leitprinzipien (nicht verhandelbar)

Käufer wollen **sehen, wo** Höfe und Hofläden in ihrer Umgebung liegen — nicht nur eine Liste lesen. Track B macht aus dem Finder eine **räumliche Entdeck-Oberfläche**: eine schnelle OpenStreetMap-Karte mit **Hof-Pins**, **Cluster** bei dichten Regionen, einem **„in der Nähe"-Modus** (Geolocation, Opt-in) und einem **Deep-Link vom Pin** direkt in die Hof-Detailseite (Drawer). Liste und Karte zeigen **dieselbe gefilterte Wahrheit** — derselbe PLZ-/Kategorie-/Sortier-Filter, nur zwei Darstellungen.

```text
Wirtschaftlich:   höhere Entdeckungs-/Reservierungs-Conversion (räumlicher Kontext senkt Friktion),
                  stärkere regionale Story (Karte = das visuelle Herz von „lokal").
Monetarisierung:  indirekt — die Karte ist Reichweiten-/Conversion-Treiber für Reservierung (Kern)
                  und SB-Bezahlung (Track A). Premium-Kartenfeatures sind Plan-gatebar (plus/pro),
                  Basis-Karte bleibt für alle sichtbar (Reichweite vor Gate).
Kostendisziplin:  OSM-Raster-Tiles sind kostenlos, aber fair-use-pflichtig → Cloudflare-Cache,
                  Lazy-Load, Cluster statt 1000 Marker. Kein bezahlter Tile-/Geocoding-Dienst
                  ohne Owner-Freigabe (Kosten/Vertrag).
Vermittler:       die Karte zeigt fremde Höfe und verlinkt sie; die Plattform verkauft/berät nicht.
```

**Leitprinzipien (jede Welle muss sie wahren):**

```text
1.  Eine Wahrheit, zwei Sichten.   Liste und Karte teilen denselben Filter-State; nie divergente Daten.
2.  Karte ist Entdeckung, kein Tor. Sie ersetzt nie die serverseitige Org-/RLS-Wahrheit; sie zeigt nur
                                    öffentlich lesbare Höfe (farms_public_read).
3.  Geolocation ist Opt-in.        Standort wird NIE automatisch abgefragt; nur auf Klick, mit Erklärung,
                                    Koordinaten verlassen den Browser nicht (clientseitige Distanz).
4.  Performance ist ein Feature.    Lazy-Load der Map-Chunks, Cluster ab Schwelle, kein Re-Render-Sturm,
                                    Tiles über Cloudflare gecacht. 10→300→3000 Höfe mitgedacht.
5.  Kein toter Pin.                 Jeder Pin öffnet einen realen Popup; „Ansehen" öffnet den realen
                                    Hof-Drawer/Deep-Link. Kein Platzhalter, kein TODO.
6.  Zero-State statt Error.         Keine Höfe / unbekannte PLZ / Geolocation verweigert / Tiles offline
                                    → klarer, ruhiger Zustand, nie ein 500 oder eine leere Bühne.
7.  Token-/Provider-neutral.        OSM-Raster heute (kostenlos, kein Key); MapLibre+Vektor als optionaler
                                    Pfad (ADR), umschaltbar ohne UI-Bruch. Kein Anbieter-Lock-in.
8.  Editorial-Disziplin.           Pins/Cluster/Popups nur aus Design-System-Tokens (theme.css),
                                    keine hardcodierten Farben, keine Deko-Emojis.
9.  Barrierearm.                    Karte ist tastatur-/screenreader-tauglich; die Liste bleibt die
                                    vollwertige, gleichberechtigte Alternative (kein map-only Inhalt).
10. Disclaimer durchgängig.         Vermittler- + Lebensmittel-Hinweis sichtbar; Attribution für OSM Pflicht.
```

---

## 1. Ist-Zustand (repo-genau geprüft)

Track B baut **additiv** auf einem **bereits funktionierenden** Karten-Fundament auf — kein Rebuild. Die Basis-Karte (Leaflet/OSM, Liste↔Karte, Pins, Popups) ist laut `docs/releases/PHASE_STATUS.md` (Zeile „Track B Karte | ✅ fertig | 2026-06-20") verifiziert. Track B vollendet die **Rest-Inkremente** (Cluster, „in der Nähe", Deep-Link, Performance/Härtung) auf Enterprise-Reife.

| Reales Artefakt | Stand | Konsequenz für Track B |
|---|---|---|
| `app/package.json` | `leaflet@^1.9.4`, `react-leaflet@^4.2.1`, `@types/leaflet`, `react-router-dom@^6.30.4` | Karten-Stack steht. **Es fehlt:** Cluster-Lib (`leaflet.markercluster` **oder** eigene Hülle), Lazy-Load der Map-Chunks. MapLibre als optionaler Pfad (ADR) ist **nicht** Pflicht. |
| `app/src/components/FarmMap.tsx` | `MapContainer`/`TileLayer` (OSM) · `divIcon`-Teardrop-Pin (kein externes Marker-Bild → kein Asset-/CSP-Problem) · `FitBounds` auf alle Höfe · Popup mit Typ/Name/PLZ/Distanz/Rating + „Ansehen"→`onOpen(f)` | Korrektes Fundament. **Es fehlt:** Cluster-Layer, „in der Nähe"-Marker (eigener Standort), Deep-Link statt nur Drawer-`onOpen`, `prefers-reduced-motion`, Re-Render-Stabilität, Recenter-Control. |
| `app/src/pages/FinderPage.tsx` | Filter-State (`plz`, `category`, `sort`) · `view: 'list'\|'map'`-Umschalter · lädt `listFarms(filter)` · Lade-/Leer-/Fehler-Zustände · `FarmDrawer` für Auswahl | Karte hängt am **gleichen** Filter-State — Wahrheit ist geteilt. **Es fehlt:** „in der Nähe"-Toggle, View-Persistenz (URL/`?view=map`), Deep-Link-Sync Pin↔Drawer↔URL. |
| `app/src/lib/geo.ts` | `haversine()`, `centroidForPlz()` (PLZ-Zentroide-Tabelle), `distanceFromPlz()`, `isValidPlz()` · unbekannte PLZ → `null` | Distanz-Mathematik steht. **Erweitern:** `distanceFromPoint(lat,lng → farm)` für **Geolocation**-Distanz (nicht nur PLZ); Bounding-Box-Vorfilter für große Datenmengen (Track-E-nah). |
| `app/src/lib/data.ts` | Dual-Source (`Supabase ↔ Seed`), `listFarms(filter)` → `applyFilter` (Kategorie-Filter, `withDistance`, Sort distance/name), `mapFarm` snake↔camel, Supabase-Fehler → Seed-Fallback | Karte konsumiert **dieselbe** `listFarms`-Wahrheit — keine Parallel-Datenschicht. **Erweitern:** optionaler Distanz-Ursprung „eigener Standort" statt PLZ (gleiche `withDistance`-Mechanik). |
| `app/src/lib/types.ts` | `Farm { id, orgId?, name, type, street, plz, city, lat, lng, …, distanceKm? }` · `FarmFilter { plz?, category?, sort? }` | Typ-Basis vorhanden. **Additiv:** `origin?: 'plz' \| 'geo'` im Filter; `Farm.distanceKm` bleibt Laufzeit-Feld (PLZ **oder** Geo). Keine Breaking Changes. |
| `app/src/components/FarmDrawer.tsx` · `FarmCard.tsx` | Drawer = Hof-Detail (Story, Produkte, Reservierung); Card = Listenkachel, beide `onOpen(farm)` | Deep-Link-Ziel des Pins. **Erweitern:** Drawer per URL adressierbar (`/finder?hof=<id>` oder `/hof/:id`) für teilbare Pin→Detail-Links. |
| `app/supabase/migrations/0001_core.sql` | `farms.lat/lng double precision not null` · `farms_plz_idx`, `farms_active_idx (deleted_at) where … is null` · `farms_public_read` (öffentlich lesbar, nur `deleted_at is null`) | Geo-Daten + öffentliche Lesepolicy stehen. **Es fehlt (Track-E-nah, hier nur vorbereitet):** Geo-Bounding-Box-Index/PostGIS; bis dahin clientseitiger BBox-Vorfilter. **Keine** Änderung an `0001` ohne neue Migration. |
| `docs/releases/PHASE_STATUS.md` | „Track B Karte ✅ fertig · Leaflet/OSM · Liste/Karte · 9 Hof-Pins + Popups · 0 Fehler · **CSP für Tiles erweitert**" | Basis verifiziert. **CSP-Anker existiert** → Cluster/Geolocation dürfen **keine** neuen externen Origins einführen (außer bewusst, ADR + Owner bei Drittanbieter-Tiles). |

> **Stop-Regel-Check (sauber):** `FarmMap`/`FinderPage`/`geo.ts`/`data.ts`/`farms`(lat/lng)/`farms_public_read` existieren real → kein „API/Service nicht gefunden". Karte liest **nur** öffentlich lesbare Höfe (keine Schreibpfade, keine Org-Scope-Frage auf der Lesekante — RLS `farms_public_read` ist die Wahrheit). **Offene Owner-Freigaben (nur falls beschritten):** (a) bezahlter Tile-/Vektor-Anbieter (MapTiler/Mapbox) statt OSM-Raster → Kosten/Vertrag; (b) eigener Geocoding-Dienst statt PLZ-Zentroid-Tabelle → Kosten/Vertrag/DSGVO. Beides ist **nicht** Teil der lokalen Wellen, sondern explizit Owner-Gate (§ Manuelle Owner-Tasks). Geolocation-Opt-in ist account-neutral (Browser-API, kein externer Dienst).

---

## 2. Zielarchitektur (End-to-End-Kette)

```text
 ┌── Käufer im Hofladen-Finder (Cloudflare Pages, public) ───────────────────────┐
 │  PLZ + Kategorie + Sortierung   ─►  listFarms(filter)  (eine Wahrheit)         │
 │  Umschalter:  [ Liste ]  [ Karte ]    + Toggle „In meiner Nähe"               │
 └────────────────────────────────────────────────────────────────────────────────┘
        │  derselbe gefilterte Farm[]   (Kategorie/PLZ-Distanz/Sort identisch)
        ▼
 ┌── data.ts · geo.ts (eine Datenschicht) ───────────────────────────────────────┐
 │  applyFilter(farms, {plz|geoOrigin, category, sort})                           │
 │   - withDistance: Ursprung = PLZ-Zentroid  ODER  eigener Standort (Geo, Opt-in)│
 │   - Sort „Nächste zuerst" nutzt distanceKm (PLZ ODER Geo, je Ursprung)        │
 │   - optionaler BBox-Vorfilter (sichtbarer Kartenausschnitt) bei großen Mengen │
 └────────────────────────────────────────────────────────────────────────────────┘
        │  Farm[] (+ optional eigener Standort-Punkt)
        ▼
 ┌── FarmMap (lazy-geladen, Leaflet/OSM) ────────────────────────────────────────┐
 │  TileLayer OSM (Attribution Pflicht, Tiles über Cloudflare gecacht)           │
 │  ClusterGroup:  bei Pin-Dichte → Cluster-Badge (Anzahl), Klick → spreaden     │
 │  Hof-Pins:      divIcon-Teardrop (Token-Farbe nach reputationGrade)           │
 │  „Du bist hier"-Marker (nur bei Geo-Opt-in, eigener Standort)                 │
 │  Popup je Pin:  Typ · Name · PLZ/Ort · Distanz · Rating · [Ansehen] [Route]   │
 └────────────────────────────────────────────────────────────────────────────────┘
        │  Klick „Ansehen"                          Klick „Route"
        ▼                                            ▼
 ┌── Deep-Link in Hof-Detail ────────────┐   ┌── Externe Navi (neutral) ──────────┐
 │  Drawer + URL  /finder?hof=<id>        │   │  geo:/maps-Link, target _blank,    │
 │  (teilbar, zurück-navigierbar,         │   │  rel noopener — kein Tracking,     │
 │   öffnet denselben FarmDrawer)         │   │  Vermittler bleibt neutral         │
 └────────────────────────────────────────┘   └──────────────────────────────────┘
```

Kette gilt erst **fertig**, wenn sie steht: gefilterter Endpoint (`listFarms`) → realer Render (Tiles + Pins) → echtes DOM (Popup/Cluster) → Lade/Leer/Fehler/Offline → gebundener Handler (`onOpen`/Deep-Link/Route) → ggf. Refresh bei Filteränderung. Kein toter Pin, kein Platzhalter.

---

## 3. View-/Interaktions-Zustände (verbindlich, Pfeiler 2/3/7)

```text
                       view-toggle / ?view                 geolocation-toggle (Opt-in)
   (kein view)  ──────────────────────►  list  ◄──────────────────────►  map
                                          │  (URL ?view=map, persistiert)        │
   distanzursprung:                       │                                      │
     plz  ──(gültige PLZ)──► distanceKm aus PLZ-Zentroid (Sort „Nächste zuerst") │
     geo  ──(Klick + Browser-Erlaubnis)──► distanceKm aus eigenem Standort       │
          ──(Erlaubnis verweigert/Timeout)──► Zero-State „Standort nicht möglich" │
                                                 + Hinweis: PLZ nutzen            │
   pin-interaktion:                                                              │
     pin-klick ──► popup offen ──► [Ansehen] ──► drawer + URL ?hof=<id>          │
                                  └► [Route] ──► externe Navi (neues Tab)        │
     cluster-klick ──► spread/zoom-to-bounds                                     │
   leerzustände:                                                                 │
     0 höfe (filter) ──► „Keine Höfe für diese Auswahl" (Liste + Karte)         │
     unbekannte plz ──► alle Höfe, ohne Distanz, Hinweis „Region folgt"          │
     tiles offline ──► Karten-Fehler-State „Karte momentan nicht ladbar →       │
                       zur Liste wechseln" (Liste bleibt voll funktionsfähig)    │
```

- **Geteilte Wahrheit:** `view` ändert **nur** die Darstellung, nie den Datensatz. Wechsel Liste↔Karte ohne Refetch (gleicher `farms`-State).
- **URL als Zustand (Deep-Link):** `?view=map` + `?hof=<id>` (+ optional `?near=1` für Geo-Modus) machen jeden Zustand **teilbar** und **zurück-navigierbar** (Pfeiler 7 „Deep-Links statt Sackgassen").
- **Geolocation streng Opt-in:** Browser-Standort wird **nie** automatisch erfragt; nur auf expliziten Klick mit Erklärtext; bei Verweigerung/Timeout sauberer Zero-State, **kein** harter Fehler.

---

## 4. Datenmodell & Datenschicht (additiv, RLS bleibt Wahrheit)

> Track B ist **überwiegend Frontend**. Keine neuen Tabellen nötig für die Karte selbst. Die einzige DB-Berührung ist **lesend** (`farms_public_read`) und **optional** ein additiver Geo-Index als Performance-Vorbereitung (Track-E-nah). **Keine** Änderung an `0001…` ohne neue Migration; Rollback-Block im Kopf.

### 4.1 Typ-/Filter-Erweiterung (`app/src/lib/types.ts`, additiv, nicht-brechend)

```ts
// additiv — bestehende Felder unverändert
export interface FarmFilter {
  plz?: string
  category?: ProductCategory | 'all'
  sort?: 'distance' | 'name'
  origin?: 'plz' | 'geo'          // NEU: Distanz-Ursprung (default 'plz')
  geo?: { lat: number; lng: number } // NEU: eigener Standort (nur bei origin:'geo', Opt-in)
}
// Farm.distanceKm bleibt Laufzeit-Feld — gefüllt aus PLZ ODER Geo, identische Mechanik.
```

### 4.2 Geo-Helfer (`app/src/lib/geo.ts`, additiv)

```ts
// vorhanden: haversine, centroidForPlz, distanceFromPlz, isValidPlz
// NEU — Distanz vom eigenen Standort (Geolocation-Opt-in):
export function distanceFromPoint(origin: [number, number], lat: number, lng: number): number {
  return Math.round(haversine(origin, [lat, lng]) * 10) / 10
}
// NEU — Bounding-Box-Vorfilter für sichtbaren Kartenausschnitt (Performance, große Mengen):
export function withinBounds(f: { lat: number; lng: number }, sw: [number, number], ne: [number, number]): boolean {
  return f.lat >= sw[0] && f.lat <= ne[0] && f.lng >= sw[1] && f.lng <= ne[1]
}
```

### 4.3 Datenschicht (`app/src/lib/data.ts`, additiv) — eine Wahrheit, zwei Ursprünge

`withDistance` erhält einen **Ursprung** (PLZ-Zentroid **oder** eigener Standort); `applyFilter` sortiert „Nächste zuerst" gegen denselben `distanceKm`. **Kein** zweiter Datenpfad, **kein** Karten-spezifisches Fetch.

```ts
// withDistance(farms, { origin:'plz', plz } | { origin:'geo', geo:[lat,lng] })
//  - 'plz': distanceFromPlz(plz, f.lat, f.lng)         (unbekannte PLZ → null)
//  - 'geo': distanceFromPoint(geo, f.lat, f.lng)        (immer definiert)
// Supabase-Pfad bleibt: select('*, products(*)').is('deleted_at', null)  → mapFarm → applyFilter
```

### 4.4 Optionaler Geo-Index (`app/supabase/migrations/0007_geo_bbox_index.sql`, additiv · nur falls Last es verlangt)

```sql
-- Rollback (Kopf): drop index if exists farms_geo_idx;
-- Zweck: schneller Bounding-Box-Vorfilter bei vielen Höfen (Track-E-nah, hier nur vorbereitet).
-- Variante A (ohne PostGIS, sofort): zusammengesetzter B-Tree für grobe BBox-Schnitte.
create index if not exists farms_geo_idx on farms (lat, lng) where deleted_at is null;
-- Variante B (mit PostGIS, ADR + Owner-Freigabe für Extension): GiST auf geography(Point).
--   create extension if not exists postgis;
--   alter table farms add column if not exists geom geography(Point,4326)
--     generated always as (st_setsrid(st_makepoint(lng,lat),4326)::geography) stored;
--   create index if not exists farms_geom_gix on farms using gist (geom) where deleted_at is null;
-- Entscheidung A vs. B als ADR; Default = A (kein Extension-/Kosten-Risiko). RLS unverändert (Read bleibt farms_public_read).
```

> **Wichtig:** Bis reale Last (Phase 5, Customer-Gates 50/100/300) es verlangt, ist die Karte **clientseitig** schnell genug (Cluster + Lazy-Load + BBox-Vorfilter). Migration `0007` ist **vorbereitet, nicht spekulativ angewandt** (§0.3 „keine Verschwendung"). Anwendung als bewusster Track-E-/Last-Schritt.

---

## 5. Performance-Budget & Cloudflare/CSP (verbindlich)

> Die Karte ist die schwerste Sicht des Finders. Performance ist hier ein **Feature**, kein Nachgedanke. Budget gilt für die getroffene Region (≤ 300 Höfe in Sicht).

| Hebel | Maßnahme | Akzeptanz-Schwelle |
|---|---|---|
| **Code-Splitting** | `FarmMap` + Leaflet/Cluster per `React.lazy`/dynamic import — fällt **nicht** ins List-Bundle | Map-Chunk lädt erst bei `view==='map'`; List-First-Paint ohne Leaflet im kritischen Pfad |
| **Tiles** | OSM-Raster über **Cloudflare-Cache** (Worker/Cache-Rule), `tileSize`/`updateWhenIdle`, `keepBuffer` moderat | sichtbare Tiles < 1 s auf 4G; OSM-Fair-Use gewahrt (kein Tile-Hammering) |
| **Marker-Dichte** | **Cluster ab Schwelle** (z. B. > ~25 Pins im Viewport) statt N Einzel-Marker; `chunkedLoading` | 300 Pins ohne Ruckeln/Long-Task > 200 ms beim Pan/Zoom |
| **Re-Render** | Pins/Icons memoisiert (`useMemo`), Icon-Factory zwischengespeichert (kein `divIcon` pro Render), Filteränderung → ein gezielter Update | kein Marker-Neuaufbau bei reinem Pan; React-DevTools: stabile Map-Subtree-Renders |
| **Distanz/Sort** | clientseitig (`haversine`), O(n) je Filter; BBox-Vorfilter vor Render bei großen Mengen | Sort/Filter < 16 ms bei 300 Höfen |
| **Reduced Motion** | `prefers-reduced-motion` → Cluster-Spiderfy/Fly-Animationen aus | respektiert; keine erzwungene Animation |
| **Mobil** | Karte voll responsiv, Touch-Gesten, Recenter-Control, keine Layout-Shifts beim View-Wechsel | LCP/CLS im grünen Bereich auf Mobil |

### CSP / Cloudflare `_headers` (additiv — bestehender Tile-Eintrag wird erweitert, nicht ersetzt)

```text
# OSM-Raster-Tiles (bereits in der CSP verankert — PHASE_STATUS: „CSP für Tiles erweitert")
img-src     'self' data: https://*.tile.openstreetmap.org;
# Leaflet lädt Tiles per <img>; KEIN connect-src nötig für Raster-OSM.
# Cluster-Lib: lokal gebündelt (npm) → KEINE neue externe Origin.
# Geolocation: Browser-API → KEINE Origin/CSP-Änderung.
# „Route"-Link: externe Navi via Anchor (kein fetch) → KEINE connect-src-Erweiterung.
# Drittanbieter-Tiles/Vektor (MapTiler/Mapbox) NUR mit ADR + Owner-Freigabe → dann
#   img-src/connect-src/worker-src um die konkrete Origin ergänzen (eigene Migration der Header).
```

> **Negativ-Garantie:** Track B führt **keine** neue externe Origin ein. Cluster ist eine **lokal gebündelte** npm-Lib; Geolocation ist eine **Browser-API**; „Route" ist ein **Anchor**. Damit bleiben CSP-Angriffsfläche und Kosten unverändert. Jeder Drittanbieter-Dienst = bewusster Owner-/ADR-Schritt.

---

## 6. Die Wellen B0 → B6 (eine Welle pro Session)

> Reihenfolge bindend: B0 → B1 → B2 → B3 → B4 → B5 → B6. Jede Welle endet mit grünem `typecheck`/`build`, sauberer Konsole (keine `TypeError`/Tile-404-Schleife) und aktualisiertem Tracker. **B0 (Basis) ist bereits abgeschlossen** (✅ `PHASE_STATUS.md`); dokumentiert hier als verifizierter Ausgangspunkt. Account-/Kosten-/Vertrags-Schritte (bezahlte Tiles/Geocoding) sind **Owner-Gates**, nicht Code-Wellen.

### WAVE B0 — Basis-Karte (✅ ABGESCHLOSSEN 2026-06-20 — verifizierter Ausgangspunkt)
**Erreicht (real, geprüft):** Leaflet + react-leaflet + OSM-Raster; `FarmMap` mit `MapContainer`/`TileLayer`/`FitBounds`; Teardrop-`divIcon`-Pins (Token-Farbe nach `reputationGrade`, kein externes Bild → kein Asset/CSP-Problem); Popup mit Typ/Name/PLZ-Ort/Distanz/Rating + „Ansehen"→`onOpen`; Liste↔Karte-Umschalter in `FinderPage`; geteilter Filter-State; CSP für OSM-Tiles erweitert; 9 Hof-Pins, 0 Konsolenfehler.
**Konsequenz:** B1–B6 sind **additiv** auf dieser Basis; **kein** Rebuild von `FarmMap`/`FinderPage`.

### WAVE B1 — Read-only Audit, Cluster-/Provider-ADR & Doku-Skelett (keine Code-Änderung)
**Ziel:** Rest-Inkremente sauber schneiden, Provider- und Cluster-Strategie festlegen.
**Aufgaben:**
1. Inventar der realen Artefakte (wie §1) — Mapping „vorhanden ↔ fehlt" (Cluster, „in der Nähe", Deep-Link, Performance/Härtung).
2. **ADR „Tile-/Map-Provider":** **OSM-Raster über Leaflet** bleibt Default (kostenlos, kein Key, bereits verdrahtet). **MapLibre + Vektor-Tiles** wird als **optionaler, austauschbarer Pfad** dokumentiert (bessere Retina-/Vektor-Optik, aber Tile-Server-/Kostenfrage → Owner-Gate). Entscheidung: **kein** Provider-Wechsel ohne messbaren Nutzen + Owner-Freigabe.
3. **ADR „Cluster-Strategie":** `leaflet.markercluster` (bewährt, lokal gebündelt) vs. leichtgewichtige Eigen-Hülle. Default = bewährte Lib **falls** Bundle-Budget passt; sonst minimaler Grid-Cluster. Begründung als ADR.
4. `docs/spezialmodule/HOFLADEN_FINDER.md`-Abschnitt „Karte" anlegen/erweitern (Status-Sektionen).
**Acceptance:** Zwei ADRs unter `.claude/memory/decisions/` (Provider + Cluster); Mapping-Tabelle steht; Doku-Skelett existiert; **keine** Code-Änderung.

### WAVE B2 — Marker-Cluster bei dichten Regionen
**Ziel:** Bei Pin-Dichte aggregieren statt zukleistern — Performance + Lesbarkeit.
**Aufgaben:**
1. Cluster-Layer (gemäß B1-ADR) in `FarmMap` einziehen: Pins ab Schwelle → Cluster-Badge mit **Anzahl** (Token-Stil, kein hardcodiertes Farb-Set); Klick → Zoom-to-bounds/Spiderfy.
2. Icon-Factory **memoisieren** (kein `divIcon` pro Render); `chunkedLoading` für große Mengen; `prefers-reduced-motion` respektieren.
3. Cluster-Badge im **Editorial-Token-Stil** (Größenstufen nach Anzahl), barrierearm (aria-Label „N Höfe in diesem Bereich").
**Acceptance:** Dichte Region zeigt Cluster statt Pin-Brei; Klick spreizt korrekt; 300 simulierte Pins ohne Ruckeln (Pan/Zoom flüssig); keine neuen externen Origins; Konsole sauber.

### WAVE B3 — „In der Nähe" (Geolocation, Opt-in) + Distanz vom Standort
**Ziel:** Höfe relativ zum **echten Standort** sortieren/zeigen — streng Opt-in.
**Aufgaben:**
1. Toggle „In meiner Nähe" in `FinderPage`: Klick → `navigator.geolocation.getCurrentPosition` (mit Erklärtext, **nie** automatisch). Erfolg → `filter.origin='geo'`, `filter.geo={lat,lng}`; `withDistance`/Sort nutzen `distanceFromPoint`.
2. „Du bist hier"-Marker in `FarmMap` (nur im Geo-Modus), Recenter-Control.
3. **Zero-States:** Erlaubnis verweigert/Timeout/`geolocation` nicht verfügbar → ruhiger Hinweis „Standort nicht möglich — gib stattdessen deine PLZ ein" (kein harter Fehler). HTTPS-Pflicht beachtet (Cloudflare Pages = HTTPS).
4. **Datenschutz:** Koordinaten verlassen den Browser **nicht** (clientseitige Distanz); keine Persistenz; Hinweis im UI. DSGVO-konform, default OFF.
**Acceptance:** Opt-in-Flow vollständig (Klick→Erlaubnis→Sortierung nach echter Distanz); Verweigerung → Zero-State, kein 500; Standort wird nicht gesendet/gespeichert; PLZ-Modus bleibt gleichwertig.

### WAVE B4 — Deep-Link Pin↔Drawer↔URL (teilbar, zurück-navigierbar)
**Ziel:** Vom Pin direkt in die Hof-Detailseite — als **teilbarer** Deep-Link, keine Sackgasse.
**Aufgaben:**
1. Popup-„Ansehen" öffnet `FarmDrawer` **und** setzt URL `/finder?hof=<id>` (react-router `useSearchParams`); Schließen entfernt den Param; Back-Button schließt den Drawer.
2. `?view=map` + `?near=1` persistieren die Sicht/den Geo-Modus → geteilter, reproduzierbarer Zustand.
3. Beim Laden mit `?hof=<id>` → Drawer für diesen Hof direkt öffnen (auch von extern aufrufbar); unbekannte/ gelöschte `id` → freundlicher „Hof nicht gefunden"-State, Rückfallliste.
4. „Route"-Button im Popup: neutraler externer Navi-Link (`https://www.openstreetmap.org/?mlat=…&mlon=…` bzw. `geo:`-URI), `target="_blank" rel="noopener noreferrer"`, **kein** Tracking, **kein** Eigenverkauf.
**Acceptance:** Pin→„Ansehen"→Drawer+URL verdrahtet; `?hof=<id>`/`?view=map` teilbar + zurück-navigierbar; unbekannte id → Zero-State; „Route" öffnet neutrale Navi (neues Tab, `noopener`); keine toten Buttons.

### WAVE B5 — Performance-Härtung, Lazy-Load & Resilienz
**Ziel:** Die Karte schnell, robust und kostenschonend machen (10→300→3000 mitgedacht).
**Aufgaben:**
1. **Code-Splitting:** `FarmMap`/Leaflet/Cluster per `React.lazy` + `Suspense` (Skeleton) — Map-Chunk lädt erst bei `view==='map'`; List-First-Paint ohne Leaflet.
2. **BBox-Vorfilter** (`withinBounds`) bei großen Mengen: nur sichtbare Höfe rendern; Cluster + Vorfilter kombiniert.
3. **Tile-Resilienz:** Tile-Fehler → ruhiger Karten-Fehler-State „Karte momentan nicht ladbar — zur Liste wechseln" (Liste bleibt voll funktionsfähig, kein Blank-Canvas). Cloudflare-Cache-Hinweis dokumentiert.
4. **Re-Render-Stabilität:** memoisierte Pins/Handler; reiner Pan baut keine Marker neu; Filteränderung = gezielter Update.
5. (Optional, last-getrieben) `0007_geo_bbox_index.sql` als **vorbereitete** Migration (nicht zwingend angewandt) dokumentieren — Anwendung erst bei realer Last (Track E / Gate 50+).
**Acceptance:** Map-Chunk nicht im List-Bundle (Bundle-Diff belegt); 300 Pins flüssig; Tile-Offline → Fehler-State statt Blank, Liste funktioniert weiter; reiner Pan ohne Marker-Neuaufbau; `build` grün.

### WAVE B6 — Barrierefreiheit, Editorial-Politur, Tests, Doku & Track-B-Gate
**Ziel:** Beweisbare Reife auf Enterprise-Niveau, dann Inkrement-Gate grün.
**Aufgaben:**
1. **A11y:** Karte tastaturbedienbar (Fokus-Reihenfolge, Pin per Enter), aria-Labels (Pins, Cluster, Recenter, View-Toggle), sichtbarer Fokusring (Token); **Liste = gleichwertige Alternative** (kein nur-auf-Karte-Inhalt). `prefers-reduced-motion` respektiert.
2. **Editorial-Politur:** Pins/Cluster/Popups/Controls strikt aus `app/src/styles/theme.css` (keine hardcodierten Farben, keine Deko-Emojis); konsistente Typo/Abstände; mobile Politur (Recenter, Touch-Targets ≥ 44 px).
3. **Tests** (in den bestehenden Harness, Pfade via `import.meta.url`/Vitest-konform):
   - **Geo-Mathematik:** `haversine`/`distanceFromPlz`/`distanceFromPoint` (bekannte Referenzdistanzen), `withinBounds`.
   - **Eine Wahrheit:** Liste und Karte erhalten **identisch** gefilterte/ sortierte `Farm[]` (gleicher `applyFilter`-Output).
   - **Deep-Link:** `?hof=<id>` öffnet korrekten Drawer; unbekannte id → Zero-State; `?view=map` persistiert.
   - **Geolocation-Opt-in:** Verweigerung → Zero-State, kein Crash; Standort wird **nicht** persistiert/gesendet (gemockte `geolocation`).
   - **Cluster:** ab Schwelle aggregiert; Klick spreizt; Anzahl stimmt.
   - **Zero-State:** 0 Höfe → „Keine Höfe"; unbekannte PLZ → alle ohne Distanz; Tile-Fehler → Karten-Fehler-State.
4. **Doku final:** `docs/spezialmodule/HOFLADEN_FINDER.md` (Abschnitt Karte), Tracker (`docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md`), ADRs (Provider/Cluster) + Pattern (Lazy-Map-+-Cluster-+-Geo-Opt-in als **Imperium-Beschleuniger** für alle Karten-Strecken).
**Acceptance:** Alle Track-B-Tests grün im offiziellen Runner; A11y-Check (Tastatur/SR/Fokus) bestanden; Editorial-Disziplin gewahrt; Doku/Tracker spiegeln realen Stand; Track-B-Gate (§7) grün.

---

## 7. Acceptance (Track-B-Gesamtabnahme — alle grün)

**Eine Wahrheit, zwei Sichten (Pfeiler 3/7)**
1. Liste und Karte zeigen **denselben** gefilterten/sortierten Datensatz (`applyFilter`-Output identisch — Test); View-Wechsel ohne Refetch/Divergenz.
2. Deep-Links (`?view=map`, `?hof=<id>`, `?near=1`) sind **teilbar** + **zurück-navigierbar**; jeder Zustand real auslösbar; keine Sackgasse.

**Entdeckung & Interaktion**
3. **Cluster** aggregiert dichte Regionen (ab Schwelle), Klick spreizt korrekt; Anzahl stimmt; 300 Pins flüssig.
4. **„In der Nähe"** sortiert nach **echtem** Standort (Geolocation), streng **Opt-in**; „Du bist hier"-Marker + Recenter.
5. Jeder Pin öffnet realen Popup → „Ansehen" öffnet realen **Hof-Drawer/Deep-Link**; „Route" öffnet neutrale externe Navi (`noopener`, kein Tracking). **Kein toter Pin/Button.**

**Performance & Kosten (Pfeiler-nah / §0.3)**
6. **Code-Splitting:** Map-Chunk lädt erst bei Kartenansicht; nicht im List-Bundle (Bundle-Diff belegt). 300 Pins ohne Ruckeln; reiner Pan ohne Marker-Neuaufbau.
7. Tiles über **Cloudflare-Cache**; OSM-Fair-Use gewahrt; **keine** neue externe Origin (Cluster lokal, Geo = Browser-API, Route = Anchor).

**Zero-State & Resilienz (Pfeiler 2)**
8. 0 Höfe / unbekannte PLZ / Geolocation verweigert / **Tiles offline** → klare, ruhige Zustände; **kein** 500/Blank-Canvas; Liste bleibt voll funktionsfähig.

**Datenschutz & Compliance (Vermittler)**
9. Geolocation **default OFF**, Opt-in mit Erklärung; Koordinaten verlassen den Browser **nicht** und werden **nicht** persistiert; DSGVO-konform.
10. **OSM-Attribution** sichtbar (Pflicht); **Vermittler-** + **Lebensmittel-Hinweis** durchgängig; die Karte verkauft/berät nicht.

**A11y & Editorial**
11. Karte tastatur-/screenreader-tauglich; Liste gleichwertige Alternative; `prefers-reduced-motion` respektiert.
12. Pins/Cluster/Popups/Controls strikt aus Design-System-Tokens; keine hardcodierten Farben, keine Deko-Emojis.

**Hygiene**
13. **Additiv** auf der ✅-Basis (kein Rebuild von `FarmMap`/`FinderPage`); neue Geo-Migration (`0007`) nur **vorbereitet** (nicht spekulativ angewandt), Rollback dokumentiert; `npm run typecheck` + `npm run build` grün; keine Secrets im Repo/Log.

---

## 8. Gate (Track-B-Gate — Qualitäts-Inkrement, **nicht** marktstart-blockierend)

> Track B ist nach B6 fertig. Das **Track-B-Gate** ist ein Qualitäts-Inkrement (Such-/Entdeck-UX), **nicht** Teil des Marktstart-Pflicht-Sets (das verlangt allein „mind. ein Geldfluss" = Track A oder WAVE_09). Es schließt an Phase-2-Gate **E (Performance)** + **F (Smoke)** an.

| Gate-Prüfung | Kriterium | Beleg / Verantwortlich |
|---|---|---|
| **Eine-Wahrheit-Gate** | Liste & Karte = identisch gefilterter/sortierter Datensatz; View-Wechsel ohne Divergenz | §6 B6 Test · `qa-tester` |
| **Cluster-Gate** | Dichte → Cluster ab Schwelle; Klick spreizt; Anzahl korrekt; 300 Pins flüssig | §6 B2 · `performance-cost-optimizer` |
| **Geo-Opt-in-Gate** | Geolocation default OFF, Opt-in mit Erklärung; Verweigerung → Zero-State; **keine** Persistenz/Übertragung | §6 B3 · `compliance-officer` + `security-auditor` |
| **Deep-Link-Gate** | `?view=map`/`?hof=<id>` teilbar + zurück-navigierbar; unbekannte id → Zero-State; kein toter Pin | §6 B4 · `qa-tester` |
| **Performance-Gate (blockierend für B)** | Map-Chunk lazy (nicht im List-Bundle); reiner Pan ohne Marker-Neuaufbau; Tile-Offline → Fehler-State, Liste lebt | §6 B5 · `performance-cost-optimizer` |
| **CSP-/Origin-Gate** | **keine** neue externe Origin; OSM-Tiles in CSP; Drittanbieter nur per ADR+Owner | §5 · `security-auditor` |
| **A11y-/Editorial-Gate** | Tastatur/SR/Fokus; Liste gleichwertig; nur Token-Farben; keine Deko-Emojis; reduced-motion | §6 B6 · `frontend-design-guardian` |
| **Compliance-Gate** | OSM-Attribution sichtbar; Vermittler-/Lebensmittel-Hinweis durchgängig; Route-Link neutral | §5/§7 · `compliance-officer` |
| **Doku-Gate** | `HOFLADEN_FINDER.md` (Karte), Tracker, ADRs (Provider/Cluster) aktuell | Review |

**Stop-Regeln in diesem Track:**
- **Bezahlter Tile-/Vektor-Anbieter** (MapTiler/Mapbox/o. ä.) statt OSM-Raster, **eigener Geocoding-Dienst**, **PostGIS-Extension** in der Produktiv-DB → **STOP**, Owner-Freigabe (Kosten/Vertrag/DSGVO/Infra) + ADR.
- Karte würde personenbezogene Standortdaten **senden/speichern** → **STOP**, das verletzt den Opt-in-/Datensparsamkeits-Grundsatz; nur clientseitige Distanz ohne Owner-/DSGVO-Klärung.
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 9. Manuelle Owner-Tasks (Account/Kosten/Vertrag — außerhalb der Code-Wellen)

```text
[ ] Entscheidung Tile-Provider: OSM-Raster (Default, kostenlos) beibehalten ODER bezahlten Anbieter
    (MapTiler/Mapbox, EU) freigeben — Kosten/Vertrag/Key + CSP-Origin + AVV. (Default: OSM behalten.)
[ ] Cloudflare: Cache-Rule/Worker für OSM-Tiles (Fair-Use schonen, Latenz senken); WAF/Rate-Limit unverändert.
[ ] Falls Vektor/MapLibre gewünscht: Tile-Server-/Style-Bezug klären (Owner-Gate), sonst nicht beschreiten.
[ ] Falls echtes Geocoding (Adresse→Koordinate) statt PLZ-Zentroid: Anbieter (EU), Kosten, AVV, DSGVO klären.
[ ] DSGVO: Datenschutz-Text „Standort nur auf Opt-in, clientseitig, keine Speicherung" + OSM-Attribution
    in Impressum/Datenschutz spiegeln (docs/launch/B_rechtstexte/*).
[ ] Falls PostGIS (Migration 0007 Variante B): Extension-Freigabe im Supabase-EU-Projekt (Infra/Owner).
```

> Diese Schritte sind **kosten-/vertrags-/außenwirksam** → **vorab in Klartext ankündigen, erst auf Owner-OK** (CLAUDE.md/AGENTS.md). Die Code-Wellen B1–B6 sind lokal, additiv und account-neutral (OSM-Raster, Browser-Geolocation, lokal gebündelte Cluster-Lib).

---

## 10. Abschlussbericht (Vorlage — pro Welle füllen)

```
## Track-Welle abgeschlossen: B · <B0…B6 — Name>
- Geändert: <Dateien — FarmMap.tsx, FinderPage.tsx, geo.ts, data.ts, types.ts, ggf. 0007_geo_bbox_index.sql, Doku>
- Tests/Verifikation: <Geo-Mathematik · eine Wahrheit (Liste==Karte) · Deep-Link ?hof/?view · Geo-Opt-in
  (Verweigerung→Zero-State, keine Persistenz) · Cluster · Zero-State (0 Höfe/unbek. PLZ/Tiles offline) ·
  Bundle-Diff (Map-Chunk lazy) · typecheck/build grün>
- Risiken: <additiv auf ✅-Basis? Retrofit? keine neue Origin? Rollback (0007 drop-index)?>
- Compliance: <Geolocation Opt-in/keine Speicherung · OSM-Attribution · Vermittler-/Lebensmittel-Hinweis · Route-Link neutral>
- Gate-Stand: <offen/grün>
- Nächste Welle: <…>
```

---

## 11. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Frontend-Regeln: End-to-End, keine toten Buttons, Design-System-Tokens, keine Deko-Emojis, Deep-Links statt Sackgassen), `AGENTS.md` (`frontend-design-guardian`, `i18n-content-spezialist`, `performance-cost-optimizer`; SQL nur additiv), `PHASEN.md` (Phase 4 Track B — Interaktive Karte; **nicht** Marktstart-blockierend).
- **Phase-4-Kontext:** `finalization/phase4_vertical/README.md` (Track B ✅ + Rest-Inkremente: Cluster, „in der Nähe", Deep-Link), `GATES.md` (Track-B-Gate „nein" marktstart-relevant), `CROSS_CUTTING.md` (Berührungspunkte), `MASTERPROMPTS.md` (Track-B-Start-Prompt).
- **Landkarte:** `MASTER_INDEX.md` (3 `spezialmodule/HOFLADEN_FINDER.md` ✅ implementiert/Doku ⬜; 7 `phase4_vertical/TRACK_B_KARTE` = diese Datei).
- **Reale Artefakte (Bestand, Basis):** `app/src/components/FarmMap.tsx` (Leaflet/OSM/Pins/Popups/FitBounds), `app/src/pages/FinderPage.tsx` (Liste↔Karte, Filter-State), `app/src/lib/geo.ts` (haversine/PLZ-Distanz), `app/src/lib/data.ts` (eine Datenschicht, `applyFilter`/`withDistance`), `app/src/lib/types.ts` (`Farm`/`FarmFilter`), `app/src/components/{FarmDrawer,FarmCard}.tsx` (Deep-Link-Ziel), `app/supabase/migrations/0001_core.sql` (`farms.lat/lng`, `farms_plz_idx`, `farms_public_read`), `app/package.json` (`leaflet`/`react-leaflet`/`react-router-dom`).
- **Vorwellen:** `finalization/WAVE_04_core_business.md` (A Hofladen-Finder — Track B ist dessen vertikale Vertiefung), `WAVE_10` (Premium UX/Mobile/Leerzustände), `WAVE_11_db_hardening.md` (Indizes/Pagination — `0007` knüpft daran an), `TRACK_E_DATENMODELL_SKALIERUNG.md` (Geo-Index/BBox bei realer Last).
- **Subagenten:** `frontend-design-guardian` (Karten-UI im Editorial-Token-System) + `i18n-content-spezialist` (Mikrocopy/Trust-Texte: Opt-in-Erklärung, Zero-States) → `performance-cost-optimizer` (Lazy-Load/Cluster/Tile-Cache) → `compliance-officer` + `security-auditor` (Geo-Opt-in/Datensparsamkeit/CSP) → `qa-tester` (Gate: eine Wahrheit, Deep-Link, Zero-State); Provider-/Cluster-Architektur als ADR über `architekt`.

> **Vermittler-Disclaimer (durchgängig):** Die Karte **zeigt** Höfe und **führt** zu ihnen (Detail/Reservierung/Route). Die Plattform **verkauft nicht selbst**, **berät nicht** und übernimmt **keine Warenhaftung**. Standortdaten werden **nur auf Opt-in** und **ausschließlich clientseitig** genutzt (keine Speicherung/Übertragung). Kartendaten © OpenStreetMap-Mitwirkende (Attribution Pflicht). Jeder Account-/Kosten-/Vertrags-/Provider-Schritt: **vorab ankündigen, erst auf Owner-OK.**
