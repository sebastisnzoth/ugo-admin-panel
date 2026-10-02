import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Admin map controls expose accessible names',async()=>{
 const map=await read('src/components/MapaOperativo.tsx')
 for(const label of[
  'Buscar ciudad o barrio en el mapa operativo',
  'Radio de búsqueda del mapa operativo',
  'Ir a la ubicación buscada',
  'Actualizar mapa operativo',
  'Filtrar mapa por zona o barrio',
 ])assert.ok(map.includes('aria-label="'+label+'"'))
})

test('Admin live status metadata keeps readable contrast',async()=>{
 const css=await read('src/mvp/admin-home-stitch.css')
 assert.match(css,/\.ahs-live-dot\{[^}]*color:#344054/)
 assert.match(css,/\.ahs-live-dot small\{[^}]*color:#475467/)
})

test('Provider role runtime follows canonical current sidebar labels',async()=>{
 const[runtime,sidebar]=await Promise.all([read('scripts/role-ui-runtime.mjs'),read('src/mvp/provider/ProviderStudioSidebar.tsx')])
 assert.match(runtime,/\/Pedidos\/i/)
 assert.match(runtime,/Trabajo activo\|Mis trabajos/)
 assert.doesNotMatch(runtime,/\/Trabajos\/i,\/Calendario\/i/)
 assert.match(sidebar,/>Pedidos /)
 assert.match(sidebar,/Trabajo activo':'Mis trabajos/)
})
