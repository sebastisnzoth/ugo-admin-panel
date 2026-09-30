import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/client-payment-runtime.json','utf8'))
const migration=await fs.readFile('supabase/migrations/20260930134500_client_payment_cash_audit.sql','utf8')
const debt=await fs.readFile('supabase/migrations/20260920070000_cash_provider_ugo_debt_ledger.sql','utf8')
assert.equal(p.sha,sha);assert.equal(p.production_touched,false);assert.equal(p.cleanup_ok,true);assert.equal(p.environment,'UGO TEST')
assert.equal(p.debt_rows,1);assert.equal(p.audit_rows,1)
assert.match(migration,/old\.estado is distinct from 'liberado'/);assert.match(debt,/pago_id uuid not null unique/)
const out={validator:'Sentinel',result:'PASS',readiness_id:'client-payment',sha,production_touched:false,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/client-payment-sentinel.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out))
