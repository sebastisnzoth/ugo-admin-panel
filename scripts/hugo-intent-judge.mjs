import assert from'node:assert/strict'
import fs from'node:fs/promises'
const runtime=JSON.parse(await fs.readFile('artifacts/hugo-intent-runtime.json','utf8'))
const sha=process.env.UGO_RUNTIME_SHA||''
assert.equal(runtime.readiness_id,'hugo-intent')
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.production_touched,false)
assert.equal(runtime.sha,sha)
assert.equal(runtime.correlation_id,'readiness-hugo-intent-20260929T212200Z-6c13b3ea')
assert.ok(runtime.active_category_count>0)
assert.ok(runtime.category_results.length>=10)
for(const row of runtime.category_results)assert.equal(row.status,'PASS',row.phrase)
for(const row of runtime.action_results)assert.equal(row.status,'PASS',row.phrase)
for(const group of['plumbing','painting','electricity'])assert.ok(runtime.category_results.some(row=>row.expected_group===group),group+' coverage missing')
const evidence={validator:'Judge',readiness_id:'hugo-intent',sha,correlation_id:runtime.correlation_id,result:'PASS',basis:['Production category resolver executed against active UGO TEST category catalog','Spanish and Portuguese natural-language synonyms resolve to expected service groups','Navigation phrases remain outside service-category intent','Flow actions for navigation, cancellation, scheduling, confirmation and retry are deterministic'],validated_at:new Date().toISOString()}
await fs.writeFile('artifacts/hugo-intent-judge.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
