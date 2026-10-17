import test from 'node:test'
import assert from 'node:assert/strict'
import{execFileSync}from'node:child_process'
test('i18n JSX audit produces transparent remaining-backlog report',()=>{
 const output=execFileSync(process.execPath,['scripts/audit-i18n.mjs','--json'],{encoding:'utf8'})
 const report=JSON.parse(output)
 assert.ok(report.estimatedVisibleLiterals>=0)
 console.log('UGO_I18N_AUDIT_TOTAL',report.estimatedVisibleLiterals,'BY_AREA',JSON.stringify(report.byArea))
 assert.ok(Array.isArray(report.files))
 assert.equal(typeof report.byArea,'object')
 assert.equal(report.actionableVisibleLiterals,0,'all remaining JSX literals must be translated or specifically classified')
 assert.ok(report.excludedLiteralCount>0)
})
