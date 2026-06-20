# Phase 4 — Track-Gates A–E (vertikale Strecken)

> **Was diese Datei ist.** Das verbindliche, blockierende Qualitäts-Tor pro vertikaler Strecke der Phase 4. Phase 1 macht das Produkt **fertig**, Phase 2 macht es **live**, Phase 3 gibt ihm eine **Betriebszentrale** — **Phase 4 vertieft die fünf wertschöpfenden Strecken**: die USP-Bezahlung, die Karte, Saison/Benachrichtigung, Erzeuger-Self-Service und die Datenmodell-Skalierung. Jede Strecke ist erst „fertig", wenn ihr Gate ohne offenen Punkt grün ist.
> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C · Rolle = **Vermittler** (kein Eigenverkauf, keine Beratung, kein eigener Kaufvertrag — Disclaimer durchgängig).
> **Stack fix:** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.**
> **Bezug:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler) · `PHASEN.md` (Phase 4, Tracks A–E) · `finalization/00_RULES.md` (Arbeits-/Stop-Regeln) · `finalization/01_PRIORITIES.md` (P0–P3) · `finalization/phase2_release/GATES.md` (Gates A–F, Vorbild für Beweisführung) · `finalization/99_GOLIVE_GATE.md` (Phase-1-Gate, DoD) · `MASTER_INDEX.md`.

---

## 0. Geltungsbereich, Eintrittsbedingung & Konfliktregel

- **Phase-4-Gates sind ZUSÄTZLICH, nicht Ersatz.** Sie ersetzen **kein** Phase-1/2/3-Gate. Eine Strecke wird erst angefasst, wenn das **Go-Live-Gate Phase 1** (`99_GOLIVE_GATE.md`) und die für die Strecke relevanten **Phase-2-Gates** (`phase2_release/GATES.md`) vom **Owner** grün bestätigt sind. Ein roter Phase-1/2/3-Block ist immer ein P0 und sticht jedes Phase-4-Gate.
- **Was Phase 4 abdeckt (fünf Tracks, je eigenes Gate):**
  - **Track A — SB-Bezahlung (USP):** QR am unbemannten SB-Stand → Stripe-Zahlung → Quittung; Erzeuger-Dashboard (Einnahmen/Schwund). Eigener ADR.
  - **Track B — Interaktive Karte:** Leaflet/MapLibre (OSM), Hof-Pins, Cluster, „in der Nähe", Deep-Link Karte ↔ Liste ↔ Hof-Detail.
  - **Track C — Saison & Benachrichtigungen:** Saison-Radar, Alerts bei Lieblingsprodukten/Verfügbarkeit (E-Mail-first, keine Doppelsysteme).
  - **Track D — Erzeuger-Self-Service:** mobile Verfügbarkeits-/Bestandspflege, Abholfenster, Frische-Signal.
  - **Track E — Datenmodell-Skalierung:** kundenstufige Gates (10/50/100/300 Höfe) — Indizes, Pagination, Caching, kein N+1.
- **Reihenfolge & Härte.** Die Tracks sind weitgehend **unabhängig** und dürfen parallel laufen — **aber:** Track A (Geldfluss) und Track E (Skalierung) tragen die schärfsten, blockierenden Kriterien. Track A erbt **vollständig** die Geldfluss-Härtung aus Phase-2 Gate B.5 + die Tenant-Isolation aus Gate C; ohne deren grünen Stand ist Track A automatisch rot. Track E ist **kundenstufig** wie Phase 5 — sein „Gate 10-Höfe" ist Marktstart-relevant.
- **Jeder Punkt ist nachweisbar:** Befehl + Ausgabe, Testlauf (offizieller Runner), Screenshot/Live-Run, `EXPLAIN`-Plan, oder manueller Prüfschritt **mit Owner + Datum**. „Sieht gut aus" ist kein Nachweis. „Fast fertig" zählt nicht (`CLAUDE.md §0.1`). Ein Test, der unter dem offiziellen Runner nicht real ausführt, zählt **nicht** als grün (`CLAUDE.md §0.9`).
- **Kein Punkt darf wegdiskutiert werden.** Erscheint ein Eintrag praktisch nicht erfüllbar → **Stop, Owner einbeziehen** (`00_RULES.md §5`). Strecke so anpassen, dass sie das Gate besteht, das Feature kontrolliert als „Bald verfügbar" markieren (nicht abrechenbar, nicht kaufbar sichtbar), oder ehrlich nicht ausliefern.
- **„Fertig" erklärt der Owner**, nicht Claude. Diffs/Deploys bleiben unbestätigt bis ausdrückliche Owner-Freigabe.
- **Konflikt-Hierarchie:** User-Anweisung > `AGENTS.md` > Subagent/Skill > `CLAUDE.md` > `00_RULES.md` > diese Datei.

> **Die 7 Produktionspfeiler als Gate-Achse** (`CLAUDE.md`): 1 RLS/Tenant-Isolation · 2 Zero-State · 3 Scope-Transparenz · 4 RBAC ohne Lücken · 5 Audit & Verantwortlichkeit · 6 Testpflicht pro Feature · 7 Drilldown-Integrität — plus die durchgängige **Vermittler-/Disclaimer-Wahrheit**. Jedes Track-Kriterium unten operationalisiert diese Pfeiler. Verletzt ein Befund einen Pfeiler in einem Kernflow, ist er per Definition mindestens P1, meist P0.

