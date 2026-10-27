import { useState } from 'react'
import type { ReactNode } from 'react'
import type { DetailedTitle } from '../types'
import { posterUrl, providerLogoUrl } from '../lib/tmdb'
import { spineStyleFor } from '../lib/spines'
import { primaryButtonClass, secondaryButtonClass as secondaryButton } from '../lib/ui'

// idle = curtain open and still; closing = drawn over the title during a new draw; opening = parting on a new title.
export type CurtainState = 'idle' | 'closing' | 'opening'

interface Props {
  title: DetailedTitle
  curtain: CurtainState
  onCurtainOpened: () => void
  isSeen: boolean
  isFavorite: boolean
  isInWatchlist: boolean
  // The seen entry has a rating or a review, which un-seeing would erase: ask first.
  seenHasNotes: boolean
  onToggleSeen: () => void
  onToggleFavorite: () => void
  onToggleWatchlist: () => void
  onIgnore: () => void
  onReroll: () => void
}

export default function ResultCard({
  title,
  curtain,
  onCurtainOpened,
  isSeen,
  isFavorite,
  isInWatchlist,
  seenHasNotes,
  onToggleSeen,
  onToggleFavorite,
  onToggleWatchlist,
  onIgnore,
  onReroll,
}: Props) {
  const [showTrailer, setShowTrailer] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')
  const [confirmUnsee, setConfirmUnsee] = useState(false)

  function handleSeenClick() {
    if (isSeen && seenHasNotes) setConfirmUnsee(true)
    else onToggleSeen()
  }

  const poster = posterUrl(title.posterPath, 'w500')
  const providers = [...new Map([...title.providers.flatrate, ...title.providers.free, ...title.providers.ads].map((p) => [p.provider_id, p])).values()]
  const overviewShort =
    title.overview.length > 260
      ? title.overview.slice(0, 260).replace(/\s+\S*$/, '') + '…'
      : title.overview || 'Pas de synopsis disponible.'
  const details = [
    title.mediaType === 'movie' ? 'Film' : 'Série',
    title.year,
    title.runtimeMinutes ? `${title.runtimeMinutes} min` : null,
    title.numberOfSeasons ? `${title.numberOfSeasons} saison${title.numberOfSeasons > 1 ? 's' : ''}` : null,
  ].filter(Boolean)

  async function handleShare() {
    const tmdbUrl = `https://www.themoviedb.org/${title.mediaType}/${title.id}`
    const text = `On regarde "${title.title}" (${title.year}) ce soir ?`

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
    <article
      aria-busy={curtain === 'closing'}
      className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] overflow-hidden rounded-sm border border-line bg-paper"
    >
      <div className={`spine-${spineStyleFor(title.id)} flex items-center justify-center py-4`} aria-hidden="true">
        <span className="spine-label font-poster text-sm">{title.title}</span>
      </div>

      <div className="curtain" data-state={curtain} aria-hidden="true">
        <span className="curtain-panel curtain-left" />
        <span
          className="curtain-panel curtain-right"
          onAnimationEnd={curtain === 'opening' ? onCurtainOpened : undefined}
        />
      </div>

      <div className="min-w-0" inert={curtain === 'closing'}>
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-4 p-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-x-6 sm:p-6">
          <div className="relative self-start sm:row-span-2">
            {poster ? (
              <img src={poster} alt={`Affiche de ${title.title}`} className="poster-frame w-full" />
            ) : (
              <div className="poster-frame flex aspect-2/3 w-full items-end justify-center bg-tint pb-3 text-xs text-muted">
                Pas d'affiche
              </div>
            )}
            <span
              className="rating-sticker absolute -right-3 -top-3 grid h-14 w-14 place-items-center rounded-full text-center font-wide font-bold leading-none"
              aria-label={`Note TMDB : ${title.voteAverage.toFixed(1)} sur 10`}
            >
              <span>
                <span className="block text-lg">{title.voteAverage.toFixed(1).replace('.', ',')}</span>
                <span className="block text-[9px] font-bold">/10</span>
              </span>
            </span>
            {isSeen && (
              <span className="absolute bottom-3 left-0 bg-fluo px-2.5 py-1 text-xs font-bold text-on-fluo">Déjà vu</span>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-poster text-2xl leading-[1.08] text-fg [text-wrap:balance] sm:text-4xl">{title.title}</h2>
            {title.originalTitle && title.originalTitle !== title.title && (
              <p className="mt-1 text-xs text-muted">Titre original : {title.originalTitle}</p>
            )}
            <p className="mt-2 text-sm text-muted">{details.join(', ')}</p>
            {title.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {title.genres.map((g) => (
                  <span key={g} className="rounded-full border border-line/50 px-2 py-0.5 text-xs text-fg">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="col-span-2 min-w-0 sm:col-span-1">
            <p className="text-[15px] leading-relaxed text-fg">{overviewShort}</p>

            {title.cast.length > 0 && (
              <p className="mt-3 text-sm text-muted">Avec {title.cast.map((c) => c.name).join(', ')}</p>
            )}

            <div className="mt-4">
              {providers.length > 0 ? (
                <>
                  <p className="mb-2 flex items-baseline justify-between gap-3 text-sm text-muted">
                    Disponible sur
                    <span className="text-[11px] text-muted/80">Source : JustWatch</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {providers.map((p) => {
                      const logo = (
                        <img src={providerLogoUrl(p.logo_path, 'w92')} alt={p.provider_name} className="h-10 w-10 rounded-md" />
                      )
                      return title.providers.link ? (
                        <a
                          key={p.provider_id}
                          href={title.providers.link}
                          target="_blank"
                          rel="noreferrer"
                          title={`Regarder sur ${p.provider_name}`}
                          className="rounded-md transition hover:brightness-110 hover:ring-2 hover:ring-fluo"
                        >
                          {logo}
                        </a>
                      ) : (
                        <span key={p.provider_id} title={p.provider_name}>
                          {logo}
                        </span>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">Pas de plateforme de streaming trouvée pour ta région.</p>
              )}
            </div>
          </div>
        </div>

        {title.trailerKey && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            {showTrailer ? (
              <div>
                <div className="aspect-video w-full overflow-hidden bg-tint">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${title.trailerKey}?autoplay=1`}
                    title={`Bande-annonce de ${title.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                <button onClick={() => setShowTrailer(false)} className="mt-2 text-xs text-muted underline hover:text-fg">
                  Masquer la bande-annonce
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTrailer(true)}
                className="flex w-full items-center gap-3 rounded-sm border border-line px-4 py-3 text-left transition hover:bg-tint"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action text-on-action">
                  <svg viewBox="0 0 12 12" className="ml-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                    <path d="M2.5 1.2v9.6L10.6 6z" />
                  </svg>
                </span>
                <span className="font-wide text-base font-bold text-fg">Voir la bande-annonce</span>
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line/60 p-4 sm:px-6">
          {/* The tick only appears once the title is marked as seen. */}
          <ToggleButton pressed={isSeen} onClick={handleSeenClick} icon={isSeen ? <CheckIcon /> : null} onLabel="Vu" offLabel="Marquer comme vu" />
          <ToggleButton
            pressed={isInWatchlist}
            onClick={onToggleWatchlist}
            icon={<BookmarkIcon filled={isInWatchlist} />}
            onLabel="Dans « À voir »"
            offLabel="À voir plus tard"
          />
          <ToggleButton
            pressed={isFavorite}
            onClick={onToggleFavorite}
            icon={<StarIcon filled={isFavorite} />}
            onLabel="Favori"
            offLabel="Ajouter aux favoris"
          />
          {confirmUnsee && (
            <div className="w-full rounded-sm border border-dashed border-line bg-tint px-3 py-2.5 text-sm text-fg" role="alert">
              <p>Retirer « Vu » effacera aussi ta note et ton avis sur ce titre.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setConfirmUnsee(false)
                    onToggleSeen()
                  }}
                  className={secondaryButton}
                >
                  Retirer quand même
                </button>
                <button onClick={() => setConfirmUnsee(false)} className="px-2 text-sm text-muted underline underline-offset-4 hover:text-fg">
                  Annuler
                </button>
              </div>
            </div>
          )}
          <button onClick={handleShare} className="px-2 py-2 text-sm font-semibold text-fg underline underline-offset-4 hover:text-muted">
            {shareStatus === 'copied' ? 'Lien copié' : 'Partager'}
          </button>
          <button
            onClick={onIgnore}
            title="Ce titre ne sera plus proposé. Tu peux l'y remettre depuis la Bibliothèque, rayon « Écartés »."
            className="px-2 py-2 text-sm text-muted underline underline-offset-4 hover:text-fg"
          >
            Ne plus me proposer
          </button>
          <button onClick={onReroll} className={`${primaryButtonClass} w-full py-3 sm:ml-auto sm:w-auto`}>
            Autre tirage
          </button>
        </div>
      </div>
    </article>
  )
}

// Vu / À voir / Favori: when on, the button takes the brass of the "Déjà vu" tag, with a filled icon.
function ToggleButton({
  pressed,
  onClick,
  icon,
  onLabel,
  offLabel,
}: {
  pressed: boolean
  onClick: () => void
  icon: ReactNode
  onLabel: string
  offLabel: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-2 text-sm font-semibold transition-colors ${
        pressed
          ? 'border-fluo bg-fluo text-on-fluo shadow-[inset_0_0_0_2px_var(--color-paper)]'
          : 'border-line text-fg hover:bg-tint'
      }`}
    >
      {icon}
      {pressed ? onLabel : offLabel}
    </button>
  )
}

const iconClass = 'h-[15px] w-[15px] shrink-0'

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className={iconClass} aria-hidden="true">
      <path d="M2.5 8.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={iconClass} aria-hidden="true">
      <path
        d="M4 1.5h8v13l-4-3-4 3z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.4 1.3-6.6L2.5 9.4l6.6-.8z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinejoin="round"
      />
    </svg>
  )
}