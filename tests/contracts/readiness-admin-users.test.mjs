import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('admin user trace includes audited actions with admin-only audit source',async()=>{
 const trace=await read('src/mvp/AdminUserTracePanel.tsx')
 assert.match(trace,/from\('audit_log'\)/)
 assert.match(trace,/Acciones auditadas/)
 assert.match(trace,/actor_id/)
 assert.match(trace,/entidad_id/)
 const api=await read('api/operations.ts')
 assert.match(api,/requireAdmin/)
 assert.match(api,/admin_usuario_creado/)
 assert.match(api,/admin_usuario_password_reset/)
})

test('admin user trace still includes documents dates services and ratings',async()=>{
 const trace=await read('src/mvp/AdminUserTracePanel.tsx')
 for(const table of ['servicios','documentos','resenas']) assert.match(trace,new RegExp("from\\('"+table+"'\\)"))
 assert.match(trace,/ALTA EN UGO/)
 assert.match(trace,/ÚLTIMO ACCESO/)
 assert.match(trace,/ÚLTIMA ACTUALIZACIÓN/)
 assert.match(trace,/Documentación/)
 assert.match(trace,/Calificaciones/)
})
