import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const migration=fs.readFileSync(new URL('../../supabase/migrations/20260916006000_sentinel_provider_availability_classification.sql',import.meta.url),'utf8')

test('confirmed provider availability failures classify as MATCH-ONLINE server-side',()=>{
 assert.match(migration,/p_action in \('client\.request\.matching','client\.provider_radar\.sync','provider\.availability'\) then 'MATCH-ONLINE'/)
})

test('unverified provider availability recovery is not promoted into readiness classification',()=>{
 assert.doesNotMatch(migration,/provider\.availability\.recovery[^\n]*MATCH-ONLINE/)
})

test('Sentinel classification remains incident-only and never updates readiness checklist',()=>{
 assert.match(migration,/insert into public\.development_incidents/)
 assert.doesNotMatch(migration,/update\s+public\.development_checklist/i)
 assert.doesNotMatch(migration,/insert\s+into\s+public\.development_checklist/i)
})
