import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const path=new URL('../../supabase/migrations/20261021195500_matching_immediate_online_start_and_deadline.sql',import.meta.url)
const source=await readFile(path,'utf8')

test('immediate Online jobs respect starting hours; scheduled jobs still reserve full duration',()=>{
 assert.match(source,/if v_target_start is null then\s+if not private\.proveedor_horario_permite\(p_proveedor_id,now\(\),1\) then return false; end if;/)
 assert.match(source,/elsif not private\.proveedor_horario_permite\(p_proveedor_id,v_target_start,v_target_duration\) then/)
 assert.match(source,/if not private\.proveedor_zonas_permitem\(p_proveedor_id,p_servicio_id\) then return false/)
 assert.match(source,/if not private\.pilot_servicio_generico_permitido\(p_servicio_id\) then return false/)
 assert.match(source,/v_target\.programado_para/)
})

test('authorized backend sets matching expiry for new and existing offers without broadening owner UPDATE RLS',()=>{
 assert.match(source,/CREATE OR REPLACE FUNCTION private\.iniciar_matching_impl/)
 assert.equal((source.match(/matching_expires_at=now\(\)\+interval '5 minutes'/g)||[]).length,2)
 assert.match(source,/if v_servicio\.cliente_id<>auth\.uid\(\) and not private\.is_admin\(auth\.uid\(\)\) then/)
 assert.match(source,/gps_freshness constant interval := interval '90 seconds'/)
 assert.match(source,/pp\.ubicacion_accuracy_m <= 250/)
 assert.doesNotMatch(source,/CREATE POLICY|ALTER TABLE|GRANT\s+(ALL|UPDATE)/i)
})

test('provider eligibility preserves debt, GPS, active job, and category guards',()=>{
 for(const expression of ['proveedor_bloqueado_por_deuda_ugo','proveedor_trabaja_categoria','proveedor_puede_recibir_oferta','pp.online=true','pp.disponible=true','pp.estado_verificacion=\'verificado\'']){
  assert.ok(source.includes(expression),expression+' missing')
 }
})
