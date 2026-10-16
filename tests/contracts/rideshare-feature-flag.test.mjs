import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('rideshare flags exist, default to off and are never enabled in production', async () => {
  const src = await read('src/lib/featureFlags.ts')
  assert.match(src, /clientRideshareFlow/)
  assert.match(src, /providerRideshareFlow/)
  assert.match(src, /env\.MODE === 'production'/)
  assert.match(src, /env\.PROD === true && env\.MODE !== 'demo'/)
  assert.match(src, /return false/)
  assert.match(src, /parseFlagValue\(env\[ENV_KEYS\[flag\]\]\)/)
})

test('optimized demo builds can explicitly enable the flag without enabling production', async () => {
  const src = await read('src/lib/featureFlags.ts')
  // Vite sets PROD=true for optimized builds, including --mode demo.
  // Production stays fail-closed; only the dedicated demo mode is exempt.
  assert.match(src, /env\.PROD === true && env\.MODE !== 'demo'/)
  assert.match(src, /env\.MODE === 'production'/)
  assert.match(src, /VITE_FLAG_CLIENT_RIDESHARE_FLOW/)
})

test('rideshare flags are documented as off in .env.example', async () => {
  const env = await read('.env.example')
  assert.match(env, /VITE_FLAG_CLIENT_RIDESHARE_FLOW=false/)
  assert.match(env, /VITE_FLAG_PROVIDER_RIDESHARE_FLOW=false/)
})

test('design preview is not mounted in the production app shell', async () => {
  const main = await read('src/main.tsx')
  assert.doesNotMatch(main, /design-preview/)
  assert.doesNotMatch(main, /RealFlowDemo|AllRolesPreview/)
})

test('client flow v2 route is mounted only behind the rideshare flag', async () => {
  const router = await read('src/app/router.ts')
  const mvp = await read('src/mvp/MvpApp.tsx')
  assert.match(router, /client-flow-v2/)
  assert.match(mvp, /isRideshareFlagEnabled\('clientRideshareFlow'\)/)
  assert.match(mvp, /route==='client-flow-v2'/)
  // la ruta existente del cliente sigue intacta
  assert.match(mvp, /route==='client'\)return <ClientApp\/>/)
})
