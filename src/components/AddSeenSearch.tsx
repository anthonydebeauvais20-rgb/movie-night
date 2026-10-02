import { useEffect, useState } from 'react'
import { posterUrl, searchTitles } from '../lib/tmdb'
import type { TitleSearchResult } from '../lib/tmdb'

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
    <div className="mb-5 rounded-lg border border-cream/10 bg-panel p-4">
      <label htmlFor="add-seen-search" className="block font-display text-sm uppercase tracking-wide text-sand">
        Ajouter un titre déjà vu
      </label>
      <input
        id="add-seen-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cherche un film ou une série par son titre…"
        className="mt-2 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none placeholder:text-sand/50 focus:border-gold"
      />

      {status === 'loading' && <p className="mt-2 text-xs text-sand/70">Recherche…</p>}
      {status === 'error' && (
        <p className="mt-2 text-xs text-cream">Recherche impossible pour le moment. Vérifie ta connexion et réessaie.</p>
      )}
      {status === 'idle' && trimmed.length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-sand/70">Aucun résultat pour "{trimmed}".</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((found) => {
            const poster = posterUrl(found.posterPath, 'w185')
            const alreadySeen = seenKeys.has(`${found.mediaType}-${found.id}`)
            return (
              <li key={`${found.mediaType}-${found.id}`} className="flex items-center gap-3 rounded-md bg-panel-2 p-2">
                {poster ? (
                  <img src={poster} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="h-14 w-10 shrink-0 rounded-sm bg-night/60" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm uppercase tracking-wide text-cream">
                    {found.title} {found.year && <span className="text-sand">({found.year})</span>}
                  </p>
                  <p className="text-xs text-sand">{found.mediaType === 'movie' ? 'Film' : 'Série'}</p>
                </div>
                {alreadySeen ? (
                  <span className="shrink-0 text-xs text-sand">✓ Dans ta liste</span>
                ) : (
                  <button
                    onClick={() => onAdd(found)}
                    className="shrink-0 rounded-md bg-gold px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wide text-night transition hover:bg-gold/90"
                  >
                    ✓ Vu
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
