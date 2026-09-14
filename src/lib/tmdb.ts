import type { CastMember, DetailedTitle, Filters, Genre, MediaType, TmdbListItem, WatchProvider } from '../types'
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

interface DiscoverResponse {
  total_pages: number
  total_results: number
  results: TmdbListItem[]
}

async function discover(mediaType: MediaType, filters: Filters, page: number): Promise<DiscoverResponse> {
  const region = getRegion()
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'

  return tmdbFetch<DiscoverResponse>(`/discover/${mediaType}`, {
    page,
    sort_by: 'popularity.desc',
    watch_region: region,
    with_watch_providers: filters.providerIds.length ? filters.providerIds.join('|') : undefined,
    with_genres: filters.genreIds.length ? filters.genreIds.join(',') : undefined,
    [`${dateField}.gte`]: `${filters.yearMin}-01-01`,
    [`${dateField}.lte`]: `${filters.yearMax}-12-31`,
    'vote_average.gte': filters.minRating || undefined,
    'vote_count.gte': 20,
  })
}

const MAX_PAGE_CAP = 200

/** Picks a random title matching the filters, retrying a few random pages before giving up. */
export async function pickRandomTitle(
  mediaType: MediaType,
  filters: Filters,
  excludeIds: Set<number>,
): Promise<TmdbListItem | null> {
  const firstPage = await discover(mediaType, filters, 1)
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

    const data = page === 1 ? firstPage : await discover(mediaType, filters, page)
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
): Promise<{ item: TmdbListItem; mediaType: MediaType } | null> {
  if (filters.mediaType !== 'both') {
    const item = await pickRandomTitle(filters.mediaType, filters, excludeIds)
    return item ? { item, mediaType: filters.mediaType } : null
  }

  const first: MediaType = Math.random() < 0.5 ? 'movie' : 'tv'
  const second: MediaType = first === 'movie' ? 'tv' : 'movie'

  const firstItem = await pickRandomTitle(first, filters, excludeIds)
  if (firstItem) return { item: firstItem, mediaType: first }

  const secondItem = await pickRandomTitle(second, filters, excludeIds)
  return secondItem ? { item: secondItem, mediaType: second } : null
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
