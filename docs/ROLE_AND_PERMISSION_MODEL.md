# ROLE_AND_PERMISSION_MODEL — LokaleBauernConnect

> Verbindliches Rollen-, Berechtigungs- und Sichtbarkeitsmodell der Plattform-Spezialschicht.
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack
> **React+Vite+TS · Supabase (Postgres + RLS, Edge Functions/Deno) · Cloudflare · Stripe (+ Connect)**.
>
> **Goldene Regel (nicht verhandelbar):** Berechtigung lebt in der **Datenbank (RLS)**, nicht im Client.
> Das Frontend **spiegelt** Rechte nur (Surface-Sichtbarkeit), es **entscheidet** sie nie. Eine fremde Org
> bekommt **403, nie 200 mit Fremddaten** (Produktionspfeiler 1). RLS gilt **deny-by-default ab Migration #1**.
>
> **Vermittler-Rolle:** Die Plattform vermittelt, verkauft nicht selbst, berät nicht. Kein Recht in diesem
> Dokument darf so interpretiert werden, dass die Plattform Eigenverkauf, Beratung oder Lebensmittel-Haftung
> übernimmt. Disclaimer durchgängig sichtbar.
>
> **Quelle der Wahrheit:** `app/supabase/migrations/0001_core.sql` … `0004_onboarding.sql` (Enums, Tabellen, RLS). Dieses Dokument ist 1:1 daran ausgerichtet; ⬜-markierte Tabellen/Helper sind Soll, noch nicht migriert.
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Stop-/Verbots-Regeln), `AGENTS.md` (harte Regeln),
> `PHASEN.md` (WAVE_02 Datenmodell+RLS · WAVE_03 Rollen/Sichtbarkeit · WAVE_09 Billing · Phase 4 Track A SB-Bezahlung),
> `docs/DATABASE_MODEL.md` (Schema-Referenz), `docs/security/TENANT_ISOLATION_MODEL.md`.
> **Status:** Normativ. Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md` (WAVE_03 = offen → dieses Dokument ist die Spezifikation dafür).

---

## 0 · Begriffe & Abgrenzung (Hof-Domäne — keine VMS-Begriffe)

| Begriff | Bedeutung in LokaleBauernConnect |
|---|---|
| **Org (Tenant)** | Mandant. Bei Erzeugern = der **Betrieb** (Hof / Hofladen / Imkerei / Manufaktur). Bei der Plattform-Betreiberseite = die **Plattform-Org** (Staff/Owner). Käufer sind **nicht** org-gebunden. |
| **Betrieb (`farm`)** | Verkaufsstandort eines Erzeugers (Hofladen, Bauernhof, Imkerei, Hofmetzgerei, Manufaktur, Gärtnerei). 1 Org kann mehrere `farms` haben (z. B. Hauptstand + Filiale). |
| **Stand / SB-Stand** | Unbemannter Selbstbedienungs-Hofladen (Vertrauenskasse). Ziel des **SB-Bezahl-USP** (QR → Stripe → Quittung). |
| **Abholfenster (`pickup_window`)** | Vom Erzeuger gepflegtes Zeitfenster, in dem Käufer Reservierungen abholen. |
| **Reservierung (`reservation`)** | Käufer-Vorbestellung eines Produkts zur Abholung — **kein** Kaufvertrag, **keine** Bezahlung (Vermittlung). |
| **Verfügbarkeit (`availability`)** | Erzeuger-gepflegter Bestands-/Saisonstatus (`available · low · soon · out`). |

> **Verbot (Kanon):** Niemals TempConnect/VMS-Begriffe übernehmen (Vendor Pool, Requisition, Einsatzportal,
> Stundenzettel, SCC, Hetzner). Dieses Dokument benutzt ausschließlich die Hof-Domäne.

---

## 1 · Die drei Welt-Rollen + die Owner-Instanz

Rollen sind **disjunkt nach Welt** (Käufer-, Erzeuger-, Staff-Welt strikt getrennt — Session + Berechtigung,
`CLAUDE.md` „Kritische Produkt-Abgrenzung"). Eine natürliche Person kann mehrere Accounts haben, aber **eine Session = eine Welt**.

> **Quelle der Wahrheit:** `app/supabase/migrations/0001_core.sql` (Enum `user_role`) + `0003_marketplace.sql` (`org_members`).
> 1. **Welt-/Rollen-Enum** — `profiles.role` ∈ {`kaeufer`, `erzeuger`, `staff`, `owner`} (Enum **`user_role`**, deutsch persistiert für die ersten drei, `owner` als vierter Wert). Bestimmt die **Welt** bzw. die oberste Instanz.
> 2. **Org-Mitgliedschaft (Multi-Org)** — `org_members.role` (Typ **`user_role`**, Default `'erzeuger'`) ordnet einen User zusätzlich weiteren Orgs zu. Es gibt **kein** separates `org_role`-Enum mit `platform_owner/org_owner/org_member`.
>
> Der **Owner** ist im echten Schema ein **eigener `user_role`-Wert** (`'owner'`), **nicht** eine Rang-Ausprägung über `org_members`. Frühere Versionen dieses Dokuments beschrieben ein Drei-Werte-Enum + `org_role`-Rang — das weicht von der Migration ab und ist hiermit korrigiert.

| Welt-Rolle | DB-Wert (`profiles.role`, Enum `user_role`) | Welt | Org-Bindung | Identitäts-/Auth-Anforderung |
|---|---|---|---|---|
| **Käufer** | `kaeufer` | Käufer-Welt | **keine** (`org_id = NULL`) | Optional anonym (Reservierung als Gast möglich, Turnstile-geschützt); optional registriert für Favoriten/Saison-Alerts. |
| **Erzeuger** | `erzeuger` | Erzeuger-Welt | `org_id` (sein Betrieb); weitere Orgs via `org_members` (Multi-Org, 0003) | Supabase Auth Pflicht; E-Mail verifiziert; Betrieb durchläuft **Hof-Verifizierung** (WAVE_07) bevor öffentlich gelistet. |
| **Staff** | `staff` | Plattform-Welt | Plattform-Org; **darf org-übergreifend** im definierten Aufgaben-Scope handeln (Support/Verifizierung) | Supabase Auth + **MFA Pflicht**; jede Aktion auditiert; kein lesender Vollzugriff auf Käufer-PII außer im Ticket-Kontext. |
| **Owner** | `owner` | Plattform-Welt (oberste Instanz) | Plattform-Org | Höchste Stufe: Preise/Pläne/Feature-Flags, kritische Aktionen mit **Confirm + Reason (Pflicht) + Risk-Level + Audit**, ggf. Break-Glass. |

**Org-Mitgliedschaft (`org_members`, 0003):** `org_members(org_id, user_id)` mit `role user_role DEFAULT 'erzeuger'`. Mitgliedschaft wird über die Funktion `is_org_member(org_id)` aufgelöst (berücksichtigt `org_members` **und** `profiles.org_id`). Eine feinere innerbetriebliche Rang-Differenzierung (Inhaber vs. Mitarbeiter) ist (Stand 0004) **nicht** im Schema kodiert — sie ist Spezifikations-Soll für eine spätere Migration.

> **Owner ≠ Erzeuger-Inhaber.** `owner` (DB-Rolle) = Plattform-Betreiber (oberste Steuerung, plattformweit). Ein Betriebsinhaber ist ein `erzeuger` mit `org_members`-Mitgliedschaft seiner Org. Niemals vermischen.

---

## 2 · Permission-Matrix (Aktion × Rolle)

Legende: **✓** erlaubt · **○** erlaubt, bedingt (Spalte „Bedingung") · **—** verboten (RLS-Deny → 403/leer).
„Erzeuger" hier = `org_member`-Mindestrang; Spalten heben hervor, wo `org_owner` zusätzlich nötig ist.
„eig." = nur eigene/eigene-Org-Daten. „Plan-Lock" siehe §5.

### 2.1 Entdecken & Reservieren (Käufer-Welt)

| Aktion | Käufer | Erzeuger | Staff | Owner | Bedingung |
|---|:--:|:--:|:--:|:--:|---|
| Öffentliche Höfe/Produkte ansehen (Finder, Detail) | ✓ | ✓ | ✓ | ✓ | Nur nicht-gelöschte Höfe (`deleted_at IS NULL`); Produkte über nicht-gelöschten Hof. Anonym erlaubt. (`farms` hat keinen `status`.) |
| Saison-Radar / Verfügbarkeit lesen | ✓ | ✓ | ✓ | ✓ | öffentlich |
| Reservierung anlegen | ✓ | ✓ | — | — | Gast erlaubt (Turnstile); Staff/Owner reservieren nicht (Vermittler, kein Eigenkauf). |
| Eigene Reservierungen ansehen | ○ eig. | ○ eig. | — | — | Registrierte: eigene; Gäste: per Bestätigungs-Token. |
| Reservierung stornieren | ○ eig. | — | ○ Ticket | ○ Ticket | Käufer storniert eigene; Staff/Owner nur im auditierten Support-Ticket. |
| Favoriten / Saison-Alerts anlegen | ○ | — | — | — | Nur **registrierte** Käufer (Konto nötig). |

### 2.2 Betrieb & Sortiment pflegen (Erzeuger-Welt)

| Aktion | Käufer | Erzeuger (`org_member`) | Erzeuger (`org_owner`) | Staff | Owner | Bedingung |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Betrieb (`farm`) anlegen | — | — | ✓ | ○ Onboarding-Hilfe | ✓ | `org_owner` legt eigenen Betrieb an; Staff nur assistiert (auditiert). |
| Betriebs-Stammdaten bearbeiten (Adresse, Öffnungszeiten, Story) | — | ○ eig. | ✓ eig. | ○ Ticket | ✓ | RLS `org_id = profile_org()`. |
| Produkt anlegen/bearbeiten/löschen | — | ✓ eig. | ✓ eig. | — | ○ Korrektur | Staff korrigiert nicht inhaltlich; Owner nur bei Policy-Verstoß (auditiert). |
| Verfügbarkeit pflegen (`available/low/soon/out`) | — | ✓ eig. | ✓ eig. | — | — | Kern-Selbstpflege (Pfeiler RBAC). |
| Abholfenster (`pickup_windows`) konfigurieren | — | ✓ eig. | ✓ eig. | — | — | |
| Reservierungs-Eingang ansehen/abhaken | — | ✓ eig. | ✓ eig. | ○ Ticket | ○ Ticket | Erzeuger sieht nur Reservierungen **seiner** `farms`. |
| Betrieb veröffentlichen / verbergen (`status`) | — | — | ✓ eig. | ○ De-Listing | ✓ | Öffentlich erst nach Hof-Verifizierung (siehe §2.3). |
| Premium-Listing aktivieren | — | — | ○ Plan-Lock | — | ✓ | Plan `plus`+ (§5). |
| Betriebs-Mitglieder verwalten (`org_members`) | — | — | ✓ eig. | ○ Ticket | ✓ | Nur `org_owner` lädt/entfernt `org_member`. |

### 2.3 Verifizierung, Support & Moderation (Staff-Welt)

| Aktion | Käufer | Erzeuger | Staff | Owner | Bedingung |
|---|:--:|:--:|:--:|:--:|---|
| Hof-Verifizierung prüfen/freigeben/ablehnen | — | ○ Nachweise hochladen | ✓ | ✓ | Staff prüft Nachweise; Status-Übergang auditiert (`reason` Pflicht bei Ablehnung). |
| Support-Ticket eröffnen | ○ eig. | ○ eig. | ✓ | ✓ | Käufer/Erzeuger nur eigenes; Staff/Owner alle. |
| Support-Ticket bearbeiten/eskalieren | — | — | ✓ | ✓ | Zugriff auf zugeordnete PII nur im Ticket-Kontext (Minimalprinzip). |
| Inhalt moderieren (Hof/Produkt verbergen) | — | — | ✓ | ✓ | `reason` Pflicht · Audit · benachrichtigt Erzeuger. |
| Käufer-/Erzeuger-Account sperren | — | — | ○ Risk≤mittel | ✓ | Hoch-Risiko nur Owner; Confirm+Reason+Audit. |
| Audit-Feed lesen | — | — | ○ eigener Scope | ✓ | Owner = voll; Staff = eigene Aktionen + zugewiesene Tickets. |

### 2.4 Commercial, Geld & Plattform-Steuerung (Owner-Welt)

| Aktion | Käufer | Erzeuger (`org_owner`) | Staff | Owner | Bedingung |
|---|:--:|:--:|:--:|:--:|---|
| Erzeuger-Abo abschließen/ändern/kündigen | — | ✓ eig. | — | ○ Kulanz | Stripe-Checkout; Entitlement serverseitig (Webhook). Staff nie direkt am Abo. |
| Rechnungen/Zahlungsbelege (eigener Betrieb) sehen | — | ✓ eig. | ○ Ticket | ✓ | |
| Stripe-Connect-Auszahlungskonto verbinden (SB-USP) | — | ✓ eig. | — | ○ Hilfe | Phase 4 Track A; KYC bei Stripe; Plattform berührt keine Auszahlungsdaten direkt. |
| SB-Zahlungseingänge des Betriebs ansehen | — | ✓ eig. | ○ Ticket | ✓ | Betrieb sieht nur **eigene** Transaktionen. |
| Plattform-Preise/Pläne/Entitlements ändern | — | — | — | ✓ | Owner-only; Confirm+Reason+Audit; serverseitig wirksam. |
| Feature-Flags schalten | — | — | ○ nicht-kritisch | ✓ | Kritische Flags (Payment, RLS, Auth) Owner-only. |
| Plattform-KPI-Dashboard (alle Orgs aggregiert) | — | — | ○ Subset | ✓ | Owner = voll; Staff = operatives Subset. Niemals Roh-PII fremder Orgs. |
| Globale Daten-Exporte / DSGVO-Auskunft | — | ○ eig. Auskunft | ○ im Auftrag | ✓ | Finance/Export ohne Audit = Stop-Regel. |
| Migrationen / Schema / RLS-Policies ändern | — | — | — | ✓ | Nur via Migration (`app/supabase/migrations/`), Owner-Freigabe, Rollback-Plan. |

> **Stop-Regel (Kanon):** Ist für eine Aktion unklar, *welche Rolle schreiben darf*, oder ist der **Org-Scope
> serverseitig nicht prüfbar**, wird **nicht** gebaut — minimaler Fix vorschlagen, Owner-OK abwarten.

---

## 3 · RLS-Mapping (deny-by-default, ab Migration #1)

Jede Tabelle: `org_id` (außer rein käuferbezogene), Zeitstempel (`created_at`/`updated_at`), `deleted_at`,
**RLS aktiviert ohne `USING (true)`-Schlupflöcher**. Lese- **und** Schreibpfade getrennt (SELECT/INSERT/UPDATE/DELETE-Policies).
Öffentliche Lesepfade sind **explizit** eingegrenzt — bei `farms`/`products`/`org_locations` auf `deleted_at IS NULL`, bei `reviews` auf `status='published'`, bei `bounties` auf `status='open'` — nicht „alles offen". (Hinweis: `farms` hat kein `status`-Feld; Sichtbarkeit über Soft-Delete + `verified`-Flag.)

### 3.1 Helper (SQL-Functions)

> **Ist-Stand (Migrationen 0001–0003):** Es existiert genau **eine** rollen-/org-bezogene Helper-Funktion: `is_org_member(p_org uuid)` (0003, `security definer`, `stable`). Die übrigen unten als *(Soll)* markierten Helper sind **noch nicht migriert**; RLS-Policies fragen `profiles`/`org_members` heute **inline** ab.

```sql
-- REAL (0003_marketplace.sql): Multi-Org-Mitgliedschaft des aktuellen Users.
create or replace function is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from profiles  pr where pr.org_id = p_org and pr.user_id = auth.uid());
$$;

