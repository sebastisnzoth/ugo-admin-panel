import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('scripts/autonomous-qa-auth-runtime.mjs','utf8')

test('auth QA snapshots autonomy mode before privilege probe',()=>{
  assert.ok(source.includes("from('autonomous_company_state').select('mode,reason')"))
  assert.match(source,/initialAutonomy/)
})

test('superadmin OFF probe always restores the previous mode in finally',()=>{
  assert.match(source,/QA superadmin privilege-boundary probe/)
  const finallyBlock=source.slice(source.indexOf('}finally{'))
  assert.match(finallyBlock,/superadmin_set_autonomy_mode/)
  assert.match(finallyBlock,/p_mode:initialAutonomy\.mode/)
  assert.match(finallyBlock,/p_reason:initialAutonomy\.reason\|\|/)
  assert.ok(finallyBlock.indexOf("superadmin_set_autonomy_mode")<finallyBlock.indexOf("sa.sb.auth.signOut()"))
})
