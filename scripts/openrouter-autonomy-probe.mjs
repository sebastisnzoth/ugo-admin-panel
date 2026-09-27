const key=process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY
if(!key)throw new Error('OPENROUTER_API_KEY is required')
const base=process.env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1'
const requested=process.env.UGO_OPENROUTER_MODEL||'openrouter/free'
const models=[requested,'openrouter/free','qwen/qwen3-coder:free','google/gemma-3-27b-it:free'].filter((v,i,a)=>a.indexOf(v)===i)
let last=''
for(const model of models){
 if(model!=='openrouter/free'&&!model.endsWith(':free'))continue
 const response=await fetch(base+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json','HTTP-Referer':'https://github.com/sebastisnzoth/ugo-admin-panel','X-Title':'UGO Autonomous Company'},body:JSON.stringify({model,messages:[{role:'system',content:'You are the UGO model-router health probe. Reply only UGO_OPENROUTER_OK.'},{role:'user',content:'health check'}],temperature:0,max_tokens:24})})
 const payload=await response.json().catch(()=>({}))
 if(response.ok&&payload?.choices?.[0]?.message?.content){
   console.log(JSON.stringify({ok:true,provider:'openrouter',model:payload.model||model,freeRoute:true}))
   process.exit(0)
 }
 last='model='+model+' status='+response.status+' error='+String(payload?.error?.message||'unknown').slice(0,200)
}
throw new Error('OPENROUTER_FREE_ROUTE_UNAVAILABLE '+last)
