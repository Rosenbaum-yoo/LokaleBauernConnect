# ROLE_FEATURE_MATRIX — LokaleBauernConnect

> **Stand:** 2026-06-19 · **Status:** Normativ (Produkt-Wahrheit für Sichtbarkeit, Berechtigung & Plan-Gating)
> Die **eine** Tabelle, die für **jedes Feature** beantwortet: *Wer darf es (Käufer / Erzeuger / Staff / Owner)?* und *Welcher Plan schaltet es frei (`demo · basis · plus · pro · individuell`)?*
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** und den fixen Stack **React+Vite+TS · Supabase (Postgres + RLS, Edge Functions/Deno) · Cloudflare · Stripe (+ Connect)**. **Keine VMS-/Zeitarbeits-Begriffe.**
>
> **Diese Matrix ist die Produkt-Sicht (Feature × Rolle × Plan).** Die *durchsetzbare* Wahrheit lebt in:
> - `docs/ROLE_AND_PERMISSION_MODEL.md` — Rollen, Aktion×Rolle-Permissions, **RLS-Mapping je Tabelle**, Surface-Sichtbarkeit, Entitlement-Matrix.
> - `docs/DATABASE_MODEL.md` — Schema, Enums, Helper-Funktionen, RLS-Policies, Zustandsmaschine.
> Bei Konflikt gewinnt **immer** das durchgesetzte Backend (RLS + serverseitige Entitlements). Diese Matrix **spiegelt** es, sie **entscheidet** nichts.
>
> **Goldene Regeln (nicht verhandelbar):**
> 1. **Berechtigung lebt in der DB (RLS), nicht im Client.** Fremde Org = **403 / 0 Zeilen**, nie „200 mit Fremddaten" (Pfeiler 1).
> 2. **Entitlements werden serverseitig durchgesetzt** (Stripe-Webhook → `subscriptions`/`orgs.plan` → Bootstrap). Der Client liest sie nur. Plan-Limit-Verstoß → **403 `code:'plan_limit'`** *und* spiegelnder UI-Lock.
> 3. **Vermittler-Rolle:** Die Plattform vermittelt, verkauft nicht selbst, berät nicht, haftet nicht für Lebensmittel. Kein Eintrag dieser Matrix darf gegenteilig gelesen werden. Disclaimer durchgängig.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Stop-/Verbots-Regeln) · `AGENTS.md` · `PHASEN.md` (WAVE_03 Rollen/Sichtbarkeit · WAVE_09 Billing · Phase 4 Track A SB-Bezahlung) · `docs/PLATFORM_OVERVIEW.md` · `docs/spezialmodule/*`. Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.

---

## 0 · Legende & Lesart

### 0.1 Symbole (Rollen-Spalten)
| Symbol | Bedeutung |
|:--:|---|
| **✓** | Voll erlaubt (im jeweiligen Daten-Scope der Rolle). |
| **○** | Erlaubt, **bedingt** — die Bedingung steht in der Spalte „Scope / Bedingung" (z. B. nur eigene Daten, nur im Ticket-Kontext, nur `org_owner`, Plan-Lock). |
| **—** | **Verboten** → RLS-Deny (403 / leere Menge). Im Frontend ausgeblendet *oder* (bei reinem Plan-Gate) als Upgrade-Lock sichtbar. |
| **eig.** | Nur **eigene** Daten bzw. Daten der **eigenen Org** (`org_id = current_org_id()` / `buyer_id = auth.uid()`). |
| **Ticket** | Staff/Owner nur im **auditierten Support-Ticket-Kontext** (Minimalprinzip, keine Roh-PII-Streife). |
| **🔒Plan** | Erlaubt, aber **plan-gegated** — siehe Plan-Spalten + §3 Entitlements. |

### 0.2 Die vier Rollen (Kurzreferenz — Voll-Definition in `ROLE_AND_PERMISSION_MODEL.md` §1)
| Rolle | DB (`profiles.role`) | Welt | Org-Bindung | Auth |
|---|---|---|---|---|
| **Käufer** | `kaeufer` | Käufer-Welt | **keine** (`org_id = NULL`) | optional anonym (Gast, Turnstile) / optional registriert |
| **Erzeuger** | `erzeuger` | Erzeuger-Welt | **genau eine** Org (sein Betrieb); Sub-Rang Betriebsinhaber/Mitarbeiter ist **Produkt-Konzept** (Ziel-Ausbau) — real liegt die Mitgliedschaft in `org_members.role` (Typ `user_role`, Default `'erzeuger'`) | Supabase Auth Pflicht, E-Mail verifiziert, Hof-Verifizierung vor Listing |
| **Staff** | `staff` | Plattform-Welt | Plattform-Org; **org-übergreifend** im Aufgaben-Scope | Supabase Auth + **MFA** |
| **Owner** | `owner` (oberste Instanz) | Plattform-Welt | Plattform-Org; **voller** plattformweiter Scope | Supabase Auth + **MFA** + Break-Glass |

