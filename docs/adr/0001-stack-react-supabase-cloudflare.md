# ADR 0001 — Stack: React + Supabase + Cloudflare (kein Hetzner)

- **Status:** Akzeptiert
- **Datum:** 2026-06-19
- **Entscheider:** Owner (Dennis) · umgesetzt durch Claude

## Kontext

LokaleBauernConnect (#09 im ConnectCore-Imperium) soll **schnellstmöglich** als Premium-Plattform an den Markt — Web **und** Mobile. Der Owner ist Nicht-Entwickler; Betrieb muss managed, kostenarm und skalierbar (10 → 300 → 3000) sein. Bisherige Imperium-Plattformen liefen teils über selbst gehostete Docker-/Hetzner-Setups.

## Optionen

1. **Self-Host (Hetzner + Docker)** — volle Kontrolle, aber Betriebslast, Patching, Skalierung & Verfügbarkeit manuell. Für Nicht-Entwickler-Owner riskant.
2. **React + Supabase + Cloudflare (managed, serverless)** — Postgres + Auth + Storage + Edge Functions (Supabase, EU); statisches/Edge-Hosting + CDN + WAF (Cloudflare Pages/Workers). Kein Server-Betrieb.
3. **Proprietäre BaaS (Firebase o. ä.)** — schnell, aber Vendor-Lock, kein Postgres/RLS, DSGVO/EU-Hosting schwächer.

## Entscheidung

**Option 2.** Frontend **React (+ Vite, TypeScript)**, Daten/Auth/Storage **Supabase (EU-Region, Postgres + RLS)**, Hosting/Edge/CDN/Domain/WAF **Cloudflare (Pages + Workers)**. **Explizit kein Hetzner, kein Self-Host-Docker.**

- **Mobile:** eine responsive Codebasis (Web first) → PWA (installierbar). Native (Capacitor/Expo) nur bei belegtem Bedarf.
- **Landing:** statisch, self-contained, auf Cloudflare Pages — null Betriebslast, sofort deploybar.

## Konsequenzen

**+** Kein Server-Betrieb; Skalierung = Konfiguration; EU-Hosting & RLS erfüllen DSGVO/Mandantenfähigkeit „by default"; geringe Fixkosten, Pay-as-you-grow; Edge-Performance global.
**+** Passt zu Kern-Prinzipien (stateless, managed HA, RLS ab Migration #1).
**−** Bindung an Supabase/Cloudflare-Spezifika (gemildert: Postgres ist portabel, Standard-SQL/RLS).
**−** Edge-Functions-Limits beachten (lange Jobs → Workers/Queues).

## Folgeaufgaben

- Supabase-Projekt (EU) + `waitlist`-Tabelle + RLS (Landing-Go-Live).
- App-Scaffold `app/` (React+Vite+TS) + Supabase-Client + Design-Tokens.
- Security-Header/CSP auf Cloudflare; Secrets nur via Env/Secret-Manager (nie im Code/Git).
