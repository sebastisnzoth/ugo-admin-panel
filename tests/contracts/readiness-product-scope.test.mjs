import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
import{evaluateFunctionalReadiness}from'../../scripts/ugo-readiness-engine.mjs'

const readiness=JSON.parse(await readFile(new URL('../../docs/UGO_FUNCTIONAL_READINESS.json',import.meta.url),'utf8'))
const deferredIds=new Set([
 'hugo-presence','hugo-intent','hugo-action','hugo-continuity','hugo-voice','hugo-responsive',
 'hugo-gemini-live-core','hugo-client-order-by-voice','hugo-provider-actions','hugo-admin-actions','hugo-real-runtime-proof',
])

test('Hugo product surfaces are explicitly deferred, never falsely verified',()=>{
 const items=readiness.groups.flatMap(group=>group.items)
 for(const id of deferredIds){
  const item=items.find(entry=>entry.id===id)
  assert.ok(item,id+' missing')
  assert.equal(item.status,'DEFERRED_BY_PRODUCT_DECISION')
  assert.equal(item.product_scope,'DEFERRED')
  assert.match(item.deferred_reason,/retirado del alcance de lanzamiento actual/)
 }
})

test('core marketplace lifecycle no longer depends on deferred Hugo runtime',()=>{
 const lifecycle=readiness.groups.flatMap(group=>group.items).find(item=>item.id==='client-provider-lifecycle')
 assert.ok(lifecycle)
 assert.doesNotMatch(JSON.stringify(lifecycle.depends_on),/hugo-real-runtime-proof/)
})

test('readiness engine excludes product-deferred controls without calling them verified',()=>{
 const {readiness:evaluated,summary}=evaluateFunctionalReadiness({functionalReadiness:readiness,locks:[],pullRequests:[],now:new Date('2026-10-02T23:59:59Z')})
 const items=evaluated.groups.flatMap(group=>group.items)
 assert.equal(summary.deferred_by_product,deferredIds.size)
 assert.equal(summary.remaining_total,7)
 assert.equal(summary.remaining_autonomous,0)
 assert.equal(items.filter(item=>item.gate_state==='DEFERRED_BY_PRODUCT_DECISION').length,deferredIds.size)
 assert.equal(items.filter(item=>item.status==='DEFERRED_BY_PRODUCT_DECISION'&&item.gate_state==='VERIFIED').length,0)
})

test('remaining launch debt is physical or human-only after Hugo deferral',()=>{
 const {readiness:evaluated}=evaluateFunctionalReadiness({functionalReadiness:readiness,locks:[],pullRequests:[],now:new Date('2026-10-02T23:59:59Z')})
 const remaining=evaluated.groups.flatMap(group=>group.items).filter(item=>item.status!=='VERIFIED'&&item.status!=='DEFERRED_BY_PRODUCT_DECISION')
 assert.deepEqual(new Set(remaining.map(item=>item.id)),new Set([
  'provider-gps','provider-arrival','provider-evidence','final-gps','final-two-devices','final-customer','provider-realtime-location'
 ]))
 assert.ok(remaining.every(item=>item.declared_status==='HUMAN_FINAL'||item.status==='HUMAN_REQUIRED'))
})
