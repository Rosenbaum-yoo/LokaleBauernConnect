# GO_LIVE_TEST_MATRIX — LokaleBauernConnect

> **Die verbindliche Abnahme-Checkliste vor jedem Go-Live.** Jeder kritische Flow der Plattform-Spezialschicht ist hier als Testfall mit **Soll-Ergebnis**, **Test-Typ**, **Quelle der Wahrheit** und **Status** geführt. Was hier nicht grün ist, geht **nicht** live (deny-by-default — auch für Abnahme).
>
> Diese Matrix ist die ausführbare Übersetzung der **7 Produktionspfeiler** (`CLAUDE.md`), der **Kern-Statusmaschinen** (`docs/CORE_BUSINESS_STATE_MACHINES.md`) und der **Release-Gates A–F** (`PHASEN.md` Phase 2) in konkrete, abhakbare Fälle. Sie ersetzt **keine** Spezifikation — sie prüft, dass die Spezifikation eingehalten ist.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Verbots-/Stop-Regeln · Verifikation vor Abschluss) · `AGENTS.md` (`qa-tester`, `security-auditor`, `db-rls-spezialist`, `payment-engineer` · harte Regeln) · `PHASEN.md` (Go-Live-Gate Phase 1 · Gates A–F Phase 2 · Marktstart-Pflicht-Set) · `docs/CORE_BUSINESS_STATE_MACHINES.md` (§1 Reservierung · §2 Verfügbarkeit · §3 Hof-Verifizierung · §4 SB-Zahlung · §5.3 Pflicht-Tests) · `docs/ONBOARDING_SYSTEM.md` (Erzeuger-Onboarding) · `docs/security/TENANT_ISOLATION_MODEL.md` · `docs/security/IDENTITY_MODEL.md` · `docs/STRIPE-SETUP.md` (§6 Webhook · §3.3 Connect-Eligibility) · `docs/releases/PHASE_STATUS.md` (Implementierungs-Tracker).
>
> **Stand:** 2026-06-19 · **Phase:** 1 (Fundament & Kernprodukt) → Übergang Phase 2 (Release) · **Zuständig:** Claude (gesamter Stack) · **Freigabe:** Owner (Go-Live erklärt der Owner, nicht Claude — `CLAUDE.md` „Verifikation vor Abschluss").

---

## 0 · Wie diese Matrix zu lesen ist

### 0.1 — Status-Legende (kanonisch, identisch zu `PHASE_STATUS.md`)

| Symbol | Bedeutung |
|---|---|
| ✅ **grün** | Test geschrieben **und** real ausgeführt, bestanden, reproduzierbar (CI). Zählt als bestanden. |
| 🔨 **teilweise** | Code-/Datenbasis vorhanden, Test fehlt noch **oder** läuft nur lokal/auf Seed, nicht gegen Live-Backend. **Kein** Go-Live-Grün. |
| ⬜ **offen** | Weder Implementierung noch Test vorhanden. Blockiert den zugehörigen Flow. |
| ➖ **entfällt** | Bewusst nicht im Scope dieser Welle/Phase (mit Begründung). Kein Blocker. |
| ⛔ **rot** | Test existiert und **schlägt fehl**. Harter Go-Live-Blocker bis grün. |

> **Test-Integrität (`CLAUDE.md` §0.9, nicht verhandelbar):** Ein roter Test wird **nie** durch Abschwächen/Skippen grün gemacht — der **Code** wird an den Test angepasst. „🔨 teilweise" ist **nie** „grün" für den Go-Live, auch wenn es nah dran aussieht. Ein Test, der nur lokal/auf Seed läuft, aber nicht im offiziellen Runner gegen das Zielbackend, zählt **nicht** als bestanden.

### 0.2 — Test-Typen

| Kürzel | Typ | Werkzeug (Stack) | Wo |
|---|---|---|---|
| **U** | Unit | Vitest | `app/src/**/*.test.ts(x)` |
| **I** | Integration / Edge | Vitest + Supabase Local / Deno-Test | Edge Functions, RPC, RLS-SQL |
| **E2E** | End-to-End (Browser) | Playwright | `app/tests/e2e/` |
| **ISO** | Tenant-/Org-Isolation (Cross-Org-Negativtest) | Vitest + Supabase Local (zwei Orgs, JWT-Wechsel) | `docs/security/TENANT_ISOLATION_MODEL.md` |
| **SEC** | Security / Verbots-Check | Grep über Build-Artefakt · Header-Scan · `security-auditor` | Release-Pipeline |
| **MAN** | Manuelle Verifikation (Verdrahtungs-/Smoke-Check) | Browser + DevTools-Konsole, Stripe-CLI | Reviewer (Owner-Demo) |

> **Mehr als ein Typ je Fall ist Regel, nicht Ausnahme** (Defense-in-Depth): z. B. RLS-Schutz wird sowohl als **ISO** (DB-Ebene) als auch als **E2E** (UI führt nie org-fremde URL) geprüft — Backend ist führend, Frontend spiegelt nur.

### 0.3 — Spalten

`# | Testfall | Soll-Ergebnis (Akzeptanzkriterium) | Typ | Quelle (Spec) | Pfeiler | Status`

Die Spalte **Pfeiler** verweist auf die 7 Produktionspfeiler (`CLAUDE.md`): **P1** Org-Boundary · **P2** Zero-State · **P3** Scope-Transparenz · **P4** RBAC · **P5** Audit · **P6** Testpflicht · **P7** Drilldown-Integrität.

### 0.4 — Test-Daten-Disziplin

- Tests laufen gegen **Supabase Local** (deterministisches Schema aus `app/supabase/migrations/`) + dedizierten **Test-Seed** (zwei isolierte Orgs `org_a`/`org_b`, je ≥1 Hof, ≥1 Produkt, ≥1 Reservierung; ein `verified` und ein `submitted` Hof).
- **Kein** Test gegen Produktion. **Kein** Fake-Erfolg: Webhook-/Stripe-Pfade gegen **Stripe-Testmodus** + Stripe-CLI-Event-Replay, nie gemockte „200 ohne Wirkung".
- Demo-Seed ist als `is_demo = true` gekennzeichnet und in Prod-Abnahme **ausgeschlossen** (Verbot „kein Fake-Data in Prod-UI").

---

## 1 · Flow A — Hofladen-Finder → Reservierung (Kernflow, Go-Live-Pflicht Phase 1)

> **Der Herzschlag der Plattform.** Käufer findet einen verifizierten Hof, sieht reservierbare Produkte und legt eine Reservierung an — als angemeldeter Käufer **oder** als Gast (mit Turnstile). Spec: `docs/spezialmodule/HOFLADEN_FINDER.md`, `docs/CORE_BUSINESS_STATE_MACHINES.md` §1 (R1–R7), §2 (Verfügbarkeit→CTA).

### 1.1 — Finder & Detail (Lesepfad, öffentlich)

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| A-01 | Finder lädt Höfe | Nur `verification_status='verified'` **und** `deleted_at IS NULL` Höfe erscheinen; Antwort trägt `scope` (Region/Datenstand). | E2E, I | StateMach §3.4 | P3 | 🔨 |
| A-02 | `submitted`/`in_review`/`rejected` Hof unsichtbar | Nicht-verifizierter Hof taucht **nie** im öffentlichen Finder/Detail auf (auch nicht per direkter URL). | ISO, E2E | StateMach §3.4 | P1 | ⬜ |
| A-03 | Leerer Finder (keine Treffer) | Zero-State „Noch keine Höfe in dieser Region" + sinnvolle nächste Aktion (Radius/Filter), **kein** 500/leerer Screen, keine erfundenen Pins. | E2E, U | Pfeiler 2; Onb. §1.5 | P2 | 🔨 |
| A-04 | Hof ohne Geo (`lat/lng NULL`) | Ehrliche UI („Standort wird beim ersten Zugriff geokodiert"), Hof bleibt listbar, **kein** Fake-Pin. | E2E, U | ADR 0002; Onb. §1.5 | P3 | 🔨 |
| A-05 | Produkt-Detail rendert Verfügbarkeit | Badge zeigt exakt `available`/`low`/`soon`/`out` (DE-Label) gemäß `AvailabilityBadge`; `out`/`soon` zeigen **keinen** „Jetzt reservieren"-CTA, sondern „Bald wieder"/„Erinnern". | E2E, U | StateMach §2.1/§2.4 | P7 | 🔨 |
| A-06 | User-Inhalte escaped | Hof-/Produktname mit `<script>`/HTML-Sonderzeichen wird escaped gerendert (kein XSS). | U, E2E | CLAUDE.md Frontend; Verbote | — | ⬜ |
| A-07 | Deep-Link Finder→Detail trägt Kontext | Detail-Link übergibt `farm_id`/Region-Kontext; baut **nie** eine org-fremde URL; Zurück-Navigation erhält Filter. | E2E | Pfeiler 7 | P7 | ⬜ |
| A-08 | Vermittler-Disclaimer sichtbar | Auf Detail- und Reservierungs-Schritt durchgängig sichtbar: „Plattform vermittelt, Vertragspartner ist der Hof". | E2E, MAN | StateMach §0.1.9; Compliance | — | ⬜ |

### 1.2 — Reservierung anlegen & Lebenszyklus (R1–R7)

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| A-10 | **R1** Reservierung anlegen (Käufer auth) | Gültige Eingabe (`quantity≥1`, Fenster ∈ `farm.pickupWindows`, gültiger `contact`, Produkt ≠ `out`) ⇒ `requested`; Audit `reservation.requested`; Hof-Benachrichtigung. | E2E, I | StateMach R1 | P5 | 🔨 |
| A-11 | **R1** Gast-Reservierung | Ohne Konto erlaubt **mit** Turnstile-Token + Rate-Limit; Verwaltung danach nur via signiertem Deep-Link (autorisiert nur diese eine Reservierung). | E2E, I | StateMach §1.4; Identity | P4 | ⬜ |
| A-12 | **R1** Guard: Produkt `out` | Reservierung auf `out`-Produkt ⇒ `422`/blockierter CTA, **kein** toter Button, Zustand unverändert. | I, E2E | StateMach R1/§2.4 | P2 | ⬜ |
| A-13 | **R1** Guard: ungültiges Abholfenster | Fenster ∉ `farm.pickupWindows` ⇒ `422` mit handlungsleitendem Feldfehler. | I | StateMach §5.2 | — | ⬜ |
| A-14 | **R2** Hof bestätigt | Erzeuger der besitzenden Org: `requested → confirmed`; Audit `reservation.confirmed`; Käufer-Benachrichtigung mit Abholdetails. | I, E2E | StateMach R2 | P5 | ⬜ |
| A-15 | **R3/R4** Storno mit Reason | Käufer (eigene) **oder** Erzeuger storniert `requested`/`confirmed` (nur vor Abholzeit) ⇒ `cancelled`; **Reason Pflicht**. | I, E2E | StateMach R3/R4 | P5 | ⬜ |
| A-16 | **R5** Abholung bestätigen | Erzeuger: `confirmed → picked_up`; Audit; optional Bewertungs-Einladung. | I | StateMach R5 | P5 | ⬜ |
| A-17 | **R6/R7** Ablauf (System-Cron) | Edge-Cron setzt nach Fenster **+ Karenz** (konfigurierbar, nie hartkodiert) `requested`/`confirmed → expired`; `actor=system` im Audit. | I | StateMach R6/R7; §1.4 | P5 | ⬜ |
| A-18 | **Illegaler Übergang** | `requested → picked_up`, `picked_up → *`, `cancelled → *`, `expired → *` ⇒ `409`, Zustand unverändert, kein Mutations-Audit. | I | StateMach §1.2/§5.2 | P6 | ⬜ |
| A-19 | **Reason-Pflicht** fehlt | Storno (R3/R4) ohne `reason` ⇒ `422`, Formfehler am Reason-Feld. | I, U | StateMach §5.2/§5.3 | P5 | ⬜ |
| A-20 | **Idempotenz** Doppel-Submit | Reservierungs-Retry (gleicher `idempotency_key`) ⇒ höchstens **eine** Reservierung, zweiter Aufruf `200` no-op. | I | StateMach §0.1.5/§5.3 | P6 | ⬜ |
| A-21 | **Direkter `UPDATE status`** geblockt | Client-seitiger Direkt-`UPDATE reservations.status` via PostgREST ⇒ durch RLS/Constraint abgewiesen; Übergang nur via Edge/RPC mit Guard+Audit. | ISO, I | StateMach §5.4 | P1 | ⬜ |
| A-22 | **E2E Happy-Path komplett** | Finder → Detail → Reservierung anlegen → Hof bestätigt → Abholung — als ein durchgehender Browser-Flow gegen reales Backend, Konsole sauber (kein `TypeError`/401-Loop). | E2E, MAN | Go-Live-Gate Ph.1 | P7 | ⬜ |

---

## 2 · Flow B — Erzeuger-Onboarding (Registrierung → Einreichung → Verifizierung → Live)

> Datengetriebener Wizard (Schema+Zod), `farms.status='draft'` bis Einreichung, dann Staff-Verifizierung. Veröffentlichung ist **gated**: nie öffentlich vor `verified`. Spec: `docs/ONBOARDING_SYSTEM.md`, `docs/CORE_BUSINESS_STATE_MACHINES.md` §3 (H1–H6).

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| B-01 | Erzeuger-Registrierung | Signup ⇒ Auth-User; Trigger legt `profiles`; Edge `producer-onboarding-start` setzt `role='producer'`, legt `orgs(plan='demo')` + `org_members(org_owner)` an (service role, auditiert). | I, E2E | Onb. §2 | P5 | ⬜ |
| B-02 | Wizard-Autosave je Schritt | Jeder Schritt einzeln speicherbar; Abbruch + Wiederkehr verliert nichts (`producer_onboarding_progress`); Status bleibt `draft`. | E2E, I | Onb. §1.3/§6 | P2 | ⬜ |
| B-03 | Server-führende Validierung | UI rendert Schema; Edge validiert gegen **dasselbe** Zod-Schema; Pflichtfeld/Format/Plan-Limit serverseitig erzwungen, auch bei manipuliertem Client. | I, U | Onb. §1.2/§5 | P4 | ⬜ |
| B-04 | Zero-State leere Produkte/Nachweise | Noch keine Produkte/Nachweise ⇒ freundlicher Zero-State + nächster CTA, **kein** 500/leerer Bildschirm. | E2E, U | Onb. §1.4 | P2 | ⬜ |
| B-05 | Nachweis-Upload (Storage) | Upload in Supabase Storage; nur Erzeuger der Org liest eigene Nachweise (RLS); kein öffentlicher Bucket-Read. | I, ISO | Onb. §3.7; Tenant-Iso | P1 | ⬜ |
| B-06 | **H1** Einreichung | Pflichtfelder + ≥1 Nachweis ⇒ `farm.submit`: `draft → submitted`; Staff-Queue-Eintrag; Eingangsbestätigung; Audit `farm.submitted`. | I, E2E | StateMach H1 | P5 | ⬜ |
| B-07 | Unvollständige Einreichung | Fehlende Pflichtfelder/kein Nachweis ⇒ Einreichung serverseitig abgewiesen (`422`), Status bleibt `draft`. | I | Onb. §5; StateMach H1 | — | ⬜ |
| B-08 | **H2/H3** Verifizierung durch Staff | Staff (Verifier-Rolle): `submitted → in_review → verified`; Hof wird öffentlich; SB-Eligibility freigegeben (sofern Stripe ok); Audit-Kette. | I, E2E | StateMach H2/H3 | P5 | ⬜ |
| B-09 | **H4/H5** Ablehnung mit Reason | Staff lehnt ab ⇒ `rejected`; **Reason Pflicht** (`422` ohne); Erzeuger sieht Begründung + Re-Einreichungs-Hinweis. | I, E2E | StateMach H4/H5 | P5 | ⬜ |
| B-10 | **H6** Re-Einreichung neuer Zyklus | `rejected → submitted` startet **neuen** Zyklus; alte Entscheidung bleibt in der Audit-Historie (kein Überschreiben). | I | StateMach H6 | P5 | ⬜ |
| B-11 | Gated-Sichtbarkeit | `draft`/`submitted`/`in_review`/`rejected` Hof nur für eigenen Erzeuger + Staff (im Ticket) sichtbar — **nie** öffentlich. | ISO, E2E | StateMach §3.4; Onb. §1.6 | P1 | ⬜ |
| B-12 | Disclaimer & Einwilligungen im Flow | AVV-Hinweis, Lebensmittel-Kennzeichnungs-Verantwortung, DSGVO-Einwilligung sind **Schritte/Felder**, vor Einreichung verpflichtend. | E2E, MAN | Onb. §1.7/§3.7; Compliance | — | ⬜ |

---

## 3 · Flow C — SB-Zahlung (USP: QR am SB-Stand → Stripe → Quittung)

> ⭐ Der USP. QR am unbemannten Stand → PaymentIntent (Edge) → Stripe → signaturgeprüfter, idempotenter Webhook setzt Status → Quittung. **Webhook ist die einzige Schreibquelle** für `paid`/`failed`/`refunded`. Spec: `docs/spezialmodule/SB_BEZAHLUNG_USP.md`, `docs/CORE_BUSINESS_STATE_MACHINES.md` §4 (P1–P4), `docs/STRIPE-SETUP.md` §6.

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| C-01 | **P1** Initiierung (eligible Hof) | Hof `verified` **und** Connect `charges_enabled/payouts_enabled` ⇒ Edge erstellt PaymentIntent (service role), `initiated`, `idempotency_key` gesetzt, Betrag>0/EUR; Audit `sb_payment.initiated`. | I | StateMach P1; Stripe §3.3 | P5 | ⬜ |
| C-02 | **Eligibility-Gate** nicht-eligible Hof | Hof nicht `verified` **oder** Connect unvollständig ⇒ `403`/„Auszahlungskonto verbinden"-Hinweis am Stand, **kein** PaymentIntent, **kein** toter Bezahl-Flow. | I, E2E | StateMach §4.4; Stripe §3.3 | P4 | ⬜ |
| C-03 | **P2** `paid` nur via Webhook | `payment_intent.succeeded` (signiert, idempotent) ⇒ `initiated → paid`; Quittung in Storage (signierter Link) + an Käufer; Erzeuger-Einnahme gebucht; Audit. | I, MAN | StateMach P2; Stripe §6 | P5 | ⬜ |
| C-04 | **Kein Client-`paid`** | Client/Polling kann Status **nie** auf `paid` setzen; ohne gültiges Webhook-Event bleibt `initiated`. | I, ISO | StateMach §4.2; AGENTS hart | P1 | ⬜ |
| C-05 | **Webhook-Signatur** ungültig | Manipulierter/unsignierter Webhook-Body ⇒ Handler lehnt ab (kein Statuswechsel), Audit/Alarm. | I, SEC | Stripe §6; StateMach P2 | P5 | ⬜ |
| C-06 | **Webhook-Idempotenz** | Doppelt geliefertes Stripe-Event (gleiche `event.id`) ⇒ Übergang **höchstens einmal**, Wiederholung `200` no-op (keine Doppel-Quittung/Doppel-Einnahme). | I | StateMach §0.1.5/§5.3; Stripe §6 | P6 | ⬜ |
| C-07 | **Betrag/Currency-Abgleich** | Webhook-Betrag/-Currency ≠ initiierter Intent ⇒ **kein** `paid`, Alarm/Audit (Manipulationsschutz). | I | StateMach §4.4 | P5 | ⬜ |
| C-08 | **P3** Fehlschlag | `payment_intent.payment_failed`/`canceled`/`expired` ⇒ `failed`; UI „erneut versuchen" = **neuer** Vorgang (neuer `idempotency_key`), kein Geldfluss. | I, E2E | StateMach P3 | — | ⬜ |
| C-09 | **P4** Erstattung mit Reason | Erzeuger/Staff löst Refund aus (`reason` Pflicht, MFA bei Erzeuger); **Webhook** `charge.refunded` setzt `paid → refunded`; Gutschrift-Beleg; Dashboard korrigiert; Teil-Erstattung bis Originalsumme. | I, E2E | StateMach P4; Stripe §3.4 | P5 | ⬜ |
| C-10 | **Illegaler Übergang** | `failed → *`, `refunded → *`, `initiated → refunded` direkt ⇒ `409`/abgewiesen; terminale Zustände final. | I | StateMach §4.1/§5.2 | P6 | ⬜ |
| C-11 | Quittung erst nach Bestätigung | Keine Quittung „auf Verdacht" vor bestätigter Zahlung; SEPA (`processing`) erzeugt Quittung/Einnahme erst bei `succeeded`. | I | StateMach §4.4; Stripe Zahlarten | P5 | ⬜ |
| C-12 | RLS Zahlungs-Sichtbarkeit | Käufer sieht eigene Zahlung/Quittung (signierter Link); Erzeuger nur Zahlungen seiner Org-Höfe; `service_role` nie im Client-Bundle. | ISO, SEC | StateMach §4.4 | P1 | ⬜ |

---

## 4 · Flow D — Authentifizierung, Identität & Sessions

> Supabase Auth (E-Mail/Passwort, MFA optional, SSO später). Strikte Trennung Käufer-/Erzeuger-/Staff-Welten. Spec: `docs/security/IDENTITY_MODEL.md`, `docs/ROLE_AND_PERMISSION_MODEL.md`.

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| D-01 | Registrierung + E-Mail-Verifizierung | Signup ⇒ Bestätigungsmail; unbestätigter Account kann keine geschützten Aktionen (Reservierung-bestätigen, Onboarding) ausführen. | I, E2E | Identity; Onb. §2 | P4 | ⬜ |
| D-02 | Login / Logout | Korrekte Credentials ⇒ Session + JWT mit `role`/`org_id`-Claims; Logout invalidiert Session vollständig. | I, E2E | Identity | P4 | ⬜ |
| D-03 | Falsche Credentials / Rate-Limit | Fehlversuche ⇒ generische Fehlermeldung (keine User-Enumeration) + Rate-Limit/Turnstile nach Schwelle. | I, SEC | Identity; CLAUDE Security | — | ⬜ |
| D-04 | Rollen-Trennung der Welten | Käufer-Session erreicht **keine** Erzeuger-/Staff-Surfaces (UI **und** API); Erzeuger erreicht keine Staff-Surfaces. | ISO, E2E | RBAC; Pfeiler 4 | P4 | ⬜ |
| D-05 | Geschützte Route ohne Session | Direkter Aufruf geschützter App-Route/API ohne gültige Session ⇒ Redirect zu Login / `401`, **nie** stiller `null`-Erfolg. | E2E, I | CLAUDE Verbote (kein stiller Fehler) | P4 | ⬜ |
| D-06 | MFA-Pfad (sofern aktiviert) | Aktivierte MFA wird bei kritischen Aktionen (Refund-Auslösung Erzeuger) erzwungen; Break-Glass dokumentiert. | I, MAN | Identity; Stripe §3.4 | P4 | ➖* |
| D-07 | Session-Übergriff (Token-Tausch) | JWT von Org A im Request gegen Org-B-Ressource ⇒ `403`, nie `200` mit Fremddaten. | ISO | Tenant-Iso; Pfeiler 1 | P1 | ⬜ |
| D-08 | Gast-Flow ohne Konto | Gast-Reservierung erzeugt **keine** Session, autorisiert nur via signiertem Deep-Link genau eine Reservierung. | I, E2E | StateMach §1.4 | P4 | ⬜ |

> **D-06 `➖*`:** MFA ist im Marktstart-Pflicht-Set optional (Aktivierung Owner-Entscheidung); der Testfall ist spezifiziert und wird **scharf**, sobald MFA aktiviert ist (Phase 4 Track A / sensible Erzeuger-Aktionen). Nicht-Blocker für Gate 10, sofern keine sensible Erzeuger-Auslösung live ist.

---

## 5 · Flow E — RLS & Tenant-Isolation (querschnittlich, harter Blocker)

> **Der nicht verhandelbare Pfeiler 1.** Jede Tabelle: `org_id`/Tenant, `deleted_at`, **RLS deny-by-default**. Fremde Org = `403`, **nie** `200` mit Fremddaten. Spec: `docs/security/TENANT_ISOLATION_MODEL.md`, Migration `app/supabase/migrations/0001_core.sql`. **Kein Merge/Go-Live ohne grünen Isolationstest** (`AGENTS.md`).

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| E-01 | Cross-Org Lesen `farms` | Org-A-User liest Org-B-`farms` (nicht öffentlich/`draft`) ⇒ leere Menge / `403`, **kein** Fremddatensatz. | ISO | Tenant-Iso | P1 | ⬜ |
| E-02 | Cross-Org Lesen `reservations` | Erzeuger A sieht **nur** Reservierungen seiner Org-Höfe; Reservierungen von Hof B unsichtbar. | ISO | StateMach §1.4 | P1 | ⬜ |
| E-03 | Cross-Org Schreiben `products`/`availability` | Erzeuger A ändert Produkt/Verfügbarkeit von Hof B ⇒ `403`, Zustand unverändert. | ISO | StateMach §2.4 | P1 | ⬜ |
| E-04 | Cross-Org `sb_payments` | Erzeuger A sieht/erstattet **nicht** Zahlungen von Hof B ⇒ `403`. | ISO | StateMach §4.4 | P1 | ⬜ |
| E-05 | Deny-by-default neue Tabelle | Jede Tabelle hat RLS **aktiviert** + explizite Policies; ohne passende Policy = kein Zugriff (Default-Verweigerung), nicht offen. | ISO, SEC | CLAUDE DB-Regeln | P1 | ⬜ |
| E-06 | `anon`-Rolle Lesegrenzen | Öffentlicher (`anon`) Lesezugriff nur auf `verified`+`deleted_at IS NULL`-Höfe/-Produkte; keine `profiles`/`reservations`/`sb_payments`. | ISO | Tenant-Iso; StateMach §3.4 | P1 | ⬜ |
| E-07 | Soft-Delete respektiert | `deleted_at`-Datensätze erscheinen in keiner Lese-Query (Finder, Dashboard, API). | ISO, I | CLAUDE DB-Regeln | P1 | ⬜ |
| E-08 | Staff org-übergreifend nur mit Audit | Staff liest org-übergreifend **ausschließlich** über die Support-Andockung (WAVE_07), jeder Zugriff auditiert. | ISO, I | StateMach §1.4; RBAC | P5 | ⬜ |
| E-09 | Plattform-Isolations-Gate (CI) | Der Isolations-Testlauf ist **blockierendes** CI-Gate (Devops): rot ⇒ kein Merge, kein Deploy. | ISO, SEC | AGENTS hart; Devops | P6 | ⬜ |

---

## 6 · Querschnitt — Audit, Zero-State, Fehlersemantik, Scope

> Pfeiler 2/3/5 über alle Flows. Fehlercodes exakt nach `docs/CORE_BUSINESS_STATE_MACHINES.md` §5.2.

| # | Testfall | Soll-Ergebnis | Typ | Quelle | Pfeiler | Status |
|---|---|---|---|---|---|---|
| X-01 | Audit unabschaltbar | Jede Mutation (Reservierung, Verfügbarkeit, Verifizierung, Zahlung) erzeugt Audit-Eintrag mit `actor_id, actor_role, org_id, object, from→to, event, reason?, request_id, ts`. | I | StateMach §5.1 | P5 | ⬜ |
| X-02 | Reason-Pflicht querschnittlich | Storno/Ablehnung/Erstattung ohne `reason` ⇒ `422` an allen drei Stellen (R3/R4, H4/H5, P4). | I | StateMach §5.2/§5.3 | P5 | ⬜ |
| X-03 | Zero-State statt 500 | Leere Listen/fehlendes Objekt ⇒ `available:false`/leere Arrays + „Noch keine Daten", **nie** `500`. | I, E2E | Pfeiler 2; StateMach §5.2 | P2 | ⬜ |
| X-04 | Scope in jeder Response | Aggregat-/Listen-Responses tragen `scope` (org/region/zeitraum); UI zeigt Kontext + Datenstand. | I, E2E | Pfeiler 3 | P3 | ⬜ |
| X-05 | Einheitliche Fehlersemantik UI | `409`→„Aktion im aktuellen Status nicht möglich", `403`→„Keine Berechtigung", `422`→Feldfehler — kein generischer Crash, Konsole sauber. | E2E | StateMach §5.2 | P2 | ⬜ |
| X-06 | Idempotente Wiederholung global | Jeder von extern getriggerte Übergang (Client-Retry, Webhook) im Zielzustand ⇒ `200` no-op, keine Doppelwirkung. | I | StateMach §0.1.5 | P6 | ⬜ |

---

## 7 · Release-Gates A–F (Phase 2 — Go-Live-operativ)

> Die sechs Release-Gates aus `PHASEN.md` Phase 2 als abnehmbare Checks. **Alle sechs grün** ist Voraussetzung für den Cloudflare-Deploy. Gate-Abnahme = Owner.

| Gate | Inhalt | Soll-Ergebnis | Typ | Quelle | Status |
|---|---|---|---|---|---|
| **A — Build** | `npm run build` (`app/` + `web/`) | Build + Typecheck (TS strict) grün, **keine** Warnings-as-Errors, deterministischer Output. | SEC, MAN | PHASEN Ph.2; CLAUDE Verifikation | 🔨 |
| **B — Security** | Secret-Scan Build-Artefakt + Header/CSP/HSTS | Grep nach `sk_live`/`sk_test`/`whsec_`/`service_role`/`VITE_…SECRET` über `dist/` = **leer**; CSP/HSTS/Security-Header gesetzt; kein `.env`/`.claude` im Artefakt. | SEC | STRIPE §5.1; PHASEN Ph.2 Gate B | ⬜ |
| **C — Tenant-Isolation** | Isolations-Suite (Abschnitt 5) | **Alle** ISO-Fälle E-01…E-09 grün; CI-Gate blockierend. | ISO | AGENTS hart; Tenant-Iso | ⬜ |
| **D — Legal/DSGVO** | Impressum, Datenschutz, AGB, Lebensmittel-Hinweis, AVV/TOMs, Vermittler-Disclaimer | Alle Rechtstexte erreichbar + verlinkt; Disclaimer in kaufnahen Flows; Cookie/CMP korrekt. | MAN, E2E | PHASEN WAVE_14; Compliance | ⬜ |
| **E — Performance** | Pagination, Indizes, Ladezeit, N+1 | Finder/Dashboard paginiert; keine N+1; LCP/Interaktionszeit im Budget; Indizes auf heißen Pfaden. | I, MAN | PHASEN WAVE_11; Perf-Optimizer | ⬜ |
| **F — Smoke** | End-to-End-Smoke gegen Staging | Kernflow A (Finder→Reservierung) + Login + (sofern live) SB-Zahlung im Stripe-Testmodus durchlaufen ohne Konsolenfehler/401-Loop. | E2E, MAN | PHASEN Ph.2; Go-Live-Gate | ⬜ |

---

## 8 · Marktstart-Pflicht-Set (Minimum für erste zahlende Kunden — Gate 10)

> Verdichtet aus `PHASEN.md` „Marktstart-Pflicht-Set". **Diese Zeilen müssen grün sein**, bevor Owner Go-Live erklärt. Jede Zeile verweist auf die Detailfälle oben.

| # | Bedingung | Erfüllt durch (Detailfälle) | Status |
|---|---|---|---|
| M-1 | Kernflow Finder→Reservierung end-to-end mit echten Daten | A-01…A-22 (insb. A-22) | ⬜ |
| M-2 | Tenant-Isolation nachgewiesen | E-01…E-09 (Gate C) | ⬜ |
| M-3 | Auth + Rollen-Trennung der drei Welten | D-01…D-08 | ⬜ |
| M-4 | Erzeuger-Onboarding bis `verified` live | B-01…B-12 | ⬜ |
| M-5 | Mind. ein Geldfluss: SB-Zahlung **oder** Erzeuger-Abo (WAVE_09) | C-01…C-12 **oder** Abo-Webhook-Suite (`STRIPE-SETUP` §6) | ⬜ |
| M-6 | Release-Gates A–F grün + Cloudflare-Deploy + Domain + Security-Header | Abschnitt 7 | ⬜ |
| M-7 | Legal/DSGVO + Vermittler-Disclaimer durchgängig | Gate D; A-08; B-12 | ⬜ |
| M-8 | Audit + Zero-State + Fehlersemantik querschnittlich | X-01…X-06 | ⬜ |

> **Go/No-Go-Regel:** **Genau dann Go**, wenn M-1…M-8 **alle** ✅ sind (M-5 erfüllt durch **mindestens einen** der beiden Geldflüsse). Eine einzige 🔨/⬜/⛔ in M-1…M-8 = **No-Go**, mit benanntem Blocker und nächstem Schritt. „Fast fertig" ist No-Go (`CLAUDE.md` §0.1).

---

## 9 · Ausführung & Abnahme-Protokoll

### 9.1 — Wie die Suite läuft (Stack-konform)

```
# Unit + Integration (Vitest, gegen Supabase Local)
cd app && npm run test            # U, I

# Tenant-Isolation (zwei Orgs, JWT-Wechsel) — blockierendes Gate
cd app && npm run test:isolation  # ISO  (Gate C)

# End-to-End (Playwright, gegen Staging/Local)
cd app && npm run test:e2e        # E2E  (Gate F, A-22)

# Security-/Verbots-Scan über das Build-Artefakt
cd app && npm run build && npm run scan:secrets   # SEC (Gate B)

# Stripe-Webhook lokal verifizieren (Testmodus, Event-Replay)
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger payment_intent.succeeded            # C-03/C-06 (Stripe-CLI)
```

> Die genauen `package.json`-Scripts werden in `docs/engineering/TESTING.md` (MASTER_INDEX §6) definiert; diese Matrix ist die **Fall-Liste**, `TESTING.md` die **Mechanik**. Solange ein Script fehlt, bleibt der zugehörige Fall ≤ 🔨 (nicht grün).

### 9.2 — Abnahme-Eintrag (pro Go-Live auszufüllen, Owner-gegengezeichnet)

```
## Go-Live-Abnahme <Datum> · <Commit/Tag> · <Umgebung: Staging|Prod>
- Suite-Lauf: U __/__ · I __/__ · E2E __/__ · ISO __/__ · SEC __/__
- Gates A–F: A_ B_ C_ D_ E_ F_   (✅/⛔)
- Marktstart-Pflicht-Set: M-1_ M-2_ M-3_ M-4_ M-5_ M-6_ M-7_ M-8_
- Offene Blocker (Fall-# + Owner-Entscheidung nötig?): …
- Go / No-Go: __   · Owner-Freigabe: __ (Name, Datum)
```

> Ergebnisse werden nach jedem Lauf in `docs/releases/PHASE_STATUS.md` reflektiert (Tracker-Pflicht, `CLAUDE.md`). Diese Matrix bleibt die normative Soll-Liste; der Tracker hält den Ist-Stand.

---

## 10 · Abgrenzung & Nicht-Ziele dieser Matrix

- **Keine** Spezifikation: Statusübergänge, RLS-Policies, Schemas, Preise stehen in ihren Quell-Dokumenten — diese Matrix **prüft** nur deren Einhaltung.
- **Keine** Performance-/Last-Spezifikation im Detail (Gate E referenziert WAVE_11; Lasttest-Profile gehören in `docs/engineering/TESTING.md` / Phase 5 Customer-Gates 50/100/300).
- **Keine** VMS-/Zeitarbeits-Begriffe — der Kanon ist die Hof-Domäne (Käufer/Erzeuger/Staff, Hof, Reservierung, SB-Zahlung).
- **Status hier ≠ Lizenz zum Schönen:** 🔨/⬜ ehrlich führen; ein Fall wird erst ✅, wenn der Test real und reproduzierbar grün ist (`CLAUDE.md` §0.9 Test-Integrität).

---

### Verweise
- Statusmaschinen + Pflicht-Tests: `docs/CORE_BUSINESS_STATE_MACHINES.md` (§1–§5, insb. §5.3)
- Produktionspfeiler · Verbote · Verifikation: `CLAUDE.md` · harte Regeln: `AGENTS.md`
- Gates · Marktstart-Pflicht-Set · Go-Live-Gate Phase 1: `PHASEN.md`
- Tenant-Isolation (ISO-Mechanik): `docs/security/TENANT_ISOLATION_MODEL.md`
- Identität/Auth: `docs/security/IDENTITY_MODEL.md`
- Onboarding-Flow: `docs/ONBOARDING_SYSTEM.md`
- SB-Zahlung + Webhook: `docs/spezialmodule/SB_BEZAHLUNG_USP.md` · `docs/STRIPE-SETUP.md`
- Test-Mechanik (Scripts/Runner): `docs/engineering/TESTING.md`
- Ist-Stand-Tracker: `docs/releases/PHASE_STATUS.md`
