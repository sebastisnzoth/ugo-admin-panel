import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('Hugo persists and restores the complete request draft',async()=>{const dock=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx');assert.match(dock,/restoreVoiceDraft/);assert.match(dock,/requestDraftId:current\.requestDraftId/);assert.match(dock,/whenLabel:current\.whenLabel/);assert.match(dock,/paymentMethod:current\.paymentMethod/);assert.match(dock,/pickupSource:current\.pickupSource/);assert.match(dock,/get_request_draft/);assert.match(dock,/readyForConfirmation/);assert.match(dock,/clearPersistedDraft/)})
test('Gemini Live is instructed to read the existing draft before asking again',async()=>{const bridge=await read('src/lib/browserVoiceBridge.ts');assert.match(bridge,/name:'get_request_draft'/);assert.match(bridge,/Al iniciar o reanudar un pedido usá get_request_draft/);assert.match(bridge,/preguntá sólo el campo faltante/)})
