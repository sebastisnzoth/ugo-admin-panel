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
})
