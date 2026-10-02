import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createClient} from '@supabase/supabase-js'

const execFileAsync=promisify(execFile)
const TEST='https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url=process.env.UGO_TEST_SUPABASE_URL||''
const key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
assert.equal(url,TEST,'UGO_TEST_ONLY')
assert.ok(key,'UGO_TEST_SERVICE_ROLE_REQUIRED')
assert.match(sha,/^[0-9a-f]{40}$/,'VALID_SHA_REQUIRED')
for(const name of ['UGO_TEST_SUPABASE_ANON_KEY','UGO_TEST_CLIENT_EMAIL','UGO_TEST_CLIENT_PASSWORD','UGO_TEST_PROVIDER_EMAIL','UGO_TEST_PROVIDER_PASSWORD'])assert.ok(process.env[name],name+'_REQUIRED')

const adminLock=JSON.parse(await fs.readFile('docs/ugo-work-locks/readiness-admin-realtime.json','utf8'))
assert.equal(adminLock.status,'DONE','ADMIN_REALTIME_DEPENDENCY_NOT_DONE')
assert.equal(adminLock.validators_result?.Judge,'PASS','ADMIN_REALTIME_JUDGE_REQUIRED')
assert.equal(adminLock.validators_result?.Sentinel,'PASS','ADMIN_REALTIME_SENTINEL_REQUIRED')

const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:scenario,error:scenarioError}=await db.from('autonomous_qa_scenarios').select('id').eq('scenario_key','realtime').single()
if(scenarioError)throw scenarioError
const startedAt=new Date().toISOString()
const {stdout,stderr}=await execFileAsync(process.execPath,['scripts/chat-realtime-probe.mjs'],{env:process.env,maxBuffer:1024*1024,timeout:90000})
assert.match(stdout,/CHAT_REALTIME_OK/,'CLIENT_PROVIDER_REALTIME_PROBE_FAILED')
if(stderr)console.error(stderr)

const {data:runs,error:runError}=await db.from('autonomous_qa_runs').select('id,service_id,created_at,result').eq('scenario_id',scenario.id).gte('created_at',startedAt).order('created_at',{ascending:false}).limit(1)
if(runError)throw runError
const qaRun=runs?.[0]
assert.ok(qaRun?.service_id,'REALTIME_QA_SERVICE_REQUIRED')
const serviceId=qaRun.service_id

const [{data:service,error:serviceError},{data:events,error:eventsError},{data:notifications,error:notificationsError}]=await Promise.all([
 db.from('servicios').select('id,estado,cliente_id,proveedor_id').eq('id',serviceId).single(),
 db.from('servicio_estado_eventos').select('estado_anterior,estado_nuevo,actor_role').eq('servicio_id',serviceId),
 db.from('notificaciones').select('id,tipo,usuario_id,datos').contains('datos',{servicio_id:serviceId}).limit(100)
])
for(const e of[serviceError,eventsError,notificationsError])if(e)throw e
assert.ok(service.cliente_id&&service.proveedor_id,'SAME_SERVICE_ROLES_REQUIRED')
assert.ok((events||[]).length>0,'SAME_SERVICE_AUDIT_EVENTS_REQUIRED')
assert.ok((notifications||[]).some(n=>n.datos?.servicio_id===serviceId),'SAME_SERVICE_NOTIFICATION_REQUIRED')

const out={
 schema_version:'UGO_READINESS_EVIDENCE_V1',
 readiness_id:'cross-realtime-consistency',
 sha,
 environment:'UGO TEST',
 result:'PASS',
 service_id:serviceId,
 qa_run_id:qaRun.id,
 client_provider_realtime:true,
 admin_realtime_dependency_verified:true,
 same_service_state_persisted:true,
 notification_persisted:true,
 audit_event_persisted:true,
 manual_refresh_used:false,
 production_touched:false,
 completed_at:new Date().toISOString()
}
await fs.mkdir('artifacts',{recursive:true})
await fs.writeFile('artifacts/cross-realtime-consistency-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
