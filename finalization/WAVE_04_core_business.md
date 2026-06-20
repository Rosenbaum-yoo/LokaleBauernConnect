# WAVE 04 — Kernprodukt (A Hofladen-Finder · B Verfügbarkeit-Selbstpflege · C Reservierung/Abholfenster · D Saison-Radar)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · `PHASEN.md` → Phase 1, WAVE_04. **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> Status laut `PHASEN.md`: ✅ Subbereich **A end-to-end (Seed, Supabase-ready)**. Diese Welle vollendet **B + C + D** auf demselben Enterprise-Niveau und macht das Kernprodukt **lückenlos, prüfbar und abnehmbar**.
> Baut auf: `WAVE_00` (Fundament/Token-Kanon/Dual-Source), `WAVE_02` (Datenmodell + RLS deny-by-default), `WAVE_03` (Rollen: Käufer/Erzeuger/Staff). Bereitet vor: `WAVE_05` (KPI), `WAVE_09`/Phase 4 Track A (SB-Bezahl-USP).

---

## 0. Ziel

Das **Kernprodukt von LokaleBauernConnect** — die Spezialschicht über dem geteilten ConnectCore-Kern — ist nach dieser Welle **vollständig, end-to-end verdrahtet und abnehmbar**. Konkret, je Subbereich:

- **A — Hofladen-Finder.** Käufer findet Höfe in seiner Nähe (PLZ-Suche, Kategorie-Filter, Distanz-/Namens-Sortierung), öffnet Hof-Details und sieht tagesaktuelle Verfügbarkeit. *Bereits gebaut* (`FinderPage`, `FarmCard`, `FarmDrawer`, `lib/geo.ts`, `lib/data.ts`); diese Welle **härtet** ihn (Zero-State, Scope-Transparenz, Deep-Link, Pagination-Vorbereitung) und macht ihn formell abnehmbar.
- **B — Verfügbarkeit-Selbstpflege.** Der **Erzeuger** pflegt seinen Bestand selbst: Produkt anlegen/bearbeiten, Verfügbarkeit (`available`/`low`/`soon`/`out`) und Saison-Flag in **einem Klick** umschalten — **org-gebunden**, RLS-erzwungen, mobil bedienbar, jede Mutation auditiert. Das ist die **Datenquelle**, aus der A und D leben.
- **C — Reservierung/Abholfenster.** Käufer reserviert ein verfügbares Produkt zur Abholung in einem **vom Hof vorgegebenen Abholfenster**; der Erzeuger sieht eingehende Reservierungen und führt sie durch einen **klaren Statusverlauf** (`requested → confirmed → picked_up`, plus `cancelled`/`expired`). *Käufer-Seite gebaut* (`FarmDrawer`-Formular → `createReservation`); diese Welle ergänzt die **Erzeuger-Verwaltungsseite** + serverseitigen Statuswechsel.
- **D — Saison-Radar.** Eine kuratierte, **datengetriebene** Saison-Sicht: „Was hat **jetzt** in deiner Region Saison?" — abgeleitet aus echten Produktdaten (`seasonal`-Flag + Saison-Kalender), verlinkt direkt in den Finder (Deep-Link mit Kategorie/PLZ-Kontext). **Kein Fake**, keine Deko-KPI.

**Roter Faden (Vermittler):** Die Plattform **vermittelt** Verfügbarkeit und Reservierung — sie verkauft nicht selbst, berät nicht, garantiert keine Mengen. Preis ist **Richtwert**, Zahlung erfolgt (in dieser Welle) **direkt beim Hof**; die bargeldlose SB-Bezahlung am unbemannten Stand ist der **USP** und folgt als eigene Strecke (Phase 4 Track A / `WAVE_09`). Disclaimer durchgängig in jeder reservierenden/pflegenden Ansicht.

**Nicht-Ziel dieser Welle:** Stripe-/SB-Bezahlung (Phase 4 Track A · `docs/spezialmodule/SB_BEZAHLUNG_USP.md`) · interaktive Karte/Leaflet (Phase 4 Track B — Finder bleibt hier listenbasiert) · Erzeuger-Onboarding-Wizard (`WAVE_15`) · Benachrichtigungen/Alerts bei Verfügbarkeit (Phase 4 Track C). Live-Supabase-Anbindung bleibt **Owner-Freigabe** (`WAVE_06`); diese Welle läuft im **Dual-Source-Modus** voll bedienbar.

---

## 1. Aufgaben

