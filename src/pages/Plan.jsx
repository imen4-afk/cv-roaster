import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { askGeminiJSON, friendlyError } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { validateRoast } from '../lib/prompts'
import { growthPlanPrompt, guessTargetRole, planMaxTokens, planProgress, validatePlan } from '../lib/planPrompt'
import { buildPlanIcs, downloadIcs } from '../lib/ics'
import GrowthPlan from '../components/GrowthPlan'
import PlanForm from '../components/PlanForm'
import Toast from '../components/Toast'
import ErrorBox from '../components/ErrorBox'
import Spinner, { LoadingPanel } from '../components/Spinner'

// A cv_update task has no bullet of its own: suggest the outcome of the pathway step
// that matches where this week sits in the plan.
function bulletForWeek(plan, week) {
  const steps = plan.pathway
  if (!steps.length) return ''
  const idx = Math.min(steps.length - 1, Math.floor(((week - 1) * steps.length) / plan.schedule.length))
  return steps[idx].outcome_for_cv
}

export default function Plan() {
  const { analysisId } = useParams()
  const { user } = useAuth()
  const [analysis, setAnalysis] = useState(null)
  const [row, setRow] = useState(undefined) // undefined = loading, null = no plan yet
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [lastInputs, setLastInputs] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    Promise.all([
      supabase.from('cv_analyses').select('id, cv_text, job_description, result').eq('id', analysisId).single(),
      supabase.from('learning_plans').select('*').eq('analysis_id', analysisId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([a, p]) => {
      if (a.error) return setLoadError("We couldn't load this CV analysis. It may have been deleted.")
      setAnalysis(a.data)
      if (p.error) setSaveError(`Couldn't load a saved plan: ${p.error.message}. Did you run supabase/schema.sql?`)
      let saved = null
      try {
        if (p.data) saved = { ...p.data, plan: validatePlan(p.data.plan) }
      } catch {
        setSaveError('Your saved plan looks corrupted. Generate a new one below.')
      }
      setRow(saved)
    })
  }, [analysisId])

  async function generate(inputs) {
    setLastInputs(inputs)
    setGenerating(true)
    setGenError('')
    setSaveError('')
    try {
      const plan = await askGeminiJSON(
        growthPlanPrompt({
          cvText: analysis.cv_text,
          roast: validateRoast(analysis.result),
          jobDescription: analysis.job_description,
          inputs,
        }),
        validatePlan,
        { label: 'plan', maxOutputTokens: planMaxTokens(inputs.weeks) },
      )
      const record = { user_id: user.id, analysis_id: analysisId, inputs, plan, completed_tasks: [] }
      // One plan per analysis: regenerating replaces it (and resets progress).
      const { data, error } = await supabase.from('learning_plans').upsert(record, { onConflict: 'analysis_id' }).select().single()
      if (error) {
        setSaveError(`Plan generated but not saved, so progress won't be kept: ${error.message}`)
        setRow({ ...record, id: null })
      } else {
        setRow({ ...data, plan })
      }
      setEditing(false)
    } catch (err) {
      setGenError(friendlyError(err))
    } finally {
      setGenerating(false)
    }
  }

  async function toggle(id, task, milestone) {
    const prev = row.completed_tasks || []
    const checking = !prev.includes(id)
    const next = checking ? [...prev, id] : prev.filter((x) => x !== id)
    setRow((r) => ({ ...r, completed_tasks: next }))

    if (checking && task?.type === 'cv_update') {
      const week = Number(id.match(/^w(\d+)/)?.[1] || 1)
      setToast({ title: 'Nice! Add this to your CV', bullet: bulletForWeek(row.plan, week) })
    } else if (checking && milestone) {
      setToast({ title: 'Nice! Add this to your CV', bullet: milestone.cv_bullet_template })
    }

    if (!row.id) return
    const { error } = await supabase.from('learning_plans').update({ completed_tasks: next }).eq('id', row.id)
    if (error) {
      setRow((r) => ({ ...r, completed_tasks: prev }))
      setSaveError(`Couldn't save your progress: ${error.message}`)
    }
  }

  if (loadError) return <ErrorBox message={loadError} />
  if (row === undefined) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  const defaults = row?.inputs ||
    lastInputs || {
      targetRole: guessTargetRole(analysis.job_description),
      hours: '5',
      weeks: '4',
      style: 'Mixed',
      budget: 'Free only',
      language: 'English',
    }

  const header = (
    <div className="no-print fade-up">
      <Link to={`/analysis/${analysisId}`} className="text-sm text-neutral-400 hover:text-white">← Back to the roast</Link>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Growth Plan 🌱</h1>
    </div>
  )

  if (generating) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <LoadingPanel title="Designing your Growth Plan…" subtitle="Mapping your gaps to a week-by-week schedule. This usually takes under a minute, but can take a few minutes when the AI is busy." />
      </div>
    )
  }

  if (!row || editing) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="-mt-3 text-neutral-400">
          {row ? 'Generating a new plan replaces the current one and resets its progress.' : 'Tell us a bit about your constraints, and we’ll turn your roast into a step-by-step plan.'}
        </p>
        {saveError && <p className="text-sm text-amber-400">{saveError}</p>}
        <ErrorBox message={genError} onRetry={lastInputs ? () => generate(lastInputs) : undefined} />
        <PlanForm initial={defaults} onSubmit={generate} onCancel={row ? () => setEditing(false) : undefined} busy={generating} />
      </div>
    )
  }

  const { plan, inputs } = row
  const progress = planProgress(plan, row.completed_tasks)

  return (
    <div className="plan-page flex flex-col gap-8">
      <div className="card fade-up flex flex-col gap-4 p-5 sm:p-6">
        <div className="no-print">
          <Link to={`/analysis/${analysisId}`} className="text-sm text-neutral-400 hover:text-white">← Back to the roast</Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-fire-400">Growth Plan</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl" dir="auto">{inputs.targetRole}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {inputs.weeks} weeks · {inputs.hours} h/week · {inputs.style} · {inputs.budget} · {inputs.language}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button onClick={() => downloadIcs(buildPlanIcs(plan, inputs))} className="btn-fire !py-2.5 text-sm">📅 Export to calendar</button>
            <button onClick={() => window.print()} className="btn-ghost">🖨️ Print / Save as PDF</button>
            <button onClick={() => setEditing(true)} className="btn-ghost">🔄 New plan</button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-neutral-400">
            <span>Overall progress</span>
            <span className="font-semibold text-fire-400" data-testid="plan-progress">{progress}%</span>
          </div>
          <div className="print-track h-2.5 overflow-hidden rounded-full bg-white/5">
            <div className="print-bar h-full rounded-full bg-gradient-to-r from-fire-500 to-ember-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        {saveError && <p className="text-sm text-amber-400">{saveError}</p>}
      </div>

      <GrowthPlan plan={plan} completed={row.completed_tasks || []} onToggle={toggle} />
      <Toast toast={toast} onClose={closeToast} />
    </div>
  )
}
