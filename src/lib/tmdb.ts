import type { CastMember, DetailedTitle, Filters, Genre, MediaType, TmdbListItem, UnifiedGenre, WatchProvider } from '../types'
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

export async function fetchGenres(mediaType: MediaType): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: Genre[] }>(`/genre/${mediaType}/list`)
  return data.genres
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
 * TMDB uses different genre taxonomies for movies and TV (e.g. movie "Action" (28) + "Aventure" (12)
 * vs tv "Action & Adventure" (10759)). This table lets the "Films & séries" filter show one unified
 * list and resolve it to the right per-type ids when querying each endpoint.
 */
export const UNIFIED_GENRES: UnifiedGenre[] = [
  { label: 'Action & Aventure', movieIds: [28, 12], tvIds: [10759] },
  { label: 'Animation', movieIds: [16], tvIds: [16] },
  { label: 'Comédie', movieIds: [35], tvIds: [35] },
  { label: 'Crime', movieIds: [80], tvIds: [80] },
  { label: 'Documentaire', movieIds: [99], tvIds: [99] },
  { label: 'Drame', movieIds: [18], tvIds: [18] },
  { label: 'Familial', movieIds: [10751], tvIds: [10751] },
  { label: 'Fantastique & Science-Fiction', movieIds: [14, 878], tvIds: [10765] },
  { label: 'Guerre', movieIds: [10752], tvIds: [10768] },
  { label: 'Histoire', movieIds: [36], tvIds: [] },
  { label: 'Horreur', movieIds: [27], tvIds: [] },
  { label: 'Musique', movieIds: [10402], tvIds: [] },
  { label: 'Mystère', movieIds: [9648], tvIds: [9648] },
  { label: 'Romance', movieIds: [10749], tvIds: [] },
  { label: 'Thriller', movieIds: [53], tvIds: [] },
  { label: 'Western', movieIds: [37], tvIds: [37] },
]

/** Resolves genre labels (native names, or unified labels) to the concrete ids needed for one discover call. */
export function resolveGenreIds(
  labels: string[],
  queryMediaType: MediaType,
  movieGenres: Genre[],
  tvGenres: Genre[],
): number[] {
  const ids: number[] = []
  const nativeList = queryMediaType === 'movie' ? movieGenres : tvGenres
  for (const label of labels) {
    const unified = UNIFIED_GENRES.find((u) => u.label === label)
    if (unified) {
      ids.push(...(queryMediaType === 'movie' ? unified.movieIds : unified.tvIds))
      continue
    }
    const native = nativeList.find((g) => g.name === label)
    if (native) ids.push(native.id)
  }
  return ids
}

interface DiscoverResponse {
  total_pages: number
  total_results: number
  results: TmdbListItem[]
}

async function discover(mediaType: MediaType, filters: Filters, page: number, genreIds: number[]): Promise<DiscoverResponse> {
  const region = getRegion()
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'

  return tmdbFetch<DiscoverResponse>(`/discover/${mediaType}`, {
    page,
    sort_by: 'popularity.desc',
    watch_region: region,
    with_watch_providers: filters.providerIds.length ? filters.providerIds.join('|') : undefined,
    with_genres: genreIds.length ? genreIds.join(',') : undefined,
    [`${dateField}.gte`]: `${filters.yearMin}-01-01`,
    [`${dateField}.lte`]: `${filters.yearMax}-12-31`,
    'vote_average.gte': filters.minRating || undefined,
    'vote_count.gte': 20,
    'with_runtime.gte': filters.durationMin > 0 ? filters.durationMin : undefined,
    'with_runtime.lte': filters.durationMax < 240 ? filters.durationMax : undefined,
  })
}

const MAX_PAGE_CAP = 200

