import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client home presents exactly four core service families',async()=>{
 const home=await read('src/mvp/client/ClientPremiumHome.tsx')
 const section=home.match(/const CORE_SERVICES:[\s\S]*?\n\]/)?.[0]||''
 assert.match(section,/label:'Limpieza'/)
 assert.match(section,/label:'Reparaciones'/)
 assert.match(section,/label:'Electricidad'/)
 assert.match(section,/label:'Plomería'/)
 assert.equal((section.match(/key:'/g)||[]).length,4)
 assert.match(home,/Servicios rápidos/)
 assert.match(home,/coreCategories\.map/)
})

test('core category curation does not delete the backend catalog',async()=>{
 const home=await read('src/mvp/client/ClientPremiumHome.tsx')
 assert.match(home,/from\('categorias'\).*eq\('activa',true\)/s)
 assert.doesNotMatch(home,/delete\(|update\(\{activa:false/)
})
