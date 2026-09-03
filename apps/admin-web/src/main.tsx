import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Estilos de Leaflet. Van acá y no en index.css: el @import de PostCSS no
// resuelve paquetes de node_modules y rompe el CSS global del panel entero.
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
