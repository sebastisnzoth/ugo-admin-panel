import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

test('Hugo Live ephemeral tokens are constrained to the configured live model and audio',async()=>{
 const src=await read('supabase/functions/hugo-runtime/index.ts')
 assert.match(src,/liveConnectConstraints/)
 assert.match(src,/model:`models\/\$\{liveModel\(\)\}`/)
 assert.match(src,/responseModalities:\['AUDIO'\]/)
})

test('Hugo runtime accepts all supported UGO app origins used in TEST previews',async()=>{
 const src=await read('supabase/functions/hugo-runtime/index.ts')
 for(const origin of[
  'https://sebastisnzoth.github.io',
  'https://ugo-admin-panel.vercel.app',
  'https://ugo-admin-panel-netlify.netlify.app',
  'https://zingy-youtiao-c00ece.netlify.app',
  'http://127.0.0.1:4173'
 ])assert.ok(src.includes(origin),origin)
})
