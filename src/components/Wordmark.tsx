import { CAP_HEIGHT, MOVIE, NIGHT, WORD_GAP } from '../lib/wordmark'

const nightOffset = MOVIE.width + WORD_GAP
const width = nightOffset + NIGHT.width

export default function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${width} ${CAP_HEIGHT}`} className={className} role="img" aria-label="Movie Night">
      {MOVIE.letters.map((letter, i) => (
        <path key={`m${i}`} d={letter.path} transform={`translate(${letter.x} 0)`} fill={`var(--logo-${letter.ink})`} />
      ))}
      {NIGHT.letters.map((letter, i) => (
        <path
          key={`n${i}`}
          d={letter.path}
          transform={`translate(${nightOffset + letter.x} 0)`}
          fill={`var(--logo-${letter.ink})`}
        />
      ))}
    </svg>
  )
}
