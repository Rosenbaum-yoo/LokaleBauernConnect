# Phase 2 — Release-Wellen (kompakt) · LokaleBauernConnect

> **Phase 2 = Release-operativ.** Aus „fertig" (Phase-1-Go-Live-Gate) wird „live": sauberes Artefakt → Sicherheits-Header/CSP → Cloudflare-Deploy → Domain → ≥ 7 Tage Burn-in. **Eine Welle pro Session.** Jede Welle: Ziel · Aufgaben · konkrete Befehle · GO-Kriterien · Stop-Regeln.
>
> Adaptiert aus dem TempConnect-Blueprint (`finalization/phase2_release/WAVES.md`, read-only) auf **React+Vite+TS · Supabase (EU, Postgres+RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect)**. VMS-/Hetzner-/Docker-Begriffe (Vendor Pool, Requisition, Compose, Preprod-Server) sind konsequent auf die Hof-Domäne und den Cloudflare/Supabase-Stack überschrieben — **kein Self-Host, kein Docker, kein Hetzner.**
>
> **Bezug:** `PHASEN.md` (Phase 2, Gates A–F) · `finalization/phase2_release/GATES.md` · `finalization/phase2_release/MASTERPROMPT.md` · `finalization/WAVE_01_release_hygiene.md` · `finalization/99_GOLIVE_GATE.md` · `CLAUDE.md` (7 Produktionspfeiler, §0-Direktive).
>
> **Rolle = VERMITTLER:** kein Eigenverkauf, keine Beratung. Vermittler-Disclaimer durchgängig sichtbar — auch im Live-Betrieb (Burn-in prüft das).

---

## Geltungsbereich & Konfliktregel

- **Diese Datei deckt Phase 2 ab** (Release-Operativ). Sie setzt das **Phase-1-Go-Live-Gate** (`99_GOLIVE_GATE.md`, Teil 1 A–H) als bestanden voraus: Kernflow (Finder → Hof-Detail → Verfügbarkeit → Reservierung/Abholfenster) end-to-end mit echten Supabase-Daten, Isolationstest grün, mind. ein Geldfluss (Erzeuger-Abo `WAVE_09` oder SB-Bezahl-USP Phase 4 Track A).
- **Wellen-Verhältnis:** Phase 1 `WAVE_01_release_hygiene.md` baut CI + Hygiene-Gate **vor**. Phase 2 **verifiziert** dieses Gate auf dem realen Release-Candidate und schaltet die Live-Schritte frei. Doppelarbeit vermeiden: Welle P2-1 prüft, baut nicht neu.
- **Kein Punkt darf wegdiskutiert werden.** Nicht erfüllbar → **Stop, Owner einbeziehen** (Stop-Regeln `CLAUDE.md`). Feature anpassen, bis das Gate hält, oder ehrlich als „Bald verfügbar" markieren (nicht abrechenbar, nicht als live verkauft).
- **„Live" entscheidet der Owner.** Account/Kosten/Domain/Secrets/Deploy = irreversible bzw. kostenwirksame Schritte → **vorab in Klartext ankündigen, erst auf OK.** Diffs bleiben uncommitted bis Owner-Freigabe; Co-Author-Zeile anhängen.
- Konflikt-Hierarchie: **User-Anweisung > AGENTS.md > Subagent/Skill > CLAUDE.md > diese Datei.**

## Wellen-Überblick (Phase 2)

