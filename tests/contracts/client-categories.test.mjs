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

test('client home and canonical request consume active categories from the database',async()=>{
 const[home,need,catalog]=await Promise.all([read('src/mvp/client/ClientPremiumHome.tsx'),read('src/features/client/request/ClientNeedScreen.tsx'),read('src/mvp/voiceCatalog.ts')])
 assert.match(home,/from\('categorias'\)[\s\S]*\.eq\('activa',true\)/)
 assert.match(home,/CORE_SERVICES\.map\(item=>\(\{item,category:categories\.find\(item\.matches\)\|\|null\}\)\)/)
 assert.match(home,/coreCategories\.map/)
 assert.match(need,/from\('categorias'\)[\s\S]*\.eq\('activa',true\)/)
 assert.match(need,/resolveVoiceCategoryFromCatalog/)
 assert.match(catalog,/jardinero\|jardineria\|jardineiro\|jardinagem/)
})
