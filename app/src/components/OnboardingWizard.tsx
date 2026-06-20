import { useEffect, useRef, useState } from 'react'
import { onboardingSchema, ONBOARDING_STEPS, ONBOARDING_INITIAL, type FieldDef, type OnboardingData } from '../lib/onboardingForm'

type Values = Record<string, string | string[]>

// Generischer, datengetriebener Wizard: rendert Schritte/Felder aus dem Schema, validiert mit Zod.
export function OnboardingWizard({ onSubmit, submitting }: { onSubmit: (d: OnboardingData) => void; submitting: boolean }) {
  const steps = ONBOARDING_STEPS
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>({ ...ONBOARDING_INITIAL })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const cur = steps[step]
  const isLast = step === steps.length - 1
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [step])

  function set(name: string, v: string | string[]) {
    setValues((p) => ({ ...p, [name]: v }))
    setErrors((e) => { if (!e[name]) return e; const rest = { ...e }; delete rest[name]; return rest })
  }

  function collectErrors(): Record<string, string> {
    const res = onboardingSchema.safeParse(values)
    if (res.success) return {}
    const e: Record<string, string> = {}
    for (const issue of res.error.issues) { const k = String(issue.path[0]); if (!e[k]) e[k] = issue.message }
    return e
  }

  function next() {
    const e = collectErrors()
    if (cur.fields.some((f) => e[f.name])) { setErrors(e); return }
    setErrors({}); setStep((s) => Math.min(s + 1, steps.length - 1))
  }
  function back() { setErrors({}); setStep((s) => Math.max(0, s - 1)) }

  function submit() {
    const res = onboardingSchema.safeParse(values)
    if (!res.success) {
      const e = collectErrors(); setErrors(e)
      const idx = steps.findIndex((s) => s.fields.some((f) => e[f.name]))
      if (idx >= 0) setStep(idx)
      return
    }
    onSubmit(res.data)
  }

  return (
    <div className="wizard">
      <div className="wizard__steps" aria-hidden="true">
        {steps.map((s, i) => (
          <div key={s.title} className={`wizard__step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}>
            <span className="wizard__dot">{i < step ? '✓' : i + 1}</span>
            <span className="wizard__label">{s.title}</span>
          </div>
        ))}
      </div>

      <div className="pay-card">
        <div className="eyebrow" aria-live="polite">Schritt {step + 1} von {steps.length} · {cur.title}</div>
        <h2 className="pay-card__title" ref={headingRef} tabIndex={-1} style={{ fontSize: 26, outline: 'none' }}>{cur.title}</h2>
        {cur.intro && <p className="muted" style={{ marginTop: 4 }}>{cur.intro}</p>}

        <div className="pay-form" style={{ marginTop: 16 }}>
          {cur.fields.map((f) => <Field key={f.name} def={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => set(f.name, v)} />)}
        </div>

        <div className="wizard__nav">
          {step > 0 && <button type="button" className="lbc-btn" onClick={back}>← Zurück</button>}
          <div style={{ flex: 1 }} />
          {!isLast
            ? <button type="button" className="lbc-btn lbc-btn--primary" onClick={next}>Weiter →</button>
            : <button type="button" className="lbc-btn lbc-btn--primary lbc-btn--lg" onClick={submit} disabled={submitting}>{submitting ? 'Wird gesendet …' : 'Hof anmelden'}</button>}
        </div>
      </div>
    </div>
  )
}

function Field({ def, value, error, onChange }: { def: FieldDef; value: string | string[]; error?: string; onChange: (v: string | string[]) => void }) {
  const id = `f-${def.name}`
  const errId = `${id}-err`
  const invalid = error ? true : undefined
  const describedBy = error ? errId : undefined
  return (
    <div className="field">
      {def.type === 'multiselect'
        ? <span className="lbc-label" id={`${id}-label`}>{def.label}</span>
        : <label className="lbc-label" htmlFor={id}>{def.label}</label>}
      {def.type === 'textarea' ? (
        <textarea id={id} className="lbc-input" rows={4} value={value as string} placeholder={def.placeholder}
          aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
      ) : def.type === 'select' ? (
        <select id={id} className="lbc-select" value={value as string} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)}>
          {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : def.type === 'multiselect' ? (
        <div className="chip-select" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
          {def.options?.map((o) => {
            const arr = (value as string[]) || []
            const on = arr.includes(o)
            return (
              <button type="button" key={o} className={`chip-toggle ${on ? 'is-on' : ''}`} aria-pressed={on}
                onClick={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}>{o}</button>
            )
          })}
        </div>
      ) : (
        <input id={id} className="lbc-input" type={def.type} value={value as string} placeholder={def.placeholder}
          inputMode={def.name === 'plz' ? 'numeric' : undefined}
          aria-invalid={invalid} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)} />
      )}
      {def.help && !error && <div className="field__help">{def.help}</div>}
      {error && <div className="field__err" id={errId} role="alert">{error}</div>}
    </div>
  )
}
