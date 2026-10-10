import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { validateCv } from '../lib/prompts'
import CvTemplate from '../components/CvTemplate'
import CvActions from '../components/CvActions'
import ErrorBox from '../components/ErrorBox'
import Spinner from '../components/Spinner'

export default function CvView() {
  const { id } = useParams()
  const [cv, setCv] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('generated_cvs')
      .select('cv')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError("We couldn't load this CV. It may have been deleted.")
        try {
          setCv(validateCv(data.cv))
        } catch {
          setError('This saved CV looks corrupted.')
        }
      })
  }, [id])

  if (error) return <ErrorBox message={error} />
  if (!cv) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-sm text-neutral-400 hover:text-white">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Your generated CV</h1>
        </div>
        <CvActions cv={cv} />
      </div>
      <CvTemplate cv={cv} />
    </div>
  )
}
