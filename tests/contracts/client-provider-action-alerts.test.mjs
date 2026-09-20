import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider lifecycle actions are client notifications with exact service id',async()=>{
 const sql=await read('supabase/migrations/20260920090000_direct_assignment_realtime_convergence.sql')
 for(const type of ['proveedor_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente']){
  assert.match(sql,new RegExp("'"+type+"'"))
 }
 assert.match(sql,/jsonb_build_object\('servicio_id',new\.id/)
})

test('service chat notifies the counterpart and reuses canonical notifications',async()=>{
 const sql=await read('supabase/migrations/20260920113000_service_chat_counterpart_notifications.sql')
 assert.match(sql,/create or replace function private\.notificar_mensaje_servicio\(\)/)
 assert.match(sql,/new\.emisor_rol::text='proveedor'/)
 assert.match(sql,/v_destino:=v_cliente/)
 assert.match(sql,/'chat_mensaje'/)
 assert.match(sql,/private\.crear_notificacion_unica/)
 assert.match(sql,/'servicio_id',new\.servicio_id/)
 assert.match(sql,/create trigger trg_notificar_mensaje_servicio/)
 assert.match(sql,/after insert on public\.mensajes/)
})

test('client foreground notification rings, vibrates and stays actionable',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/CLIENT_ATTENTION_TYPES=new Set\(\[/)
 assert.match(center,/'chat_mensaje'/)
 assert.match(center,/signalClientAlert/)
 assert.match(center,/playClientTone/)
 assert.match(center,/navigator\.vibrate/)
 assert.match(center,/UGO · MENSAJE NUEVO/)
 assert.match(center,/notice\.tipo\)/)
})


test('bidirectional push metadata routes every notification to the recipient app',async()=>{
 const [sql,sw,edge]=await Promise.all([
  read('supabase/migrations/20260920121500_bidirectional_push_routing.sql'),
  read('public/sw.js'),
  read('supabase/functions/push-dispatch/index.ts'),
 ])
 assert.match(sql,/before insert on public\.notificaciones/)
 assert.match(sql,/when 'cliente' then 'client'/)
 assert.match(sql,/when 'proveedor' then 'provider'/)
 assert.match(sql,/jsonb_build_object\('role',v_role\)/)
 assert.match(sw,/payload\?\.data\?\.servicio_id/)
 assert.match(sw,/app=provider/)
 assert.match(sw,/app=client/)
 assert.match(sw,/serviceId=/)
 assert.match(edge,/HIGH_URGENCY_TYPES/)
 assert.match(edge,/'chat_mensaje'/)
})

test('provider receives normal chat and lifecycle alerts even when incoming-work attention is disabled',async()=>{
 const center=await read('src/mvp/NotificationCenter.tsx')
 assert.match(center,/PROVIDER_CALL_TYPES=new Set\(\['nueva_oferta','trabajo_asignado'\]\)/)
 assert.match(center,/PROVIDER_ATTENTION_TYPES=new Set\(\[[^\]]*'chat_mensaje'/)
 assert.match(center,/PROVIDER_CALL_TYPES\.has\(notice\.tipo\)&&!attentionEnabled/)
 assert.match(center,/playProviderTone/)
})


test('push opt-in is visible in both role notification centers',async()=>{
 const [center,css]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('src/mvp/notification-center.css'),
 ])
 assert.match(center,/pushState==='off'/)
 assert.match(center,/ugo-notification-enable-chip/)
 assert.match(center,/Activar notificaciones/)
 assert.match(center,/enablePush\(\)/)
 assert.match(css,/\.ugo-notification-enable-chip/)
})
