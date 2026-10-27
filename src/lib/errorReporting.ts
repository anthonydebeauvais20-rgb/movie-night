// Sends the errors visitors run into to Supabase (table client_errors), so they get fixed without anyone
// having to describe them. Only the error itself, the page and the browser: no account id, no title data.
import { supabase } from './supabase'

export type ErrorKind = 'crash' | 'error' | 'promise' | 'draw'

const MAX_REPORTS_PER_VISIT = 5
const sent = new Set<string>()

// Noise browsers raise on their own, which says nothing about the app.
const IGNORED = [/ResizeObserver loop/i, /^Script error\.?$/i, /Load failed/i, /Failed to fetch/i, /NetworkError/i]

function describe(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack ?? null }
  return { message: String(error), stack: null }
}

export function reportError(kind: ErrorKind, error: unknown): void {
  if (import.meta.env.DEV || !navigator.onLine) return
  const { message, stack } = describe(error)
  if (IGNORED.some((re) => re.test(message))) return
  const key = `${kind}:${message}`
  if (sent.has(key) || sent.size >= MAX_REPORTS_PER_VISIT) return
  sent.add(key)

  supabase.auth
    .getSession()
    .then(({ data }) =>
      supabase.from('client_errors').insert({
        kind,
        message: message.slice(0, 1000),
        stack: stack?.slice(0, 4000) ?? null,
        page: (window.location.pathname + window.location.hash).slice(0, 200),
        app_version: (import.meta.env.VITE_APP_VERSION ?? 'local').slice(0, 64),
        user_agent: navigator.userAgent.slice(0, 300),
        signed_in: Boolean(data.session),
      }),
    )
    // Reporting must never become a problem of its own.
    .catch(() => {})
}

export function installGlobalErrorReporting(): void {
  window.addEventListener('error', (event) => reportError('error', event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => reportError('promise', event.reason))
}
