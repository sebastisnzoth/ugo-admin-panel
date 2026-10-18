import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

test('Super Admin checks persisted autonomy mode before treating API response as success',async()=>{
 const src=await readFile(new URL('../../src/mvp/SuperAdminCommandCenter.tsx',import.meta.url),'utf8')
 const handler=src.split('const handleAutonomyModeChange=')[1]?.split('if(!authorized&&!loading)')[0]
 assert.ok(handler)
 assert.match(handler,/superadmin_evaluate_autonomy_on_gate/)
 assert.match(handler,/gate\?\.status!=='READY'/)
 assert.match(handler,/\.from\('autonomous_company_state'\)\.select\('mode'\)\.maybeSingle\(\)/)
 assert.match(handler,/persisted\.mode!==mode/)
 assert.match(handler,/await load\(\)/)
})
