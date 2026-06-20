# LokaleBauernConnect — AGENTS.md (Projekt-Subagenten & harte Regeln)

> Projektweite harte Regeln + Subagenten-Roster. Adaptiert aus TempConnect/Imperium (`_CLAUDE_CODE/01_AGENTS_MD.md`). BBQ-Original unangetastet.
> Globale Engineering-Standards: `@C:\Users\DennisStegemann\AGENTS.md`. Konflikt: User > AGENTS > Subagent > CLAUDE.md.

## Harte Regeln (immer aktiv)
- Secrets nie in Dateien/Log — nur Env. service role nur in Edge Functions, Frontend nur `VITE_`-Public.
- SQL nur als neue Migration (`app/supabase/migrations/`), additiv, RLS deny-by-default + Isolationstest.
- Kein Commit ohne Owner-Freigabe; Co-Author-Zeile anhängen.
- Backend/RLS ist führend bei Berechtigungen; Frontend spiegelt nur. Zod an allen Eingangsgrenzen.
- Keine hardcodierten Farben (Design-System-Tokens), keine Deko-Emojis in Prod-UI, deutsche Code-Kommentare.
- Stack fix: React+Vite+TS · Supabase · Cloudflare · Stripe. Kein Hetzner/Docker.

## Subagenten (imperiumsweit, projektgenutzt — `.claude/agents/<name>.md`)
| Agent | Aufgabe |
|---|---|
| **architekt** | Modulschnitt, Kern-vs-Spezial-Grenze, Datenfluss. Wacht: nichts pro Plattform bauen, was in den Kern gehört. |
| **core-guardian** | Schützt geteilte Kern-/UI-Patterns vor Duplikation; Design-System unverletzt. |
| **db-rls-spezialist** | Schema, additive Migrationen, RLS-Policies, Isolationstest (Plattform + Org). Kein Merge ohne grünen Isolationstest. |
| **payment-engineer** | Stripe + Connect + **SB-Bezahl-USP**. EIN idempotenter, signaturgeprüfter Webhook. Entitlements serverseitig. |
| **compliance-officer** | DSGVO, Lebensmittel-Kennzeichnungs-Hinweis, Audit, Vermittler-Disclaimer. Keine Reste. |
| **security-auditor** (read-only) | Secrets im Client, RLS-Lücken, service-role-Missbrauch, ungeprüfte Eingaben, Webhook ohne Signatur. Meldet, ändert nicht. |
| **frontend-design-guardian** | Jede UI exakt im Editorial-Token-/Komponenten-System. Keine neuen Farben/Fonts. |
| **edge-functions-spezialist** | Supabase Edge Functions (Deno): Zod, Rechteprüfung, service role nur hier, Audit, Turnstile. |
| **qa-tester** | Unit/Integration/E2E. Pflicht: Isolationstest, Webhook-Idempotenz, Entitlement-Gates, Pflichtfelder. |
| **devops** | Cloudflare Pages/Workers/Turnstile/WAF, CI/CD, Isolationstest als blockierendes Gate, Rollback. |
| **platform-onboarder** | Führt neue Strecken durchs Playbook; stellt sicher, dass nur Spezial-Schicht gebaut wird. |
| **i18n-content-spezialist** | Deutsche Inhalte, Kategorien-Seed, Mikrocopy im Markenton (Editorial/regional), Trust-/Help-Texte. |
| **performance-cost-optimizer** | Ladezeit, Queries, Caching + Kosten (Cloudflare/Supabase). Günstige Muster ohne Sicherheits-/Designverlust. |

## Delegationsregeln
- UI-Arbeit → **frontend-design-guardian** prüft.
- DB/Tabellen → **db-rls-spezialist**, dann **qa-tester** (Isolationstest).
- Zahlungen → **payment-engineer** + **edge-functions-spezialist**, dann **security-auditor**.
- Neue Strecke/Welle → **platform-onboarder** steuert.
- Vor jedem Merge → **qa-tester**; bei sensiblen Änderungen **security-auditor**.
- Architekturfrage → **architekt**; Ergebnis als ADR ins Memory.

## Memory-/Lern-System (`.claude/memory/`)
`INDEX.md` · `decisions/` (ADRs) · `learnings/` (datiert) · `patterns/` (wiederverwendbar) · `glossary.md` · `open-questions.md`.
**Lern-Loop:** VOR Aufgabe lesen → ausführen → NACH Aufgabe ADR/learning/pattern + INDEX + Tracker aktualisieren. Widerlegte Annahme korrigieren, nicht duplizieren.
