import assert from'node:assert/strict'
import fs from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||'',serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||'',sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','UGO_TEST_ONLY')
assert.ok(serviceKey&&sha,'UGO_TEST_CREDENTIALS_AND_SHA_REQUIRED')
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now(),password='UGO-Test-'+token+'-R9!'
let clientId=null,providerId=null,serviceId=null,ratingId=null
async function cleanup(){
 if(serviceId)await admin.from('resenas').delete().eq('servicio_id',serviceId)
 if(serviceId)await admin.from('servicios').delete().eq('id',serviceId)
 for(const id of[providerId,clientId]){if(!id)continue;await admin.from('perfiles_proveedor').delete().eq('usuario_id',id);await admin.from('usuarios').delete().eq('id',id);await admin.auth.admin.deleteUser(id)}
}
async function mk(kind){
 const email=`ugo-${kind}-provider-rating-${token}@example.test`
 const q=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:`UGO ${kind} Rating Runtime`,tipo:kind}})
 if(q.error)throw q.error
 const id=q.data.user.id
 const u=await admin.from('usuarios').upsert({id,nombre:`UGO ${kind} Rating Runtime`,tipo:kind,activo:true,es_demo:true},{onConflict:'id'})
 if(u.error)throw u.error
 return{id,email}
}
try{
 const client=await mk('cliente');clientId=client.id
 const provider=await mk('proveedor');providerId=provider.id
 const category=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(category.error)throw category.error
 const maxq=await admin.from('servicios').select('numero').order('numero',{ascending:false}).limit(1).single();if(maxq.error)throw maxq.error
 serviceId=crypto.randomUUID()
 const service=await admin.from('servicios').insert({id:serviceId,numero:Number(maxq.data.numero)+310000,cliente_id:clientId,proveedor_id:providerId,categoria_id:category.data.id,estado:'completado',descripcion:'UGO provider rating readiness TEST',tarifa:127.5,ambiente:'demo',completado_at:new Date().toISOString(),metadata:{readiness_id:'provider-rating',sha,ephemeral:true}}).select('id,estado').single()
 if(service.error)throw service.error
 assert.equal(service.data.estado,'completado')

 const providerDb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const login=await providerDb.auth.signInWithPassword({email:provider.email,password});if(login.error)throw login.error
 const payload={servicio_id:serviceId,cliente_id:clientId,proveedor_id:providerId,autor_tipo:'proveedor',puntuacion:4,comentario:'UGO TEST provider rating runtime'}
 const first=await providerDb.from('resenas').insert(payload).select('id,servicio_id,autor_tipo,puntuacion,comentario').single()
 if(first.error)throw first.error
 ratingId=first.data.id
 assert.equal(first.data.autor_tipo,'proveedor');assert.equal(Number(first.data.puntuacion),4)

 const duplicate=await providerDb.from('resenas').insert({...payload,puntuacion:2,comentario:'duplicate must fail'})
 assert.ok(duplicate.error,'DUPLICATE_PROVIDER_RATING_MUST_REJECT')
 assert.equal(duplicate.error.code,'23505','DUPLICATE_MUST_USE_DB_UNIQUENESS')

 const persisted=await admin.from('resenas').select('id,servicio_id,autor_tipo,puntuacion').eq('servicio_id',serviceId).eq('autor_tipo','proveedor')
 if(persisted.error)throw persisted.error
 assert.equal(persisted.data.length,1);assert.equal(persisted.data[0].id,ratingId);assert.equal(Number(persisted.data[0].puntuacion),4)

 const readback=await providerDb.from('resenas').select('id,servicio_id,autor_tipo,puntuacion').eq('servicio_id',serviceId).eq('autor_tipo','proveedor').single()
 if(readback.error)throw readback.error
 assert.equal(readback.data.id,ratingId)

 const clientKarma=await admin.from('usuarios').select('karma').eq('id',clientId).single();if(clientKarma.error)throw clientKarma.error
 assert.equal(Number(clientKarma.data.karma),4)

 const out={readiness_id:'provider-rating',sha,environment:'UGO TEST',productionTouched:false,serviceId,ratingId,observations:{completed_only:true,provider_rating_persisted:true,duplicate_rejected:true,exactly_once:true,provider_readback:true,client_karma_updated:true},clientKarma:Number(clientKarma.data.karma),result:'PASS',completed_at:new Date().toISOString()}
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/provider-rating-runtime.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
}finally{await cleanup()}
