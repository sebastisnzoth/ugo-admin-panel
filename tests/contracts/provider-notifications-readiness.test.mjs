import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider notification pipeline covers offer assignment lifecycle and chat',async()=>{
 const[center,dispatch]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('supabase/functions/push-dispatch/index.ts'),
 ])
 for(const type of ['nueva_oferta','trabajo_asignado','chat_mensaje','servicio_completado','servicio_cancelado','servicio_disputado']){
  assert.match(center,new RegExp("'"+type+"'"))
 }
 for(const type of ['nueva_oferta','trabajo_asignado','chat_mensaje']){
  assert.match(dispatch,new RegExp("'"+type+"'"))
 }
 assert.match(center,/playProviderTone\(\)/)
 assert.match(center,/navigator\.vibrate/)
})

test('provider notification push routes exact offer and service identifiers into provider app',async()=>{
 const[sw,root]=await Promise.all([
  read('public/sw.js'),
  read('src/mvp/provider/ProviderRoot.tsx'),
 ])
 assert.match(sw,/offerId=\$\{encodeURIComponent\(offerId\)\}/)
 assert.match(sw,/serviceId=\$\{encodeURIComponent\(serviceId\)\}/)
 assert.match(sw,/app=provider/)
 assert.match(root,/offerId=params\.get\('offerId'\)/)
 assert.match(root,/serviceId=params\.get\('serviceId'\)/)
})

test('provider notification pipeline rejects stale lifecycle and expired offer alerts',async()=>{
 const[center,dispatch,sw]=await Promise.all([
  read('src/mvp/NotificationCenter.tsx'),
  read('supabase/functions/push-dispatch/index.ts'),
  read('public/sw.js'),
 ])
 assert.match(center,/providerOfferNoticeActive/)
 assert.match(center,/SERVICE_NOTICE_EXPECTED_STATE/)
 assert.match(dispatch,/service notification stale/)
 assert.match(dispatch,/offer expired/)
 assert.match(sw,/payload\.type==='nueva_oferta'/)
 assert.match(sw,/expiry<=Date\.now\(\)/)
})

test('provider notification runtime and validators use PR head SHA, not synthetic merge SHA',async()=>{
 const workflow=await read('.github/workflows/provider-notifications-runtime.yml')
 const exact='${{ github.event.pull_request.head.sha || github.sha }}'
 assert.ok(workflow.includes('UGO_TARGET_SHA: '+exact),'target must be immutable PR head or main push SHA')
 assert.ok(workflow.includes('ref: '+exact),'checkout must use target SHA')
 assert.ok(workflow.includes('VITE_APP_REVISION: '+exact),'build must embed target SHA')
 assert.ok(workflow.includes('export UGO_RUNTIME_SHA="${UGO_TARGET_SHA}"'),'runtime and independent validators must consume target SHA')
 assert.ok(workflow.includes('name: readiness-provider-notifications-'+exact),'artifact must identify target SHA')
 assert.ok(!workflow.includes('ref: ${{ github.sha }}'),'PR merge ref cannot be treated as validated head')
 assert.ok(!workflow.includes('UGO_RUNTIME_SHA="${GITHUB_SHA}"'),'runtime must not report synthetic PR merge SHA')
 const pr=workflow.split('  pull_request:\n')[1]?.split('  workflow_dispatch:')[0]
 const push=workflow.split('  push:\n')[1]?.split('  pull_request:')[0]
 assert.ok(pr&&push,'PR and main push triggers are required')
 for(const block of [pr,push]){
  assert.ok(block.includes('"tests/contracts/provider-notifications-readiness.test.mjs"'),'contract edits must rerun provider browser E2E')
  assert.ok(block.includes('".github/workflows/provider-notifications-runtime.yml"'),'workflow edits must rerun provider browser E2E')
 }
})
