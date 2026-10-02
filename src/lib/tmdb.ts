import type { CastMember, DetailedTitle, Filters, Genre, GenreMatch, GenreOption, MediaType, TmdbListItem, WatchProvider } from '../types'
import { getApiKey, getRegion } from './storage'

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export class TmdbError extends Error {}

async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const apiKey = getApiKey()
  if (!apiKey) throw new TmdbError('missing_api_key')

  const url = new URL(BASE_URL + path)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'fr-FR')
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }

  const res = await fetch(url.toString())
  if (res.status === 401) throw new TmdbError('invalid_api_key')
  if (!res.ok) throw new TmdbError(`tmdb_error_${res.status}`)
  return res.json() as Promise<T>
}

export function posterUrl(path: string | null, size: 'w342' | 'w185' = 'w342'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null
}

export function providerLogoUrl(path: string): string {
  return `${IMAGE_BASE}/w45${path}`
}

export async function fetchPopularProviders(mediaType: MediaType): Promise<WatchProvider[]> {
  const region = getRegion()
  const data = await tmdbFetch<{ results: WatchProvider[] }>(`/watch/providers/${mediaType}`, {
    watch_region: region,
  })
  // Keep the most relevant/known providers first, cap the list for a concise picker.
  return data.results.slice(0, 30)
}

/**
 * TMDB uses different genre taxonomies for movies and TV (TV merges "Action" + "Aventure" into
 * "Action & Adventure", and "Fantastique" + "Science-Fiction" into one genre). This table is the single
 * source of truth for the genre chips: one label, and the id it maps to on each endpoint (null when a
 * genre only exists on the other one, e.g. "Horreur" has no TV equivalent).
 */
export const GENRES: GenreOption[] = [
  { label: 'Action', movieId: 28, tvId: 10759 },
  { label: 'Animation', movieId: 16, tvId: 16 },
  { label: 'Aventure', movieId: 12, tvId: 10759 },
  { label: 'Comédie', movieId: 35, tvId: 35 },
  { label: 'Crime', movieId: 80, tvId: 80 },
  { label: 'Documentaire', movieId: 99, tvId: 99 },
  { label: 'Drame', movieId: 18, tvId: 18 },
  { label: 'Familial', movieId: 10751, tvId: 10751 },
  { label: 'Fantastique', movieId: 14, tvId: 10765 },
  { label: 'Guerre', movieId: 10752, tvId: 10768 },
  { label: 'Histoire', movieId: 36, tvId: null },
  { label: 'Horreur', movieId: 27, tvId: null },
  { label: 'Jeunesse', movieId: null, tvId: 10762 },
  { label: 'Musique', movieId: 10402, tvId: null },
  { label: 'Mystère', movieId: 9648, tvId: 9648 },
  { label: 'Romance', movieId: 10749, tvId: null },
  { label: 'Science-Fiction', movieId: 878, tvId: 10765 },
  { label: 'Télé-réalité', movieId: null, tvId: 10764 },
  { label: 'Thriller', movieId: 53, tvId: null },
  { label: 'Western', movieId: 37, tvId: 37 },
]

/** Genre labels that make sense for the selected type (both = every label). */
export function genreLabelsFor(mediaType: Filters['mediaType']): string[] {
  return GENRES.filter((g) => mediaType === 'both' || (mediaType === 'movie' ? g.movieId : g.tvId) !== null).map(
    (g) => g.label,
  )
}

function genreIdFor(label: string, mediaType: MediaType): number | null {
  const genre = GENRES.find((g) => g.label === label)
  if (!genre) return null
  return mediaType === 'movie' ? genre.movieId : genre.tvId
}

interface GenreCriteria {
  include: number[]
  exclude: number[]
  match: GenreMatch
}

const isId = (id: number | null): id is number => id !== null

/** Resolves the genre selection to ids for one media type, or null when that type can never satisfy it. */
function genreCriteria(filters: Filters, mediaType: MediaType): GenreCriteria | null {
  const wanted = filters.genreInclude.map((label) => genreIdFor(label, mediaType))
  if (wanted.length > 0) {
    const reachable = filters.genreMatch === 'all' ? wanted.every(isId) : wanted.some(isId)
    if (!reachable) return null
  }
  return {
    include: [...new Set(wanted.filter(isId))],
    exclude: [...new Set(filters.genreExclude.map((label) => genreIdFor(label, mediaType)).filter(isId))],
    match: filters.genreMatch,
  }
}

const RECENT_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const

