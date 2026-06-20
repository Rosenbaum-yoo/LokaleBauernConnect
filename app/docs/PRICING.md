# Pricing — LokaleBauernConnect

> Kanon: `docs/COMMERCIAL_SOURCE_OF_TRUTH.md`. Bei Konflikt gewinnt der echte Code.

## Erzeuger-Abo-Pläne
Im DB-Constraint erlaubt (`subscriptions.plan`, `supabase/migrations/0002_payments.sql`):

| Plan | Checkout-fähig | Stripe Price-ID Secret | Preis | Features |
|---|---|---|---|---|
| `demo` | nein (keine Price-ID) | — | [[OWNER: festlegen]] | [[OWNER: festlegen]] |
| `basis` | ja | `STRIPE_PRICE_BASIS` | [[OWNER: festlegen]] | [[OWNER: festlegen]] |
| `plus` | ja | `STRIPE_PRICE_PLUS` | [[OWNER: festlegen]] | [[OWNER: festlegen]] |
| `pro` | ja | `STRIPE_PRICE_PRO` | [[OWNER: festlegen]] | [[OWNER: festlegen]] |
| `individuell` | nein (keine Price-ID) | — | [[OWNER: auf Anfrage]] | [[OWNER: festlegen]] |

> `demo` und `individuell` sind im Datenmodell vorgesehen, aber **nicht** über Self-Service-Checkout buchbar
> (`priceIdForPlan` in `supabase/functions/_shared/stripe.ts` kennt nur `basis`/`plus`/`pro`).
> Ein `subscription`-Checkout ohne konfigurierte Price-ID liefert `plan_not_configured` (HTTP 400).
> Default-Plan: `basis`.

Die konkreten Preise stehen **nicht im Code** — nur die Stripe-Price-IDs werden als Function-Secrets hinterlegt.
Preisbeträge, Abrechnungsintervall und Feature-Zuordnung sind in Stripe (Products/Prices) bzw. hier durch den Owner zu pflegen.

## SB-Zahlung (unbemannter Hofladen-Stand)
Keine Plan-Preise — der Betrag ergibt sich **serverseitig** aus `products.price` (× Menge, in Cent).
Menge je Position: 1–50. Währung: `eur`. Modi: `sb_payment` (Einzelprodukt), `sb_basket` (Warenkorb).
Siehe `supabase/functions/create-checkout/index.ts`.

## Währung & Steuern
- Währung: `eur` (hartkodiert in `create-checkout` und DB-Default `sb_payments.currency`).
- Steuerbehandlung / Kleinunternehmer / USt-Ausweis: [[OWNER: rechtliche Vorgabe festlegen]].
