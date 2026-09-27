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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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

function deferred(label, timeoutMs = 20000) {
  let timer
  let resolvePromise
  const promise = new Promise((resolve, reject) => {
    resolvePromise = value => {
      clearTimeout(timer)
      resolve(value)
    }
    timer = setTimeout(() => reject(new Error(`${label}: timeout sin evento Realtime`)), timeoutMs)
  })
  return { promise, resolve: resolvePromise, cancel: () => clearTimeout(timer) }
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

async function persistedMessage(sb, attempt) {
  const { data, error } = await sb
    .from('mensajes')
    .select('id,servicio_id,emisor_id,emisor_rol,contenido,datos')
    .contains('datos', { clientMessageId: attempt })
    .maybeSingle()
  if (error) throw error
  return data
}

async function probeDirection({
  sender,
  receiver,
  serviceId,
  senderId,
  senderRole,
  text,
  label,
  runId,
}) {
  let lastError
  for (let retry = 0; retry < 2; retry += 1) {
    const attempt = `realtime-ci-${senderRole}-${runId}-${retry}`
    const signal = deferred(`${label} intento ${retry + 1}`)
    const channel = receiver
      .channel(`chat-probe-${senderRole}-${runId}-${retry}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `servicio_id=eq.${serviceId}`,
      }, payload => {
        if (payload?.new?.datos?.clientMessageId === attempt) signal.resolve(payload.new)
      })

    try {
      await subscribe(channel, `${label} canal intento ${retry + 1}`)
      await sleep(750)

      const { data: sent, error: sendError } = await sender
        .from('mensajes')
        .insert({
          servicio_id: serviceId,
          emisor_id: senderId,
          emisor_rol: senderRole,
          contenido: text,
          datos: { source: 'realtime_ci_probe', clientMessageId: attempt, runId, retry },
        })
        .select('id,servicio_id,emisor_id,emisor_rol,contenido,datos')
        .single()
      if (sendError) throw sendError

      const event = await signal.promise
      assert.equal(event.servicio_id, serviceId)
      assert.equal(event.emisor_id, senderId)
      assert.equal(event.contenido, text)

      const persisted = await persistedMessage(receiver, attempt)
      assert.equal(persisted?.id, sent.id, `${label}: receptor debe leer el mismo mensaje persistido`)
      return { sent, event, retry }
    } catch (error) {
      lastError = error
      const persisted = await persistedMessage(receiver, attempt).catch(() => null)
      if (!persisted) throw error
      if (retry === 0) {
        console.warn(`${label}: primer evento Realtime no observado; persistencia confirmada, reintentando con canal y mensaje nuevos`)
        await sleep(1000)
      }
    } finally {
      signal.cancel()
      await receiver.removeChannel(channel).catch(() => {})
    }
  }
  throw lastError || new Error(`${label}: Realtime no confirmado`)
}

const runId = crypto.randomUUID()
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

  const clientToProvider = await probeDirection({
    sender: client,
    receiver: provider,
    serviceId: service.id,
    senderId: clientId,
    senderRole: 'cliente',
    text: clientText,
    label: 'Cliente→Proveedor',
    runId,
  })

  const providerToClient = await probeDirection({
    sender: provider,
    receiver: client,
    serviceId: service.id,
    senderId: providerId,
    senderRole: 'proveedor',
    text: providerText,
    label: 'Proveedor→Cliente',
    runId,
  })

  console.log(
    `CHAT_REALTIME_OK pedido=${service.numero ?? 'fixture'} estado=${service.estado} run=${runId} retries=${clientToProvider.retry + providerToClient.retry}`,
  )
} finally {
  await Promise.allSettled([client.auth.signOut(), provider.auth.signOut()])
}
