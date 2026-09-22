import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider evidence keeps storage and realtime contracts while using shared UI',async()=>{const s=await read('src/mvp/provider/ProviderEvidencePanel.tsx');for(const x of ['Card','Select'])assert.match(s,new RegExp(x));assert.match(s,/service-evidence/);assert.match(s,/evidencias_servicio/);assert.match(s,/provider-evidence-\$\{service\.id\}/);assert.match(s,/10\*1024\*1024/)})
test('request evidence and sidebar consume shared primitives',async()=>{const[r,n]=await Promise.all([read('src/mvp/provider/ProviderRequestEvidence.tsx'),read('src/mvp/provider/ProviderStudioSidebar.tsx')]);for(const x of ['LoadingState','EmptyState','Button'])assert.match(r,new RegExp(x));assert.match(r,/request-evidence/);assert.match(r,/evidencias_solicitud/);assert.match(n,/StatusPill/);assert.match(n,/Button/);assert.match(n,/d\.toggleOnline\(\)/)})
