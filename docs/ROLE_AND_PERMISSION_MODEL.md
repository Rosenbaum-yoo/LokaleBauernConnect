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
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Stop-/Verbots-Regeln), `AGENTS.md` (harte Regeln),
> `PHASEN.md` (WAVE_02 Datenmodell+RLS · WAVE_03 Rollen/Sichtbarkeit · WAVE_09 Billing · Phase 4 Track A SB-Bezahlung),
> `docs/DATABASE_MODEL.md` (Schema-Referenz, in Arbeit), `docs/security/TENANT_ISOLATION_MODEL.md`.
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

> **Zwei orthogonale Achsen (Quelle der Wahrheit: `docs/DATABASE_MODEL.md`):**
> 1. **Welt-Rolle** — `profiles.role` ∈ {`kaeufer`, `erzeuger`, `staff`} (Enum `role_kind`, **deutsch, persistiert**, 1:1 mit `app/src/lib/types.ts` und der ER-Übersicht in `ARCHITEKTUR.md`/`DATABASE_MODEL.md`). Bestimmt die **Welt**.
> 2. **Rang innerhalb der Org** — `org_members.org_role` ∈ {`platform_owner`, `org_owner`, `org_member`}. Verfeinert, *was* ein Akteur **innerhalb seiner Org** darf.
>
> Der **Owner** ist **keine** eigene `profiles.role`, sondern die höchste Rang-Ausprägung der Staff-Welt: `role = 'staff'` **und** `org_members.org_role = 'platform_owner'` auf der **Plattform-Org**. So bleibt die persistierte Rollen-Vokabel exakt das kanonische Drei-Werte-Enum — kein viertes `profiles.role` und keine englische Parallel-Vokabel, die dem Datenmodell widerspräche.

| Welt-Rolle | DB-Wert (`profiles.role`) | Welt | Org-Bindung | Identitäts-/Auth-Anforderung |
|---|---|---|---|---|
| **Käufer** | `kaeufer` | Käufer-Welt | **keine** (`org_id = NULL`) | Optional anonym (Reservierung als Gast möglich, Turnstile-geschützt); optional registriert für Favoriten/Saison-Alerts. |
| **Erzeuger** | `erzeuger` | Erzeuger-Welt | **genau eine** `org_id` (sein Betrieb); Rang `org_owner`/`org_member` innerhalb der Org via `org_members` | Supabase Auth Pflicht; E-Mail verifiziert; Betrieb durchläuft **Hof-Verifizierung** (WAVE_07) bevor öffentlich gelistet. |
| **Staff** | `staff` | Plattform-Welt | Plattform-Org; **darf org-übergreifend** im definierten Aufgaben-Scope handeln (Support/Verifizierung) | Supabase Auth + **MFA Pflicht**; jede Aktion auditiert; kein lesender Vollzugriff auf Käufer-PII außer im Ticket-Kontext. |

**Rang innerhalb der Org (Tabelle `org_members.org_role`):**
- `platform_owner` — **Owner / oberste Plattform-Instanz** (nur auf der Plattform-Org, kombiniert mit `profiles.role='staff'`): voller plattformweiter Scope, Preise/Pläne/Entitlements/Feature-Flags, kritische Aktionen mit **Confirm + Reason (Pflicht) + Risk-Level + Audit**, ggf. Break-Glass-Protokoll.
- `org_owner` — Betriebsinhaber (auf einer Erzeuger-Org): voller Schreibzugriff auf alle Betriebs-Daten, Mitglieder verwalten, Abo/Billing, Auszahlungskonto (Stripe Connect).
- `org_member` — Mitarbeiter des Betriebs: Produkt-/Verfügbarkeits-/Reservierungs-Pflege; **kein** Billing, **kein** Mitglieder-Management, **kein** Connect-Konto.

> **Owner ≠ org_owner.** „Owner" (`platform_owner`) = Plattform-Betreiber (oberste Steuerung, plattformweit, Staff-Welt). „org_owner" = Inhaber **eines** Betriebs (mandantenlokal, Erzeuger-Welt). Niemals vermischen.

