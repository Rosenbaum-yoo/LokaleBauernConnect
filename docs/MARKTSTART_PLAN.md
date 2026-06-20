# MARKTSTART_PLAN — Marktstart- & Go-to-Market-Plan LokaleBauernConnect

> **Lebendes Dokument.** Stand: 2026-06-19 · Welle 1, **Klasse C** (Cashflow-Schnellstarter) im **ConnectCore-Imperium** (Plattform #09).
> **Zweck:** Das Markteintritts-Vorhaben festhalten, damit Owner **und** Claude es jederzeit im Blick haben — *wie* aus „läuft technisch" *zahlende Höfe und nutzende Käufer* werden. Status pro Punkt pflegen.
> **Zielgruppe:** Owner, Vertrieb/Akquise, Presse-/Tourismus-Partner, neue Claude-Sessions.
> **Bezug (Kanon):** `00_BRIEFING.md` §9 (GTM) · `CLAUDE.md` (§0-Direktive · 7 Produktionspfeiler · Doppel-Ziel · Vermittler-Rolle) · `PHASEN.md` (Wellen/Gates · Marktstart-Pflicht-Set) · `MASTER_INDEX.md` (8 · Marketing & Launch) · `docs/PLATFORM_OVERVIEW.md` (Produkt + §9 Synergie AgrarConnect) · `docs/PRICING.md` (zwei Geldflüsse · Plan-Stufen) · `docs/launch/B_rechtstexte/*` (Recht) · `docs/COMPLIANCE_MODEL.md` (Vermittler/DSGVO) · `docs/SALES_DEMO_PATH.md`.
>
> **Legende:** `[ ]` offen · `[~]` in Arbeit · `[x]` erledigt · **(OWNER)** = Entscheidung liegt beim Owner · **(EMPFEHLUNG)** = Claudes Schärfung/Vorschlag.
>
> **Quelle der Wahrheit:** Dies ist die **kommerzielle/operative** Markteintritts-Spezifikation. Preise/Entitlements sind serverseitig verankert (`docs/PRICING.md`, `orgs.plan`, Stripe). Bei Konflikt gilt: User > `AGENTS.md` > Subagent > `CLAUDE.md`; Geld-/Deploy-/Account-/irreversible Schritte → Owner-Freigabe vorab.

---

## 0 — Kern in einem Satz

**LokaleBauernConnect ist die digitale Vermittlungsplattform, die regionale Lebensmittel direkt vom Hof auffindbar macht** — Hofladen-Finder, Produktverfügbarkeit aus Erzeuger-Selbstpflege, Reservierung/Abholung, Saison-Radar — mit dem USP **„sichere bargeldlose Bezahlung am unbemannten Selbstbedienungs-Hofladen"** (QR am Stand → Stripe → Quittung). Dachclaim: **„Regional direkt vom Hof — finden, reservieren, abholen."**

**Die eine Einsicht, die alles steuert:**
> Ein Marktplatz für regionale Lebensmittel ist **kein Reichweiten-Problem, sondern ein Dichte-Problem.** Ein Käufer in Region X braucht keine 3.000 Höfe bundesweit — er braucht **die 15 Höfe in seinen 25 km**, mit *echter* Verfügbarkeit. *Breit ist leer. Dicht ist lebendig.* Deshalb starten wir **Region für Region**, nicht bundesweit.

**Rolle (nicht verhandelbar):** Die Plattform **vermittelt** — sie verkauft nicht selbst und berät nicht. Der Warenwert fließt über Stripe Connect **unmittelbar an das Hof-Konto**; die Plattform behält nur die konfigurierte Gebühr. Disclaimer durchgängig sichtbar (`docs/COMPLIANCE_MODEL.md`, `agb.md` §6/§9).

---

## 1 — Das Vorhaben (Setup vor dem ersten echten Datensatz)

- [ ] **Rechtshülle / Rechnungsstellung klären** — schlanke Rechtsform für Vertrag mit Erzeugern, Rechnungsstellung des Abos und Empfang der Plattformgebühr (Stripe-Auszahlungskonto). **(OWNER)**
- [ ] **Stripe-Konto + Stripe Connect** — Plattform-Account + Connect-Onboarding für Höfe (Auszahlung des Warenwerts ans Hof-Konto, `application_fee` an Plattform). Test- vor Live-Modus. Details: `docs/STRIPE-SETUP.md`, `docs/PRICING.md` §3. **(OWNER: Account/Live-Keys)**
- [ ] **Marke/Identität (Editorial-Skin)** — bestehende Tokens nutzen (`app/src/styles/theme.css`), ruhig-wertige, regionale Tonalität, **keine Deko-Emojis** in produktiver UI. Bild-/Bildsprache: echte Höfe/Saison statt Stock-Klischee.
- [ ] **Domain + Cloudflare** — Domain bei Cloudflare orange-clouden (Proxy/WAF/CDN), TLS „Full (strict)", Pages-Deploy für `web/` (Landing) + `app/` (Produkt). Details: `docs/DEPLOYMENT.md`. **(OWNER: Domain/Kosten)**
- [ ] **EU-Datenresidenz als Verkaufsargument** — Supabase EU-Region + Cloudflare offensiv als DSGVO-/Datenschutz-Argument kommunizieren (Hofläden + regionale Käufer schätzen das). Vor echten Kundendaten: RLS-Isolationstest grün, Backups, Monitoring (`docs/BACKUP_DISASTER_RECOVERY.md`, `docs/MONITORING.md`).

> **Doppel-Ziel (CLAUDE.md):** (a) **sofort spielbar** — Finder→Reservierung läuft bereits (Seed/Supabase-ready, Port 5409); (b) **Enterprise-Premium in Rekordzeit** über Phasen/Wellen. Der Marktstart fällt **frühestens** mit dem erfüllten *Marktstart-Pflicht-Set* (§9) zusammen — nicht früher.

---

## 2 — Die Markt-Strategie: Region für Region (Welle-für-Welle)

> **Grundprinzip (regionale Wellen):** Wir kippen **eine Region** zur Lebendigkeit, beweisen den Loop (Käufer findet → reserviert → holt ab → SB-Zahlung am Stand), und **replizieren** das Playbook in die nächste Region. Jede Region ist mandanten-/org-isoliert (RLS, `org_id`), aber das **Akquise- und Content-Playbook** ist 1:1 wiederverwendbar — und imperiumsweit (Blueprint-Denken).

### 2.1 Region-Welle: Definition

Eine **Region-Welle** = ein zusammenhängender geografischer Mikromarkt (Landkreis / Naturraum / „X + 25 km"), in dem wir **gleichzeitig Angebot und Nachfrage verdichten**, bis der Marktplatz sich selbst trägt.

| Baustein | Inhalt |
|---|---|
| **Geo-Fokus** | Ein Landkreis bzw. ein touristisch/landwirtschaftlich kohärenter Naturraum. Käufer-Radius „in der Nähe" über die Karte (Phase 4 Track B). |
| **Angebot zuerst leicht vorladen** | 12–20 Höfe/Hofläden in der Region **vor** dem öffentlichen Start gelistet (mind. Basis-Sichtbarkeit), damit der Finder am Start-Tag **nie leer** ist (Pfeiler 2: Zero-State, aber lieber echte Dichte). |
| **Nachfrage-Story** | Regionale Endkunden über Presse/Social/Tourismus auf den lebendigen Finder ziehen. |
| **USP-Pilot-Stand** | Mind. **1–3 unbemannte SB-Stände** in der Region mit aktiver QR-Bezahlung (Phase 4 Track A) als sichtbarer Beweis + Story-Träger. |
| **Kipp-Kriterium** | Region gilt als „lebendig", wenn die regionalen Kipp-KPIs (§8) erreicht sind → erst dann nächste Region. |

### 2.2 Welle-Reihenfolge (Empfehlung, Owner bestätigt Region)

| Welle | Region-Typ | Auswahl-Logik | Status |
|---|---|---|---|
| **Region 1 — Anker** | Eine **starke Heimat-/Netzwerk-Region** | Dort, wo der Owner warmes Netzwerk + Hof-Zugang hat (CAC ≈ 0). Erst kippen, dann replizieren. | **(OWNER)** [ ] |
| **Region 2 — Tourismus** | Region mit Tourismus-/Ausflugs-Strom | Hohe Käuferdichte durch Besucher; Hofläden/SB-Stände an Rad-/Wanderrouten. Synergie mit Tourismus-Partnern (§3.4). | [ ] |
| **Region 3 — AgrarConnect-Overlap** | Region mit hoher AgrarConnect-Anbieterdichte | Geteilte Anbieterbasis → niedrigste Akquisekosten (§4). | [ ] |
| **Region 4…n — Replikation** | Nach Playbook | Erst nach belegtem Kipp-Beweis in 1–3. | [ ] |

> **Anti-Pattern (NICHT tun):** Kein bundesweiter Launch (leerer Finder = Friedhof). Keine zweite Region öffnen, bevor die erste gekippt ist. Keine Performance-Ads, bevor eine Region organisch lebt.

### 2.3 Angebot vs. Nachfrage — die richtige Reihenfolge

**Käufer-first nach außen, Angebot vorab gesichert.** Die *Story* ist käuferorientiert (regionale Lebensmittel zugänglich machen — der Käufer ist der Held). Aber das **Angebot** wird **vor** der Käufer-Kommunikation leicht vorgeladen, damit der erste Besucher nie einen leeren Finder sieht. Wir vermarkten an Käufer, laden aber Höfe vor.

- **Erst (still, vor Start):** Höfe/Hofläden in der Region gewinnen, Profile + erste Verfügbarkeiten + Öffnungszeiten pflegen.
- **Dann (öffentlich, am Start):** Käufer über Presse/Social/Tourismus auf den **bereits gefüllten** Finder ziehen.
- **Käufer zahlen nie für den Zugang** (`docs/PRICING.md` Leitsatz 2) — niedrigste Friktion auf der Nachfrageseite. Die zahlende Seite sind die Höfe (Abo) + die nutzungsbasierte SB-Gebühr.

---

## 3 — Go-to-Market: Kanäle (Presse · Social · Tourismus)

> Aus `00_BRIEFING.md` §9: **Regionale Story (Presse, Social), Saison-Content, Kooperation mit Tourismus/Region.** Alle Kanäle zahlen auf **eine Region** ein — nie Streuverlust über Regionen, die noch nicht gefüllt sind.

### 3.1 Presse (lokal/regional · Fach)

- [ ] **Lokal-/Regionalpresse zum Region-Start** — Lokalzeitung, Wochenblatt, regionaler Rundfunk, Anzeigenblätter. Aufhänger: „Regionale Höfe jetzt digital auffindbar" + **die menschliche Story** (ein konkreter Hof, ein konkreter SB-Stand, der jetzt bargeldlos funktioniert).
- [ ] **Saison-Aufhänger** — Pressetexte an den Saison-Radar koppeln (Spargel-/Erdbeer-/Kürbis-/Apfel-Saison): „Wo gibt es jetzt regional X" — wiederkehrende, planbare Presse-Anlässe statt einmaligem Launch-Knall.
- [ ] **USP-Story „Vertrauenskasse 2.0"** — der unbemannte SB-Hofladen mit sicherer Kartenzahlung ist ein **eigenständiger Presse-Aufhänger** (löst Bargeld-Handling/Schwund; Vertrauen + Innovation + Regionalität in einer Geschichte). Mensch-im-Mittelpunkt, kein Tech-Jargon.
- [ ] **(EMPFEHLUNG)** Fach-/Verbands-Presse (Landfrauen, Regionalvermarkter-Initiativen, Direktvermarkter-Verbände) — qualifizierte Reichweite zur **Angebotsseite**.

### 3.2 Social (regional · Saison-getrieben)

- [ ] **Saison-Content-Kalender** — wiederkehrende Posts entlang des Saison-Radars (was hat jetzt Saison, welcher Hof in der Region führt es). Content kommt **aus den echten Plattformdaten** (Verfügbarkeit/Saison), nicht erfunden.
- [ ] **Hof-Porträts** — kurze, wertige Porträts der Anker-Höfe (Mensch + Produkt + Region). Höfe teilen sie weiter → organische Reichweite in ihre lokalen Netzwerke.
- [ ] **„In der Nähe"-Aktivierung** — Posts mit klarem regionalem CTA („Finde Höfe in [Region]") + Deep-Link in den gefilterten Finder (Pfeiler 7: Deep-Links tragen Region-Kontext, bauen nie org-fremde URLs).
- [ ] **Plattform-Profil + Owner-Profil** — Plattform-Seite (Seriosität) **und** persönliches Profil (Menschen folgen Menschen). Content **vor** dem Start beginnen, damit zum Region-Start ein warmes Publikum existiert.

### 3.3 Tourismus / Region (der starke Eigen-Hebel)

- [ ] **Tourismus-/Verkehrsverein-Kooperation** — Listung des Finders bei Tourismus-Info, Ausflugsportalen, Gästekarten-Apps: „Regionale Hofläden entlang deiner Route." Touristen sind kaufbereite, neugierige Käufer ohne lokale Hof-Kenntnis = ideale Nachfrage.
- [ ] **Rad-/Wanderrouten + Hofläden** — SB-Stände entlang Routen sind ein natürlicher Tourismus-Anlass; Karte (Phase 4 Track B) zeigt Stände „auf dem Weg".
- [ ] **Regionalmarken/Genussregion-Siegel** — Andocken an bestehende „Genussregion"/„Heimat"-Initiativen der Region für Glaubwürdigkeit + Reichweite.
- [ ] **(EMPFEHLUNG)** Hofcafés/Gastronomie (regional) als Käufer-Segment **und** Multiplikator (Aushang/QR vor Ort).

### 3.4 Direkte Akquise (Angebotsseite, warm zuerst)

- [ ] **Zielhof-Liste je Region** vorab (Hofläden, Direktvermarkter, Imker, Hofmetzger, Manufakturen im Geo-Fokus).
- [ ] **Warmes Netzwerk zuerst** (Owner + ggf. AgrarConnect-Bestand, CAC ≈ 0), dann Kaltakquise. Multi-Touch: kurze persönliche Vorstellung → Demo-Pfad zeigen (`docs/SALES_DEMO_PATH.md`) → Onboarding-Wizard (WAVE_15).
- [ ] **Gründungs-Hof-Angebot** — die ersten Höfe einer Region als **„Gründungshof"**: bevorzugte Sichtbarkeit, Mitgestaltung, Nennung in der ersten Regional-Story/Saison-Kommunikation. Dauerhaftes Asset statt margenfressendem Dauerrabatt. **(OWNER: Ausgestaltung)**
- [ ] **Empfehlungs-Hebel im Onboarding** — „empfiehl einen passenden Hof aus deiner Region" → jeder Anbieter bringt seinen lokalen Cluster mit (verdichtet die Region schneller).

### 3.5 Käufer-Akquise (Nachfrageseite, niedrigste Friktion)

- [ ] **Kein Account-Zwang zum Suchen** — Finder/Saison-Radar/Hofdetail ohne Login (Käufer zahlen nie für Zugang; nur Reservierung/Favoriten brauchen ggf. ein Konto). Höchste Top-of-Funnel-Konversion.
- [ ] **QR-am-Stand als Akquise-Kanal** — der SB-Zahlungs-QR ist zugleich Einstieg in die Plattform (Käufer, der einmal bargeldlos am Stand zahlt, lernt den Finder kennen). USP = Produkt **und** Akquise.

---

## 4 — Synergie mit AgrarConnect (strategischer Beschleuniger)

> Aus `00_BRIEFING.md` §3/§9 + `docs/PLATFORM_OVERVIEW.md` §9: LokaleBauernConnect (B2C/regional/Endkunde) und die Schwester-Plattform **AgrarConnect** (B2B/Agrar/Betriebe/Handel) teilen denselben **ConnectCore-Kern** und überschneiden sich auf der **Angebotsseite**. Das ist der größte Marktstart-Hebel der Klasse C.

| Synergie-Hebel | Marktstart-Nutzen | GTM-Umsetzung |
|---|---|---|
| **Geteilte Anbieterbasis** | Ein Erzeuger, der bei AgrarConnect (B2B) gelistet ist, ist mit minimalem Aufwand auch hier (B2C) auffindbar → **niedrigere Akquisekosten, schnellere Angebotsdichte** pro Region. | Region-3-Auswahl bevorzugt nach AgrarConnect-Overlap; Cross-Einladung „Sie sind B2B gelistet — werden Sie auch regional für Endkunden auffindbar." |
| **Geteilter Kern** | Auth/Tenancy/Billing/Staff-Support/Audit **einmal** gebaut, von beiden genutzt → schneller Start, geringere Betriebskosten (Wirtschaftlichkeit, Imperium-Grundgesetz). | Kein eigener Kern-Bau; Marktstart konzentriert Budget auf Akquise + Spezialschicht. |
| **Cross-Vermarktung** | Regionale Endkunden-Story (B2C) + agrarische Reichweite (B2B) verstärken sich in Presse/Vertrieb. | Gemeinsame Presse-/Verbands-Auftritte; ein Hof = zwei Vertriebskanäle in einer Ansprache. |
| **Datenstandard** | Gemeinsame Hof-Domänen-/Kategorien-Standards reduzieren Pflegeaufwand über beide Plattformen → höhere Datenqualität im Finder. | Erzeuger pflegt einmal, profitiert doppelt — Verkaufsargument im Onboarding. |

- [ ] **Cross-Einladungs-Mechanik** — AgrarConnect-Erzeuger gezielt einladen (sauber org-/consent-konform, keine Schattendaten; jede Plattform bleibt RLS-isoliert). **(OWNER: Datenfluss-/Consent-Freigabe → ggf. ADR)**
- [ ] **Gemeinsamer Region-Anlauf (Region 3)** — eine Region wählen, in der AgrarConnect bereits Anbieterdichte hat, und beide Seiten parallel aktivieren.

> **Stop-Regel:** Cross-Plattform-Datenfluss berührt Tenancy/Consent/DSGVO → vor Umsetzung **Owner-Freigabe + ADR** (`docs/adr/`), niemals stiller Sync zwischen Org-Grenzen.

---

## 5 — Launch-Mechanik je Region (Ablauf)

> Wiederholbares Playbook — pro Region identisch, nur Inhalte/Partner regional.

| Phase | Schritt | Ergebnis |
|---|---|---|
| **T-6…T-3 Wo** | Zielhof-Liste, warme Höfe ansprechen, Onboarding-Wizard, erste Profile/Verfügbarkeiten pflegen | Angebot vorgeladen (12–20 Höfe) |
| **T-4…T-1 Wo** | Social-Content anlaufen lassen, Presse-/Tourismus-Partner briefen, 1–3 SB-Stände live schalten (Track A) | Warmes Publikum + USP-Beweis |
| **T-0 (Region-Start)** | Region öffentlich aktivieren, Presse-Welle, Social-Push, Tourismus-Listung live, Deep-Links in die Region | Gefüllter, lebendiger Finder ab Minute eins |
| **T+1…T+4 Wo** | Erste Reservierungen/SB-Zahlungen begleiten, Hof-Feedback einsammeln, erste Referenz/Regional-Story, Saison-Content fortführen | Belegter Loop + Kipp-Fortschritt |
| **Kipp** | Regionale Kipp-KPIs erreicht (§8) → Replikation in nächste Region | Playbook bestätigt |

- **Readiness-driven Start:** Ein Region-Start-Datum wird **erst fixiert**, wenn (a) das Marktstart-Pflicht-Set (§9) global grün ist **und** (b) die Region genug vorgeladenes Angebot hat (Finder nicht leer).
- **Landing/CTA nie tot:** Vor dem Region-Start führt jeder CTA auf einen realen Zustand (Region-Vorschau / Hof-werden-Onboarding), nie auf einen leeren oder 404-Pfad (Pfeiler-Disziplin: keine toten Buttons).

---

## 6 — Recht / Vertrauen (vor erstem echten Datensatz)

> Detail-Texte: `docs/launch/B_rechtstexte/{impressum,datenschutz,agb,avv-toms}.md` · Modell: `docs/COMPLIANCE_MODEL.md`. Compliance-Niveau ist **niedrig** (Vermittler), aber sauber dokumentiert.

- [ ] **Impressum, Datenschutzerklärung, AGB** live und verlinkt (Footer + Onboarding).
- [ ] **AVV / TOMs** (Auftragsverarbeitung, DSGVO) inkl. Subprozessoren (Supabase EU, Cloudflare, Stripe) — `avv-toms.md`.
- [ ] **(WICHTIG) Vermittler-Klarstellung** durchgängig: **Die Plattform ist Vermittlungs-/Zahlungsanbindungs-Infrastruktur — NICHT Verkäufer, NICHT Empfänger des Warenwerts, berät nicht.** Warenwert fließt via Stripe Connect direkt ans Hof-Konto; Quittung weist **Hof als Leistungserbringer** aus (`agb.md` §6/§9, `docs/PRICING.md` §3).
- [ ] **Lebensmittel-Kennzeichnungs-Hinweis** im Erzeuger-Onboarding — Kennzeichnung bleibt **Erzeuger-Pflicht**, die Plattform liefert nur den Hinweis (kein Eigenvermarktungs-/Beratungsrisiko).
- [ ] **Double-Opt-in** bei jeder käuferseitigen E-Mail/Benachrichtigung (Saison-Alerts/Favoriten) + Turnstile an öffentlichen Formularen (`CLAUDE.md` Edge-Function-Regeln).
- [ ] **SB-Zahlung compliant** — kein plattformeigenes Verwahrkonto im Eigenverkauf (keine Treuhand-/E-Geld-Lizenzfrage durch Saldenhaltung); Destination Charge mit `application_fee` (`docs/PRICING.md` §3, `docs/spezialmodule/SB_BEZAHLUNG_USP.md`).

---

## 7 — Monetarisierung beim Start (zwei Geldflüsse)

> Quelle der Wahrheit: `docs/PRICING.md`. **Käufer zahlen nichts für den Zugang.** Höfe sind die zahlende Seite. Bewusst schlank — gesellschaftlicher Nutzen > Maximalmonetarisierung (Klasse-C-Prinzip), aber **nicht** kostenlos für den Owner.

| Geldfluss | Quelle | Mechanik | Welle / Marktstart-Rolle |
|---|---|---|---|
| **Erzeuger-Abo** (MRR) | Hof | Stripe-Abo, Entitlements serverseitig (Webhook); Stufen `demo · basis · plus · pro · individuell` | WAVE_09 — **Mindest-Geldfluss A** |
| **SB-Transaktionsgebühr** (nutzungsbasiert) ⭐ | je SB-Zahlung am unbemannten Stand (Hof trägt sie aus Netto, Default) | Stripe Connect Destination Charge mit `application_fee_amount`; serverseitig berechnet, nie aus QR/Client | Phase 4 Track A — **Mindest-Geldfluss B** |

- **Marktstart-Mindestbedingung (Geld):** **mind. ein** Geldfluss live — entweder Erzeuger-Abo (WAVE_09) **oder** SB-Transaktionsgebühr (Track A). Der **stärkste** Start kombiniert beide: Abo bindet die Höfe, SB-Gebühr skaliert linear mit Abverkauf und ist zugleich der sichtbare USP.
- **Einstieg ohne Hürde:** Ein Hof darf über `demo` **kostenlos sichtbar** werden und erste Käufer gewinnen, bevor Geld fließt (Mission-Leitsatz 1). Upgrade-Pfad bei Plan-Locks immer konkret + funktionierend (Pfeiler 4) — kein toter Button.
- **Konkrete Preise = (OWNER)** — Beispielpreise in `docs/PRICING.md §2.3` sind Platzhalter; Festlegung erfordert Owner-Freigabe (Geld-Entscheidung, `CLAUDE.md` Commercial-/Stop-Regel).

---

## 8 — KPIs (Marktstart & regionales Kippen)

> Ehrlich, scope-transparent (Pfeiler 3): jede Zahl trägt Region + Zeitraum + Datenstand. Keine Fake-/Deko-KPIs.

**Angebotsseite (pro Region):**
- gewonnene Höfe (gesamt / mit gepflegter Verfügbarkeit / mit aktivem SB-Stand)
- Anteil Höfe mit ≥1 Reservierung bzw. ≥1 SB-Zahlung (Aktivierung, nicht nur Anmeldung)
- konvertierte Abos (`demo → basis+`) und Abo-MRR der Region

**Nachfrageseite (pro Region):**
- Finder-Sitzungen / „in der Nähe"-Aufrufe
- Reservierungen (Anzahl / abgeholt-Quote)
- SB-Zahlungen (Anzahl / Volumen / Plattformgebühr-Summe)
- Saison-Radar-Engagement / Favoriten-Alerts

**Loop/Beweis:**
- Time-to-first-Reservierung · Time-to-first-SB-Zahlung je Region · erste Regional-Referenz/Story

**Regionales Kipp-Kriterium (Empfehlung, Owner schärft Schwellen):**
> Eine Region gilt als „lebendig/gekippt", wenn dort **ausreichende Hof-Dichte mit echter Verfügbarkeit** besteht **und** über mehrere Wochen **wiederkehrende Reservierungen/SB-Zahlungen ohne manuelles Zutun** entstehen (organischer Loop) **und** **mind. erste zahlende Höfe** (Abo) konvertiert sind. Erst dann nächste Region. **(OWNER: konkrete Schwellen)**

---

## 9 — Marktstart-Pflicht-Set (Minimum für erste zahlende Kunden)

> Verbindlich aus `PHASEN.md`. **Kein** öffentlicher Region-Start, bevor dieses Set global grün ist. (Region-Start = zusätzlich: Region-Angebot vorgeladen, §5.)

```
Phase 1  WAVE 02–15 grün + Isolationstest (RLS deny-by-default, Plattform- + Org-Isolation)
Phase 2  Gates A–F grün + Cloudflare-Deploy + Domain + Security-Header (CSP/HSTS)
Phase 3  Ops-Gate grün (minimale Betriebssicht: Hof-/Kunden-Operations, Billing-Übersicht, Audit)
Phase 4  Track A (SB-Bezahlung) ODER Phase 1 WAVE_09 (Erzeuger-Abo) — mind. EIN Geldfluss live
Phase 5  Gate 10 grün (erste zahlende Erzeuger)
```

**Marktstart-Pflicht-Checkliste (operativ, über das Bau-Set hinaus):**

- [ ] Kernflow **Finder → Hofdetail → Reservierung/Abholfenster** end-to-end mit **echten** Daten (kein Seed-only)
- [ ] **Mind. ein Geldfluss** live + **Live-Testkauf bestanden** (Abo-Abschluss ODER SB-Zahlung am realen Stand)
- [ ] **RLS-Isolationstest grün** (fremde Org = 403, nie 200 mit Fremddaten) + Cross-Org-Negativtests
- [ ] **Zero-State** überall statt Fehler (leerer Finder/Sortiment zeigt „Noch keine Höfe/Produkte" + nächsten Schritt)
- [ ] **Rechtstexte live** (Impressum/Datenschutz/AGB/AVV) + Vermittler- & Lebensmittel-Hinweis durchgängig
- [ ] **Security-Header/WAF/Turnstile** aktiv; Konsole sauber (keine `TypeError`/401-Schleifen)
- [ ] **Observability** an (Sentry/strukturierte Logs/Health-Checks · `docs/OBSERVABILITY.md`, `docs/MONITORING.md`)
- [ ] **Backup/Recovery** verifiziert (`docs/BACKUP_DISASTER_RECOVERY.md`)
- [ ] **Erzeuger-Onboarding-Wizard** (datengetrieben/Zod, WAVE_15) live + Demo-Daten klar als Demo gekennzeichnet
- [ ] **Region-1-Angebot vorgeladen** (12–20 Höfe, gepflegte Verfügbarkeit) + 1–3 SB-Stände (falls Track A der gewählte Geldfluss ist)
- [ ] **Go-Live-Testmatrix** durchlaufen (`docs/GO_LIVE_TEST_MATRIX.md`)

---

## 10 — Meilensteine (Marktstart-Fahrplan)

| Meilenstein | Inhalt | Gate / Bedingung | Status |
|---|---|---|---|
| **M0 — Fundament spielbar** | Finder→Reservierung läuft (Seed/Supabase) | bereits erreicht (`app/`, Port 5409) | [x] |
| **M1 — Daten & Recht** | WAVE 02–15 grün, Isolationstest, Rechtstexte, Onboarding-Wizard | Go-Live-Gate Phase 1 | [ ] |
| **M2 — Online** | Cloudflare-Deploy, Domain, Security-Header, Burn-in ≥7 Tage | Phase 2 Gates A–F | [ ] |
| **M3 — Betriebssicht** | Owner-/Staff-Konsole minimal (Operations, Billing, Audit, Monitoring) | Phase 3 Ops-Gate | [ ] |
| **M4 — Geldfluss live** | Erzeuger-Abo (WAVE_09) und/oder SB-Bezahlung (Track A) + Live-Testkauf | Mind. ein Geldfluss | [ ] |
| **M5 — Region 1 vorgeladen** | 12–20 Höfe, Verfügbarkeit gepflegt, 1–3 SB-Stände, GTM-Partner gebrieft | Region-Start-Bereitschaft (§5) | [ ] |
| **M6 — Region-1-Start** | Öffentliche Aktivierung: Presse-Welle + Social-Push + Tourismus-Listung | Marktstart-Pflicht-Set (§9) grün | [ ] |
| **M7 — Region 1 gekippt** | Organischer Loop + erste zahlende Höfe | Gate 10 + regionale Kipp-KPIs (§8) | [ ] |
| **M8 — Replikation** | Region 2 (Tourismus) / Region 3 (AgrarConnect-Overlap) nach Playbook | Kipp-Beweis aus M7 | [ ] |

---

## 11 — Anti-Pattern (NICHT tun)

- Kein bundesweiter Launch (leerer Finder = Friedhof). **Dichte vor Breite.**
- Keine Performance-Ads, bevor eine Region organisch lebt (erst Liquidität, dann Paid).
- Keine zweite Region öffnen, bevor die erste gekippt ist (Kräfte nicht zersplittern).
- Käufer **nicht** mit Account-Zwang oder Gebühren abschrecken — Zugang bleibt kostenlos/friktionsarm.
- Keine Fake-/Deko-KPIs, keine Demo-Höfe ohne Kennzeichnung, keine toten CTAs vor dem Start.
- Plattform **nie** als Verkäufer/Berater positionieren (Vermittler-Rolle, Disclaimer durchgängig).
- Kein Cross-Plattform-Datensync mit AgrarConnect ohne Consent/Owner-Freigabe/ADR.

---

## 12 — Offene Owner-Entscheidungen

- [ ] **(OWNER)** **Region 1 (Anker-Region)** festlegen — bevorzugt warmes Netzwerk + Hof-Zugang (CAC ≈ 0).
- [ ] **(OWNER)** **Region-Start-Datum** — readiness-driven (Marktstart-Pflicht-Set §9 grün + Region-Angebot vorgeladen).
- [ ] **(OWNER)** **Geldfluss-Reihenfolge** zum Start — Erzeuger-Abo zuerst, SB-Bezahlung zuerst, oder beide parallel.
- [ ] **(OWNER)** **Konkrete Preise/Gebührensätze** (`docs/PRICING.md §2.3/§3`) — Geld-Entscheidung, Freigabe nötig.
- [ ] **(OWNER)** **Gründungshof-Angebot** — Ausgestaltung (bevorzugte Sichtbarkeit / Mitgestaltung / Nennung).
- [ ] **(OWNER)** **AgrarConnect-Cross-Einladung** — Datenfluss/Consent freigeben (→ ADR), Region-3-Auswahl.
- [ ] **(OWNER)** **Rechtsform / Stripe-Live-Account / Domain** — Setup-Voraussetzungen (§1).

---

## 13 — Nächste baubare Artefakte (auf Zuruf, alle im Editorial-Skin)

- **Region-Landing / Region-Vorschau** (`web/`) mit „Hof werden"-CTA + „in der Nähe finden" — nie tot.
- **Saison-Content-Kalender** (regional, datengetrieben aus Saison-Radar) — Social-Bausteine.
- **Presse-Kit** (Region-Start, USP „Vertrauenskasse 2.0", Hof-Porträt-Vorlage).
- **Erzeuger-Onboarding-Wizard** Politur (WAVE_15) + Demo-Kennzeichnung.
- **AgrarConnect-Cross-Einladungs-Flow** (consent-/RLS-sauber) — nach Owner-Freigabe.

---

*Dieses Dokument folgt der Soll-Struktur aus `MASTER_INDEX.md` (Abschnitt 8 · Marketing & Launch), ist mit `00_BRIEFING.md` §9, `docs/PLATFORM_OVERVIEW.md` (Produkt + §9 Synergie), `docs/PRICING.md` (Geldflüsse/Stufen) und `PHASEN.md` (Wellen/Gates/Marktstart-Pflicht-Set) abgeglichen und strikt auf die Hof-Domäne adaptiert (keine VMS-/TempConnect-Begriffe). Bei Konflikt gilt die Hierarchie User > AGENTS.md > Subagent > CLAUDE.md. Geld-/Deploy-/Account-/Cross-Plattform-Schritte erfordern Owner-Freigabe; Strategie-Änderungen mit Architektur-Relevanz → ADR (`docs/adr/`).*
