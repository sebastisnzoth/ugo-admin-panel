import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const history = fs.readFileSync('src/mvp/ServiceHistoryPanel.tsx', 'utf8')

test('ServiceHistoryPanel realtime is filtered by actor to avoid N+1', () => {
  assert.match(history, /realtimeFilter=role==='client'\?`cliente_id=eq\.\$\{userId\}`/)
  assert.match(history, /role==='provider'\?`proveedor_id=eq\.\$\{userId\}`/)
  assert.match(history, /const change=\{.*filter:realtimeFilter/)
  assert.match(history, /channel\(`ugo-history-\$\{role\}-\$\{userId\}-\$\{channelEpoch\}`\)/)
  assert.match(history, /on\('postgres_changes',change,sync\)/)
  assert.match(history, /CHANNEL_ERROR.*TIMED_OUT.*CLOSED/)
})

test('ServiceHistoryPanel load is scoped to owner', () => {
  assert.match(history, /if\(role==='client'\)q=q\.eq\('cliente_id',userId\)/)
  assert.match(history, /if\(role==='provider'\)q=q\.eq\('proveedor_id',userId\)/)
})
