import test from'node:test'
import assert from'node:assert/strict'
import{readFile,readdir}from'node:fs/promises'
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


test('isolated RPC/RLS workflow self-repairs TEST identities when privileged TEST key is available',async()=>{
 const yml=await read('.github/workflows/isolated-rpc-rls.yml')
 assert.match(yml,/UGO_TEST_SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY \}\}/)
 assert.match(yml,/Repair isolated TEST identities from GitHub Secrets/)
 assert.match(yml,/npm run bootstrap:test-auth/)
 assert.match(yml,/env\.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY != ''/)
 assert.match(yml,/env\.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY == ''/)
 assert.doesNotMatch(yml,/UGO_TEST_SUPABASE_SERVICE_ROLE_KEY:\s*sb_/)
})


test('CI never reuses the human TEST client identity',async()=>{
 const forbidden='cliente@ugo.com.ar'
 const workflowDir=new URL('../../.github/workflows/',import.meta.url)
 const workflows=(await readdir(workflowDir)).filter(name=>/\.ya?ml$/i.test(name))
 const offenders=[]
 for(const name of workflows){
  const source=await readFile(new URL(name,workflowDir),'utf8')
  if(source.includes(forbidden))offenders.push('.github/workflows/'+name)
 }
 const bootstrap=await read('scripts/bootstrap-test-auth.mjs')
 if(bootstrap.includes(forbidden)&&!/HUMAN_TEST_EMAILS/.test(bootstrap))offenders.push('scripts/bootstrap-test-auth.mjs')
 assert.deepEqual(offenders,[],'La identidad humana TEST no puede ser usada por CI: '+offenders.join(', '))
 assert.match(bootstrap,/cliente\.ugo\.test@example\.com/)
 assert.match(bootstrap,/refusing to mutate human TEST identity/)
})
