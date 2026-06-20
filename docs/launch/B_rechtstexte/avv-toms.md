# Auftragsverarbeitungsvertrag (AVV) inkl. TOMs und Subprozessoren

**Gemäß Art. 28 und Art. 32 DSGVO — LokaleBauernConnect**

> **ENTWURF — anwaltliche/datenschutzrechtliche Prüfung vor Go-Live ZWINGEND.**
> Diese Vorlage regelt die Auftragsverarbeitung zwischen dem Betreiber der Plattform
> **LokaleBauernConnect** (Auftragsverarbeiter) und einem **Erzeuger/Hofladen-Betreiber**
> (Verantwortlicher), der die Plattform zur Pflege seines Hofprofils, seiner Produkt-
> verfügbarkeit, zur Entgegennahme von Reservierungen sowie zur bargeldlosen Bezahlung an
> seinem Selbstbedienungs-Stand nutzt. Vor Verwendung durch eine/n Datenschutzbeauftragte/n
> oder Rechtsanwalt/Rechtsanwältin prüfen lassen.
> Alle Werte in `[[OWNER: ...]]` sind vor Live-Gang verbindlich auszufüllen.
> Maßgeblich gepflegte Fassungen der Anlagen: dieses Dokument (Anlage 1 TOMs, Anlage 2 Subprozessoren).

> **Rollenklarstellung (verbindlich):** LokaleBauernConnect ist **Vermittler** — eine technische
> Plattform, die Erzeuger und regionale Käufer:innen zusammenbringt. LokaleBauernConnect betreibt
> **keinen Eigenverkauf** von Lebensmitteln und erbringt **keine Ernährungs-/Produktberatung**.
> Der Kaufvertrag über Lebensmittel kommt ausschließlich zwischen Erzeuger und Käufer:in zustande.
> Für die Plattformnutzung verarbeitet LokaleBauernConnect personenbezogene Daten teils **im
> Auftrag** des Erzeugers (Auftragsverarbeitung — dieser AVV), teils **in eigener
> Verantwortlichkeit** (z. B. Betrieb, Sicherheit, Betrugsabwehr, gesetzliche Pflichten —
> siehe § 2 Abs. 5). Die Zahlungsabwicklung erfolgt über Stripe Connect; die jeweiligen
> verantwortlichkeitsrechtlichen Rollen für Zahlungsdaten ergeben sich aus § 5 und Anlage 2.

---

## Präambel

