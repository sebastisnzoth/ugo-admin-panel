type VercelRequest={method?:string;headers:Record<string,string|string[]|undefined>;query:Record<string,string|string[]|undefined>;body?:any}
type VercelResponse={status:(code:number)=>VercelResponse;json:(body:unknown)=>VercelResponse;setHeader:(name:string,value:string)=>void;end:()=>void}
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tmossnqfwfwjrtzwcbmm.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_meCpkMt79S25M0nHgVv1aQ_V9AMPZEl'
const SUPABASE_SERVICE_ROLE_KEY = process.env.UGO_TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
const PROVIDER_VERIFICATION_STATES = new Set(['registrado', 'pendiente', 'verificado', 'rechazado', 'suspendido'])
const USER_ROLES = new Set(['cliente', 'proveedor', 'admin', 'superadmin', 'arbitro'])
const PRIVILEGED_USER_ROLES = new Set(['admin', 'superadmin', 'arbitro'])
const HUGO_AUDIT_ROLES = new Set(['client', 'provider', 'admin', 'superadmin'])
const HUGO_AUDIT_DEPARTMENT: Record<string, number> = { client: 3, provider: 4, admin: 2, superadmin: 1 }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function operation(req: VercelRequest) {
  const raw = req.query.op
  return Array.isArray(raw) ? raw[0] : raw || ''
}

function accessToken(req: VercelRequest) {
  const authHeader = req.headers.authorization || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
}

function clean(value: unknown, max = 160) {
  return String(value ?? '').trim().slice(0, max)
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function selectCash(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend de pagos no configurado.' })
  const token = accessToken(req)
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' })
  const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
  if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.rpc('seleccionar_pago_efectivo', { p_servicio_id: servicioId })
  if (error) return res.status(409).json({ error: error.message })
  const pago = Array.isArray(data) ? data[0] : data
  if (!pago) return res.status(500).json({ error: 'Supabase no devolvió el pago en efectivo.' })
  return res.status(200).json({
    success: true,
    pagoId: pago.id,
    metodo: pago.metodo,
    estado: pago.estado,
    ambiente: pago.ambiente,
    montoTotal: Number(pago.monto_bruto || 0),
    comisionUgo: Number(pago.comision_ugo || 0),
    gananciaProveedor: Number(pago.ganancia_proveedor || 0),
    moneda: pago.moneda || 'BRL',
  })
}

async function confirmCash(req: VercelRequest, res: VercelResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Backend de pagos no configurado.' })
  const token = accessToken(req)
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' })
  const servicioId = typeof req.body?.servicioId === 'string' ? req.body.servicioId : ''
  if (!servicioId) return res.status(400).json({ error: 'Falta servicioId.' })

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.rpc('confirmar_pago_efectivo', { p_servicio_id: servicioId })
  if (error) return res.status(409).json({ error: error.message })
  const pago = Array.isArray(data) ? data[0] : data
  if (!pago) return res.status(500).json({ error: 'Supabase no devolvió la confirmación del efectivo.' })
  return res.status(200).json({
    success: true,
    pagoId: pago.id,
    estado: pago.estado,
    metodo: pago.metodo,
    alreadyConfirmed: pago.estado === 'liberado',
  })
}

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status })
}

async function requireAdmin(req: VercelRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw httpError('Backend Admin no configurado.', 503)

  const token = accessToken(req)
  if (!token) throw httpError('Sesión Admin requerida.', 401)

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await sb.auth.getUser(token)
  const user = authData.user
  if (authError || !user) throw httpError('Sesión inválida o vencida.', 401)

  const { data: profile, error: profileError } = await sb
    .from('usuarios')
    .select('tipo,activo')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile?.activo || !['admin', 'superadmin'].includes(String(profile.tipo))) {
    throw httpError('Acceso Admin requerido.', 403)
  }

  return { sb, user, role: String(profile.tipo) }
}

function adminErrorResponse(res: VercelResponse, error: unknown, fallback: string) {
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 500
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    error: error instanceof Error ? error.message : fallback,
  })
}

