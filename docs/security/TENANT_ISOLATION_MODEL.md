# TENANT_ISOLATION_MODEL — LokaleBauernConnect

> Verbindliches Mandanten- und Plattform-Isolationsmodell der Plattform-Spezialschicht.
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React+Vite+TS · Supabase (Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect)**.
>
> **Goldene Regel (nicht verhandelbar):** Isolation lebt in der **Datenbank (RLS)**, nicht im Client.
> Eine fremde Org bekommt **0 Treffer oder 403 — niemals 200 mit Fremddaten** (Produktionspfeiler 1).
> RLS gilt **deny-by-default ab Migration #1** (`app/supabase/migrations/0001_core.sql`).
>
> **Vermittler-Rolle:** Die Plattform vermittelt, verkauft nicht selbst, berät nicht. Keine Isolationsregel
> darf so gelesen werden, dass die Plattform Eigenverkauf, Beratung oder Lebensmittel-Haftung übernimmt.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Stop-/Verbots-Regeln), `AGENTS.md` (harte Regeln · Subagent `db-rls-spezialist`/`qa-tester`),
> `PHASEN.md` (WAVE_02 Datenmodell+RLS · Isolations-Gate · WAVE_12 QA · Phase 2 Gate C Tenant-Isolation),
> `docs/ROLE_AND_PERMISSION_MODEL.md` (Rollen/Permission-Matrix — dieses Dokument ist die **Isolations**-Schicht darunter),
> `docs/DATABASE_MODEL.md` (Schema-Referenz, in Arbeit), `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md` (Testkatalog, abgeleitet aus §6).
> **Status:** Normativ. Implementierungs-Stand spiegelt `app/supabase/migrations/0001_core.sql`; Soll-Erweiterungen sind als „Soll (additive Migration)" markiert. Tracker: `docs/releases/PHASE_STATUS.md`.

---

## 0 · Begriffe & Abgrenzung (Hof-Domäne — keine VMS-Begriffe)

| Begriff | Bedeutung in LokaleBauernConnect |
|---|---|
| **Mandant / Tenant / Org** | Isolationsgrenze auf Datenebene. Bei Erzeugern = der **Betrieb-Träger** (`orgs`-Zeile): Hof, Hofladen, Imkerei, Manufaktur. Bei der Betreiberseite = die **Plattform-Org** (Staff/Owner). |
| **Org-Scope** | Die Menge an Zeilen, die zu **genau einer** `org_id` gehört. Jede org-gebundene Query ist auf den Org-Scope der Session eingegrenzt. |
| **Plattform-Scope** | Org-übergreifender Lesezugriff von Staff/Owner — **eng begrenzt** (Ticket-/Support-/Aggregat-Kontext), nie Roh-PII fremder Käufer/Orgs. |
| **Öffentlicher Katalog-Scope** | Bewusst org-übergreifend, aber **read-only** und auf veröffentlichte, nicht gelöschte Höfe/Produkte begrenzt (Finder/Detail). Das ist **keine** Isolationslücke, sondern öffentlich gewolltes Sortiment. |
| **Käufer-Scope** | Käufer sind **nicht org-gebunden** (`profiles.org_id = NULL`). Ihre Isolationsgrenze ist die **Person** (`auth.uid()`) bzw. bei Gästen ein signiertes Reservierungs-Token. |
| **Fremde Org** | Jede `org_id ≠` der eigenen. Standardergebnis bei Zugriff: **0 Zeilen (RLS-SELECT) bzw. 403 (RLS-WRITE/Edge Function)**. |

> **Verbot (Kanon):** Niemals VMS/TempConnect-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner).
> Dieses Dokument benutzt ausschließlich die Hof-Domäne.

---

## 1 · Isolationsprinzipien (die 6 Invarianten)

Jede Invariante ist **testbar** (siehe §6) und blockierend fürs Isolations-Gate (WAVE_02) bzw. Gate C (Phase 2).

1. **`org_id` auf jeder org-gebundenen Zeile (deny-by-default).**
   Jede Tabelle mit Betriebsbezug trägt eine **`org_id`-Spalte** (`uuid`, in der Regel `not null`,
   `references orgs(id)`). Ist-Stand: `farms`, `products`, `reservations` haben `org_id not null`;
   `audit_log` trägt nullable `org_id` (Plattform-Aktionen ohne Org). Käufer-bezogene Tabellen
   (`profiles` für Käufer, `waitlist`) sind **personen-** statt org-gebunden — sie tragen `org_id`
   bewusst nicht und werden über `auth.uid()`/Token isoliert.

