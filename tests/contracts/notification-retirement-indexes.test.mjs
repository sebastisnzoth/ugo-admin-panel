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
