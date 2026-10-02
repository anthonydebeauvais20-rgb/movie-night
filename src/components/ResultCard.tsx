import { useState } from 'react'
import type { DetailedTitle } from '../types'
import { posterUrl, providerLogoUrl } from '../lib/tmdb'

interface Props {
  title: DetailedTitle
  isSeen: boolean
  isFavorite: boolean
  isInWatchlist: boolean
  onMarkSeen: () => void
  onToggleFavorite: () => void
  onToggleWatchlist: () => void
  onReroll: () => void
}

const buttonBase = 'rounded-md px-4 py-2.5 font-display text-base font-bold uppercase tracking-wide transition'
const secondaryButton = `${buttonBase} border border-cream/15 bg-panel-2 text-cream hover:border-gold/50`
const ghostButton = `${buttonBase} text-sand hover:text-cream`

export default function ResultCard({
  title,
  isSeen,
  isFavorite,
  isInWatchlist,
  onMarkSeen,
  onToggleFavorite,
  onToggleWatchlist,
  onReroll,
}: Props) {
  const [showTrailer, setShowTrailer] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const poster = posterUrl(title.posterPath, 'w500')
  const providers = [...new Map([...title.providers.flatrate, ...title.providers.free, ...title.providers.ads].map((p) => [p.provider_id, p])).values()]
  const overviewShort =
    title.overview.length > 260
      ? title.overview.slice(0, 260).replace(/\s+\S*$/, '') + '…'
      : title.overview || 'Pas de synopsis disponible.'

  async function handleShare() {
    const tmdbUrl = `https://www.themoviedb.org/${title.mediaType}/${title.id}`
    const text = `On regarde "${title.title}" (${title.year}) ce soir ? 🎬`

    if (navigator.share) {
      try {
        await navigator.share({ title: title.title, text, url: tmdbUrl })
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
      return
    }

    try {
      await navigator.clipboard.writeText(`${text} ${tmdbUrl}`)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2000)
    } catch {
      // Clipboard unavailable — silently ignore, nothing actionable for the user here.
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-cream/10 bg-panel">
      <div className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-4 p-5 sm:grid-cols-[13rem_1fr] sm:gap-x-6 sm:p-6">
        <div className="relative self-start sm:row-span-2">
          {poster ? (
            <img src={poster} alt={`Affiche de ${title.title}`} className="w-full rounded-sm shadow-xl shadow-black/50" />
          ) : (
            <div className="flex aspect-2/3 w-full items-center justify-center rounded-sm bg-panel-2 text-xs text-sand">
              Pas d'affiche
            </div>
          )}
          {isSeen && (
            <span className="absolute left-0 top-3 rounded-r-sm bg-burgundy px-2.5 py-1 font-display text-sm font-bold uppercase tracking-wide text-cream shadow-md">
              Déjà vu
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-wide text-cream sm:text-4xl">
            {title.title} <span className="font-semibold text-sand">{title.year}</span>
          </h2>
          {title.originalTitle && title.originalTitle !== title.title && (
            <p className="mt-1 text-xs text-sand/70">Titre original : {title.originalTitle}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-sand">
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-gold">
              ★ {title.voteAverage.toFixed(1)}/10
            </span>
            {title.runtimeMinutes && <span className="rounded-full bg-panel-2 px-2 py-0.5">{title.runtimeMinutes} min</span>}
            {title.numberOfSeasons && (
              <span className="rounded-full bg-panel-2 px-2 py-0.5">
                {title.numberOfSeasons} saison{title.numberOfSeasons > 1 ? 's' : ''}
              </span>
            )}
            {title.genres.map((g) => (
              <span key={g} className="rounded-full bg-panel-2 px-2 py-0.5">
                {g}
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-2 min-w-0 sm:col-span-1">
          <p className="text-[15px] leading-relaxed text-cream/85">{overviewShort}</p>

          {title.cast.length > 0 && (
            <p className="mt-3 text-sm text-sand">
              <span className="text-sand/60">Avec </span>
              {title.cast.map((c) => c.name).join(', ')}
            </p>
          )}

          <div className="mt-4">
            {providers.length > 0 ? (
              <>
                <p className="mb-2 text-sm text-sand">Disponible sur</p>
                <div className="flex flex-wrap gap-2">
                  {providers.map((p) => (
                    <img
                      key={p.provider_id}
                      src={providerLogoUrl(p.logo_path, 'w92')}
                      alt={p.provider_name}
                      title={p.provider_name}
                      className="h-10 w-10 rounded-md"
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-sand/70">Pas de plateforme de streaming trouvée pour ta région.</p>
            )}
          </div>
        </div>
      </div>

      {title.trailerKey && (
        <div className="px-5 pb-5 sm:px-6">
          {showTrailer ? (
            <div>
              <div className="aspect-video w-full overflow-hidden rounded-md bg-night">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${title.trailerKey}?autoplay=1`}
                  title={`Bande-annonce de ${title.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
              <button onClick={() => setShowTrailer(false)} className="mt-2 text-xs text-sand hover:text-cream">
                Masquer la bande-annonce
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTrailer(true)}
              className="flex w-full items-center gap-3 rounded-md border border-gold/30 bg-burgundy/20 px-4 py-3 text-left transition hover:bg-burgundy/35"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-night">
                <svg viewBox="0 0 12 12" className="ml-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M2.5 1.2v9.6L10.6 6z" />
                </svg>
              </span>
              <span className="font-display text-lg font-semibold uppercase tracking-wide text-cream">
                Voir la bande-annonce
              </span>
            </button>
          )}
        </div>
      )}

      <div className="relative" aria-hidden="true">
        <div className="border-t-2 border-dashed border-cream/15" />
        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-cream/10 bg-night" />
        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-cream/10 bg-night" />
      </div>

      <div className="grid grid-cols-2 gap-2 bg-night/40 p-4 sm:flex sm:flex-wrap sm:items-center sm:px-6">
        <button
          onClick={onReroll}
          className={`${buttonBase} col-span-2 bg-gold py-3 text-lg text-night hover:bg-gold/90 sm:order-last sm:ml-auto`}
        >
          🎲 Autre proposition
        </button>
        <button onClick={onMarkSeen} className={`${secondaryButton} ${isSeen ? 'border-gold/40 text-gold' : ''}`}>
          {isSeen ? '✓ Marqué comme vu' : 'Marquer comme vu'}
        </button>
        <button onClick={onToggleWatchlist} className={`${secondaryButton} ${isInWatchlist ? 'border-gold/40 text-gold' : ''}`}>
          {isInWatchlist ? '🔖 Dans "à voir"' : '+ À voir plus tard'}
        </button>
        <button
          onClick={onToggleFavorite}
          title="Favori"
          className={`${isFavorite ? `${buttonBase} bg-burgundy text-cream hover:bg-burgundy/90` : ghostButton} sm:px-3.5`}
        >
          <span aria-hidden="true" className="text-xl leading-none">{isFavorite ? '♥' : '♡'}</span> <span className="sm:sr-only">Favori</span>
        </button>
        <button onClick={handleShare} title="Partager" className={`${ghostButton} sm:px-3.5`}>
          <span aria-hidden="true" className="text-xl leading-none">{shareStatus === 'copied' ? '✓' : '↗'}</span>{' '}
          <span className="sm:sr-only">{shareStatus === 'copied' ? 'Copié !' : 'Partager'}</span>
        </button>
      </div>
    </article>
  )
}
