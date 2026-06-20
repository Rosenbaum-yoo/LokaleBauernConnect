// Edge Function: create-checkout
// Erzeugt eine Stripe Checkout Session fuer (a) SB-Bezahlung am unbemannten Hofladen-Stand
// oder (b) Erzeuger-Abo. Preis IMMER serverseitig ermittelt (Client-Betrag nie vertrauen).
// Zahlarten: automatic_payment_methods -> Stripe zeigt alle im Dashboard aktivierten
// (Karte, SEPA, PayPal, Giropay, Klarna, Apple/Google Pay ...).
import { preflight, json } from '../_shared/cors.ts'
import { getStripe, priceIdForPlan } from '../_shared/stripe.ts'
import { admin } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const stripe = getStripe()
  if (!stripe) return json({ error: 'payments_disabled' }, 503)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_json' }, 400) }

  const successUrl = String(body.successUrl ?? Deno.env.get('PUBLIC_APP_URL') ?? '')
  const cancelUrl = String(body.cancelUrl ?? successUrl)
  if (!successUrl) return json({ error: 'success_url_required' }, 400)

  const db = admin()
  try {
    if (body.mode === 'sb_payment') {
      const farmId = String(body.farmId ?? '')
      const productId = String(body.productId ?? '')
      const qty = Math.max(1, Math.min(50, Number(body.quantity) || 1))
      const { data: product, error } = await db
        .from('products')
        .select('id, name, price, org_id, farm_id')
        .eq('id', productId).eq('farm_id', farmId).maybeSingle()
      if (error || !product) return json({ error: 'product_not_found' }, 404)

      const unit = Math.round(Number(product.price) * 100)
      const { data: pay, error: payErr } = await db.from('sb_payments').insert({
        org_id: product.org_id, farm_id: product.farm_id, product_id: product.id,
        quantity: qty, amount_cents: unit * qty, payer_contact: body.contact ?? null,
      }).select('id').single()
      if (payErr || !pay) return json({ error: 'create_failed' }, 500)

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        automatic_payment_methods: { enabled: true },
        line_items: [{ quantity: qty, price_data: { currency: 'eur', unit_amount: unit, product_data: { name: `${product.name} — Hofladen` } } }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { kind: 'sb_payment', sb_payment_id: pay.id, org_id: product.org_id, farm_id: product.farm_id },
        ...(body.contact ? { customer_email: String(body.contact) } : {}),
      })
      await db.from('sb_payments').update({ stripe_checkout_session: session.id }).eq('id', pay.id)
      return json({ url: session.url })
    }

    if (body.mode === 'sb_basket') {
      const farmId = String(body.farmId ?? '')
      const items = Array.isArray(body.items) ? (body.items as Array<{ productId: string; quantity: number }>) : []
      if (!items.length) return json({ error: 'empty_basket' }, 400)
      const ids = items.map((i) => String(i.productId))
      const { data: products, error } = await db.from('products').select('id, name, price, org_id, farm_id').eq('farm_id', farmId).in('id', ids)
      if (error || !products || !products.length) return json({ error: 'product_not_found' }, 404)
      const orgId = products[0].org_id
      const line_items: Array<Record<string, unknown>> = []
      let total = 0
      for (const it of items) {
        const p = products.find((x: { id: string }) => x.id === String(it.productId))
        if (!p) continue
        const qty = Math.max(1, Math.min(50, Number(it.quantity) || 1))
        const unit = Math.round(Number(p.price) * 100)
        total += unit * qty
        line_items.push({ quantity: qty, price_data: { currency: 'eur', unit_amount: unit, product_data: { name: `${p.name} — Hofladen` } } })
      }
      if (!line_items.length) return json({ error: 'product_not_found' }, 404)
      const productPositions = line_items.length
      // Freiwilliger Unterstuetzungsbeitrag an die Plattform (getrennt vom Warenwert -> Hof). Max 1000 EUR.
      const supportCents = Math.max(0, Math.min(100000, Math.round((Number(body.support) || 0) * 100)))
      if (supportCents > 0) line_items.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: supportCents, product_data: { name: 'Unterstützung der Plattform (freiwillig)' } } })
      const { data: pay } = await db.from('sb_payments').insert({ org_id: orgId, farm_id: farmId, product_id: null, quantity: productPositions, amount_cents: total, support_cents: supportCents, payer_contact: body.contact ?? null }).select('id').single()
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', automatic_payment_methods: { enabled: true }, line_items,
        success_url: successUrl, cancel_url: cancelUrl,
        metadata: { kind: 'sb_payment', sb_payment_id: pay?.id ?? '', org_id: orgId, farm_id: farmId, support_cents: String(supportCents) },
        ...(body.contact ? { customer_email: String(body.contact) } : {}),
      })
      if (pay) await db.from('sb_payments').update({ stripe_checkout_session: session.id }).eq('id', pay.id)
      return json({ url: session.url })
    }

    if (body.mode === 'subscription') {
      const plan = String(body.plan ?? 'basis')
      const price = priceIdForPlan(plan)
      if (!price) return json({ error: 'plan_not_configured' }, 400)
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        automatic_payment_methods: { enabled: true },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { kind: 'subscription', org_id: String(body.orgId ?? ''), plan },
        ...(body.contact ? { customer_email: String(body.contact) } : {}),
      })
      return json({ url: session.url })
    }

    return json({ error: 'unknown_mode' }, 400)
  } catch (e) {
    console.error('[create-checkout]', e)
    return json({ error: 'stripe_error' }, 500)
  }
})