-- Inline-Muster, wie es die echten Policies verwenden (statt Helper):
--   org_id in (select org_id from profiles where user_id = auth.uid())
--   exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('staff','owner'))
```

> **(Soll, künftige Migration)** Für Lesbarkeit/Wiederverwendung empfohlen, aber noch nicht vorhanden: `current_org_id()`, `current_role_kind()`, `is_platform_staff()` (= `role in ('staff','owner')`), `is_owner()` (= `role = 'owner'`). Diese würden die heutigen Inline-Sub-Selects kapseln, ohne das Verhalten zu ändern. Hinweis: Das Rollen-Enum heißt `user_role` (nicht `role_kind`), und Owner ist der `user_role`-Wert `'owner'` (kein `org_role`-Rang).

### 3.2 Policy-Mapping je Tabelle

> **Legende Status:** ✅ = real in 0001–0004 migriert · ⬜ = Spezifikations-Soll (Tabelle/Policy noch nicht migriert). Die Spalte „SELECT/Schreiben" beschreibt für ✅-Zeilen die **tatsächlichen** Policies (siehe `DATABASE_MODEL.md` §7), für ⬜-Zeilen das Ziel.

| Tabelle | Status | SELECT (lesen) | Schreiben | Begründung |
|---|---|---|---|---|
| `profiles` | ✅ | nur eigenes Profil (`user_id = auth.uid()`) | **nur `service_role`** (keine anon/auth-Policy) | PII-Minimierung; Selbst-Eskalation verhindert (Rolle nie clientseitig setzbar). |
| `orgs` | ✅ | **nur `service_role`** (keine Lese-Policy für anon/auth) | nur `service_role` | Mandanten-Isolation; Org-Anlage über Edge. |
| `org_members` | ✅ | `is_org_member(org_id)` | nur `service_role` | Mitglieder lesen eigene Orgs; Verwaltung serverseitig. |
| `farms` | ✅ | **öffentlich:** `deleted_at IS NULL` (kein `status`-Filter — `status` existiert nicht); **Owner-Write-Policy** deckt auch Lesen ab | `is_org_member(org_id)` (`USING`+`WITH CHECK`) | Öffentlicher Finder + Selbstpflege. Verifizierung über `verified`-Flag. |
| `products` | ✅ | öffentlich über nicht-gelöschten `farm`; Owner-Write deckt eigene ab | `is_org_member(org_id)` | Erzeuger-Selbstpflege des Sortiments. |
| `reservations` | ✅ | `is_org_member(org_id)` (nur Erzeuger der Org); Käufer/Gast haben **keine** SELECT-Policy | INSERT: anon/auth mit `EXISTS`-Hof-Prüfung; UPDATE/DELETE **nur `service_role`** | Erzeuger sieht die seiner Betriebe; Statusübergänge serverseitig. |
| `org_locations` | ✅ | öffentlich `deleted_at IS NULL` | `is_org_member(org_id)` | Standorte/SB-Stände. |
| `reviews` | ✅ | `status='published'` (öffentlich) | INSERT anon/auth (rating 1–5, `verified=false`, `status='published'`); UPDATE `is_org_member(org_id)` (moderieren) | Bewertungen + Reputation. |
| `bounties` | ✅ | `status='open'` (öffentlich) | INSERT anon/auth (title 3–200); UPDATE `author_user_id = auth.uid()` | Käufer-Gesuche. |
| `credits_ledger` | ✅ | `is_org_member(org_id)` | nur `service_role` | Guthaben. |
| `subscriptions` | ✅ | `is_org_member(org_id)` | **nur `service_role`** via Stripe-Webhook | Entitlements serverseitig — nie clientseitig. |
| `sb_payments` | ✅ | `is_org_member(org_id)` | **nur `service_role`** via Stripe-Webhook | SB-Bezahl-USP; Betrieb sieht nur eigene Transaktionen. |
| `audit_log` | ✅ | **nur `service_role`** (keine Lese-Policy für anon/auth) | nur `service_role`; kein UPDATE/DELETE-Zugriff (append-only) | Audit unabschaltbar (Pfeiler 5). |
| `payment_events` | ✅ | nur `service_role` | nur `service_role` | Webhook-Idempotenz. |
| `waitlist` | ✅ | nur `service_role` | INSERT anon/auth (email/plz-Längenprüfung) | Landing-Interessentenliste. |
| `farm_applications` | ✅ | `role in ('staff','owner')` | INSERT öffentlich (Validierung); UPDATE staff/owner | Erzeuger-Onboarding (0004). |
| `verifications` | ⬜ | eigene Org · Staff/Owner | Nachweis-Upload Erzeuger; Entscheidung Staff (Audit) | Hof-Verifizierung — Tabelle noch nicht migriert; heute über `farms.verified` abgebildet. |
| `support_tickets` | ⬜ | Ersteller · Staff/Owner | Ersteller anlegen; Staff/Owner bearbeiten | Support-Andockung (Kern) — noch nicht migriert. |
| `feature_flags` | ⬜ | Staff/Owner | Owner (kritische), Staff (nicht-kritische) | Plattform-Steuerung — noch nicht migriert. |

> **Abweichungs-Hinweis:** Eine separate `availability`- oder `pickup_windows`-Tabelle existiert **nicht**; Verfügbarkeit ist die Enum-Spalte `products.availability`, Abholfenster sind `farms.pickup_windows` (`text[]`).

> **Isolationstest-Pflicht (WAVE_02 · qa-tester):** Pro Tabelle drei Negativ-/Positivfälle —
> (a) fremde Org liest → **0 Zeilen / 403**, nie Fremddaten; (b) leere Daten → **Zero-State**, kein 500;
> (c) valider Eigen-Zugriff → erwartetes Shape. Kein Merge ohne **grünen** Plattform- **und** Org-Isolationstest.
> Frontend-Spiegelung der Rechte ist **kein** Ersatz für RLS (Pfeiler 1 + 4).

---

## 4 · Surface-Sichtbarkeit (Frontend spiegelt — entscheidet nie)

Die UI blendet aus, was die Rolle nicht darf — **zusätzlich** zu RLS (Defense-in-Depth), nie **statt** RLS.
Quelle der Wahrheit ist der Bootstrap-Response (Rolle + Org + Entitlements), serverseitig erzeugt.
Gesperrte Aktionen erscheinen **als Plan-Lock mit Upgrade-Pfad** (§5), nicht als toter/unsichtbarer Button bei reinem Plan-Gate.

| Surface / Route | Käufer | Erzeuger | Staff | Owner |
|---|:--:|:--:|:--:|:--:|
| Hofladen-Finder (`/`, `/finder`) | ✓ | ✓ | ✓ | ✓ |
| Hof-Detail + Reservierung (`/hof/:id`) | ✓ | ✓ | ✓ | ✓ |
| Saison-Radar (`/saison`) | ✓ | ✓ | ✓ | ✓ |
| Meine Reservierungen / Favoriten (`/konto`) | ○ registriert | ○ | — | — |
| Erzeuger-Dashboard (`/erzeuger`) | — | ✓ | ○ read (Ticket) | ✓ |
| Sortiment/Verfügbarkeit pflegen (`/erzeuger/sortiment`) | — | ✓ | — | ○ Korrektur |
| Reservierungs-Eingang (`/erzeuger/reservierungen`) | — | ✓ | ○ Ticket | ○ Ticket |
| Abo & Rechnungen (`/erzeuger/billing`) | — | ○ `org_owner` | — | ○ Kulanz |
| SB-Einnahmen (`/erzeuger/sb-einnahmen`) ⭐ | — | ○ `org_owner`, Plan-Lock | ○ Ticket | ✓ |
| Staff-Konsole / Support (`/staff`) | — | — | ✓ | ✓ |
| Hof-Verifizierung (`/staff/verifizierung`) | — | — | ✓ | ✓ |
| Owner-Steuerung / KPI / Flags / Audit (`/owner`) | — | — | ○ Subset | ✓ |

**Zero-State-Regeln (Pfeiler 2):** Leere Listen → „Noch keine Daten" + nächster sinnvoller Schritt
(z. B. Erzeuger ohne Produkte → CTA „Erstes Produkt anlegen"), nie Fehler/leerer Bildschirm.
**Scope-Transparenz (Pfeiler 3):** Jede datenführende Surface zeigt Kontext (Org/Region/Zeitraum + Datenstand).
**Drilldown-Integrität (Pfeiler 7):** Deep-Links tragen Kontext, bauen nie org-fremde URLs.

---

## 5 · Plan-Locks & Upgrade-Pfad

Kanonische Pläne (Imperium): **`demo` · `basis` · `plus` · `pro` · `individuell`**.
„Enterprise" ist **kein** öffentlicher Plan, sondern das Funktionsniveau in `individuell`.
Plan-Locks gelten **nur für Erzeuger** (Käufer zahlen nichts — Vermittler-Prinzip, gesellschaftlicher Nutzen > Maximalmonetarisierung).
**Entitlements werden serverseitig durchgesetzt** (Stripe-Webhook → `subscriptions` → Bootstrap),
der Client liest sie nur. Plan-Lock-UI = Mehrwert-Hinweis **mit konkretem Upgrade-Ziel** (Pfeiler 4: „Plan-Locks zeigen konkreten Upgrade-Pfad").

### 5.1 Entitlement-Matrix (Erzeuger)

| Funktion / Limit | `demo` | `basis` | `plus` | `pro` | `individuell` |
|---|:--:|:--:|:--:|:--:|:--:|
| Betrieb öffentlich gelistet (nach Verifizierung) | Vorschau | ✓ | ✓ | ✓ | ✓ |
| Anzahl Betriebe (`farms`) | 1 | 1 | 3 | 10 | unbegrenzt |
| Produkte je Betrieb | 5 | 30 | 150 | unbegrenzt | unbegrenzt |
| Verfügbarkeits-/Abholfenster-Pflege | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reservierungs-Eingang | — | ✓ | ✓ | ✓ | ✓ |
| Premium-Listing (Hervorhebung im Finder) | — | — | ✓ | ✓ | ✓ |
| Saison-Push an Käufer-Favoriten | — | — | ✓ | ✓ | ✓ |
| Team-Mitglieder (`org_members`) | 1 | 1 | 3 | 10 | unbegrenzt |
| **SB-Bezahlung am unbemannten Stand (USP ⭐)** | — | — | — | ✓ | ✓ |
| SB-Auswertung (Einnahmen/Schwund) | — | — | — | ✓ | ✓ |
| API-/Export-Zugang | — | — | — | eingeschränkt | ✓ |
| Eigene Domain / Whitelabel / SLA | — | — | — | — | ✓ |

> Limits sind im Code **datengetrieben** (Entitlement-Tabelle, kein hardcodierter Schwellwert in der UI —
> Kanon-Verbot). Beim Erreichen eines Limits: serverseitige Ablehnung (403 mit `code: 'plan_limit'`) **und**
> spiegelnder UI-Lock.

### 5.2 Upgrade-Pfad (konkret, nicht-sackgasse)

```
demo ──(Verifizierung + basis)──▶ basis ──▶ plus ──▶ pro ──▶ individuell (Vertrieb/Owner)
                                                  │
