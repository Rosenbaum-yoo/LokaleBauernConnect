# Track C — Saison & Benachrichtigungen (Saison-Radar · Alerts · Datenpflege)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> **Phase 4, Track C** (`PHASEN.md` → „Track C — Saison & Benachrichtigungen: Saison-Radar, Alerts bei Lieblingsprodukten/Verfügbarkeit"). **Ein Track-Slice / eine Welle pro Session.**
> **Prio:** P1/P2 (Pilot- & marken­kritisch) mit **P0-Kern** in der Vermittler-/Einwilligungs-Wahrheit (Alert = personenbezogene Kommunikation → Double-Opt-In, Abbestellung, kein Spam, kein PII-Leck). Saison-Radar selbst ist Erlebnis/Polish (P2); die **Benachrichtigung** ist rechtlich + vertrauensseitig sensibel.
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker, kein eigener Mail-Server, kein Push-Vendor-Lock-in.**
> **Rolle = VERMITTLER** — kein Eigenverkauf, keine Beratung, keine Mengen-/Liefergarantie. Ein Saison-/Verfügbarkeits-Alert ist ein **Hinweis des Hofs, weitergereicht durch die Plattform**, nie ein Verkaufsversprechen. Disclaimer durchgängig — auch in jeder E-Mail.

---

## 0. Was Track C ist — und was er NICHT ist

**Track C macht aus statischen Hof-Daten ein lebendiges, vertrauenswürdiges Saison-Erlebnis** und schließt die Schleife zum Käufer: *„Sag mir Bescheid, wenn die Erdbeeren bei meinem Hof wieder da sind."* Drei verzahnte Bausteine:

1. **Saison-Radar** — eine kuratierte, datengetriebene Sicht „**Was gibt es gerade frisch?**": welche Kategorien/Produkte in der laufenden Saison stehen, was demnächst beginnt (`soon`), was bald endet. Heute getragen vom `products.seasonal`-Flag + `availability_state`; vorausschauend über additive Monatsfenster (`season_from`/`season_to`).
2. **Alerts (Benachrichtigungen)** — Käufer abonniert **Lieblingsprodukte / Kategorien / einen konkreten Hof** und wird benachrichtigt, wenn (a) ein Produkt von `out`/`soon` auf `available`/`low` wechselt oder (b) eine Kategorie regional Saison-Eintritt hat. **Double-Opt-In, idempotent, abbestellbar, EU-konform.**
3. **Datenpflege** — der Mechanismus, der die Wahrheit ehrlich hält: **Erzeuger-Selbstpflege** der Saison-Felder, ein **Frische-Signal** (`availability_updated_at` → „heute aktualisiert" / „könnte veraltet sein"), Saison-Defaults pro Kategorie als Vorschlag (nie als harte Wahrheit), und der Cron-getriebene Abgleich, der Alerts auslöst, ohne zu lügen.

> **Domain owns truth, Plattform owns aggregation** (`01_PRIORITIES.md` §0). Die Saison-/Verfügbarkeits-Wahrheit besitzt der **Hof** (`org_id`). Track C aggregiert, visualisiert und benachrichtigt — er **erfindet keine Verfügbarkeit** und schaltet **nie automatisch** ein Produkt auf „verfügbar", nur weil der Kalender es nahelegt.

