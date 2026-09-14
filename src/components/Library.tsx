import { useState } from 'react'
import type { SeenEntry } from '../types'
import { posterUrl } from '../lib/tmdb'

interface Props {
  entries: SeenEntry[]
  onUpdate: (entry: SeenEntry) => void
  onRemove: (id: number, mediaType: string) => void
}

export default function Library({ entries, onUpdate, onRemove }: Props) {
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')

  const visible = filter === 'favorites' ? entries.filter((e) => e.favorite) : entries

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-cream/10 bg-panel p-8 text-center text-sand">
        Rien à afficher pour l'instant. Marque un film ou une série comme "vu" pour le retrouver ici.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 text-sm ${filter === 'all' ? 'bg-gold text-night' : 'bg-panel-2 text-sand'}`}
        >
          Tout ({entries.length})
        </button>
        <button
          onClick={() => setFilter('favorites')}
          className={`rounded-full px-3 py-1 text-sm ${filter === 'favorites' ? 'bg-gold text-night' : 'bg-panel-2 text-sand'}`}
        >
          Favoris ({entries.filter((e) => e.favorite).length})
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((entry) => (
          <LibraryRow key={`${entry.mediaType}-${entry.id}`} entry={entry} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}

function LibraryRow({ entry, onUpdate, onRemove }: { entry: SeenEntry; onUpdate: (e: SeenEntry) => void; onRemove: (id: number, mediaType: string) => void }) {
  const poster = posterUrl(entry.posterPath, 'w185')

  return (
    <div className="flex gap-3 rounded-lg border border-cream/10 bg-panel p-3">
      {poster ? (
        <img src={poster} alt={entry.title} className="h-24 w-16 shrink-0 rounded-sm object-cover" />
      ) : (
        <div className="h-24 w-16 shrink-0 rounded-sm bg-panel-2" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-display text-sm uppercase tracking-wide text-cream">
            {entry.title} <span className="text-sand">({entry.year})</span>
          </p>
          <button onClick={() => onRemove(entry.id, entry.mediaType)} className="shrink-0 text-xs text-sand/60 hover:text-burgundy">
            retirer
          </button>
        </div>

        <div className="mt-1 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onUpdate({ ...entry, rating: entry.rating === n ? null : n })}
              className={`text-sm ${entry.rating && n <= entry.rating ? 'text-gold' : 'text-sand/25'}`}
            >
              ★
            </button>
          ))}
          <button
            onClick={() => onUpdate({ ...entry, favorite: !entry.favorite })}
            className={`ml-1 text-sm ${entry.favorite ? 'text-burgundy' : 'text-sand/25'}`}
          >
            ♥
          </button>
        </div>

        <textarea
          value={entry.comment}
          onChange={(e) => onUpdate({ ...entry, comment: e.target.value })}
          placeholder="Ton avis (optionnel)…"
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-cream/10 bg-panel-2 px-2 py-1 text-xs text-cream outline-none focus:border-gold"
        />
      </div>
    </div>
  )
}
