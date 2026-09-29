import assert from'node:assert/strict'
import{build}from'esbuild'
import{createClient}from'@supabase/supabase-js'
import{pathToFileURL}from'node:url'

const url=process.env.UGO_TEST_SUPABASE_URL||'',anon=process.env.UGO_TEST_SUPABASE_ANON_KEY||'',sk=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!anon||!sk)throw new Error('UGO_TEST_ONLY')
if(!process.env.UGO_TEST_ADMIN_EMAIL||!process.env.UGO_TEST_ADMIN_PASSWORD)throw new Error('UGO_TEST_SUPERADMIN_CREDENTIALS_REQUIRED')
process.env.SUPABASE_URL=url
process.env.SUPABASE_ANON_KEY=anon
process.env.SUPABASE_SERVICE_KEY=sk

const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
const service=createClient(url,sk,{auth:{persistSession:false,autoRefreshToken:false}})
const login=await auth.auth.signInWithPassword({email:process.env.UGO_TEST_ADMIN_EMAIL,password:process.env.UGO_TEST_ADMIN_PASSWORD})
if(login.error)throw login.error
const user=login.data.user,token=login.data.session?.access_token
if(!user||!token)throw new Error('SUPERADMIN_SESSION_REQUIRED')
const profile=await service.from('usuarios').select('tipo,activo').eq('id',user.id).single()
if(profile.error)throw profile.error
assert.equal(profile.data.tipo,'superadmin')
assert.equal(profile.data.activo,true)

const agents=await service.from('autonomous_agents').select('id,status').neq('status','DISABLED').order('updated_at',{ascending:false}).limit(50)
if(agents.error)throw agents.error
let agentId=null
for(const a of agents.data||[]){
 const j=await service.from('autonomous_jobs').select('id',{count:'exact',head:true}).eq('agent_id',a.id)
 if(!j.error&&(j.count||0)>0){agentId=a.id;break}
}
if(!agentId)throw new Error('NO_AGENT_WITH_PERSISTED_EVIDENCE')

const outfile='/tmp/ugo-api-test-runtime.mjs'
await build({entryPoints:['api/test.ts'],bundle:true,platform:'node',format:'esm',target:'node22',outfile,logLevel:'silent'})
const{default:handler}=await import(pathToFileURL(outfile).href+'?t='+Date.now())

let statusCode=200,body=null
const req={method:'POST',query:{ugo_autonomy_model:'1'},headers:{authorization:'Bearer '+token},body:{agent_id:agentId,question:'Resumí únicamente el estado operativo verificable de este agente en una frase.'}}
const res={
 setHeader(){},
 status(code){statusCode=code;return this},
 json(value){body=value;return this},
 end(){return this},
 redirect(code,value){statusCode=code;body={redirect:value};return this}
}
await handler(req,res)
assert.equal(statusCode,200,JSON.stringify(body))
assert.ok(body?.answer)
assert.ok(body?.correlation_id)
assert.ok(['gemini','openrouter'].includes(body?.provider))
assert.equal(Number(body?.cost),0)
const persisted=await service.from('autonomous_agent_consultations').select('success,provider,model_id,cost').eq('correlation_id',body.correlation_id).single()
if(persisted.error)throw persisted.error
assert.equal(persisted.data.success,true)
assert.equal(Number(persisted.data.cost),0)
assert.equal(persisted.data.provider,body.provider)
console.log(JSON.stringify({agentConsultationHttpRuntime:true,status:statusCode,provider:body.provider,model:body.model,correlationId:body.correlation_id,cost:0,environment:'UGO_TEST'}))
await auth.auth.signOut()
