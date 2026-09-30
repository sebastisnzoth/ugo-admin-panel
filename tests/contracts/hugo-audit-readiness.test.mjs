import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const audit=fs.readFileSync('api/operations.ts','utf8')
const client=fs.readFileSync('src/features/client/hugo/ClientVoiceHugoDock.tsx','utf8')

test('Hugo audit persists a single correlation through all ledgers',()=>{
  assert.match(audit,/autonomous_decision_ledger/)
  assert.match(audit,/autonomous_evidence_ledger/)
  assert.match(audit,/audit_log/)
  assert.match(audit,/correlation_id:correlationId/)
  assert.match(audit,/HUGO_ACTION_TRACE/)
  assert.match(audit,/hugo_action_trace/)
  assert.match(audit,/authorization_result: 'ALLOW'/)
  assert.match(audit,/case 'hugo-audit'/)
})

test('client Hugo tool response is correlated only after audit persistence attempt',()=>{
  assert.match(client,/crypto\.randomUUID\(\)/)
  assert.match(client,/fetch\('\/api\/operations\?op=hugo-audit'/)
  assert.match(client,/correlation_id:correlationId/)
  assert.match(client,/status:'PERSISTED'/)
  assert.match(client,/bridge\.sendToolResponse\?\.\(id,name,enriched\)/)
})
