import { createClient } from 'npm:@supabase/supabase-js@2.108.1';
const REF='tmossnqfwfwjrtzwcbmm', URL='https://'+REF+'.supabase.co';
const json=(s:number,o:unknown)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const allowed=['https://sebastisnzoth.github.io','http://localhost:5173','http://127.0.0.1:5173'];
function headers(origin:string|null){return origin&&allowed.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,apikey,content-type','vary':'Origin'}:{};}
const wrap=(s:number,o:unknown,origin:string|null)=>{const r=json(s,o);Object.entries(headers(origin)).forEach(([k,v])=>r.headers.set(k,v));return r};
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin'),send=(s:number,o:unknown)=>wrap(s,o,origin);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return send(405,{error:'METHOD_NOT_ALLOWED'});
 if(Deno.env.get('SUPABASE_URL')!==URL)return send(503,{error:'TEST_ONLY'});
 if(req.headers.get('content-type')?.split(';')[0]!=='application/json')return send(415,{error:'JSON_REQUIRED'});
 if(Number(req.headers.get('content-length')||0)>15000)return send(413,{error:'TOO_LARGE'});
 let body:any;try{const raw=await req.text();if(raw.length>15000)throw 0;body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw 0;}catch{return send(400,{error:'INVALID_JSON'});}
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)return send(503,{error:'CONFIGURATION_REQUIRED'});
 const db=createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=req.headers.get('authorization')||'';if(!bearer.startsWith('Bearer ')||bearer.length>4200)return send(401,{error:'AUTH_REQUIRED'});
 const token=bearer.slice(7);
 if(body.action==='claim'||body.action==='complete'){
   if(!/^[a-f0-9]{64}$/i.test(token))return send(401,{error:'WORKER_AUTH_REQUIRED'});
   const digest=await hash(token);
   const {data:credential,error:cError}=await db.from('hive_local_worker_credentials').select('token_hash,active').eq('id',1).maybeSingle();
   if(cError)return send(503,{error:'WORKER_AUTH_UNAVAILABLE'});
   if(!credential?.active||credential.token_hash!==digest)return send(403,{error:'WORKER_UNAUTHORIZED'});
   if(body.action==='claim'){
     if(Object.keys(body).some(k=>k!=='action'))return send(400,{error:'INVALID_CLAIM'});
     const {data,error}=await db.rpc('hive_local_claim_job');
     if(error)return send(503,{error:'CLAIM_UNAVAILABLE'});
     return send(200,{job:data?.[0]??null});
   }
   if(Object.keys(body).some(k=>!['action','outcome'].includes(k)))return send(400,{error:'INVALID_COMPLETION'});
   const out=body.outcome;
   if(!out||typeof out!=='object'||Array.isArray(out)||!['SUCCEEDED','FAILED'].includes(out.status)||
      typeof out.id!=='string'||typeof out.lease!=='string'||out.lease.length>128||
      (out.answer!==undefined&&(typeof out.answer!=='string'||out.answer.length>12000))||
      (out.model!==undefined&&out.model!=='qwen3-coder-free')||
      (out.code!==undefined&&(typeof out.code!=='string'||out.code.length>80))||
      Object.keys(out).some(k=>!['id','lease','status','answer','model','code'].includes(k)))
      return send(400,{error:'INVALID_COMPLETION'});
   const {data,error}=await db.rpc('hive_local_complete_job',{p_id:out.id,p_lease:out.lease,p_status:out.status,p_answer:out.answer??null,p_model:out.model??null,p_code:out.code??null});
   if(error)return send(503,{error:'COMPLETION_UNAVAILABLE'});
   return data===true?send(200,{ok:true}):send(409,{error:'LEASE_REJECTED'});
 }
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth?.user)return send(401,{error:'AUTH_REQUIRED'});
 const {data:profile,error:pError}=await db.from('usuarios').select('tipo,activo').eq('id',auth.user.id).maybeSingle();
 if(pError)return send(503,{error:'PROFILE_UNAVAILABLE'});
 if(profile?.activo!==true||String(profile.tipo).toLowerCase()!=='superadmin')return send(403,{error:'SUPERADMIN_REQUIRED'});
 if(body.action==='provision_worker'){
   if(typeof body.token_hash!=='string'||!/^[a-f0-9]{64}$/.test(body.token_hash)||Object.keys(body).some(k=>!['action','token_hash'].includes(k)))return send(400,{error:'INVALID_WORKER_HASH'});
   const {error}=await db.from('hive_local_worker_credentials').upsert({id:1,token_hash:body.token_hash,active:true,updated_at:new Date().toISOString()},{onConflict:'id'});
   return error?send(503,{error:'WORKER_PROVISION_FAILED'}):send(200,{ok:true});
 }
 if(body.action==='disable_worker'){
   if(Object.keys(body).some(k=>k!=='action'))return send(400,{error:'INVALID_ACTION'});
   const {error}=await db.from('hive_local_worker_credentials').update({active:false,updated_at:new Date().toISOString()}).eq('id',1);
   return error?send(503,{error:'WORKER_DISABLE_FAILED'}):send(200,{ok:true});
 }
 if(body.action==='create'){
   if(typeof body.prompt!=='string'||body.prompt.trim().length<1||body.prompt.length>4000||
      typeof body.idempotency_key!=='string'||!/^[0-9a-f-]{36}$/i.test(body.idempotency_key)||
      Object.keys(body).some(k=>!['action','prompt','idempotency_key'].includes(k)))return send(400,{error:'INVALID_REQUEST'});
   const {data:recent,error:rError}=await db.from('hive_local_inference_jobs').select('id').eq('user_id',auth.user.id).gte('created_at',new Date(Date.now()-60_000).toISOString()).limit(10);
   if(rError)return send(503,{error:'RATE_CHECK_UNAVAILABLE'});
   if((recent?.length||0)>=10)return send(429,{error:'RATE_LIMITED'});
   const {data:insert,error:insertError}=await db.from('hive_local_inference_jobs').upsert({user_id:auth.user.id,prompt:body.prompt,idempotency_key:body.idempotency_key},{onConflict:'user_id,idempotency_key',ignoreDuplicates:true}).select('id,status').maybeSingle();
   if(insertError)return send(503,{error:'CREATE_UNAVAILABLE'});
   if(insert)return send(200,{job:insert});
   const {data:existing,error:eError}=await db.from('hive_local_inference_jobs').select('id,status').eq('user_id',auth.user.id).eq('idempotency_key',body.idempotency_key).maybeSingle();
   return eError||!existing?send(503,{error:'LOOKUP_UNAVAILABLE'}):send(200,{job:existing});
 }
 if(body.action==='list'){
   if(Object.keys(body).some(k=>k!=='action'))return send(400,{error:'INVALID_LIST'});
   const {data,error}=await db.from('hive_local_inference_jobs').select('id,status,answer,model,error_code,created_at,updated_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(20);
   return error?send(503,{error:'LIST_UNAVAILABLE'}):send(200,{jobs:data??[]});
 }
 return send(400,{error:'UNKNOWN_ACTION'});
});