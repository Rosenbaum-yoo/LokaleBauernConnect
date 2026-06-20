# LokaleBauernConnect — Phase 2: Release-operativ (Deploy & Gates A–F)

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C
> Stack: React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect)
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Vertrag & Zahlung entstehen **direkt zwischen Käufer:in und Hof**. Disclaimer durchgängig.
> **Bezug:** `../README.md` (Phase-1-Index) · `../99_GOLIVE_GATE.md` (Phase-1-Gate, A–H) · `PHASEN.md` (5-Phasen-Bauplan) · `MASTER_INDEX.md` · `docs/releases/PHASE_STATUS.md` · `CLAUDE.md` (7 Produktionspfeiler, §0-Direktive).

Dieses Verzeichnis (`finalization/phase2_release/`) ist die **Werkbank für Phase 2** — den Schritt von „fertig" zu **„live"**. Phase 1 (`../`) macht das Produkt funktionsfähig (Finder → Reservierung end-to-end, Isolationstest grün, mindestens ein Geldfluss). **Phase 2 macht es auslieferbar:** echtes Cloudflare-Pages-Deployment auf eigener Domain, gehärtete Security-Header (CSP/HSTS), automatisierter, reproduzierbarer Release-Pfad und ein **≥7-tägiger Burn-in** unter realer Last, bevor der öffentliche Marktstart freigegeben wird.

> **Abgrenzung zu Phase 1:** Hier wird **keine neue Fachlogik** gebaut. Phase 2 nimmt das fertige, gegatete Phase-1-Artefakt und bringt es kontrolliert in die Produktion — Infrastruktur, Auslieferung, Betriebsnachweis. Wer hier neue Features einzieht, hat die Phase verwechselt.

---

## 0. Zweck dieses Verzeichnisses — „auslieferbar"

`phase2_release/` ist **kein** Ablageort für Feature-Code, sondern die **kontrollierte Auslieferungs-Maschine**: Sie überführt das grüne Phase-1-Gate (`../99_GOLIVE_GATE.md`) in ein **öffentlich erreichbares, betriebssicheres, gehärtetes Produktiv-Deployment**. „Auslieferbar" bedeutet konkret und nachweisbar:

