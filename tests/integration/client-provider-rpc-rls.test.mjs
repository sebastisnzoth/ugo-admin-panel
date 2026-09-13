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
const requireIsolated = process.env.UGO_REQUIRE_ISOLATED_INTEGRATION === '1'
const url = process.env.UGO_TEST_SUPABASE_URL || ''
const PROD_REF = 'trfsjuseqjxlhrxuvdsm'

function expectDomainError(result, message) {
  assert.equal(result.error?.code, 'P0001', 'Debe fallar por un guard de dominio, no por red, Auth o RPC ausente')
  assert.match(result.error.message, message)
}

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
  const { data, error } = await supabase.from('servicios').select('id,estado,cliente_id,proveedor_id,tarifa,comision_ugo,ganancia_proveedor,aceptado_at,completado_at').eq('id', serviceId).single()
  if (error) throw error
  return data
}

async function getPayment(supabase, serviceId) {
  const { data, error } = await supabase.from('pagos').select('id,servicio_id,estado,metodo,modelo_pago,monto_bruto,comision_ugo,ganancia_proveedor,pago_externo_id,fecha_confirmacion,liberado_at').eq('servicio_id', serviceId).single()
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
  assert.notEqual(clientId, providerId, 'Cliente y Proveedor deben ser identidades distintas')

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

    const { data: leaked, error: privacyError } = await p.from('servicios').select('id,direccion_cliente,cliente_id').eq('id', serviceId).maybeSingle()
    if (privacyError) throw privacyError
    assert.equal(leaked, null, 'Proveedor con oferta pendiente no debe leer la fila completa de servicios')

    const { data: offers, error: offersError } = await p.rpc('obtener_ofertas_proveedor')
    if (offersError) throw offersError
    const offer = (offers || []).find(row => String(row.servicio_id) === serviceId)
    assert.ok(offer?.id, 'El proveedor debe ver la oportunidad mediante RPC redactado')

    const accepted = await p.rpc('aceptar_oferta', { p_oferta_id: offer.id })
    if (accepted.error) throw accepted.error
    assert.equal(accepted.data?.id, serviceId)

    const assignedService = await getService(c, serviceId)

    const duplicateAccept = await p.rpc('aceptar_oferta', { p_oferta_id: offer.id })
    if (duplicateAccept.error) throw duplicateAccept.error
    assert.equal(duplicateAccept.data?.id, serviceId, 'Reaceptar devuelve el mismo servicio')
    assert.deepEqual(await getService(c, serviceId), assignedService, 'Reaceptar no reasigna ni recalcula el servicio')

    let service = await getService(c, serviceId)
    assert.equal(service.proveedor_id, providerId)
    assert.equal(service.estado, 'asignado')

    const beforePay = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: 'en_camino' })
    expectDomainError(beforePay, /forma de pago habilitada/)
    assert.deepEqual(await getService(c, serviceId), service)

    const payment = await c.rpc('seleccionar_pago_efectivo', { p_servicio_id: serviceId })
    if (payment.error) throw payment.error

    for (const state of ['en_camino', 'llegado']) {
      const step = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: state })
      if (step.error) throw step.error
    }

    const beforeInitialEvidence = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: 'en_progreso' })
    expectDomainError(beforeInitialEvidence, /foto inicial/)
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
    expectDomainError(providerResolve, /Sólo el cliente/)

    const clientResolve = await c.rpc('resolver_ampliacion_servicio', {
      p_ampliacion_id: expansion.data.id,
      p_aprobar: true,
    })
    if (clientResolve.error) throw clientResolve.error
    assert.equal(clientResolve.data?.estado, 'aprobada')
    assert.equal(clientResolve.data?.servicio_id, serviceId)
    assert.equal(clientResolve.data?.pago_estado, 'incluido')

    const expandedService = await getService(c, serviceId)
    assert.equal(Number(expandedService.tarifa), Math.round((Number(service.tarifa) + 10) * 100) / 100)
    const expandedPayment = await getPayment(c, serviceId)
    assert.equal(Number(expandedPayment.monto_bruto), Number(expandedService.tarifa))
    assert.equal(Number(expandedPayment.comision_ugo), Number(expandedService.comision_ugo))
    assert.equal(Number(expandedPayment.ganancia_proveedor), Number(expandedService.ganancia_proveedor))

    const duplicateResolve = await c.rpc('resolver_ampliacion_servicio', {
      p_ampliacion_id: expansion.data.id,
      p_aprobar: true,
    })
    expectDomainError(duplicateResolve, /ya fue resuelta/)
    assert.deepEqual(await getService(c, serviceId), expandedService)
    assert.deepEqual(await getPayment(c, serviceId), expandedPayment)

    const beforeFinalEvidence = await p.rpc('confirmar_pago_efectivo', { p_servicio_id: serviceId })
    expectDomainError(beforeFinalEvidence, /foto final/)
    await insertEvidence(p, serviceId, providerId, 'despues')
    const review = await p.rpc('avanzar_servicio', { p_servicio_id: serviceId, p_estado: 'esperando_aprobacion' })
    expectDomainError(review, /recepción del efectivo/)
    assert.equal((await getService(c, serviceId)).estado, 'en_progreso')

    const cash = await p.rpc('confirmar_pago_efectivo', { p_servicio_id: serviceId })
    if (cash.error) throw cash.error
    const confirmedPayment = await getPayment(c, serviceId)
    assert.equal(confirmedPayment.id, payment.data?.id)
    assert.equal(confirmedPayment.estado, 'liberado')
    assert.equal(confirmedPayment.metodo, 'efectivo')
    assert.equal(confirmedPayment.modelo_pago, 'presencial')
    for (const field of ['monto_bruto', 'comision_ugo', 'ganancia_proveedor']) {
      assert.equal(confirmedPayment[field], expandedPayment[field], 'Confirmar efectivo conserva los importes aprobados')
    }
    assert.ok(confirmedPayment.pago_externo_id)
    assert.ok(confirmedPayment.fecha_confirmacion)
    assert.ok(confirmedPayment.liberado_at)
    assert.equal((await getService(c, serviceId)).estado, 'esperando_aprobacion')

    const duplicateCash = await p.rpc('confirmar_pago_efectivo', { p_servicio_id: serviceId })
    if (duplicateCash.error) throw duplicateCash.error
    assert.deepEqual(duplicateCash.data, cash.data, 'Retry devuelve el mismo recibo sin modificar importes ni timestamps')
    assert.deepEqual(await getPayment(c, serviceId), confirmedPayment)

    const providerCannotApprove = await p.rpc('aprobar_servicio', { p_servicio_id: serviceId })
    expectDomainError(providerCannotApprove, /No autorizado/)

    const approve = await c.rpc('aprobar_servicio', { p_servicio_id: serviceId })
    if (approve.error) throw approve.error
    const completedService = await getService(c, serviceId)

    const duplicateApprove = await c.rpc('aprobar_servicio', { p_servicio_id: serviceId })
    expectDomainError(duplicateApprove, /todavía no puede aprobarse/)
    assert.deepEqual(await getService(c, serviceId), completedService)
    assert.deepEqual(await getPayment(c, serviceId), confirmedPayment)

    service = await getService(c, serviceId)
    assert.equal(service.estado, 'completado')
    assert.equal(service.cliente_id, clientId)
    assert.equal(service.proveedor_id, providerId)
    assert.deepEqual(await getService(p, serviceId), service, 'Ambos roles leen el mismo cierre persistido')
  } finally {
    if (serviceId) await c.from('servicios').delete().eq('id', serviceId)
    await Promise.allSettled([c.auth.signOut(), p.auth.signOut()])
  }
})

test('integration harness documents missing isolated credentials instead of touching production', { skip: enabled }, () => {
  assert.ok(missing.length > 0)
  if (requireIsolated) assert.fail(`P0 isolated RPC/RLS requerido pero faltan: ${missing.join(', ')}`)
  console.log(`SKIP isolated RPC/RLS: faltan ${missing.join(', ')}`)
})
