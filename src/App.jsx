import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Improve from './pages/Improve'
import Generate from './pages/Generate'
import AnalysisView from './pages/AnalysisView'
import CvView from './pages/CvView'

export default function App() {
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