**Track C ist NICHT:**
- **kein zweiter Reservierungs-/Bezahl-Pfad** — Track A (SB-Bezahlung) und der Reservierungs-Kernflow (WAVE_04) bleiben unangetastet; ein Alert verlinkt nur dorthin.
- **kein generisches In-App-Notification-Framework / keine „Glocke" mit Aktivitäts-Center** — das ist VMS-/Plattform-Kern-Denken und gehört nicht in eine Käufer-Vermittlungs-App. Käufer sind überwiegend **anonym/gelegentlich**; der Kanal ist **E-Mail (Default) bzw. Web-Push (opt-in)**, nicht ein Postfach-System.
- **kein Marketing-Newsletter** — ein Alert ist **transaktional/themenbezogen** und vom Nutzer **konkret angefordert** (Double-Opt-In auf genau dieses Produkt/diese Kategorie/diesen Hof). Werbliche Sammelmails sind ausdrücklich außerhalb des Scopes (eigene Einwilligung, eigene Welle).
- **keine automatische Schwund-/Bestands-Logik** — Auto-Dekrementierung von `stock_qty` bei SB-Verkauf ist explizit **P3 mit eigenem ADR** (`01_PRIORITIES.md` §P3: „würde lügen — Offline-Verkauf").

---

## 1. Ist-Zustand (repo-genau geprüft — Stand dieser Welle)

| Fakt (real im Repo) | Stand | Konsequenz für Track C |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` — `products.seasonal boolean default false`, Enum `availability_state ('available','low','soon','out')`, `products.category` (Enum `product_category`, 11 Werte) | ✅ | **Saison-Radar v1 baut hierauf** (Flag + Status). Kein neues Kern-Datenmodell nötig für den Marktstart. |
| `app/supabase/migrations/0001_core.sql` — RLS deny-by-default; `products_public_read` (anon/auth lesbar), `products_owner_write` (org-gebunden), `audit_log` (nur service_role) | ✅ | Saison-Felder folgen denselben Policies. Alerts brauchen **neue** Tabellen mit eigener deny-by-default-RLS. |
| `products` hat **kein** `availability_updated_at`, **kein** `season_from`/`season_to`, **kein** `stock_qty` | ❌ fehlt | **Additive Migration `0006_season_alerts.sql`** ergänzt Frische-Signal + optionale Monatsfenster. `stock_qty` bleibt **out of scope** (P3/ADR). |
| Alert-/Favoriten-/Notification-Tabellen (`favorites`, `alert_subscriptions`, `notification_log`) | ❌ existieren nicht | **Neu** in `0006_season_alerts.sql` — Kernstück des Tracks. |
| `app/supabase/functions/_shared/email.ts` — Provider-Abstraktion (`resend`/`sendgrid`/console-Fallback), `layout()` mit Vermittler-Fußzeile, `renderReservation`/`renderReceipt` | ✅ | **Wiederverwenden** — neue Templates `renderAlertConfirm` (Double-Opt-In) + `renderAlert` ergänzen, **keine** zweite Mail-Schicht. |
| `app/supabase/functions/_shared/supabaseAdmin.ts` (`admin()`, service_role), `_shared/cors.ts` | ✅ | Edge Functions des Tracks nutzen ausschließlich diese Helfer. |
| `app/supabase/functions/_shared/rateLimit.ts` (WAVE_06: `allow(...)`, DB-gestützt) | ✅ (laut WAVE_13-Bezug) | Öffentliches Abonnieren wird darüber gedrosselt — **nicht** duplizieren. |
| Turnstile-Verifikation + Zod an öffentlichen Formularen (`submit-form`, WAVE_06) | ✅ Muster vorhanden | Das öffentliche „Benachrichtigen"-Formular folgt exakt diesem Muster (Turnstile + Zod + Rate-Limit). |
| `src/components/AvailabilityBadge.tsx` — `Record<Availability,{label,cls}>`, Tokens via `lbc-badge`/`av-*` | ✅ | Saison-Badge wird **derselbe Baustein-Stil** (neuer `seasonal`-Modifier), keine neue Farbe. |
| `src/components/{FarmCard,FarmDrawer}.tsx`, `src/pages/FinderPage.tsx`, `src/lib/{types,data,seed}.ts` | ✅ | Saison-Radar-CTA + „Benachrichtigen" docken hier an; `Product.seasonal?` ist in `types.ts` bereits typisiert. |
| `src/lib/types.ts` — `Product.seasonal?: boolean`, kein `seasonFrom/seasonTo`, kein `availabilityUpdatedAt` | teilweise | Typen additiv erweitern (optional) — bestehende Felder unverändert. |
| `app/supabase/functions/stripe-webhook/index.ts` — Idempotenz via `payment_events`-PK (WAVE_09) | ✅ Muster | **Idempotenz-Vorlage** für `notification_log` (Unique-Constraint statt Doppelversand). |
| `docs/spezialmodule/SAISON_RADAR.md` | ❌ geplant (`MASTER_INDEX.md` Abschnitt 3) | **Erste Doku-Aufgabe** des Tracks: dieses Spezialmodul kanonisch anlegen (Spezifikation des Radars). |
| `01_PRIORITIES.md` — P1 „Frische-Signal `availability_updated_at`", P1 „Benachrichtigungen idempotent (`notification_log` Unique)", P3 „`season_from`/`season_to`", P2 „Saison-Radar-Erlebnis" | ✅ verankert | Track C **erfüllt** genau diese bereits priorisierten Punkte — kein neuer Scope, sondern deren Umsetzung. |
| Cron-Mechanik (Supabase `pg_cron` / Cloudflare Scheduled Worker) | ❌ noch nicht eingerichtet | Der Verfügbarkeits-Diff-Job braucht **einen** getakteten Trigger — Owner-Freigabe (Account/Kosten). |

> **Abweichung zum TempConnect-Blueprint dokumentiert (Stop-Regel 1/13):** Die Referenz `finalization/phase4_vertical/TRACK_D_NOTIFICATIONS.md` beschreibt ein dreistufiges In-App-Modell (Glocke = Quick-Preview · Card-Badges · Activity Center) für eine **eingeloggte Mitarbeiter-/SCC-Welt** mit VMS-Begriffen (Requisitions, Einsatzportal, SCC). Das ist hier **bewusst nicht** übernommen: LokaleBauernConnect-Käufer sind anonym/gelegentlich, der relevante Kanal ist **angeforderte E-Mail/Web-Push**, und „SCC/Einsatzportal/Requisition" sind verbotene Begriffe (`00_RULES.md` §4). Adaptiert auf die Hof-Domäne: **Saison-Radar (Käufer-Erlebnis) + opt-in-Alert (transaktionale Hof-Hinweise) + Erzeuger-Datenpflege**. Übernommen wird nur das *Prinzip* der Referenz: **eine kanonische Zähl-/Wahrheitsquelle, keine Doppelzählung, Zero-State = unverändert, jede Notification hat ein konkretes Ziel (`target_route`).**

---

## 2. Welten-Abgrenzung (verbindlich, `00_RULES.md` §8)

| Welt | Darf in Track C | Niemals |
|---|---|---|
| **Käufer** (anon + eingeloggt) | Saison-Radar sehen · Produkt/Kategorie/Hof als „Benachrichtigen" abonnieren (Double-Opt-In) · eigene Abos über Token-Link verwalten/abbestellen · (eingeloggt) Favoriten setzen | fremde Abos/Kontakte sehen · Verfügbarkeit ändern · Erzeuger-Saisonfelder pflegen |
| **Erzeuger** (org-gebunden) | eigene Produkte als `seasonal` markieren · `season_from`/`season_to` pflegen · Verfügbarkeit pflegen (löst Alerts aus) · sehen **wie viele** Käufer ein eigenes Produkt beobachten (aggregierte Zahl, **keine** Kontaktdaten) | fremde Höfe/Orgs sehen · Käufer-Kontakte/-Abos einsehen · für andere Höfe benachrichtigen |
| **Staff/Owner** (Betriebszentrale, Phase 3) | Versand-Health, Bounce-/Fehlerquote, Abo-Aggregat sehen · Saison-Defaults pro Kategorie kuratieren (auditiert) · einen Alert-Versand pausieren (Confirm + Reason + Audit) | unauditierter Massenversand · Käufer-PII exportieren ohne Audit · Saison-Wahrheit eines Hofs still überschreiben |

Sessions/Tokens strikt getrennt. Jede org-fremde Query = **403**. Abo-Verwaltung läuft über einen **unrate­baren Token** (128-bit CSPRNG), nie über eine ratbare ID — analog zur `pickup_code`-Regel (`01_PRIORITIES.md` P0 „Token-Enumeration").

---

## 3. Datenmodell — additive Migration `app/supabase/migrations/0006_season_alerts.sql`

> **Regeln:** additiv · idempotent · RLS deny-by-default ab dieser Migration · Rollback als Kommentar am Dateiende · jede neue Tabelle hat Zeitstempel; personenbezogene Tabellen haben `deleted_at`/Abbestell-Pfad. Keine destruktive Änderung an `0001`–`0003`.

### 3.1 Saison-Felder + Frische-Signal (additiv auf `products`)

```sql
-- Frische-Signal (P1): Käufer sieht ehrlich, wie aktuell der Verfügbarkeits-Status ist.
alter table products add column if not exists availability_updated_at timestamptz not null default now();

-- Vorausschauendes Saison-Fenster (P3 → hier optional aktivierbar): Monat 1..12, NULL = ganzjährig/unbekannt.
alter table products add column if not exists season_from smallint
  check (season_from is null or season_from between 1 and 12);
alter table products add column if not exists season_to   smallint
  check (season_to   is null or season_to   between 1 and 12);

-- Trigger: bei jeder Änderung von availability das Frische-Signal nachziehen (Wahrheit bleibt ehrlich).
create or replace function touch_availability_updated_at() returns trigger language plpgsql as $$
begin
  if new.availability is distinct from old.availability then
    new.availability_updated_at = now();
  end if;
  return new;
end $$;

drop trigger if exists products_touch_availability on products;
create trigger products_touch_availability before update on products
  for each row execute function touch_availability_updated_at();
```

> **Saison-Logik (Wrap-around erlaubt):** Ein Produkt steht „in Saison", wenn der aktuelle Monat im Fenster `[season_from, season_to]` liegt — inkl. Jahreswechsel (`season_from=11, season_to=2` = Nov–Feb). `season_*` ist **Kuratierung/Vorschau**, nicht Verfügbarkeit: Der Radar zeigt „Saison beginnt bald", die **harte Verfügbarkeit bleibt `availability_state`** (vom Hof gepflegt). Nie automatisch `available` setzen.

### 3.2 Favoriten (nur eingeloggte Käufer)

```sql
create table if not exists favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  farm_id    text references farms(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  category   product_category,
  created_at timestamptz not null default now(),
  -- genau EIN Bezug pro Favorit (Hof ODER Produkt ODER Kategorie)
  check ( (farm_id is not null)::int + (product_id is not null)::int + (category is not null)::int = 1 ),
  primary key (user_id, farm_id, product_id, category)
);
create index if not exists favorites_user_idx on favorites (user_id);
```

### 3.3 Alert-Abos (Käufer, kanal-agnostisch, Double-Opt-In)

```sql
do $$ begin
  create type alert_target as enum ('product','category','farm');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_channel as enum ('email','webpush');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_status as enum ('pending','active','paused','unsubscribed');
exception when duplicate_object then null; end $$;

create table if not exists alert_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,  -- NULL = anonymer Käufer (nur E-Mail)
  target        alert_target not null,
  product_id    text references products(id) on delete cascade,
  category      product_category,
  farm_id       text references farms(id) on delete cascade,
  plz           text,                                  -- für Kategorie-Alerts: regionale Eingrenzung
  radius_km     integer default 25 check (radius_km between 1 and 200),
  channel       alert_channel not null default 'email',
  contact       text,                                  -- E-Mail (verschlüsselt-at-rest via Supabase); bei webpush NULL
  webpush_sub   jsonb,                                 -- Web-Push-Subscription (endpoint+keys), nur channel='webpush'
  status        alert_status not null default 'pending',
  manage_token  text not null default encode(gen_random_bytes(24),'hex'),  -- 192-bit, unratbar (Verwaltung/Abbestellen)
  confirm_token text not null default encode(gen_random_bytes(24),'hex'),  -- Double-Opt-In-Bestätigung
  confirmed_at  timestamptz,
  last_alert_at timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  -- Ziel-Konsistenz: das passende Ziel-Feld muss gesetzt sein
  check (
    (target='product'  and product_id is not null) or
    (target='category' and category   is not null) or
    (target='farm'     and farm_id    is not null)
  )
);
create unique index if not exists alert_subs_manage_token_idx  on alert_subscriptions (manage_token);
create unique index if not exists alert_subs_confirm_token_idx on alert_subscriptions (confirm_token);
create index if not exists alert_subs_product_active_idx on alert_subscriptions (product_id)  where status='active';
create index if not exists alert_subs_category_active_idx on alert_subscriptions (category)   where status='active';
create index if not exists alert_subs_farm_active_idx on alert_subscriptions (farm_id)        where status='active';
-- Dedupe: ein Kontakt abonniert dasselbe Ziel nur einmal (kein Doppel-Alert).
create unique index if not exists alert_subs_dedupe_idx
  on alert_subscriptions (coalesce(contact,''), target, coalesce(product_id,''), coalesce(category::text,''), coalesce(farm_id,''))
  where deleted_at is null;
