# CORE_BUSINESS_STATE_MACHINES — LokaleBauernConnect

> **Die kanonische Wahrheit über alle Statusübergänge der Kerngeschäfts-Objekte.**
> Reservierung · Produktverfügbarkeit · Hof-Verifizierung · SB-Zahlung.
> Jeder Übergang ist hier definiert, mit erlaubten Vorzuständen, auslösendem Event, Akteur/Berechtigung, Vor- und Nachbedingungen, Audit-Pflicht und Seiteneffekten. **Was hier nicht steht, ist verboten** (deny-by-default — auch für Status).

- **Stand:** 2026-06-20 · **Phase:** 1 (Fundament & Kernprodukt) · **Welle-Bezug:** WAVE_02–04, WAVE_07, WAVE_09, Phase 4 Track A
- **Geltungsbereich:** Plattform-Spezialschicht (Vermittler-Rolle). Kern-Mechaniken (Auth, Billing-Engine, Audit-Bus) werden nur angedockt, nicht hier neu definiert.
- **Quelle der Status-Begriffe (verbindlich):** die echten Migrationen `app/supabase/migrations/0001_core.sql … 0004_onboarding.sql` (Enums `reservation_status`, `availability_state`, `payment_status`, `application_status`) sowie `app/src/lib/types.ts` (`Availability = 'available' | 'low' | 'soon' | 'out'`) und `app/src/components/AvailabilityBadge.tsx`. Schema-Referenz: `docs/DATABASE_MODEL.md`. **Hinweis:** Verfügbarkeit ist die Enum-Spalte `products.availability` (Typ `availability_state`) — es gibt **keine** separate `availability`-Tabelle.

---

## 0 · Warum dieses Dokument verbindlich ist (die Regeln vor den Diagrammen)

