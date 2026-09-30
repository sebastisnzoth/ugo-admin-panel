import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

const [client,provider,admin,bridge]=await Promise.all([
  read('src/features/client/hugo/ClientVoiceHugoDock.tsx'),
  read('src/mvp/provider/ProviderHugoBridge.tsx'),
  read('src/components/ConversationalOrb.tsx'),
  read('src/lib/browserVoiceBridge.ts'),
])

test('hugo voice surfaces expose explicit listen think speak and actionable error states',()=>{
  for(const source of [client,provider]){
    assert.match(source,/connecting:'Procesando\.\.\.'/)
    assert.match(source,/ready:'Te escucho'/)
    assert.match(source,/hearing:'Escuchando\.\.\.'/)
    assert.match(source,/speaking:'Hablando\.\.\.'/)
    assert.match(source,/error:'Voz no disponible'/)
    assert.match(source,/Permití el micrófono/)
    assert.match(source,/No encontré un micrófono/)
    assert.match(source,/micrófono está ocupado/)
  }
  assert.match(admin,/setOrbState\('listening'\)/)
  assert.match(admin,/ugo:native-voice-output/)
  assert.match(admin,/ugo:native-voice-error/)
})

test('voice runtime has browser speech input fallback and spoken fallback output without exposing secrets',()=>{
  assert.match(bridge,/startFallback/)
  assert.match(bridge,/engine:'browser-speech'/)
  assert.match(bridge,/ugo:native-voice-result/)
  assert.match(bridge,/playConversationPcm/)
  assert.doesNotMatch(bridge,/GEMINI_API_KEY\s*=\s*['"]/)
  assert.match(client,/detail\.engine==='browser-speech'/)
  assert.match(client,/SpeechSynthesisUtterance/)
  assert.match(admin,/detail\.engine==='browser-speech'/)
  assert.match(admin,/SpeechSynthesisUtterance/)
})

test('voice failures preserve a textual recovery path instead of freezing the UI',()=>{
  assert.match(client,/Podés seguir escribiendo y volver a intentar la voz\./)
  assert.match(client,/setState\('error'\)/)
  assert.match(provider,/setState\('error'\)/)
  assert.match(admin,/setOrbState\('idle'\)/)
})
