import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const readiness = JSON.parse(fs.readFileSync('docs/UGO_FUNCTIONAL_READINESS.json','utf8'))
const items = readiness.groups.flatMap(group => group.items || [])
const byId = new Map(items.map(item => [item.id,item]))

const controls = {
  'admin-auth':'docs/evidence/admin-auth-20260929.json',
  'admin-realtime':'docs/evidence/readiness-admin-realtime-20260929.json',
  'admin-users':'docs/evidence/readiness-admin-users-20260929.json',
  'cross-security':'docs/evidence/readiness-cross-security-20260930.json',
  'hugo-timeout':'docs/evidence/readiness-hugo-timeout-20260930.json',
}

test('second autonomous readiness batch stays aligned with DONE + Judge + Sentinel evidence', () => {
  for (const [id,evidencePath] of Object.entries(controls)) {
    const item = byId.get(id)
    assert.ok(item, id)
    assert.equal(item.status,'VERIFIED',id)
    assert.equal(item.evidence_path,evidencePath,id)
    assert.equal(item.reconciled_from_persisted_evidence,true,id)

    const lock = JSON.parse(fs.readFileSync(`docs/ugo-work-locks/readiness-${id}.json`,'utf8'))
    assert.equal(lock.status,'DONE',id)
    const validators = lock.validators_result || lock.validator_results || lock.validation || {}
    assert.equal(String(validators.Judge || validators.judge).toUpperCase(),'PASS',id)
    assert.equal(String(validators.Sentinel || validators.sentinel).toUpperCase(),'PASS',id)
    assert.ok(Array.isArray(lock.evidence_ids) && lock.evidence_ids.length > 0,id)
    assert.ok(fs.existsSync(evidencePath),id)
  }
})
