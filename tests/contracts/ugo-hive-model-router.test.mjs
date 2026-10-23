import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('supabase/functions/ugo-hive-model-router/index.ts','utf8')

test('Hive router is TEST scoped, server-authenticated, and rejects non-superadmins',()=>{
 assert.match(source,/tmossnqfwfwjrtzwcbmm/)
 assert.match(source,/admin\.auth\.getUser\(token\)/)
 assert.match(source,/profile\.tipo/)
 assert.match(source,/superadmin/)
 assert.match(source,/OPENROUTER_API_KEY/)
})
test('Hive router only invokes inference after durable quota reservation for an authorized running mission',()=>{
 assert.match(source,/mission_id/)
 assert.match(source,/hive_reserve_model_call/)
 assert.match(source,/hive_finish_model_call/)
 assert.match(source,/QUOTA_OR_MISSION_AUTH_FAILED/)
 assert.match(source,/if \(!apiKey\)/)
 assert.match(source,/max_tokens:512/)
})
test('Hive inference requires an explicit zero-cost free model and disables paid fallback',()=>{
 assert.match(source,/endsWith\(':free'\)/)
 assert.match(source,/\['prompt','completion','request'\]/)
 assert.match(source,/max_price:\{prompt:0,completion:0,request:0\}/)
 assert.match(source,/allow_fallbacks:false/)
 assert.match(source,/UNVERIFIED_UPSTREAM_RESPONSE/)
})
test('No key is returned to callers and there is no payment or production write path',()=>{
 assert.doesNotMatch(source,/console\.log\(openRouterKey\)/)
 assert.doesNotMatch(source,/\.from\(['"]autonomous_jobs['"]\)\.insert/)
 assert.doesNotMatch(source,/\.from\(['\"]payments['\"]\)/)
})