SB-USP-Wunsch ───────────────────────────────────┴─▶ erfordert pro+ ▶ /erzeuger/billing?upgrade=pro&feature=sb_payment
```

- **Lock-UI-Vertrag:** Jeder Plan-Lock rendert (a) was gesperrt ist, (b) der **niedrigste** Plan, der es freischaltet,
  (c) ein **funktionierender** Deep-Link `/erzeuger/billing?upgrade=<plan>&feature=<flag>` (kein toter Button).
- **Upgrade-Flow:** Deep-Link → Stripe-Checkout (Plan-Wechsel) → Webhook aktualisiert `subscriptions`
  → Bootstrap liefert neue Entitlements → Surface entsperrt **ohne** Reload-Bruch.
- **Downgrade:** Über-Limit-Daten werden **nicht gelöscht**, sondern als „über Plan-Limit, nur lesbar"
  markiert (read-only), bis der Erzeuger reduziert oder erneut upgradet (kein Datenverlust, Retrofit-bewusst).
- **`individuell`** wird nicht self-service gekauft → Lock-CTA „Vertrieb kontaktieren" (Owner/Vertrieb), auditiert.

---

## 6 · Identität, Sessions & Rollen-Integrität

- **Welt-Trennung:** Käufer-, Erzeuger-, Staff/Owner-Session sind getrennt; ein Token einer Welt öffnet keine andere.
  Eine fehlende Trennbarkeit ist eine **Stop-Regel**.
- **Rolle ist nie clientseitig setzbar.** `profiles.role` und `org_members.role` (beide Enum `user_role`) werden ausschließlich serverseitig
  (Edge Function, service role, auditiert) vergeben — kein Self-Service-Privilege-Escalation-Pfad.
- **Gast-Käufer:** Reservierung ohne Konto erlaubt (Turnstile-geschützte Edge Function), Einsicht/Storno nur per
  signiertem Bestätigungs-Token; keine Auflistung fremder Reservierungen.
- **MFA:** Pflicht für Staff + Owner. **service role** existiert ausschließlich in Edge Functions, nie im Frontend
  (Frontend nur `VITE_`-Public-Keys) — Kanon-Verbot.
- **Break-Glass (Owner):** Notfall-Eskalation nur mit Confirm + Reason + Risk-Level + append-only Audit; zeitlich begrenzt.

---

## 7 · Audit & Verantwortlichkeit (Pfeiler 5)

Jede **mutierende** Aktion schreibt nach `audit_log` (append-only, nur service role): `actor_id`, `actor_role`,
`org_id` (Ziel), `action`, `target_type`, `target_id`, `reason` (**Pflicht** bei kritischen Aktionen:
De-Listing, Account-Sperre, Verifizierungs-Ablehnung, Plan-/Preis-/Flag-Änderung, Export, Storno durch Staff),
`risk_level`, `before`/`after`-Snapshot (sensible Felder), `ts`. Audit ist **unabschaltbar** und nicht editierbar.
Namespace-Konvention: domänen-präfixiert (`farm.*`, `reservation.*`, `verification.*`, `billing.*`, `sb_payment.*`, `platform.*`).

---

## 8 · Verifikations-Checkliste (für WAVE_03 „Rollen/Sichtbarkeit")

- [ ] `profiles.role` ∈ {`kaeufer`,`erzeuger`,`staff`,`owner`} (Enum **`user_role`**, identisch zu `DATABASE_MODEL.md`); `org_members.role` ist ebenfalls `user_role` (Default `'erzeuger'`). Owner = persistierter `user_role`-Wert `'owner'`, **kein** `org_role`-Rang.
- [ ] RLS auf **allen** Tabellen aus §3.2 aktiv, **deny-by-default**, getrennte SELECT/Schreib-Policies.
- [ ] Öffentliche Lesepfade strikt begrenzt: `farms`/`products`/`org_locations` auf `deleted_at IS NULL`, `reviews` auf `status='published'`, `bounties` auf `status='open'` (kein „alles offen"). `farms` hat **kein** `status`-Feld.
- [ ] Isolationstest grün: fremde Org → 403/0 Zeilen; leere Daten → Zero-State; Eigen-Zugriff → erwartetes Shape (Plattform- **und** Org-Ebene).
- [ ] Rolle/Org nirgends clientseitig schreibbar; Edge-Function-Pfad auditiert.
- [ ] Entitlements ausschließlich aus `subscriptions` (Webhook), nie clientseitig; Plan-Limit-Verstoß → 403 `plan_limit` **und** UI-Lock.
- [ ] Jeder Plan-Lock zeigt Ziel-Plan + funktionierenden `/erzeuger/billing?upgrade=…`-Deep-Link (kein toter Button).
- [ ] Surface-Matrix (§4) gegen Bootstrap-Response abgeglichen; Zero-State + Scope-Banner überall.
- [ ] Vermittler-Disclaimer auf reservierungs-/zahlungsnahen Surfaces sichtbar.

---

> **Änderungen** an diesem Modell sind Architektur-/Security-relevant → **Owner-Freigabe** + ADR in
> `.claude/memory/decisions/` + Update in `MASTER_INDEX.md` und `docs/releases/PHASE_STATUS.md`.
