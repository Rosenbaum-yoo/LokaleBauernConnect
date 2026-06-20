# WAVE 05 — Owner/KPI-Dashboard (Reservierungen · aktive Höfe · Conversion · Scope-Transparenz)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · `PHASEN.md` → Phase 1, WAVE_05. **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> Voraussetzung: WAVE_02 (Datenmodell+RLS, deny-by-default + Isolationstest) und WAVE_03 (Rollen/Sichtbarkeit) grün. Diese Welle **liest aggregiert**, sie verändert keine Domänen-Wahrheit.

---

## 0. Ziel

Ein **production-ready, mandantensicheres KPI-Dashboard** für die zwei berechtigten Welten — **Erzeuger** (eigener Hof/eigene Org) und **Owner/Staff** (plattformweit) — das ausschließlich aus **echten Backend-Aggregaten** speist und die **7 Produktionspfeiler** nachweisbar erfüllt. Kein Fake-Data, keine Deko-KPIs, kein toter Pfad.

Das Dashboard beantwortet drei Geschäftsfragen sauber getrennt nach Scope:
1. **Reservierungen** — wie viele kommen rein, in welchem Status (`requested → confirmed → picked_up → cancelled/expired`), mit Trend gegen die Vorperiode.
2. **Aktive Höfe** — wie viele Höfe sind real sichtbar/aktiv (`deleted_at is null`, Org nicht gelöscht), wie viele pflegen aktiv Verfügbarkeit, wie viele sind verifiziert.
3. **Conversion** — der Reservierungs-Funnel (Anteil `confirmed` an `requested`, Anteil `picked_up` an `confirmed`, Storno-/Verfall-Quote), als ehrliche Geschäftskennzahl statt Vanity-Metrik.

Quer dazu — als eigener, sichtbarer Pfeiler dieser Welle — **Scope-Transparenz**: jede Zahl trägt im Klartext, **woher** sie kommt (Org vs. Plattform), **welcher Zeitraum** gilt, **welcher Datenstand** (Seed/Demo vs. Live) und **welche Rolle** sie sehen darf. Eine Zahl ohne Scope ist in diesem Produkt ein Bug.

**Nicht-Ziel dieser Welle:** keine neuen Geschäftsregeln, keine Statusübergänge, kein Schreiben in Domänentabellen (Reservierung anlegen = WAVE_04, Billing = WAVE_09). Keine Live-Supabase/Cloudflare-Anbindung erzwingen (Account-/Kosten-relevant → Owner-Freigabe); das Dashboard läuft über die **Dual-Source-Datenschicht** (Seed ↔ Supabase) genau wie der Finder. Keine Export-/Download-Funktion mit personenbezogenen Daten ohne Audit (→ spätere Welle, hier bewusst ausgespart).

---

## 1. Aufgaben

### 1.1 Datenmodell — read-only Aggregat-Schicht (additiv, keine neuen Domänentabellen)

