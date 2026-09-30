/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site from /Shuffle/, and preview matches it. The dev server stays at /.
  base: command === 'serve' && !isPreview ? '/' : '/Shuffle/',
  plugins: [react()],
  test: {
    // Engine tests are pure functions; no browser DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
