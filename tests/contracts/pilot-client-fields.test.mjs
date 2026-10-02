import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const need=await readFile(new URL('../../src/features/client/request/ClientNeedScreen.tsx',import.meta.url),'utf8')
const when=await readFile(new URL('../../src/features/client/request/ClientWhenScreen.tsx',import.meta.url),'utf8')
const post=await readFile(new URL('../../src/features/client/request/ClientPostConfirmFlow.tsx',import.meta.url),'utf8')
const provider=await readFile(new URL('../../src/mvp/provider/ProviderPilotCapabilities.tsx',import.meta.url),'utf8')
test('pilot client captures Faxina and Marido fields without bypass',()=>{assert.match(need,/requiredPilot/);assert.match(need,/Tipo de faxina/);assert.match(need,/Materiales \/ repuestos/);assert.match(need,/requiere revisión/);assert.match(need,/pilotDetails/);assert.match(need,/pilotKind/)})
test('pilot schedule persists a start and end window',()=>{assert.match(when,/scheduleEndAt/);assert.match(when,/hora de finalización/);assert.match(post,/scheduled_end_at/)})
test('pilot provider captures capability and authorized references',()=>{for(const x of ['products','equipment','restrictions','tools','transport','materials','quoteMode','workLimits','autorizado_contacto'])assert.match(provider,new RegExp(x))})
