import type { ThemePreference } from '../types'

const GROUND = { light: '#e8efea', dark: '#0a231c' }

export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme

  // Keep the browser chrome (address bar, status bar) on the same ground as the page.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const followsDark = meta.media.includes('dark')
    meta.content = theme === 'system' ? GROUND[followsDark ? 'dark' : 'light'] : GROUND[theme]
  })
}
