import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The app icon is already a full velvet-green tile: opaque icons (maskable, iOS) keep it edge to edge on the same color.
const velvetBackground = { fit: 'contain' as const, background: '#0e4d3c' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // favicon.ico comes from favicon.svg, a simplified mark drawn to stay legible at 16–48 px.
    transparent: { ...minimal2023Preset.transparent, favicons: [] },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: velvetBackground },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: velvetBackground },
  },
  images: ['public/app-icon.svg'],
})
