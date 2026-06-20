import { defineConfig } from 'vitest/config'

// Tests liegen in app/test/ (außerhalb tsconfig-include → kein Einfluss auf den Build-Typecheck).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Nur App-Logik/UI. Ausgeschlossen: Bootstrap, reine Typen, Leaflet-Map (visuell)
      // und Deno-Edge-Functions (supabase/functions) — letztere live verifiziert, nicht per Mock.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/lib/types.ts', 'src/components/FarmMap.tsx'],
    },
  },
})
