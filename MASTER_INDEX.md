# MASTER_INDEX — LokaleBauernConnect (Doku- & Bauplan-Landkarte)

> Die vollständige Soll-Struktur, abgeleitet aus TempConnects ~310-Doku-Set, **auf diese Plattform + Stack gemappt** (Anordnung wie TempConnect, Inhalte überschrieben). Ziel: **mindestens gleicher Umfang**. Status je Datei transparent — „abwägen pro Datei" sichtbar gemacht.
>
> **Legende:** ✅ vorhanden · 🔨 in Arbeit · ⬜ geplant (zu erstellen) · ➖ entfällt (TempConnect/VMS-spezifisch, durch LokaleBauern-Äquivalent ersetzt).
> Quelle/Basis je Datei = die gleichnamige aktuellste TempConnect-Datei (überschriebene Kopie). BBQ-Originale unangetastet.
>
> **✅ Stand 2026-06-20 — Bulk erzeugt + verifiziert (Multi-Agent-Workflow):** `docs/` = **43 Dateien**, `finalization/` = **42 Dateien** (Regeln/Gates + WAVE_00–15 + Phasen 2–5). Adversariale Verify-Kritiker haben TempConnect/VMS-Provenienz-Reste entfernt und einen **Enum-Widerspruch** (`profiles.role`) kanonisch vereinheitlicht: deutsches Enum **`user_role`** mit **vier** Werten `kaeufer|erzeuger|staff|owner` (Migration `0001_core.sql`); **Owner = eigener `user_role`-Wert `'owner'`** — kein `org_role`-Rang, kein `platform_owner`. `org_members.role` ist ebenfalls Typ `user_role` (Default `'erzeuger'`). Dateien lagen teils unter `app/docs`/`app/finalization` (Agenten-cwd-Drift) → nach Root konsolidiert. **Offen (Owner, vor Go-Live):** `[[OWNER:…]]`-Felder in den Rechtstexten (`docs/launch/B_rechtstexte/*`) ausfüllen + anwaltliche Prüfung.

## 0 · Governance & Steuerung
| Soll-Datei | Status | Basis (TempConnect) |
|---|---|---|
| `CLAUDE.md` | ✅ | `CLAUDE.md` (2026-06-09) |
| `AGENTS.md` | ✅ | `AGENTS.md` + `_CLAUDE_CODE/01` |
| `PHASEN.md` | ✅ | `finalization/PHASES.md` |
| `MASTER_INDEX.md` | ✅ | `finalization/SPECIAL_file_inventory.md` |
| `.claude/agents/*` (13) | ✅ | `_CLAUDE_CODE/01_AGENTS_MD.md` |
| `.claude/CLAUDE_RECS.md` | ✅ | `.claude/CLAUDE_RECS.md` |
| `.claude/memory/` (INDEX + 3 ADRs ✅; learnings/patterns/glossary/open-questions ⬜) | 🔨 | `_CLAUDE_CODE` Memory-System |
| `.claude/learning/` (insights_inbox ✅, config ✅; proposals/applied_log ⬜) | 🔨 | `phase5_scale/SELF_UPDATING_CLAUDE_MD.md` |

## 1 · Architektur
| Soll-Datei | Status |
|---|---|
| `docs/ARCHITEKTUR.md` (Übersicht: React/Vite, Supabase, Cloudflare, Datenfluss) | ⬜ |
| `docs/ENTERPRISE_ARCHITECTURE.md` (Skalierung, Mandanten, Edge) | ⬜ |
| `docs/DATABASE_MODEL.md` (Tabellen, RLS, Relationen) | ⬜ |
| `docs/ROLE_AND_PERMISSION_MODEL.md` (Käufer/Erzeuger/Staff) | ⬜ |
| `docs/CORE_BUSINESS_STATE_MACHINES.md` (Reservierung, Verfügbarkeit) | ⬜ |
| `docs/adr/0001…` (Stack), `0002…` (App-Architektur) | ✅ |

## 2 · Security & Compliance
| Soll-Datei | Status |
|---|---|
| `docs/security/SECURITY_OVERVIEW.md` | ⬜ |
| `docs/security/TENANT_ISOLATION_MODEL.md` (RLS + Isolationstest) | ⬜ |
| `docs/security/IDENTITY_MODEL.md` (Supabase Auth/MFA/SSO) | ⬜ |
| `docs/security/SECRET_ROTATION.md` | ⬜ |
| `docs/COMPLIANCE_MODEL.md` (DSGVO, Lebensmittel-Hinweis, Vermittler) | ⬜ |
| `docs/launch/B_rechtstexte/{impressum,datenschutz,agb,avv-toms}.md` | ⬜ |

