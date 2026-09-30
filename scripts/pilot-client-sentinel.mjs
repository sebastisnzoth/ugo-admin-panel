import assert from'node:assert/strict'
import fs from'node:fs'
const e=JSON.parse(fs.readFileSync('artifacts/pilot-client-runtime.json','utf8'));assert.equal(e.result,'PASS')
for(const r of e.results){assert.ok(r.service_id);assert.ok(r.pilot_details);if(r.kind==='marido')assert.notEqual(r.pilot_details.height,'Más de 2 m · requiere revisión')}
console.log('PILOT CLIENT SENTINEL PASS')
