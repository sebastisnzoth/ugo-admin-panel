import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider agenda is mounted and scoped to the authenticated provider',async()=>{
 const[agenda,root]=await Promise.all([
  read('src/mvp/provider/ProviderAgenda.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
 ])
 assert.match(root,/import\{ProviderAgenda\}from'\.\/ProviderAgenda'/)
 assert.match(root,/screen==='agenda'&&<ProviderAgenda\/>/)
 assert.match(agenda,/from\('servicios'\)/)
 assert.match(agenda,/\.eq\('proveedor_id',id\)/)
 assert.match(agenda,/\.not\('programado_para','is',null\)/)
 assert.match(agenda,/\.in\('estado',AGENDA_STATES\)/)
 assert.match(agenda,/\.order\('programado_para',\{ascending:true\}\)/)
})

test('provider agenda keeps each scheduled job isolated by serviceId',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 assert.match(agenda,/key=\{row\.id\}/)
 assert.match(agenda,/setSelectedId\(row\.id\)/)
 assert.match(agenda,/<ServiceChat role="provider" serviceId=\{selected\.id\} compact\/>/)
 assert.match(agenda,/Este detalle está ligado al serviceId exacto/)
 assert.match(agenda,/provider\.service\?\.id===selected\.id/)
})

test('provider agenda resyncs from realtime and exposes operational schedule states',async()=>{
 const agenda=await read('src/mvp/provider/ProviderAgenda.tsx')
 for(const state of ['asignado','en_camino','llegado','en_progreso','esperando_aprobacion']) assert.ok(agenda.includes(`'${state}'`),`missing agenda state ${state}`)
 assert.match(agenda,/table:'servicios',filter:`proveedor_id=eq\.\$\{id\}`/)
 assert.match(agenda,/status==='SUBSCRIBED'/)
 assert.match(agenda,/removeChannel/)
 assert.match(agenda,/Próximos trabajos/)
 assert.match(agenda,/Horarios confirmados vinculados a tu cuenta/)
})
