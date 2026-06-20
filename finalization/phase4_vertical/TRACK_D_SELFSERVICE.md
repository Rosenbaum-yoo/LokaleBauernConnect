# Track D — Erzeuger-Self-Service (Mobile Verfügbarkeits-/Bestandspflege · Abholfenster)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> **Phase 4, Track D** (`PHASEN.md` → „Track D — Erzeuger-Self-Service: Mobile Verfügbarkeits-/Bestandspflege, Abholfenster"). **Ein Track-Slice / eine Welle pro Session.**
> **Prio:** P1 (pilot- & retentionskritisch) mit **P0-Kern** in Tenant-Isolation, Schreib-Autorisierung und Audit. Wer seinen Hof nicht in **30 Sekunden vom Feld aus** ehrlich aktuell halten kann, pflegt nicht — und dann lügt der Finder (`out`/`available` veraltet). Die mobile Selbstpflege ist deshalb die **Wahrheitsmaschine** hinter Finder, Saison-Radar (Track C) und SB-Bezahlung (Track A). Kaputt = die ganze Plattform wird unglaubwürdig.
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker, keine native App, kein zweites Frontend.**
> **Rolle = VERMITTLER** — kein Eigenverkauf, keine Beratung, keine Mengen-/Liefer-/Frischegarantie. Was der Erzeuger pflegt, ist **seine** Angabe; die Plattform reicht sie weiter und kennzeichnet, **wie aktuell** sie ist. Disclaimer durchgängig — auch in der Erzeuger-Konsole und in jeder daraus ausgelösten Käufer-Mail.

---

## 0. Was Track D ist — und was er NICHT ist

**Track D verwandelt die starre Hof-Datenpflege in ein mobiles, sekundenschnelles Selbstpflege-Erlebnis** — die Schicht, mit der eine Erzeugerin **am Stand, im Stall, auf dem Feld** in Sekunden die Wahrheit aktuell hält:

1. **Mobile Verfügbarkeits-Pflege** — pro Produkt mit **einem Daumendruck** zwischen `available` · `low` · `soon` · `out` umschalten (großflächige Touch-Targets, optimistisches UI, sofortiges Speichern). Jede Änderung zieht das **Frische-Signal** (`availability_updated_at`, Track C) nach und kann einen opt-in-Alert (Track C) auslösen — ohne zweite Pflege-Oberfläche.
2. **Bestandspflege (optional, ehrlich)** — eine **freiwillige** Mengenangabe (`stock_qty` + `stock_unit_label`) für Höfe, die genauer pflegen wollen („noch ~12 Gläser", „2 Kisten Äpfel"). Bestand ist **nie** automatisch dekrementierend und **nie** eine Verkaufs-/Liefergarantie — Auto-Dekrement bei SB-Verkauf bleibt **P3 mit eigenem ADR** (würde lügen, weil Offline-Käufe nie vollständig erfasst sind). Bestand ergänzt den Status, ersetzt ihn nicht.
3. **Abholfenster-Pflege** — strukturierte, wiederkehrende **Abholfenster** (Wochentag + Von–Bis), die heute als `farms.pickup_windows text[]` / `org_locations.pickup_windows text[]` als Freitext liegen, werden additiv um eine **strukturierte, validierte** Quelle ergänzt (`pickup_windows`-Tabelle) und in den Reservierungs-Kernflow (WAVE_04) zurückgespeist — **ein** Wahrheits-Ort statt zweier divergierender Freitext-Arrays.
4. **Hof-Steckbrief-Selbstpflege** — Name/Story/Öffnungszeiten/Kategorien/Standort-Felder des eigenen Hofs (org-gebunden) editierbar, mit Validierung (Zod), Editorial-Vorschau und Audit. Kein roher DB-Editor — benannte, gescopte Felder.
5. **Frische-Disziplin** — ein „**Alles noch aktuell?**"-Bestätigungs-Tipp (`mark_all_fresh`): Mit einem Tipp bestätigt der Hof, dass der gepflegte Stand stimmt → `availability_updated_at = now()` für alle eigenen Produkte. So bleibt das Frische-Signal ehrlich, auch wenn sich **nichts** geändert hat.

> **Domain owns truth, Plattform owns aggregation** (`01_PRIORITIES.md` §0). Die Verfügbarkeits-, Bestands- und Abholfenster-Wahrheit besitzt der **Hof** (`org_id`). Track D gibt dem Hof die **Werkzeuge**, diese Wahrheit ehrlich und schnell zu pflegen; die Plattform erfindet **nie** Verfügbarkeit, setzt **nie** still einen Status und füllt **keine** Lücke mit einer Annahme.

**Track D ist NICHT:**
- **kein neues Datenmodell für Höfe/Produkte** — `farms`, `products`, `org_locations`, `reservations` (Migrationen `0001`/`0003`) bleiben die Wahrheit. Track D **erweitert additiv** (Frische, Bestand, strukturierte Abholfenster) und baut die **Pflege-Oberfläche** dafür.
- **keine native iOS/Android-App** — „mobil" heißt **responsive PWA** (Cloudflare Pages, dasselbe `app/`-Bundle). Kein App-Store, kein zweites Frontend, kein Native-Lock-in (Stack-Kanon).
- **kein roher Query-Editor / kein Service-Role im Client** — jede Pflege-Aktion ist eine **benannte, gescopte, Zod-validierte** Operation über RLS-gesicherte Supabase-Calls bzw. eine Edge Function; **niemals** Service-Role, DB-String oder Stripe-Secret im Erzeuger-Bundle (`CLAUDE.md` Backend-Regeln).
- **kein Reservierungs-/Bezahl-Management** — Reservierungen einsehen/bestätigen/stornieren ist eine **eigene** Erzeuger-Fläche (gehört scope-mäßig zum Reservierungs-Kernflow + Betriebszentrale); Track D liefert nur die **Datenpflege**, die Reservierungen erst sinnvoll macht (korrekte Abholfenster, ehrliche Verfügbarkeit). Verlinkt, nicht nachgebaut.
- **keine Auto-Bestands-Logik / kein POS** — Track D ist **kein Kassensystem**. Bestand ist eine ehrliche manuelle Angabe; SB-Verkäufe (Track A) erzeugen **kein** stilles Dekrement (P3/ADR).
- **kein Massen-Import/CSV-Onboarding** — Erzeuger-Erst-Onboarding ist `WAVE_15` (Onboarding-Wizard). Track D ist die **laufende Pflege** durch bereits angelegte Höfe.

