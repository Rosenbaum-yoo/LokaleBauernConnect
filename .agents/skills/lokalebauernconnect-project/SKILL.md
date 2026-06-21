---
name: lokalebauernconnect-project
description: >
  Persistenter Projekt-Kontext für LokaleBauernConnect — eine Vermittlungsplattform für
  regionale Lebensmittel direkt vom Hof/Hofladen/SB-Stand (React + Supabase + Cloudflare + Stripe).
  Diesen Skill bei JEDER Arbeit im Verzeichnis 09_LokaleBauernConnect(D) nutzen. Definiert
  Architektur, Monetarisierung, Kern-Dateien, Patterns, Regeln, aktuellen Stand, offene Gates.
  Nach jedem Prompt automatisch mit neuen durablen Wahrheiten aktualisieren.
---

# LokaleBauernConnect — Projekt-Kontext (Stand: 2026-06-21)

## Rolle
Du arbeitest seit Tag 1 am gesamten Stack (Frontend, Edge/Backend, DB/RLS, Security, Tests, UX) **plus** OZ-Execution (Scope, Akzeptanzkriterien, Phasen/Wellen, Gates). Inkrementell, production-ready, Enterprise-/Marktführer-Niveau. **Bestehende Strukturen ZUERST prüfen, dann erweitern.** Zielbild: niemand glaubt, dass eine Einzelperson das in der Zeit geschafft hat — Innovation×Team, weltklasse, ohne Fehlertoleranz; Token↓ / Qualität↑ über die Zeit.

## Mission & Imperium-Kontext
Teil des **ConnectCore-Imperiums** (1 Kern, 14 Töchter). LokaleBauernConnect = **Welle 1, Klasse C** (Cashflow-Schnellstarter). Blueprint-Denken: Patterns müssen in 20+ Projekten tragen. Doppel-Ziel: (a) schnell online/spielbar, (b) in Rekordzeit Enterprise-Premium. Plattform = **Vermittler** (kein Eigenverkauf, keine Beratung) — Disclaimer durchgängig.

## Stack (fix)
React 18 + Vite 5 + TypeScript (strict) · Supabase (EU, Postgres + RLS deny-by-default, Edge Functions/Deno) · Cloudflare (Pages/Workers, Anycast-LB inkl.) · Stripe (+ Connect geplant) · PWA (vite-plugin-pwa) · react-router-dom v6 · Leaflet · Zod · qrcode.react · pdf-lib (lazy). **Kein Hetzner, kein Self-Host-Docker.** Dev-Port **5409** (`.claude/launch.json` → `lbc-app`).

## Verzeichnis
- `app/` — die React-App (Quelle `app/src/`, Tests `app/test/`, Supabase `app/supabase/`).
- `web/index.html` — Marketing-Landing (geparkt).
- `docs/` · `finalization/` · `MASTER_INDEX.md` · `PHASEN.md` · `docs/releases/PHASE_STATUS.md` (Live-Status führend).
- `.claude/` (memory/learning/agents) — nie ins Release-Artefakt.

## Monetarisierung — Transaktions-Provision (NICHT SaaS-Abos)
Owner-Entscheidung 2026-06-21: **keine klassischen Abostufen.** Empfohlenes Modell (Multi-Agent-Workflow), Owner-Freigabe der finalen %-Zahlen offen:
- Standard **1 % Käufer / 5 % Verkäufer = 6 %** (Alternativen: 3/3 oder käuferfrei 0/6).
- **Premium „Hof-Plus" 39 €/Mo (nur Verkäufer → 0 %)**; kein echtes 0/0.
- Status **Bronze..Platin** senkt Verkäufer-% bis 3,4 % (aus Volumen × verifizierte Bewertungen × Rating × Tenure × Bounties).
- **Floor 1,2 % + harte Mindestgebühr 0,25 €/Tx** (Stripe-Kleinbetragsschutz am SB-Stand).
- Freiwilliger **SB-Unterstützungsbeitrag** (eigener Checkout-Posten, getrennt vom Warenwert).
- **Single Source of Truth:** `app/src/lib/fees.ts` ↔ `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` + ADR `docs/adr/0003-provisionsmodell.md`.
- ⚠️ **Kritisch vor Live-Geld:** `create-checkout` hat NOCH KEIN Stripe Connect → 100 % Geld bei der Plattform = faktischer Eigenverkauf, verletzt Vermittler-Rolle. Zwingend Destination-Charges + `application_fee` bauen.

## Kern-Dateien
- `app/src/lib/data.ts` — EINE API, zwei Quellen (Supabase wenn `VITE_SUPABASE_*`, sonst Seed/localStorage-Demo); Distanz (PLZ/GPS) + Sortierung; mutierende Ops mit `.select()` (0-Row-RLS-Denial = false).
- `app/src/lib/fees.ts` — Provisions-/Gebühren-Single-Source (computeFee, Tiers, Floor).
- `app/src/lib/freshness.ts` — Erntedatum-Label (`harvestLabel(iso, now)` injizierbar) + `freshestHarvest`.
- `app/src/lib/pdf.ts` — gebrandete PDF-Belege, **pdf-lib lazy via `await import()`** (eigener Chunk).
- `app/src/lib/geo.ts` — Haversine, `distanceFromPlz`, `distanceFromCoords`.
- `app/src/lib/onboardingForm.ts` — Zod-Schema + datengetriebene Schritte; `PRODUCER_KINDS` (gewerblich/Privat-Hobby/Verein).
- `app/src/lib/auth.tsx` · `payments.ts` · `seed.ts` · `supabase.ts` · `types.ts` · `observability.ts` · `season.ts`.
- `app/supabase/migrations/0001..0007*.sql` (+ `setup_all.sql` = konsolidiert) · `functions/create-checkout`,`stripe-webhook`.
- Seiten: `FinderPage` · `StandPayPage` (SB-Korb + Unterstützung) · `ProducerPage` · `OnboardingPage` · `StaffPage` · `LoginPage` · `StatusPage`.

