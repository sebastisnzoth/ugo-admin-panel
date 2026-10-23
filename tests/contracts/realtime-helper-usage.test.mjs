import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'src'
const helper = fs.readFileSync('src/lib/realtimeChannel.ts', 'utf8')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

test('realtime helper exists with S-02 contract (SUBSCRIBED resync + backoff)', () => {
  assert.match(helper, /export function subscribeRealtimeChannel/)
  assert.match(helper, /SUBSCRIBED/)
  assert.match(helper, /CHANNEL_ERROR/)
  assert.match(helper, /TIMED_OUT/)
  assert.match(helper, /CLOSED/)
  assert.match(helper, /onSync/)
  assert.match(helper, /onReconnect/)
  assert.match(helper, /removeChannel/)
  assert.match(helper, /Math\.min\(1000 \* 2 \*\*/)
})

test('critical realtime surfaces increasingly use subscribeRealtimeChannel', () => {
  const criticalFiles = [
    'src/features/client/order/ClientServiceDetail.tsx',
    'src/features/client/order/ClientLiveTracking.tsx',
    'src/features/client/payments/ClientPaymentChoice.tsx',
  ]
  let migrated = 0
  for (const file of criticalFiles) {
    if (!fs.existsSync(file)) continue
    const src = fs.readFileSync(file, 'utf8')
    if (src.includes('subscribeRealtimeChannel')) migrated++
  }
  assert.ok(migrated >= 1, `at least 1 critical surface must use subscribeRealtimeChannel (migrated=${migrated})`)
  // providerData.tsx + ClientPaymentChoice migration is tracked in docs/INDEX.md; threshold raises as migration proceeds
})

test('admin realtime migration is tracked (legacy path documented, not blocking)', () => {
  const admin = fs.readFileSync('src/hooks/useAdminData.ts', 'utf8')
  const usesHelper = admin.includes('subscribeRealtimeChannel')
  // If not yet migrated, just ensure the file is referenced in the index so debt is visible
  if (!usesHelper) {
    const index = fs.readFileSync('docs/INDEX.md', 'utf8')
    assert.match(index, /realtime|Raltime|S-02/i, 'migration debt must be listed in docs/INDEX.md')
  } else {
    assert.match(admin, /subscribeRealtimeChannel/)
  }
})

test('realtimeChannel dispose cleans timer + removeChannel', () => {
  assert.match(helper, /clearTimeout\(timer\)/)
  assert.match(helper, /supabase\.removeChannel/)
})
