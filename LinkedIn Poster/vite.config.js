import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        // Don't intercept API routes - let them go to the server
        navigateFallbackDenylist: [/^\/auth/, /^\/api/, /^\/debug/, /^\/tokens/, /^\/generate/, /^\/post/, /^\/schedule/]
      },
      manifest: {
        name: 'LinkedIn Poster',
        short_name: 'LinkPoster',
        description: 'AI-powered LinkedIn post generator and scheduler',
        theme_color: '#e11d48',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Create Post',
            short_name: 'Create',
            description: 'Generate a new LinkedIn post',
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'View History',
            short_name: 'History',
            description: 'Check your previous posts',
            url: '/history',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      }
    })

  ],
})

