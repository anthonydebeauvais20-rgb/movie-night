// Library statistics (Bibliothèque > Stats). The library only stores what is shown on a spine, so genres and
// durations come from TMDB, once per title, and are kept on the device (key movienight:titleFacts).
import type { MediaType, SeenEntry, TitleRef } from '../types'
import { titleKey } from './draw'
import { GENRES, fetchTitleFacts } from './tmdb'
import type { TitleFacts } from './tmdb'

export const FACTS_KEY = 'movienight:titleFacts'

export type FactsByKey = Record<string, TitleFacts>

export function readFacts(): FactsByKey {
  try {
    return JSON.parse(localStorage.getItem(FACTS_KEY) ?? '{}') as FactsByKey
  } catch {
    return {}
  }
}

function writeFacts(facts: FactsByKey) {
  localStorage.setItem(FACTS_KEY, JSON.stringify(facts))
}

const PARALLEL_REQUESTS = 4

/**
 * Fetches the facts still missing for these titles, a few at a time, calling `onProgress` as they arrive.
 * A title that fails is skipped (it just doesn't count in genres and time) and retried on the next visit.
 */
export async function loadMissingFacts(
  titles: { id: number; mediaType: MediaType }[],
  onProgress: (facts: FactsByKey) => void,
  isCancelled: () => boolean,
): Promise<void> {
  const facts = readFacts()
  const missing = titles.filter((t) => !facts[titleKey(t.mediaType, t.id)])
  let next = 0
  async function worker() {
    while (next < missing.length && !isCancelled()) {
      const title = missing[next++]
      try {
        facts[titleKey(title.mediaType, title.id)] = await fetchTitleFacts(title.mediaType, title.id)
        writeFacts(facts)
        if (!isCancelled()) onProgress({ ...facts })
      } catch {
        // Left out for now.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL_REQUESTS, missing.length) }, worker))
}

/** The app's genre labels for TMDB genre ids; TV's merged genres ("Action & Adventure") count for both labels. */
export function genreLabels(mediaType: MediaType, genreIds: number[]): string[] {
  return GENRES.filter((g) => {
    const id = mediaType === 'movie' ? g.movieId : g.tvId
    return id !== null && genreIds.includes(id)
  }).map((g) => g.label)
}

export interface LibraryStats {
  total: number
  films: number
  series: number
  filmMinutes: number
  seriesMinutes: number
  // Titles whose genres and duration are not known yet (still loading, or TMDB failed).
  pending: number
  genres: [label: string, count: number][]
  decades: [decade: number, count: number][]
  rated: number
  averageRating: number | null
  favorites: number
  topRated: SeenEntry[]
  watchlistMinutes: number
}

const TOP_GENRES = 6

export function computeStats(seen: SeenEntry[], watchlist: TitleRef[], facts: FactsByKey): LibraryStats {
  const factsOf = (t: { id: number; mediaType: MediaType }) => facts[titleKey(t.mediaType, t.id)]
  let filmMinutes = 0
  let seriesMinutes = 0
  let pending = 0
  const genreCount = new Map<string, number>()
  const decadeCount = new Map<number, number>()

  for (const entry of seen) {
    const f = factsOf(entry)
    if (!f) pending++
    else {
      if (entry.mediaType === 'movie') filmMinutes += f.minutes ?? 0
      else seriesMinutes += f.minutes ?? 0
      for (const label of genreLabels(entry.mediaType, f.genreIds)) genreCount.set(label, (genreCount.get(label) ?? 0) + 1)
    }
    const year = Number(entry.year)
    if (year > 1800) {
      const decade = Math.floor(year / 10) * 10
      decadeCount.set(decade, (decadeCount.get(decade) ?? 0) + 1)
    }
  }

  const rated = seen.filter((e) => e.rating)
  const topRated = [...rated]
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        Number(b.favorite) - Number(a.favorite) ||
        b.dateAdded.localeCompare(a.dateAdded),
    )
    .slice(0, 3)

  return {
    total: seen.length,
    films: seen.filter((e) => e.mediaType === 'movie').length,
    series: seen.filter((e) => e.mediaType === 'tv').length,
    filmMinutes,
    seriesMinutes,
    pending,
    genres: [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .slice(0, TOP_GENRES),
    decades: [...decadeCount.entries()].sort((a, b) => a[0] - b[0]),
    rated: rated.length,
    averageRating: rated.length ? rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length : null,
    favorites: seen.filter((e) => e.favorite).length,
    topRated,
    watchlistMinutes: watchlist.reduce((sum, t) => sum + (factsOf(t)?.minutes ?? 0), 0),
  }
}

/** "25 j 4 h", "7 h", or "45 min": rounded to the hour first, so the hours never read 24. */
export function formatDuration(minutes: number): string {
  if (minutes > 0 && minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.round(minutes / 60)
  const days = Math.floor(hours / 24)
  return days > 0 ? `${days} j ${hours % 24} h` : `${hours} h`
}

/** "70" for the 1970s, "2010" for the 2010s, as in "les années 70", "les années 2010". */
export function decadeLabel(decade: number): string {
  return decade < 2000 ? String(decade).slice(2) : String(decade)
}