---

## 1. Ist-Zustand (repo-genau geprüft — Stand dieser Welle)

| Fakt (real im Repo) | Stand | Konsequenz für Track D |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` — `products(availability availability_state, seasonal, price, unit, category, farm_id, org_id)`; Enum `availability_state ('available','low','soon','out')`; `set_updated_at()`-Trigger + `products_set_updated` | ✅ | **Mobile Verfügbarkeits-Pflege schaltet genau `products.availability`.** Kein neues Statusmodell. `updated_at` wird bereits per Trigger gepflegt. |
| `app/supabase/migrations/0001_core.sql` — `farms.pickup_windows text[]`, `farms.opening_hours text`, `farms.story`, `farms.categories product_category[]`, `farms.lat/lng/street/plz/city` | ✅ | Steckbrief-Selbstpflege editiert diese Felder org-gebunden. Abholfenster heute **Freitext-Array** → additiv strukturierte Quelle daneben (kein Bruch). |
| `app/supabase/migrations/0003_marketplace.sql` — `org_locations(pickup_windows text[], is_unmanned, type in ('hofladen','marktstand','sb_stand','ab_hof'))`, `org_locations_owner_write` (org-gebunden via `is_org_member`) | ✅ | Strukturierte Abholfenster hängen **wahlweise am Hof oder am Standort** (`location_id` nullable). SB-Stände (USP/Track A) bekommen so eigene Fenster. |
| `app/supabase/migrations/0001_core.sql` — RLS deny-by-default; `products_public_read` (anon/auth lesbar), `products_owner_write` (in `0003` auf `is_org_member(org_id)` gehoben); `farms_owner_write` (ebenso `is_org_member`) | ✅ | **Schreib-Autorisierung steht bereits org-gebunden.** Track-D-Pflege nutzt **exakt diese Policies** — keine neue, schwächere Schreib-Policy. |
| `app/supabase/migrations/0003_marketplace.sql` — `is_org_member(p_org uuid)` (`security definer`, prüft nur `auth.uid()`), `org_members`-Mehrfach-Mitgliedschaft | ✅ | **Der kanonische Org-Scope-Helfer.** Alle Track-D-Policies und Edge-Function-Guards prüfen darüber. Nicht duplizieren. |
| `app/supabase/migrations/0001_core.sql` — `audit_log(org_id, actor_user_id, action, entity_type, entity_id, reason, details jsonb, created_at)`, RLS ohne anon/auth-Policy → nur `service_role` | ✅ | **Audit-Senke steht.** Pflege-Mutationen schreiben hier (Namespace `selfservice.*`). Lesen nur Betriebszentrale (Phase 3). |
| `products` hat **kein** `availability_updated_at`, **kein** `stock_qty`, **kein** `stock_unit_label` | ❌ fehlt | `availability_updated_at` wird **von Track C** (`0006_season_alerts.sql`) eingeführt. **Track D ist Mit-Konsument**; führt es ein, **falls** D vor C läuft (idempotentes `add column if not exists` — kein Doppel-Konflikt). `stock_*` ist **neu in Track D** (`0004_selfservice.sql`). |
| Strukturierte Abholfenster-Tabelle (`pickup_windows`) | ❌ existiert nicht | **Neu in `0004_selfservice.sql`** — Kernstück des Tracks. Freitext-Array bleibt als Fallback/Anzeige erhalten (additiv, kein Bruch). |
| `src/components/AvailabilityBadge.tsx` — `Record<Availability,{label,cls}>`, Tokens `lbc-badge`/`av-*`, escaped Labels | ✅ | **Wiederverwenden** als Anzeige im Pflege-Screen + als visueller Zielzustand der Schalt-Buttons. Keine neue Farbe. |
| `src/lib/types.ts` — `Product.availability: Availability`, `Product.seasonal?`, `Farm.pickupWindows: string[]`, `Farm.openingHours`, `Farm.orgId?` | ✅ | Typen **additiv** erweitern (`availabilityUpdatedAt?`, `stockQty?`, `stockUnitLabel?`, strukturierte `PickupWindow`) — bestehende Felder unverändert. |
| `src/lib/data.ts` (Datenzugriff), `src/lib/supabase.ts` (Client, `VITE_`-Public), `src/lib/seed.ts` (Seed-Daten) | ✅ | Pflege-Mutationen kapseln in `data.ts`-Funktionen; Client bleibt Anon-Key. Seed liefert Demo-Hof zum mobilen Testen. |
| `src/pages/FinderPage.tsx`, `src/components/{FarmCard,FarmDrawer,FarmMap}.tsx` | ✅ | **Käuferseite — unangetastet.** Track D liest sie nur als „so sieht der Käufer das Ergebnis meiner Pflege". |
| `src/pages/StandPayPage.tsx`, `src/lib/payments.ts` | ✅ | Track A (SB-Bezahlung). Track D **berührt Geldfluss nicht**, verlinkt nur (Bestandskontext am Stand). |
| `app/supabase/functions/_shared/` (`cors.ts`, `supabaseAdmin.ts`/`admin()`, `email.ts`-Layout mit Vermittler-Fußzeile, ggf. `rateLimit.ts`), `functions/create-checkout`, `functions/stripe-webhook` | ✅ (laut Track-A/-C-Bezug) | Edge Functions des Tracks nutzen **ausschließlich** diese Helfer (CORS, Audit-Write via `admin()`, Rate-Limit) — keine zweite Infrastruktur. |
| `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` | ❌ geplant (`MASTER_INDEX.md` Abschnitt 3) | **Erste Doku-Aufgabe** des Tracks: dieses Spezialmodul kanonisch anlegen (Spezifikation der Verfügbarkeits-/Bestands-/Abholfenster-Selbstpflege). |
| `docs/ONBOARDING_SYSTEM.md` (Erzeuger) | ❌ geplant | **Abgrenzen**, nicht bauen: Track D = laufende Pflege; Erst-Onboarding bleibt WAVE_15. Querverweis setzen. |
| Cron-Mechanik (Supabase `pg_cron` / Cloudflare Scheduled Worker) | ❌ noch nicht eingerichtet | **Optionales** „Frische-Erinnerung"-Mail (Hof, der lange nichts gepflegt hat). Erst, wenn der Cron-Trigger (Track C) steht — Owner-Freigabe (Account/Kosten). Nicht blockierend für den Track-Kern. |

> **Abweichung zum TempConnect-Blueprint dokumentiert (Stop-Regel 1/13):** Die strukturelle Referenz (gleicher relativer Pfad im TempConnect-Original, read-only) beschreibt — sofern vorhanden — eine **Mitarbeiter-/Vendor-Self-Service-Welt** mit VMS-Begriffen (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, Kapazitäts-/Verfügbarkeits-Kalender von Personal). Das ist hier **bewusst nicht** übernommen: LokaleBauernConnect kennt **kein Personal-Self-Service**, keine Zeiterfassung, keine Vendor-Kapazitäten. Adaptiert auf die Hof-Domäne heißt „Self-Service" ausschließlich: **Erzeuger pflegt mobil die Verfügbarkeit, den optionalen Bestand und die Abholfenster seines eigenen Hofs.** Übernommen wird nur das *Prinzip* der Referenz: **die pflegende Partei besitzt ihre eigenen Daten, schreibt strikt org-gescopt, jede Mutation ist auditiert, und die Oberfläche ist mobil-zuerst.** „Vendor Pool / Requisition / Einsatzportal / Stundenzettel / SCC" sind verbotene Begriffe (`00_RULES.md` §4) und kommen in keinem Artefakt dieses Tracks vor.

---

## 2. Welten-Abgrenzung (verbindlich, `00_RULES.md` §8)

| Welt | Darf in Track D | Niemals |
|---|---|---|
| **Erzeuger** (org-gebunden, eingeloggt) | eigene Produkte zwischen `available`/`low`/`soon`/`out` schalten · optional `stock_qty`/`stock_unit_label` pflegen · `seasonal`/`season_*` markieren (Track-C-Feld) · strukturierte Abholfenster des eigenen Hofs/Standorts anlegen/ändern/deaktivieren · eigenen Hof-Steckbrief editieren · „alles noch aktuell" bestätigen · sehen **wie viele** Käufer ein eigenes Produkt beobachten (Aggregat aus Track C, **keine** Kontakte) | fremde Höfe/Orgs/Produkte sehen oder ändern · Preise anderer setzen · Käufer-Kontakte/-Reservierungs-PII einsehen außerhalb des eigenen Hofs · Verfügbarkeit eines fremden Hofs schalten |
| **Käufer** (anon + eingeloggt) | das **Ergebnis** der Pflege im Finder sehen (Status-Badge, Frische-Hinweis, Abholfenster) · (Track C) Benachrichtigung abonnieren | irgendetwas pflegen · die Erzeuger-Konsole überhaupt erreichen (Route + Server = 403) |
| **Staff/Owner** (Betriebszentrale, Phase 3) | Pflege-Aktivität/Frische-Health über alle Höfe aggregiert sehen (auditiert) · einen Hof bei Missbrauch sperren (Confirm + Reason + Audit, Phase-3-Pfad) · Audit-Feed `selfservice.*` lesen | Verfügbarkeit/Bestand eines Hofs **still** überschreiben (nur explizite, auditierte Korrektur) · Erzeuger-Felder ohne Audit ändern |

Sessions strikt getrennt. Jede org-fremde Schreib-/Lese-Query = **403**, nie 200 mit Fremddaten (Pfeiler 1). Die Erzeuger-Selbstpflege-Fläche ist **nur** für eingeloggte Erzeuger erreichbar (Route-Guard **plus** RLS — UI-Ausblendung ist nie Schutz). Owner ⊃ Staff in den Rechten, aber Korrekturen an Hof-Daten sind **immer** der auditierte Phase-3-Pfad, nie ein stiller Edit.

---

## 3. Datenmodell — additive Migration `app/supabase/migrations/0004_selfservice.sql`

> **Regeln** (`00_RULES.md` §1, `CLAUDE.md` DB-Regeln): additiv · idempotent (`if not exists` / `do $$ … exception when duplicate_object`) · **RLS deny-by-default ab dieser Migration** · Rollback als Kommentar am Dateiende · jede neue Tabelle hat `org_id` + Zeitstempel + `deleted_at` · keine destruktive Änderung an `0001`–`0003`. Schreibrechte org-gebunden via **`is_org_member`** (kanonischer Helfer aus `0003`). Audit nur `service_role`.

### 3.1 Frische-Signal + optionaler Bestand (additiv auf `products`)

```sql
-- ════════════════════════════════════════════════════════════════
-- LokaleBauernConnect — WAVE / Phase 4 Track D: Erzeuger-Self-Service
-- Mobile Verfügbarkeits-/Bestandspflege + strukturierte Abholfenster.
-- Additiv, org-gebunden (is_org_member), RLS deny-by-default.
-- Schreiben: Erzeuger (eigener Hof) + service_role. Lesen: öffentlich (Katalog).
-- ════════════════════════════════════════════════════════════════

