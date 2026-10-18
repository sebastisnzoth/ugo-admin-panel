import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const code=ts.transpileModule(fs.readFileSync('api/admin/integrations-status.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const module={exports:{}}
vm.runInNewContext(code,{module,exports:module.exports,process:{env:{SUPABASE_URL:'https://tmossnqfwfwjrtzwcbmm.supabase.co',SUPABASE_SERVICE_KEY:'test-private-key'}},console,Date,Set,AbortController,setTimeout,clearTimeout,require:name=>name.includes('supabaseProject')?{UGO_SUPABASE_URL:'https://tmossnqfwfwjrtzwcbmm.supabase.co'}:{createClient:()=>{throw Error('unexpected privileged client creation')}}})
async function request(method,origin){const headers={};let status=200,body;const response={setHeader:(k,v)=>{headers[k]=v},status:n=>{status=n;return response},json:v=>{body=v;return response},end:()=>response};await module.exports.default({method,headers:{origin}},response);return {status,headers,body}}
test('Pages integration-status preflight completes before authentication',async()=>{const r=await request('OPTIONS','https://sebastisnzoth.github.io');assert.equal(r.status,204);assert.equal(r.headers['Access-Control-Allow-Origin'],'https://sebastisnzoth.github.io');assert.match(r.headers['Access-Control-Allow-Headers'],/Authorization/)})
test('integration status never exposes data without an Admin bearer',async()=>{const r=await request('GET','https://sebastisnzoth.github.io');assert.equal(r.status,401);assert.ok(r.body.error);assert.equal(r.body.integrations,undefined)})
test('untrusted origins never receive CORS access',async()=>{const r=await request('OPTIONS','https://untrusted.example');assert.equal(r.headers['Access-Control-Allow-Origin'],undefined)})
