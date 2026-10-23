import test from 'node:test'
import assert from 'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin user list discards stale concurrent Realtime fetches while keeping newest count and rows',async()=>{
 const source=await read('src/mvp/AdminUsersPanel.tsx')
 assert.match(source,/const usersLoadRevision=React\.useRef\(0\)/)
 assert.match(source,/const requestRevision=\+\+usersLoadRevision\.current/)
 assert.match(source,/if\(requestRevision!==usersLoadRevision\.current\)return\s+setTotalCount\(count\?\?0\)/)
 assert.match(source,/setRows\(\(\(users\|\|\[\]\) as UserRow\[\]\)\.map/)
 assert.match(source,/if\(!verified\|\|verified\.id!==r\.id\|\|verified\.activo!==next\)throw new Error/)
})

test('autonomy UI proof waits for persisted value but rejects UI or backend divergence',async()=>{
 const script=await read('scripts/role-ui-runtime.mjs')
 assert.match(script,/if\(before\.data\?\.mode!=='OFF'\)/)
 assert.match(script,/await page\.waitForFunction\(expected=>\{/)
 assert.match(script,/getAttribute\('aria-checked'\)==='true'/)
 assert.match(script,/assert\.equal\(current\.data\?\.mode,before\.data\.mode,'AUTONOMY_TEST_MODE_CHANGED_DURING_PROOF'\)/)
 assert.match(script,/const current=await privileged\.from\('autonomous_company_state'\)\.select\('mode'\)\.maybeSingle\(\)/)
 assert.doesNotMatch(script,/UPDATE autonomous_company_state/i)
})
