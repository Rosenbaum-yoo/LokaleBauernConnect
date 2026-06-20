# SALES_DEMO_PATH — LokaleBauernConnect (Demo- & Vertriebspfad)

> **Zweck:** Der verbindliche, durchchoreografierte Pfad für **Produkt-Demos und Vertriebsgespräche** mit Erzeugern (Höfen, Hofläden, Manufakturen) sowie regionalen Multiplikatoren (Tourismus, Gastronomie, Kommune, Presse). Dieses Dokument macht aus der Plattform eine **erzählbare Story**: Problem → Erlebnis → Beweis → Geld → Abschluss.
>
> **Leitsatz der Demo:** Wir verkaufen Erzeugern **zwei** Dinge — **mehr Reichweite** (auffindbar werden, ohne eigene Website) und **sicheres Geld am unbemannten Stand** (bargeldlose SB-Zahlung statt Schwund). Alles andere ist Beiwerk.
>
> **Rolle der Plattform (durchgängig, nicht verhandelbar):** **Vermittler** — kein Eigenverkauf, keine Beratung, keine Lebensmittel-Haftung. Der Vermittler-Disclaimer ist in jeder reservierungs- und zahlungsnahen Ansicht sichtbar und wird in der Demo **bewusst gezeigt**, nicht versteckt.
>
> **Stack-Kontext (für die technische Wahrheit hinter der Demo):** React + Vite + TypeScript (strict) · Supabase (EU, Postgres + RLS, Edge Functions/Deno, Storage) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe (+ Connect). **Kein Hetzner, kein Self-Host-Docker.**
>
> **Bezug:** `docs/PLATFORM_OVERVIEW.md` (Was/Warum, Module, USP, Zielgruppen) · `docs/PRICING.md` (Geldflüsse, Stufen, SB-Gebühr) · `docs/product/PLANS_AND_LIMITS.md` (Entitlements) · `docs/product/TERMINOLOGY_GUIDE.md` (UI-Sprache, **nie abweichen**) · `docs/ONBOARDING_SYSTEM.md` (Erzeuger-Wizard) · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Mechanik) · `docs/COMPLIANCE_MODEL.md` (Vermittler, DSGVO) · `docs/launch/B_rechtstexte/*` (Rechtstexte) · `PHASEN.md` (Bauplan, Reifegrad je Modul) · `docs/releases/PHASE_STATUS.md` (Live-Status).
>
> **Status:** Normativ (Vertriebs-/Demo-Spielbuch). **Stand:** 2026-06-19 · Zuständig: Claude (gesamter Stack + OZ-Execution-Part) · Freigabe Preise/Account/Domain: Owner.
>
> **Ehrlichkeits-Gebot (Pfeiler 3 · Scope-Transparenz):** Demo-Daten sind **als Demo gekennzeichnet** und werden **nie** mit Produktionsdaten vermischt. Module mit Reifegrad „🔨/⬜" werden im Demo-Skript **als geplant/in Arbeit** ausgewiesen (Abschnitt 11) — wir zeigen keine Funktion als „fertig", die es nicht ist. Eine Demo, die mehr verspricht als das Produkt hält, kostet Vertrauen — der eigentliche Plattform-Wert.

---

## 0 · Wie dieses Dokument zu lesen ist

| Abschnitt | Für wen / wann |
|---|---|
| **1 · Demo-Architektur & Reifegrad-Ehrlichkeit** | Vor jeder Demo: was ist live-zeigbar, was ist Konzept-Walkthrough. |
| **2 · Demo-Umgebung & Demo-Accounts** | Setup-Checkliste (kein Hetzner/Docker — Cloudflare Pages + Supabase). |
| **3 · Die Demo-Story (Erzähl-Rahmen)** | Der rote Faden — zwei Versprechen, eine Region. |
| **4 · Screen-für-Screen-Demo (4 Akte, ~35 Min.)** | Das eigentliche Drehbuch: Moderator-Text + Klickpfad + Key Message je Screen. |
| **5 · Erzeuger-Pitch (Verkaufsargumentation)** | Reichweite + SB-Zahlung als ROI-Rechnung, nicht als Feature-Liste. |
| **6 · SB-Bezahlung als Showstopper (Deep-Dive)** | Der USP-Block — Vorführung + Compliance-Beweis. |
| **7 · Conversion-Pfad & nächste Schritte** | Vom „Aha" zum unterschriebenen `basis`/`plus`. |
| **8 · Einwand-Behandlung** | Die echten Bauchgründe von Höfen + saubere Antworten. |
| **9 · Zielgruppen-Varianten des Pfads** | Solo-Hof vs. Hofladen-Verbund vs. Manufaktur vs. Multiplikator. |
| **10 · Demo-Hygiene, Reset & Fallstricke** | Sauberer Betrieb, sauberer Wiederanlauf. |
| **11 · Was wir (noch) NICHT zeigen** | Reifegrad-Wahrheit, ausdrücklich. |
| **12 · KPIs des Vertriebspfads** | Wie wir Demo-Wirksamkeit messen. |

> **Begriffsdisziplin (Kanon):** Im Demo-Gespräch **niemals** VMS-/Zeitarbeits-Begriffe (Vendor Pool, Requisition, Einsatzportal, Stundenzettel, SCC, Hetzner). Es heißt **Hof, Hofladen, Erzeuger, Produkt, Verfügbarkeit, Reservierung, Abholfenster, SB-Stand, Saison-Radar** — die Sprache aus `docs/product/TERMINOLOGY_GUIDE.md`.

---

## 1 · Demo-Architektur & Reifegrad-Ehrlichkeit

Die Demo besteht aus **zwei** klar getrennten Modi. Diese Trennung ist verbindlich — sie schützt vor der häufigsten Demo-Falle (eine geplante Funktion als fertig vorführen).

