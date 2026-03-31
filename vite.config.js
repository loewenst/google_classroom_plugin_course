/**
 * vite.config.js
 * Vite build configuration. Uses loadEnv to read BASE_PATH for GitHub Pages deployment.
 * Sets base path dynamically so assets resolve correctly on both localhost and gh-pages.
 */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: env.BASE_PATH || '/',
  }
})