> **Inkrementell-Regel:** bestehende Dateien (`lib/data.ts`, `lib/types.ts`, `FinderPage`, `FarmDrawer`, `migrations/0001_core.sql`) **erweitern, nie duplizieren**. Keine Parallelstrukturen. Jede neue Mutation läuft serverseitig über eine **Edge Function** (Deno) mit Zod + Rechteprüfung + Audit; das Frontend ruft nur diese Grenze auf, nie `service_role`.

### 1.A — Hofladen-Finder (härten & abnehmbar machen)

Bestand (gebaut, `WAVE_00`-Baseline): `src/pages/FinderPage.tsx`, `src/components/FarmCard.tsx`, `src/components/FarmDrawer.tsx`, Datenschicht `listFarms(filter)`/`getFarm(id)`, Geo `distanceFromPlz`/`isValidPlz`, Filter `{ plz, category, sort }`. Diese Welle ergänzt:

- **Scope-Transparenz (Pfeiler 3).** Finder-Meta zeigt sichtbar den Kontext der Trefferliste: gewählte PLZ/Region, Kategorie, Sortierung, **Datenstand** (Demo/Seed vs. live) und ob die PLZ bekannt ist. Der bereits vorhandene `plzKnown`/`plzUnknown`-Hinweis in `FinderPage` wird zu einem konsistenten `scope`-Band ausgebaut (Quelle: `isSupabaseConfigured` aus `lib/supabase.ts`).
- **Zero-State statt Error (Pfeiler 2).** Drei distinkte Leerzustände statt eines generischen: (1) unbekannte PLZ → „Diese Region starten wir bald" (CTA Waitlist), (2) Kategorie/Filter ohne Treffer → „Filter entfernen", (3) keine Höfe live → Seed-Hinweis. Kein 500/Spinner-Endlosschleife; `listFarms` fällt nachweislich auf Seed zurück (`try/catch` in `lib/data.ts` ist bereits vorhanden — Verhalten wird durch Test fixiert).
- **Deep-Link-Integrität (Pfeiler 7).** Finder liest Suchparameter aus der URL (`?plz=49074&kategorie=Honig&sort=distance`) und schreibt sie zurück (History-State), damit Saison-Radar (D) und externe Links **direkt** in eine vorgefilterte Trefferliste springen. Deep-Links bauen **nie** org-fremde URLs; PLZ/Kategorie sind öffentliche Katalog-Parameter.
- **Pagination-Vorbereitung (skaliert 10→300 Höfe).** `listFarms` erhält optionale `{ limit, offset }`-Parameter (additiv, Default unverändert), in der Supabase-Query als `.range()` umgesetzt; UI lädt zunächst eine sinnvolle Seitengröße (z. B. 24) mit „Mehr laden". Indizes existieren bereits (`farms_plz_idx`, `farms_active_idx`).
- **A11y/Editorial-Disziplin.** Filterfelder behalten Labels (`lbc-label`), Fokus-Ring sichtbar, Drawer `role="dialog" aria-modal`; keine neuen Farben außerhalb `theme.css`.

### 1.B — Verfügbarkeit-Selbstpflege (Erzeuger) — **Kern dieser Welle**

Neue **Erzeuger-Konsole** für den eigenen Hof. Strikte Trennung von der Käuferwelt (eigene Route, Auth-/Rollen-Gate aus `WAVE_03`).

- **Routen & Seiten (neu):**
  - `src/pages/erzeuger/ManageProductsPage.tsx` — Liste aller Produkte des eigenen Hofs mit Inline-Verfügbarkeits-Umschalter (`available`/`low`/`soon`/`out`) und Saison-Toggle.
  - `src/components/erzeuger/ProductForm.tsx` — Anlegen/Bearbeiten (Name, Kategorie aus `ProductCategory`-Enum, Einheit, Preis, Verfügbarkeit, Saison). Datengetrieben + **Zod**-validiert (Schema-Heimat `lib/types.ts`).
  - `src/components/erzeuger/AvailabilityToggle.tsx` — 4-stufiger Umschalter, nutzt vorhandene `.lbc-badge av-*`-Primitives + `AvailabilityBadge`.
- **Datenschicht (erweitern `lib/data.ts`):**
  - `listMyProducts(): Promise<Product[]>` — Produkte des eingeloggten Erzeugers (RLS filtert auf `org_id`); Seed-Modus liefert den ersten Seed-Hof als „mein Hof" (klar als Demo gekennzeichnet).
  - `upsertProduct(input): Promise<Product>` und `setAvailability(productId, state): Promise<void>` — rufen **Edge Functions** auf, fallen im Seed-Modus auf `localStorage` zurück (kein toter Button).
