# Phase 4 — Vertikale Strecken (Tracks A–E)

> **Zweck:** Fünf thematisch eigenständige Feature-/Reifungs-Strecken, die das Kernprodukt aus Phase 1–3 vertikal vertiefen. Jede Strecke ist abgegrenzt, hat eigene Wellen, ein eigenes Gate und einen eigenen Masterprompt. **Eine Strecke pro Session** (Token-Fokus, keine Race Conditions).
>
> Adaptiert aus der Finalisierungsmaschine von TempConnect (`finalization/phase4_vertical/`) auf **React+Vite+TS · Supabase (EU, RLS) · Cloudflare · Stripe (+Connect)** und auf die **Hof-Domäne** überschrieben. VMS-Begriffe (Vendor Pool, Einsatzportal, Stundenzettel, Hetzner) sind durchgängig durch Hof-Äquivalente ersetzt. Das BBQ-Original bleibt unangetastet.

---

## 1. Was Phase 4 ist

Phase 1–3 sind **querschnittlich** (Fundament/Kernprodukt, Release-Operatives, Betriebszentrale). Phase 4 ist **vertikal**: jede Strecke betrifft genau einen abgegrenzten Produkt-/UX-/Infra-Bereich und liefert ihn auf Enterprise-Reife.

| Strecke | Track-Datei | Charakter | Status (Repo) |
|---|---|---|---|
| **A — SB-Bezahlung (USP) ⭐** | `TRACK_A_SB_PAYMENT.md` | Neues Feature, voll-stack (QR → Stripe → Quittung) | Backend vorhanden — QR-Stand-UI offen |
| **B — Interaktive Karte** | `TRACK_B_KARTE.md` | Such-/Entdeck-UX (Leaflet/MapLibre · OSM) | ✅ fertig (2026-06-20) |
| **C — Saison & Benachrichtigungen** | `TRACK_C_SAISON_BENACHRICHTIGUNGEN.md` | Saison-Radar + Alerts (Lieblingsprodukte/Verfügbarkeit) | Saison-Daten teilweise — Alert-Engine offen |
| **D — Erzeuger-Self-Service** | `TRACK_D_ERZEUGER_SELFSERVICE.md` | Mobile Verfügbarkeits-/Bestandspflege, Abholfenster | Datenmodell vorhanden — Pflege-UI offen |
| **E — Datenmodell-Skalierung** | `TRACK_E_DATENMODELL_SKALIERUNG.md` | Infra: Indizes, Pagination, Caching für 300 Höfe | Migrationen-Basis vorhanden — Härtung offen |

> ⭐ **Track A ist die geschäftskritische Strecke** — der USP der Plattform und (neben dem Erzeuger-Abo aus WAVE_09) der zweite reale Geldfluss. Siehe Marktstart-Pflicht-Set in `../../PHASEN.md`.

---

## 2. Verhältnis zu Phase 1–3

```
Phase 1 (Fundament/Kernprodukt: Datenmodell+RLS, Finder, Reservierung) ──┐
Phase 2 (Release: Cloudflare-Deploy, Gates A–F, Security-Header) ────────┼─→ Voraussetzung
Phase 3 (Betriebszentrale: Owner/Staff-Konsole, Audit, Feature-Flags) ───┘   für jede Phase-4-Strecke

Phase 4 Track A (SB-Bezahlung) ──→ knüpft an WAVE_06 (Auth) + WAVE_09 (Billing/Stripe-Connect) + Phase 3 (Audit)
Phase 4 Track B (Karte) ─────────→ erweitert WAVE_04 A (Hofladen-Finder) — bereits umgesetzt
Phase 4 Track C (Saison/Alerts) ─→ erweitert WAVE_04 D (Saison-Radar) + WAVE_06 (Auth) + Benachrichtigungs-Kern
Phase 4 Track D (Self-Service) ──→ konkretisiert WAVE_04 B/C (Verfügbarkeit/Reservierung) für Erzeuger mobil
Phase 4 Track E (Skalierung) ────→ vertieft WAVE_11 (DB-Härtung) für 10→300→3000
```

