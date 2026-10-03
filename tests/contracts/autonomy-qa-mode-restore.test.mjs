import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')

test('auth QA snapshots autonomy mode before privilege probe',()=>{
  assert.ok(source.includes("from('autonomous_company_state').select('mode,reason')"))
  assert.match(source,/initialAutonomy/)
})

test('superadmin OFF probe uses a unique audit reason',()=>{
  assert.match(source,/autonomyProbeReason=`QA superadmin privilege-boundary probe:${crypto.randomUUID()}`/)
  assert.match(source,/p_reason:autonomyProbeReason/)
})

test('QA restores only when its own temporary OFF state is still current',()=>{
  const finallyBlock=source.slice(source.indexOf('}finally{'))
  assert.match(finallyBlock,/currentAutonomy?.mode==='OFF'/)
  assert.match(finallyBlock,/currentAutonomy?.reason===autonomyProbeReason/)
  assert.match(finallyBlock,/superadmin_set_autonomy_mode/)
  assert.match(finallyBlock,/p_mode:initialAutonomy.mode/)
  assert.ok(finallyBlock.indexOf("currentAutonomy?.reason===autonomyProbeReason")<finallyBlock.indexOf("superadmin_set_autonomy_mode"))
})
