# 10→300 Customer-Readiness-Matrix — LokaleBauernConnect

> **Die verbindliche Skalierungs- und Reifeprüfung von 10 auf 300 zahlende Erzeuger.** Diese Matrix beantwortet pro Kernbereich genau eine Frage: *„Was muss heute (Ist) wahr werden, damit 10 / 50 / 100 / 300 Höfe sicher, schnell und wirtschaftlich bedient werden — und woran erkennen wir, dass es wahr ist (Gate)?"* Sie ist die Brücke zwischen `PHASEN.md` (Phase 5 · Customer-Gates) und dem ausführbaren Abnahme-Set (`docs/GO_LIVE_TEST_MATRIX.md`).
>
> Diese Matrix **ersetzt keine** Spezifikation — sie staffelt die bestehende Wahrheit über vier Wachstumsstufen und benennt je Stufe die konkrete Änderung, die Tests und das Gate. Was hier für eine Stufe nicht grün ist, wird **nicht** auf diese Stufe skaliert (deny-by-default, auch beim Wachstum).
>
> **Stack (fix, Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.**
>
> **Rolle der Plattform:** **Vermittler** — kein Eigenverkauf, keine Beratung, Disclaimer durchgängig. Skalierung heißt hier: mehr Höfe, mehr Käufer, mehr SB-Transaktionen — **ohne** dass die Plattform je Warenbestand, Preis oder Kaufvertrag übernimmt (Domain owns truth, OCC/Plattform owns aggregation & isolation).
>
> **Bezug:** `CLAUDE.md` (§0-Direktive · 7 Produktionspfeiler · Verbote · Stop-Regeln) · `AGENTS.md` (Subagenten · harte Regeln) · `PHASEN.md` (Phase 4 Track E „Datenmodell-Skalierung" · Phase 5 Customer-Gates 10/50/100/300 · Gate 10) · `docs/GO_LIVE_TEST_MATRIX.md` (Fall-Liste A–X, Gates A–F, Marktstart-Pflicht-Set M-1…M-8) · `docs/releases/PHASE_STATUS.md` (Ist-Tracker) · `docs/ENTERPRISE_ARCHITECTURE.md` · `docs/spezialmodule/{HOFLADEN_FINDER,SB_BEZAHLUNG_USP}.md`.
>
> **Stand:** 2026-06-19 · **Zuständig:** Claude (gesamter Stack + OZ-Execution-Part) · **Subagenten:** `performance-cost-optimizer` · `db-rls-spezialist` · `payment-engineer` · `security-auditor` · `qa-tester` · `devops` · **Freigabe:** Owner (Go-Live, Supabase-/Cloudflare-Tier, Stripe-Account, Kosten).

---

## 0 · Wie diese Matrix zu lesen ist

### 0.1 — Die vier Customer-Stufen (kanonisch, `PHASEN.md` Phase 5)

| Stufe | Bedeutung (Erzeuger = zahlende Höfe) | Charakter | Last-Annahme (Richtwert) |
|---|---|---|---|
| **10** | Erste zahlende Erzeuger — **Gate 10**, Marktstart-Schwelle | Beweis: echter Geldfluss, echte Isolation, echter Kernflow | ≤ 10 Höfe, ≤ 300 Produkte, ≤ ~50 Reservierungen/Tag, ≤ ~30 SB-Zahlungen/Tag |
| **50** | Erste Region trägt sich | Beweis: Betrieb ohne Heldentum, erste Automatisierung | ≤ 50 Höfe, ≤ 2.000 Produkte, ≤ ~400 Reservierungen/Tag, ≤ ~300 SB-Zahlungen/Tag |
| **100** | Mehrere Regionen | Beweis: Performance & Kosten unter realer Breite | ≤ 100 Höfe, ≤ 5.000 Produkte, ≤ ~1.500 Res./Tag, ≤ ~1.200 SB-Zahlungen/Tag |
| **300** | Überregionaler Marktführer-Anspruch | Beweis: zukunfts-/marktführer-fest, selbsttragend, austauschresistent | ≤ 300 Höfe, ≤ 15.000 Produkte, ≤ ~6.000 Res./Tag, ≤ ~5.000 SB-Zahlungen/Tag |

> Die Last-Annahmen sind **Planungs-Richtwerte** für Budgets/Indizes/Tier-Wahl, **kein** SLA. Sie werden in `docs/engineering/TESTING.md` (Lastprofile, geplant) und `docs/ENTERPRISE_ARCHITECTURE.md` präzisiert. Schwellen/Budgets sind **Konfig, nie hartkodiert** (`CLAUDE.md` Verbote).

### 0.2 — Status-Legende (identisch zu `PHASE_STATUS.md` / `GO_LIVE_TEST_MATRIX.md`)

| Symbol | Bedeutung |
|---|---|
| ✅ **grün** | implementiert **und** real verifiziert (Test/Gate bestanden, reproduzierbar) |
| 🔨 **teilweise** | Code-/Datenbasis vorhanden, Test/Live-Verifikation fehlt — **nie** „grün" für ein Gate |
| ⬜ **offen** | weder Implementierung noch Test vorhanden |
| ➖ **entfällt** | bewusst nicht im Scope dieser Stufe (mit Begründung) |

### 0.3 — Spalten der Bereichs-Matrizen

`Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate`

- **Ist** — heutiger, ehrlich bewerteter Reifegrad (verankert in `docs/releases/PHASE_STATUS.md`).
- **Dateien** — die realen Quellen der Wahrheit (Code/Migration/Doku). Keine erfundenen Pfade.
- **Ziel 10/50/100/300** — was auf der jeweiligen Stufe wahr sein muss (kumulativ: 50 enthält 10 usw.).
- **Risiko** — was bricht, wenn die Stufe ohne diese Änderung erreicht wird.
- **Änderung** — der konkrete, additive Eingriff (Retrofit-bewusst, mit Rollback-Denken).
- **Tests** — die prüfenden Fälle, verweisend auf `docs/GO_LIVE_TEST_MATRIX.md` (A/B/C/D/E/X) bzw. neue Lastfälle.
- **Gate** — die abnehmbare Bedingung, die diese Stufe für diesen Bereich freischaltet.

### 0.4 — Pfeiler-Kürzel (7 Produktionspfeiler, `CLAUDE.md`)

**P1** Org-Boundary/Isolation · **P2** Zero-State · **P3** Scope-Transparenz · **P4** RBAC · **P5** Audit · **P6** Testpflicht · **P7** Drilldown-Integrität.

---

## 1 · Kernbereiche im Überblick (Reifegrad je Stufe)

> Verdichtete Landkarte. Die Detail-Matrizen je Bereich folgen in §2–§14. „Ist" gemäß `docs/releases/PHASE_STATUS.md` (2026-06-19).

| # | Kernbereich | Ist | 10 | 50 | 100 | 300 | Führender Pfeiler |
|---|---|---|---|---|---|---|---|
| 1 | App-Fundament & Build | 🔨 | ✅ | ✅ | ✅ | ✅ | P6 |
| 2 | Datenmodell, RLS & Tenant-Isolation | 🔨 | ✅ | ✅ | ✅ | ✅ | P1 |
| 3 | Auth, Identität & RBAC (3 Welten) | ⬜ | ✅ | ✅ | ✅ | ✅ | P4 |
| 4 | Hofladen-Finder & Reservierung (Kernflow) | 🔨 | ✅ | ✅ | ✅ | ✅ | P7 |
| 5 | Produktverfügbarkeit & Saison-Radar | ⬜ | 🔨 | ✅ | ✅ | ✅ | P2 |
| 6 | Erzeuger-Onboarding & Hof-Verifizierung | ⬜ | ✅ | ✅ | ✅ | ✅ | P5 |
| 7 | Billing — Erzeuger-Abo (Stripe) | 🔨 | ✅ | ✅ | ✅ | ✅ | P5 |
| 8 | SB-Bezahlung USP (Connect + Webhook) ⭐ | 🔨 | 🔨 | ✅ | ✅ | ✅ | P5 |
| 9 | Performance, Pagination & Geo-Skalierung | ⬜ | 🔨 | ✅ | ✅ | ✅ | P2/P7 |
| 10 | Security, Secrets & Anti-Abuse | 🔨 | ✅ | ✅ | ✅ | ✅ | P1 |
| 11 | Observability, Monitoring & Audit | 🔨 | 🔨 | ✅ | ✅ | ✅ | P5 |
| 12 | Operations, Deploy & Backup/DR | 🔨 | 🔨 | ✅ | ✅ | ✅ | — |
| 13 | Support, Staff-Center & Eskalation | ⬜ | 🔨 | ✅ | ✅ | ✅ | P4/P5 |
| 14 | Legal, DSGVO & Vermittler-Compliance | 🔨 | ✅ | ✅ | ✅ | ✅ | — |
| 15 | Kosten-/Wirtschaftlichkeit (Unit Economics) | ⬜ | 🔨 | ✅ | ✅ | ✅ | — |

> **Gate-10-Lesart:** Für den Marktstart (erste zahlende Kunden) müssen die mit „10 = ✅" markierten Bereiche grün sein; „10 = 🔨" sind **bewusst** auf das nötige Minimum reduziert (z. B. SB-Payment kann durch das Erzeuger-Abo als Geldfluss ersetzt werden — `GO_LIVE_TEST_MATRIX.md` M-5). Kein „fast" — eine offene Pflichtzeile = No-Go (`CLAUDE.md` §0.1).

---

## 2 · App-Fundament & Build

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| TS-strict-Build deterministisch | 🔨 (build grün lokal) | `app/package.json`, `app/tsconfig.json`, `app/vite.config.ts` | **10:** Build+Typecheck grün in CI, keine Warnings-as-Errors · **50:** Build-Cache, < 3 min CI · **100:** Bundle-Budget pro Route überwacht · **300:** unveränderte Build-Zeit trotz Feature-Wachstum (Code-Splitting) | Stiller Build-Bruch beim Wachsen der Codebasis blockiert jeden Deploy | CI-Workflow (`devops`), Vite-Build-Budgets je Route, Lazy-Routes ab 100 | Gate A (Build) `GO_LIVE_TEST_MATRIX.md` §7 | **CI-Build grün + TS strict ohne `any`-Leaks; Artefakt deterministisch** |
| Datenquellen-Bridge (Seed↔Supabase) | ✅ Fail-soft | `app/src/lib/data.ts`, `app/src/lib/supabase.ts`, `app/src/lib/seed.ts` | **10:** Live-Supabase als Default, Seed nur Dev · **50–300:** Seed bleibt Dev-/Test-Pfad, in Prod ausgeschlossen | Demo-Daten in Prod-UI (Verbot „kein Fake-Data") | Env-Gate `isSupabaseConfigured`; `is_demo`-Filter in Prod | A-12 (Quelle sichtbar), SEC-Scan | **Header zeigt „Live-Daten"; kein Seed in Prod-Artefakt** |
| Release-Artefakt sauber | 🔨 | `app/vite.config.ts`, `.gitignore` | **10:** kein `.env`/`.claude`/Secret im `dist/` · **50–300:** automatisierter Secret-Scan im CI-Gate | Secret-Leak im Bundle | `scan:secrets`-Script über `dist/` | Gate B (Security) | **Grep `sk_*`/`whsec_`/`service_role` über `dist/` = leer** |

---

## 3 · Datenmodell, RLS & Tenant-Isolation (Pfeiler 1 — harter Blocker)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Schema + RLS deny-by-default | 🔨 Code vorhanden | `app/supabase/migrations/0001_core.sql` (`orgs, profiles, farms, products, reservations, waitlist, audit_log`), `0002_payments.sql` (`subscriptions, sb_payments, payment_events`), `0003_marketplace.sql` (`org_members, org_locations, reviews, bounties, credits_ledger`) | **10:** alle Tabellen RLS aktiv + Policies live, gegen echtes Supabase verifiziert · **50:** keine neue Tabelle ohne Isolationstest · **100–300:** Policy-Performance (Indizes auf Policy-Prädikaten) geprüft | Fremd-Org-Datenleck = Totalschaden (P1) | Isolations-Suite gegen Supabase Local (zwei Orgs `org_a/org_b`, JWT-Wechsel); CI-blockierend | E-01…E-09, ISO; `GO_LIVE_TEST_MATRIX.md` §5 | **Gate C: alle ISO-Fälle grün, CI blockierend (`AGENTS.md`: kein Merge ohne grünen Isolationstest)** |
| Org-Boundary auf jeder Query | 🔨 | `0001_core.sql` Policies (`farms_public_read`, `*_owner_write`, `reservations_*`), `is_org_member()`/`is_org_owner()` Helper (`0003`) | **10:** jede Query org-gebunden, fremde Org = 0 Zeilen/403 · **300:** unverändert unter Last + Replikation | Stiller `200` mit Fremddaten | Boundary-Negativtests pro Tabelle; `anon`-Lesegrenzen | E-01…E-06, D-07 | **Cross-Org-Lesen = 0 Zeilen; Schreiben = 403** |
| Soft-Delete & Aufbewahrung | 🔨 | alle Migrationen (`deleted_at`); `sb_payments` Kat. C (10 J., `docs/COMPLIANCE_MODEL.md`) | **10:** `deleted_at` in keiner Lese-Query sichtbar · **50–300:** Aufbewahrungs-/Anonymisierungs-Job für Fristen | Verlust gesetzlicher Belege / Löschung trotz Frist | Soft-Delete-Tests; Retention-Job (Edge-Cron) ab 50 | E-07, X-03 | **`deleted_at`-Sätze unsichtbar in Finder/Dashboard/API; Belegfristen gewahrt** |
| Migrations-Disziplin (additiv + Rollback) | 🔨 | `app/supabase/migrations/`, `setup_all.sql` | **10–300:** jede Migration additiv, mit Rollback, RLS+Isolationstest ab Tag 1 | „Migration ohne Rollback" (Verbot) | additive Spalten `NULL`/`DEFAULT`; dokumentierter Down-Pfad | I, ISO pro Migration | **Keine Migration ohne Rollback + grünen Isolationstest** |

---

## 4 · Auth, Identität & RBAC (Käufer / Erzeuger / Staff — 3 Welten)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Supabase Auth (Login/Logout, JWT-Claims) | ⬜ | `docs/security/IDENTITY_MODEL.md`, `docs/ROLE_AND_PERMISSION_MODEL.md`; geplant `app/src/lib/auth.ts` | **10:** E-Mail/Passwort, JWT trägt `role`/`org_id`; Logout invalidiert vollständig · **50–300:** SSO optional, Session-Härtung | Unautorisierter Zugriff, Session-Übergriff | Auth-Edge-Wiring + RLS-Claims (`auth.uid()`, `current_org_id()`) | D-01, D-02, D-05 | **Geschützte Route ohne Session = 401/Redirect, nie stiller `null`-Erfolg** |
| Welten-Trennung (RBAC) | ⬜ | `docs/ROLE_AND_PERMISSION_MODEL.md`; `0003` `org_members`-Rollen | **10:** Käufer erreicht keine Erzeuger-/Staff-Surface (UI **und** API) · **300:** unverändert über alle Module | Privilegien-Eskalation zwischen Welten (P4) | Rollen-Guards Edge + RLS; Surface-Sichtbarkeit | D-04, D-07, ISO | **Käufer/Erzeuger/Staff sauber getrennt; Token-Tausch = 403** |
| MFA für sensible Geld-Aktionen | ⬜ | `docs/security/IDENTITY_MODEL.md`; SB-Refund (`SB_BEZAHLUNG_USP.md` §6.2) | **10:** ➖ optional (Owner) sofern keine sensible Erzeuger-Auslösung live · **50:** MFA-Pflicht für Refund/Connect-Onboarding · **100–300:** Staff durchgängig MFA + Break-Glass dokumentiert | Refund-/Auszahlungs-Missbrauch | MFA-Enforcement an `sb/refund`, `connect/onboard` | D-06, C-09 | **Refund/Connect nur mit MFA; Break-Glass auditiert** |
| Gast-Flow (Käufer ohne Konto) | 🔨 (Reservierung Seed) | `app/src/components/FarmDrawer.tsx`, geplant Turnstile-Gate | **10:** Gast-Reservierung mit Turnstile + Rate-Limit, autorisiert nur via signiertem Deep-Link · **50–300:** unverändert, härter rate-limitiert | Spam/Bot-Reservierungen, Deep-Link-Übergriff | Turnstile + signierter Reservierungs-Token | A-11, D-08 | **Gast erzeugt keine Session; Deep-Link autorisiert genau eine Reservierung** |

---

## 5 · Hofladen-Finder & Reservierung (Kernflow — Go-Live-Pflicht)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Finder (Suche/Filter/Ranking) | ✅ end-to-end (Seed), Port 5409 | `app/src/pages/FinderPage.tsx`, `app/src/lib/data.ts`, `app/src/lib/geo.ts`, `app/src/components/{FarmCard,FarmDrawer,AvailabilityBadge}.tsx`; Spec `docs/spezialmodule/HOFLADEN_FINDER.md` | **10:** nur `verified`+`deleted_at IS NULL` Höfe, Scope sichtbar · **50:** serverseitige PLZ-Vorfilterung (`farms_plz_idx`) · **100:** Pagination + Edge-Cache öffentlicher Katalog · **300:** Boundingbox-Read (Edge), Clustering-fähig | Clientseitiges Voll-Laden bricht bei vielen Höfen (LCP, Kosten) | `FarmFilter` um `radiusKm`/`page` erweitern (additiv, kein UI-Bruch); Edge-Read | A-01…A-09, U (geo/data) | **Finder lädt nur verifizierte Höfe, paginiert ab 100, Scope-Hinweis sichtbar** |
| Reservierungs-Lebenszyklus (R1–R7) | 🔨 (Seed/localStorage-Fallback) | `app/src/components/FarmDrawer.tsx`, `0001_core.sql` `reservations`; Spec `docs/CORE_BUSINESS_STATE_MACHINES.md` §1 | **10:** R1–R5 live über Edge/RPC mit Guard+Audit; Reason-Pflicht bei Storno · **50:** R6/R7 Ablauf via Edge-Cron · **100–300:** unverändert, paginierte Hof-Reservierungsliste | Direkter Client-`UPDATE status` umgeht Statusmaschine | Statusübergänge nur via Edge/RPC; RLS blockt Direkt-Update | A-10…A-22, X-01/X-02 | **Illegaler Übergang = 409; Direkt-`UPDATE` geblockt; Reason-Pflicht greift** |
| Idempotenz Doppel-Submit | ⬜ | geplant Edge `create-reservation` | **10:** `idempotency_key` → höchstens eine Reservierung · **300:** unverändert unter Funkloch-Retry am Stand | Doppelte Reservierung bei Retry | Client-stabiler Key + Server-Dedup | A-20, X-06 | **Doppel-Submit → 200 no-op, eine Reservierung** |
| Geo/PLZ-Distanz | ✅ (Anker-Zentroide) | `app/src/lib/geo.ts` (`haversine`, `distanceFromPlz`, `isValidPlz`) | **10:** Anker-Regionen + ehrlicher „PLZ unbekannt"-Pfad · **50:** vollständiger DE-PLZ-Zentroid-Datensatz · **100–300:** Geocoding via Edge (rate-limitiert, kein Client-Key) | „PLZ unbekannt" als Reibung bei überregionaler Nutzung | Zentroid-Tabelle ersetzen/Edge-Geocoding hinter `distanceFromPlz` (Schnittstelle stabil) | U (geo), A-04 | **Bekannte PLZ → Distanz-Ranking; unbekannte → transparenter Fallback, kein 500** |

---

## 6 · Produktverfügbarkeit & Saison-Radar (Erzeuger-Selbstpflege)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Verfügbarkeits-Selbstpflege | ⬜ (Anzeige ✅) | `app/src/components/AvailabilityBadge.tsx`, `0001_core.sql` `products.availability`; Spec `app/docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` | **10:** 🔨 Erzeuger pflegt Verfügbarkeit über RLS-org-gescopte Maske · **50:** mobile Schnellpflege · **100–300:** Batch-Pflege, Stand-bezogen | Veraltete Verfügbarkeit = enttäuschte Abholung (Vertrauensverlust) | Erzeuger-Edit-Surface (RLS `products_owner_write`) + Audit | E-03, A-05, X-01 | **Erzeuger ändert nur eigene Produkte (403 fremd); `out` blockt Reservierung-CTA** |
| Saison-Radar & Alerts | ⬜ | `0001_core.sql` `products.seasonal`, `waitlist`; Spec `docs/spezialmodule/SAISON_RADAR.md` | **10:** Saison-Marker sichtbar (read) · **50:** „Erinnern"-Warteliste (`waitlist`) · **100–300:** Push/E-Mail-Alerts bei Verfügbarkeit (Edge-Cron, opt-in) | Alert-Flut / DSGVO-Einwilligung fehlt | opt-in Einwilligung + rate-limitierte Benachrichtigung | X-03 (Zero-State), I | **Alerts nur mit Einwilligung; Zero-State statt 500 bei leerer Saison** |

---

## 7 · Erzeuger-Onboarding & Hof-Verifizierung (Staff-gated)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Onboarding-Wizard (datengetrieben/Zod) | ⬜ | Spec `docs/ONBOARDING_SYSTEM.md`; geplant Edge `producer-onboarding-start` | **10:** Registrierung → `draft` → Einreichung (`submitted`), serverführende Zod-Validierung · **50:** Autosave je Schritt · **100–300:** Selbstbedien-Skalierung, Nachweis-Upload (Storage, RLS) | Manipulierter Client umgeht Pflichtfelder/Plan-Limits | UI rendert Schema, Edge validiert dasselbe Zod-Schema | B-01…B-07, B-11 | **Unvollständige Einreichung = 422, Status bleibt `draft`; gated-Sichtbarkeit** |
| Hof-Verifizierung (H1–H6, Staff) | ⬜ | `0001_core.sql` `farms.verified`; Spec `docs/CORE_BUSINESS_STATE_MACHINES.md` §3 | **10:** Staff `submitted→in_review→verified`; nie öffentlich vor `verified` · **50:** Verifizierungs-Queue + SLA · **100–300:** Teil-Automatisierung (Checks), Re-Einreichung sauber | Fake-/Phishing-Höfe öffentlich (auch SB-QR-Risiko) | Staff-Verifier-Rolle + Audit-Kette; Re-Einreichung neuer Zyklus | B-08…B-11, A-02 | **Nur `verified` Höfe öffentlich + SB-eligible; Ablehnung mit Reason-Pflicht** |

---

## 8 · Billing — Erzeuger-Abo (Stripe, WAVE_09)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Abo-Checkout + Webhook (Entitlements) | 🔨 Infra vorhanden, env-gated | `app/supabase/functions/create-checkout/index.ts`, `app/supabase/functions/stripe-webhook/index.ts`, `0002_payments.sql` (`subscriptions, payment_events`), `app/src/lib/payments.ts`; Spec `docs/STRIPE-SETUP.md`, `docs/SUBSCRIPTION_LIFECYCLE.md` | **10:** EIN signaturgeprüfter, idempotenter Webhook setzt Entitlements serverseitig (`orgs.plan`) · **50:** Dunning/Zahlungsausfall-Flow · **100–300:** Plan-Migration, Reconciliation-Job | Doppel-Buchung / Entitlement-Drift / Client setzt Plan | `payment_events`-Dedup (`event.id`), Entitlement nur via Webhook | M-5 (Abo-Pfad), C-05/C-06-analog, SEC | **Webhook ist einzige Entitlement-Quelle; Replay = 200 no-op; Signatur erzwungen** |
| Plan-Locks & Upgrade-Pfad | ⬜ | `docs/product/PLANS_AND_LIMITS.md`, `docs/PRICING.md`; `orgs.plan` (`demo/basis/plus/pro/individuell`) | **10:** Plan-Lock zeigt konkreten Upgrade-Pfad (kein toter Lock) · **300:** Entitlements serverseitig über alle Features durchgesetzt | Client-seitiger Bypass von Plan-Grenzen | serverseitige Entitlement-Checks (Edge) + UI-Spiegel | B-03 (Plan-Limit), I | **Plan-Limit serverseitig erzwungen, auch bei manipuliertem Client** |

---

## 9 · SB-Bezahlung USP ⭐ (Stripe Connect · idempotenter Webhook)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Eligibility-Gate (verified + Connect) | 🔨 Backend vorhanden | `create-checkout` (`mode:sb_payment`), `0002_payments.sql` `sb_payments`; Spec `docs/spezialmodule/SB_BEZAHLUNG_USP.md` §2.1 | **10:** 🔨 optional (Geldfluss via Abo möglich, M-5) · **50:** Eligibility blockt `initiate` bei nicht-verifiziertem/Connect-unfertigem Hof · **100–300:** Connect-Status gecacht via `account.updated` | Toter Bezahl-Flow / Zahlung an Fake-Hof | serverseitiges Gate vor PaymentIntent; Sperr-Hinweis statt toter Button | C-01, C-02 | **Nicht-eligible Hof = 403/Sperr-Hinweis, kein PaymentIntent** |
| Betrag serverseitig + Webhook-Wahrheit | 🔨 | `create-checkout` (Preis serverseitig), `stripe-webhook`, `payment_events`-Dedup | **50:** Betrag aus DB (`products.price_cents`), Client-/QR-Betrag ignoriert; Webhook setzt `paid/failed/refunded`, Betrags-/Currency-Abgleich · **100–300:** unverändert unter Volumen | Betrags-Tampering / Client setzt `paid` / Doppel-Quittung | `UNIQUE(stripe_event_id/intent_id)`, Betragsabgleich, Idempotenz beidseitig | C-03…C-08, C-10, C-11 | **`paid` nur via signiertes, idempotentes Webhook-Event; Betrag-Mismatch = kein `paid`** |
| QR-Stand-UI + Quittung + Connect-Geldfluss | ⬜ (Backend teils) | geplant `app/src/pages/SbPayPage.tsx`, Quittungs-Mail (`_shared/email.ts`); `connect/onboard` (geplant) | **50:** QR (HMAC-signiert) → Bezahlseite → Quittung (Hof als Leistungserbringer, Vermittler-Hinweis); Netto an Hof-Connect, `application_fee` an Plattform · **100–300:** mehrere Stände/Hof, Schwund-Dashboard | Phishing-QR, fehlender Vermittler-Beleg, kein Geldfluss zum Hof | `sig`-Verifikation, Connect Destination Charge, Quittungs-Pflichtinhalt (CMP-04) | C-09, C-12, T1–T14 (`SB_BEZAHLUNG_USP.md` §12) | **Connect-Netto landet beim Hof; Quittung nur nach `paid`; RLS-Sichtbarkeit korrekt** |
| Refund + Dashboard (Einnahmen/Schwund) | ⬜ | geplant `sb/refund`, `sb/dashboard`; `sb_payments` Aggregation | **50:** Refund nur MFA/Staff + Reason, Webhook setzt `refunded`; Dashboard echte KPIs + Zero-State · **100–300:** Schwund-Indikator, Auszahlungsstatus | Erstattungs-Missbrauch / Fake-KPIs | Reason-Pflicht + Audit; org-gescopte Aggregation, kein Fake | C-09, X-01/X-02, T4/T11 | **Refund mit Reason+MFA auditiert; Dashboard org-gescoped, Zero-State bei 0** |

---

## 10 · Performance, Pagination & Geo-Skalierung (Phase 4 Track E)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Listen-Pagination (Finder/Dashboard) | ⬜ (clientseitig, klein) | `app/src/lib/data.ts`, `0001_core.sql` Indizes (`farms_plz_idx`, `products_farm_idx`) | **10:** ausreichend clientseitig (≤ 10 Höfe) · **50:** serverseitige Pagination Finder + Reservierungsliste · **100:** Cursor-Pagination, keine N+1 · **300:** Edge-Cache öffentlicher Katalog, Bounding-Box-Read | Voll-Load + N+1 → langsame Seiten, hohe Kosten | `FarmFilter` `page`/Cursor (additiv); Edge-Read; Embed-Tuning | Gate E (Performance), I, MAN | **Finder/Dashboard paginiert ab 50; keine N+1; LCP im Budget** |
| Index-/Query-Härtung | 🔨 (Basis-Indizes da) | `0001/0002/0003`-Indizes; Spec `docs/ENTERPRISE_ARCHITECTURE.md` | **50:** Indizes auf heißen Pfaden + Policy-Prädikaten · **100:** `EXPLAIN`-Review der Top-Queries · **300:** Read-Replica/Connection-Pooling-Bewertung | Policy-Scan ohne Index → langsame RLS bei vielen Zeilen | additive Indizes je Hot-Path (`(org_id,status,created_at)`) | Gate E, Lastfälle (`TESTING.md`) | **Top-Queries < Budget unter Stufen-Last; Indizes auf Policy-Prädikaten** |
| Geo-Skalierung (PLZ→Geocoding) | ⬜ | `app/src/lib/geo.ts` | **50:** voller DE-PLZ-Datensatz · **100–300:** Edge-Geocoding (rate-limitiert, kein Client-Key), Cache | Reibung „PLZ unbekannt" überregional | Datentausch hinter stabiler `distanceFromPlz`-Schnittstelle | U (geo), MAN | **Distanz-Ranking überregional korrekt; kein Drittanbieter-Key im Client** |

---

## 11 · Security, Secrets & Anti-Abuse

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Secret-Hygiene (service role nur Edge) | 🔨 | `app/supabase/functions/_shared/{supabaseAdmin,stripe,email}.ts`; Frontend nur `VITE_`-Public | **10:** kein Secret/`service_role` im Client-Bundle; Secrets nur Env · **50–300:** Secret-Rotation getaktet | Key-Leak = Voll-Kompromittierung | Secret-Scan im CI; Rotation (`docs/security/SECRET_ROTATION.md`) | Gate B (SEC), C-12 | **Grep über `dist/` leer; `service_role` nie clientseitig** |
| Security-Header / CSP / HSTS | ⬜ | geplant Cloudflare-Config (`docs/DEPLOYMENT.md`) | **10:** CSP (`connect-src` Allowlist Supabase/Stripe), HSTS, X-Frame · **50–300:** WAF-Regeln, „Under Attack" bei Bedarf | XSS/Clickjacking/Daten-Exfiltration | Header-Block am Cloudflare-Rand | Gate B, SEC-Scan | **CSP/HSTS gesetzt; Header-Scan grün** |
| Turnstile + Rate-Limit (öffentliche Pfade) | ⬜ | geplant an `initiate`, Gast-Reservierung, Auth | **10:** Turnstile an öffentlichen Formularen + Rate-Limit · **50–300:** adaptives Rate-Limit, Stripe Radar (Connect) | Karten-Testing/BIN-Attacken, Bot-Spam | Turnstile-Token-Prüfung Edge + IP/Stand-Rate-Limit | A-11, C-02, D-03 | **Öffentliche Mutationen Turnstile-/Rate-Limit-geschützt** |
| User-Input-Escaping (kein XSS) | 🔨 (React-Default) | `FarmCard.tsx`, `FarmDrawer.tsx` | **10–300:** Hof-/Produktnamen mit HTML-Sonderzeichen escaped gerendert | XSS über Erzeuger-Selbstauskunft | Escaping verifiziert, kein `dangerouslySetInnerHTML` | A-06, U | **`<script>` in Hofname wird escaped, kein XSS** |

---

## 12 · Observability, Monitoring & Audit (Pfeiler 5)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Audit unabschaltbar | 🔨 (Tabelle vorhanden) | `0001_core.sql` `audit_log`; Spec `docs/CORE_BUSINESS_STATE_MACHINES.md` §5.1 | **10:** jede Mutation (Reservierung, Verfügbarkeit, Verifizierung, Zahlung) → Audit (`actor, org, from→to, reason?, request_id, ts`) · **50–300:** Audit-Retention + Auswertung | Mutation ohne Spur (verboten) | Edge schreibt Audit nach jeder Mutation; append-only | X-01, X-02 | **Keine kritische Mutation ohne Audit; Reason-Pflicht greift** |
| Monitoring/Alarme | 🔨 (Doku-Soll) | `docs/MONITORING.md`, `docs/OBSERVABILITY.md`, `docs/engineering/OPERATIONS_RUNBOOK.md` | **10:** Health-Checks + Fehler-Alarm (5xx, Webhook-Fehlschlag, Isolations-Regression) · **50:** strukturierte Logs (Sentry) · **100–300:** Dashboards, SLO/Burn-Rate | Blindflug im Betrieb; Alarm auf Leere (P2-Verstoß) | Sentry-Wiring, Alarme auf echte Fehler (nicht Zero-State) | WAVE_13, MAN | **Alarme feuern auf Fehler, nicht auf leere Daten; Webhook-Health überwacht** |

---

## 13 · Operations, Deploy & Backup/DR

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Deploy/Rollback (Cloudflare Pages) | ⬜ | `docs/DEPLOYMENT.md`, `docs/engineering/OPERATIONS_RUNBOOK.md` | **10:** reproduzierbarer Deploy + Rollback-Pfad; Owner-Freigabe für Prod · **50–300:** Blue/Green, Edge-Function-Versions-Rollback | Fehlerhafter Deploy ohne Rückweg | CI→Pages, dokumentierter Rollback je Komponente | Gate F (Smoke), MAN | **Deploy + Rollback geübt; Smoke gegen Staging grün** |
| Backup/PITR (Supabase) | ⬜ | `docs/BACKUP_DISASTER_RECOVERY.md` | **10:** PITR aktiv + Restore dokumentiert · **50–300:** Restore-Übung, RPO/RTO definiert | Datenverlust ohne Wiederherstellung | PITR-Überwachung + getesteter Restore | MAN, I | **Restore real geübt; RPO/RTO eingehalten** |
| Betriebs-Runbook gelebt | 🔨 | `docs/engineering/OPERATIONS_RUNBOOK.md` | **10:** tägliche/wöchentliche Routinen definiert · **50–300:** On-Call, Eskalation, Reifegrad-Marker aktuell | Betrieb hängt an Einzelperson | Runbook-Pflege, Owner-Freigabe-Punkte markiert | MAN | **Runbook deckt Routine/Deploy/Eskalation; reproduzierbar** |

---

## 14 · Support, Staff-Center & Eskalation (Kern-Andockung, WAVE_07)

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Staff-Verifizierung & Tickets | ⬜ | `0003_marketplace.sql` `org_members` (Rollen); Spec `docs/ROLE_AND_PERMISSION_MODEL.md` | **10:** 🔨 minimale Staff-Sicht für Hof-Verifizierung + Eskalation · **50:** Ticket-Andockung (Kern-Support) · **100–300:** SLA, Queue-Steuerung | Verifizierungs-Stau bremst Onboarding (Wachstums-Engpass) | Staff-Surface (rollengebunden, auditiert) | B-08, E-08 | **Staff org-übergreifend nur über Support-Andockung, jeder Zugriff auditiert** |
| Eskalation SB-Dispute/Refund | ⬜ | geplant; `sb_payments` Dispute-Flag (`SB_BEZAHLUNG_USP.md` §8) | **50:** `charge.dispute.created` → Flag + Staff-Eskalation + Audit · **100–300:** Dispute-Dashboard | Chargeback ohne Nachweis/Eskalation | Webhook-Flag + Eskalations-Pfad | C-13-analog (T13), I | **Dispute markiert + eskaliert + auditiert** |

---

## 15 · Legal, DSGVO & Vermittler-Compliance

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Rechtstexte erreichbar + verlinkt | 🔨 | `docs/launch/B_rechtstexte/{impressum,datenschutz,agb}.md`, `app/docs/launch/B_rechtstexte/avv-toms.md` (Entwurf, anwaltliche Prüfung vor Go-Live) | **10:** Impressum/Datenschutz/AGB/Lebensmittel-Hinweis live + verlinkt; Cookie/CMP korrekt · **50–300:** AVV/TOMs, Subprozessor-Liste aktuell | Abmahnung / DSGVO-Verstoß beim Wachsen | Legal-Seiten + CMP; Subprozessoren (Stripe/Supabase/Cloudflare) | Gate D (Legal), MAN | **Alle Rechtstexte erreichbar; CMP korrekt** |
| Vermittler-Disclaimer durchgängig | ✅ (Finder/Footer) | `app/src/App.tsx` (Footer), Detail/Reservierung; Spec `docs/COMPLIANCE_MODEL.md` (CMP-04) | **10–300:** Disclaimer in allen kaufnahen Flows (Detail, Reservierung, Bezahlseite, Quittung) | Implizite Plattform-Haftung / falsche Verkäufer-Rolle | zentral gepflegter Disclaimer-Baustein | A-08, B-12, MAN | **„Plattform vermittelt, Vertragspartner = Hof" überall sichtbar** |
| Aufbewahrung & Löschkonzept | 🔨 | `deleted_at` überall; `sb_payments` Kat. C; `docs/COMPLIANCE_MODEL.md` §4 | **10:** Belegfristen gewahrt (kein Löschen trotz Frist) · **50–300:** Anonymisierung/Verarbeitungseinschränkung-Job (Art. 18) | Frist-Verstoß vs. Lösch-Pflicht-Konflikt | Retention-Job + Anonymisierung soweit ohne Belegverlust | E-07, I | **Belege während Frist erhalten; Löschwünsche fristkonform** |

---

## 16 · Kosten- & Wirtschaftlichkeits-Skalierung (Unit Economics, §0-Direktive 3)

> Wirtschaftlichkeit ist ein eigener Reife-Bereich: Skalierung darf nicht in eine Kostenfalle laufen. Schwellen/Budgets sind **Konfig**, nie hartkodiert.

| Bereich | Ist | Dateien | Ziel 10 / 50 / 100 / 300 | Risiko | Änderung | Tests | Gate |
|---|---|---|---|---|---|---|---|
| Kosten je Stufe (Supabase/Cloudflare/Stripe) | ⬜ | `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`, `docs/PRICING.md` | **10:** Free/Low-Tier ausreichend, Kosten je Hof bekannt · **50:** Tier-Wechsel bewusst (Owner) · **100–300:** Edge-Cache senkt Read-Kosten, Kosten/Transaktion < Gebühr | Marge kippt; Read-Kosten explodieren | Read-Cache, Query-Sparsamkeit, Tier nach Bedarf (Owner-Freigabe) | MAN (Kosten-Review), Perf-Optimizer | **Deckungsbeitrag je Hof positiv; Kosten/SB-Transaktion < `platform_fee`** |
| Monetarisierung (Abo + SB-Gebühr) | 🔨 | `0002_payments.sql` (`subscriptions`, `sb_payments.platform_fee_cents`); `docs/PRICING.md` | **10:** mind. ein Geldfluss aktiv (Abo **oder** SB) · **50–300:** beide Ströme, Plan-gekoppelte SB-Gebühr | Kein wiederkehrender Umsatz / Pricing offen (SB-01) | Owner-Pricing-Entscheidung; serverseitige Gebühr | M-5, I | **Mind. ein Geldfluss live; Gebühr serverseitig, nie Client/hartkodiert** |

---

## 17 · Customer-Gate-Checkliste (Go/No-Go je Stufe)

> Verdichtung: Welche Bereiche **müssen** je Stufe ✅ sein. Eine offene Pflichtzeile = No-Go für diese Stufe (`CLAUDE.md` §0.1, „fast fertig zählt nicht").

### Gate 10 — Erste zahlende Erzeuger (Marktstart, `PHASEN.md` Phase 5)
- [ ] App-Build/CI grün (Gate A) · Secret-Scan leer (Gate B) — §2, §11
- [ ] Tenant-Isolation E-01…E-09 grün, CI-blockierend (Gate C) — §3
- [ ] Auth + 3-Welten-Trennung (D-01…D-08) — §4
- [ ] Kernflow Finder→Reservierung end-to-end mit echten Daten (A-01…A-22) — §5
- [ ] Erzeuger-Onboarding bis `verified` live (B-01…B-12) — §7
- [ ] **Mind. ein Geldfluss** live: Erzeuger-Abo **oder** SB-Zahlung (M-5) — §8/§9/§16
- [ ] Legal/DSGVO + Vermittler-Disclaimer durchgängig (Gate D) — §15
- [ ] Audit + Zero-State + Fehlersemantik querschnittlich (X-01…X-06) — §3/§12
- [ ] Release-Gates A–F grün + Cloudflare-Deploy + Domain + Security-Header (Gate F) — §11/§13
> **Go genau dann, wenn alle Punkte ✅** (Mapping zu `GO_LIVE_TEST_MATRIX.md` M-1…M-8).

### Gate 50 — Region trägt sich
- [ ] Serverseitige Pagination Finder + Reservierungsliste (Gate E) — §5/§10
- [ ] Voller DE-PLZ-Datensatz / kein „PLZ unbekannt"-Reibungspfad regional — §5/§10
- [ ] Verfügbarkeits-Selbstpflege live (Erzeuger pflegt eigene Produkte) — §6
- [ ] SB-Zahlung vollständig (Eligibility, Connect-Geldfluss, Quittung, Refund mit MFA) — §9
- [ ] MFA für Refund/Connect erzwungen — §4
- [ ] Reservierungs-Ablauf R6/R7 via Edge-Cron — §5
- [ ] Strukturierte Logs/Sentry + Webhook-Health-Alarme — §12
- [ ] Backup/PITR + Restore real geübt — §13
- [ ] Tier-Wechsel bewusst, Deckungsbeitrag je Hof positiv — §16

### Gate 100 — Mehrere Regionen
- [ ] Cursor-Pagination, keine N+1, `EXPLAIN`-Review Top-Queries — §10
- [ ] Edge-Geocoding (kein Client-Key) + Edge-Cache öffentlicher Katalog — §5/§10
- [ ] Saison-Alerts (opt-in) mit Einwilligung + Rate-Limit — §6
- [ ] Adaptives Rate-Limit + WAF-Regeln, Stripe Radar — §11
- [ ] Monitoring-Dashboards + SLO/Burn-Rate — §12
- [ ] Dispute-Eskalation + Dashboard — §14
- [ ] Kosten/Read durch Cache gesenkt, Kosten/Transaktion < Gebühr — §16

### Gate 300 — Überregionaler Marktführer-Anspruch
- [ ] Boundingbox-Read + Clustering-fähiger Katalog, Build-Zeit stabil (Code-Splitting) — §2/§5/§10
- [ ] Read-Replica/Pooling-Bewertung, Indizes auf allen Policy-Prädikaten — §3/§10
- [ ] Staff-Center mit SLA/Queue, mehrere Stände je Hof + Schwund-Dashboard — §9/§14
- [ ] Blue/Green-Deploy + Edge-Function-Versions-Rollback, RPO/RTO eingehalten — §13
- [ ] AVV/TOMs + Subprozessor-Liste vollständig, Retention-/Anonymisierungs-Job aktiv — §15
- [ ] Beide Geldströme tragend, Marge unter Voll-Last bestätigt — §16

---

## 18 · Abnahme-Protokoll je Stufe (Owner-gegengezeichnet)

```
## Customer-Gate-Abnahme  ·  Stufe <10|50|100|300>  ·  <Datum>  ·  <Commit/Tag>
- Suite-Lauf (GO_LIVE_TEST_MATRIX): U __/__ · I __/__ · E2E __/__ · ISO __/__ · SEC __/__
- Release-Gates A–F: A_ B_ C_ D_ E_ F_   (✅/⛔)
- Bereichs-Reife (diese Matrix §2–§16): grün __/__ · teilweise __ · offen __
- Lastprofil dieser Stufe eingehalten (Richtwerte §0.1): JA/NEIN  (Quelle: docs/engineering/TESTING.md)
- Kosten-Review (Deckungsbeitrag/Hof, Kosten/Transaktion): __
- Offene Blocker (Bereich-# + Owner-Entscheidung nötig?): …
- Go / No-Go: __   ·  Owner-Freigabe: __ (Name, Datum)
```

> Ergebnis jeder Abnahme wird in `docs/releases/PHASE_STATUS.md` reflektiert (Tracker-Pflicht, `CLAUDE.md`). Diese Matrix bleibt die normative Soll-Staffelung; der Tracker hält den Ist-Stand.

---

## 19 · Offene Punkte / Owner-Entscheidungen

| ID | Beschreibung | Stufe | Status |
|---|---|---|---|
| RM-01 | **Supabase-/Cloudflare-Tier** je Stufe (Compute, PITR, Edge-Cache) — Kosten/Freigabe | 10→ | Owner (Account/Kosten) |
| RM-02 | **Stripe-Account/Live-Keys/Connect-Variante** (Express vs. Standard) — Voraussetzung Geldfluss | 10 | Owner (`SB_BEZAHLUNG_USP.md` SB-02/SB-04) |
| RM-03 | **SB-Gebührenhöhe + Erhebungsweg** (`application_fee` vs. Käufer-Aufschlag, Plan-Staffelung) | 10→50 | Owner-Pricing (`SB_BEZAHLUNG_USP.md` SB-01) |
| RM-04 | **Lastprofile/Budgets** je Stufe final (LCP, Query-Budget, RPO/RTO) — `docs/engineering/TESTING.md` | 50→ | Claude + Owner-Freigabe |
| RM-05 | **MFA-Aktivierung** (ab welcher Stufe Pflicht für Erzeuger-Geld-Aktionen) | 10/50 | Owner (`IDENTITY_MODEL.md`) |
| RM-06 | **Aufsichtsrechtliche Einordnung** der Connect-Architektur vor breitem SB-Rollout | 50→ | Owner/extern (`COMPLIANCE_MODEL.md`) |

---

### Verweise
- Phasen/Wellen/Customer-Gates: `PHASEN.md` (Phase 4 Track E · Phase 5 · Gate 10)
- Ausführbare Fall-Liste + Gates A–F + M-1…M-8: `docs/GO_LIVE_TEST_MATRIX.md`
- Ist-Stand-Tracker: `docs/releases/PHASE_STATUS.md`
- Produktionspfeiler · Verbote · Stop-Regeln: `CLAUDE.md` · harte Regeln + Subagenten: `AGENTS.md`
- Datenmodell + RLS: `app/supabase/migrations/0001_core.sql` · `0002_payments.sql` · `0003_marketplace.sql`
- Edge Functions: `app/supabase/functions/create-checkout/` · `app/supabase/functions/stripe-webhook/`
- Kernflow/USP-Specs: `docs/spezialmodule/HOFLADEN_FINDER.md` · `docs/spezialmodule/SB_BEZAHLUNG_USP.md`
- Betrieb/Architektur: `docs/engineering/OPERATIONS_RUNBOOK.md` · `docs/ENTERPRISE_ARCHITECTURE.md`

*Letzte Aktualisierung: 2026-06-19 · Phase 5 (Skalierung 10→300) · Zuständig: Claude (gesamter Stack + OZ-Execution-Part) · Freigabe: Owner (Go-Live/Tier/Stripe/Kosten). Status hier ≠ Lizenz zum Schönen — 🔨/⬜ ehrlich führen; grün erst, wenn real verifiziert (`CLAUDE.md` §0.9 Test-Integrität).*
