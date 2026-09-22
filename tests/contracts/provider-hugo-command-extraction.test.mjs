import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('provider Hugo bridge delegates operational commands while retaining voice engine',async()=>{const[bridge,commands]=await Promise.all([read('src/mvp/provider/ProviderHugoBridge.tsx'),read('src/features/provider/voice/providerVoiceCommands.ts')]);assert.match(bridge,/runProviderVoiceCommand/);assert.doesNotMatch(bridge,/aceptar\|acepta\|aceptalo/);assert.match(bridge,/UGOVoiceBridge/);assert.match(bridge,/SpeechRecognition/);assert.match(bridge,/fetch\('\/api\/hugo\/chat'/);assert.match(bridge,/fetch\('\/api\/test'/);for(const token of ['acceptOpportunity','rejectOpportunity',"advance('en_camino')","advance('llegado')",'toggleOnline','openDispute'])assert.match(commands,new RegExp(token.replace(/[()'.]/g,'\\$&')));assert.match(commands,/evidencia inicial/);assert.match(commands,/evidencia final/)})
