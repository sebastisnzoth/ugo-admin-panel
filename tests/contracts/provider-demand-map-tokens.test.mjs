import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider demand map styling uses tokenized CSS without changing map behavior',async()=>{const[map,css]=await Promise.all([read('src/mvp/provider/ProviderDemandMap.tsx'),read('src/mvp/provider/provider-demand-map.css')]);assert.doesNotMatch(map,/Object\.assign\(node\.style/);assert.doesNotMatch(map,/style=\{\{/);assert.match(map,/provider-demand-marker is-\$\{signal\.demandLevel\}/);assert.match(map,/map\.fitBounds/);assert.match(map,/map\.easeTo/);assert.match(map,/tile\.openstreetmap\.org/);assert.match(css,/var\(--ugo-/);assert.match(css,/provider-demand-marker\.is-high/);assert.match(css,/provider-demand-map-note/)})