**Wichtig:** Phase-4-Strecken sind **nicht zwingend** Voraussetzung für den Marktstart — mit **einer** Ausnahme: **Track A (SB-Bezahlung) ODER WAVE_09 (Erzeuger-Abo)** muss stehen, damit mindestens **ein realer Geldfluss** existiert (siehe `../../PHASEN.md` → Marktstart-Pflicht-Set). Die übrigen Tracks (B/C/D/E) heben das Produkt zusätzlich und folgen diszipliniert nach dem ersten zahlenden Kunden (Gate 10).

---

## 3. Inhalt dieser Schicht

| Datei | Zweck |
|---|---|
| `README.md` | Diese Übersicht (Zweck, Reihenfolge, Cross-Cutting) |
| `TRACK_A_SB_PAYMENT.md` ⭐ | SB-Bezahlung am unbemannten Hofladen: QR am Stand → Stripe → Quittung; Erzeuger-Dashboard (Einnahmen/Schwund). Eigener ADR. |
| `TRACK_B_KARTE.md` | Interaktive Karte: Leaflet/MapLibre (OSM), Hof-Pins, Cluster, „in der Nähe", Liste/Karte-Umschalter |
| `TRACK_C_SAISON_BENACHRICHTIGUNGEN.md` | Saison-Radar + Alert-Engine (Verfügbarkeits-/Lieblingsprodukt-Benachrichtigung), Opt-in, DSGVO |
| `TRACK_D_ERZEUGER_SELFSERVICE.md` | Mobile Erzeuger-Selbstpflege: Verfügbarkeit/Bestand/Preise/Abholfenster |
| `TRACK_E_DATENMODELL_SKALIERUNG.md` | Indizes, Pagination, N+1-Tilgung, Edge-/CDN-Caching für 300 Höfe und viele Käufer |
| `GATES.md` | Track-spezifische Gates (A SB-Payment, C Alerts, D Self-Service, E Skalierung) |
| `MANUAL_TASKS.md` | Owner-Entscheidungen (Stripe-Connect-Modell, Transaktionsgebühr, Quittungs-/Pflichttexte, Domain) |
| `MASTERPROMPTS.md` | Ein Start-Prompt je Track (kanon-konform, kopierbereit) |
| `CROSS_CUTTING.md` | Berührungspunkte zwischen Tracks (Race Conditions vermeiden) |

---

## 4. Reihenfolge / Parallelität

**Empfohlene Bau-Reihenfolge (wirtschaftlich priorisiert — §0.3):**

