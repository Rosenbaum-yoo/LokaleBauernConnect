# LokaleBauernConnect — Spezialmodul: Hofladen-Finder

> **Stand:** 2026-06-19 · **Status:** ✅ end-to-end implementiert (Seed + Supabase-ready), Dev-Port **5409**
> Verbindliche Funktions- und Implementierungs-Spezifikation des **Such- und Entdeckungs-Einstiegs** der Plattform: Höfe, Hofläden und Erzeuger in der Nähe finden, nach PLZ und Kategorie filtern, nach Entfernung ranken, im Detail ansehen und zur Abholung reservieren.
> Adaptiert aus dem TempConnect-Blueprint-Aufbau (Spezialmodul-Dokumentation) auf die **Hof-Domäne** + Stack **React/Vite/TS · Supabase · Cloudflare · Stripe**. Anordnung wie das Original, Inhalte vollständig auf diese Plattform überschrieben. **Keine VMS-/Zeitarbeits-Begriffe.**
>
> **Quelle der Wahrheit (Code):** `app/src/pages/FinderPage.tsx` · `app/src/lib/data.ts` · `app/src/lib/geo.ts` · `app/src/lib/types.ts` · `app/src/lib/seed.ts` · `app/src/components/{FarmCard,FarmDrawer,AvailabilityBadge}.tsx` · `app/supabase/migrations/0001_core.sql`.
> **Bezug:** `PHASEN.md` WAVE_04 (Kernprodukt A) + Phase 4 Track B (interaktive Karte) · `CLAUDE.md` §„Kritische Produkt-Abgrenzung" + 7 Produktionspfeiler · `docs/DATABASE_MODEL.md` · `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md` · `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` · ADR `docs/adr/0001`, `0002`.

---

## 0 · Zweck, Scope & Abgrenzung

### 0.1 Aufgabe des Moduls
Der Hofladen-Finder ist der **erste Touchpoint** der Käuferseite. Er beantwortet eine einzige, präzise Frage: *„Welche Höfe in meiner Nähe haben jetzt etwas für mich — und wo hole ich es ab?"* Er aggregiert den öffentlichen Hof-Katalog (Höfe + Produkte + Verfügbarkeit), macht ihn durch **PLZ-Distanz** und **Kategorie** durchsuchbar, rankt die Treffer und übergibt nahtlos in **Hof-Detail** und **Reservierung**.

### 0.2 In-Scope (dieses Modul liefert)
- **Suche/Filter:** Postleitzahl (5-stellig), Produktkategorie, Sortierung (Entfernung / Name).
- **Distanzberechnung:** Haversine zwischen PLZ-Zentroid und Hof-Koordinate (`lat`/`lng`).
- **Ranking:** „Nächste zuerst" bei bekannter PLZ, sonst alphabetisch (DE-Locale-Collation).
- **Ergebnisliste:** responsives Hof-Karten-Grid mit Typ, Adresse, Distanz, Kategorien, Top-Verfügbarkeiten.
- **Hof-Detail:** Drawer mit Story, Öffnungszeiten, vollständiger Verfügbarkeitsliste, Abholfenstern.
- **Übergabe an Reservierung:** der Detail-Drawer hostet das Reservierungsformular (Modul `RESERVIERUNG_ABHOLUNG`).
- **Zustände:** Lade-Skelett, Zero-State (keine Treffer), Hinweis bei unbekannter PLZ, PLZ-Validierung.
- **Datenquellen-Bridge:** identische UI über **Supabase** (live) **oder** **Seed** (sofort lauffähig) — eine API, zwei Quellen.

