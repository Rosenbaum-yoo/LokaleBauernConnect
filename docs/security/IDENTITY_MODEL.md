# IDENTITY_MODEL — LokaleBauernConnect

> Verbindliches Identitäts-, Authentifizierungs- und Session-Modell der Plattform.
> Stack-fix: **React + Vite + TypeScript (strict)** · **Supabase Auth (GoTrue, EU)** · **Cloudflare** (Pages/Workers/Turnstile/WAF) · **Stripe (+ Connect)**. **Kein Hetzner, kein Self-Host-Docker.**
> Adaptiert aus dem Imperium-Kanon (ConnectCore) auf die **Hof-Domäne** — Express/Redis/SAML-Konzepte des Blueprints sind 1:1 auf **Supabase Auth · JWT/Refresh-Token · Cloudflare Access/OIDC** übersetzt; keine VMS-/Hetzner-Begriffe übernommen.
> Phase 1 · WAVE_06 (Security) · Stand: 2026-06-19
>
> **Goldene Regel (nicht verhandelbar):** Authentifizierung beweist *wer*, Autorisierung lebt in der **DB (RLS, deny-by-default)** — siehe `docs/ROLE_AND_PERMISSION_MODEL.md`. Ein gültiges JWT verleiht **kein** Recht; jede Zeile wird durch RLS gedeckt. Fremde Org = `403`/leer, nie `200` mit Fremddaten (Produktionspfeiler 1).
>
> **Vermittler-Rolle:** Die Plattform vermittelt, verkauft nicht selbst, berät nicht. Kein Identitäts-/Session-Mechanismus darf so interpretiert werden, dass die Plattform Eigenverkauf, Beratung oder Lebensmittel-Haftung übernimmt.
>
> **Bezug:** `CLAUDE.md` (7 Produktionspfeiler · Stop-/Verbots-Regeln) · `AGENTS.md` (harte Regeln) · `PHASEN.md` (WAVE_06 Security · WAVE_07 Staff/Support · WAVE_09 Billing · Phase 4 Track A SB-Bezahlung) · `docs/security/SECURITY_OVERVIEW.md` (§5 Auth, §9 Secrets, §10 Audit) · `docs/ROLE_AND_PERMISSION_MODEL.md` (Rollen/RLS/Plan-Locks) · `docs/security/TENANT_ISOLATION_MODEL.md` · `docs/security/SECRET_ROTATION.md`.
> **Status:** Normativ — Spezifikation für WAVE_06. Implementierungs-Tracker: `docs/releases/PHASE_STATUS.md`.

---

## 0 · Überblick: Soll-Stand (WAVE_06)

| Fähigkeit | Mechanismus (Supabase/Cloudflare/Stripe) | Status | Produktionsreif |
|---|---|---|---|
| **Login E-Mail + Passwort** | Supabase Auth (GoTrue) | Soll WAVE_06 | nach Verdrahtung |
| **Magic Link / OTP (passwortlos)** | Supabase Auth E-Mail-OTP | Soll WAVE_06 | nach Verdrahtung |
| **Session-Management** | Access-JWT (kurzlebig) + rotierendes Refresh-Token | Soll WAVE_06 | nach Verdrahtung |
| **Rollen-Claims (`role`/`org_id`)** | `app_metadata` → JWT-Claim → RLS | Soll WAVE_06 | nach Verdrahtung |
| **Session-Trennung Käufer/Erzeuger/Staff** | getrennte Welten, eine Session = eine Welt | Soll WAVE_06 | nach Verdrahtung |
| **MFA (TOTP, AAL2)** | Supabase MFA | Soll: Pflicht Staff/Owner + Auszahlungs-Erzeuger | nach Verdrahtung |
| **MFA-Enforcement (Step-Up)** | Edge-Function-Gate `requireAAL2` (Audit-only → Enforce) | Soll WAVE_06 | gestaffelt |
| **Recovery Codes** | Supabase MFA Recovery + Owner-Break-Glass | Soll | nach Verdrahtung |
| **SSO/OIDC (Kern, optional)** | Cloudflare Access (OIDC/SAML) ODER Supabase OAuth | 🔒 Soft-Lock (`individuell`-Plan) | **Nein** (Vertrieb-gated) |
| **Gast-Käufer (kontolos)** | signierter Bestätigungs-Token + Turnstile | Soll WAVE_06 | nach Verdrahtung |
| **Break-Glass (Owner-Notfall)** | Confirm + Reason + Risk + append-only Audit, zeitlich begrenzt | Soll | nach Verdrahtung |

