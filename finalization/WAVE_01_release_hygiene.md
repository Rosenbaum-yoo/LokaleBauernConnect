# WAVE 01 — Release-Hygiene & CI (sauberes Artefakt · Env/Secrets · Lint/Typecheck/Build-Pipeline · Cloudflare-Pages-Config)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · Zweite Welle des Bauplans (`PHASEN.md` → Phase 1, WAVE_01). **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> **Voraussetzung:** `WAVE_00 — Baseline` grün (reproduzierbarer Vite+React+TS(strict)-Build, Editorial-Design-System, Secret-/Env-Grenze).
> **Ausführungsrollen:** Claude (gesamter Stack) + Subagenten **devops** (CI/Cloudflare-Pages-Gate), **security-auditor** (read-only: Secret-/Artefakt-Scan), **qa-tester** (Gate-Negativtest).
> **Owner-Freigabe-pflichtig** (Stop-Regel, Account/Kosten/irreversibel): Cloudflare-Pages-Projekt anlegen, produktive Secrets setzen, Domain verbinden, jeder `git commit`/`push`, jeder Git-History-Rewrite. Bis dahin ist diese Welle **repo-lokal und reversibel** (CI-Definition + Konfig-Dateien + Skripte + Doku) — vorbereitet, nicht live geschaltet.

---

## 0. Ziel

WAVE_00 hat ein reproduzierbares Fundament geliefert. WAVE_01 macht daraus ein **auslieferbares Produkt mit Türsteher**: Jede Änderung läuft durch eine deterministische Pipeline, und es verlässt nur ein **sauberes, secret-freies Artefakt** das Repo Richtung Cloudflare Pages — niemals ein „kopierter Working-Tree". Konkret:

1. **Reproduzierbare CI-Pipeline (blockierend).** Jeder Push/PR durchläuft automatisch `install → typecheck → lint → format-check → build` auf gepinntem Lockfile (`npm ci`, Node 20). **Rot = kein Merge, kein Deploy.** `tsc --noEmit` ist bereits Teil von `build` (WAVE_00) und bleibt aussagekräftiges Gate.
2. **Cloudflare-Pages-Config explizit & versioniert.** Build-Command, Output-Verzeichnis (`dist/`), Node-Pin, Monorepo-Root (`app/`), SPA-Routing-Fallback (`_redirects`) und Security-Header (`_headers`) liegen **im Repo**, nicht versteckt im Cloudflare-Dashboard. Identischer Build lokal = CI = Cloudflare.
3. **Saubere Env-/Secret-Trennung.** Frontend kennt **nur** `VITE_`-Public-Keys (Supabase-URL + anon key, die ohnehin im Bundle landen). **Service-Role-, Stripe-Secret-, Webhook- und Mail-Provider-Keys leben ausschließlich als Supabase Edge Function Secrets** (`supabase secrets set …`) — nie im Frontend-Bundle, nie in Git, nie im CI-Log. `.env.example` dokumentiert beide Klassen vollständig und **secret-frei**.
4. **Sauberes Release-Artefakt (verifiziert, nicht behauptet).** Das deploybare `dist/` enthält **kein** `.env`, **kein** `.claude/`, **kein** `node_modules`, **keine** Server-Secrets, keine Source-Maps. Ein **blockierendes Hygiene-Gate-Skript** prüft den getrackten Tree gegen Verbots-Muster und ist auch lokal vor jedem PR ausführbar (Shift-Left).

**Türsteher-Prinzip:** Erst wenn das WAVE_01-Gate grün ist, sind Folge-Wellen und insbesondere der Cloudflare-Deploy (Phase 2, Gates A+B) freigegeben.

**Nicht-Ziel dieser Welle:** das *tatsächliche* Cloudflare-Pages-Projekt, produktive Secrets, Domain oder ein Live-Deploy (kosten-/accountrelevant → Owner-Freigabe, Phase 2). Datenmodell/RLS sind WAVE_02. Diese Welle liefert die Pipeline und das saubere Artefakt-Versprechen, nicht den Live-Schalter.

