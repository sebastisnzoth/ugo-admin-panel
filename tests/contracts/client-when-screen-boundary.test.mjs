import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client when screen lives behind the request feature boundary with its CSS',async()=>{
 const[screen,shim,location,css]=await Promise.all([
  read('src/features/client/request/ClientWhenScreen.tsx'),
  read('src/mvp/client/ClientWhenScreen.tsx'),
  read('src/features/client/request/ClientLocationScreen.tsx'),
  read('src/features/client/request/clientWhenScreen.css')
 ])
 assert.match(screen,/\.\.\/payments\/ClientPaymentScreen/)
 assert.doesNotMatch(screen,/mvp\/client\/ClientPaymentScreen/)
 assert.match(screen,/\.\/clientWhenScreen\.css/)
 assert.match(shim,/features\/client\/request\/ClientWhenScreen/)
 assert.match(location,/\.\/ClientWhenScreen/)
 assert.match(css,/\.ugo-when-screen/)
 assert.ok(css.length>2500)
})
