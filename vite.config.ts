import { defineConfig } from 'vite'

// Every runtime must carry a revision so Sentinel can isolate stale incidents.
// Android supplies VITE_APP_REVISION explicitly; Vercel and GitHub expose their
// commit SHA through provider-specific environment variables.
const runtimeRevision =
  process.env.VITE_APP_REVISION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'local'

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_REVISION': JSON.stringify(runtimeRevision),
  },
})