-- Frische-Signal (P1, geteilt mit Track C): ehrlich machen, WIE aktuell der Status ist.
-- Idempotent — falls Track C (0006) zuerst lief, ist die Spalte bereits da: kein Konflikt.
alter table products add column if not exists availability_updated_at timestamptz not null default now();

-- Optionaler, ehrlicher Bestand (P2): NIE Garantie, NIE Auto-Dekrement (P3/ADR).
-- NULL = "Hof pflegt keine Menge" → UI zeigt nur den Status, keine Zahl.
alter table products add column if not exists stock_qty integer
  check (stock_qty is null or stock_qty >= 0);
alter table products add column if not exists stock_unit_label text
  check (stock_unit_label is null or char_length(stock_unit_label) <= 40);  -- z. B. "Gläser", "Kisten", "Bund"

-- Trigger: jede Änderung von availability ODER stock_qty zieht das Frische-Signal nach.
-- (Erweitert die Track-C-Logik defensiv um stock_qty; idempotent ersetzbar.)
create or replace function touch_availability_updated_at() returns trigger language plpgsql as $$
begin
  if (new.availability is distinct from old.availability)
     or (new.stock_qty is distinct from old.stock_qty) then
    new.availability_updated_at = now();
  end if;
  return new;
end $$;

drop trigger if exists products_touch_availability on products;
create trigger products_touch_availability before update on products
  for each row execute function touch_availability_updated_at();