---

## 2 · Permission-Matrix (Aktion × Rolle)

Legende: **✓** erlaubt · **○** erlaubt, bedingt (Spalte „Bedingung") · **—** verboten (RLS-Deny → 403/leer).
„Erzeuger" hier = `org_member`-Mindestrang; Spalten heben hervor, wo `org_owner` zusätzlich nötig ist.
„eig." = nur eigene/eigene-Org-Daten. „Plan-Lock" siehe §5.

### 2.1 Entdecken & Reservieren (Käufer-Welt)

| Aktion | Käufer | Erzeuger | Staff | Owner | Bedingung |
|---|:--:|:--:|:--:|:--:|---|
| Öffentliche Höfe/Produkte ansehen (Finder, Detail) | ✓ | ✓ | ✓ | ✓ | Nur `status='published'` + `deleted_at IS NULL`. Anonym erlaubt. |
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
Öffentliche Lesepfade sind **explizit** auf `status='published' AND deleted_at IS NULL` eingegrenzt — nicht „alles offen".

### 3.1 Helper (SQL-Functions, `security definer`, stabil)

> Schema-Konvention identisch zu `docs/DATABASE_MODEL.md` (`public.`-Schema, `role_kind`-Enum). `current_org_id()`/`current_role_kind()`/`is_staff()` sind **dieselben** Helper wie dort — hier um die Owner-/Org-Rang-Auflösung ergänzt, nicht dupliziert.

```sql
-- Aktuelle Org des eingeloggten Profils (NULL für Käufer/Gast) — vgl. DATABASE_MODEL §3
create or replace function public.current_org_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Welt-Rolle des eingeloggten Profils (kaeufer | erzeuger | staff) — vgl. DATABASE_MODEL §3
create or replace function public.current_role_kind() returns role_kind
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Plattform-Personal (Staff-Welt; schließt den Owner ein) — vgl. DATABASE_MODEL §3 `is_staff()`
create or replace function public.is_platform_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_kind() = 'staff', false)
$$;

-- Owner (oberste Instanz): Staff-Welt UND platform_owner-Rang auf der Plattform-Org
create or replace function public.is_owner() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_kind() = 'staff', false)
     and exists (
       select 1 from public.org_members m
       where m.user_id = auth.uid() and m.org_role = 'platform_owner'
     )
$$;

-- Org-Mitgliedschaft + Mindestrang (org_owner-Pflichten)
create or replace function public.is_org_owner(target uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target and m.user_id = auth.uid() and m.org_role = 'org_owner'
  )
$$;
```

### 3.2 Policy-Mapping je Tabelle

| Tabelle | SELECT (lesen) | INSERT/UPDATE/DELETE (schreiben) | Begründung |
|---|---|---|---|
| `profiles` | eigenes Profil · `is_platform_staff()` (im Ticket-Kontext) | `id = auth.uid()` (eigenes); Rolle/Org nur via Edge Function (service role) | PII-Minimierung; Selbst-Eskalation verhindert (Rolle nie clientseitig setzbar). |
| `orgs` | `id = current_org_id()` · `is_platform_staff()` | `is_org_owner(id)` für Stammdaten; `is_owner()` für Plattform-Felder | Mandanten-Isolation. |
| `org_members` | eigene Org · `is_platform_staff()` | `is_org_owner(org_id)` · `is_owner()` | Nur Betriebsinhaber verwaltet sein Team. |
| `farms` | **öffentlich:** `status='published' AND deleted_at IS NULL`; **intern:** `org_id = current_org_id()` · `is_platform_staff()` | `org_id = current_org_id()` (member) · `is_org_owner(org_id)` für `status`-Wechsel · `is_owner()` (De-Listing) | Öffentlicher Finder + Selbstpflege; Veröffentlichung gated. |
| `products` | öffentlich (über veröffentlichten `farm`) · eigene Org · Staff | `org_id = current_org_id()` (member) | Erzeuger-Selbstpflege des Sortiments. |
| `availability` | öffentlich (über veröffentlichten `farm`) · eigene Org · Staff | `org_id = current_org_id()` (member) | Bestands-/Saisonpflege. |
| `pickup_windows` | öffentlich (über veröffentlichten `farm`) · eigene Org | `org_id = current_org_id()` (member) | Abholfenster-Pflege. |
| `reservations` | **Käufer:** `buyer_id = auth.uid()` ODER Gast-Token-Match; **Erzeuger:** `org_id = current_org_id()`; **Staff/Owner:** Ticket-Kontext | INSERT: jeder (Gast via Edge Function + Turnstile); UPDATE (Storno): eigener Käufer ODER eigener Erzeuger ODER Staff-Ticket | Käufer sieht nur eigene, Erzeuger nur die seiner Betriebe. |
| `verifications` | eigene Org · `is_platform_staff()` | Nachweis-Upload: `is_org_owner`; Entscheidung: `is_platform_staff()` (Audit) | Hof-Verifizierung. |
| `support_tickets` | Ersteller · zugewiesener Staff · Owner | Ersteller (anlegen) · Staff/Owner (bearbeiten) | Support-Andockung. |
| `subscriptions` | eigene Org · `is_platform_staff()` · Owner | **nur Edge Function (service role)** via Stripe-Webhook | Entitlements serverseitig — nie clientseitig schreibbar. |
| `sb_payments` (Phase 4) | eigene Org · Owner | **nur Edge Function (service role)** via Stripe-Webhook | SB-Bezahl-USP; Betrieb sieht nur eigene Transaktionen. |
| `audit_log` | `is_owner()` (voll) · `is_platform_staff()` (eigener Scope) | **append-only**, nur service role; kein UPDATE/DELETE | Audit unabschaltbar (Pfeiler 5). |
| `feature_flags` | `is_platform_staff()` | `is_owner()` (kritische), Staff (nicht-kritische) | Plattform-Steuerung. |

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
- **Rolle ist nie clientseitig setzbar.** `profiles.role` und `org_members.org_role` werden ausschließlich serverseitig
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

- [ ] `profiles.role` ∈ {`kaeufer`,`erzeuger`,`staff`} (Enum `role_kind`, identisch zu `DATABASE_MODEL.md`); `org_members.org_role` ∈ {`platform_owner`,`org_owner`,`org_member`} — als CHECK-/Enum-Constraint. Owner = `staff` + `platform_owner`, **kein** viertes `profiles.role`.
- [ ] RLS auf **allen** Tabellen aus §3.2 aktiv, **deny-by-default**, getrennte SELECT/Schreib-Policies.
- [ ] Öffentliche Lesepfade strikt auf `status='published' AND deleted_at IS NULL` begrenzt.
- [ ] Isolationstest grün: fremde Org → 403/0 Zeilen; leere Daten → Zero-State; Eigen-Zugriff → erwartetes Shape (Plattform- **und** Org-Ebene).
- [ ] Rolle/Org nirgends clientseitig schreibbar; Edge-Function-Pfad auditiert.
- [ ] Entitlements ausschließlich aus `subscriptions` (Webhook), nie clientseitig; Plan-Limit-Verstoß → 403 `plan_limit` **und** UI-Lock.
- [ ] Jeder Plan-Lock zeigt Ziel-Plan + funktionierenden `/erzeuger/billing?upgrade=…`-Deep-Link (kein toter Button).
- [ ] Surface-Matrix (§4) gegen Bootstrap-Response abgeglichen; Zero-State + Scope-Banner überall.
- [ ] Vermittler-Disclaimer auf reservierungs-/zahlungsnahen Surfaces sichtbar.

---

> **Änderungen** an diesem Modell sind Architektur-/Security-relevant → **Owner-Freigabe** + ADR in
> `.claude/memory/decisions/` + Update in `MASTER_INDEX.md` und `docs/releases/PHASE_STATUS.md`.
