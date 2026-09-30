import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client matching can continue in background without trapping or blocking another request',async()=>{
 const source=await read('src/features/client/request/ClientPostConfirmFlow.tsx')
 assert.match(source,/const continueBackground=\(\)=>\{if\(service\)clearDraft\(\);onExit\(\)\}/)
 assert.match(source,/onClick=\{continueBackground\}>Seguir usando UGO/)
 assert.match(source,/Reintentar pedido/)
 assert.match(source,/Cancelar pedido/)
 assert.match(source,/flow\.actions\.cancelService\(service\.id\)/)
 assert.doesNotMatch(source,/hasActive/)
 assert.doesNotMatch(source,/Ya tenés un servicio en curso/)
})

test('scheduled request cannot continue with a past local datetime',async()=>{
 const source=await read('src/features/client/request/ClientWhenScreen.tsx')
 assert.match(source,/new Date\(scheduleAt\)\.getTime\(\)<=Date\.now\(\)/)
 assert.match(source,/min=\{localValue\(new Date\(\)\)\}/)
 assert.match(source,/Elegí una fecha y hora futura/)
})

test('voice scheduled requests cannot skip time validation',async()=>{
 const[when,summary]=await Promise.all([
  read('src/features/client/request/ClientWhenScreen.tsx'),
  read('src/features/client/request/ClientSummaryScreen.tsx')
 ])
 assert.match(when,/nextWhen==='programar'/)
 assert.match(when,/Hugo necesita una fecha y hora futura/)
 assert.match(when,/scheduleOk=draft\.when!=='programar'/)
 assert.match(summary,/const scheduleReady=d\.when!=='programar'/)
 assert.match(summary,/Falta una fecha y hora futura válida/)
})

test('expired home matching has a single retry action without nested interactive controls',async()=>{
 const home=await read('src/features/client/home/ClientHomeScreen.tsx')
 assert.match(home,/if\(expired\)\{void retryOrder\(order\.id\);return\}openOrder\(order\.id\)/)
 assert.doesNotMatch(home,/ugo-home-order-retry" role="button"/)
 assert.doesNotMatch(home,/onKeyDown=\{event=>\{if\(event\.key==='Enter'/)
})
