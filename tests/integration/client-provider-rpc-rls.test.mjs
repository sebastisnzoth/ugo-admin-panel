import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const required = [
  'UGO_TEST_SUPABASE_URL',
  'UGO_TEST_SUPABASE_ANON_KEY',
  'UGO_TEST_CLIENT_EMAIL',
  'UGO_TEST_CLIENT_PASSWORD',
  'UGO_TEST_PROVIDER_EMAIL',
  'UGO_TEST_PROVIDER_PASSWORD',
]

const missing = required.filter(name => !process.env[name])
const enabled = missing.length === 0
const url = process.env.UGO_TEST_SUPABASE_URL || ''
const PROD_REF = 'trfsjuseqjxlhrxuvdsm'

function client() {
  return createClient(process.env.UGO_TEST_SUPABASE_URL, process.env.UGO_TEST_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(email, password) {
  const supabase = client()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  assert.ok(data.user?.id, `No se pudo obtener user id para ${email}`)
  return { supabase, userId: data.user.id }
}

async function firstCategory(supabase) {
  const { data, error } = await supabase.from('categorias').select('id,slug').eq('activa', true).limit(1).single()
  if (error) throw error
  return data
}

async function getService(supabase, serviceId) {
  const { data, error } = await supabase.from('servicios').select('id,estado,cliente_id,proveedor_id,tarifa').eq('id', serviceId).single()
  if (error) throw error
  return data
}

async function insertEvidence(supabase, serviceId, userId, tipo) {
  const { error } = await supabase.from('evidencias_servicio').insert({
    servicio_id: serviceId,
    usuario_id: userId,
    tipo,
    storage_path: `integration/${serviceId}/${tipo}-${crypto.randomUUID()}.jpg`,
    descripcion: `UGO isolated integration ${tipo}`,
  })
  if (error) throw error
}

test('isolated Cliente ↔ Proveedor RPC/RLS lifecycle', { skip: !enabled }, async () => {
  assert.ok(!url.includes(PROD_REF), 'P0 harness se niega a ejecutar contra producción')
  assert.match(url, /^https:\/\/[a-z0-9-]+\.supabase\.co$/)

  const [{ supabase: c, userId: clientId }, { supabase: p, userId: providerId }] = await Promise.all([
    signIn(process.env.UGO_TEST_CLIENT_EMAIL, process.env.UGO_TEST_CLIENT_PASSWORD),
    signIn(process.env.UGO_TEST_PROVIDER_EMAIL, process.env.UGO_TEST_PROVIDER_PASSWORD),
  ])

  const category = await firstCategory(c)
  let serviceId = null

  try {
    const { data: created, error: createError } = await c.from('servicios').insert({
      cliente_id: clientId,
      categoria_id: category.id,
      estado: 'buscando',
      descripcion: `UGO integration ${Date.now()}`,
      urgencia: false,
      metadata: { integration_test: true, source: 'rpc-rls-harness' },
    }).select('id').single()
    if (createError) throw createError
    serviceId = created.id

    const { error: directedError } = await c.rpc('iniciar_matching_dirigido', {
      p_servicio_id: serviceId,
      p_proveedor_id: providerId,
    })
    if (directedError) throw directedError

    const { data: leaked } = await p.from('servicios').select('id,direccion_cliente,cliente_id').eq('id', serviceId).maybeSingle()
    assert.equal(leaked, null, 'Proveedor con oferta pendiente no debe leer la fila completa de servicios')

    const { data: offers, error: offersError } = await p.rpc('obtener_ofertas_proveedor')
    if (offersError) throw offersError
    const offer = (offers || []).find(row => String(row.servicio_id) === serviceId)
    assert.ok(offer?.id, 'El proveedor debe ver la oportunidad mediante RPC redactado')

    const beforePay = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: 'en_camino' })
    assert.ok(beforePay.error, 'No debe poder iniciar viaje sin forma de pago válida')

    const accepted = await p.rpc('aceptar_oferta', { p_oferta_id: offer.id })
    if (accepted.error) throw accepted.error

    const duplicateAccept = await p.rpc('aceptar_oferta', { p_oferta_id: offer.id })
    assert.ok(duplicateAccept.error, 'La misma oferta no puede aceptarse dos veces')

    let service = await getService(c, serviceId)
    assert.equal(service.proveedor_id, providerId)
    assert.equal(service.estado, 'asignado')

    const payment = await c.rpc('seleccionar_pago_efectivo', { p_servicio_id: serviceId })
    if (payment.error) throw payment.error

    for (const state of ['en_camino', 'llegado']) {
      const step = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: state })
      if (step.error) throw step.error
    }

    await insertEvidence(p, serviceId, providerId, 'antes')
    const start = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: 'en_progreso' })
    if (start.error) throw start.error

    const expansion = await p.rpc('proponer_ampliacion_servicio', {
      p_servicio_id: serviceId,
      p_descripcion: 'Trabajo adicional de integración',
      p_monto_extra: 10,
      p_minutos_extra: 15,
    })
    if (expansion.error) throw expansion.error
    assert.ok(expansion.data?.id, 'La ampliación debe conservar vínculo al servicio activo')

    const providerResolve = await p.rpc('resolver_ampliacion_servicio', {
      p_ampliacion_id: expansion.data.id,
      p_aprobar: true,
    })
    assert.ok(providerResolve.error, 'El proveedor no puede aprobar su propia ampliación')

    const clientResolve = await c.rpc('resolver_ampliacion_servicio', {
      p_ampliacion_id: expansion.data.id,
      p_aprobar: true,
    })
    if (clientResolve.error) throw clientResolve.error
    assert.equal(clientResolve.data?.estado, 'aprobada')

    const duplicateResolve = await c.rpc('resolver_ampliacion_servicio', {
      p_ampliacion_id: expansion.data.id,
      p_aprobar: true,
    })
    assert.ok(duplicateResolve.error, 'Una ampliación resuelta no puede aprobarse dos veces')

    await insertEvidence(p, serviceId, providerId, 'despues')
    const review = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: 'esperando_aprobacion' })
    if (review.error) throw review.error

    const cash = await p.rpc('confirmar_pago_efectivo', { p_servicio_id: serviceId })
    if (cash.error) throw cash.error

    const duplicateCash = await p.rpc('confirmar_pago_efectivo', { p_servicio_id: serviceId })
    assert.ok(duplicateCash.error, 'La confirmación de efectivo no debe duplicar el cierre financiero')

    const providerCannotApprove = await p.rpc('aprobar_servicio', { p_servicio_id: serviceId })
    assert.ok(providerCannotApprove.error, 'Proveedor no puede aprobar cierre en nombre del Cliente')

    const approve = await c.rpc('aprobar_servicio', { p_servicio_id: serviceId })
    if (approve.error) throw approve.error

    const duplicateApprove = await c.rpc('aprobar_servicio', { p_servicio_id: serviceId })
    assert.ok(duplicateApprove.error, 'El Cliente no debe cerrar dos veces el mismo servicio')

    service = await getService(c, serviceId)
    assert.equal(service.estado, 'completado')
    assert.equal(service.cliente_id, clientId)
    assert.equal(service.proveedor_id, providerId)
  } finally {
    if (serviceId) {
      // Limpieza best-effort. El entorno aislado puede conservar la fila para diagnóstico si RLS la bloquea.
      await c.from('servicios').delete().eq('id', serviceId)
    }
    await Promise.allSettled([c.auth.signOut(), p.auth.signOut()])
  }
})

test('integration harness documents missing isolated credentials instead of touching production', { skip: enabled }, () => {
  assert.ok(missing.length > 0)
  console.log(`SKIP isolated RPC/RLS: faltan ${missing.join(', ')}`)
})
