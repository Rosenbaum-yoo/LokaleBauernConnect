# MASTERPROMPTS — Phase 4 (Vertikale Strecken, Tracks A–E) · LokaleBauernConnect

> **Zweck:** Ein kopierbereiter Start-Prompt **pro Track**. Den passenden Block zu Beginn einer **Phase-4-Session** in Claude Code einfügen — er aktiviert genau eine vertikale Strecke (A–E) **zusätzlich** zu den Phase-1- bis Phase-3-Regeln und gibt den verbindlichen Arbeitsrhythmus, das Track-Gate und die Stop-Regeln vor.
>
> **Geltung:** Phase 4 aus `PHASEN.md` (Vertikale Strecken). **Eine Strecke pro Session — niemals zwei Tracks gleichzeitig** (Token-Fokus §0.2, kein Race um geteilte Kanäle wie E-Mail/Migrationen). Phase-1/2/3-Regeln bleiben aktiv; Phase 4 ergänzt sie, hebt sie nie auf.
> **Konflikt-Hierarchie:** User-Anweisung > `~/AGENTS.md` (global) > `AGENTS.md` (Projekt) > Subagent/Skill > `CLAUDE.md` > `finalization/00_RULES.md` > `finalization/01_PRIORITIES.md` > `finalization/phase4_vertical/README.md` > die jeweilige Track-Datei > diese Datei.
> **Stack fix (Imperium-Grundgesetz):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker, kein eigener Mail-Server, kein SCC-Panel.**
> **Rolle = VERMITTLER:** kein Eigenverkauf, keine Beratung, keine Mengen-/Liefergarantie. Vermittler-Disclaimer durchgängig sichtbar — auch in jeder E-Mail/Quittung/Hof-Antwort. **VMS-/Self-Host-Begriffe verboten** (Zeitarbeit, Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner) — konsequent auf die Hof-Domäne adaptieren.

---

## So benutzt du diese Datei

1. **Genau einen** Track-Block unten kopieren (A, B, C, D **oder** E) und als Session-Start-Prompt einfügen.
2. Der Prompt zwingt zuerst die **Pflicht-Lektüre**, dann **eine Welle** der Strecke, dann **Verifikation + Track-Gate-Bezug + Abschlussbericht**.
3. Brauchst du keinen vollen Block (nur eine spezifische Welle), nutze den **Pro-Welle-Kurzstart** ganz unten.
4. **Niemals** zwei Track-Blöcke in einer Session mischen — Kollisionen siehe `CROSS_CUTTING.md` (insbesondere: **A und C nie zusammen** wegen geteiltem E-Mail-Versand; **alle Migrations-Tracks** nie parallel wegen Migrations-Nummernkollision).

> **Track-Dateien (Single Source je Strecke — vor dem Referenzieren per Glob/Grep verifizieren, nie auf eine nicht existente Datei verweisen, `00_RULES.md §1.1`):**
> - **A** → `finalization/phase4_vertical/TRACK_A_SB_PAYMENT.md` ⭐
> - **B** → `finalization/phase4_vertical/TRACK_B_KARTE.md`
> - **C** → `finalization/phase4_vertical/TRACK_C_SAISON.md`
> - **D** → `finalization/phase4_vertical/TRACK_D_SELFSERVICE.md`
> - **E** → `finalization/phase4_vertical/TRACK_E_DATABASE.md`
>
> Liegt eine referenzierte Track-/Gate-/README-Datei noch nicht vor, ist die **erste Aufgabe** der Session, sie kanonisch anzulegen (Quelle: `README.md` dieser Schicht + `MASTER_INDEX.md` Abschnitt 7, adaptiert auf den fixen Stack) — **nicht** auf eine erfundene Datei verweisen.

---

## Was diese Prompts bewirken (Wirkprinzip)

1. **Strikte Track-Trennung** — keine versehentliche Vermischung von Strecken oder Migrations-Nummern.
2. **Pflicht-Cross-Cutting-Lektüre** — geteilte Kanäle (E-Mail, Audit, RLS-Helfer, Migrations-Sequenz) werden gesehen, nicht überschrieben.
3. **Server-Wahrheit vor UI** — Preis/Status/Entitlement/Zugriff serverseitig; React ist nie die Sicherheitsgrenze.
4. **Owner-Entscheidungen ausgegliedert** (`MANUAL_TASKS.md`) — keine halluzinierten Pricing-/Connect-/Domain-/Kostenbeschlüsse.
5. **Beweis statt Behauptung** — jede Welle endet mit ausgeführten Tests, Track-Gate-Bezug und Abschlussbericht.
6. **Eine Welle, ein Mehrwert** — §0.8: an natürlichen Stopp-Punkten weiterarbeiten; echte Blocker = Stop-Regel.

---

# TRACK A ⭐ — SB-Bezahlung (USP): QR am Stand → Stripe (+Connect) → Quittung

> Geschäftskritisch: der USP der Plattform und (neben dem Erzeuger-Abo aus `WAVE_09`) der **zweite reale Geldfluss**. Marktstart-Pflicht-Set: „Track A **ODER** WAVE_09 — mind. ein Geldfluss" (`PHASEN.md`).

