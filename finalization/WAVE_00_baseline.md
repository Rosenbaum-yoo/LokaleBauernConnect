# WAVE 00 — Baseline (Fundament: Repo · Vite/TS · Editorial-Design-System · Konventionen)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · Erste Welle des Bauplans (`PHASEN.md` → Phase 1, WAVE_00). **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> Status laut `PHASEN.md`: ✅ teilweise — diese Welle macht das Fundament **explizit, prüfbar und abnehmbar**.

---

## 0. Ziel

Ein **production-ready, reproduzierbares App-Fundament**, auf dem jede folgende Welle (Datenmodell+RLS, Rollen, Kernprodukt, Payment, USP) ohne Nacharbeit aufsetzt. Konkret:

1. **Reproduzierbarer Build** — frisches Checkout → `npm ci` → `npm run build` ist grün, deterministisch, ohne manuelle Schritte (Cloudflare-Pages-tauglich).
2. **Strenge Typsicherheit** — TypeScript `strict` + `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`; `tsc --noEmit` ist Teil von `build` und damit ein blockierendes Gate.
3. **Ein einziges Editorial-Design-System** — alle Farben/Radien/Schatten als CSS-Custom-Properties in `app/src/styles/theme.css`. **Keine hardcodierten Farben**, keine externen Fonts (DSGVO), keine Deko-Emojis in Prod-UI.
4. **Verbindliche Verzeichnisstruktur & Namenskonventionen** — feste Heimat für `components/`, `pages/`, `lib/`, `styles/`, `supabase/`, `docs/`; Dual-Source-Datenschicht (Seed ↔ Supabase) als Grundmuster.
5. **Saubere Secret-/Env-Grenze** — nur `VITE_`-Public-Keys im Frontend; `.env` gitignored; `service_role` ausschließlich in Edge Functions.
6. **Konsistenz mit dem Imperium-Blueprint** — alle Muster so gewählt, dass sie in 20 weiteren ConnectCore-Plattformen wiederverwendbar sind (Wiederverwendbarkeit + Wirtschaftlichkeit vor Eleganz).

**Nicht-Ziel dieser Welle:** Live-Supabase/Cloudflare/Stripe-Anbindung (kosten-/accountrelevant → Owner-Freigabe, eigene Wellen 06/09 + Phase 2). Datenmodell/RLS sind WAVE_02. Diese Welle liefert das Gerüst, nicht die Backend-Schalter.

---

## 1. Aufgaben

### 1.1 Repo & Toolchain
- **App-Root** ist `app/` (eigenes `package.json`, eigener Vite-Build). Marketing-Landing (`web/index.html`) bleibt self-contained und unberührt.
- **Node-Pin:** `app/.nvmrc` mit `20` + `engines`-Feld in `package.json` (`"node": ">=20 <23"`), damit lokale Maschine und Cloudflare-Pages-Build identisch bauen.
- **Lockfile-Disziplin:** `package-lock.json` ist verbindlich; CI/Deploy nutzen `npm ci` (nie `npm install`), damit Builds deterministisch sind.
- **`.gitignore`** deckt `node_modules`, `dist`, `.env`/`.env.*` (Ausnahme `!.env.example`) ab — bereits vorhanden, in dieser Welle verifiziert.

### 1.2 Vite / TypeScript (strict)
- `vite.config.ts`: `@vitejs/plugin-react`, dedizierter Dev-Port **5409** (`5400 + Projektnr #09`, `strictPort:false`), Build-Output `dist/`, `sourcemap:false` (kein Source-Leak in Prod).
- `tsconfig.json`: `strict:true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `isolatedModules`, `moduleResolution:"bundler"`, `jsx:"react-jsx"`, `noEmit:true`. **`build` = `tsc --noEmit && vite build`** — Typfehler brechen den Build.
- `src/vite-env.d.ts`: typisiert `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` als `string | undefined`) — keine `any`-Lecks an der Env-Grenze.
- `index.html`: `lang="de"`, `theme-color` = `--paper` (`#faf7ee`), aussagekräftiger `<title>`/`description`, Mount-Point `#root`, ES-Module-Entry `/src/main.tsx`.

