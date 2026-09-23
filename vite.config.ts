/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Engine tests are pure functions; no browser DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
