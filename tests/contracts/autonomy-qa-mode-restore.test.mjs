import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')

test('auth QA snapshots autonomy mode before privilege probe',()=>{
  assert.ok(source.includes("from('autonomous_company_state').select('mode,reason')"))
  assert.match(source,/initialAutonomy/)
})

test('superadmin OFF probe uses a unique audit reason',()=>{
  assert.ok(source.includes("const autonomyProbeReason=`QA superadmin privilege-boundary probe:${crypto.randomUUID()}`"))
  assert.ok(source.includes("p_reason:autonomyProbeReason"))
})

test('QA restores only when its own temporary OFF state is still current',()=>{
  const finallyBlock=source.slice(source.indexOf('}finally{'))
  assert.ok(finallyBlock.includes("currentAutonomy?.mode==='OFF'"))
  assert.ok(finallyBlock.includes("currentAutonomy?.reason===autonomyProbeReason"))
  assert.ok(finallyBlock.includes("superadmin_set_autonomy_mode"))
  assert.ok(finallyBlock.includes("p_mode:initialAutonomy.mode"))
  assert.ok(finallyBlock.indexOf("currentAutonomy?.reason===autonomyProbeReason")<finallyBlock.indexOf("superadmin_set_autonomy_mode"))
})
