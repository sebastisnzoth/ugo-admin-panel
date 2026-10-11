import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client home is readable and resilient',async()=>{
 const[src,css,root]=await Promise.all([
  read('src/features/client/home/ClientHomeScreen.tsx'),
  read('src/features/client/ui/clientHomeScreen.css'),
  read('src/features/client/clientStyles.ts')
 ])
 assert.match(src,/El mapa no pudo cargarse\. Podés pedir el servicio igual\./)
 assert.doesNotMatch(src,/ugo-home-search-wrap|ugo-home-results|clientFocusServiceSearch|aria-label="Limpiar búsqueda"|searchRef/)
 assert.doesNotMatch(css,/ugo-home-search|ugo-home-results/)
 assert.doesNotMatch(src,/Pedíselo a Hugo|ugo-real-orb|ConversationalOrb/)
 for(const x of['var(--ugo-color-primary)','var(--ugo-color-on-surface)','var(--ugo-touch-target)','var(--ugo-font-caption)'])assert.ok(css.includes(x),x)
 assert.doesNotMatch(css,/#087d63|#102335|#0b1c30/i)
 assert.ok(root.lastIndexOf("clientHomeScreen.css")>root.lastIndexOf("client-desktop-shell-fixes.css"))
})
