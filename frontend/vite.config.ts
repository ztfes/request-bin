import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The repo lives on the Windows filesystem while the dev server usually runs
    // under WSL, and inotify events don't cross that mount — without polling the
    // server never notices an edit, so the browser keeps running stale modules.
    watch: { usePolling: true, interval: 1000 },
  },
})