| Modus | Was | Wann einsetzen | Reifegrad |
|---|---|---|---|
| **LIVE-DEMO** (klickbar) | Module, die end-to-end laufen — **Hofladen-Finder**, **Hof-Detail**, **Reservierung mit Abholfenster**. Lokal auf **Port 5409**, oder über Cloudflare-Pages-Demo-Deployment. | Hauptteil — hier wird geklickt, nicht erzählt. | ✅ Modul A + C end-to-end (Seed-/Supabase-ready) |
| **KONZEPT-WALKTHROUGH** (geführt) | Module in Bau/geplant — **Verfügbarkeits-Selbstpflege (mobil)**, **Saison-Radar**, **⭐ SB-Bezahlung**. Anhand von Sequenz-/Architektur-Skizzen und der Vermittler-Garantie. | Wenn der Erzeuger den USP riechen soll — **immer als „kommt, hier die Mechanik"**, nie als „läuft schon". | 🔨/⬜ siehe `PHASEN.md` Phase 4 |

> **Regel:** Wechselt der Moderator vom Klicken zum Erzählen, sagt er es laut: *„Das hier ist heute schon live — das Nächste zeige ich Ihnen als gebaute Mechanik, Start ist [Owner: Datum]."* Das ist kein Schwächezeichen, sondern Glaubwürdigkeit (Pfeiler 3).

**Was die Demo beweisen muss (Demo-Beweislast):**
1. **Auffindbarkeit ist real** — ein Käufer findet einen Hof in der Nähe in unter 10 Sekunden.
2. **Aktualität ist real** — der Bestandsstatus (`Verfügbar · Wenig · Bald · Aus`) ist sofort sichtbar und vom Erzeuger selbst pflegbar.
3. **Reservierung ist real und friktionsarm** — als **Gast** (ohne Konto), mit Abholfenster, in unter 60 Sekunden.
4. **Der USP ist greifbar** — bargeldlose SB-Zahlung löst ein echtes Geldproblem (Schwund), und das Geld fließt **direkt an den Hof** (Stripe Connect), nicht an die Plattform.
5. **Vertrauen ist eingebaut** — Vermittler-Disclaimer, Org-Isolation, Hof-Verifizierung sind sichtbar, nicht behauptet.

---

## 2 · Demo-Umgebung & Demo-Accounts

> **Kein Hetzner, kein Docker-Compose.** Die Demo läuft entweder **lokal** (Vite Dev-Server) oder als **Cloudflare-Pages-Demo-Deployment** mit einem dedizierten **Supabase-Demo-Projekt** (EU-Region). Demo-Daten werden über ein **gekennzeichnetes Seed** geladen, nie in die Produktions-Instanz.

### 2.1 Lokaler Demo-Start (Vertriebslaptop)

```bash
# 1 · App lokal starten (Vite) — Hofladen-Finder + Reservierung end-to-end
cd app
npm install
npm run dev            # Demo-URL: http://localhost:5409

# 2 · Demo-Daten (gekennzeichnet) — Seed gegen das Supabase-DEMO-Projekt, nie Prod
#     Seed kennzeichnet jeden Datensatz als Demo (z. B. orgs.is_demo = true),
#     damit die UI ehrlich "Demo-Daten" statt "Live-Daten" anzeigt (Pfeiler 3).
npm run seed:demo      # lädt Höfe, Produkte, Verfügbarkeit, Abholfenster (Region als Demo)
```

