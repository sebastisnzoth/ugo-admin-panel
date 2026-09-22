import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'
const screen=fs.readFileSync(new URL('../../src/mvp/provider/ProviderEvidencePanel.tsx',import.meta.url),'utf8'),service=fs.readFileSync(new URL('../../src/features/provider/services/providerEvidenceService.ts',import.meta.url),'utf8')
test('provider evidence subscription stays scoped to the active service',()=>{assert.match(screen,/table:'evidencias_servicio',filter:\`servicio_id=eq\.\$\{service\.id\}\`/)})
test('provider evidence rehydrates persisted readiness after reconnect',()=>{assert.match(screen,/status==='SUBSCRIBED'/);assert.match(screen,/addEventListener\('online',onOnline\)/);assert.match(screen,/visibilityState==='visible'/)})
test('ambiguous evidence upload treats persisted row as success and preserves recovery',()=>{assert.match(service,/\.eq\('servicio_id',serviceId\)\.eq\('storage_path',path\)\.maybeSingle\(\)/);assert.match(screen,/async function finishUpload\(uploadedKind:EvidenceType\)\{await load\(\);await onUploaded\?\.\(uploadedKind\)\}/);assert.match(screen,/await uploadServiceEvidence\(service\.id,effectiveKind,file\);await finishUpload\(effectiveKind\)/);assert.match(service,/if\(insertError\)[\s\S]*if\(persisted\)return;[\s\S]*remove\(\[path\]\)/)})
