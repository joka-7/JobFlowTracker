import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png',
        'pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png',
      ],
      manifest: {
        id: '/',
        name: 'JobFlow Tracker',
        short_name: 'JobFlow',
        description: 'Track your job applications and tasks',
        theme_color: '#3b82f6',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'NetworkFirst',
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'node_modules/**',
        'e2e/**',
        'dist/**',
        'src/__tests__/**',
        '**/*.config.js',
        'scripts/**',
      ],
      // Floor set ~2 points below the current baseline (53/42/41/57) — a
      // regression gate, not a target. The original floors had fallen far
      // behind the real numbers and no longer gated anything. Only files some
      // test imports are counted, so a new test that loads a large, mostly
      // untested module (firebase.js) lowers the total. Most of the remaining
      // gap is UI-heavy files (TasksApp.jsx, CalendarView.jsx, several modals)
      // that need real component tests; raise these as that work lands.
      thresholds: {
        statements: 51,
        branches: 40,
        functions: 39,
        lines: 55,
      },
    },
  },
})