### 0.3 Out-of-Scope (bewusst woanders)
| Nicht hier | Wo stattdessen |
|---|---|
| Interaktive Karte (Leaflet/MapLibre + OSM, Pins, Cluster) | **Phase 4 Track B** — siehe §7 „Karten-Roadmap" (geplant, Schnittstelle hier vordefiniert) |
| Erzeuger-Selbstpflege der Verfügbarkeit | `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` |
| Reservierungs-Lebenszyklus / Statusmaschine | `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md` + `docs/CORE_BUSINESS_STATE_MACHINES.md` |
| Saison-Logik & Benachrichtigungen | `docs/spezialmodule/SAISON_RADAR.md` |
| SB-Bezahlung am Stand (USP) | `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (Phase 4 Track A) |
| Auth/Rollen/Tenancy/Audit | Kern (nur andocken, nie hier neu bauen) |

### 0.4 Vermittler-Disклaimer (durchgängig, Pflicht)
Der Finder zeigt **fremde** Angaben. Plattform = **Vermittler**, kein Eigenverkauf, keine Beratung. Der Footer (`app/src/App.tsx`) trägt durchgehend:
> „LokaleBauernConnect ist eine Vermittlungsplattform. Verkauf, Produktangaben und Verfügbarkeit liegen bei den Erzeugern. Reservierung ohne Kaufgarantie; Zahlung direkt beim Hof. Alle Angaben ohne Gewähr."

Alle Hof-/Produkt-/Verfügbarkeitsangaben sind **Erzeuger-Selbstauskunft** und werden als solche dargestellt — keine implizite Garantie der Plattform.

---

## 1 · Funktions-Spezifikation (User-Sicht)

### 1.1 Sucheingaben
| Eingabe | UI-Element | Regel | Default |
|---|---|---|---|
| **Postleitzahl** | `<input inputMode="numeric" maxLength=5>` (`#f-plz`) | nur Ziffern, max. 5 (`value.replace(/\D/g,'').slice(0,5)`); gültig = `^\d{5}$` | leer |
| **Produktkategorie** | `<select>` (`#f-cat`) | `'all'` oder ein `ProductCategory`-Enum-Wert | `all` |
| **Sortierung** | `<select>` (`#f-sort`) | `'distance'` \| `'name'` | `distance` |

- **Live-Filterung:** Jede Änderung an PLZ / Kategorie / Sortierung löst sofort einen neuen Ladevorgang aus (`useEffect`-Dependency `[plz, category, sort]`). Keine „Suchen"-Schaltfläche nötig — kein toter Button.
- **Kategorie-Quelle:** Die Filteroptionen werden aus den real vorhandenen Hof-Kategorien abgeleitet (`listCategories()`), nicht hartkodiert — der Filter zeigt nie eine Kategorie ohne Treffer-Grundlage an.
- **Eingabe-Härtung:** PLZ-Feld akzeptiert ausschließlich Ziffern; XSS-frei, da der Wert nur in numerische Geo-Lookups und (escaped) als Text fließt. Kategorie/Sortierung sind enum-gebunden (Select), kein Freitext.

### 1.2 Ergebnis-Meta (Kontext-Transparenz, Pfeiler 3)
Über der Liste steht immer ein **Scope-Hinweis** (`.finder-meta`):
- Trefferzahl: `„{n} Hof"` / `„{n} Höfe gefunden"` (DE-Singular/Plural), während des Ladens `„Lädt …"`.
- Kontextzeile, situationsabhängig:
  - **PLZ bekannt + Sortierung Distanz:** „Sortiert nach Entfernung zu deiner PLZ."
  - **PLZ gültig, aber unbekannt:** „Diese PLZ kennen wir noch nicht — wir zeigen alle Höfe (alphabetisch). Entfernung folgt zum Start deiner Region."
  - **Keine/ungültige PLZ:** „Tipp: PLZ eingeben, um die nächsten Höfe zuerst zu sehen."

Damit weiß der Käufer **jederzeit, auf welcher Datenbasis** die Liste steht (Distanz-fähig oder nicht) — keine stille Falschsuggestion.

### 1.3 Hof-Karte (Listenelement)
Komponente `FarmCard` (`app/src/components/FarmCard.tsx`):
- **Kopf:** Hof-Typ (Eyebrow), Name (H3), Adresse `{plz} {city} · {street}`, rechts die Distanz `„{x} km"` (nur wenn `distanceKm != null`, DE-formatiert).
- **Körper:** Kategorie-Chips, bis zu **3 Top-Produkte** als Verfügbarkeits-Badges, `„+N mehr"` falls weitere; Öffnungszeiten; Affordance „Ansehen →".
- **Interaktion:** vollständig tastatur- und screenreader-bedienbar — `role="button"`, `tabIndex={0}`, `aria-label="{name} ansehen"`, Aktivierung per Klick **und** `Enter`/`Space`. Öffnet den Detail-Drawer.