function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Release-date bounds: the "recent" window when set, otherwise the year range. */
function dateWindow(filters: Filters): { from: string; to: string } {
  if (filters.recent === 'any') {
    return { from: `${filters.yearMin}-01-01`, to: `${filters.yearMax}-12-31` }
  }
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - RECENT_DAYS[filters.recent])
  return { from: toLocalIsoDate(from), to: toLocalIsoDate(to) }
}

interface DiscoverResponse {
  total_pages: number
  total_results: number
  results: TmdbListItem[]
}

async function discover(
  mediaType: MediaType,
  filters: Filters,
  page: number,
  criteria: GenreCriteria,
  providerIds: number[],
): Promise<DiscoverResponse> {
  const region = getRegion()
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'
  const { from, to } = dateWindow(filters)
  const isRecent = filters.recent !== 'any'

  return tmdbFetch<DiscoverResponse>(`/discover/${mediaType}`, {
    page,
    sort_by: 'popularity.desc',
    watch_region: region,
    with_watch_providers: providerIds.length ? providerIds.join('|') : undefined,
    // "|" = any of the genres, "," = all of them at once.
    with_genres: criteria.include.length ? criteria.include.join(criteria.match === 'all' ? ',' : '|') : undefined,
    without_genres: criteria.exclude.length ? criteria.exclude.join(',') : undefined,
    [`${dateField}.gte`]: from,
    [`${dateField}.lte`]: to,
    // Fresh releases have few votes (only 5 films of the last week reach 20), so vote thresholds would empty the pool.
    'vote_average.gte': isRecent ? undefined : filters.minRating || undefined,
    'vote_count.gte': isRecent ? undefined : 20,
    'with_runtime.gte': filters.durationMin > 0 ? filters.durationMin : undefined,
    'with_runtime.lte': filters.durationMax < 240 ? filters.durationMax : undefined,
  })
}

const MAX_PAGE_CAP = 200
// Results are popularity-sorted, so the tail of a recent window is obscure releases; stay on the top pages.
const RECENT_PAGE_CAP = 3

/** Picks a random title matching the filters, retrying a few random pages before giving up. */
export async function pickRandomTitle(
  mediaType: MediaType,
  filters: Filters,
  excludeIds: Set<number>,
  providerIds: number[],
): Promise<TmdbListItem | null> {
  const criteria = genreCriteria(filters, mediaType)
  if (!criteria) return null

  const firstPage = await discover(mediaType, filters, 1, criteria, providerIds)
  if (firstPage.total_results === 0) return null

  const pageCap = Math.min(firstPage.total_pages, filters.recent === 'any' ? MAX_PAGE_CAP : RECENT_PAGE_CAP)
  const attempts = Math.min(pageCap, 8)
  const triedPages = new Set<number>()

  for (let i = 0; i < attempts; i++) {
    let page = i === 0 ? 1 : Math.floor(Math.random() * pageCap) + 1
    while (triedPages.has(page) && triedPages.size < pageCap) {
      page = Math.floor(Math.random() * pageCap) + 1
    }
    triedPages.add(page)

    const data = page === 1 ? firstPage : await discover(mediaType, filters, page, criteria, providerIds)
    const candidates = data.results.filter((r) => !excludeIds.has(r.id))
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
  }

  return null
}

/** High-level random pick: handles the "both films & séries" case by trying one type, then the other. */
export async function pickRandom(
  filters: Filters,
  excludeIds: Set<number>,
  providerIds: number[],
): Promise<{ item: TmdbListItem; mediaType: MediaType } | null> {
  if (filters.mediaType !== 'both') {
    const item = await pickRandomTitle(filters.mediaType, filters, excludeIds, providerIds)
    return item ? { item, mediaType: filters.mediaType } : null
  }

  const first: MediaType = Math.random() < 0.5 ? 'movie' : 'tv'
  const second: MediaType = first === 'movie' ? 'tv' : 'movie'

  const firstItem = await pickRandomTitle(first, filters, excludeIds, providerIds)
  if (firstItem) return { item: firstItem, mediaType: first }

  const secondItem = await pickRandomTitle(second, filters, excludeIds, providerIds)
  return secondItem ? { item: secondItem, mediaType: second } : null
}

interface CombinedCreditItem extends TmdbListItem {
  media_type: MediaType
  job?: string
}

export async function searchPerson(query: string): Promise<{ id: number; name: string } | null> {
  const data = await tmdbFetch<{ results: { id: number; name: string; popularity: number }[] }>('/search/person', {
    query,
  })
  if (data.results.length === 0) return null
  const best = [...data.results].sort((a, b) => b.popularity - a.popularity)[0]
  return { id: best.id, name: best.name }
}

