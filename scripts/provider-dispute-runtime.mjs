import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||'unknown'
assert.ok(url&&anon&&serviceKey,'UGO TEST credentials required')
assert.match(url,/tmossnqfwfwjrtzwcbmm/,'Refusing non-TEST Supabase project')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now()
const password='UGO-Test-'+token+'-A9!'
const ids={client:null,provider:null,admin:null,service:null,dispute:null}
const evidence={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'provider-dispute',sha,environment:'UGO TEST',open:false,evidence:false,status_progression:false,closure:false,audit:false,notifications:false,production_touched:false,result:'FAIL'}

async function mkUser(kind){
 const email=`ugo-${kind}-dispute-${token}@example.test`
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:`UGO ${kind} Runtime`,tipo:kind}})
 if(created.error)throw created.error
 const id=created.data.user.id
 const q=await admin.from('usuarios').upsert({id,nombre:`UGO ${kind} Runtime`,tipo:kind,activo:true,es_demo:true},{onConflict:'id'})
 if(q.error)throw q.error
 return{id,email}
}
async function login(email){
 const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const q=await db.auth.signInWithPassword({email,password});if(q.error)throw q.error
 return db
}
async function cleanup(){
 try{if(ids.dispute)await admin.from('disputa_mensajes').delete().eq('disputa_id',ids.dispute)}catch{}
 try{if(ids.dispute)await admin.from('audit_log').delete().eq('entidad_tipo','disputa').eq('entidad_id',ids.dispute)}catch{}
 try{if(ids.dispute)await admin.from('disputas').delete().eq('id',ids.dispute)}catch{}
 try{if(ids.service)await admin.from('notificaciones').delete().contains('datos',{servicio_id:ids.service})}catch{}
 try{if(ids.service)await admin.from('servicios').delete().eq('id',ids.service)}catch{}
 for(const id of [ids.client,ids.provider,ids.admin]){
  if(!id)continue
  try{await admin.from('notificaciones').delete().eq('usuario_id',id)}catch{}
  try{await admin.from('perfiles_proveedor').delete().eq('usuario_id',id)}catch{}
  try{await admin.from('usuarios').delete().eq('id',id)}catch{}
  try{await admin.auth.admin.deleteUser(id)}catch{}
 }
}
try{
 const [client,provider,adm]=await Promise.all([mkUser('cliente'),mkUser('proveedor'),mkUser('admin')])
 ids.client=client.id;ids.provider=provider.id;ids.admin=adm.id
 const category=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(category.error)throw category.error
 const reason=await admin.from('reglas_motivos_disputa').select('codigo,actor').eq('activo',true).in('actor',['proveedor','ambos']).limit(1).single();if(reason.error)throw reason.error
 const maxq=await admin.from('servicios').select('numero').order('numero',{ascending:false}).limit(1).single();if(maxq.error)throw maxq.error
 const serviceId=crypto.randomUUID();ids.service=serviceId
 const service=await admin.from('servicios').insert({id:serviceId,numero:Number(maxq.data.numero)+100000,cliente_id:ids.client,proveedor_id:ids.provider,categoria_id:category.data.id,estado:'asignado',descripcion:'UGO provider dispute readiness TEST',tarifa:99.9,ambiente:'demo',metadata:{readiness_id:'provider-dispute',sha,ephemeral:true}}).select('id').single();if(service.error)throw service.error

 const providerDb=await login(provider.email)
 const opened=await providerDb.rpc('abrir_disputa_v2',{p_servicio_id:serviceId,p_motivo_codigo:reason.data.codigo,p_motivo:'Proveedor abre disputa TEST con evidencia controlada',p_evidencias:[{path:'test/provider-dispute/evidence.jpg',name:'evidence.jpg',type:'image/jpeg'}]});if(opened.error)throw opened.error
 ids.dispute=opened.data.id
 evidence.open=opened.data.abierta_por===ids.provider&&opened.data.estado==='abierta'
 const msg=await admin.from('disputa_mensajes').select('autor_rol,evidencias').eq('disputa_id',ids.dispute).eq('autor_rol','proveedor').single();if(msg.error)throw msg.error
 evidence.evidence=Array.isArray(msg.data.evidencias)&&msg.data.evidencias.length===1

 const clientDb=await login(client.email)
 const replied=await clientDb.rpc('responder_disputa',{p_disputa_id:ids.dispute,p_mensaje:'Cliente responde el caso TEST',p_evidencias:[{path:'test/provider-dispute/client.jpg',name:'client.jpg',type:'image/jpeg'}]});if(replied.error)throw replied.error
 const review=await admin.from('disputas').select('estado').eq('id',ids.dispute).single();if(review.error)throw review.error
 evidence.status_progression=replied.data.autor_rol==='cliente'&&review.data.estado==='en_revision'

 const adminDb=await login(adm.email)
 const resolved=await adminDb.rpc('admin_resolver_disputa',{p_disputa_id:ids.dispute,p_resolucion:'Resolución TEST completa a favor del proveedor',p_favor_de:'proveedor'});if(resolved.error)throw resolved.error
 evidence.closure=resolved.data.estado==='resuelta_proveedor'&&resolved.data.resuelta_por===ids.admin
 const audit=await admin.from('audit_log').select('evento').eq('entidad_tipo','disputa').eq('entidad_id',ids.dispute).in('evento',['disputa_abierta_v2','disputa_resuelta']);if(audit.error)throw audit.error
 evidence.audit=new Set((audit.data||[]).map(x=>x.evento)).size===2
 const notices=await admin.from('notificaciones').select('tipo,usuario_id').contains('datos',{disputa_id:ids.dispute});if(notices.error)throw notices.error
 evidence.notifications=(notices.data||[]).some(x=>x.tipo==='disputa_resuelta'&&x.usuario_id===ids.provider)
 assert.ok(evidence.open&&evidence.evidence&&evidence.status_progression&&evidence.closure&&evidence.audit&&evidence.notifications)
 evidence.result='PASS'
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/provider-dispute-runtime.json',JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify({status:'PASS',readiness_id:evidence.readiness_id,sha,open:true,evidence:true,status_progression:true,closure:true,audit:true,notifications:true,production_touched:false}))
}finally{await cleanup()}
