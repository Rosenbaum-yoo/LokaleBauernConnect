# WAVE_10 — Premium UX (Editorial-Politur · Mobile/PWA · Zustände · Barrierearmut)

> **Phase:** 1 — Fundament & Kernprodukt. **Prio:** P1 (Launch-Politur; folgt nach WAVE_02–09, parallelisierbar mit WAVE_11 DB-Härtung). **Voraussetzung:** Kernflow Finder → Detail → Reservierung steht end-to-end (WAVE_04), Auth/Turnstile (WAVE_06) und Billing-Vorbereitung (WAVE_09) sind im Tree.
> **Ausführungsagent:** Claude (gesamter Stack) + Subagenten **frontend-design-guardian** (Token-/Komponenten-Treue, keine neuen Farben/Fonts), **i18n-content-spezialist** (Mikrocopy im Editorial/Regional-Ton, Trust-/Leer-Texte), **performance-cost-optimizer** (Bundle, LCP/CLS, kein teurer Pfad), **qa-tester** (Zustands- & A11y-Gate), **security-auditor** read-only (kein neuer Origin in CSP/SW-Scope ohne aktiven Pfad).
> **Owner-Freigabe erforderlich für:** jeden `git commit`/`push`, das Setzen produktiver `connect-src`/`frame-src`-Origins in `_headers` (erst zum jeweiligen Go-Live des Pfades). Bis dahin ist diese Welle **repo-lokal, reversibel** (Komponenten, CSS-Tokens, Manifest, Service-Worker, Tests).
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/WAVE_10_premium_ux.md`, read-only) auf **React+Vite+TS · Supabase · Cloudflare · Stripe**. Zentraler Unterschied: TempConnect poliert ein gewachsenes Multi-Seiten-Portal; **hier** veredeln wir eine fokussierte, neu gebaute Editorial-SPA (`app/src/`) — die Politur ist additiv auf vorhandene, kanon-konforme Bausteine (`theme.css`, `FinderPage`, `FarmCard`, `FarmDrawer`, `FarmMap`, `AvailabilityBadge`), nicht ein Aufräumen von Wildwuchs.

---

## Ziel

LokaleBauernConnect soll sich auf **jedem Gerät** wie ein **kuratiertes Magazin mit Werkzeug-Charakter** anfühlen — schnell, ruhig, vertrauenswürdig, ohne dass je ein Bildschirm „leer", „kaputt" oder „lädt ins Nichts" wirkt. Konkret, messbar, lückenlos:

1. **Editorial-Politur (Premium-Wahrnehmung).** Konsistente Typo-Skala, Rhythmus, Fokus-/Hover-/Active-Zustände, Mikro-Interaktionen und Mikrocopy strikt aus dem Design-System (`app/src/styles/theme.css`, Editorial-Skin). Kein hardcodierter Farbwert, kein Deko-Emoji in produktiver UI, kein „technischer" Default-Text. New-York-Agentur-Niveau in jeder Zeile sichtbaren Texts.
2. **Mobile-First + installierbare PWA.** Touch-taugliche Trefferflächen (≥ 44×44 px), sichere Insets (Notch), kein horizontales Scrollen ab 320 px, Karten-/Drawer-/Suchleisten-Layout auf Smartphone perfektioniert. **Installierbar** (Web-App-Manifest), **offline-tolerant** für die App-Shell (Service Worker mit konservativer Cache-Strategie), App-Icons/Theme-Color editorial.
3. **Drei kanonische Zustände pro datentragender Fläche — lückenlos.** Für **jede** Liste/Detail/Aktion existiert real auslösbar: **Lade**-Zustand (Skeleton, kein Spinner-ins-Leere), **Leer**-Zustand (Zero-State mit Kontext + nächstem Schritt, **kein** Fehler), **Fehler**-Zustand (verständlich, deutsch, mit Wiederholen-Aktion). Das ist die UX-Spiegelung von Produktionspfeiler 2 (Zero-State statt Error).
4. **Barrierearmut (WCAG 2.2 AA als Zielkorridor).** Tastatur-Vollbedienbarkeit, sichtbarer Fokus überall, korrekte ARIA-Rollen/-Labels, Fokus-Falle + Fokus-Rückgabe im Drawer, Screenreader-Live-Regionen für asynchrone Ergebnisse, Kontrast ≥ AA, `prefers-reduced-motion` respektiert, semantische Landmarks.

„Premium" heißt hier nicht „mehr Effekte", sondern **Verlässlichkeit + Ruhe + Zugänglichkeit auf jedem Gerät**. Diese Welle macht aus „funktioniert" → „fühlt sich teuer, durchdacht und für alle benutzbar an".

---

## Ist-Zustand (repo-genau geprüft)

| Fakt | Stand | Konsequenz für diese Welle |
|---|---|---|
| `app/src/styles/theme.css` | Editorial-Tokens vollständig (`--paper`, `--forest`, `--gold`, `--wine`, Semantik `--ok/--low/--soon/--out`, `--ease`, Radien, Schatten). `:focus-visible` auf `.lbc-btn`/`.farm-card` vorhanden. `@media (max-width:680px)` deckt Grid/Searchbar/Reserve. `.skeleton`+`@keyframes sk` und `.state` (Empty) existieren. | **Fundament steht** — erweitern, nicht ersetzen: Reduced-Motion-Block, `:focus-visible` flächendeckend (Inputs/Selects/Close/View-Toggle/Drawer), Safe-Area-Insets, `.sr-only`, `.state--error`-Variante, Touch-Mindesthöhen. |
| `app/src/pages/FinderPage.tsx` | Lade-Zustand (6× `.skeleton`) ✅, Leer-Zustand (`.state` „Keine Höfe für diese Auswahl") ✅. **Fehler-Zustand fehlt** — `listFarms(...).then(...)` hat **kein** `.catch`; bei Fehler bleibt `loading=true` → Skeleton-Endlosschleife. `finder-meta__count` zeigt `Lädt …` als Text (kein `aria-live`). | **Lücke schließen:** echten Fehlerpfad + `.state--error` mit „Erneut versuchen", `aria-live="polite"` auf die Ergebnis-Zusammenfassung, `aria-busy` während Laden. |
| `app/src/components/FarmDrawer.tsx` | `role="dialog"`, `aria-modal`, Escape-Close, Reset bei Wechsel, Reservierungs-Formular mit `idle/sending/ok/err`-Status, `reserve-msg--ok/--err`. **Kein Fokus-Trap, keine Fokus-Rückgabe** an den auslösenden Trigger, Status-Meldungen **ohne** `role="status"`/`aria-live`. `✕`/`★` als Text-Glyphen (`aria-hidden` teils gesetzt). | **A11y-Härtung:** Fokus beim Öffnen in den Drawer, Tab-Zyklus innerhalb halten, beim Schließen Fokus zurück auf die Karte; `reserve-msg` als Live-Region; `<body>`-Scroll-Lock bei offenem Drawer. |
| `app/src/components/FarmCard.tsx` / `FarmMap.tsx` / `AvailabilityBadge.tsx` | Karten als Editorial-Tiles, Map via `react-leaflet` (OSM-Tiles, in CSP `img-src` erlaubt). | Karten **tastatur-aktivierbar** machen (Enter/Space), `FarmMap` braucht eigenen **Lade-Skeleton** (Tiles laden async) + Leer-/A11y-Hinweis (Karten sind für SR schwer — Listen-Fallback-Hinweis). |
| `app/index.html` | `lang="de"`, `meta viewport`, `theme-color #faf7ee`, `description`. **Kein** `manifest`-Link, **keine** Apple-Touch-/Maskable-Icons, **kein** SW-Registration. | PWA-Grundausstattung ergänzen (Manifest-Link, Icons, SW-Registrierung — additiv, ohne bestehende Tags zu brechen). |
| `app/public/_headers` | CSP: `default-src 'self'`, `connect-src 'self' https://*.supabase.co`, `img-src` inkl. OSM-Tiles + Supabase, `script-src 'self'`, `frame-ancestors 'none'`. | SW + Manifest laufen unter `'self'` → **CSP-konform ohne Änderung**. Stripe-Origins (`frame-src`/`connect-src https://*.stripe.com`) erst **mit** SB-/Billing-Go-Live ergänzen (kein toter CSP-Eintrag). |
| `app/public/` | nur `_headers`. **Keine** `manifest.webmanifest`, **kein** `sw.js`, **keine** Icons. | Neu anlegen (`manifest.webmanifest`, `icon-192/512/maskable`, `apple-touch-icon`, `sw.js`, `robots.txt` optional). |
| `app/package.json` | `build = tsc --noEmit && vite build`; deps: react 18, leaflet, supabase-js. **Kein** Test-Runner, **kein** Lighthouse/axe-Tooling. | Test-/Audit-Tooling additiv (Vitest + Testing-Library + jest-axe für A11y-Unit; Lighthouse-CI optional via npx). Kein schweres Framework, kein Bundle-Aufblähen für Prod. |
| `app/vite.config.ts` | `outDir: 'dist'`, `sourcemap:false`, Port 5409. | SW + Manifest landen über `public/` automatisch in `dist/` (Vite kopiert `public/` 1:1). Kein Plugin nötig → keine neue Build-Abhängigkeit, kein Lock-in. |

