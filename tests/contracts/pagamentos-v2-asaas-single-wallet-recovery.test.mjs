import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'

const file=new URL('../../payments-sandbox/api/pix.js',import.meta.url)
const source=readFileSync(file,'utf8')
test('recovery endpoint passes syntax check',()=>{
 const result=spawnSync(process.execPath,['--check',file.pathname],{encoding:'utf8'})
 assert.equal(result.status,0,result.stderr)
})
test('uncertain intent cannot be blindly repeated without Asaas reference check',()=>{
 assert.match(source,/async function recoverCreate\(db\)/)
 assert.match(source,/row\.status!=='unknown_processor_result'/)
 assert.match(source,/row\.asaas_payment_id/)
 assert.match(source,/\/payments\?limit=2&offset=0&externalReference=/)
 assert.match(source,/list\.hasMore\|\|list\.data\.length!==0/)
 assert.match(source,/remote_payment_requires_manual_reconciliation/)
 assert.match(source,/updated_at < now\(\)-interval '2 minutes'/)
})
test('only one operator may claim recovery and processor errors stay fail-closed',()=>{
 assert.match(source,/status='unknown_processor_result' and asaas_payment_id is null/)
 assert.match(source,/if\(claim\.rows\.length!==1\)/)
 assert.match(source,/known4xx\?'manual_review':'unknown_processor_result'/)
 assert.match(source,/recovery_processor_result_uncertain/)
 assert.match(source,/action==='recover_create'\?await recoverCreate\(db\)/)
 assert.match(source,/UGO_TEST_OPERATOR_TOKEN/)
 assert.match(source,/VERCEL_ENV!=='preview'/)
})

test('Asaas validation details are whitelisted instead of leaking processor messages',()=>{
 assert.match(source,/detail\.errors\.map\(x=>x\?\.code\)/)
 assert.match(source,/\^\[A-Za-z0-9_-\]\{1,64\}\$/)
 assert.match(source,/processorValidationCodes/)
 assert.match(source,/rejected\?'manual_review':'unknown_processor_result'/)
 assert.doesNotMatch(source,/JSON\.stringify\(detail\)/)
})

test('Asaas validation descriptions never escape the API as unfiltered text',()=>{
 assert.match(source,/processorValidationFields/)
 assert.match(source,/allowedFields=new Set/)
 assert.match(source,/cpfCnpj/)
 assert.match(source,/externalReference/)
 assert.ok(source.includes("typeof x?.description==='string'"))
 assert.doesNotMatch(source,/processorValidationDescription[s]?:/)
 assert.ok(!source.includes('JSON.stringify(detail)'))
})

test('both charge paths preserve whitelisted validation fields through sanitized rethrow',()=>{
 const create=source.split('async function create(db){')[1]?.split('async function confirm(db){')[0]||''
 const recovery=source.split('async function recoverCreate(db){')[1]?.split('/**\n * Diagnostic')[0]||''
 for(const [name,section] of [['create',create],['recovery',recovery]]){
  assert.ok(section.includes('error.safeCodes=e.safeCodes||[]'),name+' must preserve safe codes')
  assert.ok(section.includes('error.safeFields=e.safeFields||[]'),name+' must preserve safe fields')
  assert.doesNotMatch(section,/error\.description\s*=/,name+' must not expose descriptions')
 }
})
