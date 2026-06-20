# CLAUDE_RECS — Persistente Empfehlungen (LokaleBauernConnect)

> Claude's laufende Empfehlungsliste. Am Session-Ende abrufen/aktualisieren. Format pro Eintrag: Prio · Fakt · Aktion · Aufwand · Nutzen.

## PRIO 1 — Marktstart-Blocker / Fundament
- **P1-A · Datenmodell + RLS (WAVE_02).** Fakt: App läuft auf Seed-Daten. Aktion: Supabase-Tabellen `farms/products/availability/reservations` + RLS deny-by-default + Isolationstest. Aufwand: M. Nutzen: hoch (Geld/Daten-Fundament).
- **P1-B · Supabase/Cloudflare Go-Live.** Fakt: nur lokal. Aktion: Supabase-Projekt (EU) + Cloudflare Pages Deploy + Domain + Security-Header. Aufwand: M. Nutzen: hoch (spielbar online). *Owner-Freigabe: Account/Kosten/Domain.*
- **P1-C · Auth + Rollen (WAVE_03/06).** Käufer/Erzeuger/Staff trennen. Aufwand: M. Nutzen: hoch.

## PRIO 2 — USP & Premium
- **P2-A · SB-Bezahl-USP (Phase 4 Track A).** QR-Stand-Payment via Stripe. Aufwand: L. Nutzen: sehr hoch (Differenzierung + Geldfluss).
- **P2-B · Interaktive Karte (Track B).** Leaflet/OSM. Aufwand: M. Nutzen: hoch (Finder-Kern).
- **P2-C · Erzeuger-Self-Service Verfügbarkeit (Track D).** Mobile Pflege. Aufwand: M.

## PRIO 3 — Skalierung & Politur
- Customer-Gates 10/50/100/300, Performance (Indizes/Pagination), Observability, Legal/DSGVO.

## Erledigt
- ✅ App-Fundament (React/Vite/TS, Editorial-Design), Hofladen-Finder + Reservierung end-to-end (Seed). (2026-06-19)
- ✅ Governance-Kanon (CLAUDE/AGENTS/PHASEN/MASTER_INDEX/PHASE_STATUS). (2026-06-19)
