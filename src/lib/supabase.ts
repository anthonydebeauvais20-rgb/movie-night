import { createClient } from '@supabase/supabase-js'

// Both values are public by design: what a visitor may read or write is enforced by the database's
// row level security, not by keeping this key secret.
export const SUPABASE_URL = 'https://psizuutdnanhhvzrdxqp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QW1habYA7nMCSu9udaDcSg_KJo9Cxz0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { flowType: 'pkce' },
})

// Where Google and e-mail links bring the visitor back: the app's own address, wherever it is served.
export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}
