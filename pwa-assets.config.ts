import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Maskable and iOS icons are opaque squares: fill them with the brand's night color instead of the default white.
const nightBackground = { fit: 'contain' as const, background: '#100d12' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: nightBackground },
    apple: { ...minimal2023Preset.apple, resizeOptions: nightBackground },
  },
  images: ['public/favicon.svg'],
})
