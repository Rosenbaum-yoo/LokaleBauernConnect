// Mail-Provider-Abstraktion (env-gated): resend | sendgrid | smtp(relay) | console.
// Default 'console' -> nichts wird real versendet (sicher), nur geloggt.
// Templates im LokaleBauernConnect-Ton (Vermittler, regional, ehrlich).

interface Mail { to: string; subject: string; html: string }

export async function sendEmail(m: Mail): Promise<{ provider: string; ok: boolean }> {
  const provider = (Deno.env.get('EMAIL_PROVIDER') ?? 'console').toLowerCase()
  const from = Deno.env.get('EMAIL_FROM') ?? 'LokaleBauernConnect <noreply@lokalebauernconnect.de>'
  try {
    if (provider === 'resend') {
      const key = Deno.env.get('RESEND_API_KEY')
      if (!key) throw new Error('RESEND_API_KEY fehlt')
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: m.to, subject: m.subject, html: m.html }),
      })
      return { provider, ok: r.ok }
    }
    if (provider === 'sendgrid') {
      const key = Deno.env.get('SENDGRID_API_KEY')
      if (!key) throw new Error('SENDGRID_API_KEY fehlt')
      const fromEmail = from.replace(/^.*<([^>]+)>.*$/, '$1')
      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: m.to }] }],
          from: { email: fromEmail, name: 'LokaleBauernConnect' },
          subject: m.subject,
          content: [{ type: 'text/html', value: m.html }],
        }),
      })
      return { provider, ok: r.ok }
    }
  } catch (e) {
    console.error('[email] Versand fehlgeschlagen:', e)
    return { provider, ok: false }
  }
  console.log(`[email:console] -> ${m.to} :: ${m.subject}`)
  return { provider: 'console', ok: true }
}

// ── Templates ──────────────────────────────────────────────────
function layout(title: string, body: string): string {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#faf7ee;font-family:Georgia,serif;color:#14201a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:18px;font-weight:700;color:#1f3a2e;margin-bottom:18px">LokaleBauern<span style="color:#7a2e2e;font-style:italic">Connect</span></div>
    <h1 style="font-size:24px;font-weight:400;color:#15291f;margin:0 0 14px">${title}</h1>
    <div style="font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.6;color:#3a3a30">${body}</div>
    <hr style="border:none;border-top:1px solid #d4cab3;margin:26px 0"/>
    <div style="font-family:system-ui,Arial,sans-serif;font-size:12px;color:#6b6457">LokaleBauernConnect ist eine Vermittlungsplattform. Verkauf, Produktangaben und Verfuegbarkeit liegen bei den Erzeugern. Alle Angaben ohne Gewaehr.</div>
  </div></body></html>`
}

export function renderReceipt(o: { amount: number; farmName?: string }): { subject: string; html: string } {
  const eur = o.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
  return {
    subject: `Deine Zahlung über ${eur} — LokaleBauernConnect`,
    html: layout('Danke für deinen Einkauf', `<p>Deine Zahlung über <strong>${eur}</strong>${o.farmName ? ` bei <strong>${o.farmName}</strong>` : ''} ist eingegangen. Diese E-Mail dient als Beleg.</p><p>Gute Heimfahrt — und guten Appetit mit deinem Hof-Einkauf. 🌾</p>`),
  }
}

export function renderReservation(o: { product: string; farmName: string; pickup: string }): { subject: string; html: string } {
  return {
    subject: `Reservierung bestätigt — ${o.farmName}`,
    html: layout('Deine Reservierung steht', `<p>Du hast <strong>${o.product}</strong> bei <strong>${o.farmName}</strong> reserviert.</p><p>Abholfenster: <strong>${o.pickup}</strong>. Der Hof bestätigt deine Reservierung. Bezahlung direkt beim Hof, sofern nicht online bezahlt.</p>`),
  }
}
