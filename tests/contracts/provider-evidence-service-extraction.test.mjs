import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider request evidence reads through feature service',async()=>{const[screen,service]=await Promise.all([read('src/mvp/provider/ProviderRequestEvidence.tsx'),read('src/features/provider/services/providerEvidenceService.ts')]);assert.doesNotMatch(screen,/\.from\('evidencias_solicitud'\)|createSignedUrl/);assert.match(service,/\.from\('evidencias_solicitud'\)/);assert.match(service,/REQUEST_EVIDENCE_BUCKET/);assert.match(screen,/provider-request-evidence-\$\{serviceId\}/)})
test('provider evidence service preserves storage and upload recovery contracts',async()=>{const service=await read('src/features/provider/services/providerEvidenceService.ts');assert.match(service,/SERVICE_EVIDENCE_BUCKET='service-evidence'/);assert.match(service,/REQUEST_EVIDENCE_BUCKET='request-evidence'/);assert.match(service,/\.from\('evidencias_servicio'\)/);assert.match(service,/10|createSignedUrl\(row\.storage_path,900\)/);assert.match(service,/remove\(\[path\]\)/)})
