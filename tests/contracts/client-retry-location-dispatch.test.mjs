import test from'node:test'
import assert from'node:assert/strict'
import{readFileSync}from'node:fs'

test('client retry restores a confirmed stored pickup before matching legacy null-location services',()=>{
 const source=readFileSync('src/features/client/services/clientActionService.ts','utf8')
 assert.match(source,/ubicacion_cliente/)
 assert.match(source,/getDispatchProvider\(\)\.start/)
 assert.match(source,/pickupFallback:'stored'/)
})

test('matching backend refuses null service location before renewing the deadline',()=>{
 const sql=readFileSync('supabase/migrations/20261002115500_matching_requires_service_location.sql','utf8')
 const guard=sql.indexOf('if not coalesce(v_has_location,false)')
 const deadline=sql.indexOf('set matching_expires_at=v_deadline')
 assert.ok(guard>=0)
 assert.ok(deadline>guard)
 assert.match(sql,/Falta una ubicación válida para buscar profesionales/)
})
