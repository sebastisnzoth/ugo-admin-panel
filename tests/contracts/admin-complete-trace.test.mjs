import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('admin service operation exposes complete service trace',async()=>{
 const[services,trace]=await Promise.all([
  read('src/mvp/AdminServicesPro.tsx'),
  read('src/mvp/AdminServiceTracePanel.tsx'),
 ])
 assert.match(services,/AdminServiceTracePanel/)
 assert.match(services,/<AdminServiceTracePanel service=\{editing\}\/>/)
 for(const table of ['evidencias_solicitud','evidencias_servicio','servicio_estado_eventos','eventos_servicio','pagos','resenas']){
  assert.match(trace,new RegExp(`from\\('${table}'\\)`))
 }
 assert.match(trace,/Calificaciones cruzadas/)
 assert.match(trace,/Fotos y evidencias/)
 assert.match(trace,/Cronología/)
 assert.match(trace,/SERVICE ID/)
})

test('admin user rows open complete history with services documents and ratings',async()=>{
 const[users,trace]=await Promise.all([
  read('src/mvp/AdminUsersPanel.tsx'),
  read('src/mvp/AdminUserTracePanel.tsx'),
 ])
 assert.match(users,/AdminUserTracePanel/)
 assert.match(users,/Ver historial/)
 assert.match(trace,/from\('servicios'\)/)
 assert.match(trace,/from\('documentos'\)/)
 assert.match(trace,/from\('resenas'\)/)
 assert.match(trace,/ALTA EN UGO/)
 assert.match(trace,/Documentación/)
 assert.match(trace,/Calificaciones/)
})

test('admin trace keeps historical events readable through existing RLS',async()=>{
 const migration=await read('supabase/migrations/20260920031500_grant_service_events_read.sql')
 assert.match(migration,/grant select on table public\.eventos_servicio to authenticated/)
})
