// Proxy to the TMDB API: the app calls /functions/v1/tmdb/<tmdb path>?<params> and this function adds the API
// key, which stays a Supabase secret (TMDB_API_KEY) instead of living in every visitor's browser.

const TMDB_BASE = 'https://api.themoviedb.org/3'

// Only the endpoints the app uses, so the key cannot be used for anything else through this proxy.
const ALLOWED_PATHS: [RegExp, number][] = [
  // [path, seconds the browser may keep the answer]
  [/^\/discover\/(movie|tv)$/, 60 * 60],
  [/^\/search\/(multi|person)$/, 60 * 60],
  [/^\/(movie|tv)\/\d+$/, 60 * 60 * 24],
  [/^\/(movie|tv)\/\d+\/videos$/, 60 * 60 * 24],
  [/^\/person\/\d+\/combined_credits$/, 60 * 60 * 24],
  [/^\/watch\/providers\/(movie|tv)$/, 60 * 60 * 24],
]

// The published site, plus local dev servers (including a phone on the home network).
const ALLOWED_ORIGINS = [
  /^https:\/\/anthonydebeauvais20-rgb\.github\.io$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^http:\/\/(192\.168|10)\.\d+\.\d+(\.\d+)?(:\d+)?$/,
]

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  if (!ALLOWED_ORIGINS.some((re) => re.test(origin))) return json(403, { error: 'origin_not_allowed' })

  const cors = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET' } })
  }
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' }, cors)

  const url = new URL(req.url)
  // The function sees its own name in the path (/tmdb/...), sometimes behind /functions/v1.
  const path = url.pathname.replace(/^(\/functions\/v1)?\/tmdb/, '')
  const rule = ALLOWED_PATHS.find(([re]) => re.test(path))
  if (!rule) return json(404, { error: 'unknown_endpoint' }, cors)

  const apiKey = Deno.env.get('TMDB_API_KEY')
  if (!apiKey) return json(500, { error: 'missing_api_key' }, cors)

  const upstream = new URL(TMDB_BASE + path)
  for (const [key, value] of url.searchParams) {
    if (key !== 'api_key') upstream.searchParams.set(key, value)
  }
  upstream.searchParams.set('api_key', apiKey)

  let res: Response
  try {
    res = await fetch(upstream)
  } catch {
    return json(502, { error: 'tmdb_unreachable' }, cors)
  }
  // A 401 from TMDB means the server-side key is wrong: that is our problem, not the visitor's.
  if (res.status === 401) return json(502, { error: 'tmdb_rejected_key' }, cors)

  const headers: Record<string, string> = { ...cors, 'Content-Type': 'application/json' }
  if (res.ok) headers['Cache-Control'] = `public, max-age=${rule[1]}`
  return new Response(res.body, { status: res.status, headers })
})
