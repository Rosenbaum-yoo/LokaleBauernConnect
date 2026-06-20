# Selbstlernende CLAUDE.md — kontrollierte Lernschleife (Phase 5)

> **Kernanliegen:** Claude soll sich für **Wirtschaftlichkeit und Effizienz** dieses Projekts kontinuierlich selbst optimieren und seine `CLAUDE.md` aktuell halten — **ohne** dabei aufzublähen, sich zu widersprechen oder ungeprüft zu schreiben. Diese Datei liefert die vollständige Mechanik als **echte** Command-, Hook- und Config-Dateien, verdrahtet mit dem bereits bestehenden `.claude/learning/`-System dieses Repos.
>
> Adaptiert aus dem TempConnect-Blueprint (`tempconnect_docker/finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md`, read-only) auf **React+Vite+TS · Supabase · Cloudflare · Stripe** und die Hof-Domäne. Das BBQ-Original bleibt unangetastet. SCC/Hetzner/VMS-Begriffe sind konsequent durch LokaleBauern-Äquivalente ersetzt.
>
> **Bezug:** `PHASEN.md` Phase 5 (Skalierung 10→300 + selbstlernende CLAUDE.md) · `CLAUDE.md` Abschnitt „Dokumentation, Tracker & Selbstlernen" · `AGENTS.md` Memory-/Lern-System · `~/CLAUDE.md` §0.2 (Token-Effizienz), §0.8 (Durcharbeiten), §0.9 (Test-Integrität).

---

## 1. Ehrliche Einordnung zuerst (warum NICHT „bei jeder Nachricht")

**Naive Idee:** „Die `CLAUDE.md` soll sich bei jeder Nachricht selbst updaten."

**Warum das schädlich ist — und §0 direkt verletzt:**
- **Aufblähung** → jede Session wird länger → mehr Tokens pro Session → teurer. Das ist das **Gegenteil** von §0.2 (Token-Effizienz) und §0.3 (Wirtschaftlichkeit).
- **Widersprüche** → Erkenntnis aus Nachricht 5 kollidiert mit Erkenntnis aus Nachricht 50; niemand löst den Konflikt auf.
- **Unkontrollierbarkeit** → niemand weiß mehr, warum eine Regel drinsteht (kein Audit, keine Quelle).
- **Sicherheitsrisiko** → eine falsche Erkenntnis vergiftet **alle** künftigen Sessions (Supply-Chain-Risiko für die eigene Steuerungsdatei).

**Was das Ziel wirklich erreicht — eine getaktete Lernschleife mit Governance:**
1. Während der Arbeit **sammeln** (1-Zeilen-Append, fast kostenlos).
2. Am **Session-Ende destillieren** (einmal, kompakt).
3. **Vorschlagen** statt blind schreiben.
4. **Owner-Review** für kritische Kategorien (Auto-Approve nur für risikoarme).
5. **Periodisch konsolidieren**, damit `CLAUDE.md` schlank bleibt.

Das ist Weltklasse-Niveau: **kontinuierliches Lernen MIT Governance** — kategorie-definierend statt branchenüblich (§0.7).

---

## 2. Architektur der Lernschleife

