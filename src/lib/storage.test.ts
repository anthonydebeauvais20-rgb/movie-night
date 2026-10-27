import { beforeEach, describe, expect, it } from 'vitest'
import type { TitleRef } from '../types'
import {
  addIgnored,
  clearAccountData,
  getSeenList,
  getThemePreference,
  pushHistory,
  setThemePreference,
  upsertSeenEntry,
} from './storage'

const ref = (id: number, mediaType: 'movie' | 'tv' = 'movie'): TitleRef => ({
  id,
  mediaType,
  title: `Titre ${id}`,
  posterPath: null,
  year: '2020',
  dateAdded: '2026-10-01T00:00:00.000Z',
})

beforeEach(() => localStorage.clear())

describe('ratings', () => {
  it('converts old 5-star ratings to /10 exactly once', () => {
    localStorage.setItem('movienight:seen', JSON.stringify([{ ...ref(1), rating: 4, comment: '', favorite: false }]))
    expect(getSeenList()[0].rating).toBe(8)
    expect(getSeenList()[0].rating).toBe(8)
  })

  it('leaves ratings alone on a new device', () => {
    upsertSeenEntry({ ...ref(1), rating: 7, comment: '', favorite: false })
    expect(getSeenList()[0].rating).toBe(7)
  })
})

describe('recent draws', () => {
  it('keeps the last 20, newest first, without duplicates', () => {
    for (let id = 1; id <= 25; id++) pushHistory(ref(id))
    const history = pushHistory(ref(10))
    expect(history).toHaveLength(20)
    expect(history[0].id).toBe(10)
    expect(history.filter((e) => e.id === 10)).toHaveLength(1)
  })

  it('tells a film from a series with the same id', () => {
    pushHistory(ref(5, 'movie'))
    expect(pushHistory(ref(5, 'tv'))).toHaveLength(2)
  })
})

describe('set-aside titles', () => {
  it('are only added once', () => {
    addIgnored(ref(3))
    expect(addIgnored(ref(3))).toHaveLength(1)
  })
})

describe('signing out', () => {
  it('removes the account data but keeps device preferences', () => {
    upsertSeenEntry({ ...ref(1), rating: null, comment: '', favorite: false })
    pushHistory(ref(2))
    localStorage.setItem('movienight:sync', '{}')
    setThemePreference('dark')
    clearAccountData()
    expect(getSeenList()).toEqual([])
    expect(localStorage.getItem('movienight:history')).toBeNull()
    expect(localStorage.getItem('movienight:sync')).toBeNull()
    expect(getThemePreference()).toBe('dark')
  })
})
