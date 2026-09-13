import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('scheduled client requests converge on servicios.programado_para',async()=>{
 const[client,migration]=await Promise.all([
  read('src/mvp/client/ClientGuidedRequest.tsx'),
  read('supabase/migrations/20260913141000_service_schedule_canonicalization.sql'),
 ])
 assert.match(client,/scheduled_at:draft\.when==='programar'\?draft\.scheduleAt\|\|null:null/)
 assert.match(migration,/new\.programado_para := v_scheduled_at::timestamptz/)
 assert.match(migration,/jsonb_set\([\s\S]*'\{scheduled_at\}'[\s\S]*to_jsonb\(new\.programado_para\)/)
 assert.match(migration,/before insert or update of programado_para, metadata on public\.servicios/)
})

test('provider agenda is scoped to the authenticated provider and canonical schedule',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/\.eq\('proveedor_id',id\)/)
 assert.match(agenda,/\.not\('programado_para','is',null\)/)
 assert.match(agenda,/\.in\('estado',AGENDA_STATES\)/)
 assert.match(agenda,/filter:`proveedor_id=eq\.\$\{id\}`/)
 assert.match(agenda,/Abrir trabajo/)
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
