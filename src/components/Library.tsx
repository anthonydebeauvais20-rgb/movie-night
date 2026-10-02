import { useState } from 'react'
import type { ReactNode } from 'react'
import type { MediaType, SeenEntry, WatchlistEntry } from '../types'
import { posterUrl } from '../lib/tmdb'
import type { TitleSearchResult } from '../lib/tmdb'
import { spineHeightFor, spineStyleFor } from '../lib/spines'
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
}

type Filter = 'all' | 'favorites' | 'watchlist'

const keyOf = (e: { id: number; mediaType: MediaType }) => `${e.mediaType}-${e.id}`

// Every shelf row is the same height so one repeating gradient can draw a full-width plank under each row.
const ROW = 180
const PLANK = 5
const ROW_GAP = 28
const shelfRowsStyle = {
  rowGap: ROW_GAP,
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW - PLANK}px, var(--color-ink) ${ROW - PLANK}px ${ROW}px, transparent ${ROW}px ${ROW + ROW_GAP}px)`,
}

export default function Library({
  entries,
  onUpdate,
  onRemove,
  onAddSeen,
  watchlist,
  onRemoveFromWatchlist,
  onMoveWatchlistToSeen,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const seenKeys = new Set(entries.map(keyOf))

  const shown: (SeenEntry | WatchlistEntry)[] =
    filter === 'watchlist' ? watchlist : filter === 'favorites' ? entries.filter((e) => e.favorite) : entries
  const selectedSeen = filter === 'watchlist' ? undefined : entries.find((e) => keyOf(e) === selectedKey)
  const selectedWatch = filter === 'watchlist' ? watchlist.find((e) => keyOf(e) === selectedKey) : undefined

  function changeFilter(next: Filter) {
    setFilter(next)
    setSelectedKey(null)
  }

  const emptyMessage =
    filter === 'watchlist'
      ? 'Rien dans ta liste « À voir ». Ajoute un résultat de tirage avec le bouton « À voir plus tard ».'
      : filter === 'favorites'
        ? 'Aucun favori pour l’instant. Ouvre une cassette et ajoute-la à tes favoris.'
        : 'Ton étagère est vide. Ajoute ci-dessus un titre que tu as déjà vu, ou marque un résultat de tirage comme vu.'

  return (
    <div className="space-y-6">
      <AddSeenSearch seenKeys={seenKeys} onAdd={onAddSeen} />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => changeFilter('all')} className={chipClass(filter === 'all')}>
          Vus ({entries.length})
        </button>
        <button onClick={() => changeFilter('favorites')} className={chipClass(filter === 'favorites')}>
          Favoris ({entries.filter((e) => e.favorite).length})
        </button>
        <button onClick={() => changeFilter('watchlist')} className={chipClass(filter === 'watchlist')}>
          À voir ({watchlist.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-sm border-[1.5px] border-dashed border-ink/60 px-4 py-6 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <>
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
                      isSelected ? '-translate-y-3' : 'hover:-translate-y-1'
                    }`}
                    style={{ height: spineHeightFor(entry.id) }}
                  >
                    {isFavorite && (
                      <span className="absolute top-1.5 h-2.5 w-2.5 rounded-full bg-fluo ring-2 ring-paper" aria-hidden="true" />
                    )}
                    <span className="spine-label font-poster text-xs">{entry.title}</span>
                  </button>
                </div>
              )
            })}
          </div>

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
          ) : (
            <p className="text-sm text-muted">Touche une cassette pour la sortir du rayon.</p>
          )}
        </>
      )}
    </div>
  )
}

function DetailFrame({
  entry,
  children,
}: {
  entry: SeenEntry | WatchlistEntry
  children: ReactNode
}) {
  const poster = posterUrl(entry.posterPath, 'w185')
  return (
    <article className="jaquette-in grid grid-cols-[1.75rem_minmax(0,1fr)] overflow-hidden rounded-sm border-[1.5px] border-ink bg-paper">
      <div className={`spine-${spineStyleFor(entry.id)}`} aria-hidden="true" />
      <div className="flex gap-4 p-4">
        {poster ? (
          <img
            src={poster}
            alt={`Affiche de ${entry.title}`}
            className="h-36 w-24 shrink-0 object-cover shadow-[0_0_0_1px_var(--color-ink)]"
          />
        ) : (
          <div className="h-36 w-24 shrink-0 bg-tint shadow-[inset_0_0_0_1px_var(--color-ink)]" />
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
        <div className="flex" role="group" aria-label="Ta note">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ ...entry, rating: entry.rating === n ? null : n })}
              aria-label={`${n} sur 5`}
              aria-pressed={entry.rating === n}
              className={`px-0.5 text-xl leading-none ${entry.rating && n <= entry.rating ? 'text-ink' : 'text-ink/25'}`}
            >
              ★
            </button>
          ))}
        </div>
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
          className="mt-1 w-full resize-none rounded-sm border-[1.5px] border-ink/40 bg-paper px-2 py-1.5 text-sm font-normal text-fg outline-none placeholder:text-muted/70 focus:border-ink"
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