2. **Deny-by-default ist der Grundzustand.**
   `alter table … enable row level security;` ist auf **allen** Tabellen aktiv. Ohne passende Policy
   ist jeder Zugriff verboten. Es gibt **kein** `USING (true)` als Schreib-Schlupfloch und keine
   org-übergreifende Schreib-Policy.

3. **Lese- und Schreibpfade sind getrennt eingegrenzt.**
   Öffentlicher Katalog: `for select` (read-only) auf `deleted_at is null` (Soll zusätzlich
   `status='published'`). Schreibrechte: ausschließlich `org_id ∈ (eigene Org)` über die `*_owner_write`-Policies.
   Kein Lesepfad öffnet einen Schreibpfad.

4. **`service_role` umgeht RLS — und existiert nur serverseitig.**
   Der `service_role`-Key umgeht RLS systemseitig. Er lebt **ausschließlich in Edge Functions** (Deno),
   **nie** im Frontend (Kanon-Verbot). Jeder service-role-Pfad prüft den Org-Scope **selbst in Code**
   (Zod + explizite `org_id`-Prüfung) und schreibt Audit. RLS ist die Wand; Edge Functions sind die
   einzige autorisierte Tür durch die Wand.

5. **Plattform-Übergriff ist eng, begründet und auditiert.**
   Staff/Owner-Lesezugriff über Org-Grenzen ist auf den **definierten Aufgaben-Scope** begrenzt
   (Support-Ticket, Hof-Verifizierung, aggregiertes KPI) und nie Roh-PII fremder Käufer. Jeder
   Übergriff ist auditierbar (Pfeiler 5). „Staff darf alles sehen" ist **kein** zulässiges Modell.

6. **Defense-in-Depth: Frontend spiegelt, RLS entscheidet.**
   Die UI blendet Fremd-Scope aus (Surface-Sichtbarkeit), **zusätzlich** zu RLS, nie **statt** RLS.
   Eine fremde Org, die die UI-Sperre umgeht (direkter API-/PostgREST-Call), trifft auf RLS und
   bekommt 0 Zeilen / 403.

---

## 2 · `org_id`-Vertrag pro Tabelle (Ist + Soll)

Grundlage: `app/supabase/migrations/0001_core.sql`. „Soll" = nächste additive Migration (`app/supabase/migrations/00xx_*.sql`),
ausgerichtet auf `docs/ROLE_AND_PERMISSION_MODEL.md`.

