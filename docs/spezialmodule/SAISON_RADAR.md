# Saison-Radar — Spezialmodul-Spezifikation

> **Stand:** 2026-06-19 · **Phase:** 1 WAVE_04 D (Kernprodukt) → ausgebaut in **Phase 4 Track C** (Saison & Benachrichtigungen) · **Stack:** React+Vite+TS (strict) · Supabase (EU, Postgres+RLS, Edge Functions/Deno) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe.
>
> Verbindliche Spezifikation des **Saison-Radars**: kuratierte Monats-Saisondaten (Deutschland) × echte Hof-Verfügbarkeit × Lieblingsprodukt-Alerts. Adaptiert aus dem TempConnect-Blueprint-Aufbau der Spezialmodul-Specs auf die **Hof-Domäne**. **Keine VMS-/Zeitarbeits-Begriffe.**
>
> **Quelle der Wahrheit:** Datenmodell `app/supabase/migrations/0001_core.sql` (Tabellen `products`, `waitlist`, `profiles`, `audit_log`; Verfügbarkeit = **Spalte** `products.availability` vom Typ `availability_state`, **keine** eigene `availability`-Tabelle) · Zustände `docs/CORE_BUSINESS_STATE_MACHINES.md` · Typen `app/src/lib/types.ts` (`Product`, `ProductCategory`, `Availability`). Dieses Dokument ergänzt diese um den **Saison-Layer**; es dupliziert keine Tabellen, sondern verdrahtet sie.
>
> **Ist-Stand (implementiert):** Die Saison-Anzeige ist heute **datengetrieben in `app/src/lib/season.ts`** (12-Monats-`SEASON`-Map + `seasonNow()`, `monthName()`, `farmHasSeasonOffer()`) und wird im Finder gerendert (Saison-Bar „Jetzt im {Monat} Saison" + „nur Saison"-Filter in `app/src/pages/FinderPage.tsx`). Es gibt **noch keine** `/saison`-Route, **keine** `season_calendar`-Tabelle und **keine** Alert-Dispatch-Edge-Functions — alles unten ab §2 ist **Ziel-Spezifikation** (Phase 4 Track C).
>
> **Bezug:** `CLAUDE.md` §„Kritische Produkt-Abgrenzung" + 7 Produktionspfeiler · `PHASEN.md` Phase 1 WAVE_04 D / Phase 4 Track C · `MASTER_INDEX.md` 3 · Produkt & Spezialmodule.

---

## 0 · Zweck & Abgrenzung (Vermittler-Disziplin)

Der **Saison-Radar** beantwortet die Leitfrage des Plattform-Käufers: *„Was hat gerade Saison — und welcher Hof in meiner Nähe hat es wirklich vorrätig?"* Er verbindet zwei Wahrheiten, die bisher getrennt liegen:

1. **Saison-Wissen (kuratiert, deutschlandweit):** Welche Erzeugnisse haben in welchem Monat in Deutschland natürliche Freiland-/Erntesaison (Saisonkalender). Statische Domänen-Referenzdaten, von der Plattform gepflegt, herkunfts-/methodentransparent.
2. **Verfügbarkeits-Wahrheit (live, hofgenau):** Was ein konkreter Hof **jetzt** als `available | low | soon | out` führt (Spalte `products.availability`, Erzeuger-Selbstpflege).

> **Abgrenzung (nicht verletzen, `CLAUDE.md`):** Der Saison-Radar ist **Spezialschicht**, kein Kern. Benachrichtigungs-**Mechanik** (E-Mail/Push-Versand, Templates, Bounce-Handling) stammt aus dem ConnectCore-Kern und wird **nur angedockt** — der Radar liefert das *Was/Wann/An wen*, der Kern das *Wie zugestellt*. Die Plattform **vermittelt** (kein Eigenverkauf, keine Ernährungs-/Gesundheitsberatung). Saisonangaben sind eine redaktionelle Orientierung, **keine Garantie** für Verfügbarkeit, Qualität oder Preis eines einzelnen Hofes — Disclaimer durchgängig (siehe §11).

**Drei Nutzwerte, drei Pfeiler-Synergien:**

| Nutzwert | Für wen | Pfeiler-Synergie |
|---|---|---|
| **Saison-Browsing** „Was hat im Juni Saison?" → Höfe mit echter Verfügbarkeit | Käufer (auch anonym) | Pfeiler 2 (Zero-State), 3 (Scope: Monat/Region/Datenstand) |
| **Lieblingsprodukt-Alert** „Sag mir, wenn Spargel wieder da ist" | Käufer (Konto **oder** Gast-Kontakt) | Pfeiler 4 (RBAC), 5 (Audit), DSGVO-Einwilligung |
| **Saison-Vorausschau am Hof** „Bald wieder: Erdbeeren" | Erzeuger (Marketing) + Käufer | Pfeiler 7 (Drilldown), Wirtschaftlichkeit (Wiederbesuch) |

---

## 1 · Geltungsbereich & Nicht-Ziele

