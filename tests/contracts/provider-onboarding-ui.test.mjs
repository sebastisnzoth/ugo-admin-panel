import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const css=readFileSync(new URL('../../src/mvp/provider-onboarding.css',import.meta.url),'utf8')
const component=readFileSync(new URL('../../src/mvp/ProviderOnboardingGate.tsx',import.meta.url),'utf8')

test('provider onboarding keeps actions visible in app layout',()=>{
  assert.match(css,/\.ugo-provider-onboarding\{[^}]*height:100dvh[^}]*overflow:hidden/)
  assert.match(css,/\.ugo-provider-onboarding-card\{[^}]*display:flex[^}]*flex-direction:column/)
  assert.match(css,/\.ugo-provider-step\{[^}]*flex:1 1 auto[^}]*overflow-y:auto/)
  assert.match(css,/\.ugo-provider-actions\{[^}]*flex:0 0 auto/)
})

test('provider onboarding keeps explicit save available on mobile',()=>{
  assert.match(css,/@media\(max-width:640px\)[\s\S]*?\.ugo-provider-save\{display:block\}/)
  assert.doesNotMatch(css,/@media\(max-width:640px\)[\s\S]*?\.ugo-provider-save\{display:none/)
  assert.match(component,/>Guardar<|\{busy\?'Guardando…':'Guardar'\}/)
})

test('provider onboarding exposes all six guided steps',()=>{
  for(const label of ['Cuenta','Servicio','Perfil','Documentos','Cobro','Revisión']) assert.match(component,new RegExp(`name:'${label}'`))
  assert.match(component,/Paso \{step\} de 6/)
})
