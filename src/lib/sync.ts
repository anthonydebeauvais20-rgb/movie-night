// Keeps the signed-in user's library and settings in Supabase, with this device's localStorage as the
// working copy. The app keeps reading and writing localStorage; syncing compares it with a snapshot of
// what was last agreed with the server, pushes the difference, then pulls the server's version.
// Changes made offline therefore survive a reload: they are still a difference from the snapshot.
import type { Filters, MediaType, SeenEntry, TitleRef } from '../types'
import {
  getHistory,
  getIgnored,
  getMyProviders,
  getRawFilters,
  getRegion,
  getSeenList,
  getSyncSnapshot,
  getWatchlist,
  saveHistory,
  saveIgnored,
  saveRawFilters,
  saveSeenList,
  saveWatchlist,
  setMyProviders,
  setRegion,
  setSyncSnapshot,
} from './storage'
import { supabase } from './supabase'

type ListName = 'seen' | 'watchlist' | 'ignored'

// A library_items row, minus user_id and updated_at.
export interface ItemRow {
  list: ListName
  media_type: MediaType
  tmdb_id: number
  title: string
  poster_path: string | null
  year: string
  date_added: string
  rating: number | null
  comment: string
  favorite: boolean
  deleted: boolean
}

interface Snapshot {
  userId: string
  items: Record<string, string>
  state: string | null
}

interface AccountState {
  settings: { region: string; myProviders: number[]; filters: Partial<Filters> }
  history: TitleRef[]
}

const keyOf = (row: Pick<ItemRow, 'list' | 'media_type' | 'tmdb_id'>) => `${row.list}:${row.media_type}:${row.tmdb_id}`

const isoDate = (value: string) => {
  const time = Date.parse(value)
  return Number.isNaN(time) ? new Date(0).toISOString() : new Date(time).toISOString()
}

function toRow(list: ListName, entry: TitleRef | SeenEntry): ItemRow {
  const seen = list === 'seen' ? (entry as SeenEntry) : null
  const rating = seen?.rating ? Math.min(10, Math.max(1, Math.round(seen.rating))) : null
  return {
    list,
    media_type: entry.mediaType,
    tmdb_id: entry.id,
    title: entry.title.slice(0, 500),
    poster_path: entry.posterPath,
    year: (entry.year ?? '').slice(0, 10),
    date_added: isoDate(entry.dateAdded),
    rating,
    comment: (seen?.comment ?? '').slice(0, 5000),
    favorite: seen?.favorite ?? false,
    deleted: false,
  }
}

function localRows(): Map<string, ItemRow> {
  const rows = new Map<string, ItemRow>()
  const add = (list: ListName, entries: (TitleRef | SeenEntry)[]) => {
    for (const entry of entries) {
      const row = toRow(list, entry)
      rows.set(keyOf(row), row)
    }
  }
  add('seen', getSeenList())
  add('watchlist', getWatchlist())
  add('ignored', getIgnored())
  return rows
}

function localState(): AccountState {
  return {
    settings: { region: getRegion(), myProviders: getMyProviders(), filters: getRawFilters() },
    history: getHistory(),
  }
}

function writeLocalLists(rows: ItemRow[]) {
  const live = rows.filter((r) => !r.deleted).sort((a, b) => b.date_added.localeCompare(a.date_added))
  const ref = (r: ItemRow): TitleRef => ({
    id: r.tmdb_id,
    mediaType: r.media_type,
    title: r.title,
    posterPath: r.poster_path,
    year: r.year,
    dateAdded: r.date_added,
  })
  saveSeenList(
    live
      .filter((r) => r.list === 'seen')
      .map((r): SeenEntry => ({ ...ref(r), rating: r.rating, comment: r.comment, favorite: r.favorite })),
  )
  saveWatchlist(live.filter((r) => r.list === 'watchlist').map(ref))
  saveIgnored(live.filter((r) => r.list === 'ignored').map(ref))
}

function writeLocalState(state: AccountState) {
  setRegion(state.settings.region || 'FR')
  setMyProviders(Array.isArray(state.settings.myProviders) ? state.settings.myProviders : [])
  saveRawFilters(state.settings.filters ?? {})
  saveHistory(Array.isArray(state.history) ? state.history : [])
}

// Everything the device holds for the account, to notice changes made while a sync is under way.
function fingerprint(): string {
  return JSON.stringify([[...localRows().entries()], localState()])
}

function readSnapshot(): Snapshot | null {
  const raw = getSyncSnapshot()
  if (!raw) return null
  try {
    return JSON.parse(raw) as Snapshot
  } catch {
    return null
  }
}

