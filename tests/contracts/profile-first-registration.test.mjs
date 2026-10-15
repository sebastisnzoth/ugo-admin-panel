import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const clientGate=readFileSync('src/features/client/onboarding/ClientOnboardingGate.tsx','utf8')
const clientProfile=readFileSync('src/features/client/profile/ClientProfilePanel.tsx','utf8')
const provider=readFileSync('src/mvp/ProviderOnboardingGate.tsx','utf8')
const providerData=readFileSync('src/mvp/provider/providerData.tsx','utf8')
test('client signs in directly; onboarding fields are available from Perfil',()=>{
 assert.match(clientGate,/if\(!embedded\)return <>\{children\}<\/>/)
 assert.match(clientGate,/if\(complete\)return embedded\?null/)
 assert.match(clientProfile,/<ClientOnboardingGate embedded\/>/)
 assert.match(clientGate,/completar_onboarding_cliente/)
 assert.match(clientGate,/p_termos_versao:TERMS_VERSION/)
})
test('provider sees a profile summary instead of immediate registration wizard',()=>{
 assert.match(provider,/if\(!profileEditorOpen\)return <main/)
 assert.match(provider,/Completar datos del perfil/)
 assert.match(provider,/Mi perfil profesional/)
 assert.match(provider,/setProfileEditorOpen\(true\)/)
})
test('provider only submits complete profile for human approval; no self-verification',()=>{
 assert.match(provider,/if\(submit\)\{if\(!form\.nombre/)
 assert.match(provider,/payload\.estado_verificacion='pendiente'/)
 assert.match(provider,/payload\.online=false;payload\.disponible=false/)
 assert.match(provider,/estado_verificacion==='pendiente'/)
 assert.doesNotMatch(provider,/setP\(\{\.\.\.p,estado_verificacion:'registrado'\}\)/)
 assert.match(providerData,/estado_verificacion!=='verificado'/)
})