```

> **Bestands-Disziplin (verbindlich):** `stock_qty` ist eine **freiwillige Hof-Angabe**, kein Lagerbestandssystem. Es gibt **keinen** automatischen Abzug bei Reservierung oder SB-Kauf — das wäre eine Lüge, weil Offline-Laufkundschaft am Stand nie vollständig erfasst ist. Wird `stock_qty = 0` und `availability` steht noch auf `available`, **erzwingt** Track D im UI eine bewusste Status-Entscheidung (Vorschlag „auf `out` setzen?"), schaltet aber **nie automatisch** (Domain owns truth). Auto-Dekrement-Kopplung an Track A bleibt **P3 mit eigenem ADR**.

### 3.2 Strukturierte Abholfenster (`pickup_windows`)

```sql
-- Wochentag: 0=So … 6=Sa (ISO-nah, in UI als deutsche Namen gerendert).
-- Strukturierte, validierbare Wahrheit NEBEN dem bestehenden Freitext-Array
-- (farms.pickup_windows / org_locations.pickup_windows bleiben als Fallback erhalten).
create table if not exists pickup_windows (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  farm_id      text not null references farms(id) on delete cascade,
  location_id  uuid references org_locations(id) on delete cascade,  -- optional: Fenster eines bestimmten Stands
  weekday      smallint not null check (weekday between 0 and 6),
  start_min    smallint not null check (start_min between 0 and 1439),  -- Minuten ab 00:00 (lokal)
  end_min      smallint not null check (end_min   between 1 and 1440),
  note         text check (note is null or char_length(note) <= 120),  -- z. B. "nur ungerade KW", "Hofladen geschlossen an Feiertagen"
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  check (end_min > start_min)                                          -- kein Über-Mitternacht-Fenster: in zwei Einträge teilen
);
create index if not exists pickup_windows_farm_idx on pickup_windows (farm_id) where deleted_at is null;
create index if not exists pickup_windows_org_idx  on pickup_windows (org_id)  where deleted_at is null;
create index if not exists pickup_windows_loc_idx  on pickup_windows (location_id) where location_id is not null and deleted_at is null;

drop trigger if exists pickup_windows_set_updated on pickup_windows;
create trigger pickup_windows_set_updated before update on pickup_windows
  for each row execute function set_updated_at();

-- Konsistenz: location (falls gesetzt) muss zum selben Hof/derselben Org gehören.
create or replace function check_pickup_window_scope() returns trigger language plpgsql as $$
begin
  if new.location_id is not null then
    if not exists (
      select 1 from org_locations l
      where l.id = new.location_id and l.org_id = new.org_id
        and (l.farm_id is null or l.farm_id = new.farm_id)
    ) then
      raise exception 'pickup_window: location_id gehört nicht zur Org/zum Hof';
    end if;
  end if;
  if not exists (select 1 from farms f where f.id = new.farm_id and f.org_id = new.org_id) then
    raise exception 'pickup_window: farm_id gehört nicht zur Org';
  end if;
  return new;
end $$;

drop trigger if exists pickup_windows_scope on pickup_windows;
create trigger pickup_windows_scope before insert or update on pickup_windows
  for each row execute function check_pickup_window_scope();
```

> **Reservierungs-Rückspeisung (kein Bruch):** Der Reservierungs-Kernflow (WAVE_04) liest heute `reservations.pickup_window text` (Freitext, gewählt aus `farms.pickup_windows[]`). Track D macht das **strukturiert wählbar**: Die App rendert die wählbaren Fenster aus `pickup_windows` (active, nicht gelöscht), schreibt aber weiterhin den **menschenlesbaren String** nach `reservations.pickup_window` (z. B. „Sa 09:00–12:00") — **kein Schema-Bruch am Reservierungspfad**, nur eine ehrlichere Quelle. Höfe ohne strukturierte Fenster fallen auf das bestehende Freitext-Array zurück (additive Migration, keine Pflicht-Migration der Altdaten).

### 3.3 RLS (deny-by-default)

```sql
alter table pickup_windows enable row level security;

-- Öffentlicher Katalog: aktive, nicht gelöschte Fenster sind lesbar (Reservierungs-Auswahl im Finder).
drop policy if exists pickup_windows_public_read on pickup_windows;
create policy pickup_windows_public_read on pickup_windows
  for select to anon, authenticated
  using (active = true and deleted_at is null);

-- Erzeuger pflegt nur eigene Fenster (org-gebunden, kanonischer Helfer is_org_member).
drop policy if exists pickup_windows_owner_write on pickup_windows;
create policy pickup_windows_owner_write on pickup_windows
  for all to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- products.availability / stock_* :