- **Edge Functions (neu, Deno):**
  - `supabase/functions/product-upsert/index.ts` — Zod-Schema, `requireRole('erzeuger')`, Org-Scope-Check (Produkt muss zur Org des Aufrufers gehören), Audit (`product.upsert`).
  - `supabase/functions/product-set-availability/index.ts` — schmaler, schneller Pfad nur für den Verfügbarkeits-/Saison-Wechsel; Audit (`product.availability_changed`, `details: { from, to }`).
  - Geteilt: `_shared/` (vorhanden: `cors.ts`, `supabaseAdmin.ts`) + neu `_shared/auth.ts` (User-/Rollen-/Org-Auflösung aus JWT) und `_shared/audit.ts` (einheitliches Audit-Insert).
- **DB (additive Migration `0004_core_business.sql`):**
  - **Keine** Schema-Änderung an `products` nötig — `availability`, `seasonal`, `org_id`, `updated_at`-Trigger existieren bereits in `0001_core.sql`. Migration ergänzt: Index `products_avail_idx on products(availability)`, `products_seasonal_idx on products(seasonal) where seasonal`, und **härtet** die Schreib-Policy (bereits `products_owner_write` org-gebunden vorhanden) durch einen **expliziten Isolationstest** statt neuer Policy.
  - Reine **additive** Migration; Rollback dokumentiert (Indizes droppen).
- **Disclaimer/Compliance:** Pflege-Maske trägt den Hinweis „Du pflegst eigenverantwortlich; LokaleBauernConnect vermittelt nur." + Lebensmittel-Kennzeichnungs-Hinweis (siehe `docs/COMPLIANCE_MODEL.md`).

### 1.C — Reservierung / Abholfenster (Erzeuger-Seite + Statusverlauf)

Bestand (Käufer-Seite gebaut): `FarmDrawer`-Reservierungsformular → `createReservation` → `reservations`-Insert (Migration `0001_core.sql` hat `reservations` inkl. `reservation_status`-Enum, `pickup_window`, `quantity 1..50`, Insert-Policy für anon/auth). Diese Welle ergänzt die **Verwaltungsseite** und den **serverseitigen Statuswechsel**.

- **Statusmaschine (kanonisch, in `docs/CORE_BUSINESS_STATE_MACHINES.md` verankert):**
  ```
  requested → confirmed → picked_up        (Erfolgspfad)
  requested → cancelled                     (Käufer/Hof storniert)
  confirmed → cancelled                     (Hof storniert nach Zusage)
  requested/confirmed → expired             (Abholfenster verstrichen, automatisch)
  ```
  Nur **vorwärts/seitwärts** gemäß erlaubter Übergänge; jeder andere Übergang → 422. Übergänge sind serverseitig erzwungen (nicht im Client).
- **Routen & Seiten (neu):**
  - `src/pages/erzeuger/ReservationsPage.tsx` — eingehende Reservierungen des eigenen Hofs, gruppiert nach Abholfenster/Status; Aktionen „Bestätigen", „Als abgeholt markieren", „Stornieren" (jeweils Confirm + optionaler Grund bei Storno → Audit).
  - `src/components/erzeuger/ReservationRow.tsx` — eine Reservierung mit Statusbadge + erlaubten Aktionen (UI spiegelt nur die serverseitig erlaubten Übergänge).
- **Datenschicht (erweitern `lib/data.ts`):**
  - `listMyReservations(filter?): Promise<Reservation[]>` — RLS-gebunden (`reservations_owner_read` existiert bereits). Mapping `snake_case→camelCase` an der Datenschicht-Grenze (`mapReservation`).
  - `setReservationStatus(id, next, reason?): Promise<Reservation>` — ruft Edge Function auf.
  - `Reservation`-Typ in `lib/types.ts` um `status: ReservationStatus` erweitern (additiv; Käufer-Pfad unverändert).