```text
Du arbeitest im Repository LokaleBauernConnect (ConnectCore-Imperium · Welle 1, Klasse C).
Du finalisierst AUSSCHLIESSLICH Phase 4 / Track A — die sichere bargeldlose Bezahlung am
unbemannten SB-Hofladen (QR am Stand → Stripe Connect → Quittung). Keine andere Strecke.

ROLLE: VERMITTLER. Verkäufer & Steuerpflichtiger ist der HOF (Stripe Connected Account).
Die Plattform bindet die Zahlung an und stellt einen Beleg aus — sie verkauft nicht selbst,
berät nicht und übernimmt keine Warenhaftung. Disclaimer durchgängig (Stand-Seite + Beleg).

STACK FIX: React+Vite+TS(strict) · Supabase (EU, Postgres+RLS, Edge Functions/Deno, Storage)
 · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect). Kein Hetzner, kein Self-Host.

LIES ZUERST (gezielt — Ranges/Diffs statt Volldateien, unabhängige Reads bündeln, §0.2):
1.  ~/AGENTS.md + ~/CLAUDE.md (§0-Direktive, gilt immer)
2.  AGENTS.md (Projekt) + .claude/agents/* (bes. payment-engineer, edge-functions-spezialist,
    security-auditor, compliance-officer, db-rls-spezialist, qa-tester)
3.  CLAUDE.md (7 Produktionspfeiler, USP-Abschnitt, Backend-/Edge-/Payment-Regeln, Stop-Regeln)
4.  PHASEN.md (Phase 4 Track A + Marktstart-Pflicht-Set „mind. ein Geldfluss")
5.  finalization/00_RULES.md + finalization/01_PRIORITIES.md (P0–P3, Server-Guards, Audit-Pflicht)
6.  finalization/phase4_vertical/README.md (Übersicht Phase 4)
7.  finalization/phase4_vertical/TRACK_A_SB_PAYMENT.md (Wellen A0–A9, State-Machine, Migrationen 0005/0006)
8.  finalization/phase4_vertical/CROSS_CUTTING.md (E-Mail-/Audit-/Migrations-Kollisionen)
9.  finalization/phase4_vertical/GATES.md (Track-A-Gate) + MANUAL_TASKS.md (Owner-Entscheidungen)
10. docs/releases/PHASE_STATUS.md (was bereits grün ist — kein Doppelbau) + relevantes .claude/memory/

REPO-GENAUIGKEIT: Bestand ist real (sb_payments, payment_events, create-checkout, stripe-webhook,
_shared/stripe.ts, _shared/email.ts, farms, is_org_member). Erst per Glob/Grep verifizieren,
dann referenzieren — niemals eine Function/Tabelle/Route annehmen. Track A baut ADDITIV darauf auf.

LEITPRINZIPIEN (nicht verhandelbar — jede Welle muss sie wahren):
- Preis IMMER serverseitig aus products. Client-Betrag wird NIE vertraut (Manipulationsschutz, Test).
- EIN Webhook = die Wahrheit: signaturgeprüft + idempotent (payment_events PK = event.id) über
  ALLE Event-Typen (paid/failed/refunded/dispute/account.updated/payout). Kein Client setzt status.
- Geld fließt zum Hof: Stripe Connect Destination Charge (transfer_data.destination) +
  application_fee_amount für die Plattform. Invariante: application_fee_cents + net_to_farm_cents == amount_cents.
- QR-Token ist HMAC-signiert (STAND_TOKEN_SECRET): farm_id + stand_id + token_version, KEIN Klartext-Preis,
  KEIN Geheimnis im QR. Rotation (token_version++) macht alte QR sofort ungültig.
- RLS deny-by-default: Erzeuger sieht NUR eigene Org-Daten (is_org_member); anon zahlt, liest nichts.
  farm_payouts/sb_receipts/payment_events/sb_payment_attempts ohne anon/auth-Policy → nur service_role.
- Audit für jede Mutation (paid/refunded/disputed/payout/connect): audit_log wer/was/warum, Refund NUR mit reason.
- Anti-Betrug eingebaut: Turnstile + Rate-Limit + Velocity + Betrags-Cap; keine Klartext-IP/UA (nur HMAC mit Tages-Salt).
- Zero-State statt Error: Hof ohne Connect → available:false / connect_pending, kein 500, kein Checkout.
- service_role nur in Edge Functions. Frontend nur VITE_-Public-Keys/Turnstile-Sitekey. Stripe-Secret nur Function-Secret.
- Compliance durchgängig: Beleg-Pflichtangaben (Hof-Anschrift, Positionen, Summe, Beleg-Nr., Zeitstempel,
  USt-Hinweis) + Vermittler-Disclaimer; Belegnummer fortlaufend/lückenlos pro Org; DSGVO.

ARBEITE GENAU EINE WELLE (Reihenfolge bindend, je Welle Acceptance aus der Track-Datei):
A0 Read-only Audit + Connect-Strategie-ADR (Destination Charges + Express) — keine Code-Änderung
A1 Datenmodell-Migration 0005 (Connect/Stände/Belege/Auszahlungen) + 0006 (Anti-Betrug) — additiv, idempotent
A2 Stand-Token (HMAC, _shared/standToken.ts) + verify-stand Edge Function (public, Zero-State)
A3 create-checkout härten: Stand-Token-Pflicht + Turnstile + Velocity/Cap + Connect + Server-Preis + fee/net
A4 stripe-webhook vervollständigen: paid · failed · refunded · dispute · account.updated · payout + Beleg-Persistenz
A5 Käufer-Stand-Flow (React /stand/:standToken → Stripe → /beleg/:id) — mobil, alle Zustände, Disclaimer
A6 Connect-Onboarding (connect-onboard, Express) + Stand-Verwaltung + QR-Generierung (signStand → Storage → Druck-PDF)
A7 Erzeuger-Dashboard: Einnahmen/Auszahlungen + Schwund-Indikator (als Schätzung gekennzeichnet) + sb-refund (reason Pflicht)
A8 Anti-Betrug, Compliance & Härtung (durchgängig) — Beleg-Pflichtangaben, Disclaimer, Secrets nur Edge
A9 Tests, Observability, Doku & Track-A-Gate

VERIFIKATION VOR „FERTIG" (ausführen, nicht behaupten):
- npm run build (tsc strict + vite) grün — Auszug zeigen.
- supabase db reset wendet 0001…0006 fehlerfrei + idempotent an (zweiter Lauf ohne Fehler); 0001…0004 UNVERÄNDERT.
- Webhook-Idempotenz: identische event.id → genau eine Wirkung (paid/refund/dispute je einmal).
- Server-Preis: manipuliertes Client-amount ändert Betrag/Fee/Net NICHT.
- Stand-Token: Manipulation/Rotation (v ≠ token_version) → abgelehnt, kein Datenleck.
- Fee/Net-Invariante: application_fee_cents + net_to_farm_cents == amount_cents.
- Refund-Pflicht: ohne reason abgelehnt; mit reason → Status refunded + audit korrekt.
- Isolation (an WAVE_02-Harness anschließen, neue T-Fälle): Org A sieht keine sb_payments/sb_receipts/
  farm_payouts/sb_stands von Org B → 0 Zeilen/403.
- Zero-State: Hof ohne Connect → available:false, kein 500; leeres Dashboard → leere Arrays.
- security-auditor (read-only): kein Secret im Client/Log, service_role nur in Edge, Webhook signaturgeprüft,
  public Edge-Eingänge Turnstile+Zod, keine Klartext-IP gespeichert.
- UI-Verdrahtung: QR-Token → DOM → Fetch → Stripe-Redirect → Beleg-Seite; Konsole sauber (keine TypeError/401-Schleifen).

STOP-REGELN (anhalten, minimalen sicheren Fix vorschlagen, auf Owner-OK warten):
- Stripe Connect aktivieren (Plattform-Profil/Verträge/Auszahlungen), Live-Keys, Domain/Go-Live,
  echte Gebührenhöhe (SB_FEE_BPS/SB_FEE_FIXED_CENTS) → STOP, Account-/Kosten-/Vertrags-Freigabe.
- Statusübergang einer Zahlung unklar oder serverseitig nicht org-scopebar → STOP, minimaler Fix + Owner-OK.
- Erstattung/Geldfluss-Eingriff ohne idempotente, signaturkonsistente, auditierte Function → STOP (irreversibel).
- Referenzierte Edge Function/Route/Tabelle/Datei nicht gefunden → STOP (Annahme statt Fakt).
- Jeder git commit/push → STOP, Owner-Freigabe; Co-Author-Zeile anhängen.
> Stop-Regeln STECHEN §0.8. An echten Blockern halten wir an — Sicherheit/Verifikation nie für Tempo opfern.
  An NATÜRLICHEN Stopp-Punkten (kein Blocker) den nächsten wertvollen Schritt liefern (Negativtests, Härtung, Doku).

SUBAGENTEN (AGENTS.md): payment-engineer + edge-functions-spezialist (Build) → security-auditor +
compliance-officer (Prüfung) → qa-tester (Gate); db-rls-spezialist (Migrationen/RLS);
frontend-design-guardian + i18n-content-spezialist (Stand-Flow/Dashboard/Disclaimer); architekt (Connect-ADR).

ENDZUSTAND: Track-A-Gate aus GATES.md grün (Migrations-/Connect-/Webhook-/Server-Preis-/Token-/Isolations-/
Anti-Betrug-/Compliance-/Secret-/Doku-Gate). „Fertig" erklärt der Owner, nicht du.

AM WELLENENDE liefere den Abschlussbericht (Format unten) + aktualisiere docs/releases/PHASE_STATUS.md
und MASTER_INDEX.md; wiederverwendbare Lektion → .claude/learning/insights_inbox.md.

Beginne mit A0 (oder der ersten noch offenen Welle laut PHASE_STATUS.md) und nenne explizit, welche du wählst.
```