| Welle | Name | Schwerpunkt | Phase-2-Gate | Owner-Freigabe nötig |
|---|---|---|---|---|
| **P2-1** | Release-Hygiene-Verifikation | Sauberes, secret-freies Artefakt; CI/Hygiene-Gate grün | A (Build) · B (Security) | nein (repo-lokal) |
| **P2-2** | Security-Header, CSP & HSTS | `_headers`/`_redirects`, CSP real, HSTS-Preload-Entscheid | B (Security) | nein (repo-lokal) |
| **P2-3** | Cloudflare-Pages-Deploy | Pages-Projekt, Env-Vars, Edge-Functions-Deploy, Smoke | A · F (Smoke) | **JA** (Account/Kosten/Secrets) |
| **P2-4** | Domain, WAF & Turnstile | Custom Domain, DNS, TLS, WAF/Rate-Limits, Turnstile live | B · D (Legal-Surface) | **JA** (Domain/DNS) |
| **P2-5** | Pre-Production-Burn-in | RC real betreiben, ≥ 7 Tage, Smoke + Abuse + Restore-Drill | A–F + E (Perf) | **JA** (Go-Live-Signatur) |

> Reihenfolge ist **bindend**: P2-2 ohne sauberes Artefakt (P2-1) ist wertlos; P2-4 (Domain) ohne grünen Deploy (P2-3) gibt es nicht; Burn-in (P2-5) läuft auf der real deployten, domain-verbundenen Umgebung. Jede Welle referenziert ihr **Phase-2-Gate** (Definitionen in `GATES.md`).

---

## WAVE P2-1 — Release-Hygiene-Verifikation (Artefakt sauber)

**Ziel:** Der Release-Candidate ist ein **sauberes, reproduzierbares, secret-freies** Artefakt — kein „kopierter Working-Tree". Verifiziert, nicht behauptet. (Vor-Gate zu A/B.)

**Aufgaben:**
- `WAVE_01`-CI auf dem RC laufen lassen: `typecheck → lint → format:check → build → hygiene-gate` müssen grün sein (nicht erneut bauen — nur ausführen/prüfen).
- Frisches `dist/` auf Verbotenes scannen: **keine** `.env`, **kein** `.claude/`, **kein** `node_modules`, **kein** Server-Secret (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Mail-Key). Frontend-Bundle enthält nur `VITE_`-Public-Keys (Supabase URL + anon key).
- `dist/` enthält die Pflicht-Deploy-Artefakte **`_headers` und `_redirects`**.
- Negativtest reproduzieren: verschmutzter Tree (`.env.leak` mit `sk_live_…`) → Hygiene-Gate **FAIL**, Exit ≠ 0 → aufräumen.
- Git-History read-only auf historisch geleakte Secrets prüfen (kein eigenmächtiger Rewrite).
- `docs/releases/RELEASE_ARTIFACT_REPORT.md` erzeugen (Artefakt-Inhalt, Gate-Ergebnis, Datum, Commit-Hash falls freigegeben).

**Befehle:**
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
npm ci
npm run ci                                   # typecheck + lint + build (WAVE_01)
bash scripts/release-hygiene-check.sh        # erwartet: HYGIENE-GATE: PASS
# Negativtest (muss rot werden):
echo "STRIPE_SECRET_KEY=sk_live_AAAAAAAAAAAAAAAAAAAAAAAA" > .env.leak && git add -f .env.leak
bash scripts/release-hygiene-check.sh ; echo "ExitCode=$?"   # erwartet: FAIL, ExitCode=1
git rm -f --cached .env.leak && rm -f .env.leak
# Artefakt-Inhalt sichten (keine Secrets/.claude/.env):
find dist -maxdepth 2 -type f | sort
test -f dist/_headers && test -f dist/_redirects && echo "Deploy-Artefakte OK"
# History read-only:
git log --all --full-history -- '**/.env' '**/.env.*' ':!**/.env.example'
```

**GO (Phase-2-Gate A + B Vorstufe):**
- `npm run ci` grün · `release-hygiene-check.sh` = **PASS** · Negativtest reproduzierbar **FAIL** (Exit 1).
- `dist/` secret-frei, mit `_headers` + `_redirects`, ohne `.claude`/`.env`/`node_modules`.
- Kein Server-Secret im Frontend-Bundle; nur zwei `VITE_`-Vars.
- History-Check ohne Secret-Treffer (sonst **STOP** → Owner: Rotation/Rewrite abstimmen).
- `RELEASE_ARTIFACT_REPORT.md` vorhanden.

**Stop-Regeln:** Echte Secrets in History → STOP (kein eigenmächtiger `git filter-repo`). `WAVE_01`-CI/-Skript fehlen → erst `WAVE_01` abschließen, nicht hier improvisieren.

---

## WAVE P2-2 — Security-Header, CSP & HSTS (real, nicht Deko)

**Ziel:** Cloudflare Pages liefert echte, due-diligence-feste Sicherheits-Header aus `dist/_headers` aus — **CSP deckt genau die real genutzten Origins** (Supabase, OSM-Tiles für den Hofladen-Finder), nicht mehr und nicht weniger. Kein toter CSP-Eintrag ohne aktiven Pfad.

**Ist-Zustand (repo-genau, `app/public/_headers`):** vorhanden mit
`X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Strict-Transport-Security: max-age=31536000; includeSubDomains` · `Permissions-Policy: geolocation=(self), camera=(), microphone=()` · CSP mit `default-src 'self'`, `connect-src 'self' https://*.supabase.co`, `img-src 'self' data: https://*.tile.openstreetmap.org https://*.supabase.co`, `style-src 'self' 'unsafe-inline'`, `script-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. `app/public/_redirects` ist **leer** → SPA-Fallback ergänzen.

