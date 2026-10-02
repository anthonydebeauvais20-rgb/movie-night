import type { ReactNode } from 'react'
import { genreLabelsFor } from '../lib/tmdb'
import type { Filters, GenreMatch, Recency } from '../types'

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

const CURRENT_YEAR = new Date().getFullYear()

const RECENCY_OPTIONS: [Recency, string][] = [
  ['any', 'Peu importe'],
  ['7d', '7 derniers jours'],
  ['30d', '30 derniers jours'],
  ['90d', '3 derniers mois'],
]

const MATCH_OPTIONS: [GenreMatch, string][] = [
  ['any', 'Au moins un'],
  ['all', 'Tous à la fois'],
]

const inputClass =
  'mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold'

const chipClass = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm transition ${active ? 'bg-gold text-night' : 'bg-panel-2 text-sand hover:text-cream'}`

// A collapsible row whose summary always shows what is currently applied, so closed filters stay readable.
function Section({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  return (
    <details className="group border-t border-cream/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="w-24 shrink-0 font-display text-lg font-semibold tracking-wide text-cream">{title}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-sand">{summary}</span>
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 shrink-0 text-sand transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M2 4.5 6 8.5 10 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="space-y-4 px-5 pb-5">{children}</div>
    </details>
  )
}

export default function FilterPanel({ filters, onChange }: Props) {
  const genreLabels = genreLabelsFor(filters.mediaType)
  const hasGenreSelection = filters.genreInclude.length + filters.genreExclude.length > 0
  const hasPersonQuery = filters.personQuery.trim().length > 0
  const isRecent = filters.recent !== 'any'

  function changeMediaType(mediaType: Filters['mediaType']) {
    const available = genreLabelsFor(mediaType)
    onChange({
      ...filters,
      mediaType,
      genreInclude: filters.genreInclude.filter((label) => available.includes(label)),
      genreExclude: filters.genreExclude.filter((label) => available.includes(label)),
    })
  }

  // Tap cycles a genre: neutral -> wanted -> blocked -> neutral.
  function cycleGenre(label: string) {
    const without = (list: string[]) => list.filter((g) => g !== label)
    if (filters.genreInclude.includes(label)) {
      onChange({ ...filters, genreInclude: without(filters.genreInclude), genreExclude: [...filters.genreExclude, label] })
    } else if (filters.genreExclude.includes(label)) {
      onChange({ ...filters, genreExclude: without(filters.genreExclude) })
    } else {
      onChange({ ...filters, genreInclude: [...filters.genreInclude, label] })
    }
  }

  const genreSummary = hasGenreSelection ? (
    <>
      {filters.genreInclude.length > 0 && <span className="text-gold">{filters.genreInclude.join(', ')}</span>}
      {filters.genreExclude.length > 0 && (
        <span className={filters.genreInclude.length > 0 ? 'ml-2' : ''}>sans {filters.genreExclude.join(', ')}</span>
      )}
    </>
  ) : (
    'Tous les genres'
  )

  const periodSummary = isRecent
    ? RECENCY_OPTIONS.find(([value]) => value === filters.recent)?.[1]
    : `${filters.yearMin} à ${filters.yearMax}`

  const durationSummary = hasPersonQuery
    ? 'durée ignorée'
    : filters.durationMin > 0 || filters.durationMax < 240
      ? `${filters.durationMin} à ${filters.durationMax} min`
      : 'toutes durées'
  const ratingSummary = isRecent
    ? 'note ignorée'
    : filters.minRating > 0
      ? `note min. ${filters.minRating.toFixed(1)}`
      : 'toutes notes'

  return (
    <div className="overflow-hidden rounded-lg border border-cream/10 bg-panel">
      <div className="flex gap-2 p-5">
        {(['both', 'movie', 'tv'] as const).map((type) => (
          <button key={type} onClick={() => changeMediaType(type)} className={chipClass(filters.mediaType === type)}>
            {type === 'both' ? 'Films & séries' : type === 'movie' ? 'Films' : 'Séries'}
          </button>
        ))}
      </div>

      <Section title="Genres" summary={genreSummary}>
        <div className="flex flex-wrap gap-2">
          {genreLabels.map((label) => {
            const state = filters.genreInclude.includes(label)
              ? 'souhaité'
              : filters.genreExclude.includes(label)
                ? 'exclu'
                : 'indifférent'
            return (
              <button
                key={label}
                onClick={() => cycleGenre(label)}
                aria-label={`${label} : ${state}`}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  state === 'souhaité'
                    ? 'bg-gold text-night'
                    : state === 'exclu'
                      ? 'bg-burgundy/30 text-cream line-through ring-1 ring-burgundy/60'
                      : 'bg-panel-2 text-sand hover:text-cream'
                }`}
              >
                {state === 'souhaité' && '+ '}
                {state === 'exclu' && '✕ '}
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-sand/70">Touche un genre pour le souhaiter, touche encore pour l'exclure.</p>
          {hasGenreSelection && (
            <button
              onClick={() => onChange({ ...filters, genreInclude: [], genreExclude: [] })}
              className="shrink-0 text-xs text-gold hover:text-cream"
            >
              Tout effacer
            </button>
          )}
        </div>
        {filters.genreInclude.length >= 2 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-sand">
            <span>Le film doit avoir :</span>
            {MATCH_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => onChange({ ...filters, genreMatch: value })}
                className={chipClass(filters.genreMatch === value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </Section>

      <div className="border-t border-cream/10 px-5 py-4">
        <label className="block text-sm text-sand">
          Acteur ou réalisateur
          <input
            type="text"
            value={filters.personQuery}
            onChange={(e) => onChange({ ...filters, personQuery: e.target.value })}
            placeholder="Ex. Marion Cotillard, Bong Joon-ho…"
            className={`${inputClass} placeholder:text-sand/50`}
          />
          {hasPersonQuery && (
            <span className="mt-1 block text-xs text-sand/70">
              Cible toute la filmographie de cette personne. Les filtres plateformes (Réglages) et durée ne s'appliquent
              pas dans ce mode (non fournis par l'API pour une recherche par personne).
            </span>
          )}
        </label>
      </div>

      <Section title="Période" summary={periodSummary}>
        <div className="flex flex-wrap gap-2">
          {RECENCY_OPTIONS.map(([value, label]) => (
            <button key={value} onClick={() => onChange({ ...filters, recent: value })} className={chipClass(filters.recent === value)}>
              {label}
            </button>
          ))}
        </div>
        {isRecent && (
          <p className="text-xs text-sand/70">
            Année et note minimum ignorées (les titres récents ont trop peu de votes). Pour les séries, seules les nouvelles
            séries sont proposées.
          </p>
        )}
        <div className={`grid grid-cols-2 gap-4 ${isRecent ? 'opacity-40' : ''}`}>
          <label className="text-sm text-sand">
            Année min.
            <input
              type="number"
              value={filters.yearMin}
              min={1900}
              max={filters.yearMax}
              disabled={isRecent}
              onChange={(e) => onChange({ ...filters, yearMin: Number(e.target.value) })}
              className={inputClass}
            />
          </label>
          <label className="text-sm text-sand">
            Année max.
            <input
              type="number"
              value={filters.yearMax}
              min={filters.yearMin}
              max={CURRENT_YEAR}
              disabled={isRecent}
              onChange={(e) => onChange({ ...filters, yearMax: Number(e.target.value) })}
              className={inputClass}
            />
          </label>
        </div>
      </Section>

      <Section title="Durée et note" summary={`${durationSummary}, ${ratingSummary}`}>
        <div className={`grid grid-cols-2 gap-4 ${hasPersonQuery ? 'opacity-40' : ''}`}>
          <label className="text-sm text-sand">
            Durée min. (min)
            <input
              type="number"
              value={filters.durationMin}
              min={0}
              max={filters.durationMax}
              step={5}
              disabled={hasPersonQuery}
              onChange={(e) => onChange({ ...filters, durationMin: Number(e.target.value) })}
              className={inputClass}
            />
          </label>
          <label className="text-sm text-sand">
            Durée max. (min)
            <input
              type="number"
              value={filters.durationMax}
              min={filters.durationMin}
              max={240}
              step={5}
              disabled={hasPersonQuery}
              onChange={(e) => onChange({ ...filters, durationMax: Number(e.target.value) })}
              className={inputClass}
            />
          </label>
        </div>
        <label className={`block text-sm text-sand ${isRecent ? 'opacity-40' : ''}`}>
          Note minimum TMDB : {filters.minRating.toFixed(1)}
          <input
            type="range"
            min={0}
            max={9}
            step={0.5}
            value={filters.minRating}
            disabled={isRecent}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            className="mt-1 w-full accent-gold"
          />
        </label>
      </Section>

      <div className="border-t border-cream/10 px-5 py-4">
        <label className="flex items-center gap-2 text-sm text-sand">
          <input
            type="checkbox"
            checked={filters.includeSeen}
            onChange={(e) => onChange({ ...filters, includeSeen: e.target.checked })}
            className="h-4 w-4 accent-gold"
          />
          Inclure les films/séries déjà vus (pour en revoir un)
        </label>
      </div>
    </div>
  )
}
