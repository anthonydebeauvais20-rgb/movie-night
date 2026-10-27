import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeenEntry, TitleRef } from '../types'
import { computeStats, decadeLabel, formatDuration, genreLabels, loadMissingFacts, readFacts } from './stats'
import { fetchTitleFacts } from './tmdb'

const seen = (id: number, mediaType: 'movie' | 'tv', year: string, over: Partial<SeenEntry> = {}): SeenEntry => ({
  id,
  mediaType,
  title: `Titre ${id}`,
  posterPath: null,
  year,
  dateAdded: '2026-10-01T00:00:00.000Z',
  rating: null,
  comment: '',
  favorite: false,
  ...over,
})
const ref = (id: number): TitleRef => ({ id, mediaType: 'movie', title: `À voir ${id}`, posterPath: null, year: '2024', dateAdded: '2026-10-01T00:00:00.000Z' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('formatDuration', () => {
  it('rounds to the hour before splitting into days, so hours never read 24', () => {
    // 25 days 23 h 40 min: the leftover alone would round to "25 j 24 h".
    expect(formatDuration((25 * 24 + 23) * 60 + 40)).toBe('26 j 0 h')
    expect(formatDuration(37 * 60 + 10)).toBe('1 j 13 h')
    expect(formatDuration(150)).toBe('3 h')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(0)).toBe('0 h')
  })
})

describe('decadeLabel', () => {
  it('reads like "les années 70" and "les années 2010"', () => {
    expect(decadeLabel(1970)).toBe('70')
    expect(decadeLabel(2010)).toBe('2010')
  })
})

describe('genreLabels', () => {
  it('counts TV merged genres for each of their labels', () => {
    expect(genreLabels('tv', [10759, 18])).toEqual(['Action', 'Aventure', 'Drame'])
    expect(genreLabels('movie', [28, 99999])).toEqual(['Action'])
  })
})

describe('computeStats', () => {
  const library = [
    seen(1, 'movie', '1994', { rating: 10, favorite: true }),
    seen(2, 'movie', '1999', { rating: 6 }),
    seen(3, 'tv', '2016', { rating: 10 }),
    seen(4, 'movie', '2019'),
  ]
  const facts = {
    'movie:1': { genreIds: [18, 80], minutes: 142 },
    'movie:2': { genreIds: [18], minutes: 120 },
    'tv:3': { genreIds: [10765, 18], minutes: 2000 },
    'movie:10': { genreIds: [35], minutes: 100 },
  }

  it('adds up counts and time, film and series apart', () => {
    const stats = computeStats(library, [ref(10)], facts)
    expect(stats).toMatchObject({ total: 4, films: 3, series: 1, filmMinutes: 262, seriesMinutes: 2000, watchlistMinutes: 100 })
    // Title 4 has no facts yet: counted as seen, left out of genres and time.
    expect(stats.pending).toBe(1)
  })

  it('ranks genres and groups release years by decade', () => {
    const stats = computeStats(library, [], facts)
    expect(stats.genres[0]).toEqual(['Drame', 3])
    expect(stats.genres).toContainEqual(['Science-Fiction', 1])
    expect(stats.decades).toEqual([
      [1990, 2],
      [2010, 2],
    ])
  })

  it('averages ratings and puts favorites first among equal top ratings', () => {
    const stats = computeStats(library, [], facts)
    expect(stats.rated).toBe(3)
    expect(stats.averageRating).toBeCloseTo(26 / 3)
    expect(stats.favorites).toBe(1)
    expect(stats.topRated.map((e) => e.id)).toEqual([1, 3, 2])
  })

  it('has no average without ratings', () => {
    expect(computeStats([seen(1, 'movie', '2000')], [], {}).averageRating).toBeNull()
  })
})

describe('fetching facts', () => {
  function stubTmdb(byPath: Record<string, object>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const path = new URL(input).pathname.replace(/^.*\/tmdb/, '')
        return byPath[path] ? new Response(JSON.stringify(byPath[path])) : new Response('{}', { status: 404 })
      }),
    )
  }

  it('totals every episode of a series, with a default length when TMDB has none', async () => {
    stubTmdb({
      '/tv/1': { genres: [{ id: 18 }], number_of_episodes: 10, episode_run_time: [50] },
      '/tv/2': { genres: [], number_of_episodes: 8, episode_run_time: [], last_episode_to_air: { runtime: 30 } },
      '/tv/3': { genres: [], number_of_episodes: 4, episode_run_time: [] },
      '/movie/4': { genres: [{ id: 35 }], runtime: 95 },
    })
    expect(await fetchTitleFacts('tv', 1)).toEqual({ genreIds: [18], minutes: 500 })
    expect((await fetchTitleFacts('tv', 2)).minutes).toBe(240)
    expect((await fetchTitleFacts('tv', 3)).minutes).toBe(180)
    expect(await fetchTitleFacts('movie', 4)).toEqual({ genreIds: [35], minutes: 95 })
  })

  it('keeps what it fetched and skips titles TMDB cannot answer', async () => {
    stubTmdb({ '/movie/4': { genres: [], runtime: 95 } })
    const progress = vi.fn()
    await loadMissingFacts(
      [
        { id: 4, mediaType: 'movie' },
        { id: 5, mediaType: 'movie' },
      ],
      progress,
      () => false,
    )
    expect(Object.keys(readFacts())).toEqual(['movie:4'])
    expect(progress).toHaveBeenCalledTimes(1)

    // Already known: not asked again.
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockClear()
    await loadMissingFacts([{ id: 4, mediaType: 'movie' }], progress, () => false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
