# PHASE_STATUS — LokaleBauernConnect

> Wellen-/Phasen-Tracker. Nach jeder Welle aktualisieren. Adaptiert aus `docs/releases/PHASE_STATUS.md` (TempConnect).

| Phase | Welle | Status | Datum | Notiz |
|---|---|---|---|---|
| 1 | WAVE_00 Baseline | teilweise | 2026-06-19 | Vite/TS + Editorial-Design-System stehen |
| 1 | WAVE_01 Hygiene/CI | offen | — | Cloudflare-Pages-Config + Env/Secrets |
| 1 | WAVE_02 Datenmodell+RLS | Code vorhanden | 2026-06-19 | `app/supabase/migrations/0001_core.sql` (Schema+RLS deny-by-default) + `seed.sql` (9 Höfe/25 Produkte) + App-Wiring (DB-Mapping, build grün); wartet auf Supabase-Projekt (Owner) für Live + Isolationstest |
| 1 | WAVE_03 Rollen/Sichtbarkeit | offen | — | Käufer/Erzeuger/Staff |
| 1 | WAVE_04 Kernprodukt | ✅ komplett | 2026-06-20 | Finder (Liste+Karte) + Reservierung + Reputation + Erzeuger-Selbstpflege + **Saison-Radar** (Banner + „Nur Saison-Höfe"-Filter), alle end-to-end (Seed), verifiziert |
| 1 | WAVE_05 Owner/KPI | offen | — | |
| 1 | WAVE_06 Security | teilweise | 2026-06-20 | **Auth-Gerüst** (Supabase Magic-Link, AuthContext, `RequireStaff`-Guard, Header-Login/Logout, `/login`); env-gated (Demo offen); offen: Turnstile, Server-RLS-Härtung |
| 3 | WAVE_07 Staff-Konsole | teilweise | 2026-06-20 | **Staff-Center `/staff`**: Erzeuger-Bewerbungen annehmen/ablehnen (confirm + Grund), Status-Übersicht; verifiziert (Demo). Offen: Support-Tickets, Eskalation, Reservierungs-/Zahlungs-Übersicht |
| 1 | WAVE_09 Billing | Infra vorhanden | 2026-06-19 | Edge Functions `create-checkout`+`stripe-webhook` (idempotent, signiert), Mig `0002_payments.sql` (subscriptions/sb_payments/payment_events + RLS), Mail-Provider (resend/sendgrid/console), Client `payments.ts`. Env-gated; wartet auf Stripe-/Mail-Keys |
| 4 | Track A SB-Bezahlung ⭐ | Backend + UI (Korb) | 2026-06-20 | create-checkout (`sb_payment`+`sb_basket`)/Webhook/Quittung + **QR-Stand-Seite `/stand/:farmId` mit Mehrfach-Korb** (Stepper, Summe, Mail→Stripe), Component-Test; aktiv sobald Stripe-Keys gesetzt |
| 4 | Bewertungen + Reputation | Code + sichtbar | 2026-06-19 | `0003` reviews+Trigger; Reputation auf farms; **im Finder sichtbar** (★/Zero-State) |
| 3 | Multi-Org + Multi-Standorte | DB+RLS vorhanden | 2026-06-19 | `org_members` + `is_org_member()` (Multi-Org-RLS auf alle Owner-Policies gehoben), `org_locations` (inkl. unbemannter SB-Stand) |
| 4 | Bounties (Gesuche) + Credits | DB+RLS vorhanden | 2026-06-19 | `bounties` (Käufer-Gesuch + optionale Belohnung), `credits_ledger`; UI später |
| 1 | WAVE_15 Demo/Onboarding | ✅ fertig | 2026-06-20 | **datengetriebener Erzeuger-Wizard** (4 Schritte, Zod-validiert) `/mitmachen` + Header-CTA; `farm_applications`-Tabelle+RLS (Mig 0004); verifiziert |
| 1 | WAVE_10 Premium UX / PWA | teilweise | 2026-06-20 | **PWA** (vite-plugin-pwa: Service Worker + Manifest + Offline-Precache, installierbar, Icon) + SEO/OG-Meta; offen: weitere UX-Politur |
| 1 | WAVE_12 QA-Tests | ✅ Basis | 2026-06-20 | Vitest: **24 Unit-Tests** (Datenschicht/Geo/Zod-Onboarding/Saison) grün + React-ErrorBoundary; offen: E2E + Edge-Function-Tests |
| 1 | WAVE_11/13/14 | offen | — | DB-Härtung (Indizes da) / Observability (Sentry) / Legal-Wiring |
| 2 | Release/Deploy | offen | — | Cloudflare Pages + Gates A–F (Owner-Freigabe) |
| 3 | Betriebszentrale | offen | — | Owner/Staff-Konsole |
| 4 | Track A SB-Bezahlung ⭐ | offen | — | nach Auth+Billing |
| 4 | Track B Karte | ✅ fertig | 2026-06-20 | Leaflet/OSM, Liste/Karte-Umschalter, 9 Hof-Pins + Popups, verifiziert (Tiles laden, 0 Fehler); CSP für Tiles erweitert |
| 4 | Track D Erzeuger-Self-Service | ✅ fertig | 2026-06-20 | `/hof/:farmId`: Verfügbarkeit pflegen + Reservierungen + **druckbarer SB-Stand-QR** (qrcode.react); verifiziert (Demo; in Prod RLS-/Login-gated) |
| 5 | Gate 10 (zahlende Kunden) | offen | — | Marktstart-Schwelle |
| — | Bauplan-Doku | vorhanden | 2026-06-20 | Bauplan-Dateien (Wellen/Phasen) erstellt — `finalization/` (00_RULES/01_PRIORITIES/99_GOLIVE_GATE, WAVE_00–15, phase2–5) jetzt vorhanden; siehe `MASTER_INDEX.md` §7 |

## Enterprise-Readiness (Ziel ≥ 85 %)
| Bereich | Stand | Score |
|---|---|---|
| App-Fundament / Build | ✅ grün | 70 % |
| Hofladen-Finder (Kernflow) | ✅ end-to-end (Seed) | 65 % |
| Datenmodell + RLS | 🔨 Code (Migration+RLS+Seed+Wiring) | 70 % |
| Auth / RBAC | 🔨 Gerüst + RLS-Härtung (Review-Fixes) | 45 % |
| Billing (Stripe + SB-USP + Abo-UI) | 🔨 Backend + UI (Keys fehlen) | 55 % |
| QA-Tests | ✅ **55 Tests** grün · Coverage **84 %** (reine Logik/UI 95–100 %; Supabase/Stripe-Integration live-verifiziert statt gemockt, AGENTS-Regel) | 90 % |
| Observability | 🔨 Error-Capture + Beacon + ErrorBoundary + **/status Health-Page** | 75 % |
| Erzeuger (Onboarding/Self-Service/Abo) | ✅ Demo end-to-end | 75 % |
| Staff-Konsole | 🔨 Bewerbungen + Reservierungs-Übersicht | 70 % |
| A11y | 🔨 Skip-Link, Drawer-Fokus, Live-Regionen, Wizard-Fokus, Feld-aria | 72 % |
| SB-Bezahlung erreichbar (Hof-Detail → /stand) | ✅ | 75 % |
| **Gesamt (Code, ohne Live-Setup)** | gleichmäßig ~70 % | ~70 % |