**Aufgaben:**
- **`_redirects` SPA-Fallback** anlegen (React-Router-Deep-Links `/hof/<id>` dürfen nicht 404'en):
  ```
  /*    /index.html    200
  ```
- **CSP nur erweitern, wenn ein Pfad live geht** (Defense, kein Voraus-Loch):
  - **Turnstile** (öffentliche Formulare: Reservierung, Erzeuger-Onboarding, Kontakt) → `script-src` + `frame-src https://challenges.cloudflare.com`, `connect-src` ggf. selbiges. (Aktivieren in P2-4, wenn Turnstile real eingebunden ist.)
  - **Stripe / SB-Bezahl-USP** (erst bei Go-Live von WAVE_09 bzw. Phase 4 Track A): `script-src https://js.stripe.com` · `frame-src https://js.stripe.com https://hooks.stripe.com` · `connect-src https://api.stripe.com`. **Jetzt nur dokumentieren**, nicht setzen, solange Checkout nicht live ist.
- **`'unsafe-inline'` in `style-src`** als bewusste, dokumentierte Ausnahme festhalten (Editorial-Inline-Styles/Token-Variablen); Ziel-Härtung: per Hash/Nonce ablösen (Backlog, kein Launch-Blocker).
- **HSTS-Preload-Entscheid** mit Owner: `includeSubDomains; preload` + Eintrag auf hstspreload.org **nur** wenn alle Subdomains dauerhaft HTTPS sind (irreversibel-nah) → Entscheid in `docs/security/SECURITY_OVERVIEW.md` dokumentieren.
- **`noindex`** für App-Innenflächen/Owner-/Staff-Bereiche dokumentieren (Marketing-Landing bleibt indexierbar) — Surface-Liste in der Doku.
- Header nach (Test-)Deploy real verifizieren (Response-Header, nicht nur Quelltext).

**Befehle:**
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
printf '/*    /index.html    200\n' > public/_redirects
npm run build
test -f dist/_redirects && grep -q 'index.html' dist/_headers 2>/dev/null; cat dist/_headers
# Nach Test-Deploy (P2-3): echte Header prüfen
curl -sI https://<pages-preview>.pages.dev | grep -iE 'content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy'
```

**GO (Phase-2-Gate B):**
- `_headers` + `_redirects` landen in `dist/` und werden real ausgeliefert (per `curl -I` bestätigt).
- CSP enthält **alle** real genutzten Origins (Supabase, OSM-Tiles) und **keine** ungenutzten (kein Stripe/Turnstile-Eintrag ohne aktiven Pfad).
- HSTS aktiv; Preload-Entscheid mit Owner dokumentiert (bewusst, nicht versehentlich).
- SPA-Deep-Link (`/hof/<id>` direkt aufgerufen) lädt korrekt (kein 404).
- `noindex`-Surface-Entscheid dokumentiert.

**Stop-Regeln:** HSTS-Preload ist faktisch schwer rückrollbar → **nur mit Owner-Freigabe** und nur bei 100 % HTTPS-Subdomain-Abdeckung. CSP, die einen Live-Zahlpfad blockiert, ist ein P0 — vor Go-Live von Stripe/SB-Payment Welle P2-2 erneut anfassen.

---

## WAVE P2-3 — Cloudflare-Pages-Deploy (App + Landing)

**Ziel:** Der RC läuft reproduzierbar auf Cloudflare Pages; Supabase Edge Functions (Deno) sind deployt und mit serverseitigen Secrets versorgt; Smoke-Test grün. **Kein Hetzner/Docker — Pages + Workers + Supabase.**

**Deploy-Topologie:**
- **App** (`app/`, Vite-Build → `dist/`) → Cloudflare Pages, Root-Directory `app`, Output `dist`.
- **Marketing-Landing** (`web/`, statisch) → separates Pages-Projekt oder eigener Pfad (indexierbar; App-Flächen `noindex`).
- **Edge Functions** (`app/supabase/functions/*`: `create-checkout`, `stripe-webhook`, `_shared`) → Supabase deploy; Secrets via `supabase secrets set` (nie im Repo/Bundle/Log).

**Pages-Projekt-Settings (Owner setzt im Dashboard — hier verbindlich dokumentiert):**

| Setting | Wert |
|---|---|
| Production branch | `main` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Root directory (Monorepo) | `app` |
| Node version | `20` (`.node-version` / `NODE_VERSION=20`) |
| Env-Vars (Production + Preview) | **nur** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (keine Secrets) |

**Aufgaben:**
- Cloudflare-Pages-Projekt(e) anlegen — **Owner-Freigabe (Account/Kosten)**.
- Nur die zwei `VITE_`-Public-Vars als Pages-Env setzen; **kein** Server-Secret in Pages.
- Edge Functions deployen; Server-Secrets via `supabase secrets set` (Stripe-Secret/Webhook-Secret, Service-Role, Mail-Key). `supabase secrets list` zeigt nur Namen — zur Verifikation, ohne Werte.
- **Stripe-Webhook** auf die deployte Edge-Function-URL zeigen lassen; Signaturprüfung + Idempotenz auf der Live-URL testen (doppeltes Event → ein Effekt).
- Smoke gegen die Preview/Prod-URL: Landing lädt, App lädt, Kernflow klickbar, Header gesetzt, Konsole sauber (keine `TypeError`/401-Schleifen), Zero-State bei leeren Daten statt 500.
- `docs/DEPLOYMENT.md` (Cloudflare Pages/Workers + Supabase Edge) finalisieren.

**Befehle:**
```bash
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"
npm ci && npm run build                       # exakt der Pages-Build
# Edge Functions (nur mit Owner-Freigabe ausführen):
# supabase functions deploy create-checkout stripe-webhook
# supabase secrets set STRIPE_SECRET_KEY=<sk_...> STRIPE_WEBHOOK_SECRET=<whsec_...> \
#   MAIL_PROVIDER=resend MAIL_API_KEY=<key> MAIL_FROM="LokaleBauernConnect <noreply@...>"
# supabase secrets list                       # zeigt nur Namen, keine Werte
# Smoke gegen Deploy-URL:
curl -sI https://<deploy-url> | grep -iE 'content-security-policy|strict-transport'
curl -s  https://<deploy-url>/hof/<seed-id>  -o /dev/null -w "%{http_code}\n"   # erwartet 200 (SPA-Fallback)
```

**GO (Phase-2-Gate A + F):**
- Pages-Build reproduzierbar grün (Node 20, `npm ci && npm run build`).
- Landing **und** App erreichbar; Deep-Link liefert 200; Sicherheits-Header aktiv (P2-2 bestätigt auf der Deploy-URL).
- Edge Functions deployt; Stripe-Webhook signaturgeprüft + idempotent auf der Live-URL.
- **Keine** Secrets in Pages-Env / im Bundle; nur zwei `VITE_`-Vars; `secrets list` ohne Werte.
- Smoke-Test (Finder, Hof-Detail, Reservierung, Zahlbestätigung) ohne 404/500/Konsolen-Fehler.

**Stop-Regeln:** Pages-Projekt anlegen / Production-Secrets setzen / Edge deploy → **STOP, Owner-Freigabe** (kostenwirksam/irreversibel-nah). Webhook ohne Signatur/Idempotenz → **nicht** live (Geldfluss-P0).

---

## WAVE P2-4 — Domain, WAF, Turnstile & Rate-Limits

**Ziel:** Eigene Domain live unter TLS; Cloudflare WAF/Rate-Limits auf sensiblen Flows; Turnstile real auf öffentlichen Formularen. Rechts-Surfaces (Impressum/Datenschutz/AGB/Lebensmittel-Hinweis) von allen relevanten Flächen verlinkt.

**Aufgaben:**
- **Domain & DNS** (Owner): Custom Domain auf das Pages-Projekt; DNS (Cloudflare-Nameserver/CNAME); TLS automatisch (Universal SSL); HTTPS-Redirect erzwingen; ggf. `www`→Apex normalisieren.
- **HSTS** nach erfolgreichem TLS scharf bestätigen (Preload-Entscheid aus P2-2 jetzt umsetzen, falls beschlossen).
- **CSP final** für Live-Domain: jetzt **Turnstile**-Origins setzen (`challenges.cloudflare.com`), da Turnstile produktiv eingebunden wird; Stripe-Origins nur, wenn der Zahlpfad live geht.
- **Turnstile** auf allen öffentlichen Formularen real verdrahtet (Reservierung, Erzeuger-Onboarding, Kontakt) — Edge Function validiert das Token serverseitig (Zod-Grenze + Turnstile-Verify), nicht nur Client-Widget.
- **WAF/Rate-Limits** (Cloudflare): Login/Auth, Reservierung, Onboarding-Invite, Checkout/Zahlung, Stripe-Webhook-Pfad (eng, signaturgeschützt) — Schwellen dokumentiert, kein Wildcard-CORS auf sensiblen Routen.
- **Legal-Surface (Gate D):** Impressum, Datenschutz, AGB, **Lebensmittel-Kennzeichnungs-Hinweis**, AVV/TOMs (`docs/launch/B_rechtstexte/`) von Landing, App, Onboarding und Checkout verlinkt; **Vermittler-Disclaimer** durchgängig sichtbar.
- `docs/DEPLOYMENT.md` + `docs/security/SECURITY_OVERVIEW.md` um Domain/WAF/Turnstile ergänzen.

**Befehle:**
```bash
# DNS/TLS-Verifikation (nach Owner-DNS-Setup):
curl -sI https://<deine-domain.de> | grep -iE 'strict-transport-security|cf-ray|content-security-policy'
curl -s  https://<deine-domain.de>/hof/<seed-id> -o /dev/null -w "%{http_code}\n"   # 200
# Turnstile-Verify-Pfad (Edge): valides vs. fehlendes Token
curl -s -X POST https://<edge-url>/functions/v1/<oeffentliches-formular> -d '{}' -o /dev/null -w "%{http_code}\n"  # erwartet 4xx ohne Token
```

**GO (Phase-2-Gate B + D):**
- Domain unter HTTPS erreichbar; HTTP→HTTPS-Redirect; HSTS aktiv (auf der echten Domain bestätigt).
- CSP der Live-Domain enthält Turnstile-Origins (real genutzt), keine ungenutzten Origins.
- Turnstile **serverseitig** verifiziert (fehlendes/ungültiges Token → 4xx, kein Fake-Erfolg).
- WAF/Rate-Limits auf Auth/Reservierung/Onboarding/Checkout aktiv; CORS nicht wildcard.
- Rechtstexte + Vermittler-Disclaimer von allen relevanten Surfaces verlinkt/sichtbar.

**Stop-Regeln:** Domain/DNS verbinden, HSTS-Preload scharf schalten → **STOP, Owner-Freigabe** (irreversibel-nah). Turnstile nur als Client-Widget ohne Server-Verify = Scheinsicherheit → nicht als „geschützt" abnehmen.

---

## WAVE P2-5 — Pre-Production-Burn-in (≥ 7 Tage, dann Marktstart-GO)

**Ziel:** Der Release-Candidate wird auf der real deployten, domain-verbundenen Umgebung **≥ 7 Tage** betrieben und beobachtet, bevor der Marktstart freigegeben wird. Stabilität statt Hoffnung.

**Aufgaben:**
1. RC auf Production-Pages + Live-Domain bereitstellen (Ausgang von P2-3/P2-4).
2. **Smoke-Suite** wiederkehrend: Landing, App, Finder → Hof-Detail → Verfügbarkeit → Reservierung/Abholfenster → (falls live) Zahlbestätigung/Quittung.
3. **Kernflow mehrfach** mit echten Supabase-Daten durchspielen (verschiedene Rollen: Käufer/Erzeuger/Staff — Welten bleiben getrennt).
4. **Fehler-/Logs prüfen** (Supabase Logs, Cloudflare Analytics/Logs, Sentry/Observability aus `WAVE_13`): keine wiederkehrenden 500er, keine 401-Schleifen, keine Auth-/Tenant-/Permission-Fehler.
5. **Tenant-Isolation im Live-Betrieb** stichprobenhaft: fremde Org = 403/leer, nie 200 mit Fremddaten.
6. **Webhook-Idempotenz** unter Last bestätigen (doppelte Stripe-Events → ein Effekt, falls Geldfluss live).
7. **Backup/Restore-Drill** der Supabase-DB **mindestens einmal** nachweislich durchführen (`docs/BACKUP_DISASTER_RECOVERY.md`).
8. **Last-/Abuse-Minicheck**: Rate-Limits greifen (Login/Reservierung/Checkout); Turnstile hält Bots; WAF-Regeln feuern.
9. **Security-Smoke**: Header aktiv, kein Secret-Leak in Logs/Bundle, kein Fake-Erfolg auf SSO/Turnstile.
10. **Performance (Gate E):** Kernseiten-Ladezeit/Queries akzeptabel (Pagination/Indizes aus `WAVE_11` greifen, keine N+1 auf dem Finder).

**Mindestanforderung für GO:**
- ≥ **7 Tage** stabiler Betrieb auf Live-Umgebung.
- **Keine P0/P1**-Fehler offen; keine wiederkehrenden 500er.
- Keine Auth-/Tenant-/Permission-Fehler; keine Secret-Leaks.
- Backup/Restore **nachgewiesen** (Drill dokumentiert, mit Datum).
- Vermittler-Disclaimer + Rechtstexte durchgängig sichtbar/verlinkt.
- Mind. ein Geldfluss verifiziert (Erzeuger-Abo oder SB-Bezahlung) **oder** ehrlich als „Bald verfügbar" markiert (nicht abrechenbar).

**Befehle (Beobachtung/Drill):**
```bash
# Wiederkehrender Smoke (z. B. per Cron/manuell während Burn-in):
for path in / /hof/<seed-id> /finder ; do
  curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" "https://<deine-domain.de>$path"
done
curl -sI https://<deine-domain.de> | grep -iE 'strict-transport|content-security-policy'
# Restore-Drill (Owner, dokumentieren in BACKUP_DISASTER_RECOVERY.md):
# supabase db dump > backup_<datum>.sql   &&   Restore in Test-Projekt + Stichprobe verifizieren
```

**GO (Phase-2-Gate A–F vollständig + E):**
- Alle Phase-2-Gates A (Build) · B (Security) · C (Tenant-Isolation) · D (Legal) · E (Performance) · F (Smoke) grün.
- Burn-in-Kriterien (oben) erfüllt und dokumentiert.
- **Owner-Go-Live-Signatur** gesetzt (siehe unten) → **Marktstart-GO**.

**Stop-Regeln:** Jeder P0/P1 im Burn-in → Uhr startet neu nach Fix (keine Abkürzung). Restore-Drill nicht durchführbar → **STOP** (kein Live ohne nachgewiesenes Backup/Restore). Marktstart-Freigabe → **nur Owner**, nie Claude.

---

## Phase-2-Go-Live-Signatur (Owner)

```text
PHASE 2 — RELEASE-OPERATIV — OWNER-ENTSCHEID

Geprüft von:        (Owner)
Datum:
Deploy-URL / Domain:
Commit-/Build-Hash:
P2-1 Hygiene:       [ ] Artefakt secret-frei · Gate PASS · Negativtest FAIL
P2-2 Header/CSP:    [ ] Header live bestätigt (curl) · CSP real · HSTS-Entscheid dok.
P2-3 Deploy:        [ ] Pages+Edge live · Webhook signiert+idempotent · Smoke grün
P2-4 Domain/WAF:    [ ] Domain+TLS · Turnstile server-verifiziert · WAF/Rate-Limits · Legal verlinkt
P2-5 Burn-in:       [ ] ≥7 Tage stabil · kein P0/P1 · Backup/Restore nachgewiesen
Gates A–F:          [ ] alle grün   Offene Ausnahmen (begründet):
Geldfluss live:     [ ] Erzeuger-Abo  [ ] SB-Bezahlung   (mind. einer ODER „Bald verfügbar")

Entscheid:          [ ] MARKTSTART-GO (Phase 2 bestanden)
                    [ ] NICHT FREIGEGEBEN – offene Punkte:
Unterschrift:       (Owner)
```

---

## Abschlussbericht-Format (pro Welle — Pflicht)

Vollständige Struktur in `99_GOLIVE_GATE.md` (Teil 3). Kurzform pro Phase-2-Welle:

```text
## Welle abgeschlossen: WAVE_P2-X <Name>
- Geprüfte Bereiche: (dist/, _headers/_redirects, Pages-Settings, Edge Functions, Domain/WAF, Logs)
- Geänderte Dateien: (z. B. app/public/_redirects, docs/DEPLOYMENT.md, docs/security/SECURITY_OVERVIEW.md)
- Tests/Checks: (npm run ci · hygiene-gate PASS · curl -I Header · 200 auf /hof/<id> · Webhook-Idempotenz · Restore-Drill)
- Ergebnis: (grün/rot, mit Nachweis — Befehl/Output/Datum)
- Risiken: (konkret + Schweregrad + Mitigation)
- Phase-2-Gate-Bezug: (A/B/C/D/E/F)
- Owner-Freigaben offen: (Account/Domain/Secrets/Go-Live)
- Nächste Welle:
```

> **Tracker-Pflicht nach Abschluss jeder Welle:** `docs/releases/PHASE_STATUS.md` (Phase-2-Zeile) auf realen Stand setzen, `MASTER_INDEX.md` (Abschnitt 7 · `finalization/phase2_release/{WAVES,GATES,MASTERPROMPT}`) auf ✅ aktualisieren. Wiederverwendbares Deploy-/Header-/Burn-in-Muster als Imperium-Beschleuniger nach `.claude/memory/patterns/` verdichten. **`.claude/` nie ins Release-Artefakt.**

## Übergang

→ Nach grüner Phase-2-Signatur folgt **Phase 3 (Ops-Gate — Betriebszentrale)** und **Phase 5 (Gate 10 — erste zahlende Erzeuger)** als verbleibende Pflicht-Gates des Marktstart-Sets (`PHASEN.md`). Diese Phase macht das Produkt *live*; Phase 1 hat es *fertig* gemacht.
