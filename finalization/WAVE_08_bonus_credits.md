# WAVE 08 — Bonus / Credits (Empfehlung / Referral — schlank, abwägen · evtl. Post-Launch)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · `PHASEN.md` → Phase 1, WAVE_08 (`optional`). **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> **Voraussetzung:** WAVE_02 (Datenmodell + RLS deny-by-default) ✅ · WAVE_03 (Rollen/Sichtbarkeit, `can()`, `_shared/guard.ts`, `_shared/errors.ts`, `NOT_FOUND`-statt-Leak-Konvention) ✅ · `credits_ledger` **existiert bereits** (`0003_marketplace.sql`, Zeile 107 ff.) — diese Welle **erweitert** ihn, baut **keine** Parallelstruktur.
> **Diese Welle ist als `optional` markiert (`PHASEN.md`, Zeile 31).** Ergebnis ist eine bewusste **Build/Defer-Entscheidung** plus — bei „Build" — ein **schlankes, mandantensicheres Empfehlungsprogramm** auf dem vorhandenen Ledger.

---

## 0. Ziel

Diese Welle liefert **zwei** Dinge in einem Pfad — denn „abwägen" ist hier ein expliziter Arbeitsschritt, kein Bauch-Default:

1. **Eine dokumentierte Wirtschaftlichkeits-Entscheidung (Build vs. Defer).** Bonus/Credits steht in `PHASEN.md` bewusst als `optional`. Wir entscheiden anhand der §0-Direktive (Wirtschaftlichkeit, Owner-Wert, keine Verschwendung) **schriftlich** — als ADR — ob das Feature **jetzt** (Phase 1, vor Marktstart) oder **Post-Launch** (nach Gate 10, mit realen Erzeugern) gebaut wird. Default-Empfehlung (begründet unten): **Schema + Ledger-Erweiterung jetzt schlank verdrahten, UI/Auszahlung erst Post-Launch scharfschalten** — so ist die Beweismaschine vorhanden, das Marktstart-Risiko aber null.
2. **Falls „Build": ein schlankes, end-to-end verdrahtetes Empfehlungsprogramm (Referral)** für **Erzeuger** auf Basis des vorhandenen `credits_ledger` — mandantensicher (RLS), idempotent, selbstbedienbar, vollständig auditiert, ohne Auszahlungs-Komplexität in dieser Welle. **Belohnt wird ein verifizierter Geschäftserfolg** (geworbener Erzeuger zahlt sein erstes Abo / bzw. wird verifiziert), **nie ein bloßer Klick** — sonst ist es ein Betrugs-Magnet ohne Owner-Wert.

