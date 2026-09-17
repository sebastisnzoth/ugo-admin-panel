import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client evidence gallery isolates realtime topics per mounted instance and effect generation',async()=>{
 const gallery=await read('src/mvp/ClientEvidenceGallery.tsx')
 assert.match(gallery,/useId\(\)\.replace\(\/:\/g,''\)/)
 assert.match(gallery,/channelGeneration=useRef\(0\)/)
 assert.match(gallery,/generation=\+\+channelGeneration\.current/)
 assert.match(gallery,/topic=`client-evidence-\$\{serviceId\}-\$\{instanceId\}-\$\{generation\}`/)
 assert.match(gallery,/supabase\.channel\(topic\)\.on\('postgres_changes'/)
 assert.match(gallery,/void supabase\.removeChannel\(ch\)/)
})
