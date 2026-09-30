import assert from'node:assert/strict'
import fs from'node:fs'
const sha=process.env.UGO_RUNTIME_SHA||'',e=JSON.parse(fs.readFileSync('artifacts/pilot-provider-runtime.json','utf8'))
assert.equal(e.sha,sha);assert.equal(e.environment,'UGO TEST');assert.equal(e.result,'PASS');assert.equal(e.results.length,2);assert.ok(e.provider_id)
for(const kind of ['faxina','marido']){const r=e.results.find(x=>x.kind===kind);assert.equal(r?.result,'PASS');assert.equal(r.reference_count,1);assert.ok(r.capability_keys.length>=3)}
console.log('PILOT PROVIDER JUDGE PASS',sha)
