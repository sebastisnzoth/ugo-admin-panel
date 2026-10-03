import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
const e=JSON.parse(await readFile('artifacts/provider-alerts-runtime.json','utf8'))
const judge=JSON.parse(await readFile('artifacts/provider-alerts-judge.json','utf8'))
assert.equal(e.environment,'UGO TEST');assert.equal(e.production_touched,false);assert.equal(e.result,'PASS')
assert.equal(judge.sha,e.sha);assert.equal(judge.result,'PASS')
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.ok(key)
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
for(const [table,column] of [['notificaciones','usuario_id'],['perfiles_proveedor','usuario_id'],['usuarios','id']]){
 const {data,error}=await db.from(table).select(column).eq(column,e.provider_id)
 if(error)throw error
 assert.equal(data.length,0,table+'_FIXTURE_NOT_REMOVED')
}
const {data,error}=await db.auth.admin.getUserById(e.provider_id)
assert.ok(!data?.user&&error?.status===404,'AUTH_FIXTURE_NOT_REMOVED')
const out={validator:'Sentinel',readiness_id:'provider-alerts',sha:e.sha,result:'PASS',source:'INDEPENDENT_DB_AND_AUTH_READS',production_touched:false,fixtures:'REMOVAL_VERIFIED',checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-alerts-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
