import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL,sha=process.env.UGO_RUNTIME_SHA
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.match(sha||'',/^[a-f0-9]{40}$/)
let fixture
try{fixture=JSON.parse(await readFile('artifacts/client-dispute-fixture.json','utf8'))}catch(error){if(error.code==='ENOENT'){console.log('No fixture created');process.exit(0)}throw error}
assert.equal(fixture.sha,sha);const ids=fixture.ids
const db=createClient(url,process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const failures=[];const collect=q=>{if(q.error)failures.push({code:q.error.code||'CLEANUP_ERROR',message:q.error.message})}
for(const id of [ids.client,ids.provider,ids.admin].filter(Boolean)){
 const q=await db.auth.admin.getUserById(id);if(q.error){if(q.error.status===404)continue;throw q.error}
 assert.match(q.data.user.email||'',new RegExp('^ugo-(cliente|proveedor|admin)-client-dispute-'+sha.slice(0,8)+'-[0-9]+@example\\.test$'))
}
if(ids.service){const q=await db.from('servicios').select('metadata').eq('id',ids.service).maybeSingle();assert.ifError(q.error);if(q.data){assert.equal(q.data.metadata?.sha,sha);assert.equal(q.data.metadata?.ephemeral,true)}}
if(ids.storage_paths?.length){for(const path of ids.storage_paths)assert.ok(path.startsWith(ids.service+'/'+ids.client+'/'));collect(await db.storage.from('dispute-evidence').remove(ids.storage_paths))}
if(ids.dispute){collect(await db.from('disputa_mensajes').delete().eq('disputa_id',ids.dispute));collect(await db.from('audit_log').delete().eq('entidad_tipo','disputa').eq('entidad_id',ids.dispute));collect(await db.from('disputas').delete().eq('id',ids.dispute))}
if(ids.service){collect(await db.from('pagos').delete().eq('servicio_id',ids.service));collect(await db.from('notificaciones').delete().contains('datos',{servicio_id:ids.service}));collect(await db.from('servicios').delete().eq('id',ids.service))}
for(const id of [ids.client,ids.provider,ids.admin].filter(Boolean)){collect(await db.from('notificaciones').delete().eq('usuario_id',id));collect(await db.from('perfiles_proveedor').delete().eq('usuario_id',id));collect(await db.from('usuarios').delete().eq('id',id));const q=await db.auth.admin.deleteUser(id);if(q.error&&q.error.status!==404)collect(q)}
await writeFile('artifacts/client-dispute-cleanup.json',JSON.stringify({sha,result:failures.length?'FAIL':'PASS',failures},null,2))
assert.deepEqual(failures,[],'Cleanup must not silently ignore errors')
