import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Filters, TmdbListItem } from '../types'
import { drawAvoidingRecent, drawExclusions, titleKey } from './draw'
import { dateWindow, genreCriteria, pageCapFor, passesLanguage, pickRandom, pickRandomFromPerson, pickRandomTitle } from './tmdb'

const FILTERS: Filters = {
  mediaType: 'both',
  genreInclude: [],
  genreExclude: [],
  genreMatch: 'any',
  languageInclude: [],
  languageExclude: [],
  recent: 'any',
  yearMin: 1970,
  yearMax: 2026,
  minRating: 5,
  durationMin: 0,
  durationMax: 240,
  includeSeen: false,
  includeObscure: false,
  personQuery: '',
}
const filters = (over: Partial<Filters> = {}): Filters => ({ ...FILTERS, ...over })

const item = (id: number, over: Partial<TmdbListItem> = {}): TmdbListItem => ({
  id,
  poster_path: null,
  overview: '',
  vote_average: 7,
  genre_ids: [],
  original_language: 'en',
  ...over,
})

// Answers /discover/<type> with the given pages; records every requested URL.
function stubDiscover(pagesByType: Partial<Record<'movie' | 'tv', TmdbListItem[][]>>) {
  const urls: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input)
      urls.push(url)
      const type = url.pathname.endsWith('/movie') ? 'movie' : 'tv'
      const pages = pagesByType[type] ?? []
      const page = Number(url.searchParams.get('page') ?? 1)
      const results = pages[page - 1] ?? []
      const total = pages.reduce((n, p) => n + p.length, 0)
      return new Response(JSON.stringify({ total_pages: pages.length, total_results: total, results }))
    }),
  )
  return urls
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('genreCriteria', () => {
  it('maps labels to each catalogue, merging what TV merges', () => {
    const f = filters({ genreInclude: ['Action', 'Aventure'] })
    expect(genreCriteria(f, 'movie')?.include).toEqual([28, 12])
    // On TV both are the single "Action & Adventure" genre: asked once, not twice.
    expect(genreCriteria(f, 'tv')?.include).toEqual([10759])
  })

  it('rules out a type that cannot satisfy the selection', () => {
    expect(genreCriteria(filters({ genreInclude: ['Horreur'] }), 'tv')).toBeNull()
    expect(genreCriteria(filters({ genreInclude: ['Horreur', 'Drame'], genreMatch: 'any' }), 'tv')?.include).toEqual([18])
    expect(genreCriteria(filters({ genreInclude: ['Horreur', 'Drame'], genreMatch: 'all' }), 'tv')).toBeNull()
  })

  it('keeps excluded genres that exist for the type', () => {
    expect(genreCriteria(filters({ genreExclude: ['Horreur', 'Animation'] }), 'tv')?.exclude).toEqual([16])
  })
})

describe('passesLanguage', () => {
  it('keeps only wanted languages and drops excluded ones', () => {
    expect(passesLanguage(item(1, { original_language: 'fr' }), filters({ languageInclude: ['Français'] }))).toBe(true)
    expect(passesLanguage(item(1, { original_language: 'en' }), filters({ languageInclude: ['Français'] }))).toBe(false)
    expect(passesLanguage(item(1, { original_language: 'ko' }), filters({ languageExclude: ['Coréen'] }))).toBe(false)
    // One chip can cover several codes: TMDB tags Cantonese films "cn".
    expect(passesLanguage(item(1, { original_language: 'cn' }), filters({ languageExclude: ['Chinois'] }))).toBe(false)
  })
})

describe('dateWindow', () => {
  it('uses the year range when no recent window is set', () => {
    expect(dateWindow(filters({ yearMin: 1990, yearMax: 1999 }))).toEqual({ from: '1990-01-01', to: '1999-12-31' })
  })

  it('counts recent windows back from today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 27, 12))
    expect(dateWindow(filters({ recent: '7d' }))).toEqual({ from: '2026-10-20', to: '2026-10-27' })
    vi.useRealTimers()
  })
})

describe('drawExclusions', () => {
  const seen = [{ id: 1, mediaType: 'movie' as const }]
  const ignored = [{ id: 2, mediaType: 'tv' as const }]

  it('excludes seen, set-aside and current titles', () => {
    const keys = drawExclusions(filters(), seen, ignored, { id: 3, mediaType: 'movie' })
    expect([...keys].sort()).toEqual(['movie:1', 'movie:3', 'tv:2'])
  })

  it('lets seen titles back in on request, but never set-aside ones', () => {
    const keys = drawExclusions(filters({ includeSeen: true }), seen, ignored, null)
    expect([...keys]).toEqual(['tv:2'])
  })
})

