# Phase 2 — Release-Gates A–F (Build · Security · Tenant-Isolation · Legal · Performance · Smoke)

> **Was diese Datei ist.** Das verbindliche, blockierende Qualitäts-Tor zwischen *„Phase 1 ist fertig"* (`finalization/99_GOLIVE_GATE.md`) und *„LokaleBauernConnect ist live"*. Phase 1 macht das Produkt **fertig**; **Phase 2 macht es live** — sauber gebaut, gehärtet, isolationsgeprüft, rechtssicher, performant und rauchfrei auf Cloudflare Pages.
> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C · Rolle = **Vermittler** (kein Eigenverkauf, keine Beratung, kein eigener Kaufvertrag — Disclaimer durchgängig).
> **Stack fix:** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.**
> **Bezug:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler) · `finalization/00_RULES.md` (Arbeitsregeln, Stop-Regeln) · `finalization/01_PRIORITIES.md` (P0–P3) · `finalization/99_GOLIVE_GATE.md` (Phase-1-Gate, DoD) · `finalization/README.md` (Phase-2-Verortung) · `PHASEN.md` · `MASTER_INDEX.md`.

---

## 0. Geltungsbereich, Eintrittsbedingung & Konfliktregel

- **Eintrittsbedingung (hart).** Die Gates A–F werden **erst** geprüft, wenn das **Go-Live-Gate Phase 1** (`99_GOLIVE_GATE.md`, Teil 1, A–H) ohne offene Punkte vom **Owner** bestätigt ist. Ein roter Phase-1-Block ist immer ein P0 und sticht jedes Phase-2-Gate.
- **Was Phase 2 abdeckt:** Cloudflare-Pages-Deploy, Domain, Security-Header/CSP/HSTS, sowie die sechs Gates **A (Build) · B (Security) · C (Tenant-Isolation) · D (Legal) · E (Performance) · F (Smoke)** — gefolgt von einem **Burn-in ≥ 7 Tage** auf der Produktions-URL. Phase 3 (Ops-Gate) und Phase 5 (Gate 10) sind nachgelagert und werden hier nur referenziert, nicht ersetzt.
- **Reihenfolge.** Gates laufen **A → B → C → D → E → F**. Ein rotes Gate **blockiert** alle folgenden — kein Gate wird übersprungen, weil es „schon mal grün war". C (Tenant-Isolation) ist das **schärfste blockierende** Gate: kein Deploy ohne grünen Cross-Org-Negativtest über **alle** Tabellen der Migrationen `0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`.
- **Jeder Punkt ist nachweisbar:** Befehl + Ausgabe, Testlauf, Screenshot/Run, oder manueller Prüfschritt **mit Owner + Datum**. „Sieht gut aus" ist kein Nachweis. „Fast fertig" zählt nicht (`CLAUDE.md §0.1`).
- **Kein Punkt darf wegdiskutiert werden.** Erscheint ein Eintrag praktisch nicht erfüllbar → **Stop, Owner einbeziehen** (`00_RULES.md` §5). Feature so anpassen, dass es das Gate besteht, das Feature kontrolliert deaktivieren / als „Bald verfügbar" markieren (nicht abrechenbar), oder ehrlich nicht launchen.
- **„Fertig" erklärt der Owner**, nicht Claude. Diffs/Deploys bleiben unbestätigt bis ausdrückliche Owner-Freigabe (`00_RULES.md` §1.20).
- **Konflikt-Hierarchie:** User-Anweisung > `AGENTS.md` > Subagent/Skill > `CLAUDE.md` > `00_RULES.md` > diese Datei.

> **Die 7 Produktionspfeiler als Gate-Achse** (`01_PRIORITIES.md §0`): RLS/Tenant-Isolation · Zero-State · Audit · End-to-End-Verdrahtung · Cloudflare-Schutz · Tests · Disclaimer/Vermittler-Wahrheit. Jedes Gate unten ist eine Operationalisierung dieser Pfeiler — verletzt ein Befund einen Pfeiler in einem Kernflow, ist er per Definition mindestens P1, meist P0.

