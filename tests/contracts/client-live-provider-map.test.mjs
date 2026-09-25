import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client detail places live provider tracking before chat',async()=>{
 const detail=await read('src/features/client/order/ClientServiceDetail.tsx')
 const tracking=detail.indexOf('<ClientLiveTracking serviceId={service.id} embedded/>')
 const chat=detail.indexOf('<ServiceChat role="client" serviceId={service.id} compact/>')
 assert.ok(tracking>=0,'tracking must be rendered in client service detail')
 assert.ok(chat>=0,'chat must be rendered in client service detail')
 assert.ok(tracking<chat,'live tracking must appear above chat')
})

test('assigned provider already renders the map and en_camino upgrades to route ETA',async()=>{
 const live=await read('src/features/client/order/ClientLiveTracking.tsx')
 const map=await read('src/features/client/order/ClientActiveMap.tsx')
 assert.match(live,/service\.estado==='asignado'[\s\S]*ClientActiveMap[\s\S]*phase="assigned"/)
 assert.match(live,/ClientActiveMap[\s\S]*phase="en_camino"/)
 assert.match(map,/phase==='assigned'/)
 assert.match(map,/Listo para salir/)
 assert.match(map,/phase!=='en_camino'/)
 assert.match(map,/Llegando en/)
 assert.match(map,/10_000/)
})
