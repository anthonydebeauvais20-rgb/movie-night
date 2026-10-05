import { useState } from 'react'
import {
  getApiKey,
  getMyProviders,
  getRegion,
  getThemePreference,
  setApiKey,
  setMyProviders,
  setRegion,
  setThemePreference,
} from '../lib/storage'
import { applyTheme } from '../lib/theme'
import { providerLogoUrl } from '../lib/tmdb'
import { chipClass, inputClass, primaryButtonClass } from '../lib/ui'
import type { ThemePreference, WatchProvider } from '../types'

interface Props {
  onSaved: () => void
  providers?: WatchProvider[]
}

const THEME_OPTIONS: [ThemePreference, string][] = [
  ['system', 'Automatique'],
  ['light', 'Clair'],
  ['dark', 'Sombre'],
]

export default function SettingsPanel({ onSaved, providers = [] }: Props) {
  const [key, setKey] = useState(getApiKey())
  const [region, setRegionState] = useState(getRegion())
  const [myProviders, setMyProvidersState] = useState<number[]>(getMyProviders())
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference())

  function handleSave() {
    setApiKey(key)
    setRegion(region)
    setMyProviders(myProviders)
    onSaved()
  }

  function toggleMyProvider(id: number) {
    setMyProvidersState((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  // The theme applies and saves right away, independently of the Save button.
  function changeTheme(next: ThemePreference) {
    setTheme(next)
    setThemePreference(next)
    applyTheme(next)
  }

  return (
    <div className="mx-auto max-w-lg rounded-sm border border-line bg-paper p-6">
      <h2 className="font-poster text-2xl text-fg">Configuration</h2>
      <p className="mt-2 text-sm text-muted">
        L'app utilise TMDB (The Movie Database) pour les infos films/séries. Crée une clé API gratuite sur{' '}
        <a
          href="https://www.themoviedb.org/settings/api"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-fg underline decoration-fluo decoration-2 underline-offset-4"
        >
          themoviedb.org
        </a>{' '}
        puis colle-la ci-dessous. Elle reste stockée uniquement sur cet appareil.
      </p>

      <label className="mt-5 block text-sm font-semibold text-fg">
        Clé API TMDB
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Colle ta clé API v3 ici"
          className={`${inputClass} font-normal`}
        />
      </label>

      <label className="mt-4 block text-sm font-semibold text-fg">
        Pays (disponibilité des plateformes de streaming)
        <select value={region} onChange={(e) => setRegionState(e.target.value)} className={`${inputClass} font-normal`}>
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
          <p className="text-sm font-semibold text-fg">Tes plateformes d'abonnement</p>
          <p className="mt-0.5 text-xs text-muted">
            Sélectionne ce à quoi tu es abonné·e : le tirage ne proposera que des titres disponibles sur ces plateformes.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.provider_id}
                onClick={() => toggleMyProvider(p.provider_id)}
                title={p.provider_name}
                aria-pressed={myProviders.includes(p.provider_id)}
                type="button"
                className={`overflow-hidden rounded-md border-2 transition ${
                  myProviders.includes(p.provider_id)
                    ? 'border-line'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={providerLogoUrl(p.logo_path)} alt={p.provider_name} className="h-9 w-9" />
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={!key.trim()} className={`${primaryButtonClass} mt-6 w-full`}>
        Enregistrer
      </button>

      <div className="mt-6 border-t border-line/25 pt-5">
        <p className="text-sm font-semibold text-fg">Apparence</p>
        <p className="mt-0.5 text-xs text-muted">« Automatique » suit le réglage clair ou sombre de ton appareil.</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Apparence">
          {THEME_OPTIONS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => changeTheme(value)} aria-pressed={theme === value} className={chipClass(theme === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
