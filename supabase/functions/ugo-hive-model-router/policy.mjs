// Pure preparation layer. Production entrypoint deliberately does not invoke inference.
export const MAX_TOKENS=512;
const providers=['freellmapi','openrouter'];
const openRouterEndpoint='https://openrouter.ai/api/v1/chat/completions';
export function zeroPrices(prices) {
 if(!prices || typeof prices!=='object' || Array.isArray(prices)) return false;
 if(!['prompt','completion','request'].every(k=>Object.hasOwn(prices,k))) return false;
 return Object.values(prices).every(v=>(typeof v==='number' && v===0) || (typeof v==='string' && /^0(?:\.0+)?$/.test(v)));
}
export function eligibleRoute(route,allowlist,now=Date.now()) {
 if(!route || !providers.includes(route.provider) || !allowlist.includes(route.endpoint)) return false;
 let url;try{url=new URL(route.endpoint);}catch{return false;}
 if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash) return false;
 if(route.provider==='openrouter' && (route.endpoint!==openRouterEndpoint || !route.model?.endsWith(':free'))) return false;
 if(typeof route.model!=='string' || !route.model || /(^auto(?::|$)|fusion|group:)/i.test(route.model)) return false;
 // FreeAPI currently unifies model IDs and can fail over among providers internally.
 // No caller-supplied evidence flag can substitute for an enforced upstream pinning contract.
 if(route.provider==='freellmapi') return false;
 // These are approval evidence identifiers, supplied only by a reviewed backend policy.
 // An API catalogue's free label is insufficient to create an approved policy.
 const expires=Date.parse(route.valid_until); const checked=Date.parse(route.checked_at);
 return route.terms_approved===true && typeof route.billing_evidence==='string' && route.billing_evidence.length>0 &&
  Number.isFinite(expires) && Number.isFinite(checked) && checked<=now && expires>now && expires-checked<=3600000 && zeroPrices(route.pricing);
}
export function selectRoutes(routes,allowlist,now=Date.now()) {
 return providers.flatMap(p=>routes.filter(r=>r.provider===p && eligibleRoute(r,allowlist,now)).slice(0,1));
}
// At most two transport attempts in total; a fallback consumes its own durable reservation.
// Quota calls fail closed. Never retry a request whose transport outcome is unknown.
export async function inferPrepared({routes,allowlist,objective,actor,mission,quota,transport,secrets,now=Date.now()}) {
 const candidates=selectRoutes(routes,allowlist,now);
 if(!candidates.length) return {ok:false,code:'NO_VERIFIED_FREE_ROUTE'};
 if(typeof objective!=='string' || objective.length<8 || objective.length>1500 || new TextEncoder().encode(objective).length>1500) return {ok:false,code:'INVALID_OBJECTIVE'};
 for(const route of candidates) {
  if(!secrets[route.provider]) continue;
  const request=crypto.randomUUID();
  let reservation;try{reservation=await quota.reserve(request,actor,mission,route.provider,2048);}catch{return {ok:false,code:'QUOTA_UNAVAILABLE'};}
  if(!reservation.allowed) {
   if(reservation.code==='CIRCUIT_OPEN') continue;
   return {ok:false,code:reservation.code};
  }
  let result;
  try {
   result=await transport(route.endpoint,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{authorization:'Bearer '+secrets[route.provider],'content-type':'application/json'},
    body:JSON.stringify({model:route.model,messages:[{role:'user',content:objective}],max_tokens:MAX_TOKENS,stream:false,
     ...(route.provider==='openrouter'?{provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0}}}:{})})
   });
  }catch{
   await quota.finish(request,false,30).catch(()=>{});
   return {ok:false,code:'UPSTREAM_OUTCOME_UNKNOWN'};
  }
  if(!result.ok){
   const retryHeader=result.headers.get('retry-after');
   const seconds=/^\d+$/.test(retryHeader||'')?Math.min(300,Number(retryHeader)):30;
   try{await quota.finish(request,false,seconds);}catch{return {ok:false,code:'QUOTA_UNAVAILABLE'};}
   if([429,502,503,504].includes(result.status)) continue;
   return {ok:false,code:'UPSTREAM_REJECTED'};
  }
  let payload;
  try {
   const reader=result.body?.getReader(); if(!reader) throw new Error('missing');
   const parts=[];let size=0;
   try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>32000)throw new Error('large');parts.push(value);}}finally{await reader.cancel();}
   const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
   payload=JSON.parse(new TextDecoder().decode(bytes));
   const usage=payload.usage;
   if(payload.model!==route.model || typeof payload.choices?.[0]?.message?.content!=='string' || !payload.choices[0].message.content.trim() ||
    !usage || !Number.isInteger(usage.prompt_tokens) || !Number.isInteger(usage.completion_tokens) ||
    usage.prompt_tokens<0 || usage.completion_tokens<0 || usage.completion_tokens>MAX_TOKENS || usage.prompt_tokens+usage.completion_tokens>2048 ||
    (Object.hasOwn(usage,'cost') && usage.cost!==0)) throw new Error('invalid');
   await quota.finish(request,true,0);
  }catch{
   await quota.finish(request,false,30).catch(()=>{});return {ok:false,code:'UNVERIFIED_UPSTREAM_RESPONSE'};
  }
  return {ok:true,provider:route.provider,model:route.model,text:payload.choices[0].message.content,usage:{prompt_tokens:payload.usage.prompt_tokens,completion_tokens:payload.usage.completion_tokens},request_id:request};
 }
 return {ok:false,code:'WAITING_MODEL'};
}
