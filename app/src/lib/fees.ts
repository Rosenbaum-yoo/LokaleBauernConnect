// ─────────────────────────────────────────────────────────────────────────────
// fees.ts — SINGLE SOURCE OF TRUTH des LokaleBauernConnect-Provisionsmodells.
//
// Connect-basiertes, status-gestaffeltes Provisionsmodell (Synthese-JSON v1).
// Reine Logik, KEINE externen Imports, KEINE Seiteneffekte. Diese Datei ist die
// kanonische Berechnung; create-checkout / application_fee MUSS hieraus lesen,
// die effektiven Saetze werden serverseitig pro org_id materialisiert (NIE Client).
//
// ⚠️  ALLE ZAHLEN SIND OWNER-FREIGABE-PFLICHTIG (Pricing/Geld = Stop-Regel).
//     Jede Konstante ist annahmenbasiert und mit "[FREIGABE]" markiert, bis der
//     Owner die finalen Werte bestaetigt. Aenderungen NUR hier zentral.
//
// Modell-Kern:
//   • Zweiseitige Provision: Kaeufer 1% + Verkaeufer 5% = 6% gesamt (Standard "Neu").
//   • Status-Stufen senken AUSSCHLIESSLICH den Verkaeufer-Satz (Reputation = Verkaeufer-Attribut).
//   • Verkaeufer-Premium ("Hof-Plus", 39 EUR/Mo) setzt den Verkaeufer-Term rechnerisch auf 0%,
//     wird aber durch FLOOR_PCT bzw. die EUR-Mindestgebuehr abgefangen (keine echten 0/0).
//   • Harte Untergrenzen: FLOOR_PCT (effektiver Verkaeufer-%) + MIN_FEE_CENTS (EUR/Tx),
//     damit die Plattform pro Transaktion nie unter Stripe-Selbstkosten subventioniert.
//   • Kaeufer-Premium GESTRICHEN (negativer Erwartungswert) -> Kaeufer-Satz konstant.
// ─────────────────────────────────────────────────────────────────────────────

/** Status-Stufe eines Verkaeufers (Reputations-/Bounty-System). */
export type SellerTierName = 'Neu' | 'Bronze' | 'Silber' | 'Gold' | 'Platin'

/** Basis-Provisionssaetze fuer NEU-Verkaeufer ohne Premium. [FREIGABE] */
export const BASE_FEE = {
  /** Kaeufer-Anteil in Prozent. [FREIGABE] 1% (statt Owner-Vorschlag 3%) schuetzt SB-Konversion + Mission "Kaeufer zahlen nie fuer den Zugang". */
  buyerPct: 1,
  /** Verkaeufer-Anteil in Prozent. [FREIGABE] 5% — Hauptlast traegt der Verkaeufer, der durch SB-Bezahlung Schwund/Bargeld spart. */
  sellerPct: 5,
} as const

/** Gesamt-Take-Rate fuer einen NEU-Verkaeufer ohne Premium (= 6%). [FREIGABE] */
export const TOTAL_PCT: number = BASE_FEE.buyerPct + BASE_FEE.sellerPct

/**
 * Effektive Verkaeufer-Untergrenze in Prozent. [FREIGABE] 1,2%.
 * Der effektive Verkaeufer-Satz faellt NIE darunter — auch mit Premium + Platin nicht.
 * Schuetzt die Marge bei voll-rabattierten, umsatzstarken Hoefen.
 */
export const FLOOR_PCT = 1.2

/**
 * Absolute Mindestgebuehr pro Transaktion in Cent (aus Verkaeufer-Anteil). [FREIGABE] 25 ct.
 * Deckt die Stripe-Fixkosten (1,5% + 0,25 EUR) bei SB-Kleinbetraegen. Unter ~5,56 EUR Ticket
 * wuerden 6% sonst die Stripe-Kosten nicht decken (Kern-USP: SB-Stand-Kleinbetraege).
 */
export const MIN_FEE_CENTS = 25

/** Optionale Premium-Mitgliedschaft ("Hof-Plus", Verkaeufer-only). [FREIGABE] */
export const PREMIUM = {
  /** Monatspreis in EUR. [FREIGABE] 39 EUR — bewusst UEBER Break-even (39/5% = 780 EUR/Mo GMV), als Retention/Status-Produkt, nicht als Spar-Hack. */
  priceEur: 39,
  /** Effekt: setzt den Verkaeufer-Provisionssatz rechnerisch auf 0% (Kaeufer-1% + Floor/Mindestgebuehr bleiben). */
  effect: 'seller_pct -> 0% (gedeckelt durch FLOOR_PCT bzw. MIN_FEE_CENTS; keine echten 0/0)',
  /** Wiederkehrendes Abo (Stripe Subscription); Webhook setzt premium_active/premium_until pro org_id. */
  isSubscription: true,
} as const

