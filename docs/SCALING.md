# SCALING — kostengünstig skalieren (Cloudflare · Supabase · Stripe)

> Wie weit trägt der Stack, was kostet es, und wie kommen wir am schnellsten zu echten zahlenden Kunden. Stack ist **serverless/managed** — Skalierung = Konfiguration, kein Rewrite.

## Load Balancing? — bereits eingebaut
- **Cloudflare** = globales **Anycast-Netz**: jede Anfrage geht automatisch zum nächsten Rechenzentrum (>300 PoPs). **Kein eigener Load Balancer nötig** — Verteilung, DDoS-Schutz (WAF) und CDN sind inklusive. Pages/Workers skalieren horizontal ohne Konfiguration.
- **Supabase** = **Connection Pooler (Supavisor)** eingebaut (Pflicht bei serverless/Edge), dazu **Read Replicas** ab Bedarf — das ist das „Load Balancing" auf DB-Ebene.
- **Stripe** = skaliert praktisch unbegrenzt; keine eigene Infrastruktur.

## Skalierungs-/Kostenstufen (Richtwerte)
| Stufe | Cloudflare | Supabase | Stripe | ~Kosten/Monat |
|---|---|---|---|---|
| **Start (0–~50 Kunden)** | Free (Pages: unbeg. Static-Requests/Bandbreite; Workers 100k req/Tag) | **Free** (500 MB DB, 50k MAU, 2 GB Bandbreite) | pay-per-use | **~0 €** |
| **Wachstum (50–300)** | Free–$5 (Workers 10M req) | **Pro $25** (8 GB DB, 100k MAU, 250 GB Bandbreite, tägl. Backups, kein Pausieren) | ~1,5 % + 0,25 € je EU-Karte | **~25–50 €** |
| **Skalierung (300–3000)** | $5+ (Bandbreite/Workers nach Verbrauch) | Pro + **Compute-Upgrade + Read Replica** ($/Monat je Größe) | pay-per-use | **~100–300 €** |

> Der teuerste Faktor ist nicht Infrastruktur, sondern **Transaktionsgebühren** (Stripe) — die fallen aber nur bei echtem Umsatz an. Fixkosten bleiben minimal.

## Performance-Hebel (im Code bereits angelegt / als Welle geplant)
- DB: Indizes auf `org_id/status/plz` (vorhanden), **Pagination/`.limit`** (vorhanden), N+1 vermeiden (set-based), BRIN auf append-only.
- Edge: statische Assets via CDN, `_headers`/Caching, Bilder über Supabase Storage + CDN.
- Supabase: Pooler nutzen, RLS-Policies indexfreundlich, Edge Functions statt schwerer Client-Logik.

## Schnellster Weg zu echten zahlenden Kunden (Gate 10)
1. **Supabase-Projekt (EU)** + `setup_all.sql` → echte Daten/Auth/RLS.
2. **Stripe live** (Keys + Webhook + Zahlarten) → **der Umsatz-Schalter**.
3. **Mail** (Resend/SendGrid) → Quittungen/Bestätigungen.
4. **Cloudflare Pages Deploy** + Domain (Anycast/LB inklusive).
5. **Rechtstexte** `[[OWNER]]` + Anwaltscheck.
→ dann **Isolationstest + echter Testkauf + Burn-in** = marktreif.

Vollständige Klick-Anleitung: `docs/launch/GO_LIVE_ANLEITUNG.md`.