/** Picks a random title matching the filters, retrying a few random pages before giving up. */
export async function pickRandomTitle(
  mediaType: MediaType,
  filters: Filters,
  excludeIds: Set<number>,
  movieGenres: Genre[],
  tvGenres: Genre[],
): Promise<TmdbListItem | null> {
  const genreIds = resolveGenreIds(filters.genreLabels, mediaType, movieGenres, tvGenres)
  const firstPage = await discover(mediaType, filters, 1, genreIds)
  if (firstPage.total_results === 0) return null

  const pageCap = Math.min(firstPage.total_pages, MAX_PAGE_CAP)
  const attempts = Math.min(pageCap, 8)
  const triedPages = new Set<number>()

  for (let i = 0; i < attempts; i++) {
    let page = i === 0 ? 1 : Math.floor(Math.random() * pageCap) + 1
    while (triedPages.has(page) && triedPages.size < pageCap) {
      page = Math.floor(Math.random() * pageCap) + 1
    }
    triedPages.add(page)

    const data = page === 1 ? firstPage : await discover(mediaType, filters, page, genreIds)
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
  movieGenres: Genre[],
  tvGenres: Genre[],
): Promise<{ item: TmdbListItem; mediaType: MediaType } | null> {
  if (filters.mediaType !== 'both') {
    const item = await pickRandomTitle(filters.mediaType, filters, excludeIds, movieGenres, tvGenres)
    return item ? { item, mediaType: filters.mediaType } : null
  }

  const first: MediaType = Math.random() < 0.5 ? 'movie' : 'tv'
  const second: MediaType = first === 'movie' ? 'tv' : 'movie'

  const firstItem = await pickRandomTitle(first, filters, excludeIds, movieGenres, tvGenres)
  if (firstItem) return { item: firstItem, mediaType: first }

  const secondItem = await pickRandomTitle(second, filters, excludeIds, movieGenres, tvGenres)
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
 * person's full filmography instead and applies the other filters client-side. Genre matching uses
 * OR (at least one selected genre) rather than discover's AND, since a specific person's filmography
 * is already a small pool and AND would too often return nothing. Platform and duration filters don't
 * apply here — that data isn't included in the credits list.
 */
export async function pickRandomFromPerson(
  personId: number,
  filters: Filters,
  excludeIds: Set<number>,
  movieGenres: Genre[],
  tvGenres: Genre[],
): Promise<{ item: TmdbListItem; mediaType: MediaType } | null> {
  const data = await tmdbFetch<{ cast: CombinedCreditItem[]; crew: CombinedCreditItem[] }>(
    `/person/${personId}/combined_credits`,
  )

  const seen = new Set<string>()
  const candidates = [...data.cast, ...data.crew].filter((c) => {
    const key = `${c.media_type}-${c.id}`
    if (seen.has(key)) return false
    seen.add(key)

    if (filters.mediaType !== 'both' && c.media_type !== filters.mediaType) return false
    if (excludeIds.has(c.id)) return false

    const year = Number((c.release_date ?? c.first_air_date ?? '').slice(0, 4))
    if (year && (year < filters.yearMin || year > filters.yearMax)) return false
    if (filters.minRating && c.vote_average < filters.minRating) return false

    if (filters.genreLabels.length > 0) {
      const wantedIds = resolveGenreIds(filters.genreLabels, c.media_type, movieGenres, tvGenres)
      if (wantedIds.length === 0 || !c.genre_ids.some((id) => wantedIds.includes(id))) return false
    }

    return true
  })

  if (candidates.length === 0) return null
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  return { item: picked, mediaType: picked.media_type }
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
    'watch/providers': { results: Record<string, { flatrate?: WatchProvider[]; free?: WatchProvider[]; ads?: WatchProvider[] }> }
  }>(`/${mediaType}/${id}`, { append_to_response: 'credits,watch/providers' })

  const regionProviders = details['watch/providers']?.results?.[region]

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
    providers: {
      flatrate: regionProviders?.flatrate ?? [],
      free: regionProviders?.free ?? [],
      ads: regionProviders?.ads ?? [],
    },
  }
}
