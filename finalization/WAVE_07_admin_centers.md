# WAVE 07 — Staff-/Support-Andockung (Hof-Verifizierung · Eskalation · Support-Tickets)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> Phase 1 · `PHASEN.md` → Phase 1, **WAVE_07 Staff/Support-Andockung**. **Eine Welle pro Session.**
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Disclaimer durchgängig.
> **Andocken statt neu bauen:** Staff-/Support-Center ist **Kern** des ConnectCore-Imperiums (EIN gemeinsames Center für 14 Plattformen). LokaleBauernConnect liefert die **Spezial-Schicht** (Hof-Verifizierung, Eskalations-Trigger) und **dockt** an den geteilten Support-/Audit-Kern **an** — es baut keine zweite Support-Maschine.
> **Adaptiert** aus dem TempConnect-Blueprint (read-only; das BBQ-Original bleibt unangetastet). VMS-Begriffe sind **konsequent** auf die Hof-Domäne übersetzt: Vendor-Onboarding → **Hof-Verifizierung**, SCC/Operations-Konsole → **Staff-Konsole (Supabase/Cloudflare-Sicht)**, „Vendor Pool/Requisition/Einsatzportal/Stundenzettel" kommen **nicht** vor.
> Voraussetzung: **WAVE_02** (Datenmodell+RLS, deny-by-default + Isolationstest), **WAVE_03** (Rollen/Sichtbarkeit) und **WAVE_06** (Auth/Turnstile/RLS-Härtung) grün. Diese Welle ergänzt **additiv** Staff-/Support-Tabellen + RLS + Edge-Funktionen + eine Staff-Konsole-UI.

---

## 0. Ziel

Eine **production-ready, mandantensichere Staff-/Support-Andockung**, die drei Geschäftsfunktionen lückenlos und end-to-end verdrahtet liefert — alle mit serverseitigem Org-Scope, Pflicht-`reason` bei kritischen Aktionen, unabschaltbarem Audit und Zero-State statt Fehler:

1. **Hof-Verifizierung** — Staff prüft eingereichte Höfe (Identität/Standort/Lebensmittel-Kennzeichnungs-Hinweis) und setzt `farms.verified` über einen **revisionssicheren Statusübergang** (`eingereicht → in_pruefung → verifiziert | abgelehnt | gesperrt`), nie per blindem Spalten-Update. Jede Entscheidung ist begründet (`reason` Pflicht), auditiert und für den Erzeuger nachvollziehbar.
2. **Eskalation** — ein einheitlicher Eskalations-Trigger: Käufer, Erzeuger und das System können einen Vorgang (Hof, Reservierung, SB-Zahlung, Review, allgemein) zur Staff-Prüfung hochstufen. Eskalationen sind priorisiert (`niedrig/mittel/hoch/kritisch`), einem Staff-Mitglied zuweisbar und mit klar definiertem Lebenszyklus (`offen → in_bearbeitung → geloest | abgelehnt`).
3. **Support-Tickets (Kern)** — der geteilte Support-Posteingang: Käufer/Erzeuger eröffnen Tickets (auch anonym, Turnstile-geschützt), Staff bearbeitet sie in einem Thread (Nachrichten + interne Notizen, sichtbar getrennt), Status-Lebenszyklus (`offen → wartend → in_bearbeitung → geloest → geschlossen`), SLA-Stempel (`first_response_at`, `resolved_at`).

Quer dazu — als sichtbarer Pfeiler dieser Welle — **strikte Welten-Trennung** (Pfeiler 4): Käufer-, Erzeuger- und **Staff**-Sicht sind über RLS getrennt; Staff ist die **einzige** Rolle mit org-übergreifender Lese-/Bearbeitungs-Hoheit, und genau das wird im Isolationstest negativ wie positiv geprüft. Eine Staff-Aktion ohne `reason` + Audit ist in diesem Produkt ein Bug.

**Nicht-Ziel dieser Welle:** keine zweite, plattformeigene Support-Suite (der Support-/Audit-**Kern** wird angedockt, nicht dupliziert); kein E-Mail-Ticket-Gateway/Inbound-Parsing (Post-Launch); keine KI-Auto-Triage (später, Phase 5); keine Live-Supabase/Cloudflare-Anbindung erzwingen (Account-/Kosten-relevant → Owner-Freigabe). Die Welle liefert **Schema + RLS + Edge-Funktionen (Deno) + Staff-Konsole-UI + Test**, lokal prüfbar über die Supabase-CLI.

---

## 1. Ist-Zustand (repo-genau geprüft)

