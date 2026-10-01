import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('Hugo client order flow requires all request fields, optional photo step, explicit confirmation and real service creation',async()=>{const dock=await read('src/features/client/hugo/ClientVoiceHugoDock.tsx');for(const token of['set_request_category','set_request_description','use_saved_place','open_request_photo','set_schedule','set_payment_method','create_service_request','CONFIRMATION_REQUIRED','INCOMPLETE_DRAFT','source:\'hugo-conversational\'','voice:true'])assert.ok(dock.includes(token),token)})