---

## 1. Ist-Zustand (repo-genau geprüft — keine Annahmen)

| Fakt im Repo | Stand | Konsequenz für WAVE_01 |
|---|---|---|
| `app/package.json` Scripts | `dev`, `build` (= `tsc --noEmit && vite build`), `preview`, `typecheck` | Build prüft Typen — gut. **`lint`/`format:check`/`ci` fehlen** → additiv ergänzen. |
| `app/tsconfig.json` | `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` | Strenge steht → Typecheck ist hartes Gate. ESLint ergänzt, ersetzt nicht. |
| `app/vite.config.ts` | `build.outDir='dist'`, `sourcemap:false`, Port 5409 | Output = `dist/` → Cloudflare-Pages-Output. Kein Source-Leak. Passt. |
| `app/public/_headers` | Security-Header + CSP (`connect-src 'self' https://*.supabase.co`) | Übernehmen; Gate prüft, dass es in `dist/` ankommt. Stripe-Domains **erst** beim USP-Go-Live ergänzen. |
| `app/.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (leer, secret-frei) | **Unvollständig:** server-seitige Edge-Secret-Klasse fehlt als Doku → ergänzen (ohne `VITE_`, auskommentiert). |
| `app/.gitignore` | `node_modules`, `dist`, `dist-ssr`, `*.local`, `.env`, `.env.*` (außer `.env.example`), `.DS_Store` | **`.claude` fehlt!** → ergänzen (Kanon: „.claude/ nie ins Release-Artefakt"). |
| `app/supabase/functions/` | `create-checkout/index.ts`, `stripe-webhook/index.ts`, `_shared/{stripe,email,supabaseAdmin,cors}.ts`, `.env.example` | Lesen **server-seitige Secrets** → eigene Secret-Klasse, vom Frontend-Bundle fern, separate Deno-Toolchain. |
| `app/supabase/functions/.env.example` | vorhanden | als Edge-Secret-Vorlage referenzieren; Gate prüft secret-frei. |
| `.github/workflows/ci.yml` | **vorhanden** (Job `app`: `working-directory: app`, Node 20, `npm ci` → `typecheck` → `test` → `build`) | Frontend-CI steht; **offen:** Lint-/Format-Check + Artefakt-Hygiene-Gate + Edge/Deno-Job additiv ergänzen. |
| `app/public/_redirects` | **existiert nicht** | Für SPA-Deep-Link-Fallback neu anlegen. |
| `app/.nvmrc` / `app/.node-version` | **nicht vorhanden** | Node-20-Pin für lokal/CI/Cloudflare-Parität neu anlegen. |
| `app/eslint.config.js` | **nicht vorhanden** | ESLint flat config neu (Edge Functions ausgenommen). |
| `app/scripts/` | **nicht vorhanden** | Hygiene-Gate-Skript neu. |

> **Dokumentierte Abweichung zum Blueprint:** Eine strukturelle TempConnect-Referenz *härtet* eine bestehende `ci.yml`; hier wurde sie architekturkonform **neu gebaut** und liegt unter `.github/workflows/ci.yml` (GitHub Actions · `working-directory: app` · Node 20 · `npm ci` → `npm run typecheck` → `npm test` → `npm run build`). Edge-/Deno-Tests folgen additiv. Begründung hier festgehalten, damit der bewusste Neubau nachvollziehbar bleibt (kein stiller Architekturwechsel).

---

## 2. Aufgaben

### 1.1 `.gitignore` & `.env.example` korrigieren (P0, repo-lokal, reversibel)

**1.1a — `.claude/` und Tool-/Build-Müll aus dem Artefakt ausschließen.** `app/.gitignore` additiv ergänzen (bestehende Einträge bleiben):

```gitignore
# WAVE_01 — Hygiene: niemals ins Release-Artefakt
.claude
.agents
.vercel
.wrangler
coverage
.c8_output
*.log
*.lnk
.idea
.vscode
```

> `.claude/` enthält Memory/ADRs/Lern-Logs (Kanon-Verbot „`.claude/` nie ins Release-Artefakt"). Es liegt auf Repo-Wurzel (`(D)/.claude`), die App baut unter `app/dist/` — also bereits außerhalb des Output-Pfads. Der Eintrag ist **Defense-in-Depth** für den Fall, dass je ein Wurzel-Archiv gezogen wird, und wird vom Hygiene-Gate erzwungen.

**1.1b — `app/.env.example` vervollständigen** (Frontend-Public klar von Server-Secrets trennen, alles secret-frei, nur Platzhalter):

```dotenv
# === Frontend (öffentlich — landen im Bundle, daher NUR anon/public!) ===
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-public-key>

