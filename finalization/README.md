# LokaleBauernConnect — Finalisierungswelle (Phase-1-Index)

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C
> Stack: React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+Connect)
> Rolle: **Vermittler** — kein Eigenverkauf, keine Beratung. Vertrag & Zahlung entstehen **direkt zwischen Käufer:in und Hof**. Disclaimer durchgängig.

Dieses Verzeichnis (`finalization/`) ist die **Werkbank für Phase 1** — das Fundament und Kernprodukt von LokaleBauernConnect, zerlegt in 16 abarbeitbare Wellen (`WAVE_00` … `WAVE_15`). Der übergeordnete 5-Phasen-Bauplan liegt in **[`PHASEN.md`](../PHASEN.md)** (Projekt-Root). Die vollständige Doku-Landkarte mit Soll-/Ist-Status je Datei liegt in **[`MASTER_INDEX.md`](../MASTER_INDEX.md)**.

---

## 0. Zweck dieses Verzeichnisses

`finalization/` ist **kein** Ablageort für Feature-Code, sondern die **kontrollierte Abarbeitungs-Maschine**, mit der eine Session genau **eine Welle** sauber, vollständig und verifiziert zu Ende bringt. Jede Welle ist ein eigener, in sich geschlossener Auftrag mit:

- **Scope** — was diese Welle liefert (und was bewusst *nicht*),
- **Akzeptanzkriterien** — wann die Welle „grün" ist (End-to-End-Verdrahtung, RLS-Isolation, Zero-State, Audit),
- **Gate-Bezug** — welches Qualitäts-Gate sie bedient,
- **Abschlussbericht** — was geändert wurde, welche Tests laufen, welche Risiken offen sind.

Ziel ist das **Doppel-Ziel aus `PHASEN.md`**: sofort benutzbar (Finder → Reservierung end-to-end) **und** Enterprise-Premium in Rekordzeit — ohne nachgelagerten Doku-Berg, weil jede Welle ihre Doku mitliefert.

> **Grundsatz Vermittler-Rolle:** Keine Welle führt zu Eigenverkauf, Beratung oder Lagerhaltung durch die Plattform. Der Lebensmittel-Hinweis und der Vermittler-Disclaimer sind in jeder käufer- oder erzeugerseitigen Oberfläche durchgängig sichtbar.

---

## 1. Wie eine Welle pro Session bearbeitet wird

**Pro Arbeitssession — verbindliche Reihenfolge:**

1. Zuerst `CLAUDE.md` (Projekt-Root) für Stimme, Regeln und die 7 Produktionspfeiler lesen, dann `AGENTS.md` für die projektübergreifenden Engineering-Standards.
2. Dann **[`PHASEN.md`](../PHASEN.md)** öffnen und die **nächste offene Welle** aus der Phase-1-Tabelle (Abschnitt 2 unten) bestimmen — Status: `docs/releases/PHASE_STATUS.md`.
3. Genau **eine** Welle wählen und die zugehörige Datei `WAVE_XX_*.md` öffnen — und nur diese abarbeiten.
4. Vor dem Schreiben die Dependency-Gates (Abschnitt 3) prüfen: Sind alle Vorbedingungs-Wellen grün? Wenn nein → blockierende Welle zuerst.
5. Bei Datei-/Routen-/Tabellen-Fragen **[`MASTER_INDEX.md`](../MASTER_INDEX.md)** konsultieren; bei Modul-Detailfragen `docs/spezialmodule/*`.
6. Welle **end-to-end** umsetzen: Migration/RLS → Edge Function/Query → Fetch → DOM → Lade-/Leer-/Fehlerzustand → Handler → Test. Keine TODOs, keine toten Pfade, kein Fake-Data.
7. **Isolationstest** und Cross-Org-Negativtest grün halten (deny-by-default, `org_id`-Anker) — bei jeder datenberührenden Welle Pflicht.
8. Am Ende: **Abschlussbericht** nach Format (Abschnitt 6) schreiben und `docs/releases/PHASE_STATUS.md` aktualisieren.

**Niemals:** mehrere Wellen gleichzeitig öffnen. Fokus und Token-Budget leiden, und der Abschlussbericht wird unscharf. Eine Welle = eine Session = ein grünes Gate.

---

## 2. Abarbeitungsreihenfolge — Phase 1 (verbindlich)

> Quelle der Wahrheit für Inhalt & Gate-Bezug: **[`PHASEN.md`](../PHASEN.md) → „Phase 1 — Fundament & Kernprodukt"**. Live-Status je Welle: `docs/releases/PHASE_STATUS.md`.

