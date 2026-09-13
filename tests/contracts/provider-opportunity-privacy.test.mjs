import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('pending provider opportunities never expose the exact client address',async()=>{
 const migration=await read('supabase/migrations/20260913105000_provider_opportunity_schedule_context.sql')
 assert.match(migration,/'direccion_cliente',\s*null/)
 assert.match(migration,/'zona_cliente',\s*nullif\(concat_ws\(', ', pc\.barrio, pc\.ciudad\), ''\)/)
 assert.match(migration,/'programado_para',\s*s\.programado_para/)
 assert.match(migration,/'preferences'/)
 assert.match(migration,/'estimated_duration_minutes'/)
 assert.doesNotMatch(migration,/'direccion_cliente',\s*s\.direccion_cliente/)
})

test('provider UI consumes safe zone instead of pending exact address',async()=>{
 const data=await read('src/mvp/provider/providerData.tsx')
 assert.match(data,/zone:serviceData\?\.zona_cliente\|\|'Zona por confirmar'/)
 assert.doesNotMatch(data,/zone:serviceData\?\.direccion_cliente/)
})
