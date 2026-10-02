import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
const e=JSON.parse(await readFile('artifacts/provider-notifications-runtime.json','utf8'))
const judge=JSON.parse(await readFile('artifacts/provider-notifications-judge.json','utf8'))
assert.equal(e.environment,'UGO TEST');assert.equal(e.production_touched,false);assert.equal(e.result,'PASS')
assert.equal(judge.sha,e.sha);assert.equal(judge.result,'PASS')
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.ok(key)
const ids=e.persisted_entities
assert.ok(ids?.service_id&&ids?.provider_id&&ids?.client_id)
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
for(const [table,column,values] of [
 ['servicios','id',[ids.service_id]],['pagos','servicio_id',[ids.service_id]],['ofertas_servicio','servicio_id',[ids.service_id]],
 ['notificaciones','usuario_id',[ids.provider_id,ids.client_id]],['usuarios','id',[ids.provider_id,ids.client_id]],
 ['perfiles_proveedor','usuario_id',[ids.provider_id,ids.client_id]],
]){
 const {data,error}=await db.from(table).select(column).in(column,values)
 if(error)throw error
 assert.equal(data.length,0,table+'_FIXTURE_NOT_REMOVED')
}
for(const id of [ids.provider_id,ids.client_id]){
 const {data,error}=await db.auth.admin.getUserById(id)
 assert.ok(!data?.user&&error?.status===404,'AUTH_FIXTURE_NOT_REMOVED')
}
const out={validator:'Sentinel',readiness_id:'provider-notifications',sha:e.sha,result:'PASS',source:'INDEPENDENT_DB_AND_AUTH_READS',production_touched:false,fixtures:'REMOVAL_VERIFIED',checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-notifications-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
