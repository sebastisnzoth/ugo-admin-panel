import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-payment-runtime.json','utf8'))
assert.equal(p.sha,sha);assert.equal(p.environment,'UGO TEST');assert.equal(p.production_touched,false);assert.equal(p.result,'PASS');assert.equal(p.cleanup_ok,true)
assert.equal(p.service_state,'completado');assert.equal(p.payment_state,'liberado');assert.equal(p.repeated_confirmation,true)
assert.equal(p.payment_rows,1);assert.equal(p.debt_rows,1);assert.equal(p.audit_rows,1);assert.equal(p.debt.commission,18)
const out={validator:'Judge',result:'PASS',readiness_id:'client-payment',sha,service_id:p.service_id,payment_id:p.payment_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-payment-judge.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