| Tabelle | `org_id` | Isolationsachse | Ist (0001) | Soll (additive Migration) |
|---|---|---|---|---|
| `orgs` | PK `id` ist die Org | Org selbst | RLS an, **keine** anon/auth-Policy → nur `service_role` | SELECT für eigene Org + `is_platform_staff()`; Schreiben `is_org_owner(id)` / `is_owner()` |
| `profiles` | `org_id` (nullable; NULL = Käufer) | Person (`auth.uid()`) | `profiles_self_read` — **nur SELECT** des eigenen Profils (`user_id = auth.uid()`); **kein** Client-Schreibrecht: `role`/`org_id` ausschließlich via `service_role`/Edge Function (verhindert Self-Promotion zu `staff`/`owner`) | + Staff-Lesepfad im Ticket-Kontext |
| `farms` | `org_id not null` | Org | Public-Read (`deleted_at is null`) + `farms_owner_write` (org-gebunden) | Public-Read auf `status='published' AND deleted_at IS NULL` verengen; `status`-Wechsel nur `is_org_owner` |
| `products` | `org_id not null` | Org (über `farm`) | Public-Read (über aktiven `farm`) + `products_owner_write` (org-gebunden) | identisch; Public-Read über **veröffentlichten** `farm` |
| `reservations` | `org_id not null` | Erzeuger-Org (Eingang) + Käufer/Token (eigene) | `reservations_insert` (anon/auth, `farm.org_id`-Konsistenz) + `reservations_owner_read` (`is_org_member(org_id)`) | + Käufer-Selbstsicht und Gast-Token-Lesepfad; Storno-UPDATE org-/personengebunden |
| `org_members` *(Ist, 0003)* | `org_id not null` | Org | `org_members_read` (`is_org_member(org_id)`); Schreiben nur `service_role` | + W-Pfad via Edge Function (Owner-gesteuert) |
| `org_locations` *(Ist, 0003)* | `org_id not null` | Org (Multi-Standort, inkl. SB-Stand) | `org_locations_public_read` (`deleted_at is null`) + `org_locations_owner_write` (`is_org_member(org_id)`) | Public-Read über veröffentlichten Standort verengen |
| `reviews` *(Ist, 0003)* | `org_id not null` | Org (Hof) + Autor | `reviews_public_read` (`status='published'`) · `reviews_insert` (with-check: `rating 1–5`, `verified=false`, `status='published'`, `author_user_id` null/`=auth.uid()`) · `reviews_owner_moderate` (UPDATE, `is_org_member(org_id)`) | — |
| `bounties` *(Ist, 0003)* | — (autor-/personenbezogen) | Autor (`auth.uid()`) | `bounties_public_read` (`status='open'`) · `bounties_insert` (with-check: `title 3–200`, `author_user_id` null/`=auth.uid()`) · `bounties_author_manage` (UPDATE, `author_user_id=auth.uid()`) | — |
| `credits_ledger` *(Ist, 0003)* | `org_id not null` | Org | `credits_owner_read` (`is_org_member(org_id)`); Schreiben nur `service_role` | — |
| `farm_applications` *(Ist, 0004)* | — (Bewerbung vor Org-Anlage) | Einreicher (Insert) + Staff/Owner (Lesen/Moderation) | `farm_applications_insert` (anon/auth, Basis-Validierung) · `farm_applications_staff_read` (`profiles.role in ('staff','owner')`) · `farm_applications_staff_update` (Staff/Owner, with-check `status`-Enum) | — |
| `subscriptions` *(Ist, 0002)* | `org_id not null` | Org | `subscriptions_owner_read` (`is_org_member(org_id)`); **W nur Edge Function (service role)** via Stripe-Webhook | — |
| `sb_payments` *(Ist, 0002)* | `org_id not null` | Org (USP SB-Stand) | `sb_payments_owner_read` (`is_org_member(org_id)`); **W nur Edge Function (service role)** via Stripe-Webhook/`create-checkout` | — |
| `payment_events` *(Ist, 0002)* | — (Stripe-Event-Dedup) | Idempotenz | RLS an, **keine** anon/auth-Policy → nur `service_role` | — |
| `availability` *(Soll)* | `org_id not null` | Org | — (in `products.availability` integriert) | eigene Tabelle, org-gebunden, Public-Read über veröffentlichten `farm` |
| `pickup_windows` *(Soll)* | `org_id not null` | Org | — (in `farms.pickup_windows[]`) | eigene Tabelle, org-gebunden |
| `verifications` *(Soll)* | `org_id not null` | Org + Plattform-Prüfung | — | R: eigene Org + Staff; Upload `is_org_member`; Entscheidung Staff/Owner (Audit) |
| `support_tickets` *(Soll)* | `org_id` (nullable bei Käufer) | Ersteller + zugew. Staff | — | R: Ersteller · zugew. Staff · Owner; W: Ersteller (anlegen) / Staff-Owner (bearbeiten) |
| `feature_flags` *(Soll)* | — (plattformweit) | Plattform | — | R: Staff/Owner; W: Owner (kritisch) / Staff (nicht-kritisch) |
| `waitlist` | — (personenbezogen, Landing) | Insert-only | `waitlist_insert` (anon, Längenlimits `email≤320`/`plz≤16`); kein SELECT | unverändert; Lesen nur `service_role` |
| `audit_log` | `org_id` (nullable) | Append-only Wahrheit | RLS an, **keine** anon/auth-Policy → nur `service_role` | + SELECT Owner (voll) / Staff (eigener Scope); nie UPDATE/DELETE |

> **`org_id`-Konsistenz-Invariante (kritisch):** Bei `reservations` muss die mitgegebene `org_id` zur
> `org_id` des referenzierten `farm` passen — die Insert-Policy erzwingt das bereits
> (`f.id = reservations.farm_id AND f.org_id = reservations.org_id`). Damit kann ein Gast keine
> Reservierung „in eine fremde Org schmuggeln". Gleiche Konsistenz-Prüfung gilt für jede neue
> org-gebundene Tabelle mit FK auf `farms`/`products`: **die `org_id` wird serverseitig aus dem
> Parent abgeleitet, nie vom Client diktiert** (Edge Function setzt sie aus dem Parent).