```

### 3.4 Versand-Log (Idempotenz + Audit der Zustellung)

```sql
-- Kanonische Versand-Wahrheit: verhindert Doppelversand, trägt Zustell-Status (P1).
create table if not exists notification_log (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references alert_subscriptions(id) on delete set null,
  event_key       text not null,           -- Idempotenz-Schlüssel: <product_id>:<availability>:<availability_updated_at-epoch>
  kind            text not null,           -- 'confirm' | 'restock' | 'season_start'
  channel         alert_channel not null,
  status          text not null default 'queued' check (status in ('queued','sent','failed','bounced')),
  provider        text,
  error           text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
-- Ein Ereignis je Abo nur EINMAL (Idempotenz, kein Doppelversand bei Cron-Retry).
create unique index if not exists notification_log_idem_idx on notification_log (subscription_id, event_key);
create index if not exists notification_log_status_idx on notification_log (status, created_at);
```

### 3.5 RLS — deny-by-default

```sql
alter table favorites           enable row level security;
alter table alert_subscriptions enable row level security;
alter table notification_log    enable row level security;

-- Favoriten: jede:r sieht/pflegt nur die eigenen.
drop policy if exists favorites_self on favorites;
create policy favorites_self on favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Alert-Abos: eingeloggte Käufer lesen/verwalten eigene; anonyme Verwaltung NUR via Edge Function (manage_token).
-- Anlage erfolgt über die Edge Function (Turnstile + Zod) als service_role — KEINE anon-Insert-Policy
-- (verhindert PII-Spam direkt gegen die Tabelle; öffentlicher Schreibpfad ist die geschützte Function).
drop policy if exists alert_subs_self_read on alert_subscriptions;
create policy alert_subs_self_read on alert_subscriptions for select to authenticated
  using (user_id = auth.uid());
drop policy if exists alert_subs_self_manage on alert_subscriptions;
create policy alert_subs_self_manage on alert_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Erzeuger sieht AGGREGAT (Anzahl Beobachter je eigenem Produkt), nie Kontakte → über security-definer-View (3.6),
-- nicht über eine Row-Policy auf alert_subscriptions (sonst Kontakt-Leak).

-- notification_log: keine Policy für anon/authenticated → ausschließlich service_role (Versand-Wahrheit).
```

### 3.6 Aggregat-Sicht für Erzeuger (kein Kontakt-Leak)

```sql
-- Erzeuger sieht NUR Zahlen: "12 Käufer beobachten 'Erdbeeren'". Keine Kontakte, keine user_ids.
create or replace view product_watch_counts
with (security_invoker = true) as
  select p.id as product_id, p.farm_id, p.org_id, count(s.id)::int as watchers
  from products p
  left join alert_subscriptions s
    on s.product_id = p.id and s.status = 'active' and s.deleted_at is null
  group by p.id, p.farm_id, p.org_id;
-- security_invoker=true → die View erbt die products-RLS (org_owner_write/public_read) des Aufrufers;
-- alert_subscriptions bleibt durch deny-by-default geschützt, nur das count() passiert serverseitig im View-Owner-Kontext.
-- (Falls security_invoker die count-Spalte blockiert: gekapselte security-definer-Funktion get_watch_count(p_product)
--  mit is_org_member-Prüfung als Alternative — Entscheidung im ADR.)
```

> **Rollback (Migrationsfuß als Kommentar):** `drop view if exists product_watch_counts; drop table if exists notification_log, alert_subscriptions, favorites; drop type if exists alert_status, alert_channel, alert_target; drop trigger ...; alter table products drop column if exists season_from, season_to, availability_updated_at;` — reine additive Rücknahme, kein Datenverlust an Bestandstabellen.

---

## 4. Edge Functions (Supabase/Deno) — `app/supabase/functions/`

> Jede Function: **Zod an der Grenze · service_role nur hier · Audit · Turnstile + Rate-Limit auf öffentlichen Pfaden · Zero-State statt 500 · `request_id`-Log (WAVE_13)**. Wiederverwendet `_shared/{cors,supabaseAdmin,email,rateLimit,logger}.ts` — keine Parallel-Helfer.

### 4.1 `alert-subscribe/index.ts` (neu) — öffentliches „Benachrichtigen" (Double-Opt-In)

- **Methode:** `POST` (anon + auth). **Schutz:** Turnstile-Token + `allow('alert-subscribe', req, ...)` (Rate-Limit) + Zod.
- **Zod-Schema:** `{ target:'product'|'category'|'farm', productId?, category?, farmId?, plz?, radiusKm?, channel:'email'|'webpush', contact? (email), webpushSub?, turnstileToken }` — ziel-konsistent validiert (genau ein Ziel gesetzt; bei `email` ist `contact` Pflicht und RFC-grob geprüft).
- **Ablauf:** Dedupe-Lookup (`alert_subs_dedupe_idx`) → bei Treffer reaktivieren statt duplizieren → sonst `insert ... status='pending'` (service_role) → `confirm_token` generieren → **`renderAlertConfirm`-Mail** versenden (Double-Opt-In). **Antwort immer `{ ok:true }`** (kein E-Mail-Enumeration-Orakel: gleiche Antwort, ob Kontakt neu oder bekannt).
- **Audit:** `audit_log` `action='alert.subscribe_requested'`, `entity_type='alert_subscription'`, **PII maskiert** (Kontakt nur gehasht/teilmaskiert in `details`).
- **Zero-State/Fehler:** ungültiges Ziel → 422 mit Editorial-Meldung; Turnstile-Fail → 403; Rate-Limit → 429. Nie 500 bei leerer Eingabe.

### 4.2 `alert-confirm/index.ts` (neu) — Double-Opt-In bestätigen

- **Methode:** `GET ?token=<confirm_token>` (Link aus der Bestätigungsmail). Setzt `status='active'`, `confirmed_at=now()`, invalidiert `confirm_token`. Audit `action='alert.confirmed'`. Antwort: schlanke HTML-Bestätigungsseite (Editorial, Vermittler-Fußzeile, „Abo verwalten/abbestellen"-Link mit `manage_token`).
- **Sicherheit:** Token 192-bit, einmalig; unbekannter/abgelaufener Token → neutrale „Link ungültig"-Seite (kein Statusleck).

### 4.3 `alert-manage/index.ts` (neu) — verwalten/abbestellen (anon-fähig via Token)

- **Methoden:** `GET ?token=<manage_token>` (Status anzeigen) · `POST {token, action:'pause'|'resume'|'unsubscribe'}`. Setzt `status` bzw. `deleted_at`. Audit `action='alert.unsubscribed'|'alert.paused'`. **DSGVO-Pflicht:** Abbestellen ist **ohne Login** möglich (Token-Link in jeder Mail). One-Click-Unsubscribe-Header (`List-Unsubscribe`) in der E-Mail gesetzt.

### 4.4 `season-sync/index.ts` (neu, Cron-getriggert) — Verfügbarkeits-Diff → Alerts

- **Trigger:** getaktet (Supabase `pg_cron` ruft die Function, **oder** Cloudflare Scheduled Worker → Function; Owner entscheidet Mechanik). Kein öffentlicher Aufruf: geschützt per `CRON_SECRET`-Header-Vergleich (constant-time).
- **Ablauf (idempotent):**
  1. Lies Produkte, deren `availability` seit letztem Lauf von `out`/`soon` → `available`/`low` wechselte (Diff über `availability_updated_at`).
  2. Pro Treffer: finde aktive Abos (`alert_subscriptions` `status='active'`) mit `target='product'` (=dieses Produkt), `target='farm'` (=Hof des Produkts) oder `target='category'` (=Kategorie **und** PLZ-Radius passt, via `lib/geo`-Distanz).
  3. Pro (Abo × Ereignis): `event_key = '<product_id>:<availability>:<epoch(availability_updated_at)>'`. **`insert into notification_log (... ) on conflict (subscription_id,event_key) do nothing`** — Treffer = bereits versandt → überspringen (Idempotenz, kein Doppelversand bei Retry/Überlappung).
  4. Nur für **neu** eingefügte Log-Zeilen: Mail (`renderAlert`) bzw. Web-Push senden → `status='sent'`/`failed'`/`bounced'`, `sent_at`. `last_alert_at` am Abo nachziehen.
  5. **Saison-Start-Alerts:** zusätzlich Kategorien, die im aktuellen Monat **neu** in `[season_from,season_to]` eintreten → `kind='season_start'`, eigener `event_key='season:<category>:<YYYY-MM>'` (monatlich genau einmal).
- **Throttle:** pro Abo höchstens 1 Alert / 24 h (`last_alert_at`-Guard) — kein Status-Flattern-Spam.
- **Audit/Log:** Lauf-Zusammenfassung als strukturierter Log (`event:'season_sync'`, Counts), **kein** PII; Audit `action='alert.dispatched'` aggregiert (Anzahl), nicht pro Kontakt.

### 4.5 E-Mail-Templates (`_shared/email.ts` erweitern, nicht ersetzen)

```ts
// Double-Opt-In-Bestätigung — transaktional, vom Käufer angefordert. Vermittler-Fußzeile via layout().
export function renderAlertConfirm(o: { what: string; confirmUrl: string }): { subject: string; html: string }

// Der eigentliche Alert — "X ist wieder verfügbar bei Hof Y". Enthält manage/unsubscribe-Link.
export function renderAlert(o: { what: string; farmName?: string; deepUrl: string; manageUrl: string }): { subject: string; html: string }
```

- Beide nutzen `layout(...)` (Marken-Look + bestehende Vermittler-Fußzeile „LokaleBauernConnect ist eine Vermittlungsplattform…"). **Keine Deko-Emojis** über den Markenton hinaus; Pflicht: sichtbarer **Abbestell-Link** + `List-Unsubscribe`-Header. Alert-Text formuliert **als Hof-Hinweis** („Der Hof meldet: wieder verfügbar"), nie als Plattform-Verkaufsversprechen.

---

## 5. Frontend (React + Vite + TS strict) — `app/src/`

> Nur Design-System-Tokens (`src/styles/theme.css`), User-Werte escapen, jeder Datenpfad mit Lade-/Leer-/Fehlerzustand. Käufer-UI durchgängig mit Vermittler-Disclaimer.

### 5.1 Saison-Radar (Käufer-Erlebnis, P2)

- **`src/components/SeasonBadge.tsx` (neu):** Schwester von `AvailabilityBadge` im selben `lbc-badge`-Stil (Modifier `av-seasonal`), zeigt „Saison" / „Saison beginnt bald" / „Saison endet bald" abhängig von `season_from/to` + aktuellem Monat. Token-only, keine Inline-Farbe.
- **`src/pages/SeasonPage.tsx` (neu, Route `/saison`):** kuratierte Sicht „Was gibt es gerade frisch?" — Gruppierung nach Kategorie, gespeist aus `products` (`seasonal=true` ODER Monat in `season_*`) + `availability_state`. **Zero-State:** „In deiner Region ist gerade Übergangszeit — sieh dir an, was bald beginnt." (kein leeres Gitter). Optionaler PLZ-Filter (reuse `lib/geo`).
- **`src/lib/season.ts` (neu):** reine Funktionen `isInSeason(month, from, to)` (wrap-around), `seasonPhase(product, now)` → `'in'|'soon'|'ending'|'off'`. **Unit-testbar, keine I/O.**
- **Integration in Bestand:** `FarmCard`/`FarmDrawer` zeigen `SeasonBadge` neben `AvailabilityBadge`; `FinderPage` bekommt einen „Saison"-Schnellfilter. **Additiv**, bestehende Finder-/Reservierungs-Kette unverändert.

### 5.2 „Benachrichtigen"-CTA + Abo-Verwaltung

- **`src/components/AlertButton.tsx` (neu):** an Produkt/Kategorie/Hof. Bei Klick → leichtgewichtiges Formular (E-Mail + Turnstile-Widget für Anonyme; eingeloggt: ein Klick + Profil-Kontakt). Ruft `alert-subscribe` über den **zentralen API-Client** (`apiFetch` mit `X-Request-Id`, WAVE_13) — **kein** nackter `fetch`. Optimistic „Wir haben dir eine Bestätigungsmail geschickt" + ehrlicher Fehlerzustand.
- **`src/pages/AlertManagePage.tsx` (neu, Route `/alerts?token=`):** zeigt das Abo (aus `alert-manage`), Buttons Pausieren/Fortsetzen/Abbestellen. **Anon-fähig** (Token-Link). Zero-State „Dieses Abo existiert nicht mehr."
- **Favoriten (eingeloggt):** Herz-Toggle in `FarmCard`/`FarmDrawer` → `favorites` (RLS-self). Reine Komfort-Schicht; ein Favorit kann optional in ein Abo überführt werden (expliziter zweiter Schritt, kein stilles Abo).

### 5.3 Erzeuger-Datenpflege (Saison-Felder)

- In der Erzeuger-Produktpflege (Track D / WAVE_04-Erweiterung): `seasonal`-Toggle + optionale Monats-Auswahl `season_from/to` + Anzeige **„X Käufer beobachten dieses Produkt"** (aus `product_watch_counts`, **nur Zahl**). „Tap statt Tippen" (P2): Statuswechsel + Saison-Toggle in ≤ 2 Taps, optimistic mit Rollback.
- **Frische-Signal sichtbar machen:** Käufer-Seiten zeigen „heute aktualisiert" / „vor 9 Tagen — bitte beim Hof rückversichern" aus `availability_updated_at` (P1, Vertrauens-/Vermittler-Wahrheit).

---

## 6. Welle-Schnitt (ein Slice pro Session — Abhängigkeitsreihenfolge)

| Welle | Name | Liefert | Prio | Pflicht-Nachweis |
|:--:|---|---|:--:|---|
| **C-00** | **Spezifikation & Audit** | `docs/spezialmodule/SAISON_RADAR.md` anlegen (Radar-Definition, Saison-Logik, Alert-Lifecycle, DSGVO); Ist-Audit der Saison-/Verfügbarkeits-Felder | P2 | Doku existiert; Mapping Bestand ↔ Ziel; keine Codeänderung |
| **C-01** | **Migration `0006`** | Saison-Felder + Frische-Trigger + favorites/alert_subscriptions/notification_log + RLS + Aggregat-View | P1 | `supabase db reset` grün; **Cross-Org-Negativtest** (Org A liest Abos/Kontakte von Org B → 403/leer); Erzeuger sieht nur `watchers`-Zahl |
| **C-02** | **Saison-Radar (Frontend)** | `lib/season.ts` (+Unit), `SeasonBadge`, `SeasonPage` `/saison`, Finder-Saisonfilter, Frische-Signal in Käufer-UI | P2 | Unit grün (wrap-around, Phasen); Zero-State; Disclaimer sichtbar; Build grün |
| **C-03** | **Alert-Subscribe + Double-Opt-In** | `alert-subscribe` + `alert-confirm` Functions, `renderAlertConfirm`, `AlertButton` | **P0-Kern** (Einwilligung) | Turnstile+Zod+Rate-Limit belegt; Double-Opt-In erzwungen (pending bis confirm); kein E-Mail-Enumeration-Orakel; Audit ohne PII |
| **C-04** | **Abo-Verwaltung / Abbestellen** | `alert-manage` Function, `AlertManagePage` `/alerts`, `List-Unsubscribe`-Header | **P0-Kern** (DSGVO) | Abbestellen ohne Login via Token; One-Click-Unsubscribe; Token unratbar; Audit |
| **C-05** | **season-sync Cron + Versand** | `season-sync` Function, `renderAlert`, `notification_log`-Idempotenz, 24h-Throttle | P1 | **Doppellauf erzeugt EINEN Alert** (Idempotenz-Test); Throttle greift; Bounce/Fail im Log; PII-frei |
| **C-06** | **Erzeuger-Datenpflege** | Saison-Toggle/Monatsfenster in Produktpflege, Watcher-Zahl, „Tap statt Tippen" | P2 | Org-gebundene Pflege (RLS); Aggregat ohne Kontakt-Leak; optimistic Rollback |
| **C-07** | **Härtung, Tests, Abnahme** | Vollständige Test-Matrix, Versand-Health in Betriebszentrale, Doku/Tracker | P1 | Test-Suite grün; Track-C-Gate (Abschnitt 8) erfüllt; PHASE_STATUS + MASTER_INDEX gepflegt |

**Dependency-Gate:** C-01 (Migration) MUSS vor C-03/C-05 stehen. **C-03 (Double-Opt-In) MUSS vor C-05 (Versand)** stehen — es wird **nie** an ein unbestätigtes Abo versendet. C-04 (Abbestellen) ist Versand-Vorbedingung (kein Alert ohne funktionierenden Abmeldepfad). Saison-Radar (C-02) ist unabhängig vom Versand und kann früh shippen (reines Käufer-Erlebnis).

---

## 7. Test-Matrix (Pflicht — Tests sind die Spezifikation, `00_RULES.md` §0.9)

> Runner gemäß Projektkonvention; Pfadauflösung relativ zur Testdatei. **Code wird an Tests angepasst, nie umgekehrt.**

**Unit (reine Logik)**
- `season.ts`: `isInSeason` — normales Fenster (Mai–Aug), **Wrap-around** (Nov–Feb), Einzelmonat, `NULL`=ganzjährig; `seasonPhase` → `in/soon/ending/off` an Monatsgrenzen.
- Dedupe-Schlüssel + `event_key`-Bildung deterministisch.

**Edge / RLS (Negativ zuerst)**
- **Cross-Org:** Erzeuger A liest `alert_subscriptions`/Kontakte zu Produkten von Org B → **403/leer**. `product_watch_counts` für fremdes Produkt → kein Treffer.
- **Anon-Grenze:** anon kann **nicht** direkt in `alert_subscriptions` inserten (keine anon-Policy) — nur über die Function (Turnstile).
- **Token:** `manage_token`/`confirm_token` 192-bit, einmalig; unbekannter Token → neutrale Antwort (kein Statusleck, keine Enumeration).
- **Double-Opt-In:** Abo bleibt `pending`, bis `alert-confirm` lief; `season-sync` ignoriert `pending`/`paused`/`unsubscribed`.

**Idempotenz / Versand (P1-Kern)**
- `season-sync` zweimal hintereinander auf demselben Verfügbarkeits-Ereignis → **genau ein** `notification_log`-Eintrag, **genau eine** Mail.
- 24h-Throttle: zweites Ereignis < 24 h → kein zweiter Alert.
- Provider-Fallback (`console`): kein echter Versand, aber Log `status='sent'`/Token-Link funktioniert (kein toter Pfad, `01_PRIORITIES.md` P1 §75).
- Bounce/Fail → `status='bounced'/'failed'`, kein Crash, Eintrag auditierbar.

**Zero-State / E2E**
- `/saison` ohne Saison-Produkte → Editorial-Leerzustand, kein 500.
- E2E Käufer: Produkt → „Benachrichtigen" → Bestätigungsmail (console) → Confirm-Link → `active` → Hof setzt `out`→`available` → Cron → Alert mit Deep-Link → Abbestellen via Token.

**Compliance**
- Kein PII (`contact`/E-Mail) im Klartext in `audit_log.details` oder Logs (Scrubber-Beleg, WAVE_13).
- Jede Käufer-/Alert-UI + jede Mail trägt den Vermittler-Disclaimer; Alert-Text behauptet nie Verkauf/Garantie.

---

## 8. Track-C-Gate (blockierend)

```
GATE TRACK_C:
  ✅ Migration 0006 additiv + RLS deny-by-default   (db reset grün; Rollback dokumentiert)
  ✅ Tenant-Isolation                                (Cross-Org-Negativtest: keine fremden Abos/Kontakte; nur watchers-Zahl)
  ✅ Einwilligung (Double-Opt-In)                    (kein Versand an unbestätigtes Abo; kein E-Mail-Enumeration-Orakel)
  ✅ Abbestellbarkeit (DSGVO)                        (Token-Link ohne Login; One-Click List-Unsubscribe; Audit)
  ✅ Idempotenz                                      (Doppellauf = 1 Alert; notification_log Unique; 24h-Throttle)
  ✅ Frische-Signal                                  (availability_updated_at treibt ehrliche Aktualitäts-Anzeige)
  ✅ Zero-State                                      (/saison + leere Alerts ohne 500)
  ✅ Cloudflare-Schutz                               (Turnstile + Rate-Limit auf öffentlichem Subscribe-Pfad)
  ✅ PII-/Vermittler-Wahrheit                        (kein PII im Audit/Log; Disclaimer in UI + Mail; Hof-Hinweis statt Verkauf)
  ✅ Build/Tests grün                                (tsc strict + vite; deno check; gezielte Tests der geänderten Pfade)
```

**Blockierend (kein Merge/Deploy ohne):** Double-Opt-In, Abbestellbarkeit, Idempotenz, Tenant-Isolation, PII-Grenze. Ein Versand ohne diese fünf ist per Definition **P0**.

---

## 9. Stop-Regeln dieser Welle (`00_RULES.md` §5, `CLAUDE.md` Stop-Regeln)

Anhalten, minimalen sicheren Fix vorschlagen, auf Owner-OK warten, wenn:
- **Cron-Mechanik** (pg_cron-Tarif / Cloudflare Scheduled Worker) oder **Mail-Provider** (Resend/SendGrid: Account/Kosten/AVV/EU-Residency) live geschaltet werden soll → Account-/Kosten-/Vertrags-Eingriff.
- **Web-Push** VAPID-Keys/Service-Worker eingeführt werden (Browser-Permission + Schlüsselverwaltung) → eigener Slice + Owner-Entscheidung; Default-Kanal bleibt E-Mail.
- Eine geplante Auto-Logik **Verfügbarkeit aus dem Kalender setzen** würde (statt nur anzeigen) → Stop: würde lügen, verletzt „Domain owns truth".
- `stock_qty`-Auto-Dekrementierung verlangt würde → **P3/eigener ADR**, hier nicht bauen.
- Saison-Defaults pro Kategorie als **harte** Wahrheit (statt Vorschlag) gesetzt würden → Stop (Hof besitzt die Wahrheit).
- PII im Audit/Log entdeckt wird → Stop, Scrubber/Code fixen, **nie** die Assertion abschwächen.
- Jeder `git commit`/`push`/Deploy/Secret-Setzen → Owner-Freigabe, Co-Author-Zeile.

> **Ausnahme zu §0.8:** Stop-Regeln stechen „Durcharbeiten". An echten Blockern wird angehalten; an natürlichen Stopp-Punkten ohne Blocker wird am nächsten wertvollen Slice weitergearbeitet (Tests, Härtung, Doku).

---

## 10. Manuelle Owner-Aufgaben (→ `docs/releases/MANUAL_TASKS_CHECKLIST.md`)

- Mail-Provider EU (Resend/SendGrid): Account, Domain-Verifizierung (SPF/DKIM/DMARC), AVV/Sub-Auftragsverarbeiter, `EMAIL_PROVIDER`/`*_API_KEY` als Supabase-Secret.
- Cron-Trigger einrichten (pg_cron-Job **oder** Cloudflare Scheduled Worker) + `CRON_SECRET`.
- Turnstile-Site-/Secret-Key (falls noch nicht aus WAVE_06 vorhanden) für den Subscribe-Pfad.
- Aufbewahrungsfrist für `notification_log`/`alert_subscriptions` festlegen (DSGVO-Löschkonzept, `docs/COMPLIANCE_MODEL.md`).
- (Optional) Web-Push VAPID-Schlüsselpaar, falls Kanal `webpush` aktiviert wird.

---

## 11. Abschlussbericht-Format (Pflicht pro Welle — gem. `00_RULES.md` §9)

```text
## Welle abgeschlossen: TRACK_C / C-?? <Name>   (Phase: 4 · Track: C · Datum:)

### Geändert
- <Datei/Migration/Edge Function/View/Template> — <was + warum>

### Verifikation (ausgeführt, nicht behauptet)
- Build/Typecheck (npm run build, tsc strict):            <grün/rot + Auszug>
- deno check (alert-subscribe/confirm/manage/season-sync): <Ergebnis>
- Gezielte Tests (geänderte Pfade):                        <Liste + Ergebnis>
- RLS Cross-Org-Negativ (keine fremden Abos/Kontakte):     <Ergebnis>
- Double-Opt-In erzwungen (kein Versand an pending):       <Ergebnis>
- Abbestellen ohne Login via Token + List-Unsubscribe:     <Ergebnis>
- Idempotenz (Doppellauf = 1 Alert) + 24h-Throttle:        <Ergebnis>
- Zero-State /saison + leere Alerts (kein 500):            <Ergebnis>
- Turnstile/Rate-Limit auf Subscribe:                      <Ergebnis>
- Kein PII im Audit/Log; Disclaimer in UI + Mail:          <Ergebnis>
- Konsole sauber (keine TypeError/401-Schleifen):          <ja/nein>

### Gate-Bezug
- Track-C-Gate (Abschnitt 8): <Status je Kriterium + Nachweis>

### 7 Produktionspfeiler (Selbstcheck)
- Org-Boundary · Zero-State · Scope-Transparenz · RBAC · Audit · Testpflicht · Drilldown/Disclaimer: <je ✅/offen>

### Risiken & offene Punkte
- <Risiko + Owner-Entscheidung nötig? + Rollback>
- Manuelle Owner-Tasks (Mail-Provider/Cron/Turnstile/Aufbewahrung/Web-Push)

### Doku/Tracker aktualisiert
- docs/spezialmodule/SAISON_RADAR.md · docs/releases/PHASE_STATUS.md · MASTER_INDEX.md (Abschnitt 3) · ggf. ADR/learning/pattern: <ja/nein>

### Nächste Welle / nächster sinnvoller Schritt
- <konkret, z. B. C-03 vor C-05; oder Blocker zuerst (Kategorie/Priorität/ETA)>
```

---

## 12. Subagenten-Einbindung (Delegationsregeln, `AGENTS.md` / `.claude/agents/*`)

- **Migration `0006` / RLS / Aggregat-View / Isolationstest** → `db-rls-spezialist`, danach `qa-tester` (kein Merge ohne grünen Cross-Org-Negativtest).
- **Edge Functions (subscribe/confirm/manage/season-sync), Zod, Turnstile, Idempotenz, `request_id`-Logging** → `edge-functions-spezialist`, danach `security-auditor` (read-only: Token-Stärke, kein PII-Leak, kein Enumeration-Orakel).
- **Double-Opt-In / Abbestellbarkeit / DSGVO / PII-Maskierung / Vermittler-Wahrheit in Mail** → `compliance-officer`.
- **Saison-Radar-UI / SeasonBadge / SeasonPage / Editorial-Zero-State / Microcopy + Disclaimer** → `frontend-design-guardian` + `i18n-content-spezialist`.
- **Versand-Health / Cron / Bounce-Monitoring / Kosten (Mail-Volumen, Cron-Frequenz)** → `devops` + `performance-cost-optimizer`.
- **Architekturfrage** (Aggregat-View vs. security-definer-Funktion; Cron-Mechanik pg_cron vs. Worker; Kanal-Modell E-Mail/Web-Push) → `architekt`; Ergebnis als **ADR** in `.claude/memory/decisions/`.

---

## 13. Abhängigkeiten & Referenzen

- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive; 7 Produktionspfeiler; USP-Abgrenzung; Stop-Regeln), `AGENTS.md` (service_role nur Edge, deutsche Kommentare, keine Deko-Emojis), `PHASEN.md` (Phase 4, Track C), `MASTER_INDEX.md` (Abschnitt 3 — `SAISON_RADAR.md`).
- **Regelwerk:** `finalization/00_RULES.md` (§1 End-to-End/Zero-State/Audit, §4 Verbote, §5 Stop-Regeln, §8 Welten-Trennung, §9 Abschlussbericht), `finalization/01_PRIORITIES.md` (P1 Frische-Signal + idempotente Benachrichtigungen; P3 `season_from`/`season_to` + `stock_qty`-Auto-Abzug; P2 Saison-Radar-Erlebnis; Einstufungs-Beispiele 12/13/19/20).
- **Reale Artefakte (Bestand, geprüft):** `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql` (`products.seasonal`, Enums `availability_state`/`product_category`/`reservation_status`, `audit_log`, `farms`/`org_locations`), `app/supabase/functions/_shared/{cors,supabaseAdmin,email,stripe}.ts`, `app/supabase/functions/{create-checkout,stripe-webhook}/index.ts` (Idempotenz-Vorlage `payment_events`), `app/src/lib/{types,data,seed,geo}.ts`, `app/src/components/{AvailabilityBadge,FarmCard,FarmDrawer}.tsx`, `app/src/pages/FinderPage.tsx`, `app/src/styles/theme.css`.
- **Querverweise Phase 4:** Track A (SB-Bezahlung — Alert verlinkt auf Stand/Reservierung, baut sie nicht nach) · Track B (Karte — Saison-Radar mit regionalem Bezug) · Track D (Erzeuger-Self-Service — Saison-Datenpflege integriert sich hier) · Track E (Datenmodell-Skalierung — Indizes für `alert_subscriptions`/`notification_log` bei 300 Höfen).
- **Vorgänger-Wellen:** WAVE_04 (Saison-Radar v0 / Kernprodukt), WAVE_06 (Turnstile/Rate-Limit/Audit/CSP), WAVE_09 (Stripe-Idempotenz-Muster), WAVE_13 (`request_id`-Logger, PII-Scrubber, Health), WAVE_14 (Legal/DSGVO — AVV des Mail-Sub-Auftragsverarbeiters).

> **Diese Strecke ist additiv und reversibel bis zum Deploy.** Jeder kosten-/außenwirksame Schritt (Migration-Push/Function-Deploy, Mail-Provider + AVV, Cron-Aktivierung, Turnstile-Keys, Web-Push, `git commit`/`push`, produktive Secrets) wird **vorab in Klartext angekündigt und erst auf Owner-OK ausgeführt.** Saison-Radar darf früh shippen; **Versand erst, wenn Double-Opt-In + Abbestellen + Idempotenz + PII-Grenze nachweislich grün sind.**
