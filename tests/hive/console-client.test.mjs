import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

// El cliente de la consola es TypeScript de la app; aquí se ejecuta tal cual con el
// eliminador de tipos de Node para comprobar que valida de verdad lo que recibe.
const probe = spawnSync(process.execPath, ['--experimental-strip-types', 'tests/hive/fixtures/console-client-probe.mjs'], {
  encoding: 'utf8',
  timeout: 60000,
})

test('el cliente de la consola se ejecuta y devuelve resultados', () => {
  assert.equal(probe.status, 0, probe.stderr.slice(0, 2000))
  const payload = JSON.parse(probe.stdout.trim().split('\n').pop())
  assert.ok(Array.isArray(payload.results))
  assert.equal(payload.results.length, 19)
  const failed = payload.results.filter(result => !result.ok)
  assert.deepEqual(failed, [], JSON.stringify(failed))
})

test('sin endpoint configurado la consola no pide datos a nadie', async () => {
  const source = await import('node:fs').then(fs => fs.readFileSync('src/mvp/HiveConsole.tsx', 'utf8'))
  assert.match(source, /if\(!HIVE_CONSOLE_ENDPOINT\)return/)
  assert.match(source, /HIVE_CONSOLE_ENDPOINT/)
  assert.doesNotMatch(source, /setInterval|fakeData|mockMetrics/)
})
