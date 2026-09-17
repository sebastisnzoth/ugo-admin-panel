import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('scheduled client requests converge on servicios.programado_para with initial-market timezone semantics',async()=>{
 const[client,canonical,timezone]=await Promise.all([
  read('src/mvp/client/ClientGuidedRequest.tsx'),
  read('supabase/migrations/20260913141000_service_schedule_canonicalization.sql'),
  read('supabase/migrations/20260913143500_service_schedule_timezone_guard.sql'),
 ])
 assert.match(client,/scheduled_at:draft\.when==='programar'\?draft\.scheduleAt\|\|null:null/)
 assert.match(canonical,/new\.programado_para := v_scheduled_at::timestamptz/)
 assert.match(canonical,/before insert or update of programado_para, metadata on public\.servicios/)
 assert.match(timezone,/v_scheduled_at ~ /)
 assert.match(timezone,/\[zZ\]/)
 assert.match(timezone,/America\/Sao_Paulo/)
 assert.match(timezone,/v_scheduled_at::timestamp at time zone 'America\/Sao_Paulo'/)
 assert.match(timezone,/jsonb_set\([\s\S]*'\{scheduled_at\}'[\s\S]*to_jsonb\(new\.programado_para\)/)
})

test('provider agenda is scoped to the authenticated provider and includes immediate plus scheduled assignments',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/\.eq\('proveedor_id',id\)/)
 assert.doesNotMatch(agenda,/\.not\('programado_para','is',null\)/)
 assert.match(agenda,/\.in\('estado',AGENDA_STATES\)/)
 assert.match(agenda,/immediateRows=rows\.filter\(row=>!row\.programado_para/)
 assert.match(agenda,/todayRows=rows\.filter/)
 assert.match(agenda,/upcomingRows=rows\.filter/)
 assert.match(agenda,/filter:`proveedor_id=eq\.\$\{id\}`/)
 assert.match(agenda,/Gestionar pedido/)
})

test('provider navigation exposes agenda without replacing the active-job journey',async()=>{
 const[root,flow,types,home,active]=await Promise.all([
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('src/mvp/provider/providerFlow.tsx'),
  read('src/mvp/provider/providerTypes.ts'),
  read('src/mvp/provider/ProviderHome.tsx'),
  read('src/mvp/provider/ProviderActiveJob.tsx'),
 ])
 assert.match(types,/'agenda'/)
 assert.match(types,/openAgenda/)
 assert.match(flow,/openAgenda:noop/)
 assert.match(root,/screen==='agenda'&&<ProviderAgenda\/>/)
 assert.match(root,/data\.service\?flow\.actions\.openActiveJob:flow\.actions\.openAgenda/)
 assert.match(home,/AGENDA/)
 assert.match(active,/programado_para/)
})
