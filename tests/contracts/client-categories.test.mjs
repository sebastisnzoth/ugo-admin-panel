import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('TEST catalog includes the additional client categories already understood by Hugo',async()=>{
 const migration=await read('supabase/migrations/20260913151000_expand_service_categories.sql')
 assert.match(migration,/\('jardineria','Jardinería','🌿'\)/)
 assert.match(migration,/\('pintura','Pintura','🎨'\)/)
 assert.match(migration,/\('cerrajeria','Cerrajería','🔐'\)/)
 assert.match(migration,/where not exists/)
})

test('client home and guided request render active categories from the database',async()=>{
 const[home,guided]=await Promise.all([read('src/mvp/client/ClientPremiumHome.tsx'),read('src/mvp/client/ClientGuidedRequest.tsx')])
 assert.match(home,/from\('categorias'\)[\s\S]*\.eq\('activa',true\)/)
 assert.match(home,/categories\.map/)
 assert.match(guided,/from\('categorias'\)[\s\S]*\.eq\('activa',true\)/)
 assert.match(guided,/jardineria:\['jardinero'/)
})
