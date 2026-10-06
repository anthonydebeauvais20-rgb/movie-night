export type MediaType = 'movie' | 'tv'

export interface Genre {
  id: number
  name: string
}

export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface TmdbListItem {
  id: number
  media_type?: MediaType
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview: string
  vote_average: number
  genre_ids: number[]
  original_language?: string
}

export interface CastMember {
  id: number
  name: string
  character: string
}

export interface DetailedTitle {
  id: number
  mediaType: MediaType
  title: string
  originalTitle: string
  year: string
  overview: string
  posterPath: string | null
  voteAverage: number
  genres: string[]
  cast: CastMember[]
  runtimeMinutes: number | null
  numberOfSeasons: number | null
  trailerKey: string | null
  providers: {
    flatrate: WatchProvider[]
    free: WatchProvider[]
    ads: WatchProvider[]
    // TMDB's "where to watch" page for this title and region, listing a link to each platform.
    link: string | null
  }
}

export type ThemePreference = 'system' | 'light' | 'dark'

export type LibraryView = 'shelf' | 'posters'

export type GenreMatch = 'any' | 'all'

export type Recency = 'any' | '7d' | '30d' | '90d'

export interface Filters {
  mediaType: 'both' | MediaType
  genreInclude: string[]
  genreExclude: string[]
  genreMatch: GenreMatch
  languageInclude: string[]
  languageExclude: string[]
  recent: Recency
  yearMin: number
  yearMax: number
  minRating: number
  durationMin: number
  durationMax: number
  includeSeen: boolean
  personQuery: string
}

export interface GenreOption {
  label: string
  movieId: number | null
  tvId: number | null
}

export interface SeenEntry {
  id: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  year: string
  dateAdded: string
  // Out of 10, in whole points: each of the 5 stars is worth 2, a half star 1.
  rating: number | null
  comment: string
  favorite: boolean
}

export interface WatchlistEntry {
  id: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  year: string
  dateAdded: string
}
