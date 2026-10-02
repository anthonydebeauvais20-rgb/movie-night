import type { ThemePreference } from '../types'

const PAPER = { light: '#fafaf7', dark: '#171b3a' }

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme

  // Keep the browser chrome (address bar, status bar) on the same paper as the page.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const followsDark = meta.media.includes('dark')
    meta.content = theme === 'system' ? PAPER[followsDark ? 'dark' : 'light'] : PAPER[theme]
  })
}
