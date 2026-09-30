import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client home location CTA uses the canonical GPS action directly',async()=>{
 const home=await read('src/features/client/home/ClientHomeScreen.tsx')
 assert.match(home,/className="ugo-home-location" onClick=\{locateUser\}/)
 assert.match(home,/aria-label="Actualizar mi ubicación"/)
 assert.match(home,/locating\?'Ubicando…':'Actualizar'/)
 assert.doesNotMatch(home,/emitUgoUiEvent\(UGO_UI_EVENTS\.clientLocation\)/)
})
