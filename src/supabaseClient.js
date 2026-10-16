import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // If you're seeing "TypeError: Failed to fetch" anywhere on the site, this is almost
  // always why: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set for this deploy.
  // Vite env vars are baked in at BUILD time, so after adding/fixing them in Vercel
  // (Project Settings -> Environment Variables) you must trigger a new deploy —
  // just saving the env vars is not enough.
  console.error(
    '[ISF Holy Grail] Missing Supabase config. VITE_SUPABASE_URL and/or ' +
    'VITE_SUPABASE_ANON_KEY are not set for this build. Every read/write to the ' +
    'database will fail until these are set in Vercel and the site is redeployed.'
  )
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')
