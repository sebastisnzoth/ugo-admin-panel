import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
test('client and provider camera actions request browser camera permission',async()=>{for(const p of ['../../src/features/client/request/ClientRequestEvidence.tsx','../../src/mvp/provider/ProviderEvidencePanel.tsx']){const s=await readFile(new URL(p,import.meta.url),'utf8');assert.match(s,/capturePhotoFromCamera/);assert.match(s,/Sacar foto|actionLabel/)}const helper=await readFile(new URL('../../src/lib/cameraCapture.ts',import.meta.url),'utf8');assert.match(helper,/navigator\.mediaDevices\?\.getUserMedia/);assert.match(helper,/facingMode:\{ideal:'environment'\}/);assert.match(helper,/getTracks\(\)\.forEach\(track=>track\.stop\(\)/)})
