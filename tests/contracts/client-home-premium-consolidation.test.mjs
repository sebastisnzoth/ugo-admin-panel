import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client home is readable, clearable and resilient',async()=>{
 const[src,css,root]=await Promise.all([
  read('src/mvp/client/ClientHomeScreen.tsx'),
  read('src/mvp/client/client-home-screen.css'),
  read('src/features/client/clientStyles.ts')
 ])
 assert.match(src,/aria-label="Limpiar búsqueda"/)
 assert.match(src,/setQuery\(''\)/)
 assert.match(src,/searchRef\.current\?\.focus\(\)/)
 assert.match(src,/El mapa no pudo cargarse\. Podés pedir el servicio igual\./)
 assert.match(src,/Pedíselo a Hugo/)
 for(const x of['var(--ugo-color-primary)','var(--ugo-color-on-surface)','var(--ugo-touch-target)','var(--ugo-font-caption)'])assert.ok(css.includes(x),x)
 assert.doesNotMatch(css,/#087d63|#102335|#0b1c30/i)
 assert.ok(root.lastIndexOf("client-home-screen.css")>root.lastIndexOf("client-desktop-shell-fixes.css"))
})
