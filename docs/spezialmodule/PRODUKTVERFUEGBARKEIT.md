# Spezialmodul — Produktverfügbarkeit (Erzeuger-Selbstpflege)

> **Spezialschicht, kein Kern.** Die Produktverfügbarkeit ist eine der vier Säulen des Kernprodukts (`PHASEN.md` WAVE_04 · Track B Verfügbarkeit / Phase 4 Track D Erzeuger-Self-Service). Sie sagt Käufern **vor der Fahrt** zum Hof, was es gerade gibt — und gibt Erzeugern ein Werkzeug, das sie in Sekunden vom Feld oder Hofladen aus pflegen.
>
> **Vermittler-Rolle:** Die Plattform stellt Verfügbarkeit **dar**, sie verkauft nicht und garantiert keine Mengen. Die Wahrheit über ein Produkt **besitzt der Hof** (Domain owns truth, Plattform owns aggregation). Disclaimer durchgängig: *„Angaben ohne Gewähr — der Hof pflegt selbst. Bitte rufe bei knappen Mengen kurz an."*
>
> **Status (Stand 2026-06-19):** Modell + Anzeige (`available/low/soon/out` + `seasonal`) sind in Schema (`supabase/migrations/0001_core.sql`), Typen (`src/lib/types.ts`) und UI (`src/components/AvailabilityBadge.tsx`) **live**. Der numerische **Bestand** (`stock_qty`) und der **Erzeuger-Self-Service-Editor** sind in dieser Spec definiert und werden als **additive Migration `0002_availability_stock.sql`** + Editor-Strecke umgesetzt (WAVE_04 B / Phase 4 Track D). Diese Datei ist die verbindliche Bau-Spezifikation dafür.

---

## 1 · Zweck & Scope

### 1.1 Problem
Regionale Höfe haben schwankende, oft tagesaktuelle Bestände (Erdbeeren ausverkauft, Honig bald wieder da, Eier nur noch wenige). Käufer fahren **umsonst**, wenn die Webseite zwei Wochen alt ist. Erzeuger haben **keine Zeit** für ein kompliziertes Warenwirtschaftssystem — die Pflege muss am Handy zwischen zwei Handgriffen passieren.

