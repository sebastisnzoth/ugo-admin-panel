import assert from'node:assert/strict'
import fs from'node:fs'
const sha=process.env.UGO_RUNTIME_SHA||'',e=JSON.parse(fs.readFileSync('artifacts/pilot-e2e-runtime.json','utf8'))
assert.equal(e.sha,sha);assert.equal(e.environment,'UGO TEST');assert.equal(e.result,'PASS');assert.equal(e.results.length,2)
for(const slug of ['faxina','marido-de-aluguel']){const r=e.results.find(x=>x.slug===slug);assert.equal(r?.result,'PASS');assert.ok(r.service_id&&r.correlation_id);assert.equal(r.service.estado,'completado');assert.equal(r.service.ambiente,'demo');assert.ok(r.accepted_offer_id);assert.equal(r.evidence.length>=2,true);assert.equal(new Set(r.ratings.map(x=>x.author)).size,2);assert.equal(r.audit_judge?.passed,true)}
console.log('PILOT E2E JUDGE PASS',sha)
