import type { Filters, LibraryView, SeenEntry, ThemePreference, TitleRef, WatchlistEntry } from '../types'

// The theme key is also read by the inline script in index.html, before the app loads.
const KEYS = {
  apiKey: 'movienight:apiKey',
  region: 'movienight:region',
  seen: 'movienight:seen',
  filters: 'movienight:filters',
  myProviders: 'movienight:myProviders',
  watchlist: 'movienight:watchlist',
  theme: 'movienight:theme',
  libraryView: 'movienight:libraryView',
  ratingScale: 'movienight:ratingScale',
  ignored: 'movienight:ignored',
  history: 'movienight:history',
  sync: 'movienight:sync',
} as const

// What an account carries from device to device; the theme and the library view stay per device.
const ACCOUNT_KEYS = [KEYS.seen, KEYS.watchlist, KEYS.ignored, KEYS.history, KEYS.filters, KEYS.region, KEYS.myProviders]

// After signing out or deleting the account, nothing of it stays on this device.
export function clearAccountData(): void {
  for (const key of ACCOUNT_KEYS) localStorage.removeItem(key)
  localStorage.removeItem(KEYS.sync)
}

export function getSyncSnapshot(): string | null {
  return localStorage.getItem(KEYS.sync)
}

export function setSyncSnapshot(raw: string | null): void {
  if (raw === null) localStorage.removeItem(KEYS.sync)
  else localStorage.setItem(KEYS.sync, raw)
}

export function getLibraryView(): LibraryView {
  return localStorage.getItem(KEYS.libraryView) === 'posters' ? 'posters' : 'shelf'
}

export function setLibraryView(view: LibraryView): void {
  localStorage.setItem(KEYS.libraryView, view)
}

export function getThemePreference(): ThemePreference {
  const raw = localStorage.getItem(KEYS.theme)
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

export function setThemePreference(theme: ThemePreference): void {
  if (theme === 'system') localStorage.removeItem(KEYS.theme)
  else localStorage.setItem(KEYS.theme, theme)
}

// The TMDB key used to be pasted in the settings; it now lives on the server, so any copy left here is erased.
export function forgetLegacyApiKey(): void {
  localStorage.removeItem(KEYS.apiKey)
}

export function getRegion(): string {
  return localStorage.getItem(KEYS.region) ?? 'FR'
}

export function setRegion(region: string): void {
  localStorage.setItem(KEYS.region, region)
}

export function getSeenList(): SeenEntry[] {
  const raw = localStorage.getItem(KEYS.seen)
  let list: SeenEntry[] = []
  if (raw) {
    try {
      list = JSON.parse(raw) as SeenEntry[]
    } catch {
      return []
    }
  }
  // Ratings used to be 1–5 whole stars; they are now out of 10 (half stars). Convert saved lists once.
  if (localStorage.getItem(KEYS.ratingScale) !== '10') {
    list = list.map((e) => (e.rating ? { ...e, rating: e.rating * 2 } : e))
    if (raw) saveSeenList(list)
    localStorage.setItem(KEYS.ratingScale, '10')
  }
  return list
}

export function saveSeenList(list: SeenEntry[]): void {
  localStorage.setItem(KEYS.seen, JSON.stringify(list))
}

export function upsertSeenEntry(entry: SeenEntry): SeenEntry[] {
  const list = getSeenList()
  const idx = list.findIndex((e) => e.id === entry.id && e.mediaType === entry.mediaType)
  if (idx >= 0) {
    list[idx] = entry
  } else {
    list.unshift(entry)
  }
  saveSeenList(list)
  return list
}

export function removeSeenEntry(id: number, mediaType: string): SeenEntry[] {
  const list = getSeenList().filter((e) => !(e.id === id && e.mediaType === mediaType))
  saveSeenList(list)
  return list
}

export function getFilters(): Partial<Filters> | null {
  const raw = localStorage.getItem(KEYS.filters)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Partial<Filters>
  } catch {
    return null
  }
}

export function saveFilters(filters: Filters): void {
  localStorage.setItem(KEYS.filters, JSON.stringify(filters))
}

export function getMyProviders(): number[] {
  const raw = localStorage.getItem(KEYS.myProviders)
  if (!raw) return []
  try {
    return JSON.parse(raw) as number[]
  } catch {
    return []
  }
}

export function setMyProviders(ids: number[]): void {
  localStorage.setItem(KEYS.myProviders, JSON.stringify(ids))
}

export function getWatchlist(): WatchlistEntry[] {
  const raw = localStorage.getItem(KEYS.watchlist)
  if (!raw) return []
  try {
    return JSON.parse(raw) as WatchlistEntry[]
  } catch {
    return []
  }
}

export function saveWatchlist(list: WatchlistEntry[]): void {
  localStorage.setItem(KEYS.watchlist, JSON.stringify(list))
}

export function addToWatchlist(entry: WatchlistEntry): WatchlistEntry[] {
  const list = getWatchlist()
  if (list.some((e) => e.id === entry.id && e.mediaType === entry.mediaType)) return list
  const next = [entry, ...list]
  saveWatchlist(next)
  return next
}

export function removeFromWatchlist(id: number, mediaType: string): WatchlistEntry[] {
  const list = getWatchlist().filter((e) => !(e.id === id && e.mediaType === mediaType))
  saveWatchlist(list)
  return list
}

function readTitles(key: string): TitleRef[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw) as TitleRef[]
  } catch {
    return []
  }
}

function writeTitles(key: string, list: TitleRef[]): TitleRef[] {
  localStorage.setItem(key, JSON.stringify(list))
  return list
}

const sameTitle = (a: TitleRef, id: number, mediaType: string) => a.id === id && a.mediaType === mediaType

// Titles the user asked never to be offered again, without marking them as seen.
export function getIgnored(): TitleRef[] {
  return readTitles(KEYS.ignored)
}

export function addIgnored(entry: TitleRef): TitleRef[] {
  const list = getIgnored()
  if (list.some((e) => sameTitle(e, entry.id, entry.mediaType))) return list
  return writeTitles(KEYS.ignored, [entry, ...list])
}

export function removeIgnored(id: number, mediaType: string): TitleRef[] {
  return writeTitles(KEYS.ignored, getIgnored().filter((e) => !sameTitle(e, id, mediaType)))
}

export function saveIgnored(list: TitleRef[]): void {
  writeTitles(KEYS.ignored, list)
}

const HISTORY_SIZE = 20

// The most recent draws, newest first; drawing a title again moves it back to the front.
export function getHistory(): TitleRef[] {
  return readTitles(KEYS.history)
}

export function pushHistory(entry: TitleRef): TitleRef[] {
  const rest = getHistory().filter((e) => !sameTitle(e, entry.id, entry.mediaType))
  return writeTitles(KEYS.history, [entry, ...rest].slice(0, HISTORY_SIZE))
}

export function clearHistory(): TitleRef[] {
  return writeTitles(KEYS.history, [])
}

export function saveHistory(list: TitleRef[]): void {
  writeTitles(KEYS.history, list.slice(0, HISTORY_SIZE))
}

// The stored filters as they are (possibly partial), for syncing them untouched.
export function getRawFilters(): Partial<Filters> {
  return getFilters() ?? {}
}

export function saveRawFilters(filters: Partial<Filters>): void {
  if (Object.keys(filters).length === 0) localStorage.removeItem(KEYS.filters)
  else localStorage.setItem(KEYS.filters, JSON.stringify(filters))
}