function saveSnapshot(userId: string) {
  const items: Record<string, string> = {}
  for (const [key, row] of localRows()) items[key] = JSON.stringify(row)
  setSyncSnapshot(JSON.stringify({ userId, items, state: JSON.stringify(localState()) } satisfies Snapshot))
}

export function isLinkedTo(userId: string): boolean {
  return readSnapshot()?.userId === userId
}

export function localTitleCount(): number {
  return getSeenList().length + getWatchlist().length + getIgnored().length
}

const PAGE = 1000

async function fetchServer(): Promise<{ rows: ItemRow[]; state: AccountState | null }> {
  const rows: ItemRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('library_items')
      .select('list, media_type, tmdb_id, title, poster_path, year, date_added, rating, comment, favorite, deleted')
      .order('date_added', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data.map((r) => ({ ...r, date_added: isoDate(r.date_added) }) as ItemRow))
    if (data.length < PAGE) break
  }
  const { data: stateRow, error } = await supabase.from('user_state').select('settings, history').maybeSingle()
  if (error) throw error
  return { rows, state: stateRow ? (stateRow as AccountState) : null }
}

// Sends what changed on this device since the snapshot; throws when the server can't be reached.
async function push(userId: string, snapshot: Snapshot): Promise<void> {
  const current = localRows()
  const now = new Date().toISOString()
  const changes: (ItemRow & { user_id: string; updated_at: string })[] = []
  for (const [key, row] of current) {
    if (snapshot.items[key] !== JSON.stringify(row)) changes.push({ ...row, user_id: userId, updated_at: now })
  }
  for (const [key, raw] of Object.entries(snapshot.items)) {
    if (!current.has(key)) changes.push({ ...(JSON.parse(raw) as ItemRow), deleted: true, user_id: userId, updated_at: now })
  }
  if (changes.length > 0) {
    const { error } = await supabase.from('library_items').upsert(changes, { onConflict: 'user_id,list,media_type,tmdb_id' })
    if (error) throw error
  }

  const state = localState()
  if (JSON.stringify(state) !== snapshot.state) {
    const { error } = await supabase
      .from('user_state')
      .upsert({ user_id: userId, ...state, updated_at: now }, { onConflict: 'user_id' })
    if (error) throw error
  }
}

// One full round: push this device's changes, then take the server's version of everything.
// Returns true when the local data changed, so the app re-reads it.
export async function syncNow(userId: string): Promise<boolean> {
  const snapshot = readSnapshot()
  if (!snapshot || snapshot.userId !== userId) throw new Error('device_not_linked')

  const before = fingerprint()
  await push(userId, snapshot)
  saveSnapshot(userId)
  const server = await fetchServer()
  // Something was edited while we were talking to the server: leave it for the next round.
  if (fingerprint() !== before) return false

  writeLocalLists(server.rows)
  if (server.state) writeLocalState(server.state)
  saveSnapshot(userId)
  return fingerprint() !== before
}

// Ties this device to the account the first time it signs in. With keepLocal, titles found on the device
// are added to the account (the account's version wins for titles in both); otherwise they are dropped.
export async function linkDevice(userId: string, keepLocal: boolean): Promise<void> {
  const server = await fetchServer()
  const local = keepLocal ? localRows() : new Map<string, ItemRow>()
  const serverLive = server.rows.filter((r) => !r.deleted)
  const serverKeys = new Set(serverLive.map(keyOf))
  const localOnly = [...local.values()].filter((r) => !serverKeys.has(keyOf(r)))

  const localStateBefore = keepLocal ? localState() : null
  writeLocalLists(serverLive)
  if (server.state) writeLocalState(server.state)
  else if (localStateBefore) writeLocalState(localStateBefore)
  // The snapshot now matches the server, so the next sync pushes exactly what only this device had.
  saveSnapshot(userId)
  if (!server.state && localStateBefore) {
    const snapshot = readSnapshot()!
    setSyncSnapshot(JSON.stringify({ ...snapshot, state: null } satisfies Snapshot))
  }
  if (localOnly.length > 0) writeLocalLists([...serverLive, ...localOnly])
}

// The account's online data, as a file the user can keep (RGPD right to data portability).
export async function exportAccountData(email: string | undefined): Promise<Blob> {
  const server = await fetchServer()
  const live = server.rows.filter((r) => !r.deleted)
  const data = {
    exportedAt: new Date().toISOString(),
    account: { email },
    seen: live.filter((r) => r.list === 'seen'),
    watchlist: live.filter((r) => r.list === 'watchlist'),
    ignored: live.filter((r) => r.list === 'ignored'),
    settings: server.state?.settings ?? null,
    recentDraws: server.state?.history ?? [],
  }
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}
