import test from 'node:test'
import assert from 'node:assert/strict'
import{execFileSync}from'node:child_process'
test('i18n JSX audit produces transparent remaining-backlog report',()=>{
 const output=execFileSync(process.execPath,['scripts/audit-i18n.mjs','--json'],{encoding:'utf8'})
 const report=JSON.parse(output)
 assert.ok(report.estimatedVisibleLiterals>=0)
 assert.ok(Array.isArray(report.files))
 assert.equal(typeof report.byArea,'object')
})
