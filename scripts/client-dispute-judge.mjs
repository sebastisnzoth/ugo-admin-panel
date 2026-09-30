import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
import{createHash}from'node:crypto'
import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL,sha=process.env.UGO_RUNTIME_SHA
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.match(sha||'',/^[a-f0-9]{40}$/)
const e=JSON.parse(await readFile('artifacts/client-dispute-runtime.json','utf8'));assert.equal(e.sha,sha);assert.equal(e.environment,'UGO TEST')
const ids=e.fixture;assert.ok(ids?.dispute&&ids.service&&ids.client&&ids.provider&&ids.admin)
const db=createClient(url,process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const auditor=createClient(url,process.env.UGO_TEST_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const login=await auditor.auth.signInWithPassword({email:ids.admin_email,password:process.env.UGO_DISPUTE_FIXTURE_PASSWORD});assert.ifError(login.error);assert.ok(login.data.session)
async function rows(table,columns,field,value){const q=await db.from(table).select(columns).eq(field,value);assert.ifError(q.error);return q.data}
const [disputes,messages,audit,notices,services]=await Promise.all([
 rows('disputas','id,servicio_id,abierta_por,estado,resuelta_por','id',ids.dispute),
 rows('disputa_mensajes','autor_rol,evidencias','disputa_id',ids.dispute),
 auditor.from('audit_log').select('evento').eq('entidad_id',ids.dispute).then(q=>{assert.ifError(q.error);return q.data}),
 db.from('notificaciones').select('tipo,usuario_id').contains('datos',{disputa_id:ids.dispute}).then(q=>{assert.ifError(q.error);return q.data}),
 rows('servicios','metadata,cliente_id,proveedor_id','id',ids.service)
])
assert.equal(disputes.length,1);const d=disputes[0];assert.equal(d.servicio_id,ids.service);assert.equal(d.abierta_por,ids.client);assert.equal(d.estado,'resuelta_cliente');assert.equal(d.resuelta_por,ids.admin)
assert.equal(services.length,1);assert.equal(services[0].metadata.sha,sha);assert.equal(services[0].cliente_id,ids.client);assert.equal(services[0].proveedor_id,ids.provider)
for(const role of ['cliente','proveedor'])assert.ok(messages.some(m=>m.autor_rol===role&&Array.isArray(m.evidencias)&&m.evidencias.length>0),'Persisted evidence reference for '+role)
for(const event of ['disputa_abierta_v2','disputa_resuelta'])assert.ok(audit.some(a=>a.evento===event),event)
assert.ok(notices.some(n=>n.tipo==='disputa_resuelta'&&n.usuario_id===ids.client))
const expected=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRXsAAAAASUVORK5CYII=','base64')
for(const path of ids.storage_paths){assert.ok(path.startsWith(ids.service+'/'+ids.client+'/'));const q=await db.storage.from('dispute-evidence').download(path);assert.ifError(q.error);assert.equal(createHash('sha256').update(Buffer.from(await q.data.arrayBuffer())).digest('hex'),createHash('sha256').update(expected).digest('hex'))}
const out={validator:'Judge',readiness_id:'client-dispute',sha,result:'PASS',basis:'Independent database reads: client ownership, resolution, evidence, audit and client notification',media_bytes_verified:true,checked_at:new Date().toISOString()}
await writeFile('artifacts/client-dispute-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
