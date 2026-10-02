import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('global voice listener consumes final native transcripts and exposes a custom command event',async()=>{
 const src=await read('src/shared/voice/useGlobalVoiceCommandListener.ts')
 assert.match(src,/ugo:native-voice-result/)
 assert.match(src,/detail\.final===false/)
 assert.match(src,/ugo:global-voice-command/)
 assert.match(src,/ugo:global-voice-command-handled/)
 assert.match(src,/1200/)
})

test('client root keeps dormant global voice commands unmounted while Hugo UI is disabled',async()=>{
 const root=await read('src/features/client/ClientRoot.tsx')
 const src=await read('src/features/client/hugo/ClientGlobalVoiceCommands.tsx')
 assert.doesNotMatch(root,/<ClientGlobalVoiceCommands\/?>/)
 assert.match(src,/flow\.actions\.openProfile\(\)/)
 assert.match(src,/flow\.actions\.openHistory\(\)/)
 assert.match(src,/flow\.navigate\('request'\)/)
 assert.match(src,/flow\.publishHugoIntent/)
 assert.match(src,/UGO_UI_EVENTS\.clientProfilePayment/)
 assert.match(src,/UGO_UI_EVENTS\.clientProfileAddresses/)
})

test('provider root keeps dormant global voice commands unmounted and guarded',async()=>{
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 const src=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.doesNotMatch(root,/<ProviderGlobalVoiceCommands\/?>/)
 assert.match(src,/flow\.actions\.openOpportunities\(\)/)
 assert.match(src,/flow\.actions\.openEarnings\(\)/)
 assert.doesNotMatch(src,/data\.toggleOnline\(\)/)
 assert.match(src,/executeAiAction/)
 assert.match(src,/data\.setOnline\(true\)/)
 assert.match(src,/data\.advance\(status\)/)
 assert.doesNotMatch(src,/from\('servicios'\)\.update/)
 assert.match(src,/engine==='browser-speech'/)
 assert.match(src,/runProviderVoiceCommand/)
})


test('voice command hardening supports back home, stop listening, and direct pedido/payment shortcuts',async()=>{
 const client=await read('src/features/client/hugo/ClientGlobalVoiceCommands.tsx')
 const provider=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 const events=await read('src/mvp/uiEvents.ts')
 assert.match(events,/globalVoiceStop:'ugo:voice:stop'/)
 assert.match(client,/UGO_UI_EVENTS\.globalVoiceStop/)
 assert.match(client,/volver\|voltar/)
 assert.match(client,/mis pedidos\|meus pedidos/)
 assert.match(client,/pagos/)
 assert.match(provider,/UGO_UI_EVENTS\.globalVoiceStop/)
 assert.match(provider,/volver\|voltar/)
 assert.match(provider,/mis pedidos\|meus pedidos/)
})

test('client and provider voice surfaces obey the global stop event',async()=>{
 const client=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx')
 const provider=await read('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(client,/addEventListener\(UGO_UI_EVENTS\.globalVoiceStop/)
 assert.match(provider,/addEventListener\(UGO_UI_EVENTS\.globalVoiceStop/)
})

test('android native recognition stays active across utterances but stops explicitly',async()=>{
 const src=await read('android-apk/app/src/main/java/com/ugo/mobile/MainActivity.java')
 assert.match(src,/nativeVoiceActive = true/)
 assert.match(src,/scheduleNativeRecognitionRestart\(\)/)
 assert.match(src,/postDelayed/)
 assert.match(src,/ERROR_NO_MATCH/)
 assert.match(src,/ERROR_SPEECH_TIMEOUT/)
 assert.match(src,/nativeVoiceActive = false;\s*stopNativeRecognition\(\)/)
})


test('persistent provider availability changes stay on guarded Gemini tools',async()=>{
 const[global,provider,live]=await Promise.all([
  read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx'),
  read('src/mvp/provider/ProviderHugoBridge.tsx'),
  read('src/lib/browserVoiceBridge.ts'),
 ])
 assert.doesNotMatch(global,/toggleOnline\(\)/)
 assert.match(live,/provider_set_online[^\n]+required:\['confirmed'\]/)
 assert.match(live,/provider_set_offline[^\n]+required:\['confirmed'\]/)
 assert.match(provider,/provider_set_online'\)\{if\(args\.confirmed!==true\)/)
 assert.match(provider,/provider_set_offline'\)\{if\(args\.confirmed!==true\)/)
})


test('global voice listener forwards the active engine so fallback commands do not duplicate Gemini Live tools',async()=>{
 const src=await read('src/shared/voice/useGlobalVoiceCommandListener.ts')
 assert.match(src,/engine\?:string/)
 assert.match(src,/handlerRef\.current\(value,source,engine\)/)
 assert.match(src,/String\(detail\.engine\|\|''\)/)
})
