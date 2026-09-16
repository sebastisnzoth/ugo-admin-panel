import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const migration=fs.readFileSync(new URL('../../supabase/migrations/20260916007000_service_chat_client_message_idempotency.sql',import.meta.url),'utf8')
const chat=fs.readFileSync(new URL('../../src/mvp/ServiceChat.tsx',import.meta.url),'utf8')

test('chat attempt id is persisted in datos and backed by a unique partial index',()=>{
 assert.match(chat,/clientMessageId:attemptId/)
 assert.match(migration,/create unique index if not exists mensajes_sender_client_message_id_uidx/)
 assert.match(migration,/servicio_id,[\s\S]*emisor_id,[\s\S]*datos->>'clientMessageId'/)
 assert.match(migration,/where nullif\(datos->>'clientMessageId',''\) is not null/)
})

test('legacy chat rows without clientMessageId remain outside the idempotency index',()=>{
 assert.match(migration,/Legacy messages without clientMessageId remain untouched/)
})
