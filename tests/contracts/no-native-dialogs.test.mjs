import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Hallazgo S-03 (auditoría 2026-10-09): los diálogos nativos window.confirm /
// window.prompt / window.alert bloquean el event loop, no respetan el tema UGO
// y exponen flujos sensibles (pagos, contraseñas, kill switches) a diálogos del
// navegador. Toda confirmación/prompt/alert debe usar el sistema de diálogos
// propio (src/mvp/dialogs.tsx → useDialog). Este contrato lo blinda de regresión.

const SRC = path.resolve('src')
const NATIVE = /window\.(confirm|prompt|alert)\(/
// Llamada bare a confirm/prompt/alert que NO sea del sistema de diálogos
// (se excluyen las llamadas legitimas `await confirm(...)` / `void prompt(...)`
// y los métodos `.confirm(`/`.prompt(`/`.alert(`).
const BARE = /(?<![a-zA-Z0-9_.])(?<!await )(?<!void )(confirm|prompt|alert)\(/

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

const files = walk(SRC).filter(f => !f.endsWith(path.join('mvp', 'dialogs.tsx')))

test('src/ has no native browser dialogs outside the dialog system', () => {
  assert.ok(files.length > 100, 'expected to scan the whole src/ tree')
  const offenders = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    if (NATIVE.test(source) || BARE.test(source)) offenders.push(path.relative(SRC, file))
  }
  assert.deepEqual(offenders, [], `native dialogs found in: ${offenders.join(', ')}`)
})

test('dialog system module is the single provider of confirm/prompt/alert', () => {
  const dialogs = fs.readFileSync(path.join(SRC, 'mvp', 'dialogs.tsx'), 'utf8')
  assert.match(dialogs, /export function useDialog\(/)
  assert.match(dialogs, /<Modal /)
  assert.match(dialogs, /ugo-dialog/)
  const shared = fs.readFileSync(path.join(SRC, 'mvp', 'shared.tsx'), 'utf8')
  assert.match(shared, /role="dialog"/)
  assert.match(shared, /ugo-ds-modal/)
})
