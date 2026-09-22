import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider evidence panel delegates persistence to feature service',async()=>{const[screen,service]=await Promise.all([read('src/mvp/provider/ProviderEvidencePanel.tsx'),read('src/features/provider/services/providerEvidenceService.ts')]);assert.doesNotMatch(screen,/\.from\('evidencias_servicio'\)|storage\.from\(|createSignedUrl/);assert.match(screen,/loadServiceEvidence\(service\.id\)/);assert.match(screen,/uploadServiceEvidence\(service\.id,effectiveKind,file\)/);assert.match(screen,/file\.size>10\*1024\*1024/);assert.match(screen,/provider-evidence-\$\{service\.id\}/);assert.match(service,/\.from\('evidencias_servicio'\)/);assert.match(service,/SERVICE_EVIDENCE_BUCKET/);assert.match(service,/remove\(\[path\]\)/)})