/**
 * TMDB's discover endpoint doesn't support filtering by cast/crew for TV (with_people is silently
 * ignored on /discover/tv, confirmed against the live API). So an actor/director search pulls the
 * person's full filmography instead and applies the other filters client-side. Platform and duration
 * filters don't apply here — that data isn't included in the credits list.
 */
export async function pickRandomFromPerson(
  personId: number,
  filters: Filters,
  excludeIds: Set<number>,
): Promise<{ item: TmdbListItem; mediaType: MediaType } | null> {
  const data = await tmdbFetch<{ cast: CombinedCreditItem[]; crew: CombinedCreditItem[] }>(
    `/person/${personId}/combined_credits`,
  )

  const isRecent = filters.recent !== 'any'
  const { from, to } = dateWindow(filters)
  const criteriaByType = { movie: genreCriteria(filters, 'movie'), tv: genreCriteria(filters, 'tv') }

  const seen = new Set<string>()
  const candidates = [...data.cast, ...data.crew].filter((c) => {
    const key = `${c.media_type}-${c.id}`
    if (seen.has(key)) return false
    seen.add(key)

    if (filters.mediaType !== 'both' && c.media_type !== filters.mediaType) return false
    if (excludeIds.has(c.id)) return false

    const date = c.release_date || c.first_air_date || ''
    if (isRecent) {
      if (!date || date < from || date > to) return false
    } else {
      const year = Number(date.slice(0, 4))
      if (year && (year < filters.yearMin || year > filters.yearMax)) return false
      if (filters.minRating && c.vote_average < filters.minRating) return false
    }

    const criteria = criteriaByType[c.media_type]
    if (!criteria) return false
    if (criteria.exclude.some((id) => c.genre_ids.includes(id))) return false
    if (criteria.include.length > 0) {
      const matches =
        criteria.match === 'all'
          ? criteria.include.every((id) => c.genre_ids.includes(id))
          : criteria.include.some((id) => c.genre_ids.includes(id))
      if (!matches) return false
    }

    return true
  })

  if (candidates.length === 0) return null
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  return { item: picked, mediaType: picked.media_type }
}

interface VideoItem {
  type: string
  site: string
  official: boolean
  key: string
}

function pickTrailerKey(videos: VideoItem[]): string | null {
  const youtube = videos.filter((v) => v.site === 'YouTube')
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official)?.key ??
    youtube.find((v) => v.type === 'Trailer')?.key ??
    youtube.find((v) => v.type === 'Teaser' && v.official)?.key ??
    youtube[0]?.key ??
    null
  )
}

export async function fetchDetails(mediaType: MediaType, id: number): Promise<DetailedTitle> {
  const region = getRegion()

  const details = await tmdbFetch<{
    title?: string
    name?: string
    original_title?: string
    original_name?: string
    release_date?: string
    first_air_date?: string
    overview: string
    poster_path: string | null
    vote_average: number
    genres: Genre[]
    runtime?: number
    number_of_seasons?: number
    credits: { cast: CastMember[] }
    videos: { results: VideoItem[] }
    'watch/providers': { results: Record<string, { flatrate?: WatchProvider[]; free?: WatchProvider[]; ads?: WatchProvider[] }> }
  }>(`/${mediaType}/${id}`, { append_to_response: 'credits,videos,watch/providers' })

  const regionProviders = details['watch/providers']?.results?.[region]

  let trailerKey = pickTrailerKey(details.videos?.results ?? [])
  if (!trailerKey) {
    // Many titles have no French-language video entries; fall back to the default (English) catalog.
    const fallback = await tmdbFetch<{ results: VideoItem[] }>(`/${mediaType}/${id}/videos`, { language: 'en-US' })
    trailerKey = pickTrailerKey(fallback.results)
  }

  return {
    id,
    mediaType,
    title: details.title ?? details.name ?? 'Sans titre',
    originalTitle: details.original_title ?? details.original_name ?? '',
    year: (details.release_date ?? details.first_air_date ?? '').slice(0, 4),
    overview: details.overview,
    posterPath: details.poster_path,
    voteAverage: details.vote_average,
    genres: details.genres.map((g) => g.name),
    cast: (details.credits?.cast ?? []).slice(0, 5),
    runtimeMinutes: details.runtime ?? null,
    numberOfSeasons: details.number_of_seasons ?? null,
    trailerKey,
    providers: {
      flatrate: regionProviders?.flatrate ?? [],
      free: regionProviders?.free ?? [],
      ads: regionProviders?.ads ?? [],
    },
  }
}