### 1.4 Hof-Detail (Drawer)
Komponente `FarmDrawer` (`app/src/components/FarmDrawer.tsx`):
- **Off-Canvas-Drawer** mit Scrim, `role="dialog"`, `aria-modal="true"`; schließt per ✕, Scrim-Klick **und** `Escape`.
- **Inhalt:** Typ + Name + Adresse (+ Distanz, falls vorhanden), Hof-Story, Info-Kacheln (Öffnungszeiten, Kategorien), **vollständige Verfügbarkeitsliste** (Produkt · Saison-Marker · Einheit · Preis · Badge).
- **Reservierungsbereich:** hostet das Reservierungsformular (Produkt → Menge → Abholfenster → Name → Kontakt), zeigt Richtwert-Summe + Hinweis „Zahlung direkt beim Hof". Details: `RESERVIERUNG_ABHOLUNG.md`. Ausverkaufte Produkte sind nicht reservierbar; bei komplett leerem Bestand erscheint „Aktuell ist nichts verfügbar."

### 1.5 Verfügbarkeits-Semantik (Anzeige)
`AvailabilityBadge` mappt das `availability_state`-Enum auf Klartext + Farb-Token (`app/src/components/AvailabilityBadge.tsx`):

| Enum | Label | Bedeutung |
|---|---|---|
| `available` | Verfügbar | jetzt erhältlich, reservierbar |
| `low` | Wenig übrig | knapp, reservierbar |
| `soon` | Bald wieder | aktuell nicht da, kommt nach |
| `out` | Ausverkauft | nicht reservierbar |

Die Farb-Tokens kommen aus dem Editorial-Design-System (`app/src/styles/theme.css`); **keine hartkodierten Farben** im Modul.

---

## 2 · Such- & Ranking-Logik (technisch)

### 2.1 Pipeline (eine Quelle der Wahrheit: `listFarms(filter)`)
`app/src/lib/data.ts` → `listFarms(filter: FarmFilter)` ist der einzige Lese-Einstieg. Ablauf:

```
listFarms(filter)
  ├─ Quelle wählen: Supabase (wenn konfiguriert) → sonst/​bei Fehler Seed
  ├─ applyFilter(rows, filter)
  │    1. Kategorie-Filter   (filter.category !== 'all' → f.categories.includes(cat))
  │    2. withDistance(...)  (PLZ gültig → distanceKm je Hof, sonst null)
  │    3. knownPlz?          (gültige PLZ UND mind. ein Hof mit distanceKm != null)
  │    4. Sortierung:
  │         sort='distance' & knownPlz → aufsteigend nach distanceKm (null ans Ende, 1e9)
  │         sonst                       → alphabetisch nach name (localeCompare 'de')
  └─ Farm[] (sortiert, mit/ohne distanceKm)
```

### 2.2 Distanz: Haversine (`app/src/lib/geo.ts`)
- **Großkreisdistanz** zwischen zwei `[lat, lng]`-Punkten, Erdradius `R = 6371 km`:

```ts
export function haversine(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0]); const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0]); const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))  // clamp gegen FP-Drift > 1
}
```

- `distanceFromPlz(plz, lat, lng)` schlägt das **PLZ-Zentroid** nach und liefert die auf **0,1 km gerundete** Distanz, oder `null` bei unbekannter PLZ.
- `isValidPlz(plz)` = `^\d{5}$` (Format-Gate vor jedem Geo-Lookup).
- **Genauigkeit:** Zentroid-Distanz (Stadtteil-Ebene), bewusst als „Richtwert" deklariert — für Reihenfolge/Nähe ausreichend, nicht als Navigations-Routing gedacht.

### 2.3 PLZ-Zentroide (heute) und Ablöseplan
- Heute: kompakte, **handgepflegte** Zentroid-Tabelle `PLZ_CENTROIDS` (Anker-Regionen Osnabrück, Münster, Oldenburg, Bremen/Herford u. a.) — passend zur Start-Region und zum Seed.
- **Bewusste Grenze:** Eine nicht erfasste PLZ ist **kein Fehler**, sondern führt zum dokumentierten „PLZ unbekannt"-Pfad (alle Höfe, alphabetisch, transparenter Hinweis). Kein 500, kein leeres Ergebnis (Pfeiler 2).
- **Ablösung (geplant, Phase 4/5):** vollständiger DE-PLZ-Zentroid-Datensatz oder Geocoding über eine **Supabase Edge Function** (server-seitig, Rate-limitiert, kein Drittanbieter-Key im Client). Schnittstelle bleibt `distanceFromPlz` — reiner Datenaustausch, keine UI-Änderung.

