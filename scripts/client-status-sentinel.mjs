import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const sha=process.env.UGO_RUNTIME_SHA||''
const proof=JSON.parse(await fs.readFile('artifacts/client-status-runtime.json','utf8'))
const tracking=await fs.readFile('src/features/client/order/ClientLiveTracking.tsx','utf8')
const detail=await fs.readFile('src/features/client/order/ClientServiceDetail.tsx','utf8')
assert.equal(proof.sha,sha)
assert.equal(proof.production_touched,false)
assert.equal(proof.restored,true)
assert.match(tracking,/eq\('id',serviceId\)\.in\('estado',DETAIL_TRACKING_STATES\)/)
for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])assert.ok(tracking.includes("'"+state+"'"),'missing tracked state '+state)
for(const label of ['Asignado','Aceptado','En camino','Llegó','Trabajando','Finalizado'])assert.ok(tracking.includes("label:'"+label+"'"),'missing timeline label '+label)
assert.match(detail,/ClientLiveTracking serviceId=\{service\.id\} embedded/)
assert.equal(proof.sequence.length,6)
const out={validator:'Sentinel',result:'PASS',readiness_id:'client-status',sha,service_id:proof.service_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-status-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