---

# TRACK B — Interaktive Karte (Leaflet/MapLibre · OSM): Pins · Cluster · „in der Nähe"

> Status laut `README.md`: **Kern fertig** (Leaflet/OSM, Liste/Karte-Umschalter, Hof-Pins + Popups, CSP für Tiles erweitert, 0 Konsolenfehler). Track B läuft daher als **Inkrement** (Cluster, Geolocation-Opt-in, Deep-Link vom Pin) — kein Rebuild.

```text
Du arbeitest im Repository LokaleBauernConnect. Du arbeitest AUSSCHLIESSLICH an Phase 4 / Track B —
der interaktiven Karte (Leaflet/MapLibre auf OpenStreetMap-Tiles). Keine andere Strecke.

WICHTIG: Der Karten-Kern ist BEREITS abgeschlossen (siehe docs/releases/PHASE_STATUS.md). Track B ist ein
INKREMENT, kein Neubau. Prüfe zuerst per Glob/Grep den realen Stand der Finder-/Karten-Komponenten und
baue additiv weiter. Keine Parallel-Karten-Komponente, kein zweiter Tile-Layer, keine doppelte Datenschicht.

ROLLE: VERMITTLER. Die Karte ist Such-/Entdeck-UX — kein Verkauf, keine Beratung, keine Verfügbarkeits-Garantie.
STACK FIX: React+Vite+TS(strict) · Supabase (EU, RLS) · Cloudflare (Pages/Workers, CSP) · Stripe(+Connect).
Kein Hetzner, kein Self-Host, kein kostenpflichtiger Map-/Geocoding-Vendor ohne Owner-Freigabe.

LIES ZUERST (gezielt):
1.  ~/AGENTS.md + ~/CLAUDE.md (§0-Direktive)
2.  AGENTS.md + .claude/agents/* (bes. frontend-design-guardian, performance-cost-optimizer, db-rls-spezialist, devops)
3.  CLAUDE.md (7 Produktionspfeiler, Frontend-Regeln: Design-System-Tokens, keine Deko-Emojis, Deep-Links statt Sackgassen)
4.  PHASEN.md (Phase 4 Track B) + finalization/01_PRIORITIES.md
5.  finalization/00_RULES.md + finalization/phase4_vertical/README.md
6.  finalization/phase4_vertical/TRACK_B_KARTE.md (Inkrement-Wellen + Gate-Bezug)   ← falls noch nicht vorhanden: erste Aufgabe, kanonisch anlegen
7.  finalization/phase4_vertical/CROSS_CUTTING.md (Geo berührt Track E)
8.  finalization/phase4_vertical/GATES.md (Track-B-Gate) + docs/releases/PHASE_STATUS.md
9.  app/src/lib/{data,supabase,types}.ts (bestehende Dual-Source-Datenschicht — Karte dockt hier an)

LEITPRINZIPIEN (nicht verhandelbar):
- KEINE hardcodierten Farben — nur Design-System-Tokens (app/src/styles/theme.css). Keine Deko-Emojis.
- OSM-Tiles korrekt attribuieren; CSP für Tile-/Geo-Hosts bewusst und minimal erweitern (kein wildcard-CSP).
- Geolocation NUR Opt-in (default OFF), DSGVO-konform: keine stille Standort-Erfassung, keine Speicherung roher Koordinaten ohne Zweck.
- Org-Boundary: nur öffentlich lesbare, verifizierte Höfe (farms_public_read) auf der Karte; keine RLS-Lücke über eine Aggregations-/Bounding-Box-Query.
- Zero-State statt Error: keine Höfe in der Region → „Noch keine Höfe in dieser Region" (kein 500, kein leerer weißer Kasten).
- Deep-Link-Integrität: Pin → Hof-Detailseite übergibt Kontext (slug/id), baut NIE eine org-fremde URL; Liste/Karte-State teilbar (URL-Query).
- Performance: Marker-Cluster bei dichten Regionen, Tile-/Daten-Caching, kein N+1 beim Laden der Pins; mobil flüssig.

ARBEITE GENAU EINE WELLE (Inkremente, je Welle Acceptance aus der Track-Datei):
B1 Marker-Cluster bei dichten Regionen (Cluster-Aufbruch, Performance bei vielen Pins)
B2 „In der Nähe" via Geolocation (Opt-in, default OFF) — Bounding-Box-Query, Distanz-Anzeige, kein Roh-Koordinaten-Leak
B3 Deep-Link Pin → Hof-Detailseite (Kontext-Übergabe) + teilbarer Liste/Karte-State über URL-Query
B4 Zero-/Lade-/Fehler-Zustände + Mobil-Politur + Accessibility (Tastatur, Fokus, ARIA für Karte/Liste)
B5 Tests + Track-B-Gate (Tiles laden, 0 Konsolenfehler, CSP dicht, Deep-Links verdrahtet)

VERIFIKATION VOR „FERTIG":
- npm run build grün — Auszug zeigen. npm run dev (Port 5409) / preview: Karte lädt, 0 Konsolenfehler (keine CSP-Violations, keine TypeError).
- Tiles laden mit korrekter Attribution; CSP erlaubt genau die nötigen Hosts (kein wildcard).
- Geolocation nur nach Opt-in; Ablehnung führt zu sauberem Fallback (Region-Default), nicht zu leerer Karte.
- Zero-State sichtbar bei leerer Region; Deep-Link vom Pin landet auf der korrekten Hof-Detailseite (kein 404, keine fremde Org).
- Keine RLS-Lücke: nur öffentlich lesbare, verifizierte Höfe; Bounding-Box-Query exponiert keine privaten Felder.
- Editorial-Token-Check (frontend-design-guardian): keine neuen Farben/Fonts, keine Deko-Emojis.

STOP-REGELN:
- Kostenpflichtiger Map-/Tile-/Geocoding-Vendor oder Cloudflare-Cache-Reserve nötig → STOP, Trade-off + Kosten in Klartext, Owner entscheidet.
- Echte Geo-Distanz-Sortierung in der DB (PostGIS) nötig (Bounding-Box reicht nicht) → STOP, das ist Track-E-Anschluss mit eigenem ADR.
- CSP-Aufweichung über das Nötige hinaus / wildcard nötig → STOP, sicherere Alternative suchen.
- Referenzierte Datei/Route nicht gefunden → STOP. Jeder git commit/push → STOP, Owner-Freigabe + Co-Author-Zeile.

SUBAGENTEN: frontend-design-guardian + i18n-content-spezialist (UI/Mikrocopy) → performance-cost-optimizer (Tiles/Cluster) →
db-rls-spezialist (Bounding-Box-RLS) → qa-tester; devops für CSP/Edge-Caching.

ENDZUSTAND: Track-B-Gate aus GATES.md grün. „Fertig" erklärt der Owner.
AM WELLENENDE: Abschlussbericht (unten) + PHASE_STATUS.md/MASTER_INDEX.md pflegen.
Beginne mit der ersten offenen Inkrement-Welle laut PHASE_STATUS.md und nenne sie explizit.
```