### 2.4 Ranking-Regeln (deterministisch)
| Situation | Reihenfolge |
|---|---|
| gültige + bekannte PLZ, Sort = Distanz | `distanceKm` aufsteigend; Höfe ohne Distanz ganz ans Ende |
| Sort = Name (immer) | `name` aufsteigend, `localeCompare('de')` (korrekte Umlaut-Sortierung) |
| ungültige/unbekannte PLZ, Sort = Distanz | Fallback auf Name-Sortierung (verhindert „Pseudo-Distanz"-Ranking) |

**Determinismus:** Bei gleichem Filter ist die Reihenfolge stabil und reproduzierbar (keine Zufalls-/Zeitkomponente im Ranking).

---

## 3 · Datenquellen & Datenmodell

### 3.1 Zwei Quellen, eine API
| Quelle | Aktiv wenn | Verhalten |
|---|---|---|
| **Supabase** (`farms` + eingebettete `products`) | `VITE_SUPABASE_URL` **und** `VITE_SUPABASE_ANON_KEY` gesetzt (`isSupabaseConfigured`) | `from('farms').select('*, products(*)').is('deleted_at', null)` |
| **Seed** (`SEED_FARMS`) | kein Supabase **oder** Supabase-Abfrage wirft | sofort lauffähige, realistische Datenbasis (9 Höfe, echte PLZ/Geo) |

- **Fail-soft:** Schlägt die Supabase-Abfrage fehl, fängt `listFarms` den Fehler, loggt `console.warn` und liefert Seed — der Finder bleibt **immer** bedienbar (kein weißer Bildschirm).
- **Statusanzeige:** Der App-Header (`App.tsx`) zeigt sichtbar „Live-Daten" (grün) vs. „Demo-Daten" (gold) — keine verdeckte Schattenwahrheit über die Datenherkunft.
- **Mapping:** `mapFarm()` übersetzt DB-`snake_case` → Frontend-`camelCase` und ist die einzige Stelle dieser Übersetzung (kein doppelter Mapping-Pfad).

### 3.2 Relevante Tabellen (Auszug `0001_core.sql`)
**`farms`** (Hof-Katalog, öffentlich lesbar): `id text PK` (stabiler Slug) · `org_id uuid NOT NULL` (Mandant) · `name, type(farm_type), street, plz, city` · `lat/lng double precision` · `story, opening_hours` · `pickup_windows text[]` · `categories product_category[]` · `verified bool` · `created_at/updated_at/deleted_at`.
Indizes: `farms_plz_idx (plz)`, `farms_org_idx (org_id)`, `farms_active_idx (deleted_at) WHERE deleted_at IS NULL`.

**`products`** (eingebettet je Hof): `id text PK` · `farm_id, org_id` · `name, category(product_category), unit, price numeric(10,2) ≥ 0` · `availability(availability_state)` · `seasonal bool`.
Indizes: `products_farm_idx (farm_id)`, `products_cat_idx (category)`.

> **Typ-Wahrheit Frontend:** `app/src/lib/types.ts` (`Farm`, `Product`, `ProductCategory`, `FarmType`, `Availability`, `FarmFilter`). DB-Enums und TS-Union-Typen sind 1:1 abgestimmt (siehe `docs/DATABASE_MODEL.md`). `distanceKm` ist **rein laufzeitberechnet**, keine DB-Spalte.

### 3.3 RLS & Tenant-Isolation (Pfeiler 1 — am Finder relevant)
- **Öffentlicher Katalog lesbar, ohne Login:** `farms_public_read` (`USING deleted_at IS NULL`) und `products_public_read` (nur Produkte aktiver, nicht gelöschter Höfe) erlauben `SELECT` für `anon`/`authenticated`. Der Finder funktioniert daher anonym.
- **Schreiben strikt org-gebunden:** `farms_owner_write` / `products_owner_write` (`org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())`) — der Finder selbst schreibt **nichts** an `farms`/`products`; Pflege gehört zum Erzeuger-Modul.
- **deny-by-default:** kein impliziter Fremd-Org-Zugriff. Soft-gelöschte Höfe (`deleted_at`) sind weder per Policy noch per Query (`.is('deleted_at', null)`) sichtbar.

### 3.4 Seed-Daten (Demo-Kennzeichnung)
`SEED_FARMS` (`app/src/lib/seed.ts`): 9 plausible Höfe mit echten PLZ/Koordinaten und realistischen Produkten/Verfügbarkeiten/Abholfenstern — **keine Fake-KPIs, keine Deko-Karten**, sondern eine vollständige, strukturidentische Datenbasis. Die Demo-Herkunft ist im Header („Demo-Daten") sichtbar markiert; Live-Schaltung ist reine Env-Konfiguration.

---

## 4 · Zustände (vollständig, kein toter Pfad)

| Zustand | Auslöser | Darstellung | Quelle |
|---|---|---|---|
| **Laden** | initial + jede Filteränderung | 6 Skeleton-Kacheln im Grid, Meta „Lädt …" | `FinderPage` `loading` |
| **Treffer** | ≥ 1 Hof nach Filter | Hof-Karten-Grid + Trefferzahl + Kontextzeile | `FinderPage` |
| **Zero-State (Filter)** | 0 Treffer (z. B. seltene Kategorie) | „Keine Höfe für diese Auswahl" + Vorschlag „andere Kategorie / Filter entfernen" | `FinderPage` |
| **PLZ unbekannt** | gültige 5-stellige PLZ ohne Zentroid | alle Höfe alphabetisch + Hinweis „Diese PLZ kennen wir noch nicht …" | `plzUnknown` |
| **PLZ leer/ungültig** | < 5 Ziffern / kein Eintrag | alle Höfe alphabetisch + Tipp „PLZ eingeben …" | `isValidPlz` |
| **Detail offen** | Karte aktiviert (Klick/Tastatur) | Drawer mit Story/Verfügbarkeit/Reservierung | `selected` |
| **Quelle: live** | Supabase konfiguriert + Abfrage ok | Header „Live-Daten" (grün), DB-Treffer | `isSupabaseConfigured` |
| **Quelle: demo/fallback** | kein Supabase **oder** Abfrage-Fehler | Header „Demo-Daten" (gold), Seed-Treffer, `console.warn` | `data.ts` catch |
| **Detail: nichts verfügbar** | alle Produkte `out` | „Aktuell ist nichts verfügbar." statt Formular | `FarmDrawer` |

**Pfeiler 2 (Zero-State statt Error):** Es gibt keinen Pfad zu 500/NULL-Pointer. Leere Mengen sind leere Arrays; unbekannte PLZ = `null`-Distanz + Hinweis; Datenquellen-Ausfall = stiller Seed-Fallback.

---

## 5 · Barrierefreiheit, Performance, i18n

### 5.1 Accessibility (a11y)
- Karten als echte Buttons (`role="button"`, `tabIndex`, `aria-label`), Aktivierung Klick + `Enter`/`Space`.
- Drawer: `role="dialog"`, `aria-modal`, `aria-label`, Schließen per `Escape`/Scrim/✕; dekorative Icons `aria-hidden`.
- Alle Eingaben mit verbundenem `<label htmlFor>`; PLZ-Feld `inputMode="numeric"`.
- Verfügbarkeits-Punkt rein dekorativ (`aria-hidden`), Status zusätzlich als Text-Label (nicht nur Farbe → kein reiner Farbcode).

### 5.2 Performance & Kosten
- Heute: ein einziger Listen-Read mit eingebetteten Produkten (`farms` + `products(*)`), Filter/Sort/Distanz **clientseitig** (kleiner Datensatz, sofortige Interaktion ohne Roundtrip).
- Skalierung (Phase 4/5, Track E): Pagination, serverseitige PLZ-Vorfilterung über `farms_plz_idx`, optional Boundingbox-Query (Edge Function) für Karte; Caching am Cloudflare-Rand für den öffentlichen Katalog. Schnittstelle `FarmFilter` ist erweiterbar (z. B. `radiusKm`, `page`) **ohne** UI-Bruch.
- `useEffect`-Race-Schutz: ein `alive`-Flag verwirft veraltete Antworten bei schneller Filter-Änderung (kein Flackern / keine Reihenfolge-Race).

### 5.3 i18n / Mikrocopy
Durchgängig **Deutsch**, Editorial/regionaler Markenton, keine Deko-Emojis in Prod-UI. DE-Formatierung für Zahlen (`toLocaleString('de-DE')`), Währung (EUR), Singular/Plural. Texte sind Vermittler-konform formuliert („Der Hof bestätigt …", „Zahlung direkt beim Hof").

---

## 6 · End-to-End-Verdrahtung (Kette, kein Platzhalter)

```
PLZ/Kategorie/Sort (FinderPage state)
   → useEffect [plz, category, sort]
      → listFarms(filter)                       (data.ts — Supabase ODER Seed)
         → applyFilter: Kategorie → Distanz → Ranking
      → setFarms(result) / setLoading(false)
   → Render: Laden | Treffer-Grid | Zero-State (+ Scope-Meta)
      → FarmCard onClick/Enter → setSelected(farm)
         → FarmDrawer (Detail + Verfügbarkeit)
            → Reservierungsformular → createReservation()  (→ RESERVIERUNG_ABHOLUNG.md)
               → Supabase reservations.insert ODER localStorage-Fallback
               → Bestätigung im Drawer
```

Jeder interaktive Zustand ist real auslösbar und sichtbar; kein TODO, kein toter Button, kein Dummy-Link. Datenquellen-Status ist im Header sichtbar.

---

## 7 · Karten-Roadmap (Phase 4 Track B — geplant, Schnittstelle vordefiniert)

**Ziel:** interaktive Karte als zweite, gleichwertige Ergebnis-Ansicht („Liste ⇄ Karte") — nicht als Ersatz.

| Aspekt | Entscheidung / Plan |
|---|---|
| **Engine** | **MapLibre GL JS** (bevorzugt, vektorbasiert, lizenzfrei) oder **Leaflet** (leichter, Raster) — beide mit **OpenStreetMap**. Auswahl als ADR (`.claude/memory/decisions/`) festzuhalten. |
| **Tiles** | OSM-konforme Quelle / selbst-gehostete bzw. Cloudflare-gecachte Vektor-Tiles; **Attribution Pflicht** (OSM-Lizenz). Kein proprietärer Map-Key im Client. |
| **Daten** | identische `Farm[]`-Quelle; Pins aus `lat`/`lng`. Bei vielen Höfen **Clustering**; Boundingbox-Read über Edge Function (Index `farms_plz_idx` + geo). |
| **„In der Nähe"** | optional Geolocation-API (Browser, mit Einwilligung) statt PLZ → Zentroid → Haversine-Ranking bleibt unverändert nutzbar. |
| **Interaktion** | Pin-Klick öffnet **denselben** `FarmDrawer` (Wiederverwendung, keine Parallelkomponente). Liste/Karte teilen Filter-State. |
| **Schnittstelle heute** | `FarmFilter` (erweiterbar um `radiusKm`/Boundingbox), `lat`/`lng` bereits im Modell und in jeder Karte vorhanden — die Karte ist **additiv**, ohne Bruch der bestehenden Logik. |
| **Disclaimer** | Standort-/Distanzangaben sind Richtwerte; Vermittler-Hinweis bleibt sichtbar. |

---

## 8 · Akzeptanzkriterien (verbindlich)

> Format: prüfbar, an reale Dateien/Funktionen gebunden. „Fertig" = alle erfüllt.

### 8.1 Suche & Filter
- **AK-01** Ungültige Zeichen im PLZ-Feld werden verworfen; nur ≤ 5 Ziffern landen im State (`/\D/g` + `slice(0,5)`).
- **AK-02** Kategorie ≠ „Alle" filtert die Liste exakt auf Höfe mit dieser Kategorie; „Alle" zeigt alle.
- **AK-03** Jede Änderung an PLZ/Kategorie/Sortierung aktualisiert die Liste **ohne** Button (Live-Filter); kein toter „Suchen"-Button existiert.
- **AK-04** Die Kategorie-Optionen entstammen real vorhandenen Hof-Kategorien (`listCategories`), nicht einer statischen Wunschliste.

### 8.2 Distanz & Ranking
- **AK-05** Bei bekannter PLZ trägt jede Karte eine Distanz `„{x} km"` (DE-formatiert, 0,1-km-gerundet); bei unbekannter/leerer PLZ wird **keine** Distanz angezeigt.
- **AK-06** Sort = Distanz + bekannte PLZ ⇒ Liste streng aufsteigend nach `distanceKm`; Höfe ohne Distanz stehen am Ende.
- **AK-07** Sort = Name (oder unbekannte PLZ) ⇒ alphabetisch nach `name` mit korrekter Umlaut-Sortierung (`localeCompare('de')`).
- **AK-08** Haversine ist symmetrisch (`d(a,b)=d(b,a)`), `d(x,x)=0`, und für bekannte Anker-Distanzen plausibel (Osnabrück↔Münster ~45 km Größenordnung).

### 8.3 Zustände
- **AK-09** Während des Ladens erscheinen Skeletons + „Lädt …"; danach Treffer **oder** Zero-State — nie ein leerer Bildschirm.
- **AK-10** 0 Treffer ⇒ Zero-State-Text mit Handlungsvorschlag (kein 500, kein leeres Grid ohne Hinweis).
- **AK-11** Gültige unbekannte PLZ ⇒ alle Höfe alphabetisch + Hinweistext „… kennen wir noch nicht …".
- **AK-12** Datenquellen-Status ist im Header korrekt sichtbar („Live-Daten" vs. „Demo-Daten").

### 8.4 Detail & Übergabe
- **AK-13** Karte ist per Klick **und** Tastatur (`Enter`/`Space`) aktivierbar und öffnet den korrekten Hof-Drawer.
- **AK-14** Drawer schließt per ✕, Scrim-Klick und `Escape`; beim Öffnen eines anderen Hofs wird das Formular zurückgesetzt.
- **AK-15** Im Detail sind alle Produkte mit Status/Preis/Einheit gelistet; `out`-Produkte sind nicht reservierbar; komplett leerer Bestand zeigt „Aktuell ist nichts verfügbar."

### 8.5 Sicherheit, Isolation, Compliance
- **AK-16** Finder funktioniert **anonym** (kein Login), Lesen ausschließlich über `*_public_read`-Policies; kein `service_role` im Client.
- **AK-17** Soft-gelöschte Höfe/Produkte (`deleted_at`) erscheinen **nie** im Finder (Query `.is('deleted_at', null)` + Policy).
- **AK-18** Fremd-Org-Daten sind nicht schreibbar/lesbar über erlaubte Pfade hinaus (Pfeiler 1); der Finder mutiert `farms`/`products` nicht.
- **AK-19** Vermittler-Disclaimer ist auf jeder Finder-Ansicht sichtbar; alle Angaben als Erzeuger-Selbstauskunft gekennzeichnet.
- **AK-20** Supabase-Abfragefehler führt zu Seed-Fallback (App bleibt bedienbar), nicht zu einem Crash.

---

## 9 · Tests

> **Runner-Realität (Stand heute):** Das Projekt hat noch **kein** Test-Runner-Setup in `app/package.json` (`build` = `tsc --noEmit && vite build`). Diese Sektion ist die **verbindliche Test-Spezifikation** für WAVE_12 (QA). Empfohlenes Setup: **Vitest** (Unit/Logik) + **@testing-library/react** (Komponenten) + **Playwright** (E2E), als devDependencies, Skripte `test` / `test:e2e`. Tests gehören neben den Code (`app/src/**/*.test.ts(x)`) bzw. unter `app/e2e/`. Pfadauflösung in Tests stets relativ zur Testdatei (kein `process.cwd()`-Drift). **Test-Integrität (§0.9): Code an Tests anpassen, nie Assertions zurechtbiegen.**

### 9.1 Unit — Geo/Distanz (`app/src/lib/geo.test.ts`)
- `haversine`: `d(x,x)=0`; Symmetrie `d(a,b)=d(b,a)`; bekannte Anker plausibel (Osnabrück↔Münster in erwarteter Größenordnung); Clamp gegen FP-Drift (kein `NaN` bei identischen Punkten).
- `distanceFromPlz`: bekannte PLZ → endliche, auf 0,1 gerundete Zahl; unbekannte PLZ → `null`.
- `isValidPlz`: `'49074'`→true; `'4907'`/`'490745'`/`'4907a'`/`''`→false.
- `centroidForPlz`: bekannt → Tupel, unbekannt → `null`.

### 9.2 Unit — Filter/Ranking (`app/src/lib/data.test.ts`)
- **Kategorie:** `{category:'Honig'}` liefert nur Höfe mit `'Honig'`; `{category:'all'}` alle.
- **Distanz-Ranking:** mit bekannter PLZ + `sort:'distance'` ⇒ Liste monoton steigend nach `distanceKm`.
- **Name-Ranking:** `sort:'name'` ⇒ alphabetisch (Umlaute korrekt einsortiert).
- **Unbekannte PLZ:** gültige, unbekannte PLZ ⇒ `distanceKm === null` für alle + Name-Sortierung (kein Pseudo-Distanz-Ranking).
- **Zero-State-Filter:** Kategorie ohne Treffer ⇒ leeres Array (kein Wurf).
- **Stabilität:** gleicher Filter ⇒ identische Reihenfolge (Determinismus).

### 9.3 Komponente (`app/src/components/*.test.tsx`)
- **FarmCard:** rendert Name/Adresse; Distanz nur bei `distanceKm != null`; `Enter`/`Space` und Klick lösen `onOpen(farm)` aus; `aria-label` korrekt.
- **AvailabilityBadge:** jedes Enum → korrektes Label + Klasse; Default-Label = Status-Text.
- **FinderPage:** Skeleton während Laden → danach Grid; 0 Treffer → Zero-State-Text; unbekannte PLZ → Hinweiszeile; PLZ-Eingabe filtert Nicht-Ziffern.
- **FarmDrawer:** `out`-Produkte fehlen in der Produkt-Auswahl; leerer Bestand → „Aktuell ist nichts verfügbar."; `Escape` schließt.

### 9.4 Integration — Datenquelle (`app/src/lib/data.integration.test.ts`)
- **Seed-Pfad:** ohne Supabase-Env ⇒ `listFarms` liefert `SEED_FARMS` gefiltert/sortiert.
- **Supabase-Fehler ⇒ Fallback:** gemockter `from().select()`-Fehler ⇒ Rückfall auf Seed (kein Wurf), `console.warn` ausgelöst.
- **Mapping:** `mapFarm` übersetzt `snake_case`-Zeile (inkl. eingebetteter `products`) korrekt auf den `Farm`-Typ.

### 9.5 RLS / Isolation (`app/supabase/tests/` — gegen lokale Supabase/`psql`)
- **Public Read:** `anon` liest aktive `farms`/`products` (Finder anonym nutzbar).
- **Soft-Delete:** Hof mit `deleted_at` ⇒ für `anon`/`authenticated` **nicht** sichtbar; dessen Produkte ebenfalls nicht.
- **Write-Sperre (deny-by-default):** `anon` `INSERT/UPDATE` auf `farms`/`products` ⇒ verweigert.
- **Cross-Org:** Erzeuger A kann Hof von Org B **nicht** schreiben (`farms_owner_write` greift). *(Kein grüner Merge ohne diesen Isolationstest — `AGENTS.md`.)*

### 9.6 E2E (`app/e2e/finder.spec.ts`, Playwright)
- Käufer öffnet Finder (anonym) → gibt bekannte PLZ ein → sieht distanz-sortierte Liste mit „… km".
- Wählt Kategorie → Liste filtert → wählt eine Karte (Tastatur) → Drawer öffnet → reserviert verfügbares Produkt → Bestätigung sichtbar.
- Unbekannte PLZ → Hinweistext erscheint, Liste alphabetisch.
- Seltene-Kategorie-Kombination ohne Treffer → Zero-State sichtbar.

### 9.7 Verifikation vor Abschluss (Pflicht)
- `cd app && npm run build` (Typecheck strict + Vite-Build) **grün**.
- Konsole sauber im Dev-Run (`npm run dev`, Port 5409): keine `TypeError`/401-Schleifen; bei nicht-konfiguriertem Supabase exakt **ein** erwartetes `console.warn` (Seed-Fallback).
- Verdrahtungs-Check der Kette aus §6 manuell durchlaufen (Endpoint/Quelle → DOM → Action → alle Zustände).

---

## 10 · Verweise
- Reservierung/Abholung: `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md`
- Produktverfügbarkeit (Erzeuger-Selbstpflege): `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md`
- Saison-Radar: `docs/spezialmodule/SAISON_RADAR.md`
- USP SB-Bezahlung: `docs/spezialmodule/SB_BEZAHLUNG_USP.md`
- Datenmodell + RLS: `docs/DATABASE_MODEL.md` · `app/supabase/migrations/0001_core.sql`
- Statusmaschinen: `docs/CORE_BUSINESS_STATE_MACHINES.md`
- Tenant-Isolation: `docs/security/TENANT_ISOLATION_MODEL.md`
- Bauplan/Wellen: `PHASEN.md` (WAVE_04, Phase 4 Track B) · Status: `docs/releases/PHASE_STATUS.md`
- ADRs: `docs/adr/0001-stack-react-supabase-cloudflare.md` · `docs/adr/0002-app-architektur-standalone-first.md`
