import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo chat requires authenticated role authority and explains denials',async()=>{
 const[api,policy]=await Promise.all([read('api/hugo/chat.ts'),read('src/server/hugo/authority.ts')])
 assert.match(api,/authorizeHugo\(req,body\)/)
 assert.match(api,/auth\.getUser\(token\)/)
 assert.match(api,/from\('usuarios'\)\.select\('tipo,activo'\)/)
 assert.match(api,/decideHugoAuthority/)
 assert.match(api,/error_code:/)
 assert.match(api,/authority:info\.authority/)
 assert.match(policy,/INACTIVE_PROFILE/)
 assert.match(policy,/ROLE_MISMATCH/)
 assert.match(policy,/requiere autoridad/)
})

test('Hugo Live token already enforces session role before exposing voice tools',async()=>{
 const api=await read('api/test.ts')
 assert.match(api,/voice_live_token===true/)
 assert.match(api,/profile\?\.activo/)
 assert.match(api,/voiceRole==='superadmin'\?profileRole==='superadmin'/)
 assert.match(api,/voiceRole==='provider'\?profileRole==='proveedor':profileRole==='cliente'/)
 assert.match(api,/rol de la sesión no coincide con esta aplicación/)
})

test('Admin Hugo UI is only mounted after verified admin role and sensitive voice mutations stay unavailable',async()=>{
 const[admin,bridge,orb]=await Promise.all([read('src/mvp/AdminPhase2.tsx'),read('src/lib/browserVoiceBridge.ts'),read('src/components/ConversationalOrb.tsx')])
 assert.match(admin,/\['admin','superadmin'\]\.includes\(role\)/)
 assert.match(admin,/\{adminRole&&<ConversationalOrb/)
 assert.doesNotMatch(bridge,/admin_(set|delete|approve|pay|resolve)_/)
 assert.match(bridge,/No modifiques estados, dinero, usuarios, KYC, disputas ni configuración por voz/)
 assert.match(orb,/INVALID_TARGET/)
 assert.match(orb,/Ese módulo no está habilitado para navegación por voz/)
})
