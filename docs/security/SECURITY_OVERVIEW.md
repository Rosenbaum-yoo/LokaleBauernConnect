# LokaleBauernConnect — Security Overview

> Technische Security-Übersicht für Enterprise Due Diligence und interne Qualitätssicherung.
> Stack: **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Phase 1 · WAVE_06 (Security) · Stand: 2026-06-19
> Verbindlicher Kanon: `CLAUDE.md`, `AGENTS.md`, `PHASEN.md`. Vertiefend: `docs/security/TENANT_ISOLATION_MODEL.md`, `docs/security/IDENTITY_MODEL.md`, `docs/security/SECRET_ROTATION.md`, `docs/COMPLIANCE_MODEL.md`.

---

## 0. Leitprinzip & Vermittler-Rolle

**RLS ist die Autorität.** Zugriffskontrolle lebt in der Datenbank (PostgreSQL Row-Level Security, deny-by-default), nicht im Client. Das Frontend spiegelt Rechte nur visuell — es ist niemals eine Sicherheitsgrenze. Jede Annahme „der Button ist im UI ausgeblendet" wird durch eine serverseitige RLS-/Edge-Prüfung gedeckt, sonst gilt sie als nicht existent.

**Vermittler-Modell.** LokaleBauernConnect vermittelt zwischen Käufern und Erzeugern; die Plattform verkauft nicht selbst und berät nicht. Sicherheitsrelevant heißt das: Die Plattform ist bei der **SB-Bezahlung** Zahlungsanbindung/Vermittler — Geldflüsse laufen über **Stripe Connect** an den Erzeuger (Direct/Destination Charge), nie über ein plattformeigenes Verwahrkonto im Eigenverkauf. Disclaimer durchgängig sichtbar (siehe `docs/COMPLIANCE_MODEL.md`).

**Drei getrennte Welten.** Käufer, Erzeuger und Staff sind über Auth-Session, Rolle und RLS strikt getrennt. Fremde Org = `403`/leere Zeilenmenge, niemals `200` mit Fremddaten (Produktionspfeiler 1).

---

## Verteidigungsschichten (Defense in Depth)

```
Internet / Browser
  ↓ [1] Cloudflare Edge: TLS 1.2+/1.3, DNS, CDN
  ↓ [2] Cloudflare WAF + DDoS-Schutz (Managed Rules, Bot-Mitigation)
  ↓ [3] Cloudflare Turnstile (Captcha-Ersatz auf öffentlichen Formularen)
  ↓ [4] Cloudflare Rate Limiting (IP-/Pfad-basiert, am Edge)
  ↓ [5] Security-Header / CSP (Cloudflare Pages _headers + Worker)
  ↓ [6] Supabase Auth (JWT, kurzlebig, Refresh rotierend)
  ↓ [7] Edge Function (Deno): Zod-Validierung an der Grenze + Turnstile-Verify + Rechteprüfung
  ↓ [8] Rollen-/Org-Kontext (auth.uid(), org_id, Käufer/Erzeuger/Staff)
  ↓ [9] PostgreSQL RLS (Row-Level Security, deny-by-default) — die Autorität
  ↓ [10] Audit-Log (jede mutierende Aktion: wer/was/warum)
```

Grundsatz: Mehrere Schichten dürfen ausfallen, ohne dass die Daten preisgegeben werden. Schicht [9] (RLS) ist die letzte und entscheidende Verteidigungslinie und wird unabhängig getestet (`docs/security/TENANT_ISOLATION_MODEL.md`).

---

## 1. Transport Security

| Maßnahme | Status | Umsetzung |
|---|---|---|
| HTTPS / TLS überall | Soll: aktiv ab Deploy | Cloudflare terminiert TLS am Edge; Pages/Workers nur über HTTPS erreichbar |
| TLS 1.2+ / 1.3 | Soll | Cloudflare Edge-Default; ältere Protokolle deaktiviert |
| HSTS | Soll | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (Pages `_headers`) |
| Zertifikat | Soll | Cloudflare Universal SSL (Auto-Renewal), kein manuelles Cert-Handling |
| HTTP→HTTPS Redirect | Soll | „Always Use HTTPS" (Cloudflare) |
| Supabase-Verbindung | aktiv | `VITE_SUPABASE_URL` ausschließlich `https://` (Client erzwingt TLS) |

Status „Soll" = vom Owner freizugebender Deploy (Account/Domain/Kosten); Konfiguration als Code in `app/public/_headers` bzw. Worker, vor Go-Live aktiv.

