import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client countdown uses backend offer expira_at on home and detail',async()=>{const[home,detail]=await Promise.all([read('src/features/client/home/ClientHomeScreen.tsx'),read('src/features/client/order/ClientServiceDetail.tsx')]);for(const source of[home,detail]){assert.match(source,/ofertas_servicio/);assert.match(source,/expira_at/);assert.doesNotMatch(source,/created_at\)\.getTime\(\)\+MATCHING_WINDOW_MS/)}assert.doesNotMatch(detail,/matching-start/);assert.doesNotMatch(detail,/sessionStorage\.setItem\(matchingKey/)})
test('client offer deadline resyncs on realtime offer updates',async()=>{const[home,detail]=await Promise.all([read('src/features/client/home/ClientHomeScreen.tsx'),read('src/features/client/order/ClientServiceDetail.tsx')]);assert.match(home,/table:'ofertas_servicio'/);assert.match(detail,/table:'ofertas_servicio'/)})
