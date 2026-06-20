# Monitoring — LokaleBauernConnect

> Stand: 2026-06-20. Grounded im Code; bei Abweichung gilt der Code.

## Health-Check

Die App bietet eine eingebaute Status-Seite:

- Route: `/status` → `src/pages/StatusPage.tsx`.
- Datenquelle: `checkHealth()` in `src/lib/data.ts`.

`checkHealth()` liefert `{ mode, supabase, farms }`:

| Feld | Werte | Bedeutung |
|---|---|---|
| `mode` | `'live'` \| `'demo'` | Supabase konfiguriert vs. Seed-Daten |
| `supabase` | `'ok'` \| `'error'` \| `'demo'` | DB-Erreichbarkeit (Live) bzw. Demo |
| `farms` | `number` | Anzahl erreichbarer Höfe (Live: `count` aus `farms`, Demo: Seed-Anzahl) |

Im Live-Modus zählt `checkHealth` per `head`-Query (`count: 'exact'`) die Zeilen der Tabelle `farms`; Fehler ergeben `supabase: 'error'`. Die Status-Seite gilt als „Betriebsbereit", wenn `supabase` `'ok'` oder `'demo'` ist.

Die Status-Seite enthält außerdem einen Button „Fehler-Reporting testen", der `reportError(...)` aus `src/lib/observability.ts` auslöst.

## Uptime-Monitoring (extern)

- Externen Uptime-Check auf `/status` richten (HTTP 200 + erwartetes Badge).
- Alternativ Cloudflare-eigene Verfügbarkeits-/Analytics-Signale nutzen.

> [[OWNER: konkreter Uptime-Anbieter, Alert-Empfänger und Schwellen sind nicht im Code hinterlegt — offen.]]

## Fehler-/Client-Monitoring

Siehe `OBSERVABILITY.md`. Clientseitige Fehler werden über `VITE_ERROR_BEACON_URL` an einen Beacon-Endpunkt gemeldet (optional, env-gated).

## Edge Functions / Stripe

- Logs der Supabase Edge Functions (`create-checkout`, `stripe-webhook`) über das Supabase-Dashboard.
- Stripe-Webhook-Zustellung über das Stripe-Dashboard (Event-Log, Retries).