1. **Reproduzierbares Deployment** — die App wird ausschließlich aus dem CI-gebauten `dist/`-Artefakt (Cloudflare Pages) deployt, nie aus einem kopierten Working-Tree. Jeder Deploy ist auf einen Commit-Hash rückführbar und in **< 60 s rollback-fähig** (Pages-Rollback auf vorigen Build).
2. **Eigene Domain, HTTPS erzwungen** — Produktiv-Domain via Cloudflare, gültiges Zertifikat, **HSTS** mit `preload`-fähiger Direktive, kein erreichbarer HTTP-Pfad.
3. **Security-Header gehärtet** — `Content-Security-Policy` (deny-by-default, nur whitelisted Supabase-/Stripe-/Turnstile-/Tile-Origins), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors` — versioniert in `app/public/_headers`, nicht im Dashboard versteckt.
4. **Secrets sauber getrennt** — Frontend-Bundle trägt **nur** `VITE_`-Public-Keys (Supabase URL + anon key). Service-Role-Keys, Stripe-Secret, Webhook-Secret, Mail-Keys leben **ausschließlich** als Supabase Edge Function Secrets. Artefakt-Scan bleibt blockierend grün.
5. **Betriebsnachweis statt Versprechen** — Health-Checks, Webhook-Zustellung, Stripe-Liveschalter, Reservierungs-Flow auf der echten Domain verifiziert; **≥7 Tage Burn-in** ohne offene P0/P1, dokumentiert.
6. **Vermittler-Wahrheit bleibt sichtbar** — Disclaimer (Plattform vermittelt, verkauft/berät nicht) und Lebensmittel-Hinweis sind auf der Produktiv-Domain in jeder käufer-/erzeugerseitigen Surface präsent; keine indexierbare Innenfläche täuscht Eigenverkauf vor.

> **Grundsatz:** Phase 2 ist erst „fertig", wenn ein Außenstehender die Produktiv-URL aufruft, den Kernflow real durchläuft (Finder → Hof-Detail → Verfügbarkeit → Reservierung), eine gültige TLS-/Header-Konfiguration vorfindet — und das **über 7 Tage stabil** bleibt. „Deployed" ist nicht „live".

---

## 1. Eingangsbedingung (harter Vorgate)

Phase 2 **startet nicht**, bevor Folgendes erfüllt ist (Quelle: `../99_GOLIVE_GATE.md`, Teil 4):

- [ ] **Phase-1-Go-Live-Gate grün** — alle Wellen `WAVE_00…WAVE_15` als grün in `docs/releases/PHASE_STATUS.md`.
- [ ] **Isolationstest grün** über alle Migrationstabellen (`0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`) — deny-by-default, Cross-Org = 403/leer.
- [ ] **Kernflow end-to-end mit echten Supabase-Daten** (nicht Seed): Finder → Hof-Detail → Verfügbarkeit → Reservierung/Abholfenster.
- [ ] **Mindestens ein Geldfluss** produktiv vorbereitet — Erzeuger-Abo (`WAVE_09`) **oder** SB-Bezahlung (Phase 4 Track A); Stripe-Webhook idempotent & signaturgeprüft.
- [ ] **Owner-Freigabe Phase 1** unterschrieben (`../99_GOLIVE_GATE.md`, Teil 5).

> Ist eine dieser Bedingungen offen → **zurück nach Phase 1**, nicht in Phase 2 vorarbeiten. Die operativen Gates A–F validieren Auslieferung, nicht Fachlogik.

---

## 2. Wellen-/Gate-Übersicht — Phase 2 (verbindlich)

> Quelle der Wahrheit für Inhalt & Reihenfolge: `PHASEN.md` → „Phase 2 — Release & Betrieb". Live-Status je Welle/Gate: `docs/releases/PHASE_STATUS.md`.

Phase 2 ist in **sechs operative Gates A–F** zerlegt. Jedes Gate ist eine in sich geschlossene Welle mit Scope, Akzeptanzkriterien, Betriebsnachweis und Abschlussbericht (Format siehe Abschnitt 6).

| Gate | Welle-Datei | Inhalt | Nachweis (grün =) |
|:---:|---|---|---|
| **A** | `GATE_A_pages_deploy.md` | Cloudflare-Pages-Projekt: CI → `dist/`-Artefakt → Produktiv-Deploy. Node-Version, Build-Command, Output-Dir, **SPA-Fallback** (`_redirects`), Preview- vs. Production-Branch. | Produktiv-URL liefert die App; Deploy auf Commit-Hash rückführbar; Rollback getestet. |
| **B** | `GATE_B_domain_tls.md` | Eigene Domain via Cloudflare, DNS, TLS-Zertifikat, **HTTPS erzwungen** (kein HTTP-Pfad), `www`/Apex-Normalisierung. | `https://<domain>` gültig; HTTP → 301→HTTPS; SSL-Labs-/Header-Check sauber. |
| **C** | `GATE_C_security_header_csp.md` | `app/public/_headers`: **CSP** (deny-by-default, Whitelist Supabase/Stripe/Turnstile/Map-Tiles), **HSTS**, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`. `noindex` für Innen-/Owner-/Staff-Flächen. | Header live verifiziert; CSP ohne Console-Verstöße im Kernflow; Innenflächen `noindex`. |
| **D** | `GATE_D_edge_secrets_waf.md` | Supabase Edge Function Secrets produktiv gesetzt (Service-Role, Stripe-Secret, Webhook-Secret, Mail). **Cloudflare WAF/Rate-Limits** auf Login, Reservierung, Onboarding-Invite, Checkout. **Turnstile** auf allen öffentlichen Formularen live. | Artefakt-Scan secret-frei; Rate-Limits greifen nachweisbar; Turnstile blockt Bots. |
| **E** | `GATE_E_observability_health.md` | Sentry/strukturierte Logs produktiv, **Health-Checks** (App, Supabase, Edge Functions, Stripe-Webhook-Zustellung), Alerting-Pfad, `docs/INCIDENT_RUNBOOK.md` verdrahtet. | Synthetischer Fehler erscheint in Sentry; Health-Endpunkt grün; Alert kommt an. |
| **F** | `GATE_F_burn_in_signoff.md` | **Burn-in ≥7 Tage** auf Produktiv-Domain unter realer Last: Kernflow, Geldfluss (Live-Stripe), Webhook, Backup/Restore-Drill. Owner-Sign-off Phase 2. | 7 Tage ohne offene P0/P1; Live-Zahlung + Quittung verifiziert; Restore getestet. |

**Begleit-Dokumente (jederzeit referenzierbar):**

| Datei | Zweck |
|---|---|
| `../00_RULES.md` | Arbeitsregeln, Triage, Output-/Abschlussbericht-Format, Stop-Regeln (gelten auch hier). |
| `../01_PRIORITIES.md` | P0/P1/P2/P3 — Auslieferungs-/Sicherheits-Blocker vor Politur. |
| `RUNBOOK_DEPLOY.md` | Schritt-für-Schritt Deploy & **Rollback** (entsteht in Gate A). |
| `docs/INCIDENT_RUNBOOK.md` | Incident-/Eskalationspfad (entsteht/verdrahtet in Gate E). |

> **Marktstart-Bezug:** Phase 2 (Gates A–F + Deploy + Domain + Security-Header) ist Pflicht-Block des **Marktstart-Pflicht-Sets** (`PHASEN.md`). Danach folgen Phase 3 (Ops-Gate) und Phase 5 (Gate 10 = erste zahlende Erzeuger).

---

## 3. Dependency-Gates (harte Reihenfolge)

Die Gates laufen nicht beliebig parallel — Auslieferung ist eine Kette:

```
Vorgate: Phase-1-Go-Live-Gate (../99_GOLIVE_GATE.md) MUSS grün sein,
         bevor Gate A startet.