- **Edge Function (neu):** `supabase/functions/reservation-set-status/index.ts` — Zod (`{ id, next, reason? }`), `requireRole('erzeuger'|'staff')`, Org-Scope (Reservierung muss zur Org gehören), **Übergangsvalidierung** gegen die Statusmaschine, Audit (`reservation.status_changed`, Grund Pflicht bei `cancelled`). Optional Bestätigungs-E-Mail über vorhandenes `_shared/email.ts`.
- **Abholfenster-Konsistenz:** `pickup_window` muss zum Zeitpunkt der Reservierung in `farm.pickup_windows` enthalten sein — Check serverseitig (in einer schmalen `reservation-create`-Function oder als DB-Constraint-Trigger; Käufer-Insert-Policy bleibt, der Check verhindert verwaiste Fenster). Käufer-UI bietet nur reale Fenster (bereits in `FarmDrawer` via `farm.pickupWindows`).
- **Käufer-Sicht (leichte Ergänzung):** Bestätigungstext im `FarmDrawer` macht den Status transparent („Der Hof bestätigt deine Reservierung" — bereits vorhanden) und kennzeichnet **Preis als Richtwert, Zahlung beim Hof** (vorhanden) — bleibt unverändert korrekt für diese Welle.

### 1.D — Saison-Radar

Kuratierte, **aus echten Daten** abgeleitete Saison-Sicht. Keine separate Wahrheit — sie aggregiert über denselben Katalog wie A.

- **Saison-Kalender (datengetrieben):** `src/lib/season.ts` — Mapping `ProductCategory → Saisonmonate` (z. B. Erdbeeren/Obst: Mai–Juli; Kürbis: Sep–Nov) als **Konstante**, plus `inSeasonNow(category, date?)` und `seasonProgress` (früh/Hochsaison/Ausklang). Quelle ist fachlich begründet (regionaler Saisonkalender), kein Zufall.
- **Sicht:** `src/pages/SaisonRadarPage.tsx` — „Jetzt Saison in deiner Region": Karten je Kategorie, die **jetzt** Saison hat **und** im Katalog real verfügbar ist (`availability !== 'out'`, ggf. `seasonal`-Flag). Jede Karte ist ein **Deep-Link** in den Finder (`?kategorie=…&plz=…`), übergibt den Kontext (Pfeiler 7).
- **Datenschicht (erweitern `lib/data.ts`):** `listSeasonalNow(plz?): Promise<SeasonHighlight[]>` — kombiniert `listFarms` + `season.ts`; liefert je Kategorie Anzahl Höfe/Produkte „jetzt verfügbar + in Saison". Zero-State: „In deiner Region ist gerade Übergangszeit — diese Kategorien kommen bald" (zeigt `soon`/kommende Saison statt leerer Seite).
- **Editorial/Marketing-Premium:** Eyebrow „Saison-Radar", Magazin-Ton, Waldgrün-Signaturblock für die laufende Hauptsaison; keine Deko-Emojis, Tokens aus `theme.css`.
- **Kein Fake:** Zeigt eine Kategorie nur, wenn real ≥ 1 verfügbares Produkt existiert; sonst klar als „kommt bald" markiert.

### 1.E — Querschnitt (alle Subbereiche)

- **RBAC ohne Lücken (Pfeiler 4):** Finder + Saison-Radar = öffentlich (anon ok). Verfügbarkeits-Pflege + Reservierungsverwaltung = nur `erzeuger` (eigene Org) bzw. `staff`. Plan-Locks (falls ein Limit greift, z. B. max. Produktanzahl im `basis`-Plan) zeigen konkreten Upgrade-Pfad statt toten Buttons (`docs/product/PLANS_AND_LIMITS.md`).
- **Audit & Verantwortlichkeit (Pfeiler 5):** jede Mutation (Produkt-Upsert, Verfügbarkeitswechsel, Statuswechsel) schreibt nach `audit_log` (Tabelle existiert: `0001_core.sql`) mit `actor_user_id`, `action`, `entity_*`, `reason` (Pflicht bei Storno), `details`.
- **Dual-Source-Treue (`WAVE_00`):** alle neuen Funktionen laufen im Seed-Modus voll (localStorage), mit gesetzten `VITE_SUPABASE_*` automatisch über Supabase/Edge — UI identisch; Demo-Zustand sichtbar gekennzeichnet.
- **Doku & Tracker:** `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` (neu), `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md` (neu), `docs/spezialmodule/SAISON_RADAR.md` (vorhanden — auf Implementierung ziehen), `docs/spezialmodule/HOFLADEN_FINDER.md` (vorhanden — härten), `docs/CORE_BUSINESS_STATE_MACHINES.md` (Reservierungs-FSM), `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` aktualisieren. Lektionen → `.claude/learning/insights_inbox.md`; Reservierungs-FSM + Self-Service-Edge-Muster als ADR/Pattern.

---

## 2. Konkrete Befehle

> Working-Dir für App-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich. Backend-/Account-/Kosten-Schritte (Supabase-Push/Deploy) bleiben **Owner-Freigabe** und sind hier nur zur Vollständigkeit dokumentiert.

### 2.1 Lokal entwickeln & verifizieren (kostenlos, Seed-Modus, kein Account)
```bash
cd app

npm ci                 # Lockfile-treu (wie CI/Deploy); frisches Checkout
npm run dev            # http://localhost:5409 — Finder, Erzeuger-Konsole, Saison-Radar im Seed-Modus

# Verifikations-Gate (blockierend)
npm run typecheck      # tsc --noEmit (strict, noUnused*, noFallthrough)
npm run build          # tsc --noEmit && vite build → app/dist (deterministisch, kein Source-Leak)
npm run preview        # Prod-Build lokal prüfen
```

### 2.2 Zod ergänzen (Validierung an der Eingangsgrenze)
```bash
cd app
npm install zod        # Schema-Validierung für ProductForm + Edge Functions (aktualisiert package-lock.json)
# Schemas leben in src/lib/types.ts (Frontend) bzw. werden in den Edge Functions gespiegelt.
```

### 2.3 Routen prüfen (manueller Smoke-Test, Seed-Modus)
```
# Käufer
http://localhost:5409/?plz=49074&kategorie=Honig&sort=distance     # A: Finder mit Deep-Link-Kontext
http://localhost:5409/saison                                       # D: Saison-Radar (jetzt-in-Saison)

# Erzeuger (nach Login/Rolle erzeuger; im Seed-Modus simuliert „mein Hof")
http://localhost:5409/erzeuger/produkte                            # B: Verfügbarkeit-Selbstpflege
http://localhost:5409/erzeuger/reservierungen                      # C: eingehende Reservierungen + Status
```

### 2.4 Supabase-Migration + Edge Functions (NUR mit Owner-Freigabe — Account/Kosten)
```bash
# Voraussetzung: supabase CLI installiert, EU-Projekt verknüpft (WAVE_02/06).
supabase migration new core_business          # erzeugt app/supabase/migrations/0004_core_business.sql
# → Inhalt: additive Indizes (products_avail_idx, products_seasonal_idx) + Isolationstest-Fixtures

supabase db push                              # additive Migration anwenden (Freigabe!)

# Neue Edge Functions deployen (Freigabe!)
supabase functions deploy product-upsert
supabase functions deploy product-set-availability
supabase functions deploy reservation-set-status

# Secrets sind bereits gesetzt (WAVE_06); KEINE service_role je ins Frontend.
```

### 2.5 Tests ausführen (gezielt auf geänderten Pfaden)
```bash
cd app
npm run typecheck                             # 0 Fehler = Pflicht
# Gezielte Vitest-Suites dieser Welle (siehe §3):
npx vitest run src/lib/__tests__/data.test.ts          # Dual-Source-Fallback, Filter, Mapping
npx vitest run src/lib/__tests__/season.test.ts        # inSeasonNow / Saison-Ableitung
npx vitest run src/lib/__tests__/reservation-fsm.test.ts  # erlaubte/verbotene Statusübergänge
# Edge-/RLS-Isolationstest (gegen lokales Supabase oder Test-Projekt, Freigabe):
supabase functions serve   # + Boundary-Tests (fremde Org = 403, valider Aufruf = erwartetes Shape)
```

---

## 3. Acceptance (Abnahmekriterien — alle müssen grün sein)

> Vier Subbereiche × Pfeiler-Abdeckung. „Fast fertig" zählt nicht (§0.1).

### A — Hofladen-Finder
1. PLZ-Suche, Kategorie-Filter und Sortierung (Distanz/Name) wirken **kombiniert** und sofort; bekannte PLZ sortiert nach Entfernung, unbekannte PLZ alphabetisch **mit** sichtbarem Hinweis (kein stiller Fehler).
2. **Scope-Band** zeigt PLZ/Kategorie/Sortierung + Datenstand (Demo/Seed vs. live) sichtbar.
3. **Drei** distinkte Zero-States (unbekannte PLZ / kein Filter-Treffer / keine Live-Höfe) statt eines generischen; kein 500, kein Endlos-Spinner; `listFarms`-Fallback auf Seed durch Test belegt.
4. **Deep-Link** `?plz=…&kategorie=…&sort=…` füllt den Finder vor und wird beim Filtern in die URL zurückgeschrieben; öffnet Hof-Drawer mit Details/Verfügbarkeit/Reservierung (end-to-end, bereits vorhanden — Regression grün).
5. `listFarms({ limit, offset })` paginiert serverseitig (Supabase `.range()`); UI „Mehr laden" funktioniert; Default-Verhalten unverändert.

### B — Verfügbarkeit-Selbstpflege
6. Erzeuger sieht **ausschließlich** Produkte der **eigenen Org**; Aufruf gegen fremde Org = **403** (nie 200 mit Fremddaten) — durch Cross-Org-Negativtest belegt (Pfeiler 1/6).
7. Verfügbarkeit (`available`/`low`/`soon`/`out`) und Saison-Flag sind **in einem Klick** umschaltbar; Änderung erscheint sofort optimistisch und ist nach Reload persistent (Supabase) bzw. im Seed-Modus in `localStorage`.
8. Produkt anlegen/bearbeiten ist **Zod-validiert** (Pflichtfelder, Preis ≥ 0, Kategorie ∈ Enum, Einheit gesetzt); ungültige Eingabe zeigt feldnahe Fehler, kein Absturz.
9. Jede Mutation schreibt einen **Audit-Eintrag** (`product.upsert` / `product.availability_changed` mit `from/to`).
10. Pflege-Maske trägt **Vermittler-Disclaimer** + Lebensmittel-Hinweis; mobil bedienbar (Breakpoint ≤ 680px), Editorial-Tokens, keine neuen Farben.

### C — Reservierung / Abholfenster
11. Käufer-Reservierung (vorhanden) bleibt end-to-end grün: nur verfügbare Produkte reservierbar, nur reale Abholfenster wählbar, Bestätigung mit Richtwert-Summe + „Zahlung beim Hof".
12. **Abholfenster-Konsistenz** serverseitig: ein `pickup_window`, das nicht zu `farm.pickup_windows` gehört, wird abgelehnt (kein verwaistes Fenster).
13. Erzeuger sieht eingehende Reservierungen **nur der eigenen Org** (RLS); Statuswechsel `requested→confirmed→picked_up` sowie `→cancelled` funktionieren; **verbotene Übergänge → 422** (durch FSM-Test belegt).
14. Storno verlangt **Grund** (reason Pflicht) → Audit (`reservation.status_changed`); UI bietet nur serverseitig erlaubte Aktionen an.
15. `expired` wird für verstrichene Abholfenster konsistent gesetzt (Job/Trigger oder Lazy-Eval beim Laden) — kein „hängender" requested-Status ohne Ende.

### D — Saison-Radar
16. Saison-Radar zeigt **nur** Kategorien, die **jetzt** Saison haben **und** real ≥ 1 verfügbares Produkt im Katalog besitzen; sonst „kommt bald"-Zustand statt leerer Seite (kein Fake).
17. Jede Saison-Karte ist ein **Deep-Link** in den Finder mit übergebenem Kategorie-(+ optional PLZ-)Kontext; Sprung landet in vorgefilterter Trefferliste.
18. `inSeasonNow`/Saison-Ableitung ist durch Unit-Test fixiert (Monatsgrenzen, früh/Hochsaison/Ausklang); Datenstand/Region sichtbar (Scope).

### Querschnitt (alle)
19. **RBAC:** Finder + Saison-Radar öffentlich (anon ok); Pflege + Reservierungsverwaltung nur `erzeuger`(eigene Org)/`staff`; unautorisierter Zugriff = 403, Plan-Lock zeigt Upgrade-Pfad statt totem Button.
20. **Dual-Source:** mit leerer `.env` laufen **alle** neuen Ansichten vollständig (Seed/localStorage), Demo-Zustand gekennzeichnet; mit Keys schaltet dieselbe API auf Supabase/Edge — UI identisch.
21. **Build/Type:** `npm run build` grün (strict, deterministisch); Browser-Konsole frei von `TypeError`/401-Schleifen.
22. **Design/Security:** keine Hex-Farben außerhalb `theme.css`; keine externen Fonts; keine Deko-Emojis; `service_role` nirgends im `src/`; User-Werte escaped.
23. **Doku:** Spezialmodul-Dateien (Finder/Verfügbarkeit/Reservierung/Saison) + `CORE_BUSINESS_STATE_MACHINES.md` + `PHASE_STATUS.md` + `MASTER_INDEX.md` spiegeln den realen Stand; dieses File ohne offene Punkte.

---

## 4. Gate (Übergang zu WAVE_05)

> WAVE_04 ist die **Kernprodukt-Voraussetzung**. Ohne grünes Gate startet keine Folge-Welle. Es trägt direkt das **Go-Live-Gate Phase 1** (Kernflow Finder→Reservierung end-to-end mit echten Daten).

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **Build-Gate** *(blockierend)* | `npm ci && npm run build` grün, deterministisch, Konsole sauber | §2.1 / CI-Log |
| **Type-Gate** *(blockierend)* | `tsc --noEmit` ohne Fehler (strict) | `npm run typecheck` |
| **Isolations-Gate** *(blockierend)* | Erzeuger sieht/ändert nur eigene Org; fremde Org = 403 (Produkte **und** Reservierungen) | Cross-Org-Negativtest + `db-rls-spezialist` |
| **FSM-Gate** *(blockierend)* | Reservierungs-Statusübergänge serverseitig erzwungen; verbotene = 422 | `reservation-fsm.test.ts` + Edge-Test |
| **Kernflow-Gate** *(blockierend)* | Finder → Hof → Reservierung → Erzeuger bestätigt → picked_up vollständig durchlaufbar | manueller E2E (Port 5409) + `qa-tester` |
| **Zero-State-Gate** | jede datenführende Ansicht hat loading/empty/error/ok; kein 500 bei leeren Daten | Review §3 (3,16,18) |
| **Audit-Gate** | jede Mutation erzeugt Audit-Eintrag; Storno-Grund Pflicht | `audit_log`-Inspektion + `security-auditor` |
| **Design-Gate** | keine Hex/Inline-Farben/externen Fonts/Deko-Emojis außerhalb `theme.css` | Grep-Scan + `frontend-design-guardian` |
| **Secret-Gate** *(blockierend)* | kein Secret im Repo/dist; nur `VITE_`-Keys; `service_role` nur in Edge | `security-auditor` (read-only) |
| **Dual-Source-Gate** | leere `.env` → alle Ansichten voll bedienbar (Seed), Demo gekennzeichnet | Smoke-Test §2.3 |
| **Doku-Gate** | Spezialmodule + State-Machines + Tracker aktuell; dieses File ohne offene Punkte | Review |

**Stop-Regel:** Sobald ein Backend-/Account-/Kosten-Schritt nötig würde (Supabase-`db push`, `functions deploy`, echte Keys, Domain) — **anhalten und Owner-Freigabe einholen**. Edge-Function-Deploy und Migration gehören in den Freigabe-Pfad, nicht in den lokalen WAVE_04-Lauf. Unklarer Statusübergang, undefinierte Schreibrolle oder nicht prüfbarer Org-Scope → minimalen Fix vorschlagen und auf OK warten (`CLAUDE.md` Stop-Regeln).

**Nächste Welle:** `WAVE_05 — Owner/KPI-Dashboard` (Reservierungen, aktive Höfe, Conversion — aggregiert auf die in dieser Welle entstandenen echten Mutationsdaten). Danach Härtung über `WAVE_06` (Security/Turnstile/RLS) und Geldfluss über `WAVE_09`/Phase 4 Track A (SB-Bezahl-USP).

---

## 5. Abschlussbericht

```
## Welle abgeschlossen: WAVE_04 — Kernprodukt (A Finder · B Verfügbarkeit-Selbstpflege · C Reservierung · D Saison-Radar)
- Geändert:
  · A Finder (härten) → src/pages/FinderPage.tsx, src/components/FarmCard.tsx, FarmDrawer.tsx:
    Scope-Band (Datenstand/PLZ/Kategorie), 3 distinkte Zero-States, URL-Deep-Link (plz/kategorie/sort),
    listFarms({limit,offset}) + "Mehr laden" (Supabase .range), A11y/Editorial-Disziplin.
  · B Verfügbarkeit-Selbstpflege (neu) → src/pages/erzeuger/ManageProductsPage.tsx,
    components/erzeuger/{ProductForm,AvailabilityToggle}.tsx; lib/data.ts +listMyProducts/upsertProduct/
    setAvailability; Edge Functions product-upsert + product-set-availability (Zod, Rollen-/Org-Check, Audit);
    _shared/{auth,audit}.ts; Migration 0004 (Indizes products_avail/seasonal, Isolationstest).
  · C Reservierung/Abholfenster (neu Erzeuger-Seite) → src/pages/erzeuger/ReservationsPage.tsx,
    components/erzeuger/ReservationRow.tsx; lib/data.ts +listMyReservations/setReservationStatus;
    lib/types.ts Reservation.status (additiv); Edge Function reservation-set-status (FSM-Validierung,
    Org-Scope, Storno-Grund Pflicht, Audit); Abholfenster-Konsistenz serverseitig; expired-Handling.
  · D Saison-Radar (neu) → src/pages/SaisonRadarPage.tsx, lib/season.ts (Saisonkalender + inSeasonNow),
    lib/data.ts +listSeasonalNow; Deep-Links in den Finder; "kommt bald"-Zero-State (kein Fake).
  · Querschnitt → zod ergänzt; RBAC (öffentlich vs. erzeuger/staff); Audit auf allen Mutationen;
    Dual-Source-Treue (Seed/localStorage ↔ Supabase/Edge); Disclaimer durchgängig.
  · Doku → docs/spezialmodule/{HOFLADEN_FINDER,PRODUKTVERFUEGBARKEIT,RESERVIERUNG_ABHOLUNG,SAISON_RADAR}.md,
    docs/CORE_BUSINESS_STATE_MACHINES.md, docs/releases/PHASE_STATUS.md, MASTER_INDEX.md aktualisiert.
- Tests/Verifikation:
  · npm run typecheck → 0 Fehler · npm run build → dist/ deterministisch · dev (5409) rendert, Konsole sauber.
  · data.test.ts (Dual-Source-Fallback/Filter/Mapping) · season.test.ts (Saison-Grenzen) ·
    reservation-fsm.test.ts (erlaubte/verbotene Übergänge → 422) grün.
  · Cross-Org-Negativtest: fremde Org = 403 (Produkte + Reservierungen) · valider Aufruf = erwartetes Shape.
  · Kernflow E2E: Finder → Reservierung → Erzeuger confirmed → picked_up vollständig durchlaufbar.
  · Audit-Inspektion: jede Mutation erzeugt Eintrag; Storno-Grund Pflicht. Grep: keine Hex/Secrets/service_role im src/.
- Risiken:
  · Mittel. Erste mutierende Erzeuger-Pfade + Edge Functions + Statusmaschine. Mitigation: additive Migration
    (Rollback = Indizes droppen), Feature-Gate über Rolle, Dual-Source-Fallback, serverseitige FSM-/Org-Checks,
    Cross-Org-Negativtests als blockierendes Gate. Keine destruktiven Schema-Änderungen.
  · Offen (Owner-Freigabe): supabase db push (0004) + functions deploy (3 Functions) — Account/Kosten-Schritt.
- Nächste Welle: WAVE_05 — Owner/KPI-Dashboard (aggregiert reale Mutationsdaten: Reservierungen, aktive Höfe,
  Conversion). Danach WAVE_06 Security-Härtung, WAVE_09 / Phase 4 Track A SB-Bezahl-USP (Geldfluss).
```

---

## 6. Abhängigkeiten & Referenzen

- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, Stop-Regeln), `AGENTS.md` (harte Regeln, Subagenten-Delegation), `PHASEN.md` (Phase 1 → WAVE_04; Go-Live-Gate).
- **Landkarte/Status:** `MASTER_INDEX.md` (Spezialmodule §3, Finalisierung §7), `docs/releases/PHASE_STATUS.md`.
- **Reale Artefakte (Bestand, in dieser Welle erweitert):**
  · `app/src/lib/types.ts` (`Product`, `Farm`, `Reservation`, `Availability`, `ProductCategory`, `FarmFilter`)
  · `app/src/lib/data.ts` (`listFarms`/`getFarm`/`createReservation`, Dual-Source, `mapFarm`)
  · `app/src/lib/geo.ts` (`distanceFromPlz`/`isValidPlz`/PLZ-Zentroide), `app/src/lib/seed.ts` (34 Höfe)
  · `app/src/pages/FinderPage.tsx`, `app/src/components/{FarmCard,FarmDrawer,AvailabilityBadge}.tsx`
  · `app/supabase/migrations/0001_core.sql` (`farms`/`products`/`reservations`/`audit_log` + Enums + RLS deny-by-default)
  · `app/supabase/functions/_shared/{cors,supabaseAdmin,email,stripe}.ts`
