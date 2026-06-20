# Enterprise-Architektur — LokaleBauernConnect

> **Zweck.** Die Enterprise-Sicht auf LokaleBauernConnect: Mandantenfähigkeit, Skalierungspfad 10 → 300 → 3000, Edge/CDN/Caching, Kostenmodell, Verfügbarkeit/SLA und Ausfallszenarien. Diese Datei ist die verbindliche **Architektur-Wahrheit** für alle Entscheidungen, die über ein einzelnes Feature hinausgehen.
>
> **Stack (fix, Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.** Begründung: ADR `docs/adr/0001-stack-react-supabase-cloudflare.md`.
>
> **Rolle der Plattform:** **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig. Domain owns truth, Plattform owns Aggregation/Vermittlung.
>
> **Verwandte Dokumente:** `docs/ARCHITEKTUR.md` (Komponenten-Übersicht) · `docs/DATABASE_MODEL.md` (Tabellen/RLS) · `docs/security/TENANT_ISOLATION_MODEL.md` · `docs/DEPLOYMENT.md` · `docs/BACKUP_DISASTER_RECOVERY.md` · `docs/MONITORING.md` · `PHASEN.md` (Bauplan) · `MASTER_INDEX.md` (Landkarte).
>
> **Status:** Architektur-Soll. Implementierungsstand je Baustein ist unter „Reifegrad" markiert (✅ live · 🔨 in Arbeit · ⬜ geplant). Der heutige Codestand ist **standalone-first** (ADR 0002): die App läuft mit Seed-Fallback ohne Backend, der Supabase-Umstieg ist reine Konfiguration.

---

## 0 · Architektur-Prinzipien (die 7 Produktionspfeiler, auf Enterprise-Ebene gehoben)

Jede Architekturentscheidung wird gegen diese sieben Pfeiler (aus `CLAUDE.md`) geprüft. Sie sind hier von „Feature-Regel" auf „Systemeigenschaft" gehoben:

1. **Org-Boundary / Datenisolation by default.** Mandantentrennung ist **Datenbank-erzwungen** (RLS deny-by-default), nicht Anwendungslogik. Fremde Org ⇒ 403 / leere Menge, **nie** 200 mit Fremddaten. Gilt ab Migration #1.
2. **Zero-State statt Error.** Leere Daten sind ein gültiger Betriebszustand, kein Fehler. APIs liefern `available:false` + leere Arrays; die UI zeigt „Noch keine Daten" statt 500.
3. **Scope-Transparenz.** Jede aggregierende Response trägt einen `scope` (org / region / Zeitraum / Datenstand). Was der Nutzer sieht, ist nachvollziehbar gerahmt.
4. **RBAC ohne Lücken.** Käufer / Erzeuger / Staff sind auf Identitäts-, Daten- und UI-Ebene getrennt. Plan-Locks zeigen einen konkreten Upgrade-Pfad statt eines toten Endes.
5. **Audit & Verantwortlichkeit.** Jede Mutation ist nachvollziehbar (wer/was/warum). Bei kritischen Aktionen ist `reason` Pflicht. Audit ist **unabschaltbar** und mandantengebunden.
6. **Testpflicht pro Feature.** Isolations-Negativtest (fremde Org = 403), Zero-State, valides Shape — als blockierendes Gate.
7. **Drilldown-Integrität.** Deep-Links transportieren Kontext und bauen **nie** org-fremde URLs.

**Übergreifende Maxime (§0.7):** Jede Lösung wird so gebaut, wie es die Marktführer von übermorgen tun würden — der Skalierungspfad 10 → 300 → 3000 ist in jeder Entscheidung vorweggenommen, nicht nachgerüstet.

---

## 1 · Mandantenfähigkeit (Multi-Tenancy)

LokaleBauernConnect ist von Grund auf **mandantenfähig**. Die Plattform bedient gleichzeitig viele Erzeuger-Organisationen, eine wachsende Käuferschaft und ein zentrales Staff-/Support-Center — strikt voneinander isoliert.

### 1.1 Tenant-Definition

| Begriff | Bedeutung in LokaleBauernConnect |
|---|---|
| **Organisation (`org`)** | Der primäre Mandant. Typischerweise ein **Erzeuger-Betrieb** (ein Hof / Hofladen / eine Manufaktur) mit eigenen Produkten, Verfügbarkeiten, Abholfenstern, Einnahmen und Mitarbeitenden. Träger von `org_id`. |
| **Käufer (Buyer)** | Endkunden-Identität. Käufer sind **nicht** an eine `org` gebunden — sie sind plattformweite Konsumenten, die regionsbasiert Höfe finden und reservieren/zahlen. Eigene Sichtbarkeitsregeln (siehe 1.4). |
| **Staff / Support** | Plattform-Betreiber (ConnectCore-Imperium, EIN gemeinsames Staff-Center). Erhöhte, **explizit** vergebene Rechte (Hof-Verifizierung, Eskalation, Incident-Handling) — niemals impliziter Voll-Zugriff. |
| **Plattform-Org (System-Tenant)** | Reservierte `org_id` für plattformeigene/aggregierte Datensätze (z. B. globale Saison-Stammdaten). Wird wie jeder andere Tenant per RLS geprüft. |

### 1.2 `org_id` + RLS als Fundament

Mandantentrennung wird **in der Datenbank** durchgesetzt, nicht im Anwendungscode:

- **Jede fachliche Tabelle trägt `org_id`** (sowie `created_at`, `updated_at`, `deleted_at` für Soft-Delete). Vorgabe aus `CLAUDE.md` / `AGENTS.md`: SQL nur als additive Migration unter `app/supabase/migrations/`, **RLS deny-by-default + Isolationstest ab Migration #1**.
- **Row Level Security ist deny-by-default.** Ohne passende Policy ist eine Zeile **unsichtbar**. Es gibt keinen „offenen" Default-Zustand.
- **`org_id`-Herleitung serverseitig.** Die wirksame `org_id` kommt aus dem JWT-Claim / der Mitgliedschaft des authentifizierten Nutzers (`auth.uid()` → Membership-Lookup in der Policy), **nie** aus einem vom Client gesendeten Parameter. Ein vom Client behaupteter `org_id`-Filter kann den RLS-Zaun nicht aufweichen.
- **Service-Role ausschließlich in Edge Functions.** Der service-role-Key (der RLS umgeht) existiert nur im Deno-Edge-Kontext, nie im Frontend. Das Frontend nutzt ausschließlich `VITE_`-Public-Keys mit aktivem RLS.

**Policy-Muster (kanonisch, je fachlicher Tabelle):**

```sql
-- Beispiel: products gehören einem Erzeuger-Betrieb (org)
alter table public.products enable row level security;
alter table public.products force row level security;   -- gilt auch für Tabelleneigentümer

-- LESEN: Käufer sehen nur veröffentlichte Produkte sichtbarer Höfe;
--        Erzeuger sehen ihre eigenen; Staff/Owner per expliziter Rolle.
create policy products_select on public.products
  for select using (
    deleted_at is null
    and (
      is_publicly_visible(farm_id)                 -- öffentlich gelistete Höfe (Käufer-Sicht)
      or is_org_member(org_id)                     -- eigene Org (Erzeuger-Mitglied)
      or is_platform_staff()                       -- Staff/Owner (role in ('staff','owner')), explizit
    )
  );

-- SCHREIBEN/ÄNDERN: nur die eigene Org (Erzeuger-Mitglied).
create policy products_write on public.products
  for all using (is_org_member(org_id))
  with check (is_org_member(org_id));
```

> **Real vs. Soll (an Migration angelehnt):** `is_org_member(org_id)` existiert bereits (`0003_marketplace.sql`, `security definer`, prüft `auth.uid()`). `current_org_id()`, `is_platform_staff()` (= `role in ('staff','owner')`) und `is_publicly_visible(farm_id)` sind als kapselnde `security definer`-Helfer **vorgesehen** (Soll/künftige Migration — siehe `ROLE_AND_PERMISSION_MODEL.md` §3). Das Rollen-Enum ist **`user_role`** mit den Werten `kaeufer | erzeuger | staff | owner`; es gibt **keine** Sub-Rollen `erzeuger_admin`/`erzeuger_editor` und **keine** Helfer `has_org_role()`/`has_platform_role()`. Diese Helfer kapseln die Membership/Rollen-Auflösung **einmal** und sind die einzige autoritative Quelle der wirksamen `org_id` — kein Client-Input.

### 1.3 Isolations-Testpflicht (blockierendes Gate)

Kein Merge ohne grünen Isolationstest (`AGENTS.md`, `qa-tester`). Pflicht-Matrix je Tabelle/Endpoint:

| Fall | Erwartung |
|---|---|
| Eigene Org liest eigene Daten | 200, eigenes Shape |
| Org A liest Org-B-Zeile (direkter ID-Zugriff) | leere Menge / 403 — **nie** Fremddaten |
| Org A schreibt in Org-B-Zeile | abgelehnt (`with check` schlägt fehl) |
| Käufer liest interne Erzeuger-/Staff-Felder | gefiltert / nicht sichtbar |
| Unauthentifiziert liest geschützte Tabelle | leere Menge / 401 |
| Leere Org (Zero-State) | 200, leere Arrays, kein 500 |

Diese Tests laufen als CI-Gate (Phase 2, Gate C — Tenant-Isolation) und blockieren Deployment. Details: `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md`.

### 1.4 Drei getrennte Welten (Käufer / Erzeuger / Staff)

Sessions und Berechtigungen der drei Welten sind strikt getrennt (`CLAUDE.md` Produkt-Abgrenzung):

- **Käufer-Welt:** öffentliche/regionsbasierte Sicht (Hofladen-Finder, Verfügbarkeit, Reservierung, SB-Bezahlung). Sieht nur veröffentlichte, freigegebene Hof- und Produktdaten. Kein Zugriff auf Erzeuger-Innenleben (Einnahmen, Schwund, Bestand-Roh).
- **Erzeuger-Welt:** Self-Service der eigenen `org` (Produkt-/Verfügbarkeits-/Abholfenster-Pflege, eigene Reservierungen, eigene SB-Einnahmen). Sieht **nur** die eigene `org`.
- **Staff-Welt:** Betriebssicht (Hof-Verifizierung, Eskalation, Incident-Handling, Audit-Einsicht). Jede Sicht über die eigene Identität hinaus ist **explizit rollengebunden** und auditiert — kein impliziter Voll-Zugriff.

> **Verbot (nicht verhandelbar):** keine Schattenwahrheiten. Die Plattform aggregiert, die Domain (der jeweilige Hof) besitzt die Wahrheit. Käufer-, Erzeuger- und Staff-Sichten greifen auf dieselben RLS-geschützten Tabellen zu — die Trennung entsteht durch Policies, nicht durch separate „Schatten"-Datentöpfe.

### 1.5 Plan-Gating (kommerzielle Mandanten-Dimension)

Über die Datenisolation legt sich eine **kommerzielle** Schicht. Kanonische Imperium-Pläne: `demo`, `basis`, `plus`, `pro`, `individuell` (`CLAUDE.md`). „Enterprise" = Funktionsniveau innerhalb `individuell`, kein öffentlicher Plan.

- **Entitlements serverseitig.** Der wirksame Plan einer `org` und die freigeschalteten Features werden serverseitig aufgelöst (Quelle: Stripe-Webhook → DB-Entitlement-Tabelle, idempotent). Das Frontend **spiegelt** nur — es entscheidet nichts.
- **Plan-Locks mit Upgrade-Pfad.** Eine gesperrte Funktion zeigt einen konkreten Upgrade-Weg, keinen toten Button (Pfeiler 4).
- **Trennung von Isolation und Entitlement.** RLS sichert „wessen Daten", Plan-Gating sichert „welche Features" — zwei orthogonale Achsen, nie vermischt.

---

## 2 · System-Schichten (Komponentenlandschaft)

```
                        ┌───────────────────────────────────────────────┐
   Käufer / Erzeuger    │              Cloudflare Edge (global)          │
   Browser / PWA  ─────▶│  Pages (statisch: web/ Landing, app/ React)   │
                        │  Workers (Edge-Logik) · CDN-Cache · WAF        │
                        │  Turnstile (Bot-Abwehr) · TLS/HSTS · Rate-Limit│
                        └───────────────┬───────────────────────────────┘
                                        │  Public anon key (RLS aktiv)
                                        │  bzw. signierte Worker-Calls
                                        ▼
                        ┌───────────────────────────────────────────────┐
                        │            Supabase (EU-Region)                │
                        │  ┌──────────────┐  ┌──────────────────────┐   │
                        │  │ PostgREST    │  │ Edge Functions (Deno) │   │
                        │  │ (Auto-API,   │  │ service role · Zod ·   │   │
                        │  │  RLS-gebunden)│  │ Audit · Stripe-Hook   │   │
                        │  └──────┬───────┘  └─────────┬─────────────┘   │
                        │         ▼                    ▼                 │
                        │  ┌─────────────────────────────────────────┐  │
                        │  │  Postgres  (RLS deny-by-default)         │  │
                        │  │  orgs · profiles · farms · products ·    │  │
                        │  │  reservations · sb_payments · audit_log  │  │
                        │  └─────────────────────────────────────────┘  │
                        │  Auth (JWT/MFA) · Storage (Hof-Bilder) · PITR │
                        └───────────────┬───────────────────────────────┘
                                        │  Webhook (signiert, idempotent)
                                        ▼
                        ┌───────────────────────────────────────────────┐
                        │   Stripe (+ Connect)  ·  SB-Bezahl-USP         │
                        │   Abo (Erzeuger) · QR→Zahlung→Quittung am Stand│
                        └───────────────────────────────────────────────┘
```

### 2.1 Edge / Frontend-Schicht (Cloudflare) — Reifegrad ✅ (Landing/App build grün)

- **Cloudflare Pages** hostet zwei Artefakte: die statische Editorial-Landing (`web/`) und die React-App (`app/`, Vite-Build). Beide self-contained, Secret-frei, CDN-ausgeliefert.
- **Cloudflare Workers** für Edge-Logik, die nicht in die DB gehört: Geo-Routing, Cache-Komposition, leichte Aggregations-/Read-Through-Caches, signierte Calls zu Edge Functions, Header-Härtung.
- **Turnstile** vor allen öffentlichen Formularen (Reservierung, Waitlist, Kontakt) — Bot-Abwehr ohne CAPTCHA-Friktion.
- **WAF + Rate-Limiting** vor der gesamten Origin-Fläche. Security-Header/CSP/HSTS auf Cloudflare-Ebene (Phase 2).

### 2.2 Anwendungs-Schicht (React + Vite + TS strict) — Reifegrad ✅ (standalone-first)

Aktueller Code (`app/src/`): `App.tsx`, `pages/FinderPage.tsx`, `components/{FarmCard,FarmDrawer,AvailabilityBadge}.tsx`, `lib/{data,geo,seed,supabase,types}.ts`, `styles/theme.css`.

- **Backend-agnostische Datenschicht (`app/src/lib/data.ts`).** Eine API, zwei Quellen: Supabase (sobald `VITE_SUPABASE_*` gesetzt) **oder** Seed-Fallback. Die UI ist quellenunabhängig; der Umstieg ist reine Konfiguration (ADR 0002). Reservierung schreibt nach Supabase bzw. lokal — kein toter Button, kein Datenverlust.
- **Typisierte Domäne (`app/src/lib/types.ts`).** `Farm`, `Product`, `Reservation`, `ProductCategory`, `FarmType`, `Availability`, `FarmFilter`. Strict-TS erzwingt Vollständigkeit an der UI-Grenze.
- **Design-System-Tokens (`app/src/styles/theme.css`, Editorial-Skin).** Keine hardcodierten Farben, keine Deko-Emojis in Prod-UI (`AGENTS.md`).
- **Absorptionsfähig.** Struktur (`lib`/`components`/`pages`) ist so geschnitten, dass die App später ohne Rewrite in einen geteilten `packages/core`+`ui`-Workspace gehoben werden kann (ADR 0002) — Imperium-Beschleuniger.

### 2.3 Daten-/API-Schicht (Supabase Postgres + PostgREST) — Reifegrad 🔨

- **PostgREST** liefert die Auto-REST/GraphQL-Schicht direkt aus dem Schema. Jeder Zugriff ist **RLS-gebunden** — die API kann nichts freigeben, was die Policy nicht erlaubt.
- **Real migrierte Tabellen** (`0001_core.sql … 0004_onboarding.sql`): `orgs`, `profiles`, `farms`, `products`, `reservations`, `waitlist`, `audit_log` (0001); `subscriptions`, `sb_payments`, `payment_events` (0002); `org_members`, `org_locations`, `reviews`, `bounties`, `credits_ledger` (0003); `farm_applications` (0004). **Verfügbarkeit ist die Enum-Spalte `products.availability`, keine eigene `availability`-Tabelle**; Entitlements liegen in `subscriptions` (kein `entitlements`-Table); SB-Quittungen werden serverseitig erzeugt (kein `receipts`-Table). Jede mandantengebundene Tabelle trägt `org_id` + RLS (Zeitstempel/`deleted_at` je Tabelle, siehe `DATABASE_MODEL.md` §4). Schema-Wahrheit: `docs/DATABASE_MODEL.md`.
- **Migrations-Disziplin:** nur additive Migrationen, jede mit Rollback-Pfad; kein destruktives In-Place-Schema.

### 2.4 Edge-Functions-Schicht (Supabase, Deno) — Reifegrad ⬜

Serverseitige Logik, die service-role braucht oder externe Effekte hat:

- **Zod-Validierung an der Grenze** jeder Function (Eingabe-Shape, Bereichsgrenzen).
- **Rechteprüfung** zusätzlich zur RLS (Defense-in-Depth: Function prüft Rolle/Plan, RLS prüft Zeile).
- **Audit-Schreibung** für jede Mutation (`audit_log`, mandantengebunden, unabschaltbar).
- **Turnstile-Verifikation** bei öffentlichen Flows.
- **Stripe-Webhook:** **EIN** signaturgeprüfter, **idempotenter** Handler als alleinige Wahrheit für Entitlements/Zahlungen. Idempotenz-Schlüssel = Stripe-Event-ID (Unique-Constraint) → Doppelzustellung ist folgenlos.
- **SB-Bezahl-USP (Phase 4 Track A):** QR am Stand → Edge Function erzeugt Stripe-PaymentIntent → Zahlung → idempotenter Webhook bucht Einnahme + erzeugt Quittung. Plattform = Zahlungsanbindung/Vermittler, **kein Eigenverkauf**.

### 2.5 Externe Dienste

- **Stripe (+ Connect):** Erzeuger-Abo + SB-Transaktionsgebühr; Connect für Auszahlung an Erzeuger-Betriebe. Entitlements **nur** serverseitig.
- **Karten (Phase 4 Track B):** Leaflet/MapLibre auf OpenStreetMap-Tiles (kein Vendor-Lock, kostenarm). Heute: Distanzberechnung via `app/src/lib/geo.ts` (PLZ-Zentroide, ehrlich kommuniziert bei unbekannter PLZ).
- **Observability (Phase 1 WAVE_13):** Sentry (Frontend + Edge), strukturierte Logs, Health-Checks.

---

## 3 · Skalierungspfad 10 → 300 → 3000

Der Skalierungspfad ist die zentrale Enterprise-Anforderung (`CLAUDE.md` §0.3/§0.7). Die Architektur ist so gewählt, dass **Skalierung = Konfiguration** ist, kein Re-Architecting. Der Sprung um Größenordnungen wird vorweggenommen, nicht nachgerüstet.

> **Maßgrößen:** „Höfe" = aktive Erzeuger-Orgs (zahlende Mandanten). Käuferzahl skaliert i. d. R. um Faktor 100–1000 darüber (regionaler Endkundenmarkt). Last ist **lesedominiert** (Finder/Verfügbarkeit) mit punktuellen Schreib-Spitzen (Reservierung, SB-Zahlung zu Markt-/Abholzeiten).

### 3.1 Stufe 10 Höfe — „Spielbar / erste zahlende Kunden" (Gate 10)

- **Ziel:** Marktstart-Minimum (`PHASEN.md`). Funktion vor Optimierung.
- **Architektur:** Supabase Free/Pro-Einstieg, Cloudflare Free/Pro. Ein Postgres-Primary genügt vielfach.
- **Daten:** Volltabellen-Scans sind bei dieser Größe unkritisch — trotzdem **Index-Disziplin ab Migration #1** (kein Nachrüst-Schuld). Tatsächlich migrierte Hot-Path-Indizes (0001–0004): `farms(plz)`, `farms(org_id)`, `farms(deleted_at) WHERE deleted_at IS NULL`, `products(farm_id)`, `products(category)`, `reservations(farm_id)`, `reservations(status)`, `subscriptions(org_id)`, `sb_payments(org_id/farm_id/status)`, je `org_id`/`plz`/`status` auf den 0003/0004-Tabellen (vollständige Liste: `DATABASE_MODEL.md` §5). **Noch nicht migriert (Skalierungsausbau, Stufe 300+):** Geo-Index `(lat,lng)`, GIN auf `farms.categories`, zusammengesetzte `(org_id,status,created_at)`- und `audit_log`-Indizes.
- **Caching:** Cloudflare-CDN für statische Assets; Finder-Reads kurz cachebar (siehe §4).
- **Risiko-Fokus:** Korrektheit von RLS + Webhook-Idempotenz, nicht Durchsatz.

### 3.2 Stufe 300 Höfe — „regionale Marktdurchdringung"

- **Treiber:** mehrere Regionen, deutlich mehr Käufer, Verfügbarkeits-Updates in Spitzen, erste echte Concurrency auf Reservierung/SB-Zahlung.
- **Daten-Skalierung (Phase 4 Track E):**
  - **Pagination + Keyset-Cursor** statt `offset` (stabil bei tiefen Seiten).
  - **N+1 eliminieren:** Höfe + Produkte in einem Roundtrip (heute bereits: `select('*, products(*)')` in `data.ts`) — als Muster festschreiben.
  - **Geo-Indizierung:** für „in der Nähe" PostGIS/`earthdistance` mit GiST-Index statt In-App-Distanzschleife. Read-Pfad wird DB-seitig sortiert/limitiert.
  - **Materialisierte Aggregate** für teure Dashboards (Erzeuger-KPIs, Owner-Dashboard) statt Live-Aggregation auf jedem Request — periodisch/triggerbasiert aktualisiert.
- **Lese-Skalierung:**
  - **Edge-Read-Cache** (Cloudflare Workers + Cache API / KV) für quasi-statische Finder-/Saison-Daten mit kurzer TTL + **stale-while-revalidate**.
  - **Supabase Read-Replica** für schwere Read-Last (Finder, Berichte) — Schreibpfad bleibt Primary.
- **Schreib-Skalierung:** Reservierung/SB-Zahlung über Edge Functions mit kurzer Transaktion; Bestands-Dekrement atomar (kein „Überreservieren"). Schwere/asynchrone Effekte (E-Mail, Quittungs-PDF, Benachrichtigungen) **entkoppeln** (Queue/Background-Function), nicht im Request-Pfad.
- **Plan:** Supabase Pro mit dimensionierter Compute-Instanz; Cloudflare Pro/Business.

### 3.3 Stufe 3000 Höfe — „überregionaler Marktführer"

- **Treiber:** überregional/national, hohe Käufer-Concurrency, viele Regionen parallel, SB-Zahlungs-Volumen relevant.
- **Daten-Skalierung:**
  - **Partitionierung** großer, append-lastiger Tabellen (`audit_log`, `reservations`, `sb_payments`) nach Zeit (range) und/oder Region — kleine, heiße Partitionen, schnelle Wartung.
  - **Connection-Pooling** zwingend (Supabase Supavisor/PgBouncer im Transaction-Mode) — viele kurzlebige Edge-Function-Verbindungen dürfen den Primary nicht erschöpfen.
  - **Mehrere Read-Replicas**, Read-Routing nach Region; Reporting auf dedizierter Replica, nie auf dem Primary.
  - **Heiße/kalte Trennung:** abgelaufene Reservierungen/alte Audit-Daten in Archiv-Partitionen/Cold-Storage; Hot-Set bleibt klein.
- **Edge-Skalierung:** aggressives Edge-Caching regionaler Finder-Sichten; Cache-Invalidierung gezielt per Tag (Cache-Tags je `org_id`/Region) bei Verfügbarkeits-/Produktänderung.
- **Compute:** Supabase-Compute hochskaliert (vertikal) + Replicas (horizontal-read); Edge Functions skalieren elastisch (serverless) ohne Kapazitätsplanung.
- **Mandanten-Hygiene:** „Noisy-Neighbor"-Schutz — Rate-Limits **pro `org_id`** und pro Käufer-IP, damit ein einzelner Mandant/Bot die Plattform nicht ausbremst.

### 3.4 Skalierungs-Invarianten (gelten auf allen Stufen)

| Invariante | Warum sie auf jeder Stufe hält |
|---|---|
| RLS deny-by-default | Mehr Mandanten ⇒ mehr Isolationsfläche; die Garantie darf nie aufweichen. |
| `org_id` in jeder fachlichen Query | Partitionierung/Sharding/Replica-Routing setzen `org_id`/Region als Schlüssel voraus. |
| Webhook-Idempotenz | Höheres Volumen ⇒ mehr Retries/Doppelzustellungen; Idempotenz hält Buchungen korrekt. |
| Reads cachebar, Writes auditiert | Lesedominierte Last skaliert über Cache; Schreiblast bleibt klein + nachvollziehbar. |
| Keine N+1 / keine `offset`-Tiefpaginierung | Lineare Kostendegradation würde bei 3000 explodieren. |
| Async-Entkopplung schwerer Effekte | Request-Latenz bleibt konstant, unabhängig von Mandantenzahl. |

> **Anti-Pattern (verboten):** „funktioniert bei 10, optimieren wir bei 300". Indizes, RLS, Idempotenz, Pagination-Muster und Audit werden **ab Tag 1** gebaut. Nachrüsten unter Last ist teurer und riskanter — das widerspricht §0.3/§0.7.

---

## 4 · Edge / CDN / Caching-Strategie

Cloudflare ist die globale Eintrittsschicht. Ziel: **schnellste mögliche Auslieferung** bei korrekter Mandantentrennung — Cache darf **nie** mandantenfremde oder personenbezogene Daten ausliefern.

### 4.1 Cache-Klassen

| Klasse | Beispiele | Strategie | TTL |
|---|---|---|---|
| **Statische Assets** | JS/CSS-Bundles (gehasht), Schriften, Icons, Landing | Immutable, am Edge gecacht | lang (Jahr, durch Content-Hash invalidiert) |
| **Hof-Bilder** (Storage) | Produkt-/Hofbilder | Edge-CDN, transformierbar; öffentlich freigegeben | mittel |
| **Quasi-statische Reads** | Saison-Radar-Stammdaten, Kategorien, regionale Hofliste | Edge-Read-Cache (Worker + Cache API/KV), **stale-while-revalidate** | kurz (z. B. 30–120 s) |
| **Personalisiert / mandantengebunden** | Erzeuger-Dashboard, eigene Reservierungen, Einnahmen, Audit | **Nie cachen.** `Cache-Control: private, no-store` | 0 |
| **Mutationen** | Reservierung, SB-Zahlung, Pflege | Nie cachen; durchgereicht zur Edge Function | 0 |

### 4.2 Cache-Sicherheitsregeln (nicht verhandelbar)

- **Mandanten-/personenbezogene Antworten werden nie am Edge gecacht.** Default für authentifizierte Pfade = `private, no-store`. Cache nur für **explizit öffentliche** Daten.
- **Cache-Key enthält die Sicht-Dimension** (Region/PLZ, Kategorie-Filter, Sprache) — nie geteilter Cache über unterschiedliche Sichten hinweg, der Fremddaten lecken könnte.
- **Gezielte Invalidierung per Cache-Tag:** Bei Verfügbarkeits-/Produkt-/Hofänderung wird nur der betroffene `org_id`/Region-Tag invalidiert (Surrogate-Keys) — kein globaler Purge.
- **stale-while-revalidate** für Finder-Reads: der Käufer sieht sofort eine (leicht ältere) Liste, der Edge revalidiert im Hintergrund → niedrige Latenz ohne Stale-Schmerz.

### 4.3 Latenz- & Routing-Ziele

- Statische Auslieferung von Cloudflares globalem PoP-Netz → niedrige TTFB weltweit.
- Daten-Reads bevorzugt aus EU-Region (Supabase EU, DSGVO) — Edge-Cache überbrückt Distanz für öffentliche Sichten.
- **Performance-Budget (Richtwerte, Phase 1 WAVE_10/11):** Landing LCP < 2,5 s (4G), Finder-Erstanzeige < 1,5 s bei warmem Edge-Cache, API-Read p95 < 300 ms (gecacht) / < 800 ms (DB), Reservierung/SB-Zahlung-Roundtrip p95 < 1,2 s.

---

## 5 · Kostenmodell (Cloudflare + Supabase)

Leitlinie (§0.3 Wirtschaftlichkeit): **kostenarmer Start, Pay-as-you-grow, keine Fixkosten-Falle, Skalierung 10 → 3000 mitgedacht.** Die managed/serverless Wahl (ADR 0001) vermeidet Server-Betriebskosten vollständig.

### 5.1 Cloudflare

| Komponente | Kostentreiber | 10 Höfe | 300 Höfe | 3000 Höfe |
|---|---|---|---|---|
| Pages (Hosting) | Builds, Bandbreite | Free/Pro | Pro | Pro/Business |
| Workers | Requests/CPU-Zeit | Free-Tier reicht oft | bezahlte Worker-Pakete | Workers + KV/Cache nach Volumen |
| WAF / Rate-Limit | Regelumfang | Basis | Pro-Regeln | Business (erweiterte WAF, Bot-Mgmt) |
| Turnstile | — | kostenlos | kostenlos | kostenlos |
| Bandbreite | Egress | durch Cache niedrig | Cache hält Egress flach | Cache + Bilder-Optimierung dämpfen |

**Hebel:** Aggressives Edge-Caching senkt Origin-Requests und damit Supabase-Last **und** Bandbreite gleichzeitig — der wirtschaftlich stärkste Hebel.

### 5.2 Supabase

| Komponente | Kostentreiber | 10 Höfe | 300 Höfe | 3000 Höfe |
|---|---|---|---|---|
| Postgres-Compute | Instanzgröße (CPU/RAM) | klein (Free/Pro-Einstieg) | dimensionierte Pro-Instanz | hochskaliert + Read-Replicas |
| Storage | Hofbilder (GB) | gering | mittel (über CDN ausgeliefert) | Bilder-Transform + CDN drücken Kosten |
| Edge Functions | Invocations | gering | moderat | volumengetrieben, elastisch |
| Bandbreite (DB-Egress) | Read-Volumen | gering | durch Edge-Cache gedämpft | Cache + Replica-Routing dämpfen |
| Auth (MAU) | aktive Nutzer | im Free-Rahmen | wachsend, planabhängig | Hauptkostenposten bei großer Käuferbasis |

**Hebel:**
- **Read-Cache am Edge** reduziert DB-Compute/Egress → größter Supabase-Spar-Hebel.
- **Materialisierte Aggregate** statt Live-Aggregation → weniger teure Queries.
- **Bilder über CDN** (nicht direkt aus Storage je Request) → niedriger Storage-Egress.
- **Soft-Delete + Archiv-Partitionen** halten den heißen Datensatz klein → günstigere Queries/Backups.

### 5.3 Stripe

- **Transaktionsbasiert** (Gebühr je Zahlung), kein Fixum → skaliert mit Umsatz, nicht mit Höfen.
- **SB-Bezahl-USP ist umsatzpositiv:** kleine Plattform-Transaktionsgebühr je SB-Zahlung deckt die Stripe-Kosten und ist eigener Erlöskanal (`CLAUDE.md` USP). Das passt §0.3: der Pfad, der dem Owner am meisten bringt — sofern optimal — wird gewählt.

### 5.4 Kosten-Governance

- **Kosten-/Account-/Deploy-Schritte werden vorab in Klartext angekündigt** — erst auf Owner-OK (`CLAUDE.md`, Stop-Regeln). Ein Tier-Wechsel (z. B. Supabase-Compute-Upgrade, Cloudflare Business) ist eine Owner-Entscheidung.
- **Kosten-Telemetrie:** Usage-Dashboards (Supabase/Cloudflare) im Monitoring (Phase 1 WAVE_13) — Kostenanomalien (z. B. Egress-Spike durch Cache-Miss-Welle) sind ein Alarm, kein Monatsend-Schock.
- **`performance-cost-optimizer`-Subagent** prüft teure Pfade auf günstigere Muster ohne Sicherheits-/Designverlust (`AGENTS.md`).

---

## 6 · Verfügbarkeit & SLA

### 6.1 Verfügbarkeits-Architektur

Verfügbarkeit ist primär **eingekauft** (managed, hochverfügbar) statt selbst betrieben — bewusste Konsequenz von ADR 0001:

- **Cloudflare:** global verteiltes Edge-Netz; statische Auslieferung bleibt verfügbar, selbst wenn die Origin (Supabase) Probleme hat (für gecachte/öffentliche Inhalte).
- **Supabase (managed Postgres):** automatisierte Backups + **Point-in-Time-Recovery (PITR)**, managed Patching/Failover je Plan. Kein manuelles HA-Runbook nötig (im Gegensatz zum entfallenen Hetzner-Pfad).
- **Stateless Frontend/Edge:** keine Server-Session-Affinität; jeder Edge-Knoten ist gleichwertig → horizontale Verfügbarkeit out-of-the-box.

### 6.2 Service-Ziele (intern, vor öffentlichem SLA-Versprechen)

> Diese Zielwerte sind **interne Betriebsziele** und der Rahmen für ein späteres öffentliches SLA (z. B. im Plan `individuell`). Vor jedem öffentlichen SLA-Versprechen: Owner-Freigabe.

| Metrik | Ziel (Start) | Ziel (Skalierung) |
|---|---|---|
| Plattform-Verfügbarkeit (öffentliche Reads) | ≥ 99,9 % | ≥ 99,95 % |
| Schreibpfad (Reservierung/SB-Zahlung) | ≥ 99,5 % | ≥ 99,9 % |
| RPO (max. Datenverlust) | ≤ 5 min (PITR) | ≤ 1 min |
| RTO (max. Wiederherstellzeit) | ≤ 1 h | ≤ 30 min |
| API-Read p95 | < 800 ms (DB) / < 300 ms (Cache) | gehalten unter Last |

### 6.3 Degradationsstufen (Graceful Degradation statt Totalausfall)

Die Architektur ist so geschnitten, dass Teilausfälle Teilbetrieb erlauben — niemals ein Totalausfall, wo ein Teilbetrieb möglich ist:

1. **Voll:** alle Schichten gesund.
2. **Read-Only-Degradation:** Schreibpfad gestört (Edge Function/DB-Write) → Finder/Verfügbarkeit/Saison aus Edge-Cache **lesbar**; Reservierung zeigt ehrliche „aktuell nicht verfügbar"-Meldung statt 500 (Zero-State-Disziplin, Pfeiler 2).
3. **Cache-Only:** Origin nicht erreichbar → gecachte öffentliche Sichten bleiben am Edge; personalisierte Bereiche melden klar Nicht-Verfügbarkeit.
4. **Wartungsmodus:** statische Wartungsseite (Cloudflare Pages) bei geplanten Eingriffen.

> Das standalone-first-Datenlayer (`app/src/lib/data.ts`) ist hier ein Architektur-Vorteil: die UI ist quellenunabhängig und bricht bei Backend-Problemen nicht hart — sie degradiert kontrolliert.

---

## 7 · Ausfallszenarien (Failure Modes & Reaktion)

Für jedes Szenario: **Erkennung → sofortige Wirkung → Reaktion → Wiederherstellung.** Operative Detail-Schritte: `docs/INCIDENT_RUNBOOK.md`. Wiederherstellung: `docs/BACKUP_DISASTER_RECOVERY.md`.

| # | Szenario | Erkennung | Sofortige Wirkung (Architektur) | Reaktion / Wiederherstellung |
|---|---|---|---|---|
| 1 | **Supabase-DB nicht erreichbar / Read-Latenz-Spike** | Health-Check, Sentry, p95-Alarm | Öffentliche Reads aus Edge-Cache (stale-while-revalidate) bleiben verfügbar; Schreibpfad meldet Zero-State, nicht 500 | Managed Failover abwarten; bei anhaltender Störung Wartungsmodus; nach Recovery Cache-Revalidierung |
| 2 | **Daten korrumpiert / fehlerhafte Migration / versehentliches Löschen** | Datenintegritäts-Check, Audit-Anomalie, Nutzer-Report | Soft-Delete (`deleted_at`) verhindert Hard-Loss bei App-Bugs | **PITR** auf Zeitpunkt vor dem Fehler; Migration hat Rollback-Pfad (Pflicht); Owner-Freigabe vor Restore |
| 3 | **Edge Function down / Deploy-Regression** | Function-Error-Rate, Webhook-Fehlschläge | Lese-UI über PostgREST/Cache stabil; betroffene Schreibaktionen degradieren | Rollback auf letzte gute Function-Version (Cloudflare/Supabase-Deploy-Historie); Feature-Flag deaktiviert betroffenen Pfad |
| 4 | **Stripe-Webhook-Doppelzustellung / -Verlust** | Idempotenz-Logs, Reconciliation-Job | **Idempotenter Handler** (Event-ID Unique) ⇒ Doppel = no-op; kein Doppel-Entitlement, keine Doppelbuchung | Bei Verlust: Stripe-Replay des Events; täglicher Reconciliation-Abgleich Stripe ↔ DB |
| 5 | **Cloudflare-Edge-Störung (Region)** | Synthetic-Monitoring, Statusseite | Anycast routet auf gesunde PoPs; globale Verteilung absorbiert regionalen Ausfall | Abwarten/eskalieren; DNS-/Routing fällt automatisch um |
| 6 | **DDoS / Bot-Flut / Scraping** | WAF-Metriken, Rate-Limit-Trefferquote | WAF + Rate-Limit (pro IP **und** pro `org_id`) + Turnstile blocken am Edge, vor der Origin | WAF-Regeln verschärfen; „Under Attack"-Modus; Origin bleibt geschützt |
| 7 | **Verdacht auf Mandanten-Leck (Fremddaten-Sicht)** | Isolations-Test-Regression, Audit-Review, Report | RLS deny-by-default ist die erste Verteidigung; betroffener Pfad per Feature-Flag sofort sperrbar | **Security-Incident** (`security-auditor`): Policy fixen, Isolationstest erweitern, Audit-Forensik, Owner-Meldung; ggf. DSGVO-Meldepflicht prüfen |
| 8 | **Secret-Leak (Key in Log/Code)** | Secret-Scanning, Log-Review | Frontend hat nur Public-anon-Key (RLS aktiv) → begrenzter Blast-Radius; service-role nie im Client | **Rotation** (`docs/security/SECRET_ROTATION.md`); kompromittierten Key invalidieren; Audit auf Missbrauch; Owner-Meldung |
| 9 | **Lastspitze (Markttag/Saison-Peak)** | Auto-Metriken, Latenz-Alarm | Edge-Cache + Read-Replica absorbieren Lesespitze; async-entkoppelte Effekte stauen statt zu blockieren | Compute kurzfristig hochskalieren (Owner-Freigabe bei Tier-Wechsel); Cache-TTL temporär anheben |
| 10 | **Kosten-Anomalie (Egress/Invocation-Spike)** | Usage-Dashboard-Alarm | (kein Funktionsausfall) | Ursache (Cache-Miss-Welle, Scraper, Loop) eingrenzen + beheben; Cache/WAF nachziehen; §5.4 |

### 7.1 Backup & Recovery (Kurzfassung)

- **Backups:** Supabase managed Backups + **PITR** (Recovery auf Sekunde/Minute genau im Aufbewahrungsfenster).
- **Soft-Delete:** `deleted_at` auf jeder fachlichen Tabelle → versehentliches Löschen ist reversibel ohne Restore.
- **Migrations-Rollback:** jede Migration mit dokumentiertem Rückwärtspfad (`CLAUDE.md`: „keine Migration ohne Rollback").
- **Restore-Drills:** periodische Wiederherstellungs-Übung als Teil des Ops-Gates (Phase 3) — ein ungetesteter Restore ist kein Restore.
- **Owner-Freigabe** vor produktivem Restore (irreversibler/datenverändernder Schritt).

### 7.2 Beobachtbarkeit als Vorbedingung

Kein Ausfallszenario ist beherrschbar ohne Erkennung. Pflicht (Phase 1 WAVE_13, Detail `docs/MONITORING.md`):

- **Health-Endpoint** (DB-Reachability, Function-Status, Version, Uptime).
- **Sentry** (Frontend + Edge) mit Release-Tagging.
- **Strukturierte Logs** (mandantengebunden, **keine Secrets**, keine unmaskierten Käufer-PII).
- **Synthetic-Monitoring** der Kernpfade (Finder → Reservierung → SB-Zahlung).
- **Alarme** auf p95-Latenz, Error-Rate, Webhook-Fehlschlag, Isolations-Test-Regression, Kosten-Anomalie.

---

## 8 · Architektur-Entscheidungs-Verweise & offene Punkte

### 8.1 Verankerte Entscheidungen (ADRs)

| ADR | Inhalt | Relevanz hier |
|---|---|---|
| `0001-stack-react-supabase-cloudflare.md` | Managed/serverless Stack, kein Hetzner | Begründet Verfügbarkeits-, Kosten- und Skalierungsmodell dieser Datei |
| `0002-app-architektur-standalone-first.md` | Standalone-first, backend-agnostische Datenschicht | Begründet Degradationsfähigkeit und reibungslosen Supabase-Umstieg |
| `docs/adr/0003-sb-bezahlung-usp.md` (⬜ geplant, Phase 4) | SB-Bezahl-USP-Architektur | Zahlungs-/Idempotenz-/Vermittler-Modell des USP |

### 8.2 Owner-Entscheidungen (Stop-Regeln — vorab Freigabe)

- Supabase-Projekt-Anlage (EU) + produktiver Go-Live (Account/Kosten/Domain).
- Compute-Tier-Wechsel / Read-Replica-Aktivierung (Kosten).
- Öffentliches SLA-Versprechen (z. B. Plan `individuell`).
- Native-App (Capacitor/Expo) statt PWA — nur bei belegtem Bedarf (ADR 0001).
- Jeder produktive Restore (datenverändernd, irreversibel).

### 8.3 Offene Architektur-Fragen (→ `.claude/memory/open-questions.md`)

- Read-Replica-Schwelle exakt festnageln (Last-/Kostenmessung bei ~300 Höfen).
- PostGIS vs. `earthdistance` für Geo-„in der Nähe" bei 3000 Höfen (Track B/E) — Benchmark vor Festlegung.
- Cache-Tag-Granularität (`org_id` vs. Region) für Invalidierung unter Last.

---

> **Wartungshinweis.** Diese Datei ist lebendig. Relevante Architekturänderung ⇒ hier aktualisieren **und** `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` + (bei Tragweite) neues ADR. Widerlegte Annahme wird **korrigiert, nicht dupliziert** (`AGENTS.md`, Lern-Loop).
