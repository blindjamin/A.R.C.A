import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { iniciarAccesibilidad } from './accesibilidad/preferencias'
import { iniciarPwa } from './pwa/instalacion'

iniciarAccesibilidad()
iniciarPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
