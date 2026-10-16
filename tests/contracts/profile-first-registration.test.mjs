import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const gate=readFileSync('src/features/client/onboarding/ClientOnboardingGate.tsx','utf8')
const profile=readFileSync('src/features/client/profile/ClientProfilePanel.tsx','utf8')

test('registered Client can enter ZIP design without blocking form',()=>{
 assert.match(gate,/if\(!embedded\)return <>\{children\}<\/>/)
 assert.match(gate,/if\(complete\)return embedded\?null/)
 assert.match(profile,/<ClientOnboardingGate embedded onCompleted=/)
})
test('required profile data remains backed by the UGO onboarding RPC',()=>{
 assert.match(gate,/completar_onboarding_cliente/)
 assert.match(gate,/p_termos_versao:TERMS_VERSION/)
 assert.match(profile,/onboarding_completo_at/)
 assert.match(profile,/termos_aceitos_at/)
})
