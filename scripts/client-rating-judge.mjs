import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
import{createClient}from'@supabase/supabase-js'

const url=process.env.UGO_TEST_SUPABASE_URL||''
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co')
assert.match(sha,/^[a-f0-9]{40}$/)
const runtime=JSON.parse(await readFile('artifacts/client-rating-runtime.json','utf8'))
assert.equal(runtime.sha,sha);assert.equal(runtime.environment,'UGO TEST');assert.equal(runtime.result,'PASS');assert.equal(runtime.production_touched,false)
const ids=runtime.fixture
assert.ok(ids?.service&&ids.client&&ids.provider&&ids.rating)
const db=createClient(url,process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const service=await db.from('servicios').select('id,estado,cliente_id,proveedor_id,metadata').eq('id',ids.service).single();assert.ifError(service.error)
assert.equal(service.data.estado,'completado');assert.equal(service.data.cliente_id,ids.client);assert.equal(service.data.proveedor_id,ids.provider);assert.equal(service.data.metadata.sha,sha)
const ratings=await db.from('resenas').select('id,servicio_id,cliente_id,proveedor_id,autor_tipo,puntuacion,comentario').eq('servicio_id',ids.service).eq('autor_tipo','cliente');assert.ifError(ratings.error)
assert.equal(ratings.data.length,1);assert.equal(ratings.data[0].id,ids.rating);assert.equal(ratings.data[0].cliente_id,ids.client);assert.equal(ratings.data[0].proveedor_id,ids.provider);assert.equal(Number(ratings.data[0].puntuacion),5)
const out={validator:'Judge',readiness_id:'client-rating',sha,result:'PASS',basis:'Independent DB read proves completed service, one persisted client rating, correct participants and score.',checked_at:new Date().toISOString()}
await writeFile('artifacts/client-rating-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
