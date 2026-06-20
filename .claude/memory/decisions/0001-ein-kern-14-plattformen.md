# ADR 0001 — Ein Kern, 14 Plattformen (Wiederverwendung statt Wiederholung)

- **Status:** Akzeptiert (Imperium-Grundgesetz) · **Datum:** 2026-06-19

**Kontext:** ConnectCore-Imperium = EIN gemeinsamer Kern + 14 Tochter-Plattformen. LokaleBauernConnect = Welle 1, Klasse C.

**Entscheidung:** Kern-Funktionen (Auth, Rollen, Tenancy, Matching, Chat, Bewertungen, Billing-Mechanik, Benachrichtigungen, Staff-/Support-Center, Audit) werden **nie pro Plattform neu gebaut**, nur angedockt. Diese Plattform baut ausschließlich die Spezialschicht.

**Konsequenz:** Jedes Pattern muss in 20+ Projekten funktionieren. Tempo durch „Fundament einmal, dann Spezialschicht". Muster wandern nach `patterns/` und beschleunigen Folge-Plattformen.
