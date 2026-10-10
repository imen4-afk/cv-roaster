import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm transition ${isActive ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="no-print sticky top-0 z-20 border-b border-white/5 bg-neutral-950/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <Link to={user ? '/dashboard' : '/login'} className="mr-auto flex items-center gap-2 font-bold tracking-tight">
          <span className="text-xl">🔥</span>
          <span className="bg-gradient-to-r from-fire-400 to-ember-500 bg-clip-text text-transparent">CV Roaster</span>
        </Link>
        {user && (
          <>
            <div className="flex items-center gap-1">
              {[
                ['/dashboard', '🏠', 'Dashboard'],
                ['/improve', '🔥', 'Roast'],
                ['/generate', '💬', 'Build'],
              ].map(([to, icon, label]) => (
                <NavLink key={to} to={to} className={linkClass} aria-label={label}>
                  <span className="sm:hidden">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </div>
            <button onClick={logout} className="btn-ghost !px-3 !py-1.5">
              Log out
            </button>
          </>
        )}
      </nav>
    </header>
  )
}
