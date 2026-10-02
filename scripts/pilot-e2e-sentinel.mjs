import assert from'node:assert/strict'
import fs from'node:fs'
const e=JSON.parse(fs.readFileSync('artifacts/pilot-e2e-runtime.json','utf8'));assert.equal(e.result,'PASS')
for(const r of e.results){assert.equal(r.service.ambiente,'demo');assert.ok(r.states.includes('llegado'));assert.ok(r.payment.some(p=>p.method==='efectivo'&&p.confirmed_at));assert.ok(r.debt_rows.every(d=>d.environment!=='real'));assert.equal(r.audit_judge.mixed_service_count,0);assert.equal(r.audit_judge.missing_events.length,0)}
console.log('PILOT E2E SENTINEL PASS')
