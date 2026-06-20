# 01_PRIORITIES — Prioritätsmodell

> **LokaleBauernConnect** · ConnectCore-Imperium · Welle 1, Klasse C
> Regionale Lebensmittel direkt vom Hof — Hofladen-Finder, Produktverfügbarkeit (Erzeuger-Selbstpflege), Reservierung/Abholung, Saison-Radar, USP **„sichere bargeldlose Bezahlung am unbemannten SB-Hofladen" (QR am Stand → Stripe → Quittung)**.
> Rolle der Plattform: **Vermittler** — kein Eigenverkauf, keine Beratung, keine Mengen-/Liefergarantie. Disclaimer durchgängig.

> **Diese Datei wird zu jedem Ticket konsultiert.** Sie bestimmt, *was wann* gemacht wird. Sie ergänzt `00_RULES.md` (Arbeitsregeln) und die projektweite `CLAUDE.md`. Bei Konflikt gilt: User-Anweisung > §0-Direktive (CLAUDE.md) > Projektregeln.

---

## 0 · Die 7 Produktionspfeiler (der Prioritäts-Maßstab)

Jedes Ticket wird gegen diese sieben Pfeiler geprüft. **Verletzt ein Befund einen Pfeiler in einem Kernflow, ist er per Definition mindestens P1 — meist P0.** Die Pfeiler sind die Ableitungsregel hinter jeder Einstufung unten.

| # | Pfeiler | Frage je Ticket |
|---|---|---|
| 1 | **RLS / Tenant-Isolation** (`org_id`, deny-by-default) | Kann Org A Daten von Org B sehen/schreiben? Greift die Policy serverseitig, nicht nur in der UI? |
| 2 | **Zero-State** | Rendert die Seite bei *keinen* Daten sauber (Text + ggf. CTA) statt leerem Gitter / `null` / 500? |
| 3 | **Audit** (`*.audited`, `audit_log`) | Erzeugt jede sicherheits-/geld-/statusrelevante Mutation einen unabschaltbaren, serverseitigen Audit-Eintrag (wer/was/von→zu)? |
| 4 | **End-to-End-Verdrahtung** | Ist der Pfad lückenlos: Endpoint → Fetch/RPC → DOM → Lade/Leer/Fehler-State → Handler? Kein toter Button, kein Platzhalter? |
| 5 | **Cloudflare-Schutz** (Turnstile / WAF / Rate-Limit) | Sind öffentliche Schreibpfade (Reservierung, Waitlist, Restock) bot-/missbrauchsgeschützt, serverseitig verifiziert? |
| 6 | **Tests** | Existiert je Feature mindestens: RLS-/Cross-Org-Negativtest + Verhaltens-Unit + (bei Flows) E2E? Tests sind die Spezifikation. |
| 7 | **Disclaimer / Vermittler-Wahrheit** | Ist die Vermittler-Rolle durchgängig sichtbar? Behauptet die Plattform nirgends Verkauf, Beratung, Garantie oder eigenen Kaufvertrag? |

> **Domain owns truth, Plattform owns aggregation.** Die Wahrheit über ein Produkt/eine Reservierung besitzt der **Hof** (`org_id`). Die Plattform aggregiert und stellt dar — sie erfindet keine Schattenwahrheit.

---

## P0 — Launch-Blocker

> **Muss vor Marktstart gelöst sein.** Solange ein P0 offen ist, wird **kein** P2/P3 gestartet (Priorisierungsregel §1). P0 = „die Plattform darf so nicht online gehen, weil sie lügt, leakt, Geld falsch bewegt oder im Kern bricht."

