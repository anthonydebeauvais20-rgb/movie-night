import { useEffect, useState } from 'react'
import { posterUrl, searchTitles } from '../lib/tmdb'
import type { TitleSearchResult } from '../lib/tmdb'
import { inputClass, secondaryButtonClass } from '../lib/ui'

interface Props {
  seenKeys: Set<string>
  onAdd: (found: TitleSearchResult) => void
}

export default function AddSeenSearch({ seenKeys, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TitleSearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')
    const timer = setTimeout(() => {
      searchTitles(trimmed)
        .then((found) => {
          if (cancelled) return
          setResults(found)
          setStatus('idle')
        })
        .catch(() => {
          if (!cancelled) setStatus('error')
        })
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  return (
    <div className="rounded-sm border border-line bg-paper p-4">
      <label htmlFor="add-seen-search" className="block font-wide text-base font-bold text-fg">
        Ajouter un titre déjà vu
      </label>
      <input
        id="add-seen-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cherche un film ou une série par son titre…"
        className={`${inputClass} mt-2`}
      />

      {status === 'loading' && <p className="mt-2 text-xs text-muted">Recherche…</p>}
      {status === 'error' && (
        <p className="mt-2 text-xs text-fg">Recherche impossible pour le moment. Vérifie ta connexion et réessaie.</p>
      )}
      {status === 'idle' && trimmed.length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-muted">Aucun résultat pour « {trimmed} ».</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-line/20">
          {results.map((found) => {
            const poster = posterUrl(found.posterPath, 'w185')
            const alreadySeen = seenKeys.has(`${found.mediaType}-${found.id}`)
            return (
              <li key={`${found.mediaType}-${found.id}`} className="flex items-center gap-3 py-2">
                {poster ? (
                  <img src={poster} alt="" className="h-14 w-10 shrink-0 object-cover shadow-[0_0_0_1px_var(--color-line)]" />
                ) : (
                  <div className="h-14 w-10 shrink-0 bg-tint" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">
                    {found.title} {found.year && <span className="font-normal text-muted">({found.year})</span>}
                  </p>
                  <p className="text-xs text-muted">{found.mediaType === 'movie' ? 'Film' : 'Série'}</p>
                </div>
                {alreadySeen ? (
                  <span className="shrink-0 text-xs text-muted">Déjà sur l’étagère</span>
                ) : (
                  <button onClick={() => onAdd(found)} className={`${secondaryButtonClass} shrink-0 py-1.5`}>
                    Vu
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
