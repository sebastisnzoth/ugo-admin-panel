import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const api=readFileSync('api/operations.ts','utf8')
const provider=readFileSync('src/mvp/ProviderOnboardingGate.tsx','utf8')
const admin=readFileSync('src/mvp/AdminProviderVerificationPanel.tsx','utf8')
test('Admin KYC approval requires the same four document types the Provider uploads',()=>{
 const expected=['identidad_frente','identidad_dorso','selfie','comprobante_domicilio']
 for(const name of expected){
   assert.match(admin,new RegExp("'"+name+"'"))
   assert.match(provider,new RegExp("'"+name+"'"))
 }
 assert.match(api,/const requiredDocs = \['identidad_frente', 'identidad_dorso', 'selfie', 'comprobante_domicilio'\]/)
 assert.doesNotMatch(api,/const requiredDocs = \[[^\]]*'domicilio'\]/)
 assert.match(api,/d\.estado === 'aprobado'/)
 assert.match(api,/if \(missing\.length\)/)
})
test('provider approval is authenticated and its audit can never be silently ignored',()=>{
 assert.match(api,/async function changeProviderVerification/)
 assert.match(api,/await requireAdmin\(req\)/)
 assert.match(api,/if \(auditError\) throw auditError/)
 const kyc=api.slice(api.indexOf('async function verifyKyc'),api.indexOf('async function changeProviderVerification'))
 assert.doesNotMatch(kyc,/\.update\(\{ activo: true \}\)/)
 assert.doesNotMatch(kyc,/Tu perfil ha sido verificado y aprobado/)
})
