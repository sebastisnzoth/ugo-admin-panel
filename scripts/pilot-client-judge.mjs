import assert from'node:assert/strict'
import fs from'node:fs'
const sha=process.env.UGO_RUNTIME_SHA||'',e=JSON.parse(fs.readFileSync('artifacts/pilot-client-runtime.json','utf8'))
assert.equal(e.sha,sha);assert.equal(e.environment,'UGO TEST');assert.equal(e.result,'PASS');assert.equal(e.results.length,2)
for(const kind of ['faxina','marido']){const r=e.results.find(x=>x.kind===kind);assert.ok(r?.service_id);assert.equal(r.result,'PASS');assert.ok(r.programado_para&&r.scheduled_end_at)}
console.log('PILOT CLIENT JUDGE PASS',sha)