---

## 2. HTTP Security Headers / CSP (Cloudflare)

Ausgeliefert über Cloudflare Pages `_headers` (statisch) und ergänzend über einen Worker für dynamische Antworten. Edge-Funktions-Antworten setzen dieselben Header explizit.

| Header | Wert | Zweck |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests` | XSS-/Injection-Eindämmung, Clickjacking-Schutz |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Erzwingt HTTPS |
| `X-Content-Type-Options` | `nosniff` | Kein MIME-Sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking (Redundanz zu `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Kein Referrer-Leak |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self), payment=(self), usb=()` | `geolocation` für „in der Nähe"; `payment` für Stripe-SB-Flow; Rest gesperrt |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolation gegen Cross-Window-Angriffe |
| `Cross-Origin-Resource-Policy` | `same-origin` | Ressourcen nicht cross-origin einbettbar |

**CSP-Hinweise:**
- `style-src 'unsafe-inline'` ist die einzige Lockerung (Vite-/Editorial-Tokens). Inline-**Scripts** sind verboten — `script-src 'self'`, keine `unsafe-inline`/`unsafe-eval`. Ziel-Ausbaustufe: nonce-/hash-basierte Styles, sobald der Build dies ohne Mehrkosten erlaubt.
- `connect-src` erlaubt ausschließlich Supabase und Stripe; `frame-src` nur Stripe.js und Turnstile.
- `frame-ancestors 'none'` schützt die SB-Bezahlseite (QR-Flow) vor UI-Redressing.

---

## 3. Cloudflare WAF, Bot-Schutz & Turnstile

| Mechanismus | Konfiguration |
|---|---|
| WAF Managed Rules | OWASP Core Ruleset aktiviert (Cloudflare Managed + OWASP-Set) |
| DDoS-Schutz | Cloudflare L3/L4 + L7 (automatisch) |
| Bot Fight Mode | aktiv für öffentliche Pfade (Finder, Reservierung, SB-Bezahlung) |
| **Turnstile** | Pflicht auf allen **öffentlichen, schreibenden** Formularen: Reservierung, Erzeuger-Onboarding/Kontakt, Waitlist. Token wird **serverseitig in der Edge Function gegen `https://challenges.cloudflare.com/turnstile/v0/siteverify`** geprüft (Secret nur in Edge-Env). Kein Vertrauen in clientseitige Verifikation. |
| Site-Key / Secret-Key | Site-Key public (`VITE_TURNSTILE_SITE_KEY`), Secret-Key ausschließlich Edge-Function-Env (`TURNSTILE_SECRET_KEY`) |

Ablauf (verbindlich): Client rendert Widget → Token → Edge Function `siteverify` → bei Misserfolg `403` ohne DB-Schreibzugriff. Turnstile ersetzt kein RLS — es reduziert Spam/Automatisierung vor der Validierung.

---

## 4. Rate Limiting

Mehrstufig: am Edge (Cloudflare) als erste Linie, in Edge Functions als fachliche Linie (z. B. pro `auth.uid()`/IP über einen kurzlebigen Zähler).

| Limiter | Ebene | Fenster | Max | Zweck |
|---|---|---|---|---|
| Auth (Login/Signup/Magic-Link/Reset) | Cloudflare + Supabase Auth | 15 Min | 5–10 / IP | Credential-Stuffing, Brute-Force |
| Öffentliche Schreib-Endpunkte (Reservierung, Onboarding) | Cloudflare Rule + Edge | 10 Min | 30 / IP | Spam, Massen-Inserts |
| SB-Bezahl-Intent-Erzeugung | Edge Function | 1 Min | 10 / IP+Stand | Missbrauch / Kosten-Schutz Stripe |
| Lese-API (Finder/Verfügbarkeit) | Cloudflare | 1 Min | 120 / IP | Scraping-Bremse (Daten bleiben öffentlich lesbar) |
| Stripe-Webhook | Edge Function | n/a | Idempotenz statt Limit | siehe §8 |

