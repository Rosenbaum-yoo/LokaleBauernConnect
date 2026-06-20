import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initObservability } from './lib/observability'
import './styles/theme.css'

initObservability()

const container = document.getElementById('root')
if (!container) throw new Error('Root-Element #root nicht gefunden')

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
