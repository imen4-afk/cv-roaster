import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Improve from './pages/Improve'
import Generate from './pages/Generate'
import AnalysisView from './pages/AnalysisView'
import CvView from './pages/CvView'
import { MISSING_ENV_MESSAGE, missingSupabaseEnv, supabaseConfigured } from './lib/supabase'

function MissingEnv() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div role="alert" className="card max-w-md p-6 text-center">
        <div className="mb-3 text-4xl">⚙️</div>
        <h1 className="text-xl font-bold">CV Roaster isn't configured</h1>
        <p className="mt-2 text-neutral-300">{MISSING_ENV_MESSAGE}</p>
        <p className="mt-4 text-sm text-neutral-500">Missing:</p>
        <ul className="mt-1 font-mono text-sm text-fire-400">
          {missingSupabaseEnv.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigured) return <MissingEnv />

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="print-reset mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/improve" element={<Improve />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/analysis/:id" element={<AnalysisView />} />
            <Route path="/cv/:id" element={<CvView />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
