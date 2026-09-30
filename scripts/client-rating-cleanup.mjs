import assert from'node:assert/strict'
import{readFile,writeFile,mkdir}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co')
assert.match(sha,/^[a-f0-9]{40}$/)
const fixture=JSON.parse(await readFile('artifacts/client-rating-fixture.json','utf8'))
assert.equal(fixture.sha,sha)
const ids=fixture.ids||{}
const db=createClient(url,process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
if(ids.rating)await db.from('resenas').delete().eq('id',ids.rating)
if(ids.service)await db.from('servicios').delete().eq('id',ids.service)
for(const id of [ids.client,ids.provider].filter(Boolean)){
 await db.from('usuarios').delete().eq('id',id)
 await db.auth.admin.deleteUser(id)
}
let clean=true
for(const [table,id] of [['resenas',ids.rating],['servicios',ids.service],['usuarios',ids.client],['usuarios',ids.provider]]){
 if(!id)continue
 const q=await db.from(table).select('id').eq('id',id);if(q.error||q.data.length)clean=false
}
assert.ok(clean,'Fixture cleanup must leave no database rows')
const out={readiness_id:'client-rating',sha,result:'PASS',cleanup_ok:true,checked_at:new Date().toISOString()}
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/client-rating-cleanup.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
