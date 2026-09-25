import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const source=fs.readFileSync(new URL('../../src/features/client/order/ClientCompletionReview.tsx',import.meta.url),'utf8')
const actions=fs.readFileSync(new URL('../../src/features/client/services/clientActionService.ts',import.meta.url),'utf8')
const shim=fs.readFileSync(new URL('../../src/mvp/ClientCompletionReview.tsx',import.meta.url),'utf8')

test('completion review lives behind the order feature boundary with legacy compatibility',()=>{
 assert.match(shim,/features\/client\/order\/ClientCompletionReview/)
 assert.doesNotMatch(shim,/aprobar_servicio|confirmar_pago_efectivo_cliente/)
 assert.match(source,/export function ClientCompletionReview/)
 assert.match(source,/approvePendingClientService/)
 assert.match(source,/confirmApprovedCashClientService/)
 assert.doesNotMatch(source,/supabase\.rpc\('aprobar_servicio'|supabase\.rpc\('confirmar_pago_efectivo_cliente'/)
})

test('completion realtime scopes selected service and preserves authenticated-client fallback',()=>{
 assert.match(source,/serviceFilter=serviceId\?`id=eq\.\$\{serviceId\}`:`cliente_id=eq\.\$\{userId\}`/)
 assert.match(source,/filter:`servicio_id=eq\.\$\{serviceId\}`/)
 assert.match(source,/filter:`cliente_id=eq\.\$\{userId\}`/)
})

test('completion review rehydrates after subscription reconnect, online and visibility recovery',()=>{
 assert.match(source,/status==='SUBSCRIBED'/)
 assert.match(source,/addEventListener\('online',onOnline\)/)
 assert.match(source,/visibilityState==='visible'/)
})

test('approval reconciles ambiguous backend failure without ever confirming cash',()=>{
 assert.match(actions,/approvePendingClientService/)
 assert.match(actions,/if\(row\.estado==='completado'\)return true/)
 assert.match(actions,/if\(hasWorkApproval\(row\)\)return true/)
 assert.match(actions,/rpc\('aprobar_servicio',\{p_servicio_id:row\.id\}\)/)
 assert.match(actions,/persisted\?\.estado==='esperando_aprobacion'&&hasWorkApproval\(persisted\)/)
 const approval=actions.slice(actions.indexOf('export async function approvePendingClientService'),actions.indexOf('export async function confirmApprovedCashClientService'))
 assert.doesNotMatch(approval,/confirmar_pago_efectivo_cliente/)
})

test('YA PAGUÉ is a separate boundary and only runs after work approval',()=>{
 assert.match(actions,/confirmApprovedCashClientService/)
 assert.match(actions,/row\.estado!=='esperando_aprobacion'\|\|!hasWorkApproval\(row\)/)
 assert.match(actions,/rpc\('confirmar_pago_efectivo_cliente',\{p_servicio_id:row\.id\}\)/)
 assert.match(actions,/persisted\?\.estado==='completado'/)
})

test('review load error does not erase a previously known active closure',()=>{
 assert.doesNotMatch(source,/if\(error\)\{setService\(null\)/)
 assert.match(source,/Reintentaremos sin perder el servicio/)
})

test('cash close directly refreshes the parent detail so rating can appear without waiting for realtime',()=>{
 assert.match(source,/onCompleted\?:\(\)=>void\|Promise<void>/)
 assert.match(source,/confirmApprovedCashClientService[\s\S]*await load\(\)[\s\S]*await onCompleted\?\.\(\)/)
})
