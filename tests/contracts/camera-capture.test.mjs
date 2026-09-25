import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client and provider use live camera capture with gallery fallback',async()=>{
 const[camera,client,provider]=await Promise.all([
  read('src/shared/media/CameraCaptureButton.tsx'),
  read('src/features/client/request/ClientRequestEvidence.tsx'),
  read('src/mvp/provider/ProviderEvidencePanel.tsx')
 ])
 assert.match(camera,/mediaDevices\.getUserMedia/)
 assert.match(camera,/facingMode:\{ideal:'environment'\}/)
 assert.match(camera,/canvas\.toBlob/)
 assert.match(camera,/capture="environment"/)
 assert.match(client,/CameraCaptureButton/)
 assert.match(client,/Elegir foto/)
 assert.match(provider,/CameraCaptureButton/)
 assert.match(provider,/Elegir foto/)
})

test('android webview grants video capture after runtime camera permission',async()=>{
 const source=await read('android-apk/app/src/main/java/com/ugo/mobile/MainActivity.java')
 assert.match(source,/RESOURCE_VIDEO_CAPTURE/)
 assert.match(source,/Manifest\.permission\.CAMERA/)
 assert.match(source,/CAMERA_REQUEST/)
 assert.match(source,/resolvePendingWebPermissionRequest/)
})