> **Abweichung zum Blueprint dokumentiert:** TempConnect nutzt teils ein PWA-Plugin (`vite-plugin-pwa`/Workbox). **Bewusste Entscheidung hier:** handgeschriebener, minimaler Service Worker (App-Shell + Stale-While-Revalidate für statische Assets, **Network-First, niemals Cache** für `*.supabase.co`-Daten). Begründung (Wirtschaftlichkeit + Sicherheit, §0.3/§0.7): keine neue Build-Dependency, voller Kontrolle über Cache-Scopes, **keine versehentliche Cachung authentifizierter/mandantengebundener Daten** (RLS-Wahrheit darf nie aus dem SW kommen). Skaliert auf alle 14 Imperium-Plattformen als wiederverwendbares Muster.

---

## Aufgaben

### 1. Editorial-Politur & Design-System-Erweiterung (P1, repo-lokal)

**1a. `app/src/styles/theme.css` additiv erweitern** — neue, kanon-konforme Bausteine; bestehende Tokens unverändert nutzen:

```css
/* ── WAVE_10: Barrierearmut & Premium-Politur ───────────────── */

/* Screenreader-only (für Live-Regionen & versteckte Labels) */
.sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
  clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.sr-only-focusable:focus,.sr-only-focusable:focus-visible{ position:static; width:auto; height:auto;
  margin:0; overflow:visible; clip:auto; white-space:normal; }

/* Skip-Link — erster Tab-Stop, springt zum Hauptinhalt */
.skip-link{ position:absolute; left:12px; top:-44px; z-index:100; padding:10px 16px;
  background:var(--forest); color:var(--paper); border-radius:var(--r-md); font-weight:600;
  transition:top .15s var(--ease); }
.skip-link:focus{ top:12px; outline:2px solid var(--gold); outline-offset:2px; }

/* Fokus flächendeckend sichtbar (ergänzt vorhandenes :focus-visible auf btn/card) */
.lbc-input:focus-visible,.lbc-select:focus-visible,.drawer__close:focus-visible,
.view-toggle button:focus-visible,a:focus-visible{ outline:2px solid var(--forest); outline-offset:2px; }

/* Touch-Mindestgrößen (WCAG 2.2 Target Size) */
@media (pointer:coarse){
  .lbc-btn,.view-toggle button,.drawer__close,.lbc-select,.lbc-input{ min-height:44px; }
}

/* Fehler-Zustand als Schwester von .state (Empty) */
.state--error{ border-style:solid; border-color:var(--low-bd); background:var(--low-bg); color:var(--ink); }
.state__actions{ margin-top:16px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }

/* Safe-Area-Insets (Notch / iOS Home-Indicator) */
.app-header__inner{ padding-left:max(0px,env(safe-area-inset-left)); padding-right:max(0px,env(safe-area-inset-right)); }
.drawer{ padding-bottom:env(safe-area-inset-bottom); }

/* Map-Skeleton (Tiles laden async) */
.map-skeleton{ height:clamp(420px,60vh,620px); border-radius:var(--r-lg); border:1px solid var(--line);
  background:linear-gradient(100deg,var(--cream-warm),var(--cream),var(--cream-warm));
  background-size:200% 100%; animation:sk 1.3s var(--ease) infinite; }

/* Reduced Motion: alle Bewegungen entschärfen, ohne Funktion zu verlieren */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{ animation-duration:.001ms !important; animation-iteration-count:1 !important;
    transition-duration:.001ms !important; scroll-behavior:auto !important; }
  .skeleton,.map-skeleton{ animation:none; }
}
```