# === Server-seitig (NICHT im Frontend, NICHT in Git) ===
# Nur als Supabase Edge Function Secrets setzen (`supabase secrets set ...`).
# NIEMALS mit VITE_ präfixen — sonst landet das Geheimnis im Bundle.
# SUPABASE_SERVICE_ROLE_KEY=<service-role-key>     # nur Edge Functions (supabaseAdmin.ts)
# STRIPE_SECRET_KEY=<sk_test_oder_sk_live>         # nur create-checkout / stripe.ts
# STRIPE_WEBHOOK_SECRET=<whsec_...>                # nur stripe-webhook
# MAIL_PROVIDER=resend|sendgrid|console
# MAIL_API_KEY=<provider-key>                      # nur email.ts
# MAIL_FROM="LokaleBauernConnect <noreply@deine-domain.de>"
```

> Regel-Anker (AGENTS.md): „service role nur in Edge Functions, Frontend nur `VITE_`-Public." Alles ohne `VITE_`-Präfix ist im Vite-Bundle technisch **nicht** verfügbar — genau das ist die Garantie, dass Server-Secrets nicht ins Frontend gelangen. Deshalb sind die Server-Werte bewusst ohne Präfix und auskommentiert dokumentiert.

### 1.2 Lint/Format-Toolchain einführen (P0)

ESLint (flat config, TS-strict-tauglich) + Prettier-Check ergänzen `tsc` um stilistische/Bug-Pattern-Prüfung — sie **ersetzen die Strenge aus `tsconfig.json` nicht**, sie verbreitern das Netz.

```bash
cd app
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier
```

`app/package.json` → `scripts` additiv ergänzen (bestehende `dev/build/preview/typecheck` unverändert):

```jsonc
"lint": "eslint . --max-warnings 0",
"format:check": "prettier --check \"src/**/*.{ts,tsx,css,md}\"",
"ci": "npm run typecheck && npm run lint && npm run format:check && npm run build"
```

`app/eslint.config.js` (flat config; **Edge Functions/Deno bewusst ausgeschlossen** — eigene Toolchain in 1.4):

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'supabase/functions/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
)
```

> `supabase/functions/**` (Deno, `npm:`/`https:`-Imports) wird ausgeschlossen, sonst kollidieren die Imports mit der Node-Auflösung. Edge wird separat per `deno lint`/`deno check` geprüft (Aufgabe 1.4). Saubere Trennung: **npm** fürs React-Frontend, **Deno** für Edge.

### 1.3 GitHub Actions CI — `npm`-Pipeline (P0)

Neu: `.github/workflows/ci.yml` (Repo-Wurzel; `working-directory: app`, da die App unter `app/` liegt). Pipeline = **install → typecheck → lint → format-check → build → Artefakt-Hygiene-Gate**.

