const DEFAULT_BASE='https://openrouter.ai/api/v1'
const FREE_CANDIDATES=['openrouter/free','qwen/qwen3-coder:free','google/gemma-3-27b-it:free']

const json=(res,status,body)=>{res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(body))}
const clean=s=>String(s||'').replace(/[\r\n]/g,' ').slice(0,4000)

export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'METHOD_NOT_ALLOWED'})
 const key=process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY
 if(!key)return json(res,503,{error:'OPENROUTER_NOT_CONFIGURED'})
 const body=req.body||{}
 const messages=Array.isArray(body.messages)?body.messages:null
 if(!messages?.length)return json(res,400,{error:'MESSAGES_REQUIRED'})
 const candidates=[body.model,...FREE_CANDIDATES].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)
 const failures=[]
 for(const model of candidates){
  if(!String(model).includes(':free')&&model!=='openrouter/free')continue
  try{
   const upstream=await fetch(`${process.env.OPENROUTER_BASE_URL||DEFAULT_BASE}/chat/completions`,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json','HTTP-Referer':process.env.UGO_PUBLIC_URL||'https://ugo.app','X-Title':'UGO Autonomous Company'},body:JSON.stringify({model,messages,temperature:Number.isFinite(body.temperature)?body.temperature:0.2,max_tokens:Math.min(Number(body.max_tokens)||900,1600)})})
   const payload=await upstream.json().catch(()=>({}))
   if(upstream.ok)return json(res,200,{provider:'openrouter',model:payload.model||model,choice:payload.choices?.[0]?.message||null,usage:payload.usage||null})
   failures.push({model,status:upstream.status,error:clean(payload?.error?.message||'upstream error')})
  }catch(error){failures.push({model,status:0,error:clean(error?.message||error)})}
 }
 return json(res,502,{error:'OPENROUTER_FREE_ROUTE_UNAVAILABLE',failures})
}
