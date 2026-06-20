// Leichte, abhängigkeitsfreie Observability: globale Fehler einfangen, lokal loggen und
// optional an einen Beacon-Endpunkt melden (env-gated VITE_ERROR_BEACON_URL).
// Drop-in für Sentry später möglich — gleiche reportError-Schnittstelle.
const beacon = import.meta.env.VITE_ERROR_BEACON_URL

function send(kind: string, detail: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[obs:${kind}]`, detail)
  if (!beacon) return
  try {
    const body = JSON.stringify({
      kind, detail: String(detail), url: location.href,
      ts: new Date().toISOString(), ua: navigator.userAgent,
    })
    if (navigator.sendBeacon) navigator.sendBeacon(beacon, body)
    else void fetch(beacon, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
  } catch { /* Observability darf nie die App brechen */ }
}

export function reportError(detail: unknown) { send('error', detail) }

let started = false
export function initObservability() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('error', (e) => send('window.error', e.message || e.error))
  window.addEventListener('unhandledrejection', (e) => send('unhandledrejection', (e as PromiseRejectionEvent).reason))
}
