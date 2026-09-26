import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client and provider expose separate camera and gallery actions',async()=>{const[client,provider]=await Promise.all([read('src/features/client/request/ClientRequestEvidence.tsx'),read('src/mvp/provider/ProviderEvidencePanel.tsx')]);for(const source of[client,provider]){assert.match(source,/capturePhotoFromCamera/);assert.match(source,/Sacar foto/);assert.match(source,/Elegir foto/);assert.match(source,/accept="image\/\*"/)}assert.doesNotMatch(client,/accept="image\/\*" capture=/);assert.doesNotMatch(provider,/accept="image\/\*" capture=/)})

test('camera helper prefers native rear-camera capture on mobile and falls back when desktop has no camera',async()=>{const helper=await read('src/lib/cameraCapture.ts');assert.match(helper,/input\.type='file'/);assert.match(helper,/input\.accept='image\/\*'/);assert.match(helper,/setAttribute\('capture','environment'\)/);assert.match(helper,/Android\|iPhone\|iPad\|iPod/);assert.match(helper,/NotFoundError/);assert.match(helper,/pickCameraFile\(\)/);assert.match(helper,/navigator\.mediaDevices\?\.getUserMedia/);assert.match(helper,/getTracks\(\)\.forEach\(track=>track\.stop\(\)/)})
