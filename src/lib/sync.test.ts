import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeenEntry, TitleRef } from '../types'
import { getHistory, getSeenList, getWatchlist, pushHistory, removeSeenEntry, setRegion, upsertSeenEntry, addToWatchlist } from './storage'
import { isLinkedTo, linkDevice, syncNow } from './sync'
import type { ItemRow } from './sync'

// An in-memory stand-in for the two Supabase tables, answering the calls sync.ts makes.
const server = vi.hoisted(() => ({
  items: new Map<string, Record<string, unknown>>(),
  state: null as Record<string, unknown> | null,
  offline: false,
}))

vi.mock('./supabase', () => {
  const fail = () => ({ data: null, error: { message: 'offline' } })
  const keyOf = (r: Record<string, unknown>) => `${r.list}:${r.media_type}:${r.tmdb_id}`
  return {
    supabase: {
      from(table: string) {
        return {
          select() {
            return {
              order() {
                return {
                  async range(from: number, to: number) {
                    if (server.offline) return fail()
                    const rows = [...server.items.values()].map(({ user_id: _u, updated_at: _t, ...r }) => r)
                    return { data: rows.slice(from, to + 1), error: null }
                  },
                }
              },
              async maybeSingle() {
                if (server.offline) return fail()
                return { data: server.state ? { settings: server.state.settings, history: server.state.history } : null, error: null }
              },
            }
          },
          async upsert(payload: Record<string, unknown> | Record<string, unknown>[]) {
            if (server.offline) return fail()
            if (table === 'user_state') server.state = payload as Record<string, unknown>
            else for (const row of payload as Record<string, unknown>[]) server.items.set(keyOf(row), row)
            return { error: null }
          },
        }
      },
    },
  }
})

const USER = 'user-1'

const seen = (id: number, over: Partial<SeenEntry> = {}): SeenEntry => ({
  id,
  mediaType: 'movie',
  title: `Film ${id}`,
  posterPath: null,
  year: '2020',
  dateAdded: `2026-10-${String(id).padStart(2, '0')}T10:00:00.000Z`,
  rating: null,
  comment: '',
  favorite: false,
  ...over,
})
const ref = (id: number): TitleRef => ({ ...seen(id), mediaType: 'movie' })

// What another device would have written.
function serverRow(list: ItemRow['list'], id: number, over: Partial<ItemRow> = {}) {
  const row = {
    user_id: USER,
    list,
    media_type: 'movie',
    tmdb_id: id,
    title: `Film ${id}`,
    poster_path: null,
    year: '2020',
    date_added: `2026-09-${String(id).padStart(2, '0')}T10:00:00.000Z`,
    rating: null,
    comment: '',
    favorite: false,
    deleted: false,
    ...over,
  }
  server.items.set(`${list}:movie:${id}`, row)
}

const live = (list: string) => [...server.items.values()].filter((r) => r.list === list && !r.deleted).map((r) => r.tmdb_id)

beforeEach(() => {
  localStorage.clear()
  server.items.clear()
  server.state = null
  server.offline = false
})

describe('first sign-in on a device', () => {
  it('adds the device titles to the account when asked, the account winning duplicates', async () => {
    serverRow('seen', 1, { rating: 9, comment: 'vu au cinéma' })
    upsertSeenEntry(seen(1, { rating: 4 }))
    upsertSeenEntry(seen(2))
    await linkDevice(USER, true)
    await syncNow(USER)

    expect(isLinkedTo(USER)).toBe(true)
    expect(live('seen').sort()).toEqual([1, 2])
    expect(getSeenList().find((e) => e.id === 1)).toMatchObject({ rating: 9, comment: 'vu au cinéma' })
  })

  it('drops the device titles when asked, and takes the account', async () => {
    serverRow('watchlist', 5)
    upsertSeenEntry(seen(2))
    await linkDevice(USER, false)
    await syncNow(USER)

    expect(getSeenList()).toEqual([])
    expect(getWatchlist().map((e) => e.id)).toEqual([5])
    expect(live('seen')).toEqual([])
  })

  it('sends the device settings when the account has none yet', async () => {
    setRegion('BE')
    await linkDevice(USER, true)
    await syncNow(USER)
    expect(server.state).toMatchObject({ settings: { region: 'BE' } })
  })

  it('takes the account settings when it has some', async () => {
    server.state = { settings: { region: 'CH', myProviders: [8], filters: { mediaType: 'tv' } }, history: [ref(3)] }
    setRegion('BE')
    await linkDevice(USER, true)
    await syncNow(USER)
    expect(localStorage.getItem('movienight:region')).toBe('CH')
    expect(getHistory().map((e) => e.id)).toEqual([3])
  })
})

describe('once linked', () => {
  beforeEach(async () => {
    await linkDevice(USER, true)
    await syncNow(USER)
  })

  it('sends new titles, edits and removals', async () => {
    upsertSeenEntry(seen(1))
    addToWatchlist(ref(2))
    await syncNow(USER)
    expect(live('seen')).toEqual([1])
    expect(live('watchlist')).toEqual([2])

    upsertSeenEntry(seen(1, { rating: 7, favorite: true }))
    await syncNow(USER)
    expect(server.items.get('seen:movie:1')).toMatchObject({ rating: 7, favorite: true })

    removeSeenEntry(1, 'movie')
    await syncNow(USER)
    // Kept as a tombstone, so the other devices learn about the removal.
    expect(server.items.get('seen:movie:1')).toMatchObject({ deleted: true })
  })

  it('brings in what other devices changed, including removals', async () => {
    upsertSeenEntry(seen(1))
    await syncNow(USER)

    serverRow('seen', 1, { deleted: true })
    serverRow('seen', 4, { rating: 8 })
    const changed = await syncNow(USER)

    expect(changed).toBe(true)
    expect(getSeenList().map((e) => [e.id, e.rating])).toEqual([[4, 8]])
  })

  it('keeps offline changes and sends them once back online', async () => {
    server.offline = true
    upsertSeenEntry(seen(6))
    pushHistory(ref(6))
    await expect(syncNow(USER)).rejects.toBeTruthy()
    expect(live('seen')).toEqual([])

    server.offline = false
    await syncNow(USER)
    expect(live('seen')).toEqual([6])
    expect(getSeenList().map((e) => e.id)).toEqual([6])
    expect((server.state!.history as TitleRef[]).map((e) => e.id)).toEqual([6])
  })

  it('refuses to sync a device linked to someone else', async () => {
    await expect(syncNow('user-2')).rejects.toThrow('device_not_linked')
  })
})
