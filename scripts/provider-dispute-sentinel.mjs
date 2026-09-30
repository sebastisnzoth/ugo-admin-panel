import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL,sha=process.env.UGO_RUNTIME_SHA
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.match(sha||'',/^[a-f0-9]{40}$/)
const e=JSON.parse(await readFile('artifacts/provider-dispute-runtime.json','utf8'))
const judge=JSON.parse(await readFile('artifacts/provider-dispute-judge.json','utf8'))
const cleanup=JSON.parse(await readFile('artifacts/provider-dispute-cleanup.json','utf8'))
for(const result of [e,judge,cleanup]){assert.equal(result.sha,sha);assert.equal(result.result,'PASS')}
const db=createClient(url,process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
for(const [table,id] of [['servicios',e.fixture.service],['disputas',e.fixture.dispute],...['client','provider','admin'].map(k=>['usuarios',e.fixture[k]])]){
 const q=await db.from(table).select('id').eq('id',id);assert.ifError(q.error);assert.equal(q.data.length,0,'No lingering fixture '+table)
}
for(const id of [e.fixture.client,e.fixture.provider,e.fixture.admin]){
 const q=await db.auth.admin.getUserById(id);assert.ok(q.error&&q.error.status===404,'No lingering auth fixture')
}
const storage=await db.storage.from('dispute-evidence').list(e.fixture.service+'/'+e.fixture.provider);assert.ifError(storage.error);assert.equal(storage.data.length,0,'No lingering Storage fixture')
const out={validator:'Sentinel',readiness_id:'provider-dispute',sha,result:'PASS',environment:'UGO TEST',fixtures:'verified absent via database and auth',checked_at:new Date().toISOString()}
await writeFile('artifacts/provider-dispute-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
