import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Expone el servidor a la red local (0.0.0.0) para probar en celulares
    host: true,
    // Permite acceder al dev server via tunel ngrok (host publico != localhost)
    allowedHosts: true,
    proxy: {
      // Reenvia las llamadas a la API al backend local, para que frontend
      // y backend queden detras de un unico origen (necesario para ngrok
      // con un solo dominio fijo).
      '/api': {
        // API_PROXY_TARGET: por si Windows reserva el 3000 (rango de Hyper-V).
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        // ws: el socket del chat vive en /api/socket.io
        ws: true,
      },
    },
  },
})
