import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // If you're seeing "TypeError: Failed to fetch" anywhere on the site, this is almost
  // always why: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set for this deploy.
  // Vite env vars are baked in at BUILD time, so after adding/fixing them in Vercel
  // you must trigger a new deploy.
  console.error('[ISF Holy Grail] Missing Supabase config (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
}

// ---- session ------------------------------------------------------------
// After a valid access code the server hands back a signed token. Supabase
// checks that signature on every request, so the database itself refuses
// anyone without one -- the gate screen alone is only cosmetic.
export const SESSION_KEY = 'isf-holy-grail-beta-token'

function decodePayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

export function getSessionToken() {
  try {
    const token = sessionStorage.getItem(SESSION_KEY)
    if (!token) return null
    const payload = decodePayload(token)
    if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY) // expired, or an old-style token: ask for the code again
      return null
    }
    return token
  } catch {
    return null
  }
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  // Returning null makes supabase-js fall back to the anon key, which is
  // exactly right before a code has been entered.
  accessToken: async () => getSessionToken(),
})

export function applySession(token) {
  sessionStorage.setItem(SESSION_KEY, token)
  supabase.realtime.setAuth(token) // live updates need the token too
}