---

# TRACK C — Saison & Benachrichtigungen (Saison-Radar · Alerts · Datenpflege)

> **Niemals in derselben Session wie Track A** — beide nutzen denselben E-Mail-Versandkanal (`_shared/email.ts`) und würden sich an Versand/Idempotenz ins Gehege kommen (`CROSS_CUTTING.md`). Alert = personenbezogene Kommunikation → **Double-Opt-In, idempotent, abbestellbar, EU-konform**.

```text
Du arbeitest im Repository LokaleBauernConnect. Du arbeitest AUSSCHLIESSLICH an Phase 4 / Track C —
Saison-Radar + Verfügbarkeits-/Saison-Alerts + Datenpflege-Frische. Keine andere Strecke.
SESSION-SPERRE: NICHT zusammen mit Track A (geteilter E-Mail-Versand) — siehe CROSS_CUTTING.md.

ROLLE: VERMITTLER. Ein Alert ist ein Hinweis des Hofs, weitergereicht durch die Plattform —
NIE ein Verkaufsversprechen, keine Mengen-/Liefergarantie. Disclaimer in jeder E-Mail.
STACK FIX: React+Vite+TS(strict) · Supabase (EU, RLS, Edge Functions/Deno, pg_cron-Abgleich nur mit Owner-OK)
 · Cloudflare (Turnstile/WAF) · Stripe(+Connect). Kein Hetzner, kein eigener Mail-Server, kein Push-Vendor-Lock-in.

LIES ZUERST (gezielt):
1.  ~/AGENTS.md + ~/CLAUDE.md (§0-Direktive)
2.  AGENTS.md + .claude/agents/* (bes. compliance-officer, edge-functions-spezialist, db-rls-spezialist, i18n-content-spezialist, qa-tester)
3.  CLAUDE.md (7 Produktionspfeiler, Vermittler-Regeln, Backend-/Edge-Regeln)
4.  PHASEN.md (Phase 4 Track C) + finalization/01_PRIORITIES.md (P0–P3 — Einwilligung ist P0-Kern)
5.  finalization/00_RULES.md + finalization/phase4_vertical/README.md
6.  finalization/phase4_vertical/TRACK_C_SAISON.md (Wellen, Datenmodell 0006_season_alerts, Double-Opt-In-Flow)
7.  finalization/phase4_vertical/CROSS_CUTTING.md (E-Mail-Kollision mit A, Migrations-Nummern)
8.  finalization/phase4_vertical/GATES.md (Track-C-Gate) + MANUAL_TASKS.md (Mail-Provider/Texte)
9.  app/supabase/functions/_shared/email.ts (Provider-Abstraktion + Vermittler-Fußzeile — WIEDERVERWENDEN, keine zweite Mail-Schicht)
10. app/supabase/migrations/0001_core.sql (products.seasonal, availability_state) + docs/releases/PHASE_STATUS.md

LEITPRINZIPIEN (nicht verhandelbar):
- Double-Opt-In: Abo wird erst nach E-Mail-Bestätigung aktiv (default OFF). Jede Mail enthält 1-Klick-Abbestellung.
- Idempotent + dedupliziert + rate-limitiert: ein Statuswechsel out/soon → available löst HÖCHSTENS einen Alert je Abo aus (notification_log als Wahrheit). Kein Spam.
- Domain owns truth: die Verfügbarkeits-/Saison-Wahrheit besitzt der Hof (org_id). Track C aggregiert/benachrichtigt — er schaltet NIE automatisch ein Produkt auf „verfügbar".
- Kein Marketing-Newsletter: Alert ist transaktional/themenbezogen und konkret angefordert. Werbliche Sammelmails außerhalb des Scopes.
- RLS deny-by-default: neue Tabellen (favorites, alert_subscriptions, notification_log) mit eigener Policy; notification_log nur service_role.
- Öffentliches „Benachrichtigen"-Formular: Turnstile + Zod + Rate-Limit (bestehendes rateLimit.ts wiederverwenden, nicht duplizieren).
- DSGVO: E-Mail nur mit Einwilligung + Zweck, Datensparsamkeit, Löschkonzept; keine Klartext-Tracking-Daten.
- Saison-Radar ist Erlebnis (P2): Zero-State sauber („Noch keine Saisondaten für diese Region"), keine erfundene Saisonalität.
- service_role nur in Edge; Frontend nur VITE_-Public; keine hardcodierten Farben, keine Deko-Emojis.

ARBEITE GENAU EINE WELLE (je Welle Acceptance aus der Track-Datei):
C0 Read-only Audit + Einwilligungs-/DSGVO-ADR (Double-Opt-In, Aufbewahrung, Abbestellung) — keine Code-Änderung
C1 Migration 0006_season_alerts (favorites, alert_subscriptions, notification_log + products: season_from/to, availability_updated_at) — additiv, RLS
C2 Saison-Radar v1 (React): „Was gibt es gerade frisch?" datengetrieben, Zero-State, Frische-Signal (availability_updated_at)
C3 Abo-Flow (öffentlich): Turnstile+Zod+Rate-Limit → Double-Opt-In-Mail (renderAlertConfirm) → Bestätigungs-Edge-Function → Abo aktiv
C4 Alert-Engine (Edge/Cron mit Owner-OK für pg_cron): Statuswechsel-Abgleich → idempotenter Versand (renderAlert) → notification_log
C5 Abbestellung + Self-Service (Token-Link, 1-Klick) + Erzeuger-Saison-Selbstpflege (org-gebunden, Audit)
C6 Tests, Anti-Spam-Härtung, Doku & Track-C-Gate

VERIFIKATION VOR „FERTIG":
- npm run build grün — Auszug. supabase db reset wendet alle Migrationen idempotent an; bestehende Migrationen unverändert.
- Double-Opt-In: Abo erst nach Bestätigung aktiv; unbestätigtes Abo löst KEINEN Alert aus.
- Idempotenz: derselbe Statuswechsel → höchstens ein Alert je Abo (notification_log-Dedup-Test); kein Doppelversand.
- Abbestellung: 1-Klick-Link deaktiviert das Abo sofort; danach kein weiterer Alert.
- Isolation: Erzeuger A sieht/ändert keine Abos/Favoriten/Saison-Felder von Org B (Cross-Org-Negativtest 403/0 Zeilen).
- notification_log/Subscriptions ohne anon/auth-Schreibrecht → nur service_role.
- Zero-State: keine Saisondaten → freundlicher Leerzustand, kein 500. Jede Mail trägt Vermittler-Disclaimer + Abbestell-Link.
- compliance-officer: Einwilligung, Zweckbindung, Löschkonzept, keine Klartext-Tracking-Daten belegt.

STOP-REGELN:
- pg_cron / kostenpflichtige Plattform-Aktivierung oder Live-Mail-Versand an echte Empfänger → STOP, Owner-Freigabe (Kosten/Außenwirkung).
- Einwilligungs-/Aufbewahrungs-/Abbestell-Modell rechtlich unklar → STOP, ADR + Owner einbeziehen (P0).
- Versandweg würde mit Track A (Quittungen) kollidieren → STOP (Session-Sperre verletzt).
- Referenzierte Datei/Function/Tabelle nicht gefunden → STOP. Jeder git commit/push → STOP, Owner-Freigabe + Co-Author-Zeile.
> Stop-Regeln stechen §0.8; an natürlichen Stopp-Punkten weiterarbeiten (Dedup-Tests, Härtung, Doku).

SUBAGENTEN: compliance-officer (Einwilligung/DSGVO) + i18n-content-spezialist (Mail-/Trust-Texte) → edge-functions-spezialist +
db-rls-spezialist (Engine/RLS) → security-auditor → qa-tester (Idempotenz-/Isolations-Gate); frontend-design-guardian (Radar-UI).

ENDZUSTAND: Track-C-Gate aus GATES.md grün (Opt-in/DSGVO · idempotente Alerts · kein Spam · Zero-State · Isolation).
„Fertig" erklärt der Owner. AM WELLENENDE: Abschlussbericht (unten) + PHASE_STATUS.md/MASTER_INDEX.md pflegen.
Beginne mit C0 (oder der ersten offenen Welle laut PHASE_STATUS.md) und nenne sie explizit.
```

