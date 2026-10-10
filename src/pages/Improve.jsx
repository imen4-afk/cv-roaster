import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { askGeminiJSON, friendlyError } from '../lib/gemini'
import { roastPrompt, validateRoast } from '../lib/prompts'
import { supabase } from '../lib/supabase'
import { SAMPLE_CVS } from '../lib/samples'
import AnalysisResult from '../components/AnalysisResult'
import ErrorBox from '../components/ErrorBox'
import { LoadingPanel } from '../components/Spinner'

export default function Improve() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [cvText, setCvText] = useState(location.state?.cvText || '')
  const [job, setJob] = useState('')
  const [showSamples, setShowSamples] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [result, setResult] = useState(null)
  const resultRef = useRef(null)

  // Clear router state so a refresh doesn't re-prefill after the user edits.
  useEffect(() => {
    if (location.state?.cvText) navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate])

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      setError('Please upload a plain .txt file (or paste the text directly).')
      return
    }
    setError('')
    setCvText(await file.text())
  }

  function loadSample(s) {
    setCvText(s.text)
    setJob(s.job)
    setShowSamples(false)
    setResult(null)
  }

  async function roast() {
    if (cvText.trim().length < 50) {
      setError('That CV looks a bit short. Paste the full text (at least a few lines).')
      return
    }
    setLoading(true)
    setError('')
    setSaveError('')
    setResult(null)
    try {
      const res = await askGeminiJSON(roastPrompt(cvText, job), validateRoast)
      setResult(res)
      const { error: dbError } = await supabase.from('cv_analyses').insert({
        user_id: user.id,
        cv_text: cvText,
        job_description: job.trim() || null,
        score: res.score,
        verdict: res.verdict,
        result: res,
      })
      if (dbError) setSaveError(`Result shown but not saved to your history: ${dbError.message}`)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight">Roast & improve my CV 🔥</h1>
        <p className="mt-1 text-neutral-400">Paste your CV, add a job description for a targeted roast, and brace yourself.</p>
      </header>

      <div className="card fade-up flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="cv" className="label !mb-0">Your CV</label>
            <div className="relative flex gap-2">
              <label className="btn-ghost cursor-pointer !py-1.5">
                📄 Upload .txt
                <input type="file" accept=".txt,text/plain" className="hidden" onChange={onFile} />
              </label>
              <button type="button" className="btn-ghost !py-1.5" onClick={() => setShowSamples((s) => !s)}>
                ✨ Try an example
              </button>
              {showSamples && (
                <div className="fade-up absolute right-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
                  {SAMPLE_CVS.map((s) => (
                    <button key={s.label} onClick={() => loadSample(s)} className="block w-full px-4 py-3 text-left transition hover:bg-white/5">
                      <p className="text-sm font-semibold">{s.label}</p>
                      <p className="text-xs text-neutral-400">{s.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <textarea
            id="cv"
            dir="auto"
            className="input min-h-64 resize-y font-mono text-sm"
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste the full text of your CV here…"
          />
        </div>

        <div>
          <label htmlFor="job" className="label">
            Target job description <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <textarea
            id="job"
            dir="auto"
            className="input min-h-28 resize-y text-sm"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Paste the job ad to see why your CV would (not) match it…"
          />
        </div>

        <ErrorBox message={error} onRetry={error && cvText.trim().length >= 50 ? roast : undefined} />

        <button onClick={roast} disabled={loading || !cvText.trim()} className="btn-fire self-stretch sm:self-start">
          {loading ? 'Roasting…' : '🔥 Roast my CV'}
        </button>
      </div>

      <div ref={resultRef} className="scroll-mt-20">
        {loading && <LoadingPanel title="Heating up the grill…" subtitle="Our AI recruiter is reading your CV line by line." />}
        {result && (
          <>
            {saveError && <p className="mb-4 text-sm text-amber-400">{saveError}</p>}
            <AnalysisResult result={result} />
          </>
        )}
      </div>
    </div>
  )
}