/**
 * Status-Rabatt (Prozentpunkte) auf den Verkaeufer-Basissatz je Stufe. [FREIGABE]
 * effective_seller_pct = max(FLOOR_PCT, BASE_FEE.sellerPct - status_rabatt - (premium ? BASE_FEE.sellerPct : 0)).
 */
export const TIER_DISCOUNT_PP: Readonly<Record<SellerTierName, number>> = {
  Neu: 0.0,
  Bronze: 0.4,
  Silber: 0.8,
  Gold: 1.2,
  Platin: 1.6,
} as const

/** Ein Eintrag der Status-Stufen-Tabelle (Reputations-/Bounty-System). */
export interface FeeTier {
  /** Anzeige-/Schluesselname der Stufe. */
  readonly name: SellerTierName
  /** Qualifikationskriterien (nur verified=true & nicht-refundiertes GMV zaehlt). */
  readonly criteria: string
  /** Effektiver Kaeufer-Satz auf dieser Stufe (premium-unabhaengig konstant). */
  readonly buyerPct: number
  /** Effektiver Verkaeufer-Satz auf dieser Stufe OHNE Premium (= BASE - Rabatt). */
  readonly sellerPct: number
}

/**
 * Kanonische Status-Stufen. [FREIGABE]
 * sellerPct = BASE_FEE.sellerPct - TIER_DISCOUNT_PP[name]; buyerPct konstant BASE_FEE.buyerPct.
 */
export const TIERS: readonly FeeTier[] = [
  {
    name: 'Neu',
    criteria: 'Default ab Onboarding: 0-89 Tage aktiv ODER <2.000 EUR kum. nicht-refundiertes GMV.',
    buyerPct: BASE_FEE.buyerPct,
    sellerPct: BASE_FEE.sellerPct - TIER_DISCOUNT_PP.Neu, // 5.0
  },
  {
    name: 'Bronze',
    criteria: '>=2.000 EUR kum. GMV UND >=5 verif. Bewertungen UND O-Rating >=4,0 UND >=30 Tage aktiv.',
    buyerPct: BASE_FEE.buyerPct,
    sellerPct: BASE_FEE.sellerPct - TIER_DISCOUNT_PP.Bronze, // 4.6
  },
  {
    name: 'Silber',
    criteria: '>=10.000 EUR GMV UND >=15 verif. Bewertungen UND O >=4,3 UND >=90 Tage UND >=1 erfuellte Bounty.',
    buyerPct: BASE_FEE.buyerPct,
    sellerPct: BASE_FEE.sellerPct - TIER_DISCOUNT_PP.Silber, // 4.2
  },
  {
    name: 'Gold',
    criteria:
      '>=40.000 EUR GMV UND >=40 verif. Bewertungen UND O >=4,5 UND >=180 Tage UND >=3 erfuellte Bounties UND Erfuellungsquote >=95%.',
    buyerPct: BASE_FEE.buyerPct,
    sellerPct: BASE_FEE.sellerPct - TIER_DISCOUNT_PP.Gold, // 3.8
  },
  {
    name: 'Platin',
    criteria:
      '>=150.000 EUR GMV UND >=100 verif. Bewertungen UND O >=4,6 UND >=365 Tage UND >=8 erfuellte Bounties UND >=98% Quote UND 0 offene Streitfaelle in 90 Tagen.',
    buyerPct: BASE_FEE.buyerPct,
    sellerPct: BASE_FEE.sellerPct - TIER_DISCOUNT_PP.Platin, // 3.4
  },
] as const

/** Eingabe fuer eine Gebuehren-Berechnung einer einzelnen Transaktion. */
export interface ComputeFeeParams {
  /** Bruttowarenwert der Transaktion in EUR-Cent (Ganzzahl, > 0). */
  grossCents: number
  /** Status-Stufe des Verkaeufers. Default: 'Neu'. */
  sellerTier?: SellerTierName
  /** Status-Stufe des Kaeufers (aktuell ohne Fee-Wirkung; reserviert). Default: 'Neu'. */
  buyerTier?: SellerTierName
  /** Verkaeufer hat aktives "Hof-Plus"-Premium (setzt Verkaeufer-Term auf 0%). Default: false. */
  sellerPremium?: boolean
  /** Kaeufer-Premium — GESTRICHEN, daher ohne Wirkung; nur fuer Aufruf-Kompatibilitaet. Default: false. */
  buyerPremium?: boolean
}