## Patterns (IMMER verwenden)
- **EINE API, zwei Quellen** (Supabase/Seed) — UI identisch, Umstieg = Config.
- **Single Source of Truth im Code + Doku-Spiegel** (Zahlen/Logik an EINER Stelle).
- **Schwere Libs lazy** (`await import()`) → eigener Chunk, nicht im Haupt-Bundle (Bandbreite/Kosten).
- **Client-seitig statt Server**, wo möglich (PDF) → 0 Pro-Dokument-Serverkosten, DSGVO, offline.
- **RLS deny-by-default + Isolationstest** ab Migration #1; service_role nur in Edge Functions; Frontend nur `VITE_`-Public-Keys.
- **Additive, idempotente Migrationen** (`add column if not exists`); `setup_all.sql` synchron halten.
- **Zod an der Grenze**; **reine Funktionen mit injizierbarem `now`** → nicht-flaky Tests; **RTL container-gescopt** (kein document.body).
- **Recht VOR Feature-Bau** prüfen (Research-Workflow) — z. B. Kleingarten (BKleingG) darf nicht verkaufen.

## Regeln
- Secrets nie in Code/Log. SQL nur als neue Migration. User-Werte escapen, keine hardcodierten Farben (Design-Tokens `app/src/styles/theme.css`, Editorial). Keine Deko-Emojis in Prod-UI.
- **End-to-End-Pflicht:** Endpoint → realer Fetch → echtes DOM → Lade/Leer/Fehler → gebundener Handler. Kein TODO, kein toter Button.
- **Test-Integrität:** Code an Tests anpassen, Tests nie zurechtbiegen (Ausnahme: Test nachweisbar falsch/spröde). Vor „fertig": `npm test` + `npm run build` grün.
- Commit/Push nur auf Auftrag; Push (Live-Build) vorab ankündigen. Co-Author-Zeile `Co-Authored-By: Claude <noreply@anthropic.com>`. Branch `feat/<task>-claude`.
- Owner = Entscheidungsinstanz für Architektur/Security/Geld/Deploy/Account/Irreversibles.

## Spezialmodule
- **Hofladen-Finder** — Liste + Karte (Leaflet), Saison-Radar, Reputation, **GPS-Entfernung**, **Erntedatum/Frische**, Sortierung (Entfernung/Frische/Preis/Bewertung/A–Z).
- **USP: SB-Bezahlung** am unbemannten Stand — QR `/stand/:farmId` → Korb → Stripe; + freiwilliger Unterstützungsbeitrag.
- **Reservierung/Abholfenster** (FarmDrawer) + PDF-Bestätigung.
- **Erzeuger** — Onboarding-Wizard (Zod) mit Typ gewerblich/Privat-Hobby/Verein + Selbsterklärungen; Self-Service `/hof/:id`; PDF-Bestätigung. Kleingarten ausgeschlossen (BKleingG).
- **PDF-Belege global** — `buildBrandedPdf` (testbar) + Onboarding-/Reservierungs-Download; SB-Quittung folgt server-seitig.
- **Staff-Konsole** `/staff` — Bewerbungen annehmen/ablehnen (confirm + Grund).

## Aktueller Stand (2026-06-21)
- **87 Tests grün**, Build grün, typecheck sauber. Coverage reine Logik/UI ~95–100 %; Supabase/Stripe-Integration live-verifiziert (kein Mock, AGENTS-Regel).
- Repo **public**: github.com/Rosenbaum-yoo/LokaleBauernConnect; GitHub-Actions-CI (typecheck/test/build) — **account-gated** bis E-Mail-Verifizierung (lokal alles grün).
- Globale CI/Git/Test/Skalierungs-Standards zusätzlich im ConnectCore-Imperium-Master verankert.

## Offene Owner-Gates
1. **Provisions-Pick** (1/5 empfohlen · 3/3 · 0/6) → schaltet **Stripe-Connect-Bau** frei.
2. **GitHub-E-Mail verifizieren** → CI grün.
3. **Supabase/Stripe/Mail/Cloudflare live** (Keys/Account/Kosten/Domain) → `docs/launch/GO_LIVE_ANLEITUNG.md`.
4. Rechtstexte `[[OWNER:…]]` + anwaltliche/steuerliche Endprüfung (Provision, Privatverkauf, PDF-Pflichtangaben).

## Selbst-Update-Automatik (verbindlich, ohne erneute Aufforderung)
Nach JEDEM Prompt: (1) diesen Skill mit neuen durablen Wahrheiten aktualisieren (Features/Entscheidungen/Dateien/Stand/Gates); (2) **relevanzgeprüft** `CLAUDE.md`/`.claude/learning/insights_inbox.md` nur anpassen, wenn es die *zukünftige* Arbeitsweise effizienter/output-stärker macht. Ziel: weniger Token, mehr + hochwertigerer Output, inkrementell, ohne Fehlertoleranz. Workflows nur wo sie Tiefe bringen, nie für Einzel-Edits.