---

# TRACK D — Erzeuger-Self-Service (mobile Verfügbarkeits-/Bestands-/Preis-/Abholfenster-Pflege)

> Unabhängig von der Bezahlung; **parallel-fähig** und früh wertvoll (Erzeuger-Bindung, füttert Finder + Track C mit gepflegten Daten). Mutationen sind RLS-gesichert und auditiert.

```text
Du arbeitest im Repository LokaleBauernConnect. Du arbeitest AUSSCHLIESSLICH an Phase 4 / Track D —
mobile Erzeuger-Selbstpflege (Verfügbarkeit, Bestand/Menge, Preise, Abholfenster). Keine andere Strecke.

ROLLE: VERMITTLER. Verfügbarkeit = Erzeuger-Selbstauskunft mit Frische-Signal — kein verbindliches Kaufangebot
der Plattform, keine garantierte Menge/Lieferung. Disclaimer durchgängig.
STACK FIX: React+Vite+TS(strict) · Supabase (EU, RLS, Edge Functions/Deno) · Cloudflare (Pages/Workers, PWA-tauglich)
 · Stripe(+Connect). Kein Hetzner, kein Self-Host.

LIES ZUERST (gezielt):
1.  ~/AGENTS.md + ~/CLAUDE.md (§0-Direktive)
2.  AGENTS.md + .claude/agents/* (bes. db-rls-spezialist, frontend-design-guardian, edge-functions-spezialist, qa-tester, security-auditor)
3.  CLAUDE.md (7 Produktionspfeiler, RBAC, Audit-Pflicht, Frontend-/Backend-Regeln)
4.  PHASEN.md (Phase 4 Track D — konkretisiert WAVE_04 B/C für Erzeuger mobil) + finalization/01_PRIORITIES.md
5.  finalization/00_RULES.md + finalization/phase4_vertical/README.md
6.  finalization/phase4_vertical/TRACK_D_SELFSERVICE.md (Wellen + Acceptance)   ← falls noch nicht vorhanden: erste Aufgabe, kanonisch anlegen
7.  finalization/phase4_vertical/CROSS_CUTTING.md (Frische-Signal/Saison-Felder berühren Track C; Migrations-Nummern)
8.  finalization/phase4_vertical/GATES.md (Track-D-Gate) + docs/releases/PHASE_STATUS.md
9.  app/supabase/migrations/0001_core.sql (products: price, availability_state, category, owner-write-Policy) + app/src/lib/{data,supabase,types}.ts

LEITPRINZIPIEN (nicht verhandelbar):
- RLS deny-by-default: Erzeuger pflegt NUR eigene org_id/Höfe (is_org_member / products_owner_write). Cross-Org schreibbar = P0-Blocker.
- Backend ist Sicherheit, Frontend ist UX: jede Mutation über scoped Edge Function ODER RLS-gesicherte Query, Zod an der Grenze; Frontend liefert KEINE org_id, die es bestimmt — Server leitet ab.
- Audit pro Mutation (Verfügbarkeit/Preis/Bestand/Abholfenster geändert): audit_log wer/was/von→zu/warum, org-gebunden, unabschaltbar.
- Frische-Signal: jede Pflege setzt availability_updated_at → „heute aktualisiert" / „könnte veraltet sein" (speist Track C + Finder-Vertrauen).
- Optimistische UI mit Lade-/Leer-/Fehlerzuständen; PWA-/Offline-tolerant für Bedienung am Hof (keine Datenkorruption bei Reconnect).
- Zero-State statt Error: Hof ohne Produkte → „Erstes Produkt anlegen"-CTA, kein 500, kein toter Button.
- Editorial-Disziplin: Design-System-Tokens, keine Deko-Emojis, User-/Hof-Werte vor Ausgabe escapen.
- Keine automatische Bestands-Dekrementierung bei Offline-Verkauf (würde lügen) — explizit P3/ADR, NICHT in Track D nachbauen.

ARBEITE GENAU EINE WELLE (je Welle Acceptance aus der Track-Datei):
D0 Read-only Audit + Datenfeld-/RLS-Bestandsaufnahme (was pflegbar ist, welche Felder fehlen) — keine Code-Änderung
D1 Ggf. additive Migration (Frische-Signal/optionale Felder, falls nicht aus Track C vorhanden) — additiv, RLS, Audit-Trigger
D2 Mobile Verfügbarkeits-Schnellpflege (available/low/soon/out je Produkt) — optimistisch, Audit, Frische-Stempel
D3 Bestand/Menge + Preis-Pflege (serverseitige Validierung, keine negativen Werte, Audit von→zu)
D4 Abholfenster-Pflege (Öffnungs-/Abholzeiten je Hof/Stand) — Konflikt-/Plausibilitätsprüfung serverseitig
D5 PWA-/Offline-Politur + Zero-/Lade-/Fehler-Zustände + Accessibility (große Touch-Ziele, Tastatur)
D6 Tests (Cross-Org-Negativtest, Audit-Beweis, Validierung), Doku & Track-D-Gate

VERIFIKATION VOR „FERTIG":
- npm run build grün — Auszug. npm run dev (Port 5409): Pflege-Flows verdrahtet (Fetch → DOM → Lade/Leer/Fehler → Handler → Refresh), Konsole sauber.
- Cross-Org-Negativtest (PFLICHT): Erzeuger A kann KEIN Produkt/keine Verfügbarkeit/keinen Preis von Org B ändern → 403/0 Zeilen.
- Audit-Beweis je Mutation: erzeugter audit_log-Eintrag (wer/was/von→zu/warum) im Output; reason bei kritischen Aktionen erzwungen.
- Serverseitige Validierung: negativer/manipulierter Wert (Preis/Menge) abgelehnt; Frontend-gelieferte org_id wird ignoriert/abgeleitet.
- Frische-Signal: jede Pflege aktualisiert availability_updated_at; UI zeigt „heute aktualisiert".
- Zero-State: Hof ohne Produkte → CTA statt Fehler; Offline → kein Datenverlust/keine Doppelschreibung bei Reconnect.
- Editorial-Token-Check (frontend-design-guardian): keine neuen Farben/Fonts, keine Deko-Emojis; Werte escaped.

STOP-REGELN:
- Org-Scope einer Mutation serverseitig nicht erzwingbar (nur UI-Filter) → STOP. RLS/Edge muss tragen.
- Statusübergänge der Verfügbarkeit/Reservierung undefiniert oder berühren den Reservierungs-Kernflow → STOP, Owner/architekt einbeziehen.
- Auto-Bestands-Dekrement bei SB-Verkauf gefordert → STOP (P3/ADR, würde lügen — Offline-Verkauf).
- Referenzierte Datei/Function/Tabelle nicht gefunden → STOP. Jeder git commit/push → STOP, Owner-Freigabe + Co-Author-Zeile.
> Stop-Regeln stechen §0.8; an natürlichen Stopp-Punkten weiterarbeiten (Negativtests, Validierungstiefe, Doku).

SUBAGENTEN: db-rls-spezialist (Felder/RLS/Audit-Trigger) → edge-functions-spezialist (validierte Mutationen) →
qa-tester (Cross-Org-/Audit-Gate) → security-auditor; frontend-design-guardian + i18n-content-spezialist (Mobile-UI/Mikrocopy).

ENDZUSTAND: Track-D-Gate aus GATES.md grün (RLS-gesicherte Mutation · Cross-Org-Negativtest grün · Lade/Leer/Fehler · Audit).
„Fertig" erklärt der Owner. AM WELLENENDE: Abschlussbericht (unten) + PHASE_STATUS.md/MASTER_INDEX.md pflegen.
Beginne mit D0 (oder der ersten offenen Welle laut PHASE_STATUS.md) und nenne sie explizit.
```