```yaml
name: CI

on:
  push:
    branches: [main, 'feat/**']
  pull_request:
    branches: [main]

permissions:
  contents: read            # least privilege — kein write, kein Secret-Export

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Typecheck · Lint · Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: app/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run build
        env:
          # Im CI nur Platzhalter — der echte Build auf Cloudflare nutzt die dort
          # gesetzten Pages-Env-Vars. Hier wird ausschließlich Baubarkeit verifiziert.
          VITE_SUPABASE_URL: https://example.supabase.co
          VITE_SUPABASE_ANON_KEY: ci-placeholder-anon-key
      - name: Upload dist-Artefakt
        uses: actions/upload-artifact@v4
        with:
          name: app-dist
          path: app/dist
          retention-days: 7

  hygiene-gate:
    name: Release-Hygiene-Gate (blockierend)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verbotene Artefakte / Secrets im Tree?
        run: bash app/scripts/release-hygiene-check.sh
```

> **Node 20** ist Pflicht-Pin (auch Cloudflare, Aufgabe 1.5) → deterministischer Build. `permissions: contents: read` verhindert, dass ein kompromittierter Step ins Repo schreibt oder Secrets exfiltriert. `hygiene-gate` ist ein **separater, blockierender** Job — grüner Build allein genügt nicht.

### 1.4 Edge-Function-Check (Deno) — eigener Parallel-Job (P1)

Damit die Supabase-Seite (Deno) syntaktisch/typsicher bleibt, ohne die npm-Toolchain zu verschmutzen:

```yaml
  edge-functions:
    name: Supabase Edge Functions (Deno)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
        with: { deno-version: v2.x }
      - name: Deno lint & check (Edge Functions)
        working-directory: app/supabase/functions
        run: |
          deno lint
          deno check create-checkout/index.ts stripe-webhook/index.ts
```

> Prüft genau die real existierenden Functions (`create-checkout`, `stripe-webhook`) und ihre `_shared/`-Importe. Keine Vermischung von Auflösungsregeln, kein toter Verweis.

### 1.5 Cloudflare-Pages-Konfiguration explizit machen (P0)

**1.5a — SPA-Routing-Fallback.** `app/public/_redirects` neu anlegen (Cloudflare Pages liest `_redirects` aus dem Output `dist/`):

```
/*    /index.html    200
```

> Deep-Links (z. B. `/hof/<id>`) müssen serverseitig auf `index.html` fallen, sonst liefert Pages 404. `200` = Rewrite (keine Weiterleitung), erhält die URL für den Client-Router. Anker: Kanon-Regel „Deep-Links statt Sackgassen".

**1.5b — `_headers`.** `app/public/_headers` bleibt wie in WAVE_00 (Security-Header + CSP). Das Hygiene-Gate prüft, dass es in `dist/` ankommt. CSP `connect-src` deckt `https://*.supabase.co` ab. **Erst beim Stripe-/SB-Payment-Go-Live** (Phase 4 Track A) `connect-src`/`frame-src` um `https://*.stripe.com`/`https://js.stripe.com` erweitern — jetzt nicht (kein toter CSP-Eintrag ohne aktiven Pfad).

**1.5c — `app/.node-version`** neu anlegen mit Inhalt `20`; zusätzlich `app/.nvmrc` (`20`) für lokale nvm-Parität. Identische Node-Major lokal = CI = Cloudflare.

**1.5d — Cloudflare-Pages-Projekt-Settings** (Dashboard, **Owner-Freigabe** — hier verbindlich vordokumentiert, nicht in dieser Welle ausgeführt):

| Setting | Wert |
|---|---|
| Production branch | `main` |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Root directory (Monorepo) | `app` |
| Node version | `20` (via `.node-version` oder `NODE_VERSION=20`) |
| Env-Vars (Production **und** Preview) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — **nur diese zwei**, keine Secrets |

### 1.6 Release-Hygiene-Gate-Skript (P0, das Herzstück)

`app/scripts/release-hygiene-check.sh` — vom `hygiene-gate`-Job ausgeführt, schlägt **hart** fehl (Exit 1) bei verbotenen Artefakten oder Secret-Mustern. Quelle ist `git ls-files` (Tracked-Files = das auszuliefernde Set), nicht der lose Working-Tree.

