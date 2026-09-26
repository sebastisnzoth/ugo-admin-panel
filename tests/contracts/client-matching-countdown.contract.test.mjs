import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client searching state follows backend deadline before offering retry',async()=>{const source=await read('src/features/client/order/ClientServiceDetail.tsx');assert.match(source,/matching_expires_at/);assert.match(source,/Buscando profesional/);assert.match(source,/No encontramos un profesional disponible/);assert.match(source,/Reintentar pedido/);assert.match(source,/matchingDeadline/);assert.match(source,/remainingMs<=0/);assert.doesNotMatch(source,/matching-start|MATCHING_WINDOW_MS/)})
test('retry asks backend for a fresh matching cycle then reloads its deadline',async()=>{const source=await read('src/features/client/order/ClientServiceDetail.tsx');assert.match(source,/await getDispatchProvider\(\)\.start/);assert.match(source,/await load\(\)/);assert.match(source,/setNotice\('Buscando profesional\. UGO volvió a avisar a profesionales disponibles\.'\)/)})
