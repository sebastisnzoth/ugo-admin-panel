import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync('supabase/migrations/20260913005000_auxiliary_tables_rls_hardening.sql','utf8')

const tables=['audit_log','documentos','documentos_proveedor','eventos_servicio','hugo_chat','hugo_sessions','mensajes','push_entregas','push_suscripciones','retiros','whatsapp_conversaciones','whatsapp_eventos','whatsapp_notificaciones']

test('all exposed auxiliary tables enable RLS',()=>{
 for(const table of tables){
  assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security;`,'i'),`${table} must enable RLS`)
 }
})

test('financial withdrawals are provider-read-only outside Admin',()=>{
 assert.match(sql,/create policy retiros_provider_select[\s\S]*for select to authenticated[\s\S]*proveedor_id = auth\.uid\(\)/i)
 assert.doesNotMatch(sql,/create policy\s+retiros_provider_(insert|update|delete)/i)
})

test('push subscription secrets are scoped to their owner',()=>{
 assert.match(sql,/create policy push_suscripciones_owner_all[\s\S]*usuario_id = auth\.uid\(\)[\s\S]*with check \(usuario_id = auth\.uid\(\)\)/i)
 assert.match(sql,/push_entregas_owner_select[\s\S]*ps\.usuario_id = auth\.uid\(\)/i)
})

test('service events and messages require service participation',()=>{
 assert.match(sql,/eventos_servicio_participant_select[\s\S]*private\.is_service_participant\(servicio_id, auth\.uid\(\)\)/i)
 assert.match(sql,/mensajes_participant_select[\s\S]*private\.is_service_participant\(servicio_id, auth\.uid\(\)\)/i)
 assert.match(sql,/mensajes_sender_insert[\s\S]*emisor_id = auth\.uid\(\)/i)
})

test('WhatsApp infrastructure is not opened to regular authenticated users',()=>{
 for(const table of ['whatsapp_conversaciones','whatsapp_eventos','whatsapp_notificaciones']){
  assert.match(sql,new RegExp(`${table}.*private\\.is_admin\\(auth\\.uid\\(\\)\\)`,'is'))
 }
 assert.doesNotMatch(sql,/whatsapp_[a-z_]+_owner_/i)
})

test('audit log remains immutable for normal authenticated users',()=>{
 assert.match(sql,/audit_log_admin_select[\s\S]*private\.is_admin\(auth\.uid\(\)\)/i)
 assert.doesNotMatch(sql,/audit_log_[a-z_]*(insert|update|delete)/i)
})
