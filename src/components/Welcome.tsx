import { useState } from 'react'
import { primaryButtonClass } from '../lib/ui'

// Per device, like the theme: someone opening the app on a new phone gets the explanation again.
const INTRO_KEY = 'movienight:introDismissed'

function introDismissed(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return false
  }
}

const STEPS: [string, string][] = [
  ['Tes envies.', 'Genre, langue, période, durée… Tout est facultatif.'],
  ['Tire au sort.', 'Le rideau s’ouvre sur un film ou une série dispo sur tes plateformes (à choisir dans Réglages).'],
  ['Range-le.', '« Vu », « À voir » ou « Favori » : ce que tu as vu ne te sera plus proposé.'],
]

export default function Welcome() {
  const [showIntro, setShowIntro] = useState(() => !introDismissed())

  function dismiss() {
    setShowIntro(false)
    try {
      localStorage.setItem(INTRO_KEY, '1')
    } catch {
      // Private browsing: the explanation will simply come back next time.
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-poster text-[26px] leading-tight text-fg [text-wrap:balance]">Qu’est-ce qu’on se regarde ce soir&nbsp;?</h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted">
          Choisis tes envies, ou rien du tout, et laisse le hasard choisir le film ou la série.
        </p>
      </div>

      {showIntro && (
        <section className="grid gap-3 rounded-sm border border-line bg-paper p-4" aria-labelledby="welcome-title">
          <h3 id="welcome-title" className="font-poster text-xl text-fg">
            Bienvenue dans la salle
          </h3>
          <ol className="grid gap-2.5">
            {STEPS.map(([lead, text], i) => (
              <li key={lead} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-2.5 text-sm text-fg">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-line font-poster text-fluo" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <b className="font-semibold">{lead}</b> {text}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span>Un compte, facultatif, garde ta bibliothèque sur tous tes appareils.</span>
            <button type="button" onClick={dismiss} className={primaryButtonClass}>
              C’est parti
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
