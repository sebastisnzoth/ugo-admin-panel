import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider Hugo executes declared operational tools through guarded provider actions',async()=>{
 const[bridge,live]=await Promise.all([read('src/mvp/provider/ProviderHugoBridge.tsx'),read('src/lib/browserVoiceBridge.ts')])
 for(const tool of ['provider_set_online','provider_set_offline','provider_list_opportunities','provider_accept_job','provider_reject_job','provider_update_service_status'])assert.match(bridge,new RegExp(tool))
 assert.match(bridge,/const\{actions\}=flow/)
 assert.match(bridge,/actions\.acceptOpportunity/)
 assert.match(bridge,/actions\.rejectOpportunity/)
 assert.match(bridge,/data\.advance/)
 assert.match(bridge,/data\.completeService/)
 assert.match(live,/PROVIDER_TOOLS/)
 assert.doesNotMatch(bridge,/SpeechRecognition|webkitSpeechRecognition|\/api\/hugo\/chat/)
})


test('provider Hugo accepts either real service id or offer id for opportunity decisions',async()=>{
 const bridge=await read('src/mvp/provider/ProviderHugoBridge.tsx')
 assert.match(bridge,/String\(item\.id\)===requestedId\|\|String\(item\.serviceId\)===requestedId/)
 assert.match(bridge,/actions\.acceptOpportunity\(item\.id\)/)
 assert.match(bridge,/actions\.rejectOpportunity\(item\.id\)/)
 assert.match(bridge,/serviceId:item\.serviceId,opportunityId:item\.id/)
})
