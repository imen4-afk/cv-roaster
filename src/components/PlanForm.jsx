import { useState } from 'react'
import { BUDGET_OPTIONS, HOURS_OPTIONS, LANGUAGE_OPTIONS, STYLE_OPTIONS, WEEKS_OPTIONS } from '../lib/planPrompt'

function Choice({ label, options, value, onChange, format = (o) => o }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={o}
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`rounded-xl border px-3.5 py-2 text-sm transition ${
              value === o ? 'border-fire-500 bg-fire-500/15 text-white' : 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'
            }`}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function PlanForm({ initial, onSubmit, onCancel, busy }) {
  const [v, setV] = useState(initial)
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...v, targetRole: v.targetRole.trim() })
      }}
      className="card fade-up flex flex-col gap-5 p-5 sm:p-6"
    >
      <div>
        <label htmlFor="role" className="label">Target role</label>
        <input id="role" required dir="auto" className="input" value={v.targetRole} onChange={(e) => set('targetRole')(e.target.value)} placeholder="e.g. Junior Data Analyst" />
      </div>
      <Choice label="Hours available per week" options={HOURS_OPTIONS} value={v.hours} onChange={set('hours')} format={(o) => `${o} h`} />
      <Choice label="Plan length" options={WEEKS_OPTIONS} value={v.weeks} onChange={set('weeks')} format={(o) => `${o} weeks`} />
      <Choice label="Preferred learning style" options={STYLE_OPTIONS} value={v.style} onChange={set('style')} />
      <Choice label="Budget" options={BUDGET_OPTIONS} value={v.budget} onChange={set('budget')} />
      <Choice label="Preferred language for resources" options={LANGUAGE_OPTIONS} value={v.language} onChange={set('language')} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-fire" disabled={busy || !v.targetRole.trim()}>
          🚀 Generate my plan
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