Undefinierte Statusübergänge sind im Kanon (`CLAUDE.md` Stop-Regeln) explizit als Blocker gelistet („Statusübergänge undefiniert → anhalten"). Dieses Dokument schließt diesen Blocker für alle vier Kern-Objekte der Plattform. Es ist die **Single Source of Truth**, gegen die Edge Functions, RLS-Policies, der Stripe-Webhook und die Frontend-Zustände implementiert werden.

### 0.1 — Universelle Invarianten (gelten für ALLE Maschinen)

1. **Deny-by-default für Status.** Jeder Übergang, der nicht in der jeweiligen Übergangstabelle steht, ist ungültig und wird serverseitig mit `409 Conflict` (illegaler Übergang) bzw. `403` (fehlende Berechtigung) abgewiesen — niemals stillschweigend angewendet (vgl. 7 Produktionspfeiler, „kein stiller Fehler").
2. **Server ist führend.** Der Statusübergang wird **ausschließlich serverseitig** (Edge Function / DB-Constraint / RLS / Stripe-Webhook) entschieden und persistiert. Das Frontend spiegelt nur und darf einen Übergang nie selbst „setzen".
3. **Org-Boundary.** Jeder Übergang ist `org_id`-gebunden. Ein Akteur darf nur Objekte der eigenen Org bzw. der für ihn freigegebenen Beziehung verändern. Fremd-Org = `403`, nie `200` mit Fremddaten (Pfeiler 1).
4. **Audit-Pflicht.** Jeder Übergang erzeugt einen unabschaltbaren Audit-Eintrag: `wer` (actor_id, Rolle), `was` (objekt, from→to), `wann` (ts), `warum` (`reason` — **Pflicht** bei allen kritischen/abweisenden Übergängen: Stornierung, Ablehnung, Erstattung), `wie` (event, request_id/idempotency_key) (Pfeiler 5).
5. **Idempotenz.** Jeder von extern getriggerte Übergang (Stripe-Webhook, Client-Retry) ist idempotent: derselbe Event/`idempotency_key` führt höchstens einmal zum Übergang. Wiederholung im Zielzustand = `no-op` + `200`.
6. **Zeitstempel & Soft-Delete.** Tabellen tragen `created_at` (durchgängig); `updated_at` + `set_updated_at`-Trigger nur auf `farms`/`products`/`subscriptions`; `deleted_at` nur auf `orgs`/`farms`/`org_locations` (vgl. `DATABASE_MODEL.md`). **Hinweis zum Ist-Stand (0001–0004):** `reservations` führt nur `status` + `created_at` — separate `confirmed_at`/`picked_up_at`-Spalten existieren **nicht**; der Statuswert selbst ist die Wahrheit über den Lifecycle. Solche Zustands-Zeitstempel sind Spezifikations-Soll für eine spätere additive Migration.
7. **Terminale Zustände sind final.** Aus einem terminalen Zustand führt kein Übergang heraus (Ausnahmen explizit dokumentiert, z. B. Zahlung `bezahlt → erstattet`). Re-Aktivierung passiert nur durch ein **neues Objekt**, nie durch Rück-Mutation.
8. **Zero-State vor Error.** Fehlt ein Objekt oder ist eine Liste leer, antwortet die API mit Zero-State (`available:false`/leere Arrays), nicht mit `500` (Pfeiler 2).
9. **Vermittler-Disclaimer.** Kein Übergang impliziert einen Kaufvertrag mit der Plattform. Die Plattform vermittelt Reservierung/Zahlung; Vertragspartner ist stets der Hof. Disclaimer begleitet jeden kaufnahen Zustand in der UI.

### 0.2 — Notation

- **Zustand:** `[zustand]` (intern, snake_case, EN-Schlüssel) — UI-Label in „Anführungszeichen" (DE).
- **Übergang:** `from --[event / akteur]--> to`.
- **Terminal:** mit ⏹ markiert. **Initial:** mit ▶ markiert.
- **Guard:** Vorbedingung, die erfüllt sein muss, sonst wird der Übergang abgewiesen.
- **Effekt:** Seiteneffekt (Benachrichtigung, Bestands-Korrektur, Audit, Webhook-Reaktion).

> Status-Schlüssel werden **EN/snake_case** persistiert (DB-stabil, sprachneutral), UI-Labels sind **DE**. So bleibt der Datenstand bei i18n unverändert.

---

## 1 · Reservierung (`reservations`)

Eine Reservierung ist die Absichtserklärung eines Käufers, beim Hof Ware in einem Abholfenster abzuholen. **Keine Online-Bezahlung** an dieser Stelle (Zahlung erfolgt vor Ort bzw. — separat — über die SB-Zahlung, §4). Die Plattform vermittelt nur.

### 1.1 — Zustände

| Schlüssel | UI-Label | Art | Bedeutung |
|---|---|---|---|
| `requested` | „Angefragt" | ▶ initial | Käufer hat reserviert, Hof hat noch nicht bestätigt. |
| `confirmed` | „Bestätigt" | Zwischenstand | Hof hat die Reservierung angenommen; Ware ist im Abholfenster vorgesehen. |
| `picked_up` | „Abgeholt" | ⏹ terminal (Erfolg) | Käufer hat die Ware im Fenster abgeholt; Vorgang abgeschlossen. |
| `cancelled` | „Storniert" | ⏹ terminal | Aktiv abgebrochen (durch Käufer **oder** Hof) vor Abholung. |
| `expired` | „Abgelaufen" | ⏹ terminal | Abholfenster verstrichen ohne Abholung; automatisch durch System. |

### 1.2 — Erlaubte Übergänge

| # | from | event | to | Akteur (Berechtigung) | Guard (Vorbedingung) | Effekt |
|---|---|---|---|---|---|---|
| R1 | ▶ — | `reservation.create` | `requested` | Käufer (auth **oder** Gast + Turnstile) | Produkt nicht `out`; `quantity ≥ 1`; `pickupWindow ∈ farm.pickupWindows`; gültige `contact` | Audit `reservation.requested`; Benachrichtigung an Hof; optional weiche Bestands-Reservierung |
| R2 | `requested` | `reservation.confirm` | `confirmed` | Erzeuger des Hofes (Org-Owner/Staff) | Reservierung gehört zum Hof der Org; nicht abgelaufen | Audit `reservation.confirmed`; Benachrichtigung an Käufer (mit Abholdetails) |
| R3 | `requested` | `reservation.cancel` | `cancelled` | Käufer (eigene Res.) **oder** Erzeuger des Hofes | `reason` Pflicht | Audit `reservation.cancelled` (+ wer); Benachrichtigung an Gegenseite; weiche Reservierung freigeben |
| R4 | `confirmed` | `reservation.cancel` | `cancelled` | Käufer (eigene Res.) **oder** Erzeuger des Hofes | `reason` Pflicht; nur **vor** Abholzeitpunkt | Audit `reservation.cancelled`; Benachrichtigung; Reservierung freigeben |
| R5 | `confirmed` | `reservation.pick_up` | `picked_up` | Erzeuger des Hofes (bestätigt Abholung) | innerhalb/um das Abholfenster; Reservierung gehört zum Hof | Audit `reservation.picked_up`; Vorgang abgeschlossen; optional Bewertungs-Einladung |
| R6 | `requested` | `reservation.expire` | `expired` | System (geplanter Job/Edge Cron) | Abholfenster **+ Karenz** verstrichen, ohne Bestätigung **oder** Abholung | Audit `reservation.expired` (actor=system); Benachrichtigung an Käufer; Reservierung freigeben |
| R7 | `confirmed` | `reservation.expire` | `expired` | System (geplanter Job/Edge Cron) | Abholfenster **+ Karenz** verstrichen, ohne `picked_up` | Audit `reservation.expired`; Benachrichtigung an beide Seiten |

> **Nicht erlaubt (Beispiele, werden mit `409` abgewiesen):** `requested → picked_up` (Abholung ohne Bestätigung), `picked_up → *` (terminal), `cancelled → *`, `expired → *`, Bestätigung durch einen org-fremden Erzeuger (`403`).

### 1.3 — Diagramm (textuell)

```
                         ┌──────────────────────────────────────────────┐
                         │                                              │
   ▶ create (R1)         │  R3 cancel (Käufer/Hof, reason)              ▼
  ──────────────► [requested] ──────────────────────────────────► [cancelled] ⏹
                     │  │                                                ▲
        R2 confirm   │  │ R6 expire (System: Fenster+Karenz)            │ R4 cancel
        (Hof)        │  └──────────────────────────────► [expired] ⏹    │ (reason)
                     ▼                                       ▲          │
                 [confirmed] ──────────────────────────────-┘          │
                     │  │  R7 expire (System: Fenster+Karenz)           │
        R5 pick_up   │  └───────────────────────────────────────────────┘
        (Hof)        ▼
                 [picked_up] ⏹
```

### 1.4 — Guards & Geschäftsregeln im Detail

- **Karenz (Grace Period):** Eine Reservierung läuft nicht zum Sekundenende des Fensters ab, sondern nach einer konfigurierbaren Karenz (Default 24 h nach Fenster-Ende; pro Hof überschreibbar, Schwelle als Konfig, **nie hartkodiert** — Design-/Konfig-Disziplin). Dies verhindert „Abgelaufen" für Abholungen kurz nach Fensterende.
- **Doppel-Stornierung:** `cancel` auf eine bereits `cancelled`/`expired`/`picked_up` Reservierung = `409` (illegaler Übergang), nicht `500`.
- **Gast-Reservierung:** Ohne Konto erlaubt (Friktionsabbau), aber Turnstile-Pflicht + Rate-Limit (öffentlicher Flow). Verwaltung danach nur über signierten Deep-Link (kein Auth-Kontext) — der Link autorisiert nur diese eine Reservierung.
- **RLS (Ist-Stand 0001–0003):** `reservations` hat **keine** `created_by`/`buyer_id`-Spalte; Käufer/Gäste haben **keine** SELECT-Policy — Einsicht/Storno einer eigenen Reservierung läuft ausschließlich über einen signierten Bestätigungs-Token (Edge Function), nie über eine direkte Käufer-Lesepolicy. Erzeuger lesen nur Reservierungen ihrer Org (`reservations_owner_read`: `is_org_member(org_id)`); UPDATE/DELETE nur `service_role`. Staff (Support) liest org-übergreifend nur über die Support-Andockung (WAVE_07), mit Audit.
- **Abgrenzung Zahlung:** Reservierung ≠ Zahlung. Eine Reservierung kann „abgeholt" werden, ohne dass je eine SB-Zahlung (§4) entstand (Zahlung bar/vor Ort). **Hinweis Ist-Stand:** `sb_payments` (0002/0003) hat **keine** `reservation_id`-Spalte — eine direkte Reservierung↔Zahlung-Verknüpfung ist Spezifikations-Soll (additive Spalte einer späteren Migration), heute nicht persistiert.

### 1.5 — Zustand → API/Effekt-Matrix

| Zustand | Käufer-Aktionen | Erzeuger-Aktionen | System-Trigger | Benachrichtigung |
|---|---|---|---|---|
| `requested` | stornieren (R3) | bestätigen (R2), stornieren (R3) | expire (R6) | Hof: „Neue Reservierung" |
| `confirmed` | stornieren (R4) | Abholung bestätigen (R5), stornieren (R4) | expire (R7) | Käufer: „Bestätigt + Abholdetails" |
| `picked_up` | — (Bewertung möglich) | — | — | Käufer: „Danke / Bewertung" |
| `cancelled` | neue Reservierung anlegen (R1) | — | — | Gegenseite: „Storniert (Grund)" |
| `expired` | neue Reservierung anlegen (R1) | — | — | Käufer: „Fenster verstrichen" |

---

## 2 · Produktverfügbarkeit (`availability` / `products.availability`)

Vom Erzeuger selbst gepflegter Status pro Produkt (Self-Service, WAVE_04 B / Phase 4 Track D). Steuert die Sichtbarkeit/Reservierbarkeit im Finder. **Vier Stufen**, exakt wie in `types.ts` und im `AvailabilityBadge`.

### 2.1 — Zustände

| Schlüssel | UI-Label | Art | Reservierbar? | Bedeutung |
|---|---|---|---|---|
| `available` | „Verfügbar" | regulär | ja | Ware ist vorrätig. |
| `low` | „Wenig übrig" | regulär (Warnung) | ja | Geringer Restbestand; Käufer wird zu zügiger Reservierung motiviert. |
| `soon` | „Bald wieder" | Vorschau | nein (nur Merken/Alert) | Aktuell aus, Wiederverfügbarkeit erwartet (Saison/Charge). |
| `out` | „Ausverkauft" | gesperrt | nein | Nicht verfügbar; keine Reservierung möglich. |

> **Bewusst KEIN „deleted"-Status hier:** Produkt-Löschung ist Soft-Delete auf Tabellenebene (`deleted_at`), kein Verfügbarkeits-Zustand. Verfügbarkeit beschreibt nur lebende Produkte.

### 2.2 — Erlaubte Übergänge

Verfügbarkeit ist ein **frei navigierbarer Zustandsgraph** unter den vier Stufen — jeder Erzeuger darf sein Produkt jederzeit auf jede Stufe setzen (Self-Pflege). Es gibt **keine** verbotenen Stufen-zu-Stufen-Wechsel; die Guards betreffen Berechtigung, nicht die Richtung. Zusätzlich existieren **systemgetriebene** Übergänge (Reservierungs-Kopplung, Saison-Radar).

| # | from | event | to | Akteur | Guard | Effekt |
|---|---|---|---|---|---|---|
| V1 | beliebig | `availability.set` | `available`/`low`/`soon`/`out` | Erzeuger des Produkts | Produkt gehört zur Org; Zielwert ∈ Enum | Audit `availability.changed` (from→to); Finder-Cache invalidieren; ggf. Alerts (V4) |
| V2 | `available` | `availability.auto_low` | `low` | System (optional) | Restmenge ≤ Schwelle (Konfig pro Hof) | Audit (actor=system); Badge wechselt |
| V3 | `low`/`available` | `availability.auto_out` | `out` | System (optional) | Restmenge = 0 (wenn Mengen geführt) | Audit (actor=system) |
| V4 | `soon`/`out` | `availability.set` → `available`/`low` | `available`/`low` | Erzeuger **oder** System (Saison-Radar) | — | **Alert-Fanout** an Käufer mit aktivem Lieblings-/Verfügbarkeits-Alert (Phase 4 Track C) |

> **Mengenführung optional:** V2/V3 greifen nur, wenn der Hof Mengen pflegt. Ohne Mengen ist Verfügbarkeit rein manuell (V1) — die Plattform erzwingt keine Bestandsführung (Vermittler, kein Warenwirtschaftssystem).

### 2.3 — Diagramm (textuell)

```
        V1 set (Erzeuger, frei in jede Richtung)
   ┌───────────────┬───────────────┬───────────────┐
   ▼               ▼               ▼               ▼
[available] ◄──► [low] ◄──► [soon] ◄──► [out]
   │   ▲           │   ▲                   ▲
   │   │ V2 auto_low (System, ≤Schwelle)  │
   └───┘                                   │
       └── V3 auto_out (System, Menge=0) ──┘
   [soon]/[out] ── V4 set→available/low ──► Alert-Fanout an Käufer (Track C)
```

### 2.4 — Geschäftsregeln

- **Reservierungs-Kopplung (Soft):** Ist Mengenführung aktiv, kann eine Reservierung (`requested`/`confirmed`) Bestand weich binden; Freigabe bei `cancelled`/`expired` (vgl. R3/R4/R6/R7). Eine harte Sperre („Überbuchung unmöglich") ist **opt-in** pro Hof, Default ist weich (Vermittler-Haltung: der Hof bleibt Herr seines Bestands).
- **Finder-Wirkung:** `out` und `soon` erzeugen **keinen** „Jetzt reservieren"-CTA, sondern „Erinnern"/„Bald wieder" — kein toter Button (End-to-End-Pflicht). `low` zeigt den CTA plus Dringlichkeitshinweis.
- **Audit:** Jeder Verfügbarkeitswechsel ist auditiert (auch manuelle), damit Streitfälle („war angeblich verfügbar") rekonstruierbar sind.
- **RLS:** Schreiben nur durch Erzeuger der besitzenden Org; Lesen öffentlich (Finder), aber nur für nicht `deleted_at` Produkte.

---

## 3 · Hof-Verifizierung (Soll-Zustandsmaschine)

Vertrauensanker der Plattform: Bevor ein Hof öffentlich im Finder erscheint und (später) SB-Zahlungen empfangen darf, durchläuft er eine Verifizierung durch Staff (WAVE_07). Verhindert Fake-Höfe und schützt den USP.

> **Abgleich mit dem Ist-Stand (Migrationen 0001–0004):** Eine `farms.verification_status`-Spalte und ein vierstufiger Verifizierungs-Status auf `farms` sind **noch nicht migriert** — dieser Abschnitt ist **Spezifikations-Soll** für WAVE_07. Heute bildet das Schema Hof-Vertrauen über `farms.verified BOOLEAN` ab (true = öffentlich vertrauenswürdig), und das **Erzeuger-Onboarding** über die real migrierte Tabelle `farm_applications` mit dem Enum `application_status` (`eingereicht → in_pruefung → angenommen | abgelehnt`, 0004). Der unten beschriebene `submitted/in_review/verified/rejected`-Graph wird bei der späteren Migration auf `farms` (bzw. eine `verifications`-Tabelle) umgesetzt; bis dahin gilt `verified BOOLEAN` + `application_status`.

### 3.1 — Zustände

| Schlüssel | UI-Label | Art | Öffentlich sichtbar? | SB-Zahlung erlaubt? | Bedeutung |
|---|---|---|---|---|---|
| `submitted` | „Eingereicht" | ▶ initial | nein | nein | Erzeuger hat Hof-Profil + Nachweise eingereicht. |
| `in_review` | „In Prüfung" | Zwischenstand | nein | nein | Staff prüft Angaben/Nachweise. |
| `verified` | „Verifiziert" | ⏹ terminal (Erfolg) | ja | ja (sofern Stripe-Onboarding ok, §4) | Identität/Existenz bestätigt; Hof ist live. |
| `rejected` | „Abgelehnt" | ⏹ terminal | nein | nein | Prüfung negativ; mit Begründung. Re-Einreichung = neuer Vorgang. |

> Mapping zum Prompt: `eingereicht → geprueft → verifiziert | abgelehnt`. „geprueft" ist hier als expliziter Zwischenzustand `in_review` modelliert (Enterprise-Transparenz: man sieht, dass aktiv geprüft wird), aus dem die Entscheidung `verified`/`rejected` fällt.

### 3.2 — Erlaubte Übergänge

| # | from | event | to | Akteur | Guard | Effekt |
|---|---|---|---|---|---|---|
| H1 | ▶ — | `farm.submit` | `submitted` | Erzeuger (Org-Owner) | Pflichtfelder + ≥1 Nachweis; Org existiert | Audit `farm.submitted`; Staff-Queue-Eintrag; Eingangsbestätigung an Erzeuger |
| H2 | `submitted` | `farm.start_review` | `in_review` | Staff (Verifier-Rolle) | Vorgang nicht zugewiesen oder dem Staff zugewiesen | Audit `farm.review_started` (+ Bearbeiter); Status für Erzeuger sichtbar |
| H3 | `in_review` | `farm.verify` | `verified` | Staff (Verifier-Rolle) | Nachweise geprüft; `reason`/Notiz empfohlen | Audit `farm.verified`; Hof **öffentlich** schalten; SB-Eligibility freigeben (sofern Stripe ok); Glückwunsch-Benachrichtigung |
| H4 | `in_review` | `farm.reject` | `rejected` | Staff (Verifier-Rolle) | `reason` **Pflicht** | Audit `farm.rejected` (+ Grund); Benachrichtigung mit Begründung + Re-Einreichungs-Hinweis |
| H5 | `submitted` | `farm.reject` | `rejected` | Staff (Verifier-Rolle) | `reason` **Pflicht** (offensichtlich unzulässig, ohne Detailprüfung) | wie H4 |
| H6 | `rejected` | `farm.resubmit` | `submitted` | Erzeuger (Org-Owner) | korrigierte Angaben; **neuer** Verifizierungs-Zyklus (Historie bleibt) | Audit `farm.resubmitted`; Staff-Queue-Eintrag |

> **Re-Einreichung (H6)** ist die einzige Rück-Kante aus einem terminalen Zustand — sie startet bewusst einen **neuen Zyklus** (alte Entscheidung bleibt in der Historie, kein Überschreiben der Audit-Spur).
> **Suspendierung** (verifizierten Hof wieder offline nehmen, z. B. bei Missbrauch) ist als getrennte Betriebs-Maschine vorgesehen (Phase 3, Owner/Staff-Konsole, `farm.suspend`) und **nicht** Teil dieses Kern-Verifizierungsgraphen — sie wirkt orthogonal über ein `active`/`suspended`-Flag, nicht über `verification_status`.

### 3.3 — Diagramm (textuell)

```
   ▶ submit (H1, Erzeuger)
  ─────────────────────► [submitted] ──── H2 start_review (Staff) ───► [in_review]
                              │                                            │   │
                              │ H5 reject (Staff, reason)         H3 verify│   │ H4 reject
                              ▼                                    (Staff) │   │ (Staff, reason)
                          [rejected] ⏹ ◄────────────────────────────────-─┘   │
                              │  ▲                                              ▼
                 H6 resubmit  │  └──────────────────────────────────────  [verified] ⏹
                 (Erzeuger,   ▼                                            (öffentlich +
                  neuer Zyklus)[submitted]                                  SB-eligible)
```

### 3.4 — Geschäftsregeln

- **Gatekeeping:** Nur `verified` Höfe erscheinen im öffentlichen Finder und sind reservierbar. `submitted`/`in_review`/`rejected` sind ausschließlich für den Erzeuger (eigener Hof) und Staff sichtbar (RLS).
- **SB-Vorbedingung:** `verified` ist **notwendige, nicht hinreichende** Bedingung für SB-Zahlungen — zusätzlich muss das Stripe-(Connect-)Onboarding des Hofes abgeschlossen sein (§4.4). Beides muss „grün" sein.
- **Vier-Augen optional:** Für hohe Risikostufen kann eine Zweit-Freigabe vor `verified` konfiguriert werden (Phase 3). Default ist Ein-Verifier mit vollständigem Audit.
- **Reason-Pflicht:** Jede Ablehnung (H4/H5) erfordert eine Begründung (Pfeiler 5) — sie wird dem Erzeuger transparent angezeigt, damit Re-Einreichung gezielt möglich ist.

---

## 4 · SB-Zahlung (`sb_payments`) ⭐ USP

Zahlung an einem unbemannten Selbstbedienungs-Hofladen: QR am Stand → Stripe → Quittung (Phase 4 Track A, vorbereitet WAVE_09). Die Plattform ist **Zahlungsanbindung/Vermittler**, kein Eigenverkäufer. Geldfluss läuft über Stripe (+ Connect) auf das Konto des Hofes; die Plattform behält ggf. eine kleine Transaktionsgebühr.

### 4.1 — Zustände

| Schlüssel | UI-Label | Art | Bedeutung |
|---|---|---|---|
| `initiated` | „Initiiert" | ▶ initial | Käufer hat QR gescannt, Betrag erfasst, PaymentIntent erstellt — noch nicht abgeschlossen. |
| `paid` | „Bezahlt" | ⏹ terminal (Erfolg, rückführbar zu `refunded`) | Stripe meldet erfolgreiche Zahlung; Quittung erstellt. |
| `failed` | „Fehlgeschlagen" | ⏹ terminal | Zahlung abgebrochen/abgelehnt/Timeout; kein Geldfluss. |
| `refunded` | „Erstattet" | ⏹ terminal | Zuvor bezahlter Betrag (teilweise/voll) zurückerstattet. |

> Mapping zum Prompt: `initiiert → bezahlt | fehlgeschlagen | erstattet`. `refunded` ist Folgezustand **nur** von `paid` (Erstattung setzt eine erfolgte Zahlung voraus).

### 4.2 — Erlaubte Übergänge

| # | from | event (Quelle) | to | Akteur | Guard | Effekt |
|---|---|---|---|---|---|---|
| P1 | ▶ — | `sb_payment.initiate` (Client→Edge) | `initiated` | Käufer am Stand (Turnstile + Rate-Limit) | Hof `verified` **und** SB-eligible (§3.4/§4.4); Betrag > 0; Währung EUR | PaymentIntent via Edge (service role); Audit `sb_payment.initiated`; `idempotency_key` gesetzt |
| P2 | `initiated` | `payment_intent.succeeded` (**Stripe-Webhook**) | `paid` | System (signierter Webhook) | Signatur gültig; Betrag/Currency stimmen; Idempotenz | Audit `sb_payment.paid`; **Quittung** erzeugen (Storage/PDF) + an Käufer; Erzeuger-Dashboard-Einnahme buchen |
| P3 | `initiated` | `payment_intent.payment_failed` / `canceled` / `expired` (**Webhook**) | `failed` | System (signierter Webhook) | Signatur gültig; Idempotenz | Audit `sb_payment.failed` (+ Stripe-Grund); UI-Hinweis „erneut versuchen" (neuer Vorgang) |
| P4 | `paid` | `charge.refunded` / `refund.created` (**Webhook**, ausgelöst durch Erzeuger/Staff/Owner) | `refunded` | System (Webhook); Auslösung durch Erzeuger des Hofes **oder** Staff/Owner | Signatur; `reason` **Pflicht** bei manueller Auslösung; Betrag ≤ Originalbetrag | Audit `sb_payment.refunded` (+ Betrag, Grund); Käufer-Benachrichtigung; Gutschrift-Beleg; Dashboard korrigieren |

> **Webhook ist die Wahrheit:** Kein Statusübergang auf `paid`/`failed`/`refunded` erfolgt clientseitig oder durch Polling allein — **ausschließlich** der eine signaturgeprüfte, idempotente Stripe-Webhook-Handler setzt diese Zustände (AGENTS.md harte Regel). Der Client zeigt nach `initiate` einen Warte-/Bestätigungs-Zustand und reagiert auf das vom Server bestätigte Ergebnis.

### 4.3 — Diagramm (textuell)

```
   ▶ initiate (P1, Käufer @ Stand · Edge · service role · idempotency_key)
  ──────────────────────────────────► [initiated]
                                          │   │
        P2 payment_intent.succeeded       │   │  P3 payment_failed/canceled/expired
        (Stripe-Webhook, idempotent)      │   │  (Stripe-Webhook, idempotent)
                                          ▼   ▼
                                       [paid] ⏹     [failed] ⏹
                                          │
        P4 charge.refunded (Webhook;      │
            ausgelöst Erzeuger/Staff,     ▼
            reason Pflicht)            [refunded] ⏹
```

### 4.4 — Geschäftsregeln & Sicherheit

- **Eligibility-Gate (P1-Guard):** Eine SB-Zahlung kann **nur** initiiert werden, wenn der Hof (a) verifiziert ist (heute: `farms.verified = true`; Soll: Verifizierungs-Status `verified`, §3) **und** (b) Stripe-(Connect-)Onboarding abgeschlossen + Auszahlungen aktiv hat. Fehlt eines → `403`/Sperr-Hinweis am Stand, kein PaymentIntent (kein toter Bezahl-Flow).
- **Idempotenz (P1–P4):** `initiate` nutzt einen client-stabilen `idempotency_key` (verhindert Doppel-Intents bei Funkloch/Retry am Stand). Der Webhook-Handler ist gegen Stripe-Event-`id` idempotent (Event nur einmal verarbeiten; Wiederholung = `200` no-op).
- **Geldfluss/Vermittler:** Belastung läuft auf das (Connect-)Konto des Hofes; die Plattform-Transaktionsgebühr ist serverseitig konfiguriert (kein Client-Wert). Die Quittung weist Hof als Verkäufer und Plattform als Vermittler aus (Compliance/Disclaimer).
- **Betrag/Währung:** Server validiert Betrag und Currency aus dem Webhook gegen den initiierten Intent; Abweichung → kein `paid`, Alarm/Audit (Manipulationsschutz).
- **Quittung:** Bei `paid` wird serverseitig eine Quittung erzeugt (Storage, signierter Link) und dem Käufer bereitgestellt — keine Quittung „auf Verdacht" vor bestätigter Zahlung.
- **Teil-Erstattung:** P4 erlaubt Teilbeträge; Mehrfach-Teilerstattungen bis zur Summe = Originalbetrag (jede einzeln auditiert). Der Zustand bleibt `refunded`, sobald ≥ eine Erstattung erfolgte; Restbetrag wird am Vorgang geführt.
- **RLS/Sichtbarkeit:** Käufer sieht eigene Zahlung/Quittung (signierter Link). Erzeuger sieht Zahlungen seiner Org-Höfe (Dashboard Einnahmen/Schwund). Staff/Owner über Support-/Ops-Andockung mit Audit. `service role` nur in Edge/Webhook, nie im Client.
- **Keine Re-Aktivierung:** `failed`/`refunded` sind final. Ein neuer Bezahlversuch ist ein **neuer** `sb_payment`-Vorgang (frischer Intent, neuer `idempotency_key`).

### 4.5 — Kopplung Reservierung ↔ SB-Zahlung (Soll, optional)

> **Ist-Stand (0001–0003):** `sb_payments` trägt heute `farm_id`, `product_id?` und (0003) `location_id?`, aber **keine** `reservation_id`. Die folgende Kopplung ist Spezifikations-Soll für eine spätere additive `reservation_id`-Spalte.

Eine SB-Zahlung **soll** optional über `reservation_id` mit einer Reservierung verknüpfbar sein (Käufer holt reservierte Ware am SB-Stand ab und zahlt dort), **muss** aber nicht (Spontankauf am Stand ohne Reservierung). Verknüpft gilt:

- `sb_payment.paid` auf eine `confirmed` Reservierung kann optional `reservation.pick_up` (R5) auslösen (Abholung = bezahlt + mitgenommen). Konfigurierbar pro Hof; Default: getrennt (Hof bestätigt Abholung separat), da Zahlung ≠ physische Mitnahme.
- Eine `cancelled`/`expired` Reservierung blockiert keine Spontan-SB-Zahlung am selben Stand (verschiedene Vorgänge).

---

## 5 · Querschnitt — Audit, Fehlercodes, Tests

### 5.1 — Audit-Event-Namensraum (kanonisch)

```
reservation.requested | reservation.confirmed | reservation.cancelled
                       | reservation.picked_up | reservation.expired
availability.changed   | availability.auto_low | availability.auto_out
farm.submitted | farm.review_started | farm.verified | farm.rejected | farm.resubmitted
sb_payment.initiated | sb_payment.paid | sb_payment.failed | sb_payment.refunded
```
Jeder Eintrag: `actor_id, actor_role, org_id, object_type, object_id, from_state, to_state, event, reason?, request_id/idempotency_key, ts`.

### 5.2 — Einheitliche Fehlersemantik der Übergänge

| Situation | HTTP | Frontend-Verhalten |
|---|---|---|
| Übergang nicht in Tabelle (illegal) | `409 Conflict` | Klartext „Aktion im aktuellen Status nicht möglich" + aktueller Status; kein Crash |
| Akteur nicht berechtigt / fremde Org | `403 Forbidden` | „Keine Berechtigung" — niemals Fremddaten anzeigen |
| Pflicht-`reason` fehlt (Storno/Ablehnung/Erstattung) | `422 Unprocessable` | Formfehler am Reason-Feld |
| Guard verletzt (Betrag ≤ 0, Fenster ungültig, Hof nicht eligible) | `422` / `403` | Spezifischer, handlungsleitender Hinweis (kein generischer Fehler) |
| Objekt nicht vorhanden / leere Liste | Zero-State (`available:false`) | „Noch keine Daten" statt Fehler (Pfeiler 2) |
| Idempotente Wiederholung im Zielzustand | `200` (no-op) | Idempotent, keine Doppelwirkung |

### 5.3 — Verpflichtende Tests pro Maschine (Pfeiler 6 / qa-tester)

Für **jede** der vier Maschinen gilt als Definition-of-Done:

1. **Happy-Path je Übergang** — jeder erlaubte Übergang führt zum erwarteten Zielzustand + Audit-Eintrag.
2. **Illegaler Übergang** — jeder nicht gelistete Übergang ⇒ `409`, Zustand unverändert, kein Audit-Mutationseintrag.
3. **Berechtigung/Cross-Org** — fremder Akteur/fremde Org ⇒ `403`; eigener Akteur ⇒ erlaubt.
4. **Reason-Pflicht** — Storno (R3/R4), Ablehnung (H4/H5), Erstattung (P4) ohne `reason` ⇒ `422`.
5. **Idempotenz** — Reservierungs-Retry, Stripe-Webhook-Event doppelt ⇒ höchstens ein Übergang.
6. **Zero-State** — leere Listen/fehlende Objekte ⇒ kein `500`.
7. **Maschinenspezifisch:** Reservierung — Expiry-Job nach Fenster+Karenz; Verfügbarkeit — Alert-Fanout bei `out/soon → available/low`; Verifizierung — nur `verified` im öffentlichen Finder; SB-Zahlung — `initiate` blockiert bei nicht-eligible Hof, `paid` nur via signiertem Webhook, Betrag/Currency-Abgleich.

### 5.4 — Implementierungs-Hinweise (Server führend)

- **Übergangs-Enforcement** in der DB: `CHECK`-Constraints auf zulässige Zielwerte + ein Edge-/RPC-Wächter (oder DB-Trigger), der `(from,event)→to` gegen eine Übergangstabelle validiert. Status-Spalten als Enum (`text` + `CHECK`), nicht frei beschreibbar.
- **Statuswechsel nie per direktem `UPDATE status` aus dem Client** — immer über die jeweilige Edge Function / RPC mit Guard, Audit und Idempotenz.
- **Zeit-/System-Übergänge** (R6/R7 Expiry, V2/V3 Auto) laufen als geplanter Edge-Cron mit `actor=system` und vollem Audit.
- **Stripe-Übergänge** (P2/P3/P4) ausschließlich im einen signaturgeprüften, idempotenten Webhook-Handler; Client erhält den Endzustand vom Server.

---

## 6 · Abgrenzung & Nicht-Ziele

- **Keine** Lager-/Warenwirtschaft: Verfügbarkeit ist Self-Pflege, keine erzwungene Bestandsbuchhaltung (Vermittler-Haltung).
- **Keine** Plattform-als-Verkäufer-Logik: Zahlungen fließen zum Hof; die Plattform vermittelt + erhebt ggf. Gebühr.
- **Keine** Rück-Mutation terminaler Zustände außer den zwei dokumentierten Ausnahmen (`rejected → submitted` als neuer Zyklus; `paid → refunded`).
- **Suspendierung/Reaktivierung** verifizierter Höfe ist Betriebs-Domäne (Phase 3), orthogonal zum Verifizierungs-Status — hier bewusst nicht vermischt (Triage-Disziplin).

---

### Verweise
- Datenmodell (verbindlich): `app/supabase/migrations/0001_core.sql … 0004_onboarding.sql` · `docs/DATABASE_MODEL.md` · `PHASEN.md` WAVE_02
- Rollen/RBAC: `docs/ROLE_AND_PERMISSION_MODEL.md`
- USP-Strecke: `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (geplant) · Phase 4 Track A
- Produktionspfeiler & Verbote: `CLAUDE.md` (7 Pfeiler, Stop-Regeln)
- Status-Begriffe Code: `app/src/lib/types.ts`, `app/src/components/AvailabilityBadge.tsx`