### 1.3 Editorial-Design-System
- **Single Source of Truth:** `app/src/styles/theme.css` — identische Designsprache wie die Landing (Papier-Magazin, System-Serife, Gold-Mono-Eyebrows, weinrote Akzente, Waldgrün-Signaturblöcke).
- **Token-Kanon** (`:root`-Custom-Properties, verbindlich — keine Abweichung, keine neuen Farben ohne ADR):

  | Gruppe | Tokens |
  |---|---|
  | Flächen | `--paper`, `--cream`, `--cream-warm` |
  | Marke / Grün | `--forest`, `--forest-deep`, `--forest-soft` |
  | Akzente | `--wine`, `--gold`, `--gold-deep` |
  | Text / Linien | `--ink`, `--muted`, `--line`, `--line-soft` |
  | Auf Grün | `--on-forest-head`, `--on-forest`, `--on-forest-soft` |
  | Semantik (Verfügbarkeit) | `--ok/-bg/-bd`, `--low/-bg/-bd`, `--soon/-bg/-bd`, `--out/-bg/-bd` |
  | Typografie | `--serif`, `--sans`, `--mono` (alle **systemnah**, keine externen Fonts → DSGVO) |
  | Radien / Schatten / Easing | `--r-sm…--r-xl`, `--shadow`, `--shadow-forest`, `--ease` |

- **Komponenten-Primitives** (bereits im Skin, als Klassen-Vokabular verbindlich): `.lbc-btn` (+`--primary/--gold/--ghost/--sm/--block`), `.lbc-input`/`.lbc-select`/`.lbc-label`, `.lbc-badge` (+ `.av-available/-low/-soon/-out`), `.app-header`, `.farm-card`, `.drawer`/`.scrim`, `.state`/`.skeleton` (Leer-/Ladezustände), `.reserve-box` (Forest-Signaturblock), `.disclaimer-line`.
- **A11y-Baseline:** sichtbarer `:focus-visible`-Ring (`outline:2px solid var(--forest)`), Kontraste auf Premium-Niveau, responsive Breakpoint `@media (max-width:680px)`.
- **Disziplin:** keine Inline-`style`-Farben, keine externen Schriftarten, keine Deko-Emojis. Neue UI nutzt ausschließlich diese Tokens/Primitives (Wächter: `frontend-design-guardian`, `core-guardian`).

### 1.4 Verzeichnisstruktur (Soll, verbindlich)
```
app/
├── index.html                  # Vite-Entry (lang=de, #root)
├── package.json                # nur App-Deps (React/Vite/TS/Supabase-JS)
├── package-lock.json           # verbindlich → npm ci
├── tsconfig.json               # strict + noUnused* + noFallthrough
├── vite.config.ts              # React-Plugin, Port 5409, dist/
├── .nvmrc                      # Node 20 (Pin für CF-Pages-Parität)
├── .env.example                # VITE_-Public-Keys (Vorlage, getrackt)
├── .gitignore                  # node_modules, dist, .env*
├── src/
│   ├── main.tsx                # React-Root (StrictMode) + theme.css
│   ├── App.tsx                 # App-Shell / Routing-Wurzel
│   ├── vite-env.d.ts           # typisierte import.meta.env
│   ├── components/             # Präsentations-/UI-Bausteine (PascalCase.tsx)
│   │   ├── AvailabilityBadge.tsx
│   │   ├── FarmCard.tsx
│   │   └── FarmDrawer.tsx
│   ├── pages/                  # Routen-Container (PascalCase + Suffix Page)
│   │   └── FinderPage.tsx
│   ├── lib/                    # Datenschicht, Domänen-Helfer (camelCase.ts)
│   │   ├── types.ts            # Domänentypen (single source) + Zod-Heimat
│   │   ├── supabase.ts         # Client-Init (nur VITE_-Keys)
│   │   ├── data.ts             # Dual-Source-Repository (Seed ↔ Supabase)
│   │   ├── seed.ts             # realistische Seed-Daten (Dev/Offline)
│   │   ├── geo.ts              # PLZ/Distanz-Helfer
│   │   └── payments.ts         # Stripe-/SB-Bezahl-Schnittstelle (Vorbereitung)
│   └── styles/
│       └── theme.css           # Editorial-Design-System (Token-Kanon)
└── supabase/                   # Backend-Artefakte (Wellen 02/06/09)
    ├── migrations/             # additive SQL-Migrationen (0001…)
    ├── functions/              # Edge Functions (Deno) + _shared/
    ├── seed.sql · setup_all.sql · README.md
```
> Bestehende Strukturen werden **erweitert, nie dupliziert** (Inkrementell-Regel). Keine Parallel-Ordner.

