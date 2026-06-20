// Stripe-Client (env-gated). Ohne STRIPE_SECRET_KEY -> null (Payments deaktiviert).
import Stripe from 'npm:stripe@17'

export function getStripe(): Stripe | null {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) return null
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })
}

// Plan -> Stripe Price-ID (aus Function-Secrets).
export function priceIdForPlan(plan: string): string | undefined {
  const map: Record<string, string | undefined> = {
    basis: Deno.env.get('STRIPE_PRICE_BASIS'),
    plus: Deno.env.get('STRIPE_PRICE_PLUS'),
    pro: Deno.env.get('STRIPE_PRICE_PRO'),
  }
  return map[plan]
}

// Stripe-Subscription-Status -> DB-Enum (Constraint-sicher).
export function mapSubStatus(s: string): string {
  const ok = ['inactive', 'trialing', 'active', 'past_due', 'canceled']
  return ok.includes(s) ? s : 'past_due'
}
