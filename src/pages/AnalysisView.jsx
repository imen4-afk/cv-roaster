import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { validateRoast } from '../lib/prompts'
import AnalysisResult, { GrowthPlanCta } from '../components/AnalysisResult'
import ErrorBox from '../components/ErrorBox'
import Spinner from '../components/Spinner'

export default function AnalysisView() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [error, setError] = useState('')
  const [showCv, setShowCv] = useState(false)

  useEffect(() => {
    supabase
      .from('cv_analyses')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError("We couldn't load this analysis. It may have been deleted.")
        else setRow(data)
      })
  }, [id])

  if (error) return <ErrorBox message={error} />
  if (!row) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="flex flex-col gap-6">
      <div className="fade-up flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-sm text-neutral-400 hover:text-white">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-extrabold">CV roast</h1>
          <p className="text-sm text-neutral-500">{new Date(row.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCv((s) => !s)} className="btn-ghost">{showCv ? 'Hide' : 'Show'} original CV</button>
          <Link to="/improve" state={{ cvText: row.cv_text }} className="btn-fire !py-2.5 text-sm">Roast again</Link>
        </div>
      </div>
      {showCv && (
        <pre className="card fade-up max-h-96 overflow-auto whitespace-pre-wrap p-4 text-sm text-neutral-300" dir="auto">
          {row.cv_text}
        </pre>
      )}
      <AnalysisResult result={validateRoast(row.result)} />
      <GrowthPlanCta analysisId={row.id} />
    </div>
  )
}