**Geschäftsmodell (wirtschaftlich begründet, Vermittler-konform):**
- **Wer wirbt:** ein **bestehender Erzeuger** (org-gebunden) wirbt einen **neuen Erzeuger** für die Plattform. (Käufer-Referral ist bewusst **Nicht-Ziel** — Käufer zahlen kein Abo, ihr „Wert" ist schwer attributierbar; Käufer-Bonus wäre Bargeld-Verbrennung. Siehe ADR.)
- **Was es bringt:** Credits werden als **Rabatt auf das Erzeuger-Abo** (`subscriptions`, WAVE_09) gutgeschrieben — **kein Bargeld-Payout** in Welle 08. Das hält die Plattform auf der **Vermittler**-Seite (kein Eigenverkauf, keine Auszahlung von Geld an Dritte) und ist regulatorisch schlank.
- **Wann ausgelöst:** **erst bei verifiziertem Erfolg** des Geworbenen — kanonisch: dessen **erste bezahlte Abo-Periode** (Stripe-Webhook, WAVE_09) **oder** Hof-Verifizierung (WAVE_07), je nach ADR-Entscheid. Reine Anmeldung = **kein** Credit (Anti-Fraud, Pfeiler 6).

**Nicht-Ziel dieser Welle (bewusst ausgespart, damit „schlank" schlank bleibt):**
- **Keine** Bargeld-/IBAN-Auszahlung, **kein** Stripe-Connect-Payout, **kein** Steuer-/Gutschrift-Beleg-Export (separate, audit-/compliance-schwere Welle).
- **Keine** Käufer-Coupons / Rabattcodes im Checkout (das ist Marketing-/Promotion-Logik, eigene spätere Welle).
- **Kein** Multi-Level-/Tier-Referral, **keine** Gamification-Punkte, **keine** Leaderboards (Komplexität ohne belegten Owner-Wert vor Gate 10 = Verschwendung).
- **Kein** Live-Stripe-/Auth-Go-Live in dieser Welle (account-/kostenrelevant → Owner-Freigabe; WAVE_06/WAVE_09). App bleibt im **Seed-Modus** voll bedienbar (Dual-Source).

**Stop-Regel (vorab):** Sobald echtes Geld an Dritte fließen würde (Payout statt Abo-Rabatt), ein Steuer-/Buchungsbeleg nötig ist, oder unklar ist, **welcher** verifizierte Erfolg den Credit auslöst → **anhalten, Owner-Entscheidung als ADR**. Ein Bonus-System ohne klare, fälschungssichere Auslöse-Bedingung wird **nicht** gebaut.

---

## 1. Aufgaben

### 1.0 Abwägung zuerst (Build/Defer) — als ADR, vor jedem Code

Bevor eine Zeile entsteht: **`.claude/memory/decisions/0005_bonus_credits_build_or_defer.md`** (ADR) mit dem Wirtschaftlichkeits-Kalkül entlang §0:

| Frage | Befund | Konsequenz |
|---|---|---|
| Bringt es dem Owner Geld? | Referral senkt CAC für Erzeuger-Akquise (der teuerste Funnel). Wert entsteht aber **erst** mit kritischer Erzeuger-Masse. | Vor Gate 10 (erste zahlende Erzeuger) ist der Hebel klein. |
| Was kostet „jetzt bauen"? | Schema-Erweiterung + 1 Edge-Function + schlanke UI = niedrig. Auszahlungs-/Steuer-Logik = hoch (deshalb Nicht-Ziel). | Schlanker Teil ist billig, der teure Teil bleibt draußen. |
| Marktstart-Risiko? | Optional laut `PHASEN.md`; gehört **nicht** ins Marktstart-Pflicht-Set (`PHASEN.md`, Zeile 62 ff.). | Darf den Go-Live nie blockieren. |
| Imperium-Wert? | Ledger + Referral-Trigger sind in **20+ Plattformen** wiederverwendbar (Pattern). | Schema/Trigger jetzt = Imperium-Beschleuniger. |

**Empfohlene Entscheidung (im ADR festhalten, Owner bestätigt):** **„Schlank jetzt, scharf später".** Ledger-Erweiterung + Referral-Code-Vergabe + idempotente Gutschrift-Function + read-only Erzeuger-Sicht **jetzt** (additiv, risikoarm, Imperium-wiederverwendbar). **Aktivierung/Sichtbarkeit hinter Feature-Flag** `referral_program` (default **aus**) — erst Post-Launch (nach Gate 10) eingeschaltet. So existiert die Beweis-/Audit-Maschine, ohne Marktstart-Risiko und ohne CAC-Wette vor kritischer Masse. **Alternativ** (Owner-Wahl): vollständig auf Post-Launch verschieben — dann endet diese Welle nach §1.0 mit dem ADR + Tracker-Eintrag, **kein** weiterer Code. Beide Pfade sind valide; der ADR hält die Wahl fest.

> Der Rest von §1 beschreibt den **Build-Pfad** (Empfehlung). Bei Defer-Entscheidung gelten nur §1.0 + §1.7 (Doku/Tracker) und der Abschlussbericht vermerkt „deferred to Post-Launch (nach Gate 10)".

### 1.1 Datenmodell — `credits_ledger` erweitern + Referral-Tabelle (additiv, RLS deny-by-default)

**Neue Migration** `app/supabase/migrations/0004_referral_credits.sql` (additiv, vierstellig, dokumentierter Rollback im Kopf). Sie baut **auf** dem vorhandenen `credits_ledger` (`0003_marketplace.sql`, Zeile 107: `id/org_id/amount_cents/reason/ref/created_at`, RLS `credits_owner_read` via `is_org_member(org_id)`, Schreiben nur `service_role`). **Keine** zweite Guthaben-Tabelle.

- **`credits_ledger` additiv härten** (keine Datenmigration nötig, alle neu):
  - `entry_type text not null default 'manual' check (entry_type in ('referral_reward','signup_bonus','abo_discount','adjustment','manual'))` — macht den bisher freitextigen `reason` **typisiert** (Pfeiler 3/5: Auswertbarkeit + Audit), ohne `reason` zu entfernen (bleibt als Klartext-Begründung).
  - `expires_at timestamptz` (nullable) — Credits können verfallen (Bilanz-Hygiene); `null` = unbefristet. Saldo-Berechnung berücksichtigt `expires_at is null or expires_at > now()`.
  - **Eindeutigkeits-Schutz gegen Doppelgutschrift (Idempotenz auf DB-Ebene):** `create unique index if not exists credits_ledger_ref_uniq on credits_ledger (entry_type, ref) where ref is not null;` — derselbe Referral (`ref = referral.id`) kann **nie** zwei Reward-Zeilen erzeugen. Das ist der Anti-Fraud-Anker, der nicht von Function-Logik abhängt.
  - `check (amount_cents <> 0)` ergänzen — eine 0-Buchung ist immer ein Bug, nie ein gültiger Ledger-Eintrag.
- **Neue Tabelle `referrals`** (verbindet Werber-Org ↔ geworbene Org, trägt den Lebenszyklus):
  ```sql
  create table if not exists referrals (
    id                uuid primary key default gen_random_uuid(),
    referrer_org_id   uuid not null references orgs(id) on delete cascade,   -- wer wirbt
    code              text not null unique,                                  -- teilbarer Empfehlungscode
    referred_org_id   uuid references orgs(id) on delete set null,           -- wer geworben wurde (nach Einlösung)
    referred_email    text,                                                  -- optional, Pending-Zustand vor Org-Anlage
    status            text not null default 'pending'
                       check (status in ('pending','signed_up','qualified','rewarded','expired','void')),
    qualified_at      timestamptz,        -- wann der verifizierte Erfolg eintrat (Abo bezahlt / verifiziert)
    rewarded_at       timestamptz,        -- wann der Credit gebucht wurde
    reward_cents      integer not null default 0 check (reward_cents >= 0),
    created_at        timestamptz not null default now()
  );
  create index if not exists referrals_referrer_idx on referrals (referrer_org_id);
  create index if not exists referrals_status_idx   on referrals (status);
  ```
  - **Selbst-Referral-Schutz:** `check (referred_org_id is null or referred_org_id <> referrer_org_id)` — niemand wirbt sich selbst.
  - **Status-Maschine (kanonisch, eindeutig — keine undefinierten Übergänge):**
    `pending` → `signed_up` (geworbene Org existiert) → `qualified` (verifizierter Erfolg: erste Abo-Zahlung **oder** Hof-Verifizierung, je ADR) → `rewarded` (Credit im Ledger gebucht). Quer: `expired` (Code-/Pending-Verfall), `void` (Storno/Fraud, durch Staff mit Reason). **Reward nur** beim Übergang `qualified → rewarded`, und genau **einmal** (Unique-Index oben).
- **RLS (deny-by-default, additiv):**
  ```sql
  alter table referrals enable row level security;
  -- Werber liest die eigenen Empfehlungen (org-gebunden, wie credits).
  create policy referrals_referrer_read on referrals for select to authenticated
    using (is_org_member(referrer_org_id));
  -- Schreiben/Statuswechsel/Reward: ausschließlich service_role (Edge). KEINE client insert/update-Policy.
  ```
  > Wie `credits_ledger` ist `referrals` damit eine **privat-schreibende** Tabelle (Pattern aus WAVE_03 §1.3 `hidden_private_tables`): Clients lesen nur die eigene Werber-Sicht, mutieren **nie** direkt. Der geworbene Status (`referred_email`/`referred_org_id`) ist für die Werber-Org sichtbar, aber **keine** fremden Empfehlungen — Cross-Org-Negativtest deckt das ab.
- **Feature-Flag-Verankerung:** `referral_program` als Flag (Phase-3-Feature-Flags / bis dahin `subscriptions.plan`-gestützte Sichtbarkeit). Migration ist **immer** additiv und harmlos, egal ob Flag an/aus — nur die **UI/Function-Aktivierung** hängt am Flag.
- **Rollback** im Migrationskopf: `drop table if exists referrals; alter table credits_ledger drop column if exists entry_type, drop column if exists expires_at; drop index if exists credits_ledger_ref_uniq;` — keine Basis-Domänentabelle wird zerstört (rein additiv).

### 1.2 Edge Function — `referral-redeem` + idempotente Gutschrift (service_role nur hier)

Eine **einzige** Edge Function `app/supabase/functions/referral-redeem/index.ts` (Deno), die zwei klar getrennte, geprüfte Operationen kapselt — beide über die **zentralen Guards/Errors aus WAVE_03** (`_shared/guard.ts`, `_shared/errors.ts`), Zod an der Grenze, Turnstile auf dem öffentlichen Einlöse-Pfad (WAVE_06), Audit immer:

1. **Code einlösen (`action: 'redeem'`):** ein neuer Erzeuger gibt beim Onboarding einen `code` an → `referrals.status pending|signed_up`, `referred_org_id` gesetzt. Validierung: Code existiert, ist nicht `expired/void`, **kein** Selbst-Referral (`referrer_org_id <> referred_org_id`), Org noch nicht anderweitig geworben (eine Org kann nur **einmal** als „geworben" zählen → Unique-Constraint/Check). Fehler → kanonischer Code (`NOT_FOUND` bei unbekanntem/fremdem Code, **nie** Existenz-Leak; `VALIDATION_FAILED` bei Zod-Verstoß).
2. **Reward buchen (`action: 'grant'`, intern/Webhook-getriggert):** wird **ausschließlich** beim verifizierten Erfolg aufgerufen (aus dem **Stripe-Webhook** WAVE_09 bei erster bezahlter Abo-Periode der geworbenen Org, **oder** aus `staff-verify-farm` WAVE_07 — je ADR). Bucht **eine** `credits_ledger`-Zeile (`entry_type='referral_reward'`, `ref=referrals.id`, `amount_cents=reward_cents`) und setzt `referrals.status='rewarded'`, `rewarded_at=now()`. **Idempotent über den Unique-Index** `(entry_type, ref)` — ein doppelter Webhook/Retry erzeugt **keine** zweite Gutschrift (Pattern wie `payment_events` aus `0002_payments.sql`). Doppel-Insert → abgefangen, als No-op auditiert, **kein** Fehler nach außen.

- **service_role** wird **nur** in dieser Function genutzt (Schreiben in `referrals`/`credits_ledger`), nie im Frontend. Frontend ruft die Function über den Anon-Key + Session auf; die Function prüft Rolle/Org via `guard.ts`.
- **Audit (Pfeiler 5):** jede Mutation → `audit_log` (`referral.redeemed`, `referral.reward_granted`, `referral.voided`) mit wer/welche Org/welcher Code/Betrag. Bei Staff-`void`: **Reason Pflicht** (kritische Mutation, CLAUDE.md-Regel).
- **Keine** Gutschrift ohne `referrals.status='qualified'`-Vorbedingung serverseitig geprüft — der „verifizierte Erfolg" ist die **einzige** Auslösebedingung; ein direkter `grant`-Call ohne erfüllte Bedingung → `PERMISSION_DENIED`/No-op.

### 1.3 Datenschicht — `lib/referral.ts` (Dual-Source, typisiert)

- Neue Datei `app/src/lib/referral.ts` nach dem **Dual-Source-Muster** (`lib/data.ts`/`lib/payments.ts`): ist Supabase konfiguriert, wird gegen `referrals`/`credits_ledger` (RLS) + die `referral-redeem`-Function gelesen/geschrieben; sonst **deterministisch aus `lib/seed.ts`** simuliert (eigener Werbe-Code, Beispiel-Empfehlungen im Pending/Qualified-Zustand, klar als Demo gekennzeichnet). Gleiche API, gleiches Shape — **kein toter Pfad** ohne Account.
- **Domänentypen** in `lib/types.ts` (single source, kein `any`):
  - `CreditEntryType = 'referral_reward' | 'signup_bonus' | 'abo_discount' | 'adjustment' | 'manual'`
  - `CreditEntry = { id: string; amountCents: number; entryType: CreditEntryType; reason: string; ref?: string; expiresAt?: string; createdAt: string }`
  - `CreditBalance = { balanceCents: number; currency: 'eur'; entries: CreditEntry[] }` — Saldo = Summe gültiger (`expiresAt` leer/zukünftig) Einträge, **nie** `NaN`.
  - `ReferralStatus = 'pending' | 'signed_up' | 'qualified' | 'rewarded' | 'expired' | 'void'`
  - `Referral = { id: string; code: string; referredEmail?: string; status: ReferralStatus; rewardCents: number; qualifiedAt?: string; rewardedAt?: string; createdAt: string }`
  - `ReferralResult = { available: boolean; scope: { level: 'org'; orgId?: string; source: 'live' | 'seed' }; code?: string; referrals: Referral[]; balance: CreditBalance }` — **Pfeiler 2**: leere Daten → `available:false` + leere Arrays + `balanceCents:0`, **kein** Throw/500.
- **Case-Mapping** (`snake_case` DB ↔ `camelCase`) ausschließlich hier an der Grenze. Beträge **immer** in Cent (Integer), nie Float-Euro — Geld-Disziplin wie in `lib/payments.ts`.

### 1.4 Routing & RBAC-Gate (nur Erzeuger, Server führend, Flag-gegated)

- **Route** `ReferralPage` (`app/src/pages/erzeuger/ReferralPage.tsx`), eingehängt im **Erzeuger-Dashboard** (`/erzeuger/empfehlungen`) — additiv zur bestehenden Surface-Trennung aus WAVE_03 (`/`, `/erzeuger`, `/staff`). **Käufer/anon haben keinen Zugriff** (kein Navi-Eintrag via `can()`; Direktaufruf → Zero-State „Kein Zugriff", Rückweg). 
- **RBAC (Pfeiler 4):** neue Aktionen in `lib/rbac.ts` (zentrale `can()`-Tabelle, keine Inline-Checks): `referral.read.own`, `referral.share.own` (Erzeuger, org-gebunden), `referral.void.any` (staff/owner, Reason-Pflicht). Sichtbarkeit aus dem Backend-Profil; **Frontend spiegelt nur, RLS/Guard ist führend**.
- **Feature-Flag `referral_program`**: ist das Flag aus, ist der Menüpunkt **nicht** sichtbar und die Function antwortet `FEATURE_NOT_ENABLED` (kanonischer Code aus WAVE_03 §1.4). So ist „schlank jetzt, scharf später" ein **echter** Schalter, kein auskommentierter Code.

### 1.5 UI — Editorial-Komponenten (Token-Kanon, keine neuen Farben/Emojis)

Alles im bestehenden Editorial-Design-System (`app/src/styles/theme.css`). **Keine hardcodierten Farben, keine Deko-Emojis, keine externen Fonts.**

- **`components/referral/ReferralCard.tsx`** — der eigene, teilbare Empfehlungscode/-Link: großer Code (`--mono`), „Kopieren"-Button (gebundener Handler, sichtbarer „Kopiert"-Zustand), kurze Premium-Erklärtext-Zeile im Markenton (New-York-Editorial: prägnant, verkaufsstark, ehrlich). Lade-/Leer-/Wert-Zustand real.
- **`components/referral/ReferralList.tsx`** — Tabelle der eigenen Empfehlungen: Status-Badge (`pending/signed_up/qualified/rewarded/expired/void`) mit semantischer Token-Farbe (`--ok/--muted/--wine`), Datum, Reward in € (aus Cent formatiert). Zero-State „Noch keine Empfehlungen — teile deinen Code".
- **`components/referral/CreditBalanceCard.tsx`** — aktueller Guthaben-Saldo (gültige Credits, Verfall transparent), Hinweis „wird mit deinem Abo verrechnet" (kein Bargeld-Versprechen — Vermittler-konform). Leerzustand `0,00 €`.
- **Vermittler-/Programm-Disclaimer** (`.disclaimer-line`): „LokaleBauernConnect vermittelt. Guthaben wird ausschließlich mit dem Erzeuger-Abo verrechnet, keine Barauszahlung. Belohnt wird ein geworbener Hof erst nach dessen erstem bezahlten Abo." — ehrlich, klar, im Footer der Seite.
- **A11y:** Status-Badges nicht nur Farbe (Textlabel); Kopier-Button mit `aria-live`-Bestätigung; `:focus-visible`-Ring aus Token; Mobile-Breakpoint `≤680px` (Liste stapelt).

### 1.6 End-to-End-Verdrahtung (Pflicht — sonst gilt das Feature als nicht fertig)

Die Kette steht vollständig: **`referral-redeem`-Function / Seed → `lib/referral.ts`-Fetch → `ReferralResult`-Shape → DOM (Code/Saldo/Liste) → Lade/Leer/Fehler/OK → Kopier-/Einlöse-Handler → echter Re-Fetch/Audit**. Kein TODO, kein Platzhalter, kein nicht-verdrahteter Button. Jeder Zustand real auslösbar: Code teilen, Code einlösen (Onboarding-Feld), Pending→Qualified→Rewarded-Statuslauf (im Seed simuliert, live via Webhook), Flag aus → sauberer `FEATURE_NOT_ENABLED`-Leerzustand, Käufer → kein Zugriff.

### 1.7 Audit & Dokumentation

- **Audit (Pfeiler 5):** `referral.redeemed` / `referral.reward_granted` / `referral.voided` (mit Reason bei `void`) in `audit_log` (existiert, `0001_core.sql`). Lesen der eigenen Sicht nicht auditpflichtig.
- **Doku & Tracker:** `docs/releases/PHASE_STATUS.md` (WAVE_08 → „Build schlank" **oder** „deferred Post-Launch", transparent) + `MASTER_INDEX.md`. Neues Spezialmodul-Dokument `docs/spezialmodule/EMPFEHLUNGSPROGRAMM.md` (Geschäftsregeln, Statusmaschine, Anti-Fraud, Abo-Verrechnung) bei Build-Pfad.
- **ADR** `.claude/memory/decisions/0005_bonus_credits_build_or_defer.md` (die Abwägung aus §1.0) + Pattern `.claude/memory/patterns/referral_ledger_idempotent.md` (Ledger + Unique-Ref-Idempotenz + verifizierter-Erfolg-Trigger — **Imperium-Beschleuniger** für alle 14 Plattformen).
- Wiederverwendbare Erkenntnis → 1 Zeile `.claude/learning/insights_inbox.md` (Kategorie WIRTSCHAFTLICHKEIT).

---

## 2. Konkrete Befehle

> Working-Dir für App-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich. **Alles lokal/kostenlos** — kein Account, kein Deploy in dieser Welle.

### 2.1 Lokal entwickeln & verifizieren (kostenlos, kein Account)
```bash
cd app
npm ci                 # Lockfile-treu (wie CI/Deploy)
npm run dev            # http://localhost:5409 — Empfehlungs-Seite im Seed-Modus (Flag lokal an)

# Verifikations-Gate
npm run typecheck      # tsc --noEmit (strict, noUnused*, noFallthrough) — referral.ts/types must pass
npm run build          # tsc --noEmit && vite build → app/dist (deterministisch)
npm run preview        # Prod-Build lokal prüfen
```

### 2.2 Migration & RLS lokal prüfen (Supabase CLI, lokaler Stack — kein Cloud-Account)
> Lokaler Docker-Postgres der Supabase-CLI nur für **Migrations-/RLS-/Idempotenz-Test** — das ist **kein** Self-Host-Deploy (Stack-Regel „kein Docker" betrifft Produktion/Hosting, nicht den lokalen Test-Runner).
```bash
cd app
supabase start                         # lokaler Postgres + Studio (nur Tests)
supabase db reset                      # spielt 0001→0004 frisch ein, inkl. seed.sql

# Referrals-Tabelle + Ledger-Erweiterung existieren & Constraints greifen
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -c "\d+ referrals"
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -c "\d+ credits_ledger"

# Idempotenz-Beweis: zweite Reward-Buchung mit gleichem (entry_type, ref) MUSS scheitern
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" <<'SQL'
insert into credits_ledger (org_id, amount_cents, reason, entry_type, ref)
  values ((select id from orgs limit 1), 1000, 'test', 'referral_reward', 'ref-xyz');
insert into credits_ledger (org_id, amount_cents, reason, entry_type, ref)
  values ((select id from orgs limit 1), 1000, 'test', 'referral_reward', 'ref-xyz');  -- erwartet: unique_violation
SQL

supabase db lint                       # Schema-/Policy-Lint
supabase stop
```

### 2.3 Edge-Function lokal servieren (Deno, lokal/kostenlos)
```bash
cd app
supabase functions serve referral-redeem --no-verify-jwt   # nur lokaler Test
# Smoke: Einlösen eines unbekannten Codes → NOT_FOUND (kein Existenz-Leak), nicht 500
curl -s -X POST http://localhost:54321/functions/v1/referral-redeem \
  -H "Content-Type: application/json" \
  -d '{"action":"redeem","code":"UNBEKANNT"}'   # erwartet: {"error":{"code":"NOT_FOUND"}}
```

### 2.4 Gezielte Tests & Disziplin-Greps (statt blind „alles")
```bash
cd app
npm run test           # vitest: referral.ts Saldo-Logik (Verfall, kein NaN) + can()-Tabelle
npm run test:rls       # Cross-Org: Werber-Org A sieht NIE referrals/credits von Org B (0 Zeilen)

# Geld in Cent (kein Float-Euro) in der Referral-Datenschicht
grep -nE "amount(_cents|Cents)|balanceCents" src/lib/referral.ts >/dev/null && echo "OK: Cent-Disziplin"
# service_role darf NICHT im Client auftauchen (nur in functions/referral-redeem)
grep -rn "service_role" src && echo "FAIL: service_role im Client!" || echo "OK"
# keine Hex-Farben außerhalb theme.css in neuen Referral-Dateien
grep -rniE "#[0-9a-f]{3,6}" src/components/referral src/pages/erzeuger/Referral* 2>/dev/null && echo "FAIL: Hex" || echo "OK"
# Zero-State vorhanden (kein Throw-only-Pfad)
grep -nE "available\s*:\s*false" src/lib/referral.ts && echo "OK: Zero-State vorhanden"
```

### 2.5 Cloud-Push (NICHT in dieser Welle — Owner-Freigabe, Account/Kosten)
> Erst nach ausdrücklicher Owner-Freigabe (EU-Projekt, kostenrelevant). Hier nur dokumentiert — **keine** Push-/Deploy-Aktion in WAVE_08.
```bash
supabase link --project-ref <ref>                 # nur mit Owner-Account/Freigabe
supabase db push                                  # additive Migration 0004 ausspielen (Freigabe)
supabase functions deploy referral-redeem         # Edge Function deployen (Freigabe)
```

---

## 3. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Abwägung & Wirtschaftlichkeit (Kern dieser Welle)**
1. ADR `0005_bonus_credits_build_or_defer.md` existiert, begründet Build vs. Defer entlang §0 (Owner-Wert, CAC, Marktstart-Risiko, Imperium-Wiederverwendung), und die Owner-Entscheidung ist festgehalten. Bei **Defer** endet die Welle hier (+ Tracker), **ohne** halbfertigen Code.

**Datenmodell & Isolation (Pfeiler 1)** *(Build-Pfad)*
2. `0004_referral_credits.sql` ist **additiv** auf dem vorhandenen `credits_ledger` (keine zweite Guthaben-Tabelle), mit dokumentiertem Rollback; `referrals` mit Statusmaschine, Selbst-Referral-Check und RLS deny-by-default.
3. Cross-Org-Negativtest (§2.4): Werber-Org A sieht **nie** `referrals`/`credits_ledger` von Org B (0 Zeilen, kein 200 mit Fremddaten, kein 500). Direkte Client-Inserts/Updates auf `referrals`/`credits_ledger` sind **abgelehnt** (keine Client-Schreib-Policy).

**Idempotenz & Anti-Fraud (Pfeiler 6)**
4. Doppelte Reward-Buchung mit gleichem `(entry_type, ref)` schlägt auf **DB-Ebene** fehl (Unique-Index, §2.2) — eine Empfehlung kann **nie** zweimal gutgeschrieben werden, auch bei Webhook-Retry.
5. Reward wird **nur** beim Übergang `qualified → rewarded` (verifizierter Erfolg) gebucht; reine Anmeldung/Code-Einlösung erzeugt **keinen** Credit. Selbst-Referral und „Org bereits geworben" werden serverseitig abgelehnt.

**Zero-State statt Error (Pfeiler 2)**
6. Ohne Empfehlungen/Guthaben: ehrlicher Zero-State (`available:false`, leere Liste, `0,00 €`) — kein 500, kein `NaN`, kein Fake-Guthaben. Saldo zählt nur gültige (nicht abgelaufene) Credits.

**RBAC & Feature-Flag (Pfeiler 4)**
7. Nur Erzeuger sehen `/erzeuger/empfehlungen`; Käufer/anon → kein Navi-Eintrag, Direktaufruf → Zero-State „Kein Zugriff", keine Daten. Neue `can()`-Aktionen zentral (keine Inline-Rollenchecks).
8. Feature-Flag `referral_program` aus → Menüpunkt unsichtbar, Function antwortet `FEATURE_NOT_ENABLED`; Flag an → voll bedienbar. „Schlank jetzt, scharf später" ist ein echter Schalter.

**Fehlersemantik & Audit (Pfeiler 5 + WAVE_03-Konvention)**
9. Unbekannter/fremder Code → `NOT_FOUND` (nie Existenz-Leak), Zod-Verstoß → `VALIDATION_FAILED`, fehlende Bedingung → `PERMISSION_DENIED`/No-op. Jede Mutation erzeugt genau einen `audit_log`-Eintrag; Staff-`void` mit Reason-Pflicht.

**Vermittler-Konformität & Geld-Disziplin**
10. UI verspricht **keine** Barauszahlung — Guthaben ausschließlich „Verrechnung mit Abo"; Disclaimer durchgängig. Alle Beträge in Cent (Integer), kein Float-Euro (Grep §2.4).

**Build, Typsicherheit & Design**
11. `npm run typecheck` + `npm run build` grün; neue Typen ohne `any`; kein `service_role` im `src/`; keine Hex-Farben/externen Fonts in Referral-Dateien; Konsole frei von `TypeError`/401-Schleifen.
12. Tests laufen real (nicht still geskippt), Pfade relativ zur Testdatei; Doku/Tracker/ADR/Pattern auf realem Stand; dieses File ohne TODOs/Platzhalter.

---

## 4. Gate (Übergang zu WAVE_09)

> Diese Welle ist `optional` und **blockiert den Marktstart nicht** (`PHASEN.md` Marktstart-Pflicht-Set). Ohne grünes Gate startet dennoch keine Folge-Welle mit Abhängigkeit.

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **Abwägungs-Gate** (blockierend) | ADR mit Build/Defer-Entscheidung vorhanden, Owner bestätigt | §3.1 + ADR |
| **Isolations-Gate** (blockierend, bei Build) | Werber-Org sieht nur Eigenes; Cross-Org/Client-Write → abgelehnt/0 Zeilen | §2.4 (`db-rls-spezialist` + `qa-tester`) |
| **Idempotenz-Gate** (blockierend, bei Build) | Doppelte Reward-Buchung scheitert auf DB-Ebene; nur verifizierter Erfolg löst aus | §2.2/§3.4–5 |
| **Zero-State-Gate** | leere Daten → ehrlicher Leerzustand, kein 500/`NaN`/Fake-Guthaben | §3.6 |
| **RBAC/Flag-Gate** | nur Erzeuger; Käufer ohne Zugriff; Flag-Schalter wirkt; Server führend | §3.7–8 + `security-auditor` |
| **Vermittler-Gate** | keine Barauszahlung versprochen; Disclaimer; Geld in Cent | §3.10 + `compliance-officer` |
| **Build/Type-Gate** (blockierend) | `npm ci && npm run build` grün; additive Migration mit Rollback; keine `any` | §2.1 + CI |
| **Secret-Gate** (blockierend) | kein `service_role`/Secret im Client/dist; nur `VITE_`-Keys | Grep §2.4 + `security-auditor` |

**Stop-Regeln (anhalten, minimalen Fix vorschlagen, auf OK warten):**
- Bargeld-/IBAN-Payout statt Abo-Rabatt gefordert → STOP (Compliance/Steuer/Connect-Welle, Owner-Entscheidung).
- Auslöse-Bedingung des Credits unklar (Abo-Zahlung vs. Verifizierung) → STOP, im ADR entscheiden, **kein** Bonus ohne fälschungssichere Bedingung.
- Reward-Buchung schlägt **permissiv** doppelt durch (Idempotenz greift nicht) → **sofort P0** (Geld-/Fraud-Lücke).
- Live-Stripe-/Auth-Go-Live, Domain, echter Key nötig → gehört in WAVE_06/WAVE_09, Owner-Freigabe.

**Nächste Welle:** `WAVE_09 — Billing` (Stripe-Abo Erzeuger + Vorbereitung SB-Bezahl-USP). WAVE_09 **schließt den Kreis**: der Reward-`grant` aus §1.2 wird dort aus dem **idempotenten Stripe-Webhook** bei erster bezahlter Abo-Periode der geworbenen Org ausgelöst, und das Erzeuger-Credit wird beim nächsten Abo-Zyklus **verrechnet**.

---

## 5. Abschlussbericht

```
## Welle abgeschlossen: WAVE_08 — Bonus/Credits (Empfehlung/Referral, schlank)
- Entscheidung:
  · ADR 0005_bonus_credits_build_or_defer.md → "schlank jetzt, scharf später" (Flag-gegated)
    ODER "deferred to Post-Launch (nach Gate 10)" — Owner-bestätigt, wirtschaftlich begründet.
- Geändert (Build-Pfad):
  · app/supabase/migrations/0004_referral_credits.sql → credits_ledger additiv erweitert
    (entry_type-Enum, expires_at, amount<>0, Unique-Idempotenz-Index (entry_type, ref));
    neue Tabelle referrals (Statusmaschine pending→signed_up→qualified→rewarded + expired/void,
    Selbst-Referral-Check), RLS deny-by-default (Werber liest Eigenes, Schreiben nur service_role)
    + dokumentierter Rollback.
  · app/supabase/functions/referral-redeem/index.ts → redeem + idempotenter grant (service_role nur
    hier), guard.ts/errors.ts (WAVE_03), Zod, Audit (referral.redeemed/reward_granted/voided).
  · src/lib/referral.ts → Dual-Source (Function ↔ Seed), Saldo (Verfall, kein NaN), Cent-Disziplin.
  · src/lib/types.ts → CreditEntry/CreditBalance/Referral/ReferralResult (single source, kein any).
  · src/lib/rbac.ts → referral.read.own/share.own/void.any (zentral, keine Inline-Checks).
  · src/pages/erzeuger/ReferralPage.tsx (+ /erzeuger/empfehlungen) → Flag-gegated, RBAC, Zero-State.
  · src/components/referral/{ReferralCard,ReferralList,CreditBalanceCard}.tsx → Editorial-Token,
    Lade/Leer/Fehler/OK real, Vermittler-Disclaimer (keine Barauszahlung), A11y + Mobile.
  · docs/spezialmodule/EMPFEHLUNGSPROGRAMM.md neu; PHASE_STATUS.md + MASTER_INDEX.md auf realen Stand;
    Pattern referral_ledger_idempotent.md (Imperium-Beschleuniger).
- Tests/Verifikation:
  · supabase db reset (0001→0004) grün; Idempotenz: doppelter (entry_type, ref) → unique_violation.
  · Cross-Org: Werber A sieht nie referrals/credits von B (0 Zeilen); Client-Write abgelehnt.
  · Reward nur bei qualified→rewarded; reine Anmeldung/Selbst-Referral abgelehnt.
  · Zero-State: leere Daten → 0,00 €, kein 500/NaN/Fake; Flag aus → FEATURE_NOT_ENABLED.
  · npm run typecheck/build grün; Greps: Cent-Disziplin, kein service_role im Client, keine Hex.
- Risiken:
  · Niedrig (additiv, Flag-gegated, Default aus). Hauptrisiko Doppelgutschrift → DB-Unique-Index
    + Webhook-Idempotenz (Pattern wie payment_events). Auszahlung bewusst ausgespart.
  · Offen (Owner-Freigabe): Cloud-db push 0004 + functions deploy; Auslöse-Verdrahtung aus
    Stripe-Webhook (WAVE_09); echte EU-Keys (WAVE_06). Rollback = drop referrals + git revert.
- Nächste Welle: WAVE_09 — Billing (Stripe-Abo + SB-USP-Vorbereitung); schaltet Reward-Trigger
  aus dem idempotenten Webhook scharf und verrechnet Credits mit dem Abo.
```

---

## 6. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive — v. a. 3 Wirtschaftlichkeit, 1 Lückenlosigkeit; 7 Produktionspfeiler 1/2/4/5/6; Vermittler-Rolle, Stop-Regeln, Verbote), `AGENTS.md` (harte Regeln, Subagenten), `PHASEN.md` (Phase 1 → WAVE_08 `optional`, Marktstart-Pflicht-Set).
- **Landkarte:** `MASTER_INDEX.md` (§3 Spezialmodule, §7 `finalization/WAVE_00…15`).
- **Reale Artefakte (Bestand), auf denen diese Welle aufsetzt:**
  - `app/supabase/migrations/0003_marketplace.sql` — **`credits_ledger`** (Zeile 107 ff.: `org_id/amount_cents/reason/ref/created_at`, RLS `credits_owner_read` via `is_org_member`, Schreiben service_role), `org_members`/`is_org_member()`.
  - `app/supabase/migrations/0002_payments.sql` — `subscriptions` (Abo-Verrechnung), `payment_events` (Idempotenz-Pattern für die Reward-Buchung), `payment_status`.
  - `app/supabase/migrations/0001_core.sql` — `orgs/profiles/audit_log`, Enum `user_role`, RLS deny-by-default.
  - `app/supabase/functions/_shared/{guard,errors}.ts` (WAVE_03) — `requireUser/requireRole/requireOrgMember`, kanonische Fehlercodes (`NOT_FOUND`/`FEATURE_NOT_ENABLED`/`VALIDATION_FAILED`/`PERMISSION_DENIED`).
  - `app/src/lib/{data,payments,seed,types}.ts` — Dual-Source-Muster, Case-Mapping-Grenze, Cent-Geld-Disziplin, Seed-Quelle für den Offline-/Demo-Pfad.
  - `app/src/lib/rbac.ts` (WAVE_03) — zentrale `can()`-Quelle, hier um Referral-Aktionen erweitert.
  - `app/src/styles/theme.css` — Editorial-Token-Kanon (Quelle aller Farben/Radien/Schatten).
- **Neue Artefakte dieser Welle (Build-Pfad):** `0004_referral_credits.sql`, `functions/referral-redeem/index.ts`, `src/lib/referral.ts`, `src/pages/erzeuger/ReferralPage.tsx`, `src/components/referral/{ReferralCard,ReferralList,CreditBalanceCard}.tsx`, `docs/spezialmodule/EMPFEHLUNGSPROGRAMM.md`, ADR `0005_bonus_credits_build_or_defer.md`, Pattern `referral_ledger_idempotent.md`.
- **Subagenten (Delegation):** `architekt`/Owner (Build-vs-Defer-ADR) · `db-rls-spezialist` (Ledger-Erweiterung/`referrals`/Isolationstest) → `qa-tester` (Idempotenz/Cross-Org/Zero-State) · `payment-engineer` + `edge-functions-spezialist` (idempotente Gutschrift, Webhook-Verdrahtung WAVE_09) · `compliance-officer` (Vermittler/keine Barauszahlung) · `frontend-design-guardian` (Token/UI) · `security-auditor` (service-role, RLS, read-only).
- **Plattform-Pfeiler dieser Welle:** Wirtschaftlichkeits-Abwägung als ADR · Org-Boundary (RLS auf Ledger/`referrals`) · DB-Idempotenz (Unique-Ref) · verifizierter-Erfolg-Trigger statt Klick · Vermittler-Konformität (Abo-Rabatt statt Payout) · Feature-Flag-Schaltbarkeit (Imperium-Beschleuniger für 20+ Plattformen).

> Diese Welle ist **additiv, Flag-gegated und Marktstart-neutral**. Für jeden kosten-/außenwirksamen Schritt (Supabase-`db push`/`functions deploy`, Cloudflare-Deploy, echte Keys, Live-Stripe/Auth) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