async function verifyKyc(req: VercelRequest, res: VercelResponse) {
  const documentoId = typeof req.body?.documentoId === 'string' ? req.body.documentoId.trim() : ''
  const aprobado = req.body?.aprobado
  const notas = typeof req.body?.notas === 'string' ? req.body.notas.trim().slice(0, 2000) : null
  if (!documentoId || typeof aprobado !== 'boolean') return res.status(400).json({ error: 'Missing required fields' })

  try {
    const { sb, user } = await requireAdmin(req)
    const { data: doc, error: docError } = await sb
      .from('documentos')
      .select('usuario_id')
      .eq('id', documentoId)
      .maybeSingle()

    if (docError) throw docError
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' })

    const { error: reviewError } = await sb
      .from('documentos')
      .update({
        estado: aprobado ? 'aprobado' : 'rechazado',
        notas,
        notas_rechazo: aprobado ? null : notas,
        revisor_id: user.id,
        revisado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentoId)
    if (reviewError) throw reviewError

    if (aprobado) {
      const { data: docs, error: docsError } = await sb
        .from('documentos')
        .select('estado')
        .eq('usuario_id', doc.usuario_id)
      if (docsError) throw docsError

      const allApproved = Boolean(docs?.length) && docs.every((item) => item.estado === 'aprobado')
      if (allApproved) {
        const { error: activateError } = await sb.from('usuarios').update({ activo: true }).eq('id', doc.usuario_id)
        if (activateError) throw activateError

        const { error: notificationError } = await sb.from('notificaciones').insert({
          usuario_id: doc.usuario_id,
          tipo: 'kyc_aprobado',
          titulo: '¡Bienvenido a U.GO!',
          cuerpo: 'Tu perfil ha sido verificado y aprobado.',
          datos: { source: 'admin_kyc', documentoId },
          dedupe_key: `kyc_aprobado:${doc.usuario_id}`,
        })
        if (notificationError && notificationError.code !== '23505') throw notificationError
      }
    }

    const { error: auditError } = await sb.from('audit_log').insert({
      evento: aprobado ? 'admin.kyc.approved' : 'admin.kyc.rejected',
      actor_id: user.id,
      entidad_tipo: 'documento',
      entidad_id: documentoId,
      detalles: { usuario_id: doc.usuario_id, notas },
    })
    if (auditError) throw auditError

    return res.status(200).json({ success: true, message: aprobado ? 'Documento aprobado' : 'Documento rechazado' })
  } catch (error) {
    console.error('KYC verify error:', error)
    return adminErrorResponse(res, error, 'Internal server error')
  }
}

async function changeProviderVerification(req: VercelRequest, res: VercelResponse) {
  const providerId = typeof req.body?.providerId === 'string' ? req.body.providerId.trim() : ''
  const state = typeof req.body?.state === 'string' ? req.body.state.trim() : ''
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 2000) : ''

  if (!providerId) {
    return res.status(400).json({ error: 'Proveedor inválido.' })
  }
  if (!PROVIDER_VERIFICATION_STATES.has(state)) {
    return res.status(400).json({ error: 'Estado de verificación inválido.' })
  }
  if (state === 'rechazado' && !reason) {
    return res.status(400).json({ error: 'El motivo es obligatorio al rechazar.' })
  }

  try {
    const { sb, user } = await requireAdmin(req)
    const auditSb = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      : sb
    const { data: current, error: currentError } = await sb
      .from('perfiles_proveedor')
      .select('usuario_id,estado_verificacion')
      .eq('usuario_id', providerId)
      .maybeSingle()

    if (currentError) throw currentError
    if (!current) return res.status(404).json({ error: 'Proveedor no encontrado.' })

    if (state === 'verificado') {
      const { data: docs, error: docsError } = await sb
        .from('documentos')
        .select('tipo,estado')
        .eq('usuario_id', providerId)
      if (docsError) throw docsError
      const requiredDocs = ['identidad_frente', 'identidad_dorso', 'selfie', 'domicilio']
      const approvedTypes = new Set((docs || []).filter((d: any) => d.estado === 'aprobado').map((d: any) => d.tipo))
      const missing = requiredDocs.filter((type) => !approvedTypes.has(type))
      if (missing.length) {
        return res.status(409).json({
          error: 'No se puede verificar el proveedor: faltan documentos KYC aprobados.',
          missing_documents: missing,
        })
      }
    }

    const { data: updated, error: updateError } = await sb
      .from('perfiles_proveedor')
      .update({
        estado_verificacion: state,
        motivo_rechazo: state === 'rechazado' ? reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq('usuario_id', providerId)
      .select('usuario_id,estado_verificacion,motivo_rechazo,updated_at')
      .single()

    if (updateError) throw updateError
    const { error: auditError } = await auditSb.from('audit_log').insert({
      evento: 'admin.provider_verification.update',
      actor_id: user.id,
      entidad_tipo: 'proveedor',
      entidad_id: providerId,
      detalles: { estado_anterior: current.estado_verificacion, estado_nuevo: state, motivo: reason || null },
    })
    if (auditError) throw auditError
    return res.status(200).json({ success: true, provider: updated })
  } catch (error) {
    console.error('Provider verification update error:', error)
    return adminErrorResponse(res, error, 'No se pudo actualizar la verificación del proveedor.')
  }
}

async function createAdminManagedUser(req: VercelRequest, res: VercelResponse) {
  const nombre = clean(req.body?.nombre, 80)
  const apellido = clean(req.body?.apellido, 80)
  const email = clean(req.body?.email, 254).toLowerCase()
  const password = String(req.body?.password ?? '')
  const role = clean(req.body?.role, 30)
  const demo = Boolean(req.body?.demo)
  const providerVerified = Boolean(req.body?.providerVerified)

  if (!nombre) return res.status(400).json({ error: 'Nombre requerido.' })
  if (!validEmail(email)) return res.status(400).json({ error: 'Email inválido.' })
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres.' })
  if (!USER_ROLES.has(role)) return res.status(400).json({ error: 'Rol inválido.' })

  let createdId: string | null = null
  try {
    const { sb, user, role: actorRole } = await requireAdmin(req)
    if (PRIVILEGED_USER_ROLES.has(role) && actorRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo Super Admin puede crear cuentas administrativas.' })
    }

    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido: apellido || null, tipo: role, es_demo: demo },
    })
    if (createError || !created.user) throw createError || new Error('Auth no devolvió el usuario creado.')
    createdId = created.user.id

    const { error: userError } = await sb.from('usuarios').upsert({
      id: createdId,
      nombre,
      apellido: apellido || null,
      email,
      tipo: role,
      activo: true,
      es_demo: demo,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (userError) throw userError

    if (role === 'cliente') {
      const { error: clientError } = await sb.from('perfiles_cliente').upsert({ usuario_id: createdId }, { onConflict: 'usuario_id' })
      if (clientError) throw clientError
    }
    if (role === 'proveedor') {
      const verified = demo && providerVerified
      const { error: providerError } = await sb.from('perfiles_proveedor').upsert({
        usuario_id: createdId,
        estado_verificacion: verified ? 'verificado' : 'registrado',
        online: verified,
        disponible: verified,
      }, { onConflict: 'usuario_id' })
      if (providerError) throw providerError
    }

    const { error: auditError } = await sb.from('audit_log').insert({
      evento: 'admin_usuario_creado',
      actor_id: user.id,
      entidad_tipo: 'usuario',
      entidad_id: createdId,
      detalles: { email, role, demo, providerVerified: role === 'proveedor' ? providerVerified : false },
    })
    if (auditError) throw auditError

    return res.status(201).json({ id: createdId, email, role })
  } catch (error) {
    if (createdId && SUPABASE_SERVICE_ROLE_KEY) {
      const rollback = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      await rollback.from('perfiles_cliente').delete().eq('usuario_id', createdId)
      await rollback.from('perfiles_proveedor').delete().eq('usuario_id', createdId)
      await rollback.from('usuarios').delete().eq('id', createdId)
      await rollback.auth.admin.deleteUser(createdId)
    }
    const message = error instanceof Error ? error.message : 'No se pudo crear el usuario.'
    const duplicate = /already|registered|duplicate/i.test(message)
    return res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'El email ya está registrado.' : 'No se pudo crear el usuario.' })
  }
}

