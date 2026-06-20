// Edge Function: stripe-webhook
// EINE signaturgeprüfte, idempotente Wahrheit. Aktualisiert sb_payments/subscriptions,
// schreibt Audit, versendet Quittungs-Mail. Verarbeitet jedes Event genau einmal.
import type Stripe from 'npm:stripe@17'
import { getStripe, mapSubStatus } from '../_shared/stripe.ts'
import { admin } from '../_shared/supabaseAdmin.ts'
import { sendEmail, renderReceipt } from '../_shared/email.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })
  const stripe = getStripe()
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripe || !secret) return new Response('payments_disabled', { status: 503 })

  const sig = req.headers.get('stripe-signature') ?? ''
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret)
  } catch (e) {
    console.error('[webhook] Signatur ungueltig:', e)
    return new Response('bad_signature', { status: 400 })
  }

  const db = admin()
  // Idempotenz: Event-ID als PK; Konflikt = bereits verarbeitet -> 200.
  const dup = await db.from('payment_events').insert({ id: event.id, type: event.type })
  if (dup.error) return new Response('duplicate', { status: 200 })

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session
      const md = s.metadata ?? {}
      if (md.kind === 'sb_payment' && md.sb_payment_id) {
        await db.from('sb_payments').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent: typeof s.payment_intent === 'string' ? s.payment_intent : null,
        }).eq('id', md.sb_payment_id)
        await db.from('audit_log').insert({
          org_id: md.org_id ?? null, action: 'sb_payment.paid', entity_type: 'sb_payment',
          entity_id: md.sb_payment_id, details: { amount_total: s.amount_total },
        })
        const email = s.customer_details?.email ?? s.customer_email ?? undefined
        if (email) {
          const r = renderReceipt({ amount: (s.amount_total ?? 0) / 100 })
          await sendEmail({ to: email, subject: r.subject, html: r.html })
        }
      } else if (md.kind === 'subscription' && md.org_id) {
        await db.from('subscriptions').upsert({
          org_id: md.org_id, plan: md.plan ?? 'basis', status: 'active',
          stripe_customer_id: typeof s.customer === 'string' ? s.customer : null,
          stripe_subscription_id: typeof s.subscription === 'string' ? s.subscription : null,
        }, { onConflict: 'stripe_subscription_id' })
        await db.from('audit_log').insert({
          org_id: md.org_id, action: 'subscription.activated', entity_type: 'subscription',
          entity_id: md.org_id, details: { plan: md.plan },
        })
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const status = event.type.endsWith('deleted') ? 'canceled' : mapSubStatus(sub.status)
      await db.from('subscriptions').update({
        status,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      }).eq('stripe_subscription_id', sub.id)
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('[webhook] Handler-Fehler:', e)
    return new Response('handler_error', { status: 500 })
  }
})
