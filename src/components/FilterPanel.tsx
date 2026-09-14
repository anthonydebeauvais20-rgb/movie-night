import type { Filters } from '../types'

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  genreCatalog: string[]
}

const CURRENT_YEAR = new Date().getFullYear()

export default function FilterPanel({ filters, onChange, genreCatalog }: Props) {
  function toggleGenre(label: string) {
    const genreLabels = filters.genreLabels.includes(label)
      ? filters.genreLabels.filter((g) => g !== label)
      : [...filters.genreLabels, label]
    onChange({ ...filters, genreLabels })
  }

  const hasPersonQuery = filters.personQuery.trim().length > 0

  return (
    <div className="space-y-5 rounded-lg border border-cream/10 bg-panel p-5">
      <div>
        <p className="mb-2 font-display text-sm uppercase tracking-wide text-sand">Type</p>
        <div className="flex gap-2">
          {(['both', 'movie', 'tv'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ ...filters, mediaType: type })}
              className={`rounded-full px-3 py-1 text-sm transition ${
                filters.mediaType === type ? 'bg-gold text-night' : 'bg-panel-2 text-sand hover:text-cream'
              }`}
            >
              {type === 'both' ? 'Films & séries' : type === 'movie' ? 'Films' : 'Séries'}
            </button>
          ))}
        </div>
      </div>

      {genreCatalog.length > 0 && (
        <div>
          <p className="mb-2 font-display text-sm uppercase tracking-wide text-sand">Genres</p>
          <div className="flex flex-wrap gap-2">
            {genreCatalog.map((label) => (
              <button
                key={label}
                onClick={() => toggleGenre(label)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  filters.genreLabels.includes(label) ? 'bg-gold text-night' : 'bg-panel-2 text-sand hover:text-cream'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm text-sand">
        Acteur ou réalisateur
        <input
          type="text"
          value={filters.personQuery}
          onChange={(e) => onChange({ ...filters, personQuery: e.target.value })}
          placeholder="Ex. Marion Cotillard, Bong Joon-ho…"
          className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none placeholder:text-sand/50 focus:border-gold"
        />
        {hasPersonQuery && (
          <span className="mt-1 block text-xs text-sand/70">
            Cible toute la filmographie de cette personne. Les filtres plateformes (Réglages) et durée ne s'appliquent pas
            dans ce mode (non fournis par l'API pour une recherche par personne).
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm text-sand">
          Année min.
          <input
            type="number"
            value={filters.yearMin}
            min={1900}
            max={filters.yearMax}
            onChange={(e) => onChange({ ...filters, yearMin: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold"
          />
        </label>
        <label className="text-sm text-sand">
          Année max.
          <input
            type="number"
            value={filters.yearMax}
            min={filters.yearMin}
            max={CURRENT_YEAR}
            onChange={(e) => onChange({ ...filters, yearMax: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold"
          />
        </label>
      </div>

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
            className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold"
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
            className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold"
          />
        </label>
      </div>

      <label className="block text-sm text-sand">
        Note minimum TMDB : {filters.minRating.toFixed(1)}
        <input
          type="range"
          min={0}
          max={9}
          step={0.5}
          value={filters.minRating}
          onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
          className="mt-1 w-full accent-gold"
        />
      </label>

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
  )
}
