import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('client searching state waits five minutes before offering retry',async()=>{
 const source=await read('src/features/client/order/ClientServiceDetail.tsx')
 assert.match(source,/MATCHING_WINDOW_MS=5\*60\*1000/)
 assert.match(source,/Buscando profesional/)
 assert.match(source,/No encontramos un profesional disponible/)
 assert.match(source,/Reintentar pedido/)
 assert.match(source,/matchingDeadline/)
 assert.match(source,/remainingMs<=0/)
 assert.doesNotMatch(source,/\['buscando','ofrecido'\]\.includes\(service\.estado\)&&<div className="ugo-history-row-actions"><button[^>]+onClick=\{\(\)=>void retryMatching\(\)\}/)
})

test('retry starts a fresh five minute client search cycle',async()=>{
 const source=await read('src/features/client/order/ClientServiceDetail.tsx')
 assert.match(source,/setMatchingStartedAt\(Date\.now\(\)\)/)
 assert.match(source,/await getDispatchProvider\(\)\.start/)
 assert.match(source,/setNotice\('Buscando profesional\. UGO volvió a avisar a profesionales disponibles\.'\)/)
})
