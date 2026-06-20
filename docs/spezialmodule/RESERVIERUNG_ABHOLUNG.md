# Spezialmodul — Reservierung & Abholung

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C
> Stack: React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect)
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Vertrag & Zahlung entstehen **direkt zwischen Käufer:in und Hof**. Disclaimer durchgängig.

---

## 0. Zweck & Abgrenzung

Dieses Modul beschreibt die **kostenlose Vorab-Reservierung** eines Produkts an einem Hof mit anschließender **Selbstabholung im gewählten Abholfenster**. Es ist die Brücke zwischen dem Produktverfügbarkeits-Modul (Erzeuger-Selbstpflege) und dem USP „sichere bargeldlose Bezahlung am Stand". Eine Reservierung ist **unverbindlich** und **kostenlos** — sie ist kein Kauf, keine Anzahlung und kein verbindlicher Vertrag im Sinne der Plattform.

**Was dieses Modul ist:**
- Eine Merk-/Bereitstellungs-Anfrage an den Hof („Lege mir 2× Lindenhonig für Morgen 10–12 Uhr bereit").
- Eine strukturierte, auditierbare Kommunikation zwischen Käufer:in und Hof über Status, Fenster und Menge.
- Ein Zero-State-fähiger, RLS-isolierter Datensatz pro Hof-Org.

**Was dieses Modul ausdrücklich NICHT ist:**
- Kein Bezahlvorgang (Zahlung erfolgt am Stand via QR→Stripe oder direkt beim Hof — siehe Modul „Bargeldlose Bezahlung").
- Keine verbindliche Liefer-/Mengenzusage durch die Plattform.
- Keine Beratung, kein Eigenverkauf, keine Lagerhaltung durch die Plattform.

> **Disclaimer (UI-Pflichttext, durchgängig sichtbar):**
> „LokaleBauernConnect vermittelt nur. Die Reservierung ist unverbindlich und kostenlos. Verfügbarkeit, Menge, Preis und Bezahlung liegen allein beim Hof. Es entsteht **kein** Kaufvertrag mit LokaleBauernConnect."

---

## 1. Rollen & Akteure

| Rolle (`user_role`) | Rechte im Modul |
|---|---|
| `kaeufer` (auch **anonym/anon**) | Reservierung **anlegen**; eigene Reservierung über Vorgangs-Token einsehen/stornieren |
| `erzeuger` | Eingehende Reservierungen der **eigenen Org** lesen, bestätigen, ablehnen, als abgeholt/abgelaufen markieren |
| `staff` | Wie `erzeuger`, org-gebunden (Hof-Mitarbeitende) |
| `owner` | Plattform-Owner; über `service_role`/Edge nur für Support & Audit — **keine** stillen Statuswechsel ohne Audit |

**Tenant-Anker:** Jede Reservierung trägt `org_id` (= `farms.org_id`). Isolation ist deny-by-default; Org A sieht nie Reservierungen von Org B.

---

## 2. End-to-End-Flow

### 2.1 Sequenz (Happy Path)

```
Käufer:in (Finder → Hof-Drawer)
   │  1. Produkt wählen (nur availability ≠ 'out')
   │  2. Menge wählen (1…50, UI-Cap 20)
   │  3. Abholfenster wählen (aus farm.pickup_windows)
   │  4. Name + Kontakt (E-Mail ODER Telefon)
   │  5. Turnstile-Token (unsichtbar) + Disclaimer akzeptiert
   ▼
Edge Function  POST /functions/v1/reservations-create
   │  • Turnstile serverseitig verifizieren (Cloudflare)
   │  • Rate-Limit + Eingaben validieren (Zod/Deno)
   │  • Hof/Produkt/Org-Konsistenz prüfen (farm_id↔product_id↔org_id)
   │  • availability-Re-Check (kein 'out')
   │  • pickup_window gegen farm.pickup_windows whitelisten
   │  • INSERT reservations (status='requested') + Vorgangs-Token (pickup_code)
   │  • audit_log: reservation.requested
   ▼
Hof-Postfach (Erzeuger-Cockpit, RLS-gefiltert auf org_id)
   │  6a. Bestätigen  → status='confirmed'  → Benachrichtigung an Käufer:in
   │  6b. Ablehnen    → status='cancelled' (reason)
   ▼
Abholung im Fenster
   │  7. Hof markiert 'picked_up' (Zahlung am Stand: QR→Stripe / direkt)
   │  — oder Auto-Expiry nach Fensterende → status='expired'
   ▼
Audit + Read-Receipt (jeder Wechsel ist nachvollziehbar)
```

### 2.2 Schritte im Detail

1. **Einstieg** über `FarmDrawer` (bestehend, `src/components/FarmDrawer.tsx`) — Bereich „Reservieren & abholen".
2. **Produktauswahl** ist auf `availability !== 'out'` gefiltert (`reservable`).
3. **Abholfenster** stammt ausschließlich aus `farm.pickupWindows` (kein Freitext → kein Injection-/Spoofing-Vektor).
4. **Kontakt**: genau ein gültiger Kanal (E-Mail **oder** Telefon) ist Pflicht — Grundlage für die Bestätigung.
5. **Bot-Schutz**: Cloudflare Turnstile-Token wird mitgesendet und **serverseitig** geprüft.
6. **Hof-Entscheidung**: bestätigen oder ablehnen (mit Pflicht-Grund bei Ablehnung).
7. **Abschluss**: `picked_up` (Hof) oder `expired` (System) oder `cancelled` (beide Seiten innerhalb der Regeln).

---

## 3. Abholfenster (Pickup Windows)

### 3.1 Modell
- Quelle: `farms.pickup_windows text[]` (Erzeuger-Selbstpflege) — z. B. `['Heute 14–16 Uhr','Morgen 9–12 Uhr']`.
- Auswahl der Käufer:in wird **gegen genau diese Liste validiert** (Server-Whitelist). Ein Wert außerhalb der Liste ⇒ `422 invalid_pickup_window`.
- Pro Reservierung **genau ein** Fenster (`reservations.pickup_window text`).

### 3.2 Fenster-Auflösung (relative → absolute Zeit)
Damit Auto-Expiry deterministisch ist, löst die Edge Function das gewählte Fenster zum Zeitpunkt des Inserts in absolute Grenzen auf und persistiert sie zusätzlich:

| Spalte (additiv) | Bedeutung |
|---|---|
| `pickup_window` | Anzeigewert (Original-Label, exakt wie gewählt) |
| `pickup_from` `timestamptz` | berechneter Fensterbeginn (EU/Berlin, `Europe/Berlin`) |
| `pickup_until` `timestamptz` | berechnetes Fensterende — Basis für Expiry & Anti-Missbrauch |

Parsing-Regeln (deterministisch, dokumentiert):
- Präfix „Heute" ⇒ aktuelles Datum; „Morgen" ⇒ +1 Tag; Wochentag-Label ⇒ nächste Vorkommen.
- Zeitspanne „HH–HH Uhr" ⇒ `pickup_from`/`pickup_until` in `Europe/Berlin`.
- Nicht parsebare Fenster ⇒ `pickup_until = pickup_from = NULL` und Expiry fällt auf Fallback `created_at + 48h` zurück (kein stiller Datenverlust).

> Zeitzone ist **immer** `Europe/Berlin` (DST-sicher), Speicherung in UTC `timestamptz`.

---

## 4. Status-Maschine

### 4.1 Enum (kanonisch, aus `0001_core.sql`)
```
reservation_status = 'requested' | 'confirmed' | 'picked_up' | 'cancelled' | 'expired'
```

### 4.2 Zustände

| Status | Bedeutung | Sichtbar für |
|---|---|---|
| `requested` | Käufer:in hat reserviert; Hof hat noch nicht reagiert | Käufer:in (Token), Hof-Org |
| `confirmed` | Hof legt die Ware im Fenster bereit | Käufer:in (Token), Hof-Org |
| `picked_up` | Abgeholt (und am Stand bezahlt) — Endzustand | Käufer:in (Token), Hof-Org |
| `cancelled` | Storniert durch Käufer:in **oder** abgelehnt durch Hof (Grund) — Endzustand | Käufer:in (Token), Hof-Org |
| `expired` | Fenster verstrichen ohne Abholung/Bestätigung — Endzustand (System) | Käufer:in (Token), Hof-Org |

### 4.3 Erlaubte Übergänge (Whitelist — alles andere `409 invalid_transition`)

| Von → Nach | Auslöser | Bedingung |
|---|---|---|
| `requested → confirmed` | Hof (`erzeuger`/`staff`) | nur eigene Org; vor `pickup_until` |
| `requested → cancelled` | Hof (Ablehnung, **Grund Pflicht**) **oder** Käufer:in (Token) | — |
| `requested → expired` | **System** (Cron) | `now() > pickup_until` und kein Hof-Handeln |
| `confirmed → picked_up` | Hof | nur eigene Org |
| `confirmed → cancelled` | Käufer:in (Token, **vor** Fensterbeginn) oder Hof (**Grund Pflicht**) | — |
| `confirmed → expired` | **System** (Cron) | `now() > pickup_until` und nicht abgeholt (konfigurierbarer Kulanz-Puffer, Default +2 h) |

Endzustände (`picked_up`, `cancelled`, `expired`) sind **terminal** — kein Re-Open. Eine neue Anfrage = neue Reservierung.

### 4.4 Übergangsdiagramm
```
                 ┌──────────── cancelled ◄──────────┐
                 │  (Hof: Grund | Käufer: Token)     │
 requested ──────┼──► confirmed ──► picked_up        │
   │             │        │                          │
   │ (Cron)      │        │ (Käufer vor Start |      │
   └──► expired ◄┘        │  Hof: Grund) ────────────┘
        ▲                 │
        └────── (Cron: now > pickup_until + Puffer) ─┘
```

### 4.5 Statuswechsel-Mechanik (serverseitig, nie Client)
- Jeder Wechsel läuft über eine **Edge Function** (`reservations-transition`) oder eine `security definer`-RPC mit Übergangs-Whitelist.
- Optimistic-Concurrency über `version int` (oder `updated_at`-Vergleich): konkurrierende Wechsel ⇒ `409 stale`.
- Jeder Wechsel schreibt `audit_log` mit `from_status`, `to_status`, `actor`, `reason`.

---

## 5. Benachrichtigungen

### 5.1 Trigger-Matrix

| Ereignis | Empfänger | Kanal | Inhalt (Kurz) |
|---|---|---|---|
| `requested` angelegt | Käufer:in | E-Mail/SMS¹ | Eingangsbestätigung + Vorgangs-Token/Link + Disclaimer |
| `requested` angelegt | Hof-Org | In-App-Postfach (+ optional E-Mail) | Neue Reservierung, Fenster, Menge |
| `requested → confirmed` | Käufer:in | E-Mail/SMS¹ | „Hof legt bereit", Fenster, `pickup_code` |
| `requested/confirmed → cancelled` (Hof) | Käufer:in | E-Mail/SMS¹ | Ablehnung + Grund (vom Hof) |
| `→ picked_up` | Käufer:in | E-Mail/SMS¹ | Abschluss + Quittungs-Hinweis (Zahlung am Stand) |
| `→ expired` | Käufer:in + Hof | E-Mail/In-App | Fenster verstrichen |
| Erinnerung (T-2h vor `pickup_until`, nur `confirmed`) | Käufer:in | E-Mail/SMS¹ | Abhol-Reminder |

¹ Kanal richtet sich nach dem hinterlegten Kontakt (E-Mail vs. Telefon). Plattform versendet **transaktional**, kein Marketing.

### 5.2 Umsetzung
- Versand über **Edge Function** (Deno) mit Provider-Abstraktion (E-Mail-Provider/SMS) — kein Secret im Client.
- **Idempotenz**: `notification_log (reservation_id, event, channel)` mit Unique-Constraint ⇒ kein Doppelversand bei Retry.
- **Datensparsamkeit**: Kontaktdaten nur für transaktionalen Versand; keine Weitergabe an Dritte; Löschung nach Retention (§8.4).
- **Fallback** (kein Versand-Provider konfiguriert): Status & Token sind über den Vorgangs-Link (Token) jederzeit abrufbar — kein toter Pfad, kein Datenverlust.

---

## 6. Anti-Missbrauch

| Vektor | Maßnahme |
|---|---|
| Bot-Massenanlage | Cloudflare **Turnstile** (Pflicht, serverseitig verifiziert) + Cloudflare **WAF**/Rate-Limit am Worker |
| Anonyme Spam-Flut | Rate-Limit pro IP (z. B. ≤ 5 Reservierungen / 10 min) **und** pro Kontakt (E-Mail/Telefon, normalisiert) |
| Mengen-Hortung | DB-`CHECK quantity BETWEEN 1 AND 50`; UI-Cap 20; pro Hof+Produkt+offener Status max. 1 aktive Anfrage pro Kontakt (Partial-Unique-Index) |
| Fenster-Spoofing | Server-Whitelist gegen `farm.pickup_windows`; relatives→absolutes Parsing serverseitig |
| Org-Mismatch (fremder Hof unterschieben) | INSERT-`WITH CHECK`: `farm_id` muss zu `org_id` der aktiven Org gehören (RLS, §7) |
| No-Show-Serientäter | `no_show_count` je Kontakt-Hash; ab Schwelle Soft-Throttle (längeres Rate-Limit) + Hof-Hinweis |
| Token-Erraten (fremde Reservierung lesen) | `pickup_code` = 128-bit Zufalls-Token (CSPRNG), nicht erratbar; Lookup nur über Token, nie über ID-Enumeration |
| Status-Manipulation vom Client | Alle Übergänge serverseitig (Edge/RPC) mit Whitelist; Client kann Status **nie** direkt setzen |
| PII-Leak in Logs | Kontaktdaten werden in `audit_log.details` **gehasht/maskiert**, nie im Klartext |
| Replay/Doppel-Submit | Idempotency-Key (Client-UUID) je Submit; serverseitige Dedupe innerhalb Zeitfenster |

**Kontakt-Normalisierung:** E-Mail lowercased/getrimmt; Telefon auf E.164 normalisiert — Basis für Rate-Limit & No-Show-Zählung. Persistiert wird nur ein **gesalzener Hash** (`contact_hash`) für Limits; der Klartext-Kontakt dient ausschließlich dem Versand und unterliegt der Retention.

---

## 7. RLS & Datenmodell

### 7.1 Bestand (`0001_core.sql`)
Die Kerntabelle existiert bereits:
```sql
reservations (
  id uuid pk, farm_id text→farms, product_id text→products, org_id uuid→orgs,
  quantity int CHECK (1..50), pickup_window text, name text, contact text,
  status reservation_status default 'requested', created_at timestamptz
)
-- RLS deny-by-default:
--  reservations_insert       : anon+auth INSERT, WITH CHECK farm_id↔org_id (aktiv)
--  reservations_owner_read   : auth SELECT nur eigene Org (profiles.org_id)
```

### 7.2 Additive Erweiterung — `migrations/0006_reservations_lifecycle.sql`
> Additiv, idempotent (`if not exists`/`do $$`), RLS-konform. Verändert keine bestehenden Policies destruktiv.

```sql
-- Lifecycle-/Anti-Missbrauch-Felder
alter table reservations
  add column if not exists pickup_from   timestamptz,
  add column if not exists pickup_until  timestamptz,
  add column if not exists pickup_code   text,                 -- 128-bit Token, urlsafe
  add column if not exists contact_hash  text,                 -- gesalzener Hash (Rate-Limit/No-Show)
  add column if not exists reason        text,                 -- Pflicht bei Hof-Ablehnung/-Storno
  add column if not exists confirmed_at  timestamptz,
  add column if not exists picked_up_at  timestamptz,
  add column if not exists cancelled_at  timestamptz,
  add column if not exists expired_at    timestamptz,
  add column if not exists version       integer not null default 0,
  add column if not exists updated_at    timestamptz not null default now();

create unique index if not exists reservations_pickup_code_uq
  on reservations (pickup_code) where pickup_code is not null;

-- Max. 1 offene Reservierung je Kontakt+Hof+Produkt (Hortungs-/Spam-Schutz)
create unique index if not exists reservations_open_per_contact_uq
  on reservations (farm_id, product_id, contact_hash)
  where status in ('requested','confirmed');

create index if not exists reservations_pickup_until_idx
  on reservations (pickup_until) where status in ('requested','confirmed');

drop trigger if exists reservations_set_updated on reservations;
create trigger reservations_set_updated before update on reservations
  for each row execute function set_updated_at();

-- Idempotenz für Benachrichtigungen
create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  event text not null,           -- 'requested'|'confirmed'|'cancelled'|'picked_up'|'expired'|'reminder'
  channel text not null,         -- 'email'|'sms'|'inapp'
  sent_at timestamptz not null default now()
);
create unique index if not exists notification_log_uq
  on notification_log (reservation_id, event, channel);
alter table notification_log enable row level security;
-- keine anon/auth-Policy → nur service_role (Edge) schreibt/liest
```

### 7.3 Status-Übergang als `security definer`-RPC (RLS-sicher)
> Schreibender Pfad läuft NICHT über breite UPDATE-Policies, sondern über eine geprüfte Funktion. Erzeuger/Staff erhalten so kontrollierte Übergänge ohne Direkt-UPDATE-Rechte.

```sql
create or replace function reservation_transition(
  p_id uuid, p_to reservation_status, p_reason text default null, p_version int default null
) returns reservations
language plpgsql security definer set search_path = public as $$
declare r reservations; v_org uuid;
begin
  select org_id into v_org from profiles where user_id = auth.uid();
  select * into r from reservations where id = p_id for update;
  if not found then raise exception 'not_found' using errcode='P0002'; end if;
  if r.org_id is distinct from v_org then raise exception 'forbidden' using errcode='42501'; end if;
  if p_version is not null and p_version <> r.version then raise exception 'stale' using errcode='40001'; end if;

  -- Übergangs-Whitelist (Hof-Seite)
  if not (
       (r.status='requested'  and p_to in ('confirmed','cancelled'))
    or (r.status='confirmed'  and p_to in ('picked_up','cancelled'))
  ) then raise exception 'invalid_transition' using errcode='22023'; end if;

  if p_to='cancelled' and (p_reason is null or btrim(p_reason)='')
    then raise exception 'reason_required' using errcode='22023'; end if;

  update reservations set
    status      = p_to,
    reason      = coalesce(p_reason, reason),
    confirmed_at = case when p_to='confirmed' then now() else confirmed_at end,
    picked_up_at = case when p_to='picked_up' then now() else picked_up_at end,
    cancelled_at = case when p_to='cancelled' then now() else cancelled_at end,
    version     = version + 1
  where id = p_id returning * into r;

  insert into audit_log(org_id, actor_user_id, action, entity_type, entity_id, reason, details)
  values (r.org_id, auth.uid(), 'reservation.'||p_to, 'reservation', r.id::text, p_reason,
          jsonb_build_object('from', r.status, 'to', p_to));
  return r;
end $$;
revoke all on function reservation_transition(uuid,reservation_status,text,int) from anon;
grant execute on function reservation_transition(uuid,reservation_status,text,int) to authenticated;
```

> **System-Übergänge** (`→ expired`, Reminder) laufen ausschließlich über `service_role` in einer geplanten Edge Function (Supabase Cron) — siehe §9.

### 7.4 RLS-Invarianten (deny-by-default, Pflicht)
1. **Anon-Insert** nur mit konsistenter `farm_id↔org_id`-Kombi (bestehende `reservations_insert`-Policy).
2. **Lesen** nur für die **eigene Org** des authentifizierten Hofs (`reservations_owner_read`). Käufer:in liest **nie** über RLS, sondern ausschließlich über die token-basierte Edge Function.
3. **Schreiben/Statuswechsel** geht nie über eine breite UPDATE-Policy für `authenticated`, sondern über `reservation_transition` (definer) bzw. `service_role`.
4. **Token-Lookup** (`pickup_code`) ausschließlich über Edge Function (`service_role`), nie als anon-SELECT-Policy — kein Enumeration-Vektor.
5. `notification_log`, `orgs`, `audit_log`: nur `service_role`.

---

## 8. Datenschutz, Audit & Aufbewahrung

### 8.1 Audit (Pflicht, Namespace `reservation.*`)
Jeder lebenszyklus-relevante Vorgang erzeugt einen `audit_log`-Eintrag:
`reservation.requested`, `reservation.confirmed`, `reservation.cancelled`, `reservation.picked_up`, `reservation.expired`, `reservation.reminder_sent`.
`details` enthält `{from,to}`, `actor`-Typ, `maskierten` Kontakt-Hinweis (nie Klartext-PII), Fensterdaten.

### 8.2 Datensparsamkeit
- Persistiert: `name`, `contact` (Klartext nur für Versand), `contact_hash` (für Limits), Fenster, Menge, Status, Timestamps.
- **Nicht** persistiert: Zahlungsdaten (liegen bei Stripe), Standort/IP über das Rate-Limit-Fenster hinaus.

### 8.3 Disclaimer & Einwilligung
- Checkbox/Bestätigung des Vermittler-Disclaimers ist Voraussetzung des Inserts; Zustimmungszeitpunkt wird auditiert.

### 8.4 Retention
- Endzustände (`picked_up`/`cancelled`/`expired`): Kontakt-Klartext (`name`, `contact`) wird nach **90 Tagen** via Cron-Edge-Function **anonymisiert** (auf `contact_hash` reduziert); Statistik/Audit bleiben erhalten.
- Aktive Reservierungen werden nicht vor Endzustand bereinigt.

---

## 9. Geplante Aufgaben (Supabase Cron / Edge)

| Job | Takt | Wirkung |
|---|---|---|
| `expire-reservations` | alle 15 min | `requested`/`confirmed` mit `now() > pickup_until + Kulanzpuffer` → `expired` (+ Audit + Notify) |
| `pickup-reminder` | alle 15 min | `confirmed`, T-2h vor `pickup_until`, noch keine `reminder`-Notification → Reminder senden |
| `anonymize-reservations` | täglich | Endzustände älter als 90 Tage → PII anonymisieren |

Alle Jobs sind **idempotent** (Status-/`notification_log`-geschützt) und laufen unter `service_role`.

---

## 10. Frontend-Verdrahtung (End-to-End, kein toter Pfad)

### 10.1 Käufer-Seite (bestehend + Ausbau)
- `FarmDrawer.tsx` → `createReservation()` (`src/lib/data.ts`) bleibt der Einstieg; Erfolgstext nennt bereits „Der Hof bestätigt deine Reservierung."
- **Ausbau**: Aufruf gegen Edge Function `reservations-create` (Turnstile-Token, Idempotency-Key) statt Direkt-Insert; Antwort liefert `pickup_code`/Vorgangs-Link.
- **Vorgangs-Seite** (`/r/:code`): zeigt Status (live), Fenster, Menge, Storno-Button (innerhalb Regeln), Disclaimer. Zero-State bei unbekanntem/abgelaufenem Token.
- **States**: `idle | sending | ok | err` sind im Drawer bereits implementiert — erweitert um „Bestätigung ausstehend / bestätigt / abgeholt / storniert / abgelaufen" auf der Vorgangs-Seite.

### 10.2 Hof-Seite (Erzeuger-Cockpit)
- Postfach „Eingehende Reservierungen" (RLS auf `org_id`): Liste `requested`/`confirmed`, Aktionen **Bestätigen / Ablehnen (Grund) / Abgeholt** über `reservation_transition`-RPC.
- Zero-State: „Noch keine Reservierungen." mit Hinweis auf Verfügbarkeitspflege.
- Lade-/Leer-/Fehlerzustände durchgängig; optimistic update mit `version`-Guard, Rollback bei `409`.

### 10.3 Dual-Source-Kontinuität
Wie im Bestand (`data.ts`): ist Supabase nicht konfiguriert, bleibt die App über Seed/`localStorage` lauffähig — die Reservierung wird lokal bestätigt, kein Datenverlust, kein toter Button. Statuswechsel/Hof-Postfach sind Live-Features (Supabase erforderlich) und werden im Seed-Modus klar als „Demo/lokal" markiert.

---

## 11. API-Verträge (Edge Functions)

### `POST /functions/v1/reservations-create`
**Body:** `{ farmId, orgId, productId, quantity, pickupWindow, name, contact, disclaimerAccepted, turnstileToken, idempotencyKey }`
**Validierung:** Turnstile · Zod-Schema · `quantity 1..50` · `pickupWindow ∈ farm.pickup_windows` · `farmId↔orgId↔productId` konsistent · `availability ≠ 'out'` · Rate-Limit (IP + `contact_hash`) · `disclaimerAccepted === true`.
**Erfolg `201`:** `{ id, status:'requested', pickupCode, pickupFrom, pickupUntil }`
**Fehler:** `400 invalid_input` · `403 turnstile_failed` · `409 duplicate_open` · `422 invalid_pickup_window | out_of_stock` · `429 rate_limited`.

### `POST /functions/v1/reservations-transition` (Hof, JWT)
**Body:** `{ id, to, reason?, version }` → ruft `reservation_transition`-RPC.
**Fehler:** `401` · `403 forbidden` · `404 not_found` · `409 invalid_transition | stale` · `422 reason_required`.

### `GET /functions/v1/reservations-by-code?code=…` (Käufer, Token)
**Erfolg `200`:** `{ status, pickupWindow, quantity, farmName, productName, pickupUntil }` (keine fremde PII).
**Fehler:** `404 not_found` (auch für abgelaufene/falsche Tokens — keine Enumeration).

### `POST /functions/v1/reservations-cancel-by-code` (Käufer, Token)
Storno durch Käufer:in: `requested`→`cancelled` jederzeit; `confirmed`→`cancelled` nur **vor** `pickup_from`. Sonst `409`.

---

## 12. Akzeptanzkriterien

**Funktional**
1. Käufer:in kann eine Reservierung über `FarmDrawer` anlegen; nur verfügbare Produkte (≠ `out`) wählbar; Abholfenster ausschließlich aus `farm.pickup_windows`.
2. Insert erzeugt `status='requested'`, `pickup_code`, `pickup_from/until`, Audit `reservation.requested` und Käufer-Eingangsbestätigung.
3. Hof sieht **nur eigene** Reservierungen (RLS) und kann `confirm`/`cancel(reason)`/`picked_up` ausführen; jeder Wechsel auditiert + benachrichtigt.
4. Käufer:in kann über Vorgangs-Token Status sehen und (regelkonform) stornieren.
5. Cron setzt überfällige `requested`/`confirmed` auf `expired` (idempotent, auditiert, benachrichtigt).
6. Reminder geht genau einmal pro `confirmed`-Reservierung raus (Idempotenz via `notification_log`).

**Nicht-funktional / Sicherheit**
7. RLS deny-by-default: Anon liest **keine** Reservierungen; Org A sieht **keine** Reservierungen von Org B (Negativtest grün).
8. Kein Statuswechsel ohne serverseitige Whitelist; ungültige Übergänge ⇒ `409`.
9. Turnstile + Rate-Limit aktiv; Fenster-/Org-/Mengen-Validierung serverseitig erzwungen.
10. Token nicht erratbar/enumerierbar (128-bit CSPRNG); kein PII-Klartext in `audit_log`.
11. Disclaimer durchgängig sichtbar; keine Kaufvertrags-/Bezahl-Behauptung der Plattform.

**UX / Qualität**
12. Lade-, Leer-, Fehler- und Erfolgszustände durchgängig (Käufer + Hof); kein toter Button, kein Platzhalter.
13. Deutsch, premium-professionell, mobil nutzbar; A11y: Dialog-Rolle, Fokus-Trap, Escape-Close (bestehend im Drawer).
14. TypeScript strict, keine `any`-Lecks an der API-Grenze; snake_case↔camelCase-Mapping wie `mapFarm`.

---

## 13. Tests

### 13.1 RLS / Tenant-Isolation (Pflicht vor Merge — siehe `supabase/README.md` §Isolationstest)
- **Anon** kann INSERT mit gültiger `farm_id↔org_id`, aber **kein** SELECT auf `reservations`.
- **Owner Org A** liest eigene Reservierungen, **null** Zeilen von Org B.
- **Anon-Insert mit fremder/inkonsistenter `org_id`** ⇒ Policy-Verstoß (kein Insert).
- `notification_log`/`audit_log` für anon/auth nicht lesbar.

### 13.2 Status-Maschine (Unit, `reservation_transition`)
- Jeder erlaubte Übergang (§4.3) ⇒ Erfolg + korrekte Timestamps + Audit-Zeile.
- Jeder **nicht** gelistete Übergang ⇒ `invalid_transition`.
- `cancel` ohne Grund (Hof) ⇒ `reason_required`.
- Fremde Org ⇒ `forbidden`; veraltete `version` ⇒ `stale`.

### 13.3 Edge Functions (Integration)
- `reservations-create`: Happy Path 201; Turnstile fail 403; `out_of_stock` 422; Fenster außerhalb Whitelist 422; Rate-Limit 429; Doppel-Submit (gleicher Idempotency-Key) ⇒ ein Datensatz; zweite offene Anfrage gleicher Kontakt/Hof/Produkt ⇒ `409 duplicate_open`.
- `reservations-by-code`: gültiger Token 200 ohne fremde PII; falscher/abgelaufener Token 404 (keine Unterscheidung → keine Enumeration).
- `reservations-cancel-by-code`: `confirmed` nach `pickup_from` ⇒ 409.

### 13.4 Cron / Lifecycle
- `expire-reservations`: `pickup_until` in Vergangenheit ⇒ `expired`; wiederholter Lauf ⇒ idempotent (kein Doppel-Audit/-Notify).
- `pickup-reminder`: genau eine Reminder-Notification pro `confirmed`.
- `anonymize-reservations`: Endzustand > 90 Tage ⇒ `name`/`contact` anonymisiert, Audit erhalten.

### 13.5 Frontend (Komponenten/E2E)
- `FarmDrawer`: Validierung (Produkt/Fenster/Name/Kontakt) blockt Submit; Erfolgstext + Disclaimer sichtbar; `out`-Produkte nicht wählbar; Zero-State bei leerer Verfügbarkeit.
- Vorgangs-Seite `/r/:code`: zeigt korrekten Status-Verlauf; Storno-Button nur regelkonform aktiv; unbekanntes Token ⇒ Zero-State.
- Hof-Postfach: optimistic confirm mit `version`-Guard; `409` ⇒ Rollback + Hinweis.

### 13.6 Anti-Missbrauch (Negativ)
- Rate-Limit-Schwelle ⇒ 429; Mengen > 50 ⇒ Constraint-Verstoß; Fenster-Spoofing ⇒ 422; Status-Set direkt vom Client ⇒ unmöglich (keine UPDATE-Policy).

> **Test-Integrität (verbindlich):** Tests sind die Spezifikation. Ein roter Test wird nie durch Abschwächen einer Assertion grün gemacht — der **Code** wird an die Tests angepasst. Pfadauflösung in Tests relativ zur Testdatei.

---

## 14. Abhängigkeiten & Referenzen

- **Datenmodell/RLS-Basis:** `supabase/migrations/0001_core.sql` (Enum `reservation_status`, Tabelle `reservations`, Policies `reservations_insert`/`reservations_owner_read`).
- **Frontend-Einstieg:** `src/components/FarmDrawer.tsx`, Datenschicht `src/lib/data.ts` (`createReservation`), Typen `src/lib/types.ts` (`ReservationInput`/`Reservation`).
- **Verfügbarkeit (Vorbedingung):** Produktverfügbarkeits-Modul (Erzeuger-Selbstpflege) liefert `availability` & `pickup_windows`.
- **Bezahlung (Nachgelagert):** Modul „Bargeldlose Bezahlung am Stand" (QR→Stripe→Quittung) — `picked_up` markiert den Übergang zur Zahlung am Stand.
- **Plattform-Pfeiler:** RLS/Tenant-Isolation (org_id, deny-by-default), Zero-State, Audit (`reservation.*`), End-to-End-Verdrahtung, Cloudflare-Schutz (Turnstile/WAF), Disclaimer.

> Neue Migration (`0006_reservations_lifecycle.sql`) und Edge Functions sind **additiv** und ändern keine bestehenden Policies destruktiv. Owner-Freigabe für Backend-/DB-Änderungen einholen (Kosten-/Accountrelevanz Supabase/Cloudflare/Stripe).
