# Go-Live-Anleitung — Supabase · Stripe · Mail · Cloudflare

> Schritt-für-Schritt zum Live-Betrieb von LokaleBauernConnect. Für Nicht-Entwickler geschrieben.
> **Reihenfolge einhalten** (1 → 4). Geschätzte Zeit: 60–90 Min. Laufende Kosten anfangs ~0–25 €/Monat.
> 🔒 Alle Keys sind Geheimnisse: in `.env`-Dateien (gitignored) bzw. Supabase-Secrets — nie in Code/Chat-Öffentlichkeit teilen außer mit mir zum Einrichten.
> **Was du mir am Ende schickst**, steht ganz unten in „§5 An mich".

---

## 1 · Supabase (Datenbank + Auth) — schaltet Daten/Login/RLS scharf

1. Auf **supabase.com** → „Start your project" → mit GitHub/E-Mail anmelden.
2. **New project**: Name `lokalebauernconnect`, **Region: Central EU (Frankfurt)** (wichtig: EU!), starkes DB-Passwort vergeben (notieren).
3. Warten bis das Projekt bereit ist (~2 Min).
4. **Schema + Daten einspielen:** links **SQL Editor** → „New query" → den **kompletten Inhalt** von `app/supabase/setup_all.sql` einfügen → **Run**. Erwartung: „Success" (16 Tabellen, RLS-Policies, 9 Demo-Höfe).
5. **Schlüssel holen:** links **Project Settings → API**. Notiere:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **anon public** key (langer `eyJ…`)
   - **service_role** key (geheim! nur für Edge Functions, NIE ins Frontend)
6. *(Mail-Bestätigung für Login)* **Authentication → Providers → Email**: „Confirm email" aktiviert lassen; Absender konfigurieren wir über den eigenen Mail-Provider (§3) oder zunächst Supabase-Default.

➡️ **An mich:** Project URL + anon key (für `app/.env`). service_role nur für §4 nötig.

---

## 2 · Stripe (Zahlungen) — das ist der eigentliche Umsatz

1. Auf **stripe.com** registrieren, Firmendaten hinterlegen (für echte Auszahlungen nötig; Test-Modus geht sofort).
2. **Zahlarten aktivieren:** Dashboard → **Settings → Payment methods** → einschalten: **Karte, SEPA-Lastschrift, PayPal, Klarna, Apple/Google Pay** (Giropay optional). Diese erscheinen dann automatisch im Checkout.
3. **Abo-Produkte anlegen** (für Erzeuger-Abos) → **Product catalog → Add product**, je ein Produkt **BASIS / PLUS / PRO** mit monatlichem Preis (deine Wahl) → von jedem die **Price-ID** (`price_…`) notieren.
4. **API-Key holen:** Developers → **API keys** → **Secret key** (`sk_test_…` bzw. `sk_live_…`).
5. **Webhook anlegen:** Developers → **Webhooks → Add endpoint**:
   - Endpoint-URL: `https://<DEIN-SUPABASE-REF>.functions.supabase.co/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Speichern → **Signing secret** (`whsec_…`) notieren.
6. *(SB-Bezahlung an Höfe auszahlen — später)* Für direkte Auszahlung an Erzeuger: **Stripe Connect** aktivieren (Express-Accounts). Für den Start reicht Standard-Checkout.

➡️ **An mich:** Secret key, Webhook signing secret, die 3 Price-IDs.

---

## 3 · Mail (Resend empfohlen) — Quittungen & Bestätigungen

**Resend** (am einfachsten):
1. **resend.com** registrieren.
2. **Domains → Add Domain**: deine Absenderdomain (z. B. `lokalebauernconnect.de`) → die angezeigten **DNS-Einträge (SPF, DKIM, DMARC)** bei deinem Domain-Anbieter eintragen → „Verify".
3. **API Keys → Create** → Key (`re_…`) notieren. Absender z. B. `LokaleBauernConnect <noreply@lokalebauernconnect.de>`.

*(Alternative SendGrid: Account → Sender Authentication (Domain) → Settings → API Keys → Full Access. Gleiches Prinzip.)*

➡️ **An mich:** Provider (resend/sendgrid), API-Key, Absender-Adresse.

---

## 4 · Cloudflare Pages (Hosting) — die Plattform online stellen

**Empfohlen: über Git** (automatische Deploys). Alternativ Direkt-Upload.

**Variante A — Git (empfohlen):**
1. Repo zu GitHub pushen (sag mir Bescheid, ich bereite Commit/Branch vor — Push macht den Live-Build, daher mit Ansage).
2. **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git** → Repo wählen.
3. **Build-Einstellungen (für die App):**
   - Framework preset: **Vite**
   - **Build command:** `npm --prefix app install && npm --prefix app run build`
   - **Build output directory:** `app/dist`
   - **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (aus §1)
4. **Marketing-Landing** (`web/`): als zweites Pages-Projekt (Output `web`, kein Build) **oder** unter einer Subdomain. Sag mir, wie du die Domains aufteilen willst (z. B. `lokalebauernconnect.de` = Landing, `app.lokalebauernconnect.de` = App).
5. **Domain** verbinden (Custom domain) → DNS folgt der Cloudflare-Anleitung. Security-Header liefern wir über `_headers` (liegt bereit) automatisch.

**Variante B — ohne Git (Direkt-Upload):** Pages → „Upload assets" → den Ordner `app/dist` (nach `npm run build`) hochladen. Schneller Start, aber kein Auto-Deploy.

**Supabase Edge Functions deployen** (für Stripe/Mail — einmalig, braucht die Supabase-CLI):
```bash
npm i -g supabase
supabase login
supabase link --project-ref <DEIN-REF>
# Function-Secrets setzen (aus app/supabase/functions/.env.example befüllt):
supabase secrets set --env-file app/supabase/functions/.env
supabase functions deploy create-checkout stripe-webhook
```
*(Wenn dir die CLI zu technisch ist: gib mir den service_role-Key + Project-Ref + einen Supabase Access-Token, dann mache ich §4-Functions für dich.)*

---

## 5 · An mich (damit ich End-to-End scharf schalte + verifiziere)
Sammle und schick mir:
- **Supabase:** Project URL · anon key · (für Functions: Project-Ref · service_role key **oder** Access-Token)
- **Stripe:** Secret key · Webhook signing secret · Price-IDs (BASIS/PLUS/PRO)
- **Mail:** Provider · API-Key · Absender
- **Cloudflare:** Variante A (Git, dann OK zum Push) **oder** API-Token (Pages:Edit) + Account-ID
- **Domains:** wie aufteilen (Landing vs. App)
- **Firmendaten** für die Rechtstexte (`[[OWNER:…]]` in `docs/launch/B_rechtstexte/*`): Firmenname/Rechtsform, Anschrift, Vertretung, Kontakt, USt-IdNr.

Danach: ich trage alles ein, deploye die Functions, fahre **Isolationstest + echten Testkauf + Smoke** und melde „live & verifiziert".

> **Owner-Hinweis (AGENTS.md):** Deploy/Go-Live ist außenwirksam & kostenrelevant — ich kündige jeden Live-Schritt vorher an und führe ihn erst auf dein OK aus.
