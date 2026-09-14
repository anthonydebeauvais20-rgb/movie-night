import { useState } from 'react'
import { getApiKey, getMyProviders, getRegion, setApiKey, setMyProviders, setRegion } from '../lib/storage'
import { providerLogoUrl } from '../lib/tmdb'
import type { WatchProvider } from '../types'

interface Props {
  onSaved: () => void
  providers?: WatchProvider[]
}

export default function SettingsPanel({ onSaved, providers = [] }: Props) {
  const [key, setKey] = useState(getApiKey())
  const [region, setRegionState] = useState(getRegion())
  const [myProviders, setMyProvidersState] = useState<number[]>(getMyProviders())

  function handleSave() {
    setApiKey(key)
    setRegion(region)
    setMyProviders(myProviders)
    onSaved()
  }

  function toggleMyProvider(id: number) {
    setMyProvidersState((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-cream/10 bg-panel p-6">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-cream">Configuration</h2>
      <p className="mt-1 text-sm text-sand">
        L'app utilise TMDB (The Movie Database) pour les infos films/séries. Crée une clé API
        gratuite sur{' '}
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noreferrer"
          className="text-gold underline"
        >
          themoviedb.org
        </a>{' '}
        puis colle-la ci-dessous. Elle reste stockée uniquement sur cet appareil.
      </p>

      <label className="mt-4 block text-sm text-sand">
        Clé API TMDB
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Colle ta clé API v3 ici"
          className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold"
        />
      </label>

      <label className="mt-4 block text-sm text-sand">
        Pays (disponibilité des plateformes de streaming)
        <select
          value={region}
          onChange={(e) => setRegionState(e.target.value)}
          className="mt-1 w-full rounded-md border border-cream/10 bg-panel-2 px-3 py-2 text-cream outline-none focus:border-gold"
        >
          <option value="FR">France</option>
          <option value="BE">Belgique</option>
          <option value="CH">Suisse</option>
          <option value="CA">Canada</option>
          <option value="US">États-Unis</option>
          <option value="GB">Royaume-Uni</option>
        </select>
      </label>

      {providers.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-sand">Tes plateformes d'abonnement</p>
          <p className="mt-0.5 text-xs text-sand/60">
            Sélectionne ce à quoi tu es abonné·e : le filtre "Plateformes" du tirage sera pré-rempli avec ce choix.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.provider_id}
                onClick={() => toggleMyProvider(p.provider_id)}
                title={p.provider_name}
                type="button"
                className={`overflow-hidden rounded-md border-2 transition ${
                  myProviders.includes(p.provider_id) ? 'border-gold' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={providerLogoUrl(p.logo_path)} alt={p.provider_name} className="h-9 w-9" />
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!key.trim()}
        className="mt-5 w-full rounded-md bg-gold py-2 font-display font-bold uppercase tracking-wide text-night transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Enregistrer
      </button>
    </div>
  )
}
