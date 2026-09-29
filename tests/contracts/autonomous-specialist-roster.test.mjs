import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260929070000_canonical_corporate_specialists.sql', 'utf8')
const entries = [...sql.matchAll(/^\((\d+),'([^']+)','([^']+)',/gm)]

test('all requested department specialists have a unique catalog identity', () => {
  assert.equal(entries.length, 99)
  assert.equal(new Set(entries.map((entry) => entry[2])).size, entries.length)
  assert.deepEqual([...new Set(entries.map((entry) => Number(entry[1])))].sort((a, b) => a - b),
    Array.from({ length: 12 }, (_, index) => index + 1))
  for (const name of ['Client Simulator', 'Provider Simulator', 'Admin/System Simulator',
    'Voice of Client Agent', 'Voice of Provider Agent', 'IP Gate Agent', 'Model Router Agent']) {
    assert.ok(entries.some((entry) => entry[3] === name), name)
  }
})

test('new specialists cannot execute or claim unverified model access', () => {
  assert.ok(entries.every((entry) => ![13, 14].includes(Number(entry[1]))))
  assert.match(sql, /'DISABLED',null,null,'\[\]'::jsonb/g)
  assert.match(sql, /on conflict\(agent_key\) do nothing/)
  const connector = readFileSync('scripts/connect-autonomous-agents-openrouter.mjs', 'utf8')
  assert.match(connector, /agent\.status==='DISABLED'/)
  assert.match(connector, /\.neq\('status','DISABLED'\)/)
})

test('D9 regression and release-gate specialists remain disabled during validation', () => {
  const guard = readFileSync('supabase/migrations/20260929123000_specialist_validation_state_guard.sql', 'utf8')
  assert.match(guard, /agent_key in \('regression-agent','release-gate-agent'\)/)
  assert.match(guard, /set status='DISABLED'/)
  assert.match(guard, /SPECIALIST_MUST_REMAIN_DISABLED_DURING_VALIDATION/)
  assert.match(guard, /revoke all on function public\.autonomous_validate_specialist\(text\) from public,anon,authenticated/)
  assert.match(guard, /grant execute on function public\.autonomous_validate_specialist\(text\) to service_role/)
})


test('latest owner-integrity guard preserves validation-only specialist proofs', () => {
  const guard = readFileSync('supabase/migrations/20260929170000_specialist_validation_owner_integrity_fix.sql', 'utf8')
  assert.match(guard, /AUTONOMOUS_AGENT_REQUIRED/)
  assert.match(guard, /agent\.agent_key in \('regression-agent','release-gate-agent'\)/)
  assert.match(guard, /AUTHORIZED_VALIDATION_ONLY/)
  assert.match(guard, /qa\.regression_reconcile_validation/)
  assert.match(guard, /qa\.release_gate_verify_validation/)
  assert.match(guard, /and not validation_only/)
  assert.match(guard, /AUTONOMOUS_AGENT_AUTHORITY_DOWNGRADE/)
})
