import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { appUrl, supabase } from '../lib/supabase'
import { exportAccountData } from '../lib/sync'
import type { SyncStatus } from '../lib/useSync'
import { inputClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui'

interface Props {
  session: Session | null
  syncStatus: SyncStatus
  onSignOut: () => Promise<void>
  onAccountDeleted: () => Promise<void>
}

const SYNC_LABELS: Partial<Record<SyncStatus, string>> = {
  syncing: 'Synchronisation…',
  synced: 'Ta bibliothèque et tes réglages sont à jour sur tous tes appareils.',
  offline: 'Pas de connexion au serveur pour l’instant : tes changements partiront dès qu’elle reviendra.',
  choosing: 'En attente de ton choix pour les titres de cet appareil (en haut de la page).',
}

type Step = { kind: 'email' } | { kind: 'code'; email: string }

// Supabase answers in English; these are the cases a visitor can run into.
function loginErrorMessage(message: string): string {
  if (/not authori[sz]ed/i.test(message)) {
    return 'La connexion par e-mail n’est pas encore ouverte à toutes les adresses. Utilise Google pour le moment.'
  }
  if (/rate limit|too many|seconds/i.test(message)) return 'Trop de demandes d’un coup. Patiente une minute et réessaie.'
  if (/expired|invalid/i.test(message)) return 'Ce code ne marche pas ou a expiré. Vérifie-le, ou demande-en un nouveau.'
  return 'La connexion a échoué. Réessaie dans un instant.'
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-4 w-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function SignIn() {
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl() } })
    if (error) setError(loginErrorMessage(error.message))
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!address) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: appUrl() } })
    setBusy(false)
    if (error) setError(loginErrorMessage(error.message))
    else {
      setCode('')
      setStep({ kind: 'code', email: address })
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    if (step.kind !== 'code') return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: step.email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(loginErrorMessage(error.message))
  }

  return (
    <>
      <p className="mt-0.5 text-xs text-muted">
        Connecte-toi pour retrouver ta bibliothèque et tes réglages sur tous tes appareils. Sans compte, tout reste sur
        cet appareil.
      </p>

      <button type="button" onClick={signInWithGoogle} className={`${secondaryButtonClass} mt-3 flex w-full items-center justify-center gap-2`}>
        <GoogleMark />
        Continuer avec Google
      </button>

      {step.kind === 'email' ? (
        <form onSubmit={sendCode} className="mt-4">
          <label className="block text-xs text-muted">
            Ou reçois un code par e-mail
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@adresse.fr"
              className={`${inputClass} text-sm`}
            />
          </label>
          <button type="submit" disabled={busy || !email.trim()} className={`${secondaryButtonClass} mt-2 w-full disabled:opacity-40`}>
            {busy ? 'Envoi…' : 'Recevoir un code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-4">
          <label className="block text-xs text-muted">
            Code reçu à {step.email}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={`${inputClass} text-center font-poster text-lg tracking-[0.3em]`}
            />
          </label>
          <button type="submit" disabled={busy || code.length < 6} className={`${primaryButtonClass} mt-2 w-full`}>
            {busy ? 'Vérification…' : 'Me connecter'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep({ kind: 'email' })
              setError(null)
            }}
            className="mt-2 text-xs text-muted underline underline-offset-4 hover:text-fg"
          >
            Changer d’adresse ou renvoyer un code
          </button>
        </form>
      )}

      {error && <p className="mt-3 rounded-sm border border-dashed border-line bg-tint px-3 py-2 text-xs text-fg">{error}</p>}
    </>
  )
}

function SignedIn({ session, syncStatus, onSignOut, onAccountDeleted }: Props & { session: Session }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One account can gather several ways in (e-mail code and Google, when they share the address).
  const providers: string[] = session.user.app_metadata.providers ?? [session.user.app_metadata.provider ?? 'email']
  const ways = providers.map((p) => (p === 'google' ? 'Google' : p === 'email' ? 'code par e-mail' : p)).join(' ou ')

  async function deleteAccount() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      setBusy(false)
      setError('La suppression a échoué. Réessaie dans un instant.')
      return
    }
    await onAccountDeleted()
  }

  async function downloadData() {
    setError(null)
    try {
      const blob = await exportAccountData(session.user.email)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `movie-night-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      setError('Le téléchargement a échoué. Réessaie dans un instant.')
    }
  }

  return (
    <>
      <p className="mt-1 text-sm text-fg">
        Connecté·e avec <span className="font-semibold">{session.user.email}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted">Connexion possible par {ways}.</p>
      {SYNC_LABELS[syncStatus] && <p className="mt-2 text-xs text-fg">{SYNC_LABELS[syncStatus]}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setBusy(true)
            onSignOut()
          }}
          disabled={busy}
          className={secondaryButtonClass}
        >
          Me déconnecter
        </button>
        <button type="button" onClick={downloadData} className={secondaryButtonClass}>
          Télécharger mes données
        </button>
        {!confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-1 text-sm text-muted underline underline-offset-4 hover:text-fg"
          >
            Supprimer mon compte
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="mt-3 rounded-sm border border-dashed border-line bg-tint px-3 py-3 text-sm text-fg">
          <p>
            Ton compte et toute ta bibliothèque seront effacés définitivement, en ligne comme sur cet appareil. Pense à
            télécharger tes données avant si tu veux les garder.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={deleteAccount} disabled={busy} className={primaryButtonClass}>
              {busy ? 'Suppression…' : 'Oui, supprimer mon compte'}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className={secondaryButtonClass}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-sm border border-dashed border-line bg-tint px-3 py-2 text-xs text-fg">{error}</p>}
    </>
  )
}

export default function AccountSection(props: Props) {
  return (
    <div className="mb-6 border-b border-line/25 pb-5">
      <p className="text-sm font-semibold text-fg">Compte</p>
      {props.session ? <SignedIn {...props} session={props.session} /> : <SignIn />}
    </div>
  )
}
