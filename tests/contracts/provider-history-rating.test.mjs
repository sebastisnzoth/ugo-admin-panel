import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('provider rating supports an exact completed service from history',async()=>{
 const[prompt,detail,root,css]=await Promise.all([
  read('src/mvp/ProviderRatingPrompt.tsx'),
  read('src/mvp/ProviderHistoryDetail.tsx'),
  read('src/mvp/provider/ProviderRoot.tsx'),
  read('src/mvp/provider-rating.css'),
 ])
 assert.match(prompt,/serviceId\?:string\|null/)
 assert.match(prompt,/serviceId\?servicesQuery\.eq\('id',serviceId\)\.limit\(1\)/)
 assert.match(prompt,/embedded\?' is-embedded':''/)
 assert.match(detail,/ProviderRatingPrompt serviceId=\{service\.id\} embedded/)
 assert.match(root,/ProviderRatingPrompt suspended=\{Boolean\(data\.service\)\|\|screen==='history'\}/)
 assert.match(css,/ugo-provider-rating\.is-embedded/)
})
