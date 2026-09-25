import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

test('provider assignment creates a deduplicated client notification from the service trigger',async()=>{
 const sql=await read('supabase/migrations/20260917162500_restore_client_service_notifications.sql')
 assert.match(sql,/create or replace function private\.notificar_estado_servicio\(\)/)
 assert.match(sql,/v_estado = 'asignado'/)
 assert.match(sql,/'proveedor_asignado'/)
 assert.match(sql,/'Profesional asignado'/)
 assert.match(sql,/jsonb_build_object\('servicio_id',new\.id,'estado',v_estado,'proveedor_id',new\.proveedor_id\)/)
 assert.match(sql,/create trigger trg_notificar_estado_servicio/)
 assert.match(sql,/after update of estado, proveedor_id on public\.servicios/)
})

test('client receives inserted notifications in realtime and shows a visible live alert',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/event:'INSERT',schema:'public',table:'notificaciones'/)
 assert.match(center,/resync\(\)/)
 assert.match(center,/SERVICE_NOTICE_EXPECTED_STATE/)
 assert.match(center,/aria-live="assertive"/)
 assert.match(center,/UGO · ACTUALIZACIÓN EN VIVO/)
 assert.match(center,/Ver pedido →/)
})

test('assignment notification and active home card open the exact service id',async()=>{
 const [root,home]=await Promise.all([
  read('src/features/client/navigation/clientNavigation.ts'),
  read('src/features/client/home/ClientHomeScreen.tsx'),
 ])
 assert.match(root,/notice\.datos\?\.servicio_id/)
 assert.match(root,/kind:'service'/)
 assert.match(await read('src/features/client/ClientRoot.tsx'),/<ClientHomeScreen onOpenService=\{openService\}\/>/)
 assert.match(home,/onClick=\{\(\)=>openOrder\(order\.id\)\}/)
 assert.match(home,/onOpenService\(serviceId\)/)
})


test('client recovers an unread service alert after reopening the app',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/role==='client'[\s\S]*pending=next\.find\(notice=>!notice\.leida_at&&actionable\.has\(notice\.id\)&&CLIENT_ATTENTION_TYPES\.has\(notice\.tipo\)\)/)
 assert.match(center,/\[db,role,signalClientAlert,signalProviderAlert\]/)
})

test('notification realtime recreates its channel after error, timeout or network recovery',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/channelEpoch/)
 assert.match(center,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(center,/CHANNEL_ERROR/)
 assert.match(center,/TIMED_OUT/)
 assert.match(center,/const onOnline=\(\)=>\{resync\(\);reconnect\(\)\}/)
 assert.match(center,/clearTimeout\(reconnectTimer\)/)
 assert.match(center,/ugo-notices-\$\{role\}-\$\{id\}-\$\{channelEpoch\}/)
})