> **Aktueller App-Stand:** `app/src/lib/supabase.ts` erzeugt den Client ausschließlich mit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (public, RLS-gebunden). Solange nicht konfiguriert, läuft die App im **Seed-Modus ohne Backend** — keine echten personenbezogenen Daten (ADR 0002). Dieses Dokument ist die Spezifikation für die Verdrahtung in WAVE_06.

---

## 1 · Identitäts-Architektur (Supabase Auth als Provider)

```
Browser (React/Vite)
  │  supabase-js  (nur VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY — public)
  ▼
Supabase Auth / GoTrue (EU-Region)
  │  ➊ Sign-up / Sign-in (E-Mail+Passwort | Magic-Link/OTP)
  │  ➋ MFA-Challenge (TOTP, AAL1 → AAL2)
  │  ➌ JWT (Access, kurzlebig) + Refresh-Token (rotierend, Reuse-Detection)
  ▼
JWT-Claims:  sub=auth.uid()  ·  role(claim)  ·  app_metadata.role  ·  app_metadata.org_id  ·  aal  ·  amr  ·  exp
  │
  ├─▶ Edge Function (Deno): verifiziert JWT-Signatur → liest Claims → Zod → Rechteprüfung → Audit
  └─▶ PostgreSQL RLS: auth.uid() / auth.jwt() ->> 'app_metadata' steuert jede Zeile (deny-by-default)
```

**Single Source of Identity = Supabase `auth.users`.** Anwendungs-Profil + Rolle/Org spiegeln in `public.profiles` (1:1 zu `auth.users.id`). Die **autoritative Rolle/Org** liegt in `auth.users.app_metadata` (nur serverseitig setzbar, fließt in den JWT) — gespiegelt nach `profiles` für joinbare RLS-Helper (`app.current_role()`, `app.current_org_id()` aus `ROLE_AND_PERMISSION_MODEL.md` §3.1).

**Warum `app_metadata`, nicht `user_metadata`?**
`user_metadata` ist vom Client schreibbar → niemals für Sicherheitsentscheidungen. `app_metadata` ist **ausschließlich** über die Admin-API (service role, Edge Function) setzbar und fälschungssicher im JWT. **Rolle/Org leben in `app_metadata`** — Kanon-Verbot: „Rolle ist nie clientseitig setzbar".

---

## 2 · Authentifizierungs-Methoden

### 2.1 E-Mail + Passwort
| Aspekt | Regel |
|---|---|
| Provider | Supabase Auth (GoTrue), EU-Region |
| Passwort-Policy | Mindestlänge ≥ 10, GoTrue „Leaked Password Protection" (HaveIBeenPwned-Range-Check) aktiv |
| E-Mail-Bestätigung | **Pflicht vor erstem privilegierten Zugriff** (Confirm-E-Mail an) — Käufer-Lesepfade bleiben öffentlich, aber Erzeuger-/Staff-Funktionen erfordern verifizierte E-Mail |
| Reset | Supabase „Recovery"-Flow (signierter Link, kurzlebig); Rate-limit + Turnstile (siehe §6) |
| Speicher | Passwort-Hash serverseitig (GoTrue, bcrypt/argon-Klasse) — **nie** bei uns im Klartext/Log |