---

## 1. Gate-Übersicht (Ampel-Schema)

| Gate | Name | Was es schützt | Pfeiler | Blockierend? | Hauptnachweis |
|---|---|---|---|---|---|
| **A** | **Build & Artefakt** | Reproduzierbarer, secret-freier Build aus Fresh Clone | 4 | **Ja** | `npm run ci` grün + Artefakt-Scan |
| **B** | **Security & Härtung** | Auth, Secrets, Header/CSP/HSTS, Turnstile, WAF, Webhook-Signatur, Zod | 1·3·5 | **Ja** | Header-Live-Check + Edge-Guard-Tests |
| **C** | **Tenant-Isolation** | RLS deny-by-default, kein Cross-Org-Leck, `org_id`-Anker | 1·6 | **Ja (schärfstes)** | Cross-Org-Negativtest grün |
| **D** | **Legal & Vermittler-Wahrheit** | Impressum/DS/AGB, Lebensmittel-Hinweis, Disclaimer, Consent, `noindex` | 7 | **Ja** | Surface-Checkliste + Rechtstext-Review |
| **E** | **Performance & Skalierung** | Indizes, Pagination, kein N+1, LCP/Bundle-Budget (10→300 Höfe) | – | **Bedingt** (P1) | `EXPLAIN`-Nachweis + Lighthouse |
| **F** | **Smoke & Deploy-Verifikation** | Kernflow live auf Prod-URL, Konsole sauber, Zero-State, Rollback bereit | 2·4 | **Ja** | Live-Smoke-Run auf `*.pages.dev`/Domain |

