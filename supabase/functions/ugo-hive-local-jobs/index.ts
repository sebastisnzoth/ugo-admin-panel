import { createClient } from 'npm:@supabase/supabase-js@2.108.1';
const REF='tmossnqfwfwjrtzwcbmm', URL='https://'+REF+'.supabase.co';
const json=(s:number,o:unknown)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const allowed=['https://sebastisnzoth.github.io','http://localhost:5173','http://127.0.0.1:5173'];
function headers(origin:string|null){return origin&&allowed.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','vary':'Origin'}:{};}
const wrap=(s:number,o:unknown,origin:string|null)=>{const r=json(s,o);Object.entries(headers(origin)).forEach(([k,v])=>r.headers.set(k,v));return r};
const agents=['Hugo','Architect','Developer','QA','Security','DevOps','Judge','Sentinel','Research'] as const;
type Agent=typeof agents[number];
const scopes:Record<Agent,string>={Hugo:'general product analysis',Architect:'architecture analysis',Developer:'propose code changes without executing',QA:'test planning',Security:'defensive security assessment',DevOps:'deployment analysis only',Judge:'evaluate evidence',Sentinel:'flag safety and reliability risks',Research:'summarize provided information'};
const jobRole=(prompt:string):Agent=>{const found=/^\[UGO HIVE TEST AGENT: ([A-Za-z]+) \| READ_ONLY\]\n/.exec(prompt);return found&&agents.includes(found[1] as Agent)?found[1] as Agent:'Hugo'};
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
     await db.from('hive_local_worker_credentials').update({last_seen_at:new Date().toISOString()}).eq('id',1);
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
 if(body.action==='worker_status'){
   if(Object.keys(body).some(k=>k!=='action'))return send(400,{error:'INVALID_STATUS'});
   const {data,error}=await db.from('hive_local_worker_credentials').select('active,last_seen_at').eq('id',1).maybeSingle();
   if(error)return send(503,{error:'STATUS_UNAVAILABLE'});
   const seen=data?.last_seen_at?Date.parse(data.last_seen_at):0;
   return send(200,{enrolled:!!data?.active,connected:!!data?.active&&seen>0&&(Date.now()-seen)<45000,last_seen_at:data?.last_seen_at??null});
 }
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
      (body.agent!==undefined&&!agents.includes(body.agent))||typeof body.idempotency_key!=='string'||!/^[0-9a-f-]{36}$/i.test(body.idempotency_key)||
      Object.keys(body).some(k=>!['action','prompt','agent','idempotency_key'].includes(k)))return send(400,{error:'INVALID_REQUEST'});
   const agent:Agent=body.agent??'Hugo';
   const payload=`[UGO HIVE TEST AGENT: ${agent} | READ_ONLY]\nScope: ${scopes[agent]}. Analyze the user request only. No tools, SQL, shell, network access or claims of executing changes.\n${body.prompt.trim()}`;
   if(payload.length>4000)return send(400,{error:'PROMPT_TOO_LONG'});
   const {data,error}=await db.rpc('hive_local_create_job',{p_user_id:auth.user.id,p_prompt:payload,p_key:body.idempotency_key});
   if(error){
     if(error.message?.includes('HIVE_RATE_LIMITED'))return send(429,{error:'RATE_LIMITED'});
     return send(503,{error:'CREATE_UNAVAILABLE'});
   }
   return data?.[0]?.id?send(200,{job:data[0]}):send(503,{error:'CREATE_NO_RESULT'});
 }
 if(body.action==='list'){
   if(Object.keys(body).some(k=>k!=='action'))return send(400,{error:'INVALID_LIST'});
   const {data,error}=await db.from('hive_local_inference_jobs').select('id,status,prompt,answer,model,error_code,created_at,updated_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(20);
   return error?send(503,{error:'LIST_UNAVAILABLE'}):send(200,{jobs:(data??[]).map(({prompt,...job})=>({...job,agent:jobRole(prompt)}))});
 }
 return send(400,{error:'UNKNOWN_ACTION'});
});