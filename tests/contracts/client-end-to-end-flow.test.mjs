import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8')

const [need,location,when,payment,summary,post,detail,completion,rating,evidence]=await Promise.all([
 read('src/features/client/request/ClientNeedScreen.tsx'),
 read('src/features/client/request/ClientLocationScreen.tsx'),
 read('src/features/client/request/ClientWhenScreen.tsx'),
 read('src/features/client/payments/ClientPaymentScreen.tsx'),
 read('src/features/client/request/ClientSummaryScreen.tsx'),
 read('src/features/client/request/ClientPostConfirmFlow.tsx'),
 read('src/features/client/order/ClientServiceDetail.tsx'),
 read('src/features/client/order/ClientCompletionReview.tsx'),
 read('src/features/client/rating/ClientRatingPrompt.tsx'),
 read('src/features/client/request/ClientRequestEvidence.tsx'),
])

test('canonical client request covers need, optional evidence, location, when, payment and summary',()=>{
 assert.match(need,/¿Qué hay que hacer\?/)
 assert.match(need,/ClientRequestEvidence/)
 assert.match(need,/Podés continuar sin fotos/)
 assert.match(evidence,/request-evidence/)
 assert.match(location,/Tus lugares/)
 assert.match(location,/Usar mi ubicación/)
 assert.match(location,/pickupSource/)
 assert.match(when,/¿Cuándo lo necesitás\?/)
 assert.match(when,/new Date\(scheduleAt\)\.getTime\(\)<=Date\.now\(\)/)
 assert.match(payment,/¿Cómo vas a pagar\?/)
 assert.match(payment,/useState<Method>\('cash'\)/)
 assert.match(payment,/No se cobra nada en este paso/)
 assert.match(summary,/Confirmar y buscar profesional/)
 assert.match(summary,/disabled=\{!ready\}/)
 assert.match(summary,/Fotos/)
})

test('confirm is idempotent per draft and never blocks a second independent order',()=>{
 assert.match(post,/metadata->>request_draft_id/)
 assert.match(post,/code\|\|'\'\)==='23505'/)
 assert.doesNotMatch(post,/canonical-active-service/)
 assert.doesNotMatch(post,/Ya tenés/)
 assert.match(post,/clearDraft\(\);setSeconds\(0\)/)
})

test('matching remains visible, can run in background and can be retried after draft cleanup',()=>{
 assert.match(post,/Seguir usando UGO/)
 assert.match(post,/Reintentar búsqueda/)
 assert.match(post,/dispatchContext/)
 assert.match(post,/startDispatch\(service\.id,context\)/)
 assert.doesNotMatch(post,/clearDraft\(\);onExit\(\)\}catch/)
 assert.match(detail,/Reintentar búsqueda/)
 assert.match(detail,/getDispatchProvider\(\)\.start/)
})

test('payment and closure remain service-scoped from assignment through rating',()=>{
 assert.match(detail,/ClientPaymentChoice serviceId=\{service\.id\}/)
 assert.match(completion,/aprobar_servicio/)
 assert.match(completion,/confirmar_pago_efectivo_cliente/)
 assert.match(completion,/Primero confirmá que el trabajo quedó bien/)
 assert.match(completion,/YA PAGUÉ/)
 assert.match(rating,/autor_tipo:'cliente'/)
 assert.match(post,/ClientRatingPrompt serviceId=\{service\.id\} embedded/)
})
