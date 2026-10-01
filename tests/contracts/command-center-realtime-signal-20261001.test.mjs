import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('../../pages/index.html', import.meta.url), 'utf8')

test('Command Center subscribes to the public Supabase invalidation signal', () => {
  assert.match(page, /development_dashboard_signal/)
  assert.match(page, /postgres_changes/)
  assert.match(page, /ugo-command-center-public-signal/)
  assert.match(page, /scheduleRealtimeRefresh/)
})

test('Command Center keeps polling fallback while showing realtime state', () => {
  assert.match(page, /id="realtimeState"/)
  assert.match(page, /setInterval\(loadStatus, 15000\)/)
  assert.match(page, /visibilitychange/)
  assert.match(page, /removeChannel/)
})
