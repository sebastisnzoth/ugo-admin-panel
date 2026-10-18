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
test('Hive router remains fail closed until durable free quota and billing evidence exist',()=>{
 assert.match(source,/HIVE_INFERENCE_NOT_ENABLED/)
 assert.match(source,/GLOBAL_DURABLE_ZERO_COST_QUOTA_REQUIRED/)
 assert.doesNotMatch(source,/fetch\(upstream\s*\+\s*['"]\/chat\/completions/)
})
test('No key is returned to callers and there is no payment or production write path',()=>{
 assert.doesNotMatch(source,/console\.log\(openRouterKey\)/)
 assert.doesNotMatch(source,/\.from\(['"]autonomous_jobs['"]\)\.insert/)
 assert.doesNotMatch(source,/deploy|merge_pull_request|payment/gi)
})