--   Schreibrechte sind BEREITS durch products_owner_write (0003, is_org_member) abgedeckt.
--   KEINE neue, schwächere Schreib-Policy. KEINE neue Lese-Policy nötig
--   (products_public_read deckt die zusätzlichen Spalten automatisch ab).
--   Nicht duplizieren — sonst Policy-Drift (Stop-Regel).
```

> **Warum keine neue Produkt-Policy:** `products_owner_write` (in `0003` auf `is_org_member` gehoben) erlaubt dem Erzeuger bereits `update` auf alle Spalten **seiner** Produkte — inkl. der neuen `availability_updated_at`/`stock_*`. Eine zweite Policy wäre redundant und ein Drift-Risiko. **Pfeiler 1 (Org-Boundary)** ist damit für die Pflege out-of-the-box erfüllt; der Cross-Org-Negativtest (§7) beweist es.

### 3.4 Rollback (Kommentar am Dateiende, wie `0001`–`0003`)

```sql
-- ── ROLLBACK (manuell, nur falls additive Migration zurückgenommen wird) ──
-- drop trigger if exists pickup_windows_scope on pickup_windows;
-- drop trigger if exists pickup_windows_set_updated on pickup_windows;
-- drop function if exists check_pickup_window_scope();
-- drop table if exists pickup_windows;
-- alter table products drop column if exists stock_unit_label;
-- alter table products drop column if exists stock_qty;
-- HINWEIS: availability_updated_at + touch_availability_updated_at() NICHT droppen,
--          falls Track C (0006) sie ebenfalls nutzt — sonst bricht Track C.
```

---

## 4. Edge Functions (Supabase/Deno) — `app/supabase/functions/`

> Grundsatz (`CLAUDE.md` Backend-Regeln): Die **schnelle Statuspflege läuft direkt über RLS** (Anon-Key-Client + `products_owner_write`) — **keine** Edge Function für jeden Daumendruck (Latenz + Kosten). Eine Edge Function wird **nur** dort eingesetzt, wo etwas passieren muss, das RLS allein nicht leistet: **Audit-Schreiben** (Tabelle nur `service_role`), **Batch-Frische** und **serverseitige Plausibilität/Validierung** über mehrere Zeilen. So bleibt der Pfad günstig (Pfeiler Wirtschaftlichkeit) und trotzdem auditiert.

### 4.1 `selfservice-update` (auditierte Pflege-Mutation)

| Aspekt | Festlegung |
|---|---|
| **Zweck** | Eine **gebündelte** Pflege-Aktion serverseitig ausführen + auditieren: Statuswechsel, Bestandsänderung, Abholfenster-CRUD, Steckbrief-Edit. Schreibt selbst per RLS-Pfad (im Namen des Users) oder via `admin()` mit erneuter `is_org_member`-Prüfung, danach **immer** einen `audit_log`-Eintrag. |
| **Methode** | `POST` (JSON). CORS via `_shared/cors.ts`. |
| **Auth** | Supabase-JWT im `Authorization`-Header **Pflicht**. Anon/Käufer → **401/403**. Server liest `auth.uid()`, prüft `is_org_member(org_id)` der Ziel-Entität → fremde Org = **403**, nie 200. |
| **Validierung** | **Zod** an der Grenze: `op` ∈ `set_availability` \| `set_stock` \| `upsert_pickup_window` \| `delete_pickup_window` \| `update_farm_profile` \| `mark_all_fresh`; je `op` ein striktes Payload-Schema (z. B. `availability` ∈ Enum; `weekday` 0–6; `start_min < end_min`; Strings längenbegrenzt + getrimmt). Ungültig → **422** mit Feldfehlern. |
| **Idempotenz** | Optionaler `Idempotency-Key`-Header → Mehrfach-Klick (mobil, schlechtes Netz) erzeugt **einen** Effekt + **einen** Audit-Eintrag (Unique-Constraint/Dedup wie `payment_events`-Muster). |
| **Audit (Pflicht)** | `audit_log`: `action='selfservice.<op>'`, `entity_type` (`product`/`pickup_window`/`farm`), `entity_id`, `org_id`, `actor_user_id`, `details` = `{from, to}` (alter→neuer Wert), `reason` (Pflicht **nur** bei sensiblen Korrekturen wie „auf `out` trotz Bestand>0"; Routine-Toggle ohne Reason erlaubt, aber protokolliert). PII der Käufer kommt hier **nicht** vor. |
| **Rate-Limit** | `_shared/rateLimit.ts` (falls vorhanden) — schützt vor versehentlichem Mutations-Sturm; großzügig für legitime Pflege, hart gegen Skripte. |
| **Zero-State/Fehler** | Klare JSON-Fehler (`{error, fields?}`), nie 500 bei leerer/abwesender Entität → **404/422**. |
| **Wiederverwendet** | `_shared/cors.ts`, `_shared/supabaseAdmin.ts` (`admin()` für Audit-Write), ggf. `_shared/rateLimit.ts`. **Keine** zweite Audit-/CORS-Schicht. |

> **Schneller Pfad ohne Function:** Für den reinen Daumendruck-Statuswechsel **darf** der Client direkt `update products set availability=… where id=…` über den RLS-Pfad fahren (optimistisches UI, sub-100ms). Damit auch dieser Pfad auditiert bleibt, schreibt ein **`after update`-Trigger** auf `products` einen kompakten `audit_log`-Eintrag (`selfservice.set_availability`) — so ist **kein** Statuswechsel ohne Audit möglich, egal über welchen Pfad. (Trigger gehört in `0004_selfservice.sql`, §3.1-Erweiterung; `actor_user_id := auth.uid()`.)

```sql
-- (Ergänzung zu §3.1) Audit jeder Verfügbarkeits-/Bestandsänderung — pfadunabhängig, unabschaltbar.
create or replace function audit_product_selfservice() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.availability is distinct from old.availability
     or new.stock_qty is distinct from old.stock_qty then
    insert into audit_log (org_id, actor_user_id, action, entity_type, entity_id, details)
    values (new.org_id, auth.uid(), 'selfservice.set_availability', 'product', new.id,
            jsonb_build_object(
              'from', jsonb_build_object('availability', old.availability, 'stock_qty', old.stock_qty),
              'to',   jsonb_build_object('availability', new.availability, 'stock_qty', new.stock_qty)));
  end if;
  return new;
end $$;

drop trigger if exists products_audit_selfservice on products;
create trigger products_audit_selfservice after update on products
  for each row execute function audit_product_selfservice();
