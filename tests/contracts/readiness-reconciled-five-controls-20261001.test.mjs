import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const readiness = JSON.parse(fs.readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const items = readiness.groups.flatMap(group => group.items || [])
const byId = new Map(items.map(item => [item.id,item]))

const controls = {
  'client-navigation':'docs/evidence/readiness-client-navigation-20260929.json',
  'client-request':'docs/evidence/readiness-client-request-20260929.json',
  'client-payment':'docs/evidence/readiness-client-payment-20260930.json',
  'client-notifications':'docs/ugo-readiness-evidence/readiness-client-notifications-20260930.json',
  'admin-navigation':'docs/evidence/readiness-admin-navigation-20260929.json',
}

test('five reconciled controls stay aligned with persisted DONE + Judge + Sentinel evidence', () => {
  for (const [id,evidencePath] of Object.entries(controls)) {
    const item = byId.get(id)
    assert.ok(item, id)
    assert.equal(item.status,'VERIFIED',id)
    assert.equal(item.evidence_path,evidencePath,id)
    assert.equal(item.reconciled_from_persisted_evidence,true,id)

    const lock = JSON.parse(fs.readFileSync(`docs/ugo-work-locks/readiness-${id}.json`,'utf8'))
    assert.equal(lock.status,'DONE',id)
    const validators = lock.validators_result || lock.validation || {}
    assert.equal(String(validators.Judge || validators.judge).toUpperCase(),'PASS',id)
    assert.equal(String(validators.Sentinel || validators.sentinel).toUpperCase(),'PASS',id)
    assert.ok(Array.isArray(lock.evidence_ids) && lock.evidence_ids.length > 0,id)
    assert.ok(fs.existsSync(evidencePath),id)
  }
})
