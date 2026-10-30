import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')

test('Neon TEST login is isolated from the existing UGO app', () => {
  const main = read('src/main.tsx')
  assert.match(main, /neon-test-login/)
  assert.match(main, /NeonTestLogin/)
  assert.match(main, /MvpApp/)
})

test('Neon TEST profile restoration requires a JWT and matching identity', () => {
  const ui = read('src/mvp/NeonTestLogin.tsx')
  const identity = read('src/lib/neonAuthIdentity.ts')
  assert.match(ui, /set-auth-jwt/)
  assert.match(ui, /resolveNeonUgoProfile/)
  assert.match(ui, /neonTestDataRequest/)
  assert.match(identity, /profile\.id !== identity\.id/)
  assert.match(identity, /return null/)
})

test('Neon signup only creates client profiles; self-read requires JWT ownership', () => {
  const migration = read('db/neon/migrations/000010_neon_auth_client_profile.sql')
  assert.match(migration, /'cliente'::public\.usuario_tipo/)
  assert.match(migration, /AFTER INSERT ON neon_auth\."user"/)
  assert.match(migration, /id = \(SELECT auth\.user_id\(\)::uuid\)/)
  assert.doesNotMatch(migration, /CREATE POLICY[^\n]*FOR UPDATE/i)
})

test('existing production endpoint remains untouched', () => {
  const project = read('src/lib/supabaseProject.ts')
  assert.match(project, /UGO_ENVIRONMENT = 'test'/)
  assert.doesNotMatch(project, /trfsjuseqjxlhrxuvdsm/)
})
