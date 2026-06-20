# Phase 4 — CROSS_CUTTING (Berührungspunkte & Kollisionswächter zwischen Tracks A–E)

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C.
> Stack (fix): React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect). **Kein Hetzner, kein Self-Host-Docker.**
> Diese Datei ist der **Kollisionswächter**: Sie hält fest, an welchen *gemeinsamen* Code-/Daten-/Versand-Stellen sich zwei Phase-4-Tracks ins Gehege kommen — damit **niemals zwei kollidierende Tracks in einer Session** laufen (Token-Fokus + keine Race Conditions, `README.md` §4/§7).

---

## 1. Warum diese Datei existiert

Jeder Track (A SB-Bezahlung · B Karte · C Saison/Alerts · D Erzeuger-Self-Service · E Datenmodell-Skalierung) ist für sich abgegrenzt. Trotzdem teilen sich mehrere Tracks **dieselben physischen Ressourcen**. Zwei Sessions, die parallel dieselbe Ressource anfassen, erzeugen Merge-/Migrations-/Versand-Kollisionen. Vor jedem Track-Start gilt: **diese Matrix prüfen.**

---

## 2. Geteilte Ressourcen (reale Artefakte im Repo)

| Geteilte Ressource | Reales Artefakt | Welche Tracks berühren sie |
|---|---|---|
| **E-Mail-Versandkanal** | `app/supabase/functions/_shared/email.ts` (Provider `resend`/`sendgrid`/`console`) | **A** (Quittung/Beleg) · **C** (Verfügbarkeits-Alert) |
| **Migrations-Nummernkreis** | `app/supabase/migrations/` (zuletzt `0004_onboarding.sql`) | **A, C, D, E** (jede neue Tabelle/Index = neue Migration) |
| **Datenschicht** | `app/src/lib/data.ts` (`listFarms`/`applyFilter`/`withDistance`/`mapFarm`/`createReservation`), `types.ts` | **B** (Geo/Filter), **C** (Saison-Felder), **D** (Verfügbarkeit), **E** (Pagination/Query) |
| **Checkout/Webhook** | `app/supabase/functions/{create-checkout,stripe-webhook}`, `app/src/lib/payments.ts` | **A** (SB-Bezahlung) · WAVE_09 (Abo) |
| **Audit-Log** | `audit_log` (`0001_core.sql`), Namespace je Track | **A** (`payment.*`) · **C** (`alert.*`) · **D** (`product.*`) |
| **CSP / Security-Header** | `app/public/_headers` | **A** (Stripe-Origins) · **B** (OSM-Tiles, bereits erweitert) |

---

## 3. Session-Sperren (verbindlich — nie zusammen bauen)

```
SPERRE 1:  Track A  ✗  Track C     → geteilter E-Mail-Versandkanal (_shared/email.ts).
                                      Beide müssen idempotent + rate-limitiert senden;
                                      parallele Arbeit kollidiert an Versand/Idempotenz.
SPERRE 2:  Migrations-Tracks nie parallel (A/C/D/E) → Migrations-Nummernkollision
                                      (zwei Sessions vergeben dieselbe nächste Nummer).
SPERRE 3:  Track B  ↔  Track E      → beide fassen Geo-/Index-Pfade an (geo.ts / farms_*_idx).
                                      Reihenfolge statt Parallelität: B (UX) dann E (Index bei Last).
```

> **Regel:** Pro Session **genau ein** Track. Berührt der gewählte Track eine Ressource aus Abschnitt 2, vor dem ersten Edit prüfen, ob ein gesperrter Partner-Track offene Diffs hat.

---

## 4. Berührungspunkte je Track (was beim Bauen mitgedacht werden muss)

- **Track A (SB-Bezahlung):** schreibt `sb_payments`/`payment_events` (RLS, org-gebunden); nutzt `create-checkout` (Preis **serverseitig**) + idempotenten `stripe-webhook`; sendet Quittung über `_shared/email.ts`; ergänzt CSP um Stripe-Origins (`connect-src`/`frame-src https://*.stripe.com`) erst **mit** Go-Live. Audit `payment.*`.
- **Track B (Karte):** rein lesend (`farms_public_read`), keine Migration nötig außer Geo-Index (→ koordiniert mit E); CSP für OSM-Tiles bereits erweitert. Keine E-Mail/Audit-Kollision.
- **Track C (Saison/Alerts):** neue Opt-in-/Abo-Tabelle (additiv, neue Migration); sendet über `_shared/email.ts` (→ Sperre 1); Audit `alert.*`; Double-Opt-In, abbestellbar, EU-konform.
- **Track D (Erzeuger-Self-Service):** mutiert nur eigene `org_id`/Höfe (`products_owner_write`, `farms_owner_write`); Cross-Org-Negativtest Pflicht; Audit `product.*`; mobil/PWA-tauglich. Liefert die Datenbasis, von der C + Finder leben.
- **Track E (Skalierung):** Indizes/Pagination/Caching additiv; berührt `data.ts`-Query-Pfade (→ koordiniert mit B/C/D); keine destruktiven ALTER ohne Rollback.

---

## 5. Querschnitts-Pflichten (gelten in jedem Track — Kurzfassung, Volltext `README.md` §7)

- Org-Boundary / RLS deny-by-default · Zero-State statt 500 · Scope-Transparenz · Audit + Reason-Pflicht.
- Migrationen **additiv** (neue Datei, nächste freie Nummer nach `0004_onboarding.sql`), je Tabelle `org_id`/Tenant, Zeitstempel, `deleted_at`, RLS + Isolationstest.
- service role nur in Edge Functions · Frontend nur `VITE_`-Public-Keys · Zod an Eingangsgrenzen · Turnstile bei öffentlichen Formularen.
- Vermittler-Disclaimer + Lebensmittel-Hinweis durchgängig — auch in jeder E-Mail/Quittung.

---

> **Referenzen:** `README.md` (Übersicht/Reihenfolge) · `GATES.md` (Track-Gates) · `MANUAL_TASKS.md` (Owner-Entscheidungen) · die fünf Track-Dateien (`TRACK_A_SB_PAYMENT.md`, `TRACK_B_KARTE.md`, `TRACK_C_SAISON.md`, `TRACK_D_SELFSERVICE.md`, `TRACK_E_DATABASE.md`). Tracker der Realität: `../../docs/releases/PHASE_STATUS.md`.
