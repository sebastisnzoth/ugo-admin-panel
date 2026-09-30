import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const proof=JSON.parse(await fs.readFile('artifacts/client-notifications-runtime.json','utf8'))
assert.equal(proof.readiness_id,'client-notifications')
assert.equal(proof.task_id,'readiness-client-notifications')
assert.equal(proof.environment,'UGO TEST')
assert.equal(proof.production_touched,false)
assert.equal(proof.sha,sha,'same-SHA runtime evidence required')
assert.equal(proof.result,'PASS')
assert.equal(proof.fixture,'disposable')
assert.ok(['deleted','cancelled'].includes(proof.cleanup?.mode),'safe fixture cleanup mode required')
assert.equal(proof.cleanup_ok,true,'Disposable TEST fixture must be cleaned up')
assert.deepEqual(proof.page_errors,[])
const expected=['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado']
assert.deepEqual(proof.sequence.map(x=>x.state),expected)
for(const step of proof.sequence){
 assert.equal(step.result,'PASS')
 assert.equal(step.backend_state,step.state)
 assert.equal(step.ui_state,step.state)
 assert.equal(typeof step.service_id,'string')
 assert.equal(step.service_id,proof.service_id)
 assert.deepEqual(step.labels,['Asignado','Aceptado','En camino','Llegó','Trabajando','Finalizado'])
}
const out={validator:'Judge',result:'PASS',readiness_id:'client-notifications',sha,service_id:proof.service_id,checked_at:new Date().toISOString()}


assert.equal(proof.channel,'web-realtime')
assert.equal(proof.notifications.length,6)
for(const n of proof.notifications){assert.equal(n.service_id,proof.service_id);assert.equal(n.foreign_read_count,0);assert.ok(n.banner_text.includes(n.title));assert.ok(n.id)}
await fs.writeFile('artifacts/client-notifications-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