> Anker: AGENTS.md „keine hardcodierten Farben (Design-System-Tokens)". Jeder neue Wert oben nutzt **bestehende** `--*`-Tokens; einzig pixelgenaue A11y-Maße (44 px, 1 px) und `env()`-Insets sind hartkodiert — das ist W3C-Spec, kein Design-Token. **frontend-design-guardian** prüft: kein neuer Farb-/Font-Wert eingeführt.

**1b. Typo-Rhythmus & Editorial-Detail-Pass.** Konsistente vertikale Abstände prüfen (Serife für Headlines, Mono-Eyebrows, Sans-Body sind gesetzt). Tabellarische Zahlen (Preise, Distanz, Mengen) auf `font-variant-numeric: tabular-nums` für ruhige Spalten:

```css
.farm-card__dist,.prod-row__meta,.finder-meta__count,.reserve-box .lbc-input[type=number]{ font-variant-numeric:tabular-nums; }
```

**1c. Mikrocopy-Pass (i18n-content-spezialist).** Alle sichtbaren Texte im Editorial/Regional-Ton, verkaufsstark aber ruhig, **keine Deko-Emojis**, Vermittler-Disclaimer konsistent. Zu prüfende/veredelnde Stellen (real im Code): Finder-Hero-Subline, `finder-meta__note`-Varianten, Zero-State-Text, Reservierungs-Bestätigung, neuer Fehlertext, neue PWA-/Offline-Hinweise. Disclaimer-Anker: Footer `.disclaimer-line` (Vermittler, kein Eigenverkauf) bleibt durchgängig sichtbar.

### 2. Drei Zustände lückenlos — der Pflicht-Kern (P0 innerhalb dieser Welle)

