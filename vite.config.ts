import { defineConfig } from 'vite'

// Every runtime must carry a revision so Sentinel can isolate stale incidents.
// Android supplies VITE_APP_REVISION explicitly; Vercel and GitHub expose their
// commit SHA through provider-specific environment variables.
const runtimeRevision =
  process.env.VITE_APP_REVISION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'local'

const devPort = Number(process.env.PORT || 4173)

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_REVISION': JSON.stringify(runtimeRevision),
  },
  build: {
    chunkSizeWarningLimit: 1050,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('maplibre')) return 'vendor-maplibre'
            if (id.includes('@tomtom')) return 'vendor-tomtom'
            if (id.includes('react')) return 'vendor-react'
            return 'vendor'
          }
          if (id.includes('src/mvp/NotificationCenter')) return 'notification-center'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: devPort,
    strictPort: false,
    hmr: {
      host: '127.0.0.1',
      port: devPort,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: devPort,
  },
})
