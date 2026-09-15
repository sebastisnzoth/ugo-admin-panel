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

test('environment guard rejects production Supabase configuration across all runtime code',async()=>{
 const guard=await read('scripts/assert-test-environment.mjs')
 assert.match(guard,new RegExp(TEST_REF))
 assert.match(guard,new RegExp(PROD_REF))
 assert.match(guard,/includes\('SUPABASE'\)/)
 assert.match(guard,/process\.exitCode=1/)
 assert.match(guard,/runtimeFiles\('api'\)/)
 assert.match(guard,/runtimeFiles\('src'\)/)
 assert.match(guard,/source\.includes\(PROD_REF\)/)
 assert.match(guard,/vercel\.json/)
})

test('Vercel automatic Git deployments stay disabled while hosting is intentionally paused',async()=>{
 const vercel=JSON.parse(await read('vercel.json'))
 assert.equal(vercel.git?.deploymentEnabled,false)
})

test('WhatsApp serverless fallback is TEST-only',async()=>{
 const source=await read('api/whatsapp/send.js')
 assert.match(source,new RegExp(TEST_REF))
 assert.doesNotMatch(source,new RegExp(PROD_REF))
})