1. **Track A zuerst (geschäftskritisch ⭐)** — der USP und ein realer Geldfluss. Voraussetzung: WAVE_06 (Auth), WAVE_09 (Stripe/Connect-Infra) + Phase 3 (Audit) stehen bereits als Basis. Höchster Owner-Wert pro Welle.
2. **Track D parallel-fähig** — Erzeuger-Self-Service ist unabhängig von der Bezahlung und füttert die Datenbasis (gepflegte Verfügbarkeit), von der Track C und der Finder leben. Frühe Erzeuger-Bindung.
3. **Track C nach D** — die Alert-Engine ist nur so gut wie die gepflegten Verfügbarkeitsdaten; sie baut sinnvoll auf Track D auf.
4. **Track E begleitend** — Skalierungs-Härtung läuft als Hintergrund-/Reifungsstrecke mit, ausgelöst durch reale Last (Customer-Gates 50/100/300 aus Phase 5).
5. **Track B ist bereits abgeschlossen** (Leaflet/OSM, Liste/Karte-Umschalter, 9 Hof-Pins + Popups, CSP für Tiles erweitert, verifiziert — siehe `docs/releases/PHASE_STATUS.md`). Weiterführung nur als Inkrement (Cluster, „in der Nähe"/Geolocation, Hof-Detail-Deep-Link von Pin).

**Bei Kapazitätsdruck:**
- **Track A + Gate 10** bündeln (erster zahlender Geldfluss → Marktstart-Schwelle).
- **Track C/D in eigenen, alternierenden Sessions** — kleinere Wellen, klarer Fokus.
- **Track E erst bei messbarer Last** (keine spekulative Optimierung — §0.3 „keine Verschwendung").

> **Niemals in derselben Session:** Track A **und** Track C — beide berühren den Benachrichtigungs-/Quittungs-Versand (E-Mail-Provider) und würden sich an gemeinsamen Stellen ins Gehege kommen. Details: `CROSS_CUTTING.md`.

---

## 5. Zielwerte je Strecke (Definition of Done)

### Track A — SB-Bezahlung (USP) ⭐
- End-to-end: QR am SB-Stand → Stripe-Checkout (Preis **serverseitig**, nie aus Client) → erfolgreiche Zahlung → **Quittung per E-Mail** + Bildschirm-Beleg.
- **EIN** signaturgeprüfter, **idempotenter** Stripe-Webhook als Wahrheit; Entitlements/Buchungen serverseitig in `sb_payments`/`payment_events` (RLS, org-gebunden).
- Erzeuger-Dashboard: Einnahmen, Transaktionen, **Schwund-Indikation**, Auszahlungsstatus (Stripe Connect).
- Compliance: Plattform = **Zahlungsanbindung/Vermittler**, kein Eigenverkauf; Vermittler-Disclaimer + Lebensmittel-Hinweis durchgängig. Eigener ADR unter `.claude/memory/decisions/`.
- Reife ≥ 9,0/10, marktstart-tauglich für `plus`/`pro`/`individuell`.

### Track B — Interaktive Karte ✅
- Erreicht: Leaflet/OSM, Liste/Karte-Umschalter, Hof-Pins + Popups, 0 Konsolenfehler, CSP für Tiles erweitert.
- Restinkrement: Marker-Cluster bei dichten Regionen, „in der Nähe" via Geolocation (Opt-in), Deep-Link vom Pin in die Hof-Detailseite.

### Track C — Saison & Benachrichtigungen
- Saison-Radar zeigt regionale Saisonalität faktenbasiert; Käufer abonniert Lieblingsprodukte/Höfe (**Opt-in, default OFF**, DSGVO-konform, jederzeit abbestellbar).
- Verfügbarkeits-Alert wird **idempotent** ausgelöst (kein Spam, dedupliziert, Rate-Limit), wenn ein abonniertes Produkt verfügbar wird.
- Zero-State sauber (keine Saisondaten → „Noch keine Saisondaten für diese Region").

### Track D — Erzeuger-Self-Service
- Erzeuger pflegt **mobil** Verfügbarkeit, Bestand/Menge, Preise und Abholfenster — RLS-gesichert (nur eigene `org_id`/Höfe), Audit pro Mutation.
- Optimistische UI mit Lade-/Leer-/Fehlerzuständen; Offline-tolerant (PWA-tauglich) für Bedienung am Hof.
- Keine fremde Org schreibbar (Cross-Org-Negativtest grün).

### Track E — Datenmodell-Skalierung
- Indizes auf Hot-Paths (Geo/Region, Produkt-Verfügbarkeit, Reservierungen); **keine N+1**; Pagination/Cursor an allen Listen.
- Edge-/CDN-Caching (Cloudflare) für lesende öffentliche Sichten; Kosten-/Latenz-Budget dokumentiert.
- Lasttest-Profil 10→300 Höfe grün; Query-Budget je Endpoint eingehalten.

---

## 6. Wie Claude mit Phase 4 arbeitet (pro Session)

1. `../../CLAUDE.md` + `~/CLAUDE.md` (§0-Direktive) + `../../AGENTS.md`
2. `../00_RULES.md` (sofern vorhanden) und `../../PHASEN.md`
3. **Diese** `README.md`
4. **Genau eine** Track-Datei (A, B, C, D **oder** E)
5. Bei Berührungspunkten: `CROSS_CUTTING.md`
6. Relevantes `.claude/memory/` (INDEX + decisions/patterns)

**Subagenten-Andockung (aus `../../AGENTS.md`):**
- **Track A** → `payment-engineer` + `edge-functions-spezialist`, danach `security-auditor` + `compliance-officer`; Ergebnis-Architektur als ADR über `architekt`.
- **Track B/C/D (UI)** → `frontend-design-guardian` (Editorial-Token-System, keine Deko-Emojis), `i18n-content-spezialist` (Mikrocopy/Trust-Texte).
- **Track C/D (DB)** → `db-rls-spezialist`, danach `qa-tester` (Isolations-/Cross-Org-Test).
- **Track E** → `performance-cost-optimizer` + `db-rls-spezialist`; `devops` für Edge-Caching/Cloudflare.
- Vor jedem Merge → `qa-tester`; bei sensiblen Änderungen → `security-auditor`.

> **Niemals zwei Tracks gleichzeitig** in einer Session — Token-Effizienz (§0.2) und Fokus (§0.8: am wertvollsten verfügbaren Schritt dranbleiben).

---

## 7. Cross-Cutting — was über alle Tracks gilt

Diese Querschnitts-Regeln gelten in **jeder** Phase-4-Strecke (Detail-Matrix in `CROSS_CUTTING.md`):

- **Org-Boundary / RLS deny-by-default** — jede Query org-gebunden; fremde Org = 403, nie 200 mit Fremddaten. Gilt für SB-Zahlungen, Alerts, Self-Service-Mutationen, gecachte Sichten.
- **Zero-State statt Error** — keine 500 bei leeren Daten; leere Arrays + sichtbarer „Noch keine Daten"-Zustand (Karte ohne Höfe, Dashboard ohne Transaktionen, Radar ohne Saisondaten).
- **Scope-Transparenz** — Responses tragen `scope` (org/region/zeitraum); UI zeigt Kontext + Datenstand.
- **Audit & Reason-Pflicht** — jede Mutation (Self-Service-Änderung, Refund, Alert-Abo) protokolliert wer/was/warum; kritische Aktionen mit Confirm + Reason + Risk-Level (Phase-3-Konsole).
- **E-Mail-/Versand-Kanal geteilt** — Quittungen (Track A) und Alerts (Track C) nutzen **denselben** Mail-Provider (`resend`/`sendgrid`/`console`) und müssen idempotent + rate-limitiert versenden. Kollisionsgefahr → niemals A und C in einer Session.
- **Vermittler-Rolle & Disclaimer** — durchgängig: Plattform vermittelt/bindet Zahlung an, verkauft nicht selbst, berät nicht. Lebensmittel-Kennzeichnungs-Hinweis sichtbar.
- **Stack-Disziplin** — service role nur in Edge Functions; Frontend nur `VITE_`-Public-Keys; Zod an allen Eingangsgrenzen; Turnstile bei öffentlichen Formularen; keine hardcodierten Farben/Schwellwerte.
- **Migrationen additiv** — SQL nur als neue Migration unter `app/supabase/migrations/`, je Tabelle `org_id`/Tenant, Zeitstempel, `deleted_at`, RLS + Isolationstest. Kein destruktives ALTER ohne Rollback.

---

## 8. Track-Gates & Marktstart-Bezug

Jede Strecke hat ein eigenes Gate (Detail in `GATES.md`). Marktstart-relevant ist allein **Track-A-Gate** (oder ersatzweise WAVE_09-Gate) als „mind. ein Geldfluss":

| Gate | Kriterium (Kurz) | Marktstart-relevant |
|---|---|---|
| **Track-A-Gate (SB-Payment)** | QR→Stripe→Quittung end-to-end · Webhook idempotent+signiert · Connect-Auszahlung · Audit · Disclaimer | **JA** (oder WAVE_09) |
| **Track-B-Gate (Karte)** | ✅ erfüllt — Tiles laden, 0 Fehler, Liste/Karte verdrahtet | nein |
| **Track-C-Gate (Alerts)** | Opt-in/DSGVO · idempotente Alerts · kein Spam · Zero-State | nein |
| **Track-D-Gate (Self-Service)** | RLS-gesicherte Mutation · Cross-Org-Negativtest grün · Lade/Leer/Fehler · Audit | nein |
| **Track-E-Gate (Skalierung)** | Indizes/Pagination · keine N+1 · Lastprofil 10→300 grün · Query-/Kostenbudget | nein (Phase-5-Bezug) |

> Vollständiges Marktstart-Pflicht-Set: `../../PHASEN.md`. Tracker der Realität: `../../docs/releases/PHASE_STATUS.md`.

---

## 9. Abschlussbericht-Format pro Welle (verbindlich)

```
## Track-Welle abgeschlossen: <Track> · <Welle>
- Geändert: <Dateien/Migrationen/Edge Functions>
- Tests: <Unit/Integration/E2E/Cross-Org>
- Risiken: <Retrofit/Feature-Flag/Rollback>
- Gate-Stand: <offen/grün>
- Nächste Welle: <…>
```

> Nach jeder Welle: `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` aktualisieren; wiederverwendbare Lektion → `.claude/learning/insights_inbox.md`. `.claude/` nie ins Release-Artefakt.