async function importAdminManagedUsers(req: VercelRequest, res: VercelResponse) {
  const rows = Array.isArray(req.body?.users) ? req.body.users.slice(0, 500) : []
  if (!rows.length) return res.status(400).json({ error: 'No hay usuarios para importar.' })
  try {
    const { sb, user, role: actorRole } = await requireAdmin(req)
    const results: Array<{ row: number; email: string; status: string; error?: string }> = []
    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index] || {}
      const nombre = clean(raw.nombre, 80), apellido = clean(raw.apellido, 80)
      const email = clean(raw.email, 254).toLowerCase(), role = clean(raw.tipo || raw.role, 30) || 'cliente'
      const password = String(raw.password ?? '')
      if (!nombre || !validEmail(email) || !USER_ROLES.has(role)) {
        results.push({ row: index + 2, email, status: 'error', error: 'Nombre, email o rol inválido.' }); continue
      }
      if (PRIVILEGED_USER_ROLES.has(role) && actorRole !== 'superadmin') {
        results.push({ row: index + 2, email, status: 'error', error: 'Solo Super Admin puede importar cuentas administrativas.' }); continue
      }
      const generatedPassword = password === '' || password === 'NO_EXPORTABLE'
      const initialPassword = generatedPassword ? crypto.randomUUID() + 'Aa1!' : password
      if (initialPassword.length < 8 || initialPassword.length > 128) {
        results.push({ row: index + 2, email, status: 'error', error: 'Contraseña inválida.' }); continue
      }
      const { data: created, error: createError } = await sb.auth.admin.createUser({
        email, password: initialPassword, email_confirm: true,
        user_metadata: { nombre, apellido: apellido || null, tipo: role, imported_by_admin: true },
      })
      if (createError || !created.user) {
        results.push({ row: index + 2, email, status: 'error', error: /already|registered|duplicate/i.test(createError?.message || '') ? 'El email ya está registrado.' : (createError?.message || 'No se pudo crear Auth.') }); continue
      }
      const id = created.user.id
      const { error: userError } = await sb.from('usuarios').upsert({ id, nombre, apellido: apellido || null, email, tipo: role, activo: String(raw.activo ?? 'si').toLowerCase() !== 'no', updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (userError) { await sb.auth.admin.deleteUser(id); results.push({ row: index + 2, email, status: 'error', error: userError.message }); continue }
      if (role === 'cliente') await sb.from('perfiles_cliente').upsert({ usuario_id: id, telefono: clean(raw.telefono, 40) || null }, { onConflict: 'usuario_id' })
      if (role === 'proveedor') await sb.from('perfiles_proveedor').upsert({ usuario_id: id, telefono_profesional: clean(raw.telefono, 40) || null, estado_verificacion: 'registrado', online: false, disponible: false }, { onConflict: 'usuario_id' })
      await sb.from('audit_log').insert({ evento: 'admin_usuario_importado', actor_id: user.id, entidad_tipo: 'usuario', entidad_id: id, detalles: { email, role, generated_password: generatedPassword } })
      results.push({ row: index + 2, email, status: generatedPassword ? 'creado_requiere_reset' : 'creado' })
    }
    const created = results.filter(item => item.status.startsWith('creado')).length
    return res.status(200).json({ success: true, created, failed: results.length - created, results })
  } catch (error) {
    console.error('Admin user import error:', error)
    return adminErrorResponse(res, error, 'No se pudieron importar los usuarios.')
  }
}