### 1.2 Lösung (dieses Modul)
- **Käufer-Sicht:** klarer Verfügbarkeits-Status je Produkt (4 Zustände + optionaler Restmengen-Hinweis + Saison-Flag), eingebettet in Finder & Hof-Detail.
- **Erzeuger-Sicht:** mobil-zuerst-Editor („Meine Produkte"), mit dem der Hof **nur den eigenen** Bestand in Sekunden umschaltet — Tap statt Tippen.
- **Wahrheits-Garantie:** RLS erzwingt *„nur eigener Hof"* in der DB, nicht nur im Client.

### 1.3 Abgrenzung (was dieses Modul NICHT ist)
- **Kein Warenkorb / Checkout** — Kauf läuft über Reservierung (`RESERVIERUNG_ABHOLUNG.md`) bzw. SB-Bezahlung (`SB_BEZAHLUNG_USP.md`).
- **Kein Lagerbestand / keine Buchhaltung** — `stock_qty` ist ein **Käufer-Signal** („noch ~6 Gläser"), keine Inventur. Es gibt keine automatische Abbuchung pro Verkauf (Höfe verkaufen auch offline).
- **Keine Preis-/Sortimentsfindung** — Preise/Einheiten gehören zur Produkt-Stammpflege (gleiches Editor-Surface, aber eigenes Akzeptanzkapitel beim Onboarding).

---

## 2 · Domänenmodell

### 2.1 Verfügbarkeits-Zustand (`availability_state`)

Vier Zustände — **kanonisch, nicht erweitern ohne ADR** (Enum in DB + TS-Union müssen deckungsgleich bleiben):

| Wert (DB/TS) | Käufer-Label (DE) | Bedeutung | Reserv./Kauf möglich? | Badge-Klasse |
|---|---|---|---|---|
| `available` | **Verfügbar** | Frisch da, normal vorrätig | ja | `av-available` |
| `low` | **Wenig übrig** | Knapp — Restmenge, lieber zügig | ja (mit Hinweis) | `av-low` |
| `soon` | **Bald wieder** | Aktuell aus, Nachschub angekündigt | nein (CTA „Benachrichtigen") | `av-soon` |
| `out` | **Ausverkauft** | Aktuell nicht erhältlich | nein | `av-out` |

> Quelle der Wahrheit: `availability_state`-Enum in `0001_core.sql` (Z. 20–22), TS-Union `Availability` in `src/lib/types.ts`, Label-/Klassen-Map in `src/components/AvailabilityBadge.tsx`. **Diese drei Stellen sind die einzige Definition** — jede Änderung trifft alle drei + Migration.

**Zustands-Logik mit Bestand (`stock_qty`):**
- `available` + `stock_qty = null` → reiner Status ohne Zahl (Default für Höfe, die keine Mengen pflegen wollen).
- `available` + `stock_qty` ≤ `low_threshold` (Default 5, hof-konfigurierbar je Produkt) → System schlägt vor, auf `low` zu wechseln (kein Auto-Switch — Erzeuger entscheidet; siehe §4.4).
- `low` → Käufer-Hinweis „**Nur noch ~{stock_qty} {unit}**", falls `stock_qty` gepflegt; sonst neutral „Wenig übrig".
- `out` / `soon` → `stock_qty` wird in der UI **ausgeblendet** (Zahl irrelevant; vermeidet „0 übrig"-Doppelung).

### 2.2 Bestand (`stock_qty`) — additives Feld

```sql
-- additiv, Teil von 0002_availability_stock.sql (siehe §6)
stock_qty       integer     null check (stock_qty is null or stock_qty >= 0),
low_threshold   integer     not null default 5 check (low_threshold >= 0),
availability_updated_at timestamptz not null default now()
```

- **`null` = „nicht gepflegt"**, nicht „0". Bewusst nullable: Mengenpflege ist **optional**, der Status reicht als Minimum (Realismus für kleine Höfe).
- **Keine Auto-Dekrementierung** durch Reservierungen/SB-Käufe in dieser Welle (Höfe verkaufen parallel offline → würde lügen). Bei aktiver SB-Bezahlung kann später ein **opt-in** Auto-Abzug folgen (eigener ADR).
- `availability_updated_at` treibt das **Frische-Signal** (§3.3): wie alt ist diese Angabe.

### 2.3 Saison-Flag (`seasonal`)

```sql
seasonal boolean not null default false   -- bereits in 0001_core.sql, Z. 86
```

- `seasonal = true` → Produkt ist **saisonal** (Erdbeeren, Sommerstrauß, Spargel …). Treibt das **Saison-Radar** (`SAISON_RADAR.md`) und ein Badge „Saison" in Finder/Detail.
- **Bedeutung:** rein deskriptiv („gibt's nur jetzt"), **kein** automatischer Verfügbarkeitswechsel. Saison-Ende ist eine Erzeuger-Entscheidung (Status → `soon`/`out`), nicht systemgesteuert — Klima/Erntefenster sind regional zu verschieden für eine Automatik.
- **Verhältnis zu `availability`:** orthogonal. Ein Produkt kann `seasonal = true` + `available` (Hochsaison) oder `seasonal = true` + `soon` (Saison startet bald) sein.
- Optional erweiterbar (späterer ADR, nicht in dieser Welle): `season_from`/`season_to` (Monatsangabe) für ein vorausschauendes Saison-Radar. Bewusst **zurückgestellt** — Flag genügt für Marktstart.

### 2.4 Datenmodell-Übersicht (Ist + additiv)

```
products (Ist: 0001_core.sql)            +  additiv (0002_availability_stock.sql)
├─ id            text  PK                 ├─ stock_qty               integer  null  (>=0)
├─ farm_id       text  FK → farms         ├─ low_threshold           integer  not null default 5
├─ org_id        uuid  FK → orgs   ◄──────┤   (RLS-Anker: nur eigene org schreibt)
├─ name          text                     └─ availability_updated_at timestamptz
├─ category      product_category
├─ unit          text     ("Glas 500g", "kg", "Schale 500g")
├─ price         numeric(10,2)
├─ availability  availability_state  default 'available'
├─ seasonal      boolean             default false
├─ created_at / updated_at
```

> `org_id` ist auf **jeder** Produktzeile redundant zum `farm_id → farms.org_id` gespeichert. Das ist Absicht: die RLS-Policy prüft `org_id` direkt auf der Zeile (kein Join nötig, schneller + deny-by-default robust). Ein DB-Trigger hält `products.org_id = farms.org_id` konsistent (§6.3).

---

## 3 · Käufer-Sicht (Verfügbarkeits-Anzeige)

### 3.1 Wo sie erscheint
- **Finder-Liste / `FarmCard`** — aggregiertes Hof-Signal (z. B. „12 Produkte verfügbar"), kein Einzelprodukt-Spam.
- **Hof-Detail / `FarmDrawer`** — Produktliste je Hof mit Badge pro Produkt (`AvailabilityBadge`), Restmengen-Hinweis bei `low`, Saison-Badge bei `seasonal`.
- **Reservierungs-Dialog** — nur `available`/`low`-Produkte sind wählbar; `soon`/`out` ausgegraut mit Begründung.

### 3.2 Komponente `AvailabilityBadge` (live)
`src/components/AvailabilityBadge.tsx` — rendert Label + farbigen Punkt aus der `MAP`. Farben kommen **ausschließlich** aus Design-System-Tokens (`src/styles/theme.css`, Klassen `av-available/-low/-soon/-out`) — keine Inline-Farben (AGENTS.md-Regel). Für `low` mit gepflegtem Bestand wird das `label`-Prop überschrieben: `<AvailabilityBadge value="low" label={`Nur noch ~${stock_qty} ${unit}`} />`.

### 3.3 Frische-Signal (Vertrauen)
Unter knappen/heiklen Status (`low`/`soon`) zeigt die UI die **Aktualität** aus `availability_updated_at`:
- < 2 h → „gerade aktualisiert" (grün, neutral)
- < 24 h → „heute aktualisiert"
- < 7 Tage → „vor {n} Tagen aktualisiert"
- ≥ 7 Tage → **dezenter Warnton** „Angabe könnte veraltet sein — bitte beim Hof nachfragen" (kein Alarm, Vermittler-Ton).

Das ist der zentrale **Trust-Mechanismus**: ehrlich über Aktualität, statt eine möglicherweise falsche Zahl als Wahrheit zu verkaufen.

### 3.4 Zero-State (Pflicht, Produktionspfeiler 2)
- Hof **ohne** gepflegte Produkte → „Dieser Hof hat noch keine Produkte hinterlegt." (kein leeres Gitter, kein 500).
- **Alle** Produkte `out`/`soon` → „Aktuell ist nichts vorrätig — schau bald wieder vorbei." + CTA „Benachrichtigen, wenn wieder da" (koppelt an Saison-Radar/Alerts).
- API liefert **immer** valides Shape: leeres Array statt `null`, nie ein Fehler bei „keine Daten".

### 3.5 `soon` → Benachrichtigung
Bei `soon`/`out` erscheint ein CTA „Benachrichtigen". Er schreibt (anonym erlaubt, Turnstile-geschützt) in die bestehende `waitlist`/Alert-Strecke (`source = 'restock'`, Bezug auf `product_id`). Realer Handler, keine Sackgasse (Frontend-Regel „kein toter Button").

---

## 4 · Erzeuger-Selbstpflege (mobil-zuerst)

### 4.1 Leitprinzip
**Tap statt Tippen.** Der Erzeuger steht im Hofladen oder auf dem Feld, ein Handschuh aus. Pflege eines Produkt-Status muss in **≤ 2 Taps** ohne Tastatur möglich sein. Mengen-Eingabe ist optional und über große ±-Stepper bedienbar.

### 4.2 Surface „Meine Produkte" (`/erzeuger/produkte`)
- **Zugang:** nur Rolle `erzeuger` (RBAC, Surface-Sichtbarkeit) **und** RLS-gebunden an die eigene `org_id`. Käufer/Staff sehen dieses Surface nicht (Session-Trennung, CLAUDE.md „Welten strikt trennen").
- **Liste:** alle Produkte **des eigenen Hofs** (Query implizit org-gescopet durch RLS — der Client filtert nicht, die DB liefert nur Eigenes).
- **Je Produktzeile (mobil-Card):**
  - Name · Einheit · Preis (read-only Schnellblick)
  - **Status-Segmente** (4 große Tap-Targets): Verfügbar / Wenig / Bald / Aus → Tap = Sofort-Update (optimistic UI, Rollback bei Fehler).
  - **Bestand-Stepper** (optional): − / Zahl / + ; „nicht gepflegt"-Pille zum Zurücksetzen auf `null`.
  - **Saison-Toggle** (`seasonal`).
  - Frische-Stempel „zuletzt {relative Zeit}".

### 4.3 Schnellaktionen (Header)
- **„Alles verfügbar"** / **„Tag beenden"** (alles auf `out`) — Massen-Umschalter mit Confirm + Audit (kritische Mutation: Reason optional bei Bulk, Confirm Pflicht).
- **Filter:** „nur knappe/ausverkaufte zeigen" (Pflege-Fokus am Morgen).

### 4.4 Status × Bestand — Vorschlagslogik (Client-Hinweis, kein Zwang)
- Stepper senkt `stock_qty` ≤ `low_threshold` → dezenter Vorschlag „Auf **Wenig übrig** setzen?" (1 Tap akzeptiert). **Kein** Auto-Switch — Erzeuger behält Kontrolle.
- `stock_qty` auf 0 → Vorschlag „Auf **Ausverkauft** setzen?".
- Status auf `out`/`soon` → Bestand-Stepper wird ausgeblendet (irrelevant), `stock_qty` bleibt in DB erhalten (für späteres Wieder-Öffnen).

### 4.5 Datenfluss (End-to-End, Produktionspfeiler-konform)
```
Tap Status/Stepper
  → optimistic UI-Update (Card spiegelt sofort)
  → PATCH via supabase-js  update products set availability/stock_qty/seasonal, availability_updated_at=now()
       where id = :id            ◄── RLS erzwingt org_id = eigene org (kein client-seitiger org-Filter nötig)
  → Erfolg: Frische-Stempel aktualisiert
  → Fehler (403/Netz): Rollback der Card + Toast „Konnte nicht speichern"
  → Audit-Eintrag (Edge/Trigger): owner_self_care.product.availability_changed
  → Käufer-Sicht (Finder/Detail) zeigt neuen Status beim nächsten Load / Realtime-Channel
```
- **Schreibpfad:** direkter `supabase-js`-Update **mit Anon/Authenticated-Key** ist sicher, weil RLS (`products_owner_write`) den Schreibzugriff hart auf die eigene `org_id` begrenzt. Kein `service_role` im Frontend (AGENTS.md).
- **Validierung:** Client validiert (Zod) `stock_qty >= 0`, `availability ∈ Enum`; DB-`check`-Constraints sind die letzte Instanz.

---

## 5 · RLS & Sicherheit — „nur eigener Hof"

### 5.1 Bestehende Policies (live, `0001_core.sql`)
| Policy | Tabelle | Wirkung |
|---|---|---|
| `products_public_read` | products | anon + authenticated dürfen **lesen**, sofern der Hof aktiv ist (`farms.deleted_at is null`). Öffentlicher Katalog für den Finder. |
| `products_owner_write` | products | `for all to authenticated` mit `using`/`with check`: **`org_id in (select org_id from profiles where user_id = auth.uid())`** → Erzeuger schreibt **ausschließlich** Produkte der eigenen Org. Fremde Org = 0 Zeilen / kein Schreibrecht. |
| `farms_owner_write` | farms | analog für Hof-Stammdaten. |
| (kein anon-Write) | products | anon hat **nur** Lese-Policy → Verfügbarkeit pflegen erfordert Login. |

> **Der USP-Satz dieser Spec — „nur eigener Hof" — ist bereits durch `products_owner_write` (Z. 169–173) erzwungen.** `stock_qty`/`low_threshold` fallen unter dieselbe `for all`-Policy, da sie Spalten derselben Zeile sind; es ist **keine** neue Policy nötig — die additive Migration prüft das im Isolationstest mit.

### 5.2 Deny-by-default & Isolation
- RLS ist auf `products` aktiv (`enable row level security`, Z. 146). Ohne passende Policy = **kein** Zugriff (deny-by-default, Produktionspfeiler 1).
- **`with check`** verhindert auch das **Verschieben** einer Zeile in eine fremde Org (Update von `org_id` auf fremde Org schlägt fehl).
- **`service_role`** umgeht RLS (System) → nur in Edge Functions (Seed, Staff-Aktionen, Bulk-Imports), nie im Browser.

### 5.3 Audit (Produktionspfeiler 5)
Jede Mutation der Verfügbarkeit erzeugt einen `audit_log`-Eintrag (Tabelle existiert, `0001_core.sql` Z. 122):
```
action       = 'product.availability_changed' | 'product.stock_changed' | 'product.seasonal_changed' | 'product.bulk_closed'
entity_type  = 'product'   entity_id = products.id
org_id       = products.org_id   actor_user_id = auth.uid()
details      = { from, to, stock_from, stock_to }
reason       = bei Bulk-„Tag beenden" optional, sonst null
```
Audit wird **serverseitig** geschrieben (Edge Function für Bulk; DB-Trigger für Einzel-Updates), damit es nicht client-abschaltbar ist (CLAUDE.md „unabschaltbar").

### 5.4 Eingangsvalidierung
- DB-`check`: `stock_qty >= 0`, `low_threshold >= 0`, `availability` ∈ Enum, `price >= 0`.
- Bei Edge-Function-Pfaden (Bulk): Zod an der Grenze + Rechteprüfung (`profiles.role = 'erzeuger'` und `org_id`-Match) + Turnstile entfällt (authentifiziert, kein öffentliches Formular).

---

## 6 · Additive Migration `0002_availability_stock.sql`

> Strikt additiv (CLAUDE.md DB-Regeln), idempotent, mit Rollback-Notiz. Wird unter `app/supabase/migrations/0002_availability_stock.sql` angelegt.

### 6.1 Spalten + Constraints
```sql
alter table products
  add column if not exists stock_qty integer,
  add column if not exists low_threshold integer not null default 5,
  add column if not exists availability_updated_at timestamptz not null default now();

alter table products
  add constraint products_stock_qty_nonneg
    check (stock_qty is null or stock_qty >= 0) not valid;
alter table products validate constraint products_stock_qty_nonneg;

alter table products
  add constraint products_low_threshold_nonneg
    check (low_threshold >= 0) not valid;
alter table products validate constraint products_low_threshold_nonneg;
```

### 6.2 Frische-Stempel automatisch fortschreiben
```sql
create or replace function touch_availability_updated_at() returns trigger as $$
begin
  if (new.availability is distinct from old.availability)
     or (new.stock_qty is distinct from old.stock_qty) then
    new.availability_updated_at = now();
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists products_touch_availability on products;
create trigger products_touch_availability before update on products
  for each row execute function touch_availability_updated_at();
```

### 6.3 Org-Konsistenz erzwingen (defense-in-depth zur RLS)
```sql
-- products.org_id MUSS = farms.org_id sein (sonst RLS-Umgehung denkbar)
create or replace function enforce_product_org() returns trigger as $$
declare farm_org uuid;
begin
  select org_id into farm_org from farms where id = new.farm_id;
  if farm_org is null then raise exception 'farm % nicht gefunden', new.farm_id; end if;
  new.org_id = farm_org;   -- erzwingt Gleichheit, ignoriert client-gesetzte org_id
  return new;
end; $$ language plpgsql;

drop trigger if exists products_enforce_org on products;
create trigger products_enforce_org before insert or update on products
  for each row execute function enforce_product_org();
```

### 6.4 Index für Pflege-Filter & Frische
```sql
create index if not exists products_availability_idx on products (farm_id, availability);
create index if not exists products_seasonal_idx on products (seasonal) where seasonal = true;
```

### 6.5 Rollback
```sql
-- Rollback (manuell, falls nötig):
-- drop trigger products_touch_availability on products;
-- drop function touch_availability_updated_at();
-- drop trigger products_enforce_org on products;        -- nur falls 0002 ihn neu eingeführt hat
-- alter table products drop column availability_updated_at, drop column low_threshold, drop column stock_qty;
-- (availability + seasonal bleiben — aus 0001, nicht aus diesem Rollback betroffen)
```

> **Audit-Trigger für Einzel-Updates** (`product.availability_changed`) wird in derselben Migration ergänzt (schreibt in `audit_log` mit `auth.uid()`); aus Platzgründen identisches Muster wie §6.2, Ziel-Tabelle `audit_log`.

---

## 7 · Akzeptanzkriterien

> „Fertig" = **alle** Kriterien erfüllt, end-to-end verdrahtet, verifiziert (`npm run build` grün + gezielte Tests grün). Käufer-Anzeige ist bereits live; ✅ markiert das Vorhandene, ☐ das mit dieser Welle Umzusetzende.

### 7.1 Modell
- [x] Enum `availability_state` = exakt `available/low/soon/out`; TS-Union + Badge-Map deckungsgleich.
- [x] `seasonal boolean` vorhanden, orthogonal zur Verfügbarkeit.
- [ ] `stock_qty` nullable (`null` = nicht gepflegt, ≠ 0), `low_threshold` default 5, `availability_updated_at` automatisch fortgeschrieben (Trigger §6.2).
- [ ] DB-`check`-Constraints greifen (negativer Bestand wird abgelehnt).

### 7.2 Käufer-Sicht
- [x] `AvailabilityBadge` rendert alle 4 Zustände mit korrektem DE-Label + Token-Farbe (keine Inline-Farben).
- [ ] `low` mit gepflegtem Bestand zeigt „Nur noch ~{n} {unit}"; `out`/`soon` blenden Zahl aus.
- [ ] Frische-Signal (§3.3) korrekt nach Alter (gerade / heute / vor n Tagen / „könnte veraltet sein").
- [ ] Zero-State: Hof ohne Produkte + „alles aus" zeigen Text statt Fehler; API liefert leeres Array, nie `null`/500.
- [ ] `soon`/`out` zeigen funktionierenden „Benachrichtigen"-CTA (kein toter Button), schreibt realen Restock-Eintrag.

### 7.3 Erzeuger-Selbstpflege
- [ ] Surface `/erzeuger/produkte` nur für Rolle `erzeuger` sichtbar; Käufer/Staff erhalten es nicht (RBAC + Session-Trennung).
- [ ] Liste zeigt **ausschließlich** Produkte der eigenen Org (durch RLS, ohne Client-Filter).
- [ ] Statuswechsel in ≤ 2 Taps ohne Tastatur; optimistic Update mit Rollback bei Fehler.
- [ ] Bestand-Stepper + „nicht gepflegt"-Reset funktionieren; Vorschlagslogik (§4.4) zeigt Hinweis, erzwingt nichts.
- [ ] Saison-Toggle persistiert `seasonal`.
- [ ] Bulk „Tag beenden" setzt alle eigenen Produkte auf `out` mit Confirm + Audit.
- [ ] Jede Mutation schreibt einen `audit_log`-Eintrag (wer/was/von→zu), serverseitig, unabschaltbar.

### 7.4 Sicherheit / Isolation
- [x] `products_owner_write` begrenzt Schreiben hart auf die eigene `org_id` (`using` + `with check`).
- [ ] Fremde Org schreiben → **0 Zeilen / 403-Wirkung**, nie 200 mit Fremd-Update (Cross-Org-Negativtest).
- [ ] `org_id`-Verschiebung auf fremde Org wird durch `with check` + Trigger §6.3 verhindert.
- [ ] anon kann **lesen**, aber **nicht** Verfügbarkeit pflegen (kein anon-Write-Pfad).
- [ ] `service_role` taucht **nicht** im Frontend-Bundle auf (nur `VITE_`-Public-Keys).

---

## 8 · Tests (Pflicht je Feature — Produktionspfeiler 6)

> Runner/Verfahren analog Projektkonvention; bei RLS gilt: **Code wird an Tests angepasst, nie Tests zurechtgebogen** (§0.9). Tests sind die Spezifikation.

### 8.1 RLS / Isolation (blockierendes Gate — db-rls-spezialist + qa-tester)
1. **Eigener Schreibzugriff:** Erzeuger A (org A) setzt Produkt aus org A auf `low` → **Erfolg**, Zeile aktualisiert, `availability_updated_at` neu.
2. **Cross-Org-Negativtest (Kern):** Erzeuger A versucht Produkt aus **org B** zu ändern → **0 Zeilen betroffen** (RLS), kein 200 mit Fremddaten.
3. **Org-Hijack:** Erzeuger A setzt beim Update `org_id` = org B → `with check`/Trigger lehnt ab.
4. **anon-Write blockiert:** unauthentifizierter Update auf `products.availability` → abgelehnt.
5. **Public-Read intakt:** anon liest Produkte aktiver Höfe → Erfolg; Produkte gelöschter Höfe (`deleted_at`) → nicht sichtbar.
6. **Constraint:** `stock_qty = -1` → DB lehnt ab (`check`).

### 8.2 Verhalten / Zustandslogik (Unit)
7. Badge-Map: jeder der 4 Zustände → korrektes Label + Klasse (Regressionsschutz gegen Enum-Drift).
8. `low` + `stock_qty=3`, `unit='Glas 500g'` → Label „Nur noch ~3 Glas 500g".
9. `out` + `stock_qty=4` → Zahl wird **nicht** angezeigt.
10. Frische-Signal: `availability_updated_at` vor 8 Tagen → „könnte veraltet sein"; vor 1 h → „gerade aktualisiert".
11. Vorschlagslogik: Stepper auf `stock_qty=4` bei `low_threshold=5` → Vorschlag „Auf Wenig übrig"; **kein** Auto-Switch ohne Bestätigung.

### 8.3 End-to-End (qa-tester)
12. Erzeuger-Flow: Login (Rolle `erzeuger`) → `/erzeuger/produkte` → Tap „Wenig" auf Produkt → Käufer-Finder zeigt nach Reload „Wenig übrig" beim selben Produkt.
13. Optimistic-Rollback: Update bei simuliertem 403 → Card springt zurück, Toast erscheint.
14. Bulk „Tag beenden" → alle eigenen Produkte `out`, **fremde** Produkte unverändert, Audit-Einträge vorhanden.
15. Zero-State: Hof ohne Produkte rendert Text, keine Konsolen-`TypeError`, kein 500.

### 8.4 Audit
16. Jede Mutation (single/bulk) → genau ein `audit_log`-Eintrag mit korrektem `action`, `org_id`, `actor_user_id`, `details.from/to`.

---

## 9 · Verweise & Wiederverwendbarkeit

- **Schema/Policies:** `app/supabase/migrations/0001_core.sql` (Ist) · `0002_availability_stock.sql` (additiv, §6).
- **Typen/UI:** `app/src/lib/types.ts` · `app/src/components/AvailabilityBadge.tsx` · `FarmCard.tsx` · `FarmDrawer.tsx`.
- **Nachbarmodule:** `RESERVIERUNG_ABHOLUNG.md` (nutzt `available`/`low` als Buchbarkeit) · `SAISON_RADAR.md` (nutzt `seasonal`) · `SB_BEZAHLUNG_USP.md` (späterer opt-in Auto-Abzug, eigener ADR) · `HOFLADEN_FINDER.md` (Einstiegspunkt).
- **Imperium-Wiederverwendung:** Das Muster *„org-gebundene Selbstpflege eines öffentlich lesbaren Katalogs (public read + owner write per RLS, mobil-zuerst, Frische-Signal, optimistic + Audit)"* ist **plattformübergreifend** anwendbar (jede ConnectCore-Tochter mit Anbieter-gepflegtem Bestand/Angebot) → Kandidat für `.claude/memory/patterns/`.

---

*Disclaimer (durchgängig in Käufer-UI): Angaben zur Verfügbarkeit pflegt der jeweilige Hof selbst — ohne Gewähr. Die Plattform vermittelt und verkauft nicht selbst. Bei knappen Mengen bitte kurz beim Hof anrufen.*