- **Neue Artefakte dieser Welle:** `migrations/0004_core_business.sql`; Edge Functions `product-upsert`, `product-set-availability`, `reservation-set-status`; `_shared/{auth,audit}.ts`; `src/lib/season.ts`; `src/pages/{SaisonRadarPage, erzeuger/ManageProductsPage, erzeuger/ReservationsPage}.tsx`; `src/components/erzeuger/{ProductForm,AvailabilityToggle,ReservationRow}.tsx`; Tests `src/lib/__tests__/{data,season,reservation-fsm}.test.ts`.
- **Doku-Outputs:** `docs/spezialmodule/{HOFLADEN_FINDER,PRODUKTVERFUEGBARKEIT,RESERVIERUNG_ABHOLUNG,SAISON_RADAR}.md`, `docs/CORE_BUSINESS_STATE_MACHINES.md`.
- **Folge-Module bauen hierauf auf:** `WAVE_05` (KPI aggregiert diese Mutationsdaten), Phase 4 Track A (`docs/spezialmodule/SB_BEZAHLUNG_USP.md` — ersetzt „Zahlung beim Hof" durch QR→Stripe→Quittung), Track C (Saison-Alerts auf `season.ts`/Verfügbarkeit aufsetzend).
- **Pfeiler dieser Welle:** Org-Boundary/Isolation (B/C) · Zero-State (A/D) · Scope-Transparenz (A/D) · RBAC ohne Lücken (alle) · Audit (B/C) · Testpflicht (alle) · Drilldown-Integrität (A/D Deep-Links).

> Diese Welle ist **additiv**. Jeder kosten-/außenwirksame Schritt (Supabase `db push`, `functions deploy`, echte Keys, Domain) wird **vorab in Klartext angekündigt; erst auf Owner-OK.** Lokaler Dual-Source-Lauf ändert keine Backend-/Account-Ressource.
```
