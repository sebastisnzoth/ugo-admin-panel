import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('rideshare flags exist, default to off and are never enabled in production', async () => {
  const src = await read('src/lib/featureFlags.ts')
  assert.match(src, /clientRideshareFlow/)
  assert.match(src, /providerRideshareFlow/)
  assert.match(src, /MODE === 'production'/)
  assert.match(src, /return false/)
  assert.match(src, /parseFlagValue\(env\[ENV_KEYS\[flag\]\]\)/)
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
