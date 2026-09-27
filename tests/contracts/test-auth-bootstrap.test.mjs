import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('TEST auth bootstrap is hard-pinned to isolated project and never production',async()=>{
 const s=await read('scripts/bootstrap-test-auth.mjs')
 assert.match(s,/TEST_REF='tmossnqfwfwjrtzwcbmm'/)
 assert.match(s,/PROD_REF='trfsjuseqjxlhrxuvdsm'/)
 assert.match(s,/refusing any project other than designated UGO TEST/)
 assert.match(s,/UGO_TEST_SUPABASE_SERVICE_ROLE_KEY/)
 assert.match(s,/auth\.admin\.updateUserById/)
 assert.match(s,/email_confirm:true/)
 assert.doesNotMatch(s,/console\.log\([^\n]*password/i)
})

test('TEST auth bootstrap only repairs pre-existing role-matched active identities',async()=>{
 const s=await read('scripts/bootstrap-test-auth.mjs')
 assert.match(s,/TEST identity does not exist/)
 assert.match(s,/unexpected public\.usuarios role/)
 assert.match(s,/TEST identity is inactive/)
 assert.match(s,/\['admin','superadmin'\]/)
})

test('manual repair workflow keeps privileged key in GitHub Secrets',async()=>{
 const yml=await read('.github/workflows/repair-test-auth.yml')
 assert.match(yml,/workflow_dispatch:/)
 assert.match(yml,/secrets\.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY/)
 assert.match(yml,/npm run bootstrap:test-auth/)
 assert.match(yml,/npm run test:integration/)
 assert.doesNotMatch(yml,/service_role.*sb_/i)
})
