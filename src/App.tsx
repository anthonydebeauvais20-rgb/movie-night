import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel'
import Library from './components/Library'
import ResultCard from './components/ResultCard'
import SettingsPanel from './components/SettingsPanel'
import { fetchDetails, fetchGenres, fetchPopularProviders, pickRandom, pickRandomFromPerson, searchPerson, TmdbError, UNIFIED_GENRES } from './lib/tmdb'
import { getApiKey, getFilters, getMyProviders, getSeenList, removeSeenEntry, saveFilters, upsertSeenEntry } from './lib/storage'
import type { DetailedTitle, Filters, Genre, SeenEntry, WatchProvider } from './types'

const DEFAULT_FILTERS: Filters = {
  mediaType: 'both',
  genreLabels: [],
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

  const [filters, setFiltersState] = useState<Filters>(() => getFilters() ?? DEFAULT_FILTERS)
  const [movieGenres, setMovieGenres] = useState<Genre[]>([])
  const [tvGenres, setTvGenres] = useState<Genre[]>([])
  const [providers, setProviders] = useState<WatchProvider[]>([])

  const [myProviders, setMyProvidersState] = useState<number[]>(() => getMyProviders())
  const [seenList, setSeenList] = useState<SeenEntry[]>(() => getSeenList())
  const [result, setResult] = useState<DetailedTitle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasApiKey) return
    fetchGenres('movie').then(setMovieGenres).catch(() => {})
    fetchGenres('tv').then(setTvGenres).catch(() => {})
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

  const genreCatalog = useMemo(() => {
    if (filters.mediaType === 'movie') return movieGenres.map((g) => g.name)
    if (filters.mediaType === 'tv') return tvGenres.map((g) => g.name)
    return UNIFIED_GENRES.map((g) => g.label)
  }, [filters.mediaType, movieGenres, tvGenres])

  const excludeIds = useMemo(() => new Set(seenList.map((e) => e.id)), [seenList])

  async function handleDraw() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const effectiveExclude = filters.includeSeen ? new Set<number>() : excludeIds
      const personName = filters.personQuery.trim()

      let picked: Awaited<ReturnType<typeof pickRandom>>
      if (personName) {
        const person = await searchPerson(personName)
        if (!person) {
          setError(`Aucune personne trouvée pour "${personName}".`)
          return
        }
        picked = await pickRandomFromPerson(person.id, filters, effectiveExclude, movieGenres, tvGenres)
      } else {
        picked = await pickRandom(filters, effectiveExclude, movieGenres, tvGenres, myProviders)
      }

      if (!picked) {
        setError("Aucun résultat ne correspond à ces filtres. Essaie d'en assouplir quelques-uns.")
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

  function handleUpdateLibraryEntry(entry: SeenEntry) {
    setSeenList(upsertSeenEntry(entry))
  }

  function handleRemoveLibraryEntry(id: number, mediaType: string) {
    setSeenList(removeSeenEntry(id, mediaType))
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-cream/10 bg-panel/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="flex items-center gap-2 font-display text-xl font-extrabold uppercase tracking-wide text-gold">
            <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="#8c2f39" />
              <mask id="header-logo-mask">
                <rect width="64" height="64" fill="black" />
                <rect x="8" y="16" width="48" height="32" rx="6" fill="white" />
                <circle cx="8" cy="32" r="6" fill="black" />
                <circle cx="56" cy="32" r="6" fill="black" />
                <circle cx="32" cy="24" r="2.3" fill="black" />
                <circle cx="46" cy="24" r="2.3" fill="black" />
                <circle cx="39" cy="32" r="2.3" fill="black" />
                <circle cx="32" cy="40" r="2.3" fill="black" />
                <circle cx="46" cy="40" r="2.3" fill="black" />
              </mask>
              <g mask="url(#header-logo-mask)">
                <rect width="64" height="64" fill="#e7b44c" />
              </g>
              <line x1="22" y1="16" x2="22" y2="48" stroke="#100d12" strokeWidth="2" strokeDasharray="3 3" />
            </svg>
            Movie Night
          </h1>
          <nav className="flex gap-1 rounded-full bg-panel-2 p-1">
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
                className={`rounded-full px-3 py-1.5 font-display text-sm uppercase tracking-wide transition ${
                  tab === id ? 'bg-gold text-night' : 'text-sand hover:text-cream'
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
          <Library entries={seenList} onUpdate={handleUpdateLibraryEntry} onRemove={handleRemoveLibraryEntry} />
        ) : (
          <div className="space-y-5">
            <FilterPanel filters={filters} onChange={setFilters} genreCatalog={genreCatalog} />

            <button
              onClick={handleDraw}
              disabled={loading}
              className="w-full rounded-lg bg-gold py-3 font-display text-base font-bold uppercase tracking-wide text-night shadow-lg shadow-gold/10 transition hover:bg-gold/90 disabled:opacity-50"
            >
              {loading ? 'Tirage en cours…' : '🎲 Trouver un film / une série'}
            </button>

            {error && <p className="rounded-lg border border-burgundy/40 bg-burgundy/15 p-3 text-sm text-cream">{error}</p>}

            {result && (
              <ResultCard
                title={result}
                isSeen={isSeen(result.id, result.mediaType)}
                isFavorite={isFavorite(result.id, result.mediaType)}
                onMarkSeen={handleMarkSeen}
                onToggleFavorite={handleToggleFavorite}
                onReroll={handleDraw}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
