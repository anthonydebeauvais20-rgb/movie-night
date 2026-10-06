import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LibraryView, MediaType, SeenEntry, TitleRef, WatchlistEntry } from '../types'
import { posterUrl } from '../lib/tmdb'
import type { TitleSearchResult } from '../lib/tmdb'
import { spineHeightFor, spineStyleFor } from '../lib/spines'
import { getLibraryView, setLibraryView } from '../lib/storage'
import { chipClass, primaryButtonClass, secondaryButtonClass } from '../lib/ui'
import AddSeenSearch from './AddSeenSearch'

interface Props {
  entries: SeenEntry[]
  onUpdate: (entry: SeenEntry) => void
  onRemove: (id: number, mediaType: string) => void
  onAddSeen: (found: TitleSearchResult) => void
  watchlist: WatchlistEntry[]
  onRemoveFromWatchlist: (id: number, mediaType: string) => void
  onMoveWatchlistToSeen: (entry: WatchlistEntry) => void
  ignored: TitleRef[]
  onRestoreIgnored: (id: number, mediaType: string) => void
}

type Filter = 'all' | 'favorites' | 'watchlist' | 'ignored'

const keyOf = (e: { id: number; mediaType: MediaType }) => `${e.mediaType}-${e.id}`

// Every shelf row is the same height so one repeating gradient can draw a full-width plank under each row.
const ROW = 180
const PLANK = 5
const ROW_GAP = 28
const shelfRowsStyle = {
  rowGap: ROW_GAP,
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW - PLANK}px, var(--plank) ${ROW - PLANK}px ${ROW}px, transparent ${ROW}px ${ROW + ROW_GAP}px)`,
}

const VIEW_OPTIONS: [LibraryView, string][] = [
  ['shelf', 'Étagère'],
  ['posters', 'Affiches'],
]

export default function Library({
  entries,
  onUpdate,
  onRemove,
  onAddSeen,
  watchlist,
  onRemoveFromWatchlist,
  onMoveWatchlistToSeen,
  ignored,
  onRestoreIgnored,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<LibraryView>(getLibraryView)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const seenKeys = new Set(entries.map(keyOf))

  // In the poster grid the detail sits below a possibly long list: bring it into view when a poster is picked.
  useEffect(() => {
    if (view !== 'posters' || !selectedKey) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [view, selectedKey])

  function changeView(next: LibraryView) {
    setView(next)
    setLibraryView(next)
  }

  const shown: (SeenEntry | TitleRef)[] =
    filter === 'watchlist'
      ? watchlist
      : filter === 'ignored'
        ? ignored
        : filter === 'favorites'
          ? entries.filter((e) => e.favorite)
          : entries
  const isSeenFilter = filter === 'all' || filter === 'favorites'
  const selectedSeen = isSeenFilter ? entries.find((e) => keyOf(e) === selectedKey) : undefined
  const selectedWatch = filter === 'watchlist' ? watchlist.find((e) => keyOf(e) === selectedKey) : undefined
  const selectedIgnored = filter === 'ignored' ? ignored.find((e) => keyOf(e) === selectedKey) : undefined

  function changeFilter(next: Filter) {
    setFilter(next)
    setSelectedKey(null)
  }

  const isShelf = view === 'shelf'
  const emptyMessage =
    filter === 'watchlist'
      ? 'Rien dans ta liste « À voir ». Ajoute un résultat de tirage avec le bouton « À voir plus tard ».'
      : filter === 'ignored'
        ? 'Aucun titre écarté. Le lien « Ne plus me proposer » sur un tirage range le titre ici.'
        : filter === 'favorites'
        ? `Aucun favori pour l’instant. Ouvre ${isShelf ? 'une cassette' : 'une affiche'} et ajoute-la à tes favoris.`
        : `${isShelf ? 'Ton étagère est vide' : 'Rien à afficher pour l’instant'}. Ajoute ci-dessus un titre que tu as déjà vu, ou marque un résultat de tirage comme vu.`

  return (
    <div className="space-y-6">
      <AddSeenSearch seenKeys={seenKeys} onAdd={onAddSeen} />

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => changeFilter('all')} className={chipClass(filter === 'all')}>
          Vus ({entries.length})
        </button>
        <button onClick={() => changeFilter('favorites')} className={chipClass(filter === 'favorites')}>
          Favoris ({entries.filter((e) => e.favorite).length})
        </button>
        <button onClick={() => changeFilter('watchlist')} className={chipClass(filter === 'watchlist')}>
          À voir ({watchlist.length})
        </button>
        <button onClick={() => changeFilter('ignored')} className={chipClass(filter === 'ignored')}>
          Écartés ({ignored.length})
        </button>
        <div className="ml-auto flex gap-2" role="group" aria-label="Affichage">
          {VIEW_OPTIONS.map(([value, label]) => (
            <button key={value} onClick={() => changeView(value)} aria-pressed={view === value} className={chipClass(view === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line/60 px-4 py-6 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <>
          {isShelf ? (
            <div className="flex flex-wrap gap-x-[3px]" style={shelfRowsStyle}>
              {shown.map((entry) => {
                const key = keyOf(entry)
                const isSelected = key === selectedKey
                const isFavorite = 'favorite' in entry && entry.favorite
                return (
                  <div key={key} className="flex items-end" style={{ height: ROW, paddingBottom: PLANK }}>
                    <button
                      onClick={() => setSelectedKey(isSelected ? null : key)}
                      aria-pressed={isSelected}
                      aria-label={`${entry.title}${entry.year ? ` (${entry.year})` : ''}`}
                      title={entry.title}
                      className={`spine-${spineStyleFor(entry.id)} spine-lift relative flex w-[34px] items-center justify-center rounded-t-[2px] ${
                        isFavorite ? 'pt-6' : ''
                      } ${isSelected ? '-translate-y-3' : 'hover:-translate-y-1'}`}
                      style={{ height: spineHeightFor(entry.id) }}
                    >
                      {isFavorite && (
                        <FavoriteStar className="absolute top-1 h-4 w-4" />
                      )}
                      <span className="spine-label font-poster text-xs">{entry.title}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {shown.map((entry) => {
                const key = keyOf(entry)
                const isSelected = key === selectedKey
                const isFavorite = 'favorite' in entry && entry.favorite
                return (
                  <li key={key}>
                    <PosterTile
                      entry={entry}
                      isSelected={isSelected}
                      isFavorite={isFavorite}
                      onClick={() => setSelectedKey(isSelected ? null : key)}
                    />
                  </li>
                )
              })}
            </ul>
          )}

          <div ref={detailRef}>
            {selectedSeen ? (
              <SeenDetail
                key={keyOf(selectedSeen)}
                entry={selectedSeen}
                onUpdate={onUpdate}
                onRemove={(id, mediaType) => {
                  onRemove(id, mediaType)
                  setSelectedKey(null)
                }}
              />
            ) : selectedWatch ? (
              <WatchlistDetail
                key={keyOf(selectedWatch)}
                entry={selectedWatch}
                onMarkSeen={(entry) => {
                  onMoveWatchlistToSeen(entry)
                  setSelectedKey(null)
                }}
                onRemove={(id, mediaType) => {
                  onRemoveFromWatchlist(id, mediaType)
                  setSelectedKey(null)
                }}
              />
            ) : selectedIgnored ? (
              <DetailFrame key={keyOf(selectedIgnored)} entry={selectedIgnored}>
                <p className="text-sm text-muted">Ce titre n’est plus proposé dans les tirages.</p>
                <button
                  onClick={() => {
                    onRestoreIgnored(selectedIgnored.id, selectedIgnored.mediaType)
                    setSelectedKey(null)
                  }}
                  className={`${primaryButtonClass} mt-3`}
                >
                  Remettre dans les tirages
                </button>
              </DetailFrame>
            ) : (
              <p className="text-sm text-muted">
                {isShelf ? 'Touche une cassette pour la sortir du rayon.' : 'Touche une affiche pour ouvrir sa fiche.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Outlined in the paper color so it stays readable over any poster or spine.
function FavoriteStar({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`fill-fluo stroke-paper [paint-order:stroke] ${className}`}
      strokeWidth="3"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.4 1.3-6.6L2.5 9.4l6.6-.8z" />
    </svg>
  )
}

function PosterTile({
  entry,
  isSelected,
  isFavorite,
  onClick,
}: {
  entry: SeenEntry | TitleRef
  isSelected: boolean
  isFavorite: boolean
  onClick: () => void
}) {
  const small = posterUrl(entry.posterPath, 'w185')
  const large = posterUrl(entry.posterPath, 'w342')
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${entry.title}${entry.year ? ` (${entry.year})` : ''}`}
      title={entry.title}
      className={`spine-lift relative block aspect-2/3 w-full overflow-hidden bg-tint ${
        isSelected
          ? '-translate-y-1 shadow-[0_0_0_2px_var(--color-fluo)]'
          : 'shadow-[0_0_0_1px_var(--color-line)] hover:-translate-y-0.5'
      }`}
    >
      {small && large ? (
        <img
          src={small}
          srcSet={`${small} 185w, ${large} 342w`}
          sizes="(min-width: 640px) 140px, 30vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center p-2 text-center font-poster text-sm leading-tight text-fg">
          {entry.title}
        </span>
      )}
      {isFavorite && (
        <FavoriteStar className="absolute right-1 top-1 h-5 w-5" />
      )}
    </button>
  )
}

