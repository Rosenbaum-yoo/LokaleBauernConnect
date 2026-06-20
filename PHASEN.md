# PHASEN.md — Bauplan LokaleBauernConnect (Master-Index)

> Die komplette Bau-/Finalisierungsstruktur, adaptiert aus TempConnects 5-Phasen-/Wellen-Maschine auf **React+Vite+TS · Supabase · Cloudflare · Stripe**. Anordnung wie TempConnect; Inhalte auf diese Plattform überschrieben. **Eine Welle pro Session.** Status: `docs/releases/PHASE_STATUS.md`.

## Doppel-Ziel
- **Spielbar SOFORT:** Phase 1 WAVE 02–04 + Phase 2 Deploy = benutzbare, online spielbare Version.
- **Enterprise-Premium in Rekordzeit:** Phasen 1–5 deklinieren die volle Tiefe; Gates sichern Qualität.

## Die 5 Phasen
| Phase | Charakter | Pflicht für Marktstart |
|---|---|---|
| **Phase 1** | Fundament + Kernprodukt (Wellen 00–15) | JA |
| **Phase 2** | Release-operativ (Cloudflare Deploy, Gates A–F, Burn-in) | JA |
| **Phase 3** | Betriebszentrale (Owner/Staff-Konsole + Supabase/Cloudflare-Ops — *ersetzt SCC/Hetzner*) | JA (Ops-Gate) |
| **Phase 4** | Vertikale Strecken (Tracks A–E, inkl. **SB-Bezahl-USP** + Karte) | TEILWEISE |
| **Phase 5** | Skalierung 10→300 + selbstlernende CLAUDE.md (Customer-Gates 10/50/100/300) | JA (Gate 10) |

---

## Phase 1 — Fundament & Kernprodukt
| Welle | Inhalt | Gate-Bezug |
|---|---|---|
| WAVE_00 Baseline | Repo, Vite/TS, Editorial-Design-System, Konventionen | ✅ teilweise |
| WAVE_01 Hygiene/CI | Cloudflare-Pages-Config, Env/Secrets, Lint/Build-CI | |
| WAVE_02 Datenmodell+RLS | `orgs, profiles, farms, products, availability, reservations` — additiv, **RLS deny-by-default + Isolationstest** | Isolations-Gate |
| WAVE_03 Rollen/Sichtbarkeit | Käufer / Erzeuger / Staff — RBAC, Surface-Sichtbarkeit | |
| WAVE_04 Kernprodukt | A Hofladen-Finder · B Verfügbarkeit (Erzeuger-Selbstpflege) · C Reservierung/Abholfenster · D Saison-Radar | ✅ A end-to-end (Seed) |
| WAVE_05 Owner/KPI-Dashboard | Reservierungen, aktive Höfe, Conversion | |
| WAVE_06 Security | Supabase Auth, Turnstile, RLS-Härtung, Rate-Limits | |
| WAVE_07 Staff/Support-Andockung | Hof-Verifizierung, Eskalation, Support-Tickets (Kern) | |
| WAVE_08 Bonus/Credits | *abwägen* — evtl. Post-Launch | optional |
| WAVE_09 Billing | Stripe-Abo (Erzeuger) + Vorbereitung **SB-Bezahl-USP** | Gate 10 |
| WAVE_10 Premium UX | Editorial-Politur, Mobile/PWA, Leerzustände | |
| WAVE_11 DB-Härtung | Indizes, Pagination, Query-Performance | |
| WAVE_12 QA Tests | Unit/Integration/E2E + Cross-Org-Negativtests | |
| WAVE_13 Observability | Sentry, strukturierte Logs, Health-Checks | |
| WAVE_14 Legal/DSGVO | Impressum, Datenschutz, AGB, Lebensmittel-Hinweis, AVV/TOMs | |
| WAVE_15 Demo/Onboarding | Erzeuger-Onboarding-Wizard (datengetrieben/Zod), Demo-Daten gekennzeichnet | |

**Go-Live-Gate Phase 1:** WAVE 02–15 grün + Isolationstest + Kernflow (Finder→Reservierung) end-to-end mit echten Daten.

## Phase 2 — Release-operativ
Cloudflare Pages Deploy (`web/` + `app/`), Security-Header/CSP/HSTS, Domain, Release-Artefakt (keine Secrets/.env/.claude), Burn-in ≥7 Tage. **Gates A–F** (Build, Security, Tenant-Isolation, Legal, Performance, Smoke).

## Phase 3 — Betriebszentrale (statt SCC/Hetzner)
Schlanke Owner-/Staff-Konsole: Kunden-/Hof-Operations, Billing-Übersicht, Monitoring/Incidents, Feature-Flags, Audit — als Supabase/Cloudflare-Sicht. Kritische Aktionen: Confirm + Reason + Audit. **Ops-Gate.**

## Phase 4 — Vertikale Strecken
| Track | Inhalt |
|---|---|
| **A — SB-Bezahlung (USP)** | QR am SB-Stand → Stripe-Zahlung → Quittung; Erzeuger-Dashboard (Einnahmen/Schwund). Eigener ADR. |
| **B — Interaktive Karte** | Leaflet/MapLibre (OSM), Hof-Pins, Cluster, „in der Nähe". |
| **C — Saison & Benachrichtigungen** | Saison-Radar, Alerts bei Lieblingsprodukten/Verfügbarkeit. |
| **D — Erzeuger-Self-Service** | Mobile Verfügbarkeits-/Bestandspflege, Abholfenster. |
| **E — Datenmodell-Skalierung** | Erweiterungen, Indizes, Caching für 300 Höfe/viele Käufer. |

## Phase 5 — Skalierung & Selbstlernen
Customer-Gates 10/50/100/300, Performance (Pagination/Indizes/N+1), Produktpolitur gegen austauschbare SaaS-Masse, **selbstlernende CLAUDE.md** (insights→distill→apply→consolidate, getaktet). **Gate 10 = erste zahlende Erzeuger.**

---

## Marktstart-Pflicht-Set (Minimum für erste zahlende Kunden)
```
Phase 1 WAVE 02–15 grün + Isolationstest
Phase 2 Gates A–F grün + Cloudflare-Deploy + Domain + Security-Header
Phase 3 Ops-Gate grün (minimale Betriebssicht)
Phase 4 Track A (SB-Bezahlung) ODER Phase 1 WAVE_09 (Erzeuger-Abo) — mind. ein Geldfluss
Phase 5 Gate 10 grün
```

## Abschlussbericht-Format pro Welle
```
## Welle abgeschlossen: <Name>
- Geändert: · Tests: · Risiken: · Nächste Welle:
```
