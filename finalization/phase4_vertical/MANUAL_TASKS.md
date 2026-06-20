# Phase 4 — MANUAL_TASKS (Owner-Entscheidungen, außerhalb der Codebasis)

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C.
> Stack (fix): React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect). **Kein Hetzner, kein Self-Host-Docker.**
> Diese Datei sammelt die **kostenpflichtigen / rechtlichen / account-bezogenen Entscheidungen**, die Claude **nicht** selbst trifft (`00_RULES.md` §1.19/§1.20, Stop-Regeln). Code wartet auf diese Freigaben — nichts davon wird halluziniert oder vorweggenommen. Rechtsfelder bleiben bis zur Owner-/Anwalts-Klärung offen.

---

## 1. Stripe / Geldfluss (Track A + WAVE_09)

| # | Entscheidung | Status | Owner-Eingabe |
|---|---|---|---|
| 1 | **Stripe-Account + Connect-Modell** (Standard vs. Express vs. Custom) für Erzeuger-Auszahlung | offen | [[OWNER: Connect-Modell festlegen]] |
| 2 | **Plattform-Transaktionsgebühr** der SB-Bezahlung (Prozentsatz / Fixbetrag) — Single Source: `app/docs/COMMERCIAL_SOURCE_OF_TRUTH.md` | offen | [[OWNER: Gebühr festlegen]] |
| 3 | **Live-Keys** (`STRIPE_SECRET_KEY`, Webhook-Signing-Secret) in Supabase-Edge-Secrets setzen | offen | [[OWNER: Keys bereitstellen (nur Secret-Store, nie Repo)]] |
| 4 | **Auszahlungs-/Payout-Bedingungen** (Schwellen, Frequenz) | offen | [[OWNER: Payout-Policy]] |

> Bis Keys gesetzt sind, bleibt der SB-Bezahlpfad env-gated (Code vorhanden, inaktiv — `app/supabase/functions/create-checkout`, `stripe-webhook`, `app/src/lib/payments.ts`, `app/src/pages/StandPayPage.tsx`).

## 2. E-Mail-/Versand-Provider (Track A Quittung + Track C Alerts)

| # | Entscheidung | Status | Owner-Eingabe |
|---|---|---|---|
| 5 | **Mail-Provider** (`resend` empfohlen / `sendgrid` / `console` für Dev) — Abstraktion: `app/supabase/functions/_shared/email.ts` | offen | [[OWNER: Provider + API-Key]] |
| 6 | **Absender-Domain + SPF/DKIM/DMARC** verifizieren | offen | [[OWNER: Domain-DNS]] |

## 3. Rechtstexte / Compliance (Querverweis WAVE_14)

| # | Entscheidung | Status | Owner-Eingabe |
|---|---|---|---|
| 7 | **Vermittler-Disclaimer + Lebensmittel-Kennzeichnungs-Hinweis** in Quittung/Beleg final | Entwurf | [[OWNER: anwaltliche Prüfung vor Go-Live]] |
| 8 | **Zahlungs-/Widerrufs-/Quittungs-Pflichttexte** (Track A) | offen | [[OWNER: Rechtstexte]] |
| 9 | **DSGVO Opt-in / Double-Opt-In-Wording** für Saison-Alerts (Track C) | offen | [[OWNER: Datenschutz-Wording]] |

## 4. Karten / Geo (Track B/E)

| # | Entscheidung | Status | Owner-Eingabe |
|---|---|---|---|
| 10 | **Map-/Geocoding-Vendor** über OSM hinaus (nur falls kostenpflichtig nötig) | nicht nötig | [[OWNER: nur falls bezahlter Vendor gewünscht]] |

## 5. Domain / Deploy (Querverweis Phase 2)

| # | Entscheidung | Status | Owner-Eingabe |
|---|---|---|---|
| 11 | **Produktiv-Domain + Cloudflare-Pages-Deploy** (Account/Kosten) | offen | [[OWNER: Domain + Deploy-Freigabe]] |

---

## 6. Regeln für diese Tasks

- **Keine Aktivierung ohne Owner-OK** für alles, was Geld kostet, Account/Domain berührt oder rechtlich bindet (Stop-Regeln `00_RULES.md` §5).
- Secrets **niemals** ins Repo/Log — nur Supabase/Cloudflare-Secret-Stores.
- Jede getroffene Entscheidung danach in die Single-Source-Doku überführen (`app/docs/COMMERCIAL_SOURCE_OF_TRUTH.md`, `app/docs/PRICING.md`) — nicht doppelt pflegen.
- `[[OWNER:...]]`-Felder bleiben offen, bis der Owner sie ausfüllt; sie werden **nicht** geraten.

> **Referenzen:** `README.md` · `GATES.md` · `CROSS_CUTTING.md` · `TRACK_A_SB_PAYMENT.md` · `../../docs/releases/PHASE_STATUS.md`.