**2a. Fehlerpfad in `FinderPage.tsx` schließen** (heute fehlt `.catch` → Skeleton-Endlosschleife). Echter Fehler-State + Wiederholen, plus A11y-Live-Region:

```tsx
const [error, setError] = useState(false)

useEffect(() => {
  let alive = true
  setLoading(true); setError(false)
  const filter: FarmFilter = { plz, category, sort }
  listFarms(filter)
    .then((res) => { if (alive) { setFarms(res); setLoading(false) } })
    .catch(() => { if (alive) { setError(true); setLoading(false) } })
  return () => { alive = false }
}, [plz, category, sort, reloadKey])   // reloadKey = useState-Counter für „Erneut versuchen"
```

```tsx
{/* Ergebnis-Zusammenfassung als Live-Region für Screenreader */}
<div className="finder-meta__count" aria-live="polite" aria-busy={loading}>
  {loading ? 'Höfe werden geladen …' : error ? 'Laden fehlgeschlagen' : `${farms.length} ${farms.length === 1 ? 'Hof' : 'Höfe'} gefunden`}
</div>

{/* Render-Reihenfolge: loading → error → empty → map/list */}
{loading ? (
  <div className="farm-grid" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => <div className="skeleton" key={i} />)}
  </div>
) : error ? (
  <div className="state state--error" role="alert">
    <h3>Die Höfe konnten nicht geladen werden</h3>
    <p>Das lag wahrscheinlich an der Verbindung. Versuch es bitte erneut.</p>
    <div className="state__actions">
      <button type="button" className="lbc-btn lbc-btn--primary" onClick={() => setReloadKey(k => k + 1)}>Erneut versuchen</button>
    </div>
  </div>
) : farms.length === 0 ? (
  <div className="state">
    <h3>Keine Höfe für diese Auswahl</h3>
    <p>Versuch eine andere Kategorie{plz ? ' oder eine andere Postleitzahl' : ''} — oder entferne den Filter.</p>
    <div className="state__actions">
      <button type="button" className="lbc-btn" onClick={() => { setCategory('all'); setPlz('') }}>Filter zurücksetzen</button>
    </div>
  </div>
) : view === 'map' ? (
  <FarmMap farms={farms} onOpen={setSelected} />
) : (
  <div className="farm-grid">{farms.map((f) => <FarmCard key={f.id} farm={f} onOpen={setSelected} />)}</div>
)}
```