/** Ergebnis einer Gebuehren-Berechnung (Cent-genau, fuer Stripe application_fee). */
export interface FeeResult {
  /** Effektiver Kaeufer-Satz in Prozent (konstant BASE_FEE.buyerPct). */
  buyerPct: number
  /** Effektiver Verkaeufer-Satz in Prozent NACH Tier/Premium/Floor (>= FLOOR_PCT). */
  sellerPct: number
  /** Kaeufer-Gebuehr in Cent (auf MIN_FEE_CENTS nicht erzwungen — Verkaeufer traegt den Floor). */
  buyerFeeCents: number
  /** Verkaeufer-Gebuehr in Cent (>= MIN_FEE_CENTS bei grossCents > 0). */
  sellerFeeCents: number
  /** Gesamte Plattform-application_fee in Cent (buyerFeeCents + sellerFeeCents). */
  applicationFeeCents: number
  /** Betrag, der via transfer_data.destination an den Hof geht (grossCents - sellerFeeCents). */
  destinationCents: number
  /** Effektive Gesamt-Take-Rate in Prozent bezogen auf grossCents (inkl. Mindestgebuehr-Effekt). */
  totalEffectivePct: number
}

/** Auf 2 Dezimalstellen runden (Prozent-Anzeige, vermeidet Float-Artefakte wie 4.199999). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Berechnet fuer EINE Transaktion die effektiven Kaeufer-/Verkaeufer-Saetze und
 * die Cent-Betraege (Stripe application_fee + destination). Reine Funktion.
 *
 * Formel (Synthese-JSON v1):
 *   basis_seller_pct  = BASE_FEE.sellerPct (5,0)
 *   status_rabatt     = TIER_DISCOUNT_PP[sellerTier]
 *   premium_abzug     = sellerPremium ? basis_seller_pct : 0   // Premium -> rechnerisch 0%
 *   effective_seller% = max(FLOOR_PCT, basis_seller_pct - status_rabatt - premium_abzug)
 *   effective_buyer%  = BASE_FEE.buyerPct (Kaeufer-Premium gestrichen -> konstant)
 *   sellerFeeCents    = max(MIN_FEE_CENTS, round(gross * effective_seller% / 100))
 *   buyerFeeCents     = round(gross * effective_buyer% / 100)
 *
 * @throws bei nicht-positivem oder nicht-ganzzahligem grossCents (Stop-Regel: kein stiller Fehler).
 */
export function computeFee(params: ComputeFeeParams): FeeResult {
  const { grossCents } = params
  if (!Number.isInteger(grossCents) || grossCents <= 0) {
    throw new Error('computeFee: grossCents muss eine positive Ganzzahl (Cent) sein')
  }

  const sellerTier: SellerTierName = params.sellerTier ?? 'Neu'
  const sellerPremium = params.sellerPremium ?? false
  // buyerTier / buyerPremium sind bewusst (noch) ohne Fee-Wirkung -> nicht ausgewertet.

  const basisSellerPct = BASE_FEE.sellerPct
  const statusRabatt = TIER_DISCOUNT_PP[sellerTier]
  const premiumAbzug = sellerPremium ? basisSellerPct : 0

  // Effektiver Verkaeufer-%: Basis minus Status-Rabatt minus Premium, aber nie unter FLOOR_PCT.
  const sellerPct = round2(Math.max(FLOOR_PCT, basisSellerPct - statusRabatt - premiumAbzug))
  // Effektiver Kaeufer-%: konstant (Kaeufer-Premium existiert nicht).
  const buyerPct = round2(BASE_FEE.buyerPct)

  // Cent-Betraege: kaufmaennisch runden, Verkaeufer-Anteil mit harter EUR-Untergrenze.
  const buyerFeeCents = Math.round((grossCents * buyerPct) / 100)
  const sellerFeeCents = Math.max(MIN_FEE_CENTS, Math.round((grossCents * sellerPct) / 100))

  const applicationFeeCents = buyerFeeCents + sellerFeeCents
  const destinationCents = grossCents - sellerFeeCents
  const totalEffectivePct = round2((applicationFeeCents / grossCents) * 100)

  return {
    buyerPct,
    sellerPct,
    buyerFeeCents,
    sellerFeeCents,
    applicationFeeCents,
    destinationCents,
    totalEffectivePct,
  }
}