```bash
#!/usr/bin/env bash
# WAVE_01 — Release-Hygiene-Gate. Failt CI bei Secrets / verbotenen Artefakten.
set -euo pipefail

fail=0
note() { echo "::error::$1"; fail=1; }

echo "== 1) Verbotene Pfade in tracked files =="
FORBIDDEN='(^|/)(\.claude|\.agents|\.vercel|\.wrangler|node_modules|coverage|\.c8_output)(/|$)|(^|/)\.env($|\.)|\.lnk$|\.log$'
if git ls-files | grep -nE "$FORBIDDEN" | grep -vE '(^|/)\.env\.example$'; then
  note "Verbotene Artefakte/Secrets im getrackten Tree gefunden (siehe oben)."
fi

echo "== 2) .gitignore-Pflichteintraege =="
for needle in node_modules dist .env .claude; do
  grep -qE "(^|/)${needle}(\$|/|\.)" app/.gitignore || note ".gitignore fehlt Pflichteintrag: $needle"
done

echo "== 3) .env.example secret-frei? =="
for ex in app/.env.example app/supabase/functions/.env.example; do
  [ -f "$ex" ] || continue
  if grep -nE '(sk_live_|sk_test_|whsec_|eyJ[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})' "$ex"; then
    note "$ex enthaelt echte/secret-aehnliche Werte — nur Platzhalter erlaubt."
  fi
done

echo "== 4) Keine VITE_-Praefixe auf server-seitigen Secrets =="
if git ls-files 'app/**' | xargs grep -lnE 'VITE_(STRIPE_SECRET|SERVICE_ROLE|WEBHOOK_SECRET|MAIL_API)' 2>/dev/null; then
  note "Server-Secret faelschlich mit VITE_-Praefix (gelangt ins Bundle!)."
fi

echo "== 5) Secret-Muster im getrackten Quellcode =="
if git ls-files 'app/src/**' 'app/supabase/**' | xargs grep -nE '(sk_live_[0-9A-Za-z]{16,}|whsec_[0-9A-Za-z]{16,})' 2>/dev/null; then
  note "Hardcodiertes Stripe-Secret im Quellcode gefunden."
fi

echo "== 6) Pflicht-Deploy-Artefakte vorhanden =="
for f in app/public/_headers app/public/_redirects app/vite.config.ts app/.node-version; do
  test -f "$f" || note "Pflichtdatei fehlt: $f"
done

if [ "$fail" -ne 0 ]; then
  echo "HYGIENE-GATE: FAIL"; exit 1
fi
echo "HYGIENE-GATE: PASS"
```

> `chmod +x app/scripts/release-hygiene-check.sh`. Das Skript ist **idempotent** und lokal vor jedem PR ausführbar — Shift-Left, nicht nur CI.

### 1.7 Secret-Rotation & Incident-Doku (P1)

Falls je ein `.env` mit echten Werten committed war (History-Check 1.8): als **kompromittiert** behandeln und in `app/docs/SECURITY_INCIDENTS.md` dokumentieren — betroffene **Key-Klassen ohne Werte** + Rotationsschritte:

| Key-Klasse | Rotation |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Reset → neuen Wert via `supabase secrets set` |
| `VITE_SUPABASE_ANON_KEY` | anon key rotieren (Dashboard), Pages-Env-Var aktualisieren, redeploy |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe → API keys roll / Webhook-Secret neu → `supabase secrets set` |
| `MAIL_API_KEY` | Provider-Dashboard → revoke + neu → `supabase secrets set` |

> **Niemals echte Werte** in Code, Doku oder Antwort. Rotation **dokumentieren** = Pflicht; **ausführen** = nur mit Owner-Freigabe.

### 1.8 Git-History-Check (P1, read-only)

Prüfen, ob je Secrets committed wurden — **kein** Rewrite ohne Owner:

```bash
git log --all --full-history -- '**/.env' '**/.env.local' '**/.env.*' ':!**/.env.example'
git log -p --all -S 'sk_live_' -- . | head -n 40   # Treffer = Stop-Regel
```

