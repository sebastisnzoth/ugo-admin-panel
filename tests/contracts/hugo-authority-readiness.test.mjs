import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo chat requires authenticated role authority and explains denials',async()=>{
 const[api,auth,policy,permissions]=await Promise.all([read('api/hugo/chat.ts'),read('server/hugo/auth.ts'),read('server/hugo/authority.ts'),read('server/hugo/permissions.ts')])
 assert.match(api,/authorizeHugo\(req,body\)/)
 assert.match(auth,/auth\.getUser\(token\)/)
 assert.match(auth,/from\('usuarios'\)\.select\('tipo,activo'\)/)
 assert.match(auth,/decideHugoAuthority/)
 assert.match(api,/error_code:/)
 assert.match(api,/authority:info\.authority/)
 assert.match(policy,/INACTIVE_PROFILE/)
 assert.match(policy,/ROLE_MISMATCH/)
 assert.match(policy,/requiere autoridad/)
 assert.match(permissions,/superadmin:\{canReadOwnContext:true,canReadOperationalContext:true,canReadGlobalGovernance:true/)
})

test('Hugo Live token already enforces session role before exposing voice tools',async()=>{
 const api=await read('api/test.ts')
 assert.match(api,/voice_live_token===true/)
 assert.match(api,/profile\?\.activo/)
 assert.match(api,/voiceRole==='superadmin'\?profileRole==='superadmin'/)
 assert.match(api,/voiceRole==='provider'\?profileRole==='proveedor':profileRole==='cliente'/)
 assert.match(api,/rol de la sesión no coincide con esta aplicación/)
})

test('visible Admin and Super Admin surfaces keep the Hugo orb disabled',async()=>{
 const[admin,superAdmin,bridge]=await Promise.all([read('src/mvp/AdminPhase2.tsx'),read('src/mvp/SuperAdminCommandCenter.tsx'),read('src/lib/browserVoiceBridge.ts')])
 assert.match(admin,/\['admin','superadmin'\]\.includes\(role\)/)
 assert.doesNotMatch(admin,/<ConversationalOrb/)
 assert.doesNotMatch(superAdmin,/<ConversationalOrb/)
 assert.doesNotMatch(bridge,/admin_(set|delete|approve|pay|resolve)_/)
})