> **Offline-Fähigkeit:** Der Finder→Reservierung-Flow läuft auch ohne Netz über den **localStorage-Fallback** (Reservierung wird lokal gehalten und bei Verbindung an die Edge Function übergeben). Das ist die Demo-Versicherung gegen schlechtes WLAN beim Hofbesuch — **explizit ein Verkaufsargument** („funktioniert auch im Funkloch am Stand").

### 2.2 Cloudflare-Pages-Demo (geteilter Link für Remote-Demos)

| Aspekt | Wert |
|---|---|
| **Hosting** | Cloudflare Pages (`app/`-Build), eigenes Demo-Deployment getrennt von Prod |
| **Backend** | dediziertes **Supabase-Demo-Projekt** (EU), eigene Keys, **nie** Prod-Keys |
| **Schutz** | Cloudflare Turnstile auf öffentlichen Formularen (Reservierung als Gast), WAF aktiv |
| **Demo-URL** | `[[OWNER: z. B. https://demo.lokalebauernconnect.de]]` (Domain = Owner-Freigabe) |
| **Kennzeichnung** | Demo-Banner durchgängig: „Demo-Umgebung — keine echten Bestellungen, keine echten Zahlungen." |

> **Owner-Gate:** Domain, Cloudflare-Account und ein separates Supabase-Demo-Projekt sind **Account-/Kosten-/Deploy-Entscheidungen** → vorab ankündigen, Owner-OK abwarten (`CLAUDE.md` Sicherheits-/Betriebsregeln). Bis dahin gilt der lokale Pfad (2.1) als Standard.

### 2.3 Demo-Accounts (Rollen-getrennt, Sessions strikt isoliert)

> Käufer-, Erzeuger- und Staff-Welt sind getrennt (`docs/ROLE_AND_PERMISSION_MODEL.md`). In der Demo wird **bewusst** zwischen den Welten gewechselt, um die saubere Trennung (Pfeiler 4) zu zeigen.

| Rolle | Zugang | Szenario in der Demo |
|---|---|---|
| **Käufer (Gast)** | kein Login — Reservierung als Gast, Turnstile-geschützt | „So einfach reserviert ein Kunde, ohne Konto." |
| **Käufer (mit Konto)** | `[[OWNER: demo-kaeufer@example.de]]` | Favoriten + Saison-Alerts (Konzept-Walkthrough, Phase 4 C). |
| **Erzeuger** | `[[OWNER: demo-erzeuger@beispielhof.de]]` (Org `plan='demo'`) | „So pflegt der Hof seinen Bestand und sieht Reservierungen." |
| **Staff** | intern, **nicht Teil der Kunden-Demo** | nur intern: Hof-Verifizierung, Eskalation (auf Nachfrage als Konzept). |

> **Passwörter / konkrete Demo-Mails:** `[[OWNER: Demo-Zugangsdaten zentral festlegen; einheitliches Demo-Passwort, nur Demo-Projekt]]`. **Nie** Produktions-Accounts in der Demo verwenden.

---

## 3 · Die Demo-Story (Erzähl-Rahmen)

Die ganze Demo trägt **eine** Erzählung. Sie folgt dem Klasse-C-Kern: kurze Wege, faire Margen, gestärkte Region — und löst zwei konkrete Schmerzen.

### 3.1 Der Aufhänger (in einem Satz, je nach Gegenüber)

- **Solo-Hof / Hofladen:** *„Sie produzieren gut — aber wie viele Kund:innen wissen heute, dass es Sie gibt und dass gerade Erdbeeren da sind? Und wie viel Schwund haben Sie am unbesetzten Stand?"*
- **Hofladen-Verbund / Manufaktur:** *„Sie verkaufen direkt — aber ohne eigenen Online-Shop. Wir machen Sie auffindbar und kassieren am SB-Stand bargeldlos, ohne dass Sie eine Website betreiben müssen."*
- **Multiplikator (Tourismus/Kommune):** *„Wir machen die Höfe Ihrer Region als Karte sichtbar — frisch, aktuell, mit Abholung und sicherer Zahlung am Stand."*

### 3.2 Die zwei Versprechen (der ganze Pitch in zwei Zeilen)

> **An den Erzeuger:** *„Mehr Reichweite, weniger Pflegeaufwand, kein Schwund."*
> **An den Käufer (zeigen wir, verkaufen es aber nicht — Käufer zahlen nichts):** *„Regional, frisch, planbar — und ohne Bargeld-Stress."*

### 3.3 Der dramaturgische Bogen

```
Akt 1  PROBLEM      "Niemand findet mich digital, und mein Stand verliert Geld."
Akt 2  ERLEBNIS     Finder → Hof-Detail → Verfügbarkeit → Reservierung (live, in <2 Min.)
Akt 3  GELD/USP     SB-Bezahlung: QR → Stripe → Quittung; Geld direkt an den Hof
Akt 4  VERTRAUEN    Vermittler-Rolle, Org-Isolation, Verifizierung, DSGVO — und der Preis
        ───────────────────────────────────────────────────────────────────────
        ABSCHLUSS    "Kostenlos sichtbar starten — wachsen, wenn es sich lohnt."
```

> **Tonalität (New-York-Premium, regional verankert):** klar, knapp, warm-souverän. Keine Deko-Emojis, kein Fachjargon gegenüber Höfen, keine Übertreibung. Wir verkaufen einen **Hebel**, kein Software-Feature.

---

## 4 · Screen-für-Screen-Demo (4 Akte · ~35 Min.)

> **Format je Schritt:** *Moderator spricht* → **Klickpfad** → **Key Message**. Der Moderator klickt selbst; der Erzeuger schaut zu (und reserviert in Akt 2 einmal selbst — Hands-on schlägt Zuschauen).

### Akt 1 — Das Problem sichtbar machen (5 Min., Käufer-Perspektive)

**Moderator:**
> „Stellen wir uns vor, ich bin eine Kundin aus dem Nachbarort und will heute regional einkaufen. So sieht das heute für mich aus — und so könnte es mit Ihnen aussehen."

1. **Hofladen-Finder öffnen** (`/` bzw. Finder-Startseite, Port 5409).
2. **PLZ/Ort eingeben** → Liste der Höfe **in der Nähe**, sortiert nach Distanz (PLZ-Distanz heute; interaktive Karte ab Phase 4 — als Konzept anteasern).
3. **Filter zeigen:** Kategorie (z. B. Obst/Gemüse, Eier, Honig, Milchprodukte), Öffnungszeiten, „hat SB-Stand".
4. **Zero-State demonstrieren** (bewusst): Filter so setzen, dass nichts passt → freundlicher Leerzustand „Keine Höfe für diese Auswahl — Filter anpassen", **kein** Fehlerbildschirm.

**Key Message:** *„Heute finden Kund:innen Sie über Mundpropaganda und Zettel am Straßenrand. Hier finden sie Sie in zehn Sekunden — mit dem, was gerade da ist."*

> **Beweis-Beiläufigkeit:** Auf den **Datenstand-Hinweis** zeigen („Live-Daten" vs. „Demo-Daten") und den **Selbstauskunft-Hinweis** an der Verfügbarkeit („Angabe ohne Gewähr — vor Ort prüfen"). Das ist Vermittler-Disziplin, beiläufig vorgeführt.

### Akt 2 — Das Erlebnis: Finden → Reservieren (12 Min., der Klick-Kern)

**Moderator:**
> „Jetzt der wichtigste Teil — wie schnell wird aus „gefunden" eine konkrete Reservierung. Und gleich reservieren **Sie** einmal selbst."

1. **Hof-Detail öffnen** (Klick auf einen Demo-Hof): Hof-Story, Öffnungszeiten, Standort, Kontakt, Lebensmittel-Hinweis, Vermittler-Disclaimer.
2. **Produktverfügbarkeit** auf der Detailseite: Produkte mit Status-Badge **Verfügbar · Wenig · Bald · Aus** (kanonische Labels, `TERMINOLOGY_GUIDE.md` §2.1).
3. **„In den Korb"** (Vorbereitungs-Merkliste — *kein* Warenkorb-Kauf): ein, zwei Produkte sammeln.
4. **Reservierung starten** → Reservierungs-Drawer: Produkt + Menge + **Abholfenster** wählen + Kontaktdaten. Turnstile (Gast). **Vermittler-Disclaimer sichtbar:** „Reservierung ist keine Kaufgarantie; Verkauf erfolgt durch den Erzeuger."
5. **Absenden** → Bestätigung: Reservierung im Status **„Reservierung angefragt"**.
6. **Hands-on:** Den Erzeuger jetzt **selbst** eine Reservierung anlegen lassen (am Laptop/Handy). Stoppuhr beiläufig: meist < 60 Sekunden.

**Key Message:** *„Von „gefunden" zu „reserviert" in unter einer Minute — ohne Konto, ohne App-Download, ohne Anruf. Das ist Planungssicherheit für Sie: Sie wissen vorab, was abgeholt wird."*

> **Erzeuger-Seite kurz andocken (Perspektivwechsel):** In den **Erzeuger-Account** wechseln und zeigen, dass die eben angelegte Reservierung **als Eingang** beim Hof erscheint (nur die **eigenen** — Org-Isolation, Pfeiler 1). *„Sie sehen ausschließlich Ihre eigenen Reservierungen. Kein anderer Hof sieht Ihre Daten — und Sie keine fremden."*

### Akt 3 — Das Geld: SB-Bezahlung als Showstopper (10 Min., Konzept-Walkthrough + USP)

> **Reifegrad-Ehrlichkeit:** SB-Bezahlung ist **Phase 4 Track A** (geplant, eigener ADR). Hier wird die **Mechanik** vorgeführt (Skizze + Stripe-Logik), klar als „kommt" markiert. Details in Abschnitt 6.

**Moderator:**
> „Jetzt zum Teil, der Ihnen direkt Geld spart. Viele Hofläden sind unbesetzt — eine Vertrauenskasse. Charmant, aber teuer: Schwund, Falschgeld, der Aufwand des Bargeld-Zählens. Genau das lösen wir."

1. **Den Schmerz benennen:** *„Wie viel Schwund haben Sie im Monat? Wer kein Bargeld dabei hat, kauft am Stand gar nicht — das ist entgangener Umsatz."* (Antwort notieren — sie wird zur ROI-Rechnung, Abschnitt 5.)
2. **Die SB-Mechanik skizzieren:**
   ```
   QR am Stand scannen → Artikel/Betrag wählen → Stripe-Checkout (gehostet) → zahlen → digitale Quittung
   ```
3. **Die Geld-Garantie zeigen (der Vertrauens-Kern):** *„Das Geld fließt über Stripe Connect **direkt auf Ihr Auszahlungskonto** — nicht auf ein Plattform-Konto. Wir sind Vermittler, kein Verkäufer. Auf der Quittung stehen **Sie** als Leistungserbringer, wir als Vermittler."*
4. **Das Erzeuger-Dashboard skizzieren:** Einnahmen, **Schwund-Vergleich** (vorher Bargeld vs. nachher bargeldlos), Brutto · Plattformgebühr · Stripe-Gebühr · Netto je Transaktion.
5. **Die Monetarisierung ehrlich nennen:** *„Pro erfolgreicher SB-Zahlung eine kleine Gebühr — die im Standardpfad **wir nicht von Ihren Kund:innen**, sondern aus Ihrem Netto nehmen, damit der Einkauf am Stand nicht teurer wird."* (Default = `application_fee` aus Hof-Netto, `PRICING.md` §3.2.)

**Key Message:** *„Jede Entnahme ist bezahlt und nachvollziehbar. Schwund runter, Umsatz rauf — auch von spontanen Kund:innen ohne Bargeld. Und das Geld kommt direkt zu Ihnen."*

### Akt 4 — Vertrauen & Preis (8 Min., der rationale Abschluss)

**Moderator:**
> „Bevor wir über den Preis sprechen — drei Dinge, die Höfe immer fragen: Wem gehört was, wer haftet, und was kostet das."

1. **Vermittler-Rolle (Haftung):** *„Wir vermitteln, wir verkaufen nicht. Wir beraten nicht, wir garantieren keine Verfügbarkeit. Lebensmittel-Kennzeichnung bleibt bei Ihnen — wir weisen Sie nur darauf hin. Das hält Ihr Geschäft schlank und uns aus Ihrer Haftung."* (`PLATFORM_OVERVIEW.md` §8.)
2. **Datenhoheit & Isolation:** *„Ihre Daten gehören Ihnen. Sie sehen nur Ihre, niemand sonst — technisch erzwungen, nicht nur versprochen."* (RLS / Org-Isolation, Pfeiler 1.)
3. **Verifizierung als Qualitätssiegel:** *„Jeder Hof wird vor der Veröffentlichung von uns geprüft — das schützt das Vertrauen der Käufer:innen, von dem Sie leben."* (Hof-Verifizierung, `ONBOARDING_SYSTEM.md`.)
4. **DSGVO/EU:** *„EU-Hosting, Auftragsverarbeitung geregelt, Audit-Trail für jede Aktion."* (`COMPLIANCE_MODEL.md`.)
5. **Der Preis (Mission-konform):** Stufen `demo → basis → plus → pro → individuell` zeigen (Abschnitt 7). **Einstieg ist kostenlos** (`demo`): *„Sie werden kostenlos sichtbar und gewinnen erste Kund:innen, bevor Geld fließt."*

**Key Message:** *„Sie riskieren nichts: kostenlos sichtbar, volle Datenhoheit, wir haften nicht in Ihr Geschäft hinein. Sie zahlen erst, wenn Sie wachsen wollen — oder wenn der SB-Stand für Sie kassiert."*

> **Demo-Gesamtbudget:** ~35 Min. + 10 Min. Fragen. **Nie** über 50 Min. ziehen — der USP (Akt 3) und der Preis (Akt 4) dürfen nie aus Zeitmangel hinten runterfallen.

---

## 5 · Erzeuger-Pitch (Verkaufsargumentation, nicht Feature-Liste)

Der Pitch verkauft **zwei Hebel** und übersetzt sie in **Geld**. Features sind nur der Beweis.

### 5.1 Hebel 1 — Mehr Reichweite (ohne eigene Website)

| Argument | Übersetzung in Erzeuger-Nutzen |
|---|---|
| Auffindbar im **Hofladen-Finder** (PLZ-Distanz, später Karte) | „Kund:innen aus dem Umkreis finden Sie, die Sie heute nie erreichen." |
| **Verfügbarkeit in Echtzeit**, vom Hof selbst gepflegt | „Keine vergebliche Anfahrt — wer kommt, weiß, dass die Ware da ist. Weniger Frust, mehr Wiederkehr." |
| **Selbstpflege in Sekunden (mobil)** | „Zwei Tipps am Handy — Status geändert, Käuferseite ist sofort live. Kein IT-Aufwand." |
| **Reservierung mit Abholfenster** | „Planbarer Vorlauf: Sie wissen vorher, was abgeholt wird — ohne Lieferpflicht." |
| **Saison-Radar + Alerts** (Phase 4 C) | „Stammkund:innen kommen von selbst zurück, wenn Ihre Lieblingsware Saison hat." |
| **Premium-Listing** (bedingt, ab `plus`) | „Mehr Sichtbarkeit für aktive, verifizierte Höfe — kein Pay-to-Win, aber ein Boost, wenn Sie pflegen." |

### 5.2 Hebel 2 — Sicheres Geld am unbemannten Stand (SB-Zahlung)

| Argument | Übersetzung in Erzeuger-Nutzen |
|---|---|
| **Bargeldlos am SB-Stand** (QR → Stripe → Quittung) | „Auch Kund:innen ohne Bargeld kaufen — spontan, jederzeit, 24/7." |
| **Schwund ↓** | „Jede Entnahme ist bezahlt und nachvollziehbar. Die Vertrauenskasse wird zur sicheren Kasse." |
| **Kein Bargeld-Handling** | „Kein Zählen, kein Falschgeld, kein Kassen-Diebstahl-Risiko." |
| **Geld direkt an Sie** (Stripe Connect) | „Wir kassieren nicht für Sie — das Geld geht direkt auf Ihr Konto. Wir behalten nur eine kleine Gebühr." |
| **Einnahmen-/Schwund-Dashboard** | „Sie sehen schwarz auf weiß, was der bargeldlose Stand bringt — Brutto, Gebühren, Netto." |

### 5.3 Die ROI-Rechnung (das Gespräch, das verkauft)

> Diese Rechnung **immer mit echten Zahlen des Hofes** führen — nie mit erfundenen. Die Eingangsfrage steht in Akt 3.1.

```
Frage 1:  "Wie viele Kund:innen pro Woche kaufen NICHT, weil sie kein Bargeld dabei haben?"
Frage 2:  "Wie hoch schätzen Sie Ihren monatlichen Schwund am SB-Stand (EUR)?"
Frage 3:  "Wie viel Zeit kostet Sie Bargeld-Zählen/-Bringen pro Woche?"

Rechnung (mit den Hof-Zahlen, beispielhaft):
  + zusätzliche bargeldlose Käufe   →  Mehrumsatz/Monat
  + reduzierter Schwund             →  gerettete Marge/Monat
  + gesparte Bargeld-Zeit           →  Stundenwert/Monat
  - SB-Transaktionsgebühr (klein)   →  variable Kosten (skaliert mit Umsatz, nicht mit Fixkosten)
  - Erzeuger-Abo (ab basis)         →  planbare Fixkosten (demo = 0 EUR)
  ────────────────────────────────────────────────────────────
  = Netto-Hebel pro Monat
```

**Der Schlusssatz:** *„Sie starten kostenlos sichtbar. Die einzige umsatzabhängige Kosten ist die kleine SB-Gebühr — die fällt nur an, **wenn am Stand tatsächlich Geld fließt**, das vorher als Schwund verloren war."*

> **Wirtschaftlichkeit (Owner-Sicht, intern):** Zwei Geldflüsse — wiederkehrendes **Erzeuger-Abo** (MRR) + nutzungsbasierte **SB-Gebühr** (skaliert linear mit Abverkauf über alle Höfe). Beide Muster sind imperiumsweit wiederverwendbar. Der `demo`-Einstieg ist Akquise-Hebel, kein Verlust: er füllt den Finder mit Angebotsdichte und führt über SB-Volumen und Reichweitenbedarf organisch nach `basis`/`plus`/`pro` (`PRICING.md` §0).

---

## 6 · SB-Bezahlung als Showstopper (Deep-Dive für die Demo)

> Der USP verdient einen eigenen, sauberen Block — weil er das **kategoriedefinierende** Argument ist (`PLATFORM_OVERVIEW.md` §7). Reine Hof-Verzeichnisse gibt es; **bargeldlose SB-Kasse mit Quittung am unbemannten Stand** ist der Vorsprung.

### 6.1 Die Vorführung (als Mechanik, ehrlich „kommt")

```
Käufer am SB-Stand                         Plattform / Stripe                    Erzeuger
──────────────────                         ──────────────────                    ─────────
 1 QR am Stand scannen        ────────▶    Edge Function 'initiate'
 2 Artikel/Betrag wählen                   Betrag IMMER serverseitig aus
                                           products.price_cents (Tamper-Schutz)
 3 Stripe-Checkout (gehostet) ────────▶    Stripe Connect Destination Charge
 4 zahlen                                    application_fee = Plattformgebühr
                                            Warenwert → Hof-Konto (transfer_data)
 5 digitale Quittung          ◀────────    EIN signierter, idempotenter Webhook
                                           schreibt sb_payments (service role)     ◀── sieht NUR eigene
                                                                                      Transaktionen (RLS)
```

### 6.2 Die vier Compliance-Garantien (das Vertrauens-Skript)

1. **Geld direkt an den Hof:** Stripe Connect leitet den Warenwert unmittelbar an das Auszahlungskonto des Erzeugers. Die Plattform hat **kein** Verwahrkonto im Eigenverkauf, ist **nicht** Zahlungsempfänger der Ware — sie behält nur die konfigurierte Plattformgebühr. (`PRICING.md` §1, `agb.md` §6/§9.)
2. **Kein Tampering:** Der zu zahlende Betrag wird **immer serverseitig** aus der DB aufgelöst — nie aus dem QR/Link. Niemand kann den Preis manipulieren.
3. **Keine Doppelzahlung:** **EIN** signaturgeprüfter, **idempotenter** Webhook ist die einzige Wahrheit; jedes Stripe-Event wirkt genau einmal.
4. **Datenhoheit:** `sb_payments` ist nur über die Edge Function (service role) beschreibbar; der Hof sieht ausschließlich **eigene** Transaktionen (RLS, Pfeiler 1). SB-Zahlungen sind aufbewahrungspflichtig (HGB/AO) — revisionssicher.

### 6.3 Was der Erzeuger davon hat (eine Zeile pro Sorge)

| Sorge des Erzeugers | Antwort |
|---|---|
| „Verliere ich die Kontrolle übers Geld?" | „Nein — das Geld geht direkt an Sie, wir kassieren nicht für Sie." |
| „Ist das kompliziert einzurichten?" | „Ein QR am Stand. Die Einrichtung läuft über ein geführtes Stripe-Onboarding." |
| „Was, wenn der Kunde Geld zurück will?" | „Erstattung über Stripe geregelt; die Plattformgebühr wird dabei nach Owner-Politik anteilig mit-erstattet." |
| „Was kostet mich das?" | „Eine kleine Gebühr nur pro **erfolgreicher** Zahlung — kein Festpreis, kein Risiko bei wenig Umsatz." |

> **Plan-Kopplung als Upgrade-Anreiz (intern):** Höhere Abo-Stufen erhalten eine **reduzierte** SB-Gebühr (`PRICING.md` §3.3). Das macht das Abo zum Kostensenker bei hohem SB-Volumen — ein in sich stimmiger Upgrade-Pfad, nicht reines Kostenrisiko.

---

## 7 · Conversion-Pfad & nächste Schritte

### 7.1 Vom „Aha" zum Listing (der unmittelbare nächste Schritt)

> **Bestes Closing = sofort starten.** Höfe entscheiden langsam; ein kostenloser Sofort-Start nimmt jede Hürde.

1. **Sofort sichtbar werden (`demo`, 0 EUR):** Den Erzeuger noch im Termin durch den **Onboarding-Wizard** führen (`ONBOARDING_SYSTEM.md`): Profil → Betrieb → Standort → Story → erste Produkte → Verfügbarkeit → Abholfenster → Nachweise → Disclaimer/Einwilligung → **Einreichung**.
2. **Verifizierung anstoßen:** *„Wir prüfen Ihren Betrieb — typische Bearbeitung [Owner: Zeitziel] — und schalten Sie dann öffentlich frei."* (Staff-Verifizierung vor Veröffentlichung.)
3. **Live gehen:** Nach `verified` erscheint der Hof öffentlich im Finder, reservierbar.

### 7.2 Conversion-Stufen (vom Free-Anker zum Geldfluss)

```
SICHTBAR (demo, 0 EUR)
   └─ erste Reservierungen, Vertrauen aufgebaut
        └─ AKTIV (basis): regelmäßige Selbstpflege, Saison-Vorankündigung, SB-Stand aktivierbar
             └─ REICHWEITE (plus): Premium-Listing-Option, reduzierte SB-Gebühr, erweiterte Slots
                  └─ VOLLE HEBEL (pro): inkludiertes Premium-Listing, stärker reduzierte SB-Gebühr, Prio-Support
                       └─ VERHANDELT (individuell): Verbünde/Erzeugergemeinschaften, SLA, Sonderbedarf
```

> **Plan-Locks zeigen den Weg, nicht die Wand (Pfeiler 4):** Jede gesperrte Funktion zeigt den **konkreten** Upgrade-Pfad („ab `plus` verfügbar — jetzt upgraden"), ein funktionierender Deep-Link, kein toter Button. In der Demo bewusst einmal vorführen.

### 7.3 Die Stufen im Vertriebsgespräch (Mission-konforme Reihenfolge)

| Stufe | Pitch-Satz | Geldfluss |
|---|---|---|
| **`demo`** | „Kostenlos sichtbar — ankommen, erste Kund:innen gewinnen." | 0 EUR |
| **`basis`** | „Aktiv pflegen, Saison vorankündigen, SB-Stand aktivieren." | schlankes Abo `[[OWNER: Preis]]` |
| **`plus`** | „Mehr Reichweite + reduzierte SB-Gebühr + erweiterte Abholfenster." | mittleres Abo `[[OWNER: Preis]]` |
| **`pro`** | „Volle Hebel: Premium-Listing inklusive, stärker reduzierte SB-Gebühr, Prio-Support." | höheres Abo `[[OWNER: Preis]]` |
| **`individuell`** | „Für Verbünde/Erzeugergemeinschaften — verhandelt, mit SLA." | Angebot/Vertrag |

> **Preise sind Owner-Hoheit** (`CLAUDE.md` Commercial-/Stop-Regel, `PRICING.md` §2.3 / §8). In der Demo werden Stufen + **Wertlogik** gezeigt; konkrete Preise erst nach Owner-Freigabe. „Enterprise" ist **kein** öffentlicher Plan, sondern das Funktionsniveau in `individuell`.

### 7.4 Typische nächste Schritte nach der Demo

- **Sofort:** kostenloses `demo`-Listing anlegen (im Termin), Verifizierung anstoßen.
- **Begleitet:** geführtes Erzeuger-Onboarding + Stripe-Connect-Setup für den SB-Stand (sobald Track A live).
- **Verbund/Region:** Pilot mit mehreren Höfen einer Region (Angebotsdichte für den Finder) → Gespräch Richtung `individuell`.
- **Multiplikator:** Kooperation mit Tourismus/Kommune/Hofcafé-Netz als Reichweiten-Partner.

---

## 8 · Einwand-Behandlung (die echten Bauchgründe von Höfen)

| Einwand | Antwort |
|---|---|
| **„Ich habe keine Zeit für noch ein digitales Tool."** | „Genau deshalb ist es zwei Tipps am Handy. Sie pflegen nur, was sich ändert — Status auf `Verfügbar`/`Aus`. Kein Schulungstag, keine Website." |
| **„Ich verkaufe doch schon am Stand, wozu das?"** | „Damit auch die kaufen, die kein Bargeld dabeihaben — und damit Sie den Schwund stoppen. Das ist barer Mehrumsatz, nicht Mehraufwand." |
| **„Was kostet mich das?"** | „Sichtbar werden: nichts. Erst wenn Sie wachsen wollen, ein schlankes Abo. Die SB-Gebühr fällt nur an, wenn am Stand tatsächlich gezahlt wird — also nur bei echtem Umsatz." |
| **„Bekomme ich mein Geld auch wirklich?"** | „Direkt auf Ihr Konto über Stripe. Wir kassieren nicht für Sie, wir sind nur die Anbindung. Auf der Quittung stehen **Sie** als Verkäufer." |
| **„Und der Datenschutz / wer sieht meine Zahlen?"** | „Nur Sie. EU-Hosting, jede Aktion protokolliert, technisch abgeschottet — kein anderer Hof sieht Ihre Reservierungen oder Einnahmen." |
| **„Haftet ihr für meine Ware / Preise?"** | „Nein — und das ist gut für Sie. Wir vermitteln nur. Sie behalten die Hoheit über Angaben, Preise, Kennzeichnung; wir greifen nicht in Ihr Geschäft ein." |
| **„Was, wenn niemand über euch kommt?"** | „Dann kostet Sie `demo` nichts. Sie verlieren nichts, gewinnen aber Sichtbarkeit, die Sie heute nicht haben." |
| **„Ich habe schon eine Facebook-Seite."** | „Perfekt als Ergänzung. Aber Facebook zeigt nicht in Echtzeit, was gerade da ist, kassiert nicht am Stand und gibt keine Reservierung mit Abholfenster. Wir schon." |
| **„Brauche ich technisches Equipment am Stand?"** | „Einen QR-Aufsteller. Die Kundin nutzt ihr eigenes Handy. Kein Terminal, kein Kartenleser nötig." |
| **„Reservierung = muss ich dann liefern/garantieren?"** | „Nein. Reservierung ist eine Absichtserklärung zur Abholung, kein Kaufvertrag und keine Lieferpflicht. Planbarkeit ohne Verpflichtung." |

> **Einwand-Prinzip:** Jeden Einwand auf einen der **zwei Hebel** (Reichweite, sicheres Geld) oder auf **Risikofreiheit** (`demo` = 0 EUR, Datenhoheit, keine Haftung) zurückführen. Nie verteidigen — immer in Nutzen übersetzen.

---

## 9 · Zielgruppen-Varianten des Demo-Pfads

> Der 4-Akt-Rahmen bleibt; Gewichtung und Beispiele wechseln je Gegenüber.

| Zielgruppe | Schwerpunkt | Anpassung im Pfad |
|---|---|---|
| **Solo-Hof / kleiner Familienbetrieb** | Reichweite + `demo`-Risikofreiheit | Akt 1–2 ausführlich; Akt 3 (SB) als „kommt, sichert Ihren Stand"; Closing = `demo` sofort. |
| **Hofladen mit unbesetztem SB-Stand** | **SB-Zahlung (USP)** + Schwund-ROI | Akt 3 verlängern, ROI-Rechnung (§5.3) als Kern; `basis`/`plus` für reduzierte SB-Gebühr. |
| **Manufaktur (Käse/Marmelade/Saft)** | Direktvertrieb-Reichweite ohne Online-Shop | Hof-Detail/Story betonen, Saison-Vorankündigung, Premium-Listing (`plus`/`pro`). |
| **Imker / Hofmetzger (limitierte Ware)** | Saison-Radar + Alerts | Konzept-Walkthrough Saison-Radar (Phase 4 C) als Stammkund:innen-Rückholer. |
| **Hofladen-Verbund / Erzeugergemeinschaft** | Mehrere Standorte, SLA, verhandelt | Mehrere `farms` je Org zeigen; Richtung `individuell`; Pilot-Angebot. |
| **Multiplikator (Tourismus/Kommune/Presse)** | Region als Ganzes, Klasse-C-Story | Gesellschaftlicher Nutzen (kurze Wege, lokale Wertschöpfung), Karte/Finder als regionales Schaufenster. |

---

## 10 · Demo-Hygiene, Reset & Fallstricke

### 10.1 Vor der Demo (Checkliste)

- [ ] App auf **Port 5409** läuft (lokal) **oder** Cloudflare-Pages-Demo erreichbar.
- [ ] Demo-Seed geladen, Daten als **„Demo-Daten"** gekennzeichnet (UI zeigt es).
- [ ] Mindestens 3 Demo-Höfe mit Produkten, gemischten Verfügbarkeits-Status (`Verfügbar/Wenig/Bald/Aus`) und ≥1 Abholfenster.
- [ ] Ein Hof mit **leerem Sortiment** vorbereitet (für die Zero-State-Vorführung in Akt 1).
- [ ] Vermittler-Disclaimer auf Hof-Detail + Reservierungs-Drawer sichtbar.
- [ ] Browser-Konsole sauber (keine `TypeError`/401-Schleifen) — vor dem Termin einmal prüfen.
- [ ] Demo-Banner aktiv: „Demo-Umgebung — keine echten Bestellungen/Zahlungen."

### 10.2 Demo-Daten zurücksetzen (zerstörerisch, nur Demo-Projekt)

```bash
# Nur gegen das Supabase-DEMO-Projekt — NIEMALS gegen Prod.
# Reset entfernt ausschließlich als Demo gekennzeichnete Daten (is_demo = true).
cd app
npm run seed:demo:reset    # löscht Demo-Höfe/-Produkte/-Reservierungen und lädt frisch
```

> **Sicherheits-Stop:** Das Reset-Skript muss prüfen, dass es gegen das **Demo-Projekt** (Demo-Supabase-URL) läuft, und sonst abbrechen. Prod-Daten werden nie über ein Demo-Skript berührt (`CLAUDE.md` Verbote: keine Schnellfixes, keine Migration ohne Rollback).

### 10.3 Bekannte Fallstricke

1. **Reservierungs-Bestätigungs-Mails** gehen in der Demo nicht real raus — Demo-Konfiguration nutzt einen Demo-/Sandbox-Versand. **Nicht** als „kaputt" missdeuten.
2. **SB-Zahlung ist Stripe-Test-Modus** (sobald Track A demobar): nur Test-Karten, keine echten Beträge. Klar ansagen.
3. **Karte (Leaflet/MapLibre)** ist Phase 4 B — heute PLZ-Distanz-Liste; nicht als fertige Karte vorführen.
4. **Saison-Radar/Alerts** sind Phase 4 C — Konzept-Walkthrough, nicht klickbar.
5. **Staff-Verifizierung** ist intern — in der Kunden-Demo nur erwähnen, nicht aufmachen (Sessions strikt getrennt).
6. **Schlechtes WLAN beim Hofbesuch:** lokaler Modus + localStorage-Fallback nutzen — wird zum Verkaufsargument („funktioniert auch im Funkloch").

---

## 11 · Was wir (noch) NICHT als „fertig" zeigen (Reifegrad-Wahrheit)

> Verbindlich gegen Demo-Übertreibung. Diese Funktionen werden **ausschließlich als Konzept-Walkthrough** gezeigt und klar als geplant markiert (`PHASEN.md` Phase 4, `docs/releases/PHASE_STATUS.md`).

| Funktion | Reifegrad | In der Demo |
|---|---|---|
| Hofladen-Finder (PLZ-Distanz) + Hof-Detail | ✅ live | klickbar (Akt 1–2) |
| Reservierung + Abholfenster (Gast, Turnstile) | ✅ live | klickbar (Akt 2) |
| Produktverfügbarkeit (Badge/Status) | ✅ Anzeige live · 🔨 mobile Selbstpflege | Anzeige klickbar; Selbstpflege als Konzept |
| Interaktive Karte (Leaflet/MapLibre) | ⬜ Phase 4 B | Konzept |
| Saison-Radar + Alerts | ⬜ Phase 4 C | Konzept |
| **⭐ SB-Bezahlung (QR → Stripe → Quittung)** | ⬜ Phase 4 A | **Konzept-Walkthrough** (Akt 3, §6) — Mechanik + Garantien, klar „kommt" |
| Erzeuger-Einnahmen-/Schwund-Dashboard | ⬜ Phase 4 A | Konzept (Skizze) |
| Stripe-Connect-Onboarding (Auszahlungskonto) | ⬜ Phase 4 A | als nächster Schritt benennen |

> **Wenn gefragt wird „Wann kommt der SB-Stand?":** ehrlich antworten mit dem Owner-Zeitziel und dem Hinweis, dass die **Mechanik bereits spezifiziert** ist (eigener ADR, `SB_BEZAHLUNG_USP.md`) — und das `demo`-Listing **heute schon** kostenlos startet. Nie ein Datum erfinden.

---

## 12 · KPIs des Vertriebspfads (Wirksamkeit messen)

> Damit der Pfad nicht Bauchgefühl bleibt, sondern optimiert wird (Klasse-C: schneller Cashflow-Start).

| KPI | Definition | Ziel-Signal |
|---|---|---|
| **Demo → `demo`-Listing-Rate** | Anteil Demos, die im Termin in ein kostenloses Listing münden | hoch (Sofort-Start senkt Hürde) |
| **`demo` → bezahlt-Rate** | Anteil `demo`-Höfe, die binnen [Owner: Zeitraum] auf `basis`+ wechseln | wächst mit Reichweiten-/SB-Nutzen |
| **Time-to-Live** | Tage von Demo bis `verified`/öffentlich im Finder | kurz (Onboarding-/Verifizierungs-Effizienz) |
| **SB-Aktivierungsrate** | Anteil Höfe mit SB-Stand, die ihn aktivieren (sobald Track A live) | hoch bei unbesetzten Ständen |
| **Reservierungen je Hof** | Frühindikator für Käufer-Wert und Erzeuger-Bindung | steigend = Sichtbarkeit zahlt sich aus |
| **Einwand-Häufigkeit** | welche Einwände (§8) am häufigsten — Pitch nachschärfen | sinkende „zu kompliziert"-Quote |

> **Datenquelle:** plattformseitige KPIs aus dem Owner/Staff-Dashboard (Phase 1 WAVE_05 / Phase 3 Betriebszentrale), org-gebunden und auditiert (Pfeiler 1/5). **Nie** Demo-Daten in echte KPIs einrechnen.

---

## 13 · Querverweise

`docs/PLATFORM_OVERVIEW.md` (Was/Warum · Module · USP · Zielgruppen · Vermittler-Abgrenzung) · `docs/PRICING.md` (Geldflüsse · Stufen · SB-Gebühr · Owner-Entscheidungen) · `docs/product/PLANS_AND_LIMITS.md` (Entitlement-Matrix) · `docs/product/ROLE_FEATURE_MATRIX.md` (Rolle × Funktion) · `docs/product/TERMINOLOGY_GUIDE.md` (UI-Sprache — **nie abweichen**) · `docs/ONBOARDING_SYSTEM.md` (Erzeuger-Wizard, Verifizierung) · `docs/spezialmodule/SB_BEZAHLUNG_USP.md` (USP-Mechanik, Gebührenmodell) · `docs/COMPLIANCE_MODEL.md` (Vermittler · DSGVO · Subprozessor Stripe · Aufbewahrung) · `docs/launch/B_rechtstexte/*` (Impressum · Datenschutz · AGB · AVV/TOMs) · `docs/ARCHITEKTUR.md` (Datenfluss · SB-Sequenz) · `PHASEN.md` (Bauplan · Phase 4 Track A/B/C) · `docs/releases/PHASE_STATUS.md` (Live-Status) · `MASTER_INDEX.md` (8 · Marketing & Launch).

---

*Dieses Dokument folgt der Soll-Struktur aus `MASTER_INDEX.md` (Abschnitt 8 · Marketing & Launch) und ist mit dem realen Code unter `app/` (Hofladen-Finder + Reservierung, Port 5409) sowie den Schwester-Dokumenten (`PLATFORM_OVERVIEW`, `PRICING`, `ONBOARDING_SYSTEM`, `TERMINOLOGY_GUIDE`) abgeglichen. Demo-Reifegrad ist transparent ausgewiesen (Abschnitt 11). Preise/Domain/Demo-Account-Setup sind Owner-Hoheit. Bei Konflikt gilt die Hierarchie User > AGENTS.md > Subagent > CLAUDE.md.*
