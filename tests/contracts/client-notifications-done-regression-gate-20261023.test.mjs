import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clientNotificationsReadinessMode} from '../../scripts/lib/clientNotificationsReadinessMode.mjs'

const lock=JSON.parse(readFileSync(new URL('../../docs/ugo-work-locks/readiness-client-notifications.json',import.meta.url),'utf8'))
const runtime=readFileSync(new URL('../../scripts/client-notifications-runtime.mjs',import.meta.url),'utf8')
const workflow=readFileSync(new URL('../../.github/workflows/client-notifications-runtime.yml',import.meta.url),'utf8')

test('completed client notifications lock allows full regression but no historical lock mutation',()=>{
 assert.equal(lock.status,'DONE')
 assert.equal(clientNotificationsReadinessMode(lock),'DONE')
 assert.match(runtime,/readinessMode=clientNotificationsReadinessMode\(workLock\)/)
 assert.match(runtime,/readiness_mode:readinessMode/)
 assert.match(workflow,/if: github\.event_name != 'pull_request' && env\.UGO_CLIENT_NOTIFICATIONS_LOCK_STATUS == 'IN_PROGRESS'/)
 assert.match(workflow,/clientNotificationsReadinessMode\(lock\)/)
 assert.match(workflow,/node scripts\/client-notifications-runtime\.mjs/)
 assert.match(workflow,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/UGO_TARGET_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
 assert.match(workflow,/node scripts\/client-notifications-judge\.mjs/)
 assert.match(workflow,/node scripts\/client-notifications-sentinel\.mjs/)
 assert.match(workflow,/LOCK_OWNERSHIP_CHANGED/)
 assert.doesNotMatch(runtime,/assert\.equal\(workLock\.status,'IN_PROGRESS'\)/)
})

test('active readiness needs live lease; stale/unknown lock fails closed',()=>{
 const valid={...lock,status:'IN_PROGRESS',lease_expires_at:new Date(Date.now()+60_000).toISOString()}
 assert.equal(clientNotificationsReadinessMode(valid),'IN_PROGRESS')
 assert.throws(()=>clientNotificationsReadinessMode({...valid,lease_expires_at:new Date(Date.now()-60_000).toISOString()}),/ACTIVE_LEASE_REQUIRED/)
 assert.throws(()=>clientNotificationsReadinessMode({...valid,lease_expires_at:null}),/ACTIVE_LEASE_REQUIRED/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,status:'BLOCKED'}),/CLIENT_NOTIFICATIONS_LOCK_STATUS_BLOCKED/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,readiness_id:'wrong'}),/CLIENT_NOTIFICATIONS_LOCK_IDENTITY_INVALID/)
})

test('DONE cannot pass with revoked or unverified evidence',()=>{
 assert.throws(()=>clientNotificationsReadinessMode({...lock,judge:'FAIL'}),/COMPLETED_READINESS_EVIDENCE_INVALID/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,lease_expires_at:new Date().toISOString()}),/COMPLETED_READINESS_EVIDENCE_INVALID/)
 assert.throws(()=>clientNotificationsReadinessMode({...lock,production_touched:true}),/COMPLETED_READINESS_EVIDENCE_INVALID/)
})

const judge=readFileSync(new URL('../../scripts/client-notifications-judge.mjs',import.meta.url),'utf8')
const sentinel=readFileSync(new URL('../../scripts/client-notifications-sentinel.mjs',import.meta.url),'utf8')
const tracking=readFileSync(new URL('../../src/features/client/order/ClientLiveTracking.tsx',import.meta.url),'utf8')
const followup=readFileSync(new URL('../../src/i18n/translations/followup.ts',import.meta.url),'utf8')

test('client notification E2E, Judge and Sentinel use current Spanish timeline without weakening state checks',()=>{
 const expected="['Asignado','Aceptado','En camino','En el lugar','En curso','Finalizado']"
 assert.ok(runtime.includes(expected),'browser E2E must check every exact visible label')
 assert.ok(judge.includes(expected),'independent Judge must validate the same six labels')
 assert.match(sentinel,/for\(const step of proof\.sequence\)assert\.deepEqual\(step\.labels,timelineLabels/)
 assert.match(runtime,/assert\.equal\(persisted,state/)
 assert.match(judge,/assert\.equal\(step\.backend_state,step\.state\)/)
 assert.match(sentinel,/assert\.equal\(proof\.cleanup_ok,true\)/)
 assert.match(tracking,/t\('clientTracking\.'\+step\.key\)/)
 const es=followup.split('  "es": {')[1]?.split('  "en": {')[0]
 assert.ok(es,'Spanish translation catalog required')
 for(const [key,label] of [['assigned','Asignado'],['accepted','Aceptado'],['route','En camino'],['arrived','En el lugar'],['working','En curso'],['finished','Finalizado']]){
  assert.ok(tracking.includes("{key:'"+key+"'}"),'missing tracking stage '+key)
  assert.ok(es.includes('"clientTracking.'+key+'": "'+label+'"'),'mismatched translation '+key)
 }
})
