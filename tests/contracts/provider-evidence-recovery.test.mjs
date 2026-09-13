import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/mvp/provider/ProviderEvidencePanel.tsx',import.meta.url),'utf8')

test('provider evidence subscription stays scoped to the active service',()=>{
 assert.match(source,/table:'evidencias_servicio',filter:`servicio_id=eq\.\$\{service\.id\}`/)
})

test('provider evidence rehydrates persisted readiness after reconnect',()=>{
 assert.match(source,/status==='SUBSCRIBED'/)
 assert.match(source,/addEventListener\('online',onOnline\)/)
 assert.match(source,/visibilityState==='visible'/)
})

test('ambiguous evidence upload treats the persisted row as success and continues the simple action',()=>{
 assert.match(source,/\.eq\('servicio_id',service\.id\)\.eq\('storage_path',path\)\.maybeSingle\(\)/)
 assert.match(source,/async function finishUpload\(uploadedKind:EvidenceType\)\{await load\(\);await onUploaded\?\.\(uploadedKind\)\}/)
 assert.match(source,/if\(persisted\)\{await finishUpload\(effectiveKind\);return\}/)
 assert.match(source,/if\(insertError\)[\s\S]*if\(persisted\)[\s\S]*remove\(\[path\]\)/)
})