> Damit erfüllt der Kern-Screen **alle drei** Zustände real auslösbar (Pfeiler 2 + End-to-End-Pflicht). Der Leer-Zustand bekommt einen **handlungsfähigen** Ausgang („Filter zurücksetzen"), keine Sackgasse.

**2b. `FarmMap` Lade-/Leer-Zustand.** Map-Skeleton (`.map-skeleton`) bis Leaflet/Tiles bereit; bei 0 Höfen denselben `.state` wie Liste; SR-Hinweis „Kartenansicht — die vollständige Liste findest du über den Umschalter ‚Liste'."

**2c. Drawer-Reservierung — Zustände sind schon da, A11y nachziehen** (siehe Aufgabe 4): `sending` (Button-Label „Wird reserviert …", disabled) ✅, `ok`/`err` als `reserve-msg` ✅ → nur Live-Region + Fokus-Lenkung ergänzen.

**2d. Globale Fehlergrenze.** `app/src/components/AppErrorBoundary.tsx` (React Error Boundary) um die App in `main.tsx`, damit ein Render-Fehler **nicht** zu weißem Bildschirm führt, sondern zu einer editorialen Fehlerseite mit „Seite neu laden":

```tsx
// AppErrorBoundary.tsx — fängt Render-Fehler ab, zeigt editorialen Fallback statt White-Screen.
import { Component, type ReactNode } from 'react'
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('[LBC] Render-Fehler:', err) } // später Sentry (WAVE_13)
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="wrap" style={{ padding: '80px 0' }}>
        <div className="state state--error" role="alert">
          <h3>Etwas ist schiefgelaufen</h3>
          <p>Bitte lade die Seite neu. Wenn das Problem bleibt, melde dich bei uns.</p>
          <div className="state__actions">
            <button type="button" className="lbc-btn lbc-btn--primary" onClick={() => location.reload()}>Seite neu laden</button>
          </div>
        </div>
      </main>
    )
  }
}
```

### 3. Mobile-First & PWA (P1)

**3a. `app/index.html` additiv ergänzen** (bestehende Tags unangetastet) — Manifest, Icons, iOS-Meta:

```html
<link rel="manifest" href="/manifest.webmanifest"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="default"/>
<meta name="apple-mobile-web-app-title" content="LokaleBauern"/>
```

**3b. `app/public/manifest.webmanifest`** (Theme-Color = `--paper` Hex aus `index.html`, Editorial):

```json
{
  "name": "LokaleBauernConnect — Hofladen-Finder",
  "short_name": "LokaleBauern",
  "description": "Höfe, Hofläden und Erzeuger in deiner Nähe finden, Verfügbarkeit sehen und reservieren.",
  "lang": "de",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#faf7ee",
  "theme_color": "#1f3a2e",
  "categories": ["food", "shopping", "lifestyle"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**3c. Icons** (`app/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`). Markenzeichen = das vorhandene `brand__mark` (Waldgrün-Quadrat mit Glyphe) als Raster, editorial, kein Fremd-Asset. Erzeugung deterministisch über ein im Repo abgelegtes Quell-SVG → PNG-Export (siehe Befehle), damit reproduzierbar und ohne externe CDN-Abhängigkeit (Wirtschaftlichkeit + DSGVO).

**3d. Service Worker `app/public/sw.js`** — App-Shell-Cache, **Network-First & nie-cachen** für API/Supabase:

```js
// LokaleBauernConnect SW — App-Shell offline-tolerant. KEINE Daten-/API-Cachung (RLS-Wahrheit bleibt server-seitig).
const CACHE = 'lbc-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  // Niemals dynamische/auth-/mandantengebundene Daten aus dem SW liefern.
  if (req.method !== 'GET') return
  if (url.origin !== location.origin || url.hostname.endsWith('supabase.co') || url.hostname.endsWith('stripe.com')) return
  // Navigations-Requests: Network-First mit Shell-Fallback (Offline → App-Shell).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }
  // Statische Assets (gleicher Origin): Stale-While-Revalidate.
  e.respondWith(caches.match(req).then((cached) => {
    const net = fetch(req).then((res) => {
      if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
      return res
    }).catch(() => cached)
    return cached || net
  }))
})
```

**3e. SW-Registrierung** (in `app/src/main.tsx`, nur Production, nicht im Dev-Vite):

```tsx
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('[LBC] SW-Registrierung fehlgeschlagen:', e))
  })
}
```

> **Sicherheits-Anker (security-auditor):** SW liefert **niemals** `*.supabase.co`/`*.stripe.com` aus Cache — die `if (… hostname.endsWith …) return`-Guard ist die harte Garantie, dass keine mandantengebundenen oder Zahlungs-Daten offline gecached oder über Sessions hinweg geleakt werden. Cache-Bump = `CACHE`-Versionsstring erhöhen (`lbc-shell-v2`) → alter Cache wird beim Activate gelöscht (kein Stale-Deploy).

**3f. Mobile-Feinschliff** (CSS, vorhandene `@media (max-width:680px)` erweitern): Drawer auf Smartphone `width:100vw` mit sicht­barem Close oben fixiert; Searchbar-Felder full-width (bereits); Karten-Grid 1-spaltig (bereits); `100dvh` statt `100vh` für Drawer-Höhe (mobile Browser-Leiste). Test bei 320 / 360 / 390 / 768 px: kein horizontales Scrollen, keine überlappenden Trefferflächen.

### 4. Barrierearmut — Drawer-Härtung & globale A11y (P0 innerhalb dieser Welle)

**4a. Skip-Link** in `App.tsx` als erster Tab-Stop; `<main id="main-content">` als Sprungziel:

```tsx
<a href="#main-content" className="skip-link">Zum Hauptinhalt springen</a>
```

**4b. `FarmDrawer.tsx` — Fokus-Trap + Fokus-Rückgabe + Scroll-Lock** (heute fehlend):

- Beim Öffnen: Fokus auf den Close-Button (oder ersten fokussierbaren Knoten); `previouslyFocused` merken.
- Tab/Shift+Tab innerhalb des Drawers zyklisch halten (Fokus-Trap).
- Beim Schließen (Escape, Scrim-Klick, ✕): Fokus zurück auf das auslösende Element (die `FarmCard`).
- `<body style="overflow:hidden">` solange offen (kein Hintergrund-Scroll).
- `reserve-msg` → `role="status"` (ok) / `role="alert"` (err) **mit** `aria-live`, damit Screenreader die Reservierungs-Antwort vorliest.

```tsx
// Fokus-Management bei Drawer-Öffnung/-Schließung
const prevFocus = useRef<HTMLElement | null>(null)
useEffect(() => {
  if (!farm) return
  prevFocus.current = document.activeElement as HTMLElement
  document.body.style.overflow = 'hidden'
  closeBtnRef.current?.focus()
  return () => { document.body.style.overflow = ''; prevFocus.current?.focus() }
}, [farm])
```

```tsx
{status === 'ok'  && <div className="reserve-msg reserve-msg--ok"  role="status" aria-live="polite">{msg}</div>}
{status === 'err' && <div className="reserve-msg reserve-msg--err" role="alert"  aria-live="assertive">{msg}</div>}
```

**4c. `FarmCard.tsx` tastatur-aktivierbar** (Karte ist klickbar → muss fokussierbar + per Enter/Space auslösbar sein; `.farm-card:focus-visible` existiert bereits im CSS):

```tsx
<article className="farm-card" role="button" tabIndex={0}
  aria-label={`${farm.name}, ${farm.plz} ${farm.city} — Details öffnen`}
  onClick={() => onOpen(farm)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(farm) } }}>
