import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
assert.match(sha,/^[0-9a-f]{40}$/,'VALID_SHA_REQUIRED')
const readiness=JSON.parse(await fs.readFile('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const items=readiness.groups.flatMap(group=>group.items)
const finalId='end-to-end-command-center-gate'
const scoped=items.filter(item=>item.id!==finalId)

async function canonicalLock(id){
 try{return JSON.parse(await fs.readFile(path.join('docs/ugo-work-locks','readiness-'+id+'.json'),'utf8'))}
 catch{return null}
}

const autonomousOpen=scoped.filter(item=>item.real_test_required!==true&&item.status!=='VERIFIED')
assert.equal(autonomousOpen.length,0,'AUTONOMOUS_CONTROLS_REMAIN:'+autonomousOpen.map(x=>x.id).join(','))

const humans=scoped.filter(item=>item.real_test_required===true&&item.status!=='VERIFIED')
const invalidHumans=[]
for(const item of humans){
 const lock=await canonicalLock(item.id)
 const justified=item.status==='HUMAN_FINAL'||lock?.status==='HUMAN_REQUIRED'||lock?.human_final?.required===true||lock?.human_final_required?.required===true
 if(!justified)invalidHumans.push(item.id)
}
assert.equal(invalidHumans.length,0,'HUMAN_CLASSIFICATION_NOT_JUSTIFIED:'+invalidHumans.join(','))

const criticalVerified=['client-request','client-payment','provider-offers','cross-p0','cross-regression','client-provider-lifecycle','cross-realtime-consistency','cross-errors-recovery']
for(const id of criticalVerified){
 const item=items.find(x=>x.id===id)
 assert.equal(item?.status,'VERIFIED','CRITICAL_AUTOMATED_CONTROL_NOT_VERIFIED:'+id)
 const lock=await canonicalLock(id)
 if(lock){
  const doneVerified=lock.status==='DONE'
    && lock.validators_result?.Judge==='PASS'
    && lock.validators_result?.Sentinel==='PASS'
  const automatedScopeVerified=lock.status==='HUMAN_REQUIRED'
    && lock.automated_closure?.runtime==='PASS'
    && lock.automated_closure?.judge==='PASS'
    && lock.automated_closure?.sentinel==='PASS'
    && lock.human_final_required?.required===true
  assert.equal(doneVerified||automatedScopeVerified,true,'CRITICAL_LOCK_AUTOMATED_SCOPE_NOT_VERIFIED:'+id)
  assert.ok((lock.evidence_ids||[]).length>0,'CRITICAL_EVIDENCE_MISSING:'+id)
 }
}

const out={
 schema_version:'UGO_READINESS_EVIDENCE_V1',
 readiness_id:finalId,
 sha,
 environment:'REPOSITORY + UGO TEST EVIDENCE',
 result:'PASS',
 autonomous_scope_complete:true,
 launch_authorized:false,
 production_touched:false,
 totals:{total:items.length,verified:scoped.filter(x=>x.status==='VERIFIED').length,human_required:humans.length,autonomous_remaining:autonomousOpen.length,invalid_remaining:invalidHumans.length},
 human_required_ids:humans.map(x=>x.id),
 critical_verified_ids:criticalVerified,
 command_center_truthful:true,
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/end-to-end-command-center-gate-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
