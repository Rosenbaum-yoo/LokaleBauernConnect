# TERMINOLOGY_GUIDE — LokaleBauernConnect · Verbindlicher Terminologie-Leitfaden

> **Source of Truth für jeden nutzersichtbaren String.** Seitentitel, Buttons, Navigation, Breadcrumbs,
> Zero-States, Tooltips, Mikrocopy, E-Mails/Benachrichtigungen, Quittungstexte — alles richtet sich nach
> diesem Leitfaden und der Rolle des Nutzers (Käufer · Erzeuger · Staff · Owner).
>
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne**. **Niemals VMS-/TempConnect-Begriffe**
> (Zeitarbeit, Vendor Pool, Requisition, Einsatzportal, Stundenzettel, Marktplatz, SCC, Hetzner) — konsequent
> auf den Hof übersetzt. Markenton: **regional-premium, editorial, vertrauensbildend** — Top-Agentur-Niveau,
> nie folkloristisch-kitschig, nie aufdringlich verkäuferisch.
>
> **Vermittler-Rolle (nicht verhandelbar):** Die Plattform **vermittelt**, sie **verkauft nicht selbst** und
> **berät nicht**. Kein sichtbarer Text darf Eigenverkauf, Beratung oder eine Lebensmittel-/Qualitäts-Garantie
> der Plattform suggerieren. Disclaimer durchgängig (Abschnitt 9).
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Verbote · §0-Markenton), `AGENTS.md` (i18n-content-spezialist),
> `docs/ROLE_AND_PERMISSION_MODEL.md` (Rollen/Begriffe), `docs/CORE_BUSINESS_STATE_MACHINES.md` (Status-Labels),
> `docs/COMPLIANCE_MODEL.md` (Disclaimer-Wortlaute), `docs/DATABASE_MODEL.md` (technische Feldnamen — bleiben intern).
> **Status:** Normativ. Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.

---

## 0 · Grundregeln

> **Technische Domänenbegriffe leben intern; im UI gilt rollenabhängige Kundensprache.**

1. **Trennung Intern ↔ Sichtbar.** Englische/technische Begriffe (`farm`, `availability`, `reservation`,
   `pickup_window`, `sb_payment`, `buyer`/`producer`) bleiben in DB-Feldern, Enums, API-Pfaden, Edge-Functions,
   Migrationen, Tests und Code-Kommentaren. **Im UI niemals.** Im UI steht ausschließlich die deutsche
   Hof-Sprache aus diesem Leitfaden.
2. **Rollenabhängigkeit.** Derselbe Sachverhalt heißt je nach Welt anders: ein Käufer sieht „Reservieren",
   der Erzeuger sieht „Reservierungen", Staff sieht „Reservierungs-Vorgänge". Eine Session = eine Welt
   (`ROLE_AND_PERMISSION_MODEL` §1).
3. **Markenton (New-York-Premium, regional verankert).** Klar, knapp, warm-souverän. Substantiv-getrieben,
   aktive Verben, keine Floskeln. **Keine Deko-Emojis** in produktiver UI (`CLAUDE.md` Frontend-Regeln).
   Regionalität ja, Mundart/Klischee nein („frisch vom Hof" ja; „direkt vom Bauer Sepp" nein).
4. **Vermittler-Disziplin im Wort.** „reservieren" ja, „kaufen/bestellen" nein (es ist kein Kaufvertrag, §2.4).
   „am SB-Stand bezahlen" ja, „bei uns bezahlen" nein (Geld fließt via Stripe an den Erzeuger, §6).
5. **Escaping bleibt Pflicht.** Jeder dynamische Wert (Hofname, Produktname, Käufer-Name) wird vor Ausgabe
   escaped — Terminologie ändert nichts an der Sicherheitsregel (`CLAUDE.md` Frontend-Regeln).

**Prioritätsregel bei Widerspruch:**

```
User-Anweisung > AGENTS.md > dieser Leitfaden > Subagenten-Default
```

---

## 1 · Rollen-Übersicht (Anzeigenamen)