Gate A  (Pages-Deploy)        MUSS stehen, bevor B/C/D auf der echten URL prüfbar sind.
Gate B  (Domain/TLS)          MUSS stehen, bevor C (HSTS/CSP nur auf HTTPS sinnvoll) final ist.
Gate C  (Security-Header/CSP) MUSS grün sein, bevor öffentlicher Burn-in (F) startet.
Gate D  (Edge-Secrets/WAF)    MUSS stehen, bevor Live-Stripe & öffentliche Formulare freigeschaltet werden.
Gate E  (Observability)       MUSS stehen, bevor der Burn-in zählt — ohne Sicht kein Nachweis.
Gate F  (Burn-in ≥7 Tage)     läuft erst, wenn A–E grün sind; Uhr startet ab erstem stabilen Prod-Deploy.
```

> **Burn-in-Regel:** Die 7-Tage-Uhr beginnt **erst**, wenn A–E grün und die Produktiv-Domain stabil erreichbar ist. Jeder P0/P1-Fix während des Burn-in **setzt die Uhr zurück** (frische 7 Tage), keine Teilanrechnung.

---

## 4. Operativer Auslieferungs-Fluss (verbindlich)

```
CI grün (typecheck · lint · build · Artefakt-Scan secret-frei)   [WAVE_01]
  → Cloudflare Pages baut dist/ deterministisch                  [Gate A]
    → Produktiv-Domain + erzwungenes HTTPS/HSTS                   [Gate B]
      → Security-Header/CSP live, Innenflächen noindex            [Gate C]
        → Edge Secrets + WAF/Rate-Limits + Turnstile live        [Gate D]
          → Observability/Health/Alerting aktiv                  [Gate E]
            → Burn-in ≥7 Tage unter realer Last, P0/P1 = 0        [Gate F]
              → Owner-Sign-off Phase 2 → frei für Phase 3 (Ops)