function DetailFrame({
  entry,
  children,
}: {
  entry: SeenEntry | TitleRef
  children: ReactNode
}) {
  const poster = posterUrl(entry.posterPath, 'w185')
  return (
    <article className="jaquette-in grid grid-cols-[1.75rem_minmax(0,1fr)] overflow-hidden rounded-sm border border-line bg-paper">
      <div className={`spine-${spineStyleFor(entry.id)}`} aria-hidden="true" />
      <div className="flex gap-4 p-4">
        {poster ? (
          <img
            src={poster}
            alt={`Affiche de ${entry.title}`}
            className="poster-frame h-36 w-24 shrink-0 object-cover shadow-[0_0_0_1px_var(--color-line)]"
          />
        ) : (
          <div className="poster-frame h-36 w-24 shrink-0 bg-tint shadow-[inset_0_0_0_1px_var(--color-line)]" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-poster text-xl leading-tight text-fg [text-wrap:balance]">{entry.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {entry.mediaType === 'movie' ? 'Film' : 'Série'}
            {entry.year ? `, ${entry.year}` : ''}
          </p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </article>
  )
}

// 5 stars, out of 10: each star is 2 points. Tapping a star fills it, tapping it again halves it, a third tap clears.
function nextRating(current: number | null, star: number): number | null {
  if (current === star * 2) return star * 2 - 1
  if (current === star * 2 - 1) return null
  return star * 2
}

function StarRating({ value, onChange }: { value: number | null; onChange: (rating: number | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex" role="group" aria-label="Ta note sur 10">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = value === null ? 0 : value >= star * 2 ? 1 : value === star * 2 - 1 ? 0.5 : 0
          return (
            <button
              key={star}
              onClick={() => onChange(nextRating(value, star))}
              aria-label={`${star} étoile${star > 1 ? 's' : ''} (${star * 2}/10)`}
              className="relative px-0.5 text-2xl leading-none text-ink/25"
            >
              ★
              {fill > 0 && (
                <span
                  className="absolute inset-y-0 left-0.5 overflow-hidden text-ink"
                  style={{ width: fill === 1 ? 'calc(100% - 4px)' : 'calc((100% - 4px) / 2)' }}
                  aria-hidden="true"
                >
                  ★
                </span>
              )}
            </button>
          )
        })}
      </div>
      <span className="text-sm text-muted" aria-live="polite">
        {value === null ? 'Pas encore noté' : `${value}/10`}
      </span>
    </div>
  )
}