| DB-Rolle (`profiles.role`) | Welt | Anzeigename im UI | Hauptperspektive |
|---|---|---|---|
| `buyer` | Käufer-Welt | **Käufer** (intern) / nach außen „Sie" / kein Etikett | sucht Höfe, sieht Verfügbarkeit, reserviert, zahlt am SB-Stand |
| `producer` | Erzeuger-Welt | **Erzeuger** (auch: „Ihr Betrieb", „Ihr Hof") | pflegt Hof, Produkte, Verfügbarkeit, Abholfenster, Reservierungen, Einnahmen |
| `staff` | Plattform-Welt | **Staff** / „Support" (kundennah) | Hof-Verifizierung, Eskalation, Support — technische Sprache intern OK |
| `owner` | Plattform-Welt | **Owner** / „Betreiber" | oberste Steuerung — interne Konsole, technische Sprache OK |

> **Wichtig:** Der **Käufer** wird im UI **nie** mit einem Rollen-Etikett angesprochen — er ist einfach der
> Besucher/Nutzer. „Käufer" ist ein interner Begriff (Doku/DB), kein sichtbares Label.
> **Owner ≠ org_owner:** „Owner" = Plattform-Betreiber (plattformweit). „Betriebsinhaber" (`org_owner`) = Inhaber
> **eines** Hofes (mandantenlokal). Im UI: Plattform → „Owner/Betreiber"; Erzeuger-Org → „Betriebsinhaber".

---

## 2 · Kern-Begriffslexikon (Hof-Domäne — die kanonischen Wörter)

Diese Tabelle ist die **Wortbank**. Linke Spalte = sichtbarer Begriff; rechte = Bedeutung + technisches Pendant.

| Sichtbarer Begriff | Bedeutung | Intern (DB/API — nie im UI) |
|---|---|---|
| **Hof** / **Betrieb** | Erzeuger-Betrieb als Ganzes (Bauernhof, Imkerei, Hofmetzgerei, Gärtnerei, Manufaktur) | `orgs` (Tenant) |
| **Hofladen** | Verkaufsstandort eines Hofes (kann mehrere pro Hof geben: Hauptstand + Filiale) | `farms` |
| **SB-Hofladen** / **SB-Stand** | Unbemannter Selbstbedienungs-Stand mit Vertrauenskasse — Ziel des Bezahl-USP | `farms.is_self_service` |
| **Erzeuger** | Mensch/Betrieb, der anbietet (Landwirt, Imker, Gärtner, Manufaktur) | `profiles.role = 'producer'` |
| **Käufer** (intern) / „Sie" (UI) | Verbraucher, Familie, regionale Gastronomie | `profiles.role = 'buyer'` |
| **Produkt** | Erzeugnis eines Hofes (Eier, Honig, Kartoffeln, Käse …) | `products` |
| **Verfügbarkeit** | Erzeuger-gepflegter Bestands-/Saisonstatus eines Produkts | `availability` |
| **Reservierung** | Käufer-Vorbestellung zur Abholung — **kein** Kaufvertrag | `reservations` |
| **Abholfenster** | Vom Erzeuger gepflegtes Zeitfenster für die Abholung | `pickup_windows` |
| **Saison-Radar** | Was gerade Saison hat + Alerts bei Lieblingsprodukten | (Feature, Phase 4 Track C) |
| **Korb** / **Mein Korb** | Käufer-Merkliste der zu reservierenden Produkte (Vorbereitungsschritt zur Reservierung) | (Client-State; keine eigene Tabelle nötig) |
| **Hofkorb** / **Bauernkorb** (optional) | Vom Erzeuger zusammengestelltes Produkt-Bündel/Abo-Korb (Phase 4+, **falls** angeboten) | `product_bundles` (geplant) |
| **am SB-Stand bezahlen** | QR scannen → Stripe → digitale Quittung | `sb_payments` |
| **Quittung** | Digitaler Zahlungsbeleg (nennt Erzeuger als Leistungserbringer + Vermittler-Hinweis) | `receipts` / Storage-PDF |
| **Hof-Verifizierung** | Staff prüft Existenz/Plausibilität des Betriebs vor öffentlicher Listung | `farms.verification_status` |
| **Lieblingshof** / **Lieblingsprodukt** | Vom Käufer gemerkter Hof / gemerktes Produkt (für Alerts) | `favorites` |

