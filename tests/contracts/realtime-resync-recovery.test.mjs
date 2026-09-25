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
 const[notifications,chat,expansions,disputes,provider,clientPayment,clientTracking,completion,postConfirm,history,providerHistory,providerAgenda]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('src/mvp/ServiceChat.tsx'),
  read('src/mvp/ServiceExpansionPanel.tsx'),
  read('src/hooks/useDisputes.ts'),
  read('src/mvp/provider/useProviderRealtime.ts'),
  read('src/features/client/payments/ClientPaymentChoice.tsx'),
  read('src/features/client/order/ClientLiveTracking.tsx'),
  read('src/features/client/order/ClientCompletionReview.tsx'),
  read('src/features/client/request/ClientPostConfirmFlow.tsx'),
  read('src/mvp/ServiceHistoryPanel.tsx'),
  read('src/mvp/ProviderHistoryDetail.tsx'),
  read('src/mvp/provider/ProviderAgenda.tsx'),
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
 recoveryAssertions(history,'ServiceHistoryPanel')
 recoveryAssertions(providerHistory,'ProviderHistoryDetail')
 recoveryAssertions(providerAgenda,'ProviderAgenda')
 assert.match(notifications,/CHANNEL_ERROR|TIMED_OUT/)
 assert.match(notifications,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(completion,/CHANNEL_ERROR|TIMED_OUT/)
 assert.match(postConfirm,/CHANNEL_ERROR|TIMED_OUT/)
 assert.match(history,/CHANNEL_ERROR|TIMED_OUT/)
 assert.match(history,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(providerHistory,/table:'pagos'/)
 assert.match(providerHistory,/CHANNEL_ERROR|TIMED_OUT|CLOSED/)
 assert.match(providerHistory,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(providerAgenda,/CHANNEL_ERROR|TIMED_OUT|CLOSED/)
 assert.match(providerAgenda,/setChannelEpoch\(value=>value\+1\)/)
 assert.match(providerAgenda,/provider-agenda-\$\{id\}-\$\{channelEpoch\}/)
})

test('chat and expansion resync when the parent service changes',async()=>{
 const[chat,expansions]=await Promise.all([read('src/mvp/ServiceChat.tsx'),read('src/mvp/ServiceExpansionPanel.tsx')])
 assert.match(chat,/table:'servicios'/)
 assert.match(expansions,/table:'servicios'/)
})
