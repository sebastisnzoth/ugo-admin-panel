import{createClient}from'@supabase/supabase-js'
const url=process.env.UGO_TEST_SUPABASE_URL||'',key=process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY||''
if(url!=='https://tmossnqfwfwjrtzwcbmm.supabase.co'||!key)throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const{data:result,error}=await db.rpc('autonomous_reconcile_model_routes')
if(error)throw error
if(result?.passed!==true||result?.status!=='READY'||result?.max_cost!==0)throw new Error('MODEL_ROUTE_NOT_READY')
const{data:routes,error:routeError}=await db.from('autonomous_model_routes').select('task_class,status,max_cost,primary_candidate_id,fallback_candidate_id,updated_at')
if(routeError)throw routeError
const ids=[...new Set((routes||[]).flatMap(r=>[r.primary_candidate_id,r.fallback_candidate_id]).filter(Boolean))]
const{data:candidates,error:candidateError}=ids.length?await db.from('autonomous_model_candidates').select('id,provider,model_id,free_tier,eligible,benchmark_score,benchmark_threshold,availability,last_benchmarked_at').in('id',ids):{data:[],error:null}
if(candidateError)throw candidateError
const byId=new Map((candidates||[]).map(x=>[x.id,x]))
for(const route of routes||[]){
 if(route.status!=='READY'||Number(route.max_cost)!==0)throw new Error('MODEL_ROUTE_STATUS_INVALID:'+route.task_class)
 const p=byId.get(route.primary_candidate_id)
 if(!p||!p.free_tier||!p.eligible||p.availability!=='AVAILABLE'||Number(p.benchmark_score)<Number(p.benchmark_threshold))throw new Error('MODEL_ROUTE_PRIMARY_INVALID:'+route.task_class)
}
console.log(JSON.stringify({modelRoutesReconciled:true,routes:(routes||[]).length,primary:result.primary,fallback:result.fallback,maxCost:0}))
