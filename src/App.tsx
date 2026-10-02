import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel'
import Library from './components/Library'
import ResultCard from './components/ResultCard'
import SettingsPanel from './components/SettingsPanel'
import Shelf from './components/Shelf'
import Wordmark from './components/Wordmark'
import { fetchDetails, fetchPopularProviders, pickRandom, pickRandomFromPerson, searchPerson, TmdbError } from './lib/tmdb'
import type { TitleSearchResult } from './lib/tmdb'
import {
  addToWatchlist,
  getApiKey,
  getFilters,
  getMyProviders,
  getSeenList,
  getWatchlist,
  removeFromWatchlist,
  removeSeenEntry,
  saveFilters,
  upsertSeenEntry,
} from './lib/storage'
import type { DetailedTitle, Filters, SeenEntry, WatchlistEntry, WatchProvider } from './types'

const DEFAULT_FILTERS: Filters = {
  mediaType: 'both',
  genreInclude: [],
  genreExclude: [],
  genreMatch: 'any',
  recent: 'any',
  yearMin: 1970,
  yearMax: new Date().getFullYear(),
  minRating: 5,
  durationMin: 0,
  durationMax: 240,
  includeSeen: false,
  personQuery: '',
}

type Tab = 'tirage' | 'bibliotheque' | 'reglages'

