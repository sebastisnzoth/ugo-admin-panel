import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client location screen lives behind the request feature boundary with its CSS',async()=>{
 const[screen,need,css]=await Promise.all([
  read('src/features/client/request/ClientLocationScreen.tsx'),
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('src/features/client/request/clientLocationScreen.css')
 ])
 assert.match(screen,/\.\/ClientWhenScreen/)
 assert.match(screen,/\.\/clientLocationScreen\.css/)
 assert.match(need,/\.\/ClientLocationScreen/)
 assert.match(css,/\.ugo-location-screen/)
 assert.ok(css.length>5000)
})