---

# TRACK E — Datenmodell-Skalierung (Indizes · Pagination · Caching für 10 → 300 Höfe)

> **Eintrittsbedingung hart:** Das **WAVE_11-Performance-Gate muss grün sein**, bevor Track E beginnt (`finalization/WAVE_11_database.md` → „Übergang"). Track E ist die Wachstums-Schicht **über** WAVE_11 — keine spekulative Optimierung ohne messbare Last (§0.3 „keine Verschwendung").

```text
Du arbeitest im Repository LokaleBauernConnect. Du arbeitest AUSSCHLIESSLICH an Phase 4 / Track E —
Datenmodell-Skalierung (Indizes, Keyset-Pagination, Aggregate/Refresh, mehrstufiges Caching,
Geo-at-Scale, Volltextsuche, Verlaufs-Lebenszyklus) für 10 → 300 Höfe. Keine andere Strecke.

EINTRITTSBEDINGUNG (HART): WAVE_11-Performance-Gate muss grün sein (alle Pflicht-Indizes, farm_list_v =
security_invoker, kein Seq-Scan auf heißen Pfaden, getFarm = 1 Query, listFarms keyset-paginiert,
Tenant-Isolationstest grün). Ist WAVE_11 rot → das ist ein P0 und sticht jeden Track-E-Schritt: erst WAVE_11.

ROLLE: VERMITTLER. Skalierung ändert NIE die Vermittler-Wahrheit: kein Aggregat/keine Sicht suggeriert
Eigenverkauf, verbindlichen Bestand, garantierte Menge/Lieferung oder Beratung.
STACK FIX: React+Vite+TS(strict) · Supabase (EU, Postgres+RLS — Skalierung INNERHALB der Plattform, kein OS-Tuning)
 · Cloudflare (Pages/Workers, Cache API/Edge-Cache) · Stripe(+Connect). Kein Hetzner, kein Self-Host-Docker.

LIES ZUERST (gezielt):
1.  ~/AGENTS.md + ~/CLAUDE.md (§0-Direktive, 7 Produktionspfeiler)
2.  AGENTS.md + .claude/agents/* (bes. performance-cost-optimizer, db-rls-spezialist, devops, qa-tester, security-auditor)
3.  CLAUDE.md (RLS unantastbar, Wirtschaftlichkeit/Skalierung 10→300, Stop-Regeln)
4.  PHASEN.md (Phase 4 Track E; Bezug Phase 5 Customer-Gates 50/100/300) + finalization/01_PRIORITIES.md
5.  finalization/00_RULES.md + finalization/phase4_vertical/README.md
6.  finalization/WAVE_11_database.md (Vorgate — Fundament-Härtung; sein Gate MUSS grün sein)
7.  finalization/phase4_vertical/TRACK_E_DATABASE.md (Skalierungs-Annahmen, Zielbudget, Wellen, Stop-Regeln)
8.  finalization/phase4_vertical/CROSS_CUTTING.md (Geo berührt Track B; Migrations-Nummern)
9.  finalization/phase2_release/GATES.md (Gate E Performance) + finalization/phase4_vertical/GATES.md (Track-E-Gate)
10. finalization/phase4_vertical/MANUAL_TASKS.md (kostenpflichtige Aktivierungen) + docs/releases/PHASE_STATUS.md

LEITPRINZIPIEN (nicht verhandelbar):
- RLS ist unantastbar: jede neue View/Materialized-View/RPC/Funktion auf RLS-Wirkung geprüft
  (security_invoker bzw. bewusst geprüfte security definer mit auth.uid()-Bindung wie is_org_member).
  Aggregat ≠ Schattenwahrheit: Domain owns truth, Aggregat owns Geschwindigkeit. Aggregat ohne RLS-Beleg = Isolations-Bruch.
- Rein additiv & reversibel bis Owner-Freigabe: neue Migration/Edge/Skripte/Doku, lokal gegen supabase start verifiziert.
  Kein db push gegen Prod, keine kostenpflichtige Extension/Plattform-Aktivierung, kein commit/push ohne Owner-OK.
- Messen statt raten: „skaliert" ist eine geprüfte Zahl (EXPLAIN, Benchmark gegen 300-Hof-Synthetik), kein Gefühl. Query-/Kostenbudget je Endpoint dokumentiert.
- Kritische Wahrheiten NIE edge-cachen: SB-Zahlungsstatus, Reservierungsstatus, Entitlement kommen immer aus der Wahrheit, nie aus dem Cache.
- Keine N+1; Keyset/Cursor-Pagination an allen Listen; Caching mehrstufig (Cloudflare-Edge → RPC → Browser) nur für lesende öffentliche Sichten mit klarer Stale-Toleranz.

ARBEITE GENAU EINE WELLE/PHASE (je Welle Acceptance aus der Track-Datei; Reihenfolge laut TRACK_E_DATABASE.md):
E0 Last-Hypothese + Zielbudget fixieren + WAVE_11-Gate als grün bestätigen (Beleg) — read-only
E1 300-Hof-Synthetik-Seed + Baseline-Benchmark (EXPLAIN/ANALYZE auf heißen Pfaden)
E2 Materialisierte Aggregate + Refresh-Strategie (RLS-geprüft) für teure Übersichten
E3 Mehrstufiges Caching (Cloudflare-Edge → RPC → Browser) für lesende öffentliche Sichten — kritische Wahrheiten ausgenommen
E4 Geo-at-Scale (Bounding-Box/PostGIS-Anschluss, additiv) — vorbereitend für Track B, kein Doppelbau
E5 Volltextsuche + Verlaufsdaten-Lebenszyklus (Archiv/Partition-Readiness) + Verbindungs-/Kosten-Disziplin
E6 Last-Benchmark gegen 300-Hof-Synthetik, Kosten-/Latenz-Budget-Nachweis, Doku & Track-E-Gate

VERIFIKATION VOR „FERTIG":
- npm run build grün — Auszug. supabase db reset (lokal) wendet alle Migrationen idempotent an; bestehende Migrationen unverändert.
- EXPLAIN/ANALYZE belegt: kein Seq-Scan auf heißen Pfaden unter 300-Hof-Last; Index greift; Latenz im dokumentierten Budget.
- Keyset/Cursor-Pagination an allen Listen; kein N+1 (Query-Count belegt).
- RLS-Beweis je neuem Aggregat/Cache/View: Org A sieht keine Org-B-Daten (Cross-Org-Negativtest 403/0 Zeilen) — auch über die Aggregat-Sicht.
- Kein kritischer Status aus dem Cache (SB-Zahlung/Reservierung/Entitlement) — Test/Beleg.
- Kosten-/Latenz-Budget je Endpoint dokumentiert; 300-Hof-Benchmark grün.

STOP-REGELN:
- Prod statt lokal nötig (EXPLAIN/Benchmark/Refresh gegen Produktiv-Supabase) oder db push → STOP, Owner-Freigabe (Account/Kosten/irreversibel).
- Kostenpflichtige/teure Aktivierung (PostGIS, pg_trgm, pg_cron, pg_stat_statements, Read-Replica, größere Compute, Cache-Reserve) → STOP, Trade-off + Kosten in Klartext.
- Schema-/RLS-Semantikänderung (nicht rein additiv, Policy-Logik ändert sich, Spalten-Drop) → STOP, additiven Alternativweg + Rollback vorschlagen.
- Aggregat/Cache ohne RLS-Beleg → STOP, Isolations-Bruch-Verdacht, nicht ausliefern.
- Echte PostGIS-Distanz-Sortierung zwingend → STOP, das ist primär Track B mit eigenem ADR.
- Caching maskiert ein Stale-Risiko bei kritischer Wahrheit → STOP, nie edge-cachen.
- Referenzierte Datei/Function/Tabelle nicht gefunden → STOP. Jeder git commit/push → STOP, Owner-Freigabe + Co-Author-Zeile.
> Stop-Regeln stechen §0.8; an natürlichen Stopp-Punkten weiterarbeiten (mehr Benchmarks, RLS-Beweise, Doku).

SUBAGENTEN: performance-cost-optimizer + db-rls-spezialist (Aggregate/Indizes/RLS) → devops (Edge-Caching/Cloudflare) →
qa-tester (Isolations-/Last-Gate) → security-auditor (Aggregat-RLS, kein Cache-Leak kritischer Wahrheiten).

ENDZUSTAND: Track-E-Gate aus GATES.md grün (Indizes/Pagination · keine N+1 · Lastprofil 10→300 grün · Query-/Kostenbudget · RLS-Beweis).
„Fertig" erklärt der Owner. AM WELLENENDE: Abschlussbericht (unten) + PHASE_STATUS.md/MASTER_INDEX.md pflegen.
Beginne mit E0 (oder der ersten offenen Welle laut PHASE_STATUS.md) und nenne sie explizit.
```