### 1.5 Konventionen (Code & Daten)
- **Sprache:** UI-Texte & Code-Kommentare **Deutsch**; Bezeichner Englisch nur wo technisch etabliert.
- **Datei-Naming:** Komponenten/Seiten `PascalCase.tsx` (Seiten mit Suffix `Page`); Helfer/Datenschicht `camelCase.ts`; Migrationen `NNNN_thema.sql` (vierstellig, additiv); Edge Functions als Ordner (`reservations-create/index.ts`).
- **Imports:** relative Pfade innerhalb `src/`; Reihenfolge extern → intern.
- **Case-Mapping:** DB `snake_case` ↔ App `camelCase` ausschließlich an der Datenschicht-Grenze (`lib/data.ts`, `mapFarm`-Muster). Komponenten sehen nur camelCase-Domänentypen.
- **Datenschicht-Muster (Dual-Source, verbindlich):** ist Supabase **nicht** konfiguriert (`VITE_SUPABASE_URL` leer), läuft die App über Seed/`localStorage` voll bedienbar weiter — **kein toter Button, kein Datenverlust**. Mit gesetzten Keys schaltet dieselbe API auf Supabase um. Demo-/Seed-Zustand wird in der UI **klar gekennzeichnet** (kein Fake-Data-Vortäuschen von Prod).
- **Zustände end-to-end:** jede datenführende Ansicht hat `loading` / `empty (Zero-State)` / `error` / `ok` (Primitives `.skeleton`/`.state`). Kein 500 bei leeren Daten.
- **Sicherheit by default:** User-Werte vor Ausgabe escapen; keine Secrets in Code/Log; `service_role` nie im Frontend; Zod an jeder späteren Eingangsgrenze (Edge Functions).
- **Verbote (aus `CLAUDE.md`):** kein Fake-Data/Mock-KPI in Prod-UI · keine hardcodierten Farben/Schwellwerte außerhalb des Design-Systems · keine TODOs/Platzhalter/toten Pfade · keine Migration ohne Rollback (ab WAVE_02).

### 1.6 Dokumentation & Tracker
- Diese Welle dokumentiert sich selbst (dieses File); `docs/releases/PHASE_STATUS.md` und `MASTER_INDEX.md` werden auf den realen Stand gezogen.
- Wiederverwendbare Erkenntnis → 1 Zeile `.claude/learning/insights_inbox.md`; Architekturentscheidung (z. B. Dual-Source-Datenschicht, Editorial-Token-Kanon) → ADR unter `.claude/memory/decisions/`.

---

## 2. Konkrete Befehle

> Working-Dir für alle App-Befehle: `app/`. Node ≥ 20 (siehe `.nvmrc`). Windows-PowerShell-tauglich.

### 2.1 Setup & Build (lokal, kostenlos, kein Account nötig)
```bash
cd app

# Node-Version angleichen (falls nvm vorhanden)
nvm use            # liest .nvmrc → Node 20

# Reproduzierbare Installation (Lockfile-treu, wie CI/Deploy)
npm ci             # frisches Checkout; sonst: npm install (aktualisiert Lockfile)

# Dev-Server (läuft sofort mit Seed-Daten, kein Backend nötig)
npm run dev        # http://localhost:5409

# Verifikations-Gate: Typecheck + Production-Build
npm run typecheck  # tsc --noEmit  (strict, noUnused*, noFallthrough)
npm run build      # tsc --noEmit && vite build  →  app/dist
npm run preview    # lokale Vorschau des Prod-Builds
```

### 2.2 Env-Vorlage (lokal; echte Keys = Owner-Freigabe)
```bash
cd app
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
# .env bleibt leer → App läuft im Seed-Modus.
# Echte VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY erst nach Owner-Freigabe (WAVE_06).
```