| Fakt | Stand | Konsequenz für diese Welle |
|---|---|---|
| `app/supabase/migrations/0001_core.sql` | `farms.verified boolean default false`, `user_role enum ('kaeufer','erzeuger','staff','owner')`, `audit_log` (org_id, actor_user_id, action, entity_type, entity_id, **reason**, details jsonb), `set_updated_at()` | `verified`-Flag + `staff`-Rolle + Audit-Tabelle existieren bereits → diese Welle baut den **Statusübergang** und die **Staff-Schreibrechte** darauf, ohne sie neu zu erfinden. |
| `app/supabase/migrations/0003_marketplace.sql` | `is_org_member(uuid)` (security definer, prüft nur `auth.uid()`), `org_members`, `reviews(status)`, `org_locations(is_unmanned)`, Owner-Policies auf Multi-Org gehoben | `is_org_member()` ist die kanonische Org-Zugehörigkeit. Diese Welle ergänzt die kanonische **`is_staff()`/`is_owner()`-Hilfe** (Rolle `staff`/`owner`) als einzige org-übergreifende Schreib-/Lese-Hoheit. |
| `farms.verified` | Boolean ohne Statushistorie/Workflow | Bewusste Lücke: Verifizierung braucht **Workflow + Audit-Trail**, nicht nur ein Flag. Additiv: `farm_verification`-Status + Log; `verified` bleibt das abgeleitete, indexierte Schnell-Flag (eine Wahrheit, kein Schatten). (ADR-pflichtig.) |
| `audit_log` | unabschaltbar, nur per `service_role` beschreibbar (keine anon/auth-Policy) | Jede Staff-Mutation dieser Welle schreibt über die Edge-Funktion (`service_role`) eine `audit_log`-Zeile mit `action` im Namespace `support.*` / `farm_verification.*` und Pflicht-`reason`. |
| `app/supabase/functions/_shared/` | `supabaseAdmin.ts`, `cors.ts`, `email.ts`, `stripe.ts`; Edge-Funktionen `create-checkout`, `stripe-webhook` | Edge-Pattern (Deno + service_role nur hier + CORS + Zod) steht → Staff-Mutationen laufen über **neue** Edge-Funktionen analog (`farm-verify`, `support-action`), nicht über Client-Direktschreiben. |
| `app/src/lib/data.ts` · `supabase.ts` · `types.ts` | Dual-Source-Datenschicht (Seed ↔ Supabase via `isSupabaseConfigured`), `snake_case`↔`camelCase` an der Grenze | Staff-Konsole nutzt **dieselbe** Dual-Source-Schicht (neue `lib/support.ts`), ist also ohne Account voll bedienbar (kein toter Pfad), Demo-Stand klar gekennzeichnet. |
| `app/src/App.tsx` (Routing-Einstieg) | bestehender Router, Käufer/Erzeuger-Seiten | Staff-Konsole wird **additiv** eingehängt (`/staff/*`), hinter RBAC-Gate (`staff`/`owner`) — keine Parallel-Shell, keine zweite App. |