---

## Pro-Welle-Kurzstart (wenn nicht der volle Track-Block nötig ist)

Wenn du nur an **einer** spezifischen Welle/Phase einer bereits laufenden Strecke arbeitest:

```text
Arbeite an Phase 4 / Track <A|B|C|D|E> · Welle <ID> aus der Track-Datei
finalization/phase4_vertical/<TRACK_A_SB_PAYMENT|TRACK_B_KARTE|TRACK_C_SAISON|TRACK_D_ERZEUGER_SELFSERVICE|TRACK_E_DATABASE>.md.

Lies vorher (gezielt — nur die nötigen Abschnitte):
- CLAUDE.md · finalization/00_RULES.md · finalization/01_PRIORITIES.md
- finalization/phase4_vertical/README.md (Übersicht + Cross-Cutting-Hinweis)
- Die Track-Datei (NUR der Abschnitt dieser Welle) · finalization/phase4_vertical/CROSS_CUTTING.md (falls Berührung)
- finalization/phase4_vertical/GATES.md (das Track-Gate) · docs/releases/PHASE_STATUS.md (aktueller Stand)

Pflicht in JEDER Phase-4-Welle (Cross-Cutting, README.md §7):
- Org-Boundary/RLS deny-by-default (fremde Org = 403, nie 200 mit Fremddaten)
- Zero-State statt Error (leere Arrays + sichtbarer Leerzustand, kein 500)
- jede Mutation: scoped/RLS-gesichert + Audit (wer/was/warum); kritische Aktion mit Reason
- service_role nur in Edge · Frontend nur VITE_-Public · Zod an Eingangsgrenzen · Turnstile bei öffentlichen Formularen
- Migrationen additiv (neue, fortlaufende Nummer — Nummernkollision mit anderen Tracks prüfen!) · keine hardcodierten Farben/Deko-Emojis
- NIEMALS zwei Tracks in einer Session (bes. A + C wegen E-Mail-Versand)

Liefere am Wellenende:
- Status pro Aufgabe (PASS/FAIL) mit ausgeführten Befehlen + Output
- Verifikation aus dem Track-Block (Build, gezielte Tests, Isolations-/Negativtest, Audit-Beweis)
- Track-Gate-Bezug (welches Kriterium adressiert, Stand mit Nachweis)
- Offene P0/P1-Blocker (Kategorie/Priorität/ETA) + manuelle Owner-Aufgaben
- Empfehlung: weiter zur nächsten Welle oder Blocker zuerst klären

Branch (Konvention): feat/phase4-track-<a|b|c|d|e>-<welle>-claude
```

