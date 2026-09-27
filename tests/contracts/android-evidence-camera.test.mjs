import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Android WebView evidence chooser offers camera and existing files',async()=>{
 const java=await read('android-apk/app/src/main/java/com/ugo/mobile/MainActivity.java')
 assert.match(java,/onShowFileChooser/)
 assert.match(java,/acceptsImage\(fileChooserParams\)/)
 assert.match(java,/MediaStore\.ACTION_IMAGE_CAPTURE/)
 assert.match(java,/Intent\.EXTRA_INITIAL_INTENTS/)
 assert.match(java,/MediaStore\.EXTRA_OUTPUT/)
 assert.match(java,/pendingCameraUri/)
 assert.match(java,/FileChooserParams\.parseResult/)
})

test('Android manifest makes camera capture intent visible',async()=>{
 const manifest=await read('android-apk/app/src/main/AndroidManifest.xml')
 assert.match(manifest,/android\.media\.action\.IMAGE_CAPTURE/)
 assert.match(manifest,/android\.permission\.CAMERA/)
})
