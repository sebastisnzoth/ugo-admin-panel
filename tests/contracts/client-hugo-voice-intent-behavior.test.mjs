import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
import ts from'typescript'

async function loadIntentModule(){
 const source=await readFile(new URL('../../src/features/client/hugo/hugoVoiceIntent.ts',import.meta.url),'utf8')
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText
 return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}

const intent=await loadIntentModule()
const legacyShim=await readFile(new URL('../../src/mvp/client/hugoVoiceIntent.ts',import.meta.url),'utf8')
const dockSource=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')

test('Hugo voice intent lives behind the feature boundary with a legacy shim',()=>{
 assert.match(legacyShim,/export \* from '\.\.\/\.\.\/features\/client\/hugo\/hugoVoiceIntent'/)
 assert.match(dockSource,/from'\.\/hugoVoiceIntent'/)
})

test('tomorrow at ten variants all resolve to one scheduled time',()=>{
 const now=new Date(2026,8,14,19,0,0)
 for(const phrase of['mañana a las 10','mañana a las 10 de la mañana','para mañana a las 10','mañana 10 de la mañana']){
  const result=intent.parseHugoWhen(phrase,now)
  assert.equal(result?.when,'programar',phrase)
  assert.match(result?.scheduleAt||'',/^2026-09-15T10:00$/,phrase)
 }
})

test('natural confirmation variants are accepted and negatives are not',()=>{
 for(const phrase of['sí','sí, confirmar pedido','sí, confirmalo','confirmar pedido','sí, por favor, confirmar pedido','dale, confirmalo','ok, confirmar','hola, sí, confirmar pedido'])assert.equal(intent.isHugoAffirmative(phrase),true,phrase)
 assert.equal(intent.isHugoAffirmative('no, no confirmes'),false)
})

test('spoken provider alias and confirmation can resolve in one turn',()=>{
 const providers=[{id:'ariel',nombre:'Angel Ariel'},{id:'sebastian',nombre:'sebastianzothoficial'}]
 const phrase='Sí, elegí a Sebastián Soto oficial y confirmá el pedido'
 assert.equal(intent.chooseHugoProvider(phrase,providers)?.id,'sebastian')
 assert.equal(intent.isHugoAffirmative(phrase),true)
})

test('global navigation and cancellation commands are deterministic',()=>{
 assert.equal(intent.resolveHugoGlobalCommand('Volveme a la pantalla de inicio'),'home')
 assert.equal(intent.resolveHugoGlobalCommand('inicio'),'home')
 assert.equal(intent.resolveHugoGlobalCommand('ver actividad'),'activity')
 assert.equal(intent.resolveHugoGlobalCommand('cancelar pedido'),'cancel')
 assert.equal(intent.resolveHugoGlobalCommand('mañana a las 10'),null)
})
