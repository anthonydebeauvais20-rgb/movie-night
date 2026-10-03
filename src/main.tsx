import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getArtDirection, getThemePreference } from './lib/storage'
import { applyAppearance } from './lib/theme'

applyAppearance(getThemePreference(), getArtDirection())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