---

## 3 · RLS-Helper (Ist-konform + Soll)

**Ist-Stand:** `0001_core.sql` band Org zunächst über Inline-Subquery
`org_id in (select org_id from profiles where user_id = auth.uid())`. `0003_marketplace.sql` hat
die Owner-Policies von `farms`/`products`/`reservations`/`subscriptions`/`sb_payments` bereits auf den
zentralen Helper **`is_org_member(org_id)`** gehoben (Multi-Org):

```sql
-- Ist (0003_marketplace.sql): zentraler Multi-Org-Helfer.
-- security definer, prüft NUR auth.uid() → sicher; fixierter search_path.
create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from profiles  pr where pr.org_id = p_org and pr.user_id = auth.uid());
$$;
```

`is_org_member` deckt Käufer (org_id = NULL → kein Match → 0 Zeilen) korrekt ab. **Soll (additive
Migration):** zusätzliche rollenbezogene `security definer`-Helper für den Plattform-Übergriff, die die
deutschen Rollen-Enums (`kaeufer`,`erzeuger`,`staff`,`owner`) respektieren. Helper sind `stable`,
mit fixiertem `search_path` (Schutz vor Suchpfad-Hijacking).

```sql
-- ── Soll: zentrale Isolations-Helper (additive Migration) ──────────
-- Org der eingeloggten Person (NULL für Käufer/Gast).
create or replace function app_current_org_id() returns uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select org_id from profiles where user_id = auth.uid()
$$;

-- Rolle der eingeloggten Person.
create or replace function app_current_role() returns user_role
  language sql stable security definer set search_path = public, pg_temp as $$
  select role from profiles where user_id = auth.uid()
$$;

-- Plattform-Personal (Staff oder Owner) — darf im engen Scope org-übergreifend lesen.
create or replace function app_is_platform_staff() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(app_current_role() in ('staff','owner'), false)
$$;

-- Owner (oberste Instanz).
create or replace function app_is_owner() returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(app_current_role() = 'owner', false)
$$;
```

**Beispiel-Refactor einer Policy auf den Helper (verhaltensgleich, lesbarer, eine Wahrheit):**

```sql
-- statt Inline-Subquery in jeder Policy:
drop policy if exists farms_owner_write on farms;
create policy farms_owner_write on farms
  for all to authenticated
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
```

> **Wichtig:** `app_current_org_id()` liefert für Käufer `NULL`. Eine Org-Policy `org_id = app_current_org_id()`
> ergibt für Käufer `org_id = NULL` → **kein** Match (NULL-Vergleich ist nie wahr) → 0 Zeilen. Das ist
> das gewünschte deny-by-default-Verhalten: **ein Käufer trifft nie auf Erzeuger-Org-Daten.** Genau
> diese NULL-Falle wird in §6.3 negativ getestet.

---

## 4 · Plattform-Übergriff (Staff/Owner) — eng & auditiert

Plattform-Scope ist die **einzige** legitime org-übergreifende Achse. Er ist additiv (Soll) und folgt vier Regeln:

1. **Nur Lesen, nur im Aufgaben-Scope.** Staff liest fremde Org-Daten ausschließlich im Kontext eines
   zugewiesenen Support-Tickets oder einer Hof-Verifizierung — nicht „global stöbern".
2. **Owner aggregiert, sieht keine Roh-PII fremder Käufer.** Das Owner-KPI-Dashboard liest **aggregierte**
   Sichten (Anzahl Höfe, Reservierungen, Conversion), nicht Käufer-Klartext fremder Personen.
3. **Schreiben über Org-Grenzen nur per Edge Function (service role) + Audit + `reason`.** Beispiele:
   De-Listing eines Hofs (Policy-Verstoß), Account-Sperre, Verifizierungs-Entscheidung. RLS allein gibt
   Staff/Owner **kein** org-übergreifendes Schreibrecht; der Weg führt über die auditierte Edge Function.
4. **Break-Glass (Owner) zeitlich begrenzt.** Notfall-Übergriff nur mit Confirm + Reason + Risk-Level +
   append-only Audit; danach automatisch erlöschend.

