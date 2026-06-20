# WAVE_14 — Legal & Datenschutz: Impressum, Datenschutz, AGB, AVV-Verknüpfung, Lebensmittel-Hinweis, Cookie/Consent

> **Phase:** 1 — Fundament & Kernprodukt. **Prio:** P0 für Go-Live (rechtlicher Türsteher — ohne Impressum/Datenschutz/AGB darf in DE keine kommerzielle Plattform live gehen). **Voraussetzung:** WAVE_06 (Security: Auth, Turnstile, RLS-Härtung, Rate-Limits — liefert die TOM-Realität), WAVE_09 (Billing/Stripe + Vorbereitung SB-Bezahl-USP — liefert Zahlungs-/Verantwortlichkeitsrollen), WAVE_13 (Observability — liefert die „Eingabekontrolle/Audit"-Realität für die TOMs).
> **Ausführungsagent:** Claude (gesamter Stack) + Subagenten **compliance-officer** (führend: DSGVO-Vollständigkeit, Lebensmittel-Kennzeichnungs-Hinweis, Vermittler-Disclaimer, keine Reste), **i18n-content-spezialist** (deutsche Rechts-/Trust-Texte im Editorial-Markenton, Mikrocopy), **frontend-design-guardian** (Legal-Seiten + Consent-Banner exakt im Token-/Komponentensystem, keine neuen Farben/Fonts), **security-auditor** read-only (CSP/Consent-Gating: kein nicht-essentielles Skript vor Einwilligung, keine PII im Log), **edge-functions-spezialist** (DSAR-/Export-/Lösch-Endpunkte serverseitig mit Audit).
> **Owner-Freigabe erforderlich für:** jeden `git commit`/`push`; Befüllen der `[[OWNER: …]]`-Platzhalter mit verbindlichen Firmen-/Vertretungsdaten; **anwaltliche/datenschutzrechtliche Endprüfung vor Live-Schaltung** (zwingend, nicht verhandelbar); Aktivierung optionaler Subprozessoren (Sentry/Karten-/E-Mail-Provider), die neue Consent-/AVV-Pflichten auslösen.
> **Wichtige Grenze (verbindlich, wie TempConnect-Blueprint):** Claude ist **kein Anwalt**. Jeder Rechtstext trägt sichtbar „**ENTWURF — anwaltliche/datenschutzrechtliche Prüfung vor Go-Live zwingend**" + Stand-Datum. Keine absoluten Garantien, keine Aussage, die Technik/Betrieb nicht real decken (z. B. keine SLA-/„100 % sicher"-Claims). LokaleBauernConnect ist durchgängig **Vermittler** — kein Eigenverkauf, keine Beratung.
> **Adaptiert** aus dem TempConnect-Blueprint (`finalization/WAVE_14_legal_dataprotection.md`, read-only) auf **React+Vite+TS · Supabase (EU, Postgres + RLS) · Cloudflare (Pages/Workers/Turnstile/WAF) · Stripe(+Connect)**. VMS-/Hetzner-Begriffe (Zeitarbeit, Vendor Pool, Einsatzportal, SCC, eigener Serverraum) entfallen vollständig; an ihre Stelle tritt die Hof-Domäne (Hofladen-Finder, Verfügbarkeit, Reservierung/Abholung, SB-Bezahlung) auf Managed-Cloud.

---

## Ziel

LokaleBauernConnect besteht eine deutsche/EU-Rechts- und Datenschutzprüfung **lückenlos** und geht **rechtssicher** online — ohne juristische Schattenstellen und ohne UI, die mehr verspricht, als Technik und Betrieb leisten. Konkret:

1. **Pflicht-Rechtstexte vollständig & verlinkt.** Impressum (§ 5 DDG / ehem. TMG), Datenschutzerklärung (Art. 13/14 DSGVO), AGB/Nutzungsbedingungen (Vermittler-Rolle) und die bereits bestehende **AVV-/TOM-/Subprozessor-Verknüpfung** (`docs/launch/B_rechtstexte/avv-toms.md`) sind als gepflegte Dokumente vorhanden, von jeder Seite über einen **echten Footer-Bereich** erreichbar (kein toter Link), und in der App als eigene Legal-Ansichten gerendert.
2. **Lebensmittel-Hinweis durchgängig.** Ein klarer, wiederkehrender Hinweis stellt fest: Plattform = **Vermittler**, kein Eigenverkauf, keine Ernährungs-/Produktberatung; Kaufvertrag entsteht zwischen Erzeuger und Käufer:in; **Pflichtkennzeichnung (LMIV/LFGB, Allergene, Herkunft, Preisangaben) liegt beim Erzeuger**. Der Hinweis erscheint dort, wo Produkt-/Verfügbarkeitsangaben auftauchen, nicht nur im AGB-Kleingedruckten.
3. **DSGVO-konformes Cookie/Consent.** Kein nicht-essentielles Skript/Cookie lädt **vor** aktiver Einwilligung. Ein Consent-Banner mit gleichwertigen „Alle akzeptieren" / „Nur notwendige" / „Einstellungen"-Optionen (TTDSG/DSGVO: Ablehnen so einfach wie Akzeptieren), granular pro Kategorie, mit dokumentierter, widerrufbarer Einwilligung (Zeitstempel + Version). Die Plattform startet **datensparsam** (aktuell nur essenzielle First-Party-Cookies — daher ehrlich „cookiearm", kein Fake-Tracking-Banner).
4. **End-to-End verdrahtet, nicht dekorativ.** Footer-Legal-Navigation → echte Legal-Ansicht → echtes DOM → Consent-Status real persistiert & gelesen → Widerruf real auslösbar. Selbstauskunft/Export/Löschung (DSAR) sind als realer, serverseitig auditierter Pfad angelegt (Edge Function), nicht als „bitte E-Mail an uns" ohne Funktion.
5. **Compliance-Modell dokumentiert.** Ein `docs/COMPLIANCE_MODEL.md` bündelt Verantwortlichkeitsrollen (Verantwortlicher vs. Auftragsverarbeiter je Datenkategorie), Rechtsgrundlagen, Speicherfristen, Löschkonzept und die Verzahnung mit AVV/TOMs — als prüfbares Artefakt für eine Due Diligence.

