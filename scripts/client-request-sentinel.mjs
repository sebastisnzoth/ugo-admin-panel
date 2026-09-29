import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-request-runtime.json','utf8'))
const post=await fs.readFile('src/features/client/request/ClientPostConfirmFlow.tsx','utf8')
const location=await fs.readFile('src/features/client/request/ClientLocationScreen.tsx','utf8')
const dispatch=await fs.readFile('src/lib/dispatch/supabaseDispatch.ts','utf8')
for(const token of ['categoryId','description','address','when','paymentMethod','request_draft_id'])assert.ok(post.includes(token),'request persistence contract missing '+token)
assert.ok(post.includes("eq('metadata->>request_draft_id',requestDraftId)"),'idempotent request recovery missing')
assert.ok(location.includes('savePickup'),'pickup draft persistence missing')
assert.ok(dispatch.includes("rpc('guardar_ubicacion_servicio_cliente'"),'service pickup RPC missing')
assert.ok(dispatch.indexOf('await persistPickup')<dispatch.indexOf("rpc('iniciar_matching'"),'pickup must persist before matching')
assert.equal(p.sha,sha)
assert.equal(p.result,'PASS')
assert.ok(p.service_id)
assert.ok(p.backend.ubicacion_cliente)
assert.deepEqual(p.page_errors,[])
const out={validator:'Sentinel',result:'PASS',sha,readiness_id:p.readiness_id,service_id:p.service_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-request-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
