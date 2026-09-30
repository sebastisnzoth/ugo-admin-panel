import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co')
assert.match(sha,/^[a-f0-9]{40}$/)
const runtime=JSON.parse(await readFile('artifacts/client-rating-runtime.json','utf8'))
const judge=JSON.parse(await readFile('artifacts/client-rating-judge.json','utf8'))
const cleanup=JSON.parse(await readFile('artifacts/client-rating-cleanup.json','utf8'))
for(const item of[runtime,judge,cleanup]){assert.equal(item.sha,sha);assert.equal(item.result,'PASS')}
assert.equal(runtime.production_touched,false);assert.equal(runtime.exactly_once,true);assert.equal(runtime.completed_only,true);assert.equal(cleanup.cleanup_ok,true)
const db=createClient(url,process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
for(const [table,id] of [['resenas',runtime.fixture.rating],['servicios',runtime.fixture.service],['usuarios',runtime.fixture.client],['usuarios',runtime.fixture.provider]]){
 const q=await db.from(table).select('id').eq('id',id);assert.ifError(q.error);assert.equal(q.data.length,0,'No lingering '+table+' fixture')
}
const out={validator:'Sentinel',readiness_id:'client-rating',sha,result:'PASS',environment:'UGO TEST',production_touched:false,fixtures:'verified absent',checked_at:new Date().toISOString()}
await writeFile('artifacts/client-rating-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
