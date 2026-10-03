import type { Filters, LibraryView, SeenEntry, ThemePreference, WatchlistEntry } from '../types'

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
} as const

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

export function getApiKey(): string {
  return localStorage.getItem(KEYS.apiKey) ?? ''
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEYS.apiKey, key.trim())
}

export function getRegion(): string {
  return localStorage.getItem(KEYS.region) ?? 'FR'
}

export function setRegion(region: string): void {
  localStorage.setItem(KEYS.region, region)
}

export function getSeenList(): SeenEntry[] {
  const raw = localStorage.getItem(KEYS.seen)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SeenEntry[]
  } catch {
    return []
  }
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

function saveWatchlist(list: WatchlistEntry[]): void {
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
