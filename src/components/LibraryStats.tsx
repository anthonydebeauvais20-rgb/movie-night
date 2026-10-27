import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SeenEntry, TitleRef } from '../types'
import { computeStats, decadeLabel, formatDuration, loadMissingFacts, readFacts } from '../lib/stats'

interface Props {
  seen: SeenEntry[]
  watchlist: TitleRef[]
}

const fr = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
        <h3 className="font-poster text-[15px] uppercase tracking-[0.08em] text-fg [text-wrap:balance]">{title}</h3>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function BigFigure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="font-poster text-[44px] leading-none tabular-nums text-fg">{value}</div>
      <div className="mt-1.5 text-xs uppercase tracking-[0.08em] text-muted">{label}</div>
    </div>
  )
}

// "25 j 4 h" with the units set smaller than the figures.
function DurationFigure({ minutes }: { minutes: number }) {
  const parts = formatDuration(minutes).split(' ')
  return (
    <>
      {parts.map((part, i) =>
        /^\d+$/.test(part) ? (
          <span key={i}>{part}</span>
        ) : (
          <small key={i} className="text-xl">
            {' '}
            {part}
            {i < parts.length - 1 ? ' ' : ''}
          </small>
        ),
      )}
    </>
  )
}

export default function LibraryStats({ seen, watchlist }: Props) {
  const [facts, setFacts] = useState(readFacts)

  // Genres and durations are fetched once per title, then kept on the device.
  useEffect(() => {
    let cancelled = false
    loadMissingFacts([...seen, ...watchlist], setFacts, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [seen, watchlist])

  const stats = useMemo(() => computeStats(seen, watchlist, facts), [seen, watchlist, facts])

  if (stats.total === 0) {
    return (
      <p className="rounded-sm border border-dashed border-line/60 px-4 py-6 text-center text-sm text-muted">
        Les statistiques apparaîtront dès que tu auras marqué quelques titres comme vus.
      </p>
    )
  }

  const maxGenre = stats.genres[0]?.[1] ?? 1
  const maxDecade = Math.max(1, ...stats.decades.map(([, n]) => n))
  const filmShare = (stats.films / stats.total) * 100

  return (
    <article className="grid gap-7 rounded-sm border border-line bg-paper px-5 py-6" aria-busy={stats.pending > 0}>
      <div className="grid grid-cols-2 gap-4">
        <BigFigure value={stats.total} label={stats.total > 1 ? 'titres vus' : 'titre vu'} />
        <BigFigure value={<DurationFigure minutes={stats.filmMinutes + stats.seriesMinutes} />} label="devant l’écran" />
      </div>

      <div>
        <div className="flex h-2.5 border border-line" role="img" aria-label={`${plural(stats.films, 'film')}, ${plural(stats.series, 'série')}`}>
          <span className="block bg-ink" style={{ width: `${filmShare}%` }} />
          <span className="block flex-1 bg-fluo" />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 text-[13px] text-fg">
          <span>
            <span className="mr-1.5 inline-block h-2 w-2 bg-ink" aria-hidden="true" />
            {plural(stats.films, 'film')} · {formatDuration(stats.filmMinutes)}
          </span>
          <span>
            <span className="mr-1.5 inline-block h-2 w-2 bg-fluo" aria-hidden="true" />
            {plural(stats.series, 'série')} · ≈ {formatDuration(stats.seriesMinutes)}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Pour les séries, toutes les saisons sont comptées.
          {stats.pending > 0 && ` Calcul en cours : encore ${plural(stats.pending, 'titre')}…`}
        </p>
      </div>

      {stats.genres.length > 0 && (
        <Section title="Genres les plus vus" aside="titres">
          <div className="grid gap-2.5">
            {stats.genres.map(([label, count]) => (
              <div key={label} className="grid grid-cols-[7.5em_1fr_2em] items-center gap-2.5 text-sm text-fg">
                <span className="truncate">{label}</span>
                <span className="relative h-3 bg-tint">
                  <span
                    className="absolute inset-y-0 left-0 bg-ink after:absolute after:-right-0.5 after:-top-[3px] after:-bottom-[3px] after:w-[3px] after:bg-fluo"
                    style={{ width: `${(count / maxGenre) * 100}%` }}
                  />
                </span>
                <b className="text-right font-semibold tabular-nums">{count}</b>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Un titre peut compter dans plusieurs genres.</p>
        </Section>
      )}

      {stats.decades.length > 0 && (
        <Section title="Par décennie de sortie" aside="années">
          <div className="grid h-[120px] auto-cols-fr grid-flow-col items-end gap-2 pt-4">
            {stats.decades.map(([decade, count]) => (
              <div key={decade} className="grid h-full content-end justify-items-center gap-1 text-xs">
                <b className="tabular-nums text-fg">{count}</b>
                <span className="block w-full border-t-[3px] border-fluo bg-ink" style={{ height: `${(count / maxDecade) * 80}px` }} />
                <span className="text-muted">{decadeLabel(decade)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Tes notes">
        {stats.averageRating === null ? (
          <p className="text-sm text-muted">Pas encore de note. Ouvre un titre vu pour lui donner des étoiles.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-poster text-4xl tabular-nums text-fg">
                {fr(stats.averageRating)}
                <small className="text-xl">/10</small>
              </span>
              <span className="text-lg tracking-[2px] text-fluo" aria-hidden="true">
                {'★'.repeat(Math.round(stats.averageRating / 2))}
                {'☆'.repeat(5 - Math.round(stats.averageRating / 2))}
              </span>
            </div>
            <p className="text-[13px] text-muted">
              {stats.rated > 1 ? `${stats.rated} titres notés` : `${stats.rated} titre noté`} sur {stats.total} ·{' '}
              {plural(stats.favorites, 'favori')}
            </p>
            <ol className="grid gap-2">
              {stats.topRated.map((entry, i) => (
                <li key={`${entry.mediaType}-${entry.id}`} className="grid grid-cols-[1.6em_1fr_auto] items-baseline gap-2 text-fg">
                  <span className="font-poster text-lg text-fluo">{i + 1}</span>
                  <span className="min-w-0">
                    {entry.title} {entry.year && <span className="text-muted">({entry.year})</span>}
                  </span>
                  <span className="rounded-full border border-line px-2 text-xs font-semibold tabular-nums">{entry.rating}/10</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Section>

      {watchlist.length > 0 && (
        <p className="border-t border-line pt-3 text-[13px] text-muted">
          Ta liste « À voir » représente {formatDuration(stats.watchlistMinutes)} de films et séries.
        </p>
      )}
    </article>
  )
}
