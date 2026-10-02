import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The app icon is already a full night-blue tile: opaque icons (maskable, iOS) keep it edge to edge on the same color.
const nightBackground = { fit: 'contain' as const, background: '#171b3a' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // favicon.ico comes from favicon.svg (the "MN" mark): the stacked app icon is unreadable at 48 px.
    transparent: { ...minimal2023Preset.transparent, favicons: [] },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: nightBackground },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: nightBackground },
  },
  images: ['public/app-icon.svg'],
})
