import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const PROD_REF='trfsjuseqjxlhrxuvdsm'
const TEST_REF='tmossnqfwfwjrtzwcbmm'

async function source(path){return readFile(new URL(`../../${path}`,import.meta.url),'utf8')}

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

test('Hugo and OAuth traffic enters through the UGO TEST sandbox',async()=>{
  const wrapper=await source('api/test-safe.ts')
  const vercel=await source('vercel.json')
  assert.match(wrapper,new RegExp(TEST_REF))
  assert.doesNotMatch(wrapper,new RegExp(PROD_REF))
  assert.match(vercel,/"source": "\/api\/test"[\s\S]*?"destination": "\/api\/test-safe"/)
  assert.match(vercel,/"source": "\/api\/hugo\/gemini"[\s\S]*?"destination": "\/api\/test-safe"/)
})
