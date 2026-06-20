# WAVE_06 — Security (Supabase Auth · Turnstile · RLS-Härtung · Rate-Limits · Security-Header)

> **LokaleBauernConnect** · ConnectCore-Imperium · **Welle 1, Klasse C** (Cashflow-Schnellstarter)
> **Phase 1, WAVE_06** (`PHASEN.md` → „WAVE_06 Security: Supabase Auth, Turnstile, RLS-Härtung, Rate-Limits"). **Eine Welle pro Session.**
> **Prio:** P0 (Sicherheit ist Marktstart-Pflicht, Go-Live-Gate Teil 1 · Abschnitt **C — Security**).
> Stack (fix, Imperium-Grundgesetz): **React + Vite + TypeScript (strict)** · **Supabase** (EU, Postgres + RLS, Edge Functions/Deno, Storage) · **Cloudflare** (Pages/Workers/**Turnstile**/WAF) · **Stripe (+Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> **Rolle = VERMITTLER** — kein Eigenverkauf, keine Beratung. Vermittler-Disclaimer durchgängig sichtbar.
> **Voraussetzung:** WAVE_00 (Baseline), WAVE_01 (Release-Hygiene/CI), WAVE_02 (Datenmodell + RLS deny-by-default) abgeschlossen. WAVE_06 **härtet** das bestehende Fundament, es ersetzt es nicht.
> **Ausführungsagenten:** Claude (gesamter Stack) + Subagenten **security-auditor** (RLS-/Secret-/Header-Scan, read-only), **devops** (Cloudflare Turnstile/WAF/Rate-Limits, Pages-`_headers`), **qa-tester** (Cross-Org-Negativtests, Rate-Limit-/Turnstile-Tests).
> **Owner-Freigabe erforderlich für:** echte Supabase-EU-Keys & Auth-Aktivierung (Account/Kosten), Cloudflare-Turnstile-Schlüssel + WAF-/Rate-Limit-Regeln (Account), jeden `git commit`/`push`. Bis dahin ist die Welle **repo-lokal, reversibel** (Migrationen, Edge-Function-Code, `_headers`, Frontend-Wiring, Doku) und wird **vorbereitet, nicht live geschaltet**.

---

## 0. Ziel

LokaleBauernConnect bekommt eine **lückenlose, serverseitig erzwungene Sicherheitsschicht**, die einer Due-Diligence, einer Erzeuger-Pilotdemo und einem echten Go-Live standhält — als regionaler **Vermittler**, der öffentliche Höfe-/Produktdaten zeigt, aber jeden schreibenden, bezahlenden und personenbezogenen Pfad hart absichert. Konkret und prüfbar:

1. **Identität (Supabase Auth) produktiv & sauber abgegrenzt.** Anonyme Käufer dürfen lesen und reservieren; Erzeuger/Staff/Owner sind authentifiziert und sehen ausschließlich ihre Welt (org-/rollengebunden). Kein UI-only-Schutz — **Backend (RLS + Edge-Guards) ist die Wahrheit**, die UI ist nur Komfort.
2. **Bot-/Missbrauchsschutz (Cloudflare Turnstile) auf allen öffentlichen Formularen** (Reservierung, Waitlist/Landing, Bewertung, Bounty/Gesuch, Onboarding-Kontakt). Token wird **serverseitig in der Edge Function gegen die Turnstile-Siteverify-API geprüft** — der Frontend-Widget allein zählt nicht.
3. **RLS-Härtung über alle Tabellen** der Migrationen `0001_core.sql`, `0002_payments.sql`, `0003_marketplace.sql`: deny-by-default bestätigt, anon-Insert-Pfade **eingehegt** (Längen-/Wertgrenzen, org-/farm-Konsistenz), `force row level security` gegen Table-Owner-Bypass, und ein **maschineller Cross-Org-Negativtest**, der rot wird, sobald eine fremde Org auch nur eine Zeile sieht oder schreibt.
4. **Rate-Limits & Eingangsvalidierung an jeder Edge-Function-Grenze.** Pro IP/Schlüssel gedrosselte, **Zod-validierte** Eingaben für `create-checkout`, `stripe-webhook` und die neuen öffentlichen Mutations-Funktionen (Reservierung/Waitlist/Review/Bounty). Preise/Beträge **immer serverseitig** ermittelt (Client-Betrag nie vertrauen — bereits Muster in `create-checkout`, hier zur Regel gehärtet).
5. **Security-Header & CSP produktionsreif** in `app/public/_headers`: CSP für die real genutzten Origins (Supabase, Stripe, Turnstile, Karten-Tiles), HSTS mit `preload`, restriktive `Permissions-Policy`, `frame-ancestors 'none'`, `nonce`-/`'self'`-Skriptpolitik — **kein toter CSP-Eintrag ohne aktiven Pfad, kein `unsafe-eval`**.
6. **Secret-Grenze hart.** Frontend nur `VITE_`-Public-Keys (Supabase URL + anon + Turnstile **Site**-Key). `service_role`, Stripe-Secrets, Webhook-Secret, **Turnstile-Secret-Key** ausschließlich als Supabase Edge Function Secrets. Verifiziert durch das WAVE_01-Hygiene-Gate (hier um Turnstile-/CORS-Muster erweitert).

**Nicht-Ziel dieser Welle:** Eigenständiges MFA/SSO-Produkt (Step-up nur als Hook vorbereitet, falls Owner-Bereich exponiert wird — sonst „nicht exponiert" ist auch ein gültiger Sicherheitszustand), Penetrationstest durch Dritte (separat, Phase 2 Gate B), Stripe-Connect-Auszahlungs-Compliance (WAVE_09 / Phase 4 Track A). DSGVO-Rechtstexte sind WAVE_14.

---

## 1. Ist-Zustand (repo-genau geprüft)

| Fakt (real im Repo) | Stand | Konsequenz für WAVE_06 |
|---|---|---|
| `0001_core.sql` RLS | `enable row level security` auf allen 7 Kern-Tabellen; deny-by-default; `farms_public_read`/`products_public_read` (anon), `*_owner_write` (org-gebunden), `reservations_insert`/`waitlist_insert` (anon, mit `with check`) | Solide Basis. **Fehlt:** `force row level security` (Table-Owner-Bypass), engere `with check`-Grenzen, Bot-Schutz auf anon-Inserts. |
| `0003_marketplace.sql` RLS | `is_org_member()` (`security definer set search_path = public`), `reviews_insert`/`bounties_insert` (anon) | `security definer` korrekt gehärtet (search_path gepinnt). Anon-Insert auf reviews/bounties **ungedrosselt** → Turnstile + Rate-Limit nötig. |
| `_shared/cors.ts` | `Access-Control-Allow-Origin: Deno.env.get('CORS_ORIGIN') ?? '*'` | **Schwachstelle:** Default `*` erlaubt jede Origin. → Auf App-Origin **fest** binden, `*` nur im Dev-Fallback, Origin-Allowlist. |
| `_shared/supabaseAdmin.ts` | `service_role`-Client, `persistSession:false`, env-gated | Korrekt. service_role nie im Client. Bleibt. |
| `create-checkout/index.ts` | Preis serverseitig (`product.price`), `quantity` geklemmt (1..50), `method_not_allowed`/`bad_json`-Guards | Gut. **Fehlt:** Zod-Validierung des Bodys, Turnstile-Check, Rate-Limit. |
| `stripe-webhook/index.ts` | Signaturprüfung (`constructEventAsync`), Idempotenz (`payment_events` PK + Konflikt→200) | Vorbildlich. Bleibt. Ergänzen: kein Turnstile (Maschine-zu-Maschine), aber **Roh-Body-Limit** + Methodenguard sind schon da. |
| `app/src/lib/supabase.ts` | Client nur bei gesetzten `VITE_`-Keys, sonst `null` (Seed-Modus) | Dual-Source bleibt. Auth-Helper (`signIn/out`, Session) ergänzen — Seed-Modus darf nicht brechen. |
| `app/src/vite-env.d.ts` | typisiert `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | **Ergänzen:** `VITE_TURNSTILE_SITE_KEY` (public, im Bundle ok). |
| `app/public/_headers` | X-Frame-Options DENY, nosniff, Referrer-Policy, HSTS (1y, subdomains), Permissions-Policy, CSP (`default-src 'self'`, `connect-src 'self' https://*.supabase.co`, …) | Starke Basis. **Härten:** Stripe-/Turnstile-/Tile-Origins (nur bei aktivem Pfad), HSTS `preload`, COOP/CORP, `Cross-Origin-Opener-Policy`. |
| `app/supabase/functions/.env.example` | Stripe/Mail/`CORS_ORIGIN` dokumentiert | **Ergänzen:** `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_*`, `ALLOWED_ORIGINS`. |
| Rate-Limiting | **existiert nicht** | **Neu:** zentraler Rate-Limiter (`_shared/rateLimit.ts`, DB-gestützt) + Cloudflare-WAF-Rate-Rules (dokumentiert). |
| Turnstile | **existiert nicht** (kein Site-Key, kein Verify) | **Neu:** Frontend-Widget-Helper + `_shared/turnstile.ts` (serverseitige Siteverify). |

> **Abweichung zum TempConnect-Blueprint dokumentiert (Stop-Regel):** Der Referenz-Blueprint kennt eigene VMS-Begriffe (Login-/Einsatzportal-Härtung). Hier wird konsequent auf die Hof-Domäne adaptiert: „öffentliche Formulare" = **Reservierung, Waitlist, Bewertung, Gesuch, Onboarding-Kontakt**; „Login-Härtung" = **Supabase Auth + Step-up-Hook für Owner/Staff**. Keine VMS-/Hetzner-Begriffe übernommen.

---

## 2. Aufgaben

> Reihenfolge = Abhängigkeit: erst DB-/RLS-Härtung (Wahrheitsschicht), dann Edge-Guards (Turnstile/Rate-Limit/Zod/CORS), dann Frontend-Auth + Turnstile-Widget, dann Header/CSP, zuletzt Tests + Doku.

### 2.1 RLS-Härtung & Auth-Schema (Migration `0004_security.sql`, additiv)

Neue, **additive** Migration `app/supabase/migrations/0004_security.sql` (Rollback-Pfad als Kommentar; ergänzt `setup_all.sql`):

- **`force row level security`** auf allen schreibenden/sensiblen Tabellen — verhindert, dass der Table-Owner (z. B. Migrations-Rolle) RLS umgeht. `service_role` umgeht weiterhin systemseitig (gewollt, nur Edge Functions).
- **Engere `with check`-Grenzen für anon-Inserts** (Defense-in-Depth, ergänzend zu Turnstile/Rate-Limit):
  - `reservations`: `quantity between 1 and 50` (bereits Spalten-Check) + `char_length(name) between 1 and 120` + `char_length(contact) between 3 and 200` + Hof/Produkt-Konsistenz (Produkt gehört zur Farm & Org, Farm aktiv).
  - `waitlist`: `email` plausibel (`position('@' in email) > 1`), `char_length(plz) between 3 and 16`.
  - `reviews`: `rating between 1 and 5` + `comment` ≤ 2000 (Spalten-Check vorhanden) + Org/Farm-Konsistenz.
  - `bounties`: `char_length(title) between 3 and 200` (vorhanden) + `radius_km between 1 and 200` (vorhanden) — bestätigt.
- **Rate-Limit-Tabelle** `rate_limits` (Sliding-Window, DB-gestützt für Edge Functions ohne externen Store):

  ```sql
  create table if not exists rate_limits (
    bucket      text not null,          -- z. B. 'reservation:'<ip-hash>
    window_start timestamptz not null,
    count       integer not null default 0,
    primary key (bucket, window_start)
  );
  create index if not exists rate_limits_window_idx on rate_limits (window_start);
  alter table rate_limits enable row level security;
  alter table rate_limits force row level security;
  -- keine Policy für anon/authenticated → ausschließlich service_role (Edge Functions).
  ```

- **Atomare Increment-Funktion** (security definer, search_path gepinnt) für rennfreie Zählung:

  ```sql
  create or replace function rl_hit(p_bucket text, p_window timestamptz, p_limit int)
  returns boolean language plpgsql security definer set search_path = public as $$
  declare v_count int;
  begin
    insert into rate_limits (bucket, window_start, count) values (p_bucket, p_window, 1)
    on conflict (bucket, window_start) do update set count = rate_limits.count + 1
    returning count into v_count;
    return v_count <= p_limit;   -- true = erlaubt, false = Limit überschritten
  end $$;
  revoke all on function rl_hit(text, timestamptz, int) from public, anon, authenticated;
  ```

- **Audit-Härtung:** `audit_log` bleibt service_role-only (keine anon/auth-Policy — bereits so). Ergänzen: `audit_log` `force row level security`; optional Append-only-Trigger (kein `update`/`delete` für Nicht-service_role) als Defense-in-Depth.
- **Aufräum-Job (dokumentiert):** alte `rate_limits`-Fenster per pg_cron (`select cron.schedule(...)`) oder Edge-Cron löschen (`delete from rate_limits where window_start < now() - interval '1 day'`) — **nur mit Owner-Freigabe scharf schalten**, Migration legt nur die Funktion an.

> **Test-Integrität:** Die Migration kodiert die Soll-Sicherheit. Der Cross-Org-Negativtest (§2.6) ist die Spezifikation — Policies werden an den Test angepasst, nie umgekehrt.

### 2.2 Edge-Function-Härtung: CORS, Turnstile, Rate-Limit, Zod

**2.2a `_shared/cors.ts` — Origin-Allowlist statt `*`.** Default `*` ist eine Schwachstelle. Ersetzen durch eine **Allowlist** aus `ALLOWED_ORIGINS` (Komma-getrennt); reflektiere nur erlaubte Origins, sonst kein CORS-Header (Browser blockt). Dev-Fallback nur, wenn `ALLOWED_ORIGINS` leer **und** Request von `localhost`.

```ts
// _shared/cors.ts — gehärtet (Origin-Allowlist, kein Wildcard in Prod)
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)

export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const dev = ALLOWED.length === 0 && /^https?:\/\/localhost(:\d+)?$/.test(origin)
  const allow = ALLOWED.includes(origin) || dev ? origin : ''
  return {
    ...(allow ? { 'Access-Control-Allow-Origin': allow, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
```

**2.2b `_shared/turnstile.ts` — serverseitige Siteverify (neu).** Der Frontend-Token zählt nie allein.

```ts
// _shared/turnstile.ts — Cloudflare Turnstile serverseitig prüfen.
// Ohne TURNSTILE_SECRET_KEY -> "offen" (Dev/Seed), in Prod ist der Key Pflicht (Gate).
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return Deno.env.get('TURNSTILE_REQUIRED') === '1' ? false : true
  if (!token) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: form,
  })
  const data = await r.json().catch(() => ({ success: false }))
  return data?.success === true
}
```

**2.2c `_shared/rateLimit.ts` — DB-gestützter Sliding-Window-Limiter (neu).** Pro Funktion/Aktion + IP-Hash gebucketet; nutzt `rl_hit` (§2.1).

```ts
// _shared/rateLimit.ts — feste Fenster über rl_hit() (service_role).
import { admin } from './supabaseAdmin.ts'

export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? '0.0.0.0'
}
async function ipHash(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (Deno.env.get('RATE_LIMIT_SALT') ?? '')))
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}
export async function allow(action: string, req: Request, limit = 10, windowSec = 60): Promise<boolean> {
  const bucket = `${action}:${await ipHash(clientIp(req))}`
  const win = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000).toISOString()
  const { data, error } = await admin().rpc('rl_hit', { p_bucket: bucket, p_window: win, p_limit: limit })
  if (error) return true   // fail-open für Rate-Limit (Sicherheit ≠ DoS gegen echte Nutzer); Turnstile/RLS bleiben Schutz
  return data === true
}
```

> **Begründung fail-open beim Limiter:** Ein DB-Fehler im Limiter darf **echte** Käufer nicht aussperren; die harte Sicherheit (Turnstile + RLS + Stripe-Signatur) bleibt unabhängig aktiv. Cloudflare-WAF-Rate-Rules (§2.4) sind die **vorgelagerte**, ausfallsichere Drosselung.

**2.2d Neue öffentliche Mutations-Funktion `submit-form/index.ts` (Reservierung/Waitlist/Review/Bounty).** Heute schreibt das Frontend anon-Inserts direkt via RLS. Für Bot-/Rate-Schutz **kanalisieren** wir mutierende öffentliche Schreibvorgänge durch eine Edge Function, die **Turnstile + Rate-Limit + Zod** erzwingt und mit `service_role` schreibt (RLS bleibt als zweite Verteidigungslinie für Direkt-Inserts bestehen). Skizze:

```ts
// submit-form/index.ts — Turnstile + Rate-Limit + Zod, dann service_role-Insert.
import { preflight, json } from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { allow, clientIp } from '../_shared/rateLimit.ts'
import { admin } from '../_shared/supabaseAdmin.ts'
import { z } from 'npm:zod@3'

const Reservation = z.object({
  kind: z.literal('reservation'),
  farmId: z.string().min(1).max(80),
  productId: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(50),
  pickupWindow: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  contact: z.string().min(3).max(200),
  turnstileToken: z.string().min(1),
})
// + Waitlist / Review / Bounty Schemata (discriminatedUnion)

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)
  if (!(await allow('submit', req, 10, 60))) return json(req, { error: 'rate_limited' }, 429)

  let body: unknown
  try { body = await req.json() } catch { return json(req, { error: 'bad_json' }, 400) }
  const parsed = Reservation.safeParse(body)   // bzw. discriminatedUnion
  if (!parsed.success) return json(req, { error: 'validation', issues: parsed.error.flatten() }, 422)

  if (!(await verifyTurnstile((body as { turnstileToken?: string }).turnstileToken, clientIp(req))))
    return json(req, { error: 'turnstile_failed' }, 403)

  const db = admin()
  // Server prüft Hof/Produkt-Konsistenz, ermittelt org_id serverseitig (Client nie vertrauen):
  const { data: product } = await db.from('products')
    .select('org_id, farm_id').eq('id', parsed.data.productId).eq('farm_id', parsed.data.farmId).maybeSingle()
  if (!product) return json(req, { error: 'not_found' }, 404)
  const { error } = await db.from('reservations').insert({
    farm_id: product.farm_id, product_id: parsed.data.productId, org_id: product.org_id,
    quantity: parsed.data.quantity, pickup_window: parsed.data.pickupWindow,
    name: parsed.data.name, contact: parsed.data.contact,
  })
  if (error) return json(req, { error: 'create_failed' }, 500)
  await db.from('audit_log').insert({ org_id: product.org_id, action: 'reservation.created',
    entity_type: 'reservation', entity_id: product.farm_id, details: { via: 'submit-form' } })
  return json(req, { ok: true }, 201)
})
```

> `json(req, …)` ist die um `corsFor(req)` erweiterte Variante des bestehenden Helpers. **org_id wird serverseitig aus dem Produkt abgeleitet** — der Client liefert sie nie. Das schließt org-Spoofing aus, das eine reine RLS-`with check` zwar abfängt, aber serverseitige Ableitung ist die robustere, marktführer-konforme Variante.

**2.2e `create-checkout` härten:** Zod-Body-Schema (`mode` discriminatedUnion `sb_payment` | `subscription`), `corsFor(req)`, Rate-Limit (`allow('checkout', req, 20, 60)`). Preis bleibt serverseitig (bereits korrekt). Kein Turnstile auf Checkout (Stripe-Hosted-Page hat eigenen Schutz), aber Rate-Limit verhindert Session-Spam.

**2.2f `stripe-webhook` bleibt unverändert in der Logik** (Signatur + Idempotenz sind bereits vorbildlich). Ergänzen nur: **keine CORS-Header** (Maschine-zu-Maschine, kein Browser) — bewusst weglassen; Roh-Body wird unverändert für die Signaturprüfung gelesen (nie `req.json()` davor). Diese Invariante im Code-Kommentar festschreiben.

### 2.3 Frontend: Supabase Auth + Turnstile-Widget

- **`app/src/lib/auth.ts` (neu):** dünne Auth-Schicht über `supabase.auth` — `signInWithPassword`, `signInWithOtp` (Magic Link, passwortlos für Erzeuger), `signOut`, `getSession`, `onAuthStateChange`. **Seed-Modus-sicher:** ist `supabase === null`, liefern die Funktionen einen klaren „Auth im Demo-Modus deaktiviert"-Zustand (kein Crash, kein toter Button).
- **`app/src/lib/turnstile.ts` (neu):** lädt das Turnstile-Script (`https://challenges.cloudflare.com/turnstile/v0/api.js`) **lazy** nur auf Seiten mit Formular, rendert das Widget in einen Ref-Container, gibt das Token zurück. Site-Key aus `import.meta.env.VITE_TURNSTILE_SITE_KEY`. Ohne Site-Key (Seed/Dev): Widget wird übersprungen, Formular bleibt bedienbar, Token = `''` → Edge-Function läuft im „offen"-Dev-Modus (§2.2b).
- **Formular-Wiring (end-to-end):** Reservierungs-/Waitlist-/Bewertungs-/Gesuch-Formular rufen statt direktem anon-Insert die `submit-form`-Function auf und hängen `turnstileToken` an. **Zustände vollständig:** `loading` (Submit deaktiviert, Spinner), `error` (`rate_limited` → „Bitte kurz warten", `turnstile_failed` → „Bitte Bestätigung erneut", `validation` → Feldfehler), `success` (Bestätigung + Reset). Disclaimer-Zeile (`.disclaimer-line`) bleibt sichtbar.
- **`app/src/vite-env.d.ts`** um `readonly VITE_TURNSTILE_SITE_KEY?: string` erweitern (public, im Bundle erlaubt).
- **Step-up-Hook (vorbereitet, nicht erzwungen):** Owner-/Staff-Routen prüfen `getSession()` + Rolle aus `profiles`; ohne Session → Redirect auf Login. Solange diese Bereiche nicht exponiert sind, ist „nicht exponiert" der gültige Sicherheitszustand (Go-Live-Gate C).

### 2.4 Cloudflare: Turnstile, WAF & Rate-Rules (dokumentiert, Owner-Freigabe)

Im Repo verbindlich dokumentiert (Ausführung im Cloudflare-Dashboard mit Owner-Freigabe):

| Schutz | Konfiguration |
|---|---|
| **Turnstile-Widget** | Eigener Site-Key (Domain-gebunden) → `VITE_TURNSTILE_SITE_KEY` (Pages-Env, public). Secret-Key → `supabase secrets set TURNSTILE_SECRET_KEY=…` (nie ins Frontend). |
| **WAF Managed Rules** | Cloudflare Managed Ruleset + OWASP Core Ruleset auf der Pages-Domain aktiv (Sensitivität medium). |
| **Rate-Rules (vorgelagert, ausfallsicher)** | `/functions/v1/submit-form` → 10 req/min/IP · `/functions/v1/create-checkout` → 20 req/min/IP · Auth-Endpunkte (`/auth/v1/token`, `/auth/v1/otp`) → 10 req/min/IP. Aktion: Managed Challenge → bei Wiederholung Block. |
| **Bot Fight Mode** | aktiv für die Pages-Domain (ergänzt Turnstile auf Funktions-Ebene). |
| **TLS/HSTS** | TLS 1.2+ erzwingen, „Always Use HTTPS", HSTS deckungsgleich mit `_headers` (1 Jahr, includeSubDomains, preload). |

### 2.5 Security-Header & CSP (`app/public/_headers` härten)

`app/public/_headers` auf produktionsreife Politik heben (nur Origins mit **aktivem** Pfad — kein toter Eintrag):

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(self)
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://api.stripe.com; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self' https://challenges.cloudflare.com https://js.stripe.com; font-src 'self' data:; base-uri 'self'; form-action 'self'; frame-src https://challenges.cloudflare.com https://js.stripe.com; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
```

> **Begründung jeder Erweiterung:** `challenges.cloudflare.com` (Turnstile-Script + connect), `js.stripe.com`/`api.stripe.com` (nur sobald SB-Payment/Abo live — vorher entfernen, kein toter Pfad), `*.tile.openstreetmap.org` (Karten-Tiles WAVE_04/Track B). `object-src 'none'` + `frame-ancestors 'none'` + `upgrade-insecure-requests` sind kostenlose Härtung. **Kein `unsafe-eval`, kein `unsafe-inline` für Skripte.** `style-src 'unsafe-inline'` bleibt nur für die vom Theme genutzten Inline-Styles; Ziel: per Build-Nonce ablösen (WAVE_10).

### 2.6 Cross-Org-Negativtest (Isolations-Gate, blockierend)

Maschineller Test `app/supabase/tests/isolation.test.sql` (pgTAP **oder** ein Node-Skript via anon-Client), der die **Spezifikation** kodiert. Er erstellt zwei Orgs (A, B) mit je einem Erzeuger und prüft:

1. Erzeuger A liest **keine** `reservations`/`subscriptions`/`sb_payments`/`credits_ledger`/`org_members` von Org B → erwartet **0 Zeilen** (nicht 403-Fehler, sondern RLS-gefiltert leer).
2. Erzeuger A kann **kein** `farms`/`products`/`org_locations` von Org B `update`/`insert`/`delete` → erwartet **0 betroffene Zeilen / Policy-Fehler**.
3. Anon kann `farms`/`products` **lesen** (Public-Katalog gewollt) aber **keine** `reservations` lesen, **kein** `audit_log`/`orgs`/`payment_events`/`rate_limits` lesen → 0 Zeilen.
4. Anon-`insert` in `reservations` ohne gültige Hof/Produkt/Org-Konsistenz → **abgelehnt**.
5. `force row level security` aktiv: Auch als Table-Owner (ohne service_role) greifen die Policies.

> **Kein Merge ohne grünen Isolationstest** (Go-Live-Gate C). Der Test ist die Wahrheit — wird er rot, wird die **Policy** korrigiert, nie der Test abgeschwächt (CLAUDE.md §0.9 Test-Integrität).

### 2.7 Secret-/Hygiene-Erweiterung & Doku

- `app/supabase/functions/.env.example` ergänzen (secret-frei, nur Platzhalter): `TURNSTILE_SECRET_KEY=`, `TURNSTILE_REQUIRED=1`, `ALLOWED_ORIGINS=https://app.lokalebauernconnect.de`, `RATE_LIMIT_SALT=`.
- `app/.env.example` ergänzen: `VITE_TURNSTILE_SITE_KEY=` (public).
- WAVE_01-Hygiene-Gate (`scripts/release-hygiene-check.sh`) um Muster erweitern: kein `VITE_TURNSTILE_SECRET`/`VITE_*SECRET*` (Secret darf nie `VITE_`-präfixt sein); `cors.ts` enthält **kein** hartes `'*'` mehr (Grep-Assertion).
- Doku: `docs/security/IDENTITY_MODEL.md` (Supabase Auth/Step-up), `docs/security/TENANT_ISOLATION_MODEL.md` (RLS + Isolationstest), `docs/security/SECURITY_OVERVIEW.md` (Header/CSP/Turnstile/Rate-Limit-Übersicht) — die in `MASTER_INDEX.md` Abschnitt 2 als ⬜ geführten Dateien werden mit dieser Welle real befüllt.

---

## 3. Konkrete Befehle (Reihenfolge · Working-Dir `app/`, Windows-PowerShell-tauglich)

```bash
# 0) Ins App-Repo
cd "C:/Users/DennisStegemann/Desktop/09_LokaleBauernConnect(D)/app"

# 1) Frontend-Build/Typen weiterhin grün (Auth-/Turnstile-Wiring darf nichts brechen)
npm ci
npm run typecheck            # strict + noUnused* — neue lib/auth.ts, lib/turnstile.ts typsicher
npm run lint                 # ESLint flat config (WAVE_01)
npm run build                # tsc --noEmit && vite build -> dist/ (mit gehärtetem _headers)

# 2) Edge Functions (Deno) prüfen — inkl. neuer submit-form + _shared/turnstile/rateLimit/cors
cd supabase/functions
deno lint
deno check create-checkout/index.ts stripe-webhook/index.ts submit-form/index.ts \
            _shared/cors.ts _shared/turnstile.ts _shared/rateLimit.ts
cd ../..

# 3) Migration lokal anwenden (lokaler Supabase-Stack; NICHT gegen Prod ohne Owner-Freigabe)
supabase start                              # lokaler Stack (Docker NUR lokal für CLI; kein Self-Host-Deploy)
supabase db reset                           # wendet migrations/0001..0004 + seed an (frisches Schema)
#  alternativ rein additiv gegen laufende lokale DB:
#  supabase migration up

# 4) Isolations-/Sicherheitstest (blockierendes Gate)
supabase test db                            # pgTAP: tests/isolation.test.sql  -> erwartet: alle grün
#  alternativ Node-Negativtest (anon-Client):
#  node scripts/isolation-check.mjs         # erwartet: 0 Fremdzeilen, Inserts abgelehnt

# 5) Turnstile-Verify lokal smoke-testen (Dummy-Secret -> erwartet 'turnstile_failed' ohne Token)
supabase functions serve submit-form --env-file supabase/functions/.env
curl -s -X POST http://localhost:54321/functions/v1/submit-form \
  -H 'content-type: application/json' \
  -d '{"kind":"reservation","farmId":"hof-sonnenwiese","productId":"p1","quantity":2,"pickupWindow":"Sa 9-12","name":"Test","contact":"test@example.de"}'
#  erwartet: {"error":"turnstile_failed"} (kein Token) bzw. {"error":"rate_limited"} nach >10 Hits/min

# 6) Rate-Limit-Smoke (11. Request innerhalb 60s -> 429)
for i in $(seq 1 11); do \
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:54321/functions/v1/submit-form \
    -H 'content-type: application/json' -d '{"kind":"reservation","farmId":"x","productId":"x","quantity":1,"pickupWindow":"x","name":"x","contact":"x@x.de","turnstileToken":"dummy"}'; \
done   # erwartet: letzte Zeile 429

# 7) Security-Header-Check gegen den Prod-Build (lokale Preview)
npm run preview              # serviert dist/ ; _headers wirkt erst auf Cloudflare,
#  Header-Politik separat verifizieren nach Deploy:
#  curl -sI https://app.lokalebauernconnect.de | grep -iE 'content-security|strict-transport|x-frame|permissions-policy'

# 8) Hygiene-Gate (WAVE_01) erneut — jetzt mit Turnstile-/CORS-Assertions
bash scripts/release-hygiene-check.sh       # erwartet: HYGIENE-GATE: PASS

# 9) Secrets server-seitig setzen — NUR mit Owner-Freigabe (Platzhalter, nie echte Werte ins Repo/Log)
# supabase secrets set TURNSTILE_SECRET_KEY=<0x...> TURNSTILE_REQUIRED=1 \
#   ALLOWED_ORIGINS=https://app.lokalebauernconnect.de RATE_LIMIT_SALT=<random>
# supabase secrets list                     # zeigt nur Namen, keine Werte

# 10) Deploy der Functions/Migration — NUR mit Owner-Freigabe (Account/Kosten)
# supabase db push
# supabase functions deploy submit-form create-checkout stripe-webhook
```

> **Stop-Regel:** `supabase db push` / `functions deploy` / Setzen produktiver Secrets / Cloudflare-WAF-/Turnstile-Aktivierung → **anhalten, Owner-Freigabe** (Account-/Kosten-relevant). Lokal (`supabase start`, `db reset`, `test db`, `functions serve`) ist kostenlos und reversibel.

---

## 4. Acceptance (Akzeptanzkriterien — alle müssen grün sein)

**Identität & Autorisierung**
1. Supabase-Auth-Schicht (`lib/auth.ts`) funktioniert mit gesetzten Keys (Magic-Link/Passwort); im Seed-Modus (`supabase === null`) sind Auth-Aktionen klar deaktiviert — **kein Crash, kein toter Button**.
2. Owner-/Staff-Routen sind ohne gültige Session + Rolle nicht erreichbar **oder** nachweislich nicht exponiert (dokumentiert).
3. Käufer-/Erzeuger-/Staff-Welten sind strikt getrennt — keine Welt sieht/ändert fremde Daten (Beleg: §2.6-Test).

**Turnstile (Bot-Schutz)**
4. Alle öffentlichen Formulare (Reservierung, Waitlist, Bewertung, Gesuch) rendern das Turnstile-Widget (bei gesetztem Site-Key) und senden `turnstileToken`.
5. `submit-form` **lehnt** ohne gültigen Token mit `403 turnstile_failed` ab (serverseitige Siteverify) — der Frontend-Token allein genügt nie.
6. Im Dev/Seed (kein Secret-Key, `TURNSTILE_REQUIRED≠1`) bleibt das Formular voll bedienbar (Demo-Modus klar gekennzeichnet).

**RLS-Härtung & Isolation**
7. `0004_security.sql` läuft additiv sauber (`supabase db reset` grün); Rollback-Pfad dokumentiert.
8. `force row level security` ist auf allen schreibenden/sensiblen Tabellen aktiv.
9. **Cross-Org-Negativtest grün** (§2.6): fremde Org = **0 Zeilen / abgelehnt**, nie 200 mit Fremddaten. `audit_log`/`orgs`/`payment_events`/`rate_limits` sind für anon/authenticated unlesbar.
10. Anon kann Public-Katalog (`farms`/`products`/`org_locations` aktiv) lesen, aber keine personenbezogenen/zahlungsbezogenen Daten.

**Rate-Limits & Eingangsvalidierung**
11. `submit-form` und `create-checkout` sind Zod-validiert (ungültiger Body → `422`, kein 500).
12. Rate-Limit greift: >10 Submits/min/IP → `429`; >20 Checkouts/min/IP → `429`. Cloudflare-Rate-Rules sind dokumentiert.
13. Preis/Betrag wird **immer serverseitig** ermittelt; org_id serverseitig abgeleitet (Client-Werte werden nie vertraut).

**CORS & Header/CSP**
14. `cors.ts` gibt **kein** Wildcard `*` mehr in Prod aus; nur Origins aus `ALLOWED_ORIGINS` (Dev-Fallback nur localhost).
15. `_headers` liefert HSTS (`preload`), CSP ohne `unsafe-eval`, `frame-ancestors 'none'`, `object-src 'none'`, COOP/CORP; CSP-Origins decken **nur aktive** Pfade (Supabase/Turnstile/Stripe-falls-live/Tiles).
16. Stripe-/Karten-CSP-Einträge existieren nur, wenn der Pfad aktiv ist — sonst entfernt (kein toter CSP-Eintrag).

**Secret-Grenze & Hygiene**
17. Frontend-Bundle (`dist/`) enthält **keinen** `service_role`/Stripe-/Webhook-/Turnstile-**Secret**-Key; nur `VITE_`-Public-Keys (Supabase URL/anon + Turnstile **Site**-Key).
18. `.env.example` (App + Functions) vollständig & secret-frei; Hygiene-Gate prüft `VITE_*SECRET*`-Verbot und „kein `'*'` in `cors.ts`".

**Build/Doku**
19. `npm run typecheck && npm run lint && npm run build` grün; `deno check` für alle Functions grün.
20. `docs/security/{IDENTITY_MODEL,TENANT_ISOLATION_MODEL,SECURITY_OVERVIEW}.md` real befüllt; `docs/releases/PHASE_STATUS.md` + `MASTER_INDEX.md` auf WAVE_06-Stand.

---

## 5. Gate (blockierend)

> **WAVE_06-Security-Gate** muss grün sein, bevor WAVE_07 (Staff/Support-Andockung) und insbesondere der reale Cloudflare-/Supabase-Go-Live (Phase 2 Gate **B Security** + **C Tenant-Isolation**) freigegeben werden.

```
GATE WAVE_06:
  ✅ Isolations-Gate grün        (Cross-Org-Negativtest: fremde Org = 0 Zeilen / abgelehnt)
  ✅ force row level security     auf allen schreibenden/sensiblen Tabellen
  ✅ Turnstile serverseitig       (submit-form ohne Token -> 403; mit Token -> ok)
  ✅ Rate-Limit wirksam           (>Limit -> 429; Cloudflare-Rate-Rules dokumentiert)
  ✅ Zod an allen Edge-Grenzen    (ungültig -> 422, nie 500)
  ✅ CORS ohne Wildcard           (Allowlist; localhost-Dev-Fallback nur lokal)
  ✅ Header/CSP gehärtet          (HSTS preload, kein unsafe-eval, frame-ancestors none, object-src none)
  ✅ Secret-Grenze                (kein Secret im Bundle; Hygiene-Gate PASS inkl. VITE_*SECRET*-Verbot)
  ✅ Build/Typen/Deno grün        (typecheck + lint + build + deno check)
```

**Blockierend (kein Merge / kein Deploy ohne):** Isolations-Gate, Turnstile-serverseitig, Secret-Grenze.
**Stop-Regeln dieser Welle:**
- `supabase db push` / `functions deploy` / produktive Secrets / Cloudflare-WAF-/Turnstile-Aktivierung → **STOP**, Owner-Freigabe (Account/Kosten).
- Cross-Org-Negativtest rot → **STOP**: Policy korrigieren, **nie** den Test abschwächen (CLAUDE.md §0.9).
- Echtes Secret in Git-History gefunden → **STOP**, Owner informieren (Rotation/Strategie), kein eigenmächtiger History-Rewrite.
- Jeder `git commit`/`push` → **STOP**, Owner-Freigabe; Co-Author-Zeile anhängen.

---

## 6. Abschlussbericht (Vorlage — nach Ausführung füllen, Format gem. `finalization/99_GOLIVE_GATE.md` Teil 3)

```text
## Abschlussbericht — WAVE_06 Security

### 1. Geprüfte Repo-Bereiche
- Dateien:        app/supabase/migrations/0004_security.sql · app/supabase/functions/_shared/{cors,turnstile,rateLimit}.ts
                  · app/supabase/functions/submit-form/index.ts · create-checkout/index.ts (gehärtet)
                  · app/src/lib/{auth,turnstile}.ts · app/src/vite-env.d.ts · app/public/_headers
                  · app/.env.example · app/supabase/functions/.env.example · scripts/release-hygiene-check.sh
- Routen/Seiten:  Reservierung · Waitlist/Landing · Bewertung · Gesuch · (Owner/Staff Step-up-Hook)
- Edge Functions: submit-form (neu) · create-checkout (Zod/CORS/Rate-Limit) · stripe-webhook (Invariante dokumentiert)
- Tabellen/RLS:   force RLS + rate_limits + rl_hit() ; engere with-check auf reservations/waitlist/reviews
- Tests:          tests/isolation.test.sql (pgTAP) bzw. scripts/isolation-check.mjs · Rate-Limit-/Turnstile-Smoke

### 2. Getroffene Produktentscheidungen
- Öffentliche Mutationen über submit-form kanalisiert (Turnstile+Rate-Limit+Zod), RLS bleibt 2. Verteidigungslinie. (Begründung/Risiko)
- Rate-Limiter fail-open (DoS-Schutz für echte Nutzer), harte Sicherheit via Turnstile/RLS/Signatur unabhängig. (Begründung/Risiko)
- org_id serverseitig abgeleitet statt Client-Wert. (Begründung/Risiko)

### 3. Umgesetzte Änderungen
- Code:      Auth-Schicht, Turnstile-Widget, gehärtete Edge Functions, Origin-Allowlist-CORS
- DB/Migration: 0004_security.sql (force RLS, rate_limits, rl_hit, engere with-check, audit append-only)
- Doku:      docs/security/{IDENTITY_MODEL,TENANT_ISOLATION_MODEL,SECURITY_OVERVIEW}.md
- Tests:     Cross-Org-Negativtest + Rate-Limit-/Turnstile-Smoke

### 4. Aktualisierte Dokumente
- docs/security/*, docs/releases/PHASE_STATUS.md (WAVE_06), MASTER_INDEX.md (Abschnitt 2 ✅)

### 5. Tests und Checks
- Befehl: supabase test db · deno check · npm run build · curl submit-form (403/429) · curl -sI (Header)
- Ergebnis:           <…>
- Offene Fehler:      <…>
- Manuelle Prüfschritte (mit Owner + Datum): Cloudflare Turnstile/WAF/Rate-Rules · Header gegen Live-Domain

### 6. P0/P1-Status
- Gelöst:             RLS-Härtung, Turnstile serverseitig, Rate-Limits, CORS-Allowlist, Header/CSP
- Offen:              Live-Aktivierung (Owner-Freigabe: Secrets, WAF, Deploy)
- Bewusst verschoben: MFA/SSO-Produkt, Build-Nonce statt style 'unsafe-inline' (WAVE_10), Pentest (Phase 2 Gate B)

### 7. Risiken vor Pilot / Enterprise
- (Konkret, mit Schweregrad + Mitigation — z. B. style-src 'unsafe-inline' bis Nonce-Umbau: niedrig, da kein unsafe-eval/script-inline.)

### 8. Welle-übergreifende Erkenntnisse
- Wiederverwendbares Imperium-Muster: Turnstile+Rate-Limit+Zod-„submit-form"-Gateway + DB-Rate-Limiter -> .claude/memory/patterns/ (Owner fragen).

### 9. Nächster sinnvoller Slice
- WAVE_07 (Staff/Support-Andockung: Hof-Verifizierung/Eskalation) — baut auf Auth/Rollen dieser Welle auf.
```

---

## 7. Abhängigkeiten & Referenzen
- **Steuerung/Voice:** `CLAUDE.md` (§0-Direktive, 7 Produktionspfeiler, §0.9 Test-Integrität, Verbote), `AGENTS.md` (service_role nur Edge, RLS deny-by-default), `PHASEN.md` (Phase 1 → WAVE_06; Phase 2 Gates B/C), `MASTER_INDEX.md` (Abschnitt 2 Security & Compliance).
- **Gate-Bezug:** `finalization/99_GOLIVE_GATE.md` Teil 1 **C — Security** (Auth, Turnstile, WAF/Rate-Limits, Zod, RLS) + **G — Public/Privacy**; Teil 2 (Confirm+Reason+Audit, CSRF-/Signaturschutz, Rate-Limit) ; Phase 2 Gate B/C.
- **Reale Artefakte (Bestand, geprüft):** `app/supabase/migrations/{0001_core,0002_payments,0003_marketplace}.sql`, `app/supabase/functions/{_shared/cors.ts,_shared/supabaseAdmin.ts,_shared/stripe.ts,create-checkout/index.ts,stripe-webhook/index.ts,.env.example}`, `app/src/lib/supabase.ts`, `app/src/vite-env.d.ts`, `app/public/_headers`, `app/.env.example`, `app/scripts/release-hygiene-check.sh` (WAVE_01).
- **Vorgänger:** `finalization/WAVE_00_baseline.md` (Token-Kanon, Secret-Grenze, Zero-State), `app/finalization/WAVE_01_release_hygiene.md` (CI, Hygiene-Gate — hier um Turnstile/CORS erweitert).
- **Plattform-Pfeiler dieser Welle:** Tenant-Isolation (RLS deny-by-default + force RLS + Isolationstest) · Identität (Supabase Auth) · Bot-/Missbrauchsschutz (Turnstile serverseitig) · Drosselung (Rate-Limit + WAF) · Header/CSP-Härtung · Secret-Grenze. **Vermittler-Disclaimer** bleibt auf allen Formularen sichtbar.

> Diese Welle ist **additiv** und reversibel bis zum Deploy. Jeder kosten-/außenwirksame Schritt (Supabase-Push/Deploy, Cloudflare-WAF/Turnstile-Aktivierung, produktive Secrets, `git commit`/`push`) wird **vorab in Klartext angekündigt und erst auf Owner-OK ausgeführt.**
