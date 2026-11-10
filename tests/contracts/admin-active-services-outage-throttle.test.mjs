import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('admin service polling backs off when the TEST Data API is degraded',async()=>{
 const s=await readFile(new URL('../../src/hooks/useAdminActiveServices.ts',import.meta.url),'utf8')
 assert.match(s,/const POLL_MS=60_000/)
 assert.match(s,/const MIN_SILENT_REFRESH_MS=30_000/)
 assert.match(s,/const DEGRADED_RETRY_MS=90_000/)
 assert.match(s,/now<retryAfter\.current\|\|now-lastAttemptAt\.current<MIN_SILENT_REFRESH_MS/)
 assert.match(s,/if\(queryError\|\|providerError\)retryAfter\.current=Date\.now\(\)\+DEGRADED_RETRY_MS/)
 assert.match(s,/catch\(loadError\)/)
 assert.match(s,/if\(!reconnectTimer\)reconnectTimer=window\.setTimeout/)
 assert.match(s,/if\(reconnectTimer\)window\.clearTimeout\(reconnectTimer\)/)
 assert.doesNotMatch(s,/const POLL_MS=8000/)
 assert.doesNotMatch(s,/setChannelEpoch\(value=>value\+1\)\},1500/)
})