**In-Scope (diese Welle/Spec):**
- Kuratierter **DE-Monats-Saisonkalender** als versionierte Referenzdaten (neue Tabelle `season_calendar`, additiv).
- **Verknüpfung** Saison ⇄ Hof-Verfügbarkeit über `ProductCategory` + optional `produce_key` (Sorten-Schlüssel).
- **Saison-Radar-Ansicht** im Frontend (Monatswähler, Kategorie-/Sorten-Liste, „Höfe mit Saisonware in der Nähe").
- **Alerts auf Lieblingsprodukte** (Re-use der bestehenden `waitlist` mit `source='saison_radar'`) inkl. öffentlichem, Turnstile-geschütztem Anmeldeflow und DSGVO-Einwilligung.
- **Datenpflege**-Pfade: Plattform-Redaktion pflegt den Kalender (Staff); Erzeuger pflegt nur Verfügbarkeit/`seasonal`-Flag (kein Eingriff in den Kalender).
- **Akzeptanzkriterien** (§12) inkl. Isolations-/Zero-State-/Audit-Tests.

**Nicht-Ziele (bewusst ausgeschlossen):**
- Keine Push-/E-Mail-**Zustell-Engine** (Kern; Radar erzeugt nur den Auslöse-Event + Empfänger-Selektion).
- Keine Ernährungs-, Diät- oder Gesundheitsempfehlungen (Vermittler-Rolle).
- Keine regionalisierten Mikro-Klima-Saisons je PLZ in Phase 1 (Kalender ist **deutschlandweit**; Regionalisierung = spätere additive Erweiterung, §8).
- Kein eigener Preis-/Bestands-Verkaufsdatensatz der Plattform (Geldfluss ausschließlich über `reservations`/`sb_payments`).

---

## 2 · Datenmodell-Erweiterung (additiv)

Der Saison-Radar fügt **eine** neue Referenz-Tabelle hinzu und nutzt drei bestehende Tabellen weiter. Alles additiv, RLS deny-by-default ab erster Migration, konform zu `docs/DATABASE_MODEL.md`.

### 2.1 Neue Tabelle: `season_calendar` (kuratierte DE-Saisondaten)

Eine Zeile = **ein Erzeugnis × ein Monat × eine Verfügbarkeitsart** (Freiland vs. Lager). Versioniert, plattformweit (kein `org_id` — kuratierte Referenz, kein Mandantendatum). Schreibrecht **ausschließlich Staff/Service-Role**; Lesen öffentlich.

```sql
-- Saisonart eines Erzeugnisses im Monat
create type season_kind as enum ('freiland', 'lager', 'gewaechshaus', 'keine');
--   freiland     = natürliche Ernte-/Freilandsaison (Hauptsignal)
--   lager        = Lagerware aus Vorsaison (z. B. Lageräpfel, Kartoffeln im Winter)
--   gewaechshaus = ganzjährig/geschützter Anbau (schwächeres Saisonsignal)
--   keine        = außerhalb jeder Saison (für lückenlose 12-Monats-Matrix)

create table public.season_calendar (
  id            uuid primary key default gen_random_uuid(),
  produce_key   text not null,                 -- stabiler EN/snake_case-Schlüssel, z. B. 'erdbeere', 'spargel_weiss'
  display_name  text not null,                 -- DE-Anzeigename, z. B. 'Erdbeeren', 'Weißer Spargel'
  category      product_category not null,     -- Brücke zu products.category (1:1 mit types.ts)
  month         smallint not null check (month between 1 and 12),
  kind          season_kind not null default 'keine',
  intensity     smallint not null default 0 check (intensity between 0 and 3),
                                               -- 0 keine · 1 Beginn/Ende · 2 Saison · 3 Hochsaison
  region        text not null default 'DE' check (region ~ '^[A-Z]{2}$'),
                                               -- Phase 1: immer 'DE'; Feld vorbereitet für spätere Regionalisierung
  note          text,                          -- redaktioneller Hinweis ('frühe Sorten ab Mitte Mai')
  sort_order    smallint not null default 0,   -- Reihenfolge in der Liste
  is_published  boolean not null default true, -- Redaktions-Sichtbarkeit (Entwürfe = false)
  version       integer not null default 1,    -- Kalender-Version (additive Pflege, Historie via audit_log)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- Genau eine Zeile je Erzeugnis+Monat+Region (additive Korrektur statt Duplikat)
create unique index season_calendar_uniq
  on public.season_calendar (produce_key, month, region)
  where deleted_at is null;

create index season_calendar_lookup
  on public.season_calendar (region, month, category)
  where deleted_at is null and is_published;

create index season_calendar_category
  on public.season_calendar (category, month)
  where deleted_at is null and is_published;

create trigger season_calendar_set_updated
  before update on public.season_calendar
  for each row execute function public.set_updated_at();
```

> **Warum kein `org_id`?** Der Saisonkalender ist **kuratierte Domänenwahrheit**, kein mandantengebundenes Geschäftsdatum (vgl. `DATABASE_MODEL.md` §0: „kein Eigenverkauf-Datensatz der Plattform"). Mandantenfähigkeit gilt für Hof-/Verfügbarkeitsdaten; Referenzdaten sind plattformweit und werden über Staff-/Service-Role-Schreibgate geschützt. Lesen ist öffentlich — der Kalender enthält keine personenbezogenen oder mandanten­vertraulichen Daten.

### 2.2 Brücke zur Verfügbarkeit (bestehende Tabellen, additive Felder)

| Tabelle | Bestehend / additiv | Rolle im Saison-Radar |
|---|---|---|
| `products.seasonal` (BOOLEAN) | bestehend | Erzeuger markiert ein Produkt als Saisonware → Anzeige-Badge + Radar-Treffer. |
| `products.produce_key` (TEXT, **additiv, NULL-bar**) | **neu** | Optionaler Feinschlüssel (`'erdbeere'`) für präzise Saison-Brücke; Fallback = `category`. |
| `products.availability` (`availability_state`) | bestehend | Live-Status `available\|low\|soon\|out` — entscheidet, ob ein Saison-Treffer „jetzt da" oder „bald" ist. |
| `products.seasonal` / `stock_qty`*/`availability_updated_at`* (*Ziel, additiv) | teils geplant | Datenstand + „ab wann" für „bald wieder verfügbar" (numerische Bestands-/Frische-Felder folgen mit `PRODUKTVERFUEGBARKEIT.md`). |
| `waitlist` (`source='saison_radar'`, `waitlist_status`) | bestehend | Lieblingsprodukt-Alert-Abos (§4). |
| `profiles.marketing_opt_in` | bestehend | DSGVO-Einwilligung für eingeloggte Käufer (Saison-Newsletter/Alert). |

```sql
-- products: optionaler Saison-Feinschlüssel (additiv, kein Rewrite-Lock)
alter table public.products
  add column if not exists produce_key text;          -- NULL = Bridge über category

create index if not exists products_produce_key_idx
  on public.products (produce_key)
  where deleted_at is null and produce_key is not null;
```

> **Brückenlogik (deterministisch):** Ein Hof-Produkt gilt als **Saison-Treffer** im Monat *m*, wenn ein veröffentlichter `season_calendar`-Eintrag mit `month=m`, `kind IN ('freiland','lager','gewaechshaus')`, `intensity >= 1` existiert und entweder `produce_key` exakt matcht **oder** (bei `products.produce_key IS NULL`) `category` matcht. Reihenfolge der Brücke: **produce_key vor category** (spezifisch vor grob), höhere `intensity` zuerst.

### 2.3 Alert-Abo über bestehende `waitlist` (kein Schatten-Schema)

Lieblingsprodukt-Alerts sind **keine** neue Tabelle, sondern die bereits vorgesehene `waitlist`-Nutzung mit `source='saison_radar'` (siehe `DATABASE_MODEL.md` §4.9). Semantik im Saison-Kontext:

| `waitlist`-Feld | Saison-Radar-Bedeutung |
|---|---|
| `product_id` | gesetzt → Alert auf **konkretes Hof-Produkt** (z. B. „Erdbeeren bei Hof Sonnenwiese"). |
| `product_id = NULL` + `farm_id = NULL` + `org_id = NULL` | **kategorie-/erzeugnisweiter** Saison-Alert (plattformweit, „Spargel allgemein"). Erzeugnis-Bezug in `note`/separat (§4.2). |
| `buyer_id` | gesetzt bei eingeloggtem Käufer; `NULL` = Gast-Abo (nur `contact`). |
| `contact` | E-Mail/Telefon (Zod + Turnstile am öffentlichen Formular). |
| `status` | `queued → notified → converted` (Käufer reserviert/kauft) / `removed` (abbestellt) / `expired` (Saison vorbei). |
| `source` | **`'saison_radar'`** (Pflicht für diesen Pfad — trennt Saison-Abos von Produkt-Nachrückern `source='app'` und Landing `source='landing'`). |

> **Erzeugnisweiter Alert ohne Produkt-FK:** Da `waitlist.product_id` ein FK auf eine konkrete Produktzeile ist, wird der **kategorie-/erzeugnisweite** Saison-Alert über eine additive Spalte `waitlist.produce_key TEXT NULL` (+ vorhandenes `category`-Signal) abgebildet:
> ```sql
> alter table public.waitlist
>   add column if not exists produce_key text,
>   add column if not exists category    product_category;
> -- Anti-Doppel für erzeugnisweite Saison-Abos (ergänzt bestehenden Produkt-Index):
> create unique index if not exists waitlist_saison_uniq
>   on public.waitlist (lower(contact), coalesce(produce_key, category::text))
>   where deleted_at is null and source = 'saison_radar' and product_id is null;
> ```
> So bleibt der bestehende produktgebundene Anti-Doppel-Index unberührt und erzeugnisweite Abos sind ebenfalls dedupliziert (ein Kontakt, ein Erzeugnis).

---

## 3 · RLS & Berechtigungen (deny-by-default)

Konform `docs/DATABASE_MODEL.md` §7. Schreibpfade mit erhöhten Rechten laufen ausschließlich über Edge Functions (service role).

### 3.1 `season_calendar`

```sql
alter table public.season_calendar enable row level security;
alter table public.season_calendar force row level security;
```

| Aktion | Policy | Begründung |
|---|---|---|
| SELECT (öffentlich) | `deleted_at IS NULL AND is_published` für `anon`/`authenticated` | Saison-Radar ist öffentlich nutzbar (auch ohne Konto) — Pfeiler 2. |
| SELECT (Staff) | zusätzlich `is_staff()` sieht auch `is_published=false` (Entwürfe) | Redaktion. |
| INSERT/UPDATE/DELETE | **nur Staff** über Edge Function `season-calendar-admin` (service role) — direkte Tabellen-Mutation für `anon`/`authenticated`/`erzeuger` = **keine Policy → unmöglich** | kuratierte Referenz; kein Erzeuger-Eingriff. Jede Pflege → `audit_log` (`action='season.calendar.upsert'`, `reason` Pflicht). |

> **Erzeuger berührt den Kalender nie.** Erzeuger pflegen ausschließlich `products.seasonal`, `products.produce_key` und `availability` ihres eigenen Hofes (bereits durch `owns_farm()`-Policies in `DATABASE_MODEL.md` §7 abgedeckt). Der Saisonkalender ist Staff-/Redaktions-Hoheit — so bleibt die Saison-Wahrheit konsistent und nicht durch Einzelhöfe verzerrbar.

### 3.2 `waitlist` (Saison-Alerts) — Wiederverwendung bestehender Policies

Die bestehenden `waitlist`-Policies (`DATABASE_MODEL.md` §7) gelten unverändert. Zusätzlich für den Saison-Pfad:

- **Öffentliches Abo (Gast):** ausschließlich über Edge Function `saison-alert-subscribe` (Turnstile + Zod + Anti-Doppel + Einwilligungs-Nachweis). Direktes `anon`-INSERT ist über die bestehende Policy nicht erlaubt (nur Edge-Pfad).
- **Eingeloggter Käufer:** direktes INSERT mit `buyer_id = auth.uid()`, `WITH CHECK (status='queued' AND source='saison_radar')` (bestehende Policy-Form).
- **Abbestellen:** Käufer darf eigenen Eintrag `→ removed` (bestehende UPDATE-Policy „Käufer darf eigenen Eintrag → removed"); Gast über signierten Unsubscribe-Token (Edge `saison-alert-unsubscribe`).
- **Nachrücker-/Versand-Selektion:** liest der Cron-Edge-Job mit service role; `notified→…` schreibt nur die Edge Function. Frontend nie.

> **Negativ-Erwartung (Pfeiler 6):** `anon` kann `season_calendar` nur `is_published`-Zeilen lesen, nie schreiben. Erzeuger kann Kalender nicht mutieren (0 Policies → 403-Pfad). Käufer A sieht/ändert Saison-Abo von Käufer B nicht. Org B liest keine Saison-Abos von Org A.

---

## 4 · Lieblingsprodukt-Alerts (Funktionsfluss)

### 4.1 Abo anlegen (zwei Einstiegspunkte)

1. **Vom ausverkauften/Saison-Produkt** (Hofdetail / Saison-Radar): Produkt steht auf `out` oder `soon` → Button „Benachrichtige mich, wenn wieder da". Erzeugt ein **produktgebundenes** Abo (`product_id` gesetzt).
2. **Erzeugnisweit aus dem Saison-Radar**: „Sag mir, wenn **Spargel** wieder Saison hat" → **erzeugnisweites** Abo (`produce_key`/`category`, kein `product_id`).

**Eingabe (beide Wege):**
- Eingeloggter Käufer: nutzt Profil-Kontakt; **Einwilligung** via `profiles.marketing_opt_in` (falls noch nicht erteilt → Inline-Opt-in mit Klartext-Zweck).
- Gast: `contact` (E-Mail/Telefon) + **Turnstile** + explizite Einwilligungs-Checkbox (DSGVO Art. 6 Abs. 1 a). Doppelte-Opt-in-Bestätigung per Link (Kern-Mail) bevor Status produktiv wird.

**Server (Edge `saison-alert-subscribe`, Deno):**
1. Zod-Validierung (`contact`-Form, `produce_key|product_id` genau eines gesetzt, Region).
2. Turnstile-Token prüfen (öffentliches Formular).
3. Anti-Doppel über Unique-Index (§2.3) — bestehendes Abo → `200` idempotent (no-op, kein neuer Eintrag).
4. Insert `waitlist` (`source='saison_radar'`, `status='queued'`, `queue_rank` per Sequenz).
5. `audit_log` (`action='saison.alert.subscribe'`, `entity_type='waitlist'`, `reason='self_subscribe'`, IP/UA).
6. Bei Gast: Double-Opt-in-Mail über Kern-Notification-Bus; Status bleibt `queued`, wird erst nach Bestätigung versand-fähig (`confirmed_at`-Flag im `note`/Folgespalte oder Kern-Consent-Log).

### 4.2 Auslösung & Versand-Selektion (Cron-Edge-Job)

**Trigger** (Supabase Scheduled Edge Function `saison-alert-dispatch`, z. B. stündlich):

Ein Abo wird **fällig**, wenn:
- **Produktgebunden:** das `product_id`-Produkt wechselt auf `availability='available'` (oder `availability`-Satz wird `is_current` mit `status IN ('available','low')`) — Übergang `out/soon → available`.
- **Erzeugnisweit:** im aktuellen Monat existiert mindestens **ein** veröffentlichter `season_calendar`-Eintrag (`intensity>=2`) für `produce_key`/`category` **und** mindestens **ein** veröffentlichter Hof führt ein passendes Produkt mit `availability IN ('available','low')`.

**Ablauf je fälligem Abo:**
1. Empfänger-Selektion (service role) mit Org-/Sichtbarkeits-Filter (nur `published` Höfe).
2. Zustellung über **Kern-Notification-Bus** (E-Mail/Push) — Radar liefert nur Payload (Erzeugnis, Hof(e), Deep-Link `/hof/:slug#produkt`).
3. `waitlist.status = 'notified'`, `notified_at = now()`.
4. `audit_log` (`action='saison.alert.notified'`, Empfängerzahl, Auslöser-Erzeugnis).
5. Reservierung/Kauf danach → `status='converted'`, `converted_at` (Conversion-Messung, Pfeiler-3-Scope).
6. Saisonende (`season_calendar` keine `intensity>=1` mehr für den Erzeugnis-Monat) → optional `status='expired'` für erzeugnisweite Abos (Käufer kann fürs nächste Jahr re-abonnieren) — **opt-out vermeidbar:** Default ist „bleibt aktiv bis Käufer abbestellt"; Saison-Expiry nur, wenn Käufer „nur diese Saison" wählt.

> **Idempotenz & Anti-Spam (Pfeiler 5 + CORE_BUSINESS_STATE_MACHINES §0.1.5):** Ein Abo wird je Saison-/Verfügbarkeits-Fenster **höchstens einmal** benachrichtigt (`notified_at`-Guard + Idempotenz-Schlüssel `produce_key|product_id + valid_from`). Wiederholter Cron-Lauf im selben Fenster = no-op. Kein Käufer erhält mehr als eine Alert-Mail pro Erzeugnis-Wiederverfügbarkeit.

### 4.3 Alert-Lebenszyklus (Zustandsmaschine)

```
▶ queued ──[double-opt-in bestätigt]──▶ queued(confirmed)
   │                                        │
   │                       [Erzeugnis/Produkt wieder verfügbar / Saison aktiv]
   │                                        ▼
   │                                     notified ──[Käufer reserviert/kauft]──▶ converted ⏹
   │                                        │
   ├──[Käufer/Gast bestellt ab]──────────▶ removed ⏹
   └──[Saison vorbei & „nur diese Saison"]─▶ expired ⏹
```
- Erlaubte Übergänge ausschließlich serverseitig (Edge/RLS), Audit-Pflicht je Übergang. Terminal: `converted`, `removed`, `expired`. Re-Abo = **neuer** Eintrag (keine Rück-Mutation, `CORE_BUSINESS_STATE_MACHINES.md` §0.1.7).

---

## 5 · Saison-Radar-Ansicht (Frontend, End-to-End)

**Route:** `/saison` (zusätzlich Deep-Link `/saison?monat=06&kategorie=Obst&plz=49074`). Öffentlich erreichbar (kein Login-Zwang) — Pfeiler 2/3.

### 5.1 Aufbau

1. **Monatswähler** (12 Monate, Default = aktueller Monat aus Client-Zeit, serverseitig gegengeprüft). Persistiert im URL-Query (Deep-Link, Pfeiler 7).
2. **Scope-Leiste (Pfeiler 3):** „Saison-Daten: **Deutschland** · Monat **Juni** · Datenstand **{updated_at max}** · Höfe gefiltert auf **PLZ 49074 / 25 km**". Macht Kontext + Datenstand sichtbar.
3. **Saison-Liste:** Erzeugnisse des Monats, gruppiert nach `category`, sortiert nach `intensity` (Hochsaison zuerst) → `sort_order`. Je Eintrag: DE-Name, Intensitäts-Indikator (Beginn/Saison/Hochsaison), `kind`-Badge (Freiland/Lager), redaktioneller `note`-Hinweis.
4. **Verfügbarkeits-Brücke je Erzeugnis:** „**3 Höfe in der Nähe haben Erdbeeren** (2× verfügbar, 1× wenig)" → Deep-Link in den Hofladen-Finder, vorgefiltert auf Kategorie/Erzeugnis. Klick öffnet `FarmDrawer` mit gescrolltem Produkt.
5. **Alert-Aktion** je Erzeugnis: „Benachrichtige mich" (§4) — verfügbar mit Konto **oder** Gast-Kontakt.
6. **„Bald wieder"-Block:** Erzeugnisse, deren Saison im **Folgemonat** beginnt (`intensity` springt von 0/1 auf ≥2) → Vorfreude + frühes Alert-Abo (Wiederbesuch, Wirtschaftlichkeit).

### 5.2 Zustände (alle real, kein Platzhalter — CLAUDE.md End-to-End-Pflicht)

| Zustand | UI |
|---|---|
| **Laden** | Skeleton-Liste (Design-System-Tokens, keine hardcodierten Farben). |
| **Daten** | Saison-Liste + Verfügbarkeits-Brücke + Alert-Buttons (alle Handler gebunden). |
| **Leer-Saison** (Monat ohne Freiland-Saison, z. B. Januar dünn) | **Zero-State** statt Fehler: „Im Januar ist Freiland-Saison ruhig. Diese Lagerware ist regional weiter verfügbar: …" + „Bald wieder"-Block — nie leerer Bildschirm, nie 500. |
| **Keine Höfe in Reichweite** | „Für dieses Erzeugnis ist aktuell kein Hof im Umkreis von {radius} km gelistet. Radius erweitern · Alert anlegen." |
| **Fehler** | Inline-Retry, Konsole sauber (kein `TypeError`/401-Loop). |

### 5.3 Datenfluss (Verdrahtung)

```
GET season_calendar (RLS public, is_published, month, region='DE')   ── Supabase REST/RPC
  └─▶ join-frei kombiniert mit ─────────────────────────────────────┐
GET products + availability (RLS public, status='published',         │
    seasonal/produce_key/category, availability)                     │
  └─▶ Aggregation im Edge-Read (RPC season_radar(month, plz, radius))┘
        → { erzeugnisse: [{ produce_key, display_name, category, intensity,
                            kind, note, hofTreffer: { available, low, soon, farms[] } }],
            scope: { region:'DE', month, plz, radius, datenstand } }
        → React Query → DOM (Liste/Brücke/Alerts/Zero-State)
```

> **Performance-Variante (Pfeiler/perf-cost):** Die Aggregation läuft als **DB-RPC `season_radar(p_month, p_plz, p_radius)`** (`SECURITY INVOKER`, respektiert RLS) statt mehrerer Round-Trips — eine Antwort, kein N+1. Distanz vorerst über `farms.lat/lng` (Haversine, wie `app/src/lib/geo.ts`); später GiST/PostGIS (Track B Karte). Ergebnis cachebar (Cloudflare Edge-Cache, kurzer TTL — Saisondaten ändern sich selten, Verfügbarkeit minütlich → getrennte TTLs: Kalender lang, Verfügbarkeit kurz).

---

## 6 · Datenpflege

### 6.1 Saisonkalender (Plattform-Redaktion / Staff)

- **Pflegeweg:** Staff-Konsole (Phase 3 Betriebszentrale) → Edge `season-calendar-admin` (service role). Kein direkter SQL-Eingriff, kein Erzeuger-Zugriff.
- **Pflegeeinheit:** Upsert je `(produce_key, month, region)` — additive Korrektur statt Duplikat (Unique-Index). Änderung → `version++`, alter Stand bleibt über `audit_log` (`old_values`/`new_values`) nachvollziehbar.
- **Initial-Seed (DE-Saisonmatrix):** lückenlose 12-Monats-Matrix für alle gelisteten Erzeugnisse je `category`. Migration `00xx_seed_season_calendar.sql`, idempotent (`ON CONFLICT (produce_key, month, region) DO NOTHING`). Beispiele (Auszug, Freiland DE, `intensity` 0–3):

| produce_key | display_name | category | Jan | Feb | Mär | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `erdbeere` | Erdbeeren | Obst | 0 | 0 | 0 | 0 | 2 | **3** | **3** | 2 | 1 | 0 | 0 | 0 |
| `spargel_weiss` | Weißer Spargel | Gemüse | 0 | 0 | 0 | 2 | **3** | **3** | 1 | 0 | 0 | 0 | 0 | 0 |
| `apfel` | Äpfel (Freiland/Lager) | Obst | 1L | 1L | 1L | 0 | 0 | 0 | 0 | 1 | **3** | **3** | 2 | 1L |
| `tomate` | Tomaten | Gemüse | 0 | 0 | 0 | 0 | 1 | 2 | **3** | **3** | **3** | 2 | 0 | 0 |
| `kartoffel` | Kartoffeln | Kartoffeln | 1L | 1L | 1L | 0 | 0 | 1 | 2 | **3** | **3** | **3** | 2 | 1L |
| `johannisbeere` | Johannisbeeren | Obst | 0 | 0 | 0 | 0 | 0 | **3** | **3** | 1 | 0 | 0 | 0 | 0 |
| `kuerbis` | Kürbis | Gemüse | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | **3** | **3** | 2 | 0 |
| `feldsalat` | Feldsalat | Gemüse | 2 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | **3** | 2 |
| `honig_blueten` | Blütenhonig | Honig | 0 | 0 | 0 | 1 | 2 | **3** | 2 | 1 | 0 | 0 | 0 | 0 |
| `schnittblumen` | Schnittblumen (Freiland) | Blumen | 0 | 0 | 0 | 1 | 2 | **3** | **3** | **3** | 2 | 1 | 0 | 0 |

> `L` = Lagerware (`kind='lager'`, `intensity=1`) — z. B. Lageräpfel/Kartoffeln im Winter. **Ganzjährig** (Eier, Käse, Mehl, Fleisch & Wurst, Säfte) werden als `kind='gewaechshaus'`/`keine` mit niedriger `intensity` geführt bzw. bewusst aus der Saison-Hervorhebung genommen — sie erscheinen im Finder regulär, treiben aber keinen Saison-Alert. **Saisonangaben sind redaktionelle Richtwerte für Deutschland** (Witterung/Region variieren) — Disclaimer in der UI.

### 6.2 Hof-Verfügbarkeit (Erzeuger-Selbstpflege)

- Erzeuger pflegt **nur** den eigenen Hof: `products.seasonal` (Saison-Kennzeichnung), optional `products.produce_key` (Feinschlüssel zur präzisen Brücke), `availability`-Satz (`status`, `qty_estimate`, `valid_from/valid_to`, `note`). Policies bereits in `DATABASE_MODEL.md` §7 (`owns_farm()` + `current_role_kind()='erzeuger'`).
- **Produce-Key-Vorschlag (UX):** Beim Pflegen schlägt die UI passende `produce_key`/`display_name` aus `season_calendar` der gewählten `category` vor (Datalist) — verhindert Tippfehler, hält die Brücke sauber. Frei lassbar (Fallback = `category`).
- **Konsistenz-Trigger:** bestehende Spiegelung `availability → products.availability` (`DATABASE_MODEL.md` §8) hält den Schnellfilter aktuell — der Radar liest immer den aktuellen `is_current`-Satz.
- **Keine Pflicht zur Kalender-Treue:** Ein Erzeuger darf außerhalb der DE-Saison anbieten (Gewächshaus/Import-frei) — der Radar zeigt dann „verfügbar, außerhalb der typischen Saison" statt den Hof auszublenden (ehrliche UI, keine Bevormundung; Vermittler-Rolle).

### 6.3 Pflege-Audit (Pfeiler 5)

Jede Kalender-Mutation und jeder Alert-Übergang → `audit_log` (append-only): `action` (`season.calendar.upsert` / `saison.alert.*`), `entity_type` (`season_calendar` / `waitlist`), `reason` (Pflicht bei Kalender-Änderung & Abbestellung), `old/new_values`, Akteur, IP/UA. Unabschaltbar (kein UPDATE/DELETE auf `audit_log`).

---

## 7 · Typen & Frontend-Kontrakt (`app/src/lib/types.ts`-Erweiterung)

Additiv, strict-konform, 1:1 zu DB. Quelle der Wahrheit bleibt `types.ts`.

```ts
export type SeasonKind = 'freiland' | 'lager' | 'gewaechshaus' | 'keine'

export interface SeasonEntry {
  produceKey: string            // 'erdbeere'
  displayName: string           // 'Erdbeeren'
  category: ProductCategory
  month: number                 // 1..12
  kind: SeasonKind
  intensity: 0 | 1 | 2 | 3      // 0 keine · 1 Beginn/Ende · 2 Saison · 3 Hochsaison
  region: string                // 'DE'
  note?: string | null
}

export interface SeasonHofTreffer {
  available: number             // Anzahl Höfe mit status 'available'
  low: number
  soon: number
  farms: Array<Pick<Farm, 'id' | 'name' | 'plz' | 'city' | 'distanceKm'>>
}

export interface SeasonRadarItem extends SeasonEntry {
  hofTreffer: SeasonHofTreffer  // leere Treffer → Zero-State im Frontend
}

export interface SeasonAlertInput {
  produceKey?: string           // erzeugnisweit  ─┐ genau eines von beiden
  productId?: string            // produktgebunden ─┘
  category?: ProductCategory
  contact: string               // E-Mail/Telefon (bei Gast)
  marketingConsent: boolean     // DSGVO-Einwilligung (Pflicht: true)
  onlyThisSeason?: boolean      // true → expired nach Saisonende
}
```

> Der Data-Layer (`app/src/lib/data.ts`) schaltet wie beim Finder automatisch von Seed-Fallback auf Supabase, sobald `VITE_SUPABASE_*` gesetzt ist (ADR 0002). Solange ohne Supabase: ein **Seed-Saisonkalender** (`app/src/lib/seedSeason.ts`, klar als Demo gekennzeichnet) treibt die Ansicht — kein Fake in Prod, aber spielbar sofort (Doppel-Ziel).

---

## 8 · Skalierung & Zukunft (10 → 300 → 3000)

- **Regionalisierung:** `season_calendar.region` ist vorbereitet (`'DE'` → Bundesland-/Klimazonen-Codes). Additive Befüllung; Lookup-Index trägt `region` bereits an erster Stelle.
- **Erzeugnis-Synonyme/Sorten:** `produce_key` erlaubt Sorten-Tiefe (`spargel_weiss` vs. `spargel_gruen`) ohne neue Kategorien.
- **Caching-Strategie:** Kalender (selten änderlich) lang cachen (Cloudflare Edge, langer TTL + Versions-Invalidierung über `version`); Verfügbarkeit kurz (minütlich). Getrennte Cache-Keys verhindern, dass Live-Verfügbarkeit hinter altem Kalender-Cache verschwindet.
- **Alert-Wellen bei 1000+ Abos:** `queue_rank` + Batch-Versand über Kern-Notification-Bus (Rate-Limit-bewusst), Idempotenz pro Fenster.
- **Blueprint-Wiederverwendung:** Das Muster „kuratierter Referenzkalender × Live-Verfügbarkeit × Alert-Abo" ist imperiumsweit übertragbar (z. B. Veranstaltungs-/Markt-Saisons anderer ConnectCore-Töchter) — Tabellen-/Edge-/RLS-Schnitt bleibt identisch.

---

## 9 · Sicherheit & DSGVO

- **Einwilligung:** Alert-Abos (Gast & Konto) nur mit expliziter Einwilligung (`profiles.marketing_opt_in` bzw. Checkbox + Double-Opt-in). Zweck in Klartext, jederzeit widerrufbar (Unsubscribe-Link/`→ removed`).
- **Gast-Kontakt:** `contact` minimaldatenarm (nur E-Mail/Telefon für den Alert-Zweck). Soft-Delete + DSGVO-Löschpfad (Edge-Job + Audit), wie alle Tabellen.
- **Turnstile + Zod** an jedem öffentlichen Saison-Alert-Formular (Cloudflare). Rate-Limits gegen Abo-Spam.
- **Kein Secret im Client**, service role nur in Edge Functions; Frontend nur `VITE_`-Public-Keys.
- **Unsubscribe-Token** signiert (HMAC, kurzlebig) — kein ID-Erraten fremder Abos.
- **Audit** unabschaltbar (Pflege + Alert-Übergänge).

---

## 10 · Edge Functions (Deno) — Inventar

| Function | Auslöser | Aufgabe | Rechte |
|---|---|---|---|
| `season-calendar-admin` | Staff-Konsole | Upsert/Soft-Delete Kalender, Versionierung, Audit | service role, `is_staff()`-Gate |
| `saison-alert-subscribe` | öffentliches/Konto-Formular | Zod + Turnstile + Anti-Doppel + Insert `waitlist(source='saison_radar')` + Double-Opt-in | service role |
| `saison-alert-unsubscribe` | signierter Link | `waitlist → removed`, Audit | service role, Token-Verifikation |
| `saison-alert-dispatch` | **Scheduled (Cron)** | fällige Abos selektieren, Kern-Notification triggern, `→ notified`, Idempotenz pro Fenster, Audit | service role |
| RPC `season_radar(p_month, p_plz, p_radius)` | Frontend (Read) | aggregierte Saison×Verfügbarkeit×Distanz-Antwort, RLS-respektierend | `SECURITY INVOKER` |

> Alle: Zod-Validierung an der Grenze, Rechteprüfung, Audit, Turnstile bei öffentlichen Formularen (`CLAUDE.md` Edge-Regeln). Webhook-/Cron-Idempotenz pro Auslöse-Fenster.

---

## 11 · Vermittler-Disclaimer (durchgängig, Pflicht)

In Saison-Radar-Ansicht, Brücken-Hinweisen und Alert-Mails sichtbar:

> „**Saisonangaben sind redaktionelle Richtwerte für Deutschland.** Tatsächliche Ernte, Verfügbarkeit, Qualität und Preis legt jeder Hof selbst fest und können je nach Witterung und Region abweichen. LokaleBauernConnect **vermittelt** den Kontakt zwischen Käufer und Hof und verkauft nicht selbst. Vertragspartner ist immer der Hof."

Keine Gesundheits-/Ernährungsaussagen. Lebensmittel-Kennzeichnung verantwortet der Hof (Hinweis im Compliance-Modell).

---

## 12 · Akzeptanzkriterien (Definition of Done)

Ein Kriterium gilt erst als erfüllt, wenn End-to-End verdrahtet (Endpoint → Fetch → DOM → Zustände → Handler) und getestet (`CLAUDE.md` Verifikation).

### 12.1 Funktional
- [ ] `/saison` lädt öffentlich (ohne Login), Default-Monat = aktueller Monat, Monatswähler ändert Liste + URL-Query (Deep-Link).
- [ ] Jeder Saison-Eintrag zeigt DE-Name, Intensität, `kind`-Badge, redaktionellen Hinweis — sortiert Hochsaison → `sort_order`.
- [ ] Verfügbarkeits-Brücke zeigt je Erzeugnis die **echte** Hof-Trefferzahl (available/low/soon) aus `availability`, Deep-Link in den Finder funktioniert (öffnet richtigen Hof/Produkt).
- [ ] „Bald wieder"-Block zeigt Erzeugnisse mit Saisonstart im Folgemonat.
- [ ] Alert-Abo anlegbar a) eingeloggt (Profil-Einwilligung), b) als Gast (Turnstile + Double-Opt-in) — beide produktgebunden **und** erzeugnisweit.
- [ ] Wird ein abonniertes Produkt/Erzeugnis wieder `available`/saison-aktiv, erhält der Abonnent **genau eine** Benachrichtigung (Idempotenz), Status `→ notified`.
- [ ] Abbestellen (Konto `→ removed`, Gast über signierten Link) funktioniert; danach kein Versand mehr.

### 12.2 Zero-State & Scope (Pfeiler 2/3)
- [ ] Monat ohne Freiland-Saison (z. B. Januar) → Zero-State mit Lagerware/„Bald wieder", **nie** 500/leerer Screen.
- [ ] Erzeugnis ohne Hof im Radius → Zero-State („Radius erweitern / Alert anlegen"), kein Fehler.
- [ ] Scope-Leiste zeigt Region (DE), Monat, PLZ/Radius, Datenstand (`max(updated_at)`).

### 12.3 Sicherheit & Isolation (Pfeiler 1/4/6)
- [ ] `anon` liest nur `is_published` Kalendereinträge; INSERT/UPDATE auf `season_calendar` = abgelehnt (403-Pfad), 0 Policies für nicht-Staff.
- [ ] Erzeuger kann den Kalender **nicht** mutieren (nur eigenen Hof: `products.seasonal/produce_key`, `availability`).
- [ ] Käufer A sieht/ändert Saison-Abo von Käufer B nicht; Org B liest keine Saison-Abos/Höfe von Org A (Cross-Org-Negativtest = 0 Zeilen, nie 200 mit Fremddaten).
- [ ] Gast-Abo nur über Edge (Turnstile/Zod/Anti-Doppel); direktes `anon`-INSERT nicht möglich.

### 12.4 Audit & DSGVO (Pfeiler 5)
- [ ] Jede Kalender-Pflege → `audit_log` (`reason` Pflicht, `old/new_values`, Akteur).
- [ ] Jeder Alert-Übergang (`subscribe/notified/removed/expired`) → `audit_log`.
- [ ] Einwilligung dokumentiert (Double-Opt-in/`marketing_opt_in`); Widerruf wirksam; Soft-Delete + Löschpfad vorhanden.

### 12.5 Datenmodell & Migration
- [ ] Migrationen additiv (`season_calendar`, `products.produce_key`, `waitlist.produce_key/category`), RLS deny-by-default, dokumentierte Rollback-Strategie, Isolationstest grün (Migrations-Gate).
- [ ] Seed-Saisonmatrix idempotent (`ON CONFLICT … DO NOTHING`), als Demo gekennzeichnet, nur Dev/Staging — nie Prod-Personendaten.

### 12.6 Build & Qualität
- [ ] `npm run build` grün, TS strict ohne `any`, Design-System-Tokens (keine hardcodierten Farben, keine Deko-Emojis), Konsole sauber.
- [ ] Disclaimer in Ansicht + Alert-Mail sichtbar.
- [ ] Tests: RPC-Shape, Idempotenz des Dispatch, Anti-Doppel-Abo, Zero-State, Cross-Org/anon-Negativ.

---

## 13 · Bezug zu den 7 Produktionspfeilern

| Pfeiler | Beleg im Saison-Radar |
|---|---|
| 1 Org-Boundary | Verfügbarkeits-Brücke & Abos org-gebunden via RLS; Kalender plattformweit, Schreibgate Staff/Service-Role; fremde Org = 0 Zeilen. |
| 2 Zero-State | Leere Monate/keine Höfe → Zero-State (Lagerware/„Bald wieder"), nie 500. |
| 3 Scope-Transparenz | Scope-Leiste (Region/Monat/PLZ/Radius/Datenstand); Antwort trägt `scope`. |
| 4 RBAC | Käufer (Abo) / Erzeuger (eigene Verfügbarkeit) / Staff (Kalender) sauber getrennt. |
| 5 Audit | Kalender-Pflege + Alert-Übergänge append-only, `reason`-Pflicht. |
| 6 Testpflicht | §12.3/§12.4-Negativtests (anon/Cross-Org/Idempotenz) als Gate. |
| 7 Drilldown | Deep-Links `/saison?monat=…` → Finder/Hof/Produkt; nie org-fremde URL. |

---

## 14 · Phasen-/Wellen-Bezug

- **Phase 1 WAVE_04 D** liefert das **Minimal-Spielbare**: Saison-Liste aus Seed-Kalender + Verfügbarkeits-Brücke (read-only, ohne Cron-Dispatch). Sofort online (Doppel-Ziel).
- **Phase 4 Track C** baut die volle Tiefe: `season_calendar`-Tabelle + Staff-Pflege, Alert-Abos (`waitlist`-Pfad), Cron-Dispatch über Kern-Notification, Regionalisierungs-Vorbereitung. Eigener ADR bei Architekturentscheidung „Referenzkalender als eigene Tabelle".
- **Status-Tracker:** Fortschritt in `docs/releases/PHASE_STATUS.md`; `MASTER_INDEX.md` 3 · Produkt & Spezialmodule auf ✅ setzen, sobald implementiert.

---

## Abschlussbericht-Bezug (Welle)

```
## Welle abgeschlossen: WAVE_04 D / Phase 4 Track C — Saison-Radar
- Geändert: docs/spezialmodule/SAISON_RADAR.md (Spec); (Impl: season_calendar-Migration, RPC season_radar, Edge saison-alert-*, /saison-Route, types.ts-Erweiterung)
- Tests: Isolation/anon-Read, Alert-Idempotenz, Anti-Doppel, Zero-State, Build grün
- Risiken: Kalender-Pflegedisziplin (Staff); Cache-TTL-Trennung Kalender vs. Verfügbarkeit
- Nächste Welle: Track B (Karte) für „in der Nähe"-Präzision (PostGIS), Track C-Dispatch-Härtung
```