> Treffer → **STOP**, Owner informieren (Rotation? History-Rewrite via `git filter-repo`? beides?). Diese Welle führt keinen History-Rewrite aus.

---

## 3. Konkrete Befehle (Reihenfolge)

> Working-Dir für App-Befehle: `app/`. Node 20 (siehe `.node-version`/`.nvmrc`). Windows-PowerShell-tauglich; Bash für das Gate-Skript (Git Bash unter Windows).

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Lint/Format-Toolchain (Aufgabe 1.2)
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier

# 2) Lokal exakt verifizieren, was die CI fährt (Aufgaben 1.2/1.3)
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run build            # erzeugt dist/ inkl. _headers + _redirects, ohne Source-Maps

# 3) Hygiene-Gate lokal (Shift-Left, Aufgabe 1.6)
chmod +x scripts/release-hygiene-check.sh
bash scripts/release-hygiene-check.sh          # erwartet: HYGIENE-GATE: PASS

# 4) Negativtest — Gate MUSS rot werden (Beweis, dass der Türsteher greift)
echo "STRIPE_SECRET_KEY=sk_live_AAAAAAAAAAAAAAAAAAAAAAAA" > .env.leak
git add -f .env.leak
bash scripts/release-hygiene-check.sh ; echo "ExitCode=$?"   # erwartet: FAIL, ExitCode=1
git rm -f --cached .env.leak && rm -f .env.leak              # aufräumen

# 5) Edge Functions (Deno) lokal prüfen (Aufgabe 1.4)
cd supabase/functions
deno lint
deno check create-checkout/index.ts stripe-webhook/index.ts
cd ../..

# 6) Supabase-Secrets server-seitig — NUR mit Owner-Freigabe (Werte rein illustrativ)
# supabase secrets set STRIPE_SECRET_KEY=<sk_...> STRIPE_WEBHOOK_SECRET=<whsec_...> \
#   SUPABASE_SERVICE_ROLE_KEY=<key> MAIL_PROVIDER=resend MAIL_API_KEY=<key> \
#   MAIL_FROM="LokaleBauernConnect <noreply@...>"
# supabase secrets list      # zeigt nur Namen, keine Werte — zur Verifikation

