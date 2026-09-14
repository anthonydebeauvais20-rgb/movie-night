import type { Filters, Genre, WatchProvider } from '../types'
import { providerLogoUrl } from '../lib/tmdb'

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
  genres: Genre[]
  providers: WatchProvider[]
  myProviders: number[]
}

const CURRENT_YEAR = new Date().getFullYear()

export default function FilterPanel({ filters, onChange, genres, providers, myProviders }: Props) {
  function toggleGenre(id: number) {
    const genreIds = filters.genreIds.includes(id)
      ? filters.genreIds.filter((g) => g !== id)
      : [...filters.genreIds, id]
    onChange({ ...filters, genreIds })
  }

  function toggleProvider(id: number) {
    const providerIds = filters.providerIds.includes(id)
      ? filters.providerIds.filter((p) => p !== id)
      : [...filters.providerIds, id]
    onChange({ ...filters, providerIds })
  }

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

      {genres.length > 0 && (
        <div>
          <p className="mb-2 font-display text-sm uppercase tracking-wide text-sand">Genres</p>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  filters.genreIds.includes(g.id) ? 'bg-gold text-night' : 'bg-panel-2 text-sand hover:text-cream'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {providers.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-sm uppercase tracking-wide text-sand">Plateformes</p>
            {myProviders.length > 0 && (
              <button
                onClick={() => onChange({ ...filters, providerIds: myProviders })}
                className="text-xs text-gold hover:text-cream"
              >
                Utiliser mes plateformes
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.provider_id}
                onClick={() => toggleProvider(p.provider_id)}
                title={p.provider_name}
                className={`overflow-hidden rounded-md border-2 transition ${
                  filters.providerIds.includes(p.provider_id)
                    ? 'border-gold'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={providerLogoUrl(p.logo_path)} alt={p.provider_name} className="h-9 w-9" />
              </button>
            ))}
          </div>
        </div>
      )}

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
