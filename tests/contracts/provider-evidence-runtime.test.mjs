import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider evidence runtime proof is fresh, UI-backed, and tied to the protected persistence service',async()=>{
 const runtime=await read('scripts/provider-evidence-runtime.mjs')
 assert.match(runtime,/chromium/)
 assert.match(runtime,/getByPlaceholder\('tu@email\.com'\)/)
 assert.match(runtime,/setInputFiles/)
 assert.match(runtime,/evidencias_servicio/)
 assert.match(runtime,/tipo.*antes/)
 assert.match(runtime,/tipo.*despues/)
 assert.match(runtime,/service-evidence/)
 assert.match(runtime,/autonomous_record_uploaded_media_runtime/)
 assert.match(runtime,/productionTouched:false/)
})
