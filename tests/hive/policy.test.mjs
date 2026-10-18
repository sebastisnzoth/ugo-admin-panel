import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zeroPrices,eligibleRoute,selectRoutes,inferPrepared} from '../../supabase/functions/ugo-hive-model-router/policy.mjs';
const now=Date.now();
const routes=[{provider:'freellmapi',endpoint:'https://hive-test.onrender.com/v1/chat/completions',model:'reviewed-model',upstream_provider:'reviewed-provider',pinning_verified:true},{provider:'openrouter',endpoint:'https://openrouter.ai/api/v1/chat/completions',model:'vendor/model:free'}].map(x=>({...x,terms_approved:true,billing_evidence:'test-evidence-only',checked_at:new Date(now-1000).toISOString(),valid_until:new Date(now+10000).toISOString(),pricing:{prompt:'0',completion:0,request:'0.0'}}));
const allowlist=routes.map(r=>r.endpoint);
const base={routes,allowlist,now,objective:'Public source review',actor:'actor',mission:'mission',secrets:{freellmapi:'dummy-freeapi',openrouter:'dummy-openrouter'}};
test('pricing and endpoint policy rejects every ambiguous or unapproved route',()=>{
 for(const p of [null,[],{}, {prompt:0,completion:0}, {prompt:0,completion:0,request:null},{prompt:0,completion:0,request:false},{prompt:0,completion:0,request:''},{prompt:0,completion:0,request:' 0'},{prompt:0,completion:0,request:0,image:'0.1'}]) assert.equal(zeroPrices(p),false);
 assert.equal(selectRoutes(routes,allowlist,now).length,1);
 for(const diff of [{terms_approved:false},{valid_until:'invalid'},{checked_at:new Date(now+1).toISOString()},{model:'auto'},{model:'auto:chain'},{model:'group:x'},{endpoint:'https://evil.example'},{endpoint:'http://hive-test.onrender.com/v1/chat/completions'},{endpoint:'https://user:password@hive-test.onrender.com/v1/chat/completions'},{billing_evidence:''},{pinning_verified:false}]) assert.equal(eligibleRoute({...routes[0],...diff},allowlist,now),false,JSON.stringify(diff));
 assert.equal(eligibleRoute({...routes[1],model:'vendor/paid'},allowlist,now),false);
});
test('only implemented OpenRouter route reserves once, pins model, disables redirects and paid fallback',async()=>{
 const reservations=[];const calls=[];
 const quota={reserve:async(...args)=>{reservations.push(args);return {allowed:true};},finish:async()=>{}};
 const result=await inferPrepared({...base,quota,transport:async(url,opts)=>{
  calls.push({url,opts});
  return Response.json({model:routes[1].model,choices:[{message:{content:'checked public code'}}],usage:{prompt_tokens:20,completion_tokens:10,cost:0}});
 }});
 assert.equal(result.ok,true);assert.equal(result.provider,'openrouter');assert.equal(reservations.length,1);assert.equal(calls.length,1);
 assert.equal(calls[0].opts.redirect,'error');assert.equal(JSON.parse(calls[0].opts.body).provider.allow_fallbacks,false);
 assert.equal(JSON.parse(calls[0].opts.body).provider.max_price.prompt,0);
});
test('durable quota failure, replay and unknown transport outcome cannot trigger another provider',async()=>{
 for(const code of ['GLOBAL_QUOTA_EXHAUSTED','REQUEST_ALREADY_RESERVED']) {
  let calls=0;const result=await inferPrepared({...base,quota:{reserve:async()=>({allowed:false,code})},transport:async()=>{calls++;}});
  assert.equal(result.code,code);assert.equal(calls,0);
 }
 let calls=0;
 const result=await inferPrepared({...base,quota:{reserve:async()=>({allowed:true}),finish:async()=>{}},transport:async()=>{calls++;throw new Error('secret should not be returned');}});
 assert.equal(result.code,'UPSTREAM_OUTCOME_UNKNOWN');assert.equal(calls,1);
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('model mismatch, missing usage, oversized output and billable usage fail closed',async()=>{
 for(const payload of [{model:'wrong',choices:[{message:{content:'answer'}}],usage:{prompt_tokens:1,completion_tokens:1}}, {model:routes[1].model,choices:[{message:{content:'answer'}}]}, {model:routes[1].model,choices:[{message:{content:'x'.repeat(33000)}}],usage:{prompt_tokens:1,completion_tokens:1}}, {model:routes[1].model,choices:[{message:{content:'answer'}}],usage:{prompt_tokens:1,completion_tokens:1,cost:1}}]) {
  const result=await inferPrepared({...base,quota:{reserve:async()=>({allowed:true}),finish:async()=>{}},transport:async()=>Response.json(payload)});
  assert.equal(result.code,'UNVERIFIED_UPSTREAM_RESPONSE');
 }
});

test('429 cannot fall back to an unimplemented FreeAPI pinning contract',async()=>{let calls=0;const result=await inferPrepared({...base,quota:{reserve:async()=>({allowed:true}),finish:async()=>{}},transport:async()=>{calls++;return new Response(null,{status:429});}});assert.equal(calls,1);assert.equal(result.code,'WAITING_MODEL');});
