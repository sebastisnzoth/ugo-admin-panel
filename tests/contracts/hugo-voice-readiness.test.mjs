import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import './i18n-test-compat.mjs'
import { readFileSync } from 'node:fs'

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

const [client,provider,admin,bridge]=await Promise.all([
  read('src/features/client/hugo/ClientVoiceHugoDock.tsx'),
  read('src/mvp/provider/ProviderHugoBridge.tsx'),
  read('src/components/ConversationalOrb.tsx'),
  read('src/lib/browserVoiceBridge.ts'),
])

test('hugo voice surfaces expose explicit listen think speak and actionable error states',()=>{
  for(const source of [client,provider]){
    assert.match(source,/t\('voice\.state\.'\+state\)/)
    assert.match(source,/voice\.error\.micPermission/)
    assert.match(source,/voice\.error\.noMic/)
    assert.match(source,/voice\.error\.micBusy/)
    const catalog=readFileSync('src/i18n/translations/voiceSurface.ts','utf8')
    for(const key of ['voice.state.connecting','voice.state.ready','voice.state.hearing','voice.state.speaking','voice.state.error','voice.error.micPermission','voice.error.noMic','voice.error.micBusy'])assert.ok(catalog.includes(key),key)
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
  assert.match(client,/t\('voice\.error\.live'\)/)
  assert.match(client,/setState\('error'\)/)
  assert.match(provider,/setState\('error'\)/)
  assert.match(admin,/setOrbState\('idle'\)/)
})
