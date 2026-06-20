import { Component, type ReactNode } from 'react'
import { reportError } from '../lib/observability'

// Fängt Render-Fehler ab, damit die App nie weiß auf weißem Bildschirm endet.
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown) { reportError(error) }
  render() {
    if (this.state.hasError) {
      return (
        <main className="wrap" style={{ padding: '64px 22px' }}>
          <div className="state">
            <h3>Da ist etwas schiefgelaufen</h3>
            <p>Bitte lade die Seite neu. Wenn das Problem bleibt, versuch es später erneut.</p>
            <button className="lbc-btn lbc-btn--primary" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Neu laden</button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