```sql
-- ── Soll: enger Staff-Lesepfad (NICHT 'using (true)') ──────────────
-- Beispiel reservations: Staff liest fremde Reservierung nur, wenn ein
-- offenes, ihm zugewiesenes Ticket auf genau diese Org/Entität zeigt.
create policy reservations_staff_ticket_read on reservations
  for select to authenticated
  using (
    app_is_platform_staff()
    and exists (
      select 1 from support_tickets t
      where t.org_id = reservations.org_id
        and t.assigned_staff = auth.uid()
        and t.status = 'open'
    )
  );
```

> **Verbot:** Kein `app_is_platform_staff()` als alleinige `USING`-Bedingung ohne Ticket-/Scope-Anker.
> „Staff = `using(true)`" wäre eine Isolationslücke und ist kanon-verboten (Stop-Regel).

---

## 5 · Edge-Function-Vertrag (die einzige Tür durch die RLS-Wand)

Jede Edge Function, die mit `service_role` arbeitet (also RLS umgeht), erfüllt **alle** Punkte:

- **Zod-Validierung an der Grenze** — kein ungeprüftes Payload.
- **Org-Scope explizit in Code** — die wirksame `org_id` wird **serverseitig** bestimmt (aus Session,
  aus dem Parent-Datensatz, aus Webhook-Metadaten), **nie** blind aus dem Client-Body übernommen.
- **Konsistenz-Ableitung** — bei Inserts mit Parent (`reservations` → `farm`) wird `org_id` aus dem Parent
  geladen und gesetzt; ein abweichender Client-Wert wird verworfen oder mit 422 abgelehnt.
- **Rechteprüfung** — Rolle/Rang passend zur Aktion (siehe `ROLE_AND_PERMISSION_MODEL.md` §2).
- **Turnstile** bei öffentlichen Formularen (Gast-Reservierung, Waitlist) gegen Bot-Flut.
- **Audit-Write** — jede Mutation nach `audit_log` (`actor_user_id`, `org_id`, `action`, `entity_type`,
  `entity_id`, `reason`, `details`), append-only.
- **Stripe-Webhook** — **EIN** signaturgeprüfter, idempotenter Handler ist die Wahrheit für
  `subscriptions`/`sb_payments`; Entitlements/Beträge nie clientseitig.

> **Fremd-Org-Schmuggel-Schutz:** Liefert ein Client eine `org_id`, die nicht zu seiner Session/seinem
> Parent passt, antwortet die Edge Function mit **403/422** und schreibt einen Audit-Eintrag
> (`action='isolation.reject'`). Das ist die serverseitige Spiegelung des RLS-Negativtests aus §6.3.

---

## 6 · Isolationstest — Pflicht (Plattform- + Org-Ebene)

> **Gate-Regel (Kanon · `AGENTS.md`):** Kein Merge ohne **grünen** Isolationstest auf **Plattform- und
> Org-Ebene**. Verantwortlich: `db-rls-spezialist` (Policies) + `qa-tester` (Test). Gate: WAVE_02
> (Isolations-Gate), Phase 2 Gate C, WAVE_12 (Cross-Org-Negativtests).

Test-Mechanik (Supabase/Postgres): Test setzt pro Fall den simulierten Auth-Kontext und prüft das
RLS-Ergebnis. Pro Tabelle gelten **drei Pflichtfälle** (Pfeiler 6):
**(a) fremde Org → 0 Zeilen / 403**, **(b) leere Daten → Zero-State (kein 500)**, **(c) Eigen-Zugriff → erwartetes Shape**.

```sql
-- Simulierter Auth-Kontext für RLS-Tests (Pattern; in Test-Harness gekapselt).
-- role = 'authenticated' aktiviert RLS-Auswertung; request.jwt.claims setzt auth.uid().
create or replace function test_as(uid uuid) returns void
  language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
end $$;

create or replace function test_as_anon() returns void
  language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{}', true);
end $$;
```

### 6.1 Fixtures (zwei Orgs + drei Personen)

