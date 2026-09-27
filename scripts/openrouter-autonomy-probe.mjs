const key=process.env.OPENROUTER_API_KEY||process.env.UGO_OPENROUTER_API_KEY
if(!key)throw new Error('OPENROUTER_API_KEY is required')
const base=process.env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1'
const headers={authorization:'Bearer '+key,'content-type':'application/json','HTTP-Referer':'https://github.com/sebastisnzoth/ugo-admin-panel','X-Title':'UGO Autonomous Company'}

const catalog=await fetch(base+'/models',{headers})
if(!catalog.ok)throw new Error('OPENROUTER_CONNECTION_FAILED status='+catalog.status)
const catalogBody=await catalog.json()
const free=(catalogBody.data||[]).filter(m=>String(m?.pricing?.prompt)==='0'&&String(m?.pricing?.completion)==='0').map(m=>m.id)
const preferred=[process.env.UGO_OPENROUTER_MODEL,'openrouter/free',...free].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)
let last=''
for(const model of preferred.slice(0,12)){
 if(model!=='openrouter/free'&&!free.includes(model)&&!model.endsWith(':free'))continue
 const response=await fetch(base+'/chat/completions',{method:'POST',headers,body:JSON.stringify({model,messages:[{role:'system',content:'You are the UGO model-router health probe. Reply only UGO_OPENROUTER_OK.'},{role:'user',content:'health check'}],temperature:0,max_tokens:24})})
 const payload=await response.json().catch(()=>({}))
 if(response.ok&&payload?.choices?.[0]?.message?.content){
   console.log(JSON.stringify({connected:true,provider:'openrouter',model:payload.model||model,freeRouteAvailable:true,freeCandidates:free.length}))
   process.exit(0)
 }
 last='model='+model+' status='+response.status+' error='+String(payload?.error?.message||'unknown').slice(0,160)
}
console.log(JSON.stringify({connected:true,provider:'openrouter',freeRouteAvailable:false,freeCandidates:free.length,state:'DEGRADED_FREE_CAPACITY',lastFailure:last}))
