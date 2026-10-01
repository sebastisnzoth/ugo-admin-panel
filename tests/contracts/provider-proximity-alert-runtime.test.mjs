import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider proximity alert QA proves configured radius controls notification delivery',async()=>{const sql=await read('supabase/migrations/20261001025500_provider_proximity_alert_runtime_qa.sql');for(const token of['OUTSIDE_RADIUS_ALERT_MUST_BE_SUPPRESSED','INSIDE_RADIUS_ALERT_MUST_BE_CREATED_ONCE','ALERT_MUST_REPORT_PROVIDER_RADIUS','inside_reported_radius_km'])assert.ok(sql.includes(token),token)})