```

**4d. Formular-A11y** (`FarmDrawer` Reservierung): jedes Feld hat bereits `<label htmlFor>` ✅. Ergänzen: `aria-invalid` + `aria-describedby` bei Validierungsfehler, `aria-required` auf Pflichtfelder, `autoComplete` (`name`, `email`/`tel`) für schnelleres Mobile-Ausfüllen.

**4e. Semantik & Landmarks** prüfen: ein `<h1>` pro Seite (Finder-Hero ✅), `<main>`-Landmark (✅ in FinderPage), `<header>`/`<footer>` als Landmarks, `view-toggle` als `role="group"` mit `aria-label` (✅), `AvailabilityBadge` mit Text-Äquivalent (nicht nur Farbe — Verfügbarkeit darf nicht ausschließlich über Farbe kommuniziert werden, WCAG 1.4.1).

**4f. Reduced-Motion** ist via CSS (Aufgabe 1a) global abgedeckt; zusätzlich Skeleton-Animation dort entschärft.

### 5. Test- & Audit-Tooling (additiv, P1)

```bash
cd app
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom jest-axe @types/jest-axe
```

`app/package.json` → `scripts` ergänzen (bestehende nicht entfernen):

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"a11y": "vitest run --dir src --reporter=verbose"
```

Vitest-Setup (`app/vitest.config.ts` + `app/src/test/setup.ts` mit `@testing-library/jest-dom` + `jest-axe` `toHaveNoViolations`). Tests bewusst auf die **geänderten Pfade** (Pfeiler 6 „Testpflicht pro Feature", §0.2 „gezielt, nicht blind alle"):

- `FinderPage`: rendert Lade-Skeletons; bei Resolve Liste; bei Reject → `.state--error` + funktionierender „Erneut versuchen"; Leer-Zustand bei `[]`.
- `FarmDrawer`: öffnet mit Fokus im Drawer, Escape schließt + gibt Fokus zurück, `jest-axe` → keine Violations; Pflichtfeld-Validierung setzt `aria-invalid`.
- `FarmCard`: Enter/Space löst `onOpen` aus.
- A11y-Smoke: `axe(render(<FinderPage/>))` → 0 Violations (Lade- und Daten-Zustand).

Lighthouse/PWA-Audit (kein Dauer-Dependency, on-demand via `npx`):

```bash
npm run build && npm run preview &   # Port aus vite preview
npx --yes @lhci/cli autorun --collect.url=http://localhost:4173 \
  --assert.assertions.categories:accessibility=0.95 \
  --assert.assertions.categories:pwa=0.9 --assert.assertions.categories:best-practices=0.9 || true
```

### 6. Verifikation (End-to-End-Verdrahtungs-Check)