> **Abweichung zum Titel dokumentiert (Stop-Regel „Datenmodell für Zielzustand"):** „admin_centers" wird **nicht** als generisches Admin-Tool gebaut. Im Kanon ist das Staff-/Support-Center **Kern** (EIN Center für 14 Plattformen). Diese Welle liefert deshalb die **Andockung** (Hof-Spezial-Verifizierung + Eskalations-/Ticket-Schema mit `platform_key='lokalebauern'`-tauglichem Zuschnitt), damit das Muster in 20 weiteren Plattformen wiederverwendbar ist (Imperium-Beschleuniger). Begründung als ADR (`.claude/memory/decisions/`).

---

## 2. Aufgaben

### 2.1 Verifikation des Bestands (kein Rebuild — Inkrementell-Regel)
- `0001…0003` (+ ggf. das in WAVE_02/05 belegte `0004`) werden **gelesen und verifiziert**, nicht neu geschrieben. Prüfpunkte: `farms.verified` vorhanden, `user_role`-Enum hat `staff`/`owner`, `audit_log` schreibbar nur via `service_role`, `is_org_member()` ist die kanonische Org-Zugehörigkeit.
- **Migrationsnummer additiv wählen:** die neue Migration ist die **nächste freie** vierstellige Nummer nach dem realen Stand (z. B. `0005_staff_support.sql`, falls `0004_*` durch WAVE_02/05 belegt ist). Niemals eine bestehende Migration ändern.

### 2.2 Additive Migration `00NN_staff_support.sql` (das neue SQL)
Vierstellig, additiv, **idempotent** (`if not exists` / `drop policy if exists` / `do $$ … exception when duplicate_object`), mit **Rollback-Block** im Kopfkommentar. Inhalt:

1. **Kanonische Staff-/Owner-Hilfe** — `is_staff()` (`stable security definer`, prüft **nur** `auth.uid()` gegen `profiles.role in ('staff','owner')`) und `is_owner()` analog. Eine einzige Quelle für „darf org-übergreifend". `search_path = public` gesetzt (Injection-Schutz wie bei `is_org_member`).
2. **Verifizierungs-Workflow** (Hof-Spezial-Schicht):
   - Enum `verification_status as enum ('eingereicht','in_pruefung','verifiziert','abgelehnt','gesperrt')`.
   - Spalte `farms.verification_status verification_status not null default 'eingereicht'` (additiv; `verified` bleibt als abgeleitetes Schnell-Flag und wird per Trigger konsistent gehalten: `verified = (verification_status = 'verifiziert')` — eine Wahrheit, kein Schatten).
   - Tabelle `farm_verification_log` (Historie): `id uuid pk`, `farm_id text → farms`, `org_id uuid → orgs`, `from_status verification_status`, `to_status verification_status not null`, `reason text not null` (Pflicht), `decided_by uuid` (auth user, `set null` on delete), `created_at timestamptz default now()`. Index `(farm_id, created_at desc)`.
3. **Eskalationen** — `escalations`:
   - `id uuid pk`, `org_id uuid → orgs` (Ziel-Org des Vorgangs, nullable bei plattformweit), `subject_type text check in ('farm','reservation','sb_payment','review','general')`, `subject_id text`, `priority text check in ('niedrig','mittel','hoch','kritisch') default 'mittel'`, `status text check in ('offen','in_bearbeitung','geloest','abgelehnt') default 'offen'`, `title text not null`, `description text`, `created_by uuid` (nullable für System/anon), `assigned_to uuid` (Staff), `resolution text`, `created_at`, `updated_at` (+ `set_updated_at`-Trigger), `resolved_at timestamptz`.
   - Indizes: `(status, priority, created_at desc)`, `(assigned_to) where assigned_to is not null`, `(org_id)`.
4. **Support-Tickets (Kern-Andockung)** — `support_tickets` + `support_messages`:
   - `support_tickets`: `id uuid pk`, `org_id uuid` (nullable: Käufer-Tickets ohne Org), `requester_user_id uuid` (nullable für anon), `requester_email text`, `requester_name text`, `category text check in ('hof','reservierung','zahlung','konto','sonstiges') default 'sonstiges'`, `priority text` (s. o.), `status text check in ('offen','wartend','in_bearbeitung','geloest','geschlossen') default 'offen'`, `subject text not null`, `assigned_to uuid`, `first_response_at`, `resolved_at`, `created_at`, `updated_at` (+ Trigger).
   - `support_messages`: `id uuid pk`, `ticket_id uuid → support_tickets on delete cascade`, `author_user_id uuid` (nullable anon), `author_kind text check in ('requester','staff','system') not null`, `body text not null check (char_length(body) between 1 and 5000)`, `internal boolean not null default false` (interne Staff-Notiz — **nie** für Requester sichtbar), `created_at`. Index `(ticket_id, created_at)`.
5. **RLS deny-by-default für alle vier neuen Tabellen** (Detail in 2.3).
6. **Negativ-Garantie-Inventar** als Kommentar am Dateiende: Tabellen ohne anon/auth-Schreibpfad außer Insert (alle Staff-Mutationen laufen über `service_role`/Edge), und der Hinweis, dass `internal`-Nachrichten **niemals** über eine Requester-Lese-Policy laufen.

> Alle Ergänzungen sind **additiv und semantik-erhaltend**. Retrofit-Risiko niedrig; Rollback = `drop`-Block im Migrationskopf (Tabellen + Enum + Trigger + Helfer). `farms.verified` behält seine bestehende Semantik (jetzt trigger-konsistent zum Status).

### 2.3 RLS-Matrix (deny-by-default, Welten-Trennung)

| Tabelle | anon | authenticated (Requester/Erzeuger) | Staff/Owner (`is_staff()`) | Schreiben |
|---|---|---|---|---|
| `farm_verification_log` | – | Erzeuger **read** der eigenen Org (`is_org_member(org_id)`) | **read** alle | nur `service_role` (Edge `farm-verify`) |
| `escalations` | **insert** (Turnstile, valide Felder) | **read/insert** der eigenen Org bzw. selbst erstellte; **kein** Cross-Org | **read/update** alle (`is_staff()`) | Requester-Insert (RLS) · Staff-Update via `service_role` (Edge `support-action`) |
| `support_tickets` | **insert** (Turnstile) | **read** eigene Tickets (`requester_user_id = auth.uid()` **oder** `is_org_member(org_id)`); **insert** | **read/update** alle (`is_staff()`) | Insert (RLS) · Status/Assign via Edge |
| `support_messages` | **insert** an eigenes Ticket (nur `internal=false`) | **read** Nachrichten eigener Tickets **mit `internal=false`**; **insert** (`internal=false`) | **read/insert** alle (inkl. `internal=true`) | s. o.; `internal=true` **ausschließlich** Staff |

- **Welten-Trennung wasserdicht:** Requester sehen **nie** `internal`-Notizen (Policy filtert `internal = false` außer für `is_staff()`); Erzeuger sehen **nie** fremde Org-Daten; Käufer haben keinerlei org-übergreifenden Lesepfad. Staff/Owner sind die **einzige** org-übergreifende Hoheit (`is_staff()`), negativ wie positiv getestet.
- **Insert-Disziplin (`with check`):** Eskalation/Ticket-Insert validiert Feldlängen + erlaubte Enum-Werte; ein Requester kann ein Ticket **nicht** mit fremder `assigned_to`/`status`-Hoheit anlegen (diese Felder setzt nur die Edge-Funktion über `service_role`).

### 2.4 Edge-Funktionen (Deno — service role nur hier, Zod, Rechteprüfung, Audit)
Zwei neue Funktionen analog zum Bestands-Pattern (`_shared/cors.ts`, `_shared/supabaseAdmin.ts`):

1. **`app/supabase/functions/farm-verify/index.ts`** — Staff entscheidet über einen Hof.
   - Eingang: JWT (Pflicht) → Rechteprüfung `is_staff()` serverseitig (nicht nur Client). Zod-Body: `{ farmId: string, decision: 'in_pruefung'|'verifiziert'|'abgelehnt'|'gesperrt', reason: string (min 5) }`.
   - Aktion: Statusübergang prüfen (erlaubte Kante?), `farms.verification_status` + abgeleitetes `verified` setzen, `farm_verification_log`-Zeile + `audit_log` (`action='farm_verification.decide'`, `reason` Pflicht) schreiben. Idempotenz: gleiche Entscheidung auf gleichen Status = no-op + 200.
   - Optional: `email.ts` benachrichtigt den Erzeuger über die Entscheidung (kein Secret im Log).
2. **`app/supabase/functions/support-action/index.ts`** — Staff bearbeitet Eskalation/Ticket.
   - Rechteprüfung `is_staff()`. Zod-Discriminated-Union: `{ kind:'assign'|'status'|'reply'|'note', ... reason }`.
   - `assign` → `assigned_to`; `status` → Lebenszyklus-Übergang prüfen; `reply` → `support_messages(author_kind='staff', internal=false)` + ggf. `first_response_at`; `note` → `internal=true`. Jede Aktion → `audit_log` (`action='support.<kind>'`, `reason` bei `status`/`assign` Pflicht).
   - Zentraler Eingangs-Guard: Turnstile **nur** für öffentliche Insert-Flows (das macht die RLS-Insert-Policy + ein leichtgewichtiger Public-Edge bzw. direkter RLS-Insert im Client). Staff-Aktionen sind JWT-gebunden, kein Turnstile nötig.

> service_role **nur** in diesen Funktionen; Frontend nutzt ausschließlich `VITE_`-Public-Keys. Alle Edge-Antworten: Zero-State sauber (`{ ok:true, data }` / `{ ok:false, error }`), nie 500 bei leerer/abgelehnter Eingabe — `400/403` mit klarer Meldung.

### 2.5 Datenschicht — `lib/support.ts` (Dual-Source, typisiert)
- Neue Datei `app/src/lib/support.ts` nach dem Muster aus `lib/data.ts`: bei `isSupabaseConfigured` real gegen die Tabellen/Edge-Funktionen; sonst deterministisch aus erweitertem `lib/seed.ts` (Demo-Eskalationen/-Tickets, **klar gekennzeichnet**, kein Fake in Prod-UI). Identische API/Shape.
- **Domänentypen** in `lib/types.ts` (single source, keine `any` an der Grenze): `VerificationStatus`, `FarmVerification`, `Escalation`, `SupportTicket`, `SupportMessage`, `StaffQueueItem`. Case-Mapping (`snake_case`↔`camelCase`) ausschließlich hier.
- Mutationen (Verify/Assign/Status/Reply/Note) rufen die Edge-Funktionen; Lesepfade lesen RLS-gefiltert. Division-/Leerfälle → neutrale Defaults, kein `NaN`/Throw.

### 2.6 UI — Staff-Konsole (Editorial-Token-Kanon, keine neuen Farben/Emojis)
- **Route-Gruppe `/staff/*`** additiv in `app/src/App.tsx`, hinter RBAC-Gate (`profiles.role in ('staff','owner')`; Käufer/Erzeuger → Zero-State „Kein Zugriff für diese Rolle" + Pfad zurück, **kein** 200 mit Fremddaten). Server bleibt führend (RLS), Client-Guard ist UX.
- **`StaffQueuePage`** — vereinte Arbeitsliste: offene Verifizierungen + Eskalationen + Tickets, nach Priorität/Alter sortiert, Scope-Badge (Plattform), Filter (Typ/Status/Priorität). Echte Counts, Zero-State („Keine offenen Vorgänge"), Lade-/Fehlerzustand.
- **`FarmVerificationDetail`** — Hof-Stammdaten + Verlauf (`farm_verification_log`), Entscheidungs-Aktion mit **Pflicht-Reason-Feld**, Confirm-Dialog, Risiko-Hinweis (`gesperrt` = hoch). Deep-Link aus der Queue.
- **`SupportTicketDetail`** — Thread (Requester-/Staff-Nachrichten getrennt dargestellt; interne Notizen sichtbar **nur** für Staff, klar als intern markiert), Antworten/Notiz/Status/Assign-Aktionen mit gebundenen Handlern, SLA-Stempel sichtbar.
- **`EscalationDetail`** — Vorgang + verlinktes Subjekt (Deep-Link zu Hof/Reservierung), Assign/Status/Resolve mit Reason.
- **End-to-End-Pflicht:** jede Aktion verdrahtet (Edge-Endpoint → realer Fetch → DOM-Update → Lade/Leer/Fehler → Refresh). Kein toter Button, kein Platzhalter. User-Werte escaped. Tokens aus `app/src/styles/theme.css`.
- **Vermittler-Disclaimer durchgängig:** Verifizierung bestätigt **formale** Plausibilität (Existenz/Standort/Kennzeichnungs-Hinweis), **keine** Produkt-/Qualitäts-/Beratungsgarantie. Hinweis sichtbar in Verifizierungs-UI und Erzeuger-Benachrichtigung.

### 2.7 Isolations-/Verhaltens-Test (additiv zur WAVE_02-Harness)
Erweiterung von `app/supabase/tests/isolation.test.mjs` (bzw. neue `staff_support.test.mjs` mit gemeinsamem `_clients.mjs`), vier Identitäten: `anon`, **Erzeuger A** (`org …0001`), **Erzeuger B** (`org …0002`), **Staff** (`profiles.role='staff'`).

| # | Identität | Aktion | Erwartung |
|---|---|---|---|
| S1 | anon | `insert escalations` (valide) | OK (öffentlicher Eskalations-Eingang) |
| S2 | anon | `insert support_messages internal=true` | **abgelehnt** (`with check`) |
| S3 | Erzeuger A | `select escalations where org_id=…0002` | **0 Zeilen** (Cross-Org dicht) |
| S4 | Erzeuger A | `select support_messages` (internal=true) | **0 Zeilen** (interne Notizen unsichtbar) |
| S5 | Erzeuger A | `update farms.verification_status` (eigener Hof) | **abgelehnt** (nur Edge/`service_role` darf verifizieren) |
| S6 | Staff | `select escalations / support_tickets` (alle Orgs) | OK, org-übergreifend (`is_staff()`) |
| S7 | Staff | `select support_messages internal=true` | OK (interne Notizen sichtbar) |
| S8 | Käufer (kaeufer) | Direktaufruf `/staff/*` | Zero-State „Kein Zugriff" (UI) **und** 0 Zeilen via RLS (DB) |
| S9 | leere Queue | `select` Staff-Queue | leeres Array, **kein 500** (Zero-State) |
| S10 | Edge `farm-verify` | ohne Staff-JWT | **403**, keine Mutation, kein Audit-Leak |

> Test = Spezifikation (§0.9): rote Assertion = RLS-/Rechte-Leck = Merge blockiert. Pfade via `import.meta.url` (kein stiller Skip). Schärfe-Probe: künstlich zu weite Staff-Policy ⇒ Test rot, nach `db reset` grün.

### 2.8 Dokumentation, ADR & Tracker
- ADR `.claude/memory/decisions/` — „Staff-/Support-Center wird angedockt (Kern), nicht dupliziert", „Verifizierung als Workflow + Log (statt nacktem `verified`-Flag)".
- `docs/spezialmodule/` — Abschnitt „Hof-Verifizierung & Staff-Andockung" (Statusmaschine, RLS-Matrix, Audit-Namespace).
- `docs/CORE_BUSINESS_STATE_MACHINES.md` (Soll laut MASTER_INDEX) — Verifizierungs-, Eskalations-, Ticket-Lebenszyklus als verbindliche Soll-Spezifikation.
- `app/supabase/README.md`, `docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md` auf realen Stand ziehen. Wiederverwendbares Muster (Support-Andockung + `is_staff()`) → `.claude/memory/patterns/`.

---

## 3. Konkrete Befehle

> Working-Dir für App-/DB-Befehle: `app/`. Node ≥ 20 (`.nvmrc`). Windows-PowerShell-tauglich. Supabase-CLI fährt eine **lokale** Postgres-Instanz hoch (kein Self-Host, kein Account) — RLS-Tests kostenlos.

### 3.1 Lokale Supabase-DB + Edge-Funktionen (kostenlos, kein Account)
```bash
cd app
npm i -D supabase            # einmalig, falls nicht vorhanden
npx supabase --version
npx supabase start           # Postgres + Auth + Edge-Runtime lokal (gibt anon/service_role aus)
```

### 3.2 Neue Migration anlegen, anwenden, Seed einspielen
```bash
cd app
# Nächste freie Nummer verwenden (z. B. 0005_staff_support.sql) — niemals bestehende ändern:
# (Datei manuell in app/supabase/migrations/ erstellen — additiv, idempotent, mit Rollback-Block)
npx supabase db reset        # wendet ALLE Migrationen + supabase/seed.sql an (idempotent)
```

### 3.3 Edge-Funktionen lokal bedienen/prüfen
```bash
cd app
npx supabase functions serve farm-verify support-action --no-verify-jwt=false
# Staff-Aktion (Beispiel, lokaler JWT aus supabase start):
# curl -i -X POST "$SUPABASE_URL/functions/v1/farm-verify" \
#   -H "Authorization: Bearer <staff-jwt>" -H "Content-Type: application/json" \
#   -d '{"farmId":"hof-sonnenwiese","decision":"verifiziert","reason":"Standort & Kennzeichnung geprüft"}'
# Erwartet 200 + audit_log-Zeile; ohne Staff-JWT → 403 (S10).
```

### 3.4 Tests (das Acceptance-Gate dieser Welle)
```bash
cd app
npm run db:test              # = node --test supabase/tests/*.test.mjs (T1–T12 aus WAVE_02 + S1–S10)
# Erwartet: alle grün. Ein rotes S* = RLS-/Rechte-Leck = Merge blockiert.
```
`app/package.json` → `scripts` additiv (bestehende nicht entfernen):
```jsonc
"db:test": "node --test supabase/tests/isolation.test.mjs supabase/tests/staff_support.test.mjs"
```

### 3.5 Build-/Typ-Gate
```bash
cd app
npm run typecheck            # strict — neue Typen (Escalation/SupportTicket/…) ohne any
npm run build                # tsc --noEmit && vite build → dist/  (Staff-Konsole baut sauber)
```

### 3.6 Schärfe-Probe (Test muss Lecks fangen)
```bash
cd app
# Temporär zu weite Policy einschleusen (Wegwerf-Branch), z. B.:
#   create policy LEAK on support_messages for select to authenticated using (true);
# npm run db:test  → MUSS rot werden (S4/S7). Danach verwerfen:
npx supabase db reset
```

### 3.7 Go-Live (NUR mit Owner-Freigabe — Account/Kosten; nicht Teil dieser Welle)
```bash
# supabase login                          # Owner-Account
# supabase link --project-ref <eu-ref>    # EU-Projekt (Freigabe)
# supabase db push                        # additive Migration(en) (Freigabe)
# supabase functions deploy farm-verify support-action   # Edge (Freigabe)
# Secrets via: supabase secrets set ...   (nie ins Repo)
```

---

## 4. Acceptance (Abnahmekriterien — alle müssen grün sein)

**Schema & Workflow**
1. `npx supabase db reset` wendet alle Migrationen inkl. der neuen `00NN_staff_support.sql` fehlerfrei + idempotent an.
2. `escalations`, `support_tickets`, `support_messages`, `farm_verification_log` existieren mit Tenant-Bezug, Zeitstempeln und (wo sinnvoll) Update-Trigger.
3. `farms.verification_status` existiert; `farms.verified` ist trigger-konsistent (`= verifiziert`), nie händisch abweichend setzbar.
4. Verifizierungs-/Eskalations-/Ticket-Statusübergänge sind als erlaubte Kanten definiert; unerlaubte Kante = abgelehnt (kein freier Spalten-Sprung).

**RLS & Welten-Trennung**
5. **Jede** neue Tabelle hat RLS aktiv; ohne Policy kein Zugriff.
6. Requester sehen **nie** `internal=true`-Nachrichten (S4); Erzeuger sehen **nie** fremde Org-Daten (S3); `is_staff()` ist die **einzige** org-übergreifende Hoheit (S6/S7).
7. Verifizierung ist **nicht** per Client-Update möglich (S5) — nur über die Edge-Funktion (`service_role`).

**Edge & Audit**
8. `farm-verify` / `support-action` prüfen `is_staff()` **serverseitig**, validieren mit Zod, sind idempotent und schreiben bei jeder Mutation eine `audit_log`-Zeile mit Pflicht-`reason` (Namespace `farm_verification.*` / `support.*`).
9. Ohne Staff-JWT → **403**, keine Mutation, kein Audit-Leak (S10). service_role erscheint nie im Frontend/Log.

**UI end-to-end**
10. `/staff/*` ist RBAC-gegated; Käufer/Erzeuger erhalten Zero-State „Kein Zugriff", nie Fremddaten (S8). Staff-Queue, Verifizierungs-, Ticket-, Eskalations-Detail sind voll verdrahtet (Endpoint→Fetch→DOM→Lade/Leer/Fehler→Refresh); kein toter Button, kein Platzhalter; User-Werte escaped; Tokens aus dem Design-System; Vermittler-Disclaimer sichtbar.
11. Zero-State statt Error: leere Queue ⇒ leeres Array, **kein 500** (S9).

**Tests & Hygiene**
12. `npm run db:test` grün (T1–T12 + S1–S10); Schärfe-Probe macht den Test reproduzierbar rot, nach `db reset` grün.
13. `npm run typecheck` / `npm run build` grün. Nur die neue Migration ist neu; `0001…` unverändert; Rollback dokumentiert. Keine Secrets im Repo/Log.
14. `docs/CORE_BUSINESS_STATE_MACHINES.md`, `app/supabase/README.md`, `docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md`, ADRs/Patterns spiegeln den realen WAVE_07-Stand.

---

## 5. Gate (Übergang zu WAVE_08/09)

> **WAVE_07-Support-Gate** ist Vorgate zum Phase-2-Gate **C (Tenant-Isolation)** und zum Phase-3-**Ops-Gate** (Betriebszentrale). Kein Merge, keine Folge-Welle ohne grünen Isolations-/Verhaltens-Test (AGENTS.md: „Kein Merge ohne grünen Isolationstest").

| Gate-Prüfung | Kriterium | Beleg |
|---|---|---|
| **Schema-Gate** | `db reset` grün + idempotent; alle vier Tabellen + Verifizierungs-Workflow da | §3.2 · §4.1–4.4 |
| **RLS-/Welten-Gate (blockierend)** | Welten-Trennung dicht (S3/S4/S5/S6/S7/S8); `internal`-Notizen requester-unsichtbar | §3.4 · `db-rls-spezialist` + `qa-tester` |
| **Edge-/Audit-Gate** | `is_staff()` serverseitig, Zod, idempotent, `reason`+Audit Pflicht; ohne JWT 403 | §4.8–4.9 · `edge-functions-spezialist` + `security-auditor` |
| **UI-Verdrahtungs-Gate** | Staff-Konsole end-to-end, Zero-State, RBAC, Disclaimer, Tokens | §4.10–4.11 · `frontend-design-guardian` |
| **Schärfe-Gate** | künstliches Policy-Leck ⇒ `db:test` rot, danach grün | §3.6 |
| **Additiv-/Secret-Gate** | nur neue Migration/Funktionen, `0001…` unberührt, Rollback dokumentiert, keine Secrets | Diff-Review `core-guardian` · `security-auditor` |
| **Doku-Gate** | State-Machines + Tracker + ADRs aktuell | Review |

**Stop-Regeln in dieser Welle:**
- Statusübergänge (Verifizierung/Eskalation/Ticket) wären undefiniert oder eine Staff-Schreibhoheit serverseitig nicht org-übergreifend prüfbar → **STOP**, minimalen Fix vorschlagen, Owner-OK.
- Käufer-/Erzeuger-/Staff-Session wäre nicht sauber trennbar oder `internal`-Notizen könnten an Requester lecken → **STOP**.
- Echtes Supabase-EU-Projekt (Link/`db push`/`functions deploy`), produktive Keys oder eine Domain nötig → **STOP**, Owner-Freigabe (Account/Kosten).
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

**Nächste Welle:** `WAVE_08` (Bonus/Credits — *abwägen, evtl. Post-Launch*) bzw. `WAVE_09` (Billing/Stripe + SB-Bezahl-USP-Vorbereitung), gestützt auf die nun verifizierten Höfe und das Audit-/Support-Fundament.

---

## 6. Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_07 — Staff-/Support-Andockung
- Geändert:
  · app/supabase/migrations/00NN_staff_support.sql (NEU, additiv, idempotent, Rollback-Block):
    is_staff()/is_owner()-Helfer, verification_status-Enum + farms.verification_status (+ verified-
    Konsistenz-Trigger), farm_verification_log, escalations, support_tickets, support_messages,
    RLS deny-by-default (Welten-Trennung, internal-Notiz-Schutz), Negativ-Garantie-Inventar.
  · app/supabase/functions/farm-verify/index.ts + support-action/index.ts (NEU, Deno):
    is_staff() serverseitig, Zod, idempotent, audit_log (reason Pflicht), service_role nur hier.
  · app/src/lib/support.ts (NEU, Dual-Source) + lib/types.ts (Escalation/SupportTicket/… ohne any).
  · app/src/pages/StaffQueuePage.tsx · FarmVerificationDetail · SupportTicketDetail · EscalationDetail
    (NEU, /staff/* additiv in App.tsx, RBAC-gegated, end-to-end, Editorial-Tokens, Disclaimer).
  · app/supabase/tests/staff_support.test.mjs (NEU): S1–S10 gegen lokale Supabase-DB.
  · app/package.json (db:test erweitert — additiv).
  · docs/CORE_BUSINESS_STATE_MACHINES.md (NEU) · docs/spezialmodule/ (Staff-Andockung)
    · .claude/memory/decisions/ (2 ADRs) · patterns/ (Support-Andockung + is_staff()).
  · app/supabase/README.md · docs/releases/PHASE_STATUS.md · MASTER_INDEX.md (Stand gezogen).
- Tests/Verifikation:
  · npx supabase db reset → alle Migrationen grün + idempotent.
  · npm run db:test → T1–T12 (WAVE_02) + S1–S10 grün (Cross-Org dicht, internal-Notiz dicht,
    Verify nur via Edge, 403 ohne Staff-JWT, Zero-State statt 500).
  · Schärfe-Probe: künstliches Policy-Leck → db:test rot; nach db reset grün.
  · npm run typecheck / npm run build → grün (Staff-Konsole baut sauber).
- Risiken:
  · Niedrig–mittel. Additive Migration + neue Edge-Funktionen; semantik-erhaltend (kein Rechte-
    Upgrade für bestehende Rollen). Sensibel: internal-Notiz-Trennung + Staff-Cross-Org-Hoheit →
    durch S4/S6/S7 + Schärfe-Probe abgesichert. Rollback = drop-Block in der Migration.
  · Offen (Owner-Freigabe): echtes Supabase-EU-Projekt + db push + functions deploy (Phase 2/3).
- Nächste Welle: WAVE_08 (Bonus/Credits — abwägen) bzw. WAVE_09 (Billing/Stripe + SB-USP-Vorbereitung).
```

---

## 7. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, Verbote, Backend-/Edge-/RLS-Regeln, „Kern nie neu bauen, nur andocken"), `AGENTS.md` (SQL nur als additive Migration, „kein Merge ohne grünen Isolationstest", service_role nur in Edge), `PHASEN.md` (Phase 1 → WAVE_07; Phase 3 Ops-Gate; Phase-2-Gate C).
- **Landkarte:** `MASTER_INDEX.md` (Abschnitt 1 `CORE_BUSINESS_STATE_MACHINES.md` + `ROLE_AND_PERMISSION_MODEL.md`, Abschnitt 3 Spezialmodule, Abschnitt 7 `finalization/WAVE_07`).
- **Reale Artefakte (Bestand):** `app/supabase/migrations/0001_core.sql` (`farms.verified`, `user_role`, `audit_log`), `0003_marketplace.sql` (`is_org_member`, `org_members`, `reviews`), `app/supabase/functions/_shared/*` (Edge-Pattern), `app/src/lib/data.ts · supabase.ts · types.ts`, `app/src/App.tsx`, `app/src/styles/theme.css`.
- **Vorwellen:** `WAVE_02_datamodel_rls.md` (Isolations-Harness, `current_org_ids`/`is_org_member`, deny-by-default), `WAVE_03` (RBAC/Surface-Sichtbarkeit), `WAVE_06` (Auth/Turnstile/RLS-Härtung).
- **Plattform-Pfeiler dieser Welle:** Org-Boundary/Datenisolation (1) · Zero-State statt Error (2) · Scope-Transparenz (3, Staff = Plattform-Scope) · RBAC ohne Lücken (4, Welten-Trennung + `internal`-Schutz) · Audit & Verantwortlichkeit (5, `audit_log` + `farm_verification_log`, `reason` Pflicht) · Testpflicht pro Feature (6, S1–S10) · Drilldown-Integrität (7, Deep-Links ohne org-fremde URLs).

> Diese Welle ist **additiv** und ändert keine kosten-/außenwirksame Ressource. Für jeden Live-/Account-/Kosten-Schritt (Supabase-Link, `db push`, `functions deploy`, echte Keys, Cloudflare-Deploy) gilt: **vorab in Klartext ankündigen, erst auf Owner-OK.** Vermittler-Disclaimer bleibt durchgängig: Die Hof-Verifizierung bestätigt formale Plausibilität — die Plattform vermittelt, verkauft nicht selbst und berät nicht.
