import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql=readFileSync(new URL('../../supabase/migrations/20261021201500_provider_offer_alert_gps_freshness_parity.sql',import.meta.url),'utf8')

test('new offer notification aligns trusted GPS freshness with matching (90 seconds)',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION private\.notify_provider_new_offer/)
 assert.match(sql,/v_provider_location_at < now\(\)-interval '90 seconds'/)
 assert.doesNotMatch(sql,/v_provider_location_at < now\(\)-interval '30 seconds'/)
 assert.match(sql,/v_accuracy_m > 250/)
 assert.match(sql,/pp\.online=true|pp\.online=true/)
 assert.match(sql,/extensions\.st_dwithin\(v_client_location,v_provider_location,v_alert_radius_m\+v_geo_epsilon_m\)/)
 assert.match(sql,/private\.crear_notificacion_unica\(/)
 assert.match(sql,/\'nueva_oferta\'/)
 assert.match(sql,/v_cycle_key/)
})
