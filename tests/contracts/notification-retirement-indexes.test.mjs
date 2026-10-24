import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'

test('notification retirement has service-scoped indexes so matching cannot full-scan notification tables',()=>{
 const sql=readFileSync('supabase/migrations/20261002121500_notification_retirement_indexes.sql','utf8')
 assert.match(sql,/notificaciones_servicio_pending_lifecycle_idx/)
 assert.match(sql,/\(\(datos->>'servicio_id'\)\)/)
 assert.match(sql,/where leida_at is null/)
 assert.match(sql,/push_entregas_pending_notificacion_idx/)
 assert.match(sql,/where estado='pendiente'/)
})

test('P0 service-scoped notification cleanup has an unrestricted expression index',()=>{
 const sql=readFileSync('supabase/migrations/20261024033500_notifications_service_id_cleanup_index.sql','utf8')
 assert.match(sql,/create index if not exists notificaciones_service_id_cleanup_idx/i)
 assert.match(sql,/on public\.notificaciones \(\(datos->>'servicio_id'\)\)/)
 assert.doesNotMatch(sql,/\bwhere\s+(?:leida_at|tipo)\b/i)
 const e2e=readFileSync('scripts/p0-client-provider-e2e.mjs','utf8')
 assert.match(e2e,/\.filter\('datos->>servicio_id','eq',serviceId\)/)
})