### 2.3 Supabase-Toolchain (vorbereitet, NICHT in dieser Welle ausgeführt)
> Erst ab WAVE_02 / Owner-Freigabe (Account-/Kosten-relevant). Hier nur zur Vollständigkeit der Baseline dokumentiert — **keine Push-/Deploy-Aktion in WAVE_00**.
```bash
npm i -g supabase          # CLI (einmalig)
supabase --version         # Toolchain-Check
supabase login             # nur mit Owner-Account/Freigabe
supabase link --project-ref <ref>      # EU-Projekt verknüpfen (Freigabe)
supabase db push           # additive Migrationen (ab WAVE_02, Freigabe)
supabase functions deploy  # Edge Functions (ab WAVE_06/09, Freigabe)
```

---

## 3. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Build & Typsicherheit**
1. `npm ci` läuft im frischen Checkout ohne Fehler durch (Lockfile-treu).
2. `npm run typecheck` ist fehlerfrei (`strict` + `noUnusedLocals/Parameters` + `noFallthroughCasesInSwitch`).
3. `npm run build` erzeugt deterministisch `app/dist/` (statisch, ohne Source-Maps, Cloudflare-Pages-tauglich); ein zweiter Lauf liefert identische Artefakte.
4. `npm run dev` startet auf Port 5409 (Fallback aktiv) und rendert die App fehlerfrei; Browser-Konsole frei von `TypeError`/uncaught Errors.

**Design-System**
5. Alle Farben/Radien/Schatten kommen aus `theme.css`-Tokens; eine Suche nach Hex-Farben außerhalb `theme.css` liefert **null** Treffer in `src/` (außer dokumentierte Token-Definition).
6. Keine externen Fonts geladen (nur System-Stacks `--serif/--sans/--mono`); keine Deko-Emojis in Prod-UI.
7. Fokus-Sichtbarkeit (`:focus-visible`) und Mobile-Breakpoint (`≤680px`) funktionieren; Lade-/Leer-Zustände (`.skeleton`/`.state`) sind als Primitives vorhanden.

**Struktur & Konventionen**
8. Verzeichnisbaum entspricht §1.4; keine Parallelstrukturen, keine verwaisten Dateien.
9. Naming-Konventionen eingehalten (Komponenten `PascalCase.tsx`, Helfer `camelCase.ts`); DB↔App-Case-Mapping nur an der Datenschicht-Grenze.
10. Dual-Source-Datenschicht beweisbar: mit leerer `.env` läuft die App vollständig (Seed); Demo-Modus ist in der UI gekennzeichnet — kein toter Button.

**Sicherheit & Hygiene**
11. `.gitignore` schließt `node_modules`, `dist`, `.env`/`.env.*` aus; `.env.example` ist getrackt; **kein Secret** im Repo/Build-Output.
12. Frontend nutzt ausschließlich `VITE_`-Public-Keys; `service_role` taucht **nirgends** im `src/`-Code oder Build auf.

**Dokumentation**
13. `MASTER_INDEX.md` und `docs/releases/PHASE_STATUS.md` spiegeln den realen WAVE_00-Stand; dieses File ist vollständig (Ziel→Tests→Abschlussbericht), ohne TODOs.

---

## 4. Gate (Übergang zu WAVE_01)

> WAVE_00 ist die Fundament-Voraussetzung; ohne grünes Gate startet keine Folge-Welle.

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **Build-Gate** | `npm ci && npm run build` grün, deterministisch | CI-Log / lokaler Lauf §2.1 |
| **Type-Gate** | `tsc --noEmit` ohne Fehler (strict) | `npm run typecheck` |
| **Design-Gate** | keine Hex-Farben/Inline-Farben/externen Fonts außerhalb `theme.css` | Grep-Scan §3.5 + `frontend-design-guardian` |
| **Struktur-Gate** | Baum = §1.4; Naming-Konventionen; keine Parallelstrukturen | Review `core-guardian` |
| **Secret-Gate** | kein Secret im Repo/dist; nur `VITE_`-Keys; `service_role` nicht im Client | `security-auditor` (read-only) |
| **Runtime-Gate** | `npm run dev` rendert; Konsole sauber; Seed-Modus voll bedienbar | manueller Smoke-Test Port 5409 |
| **Doku-Gate** | `MASTER_INDEX.md` + `PHASE_STATUS.md` aktuell; dieses File ohne offene Punkte | Review |

