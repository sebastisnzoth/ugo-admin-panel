import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=String(process.env.UGO_RUNTIME_SHA||process.env.GITHUB_SHA||'').trim()
const r=JSON.parse(await fs.readFile('artifacts/client-provider-lifecycle-runtime.json','utf8'))
assert.equal(r.readiness_id,'client-provider-lifecycle')
assert.equal(r.sha,sha)
assert.equal(r.environment,'UGO TEST')
assert.equal(r.production_touched,false)
assert.equal(r.result,'PASS')
assert.deepEqual(r.lifecycle,['ofrecido','asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado'])
for(const k of['matching_offer_acceptance','canonical_state_order','payment_release','before_after_evidence','bilateral_ratings','audit_decision_ledger','audit_evidence_ledger'])assert.equal(r.checks?.[k],true,k)
const out={validator:'Judge',readiness_id:'client-provider-lifecycle',status:'PASS',sha,service_id:r.service_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-provider-lifecycle-judge.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
