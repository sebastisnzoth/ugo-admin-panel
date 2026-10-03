// Separate read-only process, before the executor removes its ephemeral actor.
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
const e=JSON.parse(await readFile('artifacts/provider-alerts-runtime.json','utf8'))
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
assert.equal(url,'https://tmossnqfwfwjrtzwcbmm.supabase.co');assert.ok(key)
assert.equal(e.sha,process.env.UGO_RUNTIME_SHA);assert.equal(e.offer_origin,'DIRECT_NOTIFICATION_PROBE')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const results=await Promise.all([
 db.from('usuarios').select('tipo,activo').eq('id',e.provider_id).single(),
 db.from('perfiles_proveedor').select('online,disponible').eq('usuario_id',e.provider_id).single(),
 db.from('notificaciones').select('usuario_id,tipo,datos,created_at').eq('id',e.notification_id).single(),
])
for(const r of results)if(r.error)throw r.error
const [user,profile,notice]=results.map(r=>r.data)
assert.equal(user.tipo,'proveedor');assert.equal(user.activo,true)
assert.equal(profile.online,true);assert.equal(profile.disponible,true)
assert.equal(notice.usuario_id,e.provider_id);assert.equal(notice.tipo,'nueva_oferta')
assert.equal(notice.datos.runtime_probe,true);assert.ok(Date.parse(notice.datos.expira_at)>Date.parse(notice.created_at))
const out={validator:'Persistence Judge',sha:e.sha,result:'PASS',source:'INDEPENDENT_DB_READS',offer_origin:e.offer_origin,physical_audio_verified:false,physical_vibration_verified:false,checked_at:new Date().toISOString()}
await writeFile('artifacts/provider-alerts-persistence-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
