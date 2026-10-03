import type { ArtDirection, ThemePreference } from '../types'

const PAPER: Record<ArtDirection, { light: string; dark: string }> = {
  rayon: { light: '#fafaf7', dark: '#171b3a' },
  nuit: { light: '#e9f0f2', dark: '#0b1e26' },
  palace: { light: '#e8efea', dark: '#0a231c' },
}

export function applyAppearance(theme: ThemePreference, direction: ArtDirection): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  if (direction === 'rayon') delete root.dataset.direction
  else root.dataset.direction = direction

  // Keep the browser chrome (address bar, status bar) on the same ground as the page.
  const paper = PAPER[direction]
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const followsDark = meta.media.includes('dark')
    meta.content = theme === 'system' ? paper[followsDark ? 'dark' : 'light'] : paper[theme]
  })
}