### 2.1 Verfügbarkeits-Stufen (kanonische Labels — exakt diese Wörter)

| Stufe (`availability.status`) | UI-Label | Mikrocopy / Bedeutung |
|---|---|---|
| `available` | **Verfügbar** | „Jetzt am Hof erhältlich." |
| `low` | **Wenig** | „Nur noch wenig vorrätig." |
| `soon` | **Bald** | „Bald wieder verfügbar." |
| `out` | **Aus** | „Aktuell nicht verfügbar." |

> Die Stufen sind frei navigierbar (Erzeuger-Selbstpflege, `CORE_BUSINESS_STATE_MACHINES` §2).
> Immer Selbstauskunft-Hinweis in der Nähe: „Angabe ohne Gewähr — vor Ort prüfen."

### 2.2 Reservierungs-Status-Labels (aus `CORE_BUSINESS_STATE_MACHINES` §1 — nicht abweichen)

| Status | Käufer-Label | Erzeuger-Label |
|---|---|---|
| `requested` | **Reservierung angefragt** | **Neue Reservierung** |
| `confirmed` | **Bestätigt** | **Bestätigt** |
| `picked_up` | **Abgeholt** | **Abgeholt** |
| `cancelled` | **Storniert** | **Storniert** |
| `expired` | **Abgelaufen** | **Abgelaufen** |

### 2.3 SB-Zahlungs-Status-Labels (aus `CORE_BUSINESS_STATE_MACHINES` §4)

| Status | UI-Label (Käufer) | UI-Label (Erzeuger-Dashboard) |
|---|---|---|
| `initiated` | **Zahlung läuft …** | **Eingeleitet** |
| `paid` | **Bezahlt** | **Eingegangen** |
| `failed` | **Zahlung fehlgeschlagen** | **Fehlgeschlagen** |
| `refunded` | **Erstattet** | **Erstattet** |

### 2.4 Wort-Disziplin „reservieren" vs. „kaufen" (Vermittler-Kernregel)

Eine Reservierung ist eine **Absichtserklärung zur Abholung**, kein Kaufvertrag und keine Online-Zahlung.
Daher im **Reservierungs-Flow**:

| ✅ Verwenden | ❌ Niemals (suggeriert Kauf/Haftung) |
|---|---|
| Reservieren · Zur Abholung reservieren · Abholfenster wählen | Kaufen · Bestellen · In den Warenkorb · Jetzt bezahlen |
| Reservierung anfragen · Abholung vereinbaren | Auftrag erteilen · Bestellung aufgeben |
| unverbindlich vormerken | verbindlich bestellen |

> **Ausnahme — nur im SB-Bezahl-Flow** (Abschnitt 6) ist von **„bezahlen"** die Rede, weil dort tatsächlich
> Geld fließt (via Stripe an den Erzeuger). Auch dort gilt: „am SB-Stand bezahlen", nie „bei LokaleBauernConnect kaufen".

---

## 3 · Käufer-Terminologie

