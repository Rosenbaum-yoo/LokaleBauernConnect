# Testing — LokaleBauernConnect

> Stand: 2026-06-20. Grounded in `app/vitest.config.ts` und `app/test/`; bei Abweichung gilt der Code.

## Runner

- Framework: **Vitest** (`environment: 'jsdom'`).
- Config: `app/vitest.config.ts`.
- Testpfad: `test/**/*.test.{ts,tsx}` (Tests liegen in `app/test/`, außerhalb des tsconfig-Include → kein Einfluss auf den Build-Typecheck).

## Ausführen

```bash
cd app
npm test          # vitest run  (einmalig, CI-Modus)
npm run test:watch
```

## Umfang

**55 Tests in 19 Dateien** (verifiziert via `npm test`):

```
app.test.tsx              data-mutations.test.ts   onboarding.test.ts
availabilitybadge.test.tsx  errorboundary.test.tsx  pages.test.tsx
coverage-fill.test.tsx    finder.test.tsx          payments.test.ts
data.test.ts              finder-flow.test.tsx     season.test.ts
                          flows.test.tsx           staff.test.tsx
                          geo.test.ts              stand.test.tsx
                          health.test.ts           wizard.test.tsx
                          observability.test.ts
```

## Coverage

- Provider: `v8`.
- Eingeschlossen: `src/**/*.{ts,tsx}`.
- Ausgeschlossen: `src/main.tsx` (Bootstrap), `src/vite-env.d.ts`, `src/lib/types.ts` (reine Typen), `src/components/FarmMap.tsx` (Leaflet-Karte, visuell).

> Edge Functions (`supabase/functions/`, Deno) sind nicht Teil der Vitest-Coverage — sie werden live verifiziert, nicht per Mock.

## Typecheck

`npm run typecheck` (= `tsc --noEmit`) ist Teil von `npm run build` und muss vor jedem Deploy grün sein.

## Grundsätze

- Tests sind die Spezifikation: Code wird an Tests angepasst, nicht umgekehrt.
- Kein Abschwächen/Skippen einer Assertion, um Rot grün zu machen.
- Keine Mocks dort, wo echte Integration nötig ist (Edge Functions → live).
