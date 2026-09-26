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

test('client root mounts global voice commands with navigation and Hugo request intents',async()=>{
 const root=await read('src/features/client/ClientRoot.tsx')
 const src=await read('src/features/client/hugo/ClientGlobalVoiceCommands.tsx')
 assert.match(root,/<ClientGlobalVoiceCommands\/>/)
 assert.match(src,/flow\.actions\.openProfile\(\)/)
 assert.match(src,/flow\.actions\.openHistory\(\)/)
 assert.match(src,/flow\.navigate\('request'\)/)
 assert.match(src,/flow\.publishHugoIntent/)
 assert.match(src,/UGO_UI_EVENTS\.clientProfilePayment/)
 assert.match(src,/UGO_UI_EVENTS\.clientProfileAddresses/)
})

test('provider root mounts global voice commands and keeps transactional job mutations out of raw transcript routing',async()=>{
 const root=await read('src/mvp/provider/ProviderRoot.tsx')
 const src=await read('src/features/provider/voice/ProviderGlobalVoiceCommands.tsx')
 assert.match(root,/<ProviderGlobalVoiceCommands\/>/)
 assert.match(src,/flow\.actions\.openOpportunities\(\)/)
 assert.match(src,/flow\.actions\.openEarnings\(\)/)
 assert.match(src,/data\.toggleOnline\(\)/)
 assert.doesNotMatch(src,/acceptOpportunity/)
 assert.doesNotMatch(src,/rejectOpportunity/)
 assert.doesNotMatch(src,/data\.advance/)
})