---

## Abschlussbericht-Format (Pflicht pro Phase-4-Welle)

```text
## Track-Welle abgeschlossen: PHASE4 / Track <A–E> · <Welle-ID + Name>   (Datum: · Track-Gate-Bezug: …)

### Geändert
- <Datei/Migration (Nummer)/Edge Function/RLS-Policy/React-Route/Doku> — <was + warum>

### Verifikation (ausgeführt, nicht behauptet)
- npm run build (tsc strict + vite):                 <grün/rot + Auszug>
- supabase db reset (lokal, idempotent; 0001…N unverändert): <Ergebnis>   (bei DB-Wellen)
- Gezielte Tests (geänderte Pfade):                  <Liste + Ergebnis>
- Isolations-/Cross-Org-Negativtest (fremde Org = 403/0 Zeilen): <Ergebnis>
- Audit-Beweis je Mutation (wer/was/von→zu/warum, Reason bei kritisch): <Ergebnis>
- Track-spezifisch:
  · A: Webhook-Idempotenz · Server-Preis · Stand-Token · fee+net==amount · Refund-reason · Connect-Zero-State
  · B: Tiles/0 Konsolenfehler · CSP dicht · Geolocation-Opt-in · Deep-Link Pin→Detail
  · C: Double-Opt-In · Alert-Idempotenz/Dedup · Abbestellung · keine Klartext-Tracking-Daten
  · D: Cross-Org-Schreibschutz · serverseitige Validierung · Frische-Signal · Offline-Konsistenz
  · E: EXPLAIN kein Seq-Scan@300 · keine N+1 · Aggregat-RLS-Beweis · kritische Wahrheit nicht gecacht · Budget
- UI-Verdrahtung (Endpoint → Fetch → DOM → Lade/Leer/Fehler → Handler → Refresh) + Konsole sauber: <Ergebnis>

### Track-Gate-Bezug
- Adressiertes Kriterium (aus GATES.md): <Status + Nachweis>

### 7 Produktionspfeiler (Selbstcheck)
- Org-Boundary · Zero-State · Scope-Transparenz · RBAC · Audit · Tests · Drilldown/Disclaimer: <je ✅/offen>

### Risiken & manuelle Owner-Aufgaben
- <Retrofit-Risiko · Feature-Flag · Rollback (drop-/revert-Block)>
- Owner-Tasks → finalization/phase4_vertical/MANUAL_TASKS.md (Connect/Gebühr/Mail-Provider/Domain/kostenpflichtige Aktivierung)

### Doku/Tracker aktualisiert
- docs/releases/PHASE_STATUS.md · MASTER_INDEX.md · ggf. ADR/learning/pattern (.claude/memory bzw. .claude/learning): <ja/nein>

### Entscheidung
- weiter zu PHASE4 / Track <…> · Welle <…>  ODER  Stop wegen Blocker (Kategorie/Priorität/ETA)
```

**Verbotene Abschluss-Formate:** reine Dateiliste ohne Fachbeschreibung · „erledigt" ohne Test-Bezug · „Audit funktioniert" ohne erzeugten Eintrag · „alle Tests grün" ohne Ausführungsnachweis · „skaliert" ohne EXPLAIN/Benchmark · schwammige Risiken · Verschweigen von Restfehlern.

---

## Cross-Track-Kollisionswächter (vor jedem Start prüfen — Detail in `CROSS_CUTTING.md`)

- **A und C niemals zusammen** — geteilter E-Mail-Versand (`_shared/email.ts`): Quittungen (A) und Alerts (C) müssen idempotent + rate-limitiert versenden; in einer Session kollidieren sie.
- **Migrations-Nummern sind global fortlaufend** — Track A plant `0005`/`0006`, Track C plant `0006_season_alerts`, Track D/E ggf. weitere. **Vor dem Anlegen** per Glob die höchste vorhandene Nummer prüfen und die nächste freie vergeben; nie zwei Migrations-Tracks parallel.
- **Geo berührt B und E** — Bounding-Box/PostGIS: B baut die Karte, E den skalierbaren Datenpfad. Echte DB-Distanz-Sortierung gehört zu B (eigener ADR), E liefert nur den additiven Anschluss.
- **Frische-Signal/Saison-Felder berühren C und D** — `availability_updated_at`/`season_from`/`season_to`: wer die Migration zuerst anlegt, besitzt sie; der andere Track liest, dupliziert nicht.
- **Audit-Namespace + RLS-Helfer sind geteilt** — `is_org_member`/`current_org_ids`/`audit_log` werden in allen Tracks genutzt, nie neu erfunden.

---

## Bezug & Abhängigkeiten

- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, USP, Backend-/Edge-/Payment-/Frontend-Regeln, Stop-Regeln) · `AGENTS.md` (harte Regeln + Subagenten-Roster) · `PHASEN.md` (Phase 4 Tracks A–E + Marktstart-Pflicht-Set).
- **Landkarte:** `MASTER_INDEX.md` Abschnitt 7 (`finalization/phase4_vertical/*`).
- **Diese Schicht:** `finalization/phase4_vertical/README.md` (Übersicht/Reihenfolge) · `GATES.md` (Track-Gates) · `MANUAL_TASKS.md` (Owner-Entscheidungen) · `CROSS_CUTTING.md` (Kollisionen) · die fünf Track-Dateien (Single Source je Strecke).
- **Vorgates:** Phase-1-Go-Live-Gate (`finalization/99_GOLIVE_GATE.md`) · Phase-2-Gates A–F (`finalization/phase2_release/GATES.md`) · Phase-3-Ops-Gate (`finalization/phase3_betrieb/MASTERPROMPT.md`) · `WAVE_11_database.md` (Track-E-Eintritt).

> **Vermittler-Disclaimer (durchgängig, alle Tracks):** Die Plattform **vermittelt**, bindet ggf. die Zahlung an und stellt einen Beleg/Hinweis aus. Verkäufer/Steuerpflichtiger ist der **Hof**. Die Plattform **verkauft nicht selbst**, **berät nicht**, gibt **keine Mengen-/Liefergarantie** und übernimmt **keine Warenhaftung**. Jeder Account-/Kosten-/Vertrags-/Domain-/Go-Live-Schritt: **vorab in Klartext ankündigen, erst auf Owner-OK.**