> Käufer sind oft anonym (Gast-Reservierung, Turnstile-geschützt). Sprache: einladend, klar, ohne Fachjargon,
> ohne Druck. Du sprichst den Besucher direkt an („Sie"), gibst aber **nie** ein Rollen-Etikett.

### 3.1 Verbotene Begriffe im Käufer-UI

| ❌ Verboten | ✅ Verwenden stattdessen |
|---|---|
| Marktplatz / Zum Marktplatz | Höfe entdecken / Hofladen finden |
| Shop / Online-Shop | Hofladen-Finder / Höfe in der Nähe |
| Warenkorb | Mein Korb |
| Kaufen / Jetzt kaufen | Reservieren / Zur Abholung reservieren |
| Bestellen / Bestellung | Reservieren / Reservierung |
| Lieferung / Versand | Abholung / Abholfenster |
| Vendor / Anbieter (anonym) | Hof / Erzeuger / Hofladen |
| Produkte suchen (generisch) | Was gerade Saison hat / Höfe in der Nähe |
| Anbieter bewerten (Garantie-Ton) | Erfahrung teilen (ohne Plattform-Gewähr) |

### 3.2 Zulässige Käufer-Begriffe

| Begriff | Kontext |
|---|---|
| Höfe entdecken · Hofladen finden | Navigation, H1, primärer CTA |
| Höfe in der Nähe / In meiner Region | Karte, geobasierte Suche |
| Hof öffnen / Zum Hof | Detail-Sprungmarke |
| Verfügbarkeit ansehen | Produktliste eines Hofes |
| Reservieren / Zur Abholung reservieren | Primäre Käufer-Aktion |
| Abholfenster wählen | Schritt im Reservierungs-Flow |
| Mein Korb | Vorbereitungs-Merkliste vor der Reservierung |
| Am SB-Stand bezahlen | Einstieg in den QR-Bezahl-Flow |
| Meine Reservierungen | Käufer-Konto (oder signierter Gast-Link) |
| Lieblingshof / Lieblingsprodukt merken | Favoriten (für Saison-Alerts) |
| Saison-Radar / Was hat gerade Saison? | Saison-Feature |
| Quittung ansehen / herunterladen | Nach SB-Zahlung |

### 3.3 Käufer Zero-States (kein Error — Produktionspfeiler 2)

| Situation | Text | CTA |
|---|---|---|
| Keine Höfe in der Region | „In dieser Region sind noch keine Höfe gelistet." | „Region erweitern" / „Höfe vorschlagen" |
| Hof ohne gepflegte Produkte | „Dieser Hof hat noch keine Produkte hinterlegt." | „Lieblingshof merken" |
| Produkt aktuell „Aus" | „Aktuell nicht verfügbar — wir sagen Bescheid, sobald es wieder da ist." | „Verfügbarkeits-Alert aktivieren" |
| Keine Reservierungen | „Sie haben noch nichts reserviert." | „Höfe entdecken" |
| Leeres Saison-Radar | „Für diese Auswahl ist gerade nichts in Saison." | „Filter anpassen" |
| Leerer Korb | „Ihr Korb ist noch leer." | „Höfe entdecken" |

---

## 4 · Erzeuger-Terminologie

> Der Erzeuger pflegt seinen Hof selbst (Self-Service). Sprache: respektvoll auf Augenhöhe, handwerklich,
> effizient — er ist Profi seines Handwerks, kein Software-Profi. Klare Verben, kurze Wege.

### 4.1 Verbotene Begriffe im Erzeuger-UI

| ❌ Verboten | ✅ Verwenden stattdessen |
|---|---|
| Vendor / Supplier / Lieferant | Ihr Betrieb / Ihr Hof |
| Inventar / SKU / Stock | Verfügbarkeit / Bestand |
| Listing / Eintrag verwalten | Produkte pflegen / Hofladen pflegen |
| Bestellung eingegangen | Neue Reservierung |
| Auftrag / Order | Reservierung |
| Auszahlung freigeben (Plattform-Ton) | Auszahlungskonto verbinden (Stripe Connect) |
| Umsatz der Plattform | Ihre Einnahmen |
| Capacity / Kapazität | Verfügbarkeit / Bestand |
| Onboarding-Wizard (Anglizismus) | Hof einrichten / Erste Schritte |

### 4.2 Zulässige Erzeuger-Begriffe

| Begriff | Kontext |
|---|---|
| Mein Hof / Ihr Betrieb | Dashboard-Heimat |
| Hofladen pflegen · Hofladen hinzufügen | Standort-Verwaltung |
| Produkte pflegen · Produkt hinzufügen | Sortiment |
| Verfügbarkeit setzen (Verfügbar · Wenig · Bald · Aus) | Bestands-Self-Pflege |
| Abholfenster festlegen | Zeitfenster-Pflege |
| Reservierungen · Neue Reservierung · Bestätigen · Abholung bestätigen | Reservierungs-Verwaltung |
| SB-Stand einrichten · QR-Code erzeugen | SB-Bezahl-USP-Setup |
| Ihre Einnahmen · Schwund im Blick | Erzeuger-Dashboard (SB) |
| Auszahlungskonto verbinden | Stripe Connect |
| Hof-Verifizierung · In Prüfung · Verifiziert | Verifizierungs-Status |
| Hof einrichten / Erste Schritte | Onboarding |
| Team / Mitarbeiter einladen | `org_members` (nur Betriebsinhaber) |

### 4.3 Erzeuger-Subrollen (im UI)

| Intern (`org_members.org_role`) | UI-Label | Sichtbarer Umfang |
|---|---|---|
| `org_owner` | **Betriebsinhaber** | alles inkl. Abo/Billing, Auszahlungskonto, Team |
| `org_member` | **Mitarbeiter** | Produkte/Verfügbarkeit/Reservierungen — **kein** Billing/Team/Konto |

### 4.4 Erzeuger Zero-States

| Situation | Text | CTA |
|---|---|---|
| Noch kein Hofladen | „Legen Sie Ihren ersten Hofladen an, damit Käufer Sie finden." | „Hofladen hinzufügen" |
| Keine Produkte | „Noch keine Produkte hinterlegt." | „Produkt hinzufügen" |
| Keine Abholfenster | „Legen Sie Abholfenster fest, damit Käufer reservieren können." | „Abholfenster festlegen" |
| Keine Reservierungen | „Noch keine Reservierungen — Ihr Hofladen ist startklar." | „Verfügbarkeit aktualisieren" |
| Hof in Verifizierung | „Ihr Hof wird gerade geprüft. Wir melden uns, sobald er öffentlich sichtbar ist." | — (Status, kein CTA) |
| Kein SB-Stand | „Bieten Sie sichere bargeldlose Zahlung am unbemannten Stand an." | „SB-Stand einrichten" |
| Kein Auszahlungskonto | „Verbinden Sie ein Auszahlungskonto, um Einnahmen zu empfangen." | „Auszahlungskonto verbinden" |

---

## 5 · Staff- & Owner-Terminologie (Plattform-Welt)

> Intern darf technische Sprache stehen (`reservation`, `availability`, `sb_payment`, RLS, Audit). In
> **kundennahen** Staff-Aktionen (z. B. Antwort an Erzeuger/Käufer) gilt die Kundensprache der jeweiligen Welt.

**Intern zulässig (Konsole/Audit/Logs):** Reservierungs-Vorgänge · Verfügbarkeits-Status · SB-Zahlungen ·
Hof-Verifizierungs-Queue · Eskalation · Audit-Eintrag · Org-Scope · Entitlement.

**In kundennahen Staff-Texten besser:** „Reservierung" (statt `reservation`) · „Verfügbarkeit" ·
„Zahlung am SB-Stand" · „Prüfung Ihres Hofes" · „Support-Anliegen".

**Pflicht bei kritischen Aktionen (Staff/Owner):** Confirm + **Grund (Pflichtfeld)** + Risk-Level + Audit
(`ROLE_AND_PERMISSION_MODEL`). UI-Label des Pflichtfelds: **„Grund (erforderlich)"** — nie „Kommentar (optional)".

---

## 6 · SB-Bezahlung (USP) — Sprache (Vermittler-kritisch)

> Hier fließt echtes Geld via Stripe **an den Erzeuger**. Die Plattform ist **Zahlungsanbindung/Vermittler**,
> nicht Verkäufer. Wortwahl entscheidet über Compliance (`COMPLIANCE_MODEL` §Disclaimer).

| ✅ Verwenden | ❌ Niemals |
|---|---|
| Am SB-Stand bezahlen | Bei LokaleBauernConnect kaufen/bezahlen |
| QR am Stand scannen → bezahlen → Quittung | In den Warenkorb / Zur Kasse (Shop-Sprache) |
| Sichere bargeldlose Zahlung | Garantierte Zahlung / Käuferschutz der Plattform |
| Zahlung an den Hof (über Stripe) | Zahlung an LokaleBauernConnect |
| Digitale Quittung | Rechnung der Plattform |
| Vertrauenskasse digital | (kein Ersatz-/Marketing-Euphemismus für Sicherheit) |

**Pflicht-Disclaimer im Bezahl-Flow (Wortlaut aus `COMPLIANCE_MODEL`):**
> „Die Zahlung erfolgt über Stripe direkt an den Erzeuger. LokaleBauernConnect ist die Zahlungsanbindung/Vermittler,
> nicht der Verkäufer; Gewährleistung und Reklamation richten sich an den Erzeuger."

Die **Quittung** nennt den **Erzeuger als Leistungserbringer** und trägt den Vermittler-Hinweis (`CMP-04`).

---

## 7 · Vollständige Begriffsmatrix (Alt/Generisch → rollenabhängig → intern)

| Generisch / falsch | Käufer-UI | Erzeuger-UI | Staff intern | DB/API (nie im UI) |
|---|---|---|---|---|
| Marktplatz / Shop | „Höfe entdecken" | „Mein Hof" | Vermittlungs-Übersicht | `farms`, `products` |
| Anbieter / Vendor | „Hof" / „Erzeuger" | „Ihr Betrieb" | Erzeuger / Org | `orgs` |
| Standort | „Hofladen" | „Hofladen" | Standort | `farms` |
| SB-Automat / Kasse | „SB-Stand" | „SB-Stand" | SB-Standort | `farms.is_self_service` |
| Inventar / Stock | „Verfügbarkeit" | „Verfügbarkeit / Bestand" | Verfügbarkeit | `availability` |
| Bestellung / Order | „Reservierung" | „Reservierung" | Reservierungs-Vorgang | `reservations` |
| Warenkorb | „Mein Korb" | n/a | n/a | (Client-State) |
| Lieferzeit / Slot | „Abholfenster" | „Abholfenster" | Abholfenster | `pickup_windows` |
| Bezahlen (Shop) | „Am SB-Stand bezahlen" | „Einnahmen" | SB-Zahlung | `sb_payments` |
| Beleg / Rechnung | „Quittung" | „Quittung" | Quittung | `receipts` |
| Verifizierung | n/a (Status sichtbar) | „Hof-Verifizierung" | Verifizierungs-Queue | `farms.verification_status` |
| Saison-Feature | „Saison-Radar" | „Saison-Hinweis" | Saison-Radar | (Feature) |
| Favorit | „Lieblingshof/-produkt" | n/a | Favorit | `favorites` |

---

## 8 · Navigationslabels (Source of Truth pro Route)

| Route / Bereich | Käufer-Label | Erzeuger-Label | Notiz |
|---|---|---|---|
| Startseite / Finder | „Höfe entdecken" | (nicht relevant) | Käufer-Einstieg |
| Karte | „Höfe in der Nähe" | — | Phase 4 Track B |
| Hof-Detail | „Hofladen" + Hofname | — | Hofname escaped |
| Reservierungs-Flow | „Reservieren" | — | kein „Kaufen" |
| Konto/Reservierungen | „Meine Reservierungen" | „Reservierungen" | Gast: signierter Link |
| Erzeuger-Dashboard | — | „Mein Hof" | Heimat-Route |
| Produktpflege | — | „Produkte" | Self-Service |
| Verfügbarkeit | — | „Verfügbarkeit" | 4-Stufen-Self-Pflege |
| Abholfenster | — | „Abholfenster" | — |
| SB-USP | „Am SB-Stand bezahlen" | „SB-Stand" | — |
| Einnahmen | — | „Einnahmen" | nur Betriebsinhaber |
| Favoriten | „Lieblingshöfe" | — | für Alerts |
| Saison | „Saison-Radar" | „Saison-Hinweis" | — |
| Footer (rollenneutral) | „Vermittlung" / „Über uns" / „Rechtliches" | dito | neutral, kein Rollen-Overhead |

---

## 9 · Disclaimer- & Trust-Bausteine (durchgängig, wörtlich)

| Kontext | Pflicht-Wortlaut |
|---|---|
| Plattform allgemein | „LokaleBauernConnect vermittelt zwischen Höfen und Käufern. Wir verkaufen nicht selbst und beraten nicht." |
| Verfügbarkeit / Saison | „Verfügbarkeits- und Saisonangaben sind Erzeuger-Selbstauskunft ohne Gewähr." |
| Reservierung | „Eine Reservierung ist eine unverbindliche Vormerkung zur Abholung — kein Kaufvertrag." |
| SB-Bezahlung | „Die Zahlung erfolgt über Stripe direkt an den Erzeuger. LokaleBauernConnect ist die Zahlungsanbindung/Vermittler, nicht der Verkäufer." |
| Allergene / Kennzeichnung | „Angaben zu Allergenen sind Erzeuger-Selbstauskunft und ersetzen nicht die Pflichtkennzeichnung am Produkt — bitte vor Ort prüfen." |
| Bio-/Öko-Hinweis | „Ein hochgeladenes Zertifikat ist ein Erzeuger-Selbstnachweis, keine Plattform-Garantie." |

> Diese Wortlaute sind mit `COMPLIANCE_MODEL` synchron zu halten. Bei Konflikt gilt `COMPLIANCE_MODEL` für den
> juristischen Kern; dieser Leitfaden für Ton/Platzierung.

---

## 10 · Markenton-Beispiele (Do / Don't)

| Do (regional-premium, editorial) | Don't |
|---|---|
| „Frisch vom Hof. In Ihrer Region." | „Bauer Sepps Super-Angebote!" |
| „Reservieren Sie heute, holen Sie morgen ab." | „Jetzt kaufen — nur solange Vorrat reicht!!!" |
| „Diese Höfe haben gerade geöffnet." | „Top-Deals in deiner Nähe " (Emoji/Reißerei) |
| „Bald wieder verfügbar — wir sagen Bescheid." | „Ausverkauft. Pech gehabt." |
| „Sichere bargeldlose Zahlung am unbemannten Stand." | „Nie wieder Bargeld-Stress!" |
| „Angabe ohne Gewähr — vor Ort prüfen." | (Hinweis weglassen) |
| „Ihr Hof, Ihre Regeln — Verfügbarkeit jederzeit anpassen." | „Verwalten Sie Ihr Inventar im Vendor-Portal." |

**Stil-Regeln:** Sie-Form gegenüber Käufer; Sie-Form gegenüber Erzeuger; aktive Verben; ein Satz, ein Gedanke;
keine Ausrufezeichen-Ketten; keine Deko-Emojis; Zahlen/Status konkret („Wenig", nicht „fast weg").

---

## 11 · Zulässigkeitsliste — technische Begriffe, die intern bleiben (nie im UI)

```
profiles.role: buyer | producer | staff | owner   (DB-Enum)
orgs, farms, products, availability, reservations  (DB-Tabellen)
pickup_windows, sb_payments, receipts, favorites   (DB-Tabellen)
farms.is_self_service, farms.verification_status    (DB-Spalten)
availability.status: available | low | soon | out   (DB-Enum)
reservations.status: requested | confirmed | picked_up | cancelled | expired
sb_payments.status: initiated | paid | failed | refunded
org_members.org_role: org_owner | org_member
/api/... · Edge Functions (Deno) · RLS-Policies · Audit-Namespace
```

> Diese Bezeichner sind in DB, API, Edge Functions, Migrationen, Tests, Audit-Logs und Code-Kommentaren
> **korrekt** und werden **nicht** umbenannt. Im UI erscheinen sie **nie** — dort gilt Abschnitt 2–10.

---

## 12 · Implementierungs-Hinweis (zentrales Label-Mapping)

> Empfohlen: ein **datengetriebenes, rollenbewusstes** Label-Modul statt verstreuter Strings. Verhindert Drift
> und macht diesen Leitfaden zur ausführbaren Wahrheit.

```ts
// app/src/i18n/terminology.ts  (zentrale Wortbank — Quelle: dieser Leitfaden)
type Role = "buyer" | "producer" | "staff";

const TERMINOLOGY = {
  discover:        { buyer: "Höfe entdecken",      producer: "Mein Hof" },
  reserveCta:      { buyer: "Reservieren",          producer: null },
  myReservations:  { buyer: "Meine Reservierungen", producer: "Reservierungen" },
  availability:    { buyer: "Verfügbarkeit",        producer: "Verfügbarkeit" },
  pickupWindow:    { buyer: "Abholfenster",         producer: "Abholfenster" },
  sbPay:           { buyer: "Am SB-Stand bezahlen", producer: "SB-Stand" },
  earnings:        { buyer: null,                   producer: "Einnahmen" },
} as const;

export function label(key: keyof typeof TERMINOLOGY, role: Role): string {
  return TERMINOLOGY[key][role] ?? TERMINOLOGY[key].buyer ?? key;
}

// Verfügbarkeits-Stufen — exakt diese Labels (Abschnitt 2.1)
export const AVAILABILITY_LABEL = {
  available: "Verfügbar", low: "Wenig", soon: "Bald", out: "Aus",
} as const;
```

**Was NICHT tun:** keine globale Find-and-Replace ohne Kontext · keine Änderung an `innerHTML`/`dangerouslySet…`
ohne Escaping · keine Backend-/DB-Umbenennung nur für UI-Sprache · keine Deko-Emojis · keine Shop-/VMS-Begriffe.

---

## 13 · Offene Entscheidungen (Owner-Freigabe — blockieren nichts; Standard in Klammern)

| # | Frage | Standard (wenn kein Input) |
|---|---|---|
| T-1 | „Mein Korb" für Käufer-Merkliste — oder „Merkliste"? | „Mein Korb" (regional-warm, markentypisch) |
| T-2 | Erzeuger-Bündel: „Hofkorb" oder „Bauernkorb"? (Phase 4+) | „Hofkorb" (neutral-premium) |
| T-3 | Footer-Link für Vermittlungs-Info: „Vermittlung" neutral? | „Vermittlung" (rollenneutral) |
| T-4 | Käufer-Anrede „Sie" oder „Du"? | „Sie" (premium, breit anschlussfähig) |
| T-5 | SB-Einstieg-Label: „Am SB-Stand bezahlen" oder „SB-Bezahlung"? | „Am SB-Stand bezahlen" (handlungsnah) |

---

## 14 · Pflege & Phasen-Bezug

- **Quelle der Wortwahrheit:** dieser Leitfaden. Neue UI-Strings ziehen ihre Begriffe von hier.
- **Synchron halten mit:** `CORE_BUSINESS_STATE_MACHINES` (Status-Labels), `COMPLIANCE_MODEL` (Disclaimer),
  `ROLE_AND_PERMISSION_MODEL` (Rollen/Org-Begriffe), `DATABASE_MODEL` (technische Feldnamen).
- **Phasen-Anker:** WAVE_03 (Rollen/Sichtbarkeit) · WAVE_04 (Kernprodukt-Strings) · WAVE_10 (Premium-UX-Politur,
  Zero-States) · WAVE_15 (Onboarding-Sprache) · Phase 4 Track A (SB-Bezahl-Wortlaute) · Track C (Saison/Alerts).
- **Änderungen** an Anzeigenamen/Disclaimern nur nach **Owner-Bestätigung**; Begründung als Memory-Learning
  (`.claude/memory/learnings/`).

---

*Bei Widerspruch zwischen diesem Leitfaden und einer einzelnen UI-Implementierung gilt der Leitfaden — die
Implementierung wird angeglichen, nicht der Leitfaden zurechtgebogen (Kanon: Code an Spezifikation anpassen).*
