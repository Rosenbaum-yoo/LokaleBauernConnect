# INCIDENT_RUNBOOK — LokaleBauernConnect (Cloudflare · Supabase · Stripe)

> Verbindliches Notfall- und Störungs-Handbuch für den Betrieb von LokaleBauernConnect. Stack fix: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker** — Diagnose und Behebung laufen über Provider-Dashboards, CLIs (`wrangler`, `supabase`, Stripe CLI) und Edge-Logik, nicht über Container-Hosts.
>
> **Rolle = Vermittler.** Die Plattform vermittelt Hofläden, Verfügbarkeit, Reservierung und die bargeldlose SB-Bezahlung — sie verkauft nicht selbst und berät nicht. Das prägt jede Kunden- und Behörden-Kommunikation in diesem Runbook: Wir kommunizieren über **die Vermittlungs-/Zahlungsanbindung**, nicht über fremde Warenverantwortung. Disclaimer durchgängig (siehe `docs/COMPLIANCE_MODEL.md`).
>
> **Grundsatz:** **Erst stabilisieren, dann analysieren, dann dauerhaft beheben.** Im Zweifel Schweregrad **hochstufen**, nicht abwarten.
>
> **Owner-Hoheit:** Mit **🔑 Owner** markierte Schritte sind account-, kosten-, daten-, geld- oder extern-sichtbar (Statuspage-Aussage, Behörden-Meldung, DB-Rückrollung, Zahlungs-Modus-Wechsel). Sie werden **vorab in Klartext angekündigt** und erst nach ausdrücklicher Freigabe ausgeführt (CLAUDE.md §0, Stop-Regeln). Reversible Diagnose (Logs lesen, Status prüfen, Dry-Run) ist decide-and-act.
>
> **Verwandte Dokumente (normativ):** `docs/DEPLOYMENT.md` (§8 Gates, §10 Rollback, §6 Edge/Webhook) · `docs/security/SECURITY_OVERVIEW.md` (Header/CSP/WAF) · `docs/security/SECRET_ROTATION.md` (Secret-Kompromittierung) · `docs/security/IDENTITY_MODEL.md` · `docs/security/TENANT_ISOLATION_MODEL.md` (Isolations-Bruch = SEV-1) · `docs/COMPLIANCE_MODEL.md` (**delegiert die Datenpannen-/72-h-Meldekette normativ an dieses Dokument**) · `docs/DATABASE_MODEL.md` (audit_log, sb_payments, Idempotenz) · `docs/BACKUP_DISASTER_RECOVERY.md` (PITR/Restore) · `docs/MONITORING.md` (Alerts/SLO) · `PHASEN.md` (Phase 2 Gates, Phase 3 Ops-Gate).

---

## 0. Geltungsbereich & Rollen im Incident

### 0.1 Was ist ein Incident?
Ein **Incident** ist jedes Ereignis, das die Verfügbarkeit, Korrektheit, Vertraulichkeit oder Integrität der Plattform für Käufer, Erzeuger oder Staff beeinträchtigt **oder** eine externe Meldepflicht auslöst. Beispiele: App nicht erreichbar, Reservierungen schlagen fehl, SB-Zahlung wird doppelt verbucht, RLS-Bruch (Org sieht Fremddaten), Secret geleakt, Stripe-Webhook-Stau.

