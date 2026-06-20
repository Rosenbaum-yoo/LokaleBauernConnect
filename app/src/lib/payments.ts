// Client-Helfer fuer Stripe Checkout (ruft die Edge Function create-checkout).
// Ohne Supabase-Konfiguration -> { error: 'not_configured' } (kein toter Button).
import { supabase, isSupabaseConfigured } from './supabase'

export interface CheckoutSbPayment {
  mode: 'sb_payment'
  farmId: string
  productId: string
  quantity: number
  contact?: string
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutSbBasket {
  mode: 'sb_basket'
  farmId: string
  items: { productId: string; quantity: number }[]
  /** Freiwilliger Unterstuetzungsbeitrag des Kaeufers an die Plattform (in EUR). */
  support?: number
  contact?: string
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutSubscription {
  mode: 'subscription'
  plan: string
  orgId: string
  contact?: string
  successUrl?: string
  cancelUrl?: string
}

export async function startCheckout(
  payload: CheckoutSbPayment | CheckoutSbBasket | CheckoutSubscription,
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { error: 'not_configured' }
  const { data, error } = await supabase.functions.invoke('create-checkout', { body: payload })
  if (error) return { error: error.message }
  const url = (data as { url?: string } | null)?.url
  return url ? { url } : { error: 'no_url' }
}

/** Bequem: direkt zur Stripe-Checkout-Seite weiterleiten. */
export async function goToCheckout(payload: CheckoutSbPayment | CheckoutSbBasket | CheckoutSubscription): Promise<string | null> {
  const res = await startCheckout(payload)
  if (res.url) { window.location.assign(res.url); return null }
  return res.error ?? 'unknown_error'
}