Diese Welle ist **Pflichtbestandteil des Go-Live-Gate Phase 1** und liefert direkt in **Phase-2-Gate D (Legal)** ein. Erst wenn das Legal-Gate grün ist, ist die Plattform für die Cloudflare-Live-Schaltung freigegeben.

---

## Ist-Zustand (repo-genau geprüft)

Geprüfte Quellen: `app/src/App.tsx`, `app/src/pages/FinderPage.tsx`, `app/src/components/FarmDrawer.tsx`, `app/src/styles/theme.css`, `app/public/_headers`, `app/docs/launch/B_rechtstexte/avv-toms.md`, `app/supabase/migrations/0001_core.sql`–`0003_marketplace.sql`, `app/supabase/functions/*`.

### Vorhanden (Bestand — nicht duplizieren, sondern andocken)

| Asset | Fundstelle | Bewertung |
|---|---|---|
| **Vermittler-Disclaimer im Footer** | `App.tsx:24–32` (`.disclaimer-line`) | Gute Basis-Aussage („Vermittlungsplattform … Reservierung ohne Kaufgarantie"). **Aber:** keine Links zu Impressum/Datenschutz/AGB → Footer ist rechtlich eine Sackgasse. |
| **AVV + TOMs + Subprozessoren** | `docs/launch/B_rechtstexte/avv-toms.md` | Vollständig, Enterprise-Niveau, mit `[[OWNER: …]]`-Platzhaltern, EU-Stack korrekt (Supabase/Cloudflare/Stripe). **Wird verknüpft, nicht neu geschrieben.** |
| **Security-Header / CSP** | `public/_headers` | CSP `default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`, HSTS, `Permissions-Policy` mit `geolocation=(self)`, `camera=()`, `microphone=()`. Solide Consent-Grundlage: heute lädt **kein** Drittskript → Consent-Banner muss ehrlich „nur essenzielle Cookies" abbilden. |
| **Audit-Tabelle** | `0001_core.sql` (`audit_log`) | Liefert die TOM-Realität „Eingabekontrolle"; DSAR-Aktionen werden hier protokolliert. |
| **Edge Functions (Deno)** | `supabase/functions/create-checkout`, `stripe-webhook`, `_shared/*` | Vorhandenes Muster (Zod-Grenze, service role nur hier, CORS) → DSAR-/Export-/Lösch-Function dockt an dieses Muster an. |
| **Design-Tokens** | `src/styles/theme.css` (`--line`, `--muted`, `--gold`, `--ok`, `.wrap`, `.app-foot`) | Consent-Banner + Legal-Seiten nutzen ausschließlich diese Tokens — keine neuen Farben/Fonts. |

### Identifizierte Lücken (was diese Welle schließt)

| Befund | Konsequenz ohne Fix | Fix in dieser Welle |
|---|---|---|
| **Kein Impressum** | § 5 DDG-Verstoß → Abmahnrisiko, kein zulässiger Live-Gang | `impressum.md` + Legal-Ansicht |
| **Keine Datenschutzerklärung** | Art. 13 DSGVO-Verstoß (Informationspflicht) | `datenschutz.md` + Legal-Ansicht |
| **Keine AGB** | Vermittler-/Reservierungs-/Zahlungs-Verhältnis ungeregelt; Vertragsschluss-Logik unklar | `agb.md` + Legal-Ansicht |
| **Footer ohne Legal-Links** | Pflichttexte nicht „leicht erkennbar/unmittelbar erreichbar" (§ 5 DDG) | Footer-Legal-Navigation (echte Links) |
| **Kein Cookie/Consent-Mechanismus** | TTDSG/DSGVO: nicht-essentielle Cookies/Skripte bräuchten Einwilligung; Widerruf fehlt | `ConsentBanner` + `lib/consent.ts` + CSP-Gate |
| **Lebensmittel-Hinweis fehlt am Produktort** | Erzeuger-Kennzeichnungspflicht (LMIV/Allergene) nicht erkennbar abgegrenzt → Plattform könnte als Verkäufer/Berater missverstanden werden | `FoodInfoNotice`-Komponente in Finder/Drawer |
| **Kein DSAR-/Export-/Lösch-Pfad** | Betroffenenrechte (Art. 15–20 DSGVO) nicht erfüllbar → Aufsichtsrisiko | Edge Function `data-request` + UI-Einstieg |
| **Kein Compliance-Modell-Dokument** | Due Diligence ohne prüfbares Artefakt | `docs/COMPLIANCE_MODEL.md` |
| **Routing: SPA ohne Router** | `App.tsx` rendert direkt `<FinderPage/>` — kein Pfad für `/impressum` etc. | leichter Hash-/Pfad-Router NUR für Legal-Views (kein schweres Router-Paket erzwingen — siehe Architektur-Notiz) |

> **Architektur-Notiz (Stop-Regel-bewusst):** Die App ist heute eine **Single-View-SPA** (`App.tsx → FinderPage`). Für die Legal-Seiten wird **kein** schweres Routing-Framework nachgerüstet, solange WAVE_10 (Premium UX) keinen App-weiten Router einführt — das wäre ein verdeckter Architekturwechsel. Stattdessen: ein **minimaler, eigener View-Switch** (Hash-Route `#/legal/impressum` o. ä. bzw. `?legal=…`) rendert die Legal-Ansichten neben dem Finder. Falls WAVE_10 bereits `react-router` etabliert hat, werden die Legal-Routen dort registriert (prüfen, nicht annehmen). Die Markdown-Quelle bleibt führend (`docs/launch/B_rechtstexte/*.md`); die App rendert sie als statisch eingebundenen Inhalt (Build-Zeit-Import), damit es **eine Wahrheit** gibt und keine doppelte Pflege.

---

## Aufgaben

### 1. Pflicht-Rechtstexte als gepflegte Markdown-Quelle (P0)

Alle Texte unter `app/docs/launch/B_rechtstexte/` (Bestand erweitern; `avv-toms.md` existiert bereits). **Eine Wahrheit** — die App rendert genau diese Dateien. Jede Datei trägt Kopf: `> ENTWURF — anwaltliche/datenschutzrechtliche Prüfung vor Go-Live zwingend. Stand: YYYY-MM-DD.` und füllt verbindliche Werte als `[[OWNER: …]]`-Platzhalter (gleiches Muster wie `avv-toms.md`).

**1a. `impressum.md`** — § 5 DDG / § 18 MStV:
- Diensteanbieter (Firma inkl. Rechtsform, Anschrift, vertretungsberechtigte Person), Kontakt (E-Mail, Telefon), Register (HRB/Registergericht), USt-IdNr.; bei journalistisch-redaktionellen Inhalten Verantwortliche:r nach § 18 Abs. 2 MStV.
- **OS-Plattform-Hinweis** (Art. 14 ODR-VO) + **VSBG-Hinweis** (Verbraucherschlichtung: Teilnahmebereitschaft ja/nein — `[[OWNER]]`).
- Haftungs-/Urheberrechtshinweise schlank, kein Textbaustein-Wildwuchs.

**1b. `datenschutz.md`** — Art. 13/14 DSGVO, abgestimmt auf die **reale** Datenarchitektur (RLS, Tabellen aus den Migrationen, Stack EU):
- Verantwortlicher + Datenschutzkontakt (`[[OWNER]]`); ggf. DSB.
- **Datenkategorien & Zwecke & Rechtsgrundlagen** je Verarbeitung — kongruent zu `avv-toms.md § 2 Abs. 4`:
  - Hofprofil/Produkte (`farms`, `products`) — Vertrag/berechtigtes Interesse (Erzeuger), Art. 6 (1) b/f.
  - Reservierung (`reservations`: Name, E-Mail **oder** Telefon, Hof/Produkt, Menge, Abholfenster) — Vertragsanbahnung/-erfüllung, Art. 6 (1) b.
  - Konto/Identität (`profiles`, `orgs`, Supabase `auth.users`) — Vertrag, Art. 6 (1) b.
  - Waitlist (`waitlist`) — Einwilligung, Art. 6 (1) a (mit Double-Opt-in-Hinweis, wenn so umgesetzt).
  - SB-Zahlung (Betrag/Status/Stripe-Referenzen; **vollständige Kartendaten nur bei Stripe, PCI-Scope**) — Vertrag + rechtliche Pflicht (Belege), Art. 6 (1) b/c.
  - Sicherheit/Missbrauchsabwehr (Cloudflare WAF/**Turnstile**, gekürzte IP) — berechtigtes Interesse, Art. 6 (1) f.
  - Audit (`audit_log`) — rechtliche Pflicht/berechtigtes Interesse, Art. 6 (1) c/f.
- **Empfänger/Subprozessoren** → Querverweis auf `avv-toms.md Anlage 2` (Supabase EU, Cloudflare, Stripe, optional E-Mail/Karten/Sentry); Drittlandtransfer mit DPF/SCC.
- **Speicherdauer/Löschkonzept** (siehe Aufgabe 6), **Betroffenenrechte** (Art. 15–21 + Beschwerderecht Aufsichtsbehörde), **kein automatisiertes Einzelentscheiden/Profiling** (Art. 22), **Cookie/Consent-Abschnitt** (siehe Aufgabe 4), **Pflicht zur Bereitstellung** (Welche Daten Pflicht/freiwillig).

**1c. `agb.md`** — Nutzungsbedingungen mit klarer **Vermittler-Rolle**:
- Geltungsbereich, Vertragsschluss **Plattform↔Nutzer** (nicht Kaufvertrag über Lebensmittel — der entsteht Erzeuger↔Käufer:in).
- Rollen/Pflichten Käufer:in / Erzeuger; Reservierung = unverbindliche Abholanfrage **ohne Kaufgarantie** (deckungsgleich mit Footer-Disclaimer `App.tsx:26–31`).
- **SB-Bezahlung (USP):** Plattform stellt nur die Zahlungsanbindung (Stripe/Connect) bereit, ist nicht Verkäuferin; Quittung, Plattform-/Provisionsgebühr transparent; Storno/Erstattung über Stripe-Pfad.
- Erzeuger-Pflichten zur **Lebensmittel-Kennzeichnung** (LMIV/LFGB/Allergene/Herkunft/Grundpreis) + Freistellung der Plattform.
- Widerrufsrecht-Einordnung: Plattformnutzung vs. Lebensmittel-Direktkauf am Hof (Hinweis, dass das Kaufverhältnis beim Erzeuger liegt); Verbraucherinfos; Haftung/Gewähr „ohne Gewähr" konsistent; Schlichtung/anwendbares Recht/Gerichtsstand.

**1d. `avv-toms.md`** — **bereits vorhanden**: nur konsistent halten (Stand-Datum, Querverweise aus `datenschutz.md`/`agb.md`), **nicht** neu schreiben. Bei realer Subprozessor-Änderung (Aufgabe 7) Anlage 2 nachziehen.

### 2. Footer-Legal-Navigation + Legal-Ansichten in der App (P0, End-to-End)

**2a. Footer erweitern** (`app/src/App.tsx`) — bestehenden `.app-foot` um eine echte Legal-Navigation ergänzen (Tokens aus `theme.css`, keine neuen Farben):

```tsx
<nav className="app-foot__legal" aria-label="Rechtliches">
  <a href="#/legal/impressum">Impressum</a>
  <a href="#/legal/datenschutz">Datenschutz</a>
  <a href="#/legal/agb">AGB</a>
  <a href="#/legal/avv">AVV &amp; Subprozessoren</a>
  <button type="button" className="linklike" onClick={openConsentSettings}>Cookie-Einstellungen</button>
</nav>
```

> Der bestehende `.disclaimer-line` bleibt (Vermittler-Aussage) — er wird durch die Links ergänzt, nicht ersetzt.

**2b. Legal-View-Komponente** (`app/src/pages/LegalPage.tsx` + `app/src/components/LegalLayout.tsx`):
- Liest die Hash-Route (`#/legal/<slug>`), rendert den zugehörigen Markdown-Text als HTML.
- **Markdown-Quelle Build-Zeit-importiert** (z. B. `?raw`-Import der `.md` aus `docs/launch/B_rechtstexte/`) → eine Wahrheit, keine doppelte Pflege. Markdown→HTML mit einem schlanken, **sanitisierenden** Renderer (kein rohes `dangerouslySetInnerHTML` ohne Sanitizing — Kanon: User-/Fremd-Input escapen; hier Build-Zeit-Quelle, dennoch Sanitizing als Disziplin).
- Zustände: gültiger Slug → Text; unbekannter Slug → Zero-State („Dokument nicht gefunden", Link zurück); Stand-Datum + „ENTWURF, rechtlich zu prüfen"-Badge sichtbar oben.
- Deep-Link-fähig (jede Legal-Seite direkt teilbar), `<title>`/`<h1>` je Dokument gesetzt (SEO/Erreichbarkeit).

**2c. Minimaler View-Switch** (`app/src/App.tsx`): bei Hash `#/legal/*` `LegalPage` statt/zusätzlich zu `FinderPage` rendern; sonst Finder. `hashchange`-Listener, kein neues Routing-Framework (Architektur-Notiz oben). Falls WAVE_10 bereits einen Router etabliert hat → dort registrieren.

**2d. `theme.css`** um `.app-foot__legal` (Flex-Liste, `gap`, `--line`/`--muted`, Fokus-Stil) und `.legal` (Lesetypografie, `max-width`, Headings) ergänzen — Tokens-only.

### 3. Lebensmittel-Hinweis am Produktort (P0)

Neue Komponente `app/src/components/FoodInfoNotice.tsx` (variant `inline` | `compact`), eingebunden dort, wo Produkt-/Verfügbarkeitsdaten erscheinen — **`FinderPage.tsx`** (einmal pro Liste) und **`FarmDrawer.tsx`** (Detail mit Produkten):

```tsx
/** Lebensmittel-/Vermittler-Hinweis am Produktort — Erzeuger trägt Kennzeichnungspflicht. */
export function FoodInfoNotice({ variant = 'inline' }: { variant?: 'inline' | 'compact' }) {
  return (
    <p className={`food-note food-note--${variant}`} role="note">
      Angaben zu Produkten, Preisen, Herkunft, Allergenen und Verfügbarkeit stammen vom
      jeweiligen Erzeuger und liegen in dessen Verantwortung. LokaleBauernConnect vermittelt
      nur und verkauft nicht selbst. {variant === 'inline' && (
        <a href="#/legal/agb">Mehr im Lebensmittel-Hinweis</a>
      )}
    </p>
  )
}
```

> Inhaltlich deckungsgleich mit der Vermittler-Aussage in `App.tsx` und mit `agb.md`/`datenschutz.md` — **keine widersprüchlichen Aussagen** (Konsistenzprüfung Aufgabe 8). Styling `.food-note` via `theme.css`-Tokens (dezent, `--muted`, `--line`), keine Deko-Emojis.

### 4. Cookie/Consent — ehrlich, granular, widerrufbar (P0)

**4a. Consent-Store** `app/src/lib/consent.ts`:
- Kategorien: `essential` (immer an, nicht abwählbar), `analytics`, `marketing` (heute beide **inaktiv**, da kein Drittskript geladen — ehrlich so abbilden).
- Persistenz in `localStorage` als versioniertes Objekt `{ version, decidedAt, choices }`; `version`-Bump erzwingt erneute Abfrage (Einwilligung an konkrete Verarbeitungen gebunden).
- API: `getConsent()`, `setConsent(choices)`, `hasDecided()`, `withdraw()`, `onConsentChange(cb)` (Event), `isAllowed(category)`.
- **Kein** Cookie/Skript einer Kategorie lädt, bevor `isAllowed(category) === true`. Loader-Hooks (`loadAnalytics()` etc.) sind **vorbereitet, aber no-op**, bis ein realer Dienst existiert (kein toter/Fake-Pfad; bei Aktivierung eines Diensts wird hier verdrahtet + Subprozessor in `avv-toms.md` ergänzt).

**4b. `ConsentBanner`** (`app/src/components/ConsentBanner.tsx`):
- Erscheint nur, wenn `!hasDecided()`; **gleichwertige** Buttons „Alle akzeptieren" / „Nur notwendige" (TTDSG: Ablehnen so leicht wie Annehmen — gleiche Größe/Gewichtung, keine Dark Patterns) + „Einstellungen" (granular pro Kategorie).
- Verweist auf `#/legal/datenschutz`; Banner blockiert die Seite nicht hart (kein Layout-Shift-Trap), aber lädt nichts Nicht-Essentielles vor Entscheidung.
- Re-Aufruf jederzeit über Footer-Button „Cookie-Einstellungen" (`openConsentSettings`, Aufgabe 2a) → Widerruf/Änderung real möglich (Art. 7 (3) DSGVO).
- Tokens-only, fokussierbar, `role="dialog"` + `aria-label`, Tastatur-bedienbar.

**4c. CSP/Consent-Konsistenz** (`public/_headers`): Da heute `script-src 'self'` und **kein** Drittskript erlaubt ist, ist die Plattform technisch consent-arm. **Regel dokumentieren:** Jeder neue nicht-essentielle Dienst erfordert (a) CSP-Eintrag, (b) Consent-Kategorie + Loader-Gate, (c) Subprozessor in `avv-toms.md` + Datenschutz-Abschnitt — **in dieser Reihenfolge, sonst STOP**. So bleibt CSP, Consent und AVV synchron (keine Schattenwahrheit).

### 5. DSAR-Pfad: Selbstauskunft / Export / Löschung (P1, real & auditiert)

Betroffenenrechte (Art. 15–20 DSGVO) als **funktionierender** Pfad, nicht als Mailto-Sackgasse.

**5a. Edge Function** `app/supabase/functions/data-request/index.ts` (Muster: vorhandene Functions, service role nur hier, Zod-Grenze, CORS, Turnstile bei öffentlichem Einstieg):
- Aktionen: `export` (strukturierter JSON/CSV-Export der eigenen personenbezogenen Daten — `profiles`, eigene `reservations`, bei Erzeuger `farms/products`), `delete` (Löschantrag → Soft-Delete + Aufnahme in Lösch-Queue gemäß Konzept Aufgabe 6).
- **Strikt org-/nutzer-scoped** (RLS + serverseitige Identitätsprüfung): niemand exportiert/löscht fremde Daten (Produktionspfeiler #1; Cross-Org-Negativtest Pflicht).
- **Jede Aktion in `audit_log`** (Akteur, Aktion `data.export`/`data.delete`, Entität, `reason`, Zeitstempel) — unabschaltbar.
- Gesetzliche Aufbewahrung (Stripe-/Steuerbelege) wird **gesperrt statt gelöscht** (kongruent `avv-toms.md § 7 Abs. 3`).

**5b. UI-Einstieg** (Konto-/Einstellungsbereich, falls vorhanden; sonst von der Datenschutz-Ansicht aus): „Meine Daten exportieren" / „Konto/Daten löschen" mit Confirm + Reason (kritische Aktion → Audit), Lade-/Erfolg-/Fehlerzustand. Kein toter Button.

> **Stop-Regel:** Falls Konto-/Auth-UI in dieser Welle noch nicht existiert (WAVE_06 liefert Auth), wird der DSAR-**Backend-Pfad** vollständig gebaut + getestet und der UI-Einstieg an die vorhandene Oberfläche gehängt; fehlt jede authentifizierte Oberfläche → **STOP**, minimal-invasiven Einstiegspunkt vorschlagen, Owner entscheiden (kein Public-Lösch-Endpunkt ohne Identitätsprüfung).

### 6. Speicherfristen- & Löschkonzept (P1)

`docs/COMPLIANCE_MODEL.md` (neu) — prüfbares Artefakt, das die UI-/AVV-Aussagen mit der DB-Realität verzahnt:
- **Verantwortlichkeitsmatrix** je Datenkategorie (Verantwortlicher vs. Auftragsverarbeiter — kongruent `avv-toms.md`).
- **Speicherfristen & Löschregeln** je Tabelle: z. B. `reservations` nach Abholung + X Tage; `waitlist` bis Launch/Widerruf; `audit_log` revisionssicher (längere Frist); zahlungs-/buchhaltungsrelevante Belege gem. **§ 147 AO / § 257 HGB** (i. d. R. 6–10 Jahre) → **Sperren statt Löschen**.
- **Löschmechanik:** Soft-Delete (`deleted_at`, bereits im Schema) → Hard-Delete-Job nach Frist (als Konzept + späterer Edge-Cron, hier dokumentiert, nicht spekulativ scharf geschaltet).
- Verweis auf TOMs (`avv-toms.md Anlage 1`) und Rechtsgrundlagen (`datenschutz.md`).

> **Keine Migration in dieser Welle nötig**, wenn `deleted_at` + `audit_log` bereits existieren (geprüft: ja, `0001_core.sql`). Falls eine Aufbewahrungs-/Sperr-Spalte fehlt → als **additive** Migration `0008_retention.sql` mit Rollback (nur mit Owner-Freigabe ausrollen); zuerst prüfen, nicht annehmen.

### 7. Subprozessor-/Consent-Synchronität bei optionalen Diensten (P2)

Falls in WAVE_13 (Observability/Sentry), Phase 4 Track B (Karten-/Geocoding-Anbieter) oder ein E-Mail-Provider aktiviert wurde:
- `avv-toms.md Anlage 2` (Geplant→Aktiv) nachziehen, `datenschutz.md`-Empfängerliste ergänzen, Consent-Kategorie + CSP-Eintrag setzen (Reihenfolge aus Aufgabe 4c).
- Sentry: `sendDefaultPii=false`, PII-Scrubbing verpflichtend dokumentieren.

### 8. Konsistenz- & Vollständigkeits-Check + Tracker (P1)

- **Konsistenzlauf:** Vermittler-Aussage in `App.tsx` ↔ `FoodInfoNotice` ↔ `agb.md` ↔ `datenschutz.md` ↔ `avv-toms.md` widerspruchsfrei (kein „Verkauf" vs. „Vermittlung"-Konflikt; keine SLA-/Garantie-Claims ohne Deckung).
- **Link-Integritätslauf:** kein toter Legal-Link, kein 404, jeder Footer-Eintrag + jeder Querverweis auflösbar.
- `docs/COMPLIANCE_MODEL.md` erstellt; `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` (Abschnitt 2 · `docs/launch/B_rechtstexte/*` und 7 · Wellen) nach Abschluss aktualisieren.
- Muster „DSGVO-Legal-Pack (Impressum/Datenschutz/AGB/AVV + Consent-Gate + DSAR-Edge-Function) für Vermittler-Plattform" → `.claude/memory/patterns/` als **Imperium-Beschleuniger** (gilt für alle 14 Tochterplattformen — nur Domänen-Texte tauschen).

---

## Konkrete Befehle (Reihenfolge)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Rechtstexte-Verzeichnis prüfen (avv-toms.md existiert bereits)
ls docs/launch/B_rechtstexte/
#   → impressum.md / datenschutz.md / agb.md neu anlegen, avv-toms.md bleibt

# 2) Frontend: Komponenten/Views anlegen, dann Typecheck (strict) + Build
#    NEU: src/lib/consent.ts, src/components/ConsentBanner.tsx, src/components/FoodInfoNotice.tsx,
#         src/components/LegalLayout.tsx, src/pages/LegalPage.tsx ; EDIT: src/App.tsx, src/pages/FinderPage.tsx,
#         src/components/FarmDrawer.tsx, src/styles/theme.css
npm run typecheck          # tsc --noEmit — strict, alle neuen Pfade typsicher
npm run build              # tsc --noEmit && vite build — Legal-Markdown (?raw) muss mitbündeln

# 3) DSAR Edge Function lokal prüfen (Muster der vorhandenen Functions)
supabase functions serve data-request --no-verify-jwt=false
# Smoke (eingeloggter Nutzer): Export liefert NUR eigene Daten; Delete schreibt audit_log + Soft-Delete

# 4) Lokale DB (für DSAR-/Audit-/Isolations-Checks), falls Migration nötig wurde
supabase start
supabase db reset                       # spielt 0001..(0008 nur falls retention-Migration ergänzt) ein
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed.sql

# 5) Cross-Org-Negativtest DSAR (Pflicht): fremde Org/Nutzer = 403/0 Zeilen, nie 200 mit Fremddaten
node supabase/tests/run-isolation.mjs   # bzw. der etablierte QA-Runner (WAVE_12)

# 6) Legal-Gate (blockierend) — Vollständigkeit, Links, Consent, Konsistenz
chmod +x scripts/legal-gate.sh
bash scripts/legal-gate.sh              # erwartet: LEGAL-GATE: PASS

# 7) Manuelle Verifikation (Verdrahtung):
#    - Footer-Links → Legal-Ansicht öffnet (Deep-Link #/legal/impressum etc.)
#    - Consent-Banner erscheint beim Erststart; "Nur notwendige" gleichwertig sichtbar;
#      Footer "Cookie-Einstellungen" ruft Banner erneut auf (Widerruf real)
#    - FoodInfoNotice sichtbar in Finder + FarmDrawer
#    - Browser-Konsole: kein nicht-essentielles Skript/Cookie vor Einwilligung; keine TypeError/CSP-Violations

# 8) Live-Schaltung — NUR mit Owner-Freigabe + anwaltlicher Endprüfung
# git add ... && git commit   # erst nach Owner-OK; Co-Author-Zeile anhängen
```

> **`scripts/legal-gate.sh`** (neu, blockierend): prüft Existenz aller Pflichttexte (`impressum.md`, `datenschutz.md`, `agb.md`, `avv-toms.md`), dass jeder Footer-Legal-Slug einen Renderer/Datei-Match hat, dass `ConsentBanner`/`consent.ts` referenziert sind, dass kein `dangerouslySetInnerHTML` ohne Sanitizer eingesetzt wird, und dass keine offenen `[[OWNER: …]]`-Platzhalter mehr in als „final" markierten Texten stehen (Warnung, nicht Fail, solange Texte als ENTWURF gekennzeichnet sind). Failt hart bei fehlendem Pflichttext oder totem Legal-Link.

> **`npm run lint` / `npm run ci`:** sind in `package.json` aktuell **nicht** definiert (nur `dev`/`build`/`preview`/`typecheck`). Diese Welle nutzt `npm run typecheck` + `npm run build` als verbindliche Verifikation. Wird in WAVE_01 (Hygiene/CI) ein `lint`/`ci`-Skript ergänzt, dann zusätzlich fahren — **nicht** hier eigenmächtig ein Lint-Setup erzwingen (kein verdeckter Toolchain-Wechsel).

---

## Acceptance (Akzeptanzkriterien)

- [ ] **Pflichttexte vorhanden & gekennzeichnet:** `impressum.md`, `datenschutz.md`, `agb.md` existieren unter `docs/launch/B_rechtstexte/`, jeweils mit „ENTWURF — rechtlich zu prüfen"-Kopf + Stand-Datum + `[[OWNER]]`-Platzhaltern; `avv-toms.md` konsistent verknüpft (nicht dupliziert).
- [ ] **Footer-Legal-Navigation real:** Impressum/Datenschutz/AGB/AVV + „Cookie-Einstellungen" von **jeder** Ansicht erreichbar; jeder Link öffnet die korrekte Legal-Ansicht (Deep-Link funktioniert), kein 404, kein toter Link.
- [ ] **Legal-Ansichten end-to-end:** `LegalPage` rendert die Markdown-Quelle (Build-Zeit-Import, sanitisiert), Zero-State bei unbekanntem Slug, Stand-/ENTWURF-Badge sichtbar.
- [ ] **Lebensmittel-Hinweis am Produktort:** `FoodInfoNotice` sichtbar in `FinderPage` **und** `FarmDrawer`; Aussage deckungsgleich mit Footer-Disclaimer + AGB (kein Widerspruch Vermittlung/Verkauf).
- [ ] **Consent DSGVO/TTDSG-konform:** Banner beim Erststart; „Nur notwendige" **gleichwertig** zu „Alle akzeptieren" (keine Dark Patterns); granulare Einstellungen; Entscheidung versioniert persistiert; **Widerruf** über Footer real auslösbar; **kein** nicht-essentielles Skript/Cookie vor Einwilligung (Konsole/Network belegt).
- [ ] **CSP/Consent/AVV synchron:** `public/_headers`-CSP erlaubt kein ungelistetes Drittskript; dokumentierte Reihenfolge (CSP→Consent→Subprozessor) vorhanden; aktueller Stand ehrlich „nur essenzielle Cookies".
- [ ] **DSAR funktioniert:** Edge Function `data-request` liefert **nur** eigene Daten (Export), führt Soft-Delete/Sperre korrekt aus, schreibt `audit_log`; **Cross-Org-Negativtest grün** (fremde Daten = 403/0 Zeilen, nie 200 mit Fremddaten).
- [ ] **Compliance-Modell dokumentiert:** `docs/COMPLIANCE_MODEL.md` mit Verantwortlichkeitsmatrix, Speicherfristen, Löschkonzept (inkl. § 147 AO / § 257 HGB-Sperrfrist), verzahnt mit AVV/TOMs.
- [ ] **Konsistenz & Wahrheit:** Keine SLA-/Garantie-/„100 % sicher"-Claims ohne operative Deckung; Texte spiegeln reale RLS/Tenant-Isolation und EU-Stack; keine Demo-/Fake-Inhalte.
- [ ] **Build grün:** `npm run typecheck` + `npm run build` ohne Fehler; Konsole sauber (keine `TypeError`/CSP-Violation/401-Schleife); `bash scripts/legal-gate.sh` → `PASS`, Negativtest (Pflichttext entfernt) → `FAIL` (Exit 1).
- [ ] **Tokens-only:** Consent-Banner + Legal-Seiten + `FoodInfoNotice` nutzen ausschließlich `theme.css`-Tokens, keine neuen Farben/Fonts, keine Deko-Emojis.
- [ ] Tracker aktualisiert: `docs/releases/PHASE_STATUS.md`, `MASTER_INDEX.md` (Abschnitt 2 + 7); Muster in `.claude/memory/patterns/`.

---

## Gate (blockierend)

> **WAVE_14-Legal-Gate** muss grün sein, bevor die Plattform Phase-2-Gate **D (Legal)** passiert und für die Cloudflare-Live-Schaltung freigegeben wird. Es ist Pflichtbestandteil des **Go-Live-Gate Phase 1**.

```
GATE WAVE_14:
  ✅ Pflichttexte vorhanden: impressum.md, datenschutz.md, agb.md, avv-toms.md (alle als ENTWURF + Stand-Datum)
  ✅ Footer-Legal-Navigation real, alle Links auflösbar (Legal-Gate Link-Integrität: kein toter Link)
  ✅ Lebensmittel-Hinweis am Produktort (FinderPage + FarmDrawer), aussagekonsistent
  ✅ Consent: Erststart-Banner, "Nur notwendige" gleichwertig, granular, versioniert, widerrufbar
  ✅ Kein nicht-essentielles Skript/Cookie vor Einwilligung (Network/Konsole belegt) ; CSP/Consent/AVV synchron
  ✅ DSAR-Edge-Function: nur eigene Daten, audit_log geschrieben, Cross-Org-Negativtest grün
  ✅ docs/COMPLIANCE_MODEL.md vorhanden (Fristen, Löschkonzept, Verantwortlichkeitsmatrix)
  ✅ Keine Garantie-/SLA-Claims ohne Deckung ; Texte ↔ reale RLS/Stack konsistent
  ✅ npm run typecheck + npm run build grün ; scripts/legal-gate.sh PASS (Negativtest FAIL/Exit1)
  ⚠️ Owner-Voraussetzung für Live: [[OWNER]]-Platzhalter befüllt + ANWALTLICHE ENDPRÜFUNG erfolgt
```

**Stop-Regeln in dieser Welle:**
- Eine SLA-/Verfügbarkeits-/„100 % sicher"-Aussage soll in UI oder Rechtstext, ohne dass Monitoring/Incident-Prozess/Betrieb sie real decken → **STOP**, ehrlich kommunizieren oder weglassen (Kanon „keine Schattenwahrheiten").
- Datenschutztext widerspricht der realen Tenant-Isolation/Datenarchitektur (RLS, Tabellen, EU-Stack) → **STOP**, mit der DB-Wahrheit abgleichen, nicht den Text „schönschreiben".
- Ein Subprozessor-Datenfluss (neuer Dienst, neues Drittskript) ist nicht dokumentiert/consent-gegated → **STOP**, erst CSP→Consent→AVV synchronisieren, dann aktivieren.
- Public-Lösch-/Export-Endpunkt ohne serverseitige Identitäts-/Org-Prüfung → **STOP** (Produktionspfeiler #1; kein Fremddaten-Abfluss).
- Verbindliche `[[OWNER]]`-Rechtsangaben (Firma, Vertretung, Register) sind unklar → **STOP**, Owner-Eingabe einholen statt raten (kein erfundenes Impressum).
- Jeder `git commit`/`push` sowie das „final"-Markieren eines Rechtstexts ohne anwaltliche Prüfung → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## Abschlussbericht (Vorlage — nach Ausführung füllen)

```
## Welle abgeschlossen: WAVE_14 — Legal & Datenschutz (Impressum/Datenschutz/AGB/AVV, Lebensmittel-Hinweis, Cookie/Consent)
- Geändert:
  - docs/launch/B_rechtstexte/impressum.md, datenschutz.md, agb.md (NEU) ; avv-toms.md (konsistent verknüpft)
  - app/src/App.tsx (Footer-Legal-Navigation + View-Switch #/legal/*)
  - app/src/pages/LegalPage.tsx + app/src/components/LegalLayout.tsx (NEU, Markdown-Render sanitisiert)
  - app/src/components/FoodInfoNotice.tsx (NEU) ; eingebunden in FinderPage.tsx + FarmDrawer.tsx
  - app/src/lib/consent.ts + app/src/components/ConsentBanner.tsx (NEU, granular/widerrufbar)
  - app/src/styles/theme.css (.app-foot__legal, .legal, .food-note, Consent-Banner — Tokens-only)
  - app/supabase/functions/data-request/index.ts (NEU, DSAR Export/Delete, audit-pflichtig)
  - docs/COMPLIANCE_MODEL.md (NEU) ; app/scripts/legal-gate.sh (NEU, blockierend)
  - (ggf.) app/supabase/migrations/0008_retention.sql (NUR falls Sperr-/Aufbewahrungsspalte fehlte; additiv + Rollback)
- Tests:
  - npm run typecheck + npm run build → grün ; Konsole/Network sauber (kein Skript/Cookie vor Consent)
  - bash scripts/legal-gate.sh → PASS ; Negativtest (Pflichttext entfernt) → FAIL (Exit 1)
  - DSAR Cross-Org-Negativtest → grün (fremde Daten = 403/0 Zeilen) ; audit_log-Eintrag belegt
  - Manuell: Footer-Links/Deep-Links, Consent „Nur notwendige" gleichwertig, Widerruf, FoodInfoNotice sichtbar
- Risiken: Rechtstexte sind ENTWURF — ANWALTLICHE ENDPRÜFUNG + [[OWNER]]-Befüllung vor Live ausstehend (Owner).
- Nächste Welle: WAVE_15 (Demo/Onboarding — Erzeuger-Onboarding-Wizard, Demo-Daten gekennzeichnet) → dann Phase-2 Gate D (Legal) grün setzen.
```

---

## Übergang

→ Erst wenn das **WAVE_14-Legal-Gate grün** ist (technisch vollständig) **und** die Owner-Voraussetzung (`[[OWNER]]`-Befüllung + anwaltliche Endprüfung) erfüllt ist, ist **Phase-2-Gate D (Legal)** passierbar und die Cloudflare-Live-Schaltung legal freigegeben. Danach WAVE_15 (Demo/Onboarding) fortführen.

> **Tracker-Pflicht nach Abschluss:** `docs/releases/PHASE_STATUS.md` Zeile „WAVE_14 Legal/DSGVO" auf den realen Stand setzen; `MASTER_INDEX.md` Abschnitt 2 (`docs/launch/B_rechtstexte/{impressum,datenschutz,agb,avv-toms}.md`, `docs/COMPLIANCE_MODEL.md`) und Abschnitt 7 (`finalization/WAVE_14`) auf ✅. Wiederverwendbares Muster „DSGVO-Legal-Pack + Consent-Gate + DSAR-Edge-Function für Vermittler-Plattform" nach `.claude/memory/patterns/` verdichten — Imperium-Beschleuniger für alle 14 Tochterplattformen (nur Domänen-Texte tauschen, Mechanik bleibt).
