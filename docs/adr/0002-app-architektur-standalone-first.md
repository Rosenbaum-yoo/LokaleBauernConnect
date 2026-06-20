# ADR 0002 — App-Architektur: standalone-first, Backend-agnostische Datenschicht

- **Status:** Akzeptiert
- **Datum:** 2026-06-19
- **Entscheider:** Claude (im Auftrag, reversibel — Owner kann umentscheiden)

## Kontext

Das Playbook setzt einen geteilten `packages/core`+`ui`-Kern voraus, der als gemeinsames Paket **noch nicht existiert** (Schwester-Plattformen kopieren das Muster pro Projekt). Primärziel ist „schnellstmöglich an den Markt". Es gab keine Owner-Antwort auf die Architekturfrage → pragmatische, **reversible** Entscheidung nötig, ohne Tempo zu opfern.

## Entscheidung

1. **Standalone-first:** Die Plattform-App entsteht eigenständig in `app/` (React+Vite+TS). Sie ist so strukturiert (`src/lib`, `src/components`, `src/pages`), dass sie später ohne Rewrite in einen geteilten Workspace (`packages/core`+`ui`) **absorbiert** werden kann, sobald ≥2 Plattformen genug teilen.
2. **Backend-agnostische Datenschicht (`src/lib/data.ts`):** Eine API, zwei Quellen — Supabase (sobald `VITE_SUPABASE_*` gesetzt) **oder** Seed-Daten (Fallback). Die UI ist quellenunabhängig; der Umstieg ist reine Konfiguration. Reservierung schreibt nach Supabase bzw. lokal (kein Datenverlust).
3. **Design-System dupliziert, nicht abstrahiert (noch):** `app/src/styles/theme.css` spiegelt die Editorial-Tokens der Landing. Erst bei echtem Mehrfachbedarf nach `packages/ui` heben (keine verfrühte Abstraktion).

## Konsequenzen

**+** Sofort lauffähig & deploybar ohne Backend; kein Warten auf Kern-Monorepo; UI testbar mit realistischen Daten; Supabase-Umstieg = Env + Tabellen.
**+** Verifiziert: strict-TS-Build grün, App rendert, Finder + Reservierung end-to-end (lokaler Fallback).
**−** Vorübergehende Duplizierung (Design-Tokens, später Auth/Billing aus Kern). Bewusst akzeptiert; Absorption ist eingeplant.
**−** Seed-Geo deckt nur Beispielregionen ab → unbekannte PLZ ohne Distanz (ehrlich kommuniziert in der UI).

## Folgeaufgaben

- Bei Kern-Aufbau: `app/` in Workspace ziehen, `theme.css`→`packages/ui`, Auth/Billing aus `packages/core`.
- Supabase-Tabellen `farms`, `products`, `reservations` (+ RLS) — Schema = `src/lib/types.ts`.
- Echter PLZ-/Geocoding-Datensatz (Edge Function) statt Seed-Zentroide.
- Interaktive Karte (Leaflet/MapLibre, OSM) als nächste Finder-Ausbaustufe.
