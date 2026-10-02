import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {evaluateFunctionalReadiness} from './ugo-readiness-engine.mjs'

const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
assert.match(sha,/^[0-9a-f]{40}$/,'VALID_SHA_REQUIRED')
const readiness=JSON.parse(await fs.readFile('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const lockDir='docs/ugo-work-locks'
const names=await fs.readdir(lockDir)
const locks=[]
for(const name of names){
 if(!/^readiness-.*\.json$/.test(name))continue
 try{locks.push(JSON.parse(await fs.readFile(path.join(lockDir,name),'utf8')))}catch{}
}
const {readiness:evaluated,summary}=evaluateFunctionalReadiness({
 functionalReadiness:readiness,
 locks,
 maxParallel:Number(readiness.execution_policy?.max_parallel||5),
 now:new Date()
})
const items=evaluated.groups.flatMap(group=>group.items)
const finalId='end-to-end-command-center-gate'
const scoped=items.filter(item=>item.id!==finalId)
const autonomousOpen=scoped.filter(item=>
 item.status!=='VERIFIED' &&
 item.status!=='HUMAN_REQUIRED' &&
 item.declared_status!=='HUMAN_FINAL'
)
const invalidRemaining=scoped.filter(item=>
 item.status!=='VERIFIED' &&
 item.gate_state!=='HUMAN_REQUIRED' &&
 item.gate_state!=='HUMAN_DEFERRED'
)
assert.equal(autonomousOpen.length,0,'AUTONOMOUS_CONTROLS_REMAIN:'+autonomousOpen.map(x=>x.id).join(','))
assert.equal(invalidRemaining.length,0,'INVALID_REMAINING_CONTROLS:'+invalidRemaining.map(x=>x.id+':'+x.gate_state).join(','))

const humans=scoped.filter(item=>item.gate_state==='HUMAN_REQUIRED'||item.gate_state==='HUMAN_DEFERRED')
for(const item of humans){
 assert.ok(item.real_test_required===true||item.declared_status==='HUMAN_FINAL'||item.status==='HUMAN_REQUIRED','HUMAN_CLASSIFICATION_NOT_JUSTIFIED:'+item.id)
}
const criticalVerified=['client-request','client-payment','provider-offers','cross-p0','cross-regression','client-provider-lifecycle','cross-realtime-consistency','cross-errors-recovery']
for(const id of criticalVerified){
 const item=items.find(x=>x.id===id)
 assert.equal(item?.status,'VERIFIED','CRITICAL_AUTOMATED_CONTROL_NOT_VERIFIED:'+id)
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
 totals:{total:items.length,verified:scoped.filter(x=>x.status==='VERIFIED').length,human_required:humans.length,autonomous_remaining:autonomousOpen.length,invalid_remaining:invalidRemaining.length},
 human_required_ids:humans.map(x=>x.id),
 critical_verified_ids:criticalVerified,
 command_center_truthful:true,
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/end-to-end-command-center-gate-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