Manuell + automatisiert prüfen, dass **jede** Fläche alle Zustände real zeigt und tastatur-/SR-bedienbar ist (Pfeiler 2 + 7, Kanon „End-to-End-Pflicht"). Checkliste in Acceptance.

---

## Konkrete Befehle (Reihenfolge)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Test-/A11y-Tooling (Aufgabe 5) — additiv, dev-only
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom jest-axe @types/jest-axe

# 2) PWA-Icons deterministisch aus Marken-SVG erzeugen (Aufgabe 3c)
#    Quelle: app/public/brand-mark.svg (Waldgrün-Quadrat + Glyphe, Editorial). sharp = dev-only.
npm i -D sharp
node scripts/gen-icons.mjs        # schreibt icon-192/512/maskable-512/apple-touch-icon nach public/

# 3) Typecheck + Build (PWA-Assets landen via public/ automatisch in dist/)
npm run typecheck
npm run build                     # erwartet: grün; dist/ enthält manifest.webmanifest + sw.js + icons

# 4) Zustands-/A11y-Tests (Aufgabe 5)
npm run test                      # erwartet: alle grün, jest-axe 0 Violations

# 5) PWA/A11y-Audit lokal (on-demand, nicht in der Standard-Pipeline)
npm run preview &                 # bedient dist/ (Default Port 4173)
npx --yes @lhci/cli autorun --collect.url=http://localhost:4173 \
  --assert.assertions.categories:accessibility=0.95 \
  --assert.assertions.categories:pwa=0.9 --assert.assertions.categories:best-practices=0.9 || true

# 6) Manuelle mobile Verifikation (Dev) — DevTools Device-Toolbar 320/360/390/768 px
npm run dev                       # http://localhost:5409  — kein horizontales Scrollen, Tab-Reihenfolge, Fokus sichtbar

# 7) SW-Offline-Probe: build+preview, dann Netzwerk in DevTools auf „Offline" → App-Shell lädt,
#    Daten zeigen Fehler-Zustand mit „Erneut versuchen" (KEIN White-Screen, KEINE gecachten Fremddaten)

# 8) Hygiene-Quergegencheck (WAVE_01-Gate bleibt grün — keine Secrets/Verbotenes durch neue Files)
bash scripts/release-hygiene-check.sh   # erwartet: HYGIENE-GATE: PASS
```

> **Hinweis:** `sharp` und `@lhci/cli` sind **dev-/CI-only** bzw. on-demand (`npx`) — sie landen **nicht** im Frontend-Bundle und vergrößern das Auslieferungs-Artefakt nicht. SW + Manifest + Icons sind statische Assets unter `public/` und damit Teil von `dist/` (gewollt).

---

## Acceptance (Akzeptanzkriterien)

**Zustände (lückenlos)**
- [ ] `FinderPage` zeigt real auslösbar: **Lade** (Skeleton), **Leer** (Zero-State mit „Filter zurücksetzen"), **Fehler** (`.state--error` mit „Erneut versuchen", der erneut lädt). Kein Pfad endet im Endlos-Skeleton.
- [ ] `FarmMap` hat eigenen Lade-Skeleton und denselben Leer-Zustand wie die Liste.
- [ ] `AppErrorBoundary` fängt Render-Fehler → editorialer Fallback statt White-Screen.
- [ ] Reservierung: `sending`/`ok`/`err` sichtbar **und** als SR-Live-Region angesagt.

**Mobile / PWA**
- [ ] Bei 320–768 px: kein horizontales Scrollen; Trefferflächen ≥ 44 px; Drawer voll bedienbar; Safe-Area-Insets greifen.
- [ ] App ist **installierbar**: gültiges `manifest.webmanifest` (Name, Icons 192/512/maskable, `display:standalone`, Theme-/Background-Color als Editorial-Tokens).
- [ ] Service Worker registriert (nur PROD), App-Shell lädt **offline**; `*.supabase.co`/`*.stripe.com` werden **nie** gecached (verifiziert im Offline-Test).
- [ ] Lighthouse: **PWA ≥ 0.9**, **Best-Practices ≥ 0.9**.

**Barrierearmut**
- [ ] Tastatur-Vollbedienung: Skip-Link → Suche → Karten (Enter/Space) → Drawer (Fokus-Trap) → Schließen (Fokus zurück auf Karte). Fokus überall sichtbar.
- [ ] Drawer: `role="dialog"`/`aria-modal`, Fokus-Trap, Fokus-Rückgabe, `<body>`-Scroll-Lock, Status-Meldungen als Live-Region.
- [ ] Verfügbarkeit nicht nur über Farbe (Text-Äquivalent in `AvailabilityBadge`).
- [ ] `prefers-reduced-motion` entschärft alle Animationen.
- [ ] `jest-axe` → **0 Violations** auf `FinderPage` (Lade + Daten) und `FarmDrawer` (offen). Lighthouse **Accessibility ≥ 0.95**.

**Editorial / Hygiene**
- [ ] Kein hardcodierter Farbwert, kein neuer Font, kein Deko-Emoji in produktiver UI (frontend-design-guardian bestätigt).
- [ ] Mikrocopy deutsch, Editorial/Regional-Ton; Vermittler-Disclaimer durchgängig sichtbar.
- [ ] `npm run typecheck` + `npm run build` grün; `bash scripts/release-hygiene-check.sh` weiterhin **PASS** (keine neuen Secrets/Verbotenen Artefakte).
- [ ] CSP unverändert ausreichend (SW/Manifest/Icons unter `'self'`); kein toter Stripe-Origin vor Go-Live ergänzt.

---

## Gate (blockierend)

> **WAVE_10-Premium-UX-Gate** muss grün sein, bevor die Phase-2-Gates **E (Performance)** und **F (Smoke)** als „launch-poliert" gelten. Es speist Phase-2-Gate E (UX-Performance) und ist Voraussetzung für die Marktstart-Politur (§0.1 Lückenlosigkeit).

```
GATE WAVE_10:
  ✅ Zustands-Trias komplett   (jede datentragende Fläche: Lade · Leer · Fehler — real auslösbar)
  ✅ Kein toter Pfad / White-Screen  (ErrorBoundary + Fehler-State + Retry verdrahtet)
  ✅ PWA installierbar + offline-tolerant  (Manifest valide, SW aktiv, KEINE Fremd-/Daten-Cachung)
  ✅ Mobile 320–768 px sauber  (kein H-Scroll, Targets ≥ 44px, Safe-Area)
  ✅ A11y: jest-axe 0 Violations · Tastatur-Vollbedienung · Fokus-Trap+Rückgabe · Live-Regionen
  ✅ Lighthouse: A11y ≥ .95 · PWA ≥ .9 · Best-Practices ≥ .9
  ✅ Design-System-Treue (keine neuen Farben/Fonts, keine Deko-Emojis)  ·  Hygiene-Gate PASS
```

**Stop-Regeln in dieser Welle:**
- Stripe-/SB-Payment-UI soll in dieser Welle live geschaltet werden → **STOP**: CSP-Origins (`frame-src`/`connect-src https://*.stripe.com`) erst **mit** dem jeweiligen Go-Live (Owner-Freigabe, eigene Welle/Track A). Kein toter CSP-Eintrag, kein Stripe-iFrame ohne aktiven Pfad.
- A11y-Anforderung kollidiert mit Editorial-Optik (z. B. Kontrast eines Tokens reicht nicht für AA) → **STOP**, Token-Anpassung mit frontend-design-guardian abstimmen (Token ändern, nicht hardcoden).
- SW würde authentifizierte/mandantengebundene Antworten cachen → **STOP**: niemals cachen; Guard greift, Architektur prüfen.
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_10 — Premium UX
- Geändert:
  - app/src/styles/theme.css (+ A11y/Reduced-Motion/Safe-Area/.state--error/.sr-only/.skip-link/.map-skeleton/Touch-Targets)
  - app/src/pages/FinderPage.tsx (Fehler-State + Retry + aria-live/aria-busy; Leer-Zustand mit Aktion)
  - app/src/components/FarmDrawer.tsx (Fokus-Trap + Fokus-Rückgabe + Scroll-Lock + Live-Regionen + Formular-A11y)
  - app/src/components/FarmCard.tsx (tastatur-aktivierbar, aria-label)
  - app/src/components/FarmMap.tsx (Map-Skeleton + Leer-/SR-Hinweis)
  - app/src/components/AppErrorBoundary.tsx (NEU)  ·  app/src/App.tsx (Skip-Link, ErrorBoundary, #main-content)
  - app/src/main.tsx (SW-Registrierung, nur PROD)
  - app/index.html (Manifest-Link, Apple-Touch/iOS-Meta — additiv)
  - app/public/manifest.webmanifest (NEU) · app/public/sw.js (NEU) · app/public/brand-mark.svg (NEU)
  - app/public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png (NEU, deterministisch erzeugt)
  - app/scripts/gen-icons.mjs (NEU) · app/vitest.config.ts (NEU) · app/src/test/setup.ts (NEU) + Tests
  - app/package.json (scripts: test, test:watch, a11y; devDeps: vitest/testing-library/jest-axe/sharp)
- Tests:
  - npm run typecheck + npm run build → grün
  - npm run test → grün (FinderPage Zustände, FarmDrawer Fokus/Escape, FarmCard Keyboard, jest-axe 0 Violations)
  - Lighthouse: A11y <…> / PWA <…> / Best-Practices <…>
  - Offline-Probe: App-Shell lädt, Daten → Fehler-State; keine Fremd-/Daten-Cachung bestätigt
  - bash scripts/release-hygiene-check.sh → PASS
- Risiken: keine Laufzeit-/Datenrisiken (UI/PWA/CSS/Tests additiv); SW konservativ (App-Shell only),
  Cache-Bump via CACHE-Versionsstring; Stripe-CSP-Origins bewusst noch nicht ergänzt (Go-Live-gebunden).
- Nächste Welle: WAVE_11 (DB-Härtung: Indizes/Pagination/Query-Performance) — parallelisierbar; danach WAVE_12 QA.

## A11y-/PWA-Report
- jest-axe Violations vor/nach: <…> → 0
- Lighthouse-Scores (A11y/PWA/BP): <…>
- Manuell geprüfte Breakpoints (320/360/390/768): <…>
- Tastatur-Pfad vollständig (Skip→Suche→Karte→Drawer→Close→Fokus zurück): ja/nein
- Offline-Test (Shell lädt / Fremddaten NICHT gecached): ja/nein
```

---

## Übergang

→ Erst wenn das **WAVE_10-Premium-UX-Gate grün** ist, gilt der Kernflow als **launch-poliert** und speist Phase-2-Gate **E (Performance)** + **F (Smoke)**. Parallel/danach: WAVE_11 (DB-Härtung) und WAVE_12 (QA-Tests, die diese A11y-/Zustands-Tests in die volle Suite aufnehmen).

> **Tracker-Pflicht nach Abschluss:** `docs/releases/PHASE_STATUS.md` Zeile „WAVE_10 Premium UX" auf den realen Stand setzen und `MASTER_INDEX.md` (Abschnitt 7 · `finalization/WAVE_00…15`) entsprechend aktualisieren. Wiederverwendbare Muster (Zustands-Trias-Komponente, Drawer-Fokus-Trap, konservativer App-Shell-SW, jest-axe-Gate) als Imperium-Beschleuniger nach `.claude/memory/patterns/` verdichten — sie gelten für alle 14 Plattformen.
