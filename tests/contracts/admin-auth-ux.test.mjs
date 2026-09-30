import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('admin auth exposes loading, recovery and error semantics', async () => {
  const gate = await read('src/mvp/AdminGate.tsx')
  assert.match(gate, /role="status" aria-live="polite"/)
  assert.match(gate, /role="alert"/)
  assert.match(gate, /No pudimos validar tu sesión de administrador/)
  assert.match(gate, /inputMode="email"/)
  assert.match(gate, /invalid_credentials/)
  assert.match(gate, /Usuario\/email o contraseña incorrectos/)
  assert.match(gate, /Demasiados intentos seguidos/)
  assert.match(gate, /catch\(err:unknown\)\{setError\(adminAuthErrorMessage\(err\)\)\}/)
})

test('admin feature shell keeps the operational panel mounted during migration', async () => {
  const shell = await read('src/features/admin/screens/AdminShell.tsx')
  assert.match(shell, /AdminPhase2/)
  assert.match(shell, /return <AdminPhase2\/>/)
  assert.doesNotMatch(shell, /módulos operativos se migran/)
})


test('superadmin command center reuses the mounted admin session and still verifies active superadmin role', async () => {
  const center = await read('src/mvp/SuperAdminCommandCenter.tsx')
  assert.match(center, /supabase\.auth\.getSession\(\)/)
  assert.match(center, /from\('usuarios'\)\.select\('tipo,activo'\)/)
  assert.match(center, /profile\?\.tipo!=='superadmin'/)
  const initialLoad = center.slice(center.indexOf('const load=async()=>'), center.indexOf('setAuthorized(true)') + 'setAuthorized(true)'.length)
  assert.doesNotMatch(initialLoad, /supabase\.auth\.getUser\(\)/)
})
