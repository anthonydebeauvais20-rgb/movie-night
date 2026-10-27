import { useState } from 'react'
import { primaryButtonClass } from '../lib/ui'

// Per device, like the theme: someone opening the app on a new phone gets the explanation again.
const INTRO_KEY = 'movienight:introDismissed'
const TAGLINE_KEY = 'movienight:lastTagline'

// A draw of its own: one of these opens the draw tab, a different one from the previous opening.
const TAGLINES: [title: string, line: string][] = [
  ['Silence, ça tire !', 'Donne tes envies, ou rien du tout : le hasard choisit le film ou la série du soir.'],
  ['Fini les heures à hésiter devant le catalogue.', 'Un tirage, un film ou une série, et la soirée peut commencer.'],
  ['Trop de choix ? On choisit pour toi.', 'Tes envies en quelques clics, le hasard fait le reste.'],
  ['Qu’est-ce qu’on regarde ce soir ?', 'Choisis tes envies, ou laisse faire le hasard.'],
]

function pickTagline(): [string, string] {
  let last = -1
  try {
    last = Number(localStorage.getItem(TAGLINE_KEY) ?? -1)
  } catch {
    // No storage: any tagline will do.
  }
  const choices = TAGLINES.map((_, i) => i).filter((i) => i !== last)
  const index = choices[Math.floor(Math.random() * choices.length)]
  try {
    localStorage.setItem(TAGLINE_KEY, String(index))
  } catch {
    // Same as above.
  }
  return TAGLINES[index]
}

// Picked once per opening of the app, so it doesn't change when coming back to the draw tab.
const TAGLINE = pickTagline()

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
        <h2 className="font-poster text-[26px] leading-tight text-fg [text-wrap:balance]">{TAGLINE[0]}</h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted">{TAGLINE[1]}</p>
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