> **Hinweis zur DB-Abbildung:** Das Rollen-Enum heißt **`user_role`** und kennt **vier** Werte `kaeufer | erzeuger | staff | owner` (siehe `DATABASE_MODEL.md` §2 / Migration `0001_core.sql`). **Owner** ist ein **eigener Enum-Wert** (`'owner'`), **nicht** „Staff + Flag"; der Helper `app.is_owner()` (Soll, künftige Migration) ist nur Lesekomfort (= `role = 'owner'`, siehe `ROLE_AND_PERMISSION_MODEL.md` §3.1). „Owner" = **Plattform-Betreiber** (plattformweit, `user_role='owner'`). „`org_owner`" = **Inhaber eines Betriebs** (mandantenlokal) — **Produkt-Konzept**, **kein** DB-Enum-Wert in der aktuellen Migration. **Niemals vermischen.**

### 0.3 Die fünf kanonischen Pläne (Imperium)
`demo · basis · plus · pro · individuell`. „Enterprise" ist **kein** öffentlicher Plan, sondern das Funktionsniveau in **`individuell`**.
**Plan-Gating gilt ausschließlich für Erzeuger** (`orgs.plan`). **Käufer zahlen nie** — Vermittler-Prinzip, gesellschaftlicher Nutzen vor Maximalmonetarisierung. **Staff/Owner** sind plan-unabhängig (Plattform-Personal, kein `orgs.plan` für die Plattform-Org relevant).

### 0.4 Plan-Spalten-Symbole
| Symbol | Bedeutung |
|:--:|---|
| **✓** | Im Plan enthalten. |
| **#** | Enthalten, aber **mengen-limitiert** (genaue Zahl in §3 Entitlement-Matrix). |
| **Vorschau** | Sichtbar/anlegbar, aber nicht öffentlich wirksam (z. B. `demo`: Betrieb nur Vorschau, nicht im Finder gelistet). |
| **—** | Nicht enthalten → Lock mit Upgrade-Pfad (`/erzeuger/billing?upgrade=<plan>&feature=<flag>`). |
| **n/a** | Plan nicht anwendbar (Käufer-Feature / Staff-Owner-Feature). |

---

## 1 · Master-Matrix: Feature × Rolle × Plan-Gate

> Gruppiert nach den fünf Produkt-/Betriebswelten. „Plan-Gate" nennt das **niedrigste** Entitlement, das die Funktion für den Erzeuger freischaltet (Details § 3). Käufer-/Staff-/Owner-Features sind plan-frei (`n/a`).

### 1.1 Entdecken & Reservieren — Käufer-Welt (öffentlich)

| # | Feature | Route / Edge | Käufer | Erzeuger | Staff | Owner | Plan-Gate | Scope / Bedingung |
|---|---|---|:--:|:--:|:--:|:--:|---|---|
| K1 | Hofladen-Finder (Suche, PLZ-Distanz, Kategorie, Sortierung) | `/`, `/finder` | ✓ | ✓ | ✓ | ✓ | n/a | Nur `status='published' AND deleted_at IS NULL`. Anonym erlaubt. |
| K2 | Hof-Detail (Story, Öffnungszeiten, Abholfenster, Verfügbarkeit) | `/hof/:slug` | ✓ | ✓ | ✓ | ✓ | n/a | öffentlich (nur veröffentlichte Höfe). |
| K3 | Verfügbarkeit / Saison-Status lesen (`available·low·soon·out`) | Finder/Detail | ✓ | ✓ | ✓ | ✓ | n/a | öffentlich, nur aktueller (`is_current`) Satz. |
| K4 | Saison-Radar (was hat jetzt Saison, in der Nähe) | `/saison` | ✓ | ✓ | ✓ | ✓ | n/a | öffentlich. |
| K5 | Reservierung anlegen (Vorbestellung + Abholfenster) | `reservation-create` (Edge) | ✓ | ✓ | — | — | n/a | **Gast erlaubt** (Turnstile). Staff/Owner reservieren **nicht** (Vermittler, kein Eigenkauf). `pickup_window ∈ farms.pickup_windows`. |
| K6 | Eigene Reservierungen ansehen | `/konto` | ○ eig. | ○ eig. | — | — | n/a | Registriert: `buyer_id = auth.uid()`. Gast: nur per signiertem Bestätigungs-Token. |
| K7 | Eigene Reservierung stornieren | `reservation-transition` | ○ eig. | — | ○ Ticket | ○ Ticket | n/a | Käufer storniert eigene (`requested→cancelled`). Staff/Owner nur im Ticket (auditiert, `reason` Pflicht). |
| K8 | Favoriten anlegen | `/konto` | ○ registriert | — | — | — | n/a | Nur **registrierte** Käufer (Konto nötig). |
| K9 | Saison-Alerts / Wieder-verfügbar-Benachrichtigung (Käuferseite) | `/konto`, `waitlist` | ○ registriert | — | — | — | n/a | `marketing_opt_in` (DSGVO). Gast nur über Turnstile-Edge-Eintrag in `waitlist`. |
| K10 | Warteliste bei ausverkauftem Produkt (Nachrücker) | `waitlist-join` (Edge) | ✓ | — | — | — | n/a | Gast erlaubt (Turnstile + Anti-Doppel). |
| K11 | Vermittler-Disclaimer (durchgängig sichtbar) | global Footer | ✓ | ✓ | ✓ | ✓ | n/a | Pflicht auf allen reservierungs-/zahlungsnahen Surfaces. |

