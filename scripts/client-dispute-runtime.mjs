import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||'unknown'
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','Refusing non-TEST Supabase project')
assert.ok(anon&&serviceKey,'UGO TEST credentials required')
assert.match(sha,/^[a-f0-9]{40}$/,'Exact runtime SHA required')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now()
const password=process.env.UGO_DISPUTE_FIXTURE_PASSWORD
assert.ok(password,'Masked ephemeral fixture credential required')
const ids={client:null,provider:null,admin:null,service:null,dispute:null,storage_paths:[]}
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'client-dispute',sha,environment:'UGO TEST',open:false,evidence:false,status_progression:false,closure:false,audit:false,notifications:false,production_touched:false,result:'FAIL'}

async function mkUser(kind){
 const email=`ugo-${kind}-client-dispute-${token}@example.test`
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:`UGO ${kind} Runtime`,tipo:kind}})
 if(created.error)throw created.error
 const id=created.data.user.id
 ids[kind==='cliente'?'client':kind==='proveedor'?'provider':'admin']=id
 const q=await admin.from('usuarios').upsert({id,nombre:`UGO ${kind} Runtime`,tipo:kind,activo:true,es_demo:true},{onConflict:'id'})
 if(q.error)throw q.error
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/client-dispute-fixture.json',JSON.stringify({sha,ids}))
 return{id,email}
}
async function login(email){
 const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const q=await db.auth.signInWithPassword({email,password});if(q.error)throw q.error
 return db
}

const [client,provider,adm]=await Promise.all([mkUser('cliente'),mkUser('proveedor'),mkUser('admin')])
ids.client=client.id;ids.provider=provider.id;ids.admin=adm.id
const category=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(category.error)throw category.error
const maxq=await admin.from('servicios').select('numero').order('numero',{ascending:false}).limit(1).single();if(maxq.error)throw maxq.error
ids.service=crypto.randomUUID()
const service=await admin.from('servicios').insert({id:ids.service,numero:Number(maxq.data.numero)+200000,cliente_id:ids.client,proveedor_id:ids.provider,categoria_id:category.data.id,estado:'esperando_aprobacion',descripcion:'UGO client dispute readiness TEST',tarifa:149.9,ambiente:'demo',metadata:{readiness_id:'client-dispute',sha,ephemeral:true}}).select('id').single();if(service.error)throw service.error

const clientDb=await login(client.email)
const evidencePath=ids.service+'/'+ids.client+'/runtime-'+token+'.png'
ids.storage_paths.push(evidencePath)
await writeFile('artifacts/client-dispute-fixture.json',JSON.stringify({sha,ids}))
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRXsAAAAASUVORK5CYII=','base64')
const upload=await clientDb.storage.from('dispute-evidence').upload(evidencePath,image,{contentType:'image/png',upsert:false});if(upload.error)throw upload.error
const opened=await clientDb.rpc('abrir_disputa_v2',{p_servicio_id:ids.service,p_motivo_codigo:'incompleto',p_motivo:'Cliente abre disputa TEST con evidencia controlada',p_evidencias:[{path:evidencePath,name:'runtime.png',type:'image/png',size:image.length}]});if(opened.error)throw opened.error
ids.dispute=opened.data.id
await writeFile('artifacts/client-dispute-fixture.json',JSON.stringify({sha,ids}))
evidence.open=opened.data.abierta_por===ids.client&&opened.data.estado==='abierta'
const msg=await admin.from('disputa_mensajes').select('autor_rol,evidencias').eq('disputa_id',ids.dispute).eq('autor_rol','cliente').single();if(msg.error)throw msg.error
evidence.evidence=Array.isArray(msg.data.evidencias)&&msg.data.evidencias.length===1

const providerDb=await login(provider.email)
const replied=await providerDb.rpc('responder_disputa',{p_disputa_id:ids.dispute,p_mensaje:'Proveedor responde el caso TEST',p_evidencias:[{path:evidencePath,name:'runtime.png',type:'image/png'}]});if(replied.error)throw replied.error
const review=await admin.from('disputas').select('estado').eq('id',ids.dispute).single();if(review.error)throw review.error
evidence.status_progression=replied.data.autor_rol==='proveedor'&&review.data.estado==='en_revision'

const adminDb=await login(adm.email)
const resolved=await adminDb.rpc('admin_resolver_disputa',{p_disputa_id:ids.dispute,p_resolucion:'Resolución TEST completa a favor del cliente',p_favor_de:'cliente'});if(resolved.error)throw resolved.error
evidence.closure=resolved.data.estado==='resuelta_cliente'&&resolved.data.resuelta_por===ids.admin
const audit=await adminDb.from('audit_log').select('evento').eq('entidad_tipo','disputa').eq('entidad_id',ids.dispute).in('evento',['disputa_abierta_v2','disputa_resuelta']);if(audit.error)throw audit.error
evidence.audit=new Set((audit.data||[]).map(x=>x.evento)).size===2
const notices=await admin.from('notificaciones').select('tipo,usuario_id').contains('datos',{disputa_id:ids.dispute});if(notices.error)throw notices.error
evidence.notifications=(notices.data||[]).some(x=>x.tipo==='disputa_resuelta'&&x.usuario_id===ids.client)
assert.ok(evidence.open&&evidence.evidence&&evidence.status_progression&&evidence.closure&&evidence.audit&&evidence.notifications)
evidence.fixture={...ids,admin_email:adm.email};evidence.result='PASS'
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/client-dispute-runtime.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',readiness_id:'client-dispute',sha,open:true,evidence:true,status_progression:true,closure:true,audit:true,notifications:true,production_touched:false}))
