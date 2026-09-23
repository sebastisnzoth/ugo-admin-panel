import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client home presents exactly four core service families',async()=>{
 const home=await read('src/features/client/home/ClientHomeScreen.tsx')
 const section=home.match(/const CORE=\[([\s\S]*?)\] as const/)?.[1]||''
 const tuples=section.match(/\[\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*\]/g)||[]
 assert.equal(tuples.length,4)
 assert.match(section,/'limpieza'/)
 assert.match(section,/'Limpieza'/)
 assert.match(section,/'repar'/)
 assert.match(section,/'Reparaciones'/)
 assert.match(section,/'electric'/)
 assert.match(section,/'Electricidad'/)
 assert.match(section,/'plomer'/)
 assert.match(section,/'Plomería'/)
 assert.match(home,/ugo-home-categories/)
 assert.match(home,/cards\.map/)
})

test('core category curation does not delete the backend catalog',async()=>{
 const home=await read('src/features/client/home/ClientHomeScreen.tsx')
 assert.match(home,/from\('categorias'\).*eq\('activa',true\)/s)
 assert.doesNotMatch(home,/delete\(|update\(\{activa:false/)
})