```
┌────────────────────────────────────────────────────────────────────┐
│ 1) WÄHREND DER ARBEIT  (billig · KEIN CLAUDE.md-Write)              │
│                                                                      │
│   Claude erkennt eine wiederverwendbare Lektion                     │
│   → 1 Zeile nach .claude/learning/insights_inbox.md                 │
│     z.B. "[EFFIZIENZ] farms-Query immer mit org_id-Index, sonst 2s" │
└───────────────────────────────┬────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ 2) SESSION-ENDE  (Stop-Hook erinnert · /lbc-learn-distill)          │
│                                                                      │
│   1. liest insights_inbox.md                                        │
│   2. klassifiziert: EFFIZIENZ / WIRTSCHAFTLICHKEIT / TECHNIK        │
│   3. dedupliziert gegen bestehende CLAUDE.md                        │
│   4. markiert KONFLIKTE (kein Auto-Übernehmen)                      │
│   5. schreibt → .claude/learning/proposals.md                      │
│   6. archiviert Inbox → applied_log.md, leert insights_inbox.md     │
└───────────────────────────────┬────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ 3) OWNER-REVIEW  (/lbc-learn-apply)                                  │
│                                                                      │
│   EFFIZIENZ (auto_approve, kein Konflikt) → direkt übernehmen       │
│   WIRTSCHAFTLICHKEIT / TECHNIK / Konflikt  → Owner bestätigt        │
│   Übernahme → CLAUDE.md „Self-Learning Log" + ggf. Status-Tabelle   │
│   jede Übernahme → applied_log.md (Audit: wann/was/wohin/warum)     │
└───────────────────────────────┬────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ 4) KONSOLIDIERUNG  (monatlich · /lbc-learn-consolidate)             │
│                                                                      │
│   ähnliche zusammenfassen · veraltete entfernen · Konflikte lösen   │
│   Token-Budget halten · Überlauf → docs/finalization/archive        │
│   Vorher/Nachher-Diff → nur nach Owner-OK schreiben                 │
└────────────────────────────────────────────────────────────────────┘
```

Die teure Operation (Destillation) passiert **einmal pro Session**, nicht pro Nachricht. Sammeln ist ein 1-Zeilen-Append → §0.2 erfüllt.

---

## 3. Datei-Struktur (Soll · teilweise schon vorhanden)

```
.claude/
├── learning/
│   ├── insights_inbox.md       ✅ vorhanden — rohe 1-Zeilen-Lektionen
│   ├── config.md               ✅ vorhanden — Auto-Approve + Budget + eiserne Regeln
│   ├── proposals.md            ⬜ erzeugt /lbc-learn-distill (destillierte Vorschläge)
│   └── applied_log.md          ⬜ erzeugt /lbc-learn-apply (Audit, append-only)
├── commands/
│   ├── lbc-learn-distill.md    ⬜ Session-Ende-Destillation
│   ├── lbc-learn-apply.md      ⬜ Vorschläge → CLAUDE.md (kontrolliert)
│   └── lbc-learn-consolidate.md ⬜ monatliche Konsolidierung
├── hooks/
│   ├── capture-insight.sh      ⬜ Hilfsskript für 1-Zeilen-Capture
│   └── session-end-distill.sh  ⬜ Stop-Hook: erinnert an Destillation
└── settings.local.json         ✅ vorhanden — Stop-Hook hier registrieren
```

