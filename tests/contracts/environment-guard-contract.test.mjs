import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')
const TEST_REF='tmossnqfwfwjrtzwcbmm'
const PROD_REF='trfsjuseqjxlhrxuvdsm'

test('build and test run the TEST environment guard before product checks',async()=>{
 const pkg=JSON.parse(await read('package.json'))
 assert.equal(pkg.scripts['verify:test-env'],'node scripts/assert-test-environment.mjs')
 assert.match(pkg.scripts.build,/verify:test-env/)
 assert.match(pkg.scripts.test,/verify:test-env/)
})

test('browser SDK is hard-pinned to TEST and production ref is absent',async()=>{
 const project=await read('src/lib/supabaseProject.ts')
 assert.match(project,new RegExp(TEST_REF))
 assert.match(project,/UGO_ENVIRONMENT\s*=\s*['"]test['"]/)
 assert.doesNotMatch(project,new RegExp(PROD_REF))
})

test('environment guard rejects production Supabase configuration',async()=>{
 const guard=await read('scripts/assert-test-environment.mjs')
 assert.match(guard,new RegExp(TEST_REF))
 assert.match(guard,new RegExp(PROD_REF))
 assert.match(guard,/includes\('SUPABASE'\)/)
 assert.match(guard,/process\.exitCode=1/)
 assert.match(guard,/api\/proxy\.js/)
 assert.match(guard,/api\/operations\.ts/)
 assert.match(guard,/vercel\.json/)
})