```sql
-- Org A (Hof Sonnenwiese) und Org B (Imkerei Lindgren) — strikt getrennt.
insert into orgs (id, name) values
  ('00000000-0000-0000-0000-00000000000a','Hof Sonnenwiese'),
  ('00000000-0000-0000-0000-00000000000b','Imkerei Lindgren');

-- Erzeuger A gehört Org A, Erzeuger B gehört Org B, Käufer K gehört keiner Org.
insert into profiles (user_id, org_id, role, display_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','erzeuger','Erzeuger A'),
  ('bbbbbbbb-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','erzeuger','Erzeuger B'),
  ('cccccccc-0000-0000-0000-000000000001', null,                                  'kaeufer','Käufer K');

insert into farms (id, org_id, name, type, street, plz, city, lat, lng) values
  ('hof-sonnenwiese','00000000-0000-0000-0000-00000000000a','Hof Sonnenwiese','Hofladen','Feldweg 1','21337','Lüneburg',53.2,10.4),
  ('imkerei-lindgren','00000000-0000-0000-0000-00000000000b','Imkerei Lindgren','Imkerei','Waldstr 2','29223','Celle',52.6,10.1);

insert into products (id, farm_id, org_id, name, category, unit, price) values
  ('p-a-eier','hof-sonnenwiese','00000000-0000-0000-0000-00000000000a','Freilandeier','Eier','10 Stück',3.80),
  ('p-b-honig','imkerei-lindgren','00000000-0000-0000-0000-00000000000b','Sommerhonig','Honig','500 g',7.50);
```

### 6.2 Positivtests — Eigen-Zugriff liefert erwartetes Shape (Org-Ebene)

```sql
-- (c) Erzeuger A liest/ändert seinen Hof → genau 1 Zeile, Schreiben erlaubt.
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from farms where org_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'Erzeuger A muss genau seinen Hof sehen';
  update farms set story = 'Saisonstart' where id = 'hof-sonnenwiese';  -- darf nicht fehlschlagen
end $$;

-- (b) leere Daten → Zero-State, kein Fehler: Erzeuger A hat (noch) keine Reservierungen.
select test_as('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from reservations where org_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'leerer Reservierungs-Eingang muss 0 liefern (Zero-State), nicht crashen';
end $$;

-- Öffentlicher Katalog-Scope: anonym liest beide aktiven Höfe (gewollt org-übergreifend, read-only).
select test_as_anon();
do $$ begin
  assert (select count(*) from farms where deleted_at is null) = 2,
    'öffentlicher Finder muss aktive Höfe beider Orgs read-only zeigen';
end $$;
```

### 6.3 Negativtests — fremde Org = 0 Treffer / 403 (Kernforderung)

```sql
-- N1 · Erzeuger B sieht KEINE Reservierungen/Daten von Org A.
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from reservations where org_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'FREMDE ORG: Erzeuger B darf 0 Reservierungen von Org A sehen';
end $$;

-- N2 · Käufer K (org_id = NULL) sieht KEINE Erzeuger-Reservierungen (NULL-Falle, §3).
select test_as('cccccccc-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from reservations) = 0,
    'KÄUFER: org_id=NULL darf keinen Erzeuger-Reservierungs-Scope treffen';
end $$;

-- N3 · Erzeuger B kann Org-A-Produkt NICHT ändern → RLS verbietet (0 betroffene Zeilen / Fehler).
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$
declare affected int;
begin
  update products set price = 0.01 where id = 'p-a-eier';
  get diagnostics affected = row_count;
  assert affected = 0, 'FREMDE ORG: Schreibversuch auf Org-A-Produkt muss 0 Zeilen treffen (RLS-Deny)';
end $$;

-- N4 · Erzeuger B kann KEINE Reservierung in Org A schmuggeln (org_id-Konsistenz, §2).
--      farm_id zeigt auf Org A, aber with-check verlangt farm.org_id = reservations.org_id.
select test_as('bbbbbbbb-0000-0000-0000-000000000001');
do $$
begin
  begin
    insert into reservations (farm_id, product_id, org_id, quantity, pickup_window, name, contact)
    values ('hof-sonnenwiese','p-a-eier','00000000-0000-0000-0000-00000000000b',1,'Sa 9-12','X','x@y.de');
    assert false, 'SCHMUGGEL: Insert mit org_id≠farm.org_id muss von RLS abgelehnt werden';
  exception when others then null;  -- erwartet: RLS-/with-check-Verletzung
  end;
end $$;

-- N5 · Anonyme/fremde Lesen von orgs/audit_log → 0 Zeilen (keine anon/auth-Policy = deny).
select test_as_anon();
do $$ begin
  assert (select count(*) from orgs) = 0,    'orgs darf für anon nicht lesbar sein';
  assert (select count(*) from audit_log) = 0,'audit_log darf für anon nicht lesbar sein';
end $$;
```

