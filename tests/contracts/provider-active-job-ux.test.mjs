import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider active job exposes a single clear next-action brief',async()=>{
 const source=await read('src/mvp/provider/ProviderActiveJob.tsx')
 assert.match(source,/provider-mission-brief/)
 assert.match(source,/AHORA/)
 assert.match(source,/nextAction/)
 assert.match(source,/paymentLabel/)
 assert.match(source,/locationLabel/)
 assert.match(source,/provider-primary-control/)
 assert.match(source,/Abrir mapa/)
})

test('provider active job keeps the canonical state actions intact',async()=>{
 const source=await read('src/mvp/provider/ProviderActiveJob.tsx')
 for(const label of ['ESTOY YENDO','YA LLEGUÉ','EMPEZAR TRABAJO','TRABAJO LISTO'])assert.match(source,new RegExp(label))
 assert.match(source,/ProviderEvidencePanel/)
 assert.match(source,/onAutoArrival|confirmArrival/)
})

test('provider mission brief is responsive and does not replace primary controls',async()=>{
 const css=await read('src/mvp/provider/provider-simple-flow.css')
 assert.match(css,/\.provider-mission-brief\{/)
 assert.match(css,/#provider-primary-control\{scroll-margin:/)
 assert.match(css,/@media\(max-width:560px\)/)
})
