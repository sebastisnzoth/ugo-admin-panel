import assert from'node:assert/strict'
import{mkdir,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||''
const serviceKey=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
const sha=process.env.UGO_RUNTIME_SHA||''
const password=process.env.UGO_RATING_FIXTURE_PASSWORD||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','Refusing non-TEST Supabase project')
assert.ok(anon&&serviceKey&&password,'UGO TEST credentials required')
assert.match(sha,/^[a-f0-9]{40}$/,'Exact runtime SHA required')

const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=sha.slice(0,8)+'-'+Date.now()
const ids={client:null,provider:null,service:null,rating:null}
const out={schema_version:'UGO_READINESS_EVIDENCE_V1',readiness_id:'client-rating',sha,environment:'UGO TEST',production_touched:false,completed_only:false,persisted:false,exactly_once:false,client_readback:false,provider_karma_updated:false,fixture:ids,result:'FAIL'}

async function mkUser(kind){
 const email=`ugo-${kind}-client-rating-${token}@example.test`
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre:`UGO ${kind} Rating Runtime`,tipo:kind}})
 if(created.error)throw created.error
 const id=created.data.user.id
 const q=await admin.from('usuarios').upsert({id,nombre:`UGO ${kind} Rating Runtime`,tipo:kind,activo:true,es_demo:true},{onConflict:'id'})
 if(q.error)throw q.error
 return{id,email}
}
async function login(email){
 const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const q=await db.auth.signInWithPassword({email,password})
 if(q.error)throw q.error
 return db
}

const [client,provider]=await Promise.all([mkUser('cliente'),mkUser('proveedor')])
ids.client=client.id;ids.provider=provider.id
const category=await admin.from('categorias').select('id').eq('activa',true).limit(1).single();if(category.error)throw category.error
const maxq=await admin.from('servicios').select('numero').order('numero',{ascending:false}).limit(1).single();if(maxq.error)throw maxq.error
ids.service=crypto.randomUUID()
const service=await admin.from('servicios').insert({id:ids.service,numero:Number(maxq.data.numero)+300000,cliente_id:ids.client,proveedor_id:ids.provider,categoria_id:category.data.id,estado:'completado',descripcion:'UGO client rating readiness TEST',tarifa:119.9,ambiente:'demo',completado_at:new Date().toISOString(),metadata:{readiness_id:'client-rating',sha,ephemeral:true}}).select('id,estado').single();if(service.error)throw service.error
out.completed_only=service.data.estado==='completado'

const clientDb=await login(client.email)
const payload={servicio_id:ids.service,cliente_id:ids.client,proveedor_id:ids.provider,autor_tipo:'cliente',puntuacion:5,comentario:'UGO TEST client rating runtime'}
const first=await clientDb.from('resenas').insert(payload).select('id,servicio_id,cliente_id,proveedor_id,autor_tipo,puntuacion,comentario').single()
if(first.error)throw first.error
ids.rating=first.data.id
out.persisted=first.data.servicio_id===ids.service&&first.data.autor_tipo==='cliente'&&Number(first.data.puntuacion)===5

const duplicate=await clientDb.from('resenas').insert({...payload,puntuacion:4,comentario:'duplicate should be rejected'})
assert.ok(duplicate.error,'Second rating must be rejected')
assert.equal(duplicate.error.code,'23505','Duplicate rating must fail at DB uniqueness invariant')
const persisted=await admin.from('resenas').select('id,servicio_id,autor_tipo,puntuacion,comentario').eq('servicio_id',ids.service).eq('autor_tipo','cliente')
if(persisted.error)throw persisted.error
out.exactly_once=persisted.data.length===1&&persisted.data[0].id===ids.rating&&Number(persisted.data[0].puntuacion)===5

const ownRead=await clientDb.from('resenas').select('id,servicio_id,autor_tipo,puntuacion,comentario').eq('servicio_id',ids.service).eq('autor_tipo','cliente').single()
if(ownRead.error)throw ownRead.error
out.client_readback=ownRead.data.id===ids.rating&&Number(ownRead.data.puntuacion)===5
const providerRow=await admin.from('usuarios').select('karma').eq('id',ids.provider).single();if(providerRow.error)throw providerRow.error
out.provider_karma_updated=Number(providerRow.data.karma)===5

assert.ok(out.completed_only&&out.persisted&&out.exactly_once&&out.client_readback&&out.provider_karma_updated)
out.result='PASS';out.fixture={...ids,client_email:client.email}
await mkdir('artifacts',{recursive:true})
await writeFile('artifacts/client-rating-fixture.json',JSON.stringify({sha,ids},null,2)+'\n')
await writeFile('artifacts/client-rating-runtime.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify({status:'PASS',readiness_id:'client-rating',sha,persisted:true,exactly_once:true,client_readback:true,provider_karma_updated:true,production_touched:false}))
