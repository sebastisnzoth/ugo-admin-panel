import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(new URL('../../supabase/migrations/20260913185000_secure_push_delivery_pipeline.sql', import.meta.url), 'utf8')
const edge = await readFile(new URL('../../supabase/functions/push-dispatch/index.ts', import.meta.url), 'utf8')
const notificationCenter = await readFile(new URL('../../src/mvp/NotificationCenter.tsx', import.meta.url), 'utf8')

function assertSecureEndpointConflict(source) {
  const conflict = source.match(/on\s+conflict\s*\(endpoint\)\s+do\s+update\s+set\b([\s\S]*?)\bwhere\b([\s\S]*?)\breturning\b/i)
  assert.ok(conflict, 'El pipeline debe conservar un ON CONFLICT(endpoint) condicionado por propietario')
  const [, assignments, ownershipPredicate] = conflict
  assert.doesNotMatch(assignments, /\busuario_id\s*=/i, 'Un conflicto nunca puede reasignar usuario_id')
  assert.match(assignments, /p256dh\s*=\s*excluded\.p256dh/i)
  assert.match(assignments, /auth\s*=\s*excluded\.auth/i)
  assert.match(ownershipPredicate, /public\.push_suscripciones\.usuario_id\s*=\s*v_uid/i)
}

test('push pipeline reasserts endpoint ownership and blocks direct authenticated writes', () => {
  assert.match(migration, /select\s+usuario_id[\s\S]*where\s+endpoint\s*=\s*v_endpoint[\s\S]*for\s+update/i)
  assert.match(migration, /v_owner\s+is\s+not\s+null\s+and\s+v_owner\s*<>\s*v_uid/i)
  assertSecureEndpointConflict(migration)
  assert.match(migration, /alter\s+table\s+public\.push_suscripciones\s+enable\s+row\s+level\s+security/i)
  assert.match(migration, /alter\s+table\s+public\.push_entregas\s+enable\s+row\s+level\s+security/i)
  assert.match(migration, /revoke\s+all\s+on\s+public\.push_suscripciones\s+from\s+anon,\s*authenticated/i)
  assert.match(migration, /revoke\s+all\s+on\s+public\.push_entregas\s+from\s+anon,\s*authenticated/i)
})

test('push runtime secrets stay private and service-role only', () => {
  assert.match(migration, /create\s+table\s+if\s+not\s+exists\s+private\.push_runtime_config/i)
  assert.match(migration, /revoke\s+all\s+on\s+private\.push_runtime_config\s+from\s+public,\s*anon,\s*authenticated/i)
  assert.doesNotMatch(migration, /insert\s+into\s+private\.push_runtime_config/i, 'Las claves VAPID y el token no deben versionarse en una migración')
  assert.match(migration, /auth\.role\(\)\s*<>\s*'service_role'/i)
  assert.match(migration, /revoke\s+all\s+on\s+function\s+public\.push_backend_config\(\)\s+from\s+public,\s*anon,\s*authenticated/i)
  assert.match(migration, /grant\s+execute\s+on\s+function\s+public\.push_backend_config\(\)\s+to\s+service_role/i)
})

test('notification insert queues delivery and invokes the authenticated dispatcher', () => {
  assert.match(migration, /insert\s+into\s+public\.push_entregas\s*\(notificacion_id,suscripcion_id,estado\)/i)
  assert.match(migration, /create\s+trigger\s+trg_enqueue_push_for_notification[\s\S]*after\s+insert\s+on\s+public\.notificaciones/i)
  assert.match(migration, /net\.http_post\([\s\S]*x-ugo-push-token[\s\S]*notification_id/i)
  assert.match(migration, /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+public\.push_entregas\s+to\s+service_role/i)
})

test('new provider offers become deduplicated notifications', () => {
  assert.match(migration, /create\s+trigger\s+trg_notify_provider_new_offer[\s\S]*after\s+insert\s+on\s+public\.ofertas_servicio/i)
  assert.match(migration, /private\.crear_notificacion_unica\([\s\S]*'nueva_oferta'/i)
  assert.match(migration, /'oferta:'\|\|new\.id::text/i)
})

test('provider agenda produces 60 and 30 minute reminders on a recurring gate', () => {
  assert.match(migration, /between\s+now\(\)\+interval\s+'50 minutes'\s+and\s+now\(\)\+interval\s+'70 minutes'/i)
  assert.match(migration, /'agenda:60:'\|\|r\.id::text/i)
  assert.match(migration, /between\s+now\(\)\+interval\s+'20 minutes'\s+and\s+now\(\)\+interval\s+'40 minutes'/i)
  assert.match(migration, /'agenda:30:'\|\|r\.id::text/i)
  assert.match(migration, /cron\.schedule\([\s\S]*'ugo-provider-schedule-reminders'[\s\S]*'\*\/10 \* \* \* \*'/i)
})

test('push edge function authenticates the internal dispatch and handles stale endpoints', () => {
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(edge, /sb\.rpc\("push_backend_config"\)/)
  assert.match(edge, /req\.headers\.get\("x-ugo-push-token"\)/)
  assert.match(edge, /webpush\.sendNotification\(/)
  assert.match(edge, /status===404\|\|status===410/)
  assert.match(edge, /from\("push_suscripciones"\)\.update\(\{activa:false/i)
})

test('browser rotates an obsolete VAPID subscription instead of reporting a false on state', () => {
  assert.match(notificationCenter, /applicationServerKey\?b64\(sub\.options\.applicationServerKey\):''/)
  assert.match(notificationCenter, /currentKey===VAPID_PUBLIC/)
  assert.match(notificationCenter, /rpc\('desactivar_push_suscripcion',\{p_endpoint:sub\.endpoint\}\)/)
  assert.match(notificationCenter, /await\s+sub\.unsubscribe\(\)/)
  assert.match(notificationCenter, /pushManager\.subscribe\(\{userVisibleOnly:true,applicationServerKey:vapidBytes\(VAPID_PUBLIC\)\}\)/)
})
