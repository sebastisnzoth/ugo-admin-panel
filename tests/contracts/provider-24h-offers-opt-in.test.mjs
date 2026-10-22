import test from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
const ui=readFileSync(new URL('../../src/mvp/provider/ProviderPortfolioAvailability.tsx',import.meta.url),'utf8')
const sql=readFileSync(new URL('../../supabase/migrations/20261022014500_provider_opt_in_24h_offers.sql',import.meta.url),'utf8')
test('provider can explicitly opt into 24-hour immediate offers',()=>{
 assert.match(ui,/type Schedule=.*receive24h\?:boolean/)
 assert.match(ui,/checked=\{schedule.receive24h===true\}/)
 assert.match(ui,/Recibir ofertas las 24 horas/)
 assert.match(sql,/receive24h/)
 assert.match(sql,/if v_target_start is null then/)
 assert.match(sql,/elsif not private\.proveedor_horario_permite\(p_proveedor_id,v_target_start,v_target_duration\)/)
 assert.match(sql,/private\.proveedor_zonas_permitem/)
 assert.match(sql,/private\.pilot_servicio_generico_permitido/)
})
