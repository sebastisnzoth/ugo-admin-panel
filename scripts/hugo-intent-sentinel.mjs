import assert from'node:assert/strict'
import fs from'node:fs/promises'
const sha=process.env.UGO_RUNTIME_SHA||''
const[runtime,catalog,dock,intent]=await Promise.all([
 fs.readFile('artifacts/hugo-intent-runtime.json','utf8').then(JSON.parse),
 fs.readFile('src/mvp/voiceCatalog.ts','utf8'),
 fs.readFile('src/features/client/hugo/ClientVoiceHugoDock.tsx','utf8'),
 fs.readFile('src/features/client/hugo/hugoVoiceIntent.ts','utf8')
])
assert.equal(runtime.sha,sha)
assert.equal(runtime.environment,'UGO TEST')
assert.equal(runtime.production_touched,false)
assert.match(dock,/resolveVoiceCategory\(String\(args\.category\|\|''\)\)/)
assert.match(catalog,/from\('categorias'\)/)
assert.match(catalog,/eq\('activa',true\)/)
assert.match(catalog,/plomero\|plomeria\|fontanero\|encanador/)
assert.match(catalog,/pintor\|pintura\|pintar\|repintar/)
assert.match(intent,/resolveHugoGlobalCommand/)
assert.match(intent,/parseHugoWhen/)
assert.ok(runtime.category_results.every(row=>row.status==='PASS'))
assert.ok(runtime.action_results.every(row=>row.status==='PASS'))
const evidence={validator:'Sentinel',readiness_id:'hugo-intent',sha,correlation_id:runtime.correlation_id,result:'PASS',checks:['client-tool-wired-to-production-resolver','active-catalog-source','plumbing-synonyms','painting-synonyms','flow-action-parser','runtime-all-pass','test-only'],validated_at:new Date().toISOString()}
await fs.writeFile('artifacts/hugo-intent-sentinel.json',JSON.stringify(evidence,null,2)+'\n')
console.log(JSON.stringify(evidence))
