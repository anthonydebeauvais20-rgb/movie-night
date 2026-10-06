import { useEffect, useMemo, useRef, useState } from 'react'
import DrawHistory from './components/DrawHistory'
import FilterPanel from './components/FilterPanel'
import LegalPage, { LEGAL_ROUTES } from './components/LegalPage'
import type { LegalRoute } from './components/LegalPage'
import Library from './components/Library'
import ResultCard from './components/ResultCard'
import type { CurtainState } from './components/ResultCard'
import SettingsPanel from './components/SettingsPanel'
import Shelf from './components/Shelf'
import { fetchDetails, fetchPopularProviders, pickRandom, pickRandomFromPerson, searchPerson, TmdbError } from './lib/tmdb'
import type { TitleSearchResult } from './lib/tmdb'
import {
  addIgnored,
  addToWatchlist,
  clearHistory,
  getApiKey,
  getFilters,
  getHistory,
  getIgnored,
  getMyProviders,
  getSeenList,
  getWatchlist,
  pushHistory,
  removeFromWatchlist,
  removeIgnored,
  removeSeenEntry,
  saveFilters,
  upsertSeenEntry,
} from './lib/storage'
import type { DetailedTitle, Filters, SeenEntry, TitleRef, WatchlistEntry, WatchProvider } from './types'

const DEFAULT_FILTERS: Filters = {
  mediaType: 'both',
  genreInclude: [],
  genreExclude: [],
  genreMatch: 'any',
  languageInclude: [],
  languageExclude: [],
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

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Long enough for the shelf roll and the closing curtain to read, even when TMDB answers instantly.
const MIN_DRAW_MS = 700
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 0 : ms))

const refOf = (t: DetailedTitle): TitleRef => ({
  id: t.id,
  mediaType: t.mediaType,
  title: t.title,
  posterPath: t.posterPath,
  year: t.year,
  dateAdded: new Date().toISOString(),
})

// Legal pages live at #/confidentialite and #/mentions-legales, so they have a stable link (stores require one).
const legalRouteOf = (hash: string): LegalRoute | null => (LEGAL_ROUTES.includes(hash as LegalRoute) ? (hash as LegalRoute) : null)