Abgrenzung: Reine Feature-Wünsche, einzelne Nutzer-Bedienfehler ohne Plattform-Ursache und geplante Wartung sind **keine** Incidents (geplante Wartung → Statuspage als „Scheduled Maintenance", aber kein SEV).

### 0.2 Incident-Rollen (auch im 1-Personen-Betrieb klar trennen)
| Rolle | Aufgabe | Wer (Klasse-C-Start) |
|---|---|---|
| **Incident Commander (IC)** | Führt den Incident, setzt Severity, koordiniert, entscheidet über Eskalation/Rollback, hält die Timeline. | Owner bzw. diensthabende Person |
| **Operator** | Führt Diagnose- und Behebungsschritte aus (Dashboards, CLI, Edge-Redeploy). | Owner/Claude-gestützt |
| **Communications (Comms)** | Statuspage, Kunden-/Erzeuger-Mail, intern. Nur IC gibt externe Aussagen frei. | Owner |
| **Scribe** | Protokolliert minutengenau in `incidents` (siehe §9) + Incident-Kanal. | Operator/automatisiert |
| **DSB-Kontakt** | Bei Datenpanne: Datenschutz-Bewertung, 72-h-Frist (§8). | benannter DSB / Owner i. V. |

> Im frühen Betrieb übernimmt der Owner mehrere Rollen — die **Trennung der Verantwortungen** bleibt trotzdem im Protokoll sichtbar (wer hat *entschieden*, wer hat *ausgeführt*, wer hat *kommuniziert*). Das ist Pfeiler 5 (Audit & Verantwortlichkeit).

---

## 1. Schweregrade (Severity)

Severity richtet sich nach **Wirkung**, nicht nach Aufwand. Maßgeblich ist die schwerste zutreffende Zeile.

### SEV-1 — Kritisch (sofort)
- Plattform-App (`app.lokalebauernconnect.de`) komplett nicht erreichbar.
- Supabase-DB nicht verfügbar **oder** Verdacht auf Datenverlust.
- **SB-Bezahlung defekt:** Zahlungen schlagen flächig fehl, werden **doppelt** verbucht, oder Geld fließt falsch (Connect-Auszahlung an falschen Hof). USP-Kern — höchste Priorität.
- **Sicherheits-/Datenschutzvorfall:** Datenleck, unbefugter Zugriff, **RLS-/Tenant-Isolations-Bruch** (eine Org sieht/ändert Fremddaten), geleaktes `service_role`/Stripe-Secret.
- Käufer-/Erzeuger-/Staff-Sessions vermischen sich (Berechtigungs-Bruch).

**Reaktionszeit:** < 15 Min · **Eskalation:** sofort IC + Owner · **Kommunikation:** Statuspage + betroffene Kunden < 30 Min · **PIR Pflicht.**

### SEV-2 — Hoch (schnell)
- Einzelner Kernpfad degradiert (Finder lädt langsam, Reservierung sporadisch fehlerhaft, Mails verzögert).
- Erhöhte Fehlerrate (> 5 % 5xx über Cloudflare/Edge) ohne Totalausfall.
- Supabase-Performance stark eingebrochen (P95 deutlich über Norm, Pooler-Sättigung).
- Migration fehlgeschlagen / partiell → neue Funktion fehlt, Bestand stabil.
- Stripe-**Webhook-Verzögerung** ohne Geldverlust (Events laufen auf, werden aber retried).
- Turnstile-/WAF-Fehlkonfiguration sperrt legitime Nutzer aus öffentlichen Formularen.

**Reaktionszeit:** < 30 Min · **Eskalation:** IC informieren · **Kommunikation:** intern; bei Kunden-Impact Statuspage-Update · **PIR Pflicht.**

### SEV-3 — Mittel (Geschäftszeiten)
- Einzelner geplanter Edge-Job (Cron) schlägt fehl, kein Kunden-Impact.
- Monitoring-Lücke/blinder Fleck erkannt.
- Performance-Degradierung unter Schwellwert.
- Nicht-kritischer Drittanbieter temporär gestört (z. B. Karten-Tiles, Sentry).

**Reaktionszeit:** < 4 h (Geschäftszeiten) · **Eskalation:** Ticket, nächste Welle · **Kommunikation:** nur intern · **PIR optional.**

### SEV-Matrix (Schnell-Einstufung)
| Frage | Ja → mindestens |
|---|---|
| Können Käufer **gar nicht** mehr kaufen/reservieren? | SEV-1 |
| Fließt Geld falsch / doppelt / an falschen Hof? | SEV-1 |
| Sieht/ändert eine Org **fremde** Daten? | SEV-1 |
| Ist ein Secret oder personenbezogener Datensatz **abgeflossen**? | SEV-1 + §8 |
| Ist ein Kernpfad spürbar **degradiert**, aber nutzbar? | SEV-2 |
| Betrifft es nur einen internen Job ohne Kunden-Impact? | SEV-3 |

> **Hochstufungs-Regel:** Bleibt ein SEV-2 nach **30 Min** ohne Stabilisierung, oder weitet sich der Impact aus → **SEV-1**. Severity darf jederzeit nach oben korrigiert werden; eine Herabstufung entscheidet nur der IC und wird protokolliert.

---

## 2. Erkennung (Detection)

Incidents werden über **vier** Kanäle erkannt — automatisiert vor manuell.

| Quelle | Was sie meldet | Verweis |
|---|---|---|
| **Health-Endpunkt** (Edge Function `health`) | App/DB/Stripe-Anbindung erreichbar (`{ ok, components, scope, ts }`) | §2.1, `docs/MONITORING.md` |
| **Cloudflare Analytics/Logs + WAF** | 5xx-Rate, Latenz, Angriffsmuster, Rate-Limit-Treffer | §2.2 |
| **Supabase Dashboard** (Logs/Reports) | DB-Health, Auth-Fehler, Edge-Function-Logs, Pooler-Auslastung | §2.3 |
| **Stripe Dashboard** (Webhooks/Events/Radar) | Webhook-Zustellung, fehlgeschlagene Zahlungen, Disputes | §2.4 |
| **Sentry** (ab WAVE_13) | Frontend-/Edge-Exceptions, Release-Health | `docs/OBSERVABILITY.md` |
| **Mensch** | Kunden-/Erzeuger-Meldung, Support-Ticket, Staff-Beobachtung | Eingang → IC stuft ein |

### 2.1 Health-Check (erste 60 Sekunden)
Der Health-Endpunkt ist eine **öffentliche, schlanke** Supabase Edge Function ohne `service_role` und ohne sensible Felder (Zero-State-konform: niemals 500 bei leeren Daten — leere Komponente meldet `degraded`, nicht Crash).

```bash
# App erreichbar (Cloudflare Pages)?
curl -sf -o /dev/null -w "%{http_code}\n" https://app.lokalebauernconnect.de/

# Health-Aggregat (Edge Function): DB / Auth / Stripe-Anbindung
curl -sf https://<PROJECT_REF>.supabase.co/functions/v1/health | jq .
# Erwartung: { "ok": true, "components": { "db":"ok", "auth":"ok", "stripe":"ok" }, "scope":"platform", "ts":"…" }
```

Erwartetes Shape (Pfeiler 2/3 — Zero-State + Scope-Transparenz):
```json
{
  "ok": true,
  "components": { "db": "ok", "auth": "ok", "stripe": "ok", "storage": "ok" },
  "scope": "platform",
  "version": "<git-sha>",
  "ts": "2026-06-19T10:00:00Z"
}
```
> `ok:false` mit Komponenten-Status zeigt sofort, **welche** Schicht betroffen ist → direkt ins passende Szenario (§5). Der Endpunkt gibt **nie** Secrets, Verbindungsstrings oder personenbezogene Daten zurück.

### 2.2 Cloudflare prüfen
- **Dashboard → Workers & Pages →** Projekt `lokalebauernconnect-app` / `-landing` → letzte Deployments (Commit-SHA, Build-Status).
- **Analytics → Traffic/Errors:** 5xx-Rate, Caching, Top-Pfade.
- **Security → WAF/Events:** blockierte Requests, Rate-Limit-Treffer, Bot-Score — prüfen, ob die WAF **legitime** Nutzer blockt (False Positive = SEV-2).
- **CLI:** `wrangler pages deployment list --project-name=lokalebauernconnect-app`

### 2.3 Supabase prüfen
- **Dashboard → Logs:** `postgres`, `auth`, `edge-functions`, `realtime` (nach Zeitraum/Severity filtern).
- **Dashboard → Reports → Database:** Verbindungen, langsame Queries, Index-Nutzung.
- **CLI:** `supabase functions logs <name> --project-ref <ref>` · `supabase projects list`

### 2.4 Stripe prüfen
- **Dashboard → Developers → Webhooks:** Zustellungsrate, fehlgeschlagene Versuche (Stripe retried bis 72 h).
- **Dashboard → Payments / Events:** fehlgeschlagene PaymentIntents, Disputes, Connect-Auszahlungsfehler.
- **Status:** https://status.stripe.com
- **CLI (Verifikation):** `stripe events list --limit 20` · lokaler Replay-Test `stripe listen --forward-to https://<ref>.supabase.co/functions/v1/stripe-webhook`

### 2.5 Alert-Schwellen (Soll, kanonisch in `docs/MONITORING.md`)
| Signal | Warn (SEV-2-Kandidat) | Kritisch (SEV-1-Kandidat) |
|---|---|---|
| App 5xx-Rate (5 min) | > 1 % | > 5 % |
| Health `ok` | `db`/`auth` = `degraded` | `false` ≥ 2 min |
| Stripe Webhook-Erfolg (1 h) | < 99 % | < 95 % oder Backlog wächst |
| Supabase DB-Verbindungen | > 70 % Pool | > 90 % Pool / Rejections |
| Edge-Function-Fehlerrate | > 2 % | > 10 % |
| RLS-Isolationstest (CI/Cron) | — | **jeder** Fehlschlag = SEV-1 |

---

## 3. Sofortmaßnahmen-Checkliste (jeder Incident)

1. **Zeitstempel (UTC) notieren** — wann erkannt, durch wen/was.
2. **Impact einschätzen** — welche Welt (Käufer/Erzeuger/Staff)? wie viele Orgs/Nutzer? Geldfluss betroffen?
3. **Severity setzen** (§1) — im Zweifel hochstufen.
4. **Incident-Datensatz anlegen** — `incidents`-Zeile (§9) oder, falls DB betroffen, manuell im Incident-Kanal; später nachtragen.
5. **Incident-Kanal öffnen** — dedizierter Slack/Teams-Thread; IC/Operator/Comms benennen.
6. **Statuspage vorbereiten** (Comms) — bei SEV-1/2 mit Kunden-Impact Entwurf bereithalten (🔑 Owner gibt frei).
7. **Diagnose starten** — Szenario in §5 wählen; **erst stabilisieren** (Schreiben stoppen / Rollback), dann tiefer analysieren.
8. **Nichts Riskantes ohne Backup-Bewusstsein** — vor jeder DB-Schreib-/Rückroll-Aktion: PITR/Backup-Verfügbarkeit klären (🔑 Owner).

> **Goldene Regel bei Geld-/Daten-Zweifel:** Lieber **Schreiben pausieren** (Endpoint/Edge-Function/Webhook) und kontrolliert nacharbeiten, als mit ungewissem Zustand weiterlaufen lassen. Bei der SB-Bezahlung gilt: Idempotenz schützt — doppelte Events sind unkritisch, **stiller Zustandsverlust** ist es nicht.

---

## 4. Diagnostik-Schnellreferenz (stack-spezifisch)

```bash
# === Frontend / Cloudflare ===
curl -sI https://app.lokalebauernconnect.de/ | head -n1          # HTTP-Status
curl -sI https://app.lokalebauernconnect.de/ | grep -i -E 'content-security-policy|strict-transport'  # Header da?
wrangler pages deployment list --project-name=lokalebauernconnect-app

# === Edge / Supabase ===
curl -sf https://<ref>.supabase.co/functions/v1/health | jq .     # Aggregat-Health
supabase functions logs stripe-webhook --project-ref <ref>        # Webhook-Handler-Logs
supabase functions logs reservation-transition --project-ref <ref>

# === DB (read-only Diagnose via SQL-Editor / psql) ===
# Aktive, lange Queries
SELECT pid, now()-query_start AS dur, state, left(query,120)
FROM pg_stat_activity WHERE state<>'idle' AND now()-query_start>interval '5 seconds'
ORDER BY dur DESC;
# Verbindungen nach Status (Pool-Sättigung)
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
# Lock-Konflikte (Blocker)
SELECT bl.pid AS blocked, kl.pid AS blocking, left(a.query,80) AS blocked_query
FROM pg_locks bl JOIN pg_stat_activity a ON a.pid=bl.pid
JOIN pg_locks kl ON kl.locktype=bl.locktype AND kl.pid<>bl.pid AND kl.granted
WHERE NOT bl.granted;

# === Stripe ===
stripe events list --limit 20
stripe events resend <evt_id>     # gezielter Replay an den (idempotenten) Webhook
```

> **Kein `docker`/`ssh` in diesem Stack.** Es gibt keine Container-Hosts; Diagnose erfolgt über die Provider-Oberflächen/CLIs oben. Wer hier nach `docker ps` greift, ist im falschen Runbook.

---

## 5. Szenarien (Diagnose → Stabilisieren → Behebung → Eskalation)

### Szenario 1 — App nicht erreichbar (Cloudflare Pages)
**Symptome:** Health der Pages-URL ≠ 200, weißer Screen / JS-Fehler in der Konsole, Kunden melden „lädt nicht".

**Diagnose:** `wrangler pages deployment list` → ist der zuletzt **aktive** Deploy der erwartete Commit? Build-Status grün? Konsole: blockt CSP Assets (→ Header-Defekt)?

**Stabilisieren (schnell, reversibel):**
- **Pages-Rollback** auf letzten grünen Deploy: Dashboard → Pages-Projekt → *Deployments* → guter Deploy → **„Rollback to this deployment"** (sekundenschnell, `docs/DEPLOYMENT.md` §10.1).
- Bei CSP-/Header-Defekt: Rollback + Header in `_headers`/`docs/security/SECURITY_OVERVIEW.md` korrigieren, dann regulär nachziehen.

**Behebung:** Ursache des fehlerhaften Deploys beheben → Gate A/B/F (Build, Security, Smoke) → regulärer Git-Deploy. **Eskalation:** kein grüner Stand verfügbar oder Cloudflare-seitiger Ausfall → SEV-1, https://www.cloudflarestatus.com prüfen, Statuspage.

### Szenario 2 — Supabase DB nicht verfügbar
**Symptome:** Health `components.db ≠ ok`; App-Reads/Writes liefern Fehler; Reservierung/Verfügbarkeit nicht ladbar.

**Diagnose:** Supabase Dashboard → Project Status / Logs (`postgres`); Region-Incident? Pool erschöpft (`pg_stat_activity`)? Wartung?

**Stabilisieren:**
- **Managed-Ausfall (Supabase-seitig):** https://status.supabase.com prüfen → keine eigenmächtige DB-Operation; warten/eskalieren, Statuspage. SEV-1.
- **Pool-Sättigung (eigenseitig):** Idle-Verbindungen identifizieren; sicherstellen, dass die App den **Connection-Pooler** (Transaction-Mode) nutzt (nicht direkte Verbindungen pro Request). Edge-Functions kurz halten.

**Behebung:** Pooler-Konfiguration/Query-Effizienz härten (`docs/MONITORING.md`, WAVE_11 DB-Härtung). **Eskalation:** Datenverlust-Verdacht → §6 (PITR, 🔑 Owner) + ggf. §8 (Datenpanne).

### Szenario 3 — SB-Bezahlung / Stripe-Webhook (USP — höchste Sorgfalt)
> **Wahrheit ist Stripe.** `sb_payments` ist der **signaturgeprüfte, idempotente Spiegel**, geschrieben **ausschließlich** vom Webhook-Handler (Edge Function, `service_role`). Idempotenz über `UNIQUE(stripe_event_id)` + `UNIQUE(stripe_payment_intent_id)` (`docs/DATABASE_MODEL.md` §4.7). Das Frontend liest nur.

#### 3a. Webhook-Stau / Events kommen nicht an
**Symptome:** Stripe → Webhooks zeigt fehlgeschlagene Zustellungen; `sb_payments` hinkt hinterher; Käufer hat gezahlt, sieht aber keine Quittung.
**Diagnose:** `supabase functions logs stripe-webhook` (Signatur-Fehler? Timeout? 5xx?); Stripe-Webhook-Endpoint-Logs; `STRIPE_WEBHOOK_SECRET` korrekt (Live ≠ Test, `docs/DEPLOYMENT.md` §6.5)?
**Stabilisieren:** Endpoint-Bug fixen → Edge-Function redeploy (`supabase functions deploy stripe-webhook`). Stripe **retried automatisch bis 72 h**; nach Fix offene Events `stripe events resend <evt_id>` — der **idempotente** Handler verbucht sie sicher, ohne Doppelbuchung. SEV-2 (kein Geldverlust), **SEV-1**, wenn Quittungen flächig ausbleiben.
**Verifikation:** `sb_payments`-Status vs. Stripe-Dashboard abgleichen; Käufer-Quittung erreichbar; Audit-Einträge (`sb_payment.succeeded`) vorhanden.

#### 3b. Doppelbuchung / falscher Geldfluss
**Symptome:** Käufer mehrfach belastet, oder Connect-Auszahlung an falschen Hof.
**Stabilisieren:** **SOFORT SEV-1.** Webhook-Endpoint in Stripe **pausieren** (Schreiben stoppen) → Audit-Log (`sb_payment.*`) + Stripe-Events auswerten → betroffene PaymentIntents identifizieren.
**Behebung:** Erstattung **ausschließlich in Stripe** auslösen (🔑 Owner; die Plattform ist Vermittler/Zahlungsanbindung, kein Eigenverkauf — Rückabwicklung läuft über Stripe-Refund, nicht über manuelle DB-Edits). DB nur **lesend** prüfen; falls `sb_payments` inkonsistent → kompensierender, auditierten Edge-Schreibpfad (kein händisches `UPDATE` per SQL-Editor ohne Audit). Idempotenz-Indizes prüfen/wiederherstellen.
**Kunden-Kommunikation:** proaktiv, faktenbasiert (§7), Hinweis: betroffene Beträge werden über den Zahlungsdienstleister erstattet.

#### 3c. Stripe-Ausfall (Drittanbieter)
**Symptome:** Zahlungen am SB-Stand schlagen fehl; https://status.stripe.com meldet Störung.
**Stabilisieren:** Plattform-Nutzung (Finder/Reservierung) bleibt verfügbar — nur die **SB-Sofortzahlung** ist betroffen. Klare Stand-Kommunikation: „Bezahlung am Stand derzeit gestört" (§7). **Keinen Bargeld-/Vertrauenskassen-Ersatz seitens Plattform empfehlen** (Haftung Erzeuger). SEV-1 wegen USP-Geldfluss, aber kein Datenverlust.
**Recovery:** nach Stripe-Wiederherstellung Webhook-Backlog wie 3a nacharbeiten.

### Szenario 4 — Tenant-Isolation / Sicherheitsvorfall (immer SEV-1)
> Pfeiler 1 + 5. Querverweis `docs/security/TENANT_ISOLATION_MODEL.md`, `docs/security/SECURITY_OVERVIEW.md`.

**Auslöser:** Isolationstest rot, Org sieht/ändert Fremddaten, Käufer-/Erzeuger-/Staff-Session vermischt, geleaktes Secret, unbefugter Zugriff.

**Stabilisieren (Reihenfolge):**
1. **Eindämmen:** Betroffenen Pfad sperren — fehlerhafte RLS-Policy/Edge-Function deaktivieren oder Endpoint pausieren; im Extremfall Pages-Rollback auf sicheren Stand.
2. **Secret-Kompromittierung:** **sofortige Rotation** nach `docs/security/SECRET_ROTATION.md` (`service_role`, Stripe-Keys, Webhook-Secret, Turnstile-Secret). Niemals im Log/Code; alte Keys widerrufen.
3. **Beweise sichern:** Audit-Log (`audit_log`), Edge-/Cloudflare-/Supabase-Logs **vor** Cleanup exportieren (Zeitraum, betroffene `org_id`/`entity_id`).
4. **Umfang bestimmen:** Welche Datensätze/Personen? Über `audit_log (entity_type, entity_id)` und Zugriffslogs eingrenzen.

**Behebung:** RLS-Policy als **neue Migration** (deny-by-default) + Negativ-/Cross-Org-Test grün (`docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`). **Kein** Merge ohne grünen Isolationstest (AGENTS.md harte Regel). **Eskalation:** personenbezogene Daten betroffen → **§8 (Datenpanne, 72 h)** zwingend.

### Szenario 5 — Migration fehlgeschlagen
> Migrationen sind **additiv** (`app/supabase/migrations/`, fortlaufend nummeriert). Rückbau = **neue, kompensierende Migration**, nicht Zurücksetzen alter Dateien (`docs/DEPLOYMENT.md` §10.3).

**Symptome:** `supabase db push` bricht ab; neue Funktion fehlt, Bestand stabil (i. d. R. SEV-2).
**Diagnose:** Push-Ausgabe + `supabase migration list --project-ref <ref>`; welche Migration brach? Constraint-/Syntaxfehler in den Logs.
**Stabilisieren:** App-Stand ist meist robust (additiv); betroffenes Feature per Feature-Flag aus, falls nötig.
**Behebung:** 🔑 Owner-Bewusstsein für DB-Schreiben → Migration korrigieren (idempotent: `IF NOT EXISTS`/`ADD VALUE IF NOT EXISTS`) → erneut `db push`; bei partiellem Stand kompensierende Migration `000N_revert_*.sql`. Danach **Isolationstest erneut grün**.
**Prävention:** keine destruktiven Operationen in derselben Migration wie Features; große Datenmigrationen in Batches; lokal/Staging zuerst.

### Szenario 6 — Drittanbieter & Edge-Jobs
| Dienst | Wirkung | Sofortmaßnahme | Severity |
|---|---|---|---|
| **Cloudflare** (Pages/WAF) | Auslieferung/Schutz | status.cloudflarestatus.com; WAF-False-Positive lockern | SEV-1/2 |
| **Supabase** (DB/Auth/Edge) | Kern | status.supabase.com; siehe §2/§5.2 | SEV-1 |
| **Stripe** | SB-Zahlung | §3c | SEV-1 |
| **E-Mail/Transaktionsmail** | Registrierung/Benachr. | Provider-Status, Credentials/Rate-Limit prüfen, Fallback-Absender | SEV-2 (Auth-Mail) / SEV-3 |
| **Karten-Tiles (OSM/MapLibre, Track B)** | Karte | Cache/Fallback-Stil; Finder bleibt per Liste nutzbar | SEV-3 |
| **Sentry** | Error-Tracking | non-blocking; status.sentry.io; Logs als Fallback | SEV-3 |
| **Edge-Cron** (Saison-Radar, Waitlist-Benachr.) | Hintergrund | Job manuell triggern; Secret/Schedule prüfen | SEV-2/3 |

---

## 6. Datenverlust & Wiederherstellung (Kurz — Detail in BACKUP_DISASTER_RECOVERY.md)

- **PITR (Point-in-Time-Recovery, Supabase, EU):** Wiederherstellung auf einen Zeitpunkt **vor** dem Vorfall. **🔑 Owner**, nie automatisch — Wiederherstellung kann jüngste legitime Schreibvorgänge verwerfen. Vorab: Backup-/PITR-Verfügbarkeit im Plan bestätigen, Zeitpunkt exakt aus der Timeline ableiten.
- **RPO/RTO (Zielwerte, kanonisch in `docs/BACKUP_DISASTER_RECOVERY.md`):** SEV-1-Datenverlust → RPO ≤ 24 h (besser PITR-genau), RTO ≤ 4 h.
- **Reihenfolge:** Schreiben stoppen → Umfang bestimmen → Backup/PITR sichern → Wiederherstellung (Owner) → **Isolationstest erneut grün** → Smoke (Finder→Reservierung→SB-Zahlung) → Audit-Eintrag der Wiederherstellung.

---

## 7. Kommunikation

**Prinzipien (Vermittler-konform, New-York-Marketing-Disziplin):** ehrlich, knapp, ohne Schuldzuweisung, ohne Vertröstung. Externe Aussagen nur durch **Comms** nach **IC-/🔑-Owner-Freigabe**. Niemals fremde Warenverantwortung übernehmen — wir kommunizieren über Vermittlung/Zahlungsanbindung. Keine Deko-Emojis, keine Floskeln.

### 7.1 Kanäle
| Kanal | Wann | Eigentümer |
|---|---|---|
| **Statuspage** (öffentlich) | SEV-1 immer; SEV-2 bei Kunden-Impact | Comms |
| **E-Mail an Betroffene** | SEV-1; SEV-2 mit gezieltem Impact | Comms |
| **In-App-Banner** | aktiver Kunden-Impact | Operator/Comms |
| **Intern (Incident-Kanal)** | jeder Incident | Scribe |
| **Aufsichtsbehörde / Betroffene (DSGVO)** | Datenpanne (§8) | DSB + 🔑 Owner |

### 7.2 Takt
- **SEV-1:** Erstmeldung ≤ 30 Min, danach Updates ≥ alle 60 Min bis Entwarnung.
- **SEV-2:** Erstmeldung bei Kunden-Impact, Update bei Statuswechsel.

### 7.3 Vorlagen
**SEV-1 Erstmeldung (Statuspage/E-Mail):**
> **Betreff:** [LokaleBauernConnect] Störung — [Kurzbeschreibung]
>
> Derzeit liegt eine Störung vor: [betroffene Funktion, z. B. „Bezahlung am Stand"] ist eingeschränkt. Wir arbeiten mit Hochdruck an der Behebung und informieren, sobald die Störung behoben ist.
>
> Erkannt: [YYYY-MM-DD HH:MM UTC] · Nächstes Update: [HH:MM UTC]

**SEV-1 Entwarnung:**
> **Betreff:** [LokaleBauernConnect] Störung behoben — [Kurzbeschreibung]
>
> Die Störung bei [Funktion] wurde um [HH:MM UTC] behoben; der Dienst ist wieder vollständig verfügbar. Ursache: [kurze, nicht-technische Erklärung]. [Falls relevant: Betroffene Beträge werden über unseren Zahlungsdienstleister erstattet.] Wir bitten die Unannehmlichkeiten zu entschuldigen.

**SB-Zahlung gestört (Vermittler-Formulierung):**
> Die bargeldlose Bezahlung am Stand ist aktuell vorübergehend gestört. Die Hofladen-Suche und Reservierung funktionieren normal. Bereits angestoßene Zahlungen werden über unseren Zahlungsdienstleister korrekt abgeschlossen, sobald der Dienst wiederhergestellt ist.

---

## 8. Datenpanne — DSGVO-Meldekette (Art. 33/34, 72 Stunden)

> **Normativer Anker.** `docs/COMPLIANCE_MODEL.md` delegiert die Datenpannen-/72-h-Meldekette ausdrücklich hierher. Auslöser: jeder bestätigte oder hinreichend wahrscheinliche **unbefugte Zugriff, Verlust, Veränderung oder Offenlegung personenbezogener Daten** (Käufer-/Erzeuger-Profile, Kontaktdaten, Reservierungs-/Zahlungsbezüge). Tritt **immer zusätzlich** zur technischen Behebung (§5.4) ein.

### 8.1 Uhr und Pflichten
- **Frist:** Meldung an die zuständige **Aufsichtsbehörde unverzüglich, spätestens 72 h** nach **Bekanntwerden** (Art. 33). **Uhr startet bei Kenntnis**, nicht bei vollständiger Aufklärung — eine **vorläufige** Meldung ist zulässig und vorzuziehen, statt die Frist zu reißen.
- **Betroffenen-Benachrichtigung (Art. 34):** „unverzüglich" bei **hohem Risiko** für Rechte/Freiheiten (z. B. Klardaten abgeflossen ohne Verschlüsselung).
- **AVV-Kette:** Auftragsverarbeiter (z. B. Hosting/Provider) melden Pannen **innerhalb 24 h** an den Verantwortlichen (`docs/COMPLIANCE_MODEL.md`); diese Frist im Lieferanten-Incident beachten.

### 8.2 Ablauf (parallel zur technischen Behebung)
1. **T0 — Kenntnis protokollieren** (`incidents.detected_at`, `is_data_breach=true`). 72-h-Uhr startet.
2. **Bewerten (DSB + IC):** Kategorien & Umfang der Daten, Anzahl Betroffener, Eintrittswahrscheinlichkeit eines Schadens, Risikostufe.
3. **Eindämmen & Beweise sichern** (§5.4): Zugriff stoppen, Secrets rotieren, Logs/`audit_log` exportieren.
4. **Behörden-Meldung vorbereiten** (Pflichtinhalte Art. 33 Abs. 3): Art der Verletzung, Kategorien/Zahl Betroffener und Datensätze, voraussichtliche Folgen, ergriffene/geplante Maßnahmen, DSB-Kontakt.
5. **🔑 Owner/DSB-Freigabe → Meldung** an die zuständige Aufsichtsbehörde (Bundesland-LfDI des Verantwortlichen-Sitzes).
6. **Betroffene benachrichtigen** (falls Art. 34): klar, in einfacher Sprache, mit Empfehlungen (z. B. Passwort ändern).
7. **Dokumentieren (Rechenschaftspflicht Art. 5 Abs. 2):** vollständige Verkettung in `incidents` + `audit_log` (`incident.breach.reported`), unabhängig davon, ob gemeldet wurde — **jede** Panne wird intern dokumentiert.

### 8.3 Entscheidungshilfe „melden?"
| Lage | Behörde (Art. 33) | Betroffene (Art. 34) |
|---|---|---|
| Daten **wirksam verschlüsselt**/anonym, kein Zugriff plausibel | i. d. R. nein (dokumentieren) | nein |
| Unbefugter Zugriff auf Klar-Personendaten | **ja, ≤ 72 h** | bei hohem Risiko **ja** |
| Reines Verfügbarkeitsproblem ohne Vertraulichkeits-/Integritätsverlust | i. d. R. nein | nein |
| Unsicher | **im Zweifel melden** (vorläufig) | nach DSB-Bewertung |

> **Grundsatz:** Im Zweifel **fristwahrend vorläufig melden**. Fristversäumnis ist gravierender als eine nachgereichte Präzisierung.

---

## 9. Incident-Datenmodell (`incidents` · `incident_updates`)

> **Additiv** zum bestehenden Schema (`docs/DATABASE_MODEL.md`), gleiche Konventionen: `id UUID PK DEFAULT gen_random_uuid()`, `created_at/updated_at/deleted_at TIMESTAMPTZ`, `org_id` wo mandantenbezogen, **RLS deny-by-default**, Schreiben über Edge Function (service role) bzw. Staff mit Recht. Jede Statusänderung zusätzlich in `audit_log` (Pfeiler 5). Empfohlene Migrationen: `0010_incidents.sql`, `0011_incident_updates.sql` (Nummerierung an den real letzten Stand anpassen).

### 9.1 Enums (native Postgres-Enums, 1:1 mit `app/src/lib/types.ts`; additiv via `ALTER TYPE … ADD VALUE`)
```sql
create type incident_severity as enum ('sev1','sev2','sev3');
create type incident_status   as enum ('detected','investigating','identified','mitigated','resolved','postmortem','closed');
create type incident_category as enum
  ('availability','data','payment','security','tenant_isolation','migration','third_party','other');
```

### 9.2 Tabelle `incidents`
| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | |
| `ref` | TEXT | UNIQUE NOT NULL | menschenlesbare Kennung, z. B. `INC-2026-0007` |
| `title` | TEXT | NOT NULL, CHECK length 3–200 | Kurztitel |
| `severity` | `incident_severity` | NOT NULL | SEV-1/2/3 (§1) |
| `category` | `incident_category` | NOT NULL | Klassifikation (§5) |
| `status` | `incident_status` | NOT NULL DEFAULT `'detected'` | Lebenszyklus (§9.4) |
| `org_id` | UUID | NULL, FK → `orgs(id)` ON DELETE SET NULL | betroffener Mandant; NULL = plattformweit |
| `commander_id` | UUID | NULL, FK → `profiles(id)` ON DELETE SET NULL | Incident Commander |
| `summary` | TEXT | NULL | öffentliche/interne Kurzfassung |
| `impact` | TEXT | NULL | Wirkung (Welten, Orgs/Nutzer, Geldfluss) |
| `is_data_breach` | BOOLEAN | NOT NULL DEFAULT false | löst §8-Kette aus |
| `breach_reported_at` | TIMESTAMPTZ | NULL | Behörden-Meldung (Art. 33) gesetzt |
| `affected_users_est` | INTEGER | NULL, CHECK ≥ 0 | geschätzte Betroffene |
| `root_cause` | TEXT | NULL | nach RCA |
| `detected_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | **T0** — Kenntnis (72-h-Uhr) |
| `acknowledged_at` | TIMESTAMPTZ | NULL | IC übernommen |
| `mitigated_at` | TIMESTAMPTZ | NULL | Service stabilisiert |
| `resolved_at` | TIMESTAMPTZ | NULL | dauerhaft behoben |
| `closed_at` | TIMESTAMPTZ | NULL | PIR abgeschlossen |
| `created_at` / `updated_at` / `deleted_at` | TIMESTAMPTZ | s. o. | |

**Indizes:** `(status, severity, detected_at DESC)` (offene zuerst) · `(org_id, detected_at DESC)` · `(is_data_breach) WHERE is_data_breach` (Datenpannen-Register) · `(ref) UNIQUE`.

### 9.3 Tabelle `incident_updates` (Timeline, append-only)
| Spalte | Typ | Constraints / Default | Bedeutung |
|---|---|---|---|
| `id` | UUID | PK DEFAULT `gen_random_uuid()` | |
| `incident_id` | UUID | NOT NULL, FK → `incidents(id)` ON DELETE CASCADE | |
| `author_id` | UUID | NULL, FK → `profiles(id)` ON DELETE SET NULL | NULL = System/Edge-Job |
| `update_kind` | TEXT | NOT NULL, CHECK in (`note`,`status_change`,`comms`,`action`) | Art des Eintrags |
| `from_status` / `to_status` | `incident_status` | NULL | bei `status_change` |
| `body` | TEXT | NOT NULL, CHECK length 1–4000 | Eintrag (Diagnose, Maßnahme, Kommunikation) |
| `is_public` | BOOLEAN | NOT NULL DEFAULT false | floss in Statuspage/Kunden-Mail |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Append-only** (kein UPDATE/DELETE per RLS — wie `audit_log`). Index: `(incident_id, created_at)`.

### 9.4 Statusmaschine (erlaubte Übergänge — in Edge Function `incident-transition` erzwungen, nicht im Client)
```
detected → investigating → identified → mitigated → resolved → postmortem → closed
   │            │                                        │
   └──────── (jederzeit) ─────── severity-Hochstufung ──┘   (resolved → reopened: zurück zu investigating)
```
- Jeder Übergang schreibt `incident_updates(update_kind='status_change')` **und** `audit_log(action='incident.<to_status>', entity_type='incident', reason Pflicht ab mitigated/resolved)`.
- `closed` nur, wenn PIR (§10) existiert und für SEV-1/2 abgeschlossen ist.
- Setzen von `is_data_breach=true` triggert verpflichtend die §8-Checkliste (App-seitig erzwungen, Audit `incident.breach.flagged`).

### 9.5 RLS (deny-by-default — wie alle Tabellen)
| Operation | Policy |
|---|---|
| SELECT | **Staff** (Plattform-Org) sieht alle; **Erzeuger** sieht nur Incidents mit eigener `org_id` (Transparenz bei sie betreffenden Störungen); **Käufer** kein direkter Zugriff (sehen nur die öffentliche Statuspage). |
| INSERT/UPDATE | **nur** Staff mit Recht `incident.manage` **oder** Edge Function (service role, automatische Erfassung). Statuswechsel nur über `incident-transition`. |
| DELETE | nie (Soft-Delete `deleted_at`; `incident_updates` append-only). |

> **Isolationstest (Pflicht, Pfeiler 6):** Erzeuger-Org A darf Incidents der Org B **nicht** sehen (403/leer, nie 200 mit Fremddaten); Käufer-Token erhält 403 auf `/incidents`; valider Staff-Aufruf liefert erwartetes Shape mit `scope`.

### 9.6 End-to-End-Verdrahtung (Pfeiler 7 — keine Sackgasse)
- **Erfassung:** Alert/Health-Fail/Mensch → Edge Function `incident-open` legt `incidents`-Zeile + erste `incident_updates`-Note an, setzt `detected_at`.
- **Statuspage-Sync:** `incident_updates.is_public=true` → Edge-Job veröffentlicht (idempotent) auf der öffentlichen Statuspage; Käufer-Banner liest denselben Stand.
- **Owner/Staff-Konsole (Phase 3, Ops-Gate):** Incident-Liste mit `scope`, Lade-/Leer-/Fehlerzustand (Zero-State: „Keine offenen Incidents"), Drilldown auf Timeline; Deep-Link trägt `incident_id`, baut nie org-fremde URLs.
- **Verifikation gilt erst als fertig**, wenn die Kette steht: Health-Fail → `incidents`-Zeile → Konsole zeigt Eintrag → Statuspage-Update → Audit-Log — ohne TODO, ohne toten Button.

---

## 10. Postmortem (Post-Incident Review, PIR)

**Pflicht** für jeden SEV-1 und SEV-2 innerhalb **48 h** nach `resolved_at`. **Blameless** — Frage ist „**was** und **warum**", nicht „wer". Ohne abgeschlossenes PIR kein `status='closed'` (SEV-1/2).

### 10.1 Ablauf
1. **Timeline** minutengenau aus `incident_updates` rekonstruieren.
2. **Root Cause** (5-Why o. ä.) — technische **und** Prozess-Ursache.
3. **Impact quantifizieren** — Dauer, betroffene Welten/Orgs/Nutzer, Geld-/Vertrauens-Impact.
4. **Action Items** — konkret, mit Owner + Deadline + Verifikation; in `incidents.root_cause` + Tracker.
5. **Lern-Loop** — wiederverwendbare Lektion → `.claude/learning/insights_inbox.md` (Kategorie TECHNIK/EFFIZIENZ), Muster → `.claude/memory/patterns/`, Architektur-Konsequenz → ADR (AGENTS.md Lern-System). Relevante Änderung → `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md`.

### 10.2 PIR-Template
```markdown
## PIR — [INC-YYYY-NNNN] [Titel]

### Zusammenfassung
- Severity: SEV-[1/2]  · Kategorie: [availability/data/payment/security/…]
- Dauer: [detected_at] → [resolved_at] ([X] Min)
- Impact: [Welten/Orgs/Nutzer], Geldfluss: [ja/nein]
- Datenpanne: [nein / ja → §8: gemeldet am …]
- Root Cause: [1–2 Sätze]

### Timeline (UTC, aus incident_updates)
| Zeit | Ereignis |
|---|---|
| HH:MM | erkannt (Quelle) |
| HH:MM | IC übernommen / Severity gesetzt |
| HH:MM | Stabilisierung (z. B. Pages-Rollback) |
| HH:MM | Ursache identifiziert |
| HH:MM | Service wiederhergestellt |

### Was lief gut
- …
### Was lief schlecht / Beinahe-Verschlimmerung
- …
### Action Items
| # | Maßnahme | Owner | Deadline | Verifikation | Status |
|---|---|---|---|---|---|
| 1 | … | … | … | [Test/Gate] | offen |
```

---

## 11. Eskalationspfade

| Stufe | Zeitfenster | Wer | Befugnis |
|---|---|---|---|
| **1 — Operator/On-Call** | 0–15 Min | diensthabend | Diagnose + Runbook-Sofortmaßnahmen (Rollback, Endpoint pausieren) |
| **2 — Incident Commander** | 15–30 Min | IC/Owner | Severity, Rollback-Entscheidung, Multi-System-Koordination |
| **3 — Owner + DSB** | 30 Min+ / jeder SEV-1 / Datenpanne | Owner, DSB | 🔑 externe Kommunikation, DB-Rückrollung/PITR, Stripe-Refunds, Behörden-Meldung, Provider-Support |

**Provider-Kontakte:**
```
Cloudflare:  https://dash.cloudflare.com → Support · Status: https://www.cloudflarestatus.com
Supabase:    https://supabase.com/dashboard → Support · Status: https://status.supabase.com
Stripe:      https://support.stripe.com · Status: https://status.stripe.com
Aufsichtsbehörde (DSGVO): LfDI des Verantwortlichen-Sitzes (Bundesland) — siehe docs/COMPLIANCE_MODEL.md
On-Call / IC / DSB:  [mit echten Kontaktdaten vor Go-Live befüllen — Owner-Aufgabe]
```
> Kontakt-Platzhalter sind **vor dem Phase-3-Ops-Gate** mit echten Daten zu füllen (Owner). Ein Runbook mit leeren Kontakten besteht das Ops-Gate nicht.

---

## 12. Prävention & Bereitschaft

**Täglich (automatisiert):**
- Health-Endpunkt grün (`/functions/v1/health`).
- Backup/PITR-Punkt vorhanden (Supabase, `docs/BACKUP_DISASTER_RECOVERY.md`).
- Geplante Edge-Jobs gelaufen (Saison-Radar, Waitlist-Benachrichtigung).

**Wöchentlich (manuell):**
- Trends prüfen (5xx-Rate, Latenz, DB-Verbindungen, Webhook-Erfolg).
- Stripe-Webhook-Fehlversuche reviewen.
- Sentry-Fehler (ab WAVE_13) auf wiederkehrende Muster.

**Monatlich:**
- **Restore-Übung** (PITR-Probe, `docs/BACKUP_DISASTER_RECOVERY.md`).
- **Isolationstest** außer der Reihe (Cross-Org-Negativtest) — bestätigt Pfeiler 1.
- Secret-Rotation-Kalender prüfen (`docs/security/SECRET_ROTATION.md`).
- **Game Day** (quartalsweise empfohlen): einen Szenario-Durchlauf (§5) simuliert üben.

---

## 13. Schnellreferenz — wichtigste Aktionen

| Aktion | Wie |
|---|---|
| Health prüfen | `curl -sf https://<ref>.supabase.co/functions/v1/health \| jq .` |
| App-Rollback (schnell) | Pages → Deployments → guter Deploy → „Rollback to this deployment" |
| Edge-Function-Rollback | `git checkout <guter-commit> -- app/supabase/functions/<name> && supabase functions deploy <name> --project-ref <ref>` |
| Webhook-Handler-Logs | `supabase functions logs stripe-webhook --project-ref <ref>` |
| Stripe-Event erneut senden | `stripe events resend <evt_id>` (idempotent verbucht) |
| Webhook stoppen (Schreiben pausieren) | Stripe → Developers → Webhooks → Endpoint deaktivieren |
| Lange Queries finden | `pg_stat_activity`-SQL aus §4 |
| Secret rotieren | `docs/security/SECRET_ROTATION.md` |
| PITR (🔑 Owner) | Supabase → Database → Backups/PITR → Zeitpunkt vor Vorfall |
| Datenpanne starten | `incidents.is_data_breach=true` → §8-Kette, 72-h-Uhr |

---

## Dokumenten-Historie
| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 2026-06-19 | Erstfassung für Stack Cloudflare/Supabase/Stripe (Vermittler). Schweregrade, Erkennung, 6 Szenarien (inkl. SB-Bezahlung/USP & Tenant-Isolation), Kommunikation, DSGVO-72-h-Meldekette (normativer Anker aus COMPLIANCE_MODEL.md), Incident-Datenmodell (`incidents`/`incident_updates` + Enums/RLS/Statusmaschine, additiv), PIR, Eskalation, Prävention. Kein Hetzner/Docker/VMS-Vokabular. |
```