import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('directed provider matching inherits the canonical 20 km and trusted GPS gates',async()=>{
 const sql=await read('supabase/migrations/20260929205500_directed_provider_offer_radius_guard.sql')
 assert.match(sql,/v_alert_radius_m constant double precision := 20000/)
 assert.match(sql,/v_geo_epsilon_m constant double precision := 0\.01/)
 assert.match(sql,/v_gps_freshness constant interval := interval '30 seconds'/)
 assert.match(sql,/ubicacion_updated_at < now\(\)-v_gps_freshness/)
 assert.match(sql,/ubicacion_accuracy_m > 250/)
 assert.match(sql,/extensions\.st_dwithin\(v_servicio\.ubicacion_cliente,v_provider\.ubicacion,v_alert_radius_m\+v_geo_epsilon_m\)/)
 assert.match(sql,/fuera del radio máximo de 20 km/)
 assert.match(sql,/private\.proveedor_puede_recibir_oferta\(p_proveedor_id,p_servicio_id\)/)
 assert.match(sql,/private\.proveedor_trabaja_categoria\(p_proveedor_id,v_servicio\.categoria_id\)/)
})

test('provider opportunity ordering favors urgency, shorter distance, higher value, then canonical rank',async()=>{
 const ui=await read('src/mvp/provider/ProviderOpportunities.tsx')
 assert.match(ui,/const urgency=\(b\.urgency==='urgent'\?1:0\)-\(a\.urgency==='urgent'\?1:0\)/)
 assert.match(ui,/Math\.max\(a\.distanceKm,0\)-Math\.max\(b\.distanceKm,0\)/)
 assert.match(ui,/Number\(b\.estimatedValue\|\|0\)-Number\(a\.estimatedValue\|\|0\)/)
 assert.match(ui,/Number\(a\.matchScore\?\?Number\.MAX_SAFE_INTEGER\)-Number\(b\.matchScore\?\?Number\.MAX_SAFE_INTEGER\)/)
})