### 2.2 Magic Link / E-Mail-OTP (passwortlos)
| Aspekt | Regel |
|---|---|
| Einsatz | Primärer, friktionsarmer Pfad für **Käufer** (Favoriten/Saison-Alerts) und Standard-Login-Alternative für Erzeuger |
| Mechanismus | Supabase `signInWithOtp` → 6-stelliger OTP **oder** Magic-Link; serverseitig generiert, kurzlebige Gültigkeit |
| Anti-Abuse | Cloudflare Turnstile vor dem Versand + Rate-Limit (5–10 / 15 Min / IP, §6); kein Token in geloggten URLs |
| Redirect-Allowlist | `redirectTo` strikt auf eigene Origin allow-gelistet (Supabase „Redirect URLs") — kein Open-Redirect |

### 2.3 OAuth (optional, Owner-Entscheidung)
Google/Apple-OAuth über Supabase ist **technisch möglich**, aber bis zur Owner-Freigabe **deaktiviert** (Datenschutz-/Drittland-Abwägung, AVV). Wird OAuth aktiviert: nur EU-konforme Konfiguration, Mapping in `app_metadata`, Audit-Event `auth.oauth_link`.

> **Disclaimer-Kopplung:** Auf allen Auth-Surfaces ist der Vermittler-Hinweis sichtbar (Plattform vermittelt, kein Eigenverkauf) — `docs/COMPLIANCE_MODEL.md`.

---

## 3 · Rollen-Claims & JWT-Struktur

### 3.1 Claims (autoritativ aus `app_metadata`)
| Claim | Quelle | Bedeutung | Verwendung |
|---|---|---|---|
| `sub` | GoTrue | `auth.uid()` | Identität in RLS + Audit `actor_id` |
| `app_metadata.role` | Admin-API (service role) | Enum `user_role`: `kaeufer` · `erzeuger` · `staff` · `owner` | RLS-Helper `app.current_role()`, Edge-Rechteprüfung |
| `app_metadata.org_id` | Admin-API (service role) | Betriebs-Org (Erzeuger) bzw. Plattform-Org (Staff/Owner); `NULL` für Käufer | RLS `app.current_org_id()`, Mandanten-Isolation |
| `aal` | GoTrue | `aal1` (Faktor 1) · `aal2` (MFA bestanden) | Step-Up-Gate für sensible Aktionen (§5) |
| `amr` | GoTrue | Authentifizierungs-Methoden (`password`/`otp`/`totp`) | Audit + Forensik |
| `exp` | GoTrue | Ablauf Access-JWT | Kurzlebigkeit erzwingen |

> **Erzeuger-Subrang** (`org_owner`/`org_member`) liegt **nicht** im JWT, sondern in `public.org_members` und wird per RLS-Helper `app.is_org_owner(org_id)` geprüft (Org-lokal, joinbar) — siehe `ROLE_AND_PERMISSION_MODEL.md` §1/§3. So bleibt der JWT schlank und ein Rang-Wechsel wirkt **sofort** (kein Token-Refresh nötig).

### 3.2 Claim-Vergabe (nur serverseitig, auditiert)
- Bei Sign-up wird per Supabase **Auth-Hook / Edge Function** ein `profiles`-Datensatz angelegt; Default-Rolle = `kaeufer` (kontolos/registriert) bzw. `erzeuger` im Erzeuger-Onboarding (`org_id` erst nach Org-Erstellung). Hinweis Ist-Stand: `profiles.role` hat in `0001_core.sql` den Default `'kaeufer'`; das Anlegen privilegierter Rollen erfolgt nur via `service_role`.
- `role`/`org_id` in `app_metadata` werden **ausschließlich** über die Admin-API (service role, Edge Function, `reason`+Audit) gesetzt — niemals vom Client. Self-Service-Privilege-Escalation ist strukturell unmöglich.
- Rollen-/Org-Änderung → Audit-Event `identity.role_changed` / `identity.org_assigned` (wer/was/warum/Risk).
- **Konsistenz-Invariante:** `auth.users.app_metadata.{role,org_id}` und `public.profiles.{role,org_id}` werden in **einer** Edge-Function-Transaktion gesetzt (Spiegel nie divergent); RLS vertraut der DB-Spalte, Edge dem JWT — beide stammen aus derselben Quelle.

### 3.3 RLS-Anbindung (Auszug — kanonisch in `ROLE_AND_PERMISSION_MODEL.md` §3.1)
```sql
-- Rolle aus dem JWT-app_metadata (fälschungssicher), Fallback auf Profil-Spiegel
create or replace function app.current_role() returns text
  language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb
           #>> '{app_metadata,role}', ''),
    (select role from public.profiles where user_id = auth.uid())
  )
$$;
```
> RLS bleibt die Autorität; der JWT-Claim ist nur das **Transportmittel** der Identität, keine Berechtigung an sich.

---

## 4 · Session-Trennung: Käufer · Erzeuger · Staff/Owner (Drei Welten)

**Kanon (`CLAUDE.md` „Kritische Produkt-Abgrenzung"):** Käufer-, Erzeuger-, Staff-Welt sind strikt getrennt — **Session + Berechtigung**. Eine natürliche Person darf mehrere Accounts haben, aber **eine Session = eine Welt**. Fehlende Trennbarkeit ist eine **Stop-Regel**.

### 4.1 Trennungs-Garantien
| Welt | Rolle(n) | Storage-Key (isoliert) | Einstieg | Trennung von |
|---|---|---|---|---|
| **Käufer-Welt** | `buyer` (+ Gast) | `sb-buyer-auth` | `/`, `/finder`, `/konto` | Erzeuger-, Staff-Welt |
| **Erzeuger-Welt** | `producer` | `sb-producer-auth` | `/erzeuger/*` | Käufer-, Staff-Welt |
| **Staff/Owner-Welt** | `staff` · `owner` | `sb-staff-auth` | `/staff/*`, `/owner/*` | Käufer-, Erzeuger-Welt |

- **Isolierter Token-Store:** Pro Welt ein eigener `supabase-js`-Client mit eigenem `storageKey` (kein gemeinsamer `localStorage`-Slot). Ein Käufer-Cookie/Token öffnet **keine** Erzeuger-/Staff-Oberfläche; Edge/RLS prüfen zusätzlich `role` — die UI-Trennung ist Defense-in-Depth, nie alleinige Grenze.
- **Routen-Guard (spiegelnd):** Welt-fremde Route → Redirect auf die korrekte Welt-Anmeldung (kein „leerer" Zustand, kein 500). Autoritativ entscheidet der Bootstrap-Response (Rolle/Org/Entitlements, serverseitig erzeugt) — `ROLE_AND_PERMISSION_MODEL.md` §4.
- **Keine Welten-Eskalation im JWT:** Da `role` aus `app_metadata` stammt und nur serverseitig setzbar ist, kann ein kompromittierter Käufer-Token nie zur Staff-Welt „aufgewertet" werden.

### 4.2 Session-Parameter (alle Welten)
| Parameter | Wert | Begründung |
|---|---|---|
| Access-JWT-Lebensdauer | kurzlebig (Default 1 h) | minimiert Diebstahl-Fenster |
| Refresh-Token | rotierend, **Reuse-Detection** | gestohlenes Token wird bei Reuse invalidiert (ganze Familie revoked) |
| Token-Transport | `connect-src` ausschließlich Supabase/Stripe (CSP, `SECURITY_OVERVIEW.md` §2); **kein Token in URL/Log** | Leak-Schutz |
| Persistenz | `persistSession` an, `autoRefreshToken` an; Token nicht in DOM | nahtlose Sessions ohne Leak |
| Idle/Absolute-Timeout | Käufer großzügig; Erzeuger Standard; **Staff/Owner kurz** + MFA-Step-Up | Risiko-proportional |

### 4.3 Gast-Käufer (kontolos)
- Reservierung **ohne Konto** erlaubt: Turnstile-geschützte Edge Function legt `reservations`-Zeile an, gibt **signierten Bestätigungs-Token** zurück (HMAC, kurzlebig, an Reservierung gebunden).
- Einsicht/Storno einer Gast-Reservierung **nur** per Token-Match (RLS: `buyer_id = auth.uid()` **ODER** Gast-Token-Match) — **keine** Auflistung fremder Reservierungen (`ROLE_AND_PERMISSION_MODEL.md` §3.2).
- Gast hat **keine** `app_metadata`-Rolle und **keinen** Welt-Zugang über Käufer-Lesepfade hinaus.

---

## 5 · MFA (TOTP / AAL2) & Step-Up

### 5.1 Pflicht-Matrix
| Personenkreis | MFA | Durchsetzung |
|---|---|---|
| **Owner** | **Pflicht** | AAL2 für jede Owner-Steuerungsaktion (Preise/Pläne/Flags/Migration/Export) + Break-Glass |
| **Staff** | **Pflicht** | AAL2 für Verifizierung/Moderation/Account-Sperre/Support-Mutation |
| **Erzeuger mit Auszahlungs-/SB-Rechten** (`org_owner`, Plan `pro`+) | **Pflicht** vor Stripe-Connect-Verbindung & SB-Einnahmen-Einsicht | AAL2 |
| Erzeuger ohne Auszahlung (`org_member`) | empfohlen | Step-Up nur für sensible Aktionen |
| Käufer | optional | Self-Service Opt-in |

### 5.2 Mechanismus
- **TOTP (RFC 6238)** via Supabase MFA (`mfa.enroll` → QR/Secret → `mfa.challenge` → `mfa.verify`), kompatibel mit gängigen Authenticator-Apps. Secret wird **serverseitig** von Supabase verwaltet — **nie** bei uns gespeichert/geloggt.
- Nach erfolgreicher Verifikation steigt die Session auf **`aal2`** (im JWT-Claim `aal`). Sensible Edge Functions/RLS-Pfade verlangen `aal2`.
- **Recovery Codes** bei Aktivierung (einmalig anzeigen, gehasht); Verbrauch auditiert. Verlust → Owner-gestützter, auditierter Reset (Break-Glass, §7).

### 5.3 Step-Up-Enforcement (Edge-Function-Gate `requireAAL2`)
Analog zum Blueprint-`requireMfa`, hier als **Deno-Edge-Function-Guard** (kein Express). Reihenfolge: `verifyJwt → requireAAL2 → requireRole/Org → Zod → Handler → Audit`.

```ts
// app/supabase/functions/_shared/requireAAL2.ts  (Soll, WAVE_06)
export function requireAAL2(claims: JwtClaims, { enforce = true } = {}) {
  const aal = claims.aal ?? "aal1";
  if (aal === "aal2") return { ok: true } as const;
  if (!enforce) {
    audit("identity.mfa_step_up_missing", { actor: claims.sub, mode: "audit_only" });
    return { ok: true, warned: true } as const;   // Audit-only-Rollout
  }
  // Faktor nicht eingerichtet vs. Session nicht hochgestuft sauber trennen:
  return claims.amr?.includes("totp")
    ? { ok: false, code: "MFA_VERIFY_REQUIRED",  status: 401 } as const
    : { ok: false, code: "MFA_ENROLL_REQUIRED",  status: 428 } as const;
}
```

| Ergebnis | Code | UI-Reaktion |
|---|---|---|
| AAL2 vorhanden | — | `next()` |
| MFA nicht eingerichtet | `428 MFA_ENROLL_REQUIRED` | Enrollment-Flow öffnen (kein toter Zustand) |
| MFA eingerichtet, Session nicht hochgestuft | `401 MFA_VERIFY_REQUIRED` | Step-Up-Challenge anstoßen |

### 5.4 Gestaffelter Rollout (Owner-Entscheidung)
| Phase | Modus | Geltung | Dauer |
|---|---|---|---|
| **A — Audit-only** | `enforce:false` | Staff/Owner/Auszahlungs-Erzeuger; Banner „MFA-Pflicht ab [Datum]" | Enrollmentfrist (Empf. 14–30 Tage; intern Minimum 7) |
| **B — Enforce** | `enforce:true` (Default) | dieselben Routen; Login ohne MFA → Enrollment-Zwang | ab Stichtag |

> **Webhooks/Server-to-Server-Endpunkte erhalten NIE ein MFA-Gate** (kein Session-Kontext): Stripe-Webhook, Supabase-Auth-Hooks. Diese sichern sich über **Signaturprüfung + Idempotenz** (`SECURITY_OVERVIEW.md` §8). Auth-Endpunkte selbst (Login/OTP/Reset) tragen ebenfalls kein MFA-Gate.

---

## 6 · Schutz der Auth-Endpunkte (Anti-Abuse)

| Endpunkt | Turnstile | Rate-Limit (Cloudflare + Edge) | Weitere |
|---|---|---|---|
| Login (Passwort) | — (Edge-Login) | 5–10 / 15 Min / IP | Leaked-Password-Schutz, generische Fehlermeldung (kein User-Enum) |
| Sign-up / Magic-Link / OTP-Versand | **Pflicht** | 5–10 / 15 Min / IP | Redirect-Allowlist; kein Token-Leak in Logs |
| Passwort-Reset | **Pflicht** | 5 / 15 Min / IP | Existenz-neutrale Antwort („Falls ein Konto existiert …") |
| Gast-Reservierung (kontolos) | **Pflicht** | 30 / 10 Min / IP | signierter Bestätigungs-Token |
| MFA-Verify | — | 10 / 5 Min / `auth.uid()` | Brute-Force-Schutz auf 6-stelligen OTP |

Turnstile-Token wird **serverseitig** in der Edge Function gegen `challenges.cloudflare.com/turnstile/v0/siteverify` geprüft (Secret nur Edge-Env) — kein Vertrauen in Client-Verifikation (`SECURITY_OVERVIEW.md` §3). Rate-Limit-Store ist Cloudflare-nativ am Edge bzw. kurzlebiger Zähler (kein In-Memory-Single-Instance, da serverless).

---

## 7 · Break-Glass (Owner-Notfallzugang)

Für den seltenen Fall, dass regulärer privilegierter Zugang ausfällt (z. B. MFA-Gerät verloren, Lockout, Incident-Response).

| Eigenschaft | Regel |
|---|---|
| **Auslöser** | Nur **Owner** (oberste Instanz, `ROLE_AND_PERMISSION_MODEL.md` §1) |
| **Pflicht-Gate** | **Confirm + Reason (Pflicht) + Risk-Level** — keine stille Aktivierung |
| **Zeitliche Begrenzung** | Token/Erhöhung **zeitlich befristet** (Soll: ≤ 30 Min), danach automatischer Verfall |
| **Audit** | append-only `audit_log`, Event `identity.break_glass.*` (open/use/close), unabschaltbar, `before/after`-Snapshot sensibler Felder |
| **Geltungsbereich** | minimal-invasiv: gezielter MFA-Reset eines gesperrten Accounts bzw. Notfall-Lesezugriff — **kein** Dauer-Vollzugriff |
| **Nachgang** | Pflicht-Review nach jeder Nutzung; Eintrag in `INCIDENT_RUNBOOK.md` (geplant); ggf. Secret-Rotation (`SECRET_ROTATION.md`) |
| **Technik** | service-role-Aktion **nur** in dedizierter Edge Function; **keine** dauerhaften Bypass-/Auth-Flags in Production (Kanon-Verbot) |

> **Stop-Regel (Kanon):** „SSO-Enforce ohne Break-Glass" ist explizit untersagt. Ein erzwungener SSO-/MFA-Pfad **muss** dieses dokumentierte Break-Glass-Protokoll haben, sonst wird er nicht scharf geschaltet.

---

## 8 · SSO / OIDC (Kern, Soft-Lock — nur `individuell`)

### 8.1 Soft-Lock-Begründung
SSO ist **nicht produktionsreif** und darf Kunden gegenüber **nicht als live** verkauft werden. Es ist ein Kern-Feature des Imperiums, das LokaleBauernConnect **andockt**, nicht selbst neu baut — vorgesehen für `individuell`-Plan-Erzeuger (z. B. größere Erzeugergemeinschaften/Genossenschaften).

### 8.2 Empfohlener Weg im fixen Stack
- **Primär: Cloudflare Access (OIDC/SAML)** vor den geschützten Erzeuger-/Staff-Routen — passt ohne fremde Node-SAML-Dependency in den Cloudflare-Stack; Identitäts-Assertion wird in der Edge Function verifiziert und auf `app_metadata` gemappt.
- **Alternativ: Supabase OAuth/OIDC-Provider** (org-domänenbasiertes Routing).
- **Verboten:** Stub-/Fake-Erfolg. Solange nicht freigegeben, liefert der SSO-Pfad sauber `SSO_NOT_AVAILABLE` (kein Stub-Login), die UI zeigt „SSO anfragen" **nur** bei Plan `individuell` (echter Status, kein Fake-Card — `ROLE_AND_PERMISSION_MODEL.md` §5).

### 8.3 Aktivierungs-Voraussetzungen (Owner-Auftrag)
1. Owner-Freigabe + ADR (`.claude/memory/decisions/`).
2. IdP-Metadaten (Entity-ID, SSO-URL, Zertifikat) je Org.
3. Attribut-Mapping → `app_metadata.{role,org_id}` (E-Mail/Name).
4. Domänen-basiertes Org-Auto-Routing.
5. End-to-End-Test gegen echten IdP (Azure AD / Okta / Keycloak).
6. Audit-Events `identity.sso.login` / `identity.sso.provisioning`.
7. **Break-Glass-Pfad verifiziert** (§7) — sonst kein Enforce.

---

## 9 · Identity-relevante Audit-Events (Namespace `identity.*` / `auth.*`)

Append-only `audit_log` (nur service role, `ROLE_AND_PERMISSION_MODEL.md` §7). `reason` Pflicht bei kritischen Aktionen.

| Event | Trigger | reason-Pflicht |
|---|---|---|
| `auth.login` / `auth.logout` | erfolgreicher Login / Logout | — |
| `auth.login_failed` | fehlgeschlagener Login (ohne PII-Leak) | — |
| `auth.otp_sent` / `auth.magic_link_sent` | OTP/Magic-Link versandt | — |
| `auth.password_reset` | Reset angefordert/abgeschlossen | — |
| `identity.mfa_enroll` / `identity.mfa_verify` / `identity.mfa_disable` | MFA-Lebenszyklus | bei `disable` |
| `identity.mfa_step_up_missing` | AAL2-Gate ausgelöst (Audit-only & Enforce) | — |
| `identity.role_changed` / `identity.org_assigned` | Rolle/Org in `app_metadata` gesetzt | **ja** |
| `identity.break_glass.open/use/close` | Owner-Notfallzugang | **ja** (+ Risk) |
| `identity.sso.login` / `identity.sso.provisioning` | SSO (sobald scharf) | — |
| `auth.session_revoked` | Refresh-Reuse-Detection / manueller Revoke | — |

---

## 10 · Offene Owner-Entscheidungen

| ID | Entscheidung | Priorität |
|---|---|---|
| ID-01 | MFA-Enforce-Stichtag für Staff/Owner (Phase B) festlegen | HOCH |
| ID-02 | MFA-Pflicht für Auszahlungs-Erzeuger **vor** erster SB-Connect-Verbindung bestätigen (Phase 4 Track A) | HOCH |
| ID-03 | Enrollmentfrist (14 vs. 30 Tage) | MITTEL |
| ID-04 | OAuth (Google/Apple) aktivieren? (Datenschutz/AVV-Abwägung) | MITTEL |
| ID-05 | SSO produktiv (Cloudflare Access vs. Supabase OIDC) — Option A vs. dauerhaft Soft-Lock | MITTEL |
| ID-06 | Break-Glass-Maximaldauer (≤ 30 Min) + Review-Verantwortliche | HOCH |

---

## 11 · Verifikations-Checkliste (WAVE_06 „Security")

- [ ] `app_metadata.{role,org_id}` ist **nur** serverseitig (Admin-API/Edge) setzbar; `user_metadata` wird für **keine** Sicherheitsentscheidung gelesen.
- [ ] `profiles.{role,org_id}` und `auth.users.app_metadata` werden in **einer** Edge-Transaktion gesetzt (kein divergenter Spiegel).
- [ ] Drei Welten getrennt: eigener `storageKey` je Welt; Welt-fremder Token öffnet keine fremde Oberfläche; RLS prüft `role` zusätzlich.
- [ ] Access-JWT kurzlebig, Refresh rotierend mit Reuse-Detection; kein Token in URL/DOM/Log.
- [ ] E-Mail-Bestätigung Pflicht vor privilegiertem Zugriff; Magic-Link/OTP mit Turnstile + Rate-Limit + Redirect-Allowlist.
- [ ] MFA-Pflicht Staff/Owner + Auszahlungs-Erzeuger; `requireAAL2`-Gate als Audit-only → Enforce; `428`/`401` sauber getrennt.
- [ ] Webhooks/Auth-Endpunkte tragen **kein** MFA-Gate; Stripe-Webhook signaturgeprüft + idempotent.
- [ ] Gast-Reservierung nur per signiertem Token einsehbar/stornierbar; keine Auflistung fremder Reservierungen.
- [ ] Break-Glass: Owner-only, Confirm+Reason+Risk, zeitlich befristet, append-only Audit, kein Dauer-Bypass-Flag.
- [ ] SSO: kein Stub-Login in Prod; UI „SSO anfragen" nur bei `individuell`; Enforce nur mit verifiziertem Break-Glass.
- [ ] Alle Identity-Events landen in `audit_log` (append-only) mit reason-Pflicht bei kritischen Aktionen.
- [ ] Service-Role-Key ausschließlich in Edge Functions; Frontend nur `VITE_`-Public-Keys (`SECURITY_OVERVIEW.md` §9).

---

> **Änderungen** an diesem Modell sind Architektur-/Security-relevant → **Owner-Freigabe** + ADR in `.claude/memory/decisions/` + Update in `MASTER_INDEX.md` und `docs/releases/PHASE_STATUS.md`.

*Letzte Aktualisierung: Phase 1 · WAVE_06 · 2026-06-19*
*Zuständig: Security (Claude) · Freigabe: Owner*
*Querverweise: `docs/security/SECURITY_OVERVIEW.md` · `docs/ROLE_AND_PERMISSION_MODEL.md` · `docs/security/TENANT_ISOLATION_MODEL.md` · `docs/security/SECRET_ROTATION.md` · `docs/COMPLIANCE_MODEL.md` · `docs/adr/0001…`, `0002…`*
