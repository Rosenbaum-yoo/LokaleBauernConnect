# Backup & Disaster Recovery — LokaleBauernConnect

> Stand: 2026-06-20. Grounded im Code; Betreiber-/SLA-Entscheidungen sind als [[OWNER:...]] markiert.

## Schutzbedarf (was muss überleben)

| Asset | Ort | Wiederherstellbar aus |
|---|---|---|
| Datenbankinhalt | Supabase (Postgres) | Supabase-Backup / PITR |
| Schema | `supabase/migrations/*.sql`, `supabase/setup_all.sql` (im Git) | Repo erneut anwenden |
| Seed-Daten | `supabase/seed.sql`, `src/lib/seed.ts` (im Git) | Repo |
| Frontend-Build | `dist/` (aus Repo reproduzierbar) | `npm run build`, Cloudflare-Redeploy |
| Edge Functions | `supabase/functions/*` (im Git) | Repo → `supabase functions deploy` |
| Secrets | Supabase Secrets / Cloudflare Env (NICHT im Git) | sicherer Secret-Store |

## Backups

- **Datenbank:** Supabase-Backups. Schema und Seed sind ohnehin versioniert im Repo.
- **Code/Config/Functions:** Git ist die Quelle der Wahrheit; alles außer Secrets ist reproduzierbar.

> [[OWNER: Supabase-Plan/Backup-Frequenz, Aufbewahrungsdauer und ob PITR aktiv ist — nicht im Code festgelegt, offen.]]

## Recovery-Ziele

> [[OWNER: RPO/RTO sind nicht im Code hinterlegt — offen.]]

## Wiederherstellungs-Ablauf

### Datenbank verloren / korrupt
1. Supabase-Backup einspielen (Dashboard) — oder neues Projekt + `supabase/setup_all.sql` ausführen.
2. Edge-Function-Secrets neu setzen (siehe `DEPLOYMENT.md`).
3. Functions deployen.
4. `/status` prüfen (`mode: live`, `supabase: ok`).

### Frontend / Hosting verloren
1. Cloudflare Pages neu verbinden (Root `app`, Output `dist`, Build `npm run build`).
2. `VITE_*`-Variablen setzen.
3. Redeploy, `/status` prüfen.

### Stripe-Webhook-Drift
- Webhook-Endpoint im Stripe-Dashboard prüfen/neu auf `stripe-webhook` zeigen lassen; verpasste Events per Stripe-Replay nachziehen.

## Verifikation nach Recovery

- `/status` zeigt „Betriebsbereit".
- `npm test` (55 Tests) grün gegen den wiederhergestellten Build.
- Stichprobe: Hof finden → reservieren; ein Checkout-Durchlauf (Test-Mode).
