import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
const sql=readFileSync(new URL('../../supabase/migrations/20261022020000_rematch_on_fresh_provider_gps.sql',import.meta.url),'utf8')
test('offerless request can rematch early with fresh GPS and bounded rate',()=>{
 for(const token of ["s.updated_at <= now() - interval '60 seconds'","pp.ubicacion_updated_at >= now() - interval '90 seconds'","pp.ubicacion_accuracy_m <= 250","private.proveedor_puede_recibir_oferta(pp.usuario_id,s.id)","FOR UPDATE OF s SKIP LOCKED","LIMIT 20","s.proveedor_id IS NULL","s.estado IN ('buscando', 'ofrecido')","NOT EXISTS ("]){assert.ok(sql.includes(token),token)}
 assert.match(sql,/s\.matching_expires_at IS NULL OR s\.matching_expires_at <= now\(\)/)
 assert.match(sql,/o\.estado = 'pendiente'/)
 assert.match(sql,/private\.iniciar_matching_impl\(r\.id\)/)
})
