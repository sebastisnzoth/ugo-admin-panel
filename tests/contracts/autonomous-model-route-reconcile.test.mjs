import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('model route reconciliation forbids stale or unavailable READY primaries',async()=>{
 const[sql,probe,workflow]=await Promise.all([
  read('supabase/migrations/20260929160000_autonomous_model_route_reconcile.sql'),
  read('scripts/autonomous-model-route-runtime.mjs'),
  read('.github/workflows/autonomous-worker-test.yml')
 ])
 assert.match(sql,/availability='AVAILABLE'/)
 assert.match(sql,/eligible is true/)
 assert.match(sql,/last_benchmarked_at>=now\(\)-freshness/)
 assert.match(sql,/status='DEGRADED'/)
 assert.match(sql,/max_cost=0/)
 assert.match(sql,/grant execute on function public\.autonomous_reconcile_model_routes\(\) to service_role/)
 assert.match(probe,/MODEL_ROUTE_PRIMARY_INVALID/)
 assert.match(probe,/Number\(route\.max_cost\)!==0/)
 assert.ok(workflow.indexOf('autonomous-model-route-runtime.mjs')<workflow.indexOf('connect-autonomous-agents-openrouter.mjs'))
})
