import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Scout saves prospects without relying on a partial-index upsert',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/function prospectRow\(p:Provider\)/)
 assert.match(src,/from\('prospectos_scouts'\)\.insert\(inserts\)/)
 assert.match(src,/from\('prospectos_scouts'\)\.update\(prospectRow\(p\)\)\.eq\('id'/)
 assert.doesNotMatch(src,/upsert\(row,\{onConflict:'external_id'\}\)/)
})

test('Scout exports found or selected providers to an Excel-compatible file',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/function exportExcel\(\)/)
 assert.match(src,/application\/vnd\.ms-excel/)
 assert.match(src,/ugo-scout-\$\{categoryId\}-\$\{stamp\}\.xls/)
})

test('Scout recruitment supports explicit multi-select WhatsApp and email actions',async()=>{
 const src=await read('src/components/ScoutSection.tsx')
 assert.match(src,/sendWhatsAppSelected/)
 assert.match(src,/selectedPhones\.slice\(0,20\)/)
 assert.match(src,/openEmailDraft/)
 assert.match(src,/bcc=/)
 assert.match(src,/recruitmentText/)
 assert.match(src,/Se não quiser receber novos contatos/)
})

test('Scout preserves public emails returned by discovery sources',async()=>{
 const api=await read('api/scout/places.js')
 assert.match(api,/p\.contact\?\.email/)
 assert.match(api,/t\['contact:email'\]/)
 assert.match(api,/p\.extratags\?\.email/)
})

test('WhatsApp recruitment updates Scout status even when optional invitation audit table is missing',async()=>{
 const api=await read('api/whatsapp/send.js')
 const insert=api.indexOf("from('invitaciones_scout').insert")
 const update=api.indexOf("from('prospectos_scouts').update({estado:'invitado'})")
 assert.ok(insert>0&&update>insert)
 assert.match(api,/invitaciones_scout'[\s\S]*?catch\{\}try\{await sb\.from\('prospectos_scouts'\)\.update/)
})
