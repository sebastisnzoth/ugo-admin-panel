import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider gets an Uber-like foreground alert for offer or direct assignment',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/PROVIDER_CALL_TYPES=new Set\(\['nueva_oferta','trabajo_asignado'\]\)/)
 assert.match(center,/PROVIDER_ATTENTION_TYPES=new Set\(\[[^\]]*'nueva_oferta'[^\]]*'trabajo_asignado'/)
 assert.match(center,/navigator\.vibrate/)
 assert.match(center,/AudioContext/)
 assert.match(center,/playProviderTone/)
 assert.match(center,/attention\?30000:9000/)
 assert.match(center,/UGO · NUEVO PEDIDO/)
 assert.match(center,/is-provider-call/)
})

test('assigned-work and service notifications open the exact provider service after resync',async()=>{
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 assert.match(root,/notice\.tipo==='trabajo_asignado'/)
 assert.match(root,/serviceId=typeof notice\.datos\.servicio_id==='string'/)
 assert.match(root,/data\.reload\(\)\.then\(\(\)=>serviceId\?flow\.actions\.openAgendaService\(serviceId\):flow\.actions\.openActiveJob\(\)\)/)
 assert.match(root,/if\(serviceId\)return flow\.actions\.openAgendaService\(serviceId\)/)
})

test('provider attention is disabled while Offline or debt-blocked for incoming calls',async()=>{
 const[root,center]=await Promise.all([read('src/mvp/provider/ProviderRoot.tsx'),read('src/mvp/NotificationCenter.tsx')])
 assert.match(root,/attentionEnabled=\{data\.online&&!data\.debtBlocked\}/)
 assert.match(center,/PROVIDER_CALL_TYPES\.has\(notice\.tipo\)&&!attentionEnabled/)
})
