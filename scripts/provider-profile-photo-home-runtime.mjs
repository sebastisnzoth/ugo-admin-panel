import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const TEST_URL = 'https://tmossnqfwfwjrtzwcbmm.supabase.co'
const url = process.env.UGO_TEST_SUPABASE_URL || ''
const anon = process.env.UGO_TEST_SUPABASE_ANON_KEY || ''
const serviceRole = process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY || ''
const sha = process.env.UGO_RUNTIME_SHA || ''
const base = process.env.UGO_UI_BASE_URL || 'http://127.0.0.1:4173'
assert.equal(url, TEST_URL, 'UGO_TEST_ONLY')
assert.ok(anon && serviceRole && sha, 'PROFILE_PHOTO_HOME_RUNTIME_INPUTS_REQUIRED')

const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
const clientAuth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
const token = sha.slice(0, 8) + '-' + Date.now()
const password = 'UGO-Photo-Home-' + token + '-A9!'
const providerEmail = 'ugo-photo-provider-' + token + '@example.test'
const clientEmail = 'ugo-photo-client-' + token + '@example.test'
let providerId = null, clientId = null, serviceId = null, browser = null
const pathFor = () => providerId + '/profile/home-runtime-' + token + '.png'
let photoPath = null, screenshotVerified = false, fallbackVerified = false

async function cleanup() {
  const errors = []
  if (serviceId) {
    for (const table of ['pagos', 'ofertas_servicio']) {
      try { const r = await admin.from(table).delete().eq('servicio_id', serviceId); if (r.error) errors.push(table + '_cleanup_failed') }
      catch { errors.push(table + '_cleanup_failed') }
    }
    try { const r = await admin.from('servicios').delete().eq('id', serviceId); if (r.error) errors.push('service_cleanup_failed') }
    catch { errors.push('service_cleanup_failed') }
  }
  if (providerId) {
    try { const r = await admin.from('perfiles_proveedor').delete().eq('usuario_id', providerId); if (r.error) errors.push('provider_profile_cleanup_failed') }
    catch { errors.push('provider_profile_cleanup_failed') }
  }
  if (clientId) {
    try { const r = await admin.from('perfiles_cliente').delete().eq('usuario_id', clientId); if (r.error) errors.push('client_profile_cleanup_failed') }
    catch { errors.push('client_profile_cleanup_failed') }
  }
  for (const id of [providerId, clientId]) {
    if (!id) continue
    try { const r = await admin.from('usuarios').delete().eq('id', id); if (r.error) errors.push('user_row_cleanup_failed') }
    catch { errors.push('user_row_cleanup_failed') }
    try { const r = await admin.auth.admin.deleteUser(id); if (r.error) errors.push('auth_user_cleanup_failed') }
    catch { errors.push('auth_user_cleanup_failed') }
  }
  if (photoPath) {
    try { const r = await admin.storage.from('provider-public').remove([photoPath]); if (r.error) errors.push('photo_object_cleanup_failed') }
    catch { errors.push('photo_object_cleanup_failed') }
  }
  if (browser) { try { await browser.close() } catch { errors.push('browser_cleanup_failed') } }
  return [...new Set(errors)]
}