```

> Jeder Schritt liefert seinen **Nachweis** (Befehl, Header-Dump, Screenshot, Log, Run) im Abschlussbericht — keine Behauptung ohne Beleg.

---

## 5. Wie ein Gate pro Session bearbeitet wird

**Pro Arbeitssession — verbindliche Reihenfolge:**

1. Zuerst `CLAUDE.md` (Stimme, 7 Produktionspfeiler, §0), dann `AGENTS.md` lesen.
2. `PHASEN.md` → „Phase 2" öffnen und das **nächste offene Gate** bestimmen — Status: `docs/releases/PHASE_STATUS.md`.
3. Genau **ein** Gate wählen, die Datei `GATE_X_*.md` öffnen — und nur dieses abarbeiten.
4. Dependency-Kette (Abschnitt 3) prüfen: Sind alle Vorgate grün? Wenn nein → blockierendes Gate zuerst.
5. Gate **end-to-end** umsetzen und auf der **echten** Umgebung verifizieren (Config → Deploy → live-Prüfung → Nachweis). Keine TODOs, keine toten Pfade, kein „im Dashboard erledigt".
6. **Owner-Freigabe** für alles Kostenpflichtige/Produktive einholen (siehe Abschnitt 7), **bevor** real geschaltet wird.
7. Am Ende: **Abschlussbericht** (Format aus `../99_GOLIVE_GATE.md`, Teil 3) schreiben und `docs/releases/PHASE_STATUS.md` aktualisieren.

**Niemals:** mehrere Gates gleichzeitig schalten · produktive Secrets ohne Owner-Freigabe setzen · CSP „erstmal weglassen, kommt später" · Burn-in verkürzen, weil es „eilt".

---

## 6. Abschlussbericht-Format pro Gate (verbindlich)

Identisch zum Welle-Format aus `../99_GOLIVE_GATE.md` (Teil 3), mit operativem Fokus:

```text
## Gate abgeschlossen: GATE_X <Name>
- Geändert:      <Config / _headers / _redirects / CI / Runbook / Doku — konkret, mit Pfaden>
- Deploy:        <Commit-Hash · Pages-Deployment-ID · Rollback getestet? (ja/nein)>
- Live-Nachweis: <Produktiv-URL · Header-Dump · Health-Check · Stripe-Live · Run/Screenshot>
- Security:      <CSP ohne Verstöße? HSTS aktiv? Secrets server-only? WAF/Turnstile greifen?>
- Disclaimer:    <Vermittler-/Lebensmittel-Hinweis auf Prod-Domain sichtbar? Innenflächen noindex?>
- Risiken:       <offene Punkte, Annahmen, Owner-Entscheidungen>
- Nächstes Gate: <nach Dependency-Kette>
```

Danach `docs/releases/PHASE_STATUS.md` aktualisieren (Gate → grün) und — falls Doku-Soll aus `MASTER_INDEX.md` erfüllt — den Status dort auf ✅ heben.

---

## 7. Owner-Freigabe & Stop-Regeln (Phase-2-spezifisch)

Phase 2 berührt **Geld, Zugang und Außenwirkung**. Folgendes wird **nur nach ausdrücklicher Owner-Freigabe** real geschaltet — bis dahin bleibt alles repo-lokal/reversibel (Config + Doku, kein Live-Schalten):

- Cloudflare-Account-, Pages-Projekt- und **Domain-Entscheidung** (Kosten, DNS-Hoheit).
- Setzen **produktiver Secrets** (Supabase Edge, Stripe Live-Keys, Webhook-Secret, Mail).
- Umschalten von **Stripe Test → Live**.
- Jeder `git commit` / `push` und der finale **Production-Deploy**.

> **Stop-Regel:** Erscheint ein Gate praktisch nicht erfüllbar (z. B. CSP bricht einen Drittanbieter, HSTS-Preload riskant, Burn-in zeigt wiederkehrenden P1) → **Stop, Owner einbeziehen.** Entweder das Gate sauber bestehen oder ehrlich **nicht live schalten** (kein „halb deployt"). Konflikt-Hierarchie: **User-Anweisung > AGENTS.md > CLAUDE.md > diese Datei.**

---

## 8. Übergang zu Phase 3–5

Nach grünem Phase-2-Sign-off (Gates A–F + Owner-Unterschrift) wandert die Arbeit weiter — Struktur/Soll-Dateien in `MASTER_INDEX.md` (Abschnitt 7) und `PHASEN.md`:

| Phase | Verzeichnis (geplant) | Inhalt |
|---|---|---|
| **Phase 3** | (Owner/Staff-Konsole) | Betriebszentrale als Supabase/Cloudflare-Sicht — Ops-Gate (ersetzt SCC/Hetzner-Denken). |
| **Phase 4** | `finalization/phase4_vertical/` | Track A SB-Bezahlung (USP) · B Karte · C Saison/Alerts · D Erzeuger-Self-Service · E Datenmodell-Skalierung. |
| **Phase 5** | `finalization/phase5_scale/` | Customer-Gates 10/50/100/300, Performance, selbstlernende `CLAUDE.md`. |

> **Marktstart-Pflicht-Set** (aus `PHASEN.md`): Phase 1 (WAVE 02–15 + Isolationstest) · **Phase 2 (Gates A–F + Deploy + Domain + Security-Header)** · Phase 3 (Ops-Gate) · mind. ein Geldfluss · Phase 5 (Gate 10). Diese Phase liefert den fett markierten Block.

---

## 9. Owner-Freigabe Phase 2 (verbindliche Schlusssignatur)

Phase 2 gilt erst als bestanden, wenn der Owner aktiv bestätigt:

```text
RELEASE-GATE PHASE 2 — OWNER-ENTSCHEID

