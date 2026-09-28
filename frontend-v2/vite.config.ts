import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// frontend-v2 is a fully separate app from ../frontend. It runs on its own
// port and talks to the SAME existing FastAPI backend (api/main.py, port
// 8040) through a dev proxy, so no backend CORS changes are needed -- the
// browser only ever sees requests to this dev server's own origin, which
// forwards them to the API server-side.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8040',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
