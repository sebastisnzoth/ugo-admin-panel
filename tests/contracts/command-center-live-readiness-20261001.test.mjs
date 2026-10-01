import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page=await readFile(new URL('../../pages/index.html',import.meta.url),'utf8')

test('Command Center renders live readiness from sanitized Supabase public views',()=>{
 assert.match(page,/development_checklist_public/)
 assert.match(page,/development_incidents_public/)
 assert.match(page,/liveReadinessState/)
 assert.match(page,/liveP0Open/)
 assert.match(page,/liveSentinelCurrent/)
})

test('Realtime invalidation refreshes both static evidence and live operational truth',()=>{
 assert.match(page,/Promise\.allSettled\(\[revalidate\(\),loadLiveReadiness\(\)\]\)/)
 assert.match(page,/loadLiveReadiness\(\)\n    commandRealtimeChannel/)
 assert.match(page,/currentRevision = String\(mainHeadSha \|\| statusSnapshot\?\.source_sha/)
})