```

> **Warum `after update`-Trigger statt Function-Zwang:** Er garantiert **Audit-First ohne Latenzkosten** — auch der direkte RLS-Schnellpfad ist lückenlos protokolliert (Pfeiler 5). Die Edge Function `selfservice-update` bleibt für **gebündelte/komplexe** Operationen (Abholfenster, Steckbrief, `mark_all_fresh`) und für serverseitige Plausibilität, die ein Trigger nicht leisten soll.

### 4.2 (optional, nicht blockierend) `selfservice-freshness-reminder`

| Aspekt | Festlegung |
|---|---|
| **Zweck** | Cron-getriggerte, **opt-in** Erinnerungs-Mail an Höfe, deren Produkte seit > N Tagen kein `availability_updated_at`-Update hatten („Stimmt Ihre Verfügbarkeit noch?"). Reduziert „tote" Hofdaten → schützt die Käufer-Glaubwürdigkeit. |
| **Abhängigkeit** | Cron-Mechanik (Track C) + `_shared/email.ts`-Layout (Vermittler-Fußzeile). **Erst nach Owner-Freigabe** (Account/Kosten/Versand). |
| **Einwilligung** | Erzeuger-Benachrichtigung ist **Betriebskommunikation** an einen bestehenden Hof-Kontakt (kein Marketing) — dennoch abbestellbar. Idempotent (`notification_log`-Muster aus Track C), kein Doppelversand. |

---

## 5. Frontend (React + Vite + TS strict) — `app/src/`

> **Mobile-zuerst, eine App, dasselbe Bundle.** Kein zweites Frontend, keine native App. Editorial-Tokens (`src/styles/theme.css`) ausschließlich — keine hardcodierten Farben, keine Deko-Emojis (`AGENTS.md`). Große Touch-Targets (≥ 44px), Daumen-Reichweite, optimistisches UI mit Rollback bei Fehler. Vermittler-Disclaimer sichtbar.

| Datei (neu/erweitert) | Inhalt |
|---|---|
| `src/pages/ManageFarmPage.tsx` **(neu)** | Erzeuger-Konsole, **Route `/hof/verwalten`**, hinter Auth-/Rollen-Guard (`erzeuger`). Tabs/Abschnitte: **Verfügbarkeit** (Produktliste mit Status-Schaltern), **Abholfenster**, **Steckbrief**. Lade-/Leer-/Fehlerzustände, „alles aktuell"-Bestätigung, Vorschau-Link „So sieht der Käufer Ihren Hof" (Deep-Link in den Finder). |
| `src/components/AvailabilityToggle.tsx` **(neu)** | 4-Status-Umschalter (`available`/`low`/`soon`/`out`) als große Segmented-Buttons; optimistisches Update via `data.setAvailability(...)`, Rollback + Toast bei Fehler; zeigt `AvailabilityBadge` als Zielzustand und das **Frische-Signal** („heute aktualisiert" / „vor 9 Tagen — bitte prüfen"). |
| `src/components/StockField.tsx` **(neu)** | Optionales Mengenfeld (`stock_qty` + `stock_unit_label`), Stepper-Buttons (+/−) daumengerecht; leer = „keine Menge gepflegt". Warnt bei `qty=0 & status=available` und schlägt `out` vor (kein Auto-Switch). |
| `src/components/PickupWindowEditor.tsx` **(neu)** | CRUD strukturierter Abholfenster: Wochentag-Picker + Von/Bis (Zeit-Inputs → Minuten), Notiz, aktiv/inaktiv, weicher Lösch-Pfad (`deleted_at`). Validierung clientseitig (Zod-Mirror) + serverseitig (Function/Constraint). |
| `src/components/FarmProfileForm.tsx` **(neu)** | Steckbrief-Selbstpflege (Name/Story/Öffnungszeiten/Kategorien/Standortfelder), Zod-validiert, Editorial-Vorschau, escapte Ausgabe. |
| `src/lib/data.ts` **(erweitert)** | Funktionen: `setAvailability(productId, status)`, `setStock(productId, qty, unit)`, `markAllFresh()`, `listPickupWindows(farmId)`, `upsertPickupWindow(input)`, `deletePickupWindow(id)`, `updateFarmProfile(input)`. RLS-Pfad für schnelle Toggles; Edge-Function-Pfad für gebündelte/auditpflichtige Ops. Alle mit Fehler-Mapping (403/422/404 → sprechende UI-Meldung). |
| `src/lib/types.ts` **(erweitert, additiv)** | `Product.availabilityUpdatedAt?: string`, `Product.stockQty?: number \| null`, `Product.stockUnitLabel?: string \| null`; neuer Typ `PickupWindow { id; farmId; locationId?; weekday; startMin; endMin; note?; active }`; `FarmProfileInput`. Bestehende Felder unverändert. |
| `src/lib/seed.ts` **(erweitert)** | Demo-Hof mit gemischten Status + ein paar strukturierten Abholfenstern, damit der mobile Pflege-Flow ohne Live-Supabase testbar ist (gekennzeichnet als Demo). |
| `src/App.tsx` **(erweitert)** | Route `/hof/verwalten` registrieren, hinter Guard; Käuferseiten unverändert. |

**Verdrahtungs-Kette (Pflicht, `CLAUDE.md` End-to-End):** Toggle/Form → `data.*` → realer Supabase-Call (RLS) bzw. `selfservice-update` → DB-Update + `audit_log` (Trigger/Function) → optimistisches DOM + Refresh/Invalidierung → Lade/Leer/Fehler-Zustände gebunden → Konsole sauber (keine `TypeError`/401-Schleifen). Kein toter Button, kein TODO, kein Platzhalter.

**Disclaimer/Vermittler (Pflicht):** In der Konsole sichtbar: „Ihre Angaben (Verfügbarkeit, Menge, Abholzeiten) werden unverändert an Suchende weitergegeben. LokaleBauernConnect vermittelt, verkauft nicht selbst und übernimmt keine Garantie für Menge oder Frische." — und das Frische-Signal macht für Käufer transparent, **wann** zuletzt gepflegt wurde.

---

## 6. Welle-Schnitt (ein Slice pro Session — Abhängigkeitsreihenfolge)

| Slice | Inhalt | Abhängig von | Pfeiler |
|---|---|---|---|
| **D-01 Datenmodell + Audit-Trigger** | `0004_selfservice.sql` (Frische, `stock_*`, `pickup_windows`, RLS, Scope-Trigger, `products_audit_selfservice`-Trigger) | `0001`+`0003` (vorhanden) | 1·5 |
| **D-02 Mobile Verfügbarkeits-Pflege** | `AvailabilityToggle` + `StockField` + `data.setAvailability/setStock`, optimistisches UI, Frische-Signal | D-01 | 2·5·6 |
| **D-03 Abholfenster-Pflege** | `PickupWindowEditor` + `data.*PickupWindow*` + Rückspeisung in Reservierungs-Auswahl | D-01 | 3·7 |
| **D-04 Steckbrief + „alles aktuell"** | `FarmProfileForm`, `markAllFresh`, `selfservice-update`-Function für gebündelte/auditpflichtige Ops | D-01 | 5·6 |
| **D-05 Politur + Doku** | Editorial-Mobile-Politur, Zero-States, `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md`, Test-Härtung | D-02…04 | 2·6 |
| **D-06 (optional)** | `selfservice-freshness-reminder` (Cron + Mail) — **nur nach Owner-Freigabe** | Cron (Track C), Owner | — |

> **Reihenfolge-Regel:** D-01 (Datenmodell + Audit-Trigger) **zuerst** — keine Pflege-UI, bevor jede Mutation einen Audit-Pfad hat (Audit-First, `01_PRIORITIES.md` Pfeiler 5). D-06 ist nicht Track-Gate-relevant.

---

## 7. Test-Matrix (Pflicht — Tests sind die Spezifikation, `00_RULES.md` §0.9)

> Runner gem. Projektkonvention; Pfadauflösung relativ zur Testdatei (`import.meta.url`), nie nur `process.cwd()`. Code an Tests anpassen, nie Tests zurechtbiegen.

| # | Kategorie | Test | Erwartung |
|---|---|---|---|
| T1 | **Tenant-Isolation (P0)** | Erzeuger A schaltet `availability` eines Produkts von **Org B** | **403** (RLS `products_owner_write`/`is_org_member`), kein Update, kein Audit-Eintrag |
| T2 | **Tenant-Isolation (P0)** | Erzeuger A liest/ändert ein `pickup_window` von Org B | **403** (`pickup_windows_owner_write`) |
| T3 | **Auth (P0)** | anon/Käufer ruft `selfservice-update` ohne/mit fremdem JWT | **401/403**, nie 200 mit Mutation |
| T4 | **Audit (P0)** | Erzeuger setzt `available → out` (Schnellpfad RLS) | genau **ein** `audit_log`-Eintrag `selfservice.set_availability` mit `from/to`, `actor_user_id`, `org_id`; keine Käufer-PII |
| T5 | **Audit (P0)** | gebündelte Abholfenster-Änderung via Function | Audit-Eintrag `selfservice.upsert_pickup_window`, `entity_id` korrekt |
| T6 | **Frische-Signal** | Statuswechsel | `availability_updated_at` aktualisiert (Trigger); unveränderter Status → **kein** Touch |
| T7 | **Bestands-Disziplin** | `stock_qty := 0`, Status bleibt `available` | UI erzwingt bewusste Entscheidung; **kein** Auto-Switch in DB |
| T8 | **Constraint** | `pickup_window` mit `end_min <= start_min` | abgelehnt (CHECK), 422 in UI |
| T9 | **Scope-Konsistenz** | `pickup_window.location_id` zeigt auf fremde Org/anderen Hof | `check_pickup_window_scope` wirft → abgelehnt |
| T10 | **Validierung** | `selfservice-update` mit ungültigem `op`/Payload | **422** mit Feldfehlern (Zod) |
| T11 | **Idempotenz** | doppelter Klick mit `Idempotency-Key` | **ein** Effekt, **ein** Audit-Eintrag |
| T12 | **Zero-State** | Hof ohne Produkte/Abholfenster öffnet Konsole | leere Arrays + Editorial-Leerzustand, kein 500 |
| T13 | **Reservierungs-Rückspeisung** | Käufer wählt strukturiertes Fenster | `reservations.pickup_window` enthält lesbaren String, Reservierungsflow unverändert grün |
| T14 | **Public-Read** | anon liest `pickup_windows` | nur `active && deleted_at is null` sichtbar; inaktive/gelöschte unsichtbar |
| T15 | **Escaping/XSS** | Story/Notiz mit `<script>` | escaped ausgegeben, nie ausgeführt |
| T16 | **Build** | `npm run build` (tsc strict + vite) | **grün** |

---

## 8. Track-D-Gate (blockierend)

```text
TRACK-D-GO darf nur vergeben werden, wenn ALLE Punkte erfüllt sind:

- 0004_selfservice.sql additiv + idempotent eingespielt; RLS deny-by-default; Rollback dokumentiert
- Cross-Org-Negativtest (T1/T2/T9) grün: fremde Org = 403, nie 200 mit Fremddaten          (Pfeiler 1)
- Jede Verfügbarkeits-/Bestands-/Abholfenster-/Steckbrief-Mutation erzeugt selfservice.*-Audit (T4/T5),
  pfadunabhängig (RLS-Schnellpfad UND Function), keine Käufer-PII                            (Pfeiler 5)
- Mobile Verfügbarkeits-Pflege end-to-end: Toggle → Supabase → Audit → optimistisches DOM/Refresh,
  Frische-Signal sichtbar, Konsole sauber                                                   (Pfeiler 2·... )
- Strukturierte Abholfenster speisen Reservierungs-Kernflow zurück OHNE Schema-Bruch (T13)
- Bestand ist freiwillig + NIE Auto-Dekrement (P3/ADR), 0-Bestand erzwingt bewusste Entscheidung (T7)
- Zero-State statt Error bei leerem Hof (T12)                                               (Pfeiler 2)
- Vermittler-Disclaimer in der Konsole + Frische-Transparenz für Käufer präsent            (Pfeiler 7)
- service role NUR in Edge Functions; kein Service-Role/Secret im Erzeuger-Bundle; kein roher Query-Editor
- npm run build grün (T16); gezielte Tests auf geänderten Pfaden grün
- docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md angelegt; PHASE_STATUS + MASTER_INDEX gepflegt
- Owner hat bestätigt — „fertig" erklärt der Owner

Ist EIN Punkt offen → TRACK D = NO GO.
```

---

## 9. Stop-Regeln dieser Welle (`00_RULES.md` §5, `CLAUDE.md` Stop-Regeln)

- **Schreib-Autorisierung unklar** — wenn nicht eindeutig serverseitig (RLS/`is_org_member`) prüfbar ist, dass ein User nur den eigenen Hof pflegt → **Stop**. Kein Pflege-Pfad ohne harte Org-Mauer.
- **Mutation ohne Audit-Pfad** — eine Pflege-Aktion ohne `selfservice.*`-Audit-Eintrag → **Stop** (Audit-First, P0).
- **Auto-Bestands-Kopplung** — soll Bestand automatisch bei SB-Kauf/Reservierung dekrementieren → **Stop**, das ist **P3 mit eigenem ADR** (würde lügen).
- **Schema-Bruch am Reservierungspfad** — strukturierte Abholfenster dürfen `reservations.pickup_window` nicht inkompatibel machen → **Stop**, additiv + Fallback.
- **Service-Role/Secret im Client** oder roher Query-Editor in der Erzeuger-Konsole → **Stop** (Stack-Kanon-Verletzung).
- **Referenzierte Datei/Function/Tabelle/Route nicht gefunden** (Annahme statt Fakt) → **Stop**, erst per Glob/Grep verifizieren.
- **Cron-/Mail-/Account-/Kosten-/Deploy-Eingriff** (D-06) → vorab in Klartext ankündigen, erst auf Owner-OK.

> **Ausnahme zu §0.8 („Durcharbeiten statt Pausieren"):** Stop-Regeln **stechen** das Durcharbeiten. An echten Blockern wird angehalten; an natürlichen Stopp-Punkten wird der nächste wertvolle Schritt geliefert (Audit-Härtung, Negativtests, Mobile-Politur, Doku-Tiefe).

---

## 10. Manuelle Owner-Aufgaben (→ `docs/releases/MANUAL_TASKS_CHECKLIST.md`)

- [ ] Entscheidung: Bestandspflege (`stock_qty`) zum Marktstart **an** oder **aus** (Default: an, optional pro Hof) — kein Auto-Dekrement.
- [ ] Freigabe der **Frische-Schwelle** für die optionale Erinnerung (z. B. „> 14 Tage ohne Pflege").
- [ ] (Nur D-06) Owner-Freigabe Cron + E-Mail-Versand (Account/Kosten/Domain) — sonst D-06 nicht starten.
- [ ] Bestätigung des Erzeuger-Rollen-/Auth-Pfads (wie wird `role='erzeuger'` + `org_id` gesetzt — Onboarding WAVE_15).

---

## 11. Abschlussbericht-Format (Pflicht pro Welle — gem. `00_RULES.md` §9)

```text
## Welle abgeschlossen: TRACK_D / D-?? <Name>   (Phase: 4 · Track: D · Datum:)

