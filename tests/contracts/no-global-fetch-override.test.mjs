import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

test('DemoSebastianPaymentBridge is gated and does not silently hijack fetch in prod', () => {
  const bridge = fs.readFileSync('src/features/client/payments/DemoSebastianPaymentBridge.tsx', 'utf8')
  // Must be guarded by environment + URL flag, not always-on
  assert.match(bridge, /UGO_ENVIRONMENT/, 'must be TEST-only')
  assert.match(bridge, /['"]test['"]/, 'must reference test env')
  // Must check demo intent (demo prop or ?demo) before installing interceptor
  assert.match(bridge, /demo/, 'must reference demo flag')
  // Original fetch must be restored on unmount
  assert.match(bridge, /window\.fetch\s*=\s*original/)
  assert.match(bridge, /return\s*\(\s*\)\s*=>/)
})

test('only two modules may patch window.fetch (bridge + apiRuntime)', () => {
  const files = walk('src')
  const offenders = []
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    if (src.includes('window.fetch=') || src.includes('window.fetch =')) {
      offenders.push(path.relative('src', file))
    }
  }
  // apiRuntime and DemoSebastianPaymentBridge are the only legitimate owners
  offenders.sort()
  assert.deepEqual(offenders, ['features/client/payments/DemoSebastianPaymentBridge.tsx', 'lib/apiRuntime.ts'],
    `unexpected window.fetch patch in: ${offenders.join(', ')}`)
})

test('MvpApp mounts ClientRoot with demo={false} (no interception in production path)', () => {
  const mvp = fs.readFileSync('src/mvp/MvpApp.tsx', 'utf8')
  assert.match(mvp, /<ClientRoot demo=\{false\}/)
  assert.doesNotMatch(mvp, /<ClientRoot demo=\{true\}/)
})

test('apiRuntime rewrite is scoped to /api/ only (does not hijack other fetches)', () => {
  const rt = fs.readFileSync('src/lib/apiRuntime.ts', 'utf8')
  assert.match(rt, /startsWith\('\/api\/'\)/)
  assert.match(rt, /API_BASE/)
})