### 1.2 Betrieb & Sortiment pflegen — Erzeuger-Welt

> „Erzeuger" = `org_member`-Mindestrang. Wo zusätzlich `org_owner` nötig ist, steht es in der Bedingung. „Plan-Gate" bezieht sich auf `orgs.plan` des Betriebs.

| # | Feature | Route / Edge | Käufer | Erzeuger | Staff | Owner | Plan-Gate | Scope / Bedingung |
|---|---|---|:--:|:--:|:--:|:--:|---|---|
| E1 | Erzeuger-Dashboard (Übersicht eigener Betrieb) | `/erzeuger` | — | ✓ | ○ read (Ticket) | ✓ | `demo` | eig. Org. Staff nur lesend im Ticket. |
| E2 | Betrieb (`farm`) anlegen | `/erzeuger/betrieb` | — | ○ `org_owner` | ○ Onboarding-Hilfe | ✓ | `demo` (Limit #) | `org_owner` legt eigenen Betrieb an; Staff assistiert (auditiert). **Anzahl plan-limitiert** (§3). |
| E3 | Betriebs-Stammdaten bearbeiten (Adresse, Öffnungszeiten, Story, SB-Flag) | `/erzeuger/betrieb` | — | ○ eig. | ✓ eig. (`org_owner`) | ○ Ticket | ✓ | `demo` | RLS `owns_farm(id)`. |
| E4 | Betrieb veröffentlichen / verbergen (`status`) | `/erzeuger/betrieb` | — | — | ○ `org_owner` | ○ De-Listing | ✓ | `basis` | Öffentlich erst nach **Hof-Verifizierung** (S2). `demo` = nur Vorschau, nicht im Finder. |
| E5 | Produkt anlegen / bearbeiten / löschen | `/erzeuger/sortiment` | — | ✓ eig. | — | ○ Korrektur (Policy) | `demo` (Limit #) | Staff korrigiert **nicht** inhaltlich; Owner nur bei Policy-Verstoß (auditiert). **Anzahl plan-limitiert** (§3). |
| E6 | Verfügbarkeit pflegen (`available/low/soon/out` + `qty_estimate`) | `/erzeuger/sortiment` | — | ✓ eig. | — | — | `demo` | Kern-Selbstpflege — in **allen** Plänen frei (Datenfrische ist Plattform-Interesse). |
| E7 | Abholfenster (`pickup_windows`) konfigurieren | `/erzeuger/sortiment` | — | ✓ eig. | — | — | `demo` | eig. Org. |
| E8 | Reservierungs-Eingang ansehen / Status abhaken | `/erzeuger/reservierungen` | — | ✓ eig. | ○ Ticket | ○ Ticket | `basis` | Erzeuger sieht nur Reservierungen **seiner** `farms`. Transitionen via `reservation-transition` (erlaubte Übergänge serverseitig erzwungen). |
| E9 | Warteliste / Nachrücker-Welle auslösen (eigenes Produkt) | `/erzeuger/sortiment` | — | ✓ eig. | ○ Ticket | ✓ | `plus` | `queued→notified`; benachrichtigt Käufer bei Wieder-Verfügbarkeit. |
| E10 | Premium-Listing (Hervorhebung im Finder) | `/erzeuger/betrieb` | — | ○ 🔒Plan (`org_owner`) | — | ✓ | **`plus`** | Sichtbarkeits-Boost im Finder. |
| E11 | Saison-Push an Käufer-Favoriten (aktives Pushen) | `/erzeuger/sortiment` | — | ○ 🔒Plan | — | ✓ | **`plus`** | Push an Favoriten/Saison-Abonnenten. |
| E12 | Betriebs-Mitglieder verwalten (`org_members` einladen/entfernen) | `/erzeuger/team` | — | ○ `org_owner` | ○ Ticket | ✓ | `plus` (Limit #) | Nur `org_owner`. **Anzahl Mitglieder plan-limitiert** (§3). |
| E13 | Hof-Verifizierungs-Nachweise hochladen | `/erzeuger/betrieb` | — | ○ `org_owner` | ○ einsehen | ✓ | `demo` | Voraussetzung für Veröffentlichung; Entscheidung trifft Staff (S2). |

### 1.3 SB-Bezahlung am unbemannten Stand — ⭐ USP (Erzeuger + Käufer)

> Phase 4 Track A. Geld fließt via **Stripe Connect** an den Hof; Plattform behält nur `platform_fee_cents`. `sb_payments` wird **ausschließlich** vom signaturgeprüften, idempotenten Webhook (Edge, service role) geschrieben — Frontend liest nur. Vermittler-Compliance: Plattform = Zahlungsanbindung, kein Eigenverkauf.

| # | Feature | Route / Edge | Käufer | Erzeuger | Staff | Owner | Plan-Gate | Scope / Bedingung |
|---|---|---|:--:|:--:|:--:|:--:|---|---|
| P1 | Stripe-Connect-Auszahlungskonto verbinden | `/erzeuger/billing`, `connect-onboard` (Edge) | — | ○ `org_owner` | — | ○ Hilfe | **`pro`** | KYC bei Stripe; Plattform berührt keine Auszahlungsdaten direkt. |
| P2 | SB-Stand aktivieren (`farms.is_self_service=true`) + QR generieren | `/erzeuger/sb-stand`, `sb-qr` (Edge) | — | ○ 🔒Plan (`org_owner`) | — | ✓ | **`pro`** | Voraussetzung: P1 (Connect verbunden) + verifizierter Hof. |
| P3 | Am SB-Stand bezahlen (QR → Stripe → Quittung) | `sb-checkout` (Edge) → Stripe | ✓ | ✓ | — | — | n/a (Käufer) | **Anonym erlaubt** (`buyer_id NULL`). Staff/Owner kaufen nicht (Vermittler). |
| P4 | Digitale Quittung erhalten | `sb-receipt` | ✓ | n/a | — | — | n/a | `receipt_url` aus `sb_payments`. |
| P5 | SB-Zahlungseingänge des Betriebs ansehen | `/erzeuger/sb-einnahmen` | — | ○ eig. (`org_owner`) | ○ Ticket | ✓ | **`pro`** | Betrieb sieht **nur eigene** Transaktionen (`org_id = current_org_id()`). |
| P6 | SB-Auswertung (Einnahmen / Schwund / Trends) | `/erzeuger/sb-einnahmen` | — | ○ 🔒Plan (`org_owner`) | ○ Ticket | ✓ | **`pro`** | Aggregierte Auswertung über `sb_payments`. |
| P7 | Erstattung anstoßen (Refund) | `sb-refund` (Edge) | — | ○ eig. (`org_owner`) | ○ Ticket | ✓ | **`pro`** | Über Stripe; `reason` Pflicht; Audit `sb_payment.refund`. |

### 1.4 Verifizierung, Support & Moderation — Staff-Welt

| # | Feature | Route / Edge | Käufer | Erzeuger | Staff | Owner | Plan-Gate | Scope / Bedingung |
|---|---|---|:--:|:--:|:--:|:--:|---|---|
| S1 | Support-Ticket eröffnen | `/konto`, `/erzeuger`, `support-create` | ○ eig. | ○ eig. | ✓ | ✓ | n/a | Käufer/Erzeuger nur eigenes; Staff/Owner alle. |
| S2 | Hof-Verifizierung prüfen / freigeben / ablehnen | `/staff/verifizierung` | — | ○ Nachweise hochladen | ✓ | ✓ | n/a | Status-Übergang auditiert; `reason` **Pflicht** bei Ablehnung. |
| S3 | Support-Ticket bearbeiten / eskalieren | `/staff` | — | — | ✓ | ✓ | n/a | PII-Zugriff nur im Ticket-Kontext (Minimalprinzip). |
| S4 | Inhalt moderieren (Hof/Produkt verbergen / De-Listing) | `/staff/moderation` | — | — | ✓ | ✓ | n/a | `reason` Pflicht · Audit · benachrichtigt Erzeuger. |
| S5 | Käufer-/Erzeuger-Account sperren | `/staff`, `account-suspend` | — | — | ○ Risk≤mittel | ✓ | n/a | Hoch-Risiko nur Owner; Confirm + Reason + Risk-Level + Audit. |
| S6 | Audit-Feed lesen | `/staff/audit`, `/owner/audit` | — | ○ eig. Org-Historie | ○ eigener Scope | ✓ | n/a (Erzeuger lesen eig. Org-Historie über `audit_log`-RLS) | Owner = voll; Staff = eigene Aktionen + zugewiesene Tickets; Erzeuger = eigene Org. |
| S7 | Staff-Konsole (Operatives Dashboard) | `/staff` | — | — | ✓ | ✓ | n/a | operatives Subset der Plattform-Sicht. |

### 1.5 Commercial, Geld & Plattform-Steuerung — Owner-Welt

| # | Feature | Route / Edge | Käufer | Erzeuger | Staff | Owner | Plan-Gate | Scope / Bedingung |
|---|---|---|:--:|:--:|:--:|:--:|---|---|
| O1 | Erzeuger-Abo abschließen / wechseln / kündigen | `/erzeuger/billing`, `billing-checkout` | — | ○ eig. (`org_owner`) | — | ○ Kulanz | `demo`→ höher | Stripe-Checkout; Entitlement serverseitig (Webhook). Staff nie direkt am Abo. |
| O2 | Rechnungen / Zahlungsbelege (eigener Betrieb) sehen | `/erzeuger/billing` | — | ○ eig. (`org_owner`) | ○ Ticket | ✓ | `basis` | eig. Org. |
| O3 | API-/Export-Zugang (eigene Betriebsdaten) | `/erzeuger/api`, `export` (Edge) | — | ○ 🔒Plan (`org_owner`) | ○ im Auftrag | ✓ | **`pro`** (eingeschränkt), **`individuell`** (voll) | Finance/Export ohne Audit = Stop-Regel. |
| O4 | Eigene Domain / Whitelabel / SLA | Vertrieb | — | ○ 🔒Plan | — | ✓ | **`individuell`** | Nicht self-service → „Vertrieb kontaktieren". |
| O5 | DSGVO-Selbstauskunft / Datenexport (eigene Person) | `/konto`, `/erzeuger`, `dsgvo-export` | ○ eig. | ○ eig. | ○ im Auftrag | ✓ | n/a | Auskunftsrecht; auditiert. |
| O6 | Plattform-KPI-Dashboard (alle Orgs aggregiert) | `/owner` | — | — | ○ Subset | ✓ | n/a | Owner = voll; Staff = operatives Subset. **Niemals Roh-PII fremder Orgs.** |
| O7 | Plattform-Preise / Pläne / Entitlements ändern | `/owner/pricing` | — | — | — | ✓ | n/a | **Owner-only**; Confirm + Reason + Audit; serverseitig wirksam. |
| O8 | Feature-Flags schalten | `/owner/flags` | — | — | ○ nicht-kritisch | ✓ | n/a | Kritische Flags (Payment, RLS, Auth) **Owner-only**. |
| O9 | Globale Daten-Exporte / DSGVO-Auskunft (im Auftrag Dritter) | `/owner/data` | — | — | ○ im Auftrag | ✓ | n/a | Audit Pflicht. |
| O10 | Migrationen / Schema / RLS-Policies ändern | `app/supabase/migrations/` | — | — | — | ✓ | n/a | Nur via Migration, Owner-Freigabe, Rollback-Plan. |
| O11 | Break-Glass-Notfall-Eskalation | — | — | — | — | ○ Owner | n/a | Confirm + Reason + Risk-Level + append-only Audit; zeitlich begrenzt. |

> **Stop-Regel (Kanon):** Ist für eine Aktion unklar, *welche Rolle schreiben darf*, oder ist der **Org-Scope serverseitig nicht prüfbar** → **nicht bauen**, minimalen Fix vorschlagen, Owner-OK abwarten.

---

## 2 · Surface-/Routen-Matrix (Frontend spiegelt — entscheidet nie)

> Was die UI je Rolle ein-/ausblendet — **zusätzlich** zu RLS (Defense-in-Depth), **nie statt** RLS. Quelle der Wahrheit ist der serverseitig erzeugte **Bootstrap-Response** (Rolle + Org + Entitlements). Reine Plan-Gates erscheinen als **Lock mit Upgrade-Pfad**, nicht als toter/unsichtbarer Button.

| Surface / Route | Käufer | Erzeuger | Staff | Owner | Plan-Gate (Erzeuger) |
|---|:--:|:--:|:--:|:--:|---|
| `/`, `/finder` — Hofladen-Finder | ✓ | ✓ | ✓ | ✓ | n/a |
| `/hof/:slug` — Hof-Detail + Reservierung | ✓ | ✓ | ✓ | ✓ | n/a |
| `/saison` — Saison-Radar | ✓ | ✓ | ✓ | ✓ | n/a |
| `/konto` — Meine Reservierungen / Favoriten / Alerts | ○ registriert | ○ | — | — | n/a |
| `/erzeuger` — Erzeuger-Dashboard | — | ✓ | ○ read (Ticket) | ✓ | `demo` |
| `/erzeuger/betrieb` — Betriebs-Stammdaten / Veröffentlichung | — | ✓ | ○ Ticket | ✓ | `demo` (Veröffentlichung `basis`) |
| `/erzeuger/sortiment` — Produkte / Verfügbarkeit / Abholfenster | — | ✓ | — | ○ Korrektur | `demo` |
| `/erzeuger/reservierungen` — Reservierungs-Eingang | — | ✓ | ○ Ticket | ○ Ticket | `basis` |
| `/erzeuger/team` — Mitglieder (`org_members`) | — | ○ `org_owner` | ○ Ticket | ✓ | `plus` |
| `/erzeuger/billing` — Abo & Rechnungen | — | ○ `org_owner` | — | ○ Kulanz | `demo`→ |
| `/erzeuger/sb-stand` — SB-Stand aktivieren / QR ⭐ | — | ○ 🔒Plan (`org_owner`) | — | ✓ | **`pro`** |
| `/erzeuger/sb-einnahmen` — SB-Einnahmen / Auswertung ⭐ | — | ○ 🔒Plan (`org_owner`) | ○ Ticket | ✓ | **`pro`** |
| `/staff` — Staff-Konsole / Support | — | — | ✓ | ✓ | n/a |
| `/staff/verifizierung` — Hof-Verifizierung | — | — | ✓ | ✓ | n/a |
| `/staff/moderation` — Inhalts-Moderation | — | — | ✓ | ✓ | n/a |
| `/owner` — KPI / Steuerung | — | — | ○ Subset | ✓ | n/a |
| `/owner/pricing` · `/owner/flags` · `/owner/audit` · `/owner/data` | — | — | ○ Subset (Audit/Flags nicht-kritisch) | ✓ | n/a |

**Zero-State (Pfeiler 2):** Leere Listen → „Noch keine Daten" + nächster sinnvoller Schritt (z. B. Erzeuger ohne Produkte → CTA „Erstes Produkt anlegen"), nie Fehler/leerer Bildschirm.
**Scope-Transparenz (Pfeiler 3):** Jede datenführende Surface zeigt Kontext (Org/Region/Zeitraum + Datenstand).
**Drilldown-Integrität (Pfeiler 7):** Deep-Links tragen Kontext (`farms.slug`, `entity_id`), bauen **nie** org-fremde URLs.

---

## 3 · Plan-Gating (Entitlement-Matrix Erzeuger)

> **Nur Erzeuger** (`orgs.plan`). Entitlements sind **datengetrieben** (Entitlement-Quelle serverseitig, kein hardcodierter Schwellwert in der UI — Kanon-Verbot) und werden über den **Stripe-Webhook → `subscriptions`/`orgs.plan` → Bootstrap** durchgesetzt. Limit-Verstoß → **403 `code:'plan_limit'`** *und* spiegelnder UI-Lock. (Identisch zu `ROLE_AND_PERMISSION_MODEL.md` §5.1 — diese Tabelle ist die Produkt-Sicht derselben Wahrheit.)

| Funktion / Limit | `demo` | `basis` | `plus` | `pro` | `individuell` | Feature-Flag (`feature=`) |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Betrieb öffentlich gelistet (nach Verifizierung) | Vorschau | ✓ | ✓ | ✓ | ✓ | `listing` |
| Anzahl Betriebe (`farms`) | 1 | 1 | 3 | 10 | unbegrenzt | `farm_count` |
| Produkte je Betrieb | 5 | 30 | 150 | unbegrenzt | unbegrenzt | `product_count` |
| Verfügbarkeits- / Abholfenster-Pflege | ✓ | ✓ | ✓ | ✓ | ✓ | `availability` |
| Reservierungs-Eingang | — | ✓ | ✓ | ✓ | ✓ | `reservations_inbox` |
| Premium-Listing (Hervorhebung im Finder) | — | — | ✓ | ✓ | ✓ | `premium_listing` |
| Saison-Push an Käufer-Favoriten | — | — | ✓ | ✓ | ✓ | `season_push` |
| Warteliste / Nachrücker-Welle | — | — | ✓ | ✓ | ✓ | `waitlist_wave` |
| Team-Mitglieder (`org_members`) | 1 | 1 | 3 | 10 | unbegrenzt | `member_count` |
| **SB-Bezahlung am unbemannten Stand ⭐ (Connect + QR)** | — | — | — | ✓ | ✓ | `sb_payment` |
| SB-Auswertung (Einnahmen / Schwund) | — | — | — | ✓ | ✓ | `sb_analytics` |
| API- / Export-Zugang | — | — | — | eingeschränkt | ✓ | `api_export` |
| Eigene Domain / Whitelabel / SLA | — | — | — | — | ✓ | `whitelabel` |

### 3.1 Limit-/Lock-Verhalten (Vertrag)
- **Mengen-Limit erreicht (`#`):** serverseitige Ablehnung `403 {code:'plan_limit', feature:'<flag>', limit:<n>}` **und** UI-Lock — keine stille Annahme.
- **Funktions-Lock (`—`):** UI rendert **(a)** was gesperrt ist, **(b)** den **niedrigsten** freischaltenden Plan, **(c)** einen **funktionierenden** Deep-Link `/erzeuger/billing?upgrade=<plan>&feature=<flag>` (kein toter Button — Pfeiler 4).
- **Käufer/Staff/Owner:** kein Plan-Gate (`n/a`).

### 3.2 Upgrade-Pfad (konkret, nicht-Sackgasse)
```
demo ──(Verifizierung + basis)──▶ basis ──▶ plus ──▶ pro ──▶ individuell (Vertrieb/Owner)
                                                  │
SB-USP-Wunsch ───────────────────────────────────┴─▶ erfordert pro+  ▶  /erzeuger/billing?upgrade=pro&feature=sb_payment
Premium-Listing ──────────────────────────────────▶ erfordert plus+  ▶  /erzeuger/billing?upgrade=plus&feature=premium_listing
```
- **Upgrade-Flow:** Deep-Link → Stripe-Checkout (Plan-Wechsel) → Webhook aktualisiert `subscriptions`/`orgs.plan` → Bootstrap liefert neue Entitlements → Surface entsperrt **ohne** Reload-Bruch.
- **Downgrade:** Über-Limit-Daten werden **nicht gelöscht**, sondern als „über Plan-Limit, nur lesbar" (read-only) markiert, bis der Erzeuger reduziert oder erneut upgradet (kein Datenverlust, Retrofit-bewusst).
- **`individuell`** ist **nicht** self-service → Lock-CTA „Vertrieb kontaktieren" (Owner/Vertrieb, auditiert).

---

## 4 · Datenbank-Durchsetzung (Mapping Feature → RLS, Kurzreferenz)

> Vollständiges Policy-Mapping je Tabelle: `ROLE_AND_PERMISSION_MODEL.md` §3.2 und `DATABASE_MODEL.md` §7. Hier nur die Brücke Feature-Gruppe → durchsetzende Tabelle/Policy, damit jede Matrix-Zeile eine **serverseitige** Verankerung hat (keine reine UI-Regel).

| Feature-Gruppe | Tabelle(n) | Durchsetzung (SELECT / Schreiben) |
|---|---|---|
| K1–K4 Entdecken (öffentlich) | `farms`, `products`, `availability`, `pickup_windows` | SELECT nur `status='published' AND deleted_at IS NULL`; Schreiben verboten für Käufer. |
| K5–K10 Reservierung / Warteliste | `reservations`, `waitlist` | INSERT via Edge (Gast: Turnstile); SELECT `buyer_id=auth.uid()` ODER Gast-Token; Übergänge serverseitig (`reservation-transition`). |
| E1–E13 Betrieb / Sortiment | `farms`, `products`, `availability`, `pickup_windows`, `org_members`, `verifications` | Schreiben `owns_farm(farm_id) AND current_role_kind()='erzeuger'`; `org_owner`-Pflichten via `is_org_owner()`; **Plan-Limit serverseitig** vor INSERT. |
| P1–P7 SB-Bezahlung ⭐ | `sb_payments`, `orgs.stripe_connect_id` | **INSERT/UPDATE nur service role** (idempotenter, signaturgeprüfter Stripe-Webhook). SELECT `org_id=current_org_id()` (Betrieb sieht nur eigene) ODER `buyer_id=auth.uid()`. Plan-Gate `pro+`. |
| S1–S7 Verifizierung / Support | `verifications`, `support_tickets`, `audit_log` | Staff/Owner über `is_platform_staff()`/`is_owner()`; PII nur im Ticket-Kontext; jede Mutation auditiert. |
| O1–O11 Commercial / Steuerung | `subscriptions`, `orgs`, `feature_flags`, `audit_log` | Entitlements **nur Webhook** (service role); Preise/Flags/Schema **`is_owner()`**; kritische Aktionen Confirm+Reason+Audit. |

> **Goldene Regel wiederholt:** Frontend-Spiegelung der Rechte (§1/§2) ist **kein** Ersatz für RLS + serverseitige Entitlements (§3/§4). Fremde Org = 403/0 Zeilen, nie 200 mit Fremddaten.

---

## 5 · Audit & Vermittler-Compliance pro Feature-Klasse

> Jede **mutierende** Aktion schreibt nach `audit_log` (append-only, nur service role). `reason` ist **Pflicht** bei kritischen Aktionen. Namespace domänen-präfixiert. (Detail: `ROLE_AND_PERMISSION_MODEL.md` §7, `DATABASE_MODEL.md` §4.8.)

| Feature-Klasse | Audit-Namespace (Beispiele) | `reason` Pflicht? | Vermittler-Hinweis |
|---|---|---|---|
| Reservierung (K5–K7) | `reservation.create` · `reservation.cancel` · `reservation.transition` | bei `cancel`/`no_show` durch Staff | „Reservierung ohne Kaufgarantie; Zahlung direkt beim Hof." |
| Betrieb / Sortiment (E1–E13) | `farm.create` · `farm.publish` · `product.update` · `availability.set` | bei De-Listing | Angaben/Preise/Verfügbarkeit liegen beim Erzeuger. |
| SB-Bezahlung ⭐ (P1–P7) | `sb_payment.succeeded` · `sb_payment.refund` · `connect.onboard` | bei `refund` | Plattform = Zahlungsanbindung (Stripe Connect), **kein Eigenverkauf**; Geld fließt an den Hof. |
| Verifizierung / Moderation (S2–S5) | `verification.approve` · `verification.reject` · `content.moderate` · `account.suspend` | **immer** | Trust-Schicht; benachrichtigt Erzeuger. |
| Commercial / Steuerung (O1–O11) | `billing.change` · `platform.pricing` · `platform.flag` · `export` · `break_glass` | **immer** | Owner-Verantwortung; serverseitig wirksam. |

---

## 6 · Verifikations-Checkliste (für WAVE_03 „Rollen/Sichtbarkeit" + Feature-Reviews)

- [ ] Jede Matrix-Zeile (§1) hat eine **durchsetzende** RLS-Policy / serverseitige Prüfung (§4) — keine reine UI-Regel.
- [ ] `profiles.role` ∈ {`kaeufer`,`erzeuger`,`staff`,`owner`} (Enum `user_role`); Owner = Wert `'owner'` (Helper `is_owner()` = `role='owner'`, Soll); `org_members.role` ist ebenfalls `user_role` (Default `'erzeuger'`). Sub-Rang Betriebsinhaber/Mitarbeiter ist **Produkt-Konzept** (Ziel-Ausbau) — **kein** `org_role`-Enum/CHECK in der aktuellen Migration.
- [ ] Öffentliche Lesepfade (K1–K4) strikt auf `status='published' AND deleted_at IS NULL`.
- [ ] Plan-Gate (§3) ausschließlich serverseitig durchgesetzt; Limit-Verstoß → `403 plan_limit` **und** UI-Lock; **kein** hardcodierter Schwellwert in der UI.
- [ ] Jeder Funktions-Lock zeigt Ziel-Plan + funktionierenden `/erzeuger/billing?upgrade=<plan>&feature=<flag>`-Deep-Link (kein toter Button).
- [ ] Käufer haben **kein** Plan-Gate; Staff/Owner sind plan-frei.
- [ ] SB-Bezahlung (P1–P7) ist `pro+`-gegated, schreibt `sb_payments` nur via service-role-Webhook (idempotent, signaturgeprüft).
- [ ] Welt-Trennung: Käufer-/Erzeuger-/Staff-Owner-Session getrennt; Rolle nie clientseitig setzbar.
- [ ] Isolationstest grün (Pfeiler 6): fremde Org → 403/0 Zeilen; leere Daten → Zero-State; Eigen-Zugriff → erwartetes Shape (Plattform- **und** Org-Ebene).
- [ ] Vermittler-Disclaimer auf allen reservierungs-/zahlungsnahen Surfaces (K11) sichtbar.
- [ ] Surface-Matrix (§2) gegen Bootstrap-Response abgeglichen; Zero-State + Scope-Banner überall.

---

> **Änderungen** an dieser Matrix sind Produkt-/RBAC-/Commercial-relevant → Abstimmung mit `ROLE_AND_PERMISSION_MODEL.md` + `DATABASE_MODEL.md`, **Owner-Freigabe** bei Berechtigungs-/Plan-Verschiebungen, Update in `MASTER_INDEX.md` (§3 `docs/product/`) und `docs/releases/PHASE_STATUS.md`. Bei Architektur-/Security-Wirkung zusätzlich ADR in `.claude/memory/decisions/`.