### Sicherheit & Isolation
- **Fehlende/löchrige Tenant-Isolation** — Cross-Org-Datenleck: Org A liest oder schreibt Produkte/Reservierungen/Hofdaten von Org B (`products_owner_write`, `reservations_owner_read` umgangen oder fehlend; RLS nicht aktiv auf einer Kerntabelle).
- **`service_role`-Key oder Stripe-Secret im Frontend-Bundle / in einem Repo-Artefakt** — nur `VITE_`-Public-Keys gehören in den Client; jeder Server-Key im Browser ist ein sofortiger Blocker.
- **Secrets oder lokale Artefakte im Release** (`.env`, `.git`, `node_modules`, `.claude`, Coverage, `dist/` mit Secrets, Seed mit echten Keys) — Pfad + Kategorie dokumentieren, Wert redigieren, Rotation empfehlen.
- **Statuswechsel direkt vom Client setzbar** — Reservierungs-Status (`requested→confirmed→picked_up…`) ohne serverseitige Übergangs-Whitelist (`reservation_transition`-RPC bzw. Edge Function) änderbar.
- **`org_id`-Hijack** — Käufer/Erzeuger kann beim Insert/Update eine fremde `org_id` unterschieben (`with check` / `enforce_product_org`-Trigger fehlt oder greift nicht).
- **Token-Enumeration** — fremde Reservierung über `pickup_code` lesbar/erratbar (kein 128-bit CSPRNG, ID-Enumeration möglich, anon-SELECT-Policy auf `reservations`).
- **Erzeuger-/Staff-/Owner-Surface für Käufer sichtbar oder aufrufbar** — z. B. `/erzeuger/produkte` oder Hof-Postfach ohne Rollen- **und** RLS-Schutz (UI-Ausblendung allein ist nie Sicherheit).

### Geld (USP & Marketplace)
- **SB-Bezahlung am Stand bricht oder bewegt Geld falsch** — QR → Stripe-Checkout → Quittung: falscher Betrag, falscher Empfänger (Connect-Account des falschen Hofs), doppelte Belastung, oder Zahlung ohne Quittung/Bestätigung.
- **Stripe-Webhook nicht signaturgeprüft oder nicht idempotent** (`supabase/functions/stripe-webhook`) — gefälschte oder doppelt verarbeitete Events; Zahlung gilt als „bezahlt", ohne dass das Event echt/eindeutig ist.
- **Checkout-Erstellung ohne serverseitige Betrag-/Hof-Validierung** (`create-checkout`) — Betrag/Empfänger client-manipulierbar.
- **Zahlung ohne Audit** — jeder Geldfluss (`payment.*`) muss serverseitig auditiert sein.

### Kernflows (die vier Säulen + USP)
- **Finder bricht** — Hofladen-Finder rendert 500 / leeren Bildschirm bei leerem oder normalem Datenbestand (Geo-Query, `FinderPage`).
- **Produktverfügbarkeit lügt strukturell** — Käufer-Status (`available/low/soon/out`) wird falsch berechnet oder nicht aktualisiert; Erzeuger-Update schlägt still fehl.
- **Reservierung end-to-end gebrochen** — Anlage (`reservations-create`), Hof-Bestätigung (`reservation_transition`) oder Käufer-Vorgangsseite (`/r/:code`) funktionieren nicht; toter Submit-Button.
- **API liefert `null`/500 statt valider leerer Antwort** auf einer Kernseite — Zero-State-Verletzung mit Crash (Pfeiler 2).

### Vermittler-Recht & Daten
- **Plattform behauptet Verkauf/Vertrag/Garantie** — fehlender oder falscher Disclaimer in Reservierung, Bezahlung oder Finder; UI suggeriert Kaufvertrag mit LokaleBauernConnect (rechtlicher Blocker, Pfeiler 7).
- **PII im Klartext in Logs/Audit** — Kontaktdaten (E-Mail/Telefon) unmaskiert in `audit_log.details` oder Server-Logs.
- **Datenverlust-/Migrationsrisiko** — destruktive, nicht-idempotente oder nicht rückrollbare Migration auf Bestandstabellen.
- **Buchbares/beworbenes Feature ohne technische Deckung** — z. B. „bargeldlos am Stand" ist auf der Landing beworben, aber der Zahlpfad existiert nicht/bricht (Phantomfeature).

---

## P1 — Pilot-/Markenkritisch

> **Muss vor ernsthaften Pilot-Höfen, Markt-Demos oder erstem echtem Geldfluss gelöst sein.** Kein Datenleck/keine 500er mehr, aber Vertrauen, Auditierbarkeit und professionelle Wirkung müssen stehen.