### Geändert
- <Migration/Edge Function/RLS-Policy/Trigger/Komponente/Doku> — <was + warum>

### Verifikation (ausgeführt, nicht behauptet)
- npm run build (tsc strict + vite):                         <grün/rot + Auszug>
- Gezielte Tests (geänderte Pfade, T#):                      <Liste + Ergebnis>
- Cross-Org-Negativtest (T1/T2/T9 → 403):                    <Ergebnis>
- Auth-Negativtest (anon/Käufer → 401/403, T3):             <Ergebnis>
- Audit-Beweis je Mutation (selfservice.* from/to, T4/T5):   <Ergebnis>
- Frische-Signal-Trigger (T6) / Bestands-Disziplin (T7):     <Ergebnis>
- Reservierungs-Rückspeisung ohne Bruch (T13):               <Ergebnis>
- Zero-State (T12) / Escaping (T15):                         <Ergebnis>
- Verdrahtungs-Check UI (Toggle→Supabase→Audit→DOM→Refresh): <Ergebnis>
- Konsole sauber (keine TypeError/401-Schleifen):            <ja/nein>

### Track-D-Gate-Bezug
- Adressierter Slice (D-01…D-06): <Status + Nachweis>

### 7 Produktionspfeiler (Selbstcheck)
- Org-Boundary · Zero-State · Scope-Transparenz · RBAC · Audit · Tests · Disclaimer/Vermittler: <je ✅/offen>

### P0/P1-Status
- Gelöst: · Offen: · Bewusst verschoben (mit Begründung, z. B. Auto-Dekrement = P3/ADR):

### Risiken & manuelle Owner-Aufgaben
- <Risiko + Mitigation + Rollback>
- Manuelle Owner-Tasks → docs/releases/MANUAL_TASKS_CHECKLIST.md

### Doku/Tracker aktualisiert
- docs/releases/PHASE_STATUS.md · MASTER_INDEX.md (Abschnitt 3/7) · docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md · ggf. ADR/learning/pattern: <ja/nein>

### Entscheidung
- weiter zu TRACK_D / D-??  ODER  Stop wegen Blocker (Kategorie/Priorität/ETA)
```

**Verbotene Abschluss-Formate:** reine Dateiliste ohne Fachbeschreibung · „erledigt" ohne Test-Bezug · „Audit funktioniert" ohne erzeugten Eintrag · „alle Tests grün" ohne Ausführungsnachweis · Verschweigen von Restfehlern · stiller Skip eines Tests.

---

## 12. Subagenten-Einbindung (Delegationsregeln, `AGENTS.md` / `.claude/agents/*`)

- **Datenmodell / additive Migration / RLS / Isolationstest** → `db-rls-spezialist` + `qa-tester` (Cross-Org-Negativtest = blockierendes Gate), danach `security-auditor` (read-only).
- **Edge Function `selfservice-update` (Zod, `is_org_member`, Audit, Idempotenz)** → `edge-functions-spezialist`, danach `security-auditor`.
- **Audit-Vollständigkeit / DSGVO / PII-Maskierung / Vermittler-Wahrheit** → `compliance-officer`.
- **Mobile Erzeuger-Konsole / Editorial / Touch-Targets / Zero-State / Disclaimer / Mikrocopy** → `frontend-design-guardian` + `i18n-content-spezialist`.
- **Query-/Pflege-Performance (Schnellpfad-Latenz) + Kosten (Function vs. RLS)** → `performance-cost-optimizer`.
- **Architekturfrage** (z. B. „Function-Zwang vs. Trigger-Audit", Bestands-Kopplung) → `architekt`; Ergebnis als ADR in `.claude/memory/decisions/` (insb. „Auto-Dekrement = P3, abgelehnt für Marktstart").

---

## 13. Abhängigkeiten & Referenzen

- **Datenbasis:** `app/supabase/migrations/0001_core.sql` (farms/products/audit, `products_owner_write`), `0003_marketplace.sql` (`is_org_member`, `org_locations`, Multi-Org). **Neu:** `0004_selfservice.sql`.
- **Geteiltes Feld:** `availability_updated_at` (auch Track C `0006_season_alerts.sql`) — idempotent eingeführt, von beiden Tracks genutzt; **nicht** doppelt anlegen, nicht droppen, solange ein Track es nutzt.
- **Verzahnung:** Track A (SB-Bezahlung) — Bestandskontext am Stand, **kein** Geldfluss-Eingriff, **kein** Auto-Dekrement. Track C (Saison/Alerts) — eine Verfügbarkeitsänderung hier löst dort einen opt-in-Alert aus (eine Wahrheit, eine Pflege-Oberfläche). Track E (Skalierung) — Indizes/Pagination für viele Höfe/Produkte.
- **Käuferseite unangetastet:** `FinderPage`, `FarmCard`, `FarmDrawer`, `FarmMap` lesen nur das Ergebnis.
- **Reservierungs-Kernflow (WAVE_04):** strukturierte Abholfenster speisen die Auswahl, `reservations.pickup_window` bleibt String-kompatibel.
- **Doku-Soll:** `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` (`MASTER_INDEX.md` Abschnitt 3) — kanonisch im Track anzulegen. Abgrenzung zu `docs/ONBOARDING_SYSTEM.md` (WAVE_15) und `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md` (Reservierungspfad).
- **Governance:** `CLAUDE.md` (7 Pfeiler, Stop-/Verbote), `AGENTS.md`, `finalization/00_RULES.md`, `01_PRIORITIES.md`, `PHASEN.md` (Phase 4, Track D).

> **Kanon-Treue (Schlusswort):** Track D ist die **Wahrheitsmaschine** des Erzeugers — mobil, sekundenschnell, org-isoliert, lückenlos auditiert, ohne je eine Verfügbarkeit zu erfinden oder einen Bestand zu fälschen. Die Plattform bleibt **Vermittler**: Sie reicht weiter, was der Hof pflegt, und macht transparent, **wie aktuell** es ist — kein Eigenverkauf, keine Garantie, kein stiller Eingriff.
