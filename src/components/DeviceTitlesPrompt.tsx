import { useState } from 'react'
import { primaryButtonClass, secondaryButtonClass } from '../lib/ui'

interface Props {
  count: number
  onChoose: (keep: boolean) => Promise<void>
}

// First sign-in on a device that already has titles: they may belong to someone else using this browser.
export default function DeviceTitlesPrompt({ count, onChoose }: Props) {
  const [busy, setBusy] = useState(false)

  async function choose(keep: boolean) {
    setBusy(true)
    await onChoose(keep)
    setBusy(false)
  }

  return (
    <section className="mb-6 rounded-sm border border-line bg-paper p-4" aria-live="polite">
      <h2 className="font-wide text-base font-bold text-fg">
        {count} titre{count > 1 ? 's' : ''} sur cet appareil
      </h2>
      <p className="mt-1 text-sm text-fg">
        Cet appareil a déjà une bibliothèque (titres vus, à voir ou écartés). Tu veux l’ajouter à ton compte ? Pour un titre
        déjà présent dans ton compte, c’est la version du compte qui est gardée.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(true)} disabled={busy} className={primaryButtonClass}>
          Ajouter à mon compte
        </button>
        <button type="button" onClick={() => choose(false)} disabled={busy} className={secondaryButtonClass}>
          Non, l’effacer de cet appareil
        </button>
      </div>
    </section>
  )
}