> **Gesamt-Ampel** (`docs/releases/PHASE_STATUS.md`, Abschnitt „Phase 2"):
> `🟢 grün` = alle Pflichtpunkte erfüllt + nachgewiesen · `🟡 gelb` = nur P2/P3-Restpunkte offen, dokumentiert + datiert · `🔴 rot` = mind. ein Pflichtpunkt offen → **kein Deploy / kein Go-Live**.

---

## Gate A — Build & Release-Artefakt

> **Frage:** Lässt sich aus einem frischen Klon ein **deterministisches, secret-freies, deploybares** Artefakt bauen — ohne „kopierter Working-Tree"? Pfeiler 4 (End-to-End-Verdrahtung beginnt beim Build).

### A.1 — Pflichtkriterien (blockierend)

- [ ] **Fresh Clone baut grün.** In einem frischen Checkout: `npm ci` (gepinntes `package-lock.json`) → `npm run ci`. **`npm run ci` umfasst `typecheck → lint → build`** (eingeführt in `WAVE_01`; aktuell hat `app/package.json` nur `dev/build/typecheck/preview` — `lint` + `ci` sind Pflicht-Ergänzung dieser Phase und müssen existieren).
- [ ] **TypeScript strict ohne Fehler.** `npm run typecheck` (`tsc --noEmit`, `tsconfig.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) = **0 Fehler, 0 Warnungen**.
- [ ] **Lint = 0 Warnungen.** `npm run lint` (`eslint . --max-warnings 0`) grün; Edge Functions (`supabase/functions/**`) sind bewusst aus der Frontend-Lint-Config ausgenommen (eigene Deno-Toolchain).
- [ ] **`vite build` erzeugt `dist/`** vollständig: `index.html`, gehashte JS/CSS-Assets, und die ausgelieferten Cloudflare-Steuerdateien `dist/_headers` (aus `public/_headers`) sowie `dist/_redirects` (SPA-Fallback, eingeführt in `WAVE_01`).
- [ ] **Cloudflare-Pages-Build reproduzierbar.** Build-Command (`npm run build`), Output-Dir (`dist`), Node-Version (gepinnt) sind **versioniert im Repo**, nicht nur im Cloudflare-Dashboard. Zwei aufeinanderfolgende Builds liefern dasselbe Ergebnis (deterministisch).
- [ ] **Migrationen bauen den Zielzustand sauber.** Fresh-Setup über `supabase/setup_all.sql` (bzw. `migrations/0001 → 0002 → 0003` + `seed.sql`) läuft fehlerfrei, **additiv**, ohne destruktive Schritte ohne Rollback-Pfad (`00_RULES.md §6.5`).

### A.2 — Artefakt-Hygiene (blockierend, P0 bei Fund)

- [ ] **Keine Secrets im Artefakt.** `dist/` enthält **keinen** `service_role`-Key, **kein** Stripe-Secret (`sk_…`, `whsec_…`), **kein** Webhook-Secret, **keinen** Mail-Provider-Key, **keine** DB-Connection-String.
- [ ] **Frontend kennt nur `VITE_`-Public-Vars.** Im Bundle ausschließlich `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Alles ohne `VITE_`-Präfix ist im Vite-Bundle technisch nicht verfügbar — `service role` lebt **ausschließlich** in Edge Functions (`supabase/functions/_shared/supabaseAdmin.ts`).
- [ ] **Kein Tool-/Repo-Müll im Artefakt.** Kein `.env`, kein `.git`, kein `node_modules`, kein `.claude/`, keine `*.log`, keine Coverage-Dateien, keine Source-Maps (`vite.config.ts`: `sourcemap: false`).

**Nachweis-Befehle (cwd = `app/`):**

```bash
# 1) Reproduzierbarer Build aus sauberem Stand
npm ci && npm run ci

# 2) Artefakt muss die Cloudflare-Steuerdateien enthalten
test -f dist/_headers && test -f dist/_redirects && echo "OK: _headers + _redirects vorhanden"

# 3) Secret-Scan über das deploybare Paket (muss LEER sein = Exit 1 = gut)
grep -REn "service_role|sk_live_|sk_test_|whsec_|SUPABASE_SERVICE_ROLE|BEGIN [A-Z ]*PRIVATE KEY" dist/ \
  && echo "FAIL: potentielles Secret im Artefakt" || echo "OK: kein Secret im dist/"

# 4) Verbotene Artefakte (müssen fehlen)
for p in dist/.env dist/.git dist/.claude dist/node_modules; do
  test -e "$p" && echo "FAIL: $p im Artefakt" || true
done; echo "OK: Hygiene-Scan beendet"
```

**Gate A = grün, wenn:** A.1 + A.2 vollständig nachgewiesen. **Rot bei** jedem Build-/Typecheck-/Lint-Fehler oder **jedem** Secret/Müll im `dist/`.

---

## Gate B — Security & Härtung

> **Frage:** Ist jeder schreibende/sensible Pfad **serverseitig** abgesichert, sind Header/CSP/HSTS live aktiv, sind öffentliche Schreibpfade bot-/missbrauchsgeschützt, und ist der Geldfluss signaturgeprüft + idempotent? Pfeiler 1 (RLS), 3 (Audit), 5 (Cloudflare-Schutz). **React ≠ Sicherheit — Backend sichert ALLES ab.**

### B.1 — Secrets & Schlüsseltrennung (blockierend)

- [ ] **`service role` nur in Edge Functions** (`_shared/supabaseAdmin.ts`); niemals im Client-Bundle, Log oder Repo (verifiziert in Gate A.2, hier funktional bestätigt).
- [ ] **Secrets leben nur in Cloudflare/Supabase-Env** (`supabase secrets set …`). Keine produktiven Werte in `.env.example` (nur Platzhalter), keine im CI-Log.
- [ ] **Schlüssel-Rotation dokumentiert** (`docs/launch/…` bzw. `SECRET_ROTATION`): wer rotiert was, wie oft, wie im Notfall (Break-Glass).

### B.2 — HTTP-Security-Header live (blockierend)

Alle Header aus `public/_headers` müssen **auf der ausgelieferten Domain** real ankommen (nicht nur im Repo stehen):

- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS aktiv, HTTPS erzwungen)
- [ ] `X-Frame-Options: DENY` **und** CSP `frame-ancestors 'none'` (Clickjacking-Schutz)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: geolocation=(self), camera=(), microphone=()` (Geo für Finder erlaubt, Kamera/Mikro gesperrt)
- [ ] **Content-Security-Policy** strikt: `default-src 'self'` · `connect-src 'self' https://*.supabase.co` · `img-src 'self' data: https://*.tile.openstreetmap.org https://*.supabase.co` · `script-src 'self'` (kein `unsafe-inline` im Script) · `base-uri 'self'` · `form-action 'self'` · `frame-ancestors 'none'`.
- [ ] **CSP deckt alle real geladenen Origins ab** — Supabase, OpenStreetMap-Tiles (Leaflet/`FarmMap.tsx`), Stripe-Checkout-Redirect und (falls aktiv) Turnstile-Script. Konsole zeigt **keine** CSP-Violation auf Kernseiten.

**Nachweis (Live-Header gegen Prod-URL):**

```bash
curl -sI https://<deine-domain-oder-projekt>.pages.dev/ | grep -Ei \
  "strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|content-security-policy"
```

### B.3 — Auth, Eingangsvalidierung & serverseitige Guards (blockierend)

- [ ] **Supabase Auth produktiv**; Käufer-/Erzeuger-/Staff-Sessions strikt getrennt (`00_RULES.md §8`). Sensible Owner-/Staff-Surfaces zusätzlich geschützt (Allowlist/Step-up) **oder** ehrlich nicht exponiert.
- [ ] **Zod-Validierung an allen Eingangsgrenzen** der Edge Functions (`create-checkout`, `stripe-webhook`, sowie alle mutierenden Functions). Ungültige Eingabe → 4xx, nie stiller Durchlauf.
- [ ] **Rechteprüfung serverseitig vor jeder Mutation.** Kein `if (!orgId) return null` ohne **403**; fremde Org/Rolle = **403/leer**, nie 200 mit Fremddaten.
- [ ] **Status-Übergänge nur serverseitig** (Reservierung: `requested → confirmed → picked_up → cancelled`; SB-Zahlung: `initiiert → bezahlt → quittiert → erstattet`) — über RPC/Edge-Whitelist, **nie** per direktem Client-`update` setzbar.
- [ ] **`org_id`-Hijack ausgeschlossen** — `with check`/Trigger verhindert das Unterschieben einer fremden `org_id` beim Insert/Update (Querverweis Gate C).

### B.4 — Cloudflare-Schutz öffentlicher Schreibpfade (blockierend)

- [ ] **Turnstile** auf allen öffentlichen Formularen: Reservierung anlegen, Waitlist/Restock-/Benachrichtigen, Onboarding-Invite, Kontakt — **serverseitig** verifiziert (Token-Check in der Edge Function, nicht nur Widget im DOM).
- [ ] **WAF + Rate-Limits** auf Login, Reservierungs-Anlage, Onboarding-Invite und allen Zahlungs-/Checkout-Flows. Anonyme Spam-Flut auf `reservations-create` ist nachweislich gedrosselt.

### B.5 — Stripe / Geldfluss-Härtung (blockierend, sofern Geldfluss aktiv)

- [ ] **EIN signaturgeprüfter, idempotenter Webhook** (`supabase/functions/stripe-webhook`) ist die einzige Wahrheit für Entitlements/Zahlungsstatus. Signatur via `STRIPE_WEBHOOK_SECRET` geprüft; **gefälschtes Event → abgelehnt**.
- [ ] **Idempotenz getestet:** dasselbe Event zweimal → **genau ein** Effekt (kein Doppel-Entitlement, keine Doppelbuchung).
- [ ] **`create-checkout` validiert Betrag + Empfänger serverseitig** — Betrag/Connect-Account des Hofs **nicht** client-manipulierbar; Geld fließt via Connect an den **richtigen** Hof (Vermittler-Modell).
- [ ] **Jeder Geldfluss auditiert** (`payment.*` im `audit_log`), **PII maskiert** (keine Klartext-E-Mail/Telefon in `audit_log.details` oder Logs).

**Gate B = grün, wenn:** B.1–B.5 nachgewiesen (B.5 entfällt nur, wenn der Geldfluss in Phase 2 bewusst noch deaktiviert/„Bald verfügbar" ist — dann muss der Pfad nachweislich **nicht** kaufbar sichtbar sein). **Rot bei** fehlendem Live-Header, ungeprüftem Webhook, fehlendem Turnstile/Rate-Limit auf einem öffentlichen Schreibpfad, oder client-setzbarem Status/Betrag.

---

## Gate C — Tenant-Isolation (schärfstes, blockierend)

> **Frage:** Kann Org A jemals Daten von Org B sehen oder schreiben? Greift jede Policy **serverseitig**, deny-by-default, nicht nur in der UI? Pfeiler 1 (RLS/Tenant-Isolation) + 6 (Tests). **Kein Merge, kein Deploy ohne grünen Isolationstest.** (`00_RULES.md §4`, `99_GOLIVE_GATE.md C`).

### C.1 — RLS-Grundsätze (blockierend)

- [ ] **RLS aktiv + deny-by-default** auf **jeder** Tabelle der Migrationen `0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql` (`orgs`, `profiles`, `farms`, `products`, `availability`, `reservations` sowie Payment-/Marketplace-Tabellen). Keine Tabelle ohne Policy, keine „offene" Policy als Default.
- [ ] **`org_id`-Anker** in jeder mandantengebundenen Tabelle; jede org-fremde Query liefert **403/leer**, **nie** 200 mit Fremddaten.
- [ ] **Plattform-Isolation bewusst differenziert:** Public-Katalog (`farms`/`products`) ist absichtlich **lesbar** (anon SELECT erlaubt) — **alle** schreibenden/sensiblen Pfade (Reservierungen, Payments, Abo, Mitgliedschaften, Bewertungen, Verfügbarkeitspflege) sind org-/rollengebunden.
- [ ] **anon-Schreibgrenze:** anon darf Katalog **lesen**, aber **niemals** Verfügbarkeit pflegen, Reservierungs-Status setzen oder Hofdaten ändern — nachgewiesen.

### C.2 — Cross-Org-Negativtests (blockierend, automatisiert)

Für **jede** mandantengebundene Tabelle gilt: Org A scheitert bei **Lesen**, **Schreiben** und **`org_id`-Verschiebung** an Org-B-Daten.

- [ ] **Cross-Org-READ negativ:** Erzeuger A liest Produkte/Reservierungen/Hofdaten von Org B → **leer/403** (z. B. `products_owner_…`, `reservations_owner_read`).
- [ ] **Cross-Org-WRITE negativ:** Erzeuger A setzt ein Produkt von Org B auf `out`/ändert Verfügbarkeit von Org B → **abgelehnt** (`products_owner_write` greift).
- [ ] **`org_id`-Hijack negativ:** Insert/Update mit fremder `org_id` → **abgelehnt** (`with check`/`enforce_product_org`-Trigger).
- [ ] **Token-Enumeration ausgeschlossen:** fremde Reservierung über `pickup_code` **nicht** erratbar/lesbar (128-bit CSPRNG, keine fortlaufende ID, keine anon-SELECT-Policy auf `reservations`); `/r/:code` nur für den rechtmäßigen Vorgang.
- [ ] **Test läuft real unter dem offiziellen Runner** (Test-Integrität `CLAUDE.md §0.9`): kein stiller Skip, Pfadauflösung relativ zur Testdatei, echte `assert.*`-Prüfungen — eine „grüne" Suite, die nicht ausführt, zählt **nicht**.

**Gate C = grün, wenn:** RLS deny-by-default über **alle** Migrationstabellen aktiv **und** der Cross-Org-Negativtest (READ + WRITE + `org_id`-Hijack + Token-Enumeration) automatisiert grün ist. **Rot bei** jedem einzelnen Cross-Org-Durchlass — dies ist ein **P0** und blockiert den gesamten Release sofort.

---

## Gate D — Legal & Vermittler-Wahrheit

> **Frage:** Behauptet die Plattform irgendwo Verkauf/Vertrag/Beratung/Garantie, fehlt ein Pflicht-Hinweis, oder ist ein beworbenes Feature ohne Deckung sichtbar? Pfeiler 7 (Disclaimer/Vermittler-Wahrheit). **Rechtlicher Launch-Blocker** (`01_PRIORITIES.md` P0). Bezug: `WAVE_14`, `docs/launch/B_rechtstexte/`.

### D.1 — Pflicht-Rechtstexte (blockierend)

- [ ] **Impressum, Datenschutzerklärung, AGB** vorhanden, aktuell, von **allen** relevanten Surfaces verlinkt (Marketing-Landing, App, Onboarding, Checkout/Zahlbestätigung).
- [ ] **Lebensmittel-Kennzeichnungs-Hinweis** vorhanden und sichtbar (regionale Lebensmittel; Verantwortung für Kennzeichnung/Allergene/Preis liegt beim Hof, nicht bei der Plattform).
- [ ] **AVV/TOMs** vorbereitet (`docs/launch/B_rechtstexte/`), EU-Datenhaltung (Supabase EU) dokumentiert.

### D.2 — Vermittler-Disclaimer durchgängig (blockierend)

- [ ] **Disclaimer durchgängig sichtbar** auf Finder, Hof-Detail, Reservierung und Checkout: *„LokaleBauernConnect vermittelt nur. Verfügbarkeit, Menge, Preis und Bezahlung liegen allein beim Hof. Reservierungen sind unverbindlich und kostenlos; es entsteht kein Kaufvertrag mit LokaleBauernConnect."*
- [ ] **Keine Verkaufs-/Beratungs-/Garantie-Sprache** in UI oder Marketing — kein Text suggeriert einen Kaufvertrag mit der Plattform, keine Mengen-/Liefer-/Qualitätsgarantie.
- [ ] **SB-Bezahlung korrekt eingeordnet:** Plattform = Zahlungsanbindung/Vermittler (Stripe Connect, Geld fließt an den Erzeuger). Quittungs-/E-Mail-Fußzeile rechtssicher (Vermittler-Hinweis).
- [ ] **Kein Phantomfeature.** Kein beworbenes/kaufbar sichtbares Feature ohne technische Deckung; „Bald verfügbar" eindeutig markiert und **nicht abrechenbar**.

### D.3 — Privacy, Consent & Indexierung (blockierend)

- [ ] **Keine sensiblen Daten ungewollt öffentlich** (Reservierungen, Kontaktdaten, Zahlungen) — nur der explizit erlaubte Public-Katalog ist offen.
- [ ] **Cookie-/Consent-Pfad** für öffentliche Flächen vorhanden, wo erforderlich (Turnstile/Analytics) — kein Setzen nicht-essentieller Cookies vor Einwilligung.
- [ ] **`noindex`-Entscheidung pro Surface dokumentiert:** App-Innenflächen, Owner-/Staff-Bereiche, Käufer-Vorgangsseiten (`/r/:code`) → `noindex`; Marketing-Landing indexierbar.
- [ ] **Öffentlicher Flow nur mit Einwilligung/Freigabe:** Hof-Veröffentlichung, Kontaktdaten und Standort werden erst nach Hof-Freigabe/Verifizierung publik (`00_RULES.md §5.7`).

**Gate D = grün, wenn:** D.1–D.3 nachgewiesen — Rechtstexte verlinkt, Disclaimer durchgängig, keine Verkaufs-/Garantie-Behauptung, `noindex`/Consent korrekt. **Rot bei** fehlendem Disclaimer auf einem Kern-Surface oder einer Vermittler-Verletzung (P0).

---

## Gate E — Performance & Skalierung

> **Frage:** Hält das System den Sprung **10 → 300 Höfe** (und viele Käufer:innen) ohne N+1, ohne unbounded Queries, mit professionellen Ladezeiten? Skalierungs-Direktive `CLAUDE.md §0.7`. Bezug: `WAVE_11` (DB-Härtung), `WAVE_10` (Premium-UX).

### E.1 — Datenbank & Query (blockierend P1)

- [ ] **Indizes auf allen Filter-/Join-/Sortier-Spalten** der Kern-Queries (Geo-Suche im Finder, `org_id`-Scoping, Reservierungs-Lookups, `availability_updated_at`). Nachweis via `EXPLAIN (ANALYZE)` — Kern-Queries nutzen Index-Scan, kein Seq-Scan auf großen Tabellen.
- [ ] **Pagination / Limit auf allen Listen** (Finder-Ergebnisse, Reservierungseingang, Audit-Feed) — keine unbounded `SELECT *`-Liste, kein Vollscan zur Laufzeit.
- [ ] **Kein N+1** im Finder/Detail/Verfügbarkeit — Hof + Produkte + Verfügbarkeit werden gebündelt/effizient geladen, nicht pro Karte einzeln.
- [ ] **Geo-Query effizient** (`src/lib/geo.ts`, `FinderPage.tsx`): regionale Suche skaliert mit Index/Bounding-Box, nicht durch Client-seitiges Filtern aller Höfe.

### E.2 — Frontend-Budget (P1, dokumentierbar)

- [ ] **Lighthouse (mobil, Prod-URL)** auf Kernseiten (Finder, Hof-Detail): Performance ≥ **90**, Accessibility ≥ **90**, Best-Practices ≥ **90**. Abweichung nur dokumentiert + datiert zulässig (gelb), nie verschwiegen.
- [ ] **LCP ≤ 2,5 s** und **CLS ≤ 0,1** auf der Finder-Startseite (mobil, gedrosseltes Netz).
- [ ] **Bundle vernünftig** — Map (Leaflet) lazy/segmentiert, kein Mega-Bundle blockiert das First-Paint; gehashte Assets cachebar.

**Gate E = grün, wenn:** E.1 nachgewiesen (Index/Pagination/kein N+1) und E.2-Budget erreicht **oder** Abweichung als P2 dokumentiert + datiert. **Rot bei** Seq-Scan/N+1 auf einem Kernflow oder unbounded Liste, die bei 300 Höfen kippt.

---

## Gate F — Smoke & Deploy-Verifikation

> **Frage:** Funktioniert der Kernflow **live auf der Produktions-URL** mit echten Daten, sauber, mit Zero-State, ohne Konsolenfehler — und ist Rollback bereit? Pfeiler 2 (Zero-State) + 4 (End-to-End). Dies ist das letzte Gate vor dem Burn-in.

### F.1 — Deploy-Voraussetzung (blockierend)

- [ ] **Cloudflare-Pages-Projekt deployt** das in Gate A gebaute Artefakt; Custom-Domain (falls vorgesehen) zeigt auf das Pages-Projekt, TLS aktiv, HSTS greift (Gate B.2).
- [ ] **SPA-Routing live:** Deep-Links (z. B. `/r/:code`, Hof-Detail) lösen über `dist/_redirects` korrekt auf, kein 404 auf Client-Routen.
- [ ] **Edge Functions erreichbar** (`create-checkout`, `stripe-webhook`) mit gesetzten Supabase-Secrets; Stripe-Webhook-Endpoint im Stripe-Dashboard auf die Function-URL registriert.

### F.2 — Live-Smoke-Kernflow (blockierend, mit echten Daten)

- [ ] **Finder** lädt regional (Suche/Filter/Karte), rendert Treffer **und** sauberen **Zero-State** bei keiner Region/keinem Treffer („Noch keine Höfe in dieser Region") — **kein 500, kein leeres Gitter**.
- [ ] **Hof-Detail → Produktverfügbarkeit** zeigt echte, vom Erzeuger gepflegte Daten inkl. Frische-Signal (`availability_updated_at`); Zero-State bei keiner Verfügbarkeit sauber.
- [ ] **Reservierung end-to-end:** anlegen (Turnstile aktiv) → Bestätigungs-/Vorgangsseite (`/r/:code`) → Hof-Bestätigung sichtbar. Submit-Button real gebunden, kein toter Pfad.
- [ ] **Checkout/Zahlbestätigung** (sofern Geldfluss aktiv): `create-checkout` → Stripe → Rückkehr → Quittung/Beleg zugestellt. Andernfalls: SB-/Checkout-Pfad nachweislich **nicht** kaufbar sichtbar.
- [ ] **Konsole sauber** auf allen Kernseiten — **keine** `TypeError`, **keine** 401-Schleife, **keine** CSP-Violation, **kein** Mixed-Content.
- [ ] **Disclaimer durchgängig sichtbar** (Querverweis Gate D.2) auf allen besuchten Kern-Surfaces.

### F.3 — Betrieb & Rückfall (blockierend)

- [ ] **Rollback erprobt:** Cloudflare-Pages-Deployment lässt sich auf das vorherige Build zurücksetzen; DB-Migrationen haben einen Rollback-Pfad (`00_RULES.md §6.3`).
- [ ] **Backup/Restore der Supabase-DB** dokumentiert und mindestens einmal getestet (`99_GOLIVE_GATE.md E`).
- [ ] **Burn-in ≥ 7 Tage** auf der Prod-URL gestartet: keine ungeklärten 5xx, keine RLS-/Auth-Fehlerwellen, keine Webhook-Fehler in den Logs.
- [ ] **Incident-/Support-Pfad bekannt** (`docs/INCIDENT_RUNBOOK.md`, `WAVE_07`) — wer reagiert bei einem Live-Fehler, wie wird eskaliert.

**Gate F = grün, wenn:** Deploy live, Kernflow auf Prod-URL mit echten Daten + sauberer Konsole + Zero-State bestätigt, Rollback/Backup erprobt und Burn-in fehlerfrei gestartet. **Rot bei** jedem Konsolen-Hardfail, gebrochenem Kernflow-Schritt oder fehlendem Rollback.

---

## 2. Abnahme-Protokoll (Owner-Signatur, verbindlich)

Phase 2 gilt erst als bestanden, wenn der Owner aktiv bestätigt (analog `99_GOLIVE_GATE.md` Teil 5). Diffs/Deploys bleiben bis dahin unbestätigt.

```text
PHASE-2-RELEASE-GATE — OWNER-ENTSCHEID

Geprüft von:        (Owner)
Datum:
Build-/Commit:      (Hash, falls freigegeben)
Prod-URL:           (https://…pages.dev / Custom-Domain)

Gate A (Build/Artefakt):     [ ] grün   Nachweis: npm run ci + dist-Secret-Scan
Gate B (Security/Härtung):   [ ] grün   Nachweis: curl -I Header-Check + Edge/Webhook-Tests
Gate C (Tenant-Isolation):   [ ] grün   Nachweis: Cross-Org-Negativtest (READ/WRITE/Hijack/Token)
Gate D (Legal/Vermittler):   [ ] grün   Nachweis: Surface-Checkliste + Rechtstext-Review
Gate E (Performance):        [ ] grün   Nachweis: EXPLAIN + Lighthouse (mobil)   [ ] gelb (P2 dok.)
Gate F (Smoke/Deploy):       [ ] grün   Nachweis: Live-Smoke-Run + Rollback/Backup erprobt
Burn-in ≥ 7 Tage:            [ ] gestartet am: ______   [ ] sauber abgeschlossen am: ______

Entscheid:          [ ] PHASE 2 BESTANDEN — Freigabe für Go-Live / Phase 3 (Ops-Gate)
                    [ ] NICHT BESTANDEN — offene Punkte:
Unterschrift:       (Owner)
```

---

## 3. Letzter Hinweis

**Ziel ist nicht:** „LokaleBauernConnect ist deployt."
**Ziel ist:** Die Plattform hält einer seriösen Due-Diligence, einer Erzeuger-/Pilot-Demo und einem echten Go-Live stand — sauber gebaut (A), gehärtet (B), mandantendicht (C), rechtssicher als **Vermittler** (D), skalierbar 10→300 (E) und live rauchfrei (F).

Wenn ein Gate praktisch nicht erfüllbar erscheint — **Stop. Owner einbeziehen.** Entweder das Feature so anpassen, dass es das Gate besteht, es kontrolliert als „Bald verfügbar" markieren (nicht abrechenbar), oder ehrlich nicht launchen. „Fast fertig" zählt nicht.