async function resetAdminManagedUserPassword(req: VercelRequest, res: VercelResponse) {
  const userId = clean(req.body?.userId, 80)
  const password = String(req.body?.password ?? '')
  if (!userId) return res.status(400).json({ error: 'Usuario requerido.' })
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres.' })

  try {
    const { sb, user, role: actorRole } = await requireAdmin(req)
    const { data: target, error: targetError } = await sb.from('usuarios').select('id,nombre,tipo,activo').eq('id', userId).maybeSingle()
    if (targetError) throw targetError
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' })
    if (PRIVILEGED_USER_ROLES.has(String(target.tipo)) && actorRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo Super Admin puede restablecer contraseñas de cuentas administrativas.' })
    }
    if (user.id === userId && actorRole !== 'superadmin') {
      return res.status(403).json({ error: 'Usá el flujo de cambio de contraseña de tu propia cuenta.' })
    }

    const { data: updated, error: updateError } = await sb.auth.admin.updateUserById(userId, { password })
    if (updateError || !updated.user) throw updateError || new Error('Auth no confirmó el cambio de contraseña.')

    const { error: auditError } = await sb.from('audit_log').insert({
      evento: 'admin_usuario_password_reset',
      actor_id: user.id,
      entidad_tipo: 'usuario',
      entidad_id: userId,
      detalles: { target_role: String(target.tipo), password_exported: false },
    })
    if (auditError) throw auditError
    return res.status(200).json({ success: true, userId })
  } catch (error) {
    console.error('Admin password reset error:', error)
    return adminErrorResponse(res, error, 'No se pudo restablecer la contraseña.')
  }
}


async function requireHugoAuditActor(req: VercelRequest, requestedRole: string) {
  if (!HUGO_AUDIT_ROLES.has(requestedRole)) throw httpError('Rol Hugo inválido.', 400)
  const token = accessToken(req)
  if (!token) throw httpError('Autenticación requerida.', 401)

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  if (authError || !authData.user) throw httpError('Sesión inválida o vencida.', 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: profile, error: profileError } = await userClient
    .from('usuarios')
    .select('tipo,activo')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) throw httpError('No se pudo verificar la autoridad de Hugo.', 403)
  if (!profile?.activo) throw httpError('Perfil sin autoridad activa.', 403)

  const actual = String(profile.tipo || '').toLowerCase()
  const allowed =
    requestedRole === 'client' ? actual === 'cliente' :
    requestedRole === 'provider' ? actual === 'proveedor' :
    requestedRole === 'admin' ? actual === 'admin' || actual === 'superadmin' :
    actual === 'superadmin'
  if (!allowed) throw httpError('Autoridad Hugo no válida para esta traza.', 403)
  return { user: authData.user, actualRole: actual }
}

