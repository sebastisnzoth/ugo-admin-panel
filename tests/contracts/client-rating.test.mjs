import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client surfaces a persisted rating only after completed services',async()=>{
 const[prompt,root]=await Promise.all([
  read('src/mvp/client/ClientRatingPrompt.tsx'),
  read('src/mvp/client/ClientRoot.tsx'),
 ])
 assert.match(root,/import\{ClientRatingPrompt\}from'\.\/ClientRatingPrompt'/)
 assert.match(root,/<ClientRatingPrompt\/>/)
 assert.match(prompt,/from\('servicios'\)/)
 assert.match(prompt,/\.eq\('estado','completado'\)/)
 assert.match(prompt,/from\('resenas'\)/)
 assert.match(prompt,/cliente_id\s*:\s*userId/)
 assert.match(prompt,/proveedor_id\s*:\s*target\.service\.proveedor_id/)
 assert.match(prompt,/servicio_id\s*:\s*target\.service\.id/)
 assert.match(prompt,/puntuacion\s*:\s*score/)
})

test('rating prompt offers 1-5 stars, optional comment and duplicate recovery',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 assert.match(prompt,/\[1,2,3,4,5\]\.map/)
 assert.match(prompt,/role="radiogroup"/)
 assert.match(prompt,/maxLength=\{500\}/)
 assert.match(prompt,/error\.code==='23505'/)
 assert.match(prompt,/Este servicio ya fue calificado/)
 assert.match(prompt,/Enviar calificación/)
})

test('rating prompt resyncs after lifecycle changes and reports foreground failures to Sentinel',async()=>{
 const prompt=await read('src/mvp/client/ClientRatingPrompt.tsx')
 assert.match(prompt,/table:'servicios'/)
 assert.match(prompt,/addEventListener\('online'/)
 assert.match(prompt,/visibilitychange/)
 assert.match(prompt,/SUBSCRIBED/)
 assert.match(prompt,/removeChannel/)
 assert.match(prompt,/checklistCode:'RATING'/)
 assert.match(prompt,/const shouldEscalate=\(\)=>document\.visibilityState==='visible'&&navigator\.onLine/)
 assert.match(prompt,/loadRef=useRef\(load\),reportRef=useRef\(report\)/)
 assert.match(prompt,/\},\[supabase,userId\]\)/)
 assert.match(prompt,/if\(shouldEscalate\(\)\)reportRef\.current\('rating_realtime_error'/)
})
