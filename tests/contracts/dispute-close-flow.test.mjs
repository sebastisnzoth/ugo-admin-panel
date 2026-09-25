import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('client closure exposes exact-service dispute action without duplicating evidence',async()=>{
 const review=await read('src/features/client/order/ClientCompletionReview.tsx')
 const detail=await read('src/features/client/order/ClientServiceDetail.tsx')
 assert.match(review,/onOpenDispute\?:\(\)=>void/)
 assert.match(review,/>ABRIR DISPUTA<\/button>/)
 assert.doesNotMatch(review,/ClientEvidenceGallery/)
 assert.match(detail,/ClientEvidenceGallery serviceId=\{service\.id\} hideWhenEmpty/)
 assert.match(detail,/ClientCompletionReview serviceId=\{service\.id\}[\s\S]*onOpenDispute=\{openExactDispute\}/)
 assert.match(detail,/DisputeDock role="client" serviceId=\{service\.id\} key=\{`client-dispute-\$\{service\.id\}`\} openRequestKey=\{disputeOpenKey\}/)
 assert.match(detail,/VER DISPUTA/)
})

test('client dispute trigger can reopen and disputed services pause normal closure lifecycle',async()=>{
 const dock=await read('src/mvp/DisputeDock.tsx')
 const detail=await read('src/features/client/order/ClientServiceDetail.tsx')
 assert.match(dock,/openRequestKey\?:number/)
 assert.match(dock,/\[openRequest,openRequestKey\]/)
 assert.match(detail,/setDisputeOpenKey\(value=>value\+1\)/)
 assert.match(detail,/disputeActive=service\?\.estado==='disputado'/)
 const paused=(detail.match(/!awaitingApproval&&!disputeActive&&service\.estado!=='completado'/g)||[]).length
 assert.ok(paused>=3,'tracking, payment and expansion must stay paused while disputed')
})

test('provider closure opens the exact service dispute and preserves it in provider flow',async()=>{
 const active=await read('src/mvp/provider/ProviderActiveJob.tsx')
 const flow=await read('src/mvp/provider/providerFlow.tsx')
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 const types=await read('src/mvp/provider/providerTypes.ts')
 assert.match(active,/esperando_aprobacion[\s\S]*flow\.actions\.openDispute\(s\.id\)[\s\S]*ABRIR DISPUTA/)
 assert.match(active,/s\.estado==='disputado'[\s\S]*VER DISPUTA/)
 assert.match(types,/openDispute: \(serviceId\?: string\) => void/)
 assert.match(flow,/disputeServiceId:string\|null/)
 assert.match(flow,/setDisputeServiceId\(next==='dispute'\?id:null\)/)
 assert.match(root,/openDispute:serviceId=>flow\.navigate\('dispute',serviceId\|\|data\.service\?\.id\|\|null\)/)
 assert.match(root,/DisputeDock role="provider" serviceId=\{flow\.disputeServiceId\} key=\{`provider-dispute-\$\{flow\.disputeServiceId\|\|'general'\}`\}/)
})

test('dispute backend stays participant-scoped, idempotent and server-authoritative',async()=>{
 const hook=await read('src/hooks/useDisputes.ts')
 const sql=await read('supabase/migrations/20260920151000_dispute_rules_ai_snapshot.sql')
 assert.match(hook,/rpc\('abrir_disputa_v2'/)
 assert.match(sql,/v_uid<>v_s\.cliente_id and v_uid is distinct from v_s\.proveedor_id/)
 assert.match(sql,/select \* into v_d from public\.disputas where servicio_id=p_servicio_id limit 1;\s*if v_d\.id is not null then return v_d;/)
 assert.match(sql,/update public\.servicios set estado='disputado'/)
})

test('admin keeps realtime dispute intake and human resolution authority',async()=>{
 const hook=await read('src/hooks/useDisputes.ts')
 const admin=await read('src/mvp/AdminDecisionCenter.tsx')
 assert.match(hook,/table:'disputas'/)
 assert.match(hook,/table:'disputa_mensajes'/)
 assert.match(admin,/admin_resolver_disputa|resolverDisputa/)
 assert.match(admin,/AdminDisputeAssistant/)
})


test('switching exact services remounts dispute state instead of leaking the previous case',async()=>{
 const detail=await read('src/features/client/order/ClientServiceDetail.tsx')
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 const hook=await read('src/hooks/useDisputes.ts')
 assert.match(detail,/serviceId=\{service\.id\} key=\{`client-dispute-\$\{service\.id\}`\}/)
 assert.match(root,/serviceId=\{flow\.disputeServiceId\} key=\{`provider-dispute-\$\{flow\.disputeServiceId\|\|'general'\}`\}/)
 assert.match(hook,/q=serviceId\?q\.eq\('id',serviceId\)/)
})

test('general provider help never forwards a click event as a service id',async()=>{
 const [profile,sidebar,types]=await Promise.all([
  read('src/mvp/provider/ProviderProfile.tsx'),
  read('src/mvp/provider/ProviderStudioSidebar.tsx'),
  read('src/mvp/provider/providerTypes.ts'),
 ])
 assert.match(types,/openDispute: \(serviceId\?: string\) => void/)
 assert.match(profile,/onClick=\{\(\)=>flow\.actions\.openDispute\(\)\}/)
 assert.match(sidebar,/onClick=\{\(\)=>f\.actions\.openDispute\(\)\}/)
 assert.doesNotMatch(profile,/onClick=\{flow\.actions\.openDispute\}/)
 assert.doesNotMatch(sidebar,/onClick=\{f\.actions\.openDispute\}/)
})

test('disputed client and provider surfaces expose only dispute continuation for closure',async()=>{
 const [detail,active]=await Promise.all([
  read('src/features/client/order/ClientServiceDetail.tsx'),
  read('src/mvp/provider/ProviderActiveJob.tsx'),
 ])
 assert.match(detail,/disputeActive=service\?\.estado==='disputado'/)
 assert.match(detail,/disputeActive&&[\s\S]*VER DISPUTA/)
 assert.match(active,/s\.estado==='disputado'[\s\S]*VER DISPUTA/)
 assert.doesNotMatch(active,/s\.estado==='disputado'[\s\S]*completeService\(\)/)
})
