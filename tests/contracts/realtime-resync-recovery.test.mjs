import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

const recoveryAssertions=(source,label)=>{
 assert.match(source,/addEventListener\('online'/,`${label} debe resincronizar al recuperar red`)
 assert.match(source,/visibilitychange/,`${label} debe resincronizar al volver a primer plano`)
 assert.match(source,/SUBSCRIBED/,`${label} debe resincronizar después de suscribirse`)
 assert.match(source,/removeEventListener\('online'/,`${label} debe limpiar listener online`)
 assert.match(source,/removeEventListener\('visibilitychange'/,`${label} debe limpiar listener de visibilidad`)
 assert.match(source,/removeChannel/,`${label} debe limpiar el canal realtime`)
}

test('critical realtime consumers recover from missed events using persisted state',async()=>{
 const[notifications,chat,expansions,disputes,provider,clientPayment,clientTracking,completion,postConfirm]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('src/mvp/ServiceChat.tsx'),
  read('src/mvp/ServiceExpansionPanel.tsx'),
  read('src/hooks/useDisputes.ts'),
  read('src/mvp/provider/useProviderRealtime.ts'),
  read('src/features/client/payments/ClientPaymentChoice.tsx'),
  read('src/mvp/ClientLiveTracking.tsx'),
  read('src/features/client/order/ClientCompletionReview.tsx'),
  read('src/features/client/request/ClientPostConfirmFlow.tsx'),
 ])
 recoveryAssertions(notifications,'NotificationCenter')
 recoveryAssertions(chat,'ServiceChat')
 recoveryAssertions(expansions,'ServiceExpansionPanel')
 recoveryAssertions(disputes,'Disputes')
 recoveryAssertions(provider,'Provider flow')
 recoveryAssertions(clientPayment,'ClientPaymentChoice')
 recoveryAssertions(clientTracking,'ClientLiveTracking')
 recoveryAssertions(completion,'ClientCompletionReview')
 recoveryAssertions(postConfirm,'ClientPostConfirmFlow')
 assert.match(completion,/CHANNEL_ERROR|TIMED_OUT/)
 assert.match(postConfirm,/CHANNEL_ERROR|TIMED_OUT/)
})

test('chat and expansion resync when the parent service changes',async()=>{
 const[chat,expansions]=await Promise.all([read('src/mvp/ServiceChat.tsx'),read('src/mvp/ServiceExpansionPanel.tsx')])
 assert.match(chat,/table:'servicios'/)
 assert.match(expansions,/table:'servicios'/)
})
