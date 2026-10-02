import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo UI is detached from the current Admin control center',async()=>{
 const[src,orb]=await Promise.all([
  read('src/mvp/AdminPhase2.tsx'),
  read('src/components/ConversationalOrb.tsx'),
 ])
 assert.doesNotMatch(src,/ConversationalOrb/)
 assert.match(orb,/>Hugo<\/b>/)
 assert.match(orb,/Hugo Admin/)
 assert.match(src,/operations:\$\{operationView\}/)
})

test('Hugo Super Admin UI is detached while dormant runtime remains isolated',async()=>{
 const[superadmin,orb,api]=await Promise.all([
  read('src/mvp/SuperAdminCommandCenter.tsx'),
  read('src/components/ConversationalOrb.tsx'),
  read('api/hugo/chat.ts'),
 ])
 assert.doesNotMatch(superadmin,/ConversationalOrb/)
 assert.match(orb,/feature_flags/)
 assert.match(orb,/integraciones/)
 assert.match(orb,/auditoria/)
 assert.match(api,/Sos Hugo Super Admin/)
 assert.match(api,/Sos Hugo Admin/)
 assert.match(api,/No asumas permisos de Super Admin/)
})

test('Hugo live context covers operational and financial control-center data',async()=>{
 const orb=await read('src/components/ConversationalOrb.tsx')
 for(const table of ['usuarios','vista_todos_proveedores','servicios','disputas','pagos','retiros','deudas_ugo_proveedor','documentos','categorias','tarifas','notificaciones']){
  assert.match(orb,new RegExp("from\\('"+table+"'\\)"))
 }
 assert.match(orb,/deuda_ugo_efectivo/)
 assert.match(orb,/saldo_pendiente_muestra/)
 assert.match(orb,/ugo:native-voice-tool-call/)
 assert.match(orb,/sendToolResponse/)
})

test('Hugo server endpoint accepts role and active surface context',async()=>{
 const api=await read('api/hugo/chat.ts')
 assert.match(api,/requestedRole/)
 assert.match(api,/adminRole=requestedRole==='superadmin'\?'superadmin':'admin'/)
 assert.match(api,/surface=clean\(body\.surface/)
 assert.match(api,/CONTEXTO OPERATIVO EN VIVO/)
 assert.match(api,/clean\(body\.context,60000\)/)
})


test('Admin Hugo role uses the already-authorized local session instead of a redundant getUser request',async()=>{
 const src=await read('src/mvp/AdminPhase2.tsx')
 assert.match(src,/supabase\.auth\.getSession\(\)/)
 assert.doesNotMatch(src,/supabase\.auth\.getUser\(\)/)
 assert.match(src,/from\('usuarios'\)\.select\('tipo,activo'\)/)
})
