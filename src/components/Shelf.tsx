import { useEffect, useState } from 'react'
import { spineStyleFor } from '../lib/spines'
import type { SpineStyle } from '../lib/spines'

interface Props {
  // Titles from the user's library, printed on the decorative spines.
  labels: string[]
  loading: boolean
  picked: { id: number; title: string } | null
}

const HEIGHTS = [104, 118, 96, 112, 124, 100, 116, 108, 122, 98, 114, 106, 120, 102, 110, 126, 100, 112]
const STYLES: SpineStyle[] = [
  'outline', 'ink', 'tint', 'fluo', 'outline', 'over', 'tint', 'ink', 'fluo',
  'outline', 'over', 'tint', 'ink', 'outline', 'fluo', 'tint', 'over', 'ink',
]
// The shelf is clipped on both sides on small screens, so draws only land on the central spines.
const PICKABLE = [6, 7, 8, 9, 10, 11]

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Shelf({ labels, loading, picked }: Props) {
  const [rolling, setRolling] = useState<number | null>(null)

  useEffect(() => {
    if (!loading || prefersReducedMotion()) return
    let step = 0
    const timer = setInterval(() => {
      setRolling(PICKABLE[step % PICKABLE.length])
      step += 1
    }, 110)
    return () => clearInterval(timer)
  }, [loading])

  const rollingIndex = loading ? rolling : null
  const chosen = !loading && picked ? PICKABLE[picked.id % PICKABLE.length] : null

  return (
    <div className="flex h-[150px] items-end justify-center gap-[3px] overflow-hidden border-b-[5px] border-ink" aria-hidden="true">
      {HEIGHTS.map((height, i) => {
        const isChosen = i === chosen
        const lifted = isChosen || i === rollingIndex
        const style = isChosen && picked ? spineStyleFor(picked.id) : STYLES[i]
        const label = isChosen && picked ? picked.title : (labels[i] ?? '')
        return (
          <div
            key={i}
            className={`spine-${style} spine-lift flex w-[26px] shrink-0 items-center justify-center rounded-t-[2px] ${
              lifted ? '-translate-y-5' : ''
            }`}
            style={{ height }}
          >
            <span className="spine-label font-poster text-[10px]">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
