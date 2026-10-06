import { posterUrl } from '../lib/tmdb'
import type { TitleRef } from '../types'

interface Props {
  entries: TitleRef[]
  disabled: boolean
  onOpen: (entry: TitleRef) => void
  onClear: () => void
}

// The last titles drawn, as a row of small posters: tap one to put it back on stage.
export default function DrawHistory({ entries, disabled, onOpen, onClear }: Props) {
  if (entries.length === 0) return null

  return (
    <section aria-labelledby="draw-history-title" className="pt-2">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="draw-history-title" className="font-wide text-base font-bold text-fg">
          Tirages récents
        </h2>
        <button onClick={onClear} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
          Effacer l’historique
        </button>
      </div>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {entries.map((entry) => {
          const poster = posterUrl(entry.posterPath, 'w185')
          return (
            <li key={`${entry.mediaType}-${entry.id}`} className="w-20 shrink-0">
              <button
                onClick={() => onOpen(entry)}
                disabled={disabled}
                aria-label={`Revoir la fiche de ${entry.title}${entry.year ? ` (${entry.year})` : ''}`}
                className="group block w-full text-left disabled:cursor-wait disabled:opacity-60"
              >
                {poster ? (
                  <img
                    src={poster}
                    alt=""
                    loading="lazy"
                    className="aspect-2/3 w-full object-cover shadow-[0_0_0_1px_var(--color-line)] transition group-hover:shadow-[0_0_0_2px_var(--color-fluo)]"
                  />
                ) : (
                  <span className="flex aspect-2/3 w-full items-center justify-center bg-tint p-1 text-center text-[10px] text-fg shadow-[0_0_0_1px_var(--color-line)]">
                    {entry.title}
                  </span>
                )}
                <span className="mt-1 block truncate text-xs text-fg">{entry.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