**Release-Hygiene (eisern):** `.claude/` gehört **NIE** ins externe Release-Artefakt (Cloudflare Pages Build). Der Phase-2-Release-Verifier (`finalization/phase2_release/`) führt `.claude/` auf der Ausschlussliste; siehe auch `CLAUDE.md` („`.claude/` nie ins Release-Artefakt"). Bei Cloudflare-Pages-Deploy nur `dist/` veröffentlichen — der Lernzustand bleibt im Repo.

---

## 4. Was als „Erkenntnis" zählt — und was nicht

Nur **wiederverwendbare** Lektionen, die künftige Sessions effizienter/wirtschaftlicher machen. Drei Kategorien, alle Beispiele auf **diese** Plattform/Stack gemünzt:

### Kategorie EFFIZIENZ (Token/Zeit) — *Auto-Approve erlaubt*
- „`src/data/seedFarms.ts` ist der Index für Demo-Daten — immer zuerst lesen statt blind suchen."
- „Tiefe Globs über `~` timeouten → gezielt nach Roots scannen oder PowerShell `-Filter` + Zeitstempel." (bereits in `insights_inbox.md`)
- „Preview-Screenshot timeoutet bei offenem Drawer (Blur/Transition) → `preview_eval` zur Verifikation." (bereits in `insights_inbox.md`)
- „Migrationen idempotent: neue Tabellen `IF NOT EXISTS`, Policies `DROP POLICY IF EXISTS` davor."
- „Vite-Typecheck (`npm run build`) ist schneller als Voll-E2E — vor UI-Diffs zuerst Build."

### Kategorie WIRTSCHAFTLICHKEIT (Projekt-Ökonomie) — *Owner-Review Pflicht*
- „SB-Bezahl-Webhook (Stripe) ist der teuerste/kritischste Pfad — Idempotenz + Signaturprüfung nie verhandelbar (Track A)."
- „Manuelle Erzeuger-Rechnung bleibt Default bis Stripe live — keinen Auto-Billing-Code auf Vorrat bauen."
- „Hofladen-Finder-Geoquery bei 300 Höfen teuer — Bounding-Box + Index auf `(lat,lng)`, nicht Full-Scan."
- „Supabase Edge-Function-Invocations zählen — Read-Pfade über RLS-Views/Client statt Edge, Edge nur für Secrets/Webhooks/Mutationen mit service role."

### Kategorie TECHNIK (Projekt-spezifisches Wissen) — *Owner-Review Pflicht*
- „Plan-Keys sind `demo/basis/plus/pro/individuell` — „Enterprise" ist Funktionsniveau in `individuell`, kein öffentlicher Plan."
- „Rollen sind Käufer / Erzeuger / Staff — Sessions/Berechtigungen strikt getrennt; Plattform = Vermittler, kein Eigenverkauf/keine Beratung."
- „Tenant-Scope fehlt = restriktiv (nichts ausliefern, 403), nie permissiv (alles) — RLS deny-by-default ab Migration #1."
- „service role nur in Edge Functions; Frontend nur `VITE_`-Public-Keys."

### Was NICHT erfasst wird
- Einmalige Bugs ohne Wiederverwendungswert.
- Triviales („Variable umbenannt").
- Spekulationen („könnte sein, dass…").
- Alles, was bereits in `CLAUDE.md` / `AGENTS.md` / `finalization/00_RULES.md` steht.

---

## 5. Die Command-Dateien (sofort lauffähige Skelette)

> Ablegen unter `.claude/commands/`. Aufruf als Slash-Command (`/lbc-learn-distill` …). Präfix `lbc-` statt TempConnects `scc-` (LokaleBauernConnect).

### `.claude/commands/lbc-learn-distill.md`

```markdown
---
description: Destilliert gesammelte Erkenntnisse am Session-Ende zu CLAUDE.md-Vorschlägen
---

Lies .claude/learning/insights_inbox.md (eine Zeile = eine Erkenntnis).

Für jede Erkenntnis:
1. Klassifiziere: EFFIZIENZ / WIRTSCHAFTLICHKEIT / TECHNIK.
2. Prüfe gegen bestehende CLAUDE.md (Self-Learning Log + Status-Tabelle) und
   gegen AGENTS.md / finalization/00_RULES.md:
   - Schon vorhanden / schon Regel?  → verwerfen.
   - Widerspricht Bestehendem?       → als [KONFLIKT] markieren (NICHT auto-übernehmen).
   - Neu und wertvoll?               → als Vorschlag formulieren.
3. Formuliere jeden Vorschlag in EINER Zeile, maximal prägnant:
   Format: `[KATEGORIE] <Erkenntnis> (Quelle: <Datei/Welle>, <Datum>)`

Schreibe alle Vorschläge nach .claude/learning/proposals.md mit Datums-Überschrift.
Archiviere danach den Inbox-Inhalt nach .claude/learning/applied_log.md
(Abschnitt „Inbox-Archiv <Datum>") und leere insights_inbox.md
(Kopfzeile/Anleitung bleibt erhalten — NUR die `- [...]`-Zeilen entfernen).

Gib NUR eine kompakte Zusammenfassung aus:
"X Erkenntnisse destilliert: Y EFFIZIENZ, Z WIRTSCHAFTLICHKEIT, W TECHNIK.
 K Konflikte markiert. Review mit /lbc-learn-apply."

KEINE langen Erklärungen. Token sparen (§0.2).
```

### `.claude/commands/lbc-learn-apply.md`

```markdown
---
description: Übernimmt bestätigte Lern-Vorschläge in CLAUDE.md (kontrolliert)
---

Lies .claude/learning/proposals.md und .claude/learning/config.md.

Für jeden Vorschlag:
1. Wenn Kategorie in config.md als auto_approve markiert (= nur EFFIZIENZ)
   UND NICHT [KONFLIKT]:
   → direkt in CLAUDE.md übernehmen.
2. Sonst (WIRTSCHAFTLICHKEIT, TECHNIK oder [KONFLIKT]):
   → dem Owner zeigen, auf explizite Bestätigung warten.
   → NUR bei "ja"/"übernehmen" schreiben.

Übernahme-Ziel in CLAUDE.md:
- EFFIZIENZ + TECHNIK      → "Self-Learning Log" (datierte Zeile).
- WIRTSCHAFTLICHKEIT       → "Self-Learning Log" + ggf. Verweis in §0-Kurzfassung (Wirtschaftlichkeit).
- Bereichs-spezifisch      → "Status (Kurz)"-Tabelle aktualisieren.

Eiserne Regeln:
- Jede übernommene Zeile bleibt prägnant (max 1–2 Zeilen) und trägt ihre Quelle.
- Kein Duplikat erzeugen (gegen Bestehendes prüfen).
- Bei [KONFLIKT]: Owner entscheidet — alte Regel ersetzen ODER Vorschlag verwerfen.
- Nach Übernahme: Eintrag in .claude/learning/applied_log.md
  (Datum · Erkenntnis · Ziel-Abschnitt · auto|owner-ok).
- proposals.md nach Verarbeitung leeren (offene Owner-Entscheidungen bleiben stehen).

Gib kompakt aus: "X übernommen (A auto, B owner-ok), Y verworfen, Z wartet auf Owner."
```

### `.claude/commands/lbc-learn-consolidate.md`

```markdown
---
description: Konsolidiert CLAUDE.md monatlich, hält sie schlank
---

Lies CLAUDE.md ("Self-Learning Log" + "Status (Kurz)") und .claude/learning/config.md.

Aufgaben:
1. Ähnliche Erkenntnisse zusammenfassen (z.B. 3 Geoquery-Hinweise → 1 Regel).
2. Veraltete entfernen (z.B. "Stripe noch nicht live", wenn Stripe inzwischen live ist;
   "Seed-Daten" wenn echte Supabase-Daten laufen).
3. Widersprüche auflösen (bei Unklarheit Owner fragen — nicht raten).
4. Token-Budget prüfen (siehe config.md). Bei Überschreitung:
   am wenigsten wertvolle/spezifische Erkenntnisse auslagern nach
   docs/finalization/claude_learnings_archive.md (mit Querverweis).

Zeige dem Owner ein Vorher/Nachher-Diff der konsolidierten Abschnitte.
NUR nach Bestätigung schreiben.
Konsolidierungs-Lauf in applied_log.md vermerken.

Gib aus: "CLAUDE.md konsolidiert: vorher X Zeilen, nachher Y. Z Zeilen archiviert."
```

---

## 6. Die Hook-Dateien (sofort lauffähige Skelette)

> Ablegen unter `.claude/hooks/`. Beide POSIX-`sh` (Git Bash auf Windows kompatibel). Pfade relativ zur Projekt-Wurzel (`CLAUDE_PROJECT_DIR` falls vom Harness gesetzt, sonst `.`).

### `.claude/hooks/capture-insight.sh` (Hilfsskript für 1-Zeilen-Capture)

```bash
#!/usr/bin/env sh
# Fügt EINE Erkenntnis zur Inbox hinzu — billig, fast keine Tokens.
# Usage: capture-insight.sh "EFFIZIENZ" "farms-Query immer mit org_id-Index" "src/data/seedFarms.ts"
set -eu

CATEGORY="${1:?Kategorie fehlt (EFFIZIENZ|WIRTSCHAFTLICHKEIT|TECHNIK)}"
INSIGHT="${2:?Erkenntnis fehlt}"
SOURCE="${3:-unbekannt}"

# Kategorie validieren — keine Freitext-Kategorien (hält die Destillation sauber)
case "$CATEGORY" in
  EFFIZIENZ|WIRTSCHAFTLICHKEIT|TECHNIK) ;;
  *) echo "FEHLER: Kategorie muss EFFIZIENZ|WIRTSCHAFTLICHKEIT|TECHNIK sein." >&2; exit 2 ;;
esac

ROOT="${CLAUDE_PROJECT_DIR:-.}"
INBOX="$ROOT/.claude/learning/insights_inbox.md"
DATE="$(date +%Y-%m-%d)"

mkdir -p "$ROOT/.claude/learning"
[ -f "$INBOX" ] || printf '# insights_inbox — billige 1-Zeilen-Lektionen (getaktet destillieren)\n\n' > "$INBOX"

printf -- '- [%s] [%s] %s (Quelle: %s)\n' "$DATE" "$CATEGORY" "$INSIGHT" "$SOURCE" >> "$INBOX"
echo "Erkenntnis erfasst: [$CATEGORY] $INSIGHT"
```

### `.claude/hooks/session-end-distill.sh` (Stop-Hook)

```bash
#!/usr/bin/env sh
# Stop-Hook: erinnert am Session-Ende an die Destillation, wenn die Inbox gefüllt ist.
# Schreibt NICHTS in CLAUDE.md — nur eine Erinnerung (Governance: kein Auto-Write).
set -eu

ROOT="${CLAUDE_PROJECT_DIR:-.}"
INBOX="$ROOT/.claude/learning/insights_inbox.md"

if [ -f "$INBOX" ]; then
  # Zähle nur echte Erkenntnis-Zeilen (beginnen mit "- [")
  COUNT="$(grep -c '^- \[' "$INBOX" 2>/dev/null || echo 0)"
  if [ "$COUNT" -gt 0 ]; then
    echo "HINWEIS: $COUNT ungenutzte Erkenntnis(se) in .claude/learning/insights_inbox.md."
    echo "Empfehlung: /lbc-learn-distill ausfuehren → erzeugt Vorschlaege fuer Owner-Review."
  fi
fi
exit 0
```

### Stop-Hook in `.claude/settings.local.json` registrieren

Im `hooks`-Block ergänzen (bestehende Hooks **nicht** überschreiben — additiv):

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "sh \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-end-distill.sh\""
          }
        ]
      }
    ]
  }
}
```

Hook-Skripte ausführbar machen: `chmod +x .claude/hooks/*.sh` (unter Git Bash; auf reinem Windows reicht der `sh …`-Aufruf im Command).

---

## 7. Die Config-Datei (bereits vorhanden — Soll-Stand)

> `.claude/learning/config.md` existiert im Repo. Soll-Inhalt (Auto-Approve nur EFFIZIENZ, Review für Rest, Budget, eiserne Regeln):

```markdown
# Lernschleife — Config

## Auto-Approve-Kategorien (nur wenn KEIN [KONFLIKT])
- EFFIZIENZ: ja          (reine Performance-/Token-Hinweise → risikoarm)
- TECHNIK: nein          (technische Regeln brauchen Review — koennen falsch sein)
- WIRTSCHAFTLICHKEIT: nein (oekonomische Annahmen brauchen Owner-Bestaetigung)

## Token-Budget fuer CLAUDE.md-Lernanteile
- "Self-Learning Log": schlank halten, Richtwert ~25 datierte Zeilen.
- "Status (Kurz)"-Tabelle: nur aktuelle Wahrheit, keine Historie.
- Bei Ueberschreitung: /lbc-learn-consolidate → Auslagern nach
  docs/finalization/claude_learnings_archive.md.

## Takt
- Sammeln: laufend (1-Zeile)  · Destillieren: Session-Ende  · Konsolidieren: monatlich
  ODER nach jeweils 5 abgeschlossenen Wellen/Phasen.

## Eiserne Regeln
- Keine Erkenntnis ohne Quelle (Datei/Welle + Datum).
- Kein Auto-Write pro Nachricht — nur die 4-stufige Schleife.
- Widerspruch zu bestehender Regel → [KONFLIKT], Owner entscheidet.
- .claude/ nie ins Release-Artefakt.
```

---

## 8. Integration in die bestehende CLAUDE.md

Die `CLAUDE.md` dieses Repos hat bereits:
- Abschnitt **„Dokumentation, Tracker & Selbstlernen"** — beschreibt genau diesen getakteten Loop (`insights_inbox → distill → Owner-Review → übernehmen → monatlich konsolidieren`).
- Abschnitt **„Self-Learning Log"** — datierte Ziel-Zeilen für übernommene Erkenntnisse.
- Abschnitt **„Status (Kurz)"** — bereichsspezifischer Ist-Stand.

Diese Phase-5-Datei ist die **konkrete, ausführbare Umsetzung** jenes Abschnitts: die Commands, Hooks und die Config, die den dort beschriebenen Loop real betreiben. Es gibt **keine** zweite, parallele Mechanik — alles dockt an `.claude/learning/` an (kein Wildwuchs, §0 „keine Parallelstrukturen").

---

## 9. Wie Claude die Erfassung im Alltag nutzt

Während der Arbeit, sobald eine **wiederverwendbare** Lektion auftaucht — entweder via Hilfsskript:

```bash
sh .claude/hooks/capture-insight.sh "EFFIZIENZ" "Geoquery Hofladen-Finder mit Bounding-Box + Index auf (lat,lng), kein Full-Scan" "WAVE_11_database"
```

oder als reiner 1-Zeilen-Append (identisches Format):

```bash
echo "- [2026-06-20] [WIRTSCHAFTLICHKEIT] SB-Bezahl-Webhook idempotent + signaturgeprueft = einziger Geld-Wahrheitspfad (Quelle: phase4_vertical/TRACK_A_SB_PAYMENT)" >> .claude/learning/insights_inbox.md
```

**Wirtschaftlich (§0.2/§0.3):** ein einzeiliger Append kostet quasi keine Tokens. Die teure Destillation läuft **einmal** am Session-Ende — nicht bei jeder Nachricht.

---

## 10. Warum das die naive Idee schlägt (Vergleich)

| „Bei jeder Nachricht" (naiv) | Kontrollierte Lernschleife (diese Lösung) |
|---|---|
| CLAUDE.md wächst unkontrolliert | bleibt schlank durch Konsolidierung |
| Widersprüche sammeln sich an | Konflikte werden markiert + aufgelöst |
| teuer (Write pro Nachricht) | billig (1-Zeilen-Append) |
| keine Governance | Owner-Review für kritische Kategorien |
| falsche Erkenntnis vergiftet alles | Review fängt sie ab |
| Tokens steigen mit jeder Session | stabil durch Budget-Cap |
| kein Überblick | `applied_log.md` = vollständiger Audit |

Premium-Weltklasse-Niveau (§0.5/§0.7): ein Modell, das aus dem Projekt lernt, **ohne sich selbst zu sabotieren**.

---

## 11. Setup-Reihenfolge (Phase 5, idealerweise nach Phase A)

1. `.claude/learning/` mit `config.md` + `insights_inbox.md` ✅ (bereits vorhanden).
2. Die 3 Command-Dateien (`lbc-learn-distill/apply/consolidate`) anlegen.
3. Die 2 Hook-Dateien anlegen + Stop-Hook in `.claude/settings.local.json` registrieren (additiv).
4. Prüfen, dass `CLAUDE.md` „Self-Learning Log" + „Status (Kurz)" als Ziel-Abschnitte existieren ✅.
5. Sicherstellen: `.claude/` ist im Phase-2-Release-Verifier ausgeschlossen + nur `dist/` deployt.
6. Erste Test-Erkenntnis erfassen → `/lbc-learn-distill` → `/lbc-learn-apply` durchspielen.

---

## 12. Acceptance-Checkliste (Gate für Phase 5 „Selbstlernen")

- [ ] Erkenntnis-Erfassung funktioniert (1-Zeilen-Append, Kategorie-validiert).
- [ ] `capture-insight.sh` weist unbekannte Kategorien zurück (Exit 2).
- [ ] Stop-Hook meldet ungenutzte Inbox-Einträge, schreibt aber NICHTS in CLAUDE.md.
- [ ] `/lbc-learn-distill` erzeugt `proposals.md` + archiviert + leert Inbox (Kopf bleibt).
- [ ] `/lbc-learn-apply` übernimmt EFFIZIENZ auto, hält WIRTSCHAFTLICHKEIT/TECHNIK/Konflikt für Owner an.
- [ ] Jede übernommene Zeile trägt eine Quelle und ist max. 1–2 Zeilen.
- [ ] `applied_log.md` führt lückenlosen Audit (wann/was/wohin/auto|owner-ok).
- [ ] `/lbc-learn-consolidate` hält die Lernanteile unter Budget (Vorher/Nachher-Diff, nur nach OK).
- [ ] `.claude/` nicht im Release-Artefakt; nur `dist/` deployt.

---

## 13. Owner-Aufgaben (einmalig + laufend)

- [ ] Auto-Approve-Kategorien bestätigen (Empfehlung: **nur EFFIZIENZ**) — in `config.md`.
- [ ] Token-Budget für CLAUDE.md-Lernanteile festlegen (Empfehlung: Log ~25 Zeilen schlank).
- [ ] Konsolidierungs-Takt festlegen (Empfehlung: monatlich ODER alle 5 Wellen/Phasen).
- [ ] `proposals.md` regelmäßig reviewen (kostet Minuten, spart künftig Tokens).
- [ ] Vor Go-Live prüfen: `.claude/`-Ausschluss im Release-Verifier ist aktiv.

---

## 14. Iron Rules (nicht verhandelbar)

1. **Kein Auto-Write pro Nachricht** in `CLAUDE.md` — ausschließlich der 4-stufige Loop.
2. **Keine Erkenntnis ohne Quelle** (Datei/Welle + Datum) — sonst wird sie verworfen.
3. **Konflikt → Owner entscheidet.** Eine widersprechende Erkenntnis wird nie still überschrieben.
4. **Auto-Approve nur EFFIZIENZ** (risikoarm). WIRTSCHAFTLICHKEIT/TECHNIK immer Owner-Review.
5. **Schlank bleiben.** Wachstum nur gegen Konsolidierung; Budget-Überlauf → Archiv, nicht ins CLAUDE.md.
6. **Audit lückenlos.** Jede Übernahme + jeder Konsolidierungslauf in `applied_log.md`.
7. **`.claude/` nie ins Release.** Der Lernzustand ist Owner-internes Projektgedächtnis, kein Auslieferungsgut.
8. **Hof-Domäne, kein VMS.** Erkenntnisse beschreiben Höfe/Erzeuger/Käufer/SB-Bezahlung — niemals Zeitarbeit/Vendor-Pool/Requisition/Hetzner.

---

### Abschlussbericht-Bezug (PHASEN.md)

```
## Welle abgeschlossen: Phase 5 — Selbstlernende CLAUDE.md
- Geändert: finalization/phase5_scale/SELF_UPDATING_CLAUDE_MD.md (Mechanik), .claude/commands/*, .claude/hooks/*, settings.local.json (Stop-Hook)
- Tests: Acceptance-Checkliste §12 (Capture → distill → apply → consolidate end-to-end)
- Risiken: keine (kein Auto-Write; Owner-Review-gated; .claude/ release-ausgeschlossen)
- Nächste Welle: Customer-Gates 10/50/100/300 (CUSTOMER_GATES.md), Performance-Härtung (PHASES_A_TO_R.md)
```
