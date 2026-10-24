import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const files=[
 '.github/workflows/client-navigation-runtime.yml',
 '.github/workflows/hugo-presence-runtime.yml',
 '.github/workflows/readiness-admin-responsive.yml',
 '.github/workflows/provider-readiness-batch.yml',
 '.github/workflows/readiness-safe-batch-20260930.yml',
]
for(const path of files){
 test('Chromium workflow uses supported runner: '+path,()=>{
   const yaml=readFileSync(new URL('../../'+path,import.meta.url),'utf8')
   assert.ok(yaml.includes('playwright install --with-deps chromium'),'chromium install must stay enabled')
   if(path.includes('safe-batch'))assert.ok(yaml.includes('client-responsive:\n    runs-on: ubuntu-24.04'))
   else assert.ok(yaml.includes('runs-on: ubuntu-24.04'))
 })
}