export default function App() {
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(getApiKey()))
  const [tab, setTab] = useState<Tab>('tirage')

  const [filters, setFiltersState] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, ...getFilters() }))
  const [providers, setProviders] = useState<WatchProvider[]>([])

  const [myProviders, setMyProvidersState] = useState<number[]>(() => getMyProviders())
  const [seenList, setSeenList] = useState<SeenEntry[]>(() => getSeenList())
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => getWatchlist())
  const [result, setResult] = useState<DetailedTitle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasApiKey) return
    Promise.all([fetchPopularProviders('movie'), fetchPopularProviders('tv')])
      .then(([m, t]) => {
        const merged = new Map<number, WatchProvider>()
        for (const p of [...m, ...t]) merged.set(p.provider_id, p)
        setProviders(Array.from(merged.values()))
      })
      .catch(() => {})
  }, [hasApiKey])

  function setFilters(next: Filters) {
    setFiltersState(next)
    saveFilters(next)
  }

  const excludeIds = useMemo(() => new Set(seenList.map((e) => e.id)), [seenList])
  const shelfLabels = useMemo(() => [...watchlist, ...seenList].map((e) => e.title), [watchlist, seenList])

  async function handleDraw() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const effectiveExclude = new Set(filters.includeSeen ? [] : excludeIds)
      if (result) effectiveExclude.add(result.id)
      const personName = filters.personQuery.trim()

      let picked: Awaited<ReturnType<typeof pickRandom>>
      if (personName) {
        const person = await searchPerson(personName)
        if (!person) {
          setError(`Aucune personne trouvée pour "${personName}".`)
          return
        }
        picked = await pickRandomFromPerson(person.id, filters, effectiveExclude)
      } else {
        picked = await pickRandom(filters, effectiveExclude, myProviders)
      }

      if (!picked) {
        setError(
          filters.recent === 'any'
            ? "Aucun résultat ne correspond à ces filtres. Essaie d'en assouplir quelques-uns."
            : "Aucune nouveauté ne correspond à ces filtres. Les sorties récentes sont souvent absentes des plateformes : essaie une période plus large ou assouplis les autres filtres.",
        )
        return
      }
      const details = await fetchDetails(picked.mediaType, picked.item.id)
      setResult(details)
    } catch (e) {
      if (e instanceof TmdbError && e.message === 'invalid_api_key') {
        setError('Clé API invalide. Vérifie-la dans les réglages.')
      } else {
        setError('Une erreur est survenue en contactant TMDB. Réessaie dans un instant.')
      }
    } finally {
      setLoading(false)
    }
  }

  function isSeen(id: number, mediaType: string) {
    return seenList.some((e) => e.id === id && e.mediaType === mediaType)
  }

  function isFavorite(id: number, mediaType: string) {
    return seenList.some((e) => e.id === id && e.mediaType === mediaType && e.favorite)
  }

  function isInWatchlist(id: number, mediaType: string) {
    return watchlist.some((e) => e.id === id && e.mediaType === mediaType)
  }

  function handleMarkSeen() {
    if (!result) return
    const existing = seenList.find((e) => e.id === result.id && e.mediaType === result.mediaType)
    const entry: SeenEntry = existing ?? {
      id: result.id,
      mediaType: result.mediaType,
      title: result.title,
      posterPath: result.posterPath,
      year: result.year,
      dateAdded: new Date().toISOString(),
      rating: null,
      comment: '',
      favorite: false,
    }
    setSeenList(upsertSeenEntry(entry))
  }

  function handleToggleFavorite() {
    if (!result) return
    const existing = seenList.find((e) => e.id === result.id && e.mediaType === result.mediaType)
    const entry: SeenEntry = existing
      ? { ...existing, favorite: !existing.favorite }
      : {
          id: result.id,
          mediaType: result.mediaType,
          title: result.title,
          posterPath: result.posterPath,
          year: result.year,
          dateAdded: new Date().toISOString(),
          rating: null,
          comment: '',
          favorite: true,
        }
    setSeenList(upsertSeenEntry(entry))
  }

  function handleToggleWatchlist() {
    if (!result) return
    if (isInWatchlist(result.id, result.mediaType)) {
      setWatchlist(removeFromWatchlist(result.id, result.mediaType))
    } else {
      setWatchlist(
        addToWatchlist({
          id: result.id,
          mediaType: result.mediaType,
          title: result.title,
          posterPath: result.posterPath,
          year: result.year,
          dateAdded: new Date().toISOString(),
        }),
      )
    }
  }

  function handleAddSeenManually(found: TitleSearchResult) {
    if (isSeen(found.id, found.mediaType)) return
    setSeenList(
      upsertSeenEntry({
        id: found.id,
        mediaType: found.mediaType,
        title: found.title,
        posterPath: found.posterPath,
        year: found.year,
        dateAdded: new Date().toISOString(),
        rating: null,
        comment: '',
        favorite: false,
      }),
    )
    if (isInWatchlist(found.id, found.mediaType)) setWatchlist(removeFromWatchlist(found.id, found.mediaType))
  }

  function handleUpdateLibraryEntry(entry: SeenEntry) {
    setSeenList(upsertSeenEntry(entry))
  }

  function handleRemoveLibraryEntry(id: number, mediaType: string) {
    setSeenList(removeSeenEntry(id, mediaType))
  }

  function handleRemoveFromWatchlist(id: number, mediaType: string) {
    setWatchlist(removeFromWatchlist(id, mediaType))
  }

  function handleMoveWatchlistToSeen(entry: WatchlistEntry) {
    setSeenList(
      upsertSeenEntry({
        id: entry.id,
        mediaType: entry.mediaType,
        title: entry.title,
        posterPath: entry.posterPath,
        year: entry.year,
        dateAdded: new Date().toISOString(),
        rating: null,
        comment: '',
        favorite: false,
      }),
    )
    setWatchlist(removeFromWatchlist(entry.id, entry.mediaType))
  }

  return (
    <div className="min-h-full">
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
          <h1>
            <Wordmark className="h-[18px] w-auto sm:h-5" />
          </h1>
          <nav className="flex gap-4 text-sm">
            {(
              [
                ['tirage', 'Tirage'],
                ['bibliotheque', 'Bibliothèque'],
                ['reglages', 'Réglages'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`py-1 transition ${
                  tab === id
                    ? 'font-semibold text-fg underline decoration-fluo decoration-[3px] underline-offset-[7px]'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!hasApiKey ? (
          <SettingsPanel
            providers={providers}
            onSaved={() => {
              setHasApiKey(true)
              setMyProvidersState(getMyProviders())
            }}
          />
        ) : tab === 'reglages' ? (
          <SettingsPanel
            providers={providers}
            onSaved={() => {
              setMyProvidersState(getMyProviders())
              setTab('tirage')
            }}
          />
        ) : tab === 'bibliotheque' ? (
          <Library
            entries={seenList}
            onUpdate={handleUpdateLibraryEntry}
            onRemove={handleRemoveLibraryEntry}
            onAddSeen={handleAddSeenManually}
            watchlist={watchlist}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
            onMoveWatchlistToSeen={handleMoveWatchlistToSeen}
          />
        ) : (
          <div className="space-y-5">
            <FilterPanel filters={filters} onChange={setFilters} />

            <div>
              <Shelf
                labels={shelfLabels}
                loading={loading}
                picked={result ? { id: result.id, title: result.title } : null}
              />
              <button
                onClick={handleDraw}
                disabled={loading}
                className="mt-4 w-full bg-ink py-3.5 font-poster text-lg text-on-ink shadow-[4px_4px_0_var(--color-fluo)] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--color-fluo)] disabled:translate-x-0.5 disabled:translate-y-0.5 disabled:shadow-[2px_2px_0_var(--color-fluo)]"
              >
                {loading ? 'Tirage en cours…' : 'Tirer au sort'}
              </button>
            </div>

            {error && (
              <p className="rounded-sm border-[1.5px] border-dashed border-ink bg-tint px-4 py-3 text-sm text-fg">{error}</p>
            )}

            {result && (
              <ResultCard
                title={result}
                isSeen={isSeen(result.id, result.mediaType)}
                isFavorite={isFavorite(result.id, result.mediaType)}
                isInWatchlist={isInWatchlist(result.id, result.mediaType)}
                onMarkSeen={handleMarkSeen}
                onToggleFavorite={handleToggleFavorite}
                onToggleWatchlist={handleToggleWatchlist}
                onReroll={handleDraw}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