try {
  const p = await admin.auth.admin.createUser({ email: providerEmail, password, email_confirm: true, user_metadata: { nombre: 'UGO Provider Photo Home Runtime', tipo: 'proveedor' } })
  if (p.error) throw p.error
  providerId = p.data.user.id
  const c = await admin.auth.admin.createUser({ email: clientEmail, password, email_confirm: true, user_metadata: { nombre: 'UGO Client Photo Home Runtime', tipo: 'cliente' } })
  if (c.error) throw c.error
  clientId = c.data.user.id

  const prepared = await admin.rpc('autonomous_qa_prepare_provider_active_job', { p_provider_id: providerId, p_client_id: clientId })
  assert.ifError(prepared.error)
  serviceId = prepared.data.service_id
  assert.equal(prepared.data.state, 'asignado')

  const clientProfile = await admin.from('perfiles_cliente').upsert({ usuario_id: clientId }, { onConflict: 'usuario_id' })
  assert.ifError(clientProfile.error)

  photoPath = pathFor()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zt9sAAAAASUVORK5CYII=', 'base64')
  const uploaded = await admin.storage.from('provider-public').upload(photoPath, new Blob([png], { type: 'image/png' }), { contentType: 'image/png', cacheControl: '60', upsert: false })
  assert.ifError(uploaded.error)
  const publicUrl = admin.storage.from('provider-public').getPublicUrl(photoPath).data.publicUrl
  const providerProfile = await admin.from('perfiles_proveedor').update({ foto_perfil_path: photoPath }).eq('usuario_id', providerId)
  assert.ifError(providerProfile.error)
  const providerUser = await admin.from('usuarios').update({ foto_url: publicUrl }).eq('id', providerId)
  assert.ifError(providerUser.error)
  const http = await fetch(publicUrl)
  assert.equal(http.status, 200, 'PROVIDER_PHOTO_PUBLIC_URL_MUST_RETURN_200')
  assert.match(http.headers.get('content-type') || '', /image\/png/)

  const login = await clientAuth.auth.signInWithPassword({ email: clientEmail, password })
  assert.ifError(login.error)
  assert.ok(login.data.session, 'CLIENT_TEST_SESSION_REQUIRED')

  await fs.mkdir('artifacts', { recursive: true })
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.addInitScript(session => { localStorage.setItem('ugo-test-client-auth', JSON.stringify(session)) }, login.data.session)
  await page.goto(base + '/?app=client', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.getByRole('main', { name: 'Inicio UGO Cliente' }).waitFor({ state: 'visible', timeout: 30000 })
  const assigned = page.getByText('Profesional asignado', { exact: true }).first()
  await assigned.waitFor({ state: 'visible', timeout: 30000 })
  const avatar = page.locator('.ugo-home-assigned-avatar').first()
  const image = avatar.locator('img')
  await image.waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(() => {
    const img = document.querySelector('.ugo-home-assigned-avatar img')
    return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0
  }, null, { timeout: 15000 })
  const photoNaturalWidth = await image.evaluate(img => img.naturalWidth)
  assert.ok(photoNaturalWidth > 0, 'PROVIDER_PHOTO_NATURAL_WIDTH_REQUIRED')
  await page.screenshot({ path: 'artifacts/provider-profile-photo-home.png', fullPage: true })
  screenshotVerified = true

  const clearPhoto = await admin.from('usuarios').update({ foto_url: null }).eq('id', providerId)
  assert.ifError(clearPhoto.error)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('main', { name: 'Inicio UGO Cliente' }).waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText('Profesional asignado', { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 })
  const fallback = page.locator('.ugo-home-assigned-avatar').first()
  await fallback.waitFor({ state: 'visible', timeout: 10000 })
  await fallback.locator('img').waitFor({ state: 'detached', timeout: 10000 })
  assert.match(await fallback.innerText(), /UP/, 'AVATAR_INITIALS_FALLBACK_REQUIRED')
  await page.screenshot({ path: 'artifacts/provider-profile-photo-home-fallback.png', fullPage: true })
  fallbackVerified = true

  await fs.writeFile('artifacts/provider-profile-photo-home-runtime.json', JSON.stringify({
    readiness_id: 'provider-profile-photo-home',
    sha,
    environment: 'UGO TEST',
    production_touched: false,
    public_fetch_status: http.status,
    content_type: http.headers.get('content-type'),
    assigned_card_rendered: true,
    photo_natural_width: photoNaturalWidth,
    photo_visual_screenshot: 'artifacts/provider-profile-photo-home.png',
    initials_fallback_rendered: true,
    fallback_screenshot: 'artifacts/provider-profile-photo-home-fallback.png',
    result: 'PASS',
    completed_at: new Date().toISOString()
  }, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'PASS', photo_rendered: screenshotVerified, initials_fallback: fallbackVerified, public_fetch_status: http.status }))
} finally {
  const cleanupErrors = await cleanup()
  if (cleanupErrors.length) {
    console.warn(JSON.stringify({ cleanup_errors: cleanupErrors }))
    throw new Error('PROFILE_PHOTO_HOME_CLEANUP_REQUIRED')
  }
}