| # | Welle-Datei | Inhalt | Gate-Bezug |
|---:|---|---|---|
| 0 | `WAVE_00_baseline.md` | Repo, Vite/TS, Editorial-Design-System, Konventionen | Baseline |
| 1 | `WAVE_01_release_hygiene.md` | Cloudflare-Pages-Config, Env/Secrets, Lint/Build-CI | Hygiene |
| 2 | `WAVE_02_datenmodell_rls.md` | `orgs, profiles, farms, products, availability, reservations` — additiv, RLS deny-by-default + **Isolationstest** | **Isolations-Gate** |
| 3 | `WAVE_03_rollen_sichtbarkeit.md` | Käufer / Erzeuger / Staff — RBAC, Surface-Sichtbarkeit | Rollen-Gate |
| 4 | `WAVE_04_kernprodukt.md` | A Hofladen-Finder · B Verfügbarkeit (Erzeuger-Selbstpflege) · C Reservierung/Abholfenster · D Saison-Radar | Kernflow-Gate |
| 5 | `WAVE_05_owner_kpi.md` | Owner-Dashboard: Reservierungen, aktive Höfe, Conversion | KPI-Gate |
| 6 | `WAVE_06_security.md` | Supabase Auth, Turnstile, RLS-Härtung, Rate-Limits | Security-Gate |
| 7 | `WAVE_07_staff_support.md` | Hof-Verifizierung, Eskalation, Support-Tickets (Kern) | Support-Gate |
| 8 | `WAVE_08_bonus_credits.md` | *abwägen* — evtl. Post-Launch | optional |
| 9 | `WAVE_09_billing.md` | Stripe-Abo (Erzeuger) + Vorbereitung **SB-Bezahl-USP** | Gate 10 |
| 10 | `WAVE_10_premium_ux.md` | Editorial-Politur, Mobile/PWA, Leerzustände, A11y, Copy | Polish-Gate |
| 11 | `WAVE_11_db_haertung.md` | Indizes, Pagination, Query-Performance, N+1 | DB-Gate |
| 12 | `WAVE_12_qa_tests.md` | Unit/Integration/E2E + Cross-Org-Negativtests | QA-Gate |
| 13 | `WAVE_13_observability.md` | Sentry, strukturierte Logs, Health-Checks | Observability-Gate |
| 14 | `WAVE_14_legal_dsgvo.md` | Impressum, Datenschutz, AGB, Lebensmittel-Hinweis, AVV/TOMs | Legal-Gate |
| 15 | `WAVE_15_demo_onboarding.md` | Erzeuger-Onboarding-Wizard (datengetrieben/Zod), gekennzeichnete Demo-Daten | Onboarding-Gate |
| Final | `99_GOLIVE_GATE.md` | Phase-1-Gesamt-Gate + Definition of Done | **Go-Live Phase 1** |

**Begleit-Dokumente (jederzeit referenzierbar):**

| Datei | Zweck |
|---|---|
| `00_RULES.md` | Arbeitsregeln, Triage, Output-/Abschlussbericht-Format, Stop-Regeln |
| `01_PRIORITIES.md` | P0/P1/P2/P3 — was den Kernflow blockiert, hat Vorrang vor UI-Politur |
| `99_GOLIVE_GATE.md` | Phase-1-Gesamt-Gate, Definition of Done, Abschlussbericht-Schema |

> **Go-Live-Gate Phase 1** (aus `PHASEN.md`): WAVE 02–15 grün + Isolationstest + Kernflow (**Finder → Reservierung**) end-to-end mit echten Daten. Danach folgen Phase 2 (Cloudflare-Deploy, Gates A–F) bis Phase 5 (Skalierung 10→300, Gate 10) — siehe `PHASEN.md`.

---

## 3. Dependency-Gates (harte Abhängigkeiten)

Wellen laufen nicht beliebig parallel. Vor dem Start einer Welle die Vorbedingung prüfen:

```
Gate 1: WAVE_00..03 (Fundament: Repo, Hygiene, Datenmodell+RLS, Rollen)
        MUSS grün sein, bevor WAVE_04 (Kernprodukt) startet.
Gate 2: WAVE_02 (RLS deny-by-default + Isolationstest)
        MUSS grün sein, bevor irgendeine datenberührende Oberfläche live geht.
Gate 3: WAVE_04 A (Hofladen-Finder) MUSS stehen, bevor
        WAVE_04 C (Reservierung/Abholfenster) finalisiert wird.
Gate 4: WAVE_04 B (Verfügbarkeit, Erzeuger-Selbstpflege) MUSS stehen, bevor
        WAVE_04 D (Saison-Radar) sinnvoll Daten zieht.
Gate 5: WAVE_04 vollständig (Kernflow end-to-end) MUSS stehen, bevor
        WAVE_05 (Owner/KPI) eine ehrliche Wahrheit anzeigen kann.
Gate 6: WAVE_06 (Auth/Turnstile/RLS-Härtung) MUSS stehen, bevor
        WAVE_09 (Billing) und der SB-Bezahl-USP (Phase 4 Track A) live gehen.
Gate 7: WAVE_14 (Legal/DSGVO: Impressum, Datenschutz, Lebensmittel-Hinweis)
        MUSS grün sein, bevor öffentlicher Launch.
```

---

## 4. Kernprodukt-Fluss (verbindlich)

Alles, was diesen Fluss blockiert, hat Vorrang vor UI-Politur. Dies ist die Hof-Domänen-Wertschöpfung — **kein** Eigenverkauf, sondern Vermittlung zwischen Käufer:in und Hof:

