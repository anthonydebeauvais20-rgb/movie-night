// Geometric capitals drawn as outlines on a 100-unit cap height, so the logo never depends on a web font
// and can be rasterized as-is into the PWA icons.
const GLYPHS: Record<string, { width: number; path: string }> = {
  M: { width: 110, path: 'M0 100V0H24L55 62L86 0H110V100H88V42L62 96H48L22 42V100Z' },
  O: { width: 100, path: 'M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0ZM50 22A28 28 0 1 0 50 78A28 28 0 1 0 50 22Z' },
  V: { width: 100, path: 'M0 0H24L50 70L76 0H100L61 100H39Z' },
  I: { width: 22, path: 'M0 0H22V100H0Z' },
  E: { width: 62, path: 'M0 0H62V20H22V40H56V60H22V80H62V100H0Z' },
  N: { width: 92, path: 'M0 100V0H22L70 64V0H92V100H70L22 36V100Z' },
  G: {
    width: 100,
    path: 'M90.96 21.32A50 50 0 1 0 99.81 54.36L77.89 52.44A28 28 0 1 1 72.94 33.94ZM50 46V64H98V46Z',
  },
  H: { width: 92, path: 'M0 0H22V40H70V0H92V100H70V60H22V100H0Z' },
  T: { width: 84, path: 'M0 0H84V20H53V100H31V20H0Z' },
}

const LETTER_GAP = 10
export const CAP_HEIGHT = 100

export interface PlacedLetter {
  path: string
  x: number
  // Inks alternate letter by letter (1, 2, 3, 1…), counting across words like the Nouvelle Vague title cards.
  ink: 1 | 2 | 3
}

export interface WordLayout {
  letters: PlacedLetter[]
  width: number
}

export function layoutWord(word: string, firstInk = 0): WordLayout {
  let x = 0
  const letters = [...word].map((char, i) => {
    const glyph = GLYPHS[char]
    const placed: PlacedLetter = { path: glyph.path, x, ink: (((firstInk + i) % 3) + 1) as 1 | 2 | 3 }
    x += glyph.width + LETTER_GAP
    return placed
  })
  return { letters, width: x - LETTER_GAP }
}

// "MOVIE NIGHT" on one line; NIGHT continues the ink sequence where MOVIE stopped.
export const WORD_GAP = 36
export const MOVIE = layoutWord('MOVIE')
export const NIGHT = layoutWord('NIGHT', 5)
