import { useCallback, useEffect, useRef, useState } from 'react'
import { clearAccountData } from './storage'
import { isLinkedTo, linkDevice, localTitleCount, syncNow } from './sync'
import { supabase } from './supabase'

// off: signed out. choosing: the device holds titles and the user must say whether they join the account.
export type SyncStatus = 'off' | 'choosing' | 'syncing' | 'synced' | 'offline'

const PUSH_DELAY_MS = 1500

// Runs the sync for the signed-in user. `onLocalReplaced` is called whenever the sync rewrote the
// device's copy, so the app re-reads it from localStorage.
export function useSync(userId: string | null, onLocalReplaced: () => void) {
  const [status, setStatus] = useState<SyncStatus>('off')
  const [deviceTitles, setDeviceTitles] = useState(0)
  const reload = useRef(onLocalReplaced)
  useEffect(() => {
    reload.current = onLocalReplaced
  })

  // One sync at a time; a request arriving meanwhile runs once the current one ends.
  const running = useRef(false)
  const again = useRef(false)
  const pushTimer = useRef<number | undefined>(undefined)

  const runSync = useCallback(async () => {
    if (!userId || !isLinkedTo(userId)) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    try {
      do {
        again.current = false
        const changed = await syncNow(userId)
        if (changed) reload.current()
      } while (again.current)
      setStatus('synced')
    } catch {
      setStatus('offline')
    } finally {
      running.current = false
    }
  }, [userId])

  useEffect(() => {
    window.clearTimeout(pushTimer.current)
    if (!userId) {
      setStatus('off')
      return
    }
    if (isLinkedTo(userId)) {
      setStatus('syncing')
      runSync()
      return
    }
    const count = localTitleCount()
    if (count > 0) {
      setDeviceTitles(count)
      setStatus('choosing')
      return
    }
    setStatus('syncing')
    linkDevice(userId, true)
      .then(() => {
        reload.current()
        return runSync()
      })
      .catch(() => setStatus('offline'))
  }, [userId, runSync])

  // Catch up with the other devices when coming back to the app or back online.
  useEffect(() => {
    if (!userId) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') runSync()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', runSync)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', runSync)
    }
  }, [userId, runSync])

  // Called after every local change; changes in quick succession (filter clicks…) are sent together.
  const schedulePush = useCallback(() => {
    if (!userId) return
    window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(runSync, PUSH_DELAY_MS)
  }, [userId, runSync])

  const chooseDeviceTitles = useCallback(
    async (keep: boolean) => {
      if (!userId) return
      setStatus('syncing')
      try {
        await linkDevice(userId, keep)
        reload.current()
        await runSync()
      } catch {
        setStatus('choosing')
      }
    },
    [userId, runSync],
  )

  // Signing out sends the last changes, then removes the account's data from this device.
  const signOut = useCallback(async () => {
    window.clearTimeout(pushTimer.current)
    await runSync().catch(() => {})
    await supabase.auth.signOut()
    clearAccountData()
    reload.current()
  }, [runSync])

  // After the account was deleted on the server: same cleanup, without anything left to send.
  const forgetAccount = useCallback(async () => {
    window.clearTimeout(pushTimer.current)
    await supabase.auth.signOut({ scope: 'local' })
    clearAccountData()
    reload.current()
  }, [])

  return { status, deviceTitles, schedulePush, chooseDeviceTitles, signOut, forgetAccount }
}