```
Käufer:in sucht regional (Hofladen-Finder: Standort, Öffnungszeiten, Saison)
  → Hof + Produkt gefunden (Verfügbarkeit, vom Erzeuger selbst gepflegt)
    → Reservierung im Abholfenster (kostenlos, unverbindlich, RLS-isoliert)
      → Hof bestätigt / lehnt ab (Erzeuger-Selbstpflege, auditierbar)
        → Abholung am Hof
          → Bezahlung direkt beim Hof
             ODER bargeldlos am SB-Stand (QR → Stripe → Quittung, USP)
            → Owner/KPI-Sicht (Reservierungen, aktive Höfe, Conversion)
```

> Der **SB-Bezahl-USP** (QR am unbemannten Selbstbedienungs-Stand → Stripe → Quittung) ist die Monetarisierungs-Spitze und wird in Phase 1 (`WAVE_09`) vorbereitet und in **Phase 4 Track A** vollständig ausgebaut — siehe `PHASEN.md`. In Phase 1 gilt: mindestens **ein** echter Geldfluss (Erzeuger-Abo *oder* SB-Bezahlung) für das Marktstart-Pflicht-Set.

---

## 5. Übergang zu Phase 2–5

Diese Werkbank deckt **Phase 1** ab. Nach grünem Go-Live-Gate Phase 1 wandert die Arbeit in die nachgelagerten Verzeichnisse — Struktur und Soll-Dateien stehen in **[`MASTER_INDEX.md`](../MASTER_INDEX.md) Abschnitt 7** und **[`PHASEN.md`](../PHASEN.md)**:

| Phase | Verzeichnis (geplant) | Inhalt |
|---|---|---|
| **Phase 2** | `finalization/phase2_release/` | Cloudflare Pages Deploy, Security-Header/CSP/HSTS, Gates A–F, Burn-in ≥7 Tage |
| **Phase 3** | (Owner/Staff-Konsole) | Betriebszentrale als Supabase/Cloudflare-Sicht — *ersetzt SCC/Hetzner* |
| **Phase 4** | `finalization/phase4_vertical/` | Track A SB-Bezahlung (USP) · B Karte · C Saison/Alerts · D Erzeuger-Self-Service · E Datenmodell-Skalierung |
| **Phase 5** | `finalization/phase5_scale/` | Customer-Gates 10/50/100/300, Performance, selbstlernende `CLAUDE.md` |

> **Marktstart-Pflicht-Set** (aus `PHASEN.md`): Phase 1 WAVE 02–15 + Isolationstest grün · Phase 2 Gates A–F + Deploy + Domain + Security-Header · Phase 3 Ops-Gate · mind. ein Geldfluss (Track A *oder* WAVE_09) · Phase 5 Gate 10.

---

## 6. Abschlussbericht-Format pro Welle (verbindlich)

Am Ende **jeder** Welle — Format identisch zu `PHASEN.md` und `99_GOLIVE_GATE.md`:

```
## Welle abgeschlossen: WAVE_XX <Name>
- Geändert:      <Migrationen / Edge Functions / Komponenten / Doku — konkret, mit Pfaden>
- Tests:         <Unit/Integration/E2E + Isolations-/Cross-Org-Negativtest — grün/rot>
- RLS-Status:    <deny-by-default verifiziert? org_id-Anker? Isolationstest grün?>
- Disclaimer:    <Vermittler-/Lebensmittel-Hinweis in betroffenen Surfaces sichtbar?>
- Risiken:       <offene Punkte, Annahmen, Owner-Entscheidungen>
- Nächste Welle: <nach Dependency-Gates>
```

Danach `docs/releases/PHASE_STATUS.md` aktualisieren (Welle → grün) und — falls die Welle Doku-Soll aus `MASTER_INDEX.md` erfüllt — den Status dort von ⬜/🔨 auf ✅ heben.

---

## 7. Selbstaktualisierung dieser Struktur

Stellt eine Session während der Arbeit fest, dass eine Welle eine Lücke hat oder eine Erkenntnis für andere Wellen relevant ist:

1. Update-Vorschlag formulieren (max. 3 Sätze).
2. Owner fragen: „Soll ich folgenden Eintrag in `WAVE_XX` ergänzen / nach `CLAUDE.md` bzw. `PHASEN.md` übernehmen?"
3. Nur nach expliziter Bestätigung schreiben.
4. Bei Ablehnung verwerfen, nicht zweimal vorschlagen.

Bei inhaltlichen Konflikten gilt: **User-Anweisung > `CLAUDE.md`-Direktiven > `PHASEN.md` > Welle-Datei.** Die kanonischen Begriffe der Hof-Domäne (Käufer:in, Erzeuger, Hof, Hofladen, Reservierung, Abholfenster, Verfügbarkeit, Saison-Radar, SB-Bezahlung) sind verbindlich — VMS-/Zeitarbeits-Begriffe werden nie übernommen.