function SeenDetail({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: SeenEntry
  onUpdate: (e: SeenEntry) => void
  onRemove: (id: number, mediaType: string) => void
}) {
  return (
    <DetailFrame entry={entry}>
      <div className="flex flex-wrap items-center gap-3">
        <StarRating value={entry.rating} onChange={(rating) => onUpdate({ ...entry, rating })} />
        <button
          onClick={() => onUpdate({ ...entry, favorite: !entry.favorite })}
          aria-pressed={entry.favorite}
          className={secondaryButtonClass}
        >
          {entry.favorite ? 'Favori' : 'Ajouter aux favoris'}
        </button>
      </div>

      <label className="mt-3 block text-sm font-semibold text-fg">
        Ton avis
        <textarea
          value={entry.comment}
          onChange={(e) => onUpdate({ ...entry, comment: e.target.value })}
          placeholder="Optionnel"
          rows={2}
          className="mt-1 w-full resize-none rounded-sm border border-line/40 bg-paper px-2 py-1.5 text-sm font-normal text-fg outline-none placeholder:text-muted/70 focus:border-line"
        />
      </label>

      <button
        onClick={() => onRemove(entry.id, entry.mediaType)}
        className="mt-2 text-xs text-muted underline underline-offset-4 hover:text-fg"
      >
        Retirer de la bibliothèque
      </button>
    </DetailFrame>
  )
}

function WatchlistDetail({
  entry,
  onRemove,
  onMarkSeen,
}: {
  entry: WatchlistEntry
  onRemove: (id: number, mediaType: string) => void
  onMarkSeen: (entry: WatchlistEntry) => void
}) {
  return (
    <DetailFrame entry={entry}>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => onMarkSeen(entry)} className={primaryButtonClass}>
          Marquer comme vu
        </button>
        <button
          onClick={() => onRemove(entry.id, entry.mediaType)}
          className="text-sm text-muted underline underline-offset-4 hover:text-fg"
        >
          Retirer de la liste
        </button>
      </div>
    </DetailFrame>
  )
}
