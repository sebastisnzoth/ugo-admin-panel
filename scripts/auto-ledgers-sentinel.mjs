import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const p=JSON.parse(await fs.readFile('artifacts/auto-ledgers-runtime.json','utf8'))
const migration=await fs.readFile('supabase/migrations/20260927234500_autonomous_corporation_foundation.sql','utf8')
assert.equal(p.sha,sha)
assert.equal(p.result,'PASS')
assert.match(migration,/autonomous_decision_ledger/)
assert.match(migration,/autonomous_evidence_ledger/)
assert.match(migration,/AUTONOMOUS_LEDGER_APPEND_ONLY/)
assert.match(migration,/before update or delete on public\.autonomous_decision_ledger/)
assert.match(migration,/before update or delete on public\.autonomous_evidence_ledger/)
assert.equal(p.assertions.same_correlation_id,true)
assert.equal(p.assertions.decision_references_evidence,true)
const out={validator:'Sentinel',result:'PASS',readiness_id:'auto-ledgers',sha,correlation_id:p.correlation_id,checked_at:new Date().toISOString()}
await fs.writeFile('artifacts/auto-ledgers-sentinel.json',JSON.stringify(out,null,2)+'\n')
console.log(JSON.stringify(out))
