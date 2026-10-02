// Independent read-only validator. Run before the runtime executor cleans its fixtures.
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
const evidence=JSON.parse(await readFile('artifacts/provider-notifications-runtime.json','utf8'))
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co','TEST_ONLY')
assert.ok(key,'TEST_SERVICE_KEY_REQUIRED')
assert.match(evidence.sha,/^[0-9a-f]{40}$/,'EXACT_SHA_REQUIRED')
assert.equal(evidence.sha,process.env.UGO_RUNTIME_SHA,'RUNTIME_SHA_REQUIRED')
const {service_id,provider_id,client_id,offer_id,offer_notice_id}=evidence.persisted_entities||{}
for(const id of [service_id,provider_id,client_id,offer_id,offer_notice_id])assert.match(id||'',/^[0-9a-f-]{36}$/)
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const results=await Promise.all([
 db.from('servicios').select('id,cliente_id,proveedor_id,estado,metadata').eq('id',service_id).single(),
 db.from('ofertas_servicio').select('id,servicio_id,proveedor_id,estado').eq('id',offer_id).single(),
 db.from('notificaciones').select('id,usuario_id,tipo,datos,created_at').eq('id',offer_notice_id).single(),
 db.from('servicio_estado_eventos').select('estado_nuevo').eq('servicio_id',service_id),
])
for(const r of results)if(r.error)throw r.error
const [service,offer,notice,events]=results.map(r=>r.data)
assert.equal(service.cliente_id,client_id);assert.equal(service.proveedor_id,provider_id)
assert.equal(service.metadata?.sha,evidence.sha);assert.equal(service.metadata?.ephemeral,true)
assert.equal(offer.servicio_id,service_id);assert.equal(offer.proveedor_id,provider_id)
assert.equal(offer.estado,'aceptada','OFFER_ACCEPTANCE_PERSISTED')
assert.ok(events.some(e=>e.estado_nuevo==='asignado'),'ASSIGNMENT_AUDIT_REQUIRED')
assert.equal(notice.usuario_id,provider_id);assert.equal(notice.tipo,'nueva_oferta')
assert.equal(notice.datos?.oferta_id,offer_id);assert.equal(notice.datos?.servicio_id,service_id)
assert.ok(Date.parse(notice.datos.expira_at)>Date.parse(notice.created_at),'NOTICE_BORN_EXPIRED')
const out={validator:'Persistence Judge',sha:evidence.sha,environment:'UGO TEST',result:'PASS',source:'INDEPENDENT_DB_READS',checks:{owned_service:true,accepted_offer:true,assigned_audit_event:true,matching_notice_correlated:true,expiry_after_creation:true},physical_audio_verified:false,physical_vibration_verified:false,checked_at:new Date().toISOString()}
await writeFile('artifacts/provider-notifications-persistence-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