Aggregation gehört in die **DB**, nicht in den Client (Pfeiler 1 + 3: Org-Boundary + Scope-Transparenz; verhindert N+1 und „im Frontend zusammengeklöppelte Wahrheiten").

- **Neue Migration** `app/supabase/migrations/0004_kpi_views.sql` (additiv, vierstellig, mit dokumentiertem Rollback im Kopf der Datei). Sie legt **`security invoker`-Views** an — d. h. die View läuft mit den Rechten des Aufrufers, sodass die **bestehenden RLS-Policies der Basistabellen** (`reservations`, `farms`, `sb_payments`, `subscriptions`) **automatisch greifen**. Keine `security definer`-Umgehung, kein `service_role` im Lesepfad.
- **View `kpi_reservations_daily`** — Tageskorn über `reservations`, gruppiert nach `org_id`, `date_trunc('day', created_at)`, `status`. Spalten: `org_id`, `day`, `status` (`reservation_status`-Enum), `cnt`. Erbt `reservations`-RLS → Erzeuger sieht nur die eigene Org (`is_org_member(org_id)`), Owner/Staff über Owner-Policy plattformweit.
- **View `kpi_farms_overview`** — pro `org_id`: `farms_total` (nur `deleted_at is null`), `farms_with_availability` (mind. 1 Produkt mit `availability_state in ('available','low','soon')`), `farms_verified` (Flag aus WAVE_07; bis dahin `false`/0, kein Platzhalter-Wert). Erbt `farms`/`products`-Public-Read; Owner-Aggregat plattformweit via Owner-Policy.
- **View `kpi_payments_daily`** (USP-vorbereitend, read-only) — Tageskorn über `sb_payments`: `org_id`, `day`, `status` (`payment_status`), `cnt`, `sum_amount_cents` **nur** für `status = 'paid'`. Erbt `sb_payments_owner_read`. Liefert in WAVE_05 reale 0-Werte, solange keine SB-Zahlungen existieren — **Zero-State, kein Fake-Umsatz**.
- **Owner-/Staff-Read-Policy (plattformweit)**: additive Policy auf den Basistabellen bzw. eine `is_owner()`/`is_staff()`-Hilfe (analog zum vorhandenen `is_org_member()` aus `0003_marketplace.sql`), gestützt auf `profiles.role in ('owner','staff')` (Enum `user_role` existiert bereits: `kaeufer/erzeuger/staff/owner`). **deny-by-default bleibt**: ohne Owner-/Staff-Rolle **keine** org-übergreifende Zeile. Cross-Org-Lesen ist ausschließlich `owner`/`staff` vorbehalten und wird im Isolationstest negativ geprüft.
- **Indizes für Aggregat-Performance** (Pfeiler-übergreifend, Skalierung 10→300): `reservations (org_id, created_at)` und `reservations (org_id, status, created_at)`; `sb_payments (org_id, status, created_at)`. Vorhandene Indizes (`reservations_status_idx`, `sb_payments_*`) werden **erweitert, nicht dupliziert**.
- **Rollback** in der Migration dokumentiert: `drop view if exists kpi_*` + `drop policy if exists owner_*` + `drop index if exists`. Keine Basistabelle wird verändert (nur additive Views/Policies/Indizes).

> Keine materialisierten Views in WAVE_05 (Refresh-/Konsistenz-Komplexität ohne Lastnachweis = Verschwendung). Materialisierung erst, wenn Pfeiler-Last es belegt (WAVE_11 DB-Härtung).

### 1.2 Datenschicht — `lib/kpi.ts` (Dual-Source, typisiert)

- Neue Datei `app/src/lib/kpi.ts` nach dem **Dual-Source-Muster** aus `lib/data.ts`: ist Supabase konfiguriert (`isSupabaseConfigured`), wird über die `kpi_*`-Views gelesen; sonst werden die identischen Kennzahlen **deterministisch aus `lib/seed.ts`** berechnet — dieselbe API, dasselbe Shape. So ist das Dashboard ohne Account voll bedienbar (kein toter Pfad), und der Seed-/Demo-Zustand wird in der UI **klar gekennzeichnet**.
- **Domänentypen** in `lib/types.ts` (single source) ergänzen — keine `any` an der Datengrenze:
  - `KpiScope` = `{ level: 'org' | 'platform'; orgId?: string; orgName?: string; from: string; to: string; source: 'live' | 'seed'; generatedAt: string }`
  - `ReservationFunnel` = `{ requested: number; confirmed: number; pickedUp: number; cancelled: number; expired: number; confirmRate: number; pickupRate: number; cancelRate: number }`
  - `FarmsKpi` = `{ total: number; withAvailability: number; verified: number }`
  - `KpiResult<T>` = `{ available: boolean; scope: KpiScope; data: T }` — **Pfeiler 2**: bei leeren Daten `available:false` + neutrale Nullen, **kein 500, kein Throw**.
- **Case-Mapping** (`snake_case` DB ↔ `camelCase` App) ausschließlich hier an der Grenze; Komponenten sehen nur camelCase.
- **Conversion-Berechnung serverseitig spiegelbar**: Raten werden aus den View-Counts abgeleitet (`confirmRate = confirmed / max(requested,1)` etc.), nie geschätzt/gerundet zu Vanity-Zwecken. Division-by-Zero → `0`, nicht `NaN`/`Infinity`.
- **Zeitraum-Parameter** (`range: '7d' | '30d' | '90d'`) wird an die View-Query als `created_at >= now() - interval` gereicht; im Seed-Pfad identisch gefenstert. **Trend** = gleicher Zeitraum unmittelbar davor (Δ %).

### 1.3 Routing & RBAC-Gate (Käufer/Erzeuger/Staff/Owner sauber getrennt)

- **Route** `OwnerDashboardPage` (`app/src/pages/OwnerDashboardPage.tsx`) und **Route** `ErzeugerDashboardPage` (`app/src/pages/ErzeugerDashboardPage.tsx`) — bzw. **eine** `DashboardPage` mit scope-bewusstem Header, je nach Rolle des angemeldeten Profils. Eingehängt in `App.tsx` (bestehender Routing-Einstieg, additiv — keine Parallel-Shell).
- **RBAC (Pfeiler 4)**: Sichtbarkeit aus der **Rolle des Profils** (`profiles.role`), gespiegelt aus dem Backend — **Frontend spiegelt nur, RLS ist führend**. Käufer (`kaeufer`) hat **keinen** Zugriff (kein Eintrag in der Navigation, Direkt-Aufruf → Zero-State „Kein Zugriff für diese Rolle" mit Pfad zurück zum Finder, **kein** 200 mit Fremddaten). Erzeuger sieht **nur die eigene Org** (Scope `org`). Owner/Staff sehen Plattform-Scope (`platform`).
- **Server bleibt die Wahrheit**: selbst wenn ein Käufer die Route erzwingt, liefern die `kpi_*`-Views via RLS **0 Zeilen** → das UI zeigt Zero-State, nie Fremddaten. Der Client-Guard ist UX, nicht Sicherheit.

### 1.4 UI — Editorial-Komponenten (Token-Kanon, keine neuen Farben)

Alles ausschließlich im bestehenden Editorial-Design-System (`app/src/styles/theme.css`, Token-Kanon aus WAVE_00). **Keine hardcodierten Farben, keine Deko-Emojis, keine externen Fonts.**

- **`components/kpi/KpiCard.tsx`** — Kennzahl-Kachel: großer Wert (`--serif`), Gold-Mono-Eyebrow (`--mono`) als Label, optional Δ-Trend gegen Vorperiode (semantische Farbe aus Token: positiv `--ok`, negativ `--wine`, neutral `--muted`). Hat `loading` (`.skeleton`), `empty` (Zero-State-Text), `value`-Zustand — **alle drei real**.
- **`components/kpi/FunnelBar.tsx`** — horizontaler Conversion-Funnel `requested → confirmed → picked_up`, Segmentbreiten proportional, Storno/Verfall als abgesetzter Block. Farben aus Verfügbarkeits-/Forest-Tokens, kein neuer Hex.
- **`components/kpi/ScopeBanner.tsx`** — **der Scope-Transparenz-Pfeiler sichtbar gemacht**: zeigt im Klartext `Scope: <Org-Name | „Plattform (alle Höfe)"> · Zeitraum <from–to> · Datenstand <Live | Demo-Seed> · Stand <generatedAt>`. Bei Seed-Modus zusätzlich der unübersehbare Demo-Hinweis. Dieser Banner steht **über** jeder Zahlenfläche — keine Zahl ohne Kontext.
- **`components/kpi/RangePicker.tsx`** — Zeitraumwahl `7 / 30 / 90 Tage` (`.lbc-select`/`.lbc-btn`), steuert `range` und triggert echten Re-Fetch (gebundener Handler, sichtbarer Lade-/Erfolgszustand).
- **Vermittler-Disclaimer** (`.disclaimer-line`) im Footer des Dashboards: „LokaleBauernConnect vermittelt — Verkauf, Preise und Beratung liegen beim jeweiligen Hof." Durchgängig, wie überall.
- **A11y**: Kacheln als `<section>` mit `aria-label`; Trend-Pfeile haben Text-Alternative (nicht nur Farbe/Form); `:focus-visible`-Ring aus Token; Mobile-Breakpoint `≤680px` (Kacheln stapeln).

### 1.5 End-to-End-Verdrahtung (Pflicht — sonst gilt das Feature als nicht fertig)

Die Kette steht vollständig: **View/Seed-Aggregat → `lib/kpi.ts`-Fetch → `KpiResult`-Shape → DOM-Kachel → Lade/Leer/Fehler/OK → RangePicker-Handler → echter Re-Fetch**. Kein TODO, kein Platzhalter, kein nicht-verdrahteter Button. Jeder interaktive Zustand (Zeitraumwechsel, Rolle ohne Zugriff, leere Plattform, Fehler beim Laden) ist real auslösbar und sichtbar.

### 1.6 Audit & Dokumentation

- **Audit (Pfeiler 5)**: Lesen ist nicht auditpflichtig, aber ein **Owner-/Staff-Plattform-Aufruf** (org-übergreifende Sicht) wird als `audit_log`-Eintrag `kpi.platform_view` (wer/Rolle/Zeitraum/Scope) protokolliert — Verantwortlichkeit bei privilegierter, org-übergreifender Einsicht. Erzeuger-Eigenansicht (eigene Org) wird nicht protokolliert (kein Audit-Spam). `audit_log` existiert bereits (`0001_core.sql`).
- **Doku & Tracker**: `docs/releases/PHASE_STATUS.md` und `MASTER_INDEX.md` auf den realen Stand ziehen (WAVE_05 ✅, neues Spezialmodul-Dokument verlinkt). Wiederverwendbare Erkenntnis → 1 Zeile `.claude/learning/insights_inbox.md`; Aggregat-View-Muster (security-invoker + RLS-Vererbung) → Pattern unter `.claude/memory/patterns/` (Imperium-Beschleuniger für alle 14 Plattformen). Owner-Plattform-Read-Policy → ADR unter `.claude/memory/decisions/`.

---

## 2. Konkrete Befehle

> Working-Dir für alle App-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich.

### 2.1 Lokal entwickeln & verifizieren (kostenlos, kein Account)
```bash
cd app

npm ci                 # Lockfile-treu (wie CI/Deploy)
npm run dev            # http://localhost:5409 — Dashboard läuft im Seed-Modus

# Verifikations-Gate
npm run typecheck      # tsc --noEmit (strict, noUnused*, noFallthrough) — neue kpi.ts/types must pass
npm run build          # tsc --noEmit && vite build → app/dist (deterministisch)
npm run preview        # Prod-Build lokal prüfen
```

### 2.2 Migration & RLS lokal prüfen (Supabase CLI, lokaler Stack — kein Cloud-Account)
> Lokaler Docker-Postgres der Supabase-CLI nur für **Migrations-/RLS-Test** — das ist **kein** Self-Host-Deploy (Stack-Regel „kein Docker" betrifft Produktion/Hosting, nicht den lokalen Test-Runner).
```bash
cd app
supabase start                         # lokaler Postgres + Studio (nur Tests)
supabase db reset                      # spielt 0001→0004 frisch ein, inkl. seed.sql
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" \
  -c "select * from kpi_farms_overview limit 5;"   # Views existieren & liefern
supabase db lint                       # Schema-Lint (Policies/Views)
supabase stop
```

### 2.3 Cloud-Push (NICHT in dieser Welle — Owner-Freigabe, Account/Kosten)
> Erst nach ausdrücklicher Owner-Freigabe (EU-Projekt, kostenrelevant). Hier nur zur Vollständigkeit dokumentiert — **keine Push-Aktion in WAVE_05**.
```bash
supabase link --project-ref <ref>      # nur mit Owner-Account/Freigabe
supabase db push                       # additive Migration 0004 ausspielen (Freigabe)
```

### 2.4 Gezielte Verifikation der Welle (Greps statt blind „alles testen")
```bash
cd app
# Pfeiler 1: kein service_role im Lesepfad des Dashboards
grep -rniE "service_role|SUPABASE_SERVICE" src/ && echo "FAIL: service_role im Client" || echo "OK"
# Design-Disziplin: keine Hex-Farben außerhalb theme.css in neuen KPI-Dateien
grep -rniE "#[0-9a-f]{3,6}" src/components/kpi src/pages/*Dashboard* 2>/dev/null && echo "FAIL: Hex" || echo "OK"
# Pfeiler 2: kein roher throw ohne Zero-State-Pfad in der KPI-Datenschicht
grep -nE "available\s*:\s*false" src/lib/kpi.ts && echo "OK: Zero-State vorhanden"
```

---

## 3. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Org-Boundary / Datenisolation (Pfeiler 1)**
1. Ein **Erzeuger** sieht im Dashboard **ausschließlich** Reservierungen/Höfe/Zahlungen seiner eigenen Org — fremde Org-Daten erscheinen **nie** (durch RLS-Vererbung der `security invoker`-Views belegt, nicht durch Client-Filter).
2. Cross-Org-Negativtest: ein erzwungener Aufruf mit fremder/fehlender Org liefert **0 Zeilen** aus den `kpi_*`-Views (kein 200 mit Fremddaten), nicht einen 500.
3. Plattform-Scope (`platform`) ist **nur** für `owner`/`staff` zugänglich; `kaeufer`/`erzeuger` erhalten dort 0 plattformweite Zeilen.

**Zero-State statt Error (Pfeiler 2)**
4. Bei leerer Datenlage (keine Reservierungen / keine Höfe / keine SB-Zahlungen) zeigt jede Kachel einen ehrlichen Zero-State („Noch keine Reservierungen im Zeitraum") — **kein 500, kein `NaN`/`Infinity`, kein Fake-Umsatz**.
5. Conversion bei `requested = 0` liefert `0 %`, nicht `NaN`; `KpiResult.available` ist dann `false`.

**Scope-Transparenz (Pfeiler 3) — Kern dieser Welle**
6. **Jede** Zahlenfläche trägt sichtbaren Scope: Org/Plattform · Zeitraum (from–to) · Datenstand (Live/Demo-Seed) · Stand (`generatedAt`). Eine Zahl ohne `ScopeBanner` darüber gilt als Fehler.
7. Im Seed-Modus (leere `.env`) ist der **Demo-Hinweis unübersehbar**; keine Demo-Zahl wird als Live-Wahrheit dargestellt.
8. Zeitraumwechsel (`7/30/90`) ändert `scope.from/to` **und** löst echten Re-Fetch aus (sichtbarer Lade- → Wert-Zustand).

**RBAC ohne Lücken (Pfeiler 4)**
9. Käufer-Rolle: Dashboard nicht in der Navigation; Direktaufruf → Zero-State „Kein Zugriff", Rückweg zum Finder, **keine** Daten.
10. Rollen-Sichtbarkeit kommt aus dem Backend-Profil; Frontend-Flag allein verschafft keinen Datenzugang (RLS bleibt führend).

**Audit & Verantwortlichkeit (Pfeiler 5)**
11. Jeder **Plattform-Scope-Aufruf** durch Owner/Staff erzeugt genau **einen** `audit_log`-Eintrag `kpi.platform_view` (wer/Rolle/Zeitraum); Erzeuger-Eigenansicht erzeugt keinen.

**Test- & Drilldown-Integrität (Pfeiler 6 + 7)**
12. Tests existieren je Kernfall: fremde Org → 0 Zeilen, leere Daten → Zero-State-Shape, valider Erzeuger-/Owner-Aufruf → erwartetes `KpiResult`-Shape, Käufer → Zugriff verweigert. Tests laufen real (nicht still geskippt), Pfade relativ zur Testdatei.
13. Drilldown von einer KPI-Kachel (z. B. „Offene Reservierungen") führt **scope-treu** zur gefilterten Liste — der Deep-Link übergibt Org/Zeitraum/Status, baut **nie** eine org-fremde URL.

**Build, Typsicherheit & Disziplin**
14. `npm run typecheck` und `npm run build` sind grün; neue Typen (`KpiScope/ReservationFunnel/FarmsKpi/KpiResult`) ohne `any`.
15. Keine Hex-Farben/Inline-Farben/externen Fonts in den neuen KPI-Dateien; kein `service_role` im `src/`; Migration `0004` ist additiv mit dokumentiertem Rollback; Vermittler-Disclaimer vorhanden.

---

## 4. Gate (Übergang zu WAVE_06)

> Ohne grünes Gate startet keine Folge-Welle.

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **Isolations-Gate** (blockierend) | Erzeuger sieht nur eigene Org; Cross-Org/Käufer → 0 Zeilen, nie Fremddaten | `qa-tester` Isolationstest §2.2/§3.1–3 + `db-rls-spezialist` |
| **Zero-State-Gate** (blockierend) | leere Daten → ehrlicher Zero-State, kein 500, kein `NaN`/Fake-Umsatz | Smoke §3.4–5 |
| **Scope-Gate** (blockierend) | jede Zahl mit Scope/Zeitraum/Datenstand; Demo unübersehbar | Review §3.6–8 + `frontend-design-guardian` |
| **RBAC-Gate** | Rollen sauber getrennt; Käufer ohne Zugriff; Server führend | §3.9–10 + `security-auditor` |
| **Audit-Gate** | Plattform-Read protokolliert, Eigenansicht nicht | §3.11 |
| **Build/Type-Gate** (blockierend) | `npm ci && npm run build` grün; keine `any`; additive Migration mit Rollback | §2.1 + CI |
| **Design-Gate** | keine Hex/Inline-Farben/externen Fonts; Token-Kanon eingehalten | Grep §2.4 + `frontend-design-guardian` |
| **Secret-Gate** | kein `service_role`/Secret im Client/dist; nur `VITE_`-Keys | `security-auditor` (read-only) |

**Stop-Regel:** Sobald ein Account-/Kosten-/Deploy-Schritt nötig würde (Supabase-Link/`db push`, Cloudflare-Deploy, echte Keys) **oder** unklar ist, welche Rolle org-übergreifend lesen darf — **anhalten und Owner-Freigabe einholen**. Cloud-Push gehört nicht in WAVE_05.

**Nächste Welle:** `WAVE_06 — Security` (Supabase Auth, Turnstile, RLS-Härtung, Rate-Limits) — härtet u. a. die in dieser Welle eingeführte Owner-/Staff-Plattform-Read-Policy unter realer Auth ab.

---

## 5. Abschlussbericht

```
## Welle abgeschlossen: WAVE_05 — Owner/KPI-Dashboard
- Geändert:
  · app/supabase/migrations/0004_kpi_views.sql → additive, security-invoker Views
    kpi_reservations_daily / kpi_farms_overview / kpi_payments_daily (RLS der Basistabellen
    vererbt), Owner/Staff-Plattform-Read-Policy (is_owner/is_staff, deny-by-default bleibt),
    Aggregat-Indizes (reservations/sb_payments, additiv) + dokumentierter Rollback.
  · src/lib/kpi.ts → Dual-Source-Datenschicht (Views ↔ Seed), Funnel-/Farms-/Payments-Aggregate,
    Conversion-Raten (Division-by-Zero → 0), Zeitfenster 7/30/90 + Trend gegen Vorperiode.
  · src/lib/types.ts → KpiScope/ReservationFunnel/FarmsKpi/KpiResult (single source, kein any).
  · src/pages/{Owner,Erzeuger}DashboardPage.tsx (+ App.tsx-Route) → scope-bewusst, RBAC-gegated.
  · src/components/kpi/{KpiCard,FunnelBar,ScopeBanner,RangePicker}.tsx → Editorial-Token-Kanon,
    Lade/Leer/Fehler/OK real, Vermittler-Disclaimer, A11y + Mobile-Breakpoint.
  · audit_log: kpi.platform_view bei Owner/Staff-Plattform-Sicht.
  · Doku: MASTER_INDEX.md + docs/releases/PHASE_STATUS.md auf realen Stand; Pattern (Aggregat-View)
    + ADR (Owner-Plattform-Read) ins Memory.
- Tests/Verifikation:
  · Isolationstest: Erzeuger nur eigene Org; Käufer/Cross-Org → 0 Zeilen (nie Fremddaten).
  · Zero-State: leere Daten → ehrlicher Leerzustand, kein 500, kein NaN/Fake-Umsatz.
  · Scope: jede Zahl mit Org/Zeitraum/Datenstand; Demo-Seed unübersehbar gekennzeichnet.
  · npm run typecheck → 0 Fehler · npm run build → dist/ deterministisch · Konsole sauber (5409).
  · Greps: kein service_role im Client, keine Hex außerhalb theme.css in KPI-Dateien.
- Risiken:
  · Mittel-niedrig. Additive Views/Policies/Indizes, keine Basistabellen-Änderung; Rollback =
    drop view/policy/index + git revert. Hauptrisiko ist die org-übergreifende Owner/Staff-Policy
    → durch Isolations-Negativtest + security-auditor abgesichert; unter realer Auth in WAVE_06 gehärtet.
  · Offen (Owner-Freigabe): Cloud-`db push` der Migration 0004; echte EU-Keys (WAVE_06).
- Nächste Welle: WAVE_06 — Security (Auth, Turnstile, RLS-Härtung, Rate-Limits).
```

---

## 6. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, Stop-Regeln), `AGENTS.md` (harte Regeln, Subagenten-Roster), `PHASEN.md` (Phase 1 → WAVE_05).
- **Landkarte:** `MASTER_INDEX.md` (Soll-Struktur, `finalization/WAVE_00…15`).
- **Reale Artefakte (Bestand), auf denen diese Welle aufsetzt:**
  - `app/supabase/migrations/0001_core.sql` — `orgs/profiles/farms/products/reservations/audit_log`, Enums `reservation_status`/`availability_state`/`user_role`, RLS deny-by-default.
  - `app/supabase/migrations/0002_payments.sql` — `sb_payments`/`subscriptions`, `payment_status`, owner-read-Policies.
  - `app/supabase/migrations/0003_marketplace.sql` — `org_members` + Helfer `is_org_member()` (Vorbild für `is_owner/is_staff`).
  - `app/src/lib/data.ts` / `supabase.ts` — Dual-Source-Muster (`isSupabaseConfigured`), Case-Mapping-Grenze.
  - `app/src/lib/seed.ts` — deterministische Seed-Quelle für den Offline-/Demo-Aggregatpfad.
  - `app/src/styles/theme.css` — Editorial-Token-Kanon (Quelle aller Farben/Radien/Schatten).
- **Subagenten (Delegation):** `db-rls-spezialist` (Views/Policy/Isolationstest) → `qa-tester` (Isolation/Zero-State/Shape) · `frontend-design-guardian` (Token/Scope-UI) · `security-auditor` (Owner-Policy, service-role, read-only).
- **Plattform-Pfeiler dieser Welle:** Org-Boundary (RLS-vererbende Views) · Zero-State (KpiResult.available) · **Scope-Transparenz (ScopeBanner)** · RBAC (Rollen-Gate, Server führend) · Audit (kpi.platform_view) · Test-/Drilldown-Integrität.

> Diese Welle ist **additiv und read-only** auf Domänen-Ebene. Für jeden kosten-/außenwirksamen Schritt (Supabase-`db push`, Cloudflare-Deploy, echte Keys) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
