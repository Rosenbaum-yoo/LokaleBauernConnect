# Phase 5 — Manuelle Owner-Aufgaben (Stripe Live, Preise, Mail, Lernschleife)

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C
> Stack: React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect)
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Vertrag & Zahlung entstehen **direkt zwischen Käufer:in und Hof**; Quittung weist den Hof als Verkäufer und die Plattform als Vermittler aus. Disclaimer durchgängig.
> **Bezug:** `README.md` (Phase-5-Index) · `CUSTOMER_GATES.md` (Gates 10/50/100/300) · `SELF_UPDATING_CLAUDE_MD.md` (Lernschleife) · `../WAVE_09_billing.md` (Geldfluss-Mechanik, repo-real) · `../phase4_vertical/MASTERPROMPTS.md` (Track A SB-Bezahlung) · `../phase2_release/GATES.md` (Deploy/Security) · `CLAUDE.md` (7 Produktionspfeiler, §0) · `AGENTS.md` (harte Regeln) · `.claude/learning/config.md` (Takt der Lernschleife).
> **Adaptiert** aus der TempConnect-Phase-5-Manual-Tasks-Vorlage (read-only Referenz) auf **diesen Stack** und die **Hof-Domäne**. Bewusst ersetzt: **kein Hetzner / kein Self-Host-Docker / kein SCC** — Infrastruktur ist Supabase + Cloudflare (managed); Mail ist **Resend (Default-Empfehlung) oder SendGrid** über die env-gated Provider-Abstraktion `supabase/functions/_shared/email.ts`; Geldfluss ist Stripe + Connect (Erzeuger-Abo **und** SB-Bezahlung am unbemannten Stand). Keine VMS-/Zeitarbeits-Begriffe.

---

## 0. Worum es hier geht — die saubere Trennung Owner ↔ Claude

`phase5_scale/` ist die **Skalierungs- und Lern-Maschine** (siehe `README.md`), kein Feature-Code. Damit Gate 10 (erste zahlende Erzeuger) ehrlich grün werden kann, müssen einige Dinge **außerhalb des Repos** passieren — sie brauchen **echte externe Konten**, **echtes Geld** und **menschliche Entscheidungen**. Genau die sind hier dokumentiert.

| Claude liefert (im Repo, reversibel, secret-frei) | Owner führt aus (extern, irreversibel, mit echten Werten) |
|---|---|
| Migration `0004_entitlements.sql` (Plan → Limits, View `current_entitlements`) | Stripe-Account, Live-Aktivierung, Price-IDs anlegen |
| Edge Functions `create-checkout` / `stripe-webhook` (signaturgeprüft, idempotent) | Stripe-Secrets als Edge-Function-Secrets setzen, Webhook-Endpunkt registrieren |
| `_shared/email.ts` (Provider `console`/`resend`/`sendgrid`), Mail-Templates | Mail-Provider-Konto, API-Key, DNS-Records (SPF/DKIM/DMARC), Versanddomain |
| `_shared/entitlements.ts` (serverseitige Durchsetzung), Billing-UI | Finale Preise je Plan, Plan-Limits, SB-Gebührensatz festlegen |
| Lernschleife-Pfade (`.claude/learning/*`), Mechanik, Takt-Vorlage | Auto-Approve-Kategorien & Konsolidierungs-Takt bestätigen, `proposals.md` reviewen |

> **Anti-Halluzinations-Regel (verbindlich):** Wenn ein Bericht „Stripe-Live gesetzt", „Price-IDs angelegt", „Preise festgelegt", „DNS eingerichtet" oder „Lernschleife übernommen" meldet, ist das **falsch** — diese Schritte kann nur der Owner real tun. Claude bereitet vor, dokumentiert und stellt sicher, dass fehlende externe Dienste den **Code-Fortschritt nicht blockieren** (Feature-Flag / env-gated / Default-Fallback `demo` bzw. `console`). Aber: **Die Customer-Gates werden ohne diese manuellen Aufgaben nicht grün.**

