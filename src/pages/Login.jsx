import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'

export default function Login() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!loading && user) return <Navigate to={location.state?.from || '/dashboard'} replace />

  async function submit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // Confirmation emails link back to whichever domain the app runs on (localhost, Vercel preview, prod).
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        })
        if (error) throw error
        if (!data.session) {
          setInfo('Account created! Check your inbox to confirm your email, then sign in.')
          setMode('signin')
        }
      }
      // On success with a session, onAuthStateChange updates the context and <Navigate> redirects.
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? "Couldn't reach the authentication server. Check your Supabase settings."
          : err.message || 'Authentication failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8 sm:py-16">
      <div className="fade-up text-center">
        <div className="mb-3 text-5xl">🔥</div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your CV, <span className="bg-gradient-to-r from-fire-400 to-ember-500 bg-clip-text text-transparent">roasted</span>.
        </h1>
        <p className="mt-2 text-neutral-400">Brutally honest feedback and an AI coach to build a better one.</p>
      </div>

      <form onSubmit={submit} className="card fade-up flex flex-col gap-4 p-6">
        <div className="grid grid-cols-2 rounded-xl bg-neutral-950 p-1 text-sm">
          {[
            ['signin', 'Sign in'],
            ['signup', 'Sign up'],
          ].map(([m, label]) => (
            <button
              type="button"
              key={m}
              onClick={() => {
                setMode(m)
                setError('')
              }}
              className={`rounded-lg py-2 font-medium transition ${mode === m ? 'bg-gradient-to-r from-fire-500 to-ember-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <ErrorBox message={error} />
        {info && <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">{info}</p>}

        <button type="submit" className="btn-fire mt-1" disabled={busy}>
          {busy && <Spinner size="sm" className="!border-white !border-t-transparent" />}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
