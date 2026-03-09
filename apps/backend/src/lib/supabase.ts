import { createClient } from '@supabase/supabase-js'
import env from '@/config/env'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY; supabaseAdmin will not be fully functional')
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
)

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

export default supabaseAdmin