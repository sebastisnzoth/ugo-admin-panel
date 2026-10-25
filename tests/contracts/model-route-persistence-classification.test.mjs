import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source=fs.readFileSync('scripts/openrouter-autonomy-probe.mjs','utf8')
const start=source.indexOf('function isRetryablePersistenceError(')
const end=source.indexOf('async function persist(',start)
assert.ok(start>=0&&end>start,'retry classification must precede persist')
const module={exports:{}}
vm.runInNewContext(source.slice(start,end)+'\nmodule.exports.retryable=isRetryablePersistenceError;',{
  module,exports:module.exports,
})
const retryable=module.exports.retryable

test('PostgREST schema cache connection outage is retryable, not a permanent schema failure',()=>{
  assert.equal(retryable({message:'Could not query the database for the schema cache. Retrying.'}),true)
  assert.equal(retryable({code:'PGRST002',message:'Database unavailable'}),true)
  assert.equal(retryable({message:'Connection terminated due to connection timeout'}),true)
})

test('permissions, missing table and policy failures still fail closed',()=>{
  assert.equal(retryable({message:'permission denied for table autonomous_model_candidates'}),false)
  assert.equal(retryable({message:'relation autonomous_model_candidates does not exist'}),false)
  assert.equal(retryable({code:'42501',message:'permission denied'}),false)
})

test('both Supabase response errors and thrown errors use the same classification',()=>{
  assert.equal((source.match(/const retryable=isRetryablePersistenceError\(error\)/g)||[]).length,2)
  assert.equal(retryable({message:'Gateway Timeout',code:'504'}),true)
  assert.equal(retryable(new Error('upstream unavailable')),true)
})