**Store:** Cloudflare-nativ am Edge (verteilt). In Edge Functions: kurzlebiger Zähler (Supabase-Tabelle mit TTL bzw. KV), kein In-Memory-Single-Instance-Zustand (serverless). Bei `429` liefert die UI eine klare, nicht-leakende Meldung („Zu viele Versuche, bitte später erneut").

---

## 5. Authentifizierung & Sessions (Supabase Auth)

| Aspekt | Konfiguration |
|---|---|
| Identity-Provider | Supabase Auth (GoTrue), EU-Region |
| Methoden | E-Mail + Passwort, Magic-Link/OTP; OAuth (optional, Owner-Entscheidung) |
| Token | Kurzlebiges Access-JWT (Standard 1 h) + rotierendes Refresh-Token |
| Refresh-Token-Rotation | aktiv (Reuse-Detection erkennt gestohlene Tokens) |
| Token-Speicher | Supabase-JS verwaltet Session; `connect-src` auf Supabase begrenzt; kein Token in URL |
| Passwort-Policy | Mindestlänge + Leak-Check (Supabase „Leaked Password Protection" via HaveIBeenPwned) |
| MFA | TOTP (Supabase MFA/AAL2). **Pflicht für Staff** und für Erzeuger mit Auszahlungs-/SB-Rechten; Käufer optional. Detail: `docs/security/IDENTITY_MODEL.md` |
| E-Mail-Bestätigung | Pflicht vor erstem privilegierten Zugriff |
| Welten-Trennung | Rolle in `profiles.role` (Enum `user_role`: `kaeufer`/`erzeuger`/`staff`/`owner`); RLS unterscheidet anhand `auth.uid()` + Rolle; getrennte Oberflächen/Routen |
| Service-Role-Key | **niemals im Frontend** — nur in Edge-Function-Env (siehe §9) |

Der aktuelle App-Stand (`app/src/lib/supabase.ts`) erzeugt den Client ausschließlich mit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (public, RLS-gebunden). Solange nicht konfiguriert, läuft die App im Seed-Modus ohne Backend — es werden keine echten personenbezogenen Daten verarbeitet (ADR 0002).

---

## 6. Autorisierung: RLS als Autorität + RBAC

**Datenbank-Schicht (führend).** Jede Tabelle: `org_id`/Tenant-Bezug, `created_at`/`updated_at`, `deleted_at`, **RLS deny-by-default ab Migration #1** (`app/supabase/migrations/`). Policies sind die einzige Quelle der Wahrheit für Zugriff.

Policy-Muster (kanonisch aus `app/supabase/migrations/0001_core.sql` + `0003_marketplace.sql`):
```sql
-- deny-by-default: RLS an, ohne Policy = kein Zugriff
alter table reservations enable row level security;

-- Käufer (auch anonym) darf Reservierung anlegen, sofern Hof+Org real & aktiv sind
create policy reservations_insert on reservations
  for insert to anon, authenticated
  with check (
    exists (select 1 from farms f
      where f.id = reservations.farm_id
        and f.org_id = reservations.org_id
        and f.deleted_at is null)
  );

-- Erzeuger liest Reservierungen seiner eigenen Org (Multi-Org via is_org_member)
create policy reservations_owner_read on reservations
  for select to authenticated
  using (is_org_member(org_id));
```
Hinweis: `is_org_member(org_id)` ist eine `security definer`-Funktion, die ausschließlich `auth.uid()` gegen `org_members`/`profiles` prüft (Multi-Org). `reservations` hat **kein** `buyer_id`; Reservierungen sind org-gebunden (`org_id`), nicht käuferspezifisch lesbar. Der Profil-Primärschlüssel ist `profiles.user_id` (nicht `id`).

**Anwendungs-/Edge-Schicht (spiegelnd + validierend).** Edge Functions prüfen vor jeder privilegierten Mutation: gültiges JWT → Rolle → Org-Zugehörigkeit → Zod-Schema. Verstoß = `403`, niemals stiller `null`-Return ohne Statuscode (verboten lt. `CLAUDE.md`).

**RBAC-Rollen** (Enum `user_role`): `kaeufer` (Reservieren, eigene Daten), `erzeuger` (Höfe/Produkte/Verfügbarkeit/Abholfenster selbst pflegen, eigene Reservierungen/Einnahmen, SB-Stände verwalten), `staff` (Hof-Verifizierung inkl. `farm_applications`-Moderation, Eskalation, Support — über Kern-Center), `owner` (volle Plattform-Hoheit, erbt Staff-Rechte). Plan-Locks (`demo/basis/plus/pro/individuell`) werden **serverseitig** als Entitlement geprüft (Stripe = Wahrheit), das UI zeigt den konkreten Upgrade-Pfad.

Vollständiges Isolationsmodell + Cross-Org-Negativtests: `docs/security/TENANT_ISOLATION_MODEL.md`.

---

## 7. Eingabevalidierung: Zod an allen Grenzen

- **Edge Functions (Deno):** Jede Request-Payload wird mit **Zod** geparst, bevor irgendeine DB-Operation erfolgt. Ungültig = `400` mit nicht-leakender Fehlermeldung. Das gilt für Reservierung, Verfügbarkeits-Pflege, Onboarding, SB-Bezahl-Intent.
- **Frontend (TS strict):** Formulare nutzen dieselben Zod-Schemata (Single Source) für UX-Validierung. Frontend-Validierung ist Komfort, nicht Sicherheit — die Edge-Function-Validierung ist verbindlich.
- **Datengetriebene Formulare:** Schema + Zod erzeugen Wizard-Felder; keine ungeprüften Freitext-Pfade in DB.
- **Typsicherheit:** `tsconfig` strict; Domain-Typen in `app/src/lib/types.ts` halten Shapes konsistent zwischen UI, Datenschicht und (künftig) Edge.
- **Ausgabe-Escaping:** React escaped Text per Default; `dangerouslySetInnerHTML` ist verboten. User-Werte (Hof-Story, Namen, Kontakt) werden nie unescaped gerendert (`CLAUDE.md` Frontend-Regeln).

---

## 8. Zahlungssicherheit (Stripe + Connect, SB-USP)

| Aspekt | Regel |
|---|---|
| Schlüssel | Publishable Key public (`VITE_STRIPE_PUBLISHABLE_KEY`); **Secret Key nur Edge-Function-Env** (`STRIPE_SECRET_KEY`) |
| Kartendaten | **Kein PAN/CVC berührt unsere Systeme** — Stripe Elements/Checkout; PCI-DSS-Scope minimiert (SAQ-A) |
| Zahlungsfluss SB-Stand | QR am Stand → Edge Function erzeugt **PaymentIntent** (Betrag serverseitig bestimmt, nie clientseitig vertraut) → Bestätigung via Stripe → Quittung |
| Connect | Geld fließt per **Connect** an den Erzeuger (Destination/Direct Charge); Plattform = Vermittler, optionale Transaktionsgebühr serverseitig berechnet |
| Webhook | **EIN** signaturgeprüfter (`Stripe-Signature`), **idempotenter** Edge-Function-Handler ist die Wahrheit für Entitlements/Quittungen. Idempotenz über `event.id` (Dedup-Tabelle) |
| Entitlements | Abo-/SB-Rechte ausschließlich serverseitig aus Stripe-Webhook abgeleitet — nie aus Client-State |
| Beträge | Server bestimmt Preis/Menge erneut aus DB (`products`), Client-Werte sind nur Vorschlag → kein Preis-Tampering |
| Audit | Jede Zahlung/Auszahlung erzeugt Audit-Event (wer/was/Betrag/Ergebnis) |

Detail-Strecke: Phase 4 Track A (`finalization/phase4_vertical/TRACK_A_SB_PAYMENT`), Setup `docs/STRIPE-SETUP.md` (geplant), eigener ADR.

---

## 9. Secrets & Konfiguration

- **Keine Secrets in Code, Repo oder Log.** Nur Env/Secret-Manager.
- **Trennung public ↔ secret:**
  - Frontend (Vite): **nur** `VITE_`-Präfix → wird ins Bundle gebacken, daher ausschließlich öffentliche Werte (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`).
  - Server (Edge Functions/Supabase Secrets): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY` — **niemals `VITE_`-Präfix**, nie im Client.
- **Service-Role-Key** umgeht RLS — Verwendung ausnahmslos in Edge Functions mit eigener Rechteprüfung; nie im Browser, nie in einem `VITE_`-Wert.
- **Gitignore:** `.env*` und `.claude/` sind aus Release-Artefakten ausgeschlossen.
- **Cloudflare/Supabase:** Secrets über die jeweiligen Dashboards/CLI als Environment-Secrets, nicht in `wrangler.toml`/Migrationen.
- **Rotation:** dokumentiert in `docs/security/SECRET_ROTATION.md` (Anon/Service-Key, Stripe-Keys + Webhook-Secret, Turnstile-Secret).
- **Bypass-Verbot:** Keine Feature-/Auth-Bypass-Flags in Production.

---

## 10. Audit & Verantwortlichkeit

- **Tabelle:** `audit_log` (RLS aktiv, **keine** Select-Policy für `anon`/`authenticated` → nur `service_role` liest/schreibt; append-only/unabschaltbar). Spalten: `org_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `reason`, `details` (jsonb), `created_at`.
- **Pflicht-Events:** Login/Logout/Login-Failed · MFA Enable/Disable/Verify · Hof anlegen/ändern/löschen · Produkt-/Verfügbarkeitsänderung · Reservierung erstellen/stornieren · **SB-Zahlung erstellt/erfolgreich/fehlgeschlagen** · Auszahlung/Connect-Ereignis · Abo-Wechsel · Hof-Verifizierung (Staff) · Support-Eskalation · jede privilegierte Org-Mutation.
- **Inhalt:** wer (`actor`/`auth.uid()`), was (Aktion + Ressource), warum (**reason Pflicht** bei kritischen Aktionen lt. Produktionspfeiler 5), wann, Org-Scope, Ergebnis.
- **Schreibweg:** in der Edge Function nach erfolgreicher Mutation; keine Mutation ohne Audit (`CLAUDE.md`-Verbot).

---

## 11. Datenschutz & Datenminimierung (DSGVO-relevant, Security-Sicht)

- **EU-Hosting:** Supabase EU-Region, Cloudflare EU-Edge — Daten verlassen die EU nicht (außer Stripe-Zahlungsdaten gemäß deren AVV).
- **Datenminimierung:** Reservierung speichert nur das Nötige (Name + Kontakt + Abholfenster + Produkt). Keine unnötigen personenbezogenen Felder.
- **Soft-Delete:** `deleted_at` statt Hard-Delete; echtes Löschen über dokumentierten Lösch-/Auskunftsprozess.
- **Sichtbarkeit öffentlich vs. privat:** Hof-/Produktdaten sind bewusst öffentlich lesbar (Finder); Reservierungs-/Kontakt-/Zahlungsdaten sind streng RLS-geschützt.
- Recht/AVV/TOMs: `docs/COMPLIANCE_MODEL.md`, `docs/launch/B_rechtstexte/*` (geplant, WAVE_14).

---

## 12. Dependency- & Supply-Chain-Sicherheit

- `npm audit --omit=dev` vor jedem Release; Ziel: 0 bekannte High/Critical.
- Lockfile committed; reproduzierbare Builds (Vite).
- Minimale Frontend-Dependencies (React, Supabase-JS, Stripe.js, Zod) — kleine Angriffsfläche.
- Edge Functions (Deno): explizite, versionierte Imports; keine ungepinnten Remote-Module.
- Cloudflare Pages baut aus dem Repo (kein manuelles Hochladen unverifizierter Artefakte).

---

## OWASP Top 10 (2021) — Abdeckung

| # | Kategorie | Maßnahmen in LokaleBauernConnect |
|---|---|---|
| **A01** | Broken Access Control | **RLS deny-by-default** als Autorität (§6) · Edge-Rechteprüfung (`auth.uid()`, Rolle, Org) · serverseitiger Org-Scope, fremde Org = `403`/leer · Cross-Org-Negativtests (`TENANT_ISOLATION_MODEL.md`) · keine Zugriffslogik nur im Client |
| **A02** | Cryptographic Failures | TLS überall (§1), HSTS+preload · Supabase verschlüsselt at-rest · Passwort-Hashing serverseitig (GoTrue) · Kartendaten nie bei uns (Stripe, §8) · Secrets nur Env (§9) |
| **A03** | Injection | **Zod** an allen Edge-Grenzen (§7) · Supabase/PostgREST parametrisiert (keine String-SQL) · React-Auto-Escaping, kein `dangerouslySetInnerHTML` · **CSP** `script-src 'self'` gegen XSS (§2) |
| **A04** | Insecure Design | Defense-in-Depth (10 Schichten) · Vermittler-/Welten-Trennung by design · Stripe-Webhook als idempotente Wahrheit · 7 Produktionspfeiler als Architektur-Gates · Zero-State statt Error |
| **A05** | Security Misconfiguration | Security-Header/CSP als Code (`app/public/_headers`, §2) · RLS `enable row level security` deny-by-default auf allen Tabellen (Migrationen `0001`–`0004`); privilegiertes Schreiben ausschließlich via `service_role` (Edge Functions) · kein Wildcard-CORS · keine Debug-/Bypass-Flags in Prod · `_headers`/Migrationen reviewt |
| **A06** | Vulnerable & Outdated Components | `npm audit` vor Release · gepinnte Deps + Lockfile · schlanker Dependency-Baum · Deno-Imports versioniert (§12) |
| **A07** | Identification & Authentication Failures | Supabase Auth (kurzlebiges JWT, rotierender Refresh, Reuse-Detection) · MFA-Pflicht Staff/Auszahlungs-Erzeuger · Leaked-Password-Schutz · Rate-Limit + Turnstile auf Auth/öffentlichen Formularen (§3, §4) |
| **A08** | Software & Data Integrity Failures | Stripe-Webhook signaturgeprüft + idempotent (§8) · Beträge serverseitig neu bestimmt (kein Tampering) · CSP `base-uri`/`object-src 'none'` · Build aus versioniertem Repo (CI) |
| **A09** | Security Logging & Monitoring Failures | Unabschaltbares `audit_log` mit reason-Pflicht (§10) · Auth-/Zahlungs-Events geloggt · geplante Observability (Sentry/strukturierte Logs/Health, WAVE_13) · Cloudflare-Logs/Analytics |
| **A10** | Server-Side Request Forgery (SSRF) | Edge Functions rufen nur fest verdrahtete, allow-gelistete Hosts (Stripe, Turnstile-Verify) · keine vom Client gesteuerten Ziel-URLs · `connect-src`-Allowlist im Client (§2) |

---

## Bekannte Lücken / Offene Punkte

| ID | Beschreibung | Priorität | Status / Owner-Entscheidung |
|---|---|---|---|
| SEC-01 | Live-Deploy steht aus → Security-Header/CSP/HSTS erst nach Cloudflare-Freigabe aktiv | HOCH | Owner-Freigabe (Account/Domain/Kosten) ausstehend |
| SEC-02 | RLS-Migrationen vorhanden (`0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`, `0004_onboarding.sql`) — deny-by-default ab Migration #1; automatisierter Cross-Org-Isolationstest als blockierendes Gate noch zu ergänzen | HOCH | Isolationstest-Gate offen |
| SEC-03 | Supabase Auth/MFA verdrahtet als Gerüst (`app/src/lib/auth.tsx`, Magic-Link + RLS-Guard); ohne Env läuft die App im Seed-Modus. MFA/Leaked-Password-Härtung im Supabase-Dashboard vor Go-Live zu aktivieren | HOCH | Dashboard-Härtung offen |
| SEC-04 | Stripe-Edge-Functions vorhanden (`create-checkout`, `stripe-webhook` — signaturgeprüft + idempotent, Beträge serverseitig). Stripe **Connect** (Destination/Direct Charge an Erzeuger) noch nicht im Code; aktuell direkte Plattform-Charges | MITTEL | Connect-Ausbau offen |
| SEC-05 | CSP `style-src 'unsafe-inline'` (Vite/Editorial-Tokens) → Ziel: nonce/hash-basiert | NIEDRIG | Ausbaustufe |
| SEC-06 | Datenschicht (`app/src/lib/data.ts`) fällt bei Supabase-Fehler auf Seed/`localStorage` zurück — bewusst für Seed-Phase; vor Live-Reservierungen abschalten, damit Schreibfehler nicht still maskieren | MITTEL | vor WAVE_02-Live umstellen |

---

## Prüf-Checkliste vor Go-Live (Security-Gate, Phase 2 Gate B)

- [ ] Alle Tabellen: RLS `enable row level security`, deny-by-default, Isolationstest grün (Plattform + Org)
- [ ] Cross-Org-Negativtests: fremde Org = `403`/leer (nicht `200` mit Fremddaten)
- [ ] Security-Header/CSP/HSTS am Edge aktiv und verifiziert (Header-Scan)
- [ ] Turnstile auf allen öffentlichen Schreib-Formularen, serverseitig verifiziert
- [ ] Rate-Limits aktiv (Auth + öffentliche Schreibpfade + SB-Intent)
- [ ] Kein Secret im Bundle (Grep auf `service_role`/`sk_`/Secret-Namen im Build-Output)
- [ ] Stripe-Webhook signaturgeprüft + idempotent + Entitlements serverseitig
- [ ] Zod-Validierung an jeder Edge-Function-Grenze
- [ ] `audit_log` schreibt jede kritische Mutation mit reason
- [ ] `npm audit --omit=dev` ohne High/Critical
- [ ] `.env*` / `.claude/` nicht im Release-Artefakt

---

*Letzte Aktualisierung: Phase 1 · WAVE_06 · 2026-06-19*
*Zuständig: Security (Claude) · Freigabe: Owner*
*Querverweise: `docs/security/TENANT_ISOLATION_MODEL.md` · `docs/security/IDENTITY_MODEL.md` · `docs/security/SECRET_ROTATION.md` · `docs/COMPLIANCE_MODEL.md` · `docs/adr/0001…`, `0002…`*
