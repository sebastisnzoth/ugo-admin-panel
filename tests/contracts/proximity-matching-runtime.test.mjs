import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('proximity QA covers combined eligibility and preserves canonical guards',async()=>{const sql=await read('supabase/migrations/20261001024000_proximity_matching_runtime_qa.sql');for(const token of['PROXIMITY_BASELINE_PROVIDER_NOT_MATCHED','PROXIMITY_OFFLINE_PROVIDER_MATCHED','PROXIMITY_STALE_GPS_PROVIDER_MATCHED','PROXIMITY_OUTSIDE_CONFIGURED_RADIUS_MATCHED','PROXIMITY_INSIDE_CONFIGURED_RADIUS_NOT_MATCHED','PROXIMITY_WRONG_CATEGORY_PROVIDER_MATCHED','proveedor_bloqueado_por_deuda_ugo','proveedor_puede_recibir_oferta',"estado_verificacion=''verificado''"])assert.ok(sql.includes(token),token)})
