import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('service chat is anchored to canonical service participants',async()=>{
 const sql=await read('supabase/migrations/20260914170000_service_chat.sql')
 assert.match(sql,/create table if not exists public\.mensajes_servicio/)
 assert.match(sql,/servicio_id uuid not null references public\.servicios\(id\)/)
 assert.match(sql,/autor_id = auth\.uid\(\)/)
 assert.match(sql,/s\.cliente_id = auth\.uid\(\)/)
 assert.match(sql,/s\.proveedor_id = auth\.uid\(\)/)
 assert.match(sql,/s\.proveedor_id is not null/)
})

test('service messages are immutable for participants and realtime enabled',async()=>{
 const sql=await read('supabase/migrations/20260914170000_service_chat.sql')
 assert.match(sql,/revoke update, delete on public\.mensajes_servicio from authenticated/)
 assert.match(sql,/alter publication supabase_realtime add table public\.mensajes_servicio/)
})

test('client and provider surfaces use the canonical chat component',async()=>{
 const client=await read('src/mvp/client/ClientRoot.tsx')
 const provider=await read('src/mvp/provider/ProviderActiveJob.tsx')
 const component=await read('src/mvp/ServiceChat.tsx')
 assert.match(client,/<ServiceChat role="client"\/>/)
 assert.match(provider,/<ServiceChat role="provider" serviceId=\{s\.id\} compact\/>/)
 assert.match(component,/from\('mensajes_servicio'\)/)
 assert.match(component,/postgres_changes/)
})
