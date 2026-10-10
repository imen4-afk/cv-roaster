import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const MISSING_ENV_MESSAGE = 'Missing environment variables. Add them in Vercel Project Settings and redeploy.'

export const missingSupabaseEnv = [
  !url && 'VITE_SUPABASE_URL',
  !anonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

export const supabaseConfigured = missingSupabaseEnv.length === 0

// Fall back to a placeholder so the app can still render the
// "missing environment variables" screen instead of a blank page.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)
