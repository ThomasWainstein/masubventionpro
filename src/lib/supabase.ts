import { createClient } from '@supabase/supabase-js'

// Uses the same Supabase backend as subvention360.com
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Use new publishable key (legacy anon keys are disabled)
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
