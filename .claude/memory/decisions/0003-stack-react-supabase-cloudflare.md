# ADR 0003 — Stack React+Supabase+Cloudflare, kein Hetzner

- **Status:** Akzeptiert (Owner) · **Datum:** 2026-06-19 · Volltext: `docs/adr/0001-stack-react-supabase-cloudflare.md`

**Entscheidung:** React+Vite+TS · Supabase (EU) · Cloudflare (Pages/Workers) · Stripe(+Connect). **Kein Hetzner, kein Self-Host-Docker** (managed/serverless, niedrige Fixkosten, EU/RLS).

**Konsequenz für Adaption:** TempConnect-Phasen mit SCC/Hetzner → Cloudflare/Supabase-Ops. Hetzner-Dokus entfallen (siehe `MASTER_INDEX.md` ➖).
