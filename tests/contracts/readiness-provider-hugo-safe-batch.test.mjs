import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(p,'utf8')

test('provider dispute is wired to exact service and supports evidence/messages',()=>{
 const root=read('src/mvp/provider/ProviderRoot.tsx')
 const hook=read('src/hooks/useDisputes.ts')
 assert.match(root,/DisputeDock role="provider"/)
 assert.match(root,/serviceId=\{flow\.disputeServiceId\}/)
 assert.match(root,/openRequest=\{screen==='dispute'\}/)
 assert.match(hook,/storage\.from\('dispute-evidence'\)\.upload/)
 assert.match(hook,/rpc\('abrir_disputa_v2'/)
 assert.match(hook,/rpc\('responder_disputa'/)
 assert.match(hook,/table:'disputas'/)
 assert.match(hook,/table:'disputa_mensajes'/)
})

test('provider notifications cover realtime, attention and web push',()=>{
 const root=read('src/mvp/provider/ProviderRoot.tsx')
 const center=read('src/mvp/NotificationCenter.tsx')
 assert.match(root,/NotificationCenter role="provider"/)
 assert.match(center,/table:'notificaciones'/)
 assert.match(center,/guardar_push_suscripcion/)
 assert.match(center,/PROVIDER_ATTENTION_TYPES/)
 assert.match(center,/nueva_oferta/)
 assert.match(center,/chat_mensaje/)
 assert.match(center,/trabajo_asignado/)
 assert.match(center,/Notification\.requestPermission/)
})

test('Hugo model-bound payloads are sanitized on both backends',()=>{
 for(const path of ['api/hugo/chat.ts','supabase/functions/hugo-chat/index.ts']){
  const src=read(path)
  assert.match(src,/sanitizeForModel/)
  assert.match(src,/\[REDACTED\]/)
  assert.match(src,/REDACTED_BLOB/)
  assert.match(src,/Bearer/)
  assert.match(src,/service[_-]?role/i)
 }
 const edge=read('supabase/functions/hugo-chat/index.ts')
 assert.doesNotMatch(edge,/hugo_mensaje:\s*\`Error:/)
 assert.match(edge,/safeHistory/)
 assert.match(edge,/safeContext/)
})

test('Hugo mobile surfaces have bounded panels and keyboard-safe inputs',()=>{
 const client=read('src/mvp/client/client-hugo-voice-order.css')
 const provider=read('src/mvp/provider/provider-responsive-hardening.css')
 assert.match(client,/ugo-hugo-voice-panel\{[^}]*width:min\(100%,620px\)[^}]*max-height:min\(88vh,760px\)/)
 assert.match(client,/@media\(max-width:520px\)/)
 assert.match(client,/safe-area-inset-bottom/)
 assert.match(provider,/provider-global-hugo/)
 assert.match(provider,/max-width:calc\(100vw - 20px\)/)
 assert.match(provider,/input,[\s\S]*font-size:16px/)
})
