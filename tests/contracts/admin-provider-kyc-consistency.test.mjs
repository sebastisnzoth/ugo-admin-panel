import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const api=readFileSync('api/operations.ts','utf8')
const provider=readFileSync('src/mvp/ProviderOnboardingGate.tsx','utf8')
const admin=readFileSync('src/mvp/AdminProviderVerificationPanel.tsx','utf8')
const decision=readFileSync('supabase/migrations/20261015224500_admin_atomic_provider_verification.sql','utf8')
test('Admin KYC approval requires the same four document types the Provider uploads',()=>{
 const expected=['identidad_frente','identidad_dorso','selfie','comprobante_domicilio']
 for(const name of expected){
   assert.match(admin,new RegExp("'"+name+"'"))
   assert.match(provider,new RegExp("'"+name+"'"))
 }
 assert.match(decision,/\('identidad_frente'\),\('identidad_dorso'\),\('selfie'\),\('comprobante_domicilio'\)/)
 assert.match(decision,/d\.estado is distinct from 'aprobado'/)
 assert.match(decision,/KYC_DOCUMENTS_NOT_APPROVED/)
})
test('provider approval is authenticated and its audit can never be silently ignored',()=>{
 assert.match(api,/async function changeProviderVerification/)
 assert.match(api,/await requireAdmin\(req\)/)
 assert.match(api,/sb\.rpc\('admin_decide_provider_verification_atomic'/)
 assert.match(decision,/insert into public\.audit_log/)
 const kyc=api.slice(api.indexOf('async function verifyKyc'),api.indexOf('async function changeProviderVerification'))
 assert.doesNotMatch(kyc,/\.update\(\{ activo: true \}\)/)
 assert.doesNotMatch(kyc,/Tu perfil ha sido verificado y aprobado/)
})