# 7) Git-History-Check (read-only, Aufgabe 1.8)
git log --all --full-history -- '**/.env' '**/.env.*' ':!**/.env.example'
```

---

## 4. Acceptance (Abnahmekriterien — alle müssen grün sein)

**CI & Build**
1. `npm run ci` (typecheck + lint + format:check + build) läuft lokal **grün** durch.
2. `.github/workflows/ci.yml` existiert; `build`-Job (Node 20, `npm ci`) ist auf Push/PR grün; `permissions: contents: read` gesetzt.
3. Build im CI nutzt **nur Platzhalter**-`VITE_`-Vars; im Log erscheinen **keine** echten Schlüsselwerte.
4. `edge-functions`-Job: `deno lint` + `deno check` für `create-checkout` & `stripe-webhook` grün.

**Artefakt-Hygiene (Türsteher)**
5. `hygiene-gate`-Job/-Skript liefert lokal **`HYGIENE-GATE: PASS`**.
6. **Negativtest reproduzierbar rot:** verschmutzter Tree (`.env.leak` mit `sk_live_…`) → Gate **FAIL**, Exit 1.
7. Frisches `dist/` enthält **`_headers` und `_redirects`** und **kein** `.env`/`.claude`/`node_modules`/Secret/Source-Map.

**Env/Secrets**
8. `app/.gitignore` enthält `node_modules`, `dist`, `.env`, **`.claude`**.
9. `app/.env.example` ist **vollständig** (alle real genutzten Variablen dokumentiert) und **secret-frei** (nur Platzhalter); Server-Secrets ohne `VITE_`-Präfix und als „nur Edge Functions" markiert.
10. Kein `VITE_`-Präfix auf server-seitigen Secrets im gesamten getrackten Tree (Gate-Schritt 4 sauber).
11. `supabase secrets list` zeigt nur Namen, keine Werte (falls ausgeführt, Owner-Freigabe).

**Cloudflare-Pages-Parität**
12. `app/.node-version` = `20` (+ `.nvmrc` = `20`); Node-Major lokal = CI = Cloudflare identisch.
13. `app/public/_redirects` (`/* /index.html 200`) vorhanden; Deep-Link-404 ausgeschlossen.
14. Cloudflare-Pages-Settings dokumentiert (Build-Command, Output `dist`, Root `app`, Node 20, genau zwei `VITE_`-Env-Vars).

**Doku & History**
15. Git-History-Check ohne Secret-Treffer (sonst STOP → Owner; Rotation in `app/docs/SECURITY_INCIDENTS.md`).
16. `docs/releases/PHASE_STATUS.md` (Zeile WAVE_01) + `MASTER_INDEX.md` (Abschnitt 7) auf realen Stand gezogen; dieses File ohne TODOs.

---

## 5. Gate (blockierend — Übergang zu WAVE_02 & Phase 2)

> Das **WAVE_01-Hygiene-Gate** ist Vorgate zu Phase-2-Gate **A (Build)** und **B (Security)**. Ohne grünes Gate startet kein Cloudflare-Deploy.

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **CI-Gate** | `build`-Job grün (typecheck + lint + format:check + build, Node 20) | CI-Log / `npm run ci` §3 |
| **Hygiene-Gate** | Skript `HYGIENE-GATE: PASS` | `bash app/scripts/release-hygiene-check.sh` |
| **Negativ-Gate** | verschmutzter Tree → `FAIL`, Exit 1 (reproduzierbar) | §3 Schritt 4 |
| **Artefakt-Gate** | `dist/` secret-frei + `_headers` + `_redirects` | Inhalts-Check `dist/` |
| **Secret-Gate** | `.gitignore` enthält `.claude`; `.env.example` secret-frei & vollständig; keine `VITE_`-Server-Secrets | `security-auditor` (read-only) |
| **Edge-Gate** | `deno lint` + `deno check` grün | `edge-functions`-Job §1.4 |
| **History-Gate** | kein Secret-Treffer in der Git-History | §1.8 (sonst STOP) |
| **Parität-Gate** | `.node-version`=20; Pages-Settings dokumentiert | Review `devops` |

**Blockierend:** CI-, Hygiene-, Negativ-, Secret-Gate. **Stop-Regeln in dieser Welle:**
- Echte Secrets in der Git-History → **STOP**, Owner informieren (Rotation/Rewrite abstimmen). Kein eigenmächtiger Rewrite.
- Cloudflare-Pages-Projekt anlegen / Production-Secrets setzen / Domain verbinden → **STOP**, Owner-Freigabe (Account/Kosten).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

**Nächste Welle:** `WAVE_02 — Datenmodell + RLS` (additive Migrationen, deny-by-default + Isolationstest). Phase-2-Deploy-Vorbereitung wird erst nach grünem WAVE_01-Gate freigeschaltet.

---

## 6. Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_01 — Release-Hygiene & CI
- Geändert:
  · .github/workflows/ci.yml (NEU: build + hygiene-gate + edge-functions)
  · app/eslint.config.js (NEU) · app/.node-version (NEU, 20) · app/.nvmrc (NEU, 20)
  · app/scripts/release-hygiene-check.sh (NEU, blockierendes Gate, chmod +x)
  · app/public/_redirects (NEU, SPA-Deep-Link-Fallback)
  · app/package.json (scripts additiv: lint, format:check, ci)
  · app/.gitignore (+ .claude u. a. Tool-/Build-Müll)
  · app/.env.example (vervollständigt, secret-frei: Frontend-Public vs. Edge-Secret-Klasse)
  · app/docs/SECURITY_INCIDENTS.md (NEU, Rotations-Doku — nur falls History-Treffer)
  · docs/releases/PHASE_STATUS.md + MASTER_INDEX.md (Stand WAVE_01)
- Tests/Verifikation:
  · npm run ci → grün · bash scripts/release-hygiene-check.sh → PASS
  · Negativtest (.env.leak, sk_live_) → FAIL, ExitCode=1 (Türsteher greift)
  · deno lint + deno check (create-checkout, stripe-webhook) → grün
  · dist/ enthält _headers + _redirects, kein .env/.claude/Secret/Source-Map
  · git-History-Check → keine Secret-Treffer
- Risiken:
  · Niedrig. Nur Build/CI/Config/Doku, additiv, reversibel, kein Laufzeit-/Backend-Pfad.
    Rollback = git revert des WAVE_01-Diffs.
  · Offen (Owner-Freigabe, Phase 2): Cloudflare-Pages-Projekt, produktive Secrets, Domain, Deploy.
- Nächste Welle: WAVE_02 — Datenmodell + RLS (deny-by-default + Isolationstest),
  danach Phase 2 (Cloudflare-Deploy, Gates A–F).

## Hygiene-Report
- Im Working Directory gefundene problematische Artefakte (Liste, ohne Werte): <…>
- In CI ergänzte Blocker: .env*, .claude/.agents/.vercel/.wrangler, node_modules, coverage,
  *.log, *.lnk, sk_live_/whsec_/JWT-/AWS-Muster, VITE_-präfixte Server-Secrets
- Negativtest (künstliche Verschmutzung → CI/Skript failt?): <ja/nein + Output>
- Historisch geleakte Secret-Kategorien (Liste, ohne Werte): <… oder „keine">
- Empfohlene Secret-Rotation (Liste, ohne Werte): <… oder „n/a">
```

---

## 7. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, Stop-Regeln), `AGENTS.md` (harte Regeln, Subagenten), `PHASEN.md` (Phase 1 → WAVE_01 · Phase 2 Gates A–F).
- **Landkarte:** `MASTER_INDEX.md` (Abschnitt 5 Operations/Deployment · Abschnitt 7 `finalization/WAVE_00…15`).
- **Voraussetzung:** `finalization/WAVE_00_baseline.md` (Build-Gate, Secret-Grenze, Token-Kanon) — diese Welle setzt darauf auf.
- **Reale Artefakte (Bestand, geprüft):** `app/package.json`, `app/tsconfig.json`, `app/vite.config.ts`, `app/.gitignore`, `app/.env.example`, `app/public/_headers`, `app/supabase/functions/{create-checkout,stripe-webhook}/index.ts`, `app/supabase/functions/_shared/{stripe,email,supabaseAdmin,cors}.ts`, `app/supabase/functions/.env.example`.
- **Neu in dieser Welle:** `.github/workflows/ci.yml`, `app/eslint.config.js`, `app/.node-version`, `app/.nvmrc`, `app/public/_redirects`, `app/scripts/release-hygiene-check.sh`, (bedingt) `app/docs/SECURITY_INCIDENTS.md`.
- **Plattform-Pfeiler dieser Welle:** Reproduzierbarkeit/Build-Gate · Secret-Grenze (Frontend `VITE_` vs. Edge-Secrets) · sauberes Artefakt (kein `.claude`/`.env`/Secret) · Deep-Links statt Sackgassen (SPA-Fallback) · Audit-/Stop-Disziplin (Owner-Freigabe für Account/Kosten/Commit).
- **Imperium-Beschleuniger:** Das CI-+-Hygiene-Gate-Muster ist plattformübergreifend wiederverwendbar → nach Abschluss als Pattern in `.claude/memory/patterns/` verdichten (Wiederverwendbarkeit vor Eleganz).

> Diese Welle ist **additiv** und ändert keine Backend-/Account-Ressource. Für jeden kosten-/außenwirksamen Schritt (Cloudflare-Pages-Projekt, produktive Secrets, Domain, Deploy, `git commit/push`) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
