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
 assert.match(workflow,/if: env\.UGO_CLIENT_NOTIFICATIONS_LOCK_STATUS == 'IN_PROGRESS'/)
 assert.match(workflow,/clientNotificationsReadinessMode\(lock\)/)
 assert.match(workflow,/node scripts\/client-notifications-runtime\.mjs/)
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
