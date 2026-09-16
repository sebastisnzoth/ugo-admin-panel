import test from'node:test'
import assert from'node:assert/strict'
import fs from'node:fs'

const chat=fs.readFileSync(new URL('../../src/mvp/ServiceChat.tsx',import.meta.url),'utf8')

test('each chat send carries a client attempt id that can be reconciled after an ambiguous insert',()=>{
 assert.match(chat,/function chatAttemptId\(\)/)
 assert.match(chat,/clientMessageId:attemptId/)
 assert.match(chat,/from\('mensajes'\)\.select\('id'\)\.eq\('servicio_id',currentServiceId\)\.eq\('emisor_id',userId\)\.contains\('datos',\{clientMessageId:attemptId\}\)\.maybeSingle\(\)/)
 assert.match(chat,/if\(persisted\)\{await syncAfterSaved\(currentServiceId\);return\}/)
})

test('chat reports P0 send failure only after persistence recovery confirms absence',()=>{
 const recoveryQuery=chat.indexOf("contains('datos',{clientMessageId:attemptId})")
 const recoveryBranch=chat.indexOf('if(recoveryError)',recoveryQuery)
 const unverified=chat.indexOf("reportChatRecovery('chat_send_recovery_unverified'",recoveryBranch)
 const confirmed=chat.indexOf("reportChatFailure('chat_send_error'",unverified)
 assert.ok(recoveryQuery>=0&&recoveryBranch>recoveryQuery&&unverified>recoveryBranch&&confirmed>unverified)
 assert.match(chat,/severity:'P1'[\s\S]*action:`\$\{role\}\.service\.chat\.recovery`/)
})

test('expected contact guard rejection never becomes a Sentinel P0',()=>{
 assert.match(chat,/if\(isContactGuardError\(insertError\.message\)\)\{setBusy\(false\);setError\(message\);return\}/)
})

test('offline or hidden chat load and resync failures do not escalate as realtime P0',()=>{
 assert.match(chat,/function shouldEscalate\(\)\{return document\.visibilityState==='visible'&&navigator\.onLine\}/)
 assert.match(chat,/chat_load_error[\s\S]*if\(shouldEscalate\(\)\)reportChatFailure/)
 assert.match(chat,/chat_resync_error[\s\S]*if\(shouldEscalate\(\)\)reportChatFailureRef\.current/)
})
