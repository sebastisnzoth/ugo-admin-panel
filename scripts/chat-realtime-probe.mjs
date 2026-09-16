import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const TEST_REF = 'tmossnqfwfwjrtzwcbmm'
const PROD_REF = 'trfsjuseqjxlhrxuvdsm'
const required = [
  'UGO_TEST_SUPABASE_URL',
  'UGO_TEST_SUPABASE_ANON_KEY',
  'UGO_TEST_CLIENT_EMAIL',
  'UGO_TEST_CLIENT_PASSWORD',
  'UGO_TEST_PROVIDER_EMAIL',
  'UGO_TEST_PROVIDER_PASSWORD',
]

const missing = required.filter(name => !process.env[name])
if (missing.length) throw new Error(`Faltan credenciales TEST requeridas: ${missing.join(', ')}`)

const url = process.env.UGO_TEST_SUPABASE_URL
assert.ok(url.includes(TEST_REF), 'Realtime probe sólo puede ejecutar contra UGO TEST')
assert.ok(!url.includes(PROD_REF), 'Realtime probe se niega a ejecutar contra producción')

function supabase() {
  return createClient(url, process.env.UGO_TEST_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(email, password) {
  const sb = supabase()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  assert.ok(data.user?.id, 'La sesión TEST no devolvió user id')
  return { sb, userId: data.user.id }
}

function deferred(label, timeoutMs = 15000) {
  let timer
  let resolvePromise
  let rejectPromise
  const promise = new Promise((resolve, reject) => {
    resolvePromise = value => {
      clearTimeout(timer)
      resolve(value)
    }
    rejectPromise = error => {
      clearTimeout(timer)
      reject(error)
    }
    timer = setTimeout(() => reject(new Error(`${label}: timeout sin evento Realtime`)), timeoutMs)
  })
  return { promise, resolve: resolvePromise, reject: rejectPromise }
}

function subscribe(channel, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: timeout al suscribir`)), 12000)
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer)
        resolve()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer)
        reject(new Error(`${label}: ${status}`))
      }
    })
  })
}

const runId = crypto.randomUUID()
const clientAttempt = `realtime-ci-client-${runId}`
const providerAttempt = `realtime-ci-provider-${runId}`
const clientText = 'Prueba UGO Realtime: mensaje del cliente.'
const providerText = 'Prueba UGO Realtime: respuesta del proveedor.'

const { sb: client, userId: clientId } = await signIn(
  process.env.UGO_TEST_CLIENT_EMAIL,
  process.env.UGO_TEST_CLIENT_PASSWORD,
)
const { sb: provider, userId: providerId } = await signIn(
  process.env.UGO_TEST_PROVIDER_EMAIL,
  process.env.UGO_TEST_PROVIDER_PASSWORD,
)

let clientChannel
let providerChannel
try {
  assert.notEqual(clientId, providerId, 'Cliente y Proveedor deben ser identidades distintas')

  const { data: candidates, error: candidateError } = await client
    .from('servicios')
    .select('id,numero,estado,cliente_id,proveedor_id,created_at,metadata')
    .eq('cliente_id', clientId)
    .eq('proveedor_id', providerId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (candidateError) throw candidateError

  const service = (candidates || []).find(row => row.metadata?.integration_test === true)
    || (candidates || []).find(row => Number(row.numero) === 31)
    || (candidates || [])[0]
  assert.ok(service?.id, 'No existe un serviceId compartido por las identidades TEST')

  const { data: providerService, error: providerServiceError } = await provider
    .from('servicios')
    .select('id,numero,cliente_id,proveedor_id,estado')
    .eq('id', service.id)
    .maybeSingle()
  if (providerServiceError) throw providerServiceError
  assert.equal(providerService?.id, service.id, 'Proveedor debe leer el mismo serviceId')

  const providerSawClient = deferred('Proveedor no recibió mensaje Cliente→Proveedor')
  const clientSawProvider = deferred('Cliente no recibió mensaje Proveedor→Cliente')

  clientChannel = client
    .channel(`chat-probe-client-${runId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'mensajes',
      filter: `servicio_id=eq.${service.id}`,
    }, payload => {
      if (payload?.new?.datos?.clientMessageId === providerAttempt) clientSawProvider.resolve(payload.new)
    })

  providerChannel = provider
    .channel(`chat-probe-provider-${runId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'mensajes',
      filter: `servicio_id=eq.${service.id}`,
    }, payload => {
      if (payload?.new?.datos?.clientMessageId === clientAttempt) providerSawClient.resolve(payload.new)
    })

  await Promise.all([
    subscribe(clientChannel, 'Canal Cliente'),
    subscribe(providerChannel, 'Canal Proveedor'),
  ])

  const { data: sentByClient, error: clientSendError } = await client
    .from('mensajes')
    .insert({
      servicio_id: service.id,
      emisor_id: clientId,
      emisor_rol: 'cliente',
      contenido: clientText,
      datos: { source: 'realtime_ci_probe', clientMessageId: clientAttempt, runId },
    })
    .select('id,servicio_id,emisor_id,emisor_rol,contenido,datos')
    .single()
  if (clientSendError) throw clientSendError

  const providerEvent = await providerSawClient.promise
  assert.equal(providerEvent.servicio_id, service.id)
  assert.equal(providerEvent.emisor_id, clientId)
  assert.equal(providerEvent.contenido, clientText)

  const { data: providerRead, error: providerReadError } = await provider
    .from('mensajes')
    .select('id,servicio_id,emisor_id,emisor_rol,contenido,datos')
    .eq('id', sentByClient.id)
    .single()
  if (providerReadError) throw providerReadError
  assert.equal(providerRead.id, sentByClient.id, 'Proveedor debe leer el mensaje persistido del Cliente')

  const { data: sentByProvider, error: providerSendError } = await provider
    .from('mensajes')
    .insert({
      servicio_id: service.id,
      emisor_id: providerId,
      emisor_rol: 'proveedor',
      contenido: providerText,
      datos: { source: 'realtime_ci_probe', clientMessageId: providerAttempt, runId },
    })
    .select('id,servicio_id,emisor_id,emisor_rol,contenido,datos')
    .single()
  if (providerSendError) throw providerSendError

  const clientEvent = await clientSawProvider.promise
  assert.equal(clientEvent.servicio_id, service.id)
  assert.equal(clientEvent.emisor_id, providerId)
  assert.equal(clientEvent.contenido, providerText)

  const { data: clientRead, error: clientReadError } = await client
    .from('mensajes')
    .select('id,servicio_id,emisor_id,emisor_rol,contenido,datos')
    .eq('id', sentByProvider.id)
    .single()
  if (clientReadError) throw clientReadError
  assert.equal(clientRead.id, sentByProvider.id, 'Cliente debe leer la respuesta persistida del Proveedor')

  console.log(`CHAT_REALTIME_OK pedido=${service.numero ?? 'fixture'} estado=${service.estado} run=${runId}`)
} finally {
  await Promise.allSettled([
    clientChannel ? client.removeChannel(clientChannel) : Promise.resolve(),
    providerChannel ? provider.removeChannel(providerChannel) : Promise.resolve(),
  ])
  await Promise.allSettled([client.auth.signOut(), provider.auth.signOut()])
}
