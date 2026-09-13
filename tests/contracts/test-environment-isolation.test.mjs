import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile,readdir } from 'node:fs/promises'

const PROD_REF='trfsjuseqjxlhrxuvdsm'
const TEST_REF='tmossnqfwfwjrtzwcbmm'

async function source(path){return readFile(new URL(`../../${path}`,import.meta.url),'utf8')}

async function countApiFunctions(dirUrl=new URL('../../api/',import.meta.url)){
  const entries=await readdir(dirUrl,{withFileTypes:true})
  let count=0
  for(const entry of entries){
    const child=new URL(`${entry.name}${entry.isDirectory()?'/':''}`,dirUrl)
    if(entry.isDirectory())count+=await countApiFunctions(child)
    else if(/\.(?:js|ts|mjs|cjs)$/.test(entry.name)&&!entry.name.endsWith('.d.ts'))count++
  }
  return count
}

test('admin proxy is pinned to UGO TEST and has no production fallback',async()=>{
  const text=await source('api/proxy.js')
  assert.match(text,new RegExp(TEST_REF))
  assert.doesNotMatch(text,new RegExp(`OFFICIAL_URL[^\n]*${PROD_REF}`))
})

test('cash and KYC operations are pinned to UGO TEST',async()=>{
  const text=await source('api/operations.ts')
  assert.match(text,new RegExp(TEST_REF))
  assert.doesNotMatch(text,new RegExp(PROD_REF))
})

test('Hugo and OAuth traffic is pinned to UGO TEST without an extra serverless wrapper',async()=>{
  const vercel=await source('vercel.json')
  assert.match(vercel,new RegExp(TEST_REF))
  assert.doesNotMatch(vercel,new RegExp(PROD_REF))
  assert.match(vercel,/"source": "\/api\/hugo\/gemini"[\s\S]*?"destination": "\/api\/test"/)
  assert.doesNotMatch(vercel,/test-safe/)
})

test('UGO stays within the Vercel Hobby 12-function deployment limit',async()=>{
  assert.ok(await countApiFunctions()<=12,'api/ must expose no more than 12 Vercel functions on Hobby')
})
