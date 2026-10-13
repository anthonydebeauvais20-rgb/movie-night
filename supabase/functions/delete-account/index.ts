// Deletes the signed-in visitor's account. Their rows in the app's tables go with it (on delete cascade).
import { createClient } from 'npm:@supabase/supabase-js@2'

// Same list as the tmdb function: the published site, plus local dev servers.
const ALLOWED_ORIGINS = [
  /^https:\/\/anthonydebeauvais20-rgb\.github\.io$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http:\/\/(192\.168|10)\.\d+\.\d+(\.\d+)?(:\d+)?$/,
]

function json(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

function adminKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) return JSON.parse(secretKeys).default
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  if (!ALLOWED_ORIGINS.some((re) => re.test(origin))) return json(403, { error: 'origin_not_allowed' }, {})

  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors)

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'not_signed_in' }, cors)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, adminKey(), { auth: { persistSession: false } })
  // The token must belong to a real, signed-in user: that user, and only that one, is deleted.
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json(401, { error: 'not_signed_in' }, cors)

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json(500, { error: 'delete_failed' }, cors)
  return json(200, { deleted: true }, cors)
})
