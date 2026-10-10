import { useNavigate } from 'react-router-dom'
import { cvToText } from '../lib/cvText'

export default function CvActions({ cv, children }) {
  const navigate = useNavigate()
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button onClick={() => window.print()} className="btn-fire !py-2.5 text-sm">
        ⬇️ Download PDF
      </button>
      <button onClick={() => navigate('/improve', { state: { cvText: cvToText(cv) } })} className="btn-ghost">
        🔥 Roast this CV
      </button>
      {children}
    </div>
  )
}