---

## 1. Track-Übersicht (Ampel-Schema)

| Track | Strecke | Was es schützt | Pfeiler | Blockierend? | Marktstart | Hauptnachweis |
|---|---|---|---|---|---|---|
| **A** | **SB-Bezahlung (USP)** | Echter, signaturgeprüfter, idempotenter Geldfluss an unbemannten Stand; Geld an den **richtigen** Hof (Connect) | 1·5·7 + Vermittler | **Ja (schärfstes)** | Pflicht, **sofern Geldfluss live** (sonst „Bald verfügbar") | Live-Zahlung + Webhook-Idempotenz + Quittung |
| **B** | **Interaktive Karte** | Performante, barrierearme Karte; Pin = realer Hof; Deep-Link-Integrität Karte↔Liste↔Detail | 2·3·7 | **Bedingt (P1)** | Empfohlen | Live-Karte mit echten `org_locations` + Lighthouse |
| **C** | **Saison & Benachrichtigungen** | EIN kanonisches Alert-System; Consent/Double-Opt-in; kein Spam; Cross-Tenant-dicht | 1·5 + DSGVO | **Bedingt (P1)** | Empfohlen | Opt-in→Trigger→Zustellung + Cross-Org-Test |
| **D** | **Erzeuger-Self-Service** | Mobile Pflege nur eigener Daten; Status nur serverseitig; Frische-Signal echt | 1·4·5 | **Ja** | Empfohlen (Pflege-Qualität trägt A–C) | Mobile-Smoke + Cross-Org-WRITE-Negativtest |
| **E** | **Datenmodell-Skalierung** | 10→300 Höfe ohne N+1/Seq-Scan/unbounded Liste; Indizes/Pagination/Caching | 2·3 | **Ja (Gate 10 = Marktstart)** | **Gate 10-Höfe Pflicht** | `EXPLAIN (ANALYZE)` + Last-/Stufen-Nachweis |

> **Gesamt-Ampel** (`docs/releases/PHASE_STATUS.md`, Abschnitt „Phase 4"):
> `🟢 grün` = alle Pflichtpunkte erfüllt + nachgewiesen · `🟡 gelb` = nur P2/P3-Restpunkte offen, dokumentiert + datiert · `🔴 rot` = mind. ein Pflichtpunkt offen → **Strecke gilt nicht als fertig**.
> **Marktstart-Relevanz (aus `PHASEN.md` Marktstart-Pflicht-Set):** mind. **ein Geldfluss** muss live sein → entweder **Track A** (SB-Bezahlung) **oder** Phase-1 `WAVE_09` (Erzeuger-Abo). **Track E Gate 10-Höfe** ist Pflicht. Tracks B/C/D sind für den Marktstart empfohlen, nicht zwingend.

---

## Track-A-Gate — SB-Bezahlung am unbemannten Selbstbedienungs-Hofladen (USP)

> **Frage:** Kann eine Käuferin am unbesetzten Stand per QR sicher zahlen, fließt das Geld via **Stripe Connect** zuverlässig an den **richtigen** Hof, ist der Status serverseitig und idempotent, bekommt sie eine rechtssichere **Vermittler**-Quittung — und sieht der Erzeuger seine Einnahmen/Schwund? Pfeiler 1 (RLS), 5 (Audit), 7 (Drilldown) + Vermittler-Wahrheit. **Schärfstes Phase-4-Gate**, erbt vollständig Phase-2 Gate B.5 (Geldfluss) und Gate C (Isolation). Bezug: `supabase/migrations/0002_payments.sql` (`sb_payments`, `payment_events`, `subscriptions`), `supabase/functions/create-checkout`, `supabase/functions/stripe-webhook`, `src/lib/payments.ts`. **Eigener ADR Pflicht** (`.claude/memory/decisions/`).

### A.1 — Geldfluss-Korrektheit & Connect (blockierend, P0)

- [ ] **QR → Stand-Identität serverseitig aufgelöst.** Der QR am Stand kodiert eine **stabile, nicht erratbare** Stand-/Hof-Referenz (kein fortlaufender Integer); die Edge Function löst Hof + `org_id` + Connect-Account **serverseitig** auf — der Client schiebt **niemals** Empfänger, `org_id` oder Betrag frei unter.
- [ ] **`create-checkout` validiert Betrag + Empfänger serverseitig** (Zod-Grenze): Betrag aus dem gepflegten Produkt-/Standpreis abgeleitet oder gegen Grenzen geprüft, Connect-Account des Hofs server-bestimmt — **nicht** client-manipulierbar.
- [ ] **Geld fließt via Stripe Connect an den richtigen Hof** (Vermittler-Modell): Plattform = Zahlungsanbindung, **kein** Eigenverkauf. Plattformgebühr (falls aktiv) als `application_fee` transparent, dokumentiert in `docs/PRICING.md`.
- [ ] **Status-Lifecycle nur serverseitig** über `sb_payments.status` (`initiated → paid → refunded/canceled`, plus `failed`): Übergänge ausschließlich via Webhook/RPC, **nie** per direktem Client-`update`. `payment_events` (nur `service_role`, keine RLS-Policy) ist der Append-only-Verlauf.

### A.2 — Webhook-Wahrheit & Idempotenz (blockierend, P0)

- [ ] **EIN signaturgeprüfter, idempotenter Webhook** (`supabase/functions/stripe-webhook`) ist die **einzige** Wahrheit für Zahlungsstatus/Entitlements. Signatur via `STRIPE_WEBHOOK_SECRET` geprüft; **gefälschtes/unsigniertes Event → abgelehnt** (kein Statuswechsel).
- [ ] **Idempotenz nachgewiesen:** dasselbe Stripe-Event zweimal zugestellt → **genau ein** Effekt in `sb_payments` (kein Doppel-„paid", keine doppelte Quittung, keine doppelte Gutschrift). Beleg über Test + `payment_events`-Verlauf.
- [ ] **Reihenfolge-/Race-fest:** verspätetes/out-of-order Event kippt einen bereits finalen Status (`refunded`) **nicht** zurück auf `paid`.
- [ ] **Webhook im Stripe-Dashboard** auf die Function-URL registriert; Secrets via `supabase secrets set`, **nie** im Repo/Bundle/Log (Querverweis Gate A.2 / B.1 Phase 2).

### A.3 — Tenant-Isolation & Audit (blockierend, P0)

- [ ] **`sb_payments` RLS deny-by-default + org-gebunden.** Erzeuger A liest/aggregiert **ausschließlich** eigene SB-Zahlungen (`sb_payments_owner_read` über `org_id`/`is_org_member`); Cross-Org-READ → leer/403. Käufer:in sieht nur den **eigenen** Vorgang (über nicht-erratbare Referenz, keine anon-SELECT-Policy auf fremde Zahlungen).
- [ ] **`org_id`-Hijack ausgeschlossen:** Insert/Update mit fremder `org_id` auf `sb_payments` → abgelehnt (`with check`/Trigger). Cross-Org-WRITE-Negativtest grün.
- [ ] **Jeder Geldfluss auditiert** (`audit_log`, Namespace `payment.*`): wer/was/wann; **PII maskiert** (keine Klartext-E-Mail/Telefon/IBAN in `audit_log.details` oder Logs). Erstattung (`refund`) trägt **Reason** (kritische Aktion).
- [ ] **Betrugs-/Missbrauchsschutz am öffentlichen Pfad:** Turnstile **serverseitig** verifiziert + Rate-Limit/WAF auf dem Checkout-Start (anonyme Flut auf `create-checkout` nachweislich gedrosselt).

### A.4 — Quittung, UX & Vermittler-Wahrheit (blockierend)

- [ ] **Quittung/Beleg zuverlässig zugestellt** nach `paid` (E-Mail oder On-Screen-Beleg mit Vorgangsreferenz, Betrag, Hof, Datum). Beleg-Fußzeile rechtssicher: **Plattform vermittelt nur, Verkäufer/Leistungserbringer ist der Hof.**
- [ ] **Disclaimer durchgängig** am Zahlpfad (QR-Landeseite, Checkout, Quittung): *„LokaleBauernConnect vermittelt nur die Bezahlung. Verkäufer und Verantwortlicher für Ware, Preis, Kennzeichnung und Quittung ist der Hof."* — **keine** Verkaufs-/Garantie-/Beratungssprache der Plattform.
- [ ] **Zero-State + Fehlerpfade sauber:** abgebrochene/fehlgeschlagene Zahlung → klare Wiederholung, **kein** 500, kein hängender „initiated"-Zombie ohne sichtbaren Ausgang. Offline-/Funkloch am Stand wird ehrlich kommuniziert.
- [ ] **Erzeuger-Dashboard (Einnahmen/Schwund):** echte Aggregation aus `sb_payments` (org-gescopt) — Tageseinnahmen, Anzahl Zahlungen, optional Schwund-Indikator (gemeldeter Bestand vs. bezahlte Mengen). **Kein Fake-KPI**, Zero-State bei keiner Zahlung. `scope` (Hof/Zeitraum/Datenstand) sichtbar.

### A.5 — Tests, ADR & Doku (blockierend)

- [ ] **Tests grün unter dem offiziellen Runner** (kein stiller Skip, Pfadauflösung relativ zur Testdatei): Signaturprüfung (gefälscht → abgelehnt), Idempotenz (Doppel-Event → ein Effekt), Betrags-/Empfänger-Manipulation (abgelehnt), Cross-Org-READ/WRITE auf `sb_payments` (leer/abgelehnt), Status-Übergänge (kein Client-`update`).
- [ ] **ADR vorhanden** (`.claude/memory/decisions/`): SB-Bezahl-Architektur (QR-Auflösung, Connect-Modell, Idempotenz-Strategie, Compliance/Vermittler) — als Imperium-Blueprint.
- [ ] **Doku vollständig:** `docs/spezialmodule/SB_BEZAHLUNG_USP.md`, `docs/STRIPE-SETUP.md` (inkl. Connect + SB-Payment), `docs/PRICING.md` (Transaktionsgebühr). Keine toten Verweise.

**Nachweis-Befehle (cwd = `app/`):**
```bash
# Geldfluss-/Webhook-/Isolations-Tests (offizieller Runner)
npm run test -- sb_payment
npm run test -- webhook
npm run test -- isolation
# Secret-/Hygiene-Gegencheck (muss leer sein)
grep -REn "sk_live_|sk_test_|whsec_|STRIPE_WEBHOOK_SECRET" src/ dist/ && echo "FAIL: Secret im Frontend/Artefakt" || echo "OK"
# Typecheck/Build
npm run typecheck && npm run build
```

**Track-A-Gate = grün, wenn:** A.1–A.5 vollständig nachgewiesen — Geld fließt an den richtigen Hof, Webhook signatur-/idempotenzfest, `sb_payments` org-dicht + auditiert, Quittung + Disclaimer rechtssicher, Tests grün, ADR + Doku da. **Rot bei** jedem client-setzbaren Betrag/Empfänger/Status, jedem nicht-idempotenten oder ungeprüften Webhook, jedem Cross-Org-Durchlass auf `sb_payments`, oder fehlendem Vermittler-Disclaimer am Zahlpfad — **P0, blockiert den USP-Launch sofort.**
**Dokument:** `docs/releases/SB_PAYMENT_GO_LIVE_DECISION.md`

---

## Track-B-Gate — Interaktive Karte (Hofladen-Finder, Leaflet/MapLibre + OSM)

> **Frage:** Zeigt die Karte **reale**, freigegebene Höfe performant und barrierearm, ist jeder Pin ein echter Hof mit korrektem Deep-Link, und kippt sie bei 300 Höfen nicht? Pfeiler 2 (Zero-State), 3 (Scope), 7 (Drilldown-Integrität). Bezug: `src/lib/geo.ts`, `src/pages` (Finder/Karte), `org_locations` (Geo-Quelle, `0003_marketplace.sql`), Phase-2 Gate E (Performance) + Gate B.2 (CSP für OSM-Tiles).

### B.1 — Datenwahrheit & Sichtbarkeit (blockierend)

- [ ] **Jeder Pin = realer, freigegebener Hof** aus `org_locations`/`farms` (`deleted_at is null`, nur veröffentlichte/verifizierte Höfe) — **kein** Demo-/Fake-Pin in Prod-UI, keine erfundenen Koordinaten.
- [ ] **Nur freigegebene Standorte öffentlich:** `org_locations_public_read` (anon SELECT) liefert ausschließlich freigegebene Geo-Daten; unveröffentlichte/in Verifizierung befindliche Höfe erscheinen **nicht** auf der öffentlichen Karte (Querverweis Track D / `00_RULES.md §5.7`).
- [ ] **Geo-Privacy bewusst:** exakte Stand-Koordinaten nur, wo der Hof sie freigegeben hat; sonst Ort/Region-Granularität. Keine ungewollte Offenlegung privater Adressen.

### B.2 — Karte-Interaktion & Deep-Link-Integrität (blockierend)

- [ ] **Karte ↔ Liste ↔ Hof-Detail synchron:** Klick auf Pin → Hof-Detail; Listentreffer ↔ Pin korrespondieren; „in der Nähe" nutzt echte Geo-Distanz (`src/lib/geo.ts`, Bounding-Box). Kein toter Pin, keine Sackgasse.
- [ ] **Deep-Links tragen Kontext** (Region/Bounding-Box/Hof) und bauen **nie** org-fremde URLs (Pfeiler 7). Direkter Aufruf eines Karten-Deep-Links rekonstruiert den Zustand korrekt (SPA-Routing via `dist/_redirects`).
- [ ] **Cluster bei Dichte:** überlappende Pins clustern sauber; Zoom/Pan flüssig; kein Pin-Verlust beim erneuten Rendern.

### B.3 — Performance, A11y & CSP (blockierend P1)

- [ ] **Map lazy/segmentiert geladen** — Leaflet/MapLibre blockiert nicht das First-Paint des Finders (Code-Split). Tiles über erlaubte OSM-Origin; **CSP** (`public/_headers`) deckt `img-src … *.tile.openstreetmap.org` ab, Konsole zeigt **keine** CSP-Violation.
- [ ] **Skaliert 10→300 Höfe** ohne Client-Vollscan: Geo-Query index-/bounding-box-gestützt (Querverweis Track E), nicht „alle Höfe laden und im Browser filtern". Pin-Render bei 300 Höfen flüssig.
- [ ] **Barrierearm:** Karte hat eine **gleichwertige Listen-/Tastatur-Alternative** (Karte ist nicht der einzige Weg zum Hof), Pins/Controls fokussierbar, sinnvolle ARIA-Labels. Lighthouse Accessibility ≥ **90** auf der Finder-/Kartenseite.
- [ ] **Zero-State + Scope sichtbar:** keine Höfe in Region → „Noch keine Höfe in dieser Region" (kein leeres graues Kachelfeld, kein 500); `scope` (Region/Radius/Datenstand) sichtbar.

### B.4 — Tests & Doku (blockierend)

- [ ] **Tests grün:** Geo-Distanz/Bounding-Box (`geo.ts`), Pin↔Detail-Verdrahtung, Zero-State-Render, „nur freigegebene Höfe sichtbar".
- [ ] **Doku:** `docs/spezialmodule/HOFLADEN_FINDER.md` um Karten-Track ergänzt (Tile-Quelle, Geo-Privacy, Deep-Link-Schema).

**Nachweis-Befehle (cwd = `app/`):**
```bash
npm run test -- geo
npm run test -- finder
npm run build && npm run typecheck
# Lighthouse (Prod-URL, mobil) auf Finder/Karte → Performance & A11y ≥ 90
```

**Track-B-Gate = grün, wenn:** B.1–B.4 nachgewiesen — echte Pins, korrekte Sichtbarkeit/Privacy, Deep-Link-Integrität, performant + barrierearm bei 300 Höfen, Zero-State + Scope sauber. **Rot bei** Fake-Pin in Prod, sichtbarem unveröffentlichtem Hof, totem Pin/Deep-Link, CSP-Violation, oder Client-Vollscan, der bei 300 Höfen kippt.
**Dokument:** `docs/releases/MAP_GO_LIVE_DECISION.md`

---

## Track-C-Gate — Saison-Radar & Benachrichtigungen

> **Frage:** Gibt es **EIN** kanonisches Benachrichtigungssystem (kein Doppelsystem), ist jede Benachrichtigung **eingewilligt** (DSGVO/Double-Opt-in), führt jeder Alert deep-verlinkt zur Quelle, und ist die Sichtbarkeit von Badge-Zahlen tenant-/rollendicht? Pfeiler 1 (RLS), 5 (Audit) + DSGVO/Consent. Bezug: `products`/`availability` (Saison/Verfügbarkeit), `WAVE_14` (Legal/DSGVO), Phase-2 Gate B.4 (Turnstile) + Gate D.3 (Consent).

### C.1 — Saison-Radar-Wahrheit (blockierend)

- [ ] **Saison-Status datengetrieben, nicht hartkodiert:** „in Saison / bald / vorbei" leitet sich aus gepflegten Produkt-/Saisonfeldern + realer `availability` ab — kein statisch eingefrorener Kalender als alleinige Wahrheit, keine erfundenen Saison-Aussagen.
- [ ] **Frische-Signal ehrlich:** Saison-/Verfügbarkeitsanzeige zeigt `availability_updated_at` bzw. Datenstand; veraltete Pflege wird als solche kenntlich (Querverweis Track D), nicht als „frisch" suggeriert.
- [ ] **Zero-State + Scope:** keine Saison-Treffer in Region → sauberer Leerzustand; `scope` (Region/Zeitraum) sichtbar.

### C.2 — EIN Benachrichtigungssystem + Consent (blockierend, P0 bei Consent-Verstoß)

- [ ] **Eine kanonische Alert-Quelle** — Saison-/Verfügbarkeits-Alerts, „Lieblingsprodukt wieder da", Restock-/Waitlist-Benachrichtigung speisen sich aus **einem** System (keine zwei konkurrierenden Notification-Pipelines, kein Doppelzählen).
- [ ] **Opt-in mit Einwilligung (DSGVO):** Benachrichtigungen nur nach aktiver Zustimmung; bei E-Mail **Double-Opt-in** (Bestätigungslink), dokumentierte Einwilligung + Zeitstempel. **Kein** ungebetener Versand.
- [ ] **Abbestellen jederzeit möglich** (One-Click-Unsubscribe in jeder Benachrichtigungs-E-Mail, Präferenzzentrum in der App). Abbestellung wirkt sofort und auditiert.
- [ ] **Öffentlicher Anmelde-Pfad bot-geschützt:** Waitlist/„benachrichtige mich" über Turnstile **serverseitig** verifiziert + Rate-Limit (kein E-Mail-Enumeration-/Spam-Vektor).

### C.3 — Zustellung, Deep-Link & Anti-Spam (blockierend)

- [ ] **Trigger → Zustellung end-to-end:** Verfügbarkeitsänderung/Saisonstart löst real die Benachrichtigung aus (Edge Function/Job), Zustellung nachweisbar; **kein** toter Trigger.
- [ ] **Deep-Link zur Quelle:** jede Benachrichtigung verlinkt fokussiert auf den fachlichen Ort (Produkt am Hof / Verfügbarkeit) — mit korrektem Kontext, **nie** org-fremde URL (Pfeiler 7).
- [ ] **Anti-Spam/Frequenz:** Bündelung/Drosselung (kein Alert-Sturm bei vielen Mikro-Änderungen); klare, sinnvolle Frequenz pro Nutzer:in.

### C.4 — Tenant-/Rollen-Sicherheit, Tests & Doku (blockierend)

- [ ] **Badge-/Zahlen-Sichtbarkeit tenant-/rollendicht:** Benachrichtigungs-Listen/Badges zeigen **nur** eigene Daten; Erzeuger-Benachrichtigungen org-gescopt; Käufer-Alerts nutzergebunden. **Cross-Tenant-Negativtest** grün (kein fremder Alert/Zähler sichtbar).
- [ ] **PII-Schutz im Audit/Log:** Benachrichtigungs-Events auditiert ohne Klartext-PII; Empfängeradressen maskiert.
- [ ] **Tests grün:** Opt-in/Double-Opt-in, Unsubscribe, Trigger→Zustellung, Deep-Link-Kontext, Cross-Tenant-Badge-Test, Anti-Spam-Drossel.
- [ ] **Doku:** `docs/spezialmodule/SAISON_RADAR.md` (Saison-Logik, Datenquelle, Alert-/Consent-Flow, Frequenzregeln).

**Nachweis-Befehle (cwd = `app/`):**
```bash
npm run test -- season
npm run test -- notification
npm run test -- isolation   # Cross-Tenant-Badge/Alert
npm run build && npm run typecheck
```

**Track-C-Gate = grün, wenn:** C.1–C.4 nachgewiesen — Saison datengetrieben + ehrlich, EIN Alert-System mit Double-Opt-in + jederzeitigem Abbestellen, Trigger→Zustellung→Deep-Link funktioniert, tenant-/rollendicht, Tests grün. **Rot bei** ungebetenem Versand/fehlendem Consent (P0/DSGVO), Doppel-Notification-System, totem Trigger, oder cross-tenant sichtbarem Alert/Badge.
**Dokument:** `docs/releases/NOTIFICATIONS_GO_LIVE_DECISION.md`

---

## Track-D-Gate — Erzeuger-Self-Service (mobile Verfügbarkeits-/Bestandspflege)

> **Frage:** Kann ein Erzeuger am Hof/mobil **ausschließlich** seine eigenen Produkte, Verfügbarkeiten und Abholfenster pflegen — schnell, mit echtem Frische-Signal, serverseitig org-/rollengesichert und auditiert? Pfeiler 1 (RLS), 4 (RBAC), 5 (Audit). Bezug: `farms`/`products`/`availability`/`reservations` + Policies `products_owner_write`, `farms_owner_write`, `reservations_owner_read` (`0003_marketplace.sql`), `WAVE_04` (Verfügbarkeit), `WAVE_15` (Onboarding).

### D.1 — Eigentums-/Org-Bindung & RBAC (blockierend, P0)

- [ ] **Pflege nur eigener Daten:** Erzeuger schreibt ausschließlich Produkte/Verfügbarkeit/Abholfenster der **eigenen** `org_id` (`products_owner_write`/`farms_owner_write` über `is_org_member`/Hof-Zuordnung). **Cross-Org-WRITE-Negativtest grün** (Erzeuger A setzt Produkt von Org B → abgelehnt).
- [ ] **`org_id`-Hijack ausgeschlossen** beim Insert/Update von Produkt/Verfügbarkeit/Standort (`with check`/Trigger).
- [ ] **Rollen-Trennung sauber:** Käufer kann **nichts** pflegen; Staff nur über definierte Support-Aktion (auditiert). anon schreibt **nie** Verfügbarkeit/Bestand.
- [ ] **Status-Übergänge serverseitig:** Reservierungs-Status (`requested → confirmed → picked_up → cancelled`) nur über RPC/Edge-Whitelist — Erzeuger bestätigt/storniert über serverseitig geprüfte Aktion, **nie** per direktem Client-`update`.

### D.2 — Mobile UX, Frische-Signal & Verdrahtung (blockierend)

- [ ] **Mobile realistisch nutzbar:** Verfügbarkeit/Bestand/Abholfenster am Telefon in wenigen Taps pflegbar (große Touch-Ziele, schnelle Speicherung, optimistic UI mit Fehlerrückfall). Editorial-Token-System, **keine** Deko-Emojis, **keine** hardcodierten Farben.
- [ ] **Frische-Signal echt:** jede Pflege aktualisiert `availability_updated_at`; Käufer-Seite (Finder/Detail/Saison) zeigt diesen Datenstand ehrlich. „Zuletzt gepflegt"-Anzeige ist real, nicht kosmetisch.
- [ ] **End-to-End verdrahtet:** Speichern → realer Persist (Supabase) → sichtbare Bestätigung → Käufer-Sicht aktualisiert. Lade-/Leer-/Fehlerzustände gebunden; **kein** toter Button, kein Platzhalter.
- [ ] **Abholfenster pflegbar + wirksam:** gepflegte Abholfenster wirken sich real auf den Reservierungs-/Abholpfad aus (keine reine Anzeige ohne Wirkung).

### D.3 — Audit, Zero-State, Tests & Doku (blockierend)

- [ ] **Pflege auditiert:** relevante Mutationen (Produkt aus/ein, Verfügbarkeit, Abholfenster) im `audit_log` (wer/was/wann); kritische/irreversible Aktionen mit Reason.
- [ ] **Zero-State professionell:** neuer Hof ohne Produkte → klarer Onboarding-Leerzustand mit nächstem Schritt (Querverweis `WAVE_15`), **kein** 500, kein leeres Gerüst.
- [ ] **Tests grün:** Cross-Org-WRITE negativ, `org_id`-Hijack negativ, Status-Übergang nur serverseitig, Frische-Signal aktualisiert, Mobile-Smoke (Pflege end-to-end).
- [ ] **Doku:** `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` + `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md` um Self-Service/Abholfenster ergänzt.

**Nachweis-Befehle (cwd = `app/`):**
```bash
npm run test -- availability
npm run test -- isolation   # Cross-Org-WRITE / org_id-Hijack
npm run test -- reservation # Status-Übergänge serverseitig
npm run build && npm run typecheck
# Manuelle Mobile-Abnahme: Pflege end-to-end auf echtem Telefon
```

**Track-D-Gate = grün, wenn:** D.1–D.3 nachgewiesen — Pflege strikt org-/rollengebunden, Status serverseitig, mobil real nutzbar, Frische-Signal echt + end-to-end verdrahtet, auditiert, Zero-State sauber, Tests grün. **Rot bei** jedem Cross-Org-WRITE-Durchlass (P0), client-setzbarem Status, totem Pflege-Button, oder kosmetischem (unechtem) Frische-Signal.
**Dokument:** `docs/releases/SELF_SERVICE_GO_LIVE_DECISION.md`

---

## Track-E-Gate — Datenmodell-Skalierung (kundenstufig 10 → 300 Höfe)

> **Frage:** Hält das Datenmodell den Sprung **10 → 50 → 100 → 300 Höfe** (und viele Käufer:innen) ohne N+1, ohne Seq-Scan auf großen Tabellen, ohne unbounded Liste, mit professionellen Ladezeiten und tragbaren Kosten? Pfeiler 2 (Zero-State unter Last), 3 (Scope) + Skalierungs-Direktive `CLAUDE.md §0.7`. **Kundenstufige Gates wie Phase 5** — nicht ein einzelnes Tor. Bezug: alle Migrationen `0001–0003`, `src/lib/geo.ts`/`data.ts`, Phase-2 Gate E (Performance), `WAVE_11` (DB-Härtung).

### E.1 — Gate 10 Höfe (Marktstart-Pflicht, blockierend P1)

- [ ] **Indizes auf allen Filter-/Join-/Sortier-Spalten** der Kern-Queries: `org_id`-Scoping, Geo-Suche, Reservierungs-Lookups, `availability`-Aktualität, `sb_payments_org_idx/farm_idx/status_idx`. Nachweis via `EXPLAIN (ANALYZE)` — Kern-Queries nutzen **Index-Scan**, kein Seq-Scan auf wachsenden Tabellen.
- [ ] **Pagination/Limit auf allen Listen** (Finder-Treffer, Reservierungseingang, SB-Zahlungs-Liste, Audit-Feed) — keine unbounded `SELECT *`-Liste, kein Vollscan zur Laufzeit.
- [ ] **Kein N+1** in Finder/Detail/Verfügbarkeit/Karte — Hof + Produkte + Verfügbarkeit + Geo gebündelt geladen, nicht pro Karte/Pin einzeln.
- [ ] **Fresh-DB-Proof grün:** leere DB → `migrations 0001→0002→0003` (additiv, idempotent, ohne destruktiven Schritt ohne Rollback) → `seed` → App-Smoke grün. **Ohne diesen Beweis keine Production-DB.**
- [ ] **App-Smoke unter 10-Hof-Last** grün, Konsole sauber.

### E.2 — Gate 50 Höfe (zusätzlich, P1)

- [ ] **Geo-Query bounding-box-/index-gestützt** (`geo.ts`) — regionale Suche skaliert ohne Client-seitiges Filtern aller Höfe; nachgewiesen mit 50-Hof-Seed.
- [ ] **Query-Baseline dokumentiert:** Top-Kern-Queries mit Laufzeit + `EXPLAIN`-Plan in `docs/finalization/10_300_customer_readiness_matrix.md` festgehalten (Vergleichsbasis für höhere Stufen).
- [ ] **Caching/Stale-While-Revalidate** für stabile Lesepfade (Public-Katalog/Karte) eingeführt, wo es Kosten/Latenz senkt — ohne Sicherheits-/Frische-Verlust (Frische-Signal bleibt ehrlich).

### E.3 — Gate 100 Höfe (zusätzlich, P1)

- [ ] **Last-/Concurrency-Nachweis:** parallele Käufer-Last auf Finder/Karte ohne Timeout/5xx-Welle; Reservierungs-/Zahlungspfad bleibt unter Last konsistent (keine Race-Inkonsistenz in `reservations`/`sb_payments`).
- [ ] **Index-Pflege & Bloat-Kontrolle:** wachsende Tabellen (`reservations`, `sb_payments`, `payment_events`, `audit_log`) haben Index-/Aufräum-Strategie (Pagination, ggf. Partition/Archiv-Pfad dokumentiert).
- [ ] **Kosten-Budget geprüft** (Supabase/Cloudflare): Query-Volumen + Egress + Function-Invocations bei 100 Höfen im tragbaren Rahmen, dokumentiert (`performance-cost-optimizer`).

### E.4 — Gate 300 Höfe (zusätzlich, P1)

- [ ] **300-Hof-Seed-Last:** Finder/Karte/Detail/Verfügbarkeit/SB-Zahlung performant (Kernseiten LCP ≤ 2,5 s mobil, kein N+1/Seq-Scan/unbounded Liste, der bei 300 kippt).
- [ ] **Skalierungs-Report vollständig:** `docs/finalization/10_300_customer_readiness_matrix.md` mit Stufen 10/50/100/300, Query-Baselines, Index-Liste, Caching-Strategie, Kosten-Hochrechnung, offenen Risiken.
- [ ] **Rollback-/Migrations-Disziplin:** jede skalierungsbedingte Migration additiv + mit Rollback-Pfad; keine destruktive Online-Migration ohne Owner-Freigabe.

**Nachweis-Befehle (cwd = `app/`):**
```bash
# Fresh-DB-Proof (härtestes Kriterium)
# leere DB → Migrationen → Seed → Smoke
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_core.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_payments.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_marketplace.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
npm run test -- isolation && npm run build
# Query-Pläne (müssen Index-Scan zeigen, kein Seq-Scan auf großen Tabellen)
psql "$SUPABASE_DB_URL" -c "EXPLAIN (ANALYZE) <Kern-Geo-Query>;"
psql "$SUPABASE_DB_URL" -c "EXPLAIN (ANALYZE) <org-gescopte Reservierungs-Query>;"
```

**Track-E-Gate = grün, wenn:** mindestens **Gate 10 Höfe** vollständig nachgewiesen (Marktstart-Pflicht: Fresh-DB-Proof + Index/Pagination/kein N+1 + App-Smoke) und die jeweils erreichte Kundenstufe (50/100/300) durch `EXPLAIN`/Last-/Kosten-Nachweis belegt + im Readiness-Report dokumentiert ist. **Rot bei** fehlendem Fresh-DB-Proof, Seq-Scan/N+1/unbounded Liste auf einem Kernflow, oder fehlendem Stufen-/Kosten-Nachweis für die beanspruchte Kundenstufe.
**Dokument:** `docs/finalization/10_300_customer_readiness_matrix.md` (kundenstufiger Abschluss-Status)

---

## 2. Querschnittliche Gate-Disziplin (für alle Tracks A–E)

- **Kein „fast grün" durchwinken** — ein offenes Pflichtkriterium = **NO GO** für die Strecke.
- **Jeder Track erbt die Phase-1/2/3-Gates** — er ersetzt sie nicht. Insbesondere: Track A erbt Phase-2 Gate B.5 (Geldfluss) + Gate C (Isolation); Track B/E erben Gate E (Performance); Track C erbt Gate B.4 (Turnstile) + Gate D.3 (Consent); Track D erbt Gate C (Cross-Org-WRITE).
- **Jeder Gate-Pass dokumentiert** mit Datum, freigegebenem Commit-Hash, Verantwortlicher und Nachweis (Befehl + Ausgabe / Test / Live-Run).
- **Bei NO-GO:** Blocker in `docs/releases/PHASE4_OPEN_BLOCKERS.md` mit Priorität (P0–P3), betroffenem Pfeiler und minimalem Fix-Vorschlag.
- **Subagenten-Pflicht je Track:** A → `payment-engineer` + `edge-functions-spezialist` + `security-auditor`; B → `frontend-design-guardian` + `performance-cost-optimizer`; C → `edge-functions-spezialist` + `compliance-officer` + `i18n-content-spezialist`; D → `frontend-design-guardian` + `db-rls-spezialist`; E → `db-rls-spezialist` + `performance-cost-optimizer` + `qa-tester`. Vor jedem Merge `qa-tester`; bei sensiblen Änderungen `security-auditor`.

---

## 3. Abnahme-Protokoll (Owner-Signatur, verbindlich)

Eine Phase-4-Strecke gilt erst als bestanden, wenn der Owner aktiv bestätigt (analog `phase2_release/GATES.md`). Diffs/Deploys bleiben bis dahin unbestätigt.

```text
PHASE-4-TRACK-GATE — OWNER-ENTSCHEID

Track:              [ ] A SB-Bezahlung  [ ] B Karte  [ ] C Saison/Benachr.  [ ] D Self-Service  [ ] E Skalierung
Geprüft von:        (Owner)
Datum:
Build-/Commit:      (Hash, falls freigegeben)
Prod-/Test-URL:     (https://…pages.dev / Custom-Domain)

A (SB-Bezahlung):   [ ] grün   Nachweis: Live-Zahlung + Webhook-Idempotenz + sb_payments-Isolation + Quittung/Disclaimer
B (Karte):          [ ] grün   Nachweis: Live-Karte echte org_locations + Deep-Link + Lighthouse (Perf/A11y ≥ 90)   [ ] gelb (P2 dok.)
C (Saison/Benachr): [ ] grün   Nachweis: Double-Opt-in + Trigger→Zustellung→Deep-Link + Cross-Tenant-Badge-Test   [ ] gelb (P2 dok.)
D (Self-Service):   [ ] grün   Nachweis: Cross-Org-WRITE negativ + Status serverseitig + Mobile-Smoke + Frische-Signal
E (Skalierung):     [ ] Gate 10 grün (Pflicht)  [ ] 50  [ ] 100  [ ] 300   Nachweis: Fresh-DB-Proof + EXPLAIN + Last/Kosten

Entscheid:          [ ] TRACK BESTANDEN — Strecke fertig / Marktstart-relevanter Teil freigegeben
                    [ ] NICHT BESTANDEN — offene Punkte (→ PHASE4_OPEN_BLOCKERS.md):
Unterschrift:       (Owner)
```

---

## 4. Letzter Hinweis

**Ziel ist nicht:** „Die Strecke ist gebaut."
**Ziel ist:** Jede vertikale Strecke hält einer seriösen Due-Diligence, einer Erzeuger-/Pilot-Demo und einem echten Go-Live stand — der **USP-Geldfluss** dicht, signaturgeprüft und rechtssicher als **Vermittler** (A), die **Karte** echt, performant und barrierearm (B), **Benachrichtigungen** eingewilligt, kanonisch und deep-verlinkt (C), die **Erzeuger-Pflege** mobil, org-dicht und ehrlich (D), und das **Datenmodell** belastbar von 10 bis 300 Höfen (E).

Wenn ein Track-Kriterium praktisch nicht erfüllbar erscheint — **Stop. Owner einbeziehen.** Entweder die Strecke so anpassen, dass sie das Gate besteht, sie kontrolliert als „Bald verfügbar" markieren (nicht abrechenbar, nicht kaufbar sichtbar), oder ehrlich nicht ausliefern. „Fast fertig" zählt nicht.