### 6.4 Plattform-Ebene (Übergriff korrekt eng)

```sql
-- P1 · Staff OHNE zugewiesenes Ticket sieht KEINE fremde Reservierung (eng, nicht using(true)).
--      (gilt nach Einführung des Staff-Ticket-Lesepfads §4)
-- P2 · Owner-KPI liest AGGREGAT (Anzahl), nie Käufer-Roh-PII fremder Personen.
-- P3 · Org-übergreifendes Schreiben (De-Listing) NUR via Edge Function + Audit, nie direkte RLS-Policy.
-- Diese Fälle werden als Edge-Function-Tests (Deno) + Policy-Tests geführt; Erwartung:
--   Staff ohne Ticket  → 0 Zeilen
--   Staff mit Ticket   → genau die Ticket-bezogenen Zeilen, kein darüber hinaus
--   Direkt-Update Staff → 0 Zeilen (RLS-Deny); nur Edge Function (service role) mutiert + auditiert.
```

### 6.5 API-/PostgREST-Negativtest (End-to-End, gegen UI-Bypass)

Zusätzlich zum SQL-Layer ein **HTTP-Negativtest** gegen die echte API (PostgREST/Edge):
mit einem JWT von Erzeuger B auf `…/rest/v1/reservations?org_id=eq.<Org-A-UUID>` zugreifen →
Erwartung **leeres Array `[]`** (RLS filtert), **niemals** Org-A-Zeilen, und bei Schreibversuch
**403/`42501`**. Das beweist Pfeiler 1 (fremde Org → 0/403) auf dem realen Transportweg und schließt
einen UI-Bypass aus (Pfeiler 7 Drilldown-Integrität).

---

## 7 · Verifikations-Checkliste (Isolations-Gate)

- [ ] **Jede org-gebundene Tabelle** trägt `org_id` (`farms`/`products`/`reservations` ✅; neue Tabellen additiv mit `org_id not null`).
- [ ] **RLS aktiv** auf allen Tabellen, **deny-by-default**, kein `USING (true)` als Schreib-/Übergriffs-Schlupfloch.
- [ ] **Getrennte** Lese-/Schreibpfade; öffentlicher Katalog read-only (Soll: `status='published'`).
- [ ] **`service_role` nur in Edge Functions**; Frontend nur `VITE_`-Public-Keys (Kanon-Verbot geprüft).
- [ ] **`org_id`-Konsistenz** bei FK-Inserts serverseitig aus Parent abgeleitet (Schmuggel-Schutz, N4).
- [ ] **Plattform-Übergriff** eng (Ticket-/Aggregat-Anker), auditiert, kein global-`true`-Staff-Lesen.
- [ ] **Negativtests grün:** fremde Org → 0 Zeilen / 403 (N1–N5); Käufer-NULL-Falle (N2); Schmuggel-Insert (N4); anon→orgs/audit_log = 0 (N5).
- [ ] **Positivtests grün:** Eigen-Zugriff = erwartetes Shape; leere Daten = Zero-State; öffentlicher Finder = aktive Höfe beider Orgs.
- [ ] **Plattform-Ebene grün:** Staff ohne Ticket = 0; Staff mit Ticket = exakt Ticket-Scope; Direkt-Update Staff = 0 (nur Edge Function mutiert).
- [ ] **API-/PostgREST-Negativtest grün** (HTTP-Ebene, gegen UI-Bypass).
- [ ] **Audit** bei jedem org-übergreifenden Schreiben (`reason` Pflicht bei kritischen Aktionen), append-only.

---

> **Änderungen** an diesem Isolationsmodell sind Security-/DB-relevant → **Owner-Freigabe** + ADR in
> `.claude/memory/decisions/` + Update in `MASTER_INDEX.md` und `docs/releases/PHASE_STATUS.md`.
> Policy-Änderungen ausschließlich als **additive Migration** unter `app/supabase/migrations/` mit Rollback-Plan
> und **grünem Isolationstest** (Plattform + Org) vor Merge.