export default function App() {
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(getApiKey()))
  const [tab, setTab] = useState<Tab>('tirage')
  const [legalRoute, setLegalRoute] = useState<LegalRoute | null>(() => legalRouteOf(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setLegalRoute(legalRouteOf(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function leaveLegalPage() {
    if (!legalRoute) return
    history.pushState(null, '', window.location.pathname + window.location.search)
    setLegalRoute(null)
  }

  const [filters, setFiltersState] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, ...getFilters() }))
  const [providers, setProviders] = useState<WatchProvider[]>([])

  const [myProviders, setMyProvidersState] = useState<number[]>(() => getMyProviders())
  const [seenList, setSeenList] = useState<SeenEntry[]>(() => getSeenList())
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(() => getWatchlist())
  const [ignored, setIgnored] = useState<TitleRef[]>(() => getIgnored())
  const [drawHistory, setDrawHistory] = useState<TitleRef[]>(() => getHistory())
  const [result, setResult] = useState<DetailedTitle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [curtain, setCurtain] = useState<CurtainState>('idle')
  // Bumped on every successful draw: remounts the card (so its curtain parts) and triggers the scroll to it.
  const [drawCount, setDrawCount] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (drawCount === 0) return
    stageRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [drawCount])

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

  const seenIds = useMemo(() => new Set(seenList.map((e) => e.id)), [seenList])
  const ignoredIds = useMemo(() => new Set(ignored.map((e) => e.id)), [ignored])
  const shelfLabels = useMemo(() => [...watchlist, ...seenList].map((e) => e.title), [watchlist, seenList])

  function fail(message: string) {
    setResult(null)
    setCurtain('idle')
    setError(message)
  }

  // Puts a title on stage: the card remounts (its curtain parts), the page scrolls to it, and it joins the history.
  function reveal(details: DetailedTitle) {
    setResult(details)
    setCurtain('opening')
    setDrawCount((count) => count + 1)
    setDrawHistory(pushHistory(refOf(details)))
  }

  async function handleDraw() {
    setLoading(true)
    setError(null)
    // The current title stays on stage while its curtain closes, instead of vanishing and collapsing the page.
    if (result) setCurtain('closing')
    const minDuration = wait(MIN_DRAW_MS)

    try {
      // Set-aside titles are never offered again, even when "include already seen" is on.
      const effectiveExclude = new Set([...(filters.includeSeen ? [] : seenIds), ...ignoredIds])
      if (result) effectiveExclude.add(result.id)
      const personName = filters.personQuery.trim()

      let picked: Awaited<ReturnType<typeof pickRandom>>
      if (personName) {
        const person = await searchPerson(personName)
        if (!person) {
          fail(`Aucune personne trouvée pour "${personName}".`)
          return
        }
        picked = await pickRandomFromPerson(person.id, filters, effectiveExclude)
      } else {
        picked = await pickRandom(filters, effectiveExclude, myProviders)
      }

      if (!picked) {
        fail(
          filters.recent === 'any'
            ? "Aucun résultat ne correspond à ces filtres. Essaie d'en assouplir quelques-uns."
            : "Aucune nouveauté ne correspond à ces filtres. Les sorties récentes sont souvent absentes des plateformes : essaie une période plus large ou assouplis les autres filtres.",
        )
        return
      }
      const details = await fetchDetails(picked.mediaType, picked.item.id)
      await minDuration
      reveal(details)
    } catch (e) {
      fail(
        e instanceof TmdbError && e.message === 'invalid_api_key'
          ? 'Clé API invalide. Vérifie-la dans les réglages.'
          : 'Une erreur est survenue en contactant TMDB. Réessaie dans un instant.',
      )
    } finally {
      setLoading(false)
    }
  }

  // "Ne plus me proposer": set the title aside and draw another one straight away.
  function handleIgnore() {
    if (!result) return
    setIgnored(addIgnored(refOf(result)))
    handleDraw()
  }

  // Brings back a title from the recent draws, with the same curtain as a draw (but no shelf roll).
  async function handleShowFromHistory(entry: TitleRef) {
    setError(null)
    if (result) setCurtain('closing')
    try {
      const [details] = await Promise.all([fetchDetails(entry.mediaType, entry.id), wait(result ? 450 : 0)])
      reveal(details)
    } catch {
      fail('Impossible de rouvrir ce titre pour le moment. Réessaie dans un instant.')
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
      <header>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
          <h1>
            <span className="logo-palace">
              <i aria-hidden="true" />
              Movie Night
            </span>
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
                onClick={() => {
                  setTab(id)
                  leaveLegalPage()
                  // Coming back to the draw tab must not replay the curtain on a title already revealed.
                  setCurtain('idle')
                }}
                aria-current={tab === id && !legalRoute ? 'page' : undefined}
                className={`py-1 transition ${
                  tab === id && !legalRoute
                    ? 'font-semibold text-fg underline decoration-fluo decoration-2 underline-offset-[7px]'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mx-auto max-w-3xl px-4">
          <div className="palace-rule" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {legalRoute ? (
          <LegalPage
            route={legalRoute}
            onBack={() => {
              leaveLegalPage()
              setTab('reglages')
            }}
          />
        ) : !hasApiKey ? (
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
            ignored={ignored}
            onRestoreIgnored={(id, mediaType) => setIgnored(removeIgnored(id, mediaType))}
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
                className="mt-4 w-full rounded-sm bg-action py-3.5 font-poster text-lg text-on-action transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? 'Tirage en cours…' : 'Tirer au sort'}
              </button>
            </div>

            {error && (
              <p className="rounded-sm border border-dashed border-line bg-tint px-4 py-3 text-sm text-fg">{error}</p>
            )}

            {result && (
              <div ref={stageRef} className="scroll-mt-4">
                <ResultCard
                  key={drawCount}
                  title={result}
                  curtain={curtain}
                  onCurtainOpened={() => setCurtain('idle')}
                  isSeen={isSeen(result.id, result.mediaType)}
                  isFavorite={isFavorite(result.id, result.mediaType)}
                  isInWatchlist={isInWatchlist(result.id, result.mediaType)}
                  onMarkSeen={handleMarkSeen}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleWatchlist={handleToggleWatchlist}
                  onIgnore={handleIgnore}
                  onReroll={handleDraw}
                />
              </div>
            )}

            <DrawHistory
              entries={drawHistory.filter((e) => !(result && e.id === result.id && e.mediaType === result.mediaType))}
              disabled={loading || curtain === 'closing'}
              onOpen={handleShowFromHistory}
              onClear={() => setDrawHistory(clearHistory())}
            />
          </div>
        )}
      </main>
    </div>
  )
}
