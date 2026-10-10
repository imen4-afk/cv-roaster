import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { planProgress, validatePlan } from '../lib/planPrompt'
import { scoreColor } from '../components/ScoreGauge'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'

function BigCard({ to, emoji, title, text }) {
  return (
    <Link
      to={to}
      className="card group relative overflow-hidden p-6 hover:-translate-y-1 hover:border-fire-500/50 hover:shadow-xl hover:shadow-fire-600/10 sm:p-8"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-fire-500/20 to-ember-600/10 blur-2xl transition group-hover:scale-125" />
      <div className="relative">
        <div className="mb-4 text-4xl">{emoji}</div>
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <p className="mt-2 text-neutral-400">{text}</p>
        <p className="mt-5 text-sm font-semibold text-fire-400 transition group-hover:translate-x-1">Let's go →</p>
      </div>
    </Link>
  )
}

const safeProgress = (p) => {
  try {
    return planProgress(validatePlan(p.plan), p.completed_tasks || [])
  } catch {
    return 0
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('learning_plans')
      .select('id, analysis_id, inputs, plan, completed_tasks, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => setPlans(error ? [] : data))
  }, [])

  useEffect(() => {
    Promise.all([
      supabase.from('cv_analyses').select('id, score, verdict, job_description, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('generated_cvs').select('id, full_name, title, created_at').order('created_at', { ascending: false }).limit(50),
    ]).then(([a, g]) => {
      if (a.error || g.error) {
        setError(`Couldn't load your history: ${(a.error || g.error).message}. Did you run supabase/schema.sql?`)
        setItems([])
        return
      }
      const merged = [
        ...a.data.map((r) => ({ ...r, kind: 'analysis' })),
        ...g.data.map((r) => ({ ...r, kind: 'cv' })),
      ].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
      setItems(merged)
    })
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <header className="fade-up">
        <p className="text-sm text-neutral-400">Welcome back,</p>
        <h1 className="break-all text-2xl font-extrabold tracking-tight sm:text-3xl">{user.email} 👋</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <BigCard to="/improve" emoji="🔥" title="Roast & Improve my CV" text="Get a score, a brutally honest roast, and concrete fixes for your existing CV." />
        <BigCard to="/generate" emoji="💬" title="I don't have a CV, build one with me" text="Chat with an AI career coach and get a clean, professional one-page CV." />
      </div>

      {plans?.length > 0 && (
        <section className="fade-up">
          <h2 className="mb-3 text-lg font-bold">My Growth Plans 🌱</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const progress = safeProgress(p)
              return (
                <li key={p.id}>
                  <Link to={`/plan/${p.analysis_id}`} className="card flex flex-col gap-3 p-4 hover:border-fire-500/40 hover:bg-neutral-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold" dir="auto">{p.inputs?.targetRole || 'Growth Plan'}</p>
                        <p className="text-xs text-neutral-500">
                          {p.inputs?.weeks} weeks · {p.inputs?.hours} h/week · {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-fire-400">{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-fire-500 to-ember-600" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-fire-400">Open plan →</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="fade-up">
        <h2 className="mb-3 text-lg font-bold">Your history</h2>
        <ErrorBox message={error} />
        {items === null ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items.length === 0 && !error ? (
          <p className="card p-6 text-center text-neutral-400">Nothing here yet. Roast a CV or build one to get started.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((it) => (
              <li key={`${it.kind}-${it.id}`}>
                <Link
                  to={it.kind === 'analysis' ? `/analysis/${it.id}` : `/cv/${it.id}`}
                  className="card flex items-center gap-4 p-4 hover:border-fire-500/40 hover:bg-neutral-900"
                >
                  {it.kind === 'analysis' ? (
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                      style={{ borderColor: scoreColor(it.score), color: scoreColor(it.score) }}
                    >
                      {it.score}
                    </span>
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fire-500/15 text-xl">📄</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" dir="auto">
                      {it.kind === 'analysis' ? it.verdict : `${it.full_name || 'Untitled'}${it.title ? ` · ${it.title}` : ''}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {it.kind === 'analysis' ? (it.job_description ? 'Roast · targeted' : 'Roast') : 'Generated CV'} ·{' '}
                      {new Date(it.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-neutral-600">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