async function persistHugoAudit(req: VercelRequest, res: VercelResponse) {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) throw httpError('Auditoría Hugo no configurada.', 503)
    const correlationId = clean(req.body?.correlation_id, 80)
    const action = clean(req.body?.action, 120)
    const intent = clean(req.body?.intent, 500)
    const role = clean(req.body?.role, 30).toLowerCase() || 'client'
    const serviceId = clean(req.body?.service_id, 80)
    if (!UUID_RE.test(correlationId) || !action || !intent) throw httpError('Traza Hugo inválida.', 400)

    const actor = await requireHugoAuditActor(req, role)
    const effect = asRecord(req.body?.effect)
    const response = asRecord(req.body?.response)
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const trace = {
      intent,
      authority: { requested_role: role, profile_role: actor.actualRole, decision: 'ALLOW' },
      action,
      effect,
      audit: { correlation_id: correlationId },
      response,
      source: 'hugo:native-voice-tool-call',
    }

    const { data: decision, error: decisionError } = await sb
      .from('autonomous_decision_ledger')
      .insert({
        department_id: HUGO_AUDIT_DEPARTMENT[role],
        decision: `HUGO_${action.toUpperCase()}`,
        reason: 'Authenticated Hugo tool action with explicit correlated trace.',
        authority_class: 'GREEN',
        policy_version: 'hugo-audit-v1',
        evidence_refs: [{ type: 'hugo_trace', correlation_id: correlationId, service_id: UUID_RE.test(serviceId) ? serviceId : null }],
        authorization_result: 'ALLOW',
        correlation_id: correlationId,
      })
      .select('id')
      .single()
    if (decisionError) throw decisionError

    const { data: evidence, error: evidenceError } = await sb
      .from('autonomous_evidence_ledger')
      .insert({
        evidence_type: 'hugo_action_trace',
        reference: `hugo://trace/${correlationId}`,
        metadata: { ...trace, decision_ledger_id: decision.id, actor_id: actor.user.id, service_id: UUID_RE.test(serviceId) ? serviceId : null },
        correlation_id: correlationId,
        created_by: actor.user.id,
      })
      .select('id')
      .single()
    if (evidenceError) throw evidenceError

    const { data: audit, error: auditError } = await sb
      .from('audit_log')
      .insert({
        evento: 'HUGO_ACTION_TRACE',
        actor_id: actor.user.id,
        entidad_tipo: UUID_RE.test(serviceId) ? 'servicio' : 'hugo',
        entidad_id: UUID_RE.test(serviceId) ? serviceId : null,
        detalles: { ...trace, decision_ledger_id: decision.id, evidence_ledger_id: evidence.id },
      })
      .select('id')
      .single()
    if (auditError) throw auditError

    return res.status(200).json({
      ok: true,
      correlation_id: correlationId,
      ledgers: { decision_id: decision.id, evidence_id: evidence.id, audit_log_id: audit.id },
      stages: ['INTENT', 'AUTHORITY', 'ACTION', 'EFFECT', 'AUDIT', 'RESPONSE'],
    })
  } catch (error) {
    console.error('Hugo audit persistence failed:', error)
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 500
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      error: status === 401 || status === 403 ? (error instanceof Error ? error.message : 'Acceso denegado.') : 'No se pudo persistir la auditoría de Hugo.',
    })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || ''
  const allowedOrigin = origin === 'https://sebastisnzoth.github.io' || origin === 'https://ugo-admin-panel.vercel.app' || origin === 'http://localhost:5173' ? origin : ''
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  switch (operation(req)) {
    case 'hugo-audit': return persistHugoAudit(req, res)
    case 'cash-select': return selectCash(req, res)
    case 'cash-confirm': return confirmCash(req, res)
    case 'kyc-verify': return verifyKyc(req, res)
    case 'provider-verification': return changeProviderVerification(req, res)
    case 'admin-create-user': return createAdminManagedUser(req, res)
    case 'admin-reset-password': return resetAdminManagedUserPassword(req, res)
    case 'admin-import-users': return importAdminManagedUsers(req, res)
    default: return res.status(404).json({ error: 'Operación no encontrada.' })
  }
}
