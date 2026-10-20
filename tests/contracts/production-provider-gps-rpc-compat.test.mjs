import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql=readFileSync(new URL('../../supabase/migrations/20261020223000_production_provider_gps_rpc_compat.sql',import.meta.url),'utf8')
const provider=readFileSync(new URL('../../src/mvp/provider/providerService.ts',import.meta.url),'utf8')
const tracker=readFileSync(new URL('../../src/mvp/ProviderLocationTracker.tsx',import.meta.url),'utf8')

test('production GPS bridge exposes exactly the RPC contracts used by provider',()=>{
 for(const name of ['activar_disponibilidad_proveedor','publicar_ubicacion_disponibilidad_proveedor']){
  assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION public\\.'+name+'\\('))
  assert.match(sql,new RegExp('REVOKE ALL ON FUNCTION public\\.'+name))
  assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION public\\.'+name+'.*TO authenticated'))
 }
 assert.match(provider,/rpc\('activar_disponibilidad_proveedor'/)
 assert.match(tracker,/rpc\('publicar_ubicacion_disponibilidad_proveedor'/)
})
test('GPS bridge adds only required metadata columns and validates provider and location',()=>{
 assert.match(sql,/ADD COLUMN IF NOT EXISTS ubicacion_updated_at timestamptz/)
 assert.match(sql,/ADD COLUMN IF NOT EXISTS ubicacion_accuracy_m double precision/)
 assert.equal((sql.match(/auth\.uid\(\)/g)||[]).length,2)
 assert.equal((sql.match(/p_accuracy_m > 250/g)||[]).length,2)
 assert.equal((sql.match(/v_age_ms > 30000/g)||[]).length,2)
 assert.equal((sql.match(/p_captured_at >= ubicacion_updated_at/g)||[]).length,2)
 assert.match(sql,/estado_verificacion='verificado'/)
 assert.match(sql,/pp\.online=true AND pp\.disponible=true/)
 assert.doesNotMatch(sql,/DROP TRIGGER|DROP TABLE|TRUNCATE|ALTER POLICY|CREATE POLICY|private\.iniciar_matching_impl/i)
})