### Isolation & Robustheit (verifiziert, nicht nur vorhanden)
- **Cross-Org-Negativtests grün** — automatisierter Beweis, dass Org A bei Lesen *und* Schreiben *und* `org_id`-Verschiebung an Org B scheitert (nicht „RLS ist ja aktiv", sondern getestet — Pfeiler 1 + 6).
- **anon-Schreibgrenzen** — anon darf Produkte/Hofdaten **lesen**, aber niemals Verfügbarkeit pflegen oder Status setzen; nachgewiesen.
- **Rate-Limit + Turnstile produktiv** auf allen öffentlichen Schreibpfaden (Reservierung anlegen, Waitlist/Restock, Kontakt) — serverseitig verifiziert (Pfeiler 5).

### Vertrauen & Wahrheit
- **Frische-Signal der Verfügbarkeit** — `availability_updated_at` treibt ehrliche Aktualitäts-Anzeige („heute aktualisiert" / „könnte veraltet sein"); kein veralteter Wert als harte Wahrheit (Trust-Mechanismus, Pfeiler 7).
- **Lifecycle der Reservierung vollständig** — Auto-Expiry (`expire-reservations`-Cron), Reminder (idempotent via `notification_log`), Storno-Regeln serverseitig erzwungen.
- **Audit-Feed vollständig & exportfähig** — jeder relevante Vorgang (`product.*`, `reservation.*`, `payment.*`) liegt auditierbar vor; keine stille Mutation (Pfeiler 3).
- **Benachrichtigungen idempotent & ohne Doppelversand** — `notification_log` Unique-Constraint; Fallback ohne Provider ist ein funktionierender Token-Link, kein toter Pfad.

### Commercial / Stripe Connect (Single Source of Truth)
- **Eine kanonische Gebühren-/Auszahlungsquelle** — Plattform-Fee, Connect-Splitting und Auszahlungsstatus aus *einer* Wahrheit (`0002_payments.sql`/`0003_marketplace.sql`), keine doppelte Logik in Client und Edge.
- **Onboarding eines Hofs auf Stripe Connect** sauber produktiv **oder** ehrlich als „Coming Soon" markiert — kein Stub, der Geld verspricht, das nicht fließt.
- **Quittung/Beleg** nach SB-Zahlung zuverlässig zugestellt/abrufbar (E-Mail-Edge, `_shared/email.ts`).

### Rollen, Zustände, Doku
- **Rollenmatrix vollständig dokumentiert** — `kaeufer` (inkl. anon), `erzeuger`, `staff`, `owner`: wer liest/schreibt/wechselt was, je Surface.
- **Professioneller Empty-/Error-State auf allen Kernseiten** — Finder, Hof-Detail, Verfügbarkeitspflege, Hof-Postfach, Vorgangsseite (Pfeiler 2 + 4).
- **Saubere Erzeuger-/Staff-Prozesse** — Bulk-„Tag beenden", Reservierungs-Entscheidung, jeweils mit Confirm + Audit.

---

## P2 — Premium-Polish

> **Soll vor öffentlichem Launch gelöst sein.** Funktion steht, jetzt zählt das Erlebnis: premium, vertrauenswürdig, mobil-zuerst, konsistent.

- **Mobil-zuerst-Politur der Erzeuger-Selbstpflege** — „Tap statt Tippen": Statuswechsel in ≤ 2 Taps, große ±-Stepper, optimistic UI mit sauberem Rollback (Bauer steht im Hofladen, ein Handschuh aus).
- **Hochwertige Microcopy & Tooltips** — Verfügbarkeits-Hinweise, Reservierungs-Stati, Vermittler-Disclaimer in premium, prägnantem Deutsch (kein Bastel-Ton, keine technischen Interna für Käufer).
- **Einheitliche UI-Komposition** — `FarmCard`, `FarmDrawer`, `AvailabilityBadge`, Buttons, Tabellen, Filter, Badges aus *einem* Design-System (`src/styles/theme.css`), keine Inline-Farben.
- **Saison-Radar-Erlebnis** — `seasonal`-Flag premium visualisiert (Saison-Badge, „gibt's gerade frisch"), Benachrichtigen-CTA poliert.
- **Light-/Dark-Mode-Konsistenz** über alle Token.
- **Accessibility & Responsiveness** der Kernseiten — Fokuszustände, Tastaturnavigation, Kontrast, Dialog-Rolle/Fokus-Trap/Escape im Drawer.
- **Onboarding je Rolle** — Käufer (Finder → Reservieren), Erzeuger (Hof anlegen → Produkte pflegen → Stripe Connect → SB-QR drucken); klar geführt, kein Sackgassen-Schritt.
- **Quittungs-/E-Mail-Layout** premium (Marken-Look, rechtssichere Vermittler-Fußzeile).

---

## P3 — Kontrollierter Backlog nach Launch

> **Nur umsetzen, wenn P0–P2 stabil sind.** Echter Mehrwert ohne unmittelbaren Launch-Bedarf.

- **Vorausschauendes Saison-Radar** — `season_from`/`season_to` (Monatsfenster) statt nur `seasonal`-Flag (eigener ADR).
- **Opt-in Auto-Dekrementierung des `stock_qty`** bei SB-Verkauf (eigener ADR — Höfe verkaufen parallel offline, darf nicht lügen).
- **Erweiterte Finder-Filter/Suche** ohne direkten Pilot-Bedarf (z. B. Bio-Siegel, Lieferradius, Öffnungszeiten-Filter).
- **Zusätzliche Erzeuger-Analytics** (Reservierungs-Trends, Renner-/Penner-Produkte) — Komfort, kein Launchwert.
- **Weitere Integrationen** (Kalender-Sync für Abholfenster, Karten-Routing, Wallet-Pass für `pickup_code`).
- **Nice-to-have-Visualisierungen & Komfort-Automationen** ohne Pflichtbezug.

---

## Ableitungs-Heuristik (wie ein Befund eine Priorität bekommt)

Beantworte in dieser Reihenfolge — die **erste zutreffende** Stufe gewinnt:

1. **Leakt es Daten über Org-Grenzen, bewegt es Geld falsch, oder crasht ein Kernflow bei leerem/normalem Datenbestand?** → **P0**
2. **Behauptet die UI Verkauf/Vertrag/Garantie, fehlt ein Pflicht-Disclaimer, oder steht ein beworbenes Feature ohne Deckung?** → **P0**
3. **Ist die Isolation/der Lifecycle/Audit zwar vorhanden, aber unverifiziert, oder fehlt Vertrauens-/Auditierbarkeit für Piloten?** → **P1**
4. **Funktioniert alles, aber das Erlebnis ist nicht premium/konsistent/mobil/a11y-fähig?** → **P2**
5. **Echter Mehrwert ohne Launch-Bedarf?** → **P3**

> **Im Zweifel höherstufen, nicht tieferstufen.** Ein Sicherheits-/Geld-/Vermittler-Befund wird nie „kosmetisch" eingeordnet. Bei echter Business-Unklarheit: sicherer Default (deaktivieren / soft-locken / „Coming Soon") + Owner fragen — nicht raten (`00_RULES.md` §1.12).

---

## Priorisierungsregeln (verbindlich)

1. **Alle P0 zuerst.** Niemals ein neues P2/P3 starten, solange ein P0 offen ist.
2. **Innerhalb einer Welle:** P0 vor P1 vor P2 vor P3.
3. **Pfeiler-Vorrang:** Server-Guards (Pfeiler 1/3/5) gehen jeder UI-Kosmetik (Pfeiler 2-Polish, P2) voraus — UI-Ausblendung ersetzt nie eine Policy.
4. **Welle-übergreifend:** Dependency-Gates aus `PHASEN.md` / `README.md` beachten (z. B. Verfügbarkeit ist Vorbedingung für Reservierung; Reservierung ist Brücke zur SB-Bezahlung).
5. **Tests sind nicht optional** (Pfeiler 6): Ein P0/P1-Fix ohne RLS-/Verhaltens-/E2E-Test gilt als unfertig. Tests sind die Spezifikation — Code wird an Tests angepasst, nie umgekehrt.
6. **Bei Unsicherheit über die Priorität: Owner fragen, nicht raten.**

---

## Konkrete Einstufungs-Beispiele (LokaleBauernConnect)

| # | Befund (echt im Stack verankert) | Pfeiler | Priorität | Begründung |
|---|---|---|---|---|
| 1 | Erzeuger A kann via `supabase-js`-Update ein Produkt von Org B auf `out` setzen (`products_owner_write` greift nicht) | 1 | **P0** | Cross-Org-Schreibleck im Kern |
| 2 | `pickup_code` ist eine fortlaufende Zahl → fremde Reservierungen über `/r/:code` einsehbar | 1 | **P0** | Token-Enumeration, fremde PII |
| 3 | Stripe-Webhook (`stripe-webhook/index.ts`) prüft die Signatur nicht / verarbeitet Events doppelt | 3 | **P0** | Geld gilt als „bezahlt" ohne echtes/eindeutiges Event |
| 4 | `create-checkout` übernimmt Betrag/Empfänger ungeprüft aus dem Client | 1/3 | **P0** | Betrag/Connect-Empfänger manipulierbar |
| 5 | `FinderPage` wirft 500, wenn kein Hof in der Region liegt | 2 | **P0** | Kernseite crasht bei leerem Datenbestand |
| 6 | Reservierungs-`status` ist per direktem `update` vom Client setzbar (keine `reservation_transition`-RPC) | 1/3 | **P0** | Statusmaschine umgehbar, kein Audit |
| 7 | Landing bewirbt „bargeldlos am Stand", aber kein Zahlpfad existiert/funktioniert | 4/7 | **P0** | Phantomfeature / falsches Versprechen |
| 8 | Reservierungs-Dialog ohne Vermittler-Disclaimer; Text suggeriert Kaufvertrag mit der Plattform | 7 | **P0** | Rechtliche Vermittler-Verletzung |
| 9 | Kontakt-E-Mail steht im Klartext in `audit_log.details` | 3 | **P0** | PII-Leak im Audit |
| 10 | Cross-Org-Negativtest existiert nicht (Isolation nur „aktiv", nie bewiesen) | 1/6 | **P1** | Vor Pilot beweisbar machen |
| 11 | `reservations-create` hat kein Turnstile/Rate-Limit → anonyme Spam-Flut möglich | 5 | **P1** | Öffentlicher Schreibpfad ungeschützt |
| 12 | Kein `expire-reservations`-Cron → `confirmed`-Reservierungen bleiben ewig offen | 4 | **P1** | Lifecycle unvollständig, blockiert Hortungs-Schutz |
| 13 | Frische-Signal fehlt → 10 Tage alter `low`-Status wird als harte Wahrheit gezeigt | 7 | **P1** | Vertrauensbruch, Vermittler-Wahrheit |
| 14 | SB-Quittung wird nach Zahlung nicht zugestellt (`_shared/email.ts` ohne Fallback) | 4 | **P1** | Geldfluss ohne nachvollziehbaren Beleg |
| 15 | Erzeuger-Self-Service braucht 5 Taps + Tastatur, um ein Produkt auf „Wenig" zu setzen | 4 | **P2** | „Tap statt Tippen" nicht erfüllt, mobil unbrauchbar |
| 16 | `AvailabilityBadge` nutzt eine hardcodierte Farbe statt `theme.css`-Token | – | **P2** | Design-System-Inkonsistenz, kein Sicherheits-/Funktionsbruch |
| 17 | Finder-Karte zeigt bei leerem Hof ein leeres Gitter statt Zero-State-Text | 2 | **P2** | Funktioniert (kein Crash), aber unprofessionell — Zero-State-Politur |
| 18 | Wunsch: Wallet-Pass für `pickup_code`, Kalender-Sync der Abholfenster | – | **P3** | Komfort ohne Launch-Bedarf |
| 19 | Wunsch: `season_from`/`season_to` für vorausschauendes Saison-Radar | – | **P3** | Erweiterung, `seasonal`-Flag genügt zum Marktstart |
| 20 | Wunsch: Auto-Abzug von `stock_qty` bei jedem SB-Verkauf | – | **P3** | Würde lügen (Offline-Verkauf) → eigener ADR, nach Launch |

> **Verankerung:** Tabellen/Policies in `supabase/migrations/0001_core.sql` (Enums `availability_state`, `reservation_status`, `user_role`; Policies `products_owner_write`, `reservations_owner_read`, `reservations_insert`). Geld in `0002_payments.sql` / `0003_marketplace.sql` + Edge Functions `create-checkout`, `stripe-webhook`. Frontend in `src/pages/FinderPage.tsx`, `src/components/{FarmCard,FarmDrawer,AvailabilityBadge}.tsx`, Datenschicht `src/lib/{data,payments,supabase,types}.ts`. Spezifikationen: `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md`, `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md`.

---

*Disclaimer (durchgängig in Käufer-UI): LokaleBauernConnect vermittelt nur. Verfügbarkeit, Menge, Preis und Bezahlung liegen allein beim Hof. Reservierungen sind unverbindlich und kostenlos; es entsteht kein Kaufvertrag mit LokaleBauernConnect. Bei knappen Mengen bitte kurz beim Hof anrufen.*