Geprüft von:        (Owner)
Datum:
Build-/Commit:      (Hash) · Pages-Deployment-ID:
Produktiv-Domain:   https://________________   [ ] HTTPS erzwungen  [ ] HSTS aktiv
Gate A Deploy:      [ ] grün   Rollback getestet: [ ]   Nachweis:
Gate B Domain/TLS:  [ ] grün   Nachweis:
Gate C Header/CSP:  [ ] grün   CSP ohne Verstöße im Kernflow: [ ]
Gate D Secrets/WAF: [ ] grün   Artefakt secret-frei: [ ]   Turnstile/WAF live: [ ]
Gate E Observ./Health:[ ] grün Alert verifiziert: [ ]   Backup/Restore-Drill: [ ]
Gate F Burn-in ≥7d: [ ] grün   Zeitraum: ____ bis ____   offene P0/P1: ____
Geldfluss live:     [ ] Erzeuger-Abo  [ ] SB-Bezahlung   (mind. einer, Live-Stripe)
Disclaimer/noindex: [ ] Vermittler-/Lebensmittel-Hinweis sichtbar  [ ] Innenflächen noindex

Entscheid:          [ ] LIVE FREI (Phase 2) – Freigabe für Phase 3 (Ops)
                    [ ] NICHT FREI – offene Punkte:
Unterschrift:       (Owner)
```

---

## Letzter Hinweis

**Ziel ist nicht:** „Die App ist deployed."
**Ziel ist:** Die Produktiv-Domain hält einem echten Erzeuger, einer:m echten Käufer:in und einer Due-Diligence stand — gehärtet, beobachtbar, rollback-fähig, mit erzwungenem HTTPS, sauberer CSP und einem **nachgewiesenen** ≥7-Tage-Betrieb ohne offene P0/P1. „Deployed" ist eine Tatsache; **„live" ist ein Versprechen — und Phase 2 macht es einlösbar.**

Erscheint ein Eintrag dieses Gates praktisch nicht erfüllbar — **Stop. Owner einbeziehen.** Entweder das Gate sauber bestehen oder ehrlich nicht live schalten.
