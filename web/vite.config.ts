import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// The engine lives one directory up and is shared with the Expo app.
const engine = fileURLToPath(new URL('../engine/src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@engine': engine } },
  server: { fs: { allow: ['..'] } },
  build: { sourcemap: false },
})
