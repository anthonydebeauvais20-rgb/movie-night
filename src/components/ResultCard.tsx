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

  const poster = posterUrl(title.posterPath)
  const allProviders = [...title.providers.flatrate, ...title.providers.free, ...title.providers.ads]
  const overviewShort =
    title.overview.length > 220 ? title.overview.slice(0, 220).trim() + '…' : title.overview || 'Pas de synopsis disponible.'

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
    <div className="overflow-hidden rounded-lg border border-cream/10 bg-panel">
      <div className="flex flex-col gap-5 p-5 sm:flex-row">
        <div className="mx-auto w-40 shrink-0 sm:mx-0">
          {poster ? (
            <img src={poster} alt={title.title} className="w-full rounded-sm shadow-lg" />
          ) : (
            <div className="flex aspect-2/3 w-full items-center justify-center rounded-sm bg-panel-2 text-xs text-sand">
              Pas d'affiche
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-cream">{title.title}</h2>
            <span className="text-sm text-sand">{title.year}</span>
            {isSeen && (
              <span className="rounded-full border border-burgundy/40 bg-burgundy/25 px-2 py-0.5 text-xs text-cream">
                Déjà vu
              </span>
            )}
          </div>
          {title.originalTitle && title.originalTitle !== title.title && (
            <p className="text-xs text-sand/70">Titre original : {title.originalTitle}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-sand">
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

          {title.cast.length > 0 && (
            <p className="mt-2 text-sm text-sand">
              <span className="text-sand/60">Avec </span>
              {title.cast.map((c) => c.name).join(', ')}
            </p>
          )}

          <p className="mt-2 text-sm leading-snug text-cream/80">{overviewShort}</p>

          {title.trailerKey && (
            <div className="mt-3">
              {showTrailer ? (
                <div className="aspect-video w-full overflow-hidden rounded-md">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${title.trailerKey}?autoplay=1`}
                    title={`Bande-annonce de ${title.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gold transition hover:bg-gold/20"
                >
                  ▶ Bande-annonce
                </button>
              )}
            </div>
          )}

          {allProviders.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-sand/70">Voir sur :</span>
              {allProviders.map((p) => (
                <img
                  key={p.provider_id}
                  src={providerLogoUrl(p.logo_path)}
                  alt={p.provider_name}
                  title={p.provider_name}
                  className="h-7 w-7 rounded-md"
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-sand/50">Pas de plateforme de streaming trouvée pour ta région.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-cream/10 bg-night/40 p-4">
        <button
          onClick={onMarkSeen}
          className="rounded-md bg-gold px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-night transition hover:bg-gold/90"
        >
          {isSeen ? '✓ Marqué comme vu' : 'Marquer comme vu'}
        </button>
        <button
          onClick={onToggleFavorite}
          className={`rounded-md px-4 py-2 font-display text-sm font-bold uppercase tracking-wide transition ${
            isFavorite ? 'bg-burgundy text-cream hover:bg-burgundy/90' : 'bg-panel-2 text-sand hover:text-cream'
          }`}
        >
          {isFavorite ? '♥ Favori' : '♡ Ajouter aux favoris'}
        </button>
        <button
          onClick={onToggleWatchlist}
          className={`rounded-md px-4 py-2 font-display text-sm font-bold uppercase tracking-wide transition ${
            isInWatchlist ? 'bg-panel-2 text-gold' : 'bg-panel-2 text-sand hover:text-cream'
          }`}
        >
          {isInWatchlist ? '🔖 Dans "à voir"' : '+ À voir plus tard'}
        </button>
        <button
          onClick={handleShare}
          className="rounded-md bg-panel-2 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-sand transition hover:text-cream"
        >
          {shareStatus === 'copied' ? 'Copié !' : '↗ Partager'}
        </button>
        <button
          onClick={onReroll}
          className="ml-auto rounded-md border border-gold/40 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-gold transition hover:bg-gold/10"
        >
          🎲 Autre proposition
        </button>
      </div>
    </div>
  )
}