**Blockierend:** Build-, Type-, Secret-Gate. **Stop-Regel:** Sobald ein Backend-/Account-/Kosten-Schritt nötig würde (Supabase-Link, Cloudflare-Deploy, echte Keys), **anhalten und Owner-Freigabe einholen** — gehört nicht in WAVE_00.

**Nächste Welle:** `WAVE_01 — Hygiene/CI` (Cloudflare-Pages-Config, Env/Secrets-Doku, Lint/Build-CI als blockierendes Gate). Anschließend `WAVE_02 — Datenmodell+RLS` (additive Migrationen, deny-by-default + Isolationstest).

---

## 5. Abschlussbericht

```
## Welle abgeschlossen: WAVE_00 — Baseline
- Geändert:
  · app/  → reproduzierbares Vite+React+TS(strict)-Fundament: package.json (Scripts dev/build/
    typecheck/preview, engines node>=20), tsconfig.json (strict + noUnused* + noFallthrough),
    vite.config.ts (React-Plugin, Port 5409, dist/, sourcemap:false), index.html (lang=de, #root),
    .nvmrc (Node 20), src/vite-env.d.ts (typisierte VITE_-Env).
  · src/styles/theme.css → Editorial-Design-System als alleinige Token-Quelle (Flächen/Grün/
    Akzente/Semantik/Typografie/Radien/Schatten) + Komponenten-Primitives (.lbc-btn/.lbc-input/
    .lbc-badge/.farm-card/.drawer/.state/.skeleton/.reserve-box); System-Fonts (DSGVO),
    Fokus-Sichtbarkeit, Mobile-Breakpoint.
  · Verzeichnisstruktur + Namens-/Case-Konventionen + Dual-Source-Datenschicht (Seed↔Supabase)
    als verbindliches Fundament-Muster festgeschrieben.
  · Secret-/Env-Grenze: .env gitignored, nur VITE_-Public-Keys, service_role ausschließlich Edge.
  · Doku: MASTER_INDEX.md + docs/releases/PHASE_STATUS.md auf realen Stand gezogen.
- Tests/Verifikation:
  · npm ci → grün · npm run typecheck → 0 Fehler · npm run build → dist/ deterministisch ·
    npm run dev (5409) → rendert, Konsole sauber · Grep: keine Hex-Farben/Secrets außerhalb
    theme.css/.env.example · Seed-Modus (leere .env) voll bedienbar.
- Risiken:
  · Niedrig. Reines lokales Fundament, additiv, kein Backend-/Account-/Kosten-Schritt,
    keine destruktiven Änderungen. Rollback = git revert des WAVE_00-Diffs.
  · Offen (Owner-Freigabe, spätere Wellen): echte Supabase-EU-Keys (WAVE_06),
    Cloudflare-Pages-Deploy + CI-Gate (WAVE_01/Phase 2).
- Nächste Welle: WAVE_01 — Hygiene/CI (Cloudflare-Pages-Config, Env/Secrets, Lint/Build-CI-Gate),
  danach WAVE_02 — Datenmodell+RLS (deny-by-default + Isolationstest).
```

---

## 6. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote), `AGENTS.md` (harte Regeln, Subagenten), `PHASEN.md` (Phase 1 → WAVE_00).
- **Landkarte:** `MASTER_INDEX.md` (Soll-Struktur, `finalization/WAVE_00…15`).
- **Reale Artefakte (Bestand):** `app/package.json`, `app/tsconfig.json`, `app/vite.config.ts`, `app/index.html`, `app/.env.example`, `app/.gitignore`, `app/src/main.tsx`, `app/src/styles/theme.css`.
- **Folge-Module bauen hierauf auf:** `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md`, `…/PRODUKTVERFUEGBARKEIT.md` (nutzen Token-Kanon, Dual-Source-Datenschicht, Zustände, Disclaimer dieser Baseline).
- **Plattform-Pfeiler dieser Welle:** Reproduzierbarkeit/Build-Gate · Design-System-Disziplin · Secret-Grenze · Zero-State-Primitives · Konventionen für Tenant-Isolation (org_id/`snake_case`↔`camelCase`) ab WAVE_02.

> Diese Welle ist **additiv** und ändert keine Backend-/Account-Ressource. Für jeden kosten-/außenwirksamen Schritt (Supabase/Cloudflare/Stripe) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
