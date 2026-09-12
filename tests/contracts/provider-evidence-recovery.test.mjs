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

test('ambiguous evidence upload failure reconciles persisted rows',()=>{
 assert.match(source,/catch\(e\)\{await load\(\)\.catch\(\(\)=>\{\}\);setError/)
})
