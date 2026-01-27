import { createClient } from '@supabase/supabase-js'

// Uses the same Supabase backend as subvention360.com
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Opaque publishable key (required - legacy JWT keys are disabled on this project)
// Note: This key does not support REST API access, so conversation_history falls back to session storage
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-gvfgvbztagafjykncwto-auth-token',
  }
})
