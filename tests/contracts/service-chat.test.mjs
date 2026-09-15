import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('service chat uses the canonical mensajes table and participant identity',async()=>{
 const component=await read('src/mvp/ServiceChat.tsx')
 const grants=await read('supabase/migrations/20260914233922_service_chat_authenticated_privileges.sql')
 const hardening=await read('supabase/migrations/20260915001039_canonical_service_chat_hardening.sql')
 assert.match(component,/from\('mensajes'\)/)
 assert.match(component,/servicio_id:service\.id/)
 assert.match(component,/emisor_id:userId/)
 assert.match(component,/contenido:string/)
 assert.match(component,/contenido:clean/)
 assert.doesNotMatch(component,/from\('mensajes_servicio'\)/)
 assert.match(grants,/grant select, insert, update on table public\.mensajes to authenticated/i)
 assert.match(hardening,/emisor_id = auth\.uid\(\)/i)
 assert.match(hardening,/emisor_rol = 'cliente'/i)
 assert.match(hardening,/s\.cliente_id = auth\.uid\(\)/i)
 assert.match(hardening,/emisor_rol = 'proveedor'/i)
 assert.match(hardening,/s\.proveedor_id = auth\.uid\(\)/i)
 assert.match(hardening,/emisor_rol = 'admin'/i)
 assert.match(hardening,/private\.is_admin\(auth\.uid\(\)\)/i)
})

test('legacy mensajes_servicio is migrated once and removed from the final schema',async()=>{
 const hardening=await read('supabase/migrations/20260915001039_canonical_service_chat_hardening.sql')
 assert.match(hardening,/to_regclass\('public\.mensajes_servicio'\)/i)
 assert.match(hardening,/legacy_mensajes_servicio_id/i)
 assert.match(hardening,/insert into public\.mensajes/i)
 assert.match(hardening,/drop table public\.mensajes_servicio/i)
})

test('service message content is immutable while read receipt stays writable',async()=>{
 const hardening=await read('supabase/migrations/20260915001039_canonical_service_chat_hardening.sql')
 assert.match(hardening,/revoke update on table public\.mensajes from authenticated/i)
 assert.match(hardening,/grant select, insert on table public\.mensajes to authenticated/i)
 assert.match(hardening,/grant update\(leido_at\) on table public\.mensajes to authenticated/i)
})

test('client and provider surfaces use one canonical chat component with realtime',async()=>{
 const client=await read('src/mvp/client/ClientRoot.tsx')
 const provider=await read('src/mvp/provider/ProviderActiveJob.tsx')
 const component=await read('src/mvp/ServiceChat.tsx')
 assert.match(client,/<ServiceChat role="client"\/>/)
 assert.match(provider,/<ServiceChat role="provider" serviceId=\{s\.id\} compact\/>/)
 assert.match(component,/table:'mensajes'/)
 assert.match(component,/postgres_changes/)
})

test('service chat isolates fixed order conversations by service and participant',async()=>{
 const component=await read('src/mvp/ServiceChat.tsx')
 assert.match(component,/q=q\.eq\('id',serviceId\)\.eq\(role==='client'\?'cliente_id':'proveedor_id',uid\)/)
 assert.match(component,/eq\('servicio_id',current\.id\)/)
 assert.match(component,/const targetServiceId=serviceId\|\|null/)
 assert.match(component,/messageConfig\.filter=`servicio_id=eq\.\$\{targetServiceId\}`/)
 assert.match(component,/serviceConfig\.filter=`id=eq\.\$\{targetServiceId\}`/)
})

test('service chat converges even when a realtime event is missed',async()=>{
 const component=await read('src/mvp/ServiceChat.tsx')
 assert.match(component,/window\.setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&navigator\.onLine\)resync\(\)\},10000\)/)
 assert.match(component,/window\.addEventListener\('online',resync\)/)
 assert.match(component,/document\.addEventListener\('visibilitychange',onVisibility\)/)
 assert.match(component,/if\(status==='SUBSCRIBED'\)resync\(\)/)
 assert.match(component,/window\.clearInterval\(fallback\)/)
 assert.match(component,/sb\.removeChannel\(ch\)/)
})

test('client and provider keep separate auth storage while sharing the same role client in chat',async()=>{
 const roleClient=await read('src/lib/roleSupabase.ts')
 const shared=await read('src/mvp/shared.tsx')
 const component=await read('src/mvp/ServiceChat.tsx')
 assert.match(roleClient,/storageKey: `ugo-test-\$\{role\}-auth`/)
 assert.match(shared,/getRoleSupabase\(role\)/)
 assert.match(component,/getRoleSupabase\(role\)/)
})