## 3 · Produkt & Spezialmodule
| Soll-Datei | Status |
|---|---|
| `docs/PLATFORM_OVERVIEW.md` | ⬜ |
| `docs/spezialmodule/HOFLADEN_FINDER.md` | ✅ implementiert (Doku ⬜) |
| `docs/spezialmodule/PRODUKTVERFUEGBARKEIT.md` | ⬜ |
| `docs/spezialmodule/RESERVIERUNG_ABHOLUNG.md` | ✅ implementiert (Doku ⬜) |
| `docs/spezialmodule/SAISON_RADAR.md` | ⬜ |
| `docs/spezialmodule/SB_BEZAHLUNG_USP.md` ⭐ | ⬜ |
| `docs/ONBOARDING_SYSTEM.md` (Erzeuger) | ⬜ |
| `docs/product/{PLANS_AND_LIMITS,TERMINOLOGY_GUIDE,ROLE_FEATURE_MATRIX}.md` | ⬜ |
| ➖ VENDOR_POOL · REQUISITION_WORKFLOW · EINSATZPORTAL · CAPACITY_* · MATCHING_ENGINE (VMS) | ➖ ersetzt durch obige |

## 4 · Commercial & Billing
| Soll-Datei | Status |
|---|---|
| `docs/PRICING.md` (Erzeuger-Abo + SB-Transaktionsgebühr) | ⬜ |
| `docs/SUBSCRIPTION_LIFECYCLE.md` | ⬜ |
| `docs/STRIPE-SETUP.md` (+ Connect, SB-Payment) | ⬜ |
| `docs/COMMERCIAL_SOURCE_OF_TRUTH.md` | ⬜ |

## 5 · Operations & Deployment (Cloudflare/Supabase — *ersetzt Hetzner*)
| Soll-Datei | Status |
|---|---|
| `docs/DEPLOYMENT.md` (Cloudflare Pages/Workers) | ⬜ |
| `docs/engineering/OPERATIONS_RUNBOOK.md` | ⬜ |
| `docs/BACKUP_DISASTER_RECOVERY.md` (Supabase) | ⬜ |
| `docs/INCIDENT_RUNBOOK.md` | ✅ |
| `docs/MONITORING.md` / `docs/OBSERVABILITY.md` | ⬜ |
| ➖ DEPLOYMENT_HETZNER · PROD_HETZNER · HETZNER_HA_RUNBOOK | ➖ entfällt (kein Hetzner) |

## 6 · Testing & QA
| Soll-Datei | Status |
|---|---|
| `docs/engineering/TESTING.md` | ⬜ |
| `docs/GO_LIVE_TEST_MATRIX.md` | ⬜ |
| `docs/enterprise_pack/TENANT_ISOLATION_TESTS.md` | ⬜ |

## 7 · Finalisierung & Releases (Wellen/Gates)
| Soll-Datei | Status |
|---|---|
| `finalization/00_RULES.md` · `01_PRIORITIES.md` · `99_GOLIVE_GATE.md` | ✅ |
| `finalization/WAVE_00…15_*.md` (16 Wellen, adaptiert) | ✅ |
| `finalization/phase2_release/{WAVES,GATES,MASTERPROMPT}.md` | ✅ |
| `finalization/phase4_vertical/{TRACK_A_SB_PAYMENT,TRACK_B_KARTE,…}.md` | ✅ |
| `finalization/phase5_scale/{PHASES_A_TO_R,CUSTOMER_GATES,SELF_UPDATING_CLAUDE_MD}.md` | ✅ |
| `docs/releases/PHASE_STATUS.md` | ✅ |
| `docs/finalization/10_300_customer_readiness_matrix.md` | ⬜ |

## 8 · Marketing & Launch
| Soll-Datei | Status |
|---|---|
| `web/index.html` (Editorial-Landing) | ✅ |
| `docs/MARKTSTART_PLAN.md` | ⬜ |
| `docs/SALES_DEMO_PATH.md` | ⬜ |

---

## Reihenfolge der Erstellung (Rekordzeit)
1. **Spielbar zuerst:** Phase 1 WAVE_02 (Datenmodell+RLS) → WAVE_04 echte Daten → Phase 2 Deploy.
2. **Governance/Memory fertig:** `.claude/agents`, `.claude/memory`, `CLAUDE_RECS`.
3. **Doku-Tiefe entlang der Wellen** — jede Welle liefert ihre Doku mit (kein nachgelagerter Doku-Berg).
4. **USP-Strecke (SB-Bezahlung)** als Track A, sobald Auth+Billing stehen.

> Pro Datei gilt „abwägen": ➖-Einträge sind bewusst entfallen (VMS/Hetzner), nicht vergessen. Neue Unsicherheit → fragen statt raten.