describe('pickRandomTitle', () => {
  it('goes through our proxy, never with an API key', async () => {
    const urls = stubDiscover({ movie: [[item(10)]] })
    await pickRandomTitle('movie', filters(), new Set(), [])
    expect(urls[0].origin + urls[0].pathname).toBe('https://psizuutdnanhhvzrdxqp.supabase.co/functions/v1/tmdb/discover/movie')
    expect(urls[0].searchParams.has('api_key')).toBe(false)
  })

  it('never returns an excluded title', async () => {
    stubDiscover({ movie: [[item(1), item(2), item(3)]] })
    const excluded = new Set([titleKey('movie', 1), titleKey('movie', 2)])
    for (let i = 0; i < 20; i++) {
      expect((await pickRandomTitle('movie', filters(), excluded, []))?.id).toBe(3)
    }
  })

  it('does not confuse a film and a series that share an id', async () => {
    stubDiscover({ tv: [[item(1399)]] })
    const pick = await pickRandomTitle('tv', filters(), new Set([titleKey('movie', 1399)]), [])
    expect(pick?.id).toBe(1399)
  })

  it('gives up when everything is excluded or nothing matches', async () => {
    stubDiscover({ movie: [[item(1)]] })
    expect(await pickRandomTitle('movie', filters(), new Set([titleKey('movie', 1)]), [])).toBeNull()
    stubDiscover({})
    expect(await pickRandomTitle('movie', filters(), new Set(), [])).toBeNull()
  })

  it('drops results in an excluded language', async () => {
    stubDiscover({ movie: [[item(1, { original_language: 'ko' }), item(2, { original_language: 'fr' })]] })
    const pick = await pickRandomTitle('movie', filters({ languageExclude: ['Coréen'] }), new Set(), [])
    expect(pick?.id).toBe(2)
  })

  it('asks TMDB for any genre with "|" and all genres with ","', async () => {
    const urls = stubDiscover({ movie: [[item(1)]] })
    await pickRandomTitle('movie', filters({ genreInclude: ['Action', 'Comédie'] }), new Set(), [])
    expect(urls[0].searchParams.get('with_genres')).toBe('28|35')
    await pickRandomTitle('movie', filters({ genreInclude: ['Action', 'Comédie'], genreMatch: 'all' }), new Set(), [])
    expect(urls.at(-1)?.searchParams.get('with_genres')).toBe('28,35')
  })

  it('only asks for the chosen platforms', async () => {
    const urls = stubDiscover({ movie: [[item(1)]] })
    await pickRandomTitle('movie', filters(), new Set(), [8, 337])
    expect(urls[0].searchParams.get('with_watch_providers')).toBe('8|337')
    expect(urls[0].searchParams.get('watch_region')).toBe('FR')
  })
})

describe('variety', () => {
  // A catalogue of `total` pages where page n holds the single title n.
  function stubCatalogue(total: number) {
    const pages: number[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const page = Number(new URL(input).searchParams.get('page'))
        pages.push(page)
        return new Response(JSON.stringify({ total_pages: total, total_results: total, results: [item(page)] }))
      }),
    )
    return pages
  }

  it('stays among well-known titles unless asked to dig deeper', () => {
    expect(pageCapFor(filters(), 300)).toBe(25)
    expect(pageCapFor(filters({ includeObscure: true }), 300)).toBe(200)
    expect(pageCapFor(filters({ recent: '30d' }), 300)).toBe(3)
    expect(pageCapFor(filters(), 4)).toBe(4)
  })

  it('draws from every page, not mostly the first one', async () => {
    const pages = stubCatalogue(300)
    const picked = new Set<number>()
    for (let i = 0; i < 60; i++) picked.add((await pickRandomTitle('movie', filters(), new Set(), []))!.id)
    // 60 draws over 25 equally likely pages: far more than a handful of distinct titles.
    expect(picked.size).toBeGreaterThan(12)
    expect(Math.max(...pages)).toBeLessThanOrEqual(25)
  })

  it('reaches the long tail when obscure titles are included', async () => {
    const pages = stubCatalogue(300)
    for (let i = 0; i < 40; i++) await pickRandomTitle('movie', filters({ includeObscure: true }), new Set(), [])
    expect(Math.max(...pages)).toBeGreaterThan(25)
  })

  it('avoids recent draws, unless nothing else is left', async () => {
    stubDiscover({ movie: [[item(1), item(2)]] })
    const draw = (ex: Set<string>) => pickRandomTitle('movie', filters(), ex, [])
    for (let i = 0; i < 10; i++) {
      expect((await drawAvoidingRecent(new Set(), [{ id: 1, mediaType: 'movie' }], draw))?.id).toBe(2)
    }
    const recent = [
      { id: 1, mediaType: 'movie' as const },
      { id: 2, mediaType: 'movie' as const },
    ]
    expect([1, 2]).toContain((await drawAvoidingRecent(new Set(), recent, draw))?.id)
  })
})

describe('pickRandom', () => {
  it('falls back to the other type when the first has nothing', async () => {
    stubDiscover({ tv: [[item(7)]] })
    for (let i = 0; i < 10; i++) {
      expect(await pickRandom(filters(), new Set(), [])).toMatchObject({ mediaType: 'tv', item: { id: 7 } })
    }
  })

  it('sticks to the requested type', async () => {
    stubDiscover({ movie: [[item(5)]], tv: [[item(6)]] })
    expect(await pickRandom(filters({ mediaType: 'movie' }), new Set(), [])).toMatchObject({ mediaType: 'movie' })
  })
})

describe('pickRandomFromPerson', () => {
  function stubCredits(cast: object[], crew: object[] = []) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cast, crew }))))
  }
  const credit = (id: number, media_type: 'movie' | 'tv', over: object = {}) => ({
    ...item(id),
    media_type,
    release_date: media_type === 'movie' ? '2010-05-01' : undefined,
    first_air_date: media_type === 'tv' ? '2010-05-01' : undefined,
    ...over,
  })

  it('applies type, exclusions, years and genres to the filmography', async () => {
    stubCredits(
      [
        credit(1, 'movie', { genre_ids: [27] }),
        credit(2, 'movie', { release_date: '1950-01-01' }),
        credit(3, 'tv'),
        credit(4, 'movie', { genre_ids: [35] }),
      ],
      [credit(4, 'movie', { genre_ids: [35] })],
    )
    const f = filters({ mediaType: 'movie', genreExclude: ['Horreur'] })
    for (let i = 0; i < 10; i++) {
      expect(await pickRandomFromPerson(99, f, new Set())).toMatchObject({ mediaType: 'movie', item: { id: 4 } })
    }
    expect(await pickRandomFromPerson(99, f, new Set([titleKey('movie', 4)]))).toBeNull()
  })
})
