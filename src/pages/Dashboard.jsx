import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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

export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

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