Dieser Vertrag zur Auftragsverarbeitung (nachfolgend „AVV") wird geschlossen zwischen:

**Auftraggeber (Verantwortlicher i. S. d. Art. 4 Nr. 7 DSGVO):**
Der Erzeuger / Hofladen-Betreiber, der ein Hofprofil auf LokaleBauernConnect pflegt.
[[OWNER: Bei individuell unterzeichnetem AVV — Firmenname, Anschrift, USt-IdNr./Handelsregister des Erzeugers eintragen. Bei Annahme im Onboarding-Flow gilt der bei Registrierung hinterlegte Hof-/Betriebsname als Auftraggeber.]]
(nachfolgend „Auftraggeber" oder „Erzeuger")

**Auftragnehmer (Auftragsverarbeiter i. S. d. Art. 4 Nr. 8 DSGVO):**
[[OWNER: Firmenname inkl. Rechtsform des Plattformbetreibers]]
[[OWNER: Straße und Hausnummer]], [[OWNER: PLZ]] [[OWNER: Ort]], Deutschland
[[OWNER: USt-IdNr. / Handelsregisternummer / Registergericht]]
(nachfolgend „Auftragnehmer" oder „LokaleBauernConnect")

Datenschutzkontakt des Auftragnehmers: [[OWNER: Name/Funktion und E-Mail des/der Datenschutz-Verantwortlichen, z. B. datenschutz@<domain>]]
[[OWNER: Datenschutzbeauftragte:r benannt? Falls bestellungspflichtig (Art. 37 DSGVO): Name + Kontakt. Falls nicht bestellt: hier explizit „keine Bestellpflicht" vermerken.]]

---

## § 1 Gegenstand und Dauer der Auftragsverarbeitung

**(1)** Der Auftragnehmer stellt dem Auftraggeber die SaaS-Plattform **LokaleBauernConnect**
(nachfolgend „Plattform") bereit. Die Plattform ermöglicht es Erzeugern, ihr Hofprofil und
ihre Produktverfügbarkeit selbst zu pflegen, im Hofladen-Finder gefunden zu werden,
Reservierungen für die Abholung entgegenzunehmen sowie die bargeldlose Bezahlung an
unbemannten Selbstbedienungs-Hofläden (QR-Code am Stand → Stripe → digitale Quittung)
abzuwickeln.

**(2)** Im Zuge dieser Leistungserbringung verarbeitet der Auftragnehmer personenbezogene
Daten im Auftrag und nach dokumentierter Weisung des Auftraggebers, soweit der Auftraggeber
für diese Daten Verantwortlicher ist (insbesondere die ihn betreffenden Reservierungs- und
Abholdaten seiner Kund:innen).

**(3)** Dieser AVV gilt für die Dauer der Nutzung der Plattform durch den Auftraggeber
(Hauptvertrag / Nutzungsvertrag, siehe `agb.md`) und endet automatisch mit dessen Beendigung.
Die Pflichten zur Datenlöschung/-rückgabe (§ 7) bestehen über das Vertragsende hinaus fort.

**(4)** Dieser AVV hat Vorrang vor etwaigen abweichenden Datenschutzregelungen im Hauptvertrag,
soweit die Auftragsverarbeitung betroffen ist.

---

## § 2 Art, Umfang und Zweck der Verarbeitung

**(1) Art der Verarbeitung:** Erhebung, Speicherung, Strukturierung, Anpassung/Veränderung,
Abfrage, Verwendung, Übermittlung an Subprozessoren, Einschränkung, Löschung und Vernichtung
personenbezogener Daten mittels automatisierter Verfahren in einer Cloud-Infrastruktur (EU).

**(2) Zweck der Verarbeitung:** Bereitstellung der Plattform-Funktionen — Hofladen-Finder,
Hofprofil- und Produkt-Selbstpflege durch den Erzeuger, Saison-Radar, Reservierung/Abholung,
sichere bargeldlose Bezahlung am Selbstbedienungs-Stand sowie Versand transaktionaler
Benachrichtigungen und Quittungen.

**(3) Kategorien betroffener Personen:**
- **Käufer:innen / Reservierende** (Endkund:innen, die einen Hof finden, reservieren oder am Stand bezahlen)
- **Erzeuger und deren Mitarbeitende** mit Plattformzugang (Pflege von Hofprofil/Produkten)
- **Waitlist-/Interessent:innen** (Vor-Launch-Anmeldungen)

**(4) Kategorien personenbezogener Daten:**
- **Hof-/Betriebsdaten** (häufig zugleich personenbezogen bei Einzelunternehmen): Hofname,
  Hof-Typ, Adresse (Straße, PLZ, Ort), Geokoordinaten, Hof-Story, Öffnungszeiten, Abholfenster
  — entsprechen den Feldern der Tabelle `farms`.
- **Produkt-/Verfügbarkeitsdaten:** Produktname, Kategorie, Einheit, Preis, Verfügbarkeitsstatus,
  Saison-Kennzeichnung — Tabelle `products`.
- **Reservierungsdaten:** Name der reservierenden Person, Kontakt (E-Mail **oder** Telefon),
  Hof-/Produktbezug, Menge, gewähltes Abholfenster, Status, Zeitstempel — Tabelle `reservations`.
- **Konto-/Identitätsdaten der Erzeuger-Nutzer:** E-Mail, Rolle (`kaeufer` / `erzeuger` /
  `staff` / `owner`), Anzeigename, Org-Zugehörigkeit (`org_id`) — Tabellen `profiles` / `orgs`
  sowie Supabase Auth (`auth.users`).
- **Waitlist-Daten:** Name, E-Mail, PLZ, Ort, gewünschte Rolle, Quelle — Tabelle `waitlist`.
- **Zahlungsbezogene Daten (Selbstbedienungs-Zahlung):** Betrag, Währung, Zahlungsstatus,
  Stripe-Referenzen (PaymentIntent-/Checkout-ID), Quittungsdaten. **Vollständige
  Kartendaten/Kontodaten werden ausschließlich bei Stripe verarbeitet (PCI-DSS-Scope) und
  berühren die Plattform-Datenbank nicht.**
- **Technische Daten:** IP-Adresse (pseudonymisiert/gekürzt im Monitoring), Session-/Auth-Token,
  Request-Metadaten, Cloudflare-Edge- und Turnstile-Signale (Bot-/Missbrauchsabwehr).
- **Audit-Daten:** Protokoll mutierender Aktionen (Akteur, Aktion, Entität, Begründung,
  Zeitstempel) — Tabelle `audit_log`.

> **Keine besonderen Kategorien (Art. 9 DSGVO).** Die Plattform ist nicht für die Verarbeitung
> besonderer Kategorien personenbezogener Daten bestimmt. Der Auftraggeber verpflichtet sich,
> keine solchen Daten (insb. Gesundheits-/Weltanschauungsdaten) in Freitextfeldern (z. B.
> Hof-Story, Reservierungs-Notiz) einzustellen.

**(5) Eigenverantwortliche Verarbeitung des Auftragnehmers (Abgrenzung).** Außerhalb dieses AVV
verarbeitet der Auftragnehmer bestimmte Daten als **eigener Verantwortlicher**, insbesondere für:
Plattformbetrieb und -sicherheit (WAF/Turnstile, Rate-Limiting, Missbrauchs-/Betrugsabwehr),
Erfüllung eigener gesetzlicher Pflichten (z. B. handels-/steuerrechtliche Aufbewahrung eigener
Provisions-/Abrechnungsbelege), aggregierte, nicht auf eine Einzelperson rückführbare Statistik.
Für diese Verarbeitungen gilt die Datenschutzerklärung der Plattform (`datenschutz.md`), nicht
dieser AVV.

---

## § 3 Pflichten des Auftragnehmers

Der Auftragnehmer verpflichtet sich:

**(1)** Personenbezogene Daten ausschließlich im Rahmen dieses AVV und auf dokumentierte Weisung
des Auftraggebers zu verarbeiten. Weisungen erfolgen grundsätzlich durch Nutzung der
Plattformfunktionen und Konfiguration; ergänzende Weisungen in Textform an den Datenschutz-
kontakt (§ Präambel). Eine Verarbeitung über die Weisung hinaus erfolgt nur, soweit
Unionsrecht oder mitgliedstaatliches Recht dies erfordert (Art. 28 Abs. 3 lit. a DSGVO);
in diesem Fall informiert der Auftragnehmer den Auftraggeber vor der Verarbeitung, sofern
nicht gesetzlich untersagt.

**(2)** Sicherzustellen, dass alle zur Verarbeitung befugten Personen zur Vertraulichkeit
verpflichtet sind oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen
(Art. 28 Abs. 3 lit. b DSGVO).

**(3)** Die technischen und organisatorischen Maßnahmen gemäß Art. 32 DSGVO zu ergreifen und
aufrechtzuerhalten. Die TOMs sind in **Anlage 1** dokumentiert und Bestandteil dieses Vertrags.

**(4)** Subprozessoren nur gemäß § 5 und Anlage 2 einzusetzen und den Auftraggeber über
beabsichtigte Änderungen (Hinzunahme/Austausch) mindestens **30 Tage** im Voraus zu informieren.

**(5)** Den Auftraggeber im Rahmen des technisch Möglichen bei der Erfüllung von Betroffenen-
anfragen (Art. 12–22 DSGVO) zu unterstützen (siehe § 6).

**(6)** Den Auftraggeber bei der Einhaltung der Pflichten aus Art. 32–36 DSGVO
(Datensicherheit, Meldung von Verletzungen, Datenschutz-Folgenabschätzung, vorherige
Konsultation) unter Berücksichtigung der Art der Verarbeitung und der ihm zur Verfügung
stehenden Informationen zu unterstützen (Art. 28 Abs. 3 lit. f DSGVO).

**(7)** Dem Auftraggeber alle erforderlichen Informationen zum Nachweis der Einhaltung der
Pflichten aus Art. 28 DSGVO zur Verfügung zu stellen und Überprüfungen zu ermöglichen (§ 8).

**(8)** Den Auftraggeber unverzüglich zu informieren, falls eine Weisung nach Auffassung des
Auftragnehmers gegen datenschutzrechtliche Vorschriften verstößt (Art. 28 Abs. 3 S. 3 DSGVO).

**(9)** Eine Verletzung des Schutzes personenbezogener Daten (Art. 33 DSGVO), die im
Verantwortungsbereich des Auftragnehmers eintritt, dem Auftraggeber unverzüglich, spätestens
innerhalb von **[[OWNER: Meldefrist, Empfehlung: 24 Stunden]]** nach Bekanntwerden, mitzuteilen,
einschließlich der nach Art. 33 Abs. 3 DSGVO erforderlichen Angaben, soweit verfügbar.

**(10)** Ein Verzeichnis aller Kategorien von im Auftrag durchgeführten Verarbeitungstätigkeiten
gemäß Art. 30 Abs. 2 DSGVO zu führen.

---

## § 4 Pflichten des Auftraggebers

**(1)** Für die Rechtmäßigkeit der Verarbeitung und das Vorliegen einer Rechtsgrundlage
(Art. 6 DSGVO) für die von ihm veranlassten Verarbeitungen verantwortlich zu sein.

**(2)** Weisungen grundsätzlich im Rahmen der Plattformfunktionen, ergänzend in Textform, zu
erteilen und den Datenschutzkontakt des Auftragnehmers über außergewöhnliche Weisungen zu
informieren.

**(3)** Den Auftragnehmer unverzüglich zu informieren, wenn er Fehler oder Unregelmäßigkeiten
bei der Verarbeitung feststellt.

**(4)** Sicherzustellen, dass in Freitextfeldern (Hof-Story, Reservierungs-Notiz u. Ä.) keine
besonderen Kategorien personenbezogener Daten und keine Daten Dritter ohne Rechtsgrundlage
eingestellt werden.

**(5)** Reservierungs- und Abholdaten seiner Kund:innen nur im Rahmen des Abholzwecks zu
verwenden und seine eigenen Informationspflichten gegenüber diesen Betroffenen zu erfüllen.

---

## § 5 Unterauftragsverarbeitung (Subprozessoren)

**(1)** Der Auftraggeber erteilt dem Auftragnehmer die allgemeine Genehmigung zum Einsatz der in
**Anlage 2** aufgeführten Subprozessoren (Art. 28 Abs. 2 S. 2 DSGVO).

**(2)** Beabsichtigt der Auftragnehmer, einen Subprozessor hinzuzunehmen oder auszutauschen,
informiert er den Auftraggeber mindestens **30 Tage** im Voraus (z. B. per E-Mail/Plattform-
Hinweis). Der Auftraggeber kann innerhalb von **14 Tagen** aus wichtigem, datenschutzbezogenem
Grund widersprechen. Bei berechtigtem Widerspruch sucht der Auftragnehmer eine einvernehmliche
Lösung; gelingt diese nicht, kann der betroffene Teil des Vertrags von beiden Seiten
außerordentlich gekündigt werden.

**(3)** Der Auftragnehmer schließt mit jedem Subprozessor eine vertragliche Vereinbarung, die
diesem im Wesentlichen die gleichen Datenschutzpflichten auferlegt wie in diesem AVV vereinbart
(Art. 28 Abs. 4 DSGVO), und bleibt dem Auftraggeber gegenüber für die Einhaltung verantwortlich.

**(4)** Erfolgt durch einen Subprozessor ein Drittlandtransfer (außerhalb EU/EWR), stellt der
Auftragnehmer geeignete Garantien gemäß Art. 44 ff. DSGVO sicher (z. B. EU-US Data Privacy
Framework und/oder Standardvertragsklauseln nebst ergänzenden Maßnahmen). Vorrangig werden
EU-Regionen genutzt (siehe Anlage 2).

---

## § 6 Betroffenenrechte

**(1)** Der Auftragnehmer unterstützt den Auftraggeber durch geeignete technische und
organisatorische Maßnahmen bei der Erfüllung von Betroffenenanfragen (Auskunft, Berichtigung,
Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch) im Rahmen des technisch Möglichen.

**(2)** Wendet sich eine betroffene Person direkt an den Auftragnehmer, leitet dieser die
Anfrage unverzüglich an den zuständigen Auftraggeber weiter und beantwortet sie nicht
eigenständig, soweit die Daten dem Auftrag unterliegen.

**(3)** Über die Plattform können Reservierungs- und Profildaten exportiert und gelöscht werden;
für darüber hinausgehende Anfragen stellt der Auftragnehmer auf Verlangen Exporte (CSV/JSON)
bereit.

---

## § 7 Datenlöschung und -rückgabe

**(1)** Nach Beendigung der Erbringung der Verarbeitungsleistungen löscht der Auftragnehmer nach
Wahl des Auftraggebers alle personenbezogenen Daten oder gibt sie zurück und löscht
vorhandene Kopien innerhalb von **30 Tagen**, sofern keine gesetzliche Aufbewahrungspflicht
entgegensteht (Art. 28 Abs. 3 lit. g DSGVO).

**(2)** Auf Anfrage stellt der Auftragnehmer vor der Löschung einen strukturierten Datenexport
(CSV/JSON) bereit.

**(3)** Daten, die einer gesetzlichen Aufbewahrungspflicht unterliegen (z. B. zahlungs-/
buchhaltungsrelevante Belege im Stripe-/Steuerkontext), werden bis zum Ablauf der Frist
gesperrt statt gelöscht.

**(4)** Der Auftragnehmer bestätigt die Löschung auf Verlangen in Textform.

---

## § 8 Kontrollrechte und Nachweise

**(1)** Der Auftraggeber ist berechtigt, die Einhaltung dieses AVV zu überprüfen — vorrangig
durch Einholung aktueller Zertifikate/Auditberichte der Subprozessoren (z. B. ISO 27001, SOC 2,
PCI DSS) und der vom Auftragnehmer bereitgestellten Selbstauskunft (diese TOMs).

**(2)** Vor-Ort-Kontrollen werden auf das erforderliche Maß beschränkt, mit angemessener
Vorankündigung (mindestens **14 Tage**), zu üblichen Geschäftszeiten und ohne Betriebsstörung
durchgeführt. Da die Infrastruktur vollständig bei zertifizierten Cloud-Subprozessoren
(Supabase, Cloudflare, Stripe) betrieben wird, erfolgt der Nachweis primär über deren
Zertifizierungen und Auditberichte.

**(3)** Der Auftragnehmer stellt die zur Kontrolle erforderlichen Informationen und Nachweise
zur Verfügung (Art. 28 Abs. 3 lit. h DSGVO).

---

## § 9 Haftung

Die Haftung der Parteien richtet sich nach den gesetzlichen Regelungen, insbesondere Art. 82
DSGVO, sowie den Haftungsregelungen des Hauptvertrags (`agb.md`). Im Innenverhältnis trägt jede
Partei die Verantwortung für die ihr zuzurechnenden Verstöße.

---

## § 10 Schlussbestimmungen

**(1)** Dieser Vertrag unterliegt deutschem Recht unter Ausschluss des UN-Kaufrechts.

**(2)** Gerichtsstand ist — soweit gesetzlich zulässig — der Sitz des Auftragnehmers.

**(3)** Änderungen und Ergänzungen bedürfen der Textform. Dies gilt auch für die Abbedingung
dieses Formerfordernisses.

**(4)** Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.
Die unwirksame Bestimmung ist durch eine wirksame zu ersetzen, die dem wirtschaftlichen Zweck
am nächsten kommt.

**(5)** Bei Annahme dieses AVV im Onboarding-Flow gilt die elektronische Zustimmung
(Häkchen + Zeitstempel + protokollierte Version) als Vertragsschluss in Textform.

---

## Unterschriften

**Auftraggeber (Erzeuger):**

Ort, Datum: _________________________________

Name / Funktion: _________________________________

Unterschrift: _________________________________

**Auftragnehmer ([[OWNER: Firmenname inkl. Rechtsform]]):**

Ort, Datum: _________________________________

Name / Funktion: _________________________________

Unterschrift: _________________________________

---

# Anlage 1: Technische und Organisatorische Maßnahmen (TOMs)

> Übersicht der Maßnahmen nach Art. 32 DSGVO für die LokaleBauernConnect-Infrastruktur
> (Supabase EU · Cloudflare · Stripe). Vor Live-Gang mit der tatsächlich konfigurierten
> Umgebung abzugleichen. **Kein eigener Serverraum, kein Self-Hosting** — die Plattform läuft
> ausschließlich auf den in Anlage 2 genannten Cloud-Subprozessoren.

## 1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)

- **Zutrittskontrolle (physisch):** Hosting ausschließlich in zertifizierten Rechenzentren der
  Subprozessoren (Supabase auf AWS, EU-Region; Cloudflare-Edge; Stripe). Physische
  Zugangskontrolle liegt beim jeweiligen Rechenzentrumsbetreiber (ISO 27001 / SOC 2). Der
  Auftragnehmer unterhält keinen eigenen Serverraum.
- **Zugangskontrolle (Authentifizierung):** Anmeldung über individuelle Konten via Supabase Auth;
  Passwörter werden ausschließlich serverseitig gehasht (keine Klartextspeicherung);
  Session-/Token-Management mit Ablauf. **[[OWNER: MFA für privilegierte Rollen (owner/staff)
  — Status: aktiviert/optional eintragen]].** Adminzugänge zu Subprozessor-Konsolen
  (Supabase/Cloudflare/Stripe) mit MFA absichern.
- **Zugriffskontrolle (Berechtigung):** Mandantentrennung über `org_id`; rollenbasiertes Modell
  (`kaeufer` / `erzeuger` / `staff` / `owner`); **Row Level Security (RLS) in Postgres mit
  deny-by-default** ab der ersten Migration. Erzeuger pflegen ausschließlich den eigenen,
  org-gebundenen Hof; öffentlicher Katalog (aktive Höfe/Produkte) ist lesbar; Reservierungen
  sind insert-only und nur vom zugehörigen Hof-Owner lesbar; `orgs` und `audit_log` sind nur
  über die Service-Role (Server/Edge Functions) zugänglich. Der `service_role`-Schlüssel wird
  ausschließlich serverseitig (Supabase Edge Functions / Cloudflare Workers) verwendet und
  niemals an den Client ausgeliefert.
- **Trennungskontrolle:** Logische Mandantentrennung pro `org_id` auf Datenbankebene (RLS);
  getrennte Berechtigungswelten für Käufer-, Erzeuger- und Owner-Bereiche; getrennte
  Umgebungen (Entwicklung/Produktion) mit getrennten Schlüsseln.
- **Pseudonymisierung / Verschlüsselung:** Transportverschlüsselung durchgängig (TLS/HTTPS,
  erzwungen über Cloudflare); Speicherverschlüsselung gemäß Provider-Standard (Supabase/AWS
  Encryption at Rest); IP-Adressen im Monitoring gekürzt/pseudonymisiert; vollständige
  Zahlungsdaten verbleiben im PCI-Scope von Stripe und werden nicht in der Plattform-DB
  gespeichert.

## 2. Integrität (Art. 32 Abs. 1 lit. b DSGVO)

- **Eingabekontrolle:** Serverseitige **Audit-Protokollierung** mutierender Aktionen
  (`audit_log`: Akteur, Aktion, Entität, Begründung, Zeitstempel); Begründungspflicht bei
  kritischen Aktionen; Validierung von Eingaben server- und datenbankseitig (Constraints/Checks,
  z. B. Mengen- und Längenbegrenzungen).
- **Weitergabekontrolle:** Datenübermittlung an Subprozessoren ausschließlich verschlüsselt und
  auf Basis abgeschlossener AVV/DPA; Bot-/Missbrauchsabwehr am Edge über **Cloudflare Turnstile**
  und **WAF** vor Formular-Endpunkten (z. B. Reservierung, Waitlist).
- **Auftrags-/Schnittstellen-Integrität:** Webhooks (insb. Stripe) werden serverseitig
  signaturgeprüft; idempotente Verarbeitung von Zahlungs-Events.

## 3. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b/c DSGVO)

- **Verfügbarkeitskontrolle:** Managed-Datenbank mit automatisierten Backups (Supabase);
  **[[OWNER: Backup-Frequenz und Aufbewahrungsdauer eintragen — abhängig vom Supabase-Plan,
  z. B. tägliche Backups, 7–30 Tage Retention]]**; Point-in-Time-Recovery
  **[[OWNER: PITR aktiviert? ja/nein — planabhängig]]**.
- **Rasche Wiederherstellbarkeit:** Dokumentiertes Wiederherstellungsverfahren
  (Restore-Drill mindestens jährlich); Infrastruktur als Code (Migrationen unter
  `supabase/migrations/`) ermöglicht reproduzierbaren Wiederaufbau.
- **Belastbarkeit:** Globales CDN, Caching, DDoS-Schutz und Rate-Limiting über Cloudflare;
  horizontale Skalierung der Edge-/DB-Schicht über die Managed-Provider.

## 4. Verfahren zur regelmäßigen Überprüfung, Bewertung und Evaluierung (Art. 32 Abs. 1 lit. d DSGVO)

- **Datenschutz-Management:** Verzeichnis der Verarbeitungstätigkeiten (Art. 30), gepflegte TOMs
  und Subprozessor-Liste (diese Anlagen); Datenschutzkontakt benannt (§ Präambel).
- **Incident-Response:** Definierter Prozess zur Erkennung, Bewertung und Meldung von
  Datenschutzverletzungen (Art. 33/34) inkl. Meldefrist an den Auftraggeber (§ 3 Abs. 9).
- **Auftragskontrolle:** AVV/DPA mit allen Subprozessoren; regelmäßige Überprüfung der von den
  Subprozessoren bereitgestellten Zertifikate/Auditberichte.
- **Datenminimierung & Privacy by Default:** Es werden nur die für den jeweiligen Zweck
  erforderlichen Felder erhoben (siehe § 2 Abs. 4); keine Demo-/Fake-Daten in Produktion;
  Standardkonfiguration restriktiv (deny-by-default, keine öffentlichen Schreibrechte).

---

# Anlage 2: Verzeichnis der Subprozessoren (Unterauftragsverarbeiter)

> Optionale Dienste werden nur eingesetzt, wenn sie konfiguriert/aktiviert sind. Über neue
> Subprozessoren wird der Auftraggeber mindestens 30 Tage vor Einsatz informiert (§ 5 Abs. 2).
> **Stack ist fix:** Supabase (EU) · Cloudflare · Stripe(+Connect). Kein Hetzner, kein
> Docker-Self-Host.

## Aktive Subprozessoren

### 1. Supabase (Hosting, Datenbank, Auth, Storage, Edge Functions)
| Feld | Wert |
|---|---|
| Dienst/Anbieter | [[OWNER: Vertragspartner bestätigen — i. d. R. Supabase, Inc., 970 Toa Payoh North #07-04, Singapore; Verarbeitung über AWS-EU-Region]] |
| Zweck | Managed Postgres (mit RLS), Authentifizierung, Datei-Storage, Edge Functions (Deno) |
| Verarbeitungsstandort | EU (AWS-Region — [[OWNER: Region bestätigen, z. B. eu-central-1 Frankfurt]]) |
| Unter-Subprozessor | Amazon Web Services (Rechenzentrum EU) |
| Zertifizierungen | SOC 2 Type II; AWS-Infrastruktur ISO 27001 / SOC 2 |
| Drittlandtransfer | Nein bei EU-Region (Daten ruhen in der EU); Support/Verwaltung ggf. mit SCC abgesichert |
| AVV/DPA vorhanden | Ja (Supabase Data Processing Addendum) — [[OWNER: DPA abgeschlossen? Datum]] |
| Aktivierungsstatus | Aktiv (Kern-Produktionsinfrastruktur) |

### 2. Cloudflare (Edge, CDN, WAF, Bot-Abwehr, Pages/Workers)
| Feld | Wert |
|---|---|
| Dienst/Anbieter | Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA (EU-Vertretung: Cloudflare Germany GmbH) |
| Zweck | Pages-/Workers-Hosting des Frontends, CDN/Caching, TLS, DDoS-Schutz, WAF, **Turnstile** (Bot-/Missbrauchsabwehr) |
| Zu verarbeitende Daten | IP-Adresse, Request-Metadaten, Turnstile-Challenge-Signale (kein Klartext-Inhalt sensibler Felder) |
| Verarbeitungsstandort | Global (Edge); EU-Datenregionalisierung über Cloudflare „Data Localization Suite" möglich |
| Zertifizierungen | ISO 27001, SOC 2 Type II, PCI DSS |
| Drittlandtransfer | Ja — EU-US Data Privacy Framework + Standardvertragsklauseln |
| AVV/DPA vorhanden | Ja (Cloudflare Data Processing Addendum) — [[OWNER: DPA bestätigen]] |
| Aktivierungsstatus | Aktiv |

### 3. Stripe (Zahlungsabwicklung, Stripe Connect)
| Feld | Wert |
|---|---|
| Dienst/Anbieter | Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin, Irland (Mutter: Stripe, Inc., USA) |
| Zweck | Bargeldlose Bezahlung am Selbstbedienungs-Stand (QR → Checkout/PaymentIntent), Quittungen, Auszahlung an Erzeuger via **Stripe Connect**, Provisions-/Plattformgebühr |
| Verantwortlichkeit | Für vollständige Zahlungsdaten ist Stripe eigenständig Verantwortlicher bzw. gemeinsam Verantwortlicher (PCI-Scope); die Plattform speichert nur Referenzen/Status |
| Zu verarbeitende Daten | Betrag, Währung, Zahlungsstatus, Stripe-Referenzen; vollständige Karten-/Kontodaten ausschließlich bei Stripe |
| Verarbeitungsstandort | EU (Stripe Europe, Dublin) und USA |
| Zertifizierungen | PCI DSS Level 1 |
| Drittlandtransfer | Ja — EU-US Data Privacy Framework + Standardvertragsklauseln |
| AVV/DPA vorhanden | Ja (Stripe Data Processing Agreement) — [[OWNER: DPA + Connect-Konditionen bestätigen]] |
| Aktivierungsstatus | Aktiv, sobald Stripe konfiguriert (Selbstbedienungs-Zahlung ist USP) |

### 4. E-Mail-/Benachrichtigungs-Versand (transaktional)
| Feld | Wert |
|---|---|
| Dienst/Anbieter | [[OWNER: Provider bestätigen — z. B. integrierter Supabase-Auth-Mailer oder Resend, Inc. (EU-Region wählbar)]] |
| Zweck | Versand transaktionaler E-Mails: Registrierung/Login-Links, Reservierungs-/Abhol-Bestätigungen, digitale Quittungen, Waitlist-Bestätigung |
| Zu verarbeitende Daten | E-Mail-Adresse, Name, Reservierungs-/Quittungsdaten |
| Verarbeitungsstandort | [[OWNER: EU bevorzugen — Region bestätigen]] |
| Drittlandtransfer | [[OWNER: ja/nein je nach Provider/Region — bei US-Provider SCC + DPF angeben]] |
| AVV/DPA vorhanden | [[OWNER: DPA abschließen und Datum eintragen]] |
| Aktivierungsstatus | Optional — nur aktiv, wenn ein E-Mail-Provider konfiguriert ist |

## Geplante / In Prüfung

| Dienst | Zweck | Status |
|---|---|---|
| [[OWNER: Karten-/Geocoding-Anbieter, falls eingesetzt — z. B. MapTiler/Mapbox (EU)]] | Kartendarstellung & PLZ-Geocoding im Hofladen-Finder | [[OWNER: Status — aktiv/geplant; aktuell ggf. clientseitige Distanzberechnung ohne externen Dienst]] |
| [[OWNER: Fehler-/Performance-Monitoring, falls eingesetzt — z. B. Sentry mit EU-Region, sendDefaultPii=false]] | Fehler-Tracking, Stabilität | [[OWNER: Status; PII-Scrubbing verpflichtend]] |

---

> **Hinweis:** Diese Vorlage ersetzt keine Rechtsberatung. AVV, TOMs und Subprozessor-Liste sind
> vor Einsatz durch eine/n Datenschutzbeauftragte/n oder Rechtsanwalt/Rechtsanwältin zu prüfen
> und mit der tatsächlich konfigurierten Infrastruktur (Supabase EU · Cloudflare · Stripe)
> abzugleichen. LokaleBauernConnect handelt durchgängig als **Vermittler** — kein Eigenverkauf,
> keine Beratung; die Disclaimer gemäß `agb.md` / `datenschutz.md` gelten ergänzend.
