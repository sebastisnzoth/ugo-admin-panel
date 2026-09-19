import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const chat=fs.readFileSync('src/mvp/ServiceChat.tsx','utf8')

test('specific service chat uses prop serviceId before service data loads',()=>{
 assert.match(chat,/const targetServiceId=serviceId\|\|null/)
 assert.match(chat,/const suffix=targetServiceId\|\|'all'/)
 assert.match(chat,/if\(targetServiceId\)messageConfig\.filter=`servicio_id=eq\.\$\{targetServiceId\}`/)
 assert.match(chat,/if\(targetServiceId\)serviceConfig\.filter=`id=eq\.\$\{targetServiceId\}`/)
})

test('realtime subscription stays stable across conversation loads but recreates after transport failure',()=>{
 assert.match(chat,/const loadRef=useRef\(load\),reportChatFailureRef=useRef\(reportChatFailure\),reportChatRecoveryRef=useRef\(reportChatRecovery\)/)
 assert.match(chat,/loadRef\.current=load/)
 assert.match(chat,/reportChatFailureRef\.current=reportChatFailure/)
 assert.match(chat,/reportChatRecoveryRef\.current=reportChatRecovery/)
 assert.match(chat,/\},\[channelEpoch,compact,role,sb,serviceId,userId\]\)/)
 assert.doesNotMatch(chat,/\},\[compact,load,reportChatFailure,role,sb,service\?\.id,serviceId,userId\]\)/)
 assert.match(chat,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(chat,/resync\(\);reconnect\(\)/)
})

test('session gaps clear chat state instead of becoming P0 auth errors',()=>{
 assert.match(chat,/sb\.auth\.getSession\(\)/)
 assert.doesNotMatch(chat,/sb\.auth\.getUser\(\)/)
 assert.match(chat,/if\(!uid\)\{clearConversation\(\);return\}/)
 assert.match(chat,/setUserId\(null\);setServices\(\[\]\);setService\(null\);setMessages\(\[\]\)/)
})

test('background realtime transport errors resync without downgrading the product',()=>{
 assert.match(chat,/status==='CHANNEL_ERROR'\|\|status==='TIMED_OUT'/)
 assert.match(chat,/resync\(\)/)
 assert.match(chat,/document\.visibilityState==='visible'&&navigator\.onLine/)
 assert.match(chat,/reportChatRecoveryRef\.current\('chat_realtime_subscription_error'/)
 assert.match(chat,/severity:'P1'[\s\S]*action:`\$\{role\}\.service\.chat\.recovery`/)
})