> **Stop-/Freigabe-Regel:** Jeder dieser Punkte ist ein **Owner-Freigabe-Schritt** (Geld/Account/Domain/irreversibel) gemäß `CLAUDE.md §0.3` und `README.md` Abschnitt 8. Claude schaltet nichts davon eigenmächtig live; bis zur Freigabe bleibt alles repo-lokal und reversibel.

---

## 1. Billing / Stripe — VOLLAUTOMATISCH AB TAG 1 (Marktstart-Blocker für Gate 10)

**Entscheidung (Owner-Direktive, `CLAUDE.md §0.3`):** Kein manuelles Rechnungswesen. Stripe Billing läuft ab dem ersten zahlenden Erzeuger vollautomatisch. Diese Aufgaben sind **Marktstart-Blocker** — ohne sie kein automatisierter Geldfluss, also kein Gate 10, also kein Start mit zahlenden Kunden.

> **Repo-Realität (kein „von Null"):** Die Geld-Mechanik liegt bereits im Repo und ist secret-frei vorbereitet — `supabase/migrations/0002_payments.sql` (+ `0004_entitlements.sql` aus `WAVE_09`), `supabase/functions/create-checkout` (Modi `subscription` **und** `sb_payment`, Preis **serverseitig** aus `products.price` / `priceIdForPlan`), `supabase/functions/stripe-webhook` (Signatur via `constructEventAsync`, Idempotenz über `payment_events`-PK), `supabase/functions/_shared/stripe.ts`. Der Owner liefert ausschließlich Konten, Preise und Secrets — **niemals Code-Werte ins Repo**.

### 1.1 Konto & Live-Schaltung
- [ ] **Stripe-Account** erstellen / firmieren (EU-Geschäftseinheit; Pflicht — kein Start ohne).
- [ ] **Identitäts-/Geschäftsverifikation** in Stripe abschließen (für Live-Auszahlungen erforderlich).
- [ ] **Live-Modus aktivieren** — erst nach grünem Test-Durchlauf (Abschnitt 1.6) und Owner-Sign-off.

### 1.2 Secrets (nur als Supabase-Edge-Function-Secrets — nie `VITE_`, nie im Repo/Log)
Setzen über `supabase secrets set …` bzw. `--env-file supabase/functions/.env`. `supabase secrets list` zeigt danach **nur Namen, keine Werte**.

| Secret | Zweck | Quelle |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server-API (`sk_test_…` für Tests, `sk_live_…` für Live) | Stripe → Entwickler → API-Schlüssel |
| `STRIPE_WEBHOOK_SECRET` | Signaturprüfung im `stripe-webhook` (`whsec_…`) | Stripe → Webhooks → Endpunkt → Signing secret |
| `STRIPE_PRICE_BASIS` | Price-ID Plan **basis** (`price_…`) | Stripe → Produkte (Abschnitt 1.4) |
| `STRIPE_PRICE_PLUS` | Price-ID Plan **plus** (`price_…`) | Stripe → Produkte |
| `STRIPE_PRICE_PRO` | Price-ID Plan **pro** (`price_…`) | Stripe → Produkte |
| `PUBLIC_APP_URL` | Default für Erfolgs-/Abbruch-Redirect (`https://<domain>`) | eigene Cloudflare-Pages-Domain |
| `TURNSTILE_SECRET` | Verifikation der **öffentlichen** SB-Zahlung (Anti-Abuse am Stand) | Cloudflare → Turnstile |

> `demo` ist der Default-Fallback **ohne** Stripe (kein Secret). `individuell` hat **bewusst keine** Price-ID — Verkauf über Vertrieb/Vertrag, nicht über Self-Checkout (so dokumentiert in `_shared/stripe.ts` / `WAVE_09`); die UI zeigt dafür „Vertrieb kontaktieren", keinen toten Button.

### 1.3 Stripe-Konfiguration (Billing-Komfort, für Skalierung 10→300)
- [ ] **Stripe Billing Portal** aktivieren (Erzeuger-Selbstverwaltung: Zahlungsmittel, Kündigung, Belege).
- [ ] **SEPA-Lastschrift** aktivieren (für deutsche Erzeuger-Abos relevant; ergänzend zu Karte).
- [ ] **Dunning / Smart Retries** konfigurieren (automatisches Mahnwesen bei Fehlzahlung → `subscriptions.status='past_due'`, vom Webhook `invoice.payment_failed` verarbeitet).
- [ ] **Stripe Tax** konfigurieren (automatische USt-Berechnung) — empfohlen ab den ersten Rechnungen.
- [ ] **Rechnungs-Branding** hinterlegen (Logo, Firmendaten, USt-IdNr.) — Stripe generiert Rechnungen automatisch.

### 1.4 Produkte & Preise in Stripe (korrespondiert mit Abschnitt 2)
- [ ] **Produkt + Recurring-Price je Self-Checkout-Plan** anlegen: **basis**, **plus**, **pro** (monatlich, netto). Resultierende `price_…`-IDs → Secrets aus 1.2.
- [ ] **`demo`**: kein Stripe-Produkt (kostenloser Einstieg / Fallback).
- [ ] **`individuell`**: **kein** Self-Checkout-Price — Stripe Invoicing (custom Betrag, ggf. Zahlungsziel net 30) über den Vertriebsweg, immer noch automatisch generiert, keine Handarbeit.

### 1.5 Stripe Connect — Auszahlung an Erzeuger (USP-Voraussetzung)
Pflicht für den **SB-Bezahl-USP** (Phase 4 Track A) und für jeden Hof, an den die Plattform Geld weiterleitet. Die Plattform ist **Vermittler** — Geld fließt zum Hof, die Plattform behält nur die kleine Vermittlungsgebühr.
- [ ] **Stripe Connect** aktivieren (Express-Konten empfohlen für schlankes Erzeuger-Onboarding).
- [ ] **Auszahlungs-/Gebührenmodell** festlegen: Application-Fee-Satz (Plattform-Vermittlungsgebühr je SB-Transaktion) — siehe Abschnitt 2.
- [ ] **Connect-Onboarding-Flow** je auszahlungsberechtigtem Erzeuger freigeben (KYC durch Stripe). **Owner-Freigabe je weiterem Konto** (`README.md` Abschnitt 8).
- [ ] **Payout-Zeitplan** festlegen (z. B. täglich/rolling) und in der Erzeuger-Kommunikation transparent machen.

### 1.6 Webhook-Endpunkt registrieren (genau EINE Wahrheit, idempotent)
- [ ] Im Stripe-Dashboard **einen** Webhook-Endpunkt auf die deployte Function registrieren:
  `https://<projekt>.supabase.co/functions/v1/stripe-webhook`
- [ ] Abonnierte Events (decken die im `stripe-webhook` behandelten Pfade ab):
  `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` (+ für SB/Connect: `payment_intent.succeeded`, `account.updated`).
- [ ] **`STRIPE_WEBHOOK_SECRET`** des registrierten Endpunkts in die Secrets (1.2) übernehmen.

### 1.7 Deploy (NUR mit Owner-Freigabe — Geld/Account/irreversibel)
```bash
# Reihenfolge — jeder Schritt ist ein Owner-Freigabe-Punkt:
supabase db push                                   # Migration 0004 produktiv (additiv)
supabase functions deploy create-checkout stripe-webhook
supabase secrets set --env-file supabase/functions/.env   # Secrets aus 1.2
supabase secrets list                              # nur Namen verifizieren, keine Werte
# danach: Webhook-Endpunkt im Stripe-Dashboard registrieren (1.6)
```

> **Vor Live-Schaltung** den lokalen Idempotenz-/Renewal-Test aus `../WAVE_09_billing.md` („Konkrete Befehle", Schritte 4–6) **ausschließlich gegen Test-Keys** grün fahren: Doppel-Event → genau eine Mutation + `200 duplicate`; Insert-Fehler ≠ Duplikat (`500`, Stripe retried); `invoice.paid`/`invoice.payment_failed` → `active`/`past_due`. Kein `sk_live_` in lokalen Tests, kein Secret im Log.

**Claude liefert:** Migration, beide Edge Functions (signaturgeprüft, idempotent), `_shared/entitlements.ts` (serverseitige Durchsetzung), Billing-UI, `docs/STRIPE-SETUP.md` (secret-frei). **Niemals echte Keys, niemals Live-Schaltung ohne Freigabe.**

---

## 2. Preise, Plan-Limits & SB-Gebühr final festlegen (Commercial)

Die kanonischen Imperium-Pläne sind **demo / basis / plus / pro / individuell**. Die **Limits** liegen als owner-pflegbare Tabelle `plan_entitlements` (Migration `0004`) vor — änderbar **ohne Deploy** (Triage-Kategorie 5). Die **Preise** legt der Owner in Stripe fest (Abschnitt 1.4); sie gehören **nicht** ins Repo.

- [ ] **Monatspreis je Plan** final (netto): `basis`, `plus`, `pro`. (`demo` = 0; `individuell` = Vertragsangebot.)
- [ ] **Plan-Limits bestätigen/anpassen** in `plan_entitlements` (Höfe, Produkte, Standorte, SB-Stände-Freischaltung, Bilder, Benachrichtigungen). Default-Werte siehe `../WAVE_09_billing.md` Aufgabe 1 — nur **owner-bestätigt** als final markieren.
- [ ] **SB-Vermittlungsgebühr** festlegen (Application-Fee je SB-Transaktion am unbemannten Stand) — der monetarisierbare USP-Hebel; klein genug, dass der Käufer am Stand nicht abspringt, tragfähig über 300 Höfe (`CLAUDE.md §0.3`, Unit-Economics je Hof).
- [ ] **Mindestlaufzeit / Kündigungsfrist** des Erzeuger-Abos festlegen (über Stripe Billing Portal abbildbar).
- [ ] **Rabatt-/Einführungslogik** entscheiden (z. B. Frühstarter-Konditionen für die ersten Höfe).
- [ ] **`individuell`-Prozess** festlegen: wer prüft, wer gibt frei, welcher Vertragstext (Anwalt) — kein Self-Checkout.

> **Vermittler-Disclaimer bleibt skalierungsfest:** Keine Preis-/Limit-Darstellung darf Eigenverkauf, garantierte Liefermenge oder Beratung suggerieren. Plan-Limits werden in der Pricing-UI **ehrlich** aus `plan_entitlements` gelesen — keine Schattenwahrheit.

**Claude liefert:** `plan_entitlements`-Tabelle + `current_entitlements`-View (Fallback `demo` bei inaktivem Abo), serverseitige Durchsetzung, ehrliche Pricing-UI. **Keine finalen Preise, keine Rechtstexte, keinen Gebührensatz** — das entscheidet der Owner.

---

## 3. E-Mail / Mail-Zustellung (Provider, Domain, DNS)

Mail läuft über die env-gated Abstraktion `supabase/functions/_shared/email.ts` mit Providern **`console`** (Default, kein realer Versand — nur Log), **`resend`** (Default-Empfehlung für Start) und **`sendgrid`**. Templates (Quittung, Reservierungsbestätigung) tragen bereits den LokaleBauernConnect-Ton und den Vermittler-Disclaimer im Footer.

> **Standard-Empfehlung:** Start mit **`console`** (nichts geht raus — sicher zum Verdrahten). Sobald echte Käufer/Erzeuger Mails erhalten sollen (spätestens Gate 10, weil die **SB-Quittung** eine echte Mail ist), auf **`resend`** oder **`sendgrid`** umstellen.

### 3.1 Provider & Key
- [ ] **Provider wählen:** `resend` (empfohlen, schlankes DX) **oder** `sendgrid`.
- [ ] **API-Key** im jeweiligen Konto erzeugen und als Secret setzen: `RESEND_API_KEY` **oder** `SENDGRID_API_KEY`.
- [ ] **`EMAIL_PROVIDER`** auf `resend` bzw. `sendgrid` setzen (Default war `console`).
- [ ] **`EMAIL_FROM`** bestätigen/anpassen (Default `LokaleBauernConnect <noreply@lokalebauernconnect.de>`).

### 3.2 Versanddomain & DNS (Zustellbarkeit — ohne das landen Mails im Spam)
- [ ] **Versanddomain/Subdomain** festlegen (z. B. `mail.lokalebauernconnect.de`).
- [ ] **SPF-Record** setzen (DNS, beim Provider angegeben).
- [ ] **DKIM-Record(s)** setzen (DNS — vom Provider generiert; Domain-Authentifizierung).
- [ ] **DMARC-Record** setzen (DNS — Policy für Reports/Quarantäne).
- [ ] **Domain im Provider verifizieren** (grüner Status bei Resend/SendGrid).
- [ ] **Reply-To / Support-Adresse** festlegen (z. B. `hallo@lokalebauernconnect.de`), aktiv überwacht.

### 3.3 Optional, aber empfohlen
- [ ] **Bounce-/Spam-Tracking** im Provider aktivieren (Zustell-Hygiene bei wachsender Kundenzahl).
- [ ] **CORS-Origin** für Edge Functions einschränken (`CORS_ORIGIN` auf die eigene Domain statt `*`).

**Claude liefert:** Provider-Abstraktion (`console`/`resend`/`sendgrid`), Quittungs-/Reservierungs-Templates mit Disclaimer, env-Vorlage (`supabase/functions/.env.example`), DNS-Hinweise. **Niemals echte Keys, niemals DNS-Änderungen am Konto.**

---

## 4. Lernschleife — selbstlernende `CLAUDE.md` konfigurieren

Mechanik: `SELF_UPDATING_CLAUDE_MD.md` (Schleife **insights → distill → apply → consolidate**). Takt-Wahrheit: `.claude/learning/config.md`. Der Owner **besitzt den Kanon** — `apply` passiert nie automatisch, nur nach ausdrücklicher Freigabe.

### 4.1 Konfiguration bestätigen / festlegen
- [ ] **Auto-Approve-Kategorien** bestätigen — **Empfehlung & aktueller Stand: nur `EFFIZIENZ`** auto-approven; `WIRTSCHAFTLICHKEIT` und `TECHNIK` brauchen Owner-Review (`.claude/learning/config.md`).
- [ ] **Takt bestätigen:** Sammeln laufend (1-Zeiler) · Destillieren am Session-Ende · Konsolidieren **monatlich** (Default; ggf. „alle 5 Phasen" als alternativer Rhythmus).
- [ ] **Budget bestätigen:** `CLAUDE.md`-Lernabschnitte schlank halten; Wachstum nur gegen Konsolidierung (kein unbegrenztes Anwachsen des Kanons).

### 4.2 Laufender Owner-Betrieb der Schleife
- [ ] **`.claude/learning/proposals.md` regelmäßig reviewen** (am Stufen-/Session-Ende destilliert).
- [ ] **Übernahme entscheiden:** angenommene Vorschläge → in den Kanon übernehmen lassen + in `.claude/learning/applied_log.md` protokollieren (wer/was/warum/Datum); **abgelehnte verwerfen** (nicht zweimal vorschlagen).
- [ ] **Monatliche Konsolidierung** freigeben (Redundanz mergen, widerlegte Annahmen korrigieren statt duplizieren, Muster auf Imperium-Tauglichkeit prüfen).

> **Eiserne Regeln (nicht verhandelbar, `.claude/learning/config.md` / `README.md` Abschnitt 5):** keine Erkenntnis ohne Quelle · kein Auto-Write pro Nachricht · ein Lern-Eintrag steht **unter** der Konflikt-Hierarchie (User > AGENTS > Subagent/Skill > CLAUDE.md) und weicht Sicherheits-/Isolations-/Vermittler-/Test-Integritäts-Regeln **nie** auf · `.claude/` gehört **nie** ins Release-Artefakt.

**Claude liefert:** Schleifen-Mechanik, Schreibpfade (`insights_inbox.md`, `proposals.md`, `applied_log.md`), Takt-Vorlage, destillierte Vorschläge. **Niemals selbst-übernommene Kanon-Änderung.**

---

## 5. Security / Legal / Compliance (begleitend zu Gate 10)

- [ ] **Alle Secrets rotieren**, falls je in ein Artefakt/Log gelangt (Stripe, Mail-Provider, Turnstile, Supabase-Keys).
- [ ] **Datenschutzerklärung**, **AGB**, **AVV/DPA**, **TOMs** finalisieren (Anwalt) — Vorlagen unter `docs/launch/B_rechtstexte/`.
- [ ] **Subprozessor-Liste** pflegen: Supabase (EU), Cloudflare, Stripe, Resend/SendGrid, Sentry — **kein Hetzner** (entfällt im Stack).
- [ ] **Löschkonzept + Retention** rechtlich prüfen (inkl. `payment_events`-Cleanup 90 Tage, `deleted_at`-Soft-Delete).
- [ ] **Lebensmittel-Kennzeichnungs-Hinweis** & **Vermittler-Disclaimer** auf allen Zahl-/Reservierungsflächen verifizieren (durchgängig sichtbar).
- [ ] **Externe Security-Prüfung** beauftragen (ab ernsthaftem Erzeuger-Vertrieb / Skalierung Richtung 100+).

**Claude liefert:** Security-Härtung, RLS deny-by-default + Isolationstest, DSGVO-Text-Vorlagen, TOM-Vorlage. **Niemals juristische Garantie, niemals echte Secrets.**

---

## 6. Betrieb & Skalierung (Supabase + Cloudflare — managed, kein Self-Host)

- [ ] **Cloudflare-Pages-Domain + TLS/HSTS** bestätigt (Phase 2, `../phase2_release/GATES.md`).
- [ ] **Supabase-Backups/Point-in-Time-Recovery** für das Produktivprojekt bestätigen (Plan-Stufe prüfen).
- [ ] **Restore-Drill** mindestens einmal durchführen (mit Claude als Anleitung) — Wiederherstellung beweisen, nicht annehmen.
- [ ] **Monitoring-Konto** (Sentry o. ä.) verbinden; strukturierte Logs/Health-Checks (`WAVE_13`).
- [ ] **Kosten-Beobachtung je Customer-Gate freigeben:** Supabase-Compute/Egress, Cloudflare-Edge-Requests, Stripe-Gebühren je Hof — Unit-Economics über 10→300 (`CUSTOMER_GATES.md`, Dimension Kosten).
- [ ] **Kostenpflichtige Skalierungs-Pfade nur mit Owner-Freigabe** scharfschalten (größere Compute-Instanz, Read-Replica, PostGIS/`pg_trgm`/`pg_cron`, Edge-Cache scharf) — siehe Track E / `README.md` Abschnitt 8.
- [ ] **Incident-Verantwortliche + Eskalationsweg** definieren (`docs/INCIDENT_RUNBOOK.md`).

**Claude liefert:** Deploy-/Backup-/Rollback-/Incident-Runbooks, Performance-/Kosten-Härtung, Track-E-Scale-Gate-Nachweise. **Keine Account-/Domain-Provisionierung, kein Live-Schalten kostenpflichtiger Pfade ohne Freigabe.**

---

## 7. Aufgaben-Checkliste (lebendes Tracking)

Pflegen unter `docs/finalization/phase5_manual_tasks_checklist.md`:

```md
| Bereich | Aufgabe | Status | Datum | Verantwortlich | Notiz |
|---|---|---|---|---|---|
| Stripe | Account + Verifikation + Live-Schaltung | offen | — | Owner | Marktstart-Blocker Gate 10 |
| Stripe | Secrets setzen (KEY/WEBHOOK/PRICE_*/TURNSTILE) | offen | — | Owner | Edge-Function-Secrets, nie VITE_ |
| Stripe | Produkte/Price-IDs basis/plus/pro | offen | — | Owner | demo=0, individuell=Vertrieb |
| Stripe | Connect aktivieren + Payout/Application-Fee | offen | — | Owner | USP-Voraussetzung Track A |
| Stripe | Webhook-Endpunkt registrieren | offen | — | Owner | 1 idempotente Wahrheit |
| Commercial | Preise + Limits + SB-Gebühr final | offen | — | Owner | plan_entitlements owner-pflegbar |
| Mail | Provider (resend/sendgrid) + API-Key | offen | — | Owner | Default console -> live ab Gate 10 |
| Mail | DNS SPF/DKIM/DMARC + Domain verifizieren | offen | — | Owner | Zustellbarkeit |
| Lernschleife | Auto-Approve nur EFFIZIENZ + Takt | offen | — | Owner | config.md |
| Lernschleife | proposals.md review-Routine | offen | — | Owner | monatlich konsolidieren |
| Legal | Rechtstexte + Subprozessoren + TOMs | offen | — | Owner | Anwalt; kein Hetzner |
| Betrieb | Restore-Drill + Monitoring | offen | — | Owner | mit Claude als Anleitung |
```

---

## 8. Start-Empfehlung — gestaffelt von 10 auf 300

| Bereich | Start (Gate 10) | Wachstum (Gate 50→300) |
|---|---|---|
| **Billing** | **Stripe vollautomatisch** (Abo + SB), Connect aktiv | unverändert; Stripe Tax verfeinern, Gebühr je Hof prüfen |
| **Mail** | `console` zum Verdrahten → **`resend`/`sendgrid`** sobald echte Mails (SB-Quittung) | unverändert; Bounce-/Spam-Tracking aktivieren |
| **Connect/Payout** | je auszahlungsberechtigtem Hof einzeln freigeben | Onboarding-Durchsatz pro Stufe als Gate-Dimension |
| **Lernschleife** | Auto-Approve nur `EFFIZIENZ`, manuell destillieren | Takt halten; monatlich konsolidieren |
| **Skalierungs-Pfade** | managed Defaults (Supabase/Cloudflare) | kostenpflichtige Pfade erst mit Owner-Freigabe + Track-E-Gate |

> **Warum Billing sofort vollautomatisch, anderes gestaffelt:** Billing ist der **Geldfluss** — er muss von der ersten Rechnung an sauber und automatisch laufen, sonst wächst manueller Aufwand mit jedem Hof (`CLAUDE.md §0.3`). Mail-Provider, Connect-Konten weiterer Höfe und kostenpflichtige Skalierungs-Pfade lassen sich kontrolliert nachziehen, ohne den Marktstart zu blockieren.

---

## 9. Warum diese Trennung den Marktstart schützt

Die **Customer-Gates** (`CUSTOMER_GATES.md`) können **nicht ohne** diese manuellen Aufgaben grün werden — aber dank Feature-Flags und env-gated Defaults (`demo` ohne Stripe, `console` ohne Mail-Provider) **blockieren fehlende externe Dienste den Code-Fortschritt nicht**. So baut und verifiziert Claude die volle Strecke repo-lokal; der Owner schaltet zum richtigen Zeitpunkt mit echten Konten scharf.

> **Gate-10-Bezug:** Erst wenn (a) Stripe live + Webhook idempotent + Connect-Payout korrekt, (b) Preise/Limits/SB-Gebühr final, (c) Mail-Provider für die echte SB-Quittung aktiv und (d) die Lernschleife konfiguriert ist, ist Phase 5 für den Marktstart einlösbar. „Fast zahlbar" zählt nicht — entweder die Stufe trägt sauber, oder sie wird ehrlich verschoben (`README.md` Abschnitt 8, Stop-Regel 5).
