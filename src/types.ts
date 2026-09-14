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
  providers: {
    flatrate: WatchProvider[]
    free: WatchProvider[]
    ads: WatchProvider[]
  }
}

export interface Filters {
  mediaType: 'both' | MediaType
  genreIds: number[]
  yearMin: number
  yearMax: number
  minRating: number
  providerIds: number[]
  includeSeen: boolean
}

export interface SeenEntry {
  id: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  year: string
  dateAdded: string
  rating: number | null
  comment: string
  favorite: boolean
}
