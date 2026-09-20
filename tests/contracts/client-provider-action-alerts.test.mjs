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
