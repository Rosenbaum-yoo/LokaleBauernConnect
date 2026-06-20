# LokaleBauernConnect

> **Regional direkt vom Hof — finden, reservieren, abholen.**
> Plattform für regionale Lebensmittel direkt von Bauern, Hofläden und Erzeugern. Teil des ConnectCore-Imperiums (#09, Welle 1).

## Status (2026-06-20)

Produkt-MVP **feature-komplett im Demo-Modus** (Seed-Daten), **39 Tests grün**, Build grün. **Live-Setup** (Supabase/Stripe/Mail/Cloudflare) ausstehend → [`docs/launch/GO_LIVE_ANLEITUNG.md`](docs/launch/GO_LIVE_ANLEITUNG.md). Steuerung/Roadmap: [`CLAUDE.md`](./CLAUDE.md) · Status: [`docs/releases/PHASE_STATUS.md`](docs/releases/PHASE_STATUS.md) · Doku-Landkarte: [`MASTER_INDEX.md`](./MASTER_INDEX.md).

Stack: **React + Vite + TypeScript · Supabase (EU, Postgres+RLS) · Cloudflare · Stripe**. Kein Hetzner. PWA. Editorial-Design (TempConnect-Skin).

## App (`app/`) — Routen

| Route | Für wen | Funktion |
|---|---|---|
| `/` | Käufer | Hofladen-Finder: Suche (PLZ/Kategorie/Distanz) · **Liste + Karte** (Leaflet/OSM) · **Saison-Radar** · Reputation · Reservierung |
| `/stand/:farmId` | Käufer am Stand | **SB-Bezahlung** (Korb + Stepper → Stripe) — der USP für unbemannte Hofläden |
| `/hof/:farmId` | Erzeuger | Verfügbarkeit pflegen · Reservierungen · druckbarer Stand-QR · Abo |
| `/mitmachen` | neuer Erzeuger | Onboarding-Wizard (datengetrieben, Zod) |
| `/staff` | Team | Hof-Bewerbungen annehmen/ablehnen · Reservierungs-Übersicht (Guard) |
| `/login` · `/status` | — | Magic-Link-Login (Supabase) · Health-/System-Status |

Läuft sofort mit Seed-Daten; schaltet automatisch auf Supabase um, sobald `app/.env` (aus `.env.example`) gesetzt ist.

```bash
cd app
npm install
npm run dev        # http://localhost:5409
npm test           # Vitest (Unit/Integration/Component/E2E-Flow)
npm run build      # tsc --noEmit + vite build (+ PWA) → app/dist
```

> Sicherheit: 6 npm-Audit-Funde betreffen ausschließlich **Dev-Tooling** (vite/vitest), nicht das Production-Bundle; behebbar nur per Breaking-Upgrade → bewusst zurückgestellt.

## Struktur

```
web/            Marketing-Landing (statisch, self-contained) — geparkt
app/            React+Vite+TS PWA (src/ · supabase/ migrations+functions+setup_all.sql · test/)
docs/           Architektur, Security, Produkt, Billing, Ops, Legal, launch/ (Anleitung+Rechtstexte)
finalization/   Wellen/Phasen-Baupläne (00–15 + Phasen 2–5)
.claude/        agents/ · memory/ · learning/ · CLAUDE_RECS.md
```

## Go-Live (Owner-Schritte)
Komplette Anleitung: **`docs/launch/GO_LIVE_ANLEITUNG.md`**. Kurz: Supabase-Projekt (EU) + `app/supabase/setup_all.sql` ausführen → URL/anon-key in `app/.env` → Stripe/Mail-Keys (Edge-Function-Secrets) → Cloudflare Pages Deploy. Alle Schritte kosten-/außenwirksam → Owner-Freigabe.

## Prinzipien
- **Vermittler**, kein Eigenverkauf — Compliance-Disclaimer durchgängig.
- Enterprise-Niveau: keine Platzhalter/toten Pfade, End-to-End verdrahtet, RLS deny-by-default ab Migration #1, Daten in der EU.
