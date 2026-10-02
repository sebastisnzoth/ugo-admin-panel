import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('AdminGate never bypasses authenticated role verification from URL params',async()=>{
 const gate=await read('src/mvp/AdminGate.tsx')
 assert.doesNotMatch(gate,/publicDevelopmentAccess/)
 assert.match(gate,/return <SecureAdminGate gateParams=\{gateParams\}>/)
 assert.match(gate,/supabase\.auth\.getSession\(\)/)
 assert.match(gate,/\['admin','superadmin'\]\.includes\(profile\.tipo\)/)
})

test('AdminPhase2 derives admin role from persisted authenticated profile only',async()=>{
 const phase=await read('src/mvp/AdminPhase2.tsx')
 assert.doesNotMatch(phase,/publicDevelopmentAccess/)
 assert.doesNotMatch(phase,/setAdminRole\('admin'\).*return/)
 assert.match(phase,/supabase\.auth\.getSession\(\)/)
 assert.match(phase,/from\('usuarios'\)\.select\('tipo,activo'\)/)
 assert.match(phase,/if\(!data\?\.activo\|\|!\['admin','superadmin'\]\.includes\(role\)\)/)
})

test('Super Admin remains protected by persisted superadmin role',async()=>{
 const gate=await read('src/mvp/AdminGate.tsx')
 const phase=await read('src/mvp/AdminPhase2.tsx')
 assert.match(gate,/requiresSuperAdmin\?profile\.tipo==='superadmin'/)
 assert.match(phase,/section==='superadmin'&&adminRole&&!isSuperAdmin/)
 assert.match(phase,/section==='superadmin'&&isSuperAdmin/)
})

test('Admin Gmail actions still require an authenticated bearer session',async()=>{
 const phase=await read('src/mvp/AdminPhase2.tsx')
 assert.match(phase,/const adminToken=useCallback/)
 assert.match(phase,/supabase\.auth\.getSession\(\)/)
 assert.match(phase,/Authorization:`Bearer \$\{token\}`/)
 assert.doesNotMatch(phase,/Ingresar con una sesión Admin para conectar Gmail/)
})
